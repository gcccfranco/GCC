// Les cinq groupes (lot 2 du chantier « équipes et groupes », docs/spec-organigrammes-groupes.md,
// « Table des groupes »). Sans dépendance, comme src/lib/equipes/table.ts : src/lib/access.ts la lit
// (comités) sans tirer le reste.
//
// `GROUPES` de src/types/user.ts ne change pas : il porte les catégories de setlist et l'inscription,
// qu'Amour et Joie n'ont pas.

export type GroupeId = "paix" | "fidelite" | "bonte" | "amour" | "joie";

export interface GroupeDef {
  id: GroupeId;
  /** Catégorie (audience de notification, clé de `serviceRoles` pour les trois premiers). */
  categorie: string;
  /** Clé du planning du groupe ; `null` pour Amour et Joie, qui n'ont pas de planning. */
  planning: string | null;
  /** Id de l'équipe formée par le comité du groupe (OG17). */
  comite: string;
}

/** Les cinq groupes, dans l'ordre d'affichage (sélecteur Église · Paix · …). */
export const TABLE_GROUPES: readonly GroupeDef[] = [
  { id: "paix", categorie: "Groupe Paix", planning: "paix", comite: "comite-paix" },
  { id: "fidelite", categorie: "Groupe Fidélité", planning: "fidelite", comite: "comite-fidelite" },
  { id: "bonte", categorie: "Groupe Bonté", planning: "bonte", comite: "comite-bonte" },
  { id: "amour", categorie: "Groupe Amour", planning: null, comite: "comite-amour" },
  { id: "joie", categorie: "Groupe Joie", planning: null, comite: "comite-joie" },
];

/** Les cinq ids de comité, dans l'ordre de la table. Une personne est « du comité » par cette liste,
 *  jamais par le préfixe `comite-` : `comite-franco` est une équipe de l'église. */
export const COMITES: readonly string[] = TABLE_GROUPES.map((g) => g.comite);

/** Plafond des VP quand `maxVp` est absent (décision 36). */
export const MAX_VP_DEFAUT = 2;
/** Plus haut plafond de VP qu'un admin puisse régler. */
export const MAX_VP_BORNE = 9;

export function estGroupeId(id: string): id is GroupeId {
  return TABLE_GROUPES.some((g) => g.id === id);
}

export function groupeDef(id: string): GroupeDef | undefined {
  return TABLE_GROUPES.find((g) => g.id === id);
}

export function groupeDeLaCategorie(categorie: string): GroupeDef | undefined {
  return TABLE_GROUPES.find((g) => g.categorie === categorie);
}
