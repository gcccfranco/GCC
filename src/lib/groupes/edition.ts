// Ce que l'écran de l'organigramme d'un groupe fait à son document (lot 2 du chantier « équipes et
// groupes », docs/spec-organigrammes-groupes.md, tranche OG-C) : rôles, titulaires, places, recherche
// d'un titulaire, nombre de personnes. Pur : l'écran l'appelle puis écrit le document en bloc
// (src/lib/firebase/groupes.ts).

import { normalizeName } from "@/lib/planning/names";
import type { OrganigrammeGroupe, RoleGroupe, Titulaire } from "@/types/groupe";
import { groupeDe, type ProfilGroupe } from "./organigramme";

export { comptesCites } from "./organigramme";
import { groupeDef, type GroupeId } from "./table";

/** OG10 : les rôles « au comité » d'abord, puis les autres, chacun dans l'ordre de création. */
export function trierRoles(roles: readonly RoleGroupe[]): RoleGroupe[] {
  return [...roles.filter((r) => r.comite), ...roles.filter((r) => !r.comite)];
}

/** Les places d'un rôle (OG11) : `total` nul = sans limite ; `reste` = il reste une place (orange). */
export function etatPlaces(role: Pick<RoleGroupe, "places" | "titulaires">) {
  const n = role.titulaires.length;
  const total = role.places;
  return { n, total, reste: total !== null && n < total, plein: total !== null && n >= total };
}

/** Un identifiant de rôle tiré au hasard (la colonne reliée et « Choisir » s'y rattachent). */
export function nouvelIdRole(): string {
  return `r-${Math.random().toString(36).slice(2, 10)}`;
}

/** Crée ou remplace un rôle. Publier inclut Remplir (OG13) ; pas de colonne pour un groupe sans
 *  planning ; le nom est coupé à 80 caractères ; jamais moins de places que de titulaires (OG11). */
export function enregistrerRole(groupe: OrganigrammeGroupe, role: RoleGroupe): OrganigrammeGroupe {
  const planning = groupeDef(groupe.id)?.planning ?? null;
  const propre: RoleGroupe = {
    ...role,
    nom: role.nom.trim().slice(0, 80),
    nomZh: role.nomZh.trim(),
    places: role.places === null ? null : Math.max(role.places, role.titulaires.length, 0),
    colonne: planning ? role.colonne : null,
    droits: { ...role.droits, remplir: role.droits.remplir || role.droits.publier },
  };
  const existe = groupe.roles.some((r) => r.id === role.id);
  return { ...groupe, roles: existe ? groupe.roles.map((r) => (r.id === role.id ? propre : r)) : [...groupe.roles, propre] };
}

export function supprimerRole(groupe: OrganigrammeGroupe, roleId: string): OrganigrammeGroupe {
  return { ...groupe, roles: groupe.roles.filter((r) => r.id !== roleId) };
}

const meme = (a: Titulaire, b: Titulaire) => (a.uid || b.uid ? a.uid === b.uid : normalizeName(a.nom) === normalizeName(b.nom));

/** Ajoute un titulaire à un rôle, sauf s'il y est déjà ou que le rôle est plein. */
export function ajouterTitulaire(groupe: OrganigrammeGroupe, roleId: string, t: Titulaire): OrganigrammeGroupe {
  return {
    ...groupe,
    roles: groupe.roles.map((r) =>
      r.id !== roleId || etatPlaces(r).plein || r.titulaires.some((x) => meme(x, t)) ? r : { ...r, titulaires: [...r.titulaires, t] }),
  };
}

export function retirerTitulaire(groupe: OrganigrammeGroupe, roleId: string, t: Titulaire): OrganigrammeGroupe {
  return { ...groupe, roles: groupe.roles.map((r) => (r.id === roleId ? { ...r, titulaires: r.titulaires.filter((x) => !meme(x, t)) } : r)) };
}

/** Les rôles d'une personne dans le groupe, hors `sauf` (« aussi Responsable louange », OG15). */
export function rolesDe(groupe: OrganigrammeGroupe, t: Titulaire, sauf?: string): RoleGroupe[] {
  return groupe.roles.filter((r) => r.id !== sauf && r.titulaires.some((x) => meme(x, t)));
}

type Compte = ProfilGroupe & { uid: string };

/** OG34 : les comptes du groupe (`groupeDe`) et les titulaires sans compte distincts. */
export function nombrePersonnes(groupe: OrganigrammeGroupe, comptes: readonly Compte[]): number {
  const duGroupe = comptes.filter((c) => groupeDe(c) === groupe.id).length;
  const sansCompte = new Set(
    [groupe.president, ...groupe.vp, ...groupe.roles.flatMap((r) => r.titulaires)]
      .filter((t): t is Titulaire => !!t && !t.uid)
      .map((t) => normalizeName(t.nom)),
  );
  return duGroupe + sansCompte.size;
}

/** Un compte proposé par « Ajouter un titulaire » (OG14) : du groupe, sans groupe (il y entrera),
 *  déjà titulaire (grisé), ou d'un autre groupe (grisé, inactif). */
export type Candidat = { uid: string; nom: string; etat: "groupe" | "entrera" | "deja" | "autre"; autre?: GroupeId };

const RANG: Record<Candidat["etat"], number> = { groupe: 0, entrera: 1, deja: 2, autre: 3 };

/** La recherche d'OG14 : prénom, nom, nom de planning, sans accents ni casse ; vide = rien. */
export function candidatsTitulaire(
  recherche: string,
  comptes: readonly (Compte & { firstName: string; lastName: string; planningName: string })[],
  groupeId: string,
  deja: readonly string[],
  max = 8,
): Candidat[] {
  const q = normalizeName(recherche.trim());
  if (!q) return [];
  return comptes
    .filter((c) => normalizeName(`${c.firstName} ${c.lastName} ${c.planningName}`).includes(q))
    .map((c): Candidat => {
      const g = groupeDe(c);
      const nom = `${c.firstName} ${c.lastName}`.trim() || c.planningName;
      if (deja.includes(c.uid)) return { uid: c.uid, nom, etat: "deja" };
      if (g === null) return { uid: c.uid, nom, etat: "entrera" };
      return g === groupeId ? { uid: c.uid, nom, etat: "groupe" } : { uid: c.uid, nom, etat: "autre", autre: g };
    })
    .sort((a, b) => RANG[a.etat] - RANG[b.etat] || a.nom.localeCompare(b.nom, "fr"))
    .slice(0, max);
}
