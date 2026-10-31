// Statistiques des chants joués (lot U7, docs/spec-statistiques.md, décisions
// Q3 à Q12). Calcul pur, dans le navigateur : les setlists de `getSetlists()`,
// le recueil (`/songs-index.json`) et la date du jour passée en argument.
// Rien n'est écrit, rien d'autre n'est lu.

import { ALL_CATEGORIES, type FSSetlist } from "@/lib/firebase/setlists";
import { normalizeName } from "@/lib/planning/names";
import { noteToIndex } from "@/lib/transpose";
import type { SongIndexEntry } from "@/types/song";

/** Mois glissants jusqu'à hier, tout l'historique, ou des dates libres (AAAA-MM-JJ, bornes comprises). */
export type Periode = { mois: 3 | 6 | 12 } | "debut" | { du: string; au: string };
/** `null` = tout (Q8). La langue est celle du chant : elle retire des lignes, pas des setlists. */
export type FiltresStats = { periode: Periode; service: string | null; langue: "fr" | "zh" | null; presidence: string | null };
export type LigneChant = {
  slug: string; titre: string; langue: "fr" | "zh" | null;  // null = absent du recueil
  rang: number; setlists: number; part: number;              // part de 0 à 1
  derniereFois: string; tonalites: string[]; tendance: number | null; // plusieurs tonalités = ex aequo ; null = « — »
};
export type StatsChants = {
  comptees: { nombre: number; du: string | null; au: string | null };
  plusJoues: LigneChant[];
  jamaisJoues: { slug: string; titre: string; langue: "fr" | "zh"; artiste: string; derniereFois: string | null }[];
  aRedecouvrir: { slug: string; titre: string; langue: "fr" | "zh" | null; avant: number; derniereFois: string; tonalites: string[] }[];
};

type SetlistLue = Pick<FSSetlist, "id" | "date" | "category" | "leader" | "items" | "isDraft" | "isPrivate">;
type ChantDuRecueil = Pick<SongIndexEntry, "slug" | "title" | "language" | "artist" | "originalKey">;
/** Un chant dans une setlist comptée : sa date et la tonalité jouée (null = inconnue). */
type Passage = { jour: string; tonalite: string | null };

/** « Au moins 3 setlists avant la période » (Q11). */
export const SEUIL_A_REDECOUVRIR = 3;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

// ─── Dates (AAAA-MM-JJ, en UTC pour ignorer les fuseaux) ──────────────────────

const enMs = (jour: string) => Date.parse(`${jour}T00:00:00Z`);
const deux = (n: number) => String(n).padStart(2, "0");

/** Le jour d'avant (« 2026-10-03 » pour « 2026-10-04 »). */
export function veille(jour: string): string {
  return new Date(enMs(jour) - 86_400_000).toISOString().slice(0, 10);
}

/** Même date N mois plus tôt ; un jour qui n'existe pas (31/09) devient le dernier du mois. */
function moisPlusTot(jour: string, n: number): string {
  const [a, m, j] = jour.split("-").map(Number);
  const total = a * 12 + (m - 1) - n;
  const an = Math.floor(total / 12);
  const mois = total - an * 12;
  const dernierJour = new Date(Date.UTC(an, mois + 1, 0)).getUTCDate();
  return `${an}-${deux(mois + 1)}-${deux(Math.min(j, dernierJour))}`;
}

/** Bornes comprises d'une période (Q7) ; la fin n'est jamais après hier, `du: null` = depuis le début. */
export function bornesDeLaPeriode(periode: Periode, aujourdhui: string): { du: string | null; au: string } {
  const hier = veille(aujourdhui);
  if (periode === "debut") return { du: null, au: hier };
  if ("mois" in periode) return { du: moisPlusTot(aujourdhui, periode.mois), au: hier };
  return { du: periode.du, au: periode.au < hier ? periode.au : hier };
}

/** Publiée et passée (Q3) : ni brouillon ni privée, datée d'avant aujourd'hui. */
function publieesPassees(setlists: SetlistLue[], aujourdhui: string): (SetlistLue & { jour: string })[] {
  return setlists.flatMap((s) => {
    const jour = (s.date ?? "").slice(0, 10);
    return !s.isDraft && !s.isPrivate && JOUR.test(jour) && jour < aujourdhui ? [{ ...s, jour }] : [];
  });
}

/** Le début de l'historique : la première setlist publiée passée (Q3), `null` s'il n'y en a pas.
 *  « À redécouvrir » (Q11) n'a rien avant la période quand elle commence avant ce jour. */
export function debutDeLHistorique(setlists: SetlistLue[], aujourdhui: string): string | null {
  return publieesPassees(setlists, aujourdhui).reduce<string | null>((min, s) => (min === null || s.jour < min ? s.jour : min), null);
}

/** « 20/09 », l'année si ce n'est pas l'année en cours (« 20/09/2025 »). */
export function jourCourt(jour: string, aujourdhui: string): string {
  const [a, m, j] = jour.split("-");
  return a === aujourdhui.slice(0, 4) ? `${j}/${m}` : `${j}/${m}/${a}`;
}

/** « 5 octobre 2025 » (sous-titre de la page, note du détail d'un chant). */
export const jourEnLettres = (jour: string, zh: boolean) =>
  new Intl.DateTimeFormat(zh ? "zh-CN" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${jour}T12:00:00`));

/** Le service sans « Groupe » (« Groupe Fidélité » → « Fidélité ») ; les autres inchangés. */
export function serviceCourt(service: string): string {
  return service.replace(/^Groupe\s+/, "");
}

// ─── Les chants d'une setlist (Q4) ────────────────────────────────────────────

/** Les chants d'une setlist, dans l'ordre : transitions ignorées, fusions dépliées, chaque
 *  chant une fois avec la tonalité de sa première apparition (`null` = l'originale du recueil). */
export function chantsDeLaSetlist(s: Pick<FSSetlist, "items">): { slug: string; tonalite: string | null }[] {
  const chants = new Map<string, string | null>();
  const ajouter = (slug: string, cle: string | null) => {
    if (slug && !chants.has(slug)) chants.set(slug, cle || null);
  };
  for (const it of s.items ?? []) {
    if (it.type === "transition") continue;
    if (it.type === "fusion") for (const f of it.fusionSongs ?? []) ajouter(f.songSlug, f.keyOverride);
    else ajouter(it.songSlug, it.keyOverride);
  }
  return [...chants].map(([slug, tonalite]) => ({ slug, tonalite }));
}

function passagesParChant(setlists: { jour: string; items: FSSetlist["items"] }[], recueil: Map<string, ChantDuRecueil>) {
  const passages = new Map<string, Passage[]>();
  for (const s of setlists) {
    for (const { slug, tonalite } of chantsDeLaSetlist(s)) {
      const liste = passages.get(slug) ?? [];
      liste.push({ jour: s.jour, tonalite: tonalite ?? recueil.get(slug)?.originalKey ?? null });
      passages.set(slug, liste);
    }
  }
  return passages;
}

const derniere = (passages: Passage[]) => passages.reduce((max, p) => (p.jour > max ? p.jour : max), "");

// ─── La tonalité la plus jouée (Q5) ───────────────────────────────────────────

/** Les tonalités les plus jouées : deux graphies d'une même hauteur (C#, Db) se regroupent sous la
 *  plus fréquente (à égalité, la plus récente) ; un nom inconnu reste à part. Ex aequo : toutes,
 *  la plus récente d'abord. */
function tonalitesLesPlusJouees(passages: Passage[]): string[] {
  type Compte = { n: number; dernier: string };
  const groupes = new Map<string, Compte & { graphies: Map<string, Compte> }>();
  for (const { jour, tonalite } of passages) {
    if (!tonalite) continue;
    const hauteur = noteToIndex(tonalite);
    const cle = hauteur === -1 ? `nom:${tonalite}` : `hauteur:${hauteur}${/m$/.test(tonalite) ? "m" : ""}`;
    const g = groupes.get(cle) ?? { n: 0, dernier: "", graphies: new Map<string, Compte>() };
    const graphie = g.graphies.get(tonalite) ?? { n: 0, dernier: "" };
    g.n++; graphie.n++;
    if (jour > g.dernier) g.dernier = jour;
    if (jour > graphie.dernier) graphie.dernier = jour;
    g.graphies.set(tonalite, graphie);
    groupes.set(cle, g);
  }
  const plusFrequent = <T extends Compte>(a: T, b: T) => b.n - a.n || b.dernier.localeCompare(a.dernier);
  const tries = [...groupes.values()].sort(plusFrequent);
  return tries
    .filter((g) => g.n === tries[0].n)
    .map((g) => [...g.graphies].sort(([, a], [, b]) => plusFrequent(a, b))[0][0]);
}

// ─── Le calcul ────────────────────────────────────────────────────────────────

export function statsChants(setlists: SetlistLue[], index: ChantDuRecueil[], f: FiltresStats, aujourdhui: string): StatsChants {
  const recueil = new Map(index.map((c) => [c.slug, c]));
  const presidence = f.presidence === null ? null : normalizeName(f.presidence);
  // Service et présidence choisissent des setlists ; la période les borne.
  const eligibles = publieesPassees(setlists, aujourdhui).filter((s) =>
    (f.service === null || s.category === f.service) &&
    (presidence === null || normalizeName(s.leader ?? "") === presidence));
  const { du, au } = bornesDeLaPeriode(f.periode, aujourdhui);
  const comptees = eligibles.filter((s) => (du === null || s.jour >= du) && s.jour <= au);
  const jours = comptees.map((s) => s.jour).sort();
  const nombre = comptees.length;
  // La langue est celle du chant (Q8) : un chant absent du recueil n'en a pas.
  const garde = (slug: string) => f.langue === null || recueil.get(slug)?.language === f.langue;
  const titre = (slug: string) => recueil.get(slug)?.title ?? slug;
  const langue = (slug: string) => recueil.get(slug)?.language ?? null;

  // Tendance (Q10) : seconde moitié − première, coupées au milieu entre la première et la
  // dernière setlist comptée ; une setlist pile au milieu ouvre la seconde moitié.
  const premier = jours[0], dernier = jours[nombre - 1];
  const milieu = nombre > 0 && premier !== dernier ? (enMs(premier) + enMs(dernier)) / 2 : null;
  const tendance = (passages: Passage[]) => {
    if (milieu === null) return null;
    const apres = passages.filter((p) => enMs(p.jour) >= milieu).length;
    return apres - (passages.length - apres);
  };

  const pendant = passagesParChant(comptees, recueil);
  const plusJoues: LigneChant[] = [...pendant]
    .filter(([slug]) => garde(slug))
    .map(([slug, passages]) => ({
      slug, titre: titre(slug), langue: langue(slug), rang: 0,
      setlists: passages.length, part: passages.length / nombre,
      derniereFois: derniere(passages), tonalites: tonalitesLesPlusJouees(passages), tendance: tendance(passages),
    }))
    // Rang (Q9) : au nombre de setlists, puis la dernière fois (la plus récente d'abord), puis le titre.
    .sort((a, b) => b.setlists - a.setlists || b.derniereFois.localeCompare(a.derniereFois) || a.titre.localeCompare(b.titre, "fr"))
    .map((ligne, i) => ({ ...ligne, rang: i + 1 }));

  // Jamais joués (Q11) : dernière fois toutes dates confondues, mêmes service et présidence.
  const toutes = passagesParChant(eligibles, recueil);
  const jamaisJoues = index
    .filter((c) => !pendant.has(c.slug) && garde(c.slug))
    .map((c) => {
      const passages = toutes.get(c.slug);
      return { slug: c.slug, titre: c.title, langue: c.language, artiste: c.artist, derniereFois: passages ? derniere(passages) : null };
    });

  // À redécouvrir (Q11) : au moins 3 setlists avant la période, aucune pendant. « Depuis le début » n'a pas d'avant.
  const avant = du === null ? new Map<string, Passage[]>() : passagesParChant(eligibles.filter((s) => s.jour < du), recueil);
  const aRedecouvrir = [...avant]
    .filter(([slug, passages]) => passages.length >= SEUIL_A_REDECOUVRIR && !pendant.has(slug) && garde(slug))
    .map(([slug, passages]) => ({
      slug, titre: titre(slug), langue: langue(slug), avant: passages.length,
      derniereFois: derniere(passages), tonalites: tonalitesLesPlusJouees(passages),
    }))
    .sort((a, b) => b.avant - a.avant || b.derniereFois.localeCompare(a.derniereFois) || a.titre.localeCompare(b.titre, "fr"));

  return {
    comptees: { nombre, du: premier ?? null, au: dernier ?? null },
    plusJoues, jamaisJoues, aRedecouvrir,
  };
}

// ─── Un chant (lot ST, docs/spec-jianpu-entete-statistiques.md, ST2) ──────────

export type StatsDuChant = {
  total: number;                                       // setlists publiées passées (dans la période)
  derniere: { jour: string; service: string } | null;
  tonalites: string[];                                 // la plus jouée (règle Q5)
  parService: { service: string; fois: number; derniere: string }[]; // fois décroissant, puis la plus récente
  jamaisDans: string[];                                // services avec ≥ 1 setlist comptée, où le chant n'est jamais
  prochaine: { jour: string; service: string; setlistId: string } | null; // publiée, date ≥ aujourd'hui, la plus proche
};

/** Ce que les setlists disent d'un chant : mêmes setlists comptées que `statsChants` (Q3, bornées par la
 *  période), sans filtre de service ni de présidence. `sauf` : une setlist à ignorer partout (celle qu'on édite).
 *  La prochaine est indépendante de la période. */
export function statsDuChant(setlists: SetlistLue[], index: ChantDuRecueil[], slug: string, periode: Periode, aujourdhui: string, sauf?: string): StatsDuChant {
  const recueil = new Map(index.map((c) => [c.slug, c]));
  const { du, au } = bornesDeLaPeriode(periode, aujourdhui);
  const autres = setlists.filter((s) => s.id !== sauf);
  const comptees = publieesPassees(autres, aujourdhui).filter((s) => (du === null || s.jour >= du) && s.jour <= au);
  const avec = comptees.filter((s) => chantsDeLaSetlist(s).some((c) => c.slug === slug));

  const plusRecente = avec.reduce<(typeof avec)[number] | null>((max, s) => (max === null || s.jour > max.jour ? s : max), null);

  const parServiceMap = new Map<string, { fois: number; derniere: string }>();
  for (const s of avec) {
    if (!s.category) continue;
    const ligne = parServiceMap.get(s.category) ?? { fois: 0, derniere: "" };
    ligne.fois++;
    if (s.jour > ligne.derniere) ligne.derniere = s.jour;
    parServiceMap.set(s.category, ligne);
  }
  const parService = [...parServiceMap]
    .map(([service, l]) => ({ service, ...l }))
    .sort((a, b) => b.fois - a.fois || b.derniere.localeCompare(a.derniere));

  // Services avec au moins une setlist comptée où le chant n'est jamais, dans l'ordre des catégories (inconnues ensuite, A→Z).
  const ordre = ALL_CATEGORIES as readonly string[];
  const rang = (c: string) => (ordre.includes(c) ? ordre.indexOf(c) : ordre.length);
  const jamaisDans = [...new Set(comptees.map((s) => s.category).filter((c) => c && !parServiceMap.has(c)))]
    .sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, "fr"));

  const prochaine = autres
    .flatMap((s) => {
      const jour = (s.date ?? "").slice(0, 10);
      return !s.isDraft && !s.isPrivate && JOUR.test(jour) && jour >= aujourdhui && chantsDeLaSetlist(s).some((c) => c.slug === slug)
        ? [{ jour, service: s.category, setlistId: s.id }] : [];
    })
    .sort((a, b) => a.jour.localeCompare(b.jour))[0] ?? null;

  return {
    total: avec.length,
    derniere: plusRecente ? { jour: plusRecente.jour, service: plusRecente.category } : null,
    tonalites: tonalitesLesPlusJouees(passagesParChant(avec, recueil).get(slug) ?? []),
    parService, jamaisDans, prochaine,
  };
}

// ─── Personnes et groupes (lot SP, docs/spec-stats-personnes-groupes.md, SP1) ─

export type StatsPresidence = {
  total: number;                                          // setlists comptées (D4) dans la période
  derniere: { jour: string; service: string } | null;
  parService: { service: string; fois: number; derniere: string }[]; // fois ↓, puis la plus récente
  chants: { slug: string; fois: number }[];                // fois ↓, puis dernière ↓, puis titre
  jamaisChoisis: number;                                   // chants du recueil absents de ses setlists comptées
  prochaine: { jour: string; service: string; setlistId: string } | null; // publiée, ≥ aujourd'hui
};
export type LignePresidence = { nom: string; fois: number; derniere: string; services: string[] };
export type StatsGroupe = {
  setlists: number; parMois: number;          // setlists / mois entre la première et la dernière comptées (1 décimale)
  chantsDifferents: number; partZh: number;   // part des passages de chants 中文, 0 à 1
  tonalites: string[];                        // la plus jouée (règle Q5)
};

/** Les setlists comptées (Q3) dans la période, sans filtre de service ni de présidence. */
function setlistsDansLaPeriode(setlists: SetlistLue[], periode: Periode, aujourdhui: string) {
  const { du, au } = bornesDeLaPeriode(periode, aujourdhui);
  return publieesPassees(setlists, aujourdhui).filter((s) => (du === null || s.jour >= du) && s.jour <= au);
}

/** Les présidences d'une personne (P1) : les setlists dont `leader` a le même `normalizeName` que `nom`.
 *  Mêmes setlists comptées que `statsChants` ; la prochaine est indépendante de la période. */
export function statsPresidence(setlists: SetlistLue[], index: ChantDuRecueil[], nom: string, periode: Periode, aujourdhui: string): StatsPresidence {
  const cle = normalizeName(nom);
  const sienne = (s: SetlistLue) => normalizeName(s.leader ?? "") === cle;
  const recueil = new Map(index.map((c) => [c.slug, c]));
  const comptees = setlistsDansLaPeriode(setlists, periode, aujourdhui).filter(sienne);

  const plusRecente = comptees.reduce<(typeof comptees)[number] | null>((max, s) => (max === null || s.jour > max.jour ? s : max), null);

  const parServiceMap = new Map<string, { fois: number; derniere: string }>();
  for (const s of comptees) {
    if (!s.category) continue;
    const ligne = parServiceMap.get(s.category) ?? { fois: 0, derniere: "" };
    ligne.fois++;
    if (s.jour > ligne.derniere) ligne.derniere = s.jour;
    parServiceMap.set(s.category, ligne);
  }
  const parService = [...parServiceMap]
    .map(([service, l]) => ({ service, ...l }))
    .sort((a, b) => b.fois - a.fois || b.derniere.localeCompare(a.derniere));

  const passages = passagesParChant(comptees, recueil);
  const chants = [...passages]
    .map(([slug, p]) => ({ slug, fois: p.length, derniere: derniere(p) }))
    .sort((a, b) => b.fois - a.fois || b.derniere.localeCompare(a.derniere)
      || (recueil.get(a.slug)?.title ?? a.slug).localeCompare(recueil.get(b.slug)?.title ?? b.slug, "fr"))
    .map(({ slug, fois }) => ({ slug, fois }));

  const prochaine = setlists
    .flatMap((s) => {
      const jour = (s.date ?? "").slice(0, 10);
      return !s.isDraft && !s.isPrivate && JOUR.test(jour) && jour >= aujourdhui && sienne(s)
        ? [{ jour, service: s.category, setlistId: s.id }] : [];
    })
    .sort((a, b) => a.jour.localeCompare(b.jour))[0] ?? null;

  return {
    total: comptees.length,
    derniere: plusRecente ? { jour: plusRecente.jour, service: plusRecente.category } : null,
    parService, chants,
    jamaisChoisis: index.filter((c) => !passages.has(c.slug)).length,
    prochaine,
  };
}

/** Une ligne par présidence (leader regroupé par `normalizeName`, vide ignoré), sous sa graphie la plus
 *  fréquente (à égalité la plus récente), dans la période ; `service` non nul = les setlists de ce service.
 *  Tri : fois ↓, dernière ↓, nom A→Z. */
export function presidences(setlists: SetlistLue[], periode: Periode, aujourdhui: string, service: string | null): LignePresidence[] {
  type Groupe = { fois: number; derniere: string; services: Set<string>; graphies: Map<string, { n: number; dernier: string }> };
  const groupes = new Map<string, Groupe>();
  for (const s of setlistsDansLaPeriode(setlists, periode, aujourdhui)) {
    if (service !== null && s.category !== service) continue;
    const graphie = (s.leader ?? "").trim();
    const cle = normalizeName(graphie);
    if (!cle) continue;
    const g = groupes.get(cle) ?? { fois: 0, derniere: "", services: new Set<string>(), graphies: new Map() };
    g.fois++;
    if (s.jour > g.derniere) g.derniere = s.jour;
    if (s.category) g.services.add(s.category);
    const compte = g.graphies.get(graphie) ?? { n: 0, dernier: "" };
    compte.n++;
    if (s.jour > compte.dernier) compte.dernier = s.jour;
    g.graphies.set(graphie, compte);
    groupes.set(cle, g);
  }
  const ordre = ALL_CATEGORIES as readonly string[];
  const rang = (c: string) => (ordre.includes(c) ? ordre.indexOf(c) : ordre.length);
  return [...groupes.values()]
    .map((g) => ({
      nom: [...g.graphies].sort(([, a], [, b]) => b.n - a.n || b.dernier.localeCompare(a.dernier))[0][0],
      fois: g.fois, derniere: g.derniere,
      services: [...g.services].sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, "fr")),
    }))
    .sort((a, b) => b.fois - a.fois || b.derniere.localeCompare(a.derniere) || a.nom.localeCompare(b.nom, "fr"));
}

/** Ce que les setlists disent d'un service (P4). « Mois entre » la première et la dernière setlist
 *  comptées : écart en jours / 30,44, au minimum 1 (une seule setlist → 1,0 par mois). */
export function statsGroupe(setlists: SetlistLue[], index: ChantDuRecueil[], service: string, periode: Periode, aujourdhui: string): StatsGroupe {
  const recueil = new Map(index.map((c) => [c.slug, c]));
  const comptees = setlistsDansLaPeriode(setlists, periode, aujourdhui).filter((s) => s.category === service);
  if (comptees.length === 0) return { setlists: 0, parMois: 0, chantsDifferents: 0, partZh: 0, tonalites: [] };

  const jours = comptees.map((s) => s.jour).sort();
  const mois = Math.max(1, (enMs(jours[jours.length - 1]) - enMs(jours[0])) / 86_400_000 / 30.44);
  const passages = passagesParChant(comptees, recueil);
  // Part 中文 : les passages (chant × setlist) des chants du recueil ; les chants hors recueil n'entrent pas.
  let zh = 0, connus = 0;
  for (const [slug, p] of passages) {
    const langue = recueil.get(slug)?.language;
    if (!langue) continue;
    connus += p.length;
    if (langue === "zh") zh += p.length;
  }
  return {
    setlists: comptees.length,
    parMois: Math.round((comptees.length / mois) * 10) / 10,
    chantsDifferents: passages.size,
    partZh: connus === 0 ? 0 : zh / connus,
    tonalites: tonalitesLesPlusJouees([...passages.values()].flat()),
  };
}

/** Le nom sous lequel les présidences d'un profil sont comptées (P6) : `planningName`, sinon prénom + nom. */
export function nomDePresidence(profil: { planningName?: string; firstName?: string; lastName?: string }): string {
  return profil.planningName?.trim() || `${profil.firstName ?? ""} ${profil.lastName ?? ""}`.trim();
}

// ─── La bibliothèque de l'éditeur (lot ST, ST5) ───────────────────────────────

/** Ce que l'éditeur sait de la setlist en cours : son service, sa date (AAAA-MM-JJ) et son id (`null` = création). */
export type ContexteBibliotheque = { service: string | null; date: string | null; setlistId: string | null };
export type StatsBibliotheque = {
  total: number;                                          // setlists publiées passées (toute période), hors celle qu'on édite
  dansService: { fois: number; derniere: string } | null; // dans les setlists comptées du service choisi
  jamaisNullePart: boolean;                               // total 0
  jamaisDansService: boolean;                             // service choisi, aucune fois dedans
  recent: { jour: string; avant: boolean; jours: number } | null; // D6 : même service, < 21 jours de la date
};

/** D6 : « joué récemment » = moins de 3 semaines, avant ou après. */
export const JOURS_RECENT = 21;

/** Un seul passage sur les setlists pour tous les `slugs` de la bibliothèque. Le repère « récent » (D6) voit
 *  les setlists publiées du même service passées ou à venir ; les comptes, les seules passées (Q3). `sauf` =
 *  `contexte.setlistId` est ignorée partout. */
export function statsBibliotheque(
  setlists: SetlistLue[], slugs: Iterable<string>, contexte: ContexteBibliotheque, aujourdhui: string,
): Map<string, StatsBibliotheque> {
  const { service } = contexte;
  const date = (contexte.date ?? "").slice(0, 10);
  const dateChoisie = JOUR.test(date) ? date : null;
  const sorties = new Map<string, StatsBibliotheque>();
  for (const slug of slugs) {
    sorties.set(slug, { total: 0, dansService: null, jamaisNullePart: true, jamaisDansService: service !== null, recent: null });
  }
  for (const s of setlists) {
    if (s.id === contexte.setlistId || s.isDraft || s.isPrivate) continue;
    const jour = (s.date ?? "").slice(0, 10);
    if (!JOUR.test(jour)) continue;
    const passee = jour < aujourdhui;
    const ecart = dateChoisie && service !== null && s.category === service ? Math.abs(enMs(jour) - enMs(dateChoisie)) / 86_400_000 : null;
    const proche = ecart !== null && ecart < JOURS_RECENT;
    if (!passee && !proche) continue;
    for (const { slug } of chantsDeLaSetlist(s)) {
      const e = sorties.get(slug);
      if (!e) continue;
      if (passee) {
        e.total++;
        e.jamaisNullePart = false;
        if (service !== null && s.category === service) {
          e.jamaisDansService = false;
          e.dansService = { fois: (e.dansService?.fois ?? 0) + 1, derniere: e.dansService && e.dansService.derniere > jour ? e.dansService.derniere : jour };
        }
      }
      if (proche && ecart !== null) {
        const avant = jour < dateChoisie!;
        const r = e.recent;
        // La plus proche en écart absolu ; à égalité, celle d'avant.
        if (!r || ecart < r.jours || (ecart === r.jours && avant && !r.avant)) e.recent = { jour, avant, jours: ecart };
      }
    }
  }
  return sorties;
}

// ─── Les choix des filtres (Q8) ───────────────────────────────────────────────

/** Les services (`connus` d'abord, dans leur ordre, puis toute catégorie inconnue trouvée, A→Z) et
 *  les présidences (le texte `leader` regroupé par `normalizeName`, sous sa graphie la plus fréquente,
 *  à égalité la plus récente, A→Z), lus dans les setlists publiées passées. */
export function choixDesFiltres(setlists: SetlistLue[], aujourdhui: string, connus: readonly string[]): { services: string[]; presidences: string[] } {
  const lues = publieesPassees(setlists, aujourdhui);
  const inconnus = [...new Set(lues.map((s) => s.category).filter((c) => c && !connus.includes(c)))]
    .sort((a, b) => a.localeCompare(b, "fr"));

  const graphies = new Map<string, Map<string, { n: number; dernier: string }>>();
  for (const s of lues) {
    const graphie = (s.leader ?? "").trim();
    const cle = normalizeName(graphie);
    if (!cle) continue;
    const parGraphie = graphies.get(cle) ?? new Map<string, { n: number; dernier: string }>();
    const compte = parGraphie.get(graphie) ?? { n: 0, dernier: "" };
    compte.n++;
    if (s.jour > compte.dernier) compte.dernier = s.jour;
    parGraphie.set(graphie, compte);
    graphies.set(cle, parGraphie);
  }
  const presidences = [...graphies.values()]
    .map((parGraphie) => [...parGraphie].sort(([, a], [, b]) => b.n - a.n || b.dernier.localeCompare(a.dernier))[0][0])
    .sort((a, b) => a.localeCompare(b, "fr"));

  return { services: [...connus, ...inconnus], presidences };
}

// ─── Libellés (Q6, Q10) ───────────────────────────────────────────────────────

/** « 13 % », arrondi à l'unité ; « < 1 % » plutôt que « 0 % ». */
export function libellePart(part: number): string {
  const pourcent = Math.round(part * 100);
  return pourcent === 0 && part > 0 ? "< 1 %" : `${pourcent} %`;
}

/** « +3 », « −1 » (signe moins), « = » ; « — » sans tendance. */
export function libelleTendance(tendance: number | null): string {
  if (tendance === null) return "—";
  if (tendance === 0) return "=";
  return tendance > 0 ? `+${tendance}` : `−${-tendance}`;
}
