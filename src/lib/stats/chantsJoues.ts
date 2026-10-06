// Statistiques des chants joués (lot U7, docs/spec-statistiques.md, décisions
// Q3 à Q12). Calcul pur, dans le navigateur : les setlists de `getSetlists()`,
// le recueil (`/songs-index.json`) et la date du jour passée en argument.
// Rien n'est écrit, rien d'autre n'est lu.

import type { FSSetlist } from "@/lib/firebase/setlists";
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

type SetlistLue = Pick<FSSetlist, "date" | "category" | "leader" | "items" | "isDraft" | "isPrivate">;
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
    const cle = hauteur === -1 ? `nom:${tonalite}` : `hauteur:${hauteur}`;
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
