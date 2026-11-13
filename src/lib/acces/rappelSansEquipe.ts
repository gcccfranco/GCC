// Lot AO, tranche AO-E (docs/spec-acces-organigramme.md, « Tranché le 21 et le 22/10/2026 ») : le lundi, une
// ligne de plus dans le rappel du matin du référent concerné — « N personnes au planning de ce mois ne sont dans
// aucune équipe » — pour qu'on les place dans l'organigramme. Logique pure : le cron (/api/cron/reminders) lit
// le planning, les équipes et les profils, et passe ici. Dates ISO lues en UTC, comme le reste du cron.

import { CULTE_ROLES, EDD_ROLES_COLS, INTERFRANCO_ROLES, INTERGROUPE_ROLES, normalizeName, splitNames, type PlanningData } from "@/lib/planning/names";
import { EDD_CLASSES, EDD_PERIODES } from "@/lib/planning/utils";
import type { NotifLang } from "@/types/user";
import type { MembreEquipe } from "@/types/equipe";

/** Les trois référents qui reçoivent le rappel : celui de Louange, celui de la Régie, celui de l'EDD. */
type DomaineReferent = "louange" | "regie" | "edd";

/** Ce que ce module lit d'un profil : le nom de planning, qui rattache un nom du planning à un compte. */
type ProfilRappel = { uid: string; planningName?: string };
/** Ce que ce module lit d'une équipe de l'organigramme (`equipes/{id}`). */
export type EquipeRappel = { id: string; membres: Pick<MembreEquipe, "nom" | "uid" | "referent">[] };

/** Adresse de la page de l'organigramme. */
export const URL_ORGANIGRAMME = "/back-office/equipes";

export function estLundi(today: string): boolean {
  return new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
}

const ROLES_REGIE = new Set(["Sono", "PPT"]);
const ROLES_LOUANGE = new Set(["Présidence", "Choriste", "Piano", "Guitare", "Batterie", "Cajon/Batterie"]);

/** Les noms du planning du mois de `today`, par domaine de référent, en graphie du planning, sans doublon.
 *  Culte, Intergroupe, Interfranco, Campus : Louange (présidence, choristes, instruments) ou Régie (Sono, PPT) ;
 *  classes de l'EDD : EDD. Les groupes, la Table et le petit déj : rien. */
function nomsDuMois(planning: PlanningData, today: string): Record<DomaineReferent, Map<string, string>> {
  const mois = today.slice(0, 7);
  const out: Record<DomaineReferent, Map<string, string>> = { louange: new Map(), regie: new Map(), edd: new Map() };
  const ajouter = (domaine: DomaineReferent, cellule: string | undefined) => {
    for (const nom of splitNames(cellule ?? "")) {
      const cle = normalizeName(nom);
      if (!out[domaine].has(cle)) out[domaine].set(cle, nom);
    }
  };
  const scanner = (rows: string[][], roles: [number, string][]) => {
    for (const r of rows) {
      if (!r[0]?.startsWith(mois)) continue;
      for (const [i, role] of roles) {
        if (ROLES_REGIE.has(role)) ajouter("regie", r[i]);
        else if (ROLES_LOUANGE.has(role)) ajouter("louange", r[i]);
      }
    }
  };
  scanner(planning.culte, CULTE_ROLES);
  scanner(planning.intergroupe, INTERGROUPE_ROLES);
  scanner(planning.interfranco, INTERFRANCO_ROLES);
  for (const s of planning.campus) {
    if (!s.date?.startsWith(mois)) continue;
    ajouter("louange", s.pres);
    ajouter("louange", s.ch);
    ajouter("louange", s.mu);
    ajouter("regie", s.rg);
  }
  for (const pk of EDD_PERIODES) {
    for (const cls of EDD_CLASSES) {
      for (const r of planning.edd[pk]?.classes?.[cls] ?? []) {
        if (!r[0]?.startsWith(mois)) continue;
        for (const [i] of EDD_ROLES_COLS) ajouter("edd", r[i]);
      }
    }
  }
  return out;
}

/** Pour chaque référent concerné (uid), les noms du planning de ce mois qui ne sont dans aucune équipe de
 *  l'organigramme, dans l'ordre alphabétique. Le lundi seulement ; un référent sans nom n'a pas d'entrée.
 *  Un nom est « dans une équipe » si le compte que son nom de planning désigne est membre d'une équipe, ou si
 *  son nom normalisé est celui d'un membre (avec ou sans compte). */
export function sansEquipeParReferent(
  planning: PlanningData,
  equipes: readonly EquipeRappel[],
  profils: readonly ProfilRappel[],
  today: string,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!estLundi(today)) return out;

  const uidsEnEquipe = new Set<string>();
  const nomsEnEquipe = new Set<string>();
  for (const e of equipes) for (const m of e.membres) {
    if (m.uid) uidsEnEquipe.add(m.uid);
    nomsEnEquipe.add(normalizeName(m.nom));
  }
  const uidsDuNom = new Map<string, string[]>();
  for (const p of profils) {
    if (!p.planningName?.trim()) continue;
    const cle = normalizeName(p.planningName);
    uidsDuNom.set(cle, [...(uidsDuNom.get(cle) ?? []), p.uid]);
  }
  const placee = (cle: string) => nomsEnEquipe.has(cle) || (uidsDuNom.get(cle) ?? []).some((u) => uidsEnEquipe.has(u));

  const noms = nomsDuMois(planning, today);
  for (const domaine of ["louange", "regie", "edd"] as const) {
    const sans = [...noms[domaine]].filter(([cle]) => !placee(cle)).map(([, nom]) => nom).sort((a, b) => a.localeCompare(b, "fr"));
    if (!sans.length) continue;
    const referents = equipes.find((e) => e.id === domaine)?.membres.filter((m) => m.referent && m.uid) ?? [];
    for (const r of referents) out.set(r.uid, [...new Set([...(out.get(r.uid) ?? []), ...sans])]);
  }
  return out;
}

/** Les lignes du rappel (une phrase, puis où aller) dans la langue du compte. Un push n'a pas de lien dans
 *  son corps : la seconde ligne dit où ouvrir l'organigramme (`URL_ORGANIGRAMME` quand la notification part seule). */
export function lignesSansEquipe(noms: string[], lang: NotifLang): string[] {
  if (!noms.length) return [];
  if (lang === "zh-CN") {
    return [`本月排班中有 ${noms.length} 人不在任何团队：${noms.join("、")}`, "请在此安排：后台 › 团队"];
  }
  const phrase = noms.length === 1
    ? `1 personne au planning de ce mois n'est dans aucune équipe : ${noms[0]}`
    : `${noms.length} personnes au planning de ce mois ne sont dans aucune équipe : ${noms.join(", ")}`;
  return [phrase, "À placer : Back-Office › Équipes"];
}

/** Titre de la notification quand la ligne part seule. */
export function titreSansEquipe(lang: NotifLang): string {
  return lang === "zh-CN" ? "团队" : "Équipes";
}
