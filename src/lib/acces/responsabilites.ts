// Lot RS (« les droits de gestion viennent d'une liste Responsabilités », docs/spec-responsabilites.md) :
// la liste fermée des responsabilités et les fonctions pures qui la lisent. Écrite par les admins seuls
// dans `users/{uid}.responsabilites`. Aucune dépendance Firebase ni `BACK_OFFICE`, et ni grilles.ts ni
// releases.ts (qui tirent organigramme.ts : un cycle) — les clés de grille sont recopiées ici.

import { EDD_CLASSES } from "@/lib/planning/utils";

/** Une responsabilité de gestionnaire d'un planning : sa clé, les grilles qu'elle couvre (clés de `GRILLES`),
 *  les audiences qu'elle notifie et les catégories de setlists où le gestionnaire est traité comme quelqu'un
 *  qui sert. La Table garde son audience du petit déj, hors de ce module. */
type ResponsabilitePlanning = {
  cle: string;
  plannings: readonly string[];
  audiences: readonly string[];
  categories: readonly string[];
};

/** Dans l'ordre du tableau de la spec. */
export const RESPONSABILITES_PLANNING: readonly ResponsabilitePlanning[] = [
  { cle: "planning:culte", plannings: ["culte"], audiences: ["Culte Francophone"], categories: ["Culte Francophone"] },
  { cle: "planning:intergroupe", plannings: ["intergroupe"], audiences: ["Intergroupe"], categories: ["Intergroupe"] },
  { cle: "planning:interfranco", plannings: ["interfranco"], audiences: ["Interfranco"], categories: ["Interfranco"] },
  { cle: "planning:campus", plannings: ["campusMatin", "campusSoir"], audiences: ["Campus"], categories: ["Campus"] },
  { cle: "planning:table", plannings: ["table"], audiences: [], categories: [] },
  { cle: "planning:edd", plannings: ["eddZhongban", "eddDaban", "eddGaoban"], audiences: [...EDD_CLASSES], categories: [...EDD_CLASSES] },
  { cle: "planning:paix", plannings: ["paix"], audiences: ["Groupe Paix"], categories: ["Groupe Paix"] },
  { cle: "planning:fidelite", plannings: ["fidelite", "fideliteMusiciens"], audiences: ["Groupe Fidélité"], categories: ["Groupe Fidélité"] },
  { cle: "planning:bonte", plannings: ["bonte"], audiences: ["Groupe Bonté"], categories: ["Groupe Bonté"] },
];

/** Comité Orga (Q11). */
export const ORGA = "orga";

/** Les clés possibles, fermées : les neuf plannings, puis `orga`. */
export const CLES_RESPONSABILITES = [...RESPONSABILITES_PLANNING.map((r) => r.cle), ORGA] as const;
type CleResponsabilite = (typeof CLES_RESPONSABILITES)[number];

/** Ce que ce module lit d'un profil. */
export type ProfilResponsabilites = { responsabilites?: string[] };
type P = ProfilResponsabilites | null | undefined;

/** Les clés valides du profil, sans doublon, dans l'ordre de CLES_RESPONSABILITES ; une clé inconnue est ignorée. */
export function responsabilitesDe(p: P): CleResponsabilite[] {
  const siennes = p?.responsabilites ?? [];
  return CLES_RESPONSABILITES.filter((c) => siennes.includes(c));
}

/** Membre du Comité Orga. */
export const estComiteOrga = (p: P): boolean => responsabilitesDe(p).includes(ORGA);

/** Gestionnaire du planning de cette responsabilité (`planning:<x>`) ? */
export const gestionnaireDe = (p: P, cle: string): boolean =>
  RESPONSABILITES_PLANNING.some((r) => r.cle === cle) && responsabilitesDe(p).includes(cle as CleResponsabilite);

/** Les responsabilités de planning du profil, dans l'ordre du tableau. */
function planningsDuProfil(p: P): ResponsabilitePlanning[] {
  const siennes = responsabilitesDe(p);
  return RESPONSABILITES_PLANNING.filter((r) => siennes.includes(r.cle as CleResponsabilite));
}

/** Les clés de grille couvertes par les responsabilités du profil (union). */
export const planningsGeres = (p: P): string[] => [...new Set(planningsDuProfil(p).flatMap((r) => r.plannings))];

/** Gère-t-on cette grille (clé de `GRILLES`) ? */
export const gerePlanning = (p: P, key: string): boolean => planningsGeres(p).includes(key);

/** Gère-t-on au moins un planning ? */
export const gereUnPlanning = (p: P): boolean => planningsDuProfil(p).length > 0;

/** Les audiences des plannings gérés (union). */
export const audiencesDesPlannings = (p: P): string[] => [...new Set(planningsDuProfil(p).flatMap((r) => r.audiences))];

/** Les catégories de setlists des plannings gérés (union). */
export const categoriesDesPlannings = (p: P): string[] => [...new Set(planningsDuProfil(p).flatMap((r) => r.categories))];

/** La clé `planning:<x>` qui couvre cette grille, ou null. */
export const responsabiliteDuPlanning = (key: string): string | null =>
  RESPONSABILITES_PLANNING.find((r) => r.plannings.includes(key))?.cle ?? null;
