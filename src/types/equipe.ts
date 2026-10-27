// Organigramme (lot 16, docs/spec-organigramme.md). Firestore : un document
// equipes/{id} par équipe de la table EQUIPES (src/lib/equipes/organigramme.ts),
// qui garde les noms, sous-titres et l'ordre — eux ne bougent pas.

import type { ServiceLieu } from "./user";

/** Les trois sous-équipes de Louange (lot AO, docs/spec-acces-organigramme.md, D1, D2) : chacune a son
 *  référent ; une personne peut être de plusieurs (E1) et cumule ce qu'elles ouvrent. */
export const SOUS_EQUIPES = ["presidence", "musiciens", "choristes"] as const;
export type SousEquipe = (typeof SOUS_EQUIPES)[number];

/** Les cinq sous-équipes de l'EDD (docs/spec-edd-sous-equipes.md, E1, E4) : de l'affichage seulement, aucun
 *  droit, rien recopié sur le profil. */
export const SOUS_EQUIPES_EDD = ["professeurs-louange", "professeurs-cours", "pianistes", "guitaristes", "cajon"] as const;
export type SousEquipeEdd = (typeof SOUS_EQUIPES_EDD)[number];

/** « Ce qu'il joue » (lot AO, D3), pour les Musiciens seulement — liste validée le 21/10/2026. */
export const INSTRUMENTS = ["piano", "guitare", "basse", "batterie", "cajon", "autre"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

/** Une personne dans une équipe. `uid` vide = nom du Sheet sans compte : elle
 *  apparaît dans l'organigramme mais ne reçoit rien. */
export interface MembreEquipe {
  /** Graphie du Sheet : « Charlie L. », « 周小秋 » — jamais traduite. */
  nom: string;
  uid: string;
  /** Texte libre après le tiret : « VP Paix », « Repas dim. soir ». */
  mention: string;
  referent: boolean;
  /** « (en essai) » dans le Sheet : une information d'équipe, pas un demi-droit. */
  essai: boolean;
  /** Ancienne sous-colonne de LOUANGE et EDD (« Pianistes »), texte libre ; "" ailleurs. Pour l'EDD, lu en repli
   *  quand `sousEquipesEdd` est absent (`sousEquipesEddDe`). */
  groupe: string;
  // Lot AO (« les accès viennent de l'organigramme »), tous optionnels, cochés par un référent :
  /** Louange : ses sous-équipes (E1 : plusieurs possibles). */
  sousEquipes?: SousEquipe[];
  /** Louange : les sous-équipes dont elle est référente. Le booléen `referent` = référent de Louange (D4). */
  referentSous?: SousEquipe[];
  /** Louange et Régie : « Où il sert » (C1), les lieux du culte. */
  lieux?: ServiceLieu[];
  /** Musiciens : « Ce qu'il joue » (D3). */
  joue?: Instrument[];
  /** EDD : ses sous-équipes (affichage seul, jamais recopié sur le profil). */
  sousEquipesEdd?: SousEquipeEdd[];
}

export interface Equipe {
  id: string;
  membres: MembreEquipe[];
  updatedAt: string;
  parUid: string;
  parNom: string;
  /** `updateTime` du document tel que lu ou écrit : précondition de l'écriture suivante (absent = document pas encore créé). */
  version?: string;
}
