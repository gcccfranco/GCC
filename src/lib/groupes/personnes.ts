// Ce que Équipes › Personnes et Planning › Sans compte tirent des organigrammes de groupe (lot 2 du
// chantier « équipes et groupes », docs/spec-organigrammes-groupes.md, tranche OG-D) : filtres par
// groupe, rôles d'une personne, droits venus de ses rôles, titulaires sans compte. Pur : aucune
// dépendance Firebase ni réseau.

import { BACK_OFFICE } from "@/lib/backOffice";
import { normalizeName } from "@/lib/planning/names";
import { GROUPES, SERVICE_LIEUX } from "@/types/user";
import type { OrganigrammeGroupe, RoleGroupe } from "@/types/groupe";
import { groupeDe, type ProfilGroupe } from "./organigramme";
import { groupeDeLaCategorie, groupeDef, type GroupeId } from "./table";

// ─── Filtres de la liste (OG-D) ──────────────────────────────────────────────

/** Les filtres de Personnes. Interrupteur ouvert : s'ajoutent Groupe Amour, Groupe Joie et « Sans
 *  groupe » (les filtres des cultes, EDD et « Ne sert pas » restent). `backOffice` en paramètre (OG27). */
export function filtresPersonnes(backOffice: boolean = BACK_OFFICE) {
  return [
    "Tous", ...SERVICE_LIEUX, "EDD", ...GROUPES,
    ...(backOffice ? ["Groupe Amour", "Groupe Joie", "Sans groupe"] : []),
    "Ne sert pas",
  ] as string[];
}

export const FILTRE_SANS_GROUPE = "Sans groupe";

/** Le filtre « Groupe … » ou « Sans groupe » d'un profil : il suit `groupeDe` (OG2) interrupteur
 *  ouvert, la clé de `serviceRoles` sinon (ancienne administration). `null` = ce n'est pas un filtre
 *  de groupe. */
export function correspondAuFiltreGroupe(
  profil: ProfilGroupe, filtre: string, backOffice: boolean = BACK_OFFICE,
): boolean | null {
  const def = groupeDeLaCategorie(filtre);
  if (filtre !== FILTRE_SANS_GROUPE && !def) return null;
  if (!backOffice) return def ? filtre in (profil.serviceRoles ?? {}) : null;
  const g = groupeDe(profil);
  return def ? g === def.id : g === null;
}

/** « 214 inscrits · 5 groupes · 12 sans groupe » : le nombre de comptes sans groupe. */
export function nombreSansGroupe(profils: readonly ProfilGroupe[]): number {
  return profils.filter((p) => groupeDe(p) === null).length;
}

// ─── Les rôles d'une personne (ligne, fiche) ─────────────────────────────────

/** Un poste d'une personne dans son groupe : la présidence, une vice-présidence, ou un rôle créé. */
export type PosteDeCompte = { fixe: "president" | "vp"; role?: undefined } | { fixe?: undefined; role: RoleGroupe };

/** Les postes que le document du groupe donne à un compte : président, VP, puis ses rôles créés
 *  (au comité d'abord, comme l'organigramme, OG10). */
export function postesDeCompte(groupe: OrganigrammeGroupe | undefined, uid: string): PosteDeCompte[] {
  if (!groupe || !uid) return [];
  const fixes: PosteDeCompte[] = [
    ...(groupe.president?.uid === uid ? [{ fixe: "president" } as const] : []),
    ...(groupe.vp.some((t) => t.uid === uid) ? [{ fixe: "vp" } as const] : []),
  ];
  const siens = groupe.roles.filter((r) => r.titulaires.some((t) => t.uid === uid));
  return [...fixes, ...[...siens.filter((r) => r.comite), ...siens.filter((r) => !r.comite)].map((role): PosteDeCompte => ({ role }))];
}

/** Ce que les listes recopiées sur le profil disent de ses droits « par ses rôles » (OG19). */
export function droitsParRoles(profil: {
  remplitParRole?: readonly string[]; publieParRole?: readonly string[]; notifieParRole?: readonly string[];
}) {
  const publie = (profil.publieParRole ?? []).length > 0;
  return {
    /** « Remplit et publie le planning » ; « Remplit le planning » ; « Publie le planning » est impossible
     *  (publier inclut remplir, OG13). */
    remplit: (profil.remplitParRole ?? []).length > 0 || publie,
    publie,
    notifie: (profil.notifieParRole ?? []).length > 0,
  };
}

// ─── Titulaires sans compte (OG32) ───────────────────────────────────────────

export interface TitulaireSansCompte {
  nom: string;
  groupe: GroupeId;
  /** La présidence, une vice-présidence ou le nom d'un rôle créé, dans l'ordre du document. */
  postes: PosteDeCompte[];
}

/** Les noms écrits sans compte dans les organigrammes, un par personne et par groupe (OG15 : le même
 *  nom, à `normalizeName` près, dans deux rôles du groupe est une seule personne). Dans l'ordre de la
 *  table des groupes, puis du document. */
export function titulairesSansCompte(groupes: readonly OrganigrammeGroupe[]): TitulaireSansCompte[] {
  const sortie: TitulaireSansCompte[] = [];
  for (const g of groupes) {
    if (!groupeDef(g.id)) continue;
    const parNom = new Map<string, TitulaireSansCompte>();
    const noter = (nom: string, poste: PosteDeCompte) => {
      const cle = normalizeName(nom);
      if (!cle) return;
      const l = parNom.get(cle) ?? { nom, groupe: g.id as GroupeId, postes: [] };
      l.postes.push(poste);
      parNom.set(cle, l);
    };
    if (g.president && !g.president.uid) noter(g.president.nom, { fixe: "president" });
    for (const t of g.vp) if (!t.uid) noter(t.nom, { fixe: "vp" });
    for (const r of g.roles) for (const t of r.titulaires) if (!t.uid) noter(t.nom, { role: r });
    sortie.push(...parNom.values());
  }
  return sortie;
}

/** Les noms distincts (à `normalizeName` près) d'une réunion de listes : un nom écrit à la fois dans un
 *  planning et dans un organigramme n'est compté qu'une fois (OG32). */
export function nomsDistincts(...listes: readonly (readonly string[])[]): string[] {
  const vus = new Set<string>();
  return listes.flat().filter((n) => {
    const cle = normalizeName(n.trim());
    if (!cle || vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}
