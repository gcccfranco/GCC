// Migration des pôles vers les équipes (lot 1 du chantier « équipes et groupes »,
// docs/spec-equipes-sans-poles.md, tranche EQ-E ; décisions 7, 8, 40, 41) : le relevé qui la précède
// et le plan d'écritures. Tout est pur ou passe par un `Magasin` (la base vue comme des documents à
// chemin), de sorte que les tests tournent sur une base en mémoire. Le script
// scripts/poles-vers-equipes.ts branche l'Admin SDK ; il n'est lancé que par Timothée, à blanc
// d'abord, puis avec --ecrire. Aucune session ne lit la vraie base.
//
// Les noms de pôles (`da`, `media`, `orga`, `evenement`, `louange`) n'existent plus que dans ce fichier
// (critère EQ1 : le module de migration est le seul à les nommer).

import { EQUIPES } from "./table";
import { rattachementDe } from "./organigramme";
import { equipesDe, isAdminEmail } from "../access";

export type Donnees = Record<string, unknown>;

/** La base vue comme des documents rangés par chemin complet (`equipes/da/taches/x`). */
export interface Magasin {
  /** Le document, ou `null` s'il n'existe pas. */
  lire(chemin: string): Promise<Donnees | null>;
  /** Les documents d'une collection (enfants directs). */
  lister(collection: string): Promise<{ id: string; data: Donnees }[]>;
  /** Les seuls ids d'une collection (le journal de notifications est long). */
  listerIds(collection: string): Promise<string[]>;
  /** Crée ou remplace un document. */
  ecrire(chemin: string, data: Donnees): Promise<void>;
  /** Met à jour un document existant : `data` fusionné, puis les champs `supprimer` retirés. */
  maj(chemin: string, data: Donnees, supprimer?: string[]): Promise<void>;
  supprimer(chemin: string): Promise<void>;
}

/** Décision 7 : le pôle donne l'équipe de même nom, sauf Média -> medias et Événement -> evenementiel.
 *  L'ordre est celui des anciens pôles (DA, Média, Orga, Événement), puis Louange. */
export const POLE_VERS_EQUIPE: Record<string, string> = {
  da: "da", media: "medias", orga: "orga", evenement: "evenementiel", louange: "louange",
};
const POLES = Object.keys(POLE_VERS_EQUIPE);
/** Les pôles qu'un profil pouvait porter (`users.poles`) : Louange était implicite, jamais écrit. */
const POLES_DE_PROFIL = POLES.filter((p) => p !== "louange");

export const ETAPES: Record<number, string> = {
  1: "dansEquipes et referentDe recalculés depuis l'organigramme",
  2: "tâches et fois recopiées sous equipes/{équipe}/taches, source supprimée",
  3: "évènements pole:* passés en equipe:*",
  4: "réglage « poles » des widgets « À faire » traduit en « equipes »",
  5: "clés notifLog de Média et d'Événement recopiées",
  6: "champ equipes.pole retiré",
  7: "champ users.poles retiré",
};

export type Operation = {
  etape: number;
  genre: "ecrire" | "maj" | "supprimer";
  chemin: string;
  data?: Donnees;
  /** Champs retirés par une `maj`. */
  supprimer?: string[];
};

type MembreLu = { uid: string; referent: boolean; nom: string };
type EquipeLue = { id: string; pole: string | null; aChampPole: boolean; membres: MembreLu[] };
type ProfilLu = { uid: string; data: Donnees };
type FoisLue = { date: string; data: Donnees; dest: Donnees | null };
type TacheLue = { pole: string; id: string; data: Donnees; dest: Donnees | null; fois: FoisLue[] };
type EvenementLu = { id: string; data: Donnees; sujets: number };
type CleLue = { ancien: string; nouveau: string; data: Donnees; dejaLa: boolean };

/** Tout ce que la migration lit, avant de calculer le relevé et le plan. */
export type Etat = {
  equipes: EquipeLue[];
  profils: ProfilLu[];
  taches: TacheLue[];
  evenements: EvenementLu[];
  tableaux: { uid: string; data: Donnees }[];
  cles: CleLue[];
  /** Tâches rangées sous un pôle inconnu (`poles/<inconnu>/taches`) : comptées, jamais migrées. */
  tachesPoleInconnu: number;
};

export type Personne = { uid: string; nom: string };

export type Releve = {
  /** 1 : pôle coché dont aucune équipe de la personne ne le donne (`PolesDuMembre`, retiré en EQ-A). */
  horsOrganigramme: (Personne & { poles: string[] })[];
  /** 2 : qui perd un accès (pôle donné par une autre équipe que la cible, sans être dans la cible),
   *  et qui n'aura plus que Tâches et Réunions (EQ17 b : pôle, mais aucun autre droit de responsable). */
  pertesDAcces: (Personne & { pertes: { pole: string; cible: string; via: string[] }[]; perdBackOffice: boolean; sansEntree: boolean })[];
  /** Vrai si la migration a déjà été coupée entre les étapes 6 et 7 (`equipes.pole` retiré, `users.poles` encore là) :
   *  les listes 1 et 2 ne sont plus calculables et restent vides. */
  reprise: boolean;
  /** 3 : qui avait la coordination par le pôle Événement (hors admins). */
  coordinationAvant: Personne[];
  /** 4 : tâches dont le responsable ne sera pas dans l'équipe cible (décision 40)... */
  tachesResponsableHorsEquipe: { equipe: string; tacheId: string; titre: string; responsableUid: string; responsable: string }[];
  /** ... et tâches « toute l'équipe » d'une équipe cible sans référent (décision 41). */
  tachesSansReferent: { equipe: string; tacheId: string; titre: string }[];
  /** 5 : les chiffres. */
  chiffres: {
    tachesParPole: Record<string, { taches: number; fois: number }>;
    prevenirVisantUnPole: number;
    /** `prevenir.pole` d'un pôle inconnu : compté, laissé tel quel. */
    prevenirPoleInconnu: number;
    /** Tâches sous un pôle inconnu : comptées, non migrées. */
    tachesPoleInconnu: number;
    evenements: { reunions: number; autres: number; sujets: number; inconnus: number };
    tableauxAvecPoles: number;
    clesNotifLog: number;
    profilsRattachement: number;
  };
  /** Documents déjà sous equipes/ avec un autre contenu : ni écrasés, ni leur source supprimée. */
  conflits: string[];
  /** 6 : le nombre d'écritures du plan, par étape (les étapes vides sont absentes). */
  parEtape: Record<number, number>;
};

// ─── Lecture ────────────────────────────────────────────────────────────────

const tableau = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const CLE_A_RECOPIER = /^((?:rappel-tache-(?:J3|J1|retard|encours)-)|tache-fait-|tache-assigne-)(media|evenement)-/;

export async function lireEtat(m: Magasin): Promise<Etat> {
  const equipes: EquipeLue[] = (await m.lister("equipes")).map(({ id, data }) => ({
    id,
    pole: typeof data.pole === "string" ? data.pole : null,
    aChampPole: "pole" in data,
    membres: tableau<Donnees>(data.membres).map((x) => ({ uid: String(x.uid ?? ""), referent: x.referent === true, nom: String(x.nom ?? "") })),
  }));
  const profils = (await m.lister("users")).map(({ id, data }) => ({ uid: id, data })).sort((a, b) => (a.uid < b.uid ? -1 : 1));

  const taches: TacheLue[] = [];
  let tachesPoleInconnu = 0;
  for (const inconnu of (await m.listerIds("poles")).filter((id) => !POLES.includes(id))) {
    tachesPoleInconnu += (await m.listerIds(`poles/${inconnu}/taches`)).length;
  }
  for (const pole of POLES) {
    const cible = POLE_VERS_EQUIPE[pole];
    for (const t of await m.lister(`poles/${pole}/taches`)) {
      const fois: FoisLue[] = [];
      for (const f of await m.lister(`poles/${pole}/taches/${t.id}/fois`)) {
        fois.push({ date: f.id, data: f.data, dest: await m.lire(`equipes/${cible}/taches/${t.id}/fois/${f.id}`) });
      }
      taches.push({ pole, id: t.id, data: t.data, dest: await m.lire(`equipes/${cible}/taches/${t.id}`), fois });
    }
  }

  const evenements: EvenementLu[] = [];
  for (const e of await m.lister("evenements")) {
    if (typeof e.data.pour !== "string" || !e.data.pour.startsWith("pole:")) continue;
    evenements.push({ id: e.id, data: e.data, sujets: (await m.listerIds(`evenements/${e.id}/sujets`)).length });
  }

  const tableaux = (await m.lister("backOffice")).map(({ id, data }) => ({ uid: id, data }));

  const cles: CleLue[] = [];
  for (const ancien of await m.listerIds("notifLog")) {
    const trouve = CLE_A_RECOPIER.exec(ancien);
    if (!trouve) continue;
    const nouveau = ancien.replace(CLE_A_RECOPIER, `$1${POLE_VERS_EQUIPE[trouve[2]]}-`);
    const data = await m.lire(`notifLog/${ancien}`);
    if (data) cles.push({ ancien, nouveau, data, dejaLa: (await m.lire(`notifLog/${nouveau}`)) !== null });
  }
  return { equipes, profils, taches, evenements, tableaux, cles, tachesPoleInconnu };
}

// ─── Relevé et plan (purs) ──────────────────────────────────────────────────

function egal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).filter((k) => (a as Donnees)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Donnees)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => egal((a as Donnees)[k], (b as Donnees)[k]));
}

const nomDe = (p: ProfilLu): string =>
  [p.data.firstName, p.data.lastName].filter((x) => typeof x === "string" && x).join(" ") || String(p.data.email ?? p.uid);
const personne = (p: ProfilLu): Personne => ({ uid: p.uid, nom: nomDe(p) });
const polesDe = (p: ProfilLu): string[] => tableau<string>(p.data.poles).filter((x) => POLES_DE_PROFIL.includes(x));
const admin = (p: ProfilLu): boolean => isAdminEmail(typeof p.data.email === "string" ? p.data.email : null);

/** La tâche d'un pôle, telle qu'elle sera sous l'équipe : `equipe` remplace `pole`, `prevenir.pole`
 *  devient `prevenir.equipe`. Le reste est recopié tel quel (aucune valeur `undefined`). */
function tacheVersEquipe(data: Donnees, cible: string): Donnees {
  const { pole, ...reste } = data;
  void pole;
  const prevenir = reste.prevenir as Donnees | null | undefined;
  const sortie: Donnees = { ...reste, equipe: cible };
  // Un pôle inconnu n'est pas deviné : `prevenir` reste tel quel (compté dans le relevé).
  if (prevenir && typeof prevenir === "object" && typeof prevenir.pole === "string" && POLE_VERS_EQUIPE[prevenir.pole]) {
    sortie.prevenir = { equipe: POLE_VERS_EQUIPE[prevenir.pole] };
  }
  return sortie;
}

export function releveEtPlan(etat: Etat): { releve: Releve; plan: Operation[] } {
  const plan: Operation[] = [];
  const conflits: string[] = [];
  const equipesDuRattachement = etat.equipes.map((e) => ({ id: e.id, membres: e.membres }));
  const rattachement = new Map(etat.profils.map((p) => [p.uid, rattachementDe(p.uid, equipesDuRattachement)]));
  const profil = new Map(etat.profils.map((p) => [p.uid, p]));
  const membreDe = (p: ProfilLu | undefined, equipe: string): boolean =>
    !!p && equipesDe({ dansEquipes: rattachement.get(p.uid)!.dansEquipes, serviceRoles: p.data.serviceRoles as Record<string, string[]> | undefined }).includes(equipe);
  const referentsDe = (equipe: string) => etat.equipes.find((e) => e.id === equipe)?.membres.filter((m) => m.referent && m.uid) ?? [];

  // 1 : profils.
  let profilsRattachement = 0;
  for (const p of etat.profils) {
    const tout = rattachement.get(p.uid)!;
    const pareil = (["dansEquipes", "referentDe"] as const).every((k) => tableau<string>(p.data[k]).join(",") === tout[k].join(","));
    if (pareil) continue;
    profilsRattachement++;
    plan.push({ etape: 1, genre: "maj", chemin: `users/${p.uid}`, data: { dansEquipes: tout.dansEquipes, referentDe: tout.referentDe } });
  }

  // 2 : tâches. Un document déjà sous equipes/ avec un autre contenu est un conflit : on n'y touche pas.
  const tachesParPole: Releve["chiffres"]["tachesParPole"] = Object.fromEntries(POLES.map((p) => [p, { taches: 0, fois: 0 }]));
  let prevenirVisantUnPole = 0;
  let prevenirPoleInconnu = 0;
  const horsEquipe: Releve["tachesResponsableHorsEquipe"] = [];
  const sansReferent: Releve["tachesSansReferent"] = [];
  for (const t of etat.taches) {
    const cible = POLE_VERS_EQUIPE[t.pole];
    const chemin = `equipes/${cible}/taches/${t.id}`;
    tachesParPole[t.pole].taches++;
    tachesParPole[t.pole].fois += t.fois.length;
    const prevenir = t.data.prevenir as Donnees | null | undefined;
    if (prevenir && typeof prevenir.pole === "string") {
      if (POLE_VERS_EQUIPE[prevenir.pole]) prevenirVisantUnPole++; else prevenirPoleInconnu++;
    }
    const titre = String(t.data.titre ?? "");
    const responsableUid = typeof t.data.responsableUid === "string" && t.data.responsableUid ? t.data.responsableUid : null;
    if (responsableUid) {
      const p = profil.get(responsableUid);
      // Un admin garde l'accès à toutes les équipes : il n'est pas à signaler (comme en listes 2 et 3).
      if (!membreDe(p, cible) && !(p && admin(p))) {
        horsEquipe.push({ equipe: cible, tacheId: t.id, titre, responsableUid, responsable: p ? nomDe(p) : String(t.data.responsableNom ?? responsableUid) });
      }
    } else if (referentsDe(cible).length === 0) {
      sansReferent.push({ equipe: cible, tacheId: t.id, titre });
    }

    const nouvelle = tacheVersEquipe(t.data, cible);
    const fois = t.fois.map((f) => ({ ...f, chemin: `${chemin}/fois/${f.date}` }));
    const enConflit = [
      ...(t.dest && !egal(t.dest, nouvelle) ? [chemin] : []),
      ...fois.filter((f) => f.dest && !egal(f.dest, f.data)).map((f) => f.chemin),
    ];
    if (enConflit.length) { conflits.push(...enConflit); continue; }
    if (!t.dest) plan.push({ etape: 2, genre: "ecrire", chemin, data: nouvelle });
    for (const f of fois) if (!f.dest) plan.push({ etape: 2, genre: "ecrire", chemin: f.chemin, data: f.data });
    for (const f of fois) plan.push({ etape: 2, genre: "supprimer", chemin: `poles/${t.pole}/taches/${t.id}/fois/${f.date}` });
    plan.push({ etape: 2, genre: "supprimer", chemin: `poles/${t.pole}/taches/${t.id}` });
  }

  // 3 : évènements.
  const evenements = { reunions: 0, autres: 0, sujets: 0, inconnus: 0 };
  for (const e of etat.evenements) {
    const equipe = POLE_VERS_EQUIPE[String(e.data.pour).slice("pole:".length)];
    if (!equipe) { evenements.inconnus++; continue; }
    if (e.data.reunion === false) evenements.autres++; else evenements.reunions++;
    evenements.sujets += e.sujets;
    plan.push({ etape: 3, genre: "maj", chemin: `evenements/${e.id}`, data: { pour: `equipe:${equipe}` } });
  }

  // 4 : tableaux de bord.
  let tableauxAvecPoles = 0;
  for (const b of etat.tableaux) {
    const widgets = tableau<Donnees>(b.data.tableauDeBord);
    if (!widgets.some((w) => Array.isArray((w.reglages as Donnees | undefined)?.poles))) continue;
    tableauxAvecPoles++;
    const apres = widgets.map((w) => {
      const reglages = w.reglages as Donnees | undefined;
      if (!reglages || !Array.isArray(reglages.poles)) return w;
      const { poles, ...reste } = reglages;
      const equipes = [...new Set([...tableau<string>(reste.equipes), ...tableau<string>(poles).map((p) => POLE_VERS_EQUIPE[p]).filter(Boolean)])];
      return { ...w, reglages: { ...reste, equipes } };
    });
    plan.push({ etape: 4, genre: "maj", chemin: `backOffice/${b.uid}`, data: { tableauDeBord: apres } });
  }

  // 5 : journal des notifications.
  const aRecopier = etat.cles.filter((c) => !c.dejaLa);
  for (const c of aRecopier) plan.push({ etape: 5, genre: "ecrire", chemin: `notifLog/${c.nouveau}`, data: c.data });

  // 6 et 7 : les champs de pôle, en dernier (le relevé de chaque passage les lit).
  for (const e of etat.equipes) if (e.aChampPole) plan.push({ etape: 6, genre: "maj", chemin: `equipes/${e.id}`, data: {}, supprimer: ["pole"] });
  for (const p of etat.profils) if ("poles" in p.data) plan.push({ etape: 7, genre: "maj", chemin: `users/${p.uid}`, data: {}, supprimer: ["poles"] });

  // Les listes 1 à 3 (comptes). Reprise après une coupure entre les étapes 6 et 7 : sans `equipes.pole`,
  // tout porteur de pôle sortirait « coché à la main » ; les listes 1 et 2 sont alors laissées vides.
  const reprise = !etat.equipes.some((e) => e.aChampPole) && etat.profils.some((p) => polesDe(p).length > 0);
  const horsOrganigramme: Releve["horsOrganigramme"] = [];
  const pertesDAcces: Releve["pertesDAcces"] = [];
  const coordinationAvant: Personne[] = [];
  for (const p of etat.profils) {
    const poles = polesDe(p);
    const donnes = new Set(etat.equipes.filter((e) => e.pole && e.membres.some((m) => m.uid === p.uid)).map((e) => e.pole!));
    const hors = poles.filter((x) => !donnes.has(x));
    if (hors.length && !reprise) horsOrganigramme.push({ ...personne(p), poles: hors });
    if (admin(p)) continue;
    if (poles.includes("evenement")) coordinationAvant.push(personne(p));
    if (reprise) continue;
    const pertes = poles
      .filter((x) => !membreDe(p, POLE_VERS_EQUIPE[x]))
      .map((x) => ({
        pole: x, cible: POLE_VERS_EQUIPE[x],
        via: etat.equipes.filter((e) => e.pole === x && e.membres.some((m) => m.uid === p.uid)).map((e) => e.id),
      }));
    const autreDroit = ["plannings", "notify", "annonces"].some((k) => tableau(p.data[k]).length > 0)
      || p.data.equipes === true || rattachement.get(p.uid)!.referentDe.length > 0 || p.data.coordination === true;
    const perdBackOffice = poles.length > 0 && !autreDroit;
    // Sans équipe (ni rôle de service) non plus : `entreesBackOffice` rend [], pas même Tâches et Réunions.
    const sansEntree = perdBackOffice && equipesDe({ dansEquipes: rattachement.get(p.uid)!.dansEquipes, serviceRoles: p.data.serviceRoles as Record<string, string[]> | undefined }).length === 0;
    if (pertes.length || perdBackOffice) pertesDAcces.push({ ...personne(p), pertes, perdBackOffice, sansEntree });
  }

  const parEtape: Record<number, number> = {};
  for (const o of plan) parEtape[o.etape] = (parEtape[o.etape] ?? 0) + 1;
  return {
    plan,
    releve: {
      horsOrganigramme, pertesDAcces, coordinationAvant, reprise,
      tachesResponsableHorsEquipe: horsEquipe, tachesSansReferent: sansReferent,
      chiffres: { tachesParPole, prevenirVisantUnPole, prevenirPoleInconnu, tachesPoleInconnu: etat.tachesPoleInconnu, evenements, tableauxAvecPoles, clesNotifLog: aRecopier.length, profilsRattachement },
      conflits, parEtape,
    },
  };
}

/** Le même magasin, en lecture seule : toute écriture lève (le passage à blanc du script). */
export function enLectureSeule(m: Magasin): Magasin {
  const refus = async (): Promise<never> => { throw new Error("Écriture refusée : relancer avec --ecrire"); };
  return { ...m, ecrire: refus, maj: refus, supprimer: refus };
}

/** Lit la base (jamais d'écriture) puis calcule le relevé et le plan. */
export async function planifier(m: Magasin): Promise<{ releve: Releve; plan: Operation[] }> {
  return releveEtPlan(await lireEtat(m));
}

/** Exécute le plan, dans l'ordre des étapes. `surEtape` est appelé à l'entrée de chaque étape. */
export async function appliquer(m: Magasin, plan: Operation[], surEtape?: (etape: number, nombre: number) => void): Promise<void> {
  let courante = 0;
  for (const o of plan) {
    if (o.etape !== courante) {
      courante = o.etape;
      surEtape?.(courante, plan.filter((x) => x.etape === courante).length);
    }
    if (o.genre === "ecrire") await m.ecrire(o.chemin, o.data ?? {});
    else if (o.genre === "maj") await m.maj(o.chemin, o.data ?? {}, o.supprimer);
    else await m.supprimer(o.chemin);
  }
}

// ─── Texte du relevé (imprimé au terminal seulement, jamais écrit dans un fichier du dépôt) ───

const NOM_EQUIPE = Object.fromEntries(EQUIPES.map((e) => [e.id, e.nom]));
const equipeNom = (id: string) => NOM_EQUIPE[id] ?? (id === "louange" ? "Louange" : id);

export function formaterReleve(r: Releve): string[] {
  const l: string[] = [];
  const liste = (titre: string, lignes: string[], vide = "aucun") => {
    l.push("", `${titre} : ${lignes.length || vide}`);
    for (const x of lignes) l.push(`  - ${x}`);
  };
  l.push("RELEVÉ — pôles vers équipes (rien n'est écrit sans --ecrire)");
  if (r.reprise) l.push("", "Reprise : migration déjà coupée entre les étapes 6 et 7 (equipes.pole retiré, users.poles encore là). Les listes 1 et 2 ne sont plus calculables : laissées vides.");
  liste("1. Pôle coché hors organigramme (perdu à la migration)", r.horsOrganigramme.map((x) => `${x.nom} (${x.uid}) : ${x.poles.join(", ")}`));
  liste("2. Perdent un accès, ou perdent le Back-Office complet (Tâches et Réunions seulement, ou plus aucune entrée sans équipe) — ils l'avaient par un pôle seul",
    r.pertesDAcces.map((x) => {
      const pertes = x.pertes.map((p) => `${p.pole} -> ${equipeNom(p.cible)} (donné par ${p.via.map(equipeNom).join(", ") || "aucune équipe : coché à la main"})`).join(" ; ");
      return `${x.nom} (${x.uid})${pertes ? ` : ${pertes}` : ""}${x.perdBackOffice ? (x.sansEntree ? " — perd le Back-Office complet : plus aucune entrée (aucune équipe)" : " — perd le Back-Office complet (Tâches et Réunions seulement)") : ""}`;
    }));
  liste("3. Avaient la coordination par le pôle Événement (à cocher dans Personnes pour qui la garde)", r.coordinationAvant.map((x) => `${x.nom} (${x.uid})`));
  liste("4a. Tâches dont le responsable ne sera pas dans l'équipe cible",
    r.tachesResponsableHorsEquipe.map((x) => `${equipeNom(x.equipe)} : « ${x.titre} » (${x.tacheId}), responsable ${x.responsable}`));
  liste("4b. Tâches « toute l'équipe » d'une équipe sans référent (seul un admin les coche, personne n'est rappelé)",
    r.tachesSansReferent.map((x) => `${equipeNom(x.equipe)} : « ${x.titre} » (${x.tacheId})`));
  const c = r.chiffres;
  l.push("", "5. Chiffres");
  for (const [pole, n] of Object.entries(c.tachesParPole)) l.push(`  - pôle ${pole} -> ${equipeNom(POLE_VERS_EQUIPE[pole])} : ${n.taches} tâche(s), ${n.fois} fois`);
  l.push(
    `  - tâches dont « prévenir » vise un pôle : ${c.prevenirVisantUnPole} ; ${c.prevenirPoleInconnu} vers un pôle inconnu (laissées telles quelles)`,
    `  - tâches sous un pôle inconnu (non migrées) : ${c.tachesPoleInconnu}`,
    `  - évènements pole:* : ${c.evenements.reunions} réunion(s), ${c.evenements.autres} autre(s), ${c.evenements.sujets} sujet(s) ; ${c.evenements.inconnus} de pôle inconnu (non migrés)`,
    `  - tableaux de bord avec un widget « À faire » réglé par pôles : ${c.tableauxAvecPoles}`,
    `  - clés notifLog à recopier : ${c.clesNotifLog}`,
    `  - profils dont dansEquipes ou referentDe changeraient : ${c.profilsRattachement}`,
  );
  if (r.conflits.length) {
    l.push("", `CONFLITS (déjà sous equipes/ avec un autre contenu : non écrasés, source gardée, à régler à la main) : ${r.conflits.length}`);
    for (const x of r.conflits) l.push(`  - ${x}`);
  }
  l.push("", "6. Plan (écritures que ferait --ecrire)");
  const etapes = Object.keys(ETAPES).map(Number);
  for (const e of etapes) l.push(`  Étape ${e} — ${ETAPES[e]} : ${r.parEtape[e] ?? 0} opération(s)`);
  const total = Object.values(r.parEtape).reduce((a, b) => a + b, 0);
  l.push(`  Total : ${total} opération(s)${total === 0 ? " — rien à migrer" : ""}`);
  return l;
}
