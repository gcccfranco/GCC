// Organigramme d'un groupe (lot 2 du chantier « équipes et groupes », docs/spec-organigrammes-groupes.md,
// « Modèle de données »). Firestore : un document groupes/{id} par groupe de la table
// (src/lib/groupes/table.ts), réécrit en bloc comme equipes/{id}.

import type { MembreEquipe } from "./equipe";

/** Qui tient un poste : le sens de `MembreEquipe` (`uid` vide = sans compte, nom jamais traduit),
 *  sans les champs propres à l'église (`mention`, `referent`, `essai`, `groupe`). */
export type Titulaire = Pick<MembreEquipe, "nom" | "uid">;

/** Les cases à cocher d'un rôle (OG13, décision 35). « Publier » inclut « Remplir » ;
 *  `saisirFetes` est lu faux quand il manque. */
export interface DroitsRole {
  remplir: boolean;
  publier: boolean;
  notifier: boolean;
  saisirFetes: boolean;
}

/** Un rôle créé dans un groupe (hors président et VP, qui sont fixes). */
export interface RoleGroupe {
  /** Identifiant stable tiré au hasard à la création : la colonne reliée et « Choisir » s'y rattachent. */
  id: string;
  /** Nom français, obligatoire (80 caractères au plus). */
  nom: string;
  /** Nom 中文 facultatif, `""` sinon. */
  nomZh: string;
  /** `null` = sans limite. */
  places: number | null;
  /** « au comité » : ses titulaires entrent au comité (OG17). */
  comite: boolean;
  /** Clé d'une colonne de personnes du planning du groupe ; toujours `null` pour Amour et Joie. */
  colonne: string | null;
  droits: DroitsRole;
  titulaires: Titulaire[];
}

/** Le document d'un groupe. `maxVp` absent = 2 (`MAX_VP_DEFAUT`, décision 36). */
export interface OrganigrammeGroupe {
  /** `paix`, `fidelite`, `bonte`, `amour` ou `joie`. */
  id: string;
  president: Titulaire | null;
  vp: Titulaire[];
  maxVp?: number;
  roles: RoleGroupe[];
  updatedAt: string;
  parUid: string;
  parNom: string;
}
