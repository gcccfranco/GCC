// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes,
// sans autre dépendance que les types — src/lib/access.ts la lit (réunions
// d'équipe, lot U6, R4) sans tirer la lecture du Sheet.

import type { Pole } from "@/types/user";

export interface EquipeDef {
  id: string;
  /** Nom du Sheet — l'écran affiche la traduction `equipes.team.<id>`. */
  nom: string;
  soustitre: string;
  /** Pôle donné à ses membres ; null = aucun (D1/D3 de la spec). */
  pole: Pole | null;
  /** Clé de reconnaissance dans le Sheet, normalisée (accents et casse pliés). */
  cle: string;
  /** LOUANGE et EDD : la première ligne du bloc porte les sous-colonnes. */
  sousColonnes?: boolean;
}

/** Les 13 équipes, dans l'ordre du Sheet. Une équipe hors de cette table n'est
 *  jamais créée : elle ressort dans `inconnues` (D8). */
export const EQUIPES: EquipeDef[] = [
  { id: "orga", nom: "TEAM ORGA", soustitre: "Coordination générale", pole: "orga", cle: "orga" },
  { id: "comite-franco", nom: "COMITÉ FRANCO", soustitre: "", pole: "orga", cle: "comite franco" },
  { id: "da", nom: "TEAM DA", soustitre: "Direction Artistique", pole: "da", cle: "da" },
  { id: "medias", nom: "TEAM MÉDIAS", soustitre: "Photo, Vidéo", pole: "media", cle: "medias" },
  { id: "developpement", nom: "TEAM DÉVELOPPEMENT", soustitre: "GCCLouange, Siteweb, Livret digital", pole: null, cle: "developpement" },
  { id: "regie", nom: "TEAM RÉGIE", soustitre: "Sono Live & PPT", pole: null, cle: "regie" },
  { id: "traduction", nom: "TEAM TRADUCTION", soustitre: "", pole: null, cle: "traduction" },
  { id: "theologie", nom: "TEAM THÉOLOGIE", soustitre: "", pole: "orga", cle: "theologie" },
  { id: "evenementiel", nom: "TEAM ÉVÉNEMENTIEL", soustitre: "", pole: "evenement", cle: "evenementiel" },
  { id: "decoration", nom: "TEAM DÉCORATION", soustitre: "", pole: "da", cle: "decoration" },
  { id: "accueil-j1", nom: "TEAM ACCUEIL J1", soustitre: "Campus", pole: "evenement", cle: "accueil j1" },
  { id: "louange", nom: "TEAM LOUANGE", soustitre: "Franco / Inter", pole: null, cle: "louange", sousColonnes: true },
  { id: "edd", nom: "TEAM EDD", soustitre: "École du Dimanche", pole: null, cle: "edd", sousColonnes: true },
];

