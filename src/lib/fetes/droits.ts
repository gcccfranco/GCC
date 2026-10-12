// Qui saisit les chants et les musiques d'un passage de fête (docs/spec-chants-fetes.md, CF16,
// décisions 30, 35, 37, 45, 46). Fonctions pures : la route /api/fetes/droits (tranche CF-B) lit les
// profils, les groupes et le planning EDD, bâtit un `ContexteFetes` et appelle ces fonctions ; aucune
// fonction cliente ne recalcule les boutons.

import { normalizeName, splitNames } from "@/lib/planning/names";
import { EDD_PERIODES, type EddPeriode } from "@/lib/planning/utils";
import type { Language } from "@/types/common";
import type { Passage } from "@/types/programme";
import { libelleEdition } from "@/lib/scene/fetes";
import { groupeDuQui, libelleQui } from "./qui";

/** Un compte, réduit à ce que la règle lit. `groupe` = `groupeDe(profil)` du lot 2 ; `coordination` =
 *  `isCoordination(user, profil)` déjà résolu (admin compris). */
export interface ProfilFete {
  uid: string;
  groupe: string | null;
  serviceRoles: Record<string, readonly string[]>;
  dansEquipes: readonly string[];
  planningName: string;
  coordination: boolean;
}

/** Un document `groupes/{id}` (lot 2) : président, VP, rôles reliés ou non à une colonne du planning,
 *  titulaires (uids). `saisirFetes` = la case « Saisir les chants des fêtes » du rôle (absent = non). */
export interface GroupeFete {
  president: string | null;
  vps: readonly string[];
  roles: readonly { colonne: string | null; saisirFetes?: boolean; titulaires: readonly string[] }[];
}

/** Le planning EDD tel que `loadPlanningData` le rend : par période, par classe, des lignes
 *  `[date, présidence, suppléant, piano, cajon, guitare, cours]`. */
export type PlanningEddFete = Readonly<Record<string, { classes: Readonly<Record<string, readonly (readonly string[])[]>> }>>;

export interface ContexteFetes {
  profils: readonly ProfilFete[];
  /** Par id de groupe (`paix`, `fidelite`, `bonte`, `amour`, `joie`). */
  groupes: Readonly<Record<string, GroupeFete>>;
  edd: PlanningEddFete;
  /** Jour J de l'édition, « AAAA-MM-JJ ». */
  jourJ: string;
}

export type RaisonDroit =
  | "president" | "vp" | "musicien" | "role-musicien" | "role-coche" | "planning-edd" | "team-edd" | "team-louange";

export interface AyantDroit { uid: string; raison: RaisonDroit }

/** Colonnes de musicien des groupes (planning des groupes, `src/lib/planning/grilles.ts`). */
const COLONNES_MUSICIENS: Record<string, readonly string[]> = {
  paix: ["musiciens", "percussion"],
  bonte: ["musiciens", "percussion"],
  fidelite: ["pianiste", "guitariste", "batterie"],
};

/** Catégorie de service d'un groupe, clé de `serviceRoles` (rôle de service « musicien »). */
const CATEGORIE_GROUPE: Record<string, string> = {
  paix: "Groupe Paix",
  fidelite: "Groupe Fidélité",
  bonte: "Groupe Bonté",
};

/** Colonnes du planning EDD qui font un louangeur : présidence, suppléant, piano, cajon (1 à 4). */
const COLONNES_EDD = [1, 2, 3, 4];

/** La période EDD qui contient le jour J (Noël → Nov–Déc, Pâques → Mars–Avr), même découpage que
 *  `periodeEdd` (src/lib/planning/sheets.ts). */
export function periodeEddDuJour(jourJ: string): EddPeriode {
  const mois = parseInt(jourJ.split("-")[1], 10);
  return EDD_PERIODES[mois <= 2 ? 0 : mois <= 4 ? 1 : mois <= 6 ? 2 : mois <= 8 ? 3 : mois <= 10 ? 4 : 5];
}

/** Les comptes qui saisissent pour **un** « Qui », avec la raison de chacun (une par compte, la
 *  première du tableau de CF16). Sans la coordination, qui passe par `ProfilFete.coordination`. */
export function ayantsDroitDuQui(qui: string, ctx: ContexteFetes): AyantDroit[] {
  const trouves = new Map<string, RaisonDroit>();
  const ajoute = (uid: string | null | undefined, raison: RaisonDroit) => {
    if (uid && !trouves.has(uid)) trouves.set(uid, raison);
  };
  const profil = (uid: string) => ctx.profils.find((p) => p.uid === uid);
  const groupe = groupeDuQui(qui);

  if (groupe) {
    const doc = ctx.groupes[groupe];
    // Un président, un VP ou un titulaire ne compte que s'il appartient au groupe (OG2, OG3).
    const duGroupe = (uid: string) => profil(uid)?.groupe === groupe;
    if (doc) {
      if (doc.president && duGroupe(doc.president)) ajoute(doc.president, "president");
      for (const uid of doc.vps) if (duGroupe(uid)) ajoute(uid, "vp");
    }
    // (a) rôle de service « musicien » du groupe (transition, D17 du lot 2) ; la présidence de séance
    // ne saisit pas à ce titre (décision 45, Q10).
    const categorie = CATEGORIE_GROUPE[groupe];
    if (categorie) for (const p of ctx.profils) if (p.serviceRoles[categorie]?.includes("musicien")) ajoute(p.uid, "musicien");
    if (doc) {
      const colonnes = COLONNES_MUSICIENS[groupe] ?? [];
      for (const role of doc.roles) {
        // (b) titulaires d'un rôle relié à une colonne de musicien ; (c) rôles avec la case cochée.
        const raison: RaisonDroit | null = role.colonne && colonnes.includes(role.colonne) ? "role-musicien" : role.saisirFetes === true ? "role-coche" : null;
        if (!raison) continue;
        for (const uid of role.titulaires) if (duGroupe(uid)) ajoute(uid, raison);
      }
    }
  } else if (qui.startsWith("EDD ")) {
    const classe = qui.slice(4);
    if (classe === "小班") {
      // Pas de planning EDD pour 小班 : les membres de TEAM EDD (décision 45, Q3).
      for (const p of ctx.profils) if (p.dansEquipes.includes("edd")) ajoute(p.uid, "team-edd");
    } else {
      // Tous les dimanches de la période EDD du jour J, de l'année du jour J (décision 45, Q4).
      const annee = ctx.jourJ.slice(0, 4);
      const lignes = ctx.edd[periodeEddDuJour(ctx.jourJ)]?.classes[classe] ?? [];
      const noms = new Set<string>();
      for (const ligne of lignes) {
        if (!ligne[0]?.startsWith(annee)) continue;
        for (const c of COLONNES_EDD) for (const n of splitNames(ligne[c] ?? "")) noms.add(normalizeName(n));
      }
      for (const p of ctx.profils) if (p.planningName && noms.has(normalizeName(p.planningName))) ajoute(p.uid, "planning-edd");
    }
  } else if (qui === "Franco") {
    // L'équipe de l'organigramme, pas le public « Louange élargi » (choix de la spec).
    for (const p of ctx.profils) if (p.dansEquipes.includes("louange")) ajoute(p.uid, "team-louange");
  }
  return [...trouves].map(([uid, raison]) => ({ uid, raison }));
}

export interface DroitsDeSaisie {
  /** « Saisir les chants » : un seul « Qui » (décision 37) et ayant droit ou coordination. */
  chants: boolean;
  /** « + Musique ou danse » : ayant droit d'au moins un « Qui » du passage, ou coordination (décision 46). */
  musiques: boolean;
  /** Le passage est « le mien » : au moins une raison autre que la coordination. */
  mien: boolean;
}

/** Les droits d'un compte sur un passage. */
export function droitsDeSaisie(passage: Pick<Passage, "qui">, ctx: ContexteFetes, uid: string): DroitsDeSaisie {
  const coordination = ctx.profils.find((p) => p.uid === uid)?.coordination === true;
  const ayantDroit = passage.qui.some((q) => ayantsDroitDuQui(q, ctx).some((a) => a.uid === uid));
  return {
    chants: passage.qui.length === 1 && (ayantDroit || coordination),
    musiques: ayantDroit || coordination,
    mien: ayantDroit,
  };
}

/** Titre d'une setlist de fête (CF10) : « Noël 2026 · Gp Paix », « 圣诞节 2026 · 法语崇拜 ». Un seul
 *  « Qui » (décision 37). */
export function titreSetlistFete(fete: "noel" | "paques", annee: number, qui: string, langue: Language = "fr"): string {
  return `${libelleEdition(fete, annee, langue)} · ${libelleQui(qui, langue)}`;
}
