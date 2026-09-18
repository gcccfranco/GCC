// Organigramme (lot 16, docs/spec-organigramme.md). Firestore : un document
// equipes/{id} par équipe de la table EQUIPES (src/lib/equipes/organigramme.ts),
// qui garde les noms, sous-titres et l'ordre — eux ne bougent pas.

import type { Pole } from "./user";

/** Une personne dans une équipe. `uid` vide = nom du Sheet sans compte : elle
 *  apparaît dans l'organigramme mais ne reçoit rien et n'a pas de pôle. */
export interface MembreEquipe {
  /** Graphie du Sheet : « Charlie L. », « 周小秋 » — jamais traduite. */
  nom: string;
  uid: string;
  /** Texte libre après le tiret : « VP Paix », « Repas dim. soir ». */
  mention: string;
  referent: boolean;
  /** « (en essai) » dans le Sheet : une information d'équipe, pas un demi-droit. */
  essai: boolean;
  /** Sous-colonne de LOUANGE et EDD (« Pianistes ») ; "" ailleurs. */
  groupe: string;
}

export interface Equipe {
  id: string;
  /** Pôle donné par l'appartenance ; null = l'équipe n'en donne aucun. */
  pole: Pole | null;
  membres: MembreEquipe[];
  updatedAt: string;
  parUid: string;
  parNom: string;
}
