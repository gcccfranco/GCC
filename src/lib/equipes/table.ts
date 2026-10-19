// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes,
// sans autre dépendance que les types — src/lib/access.ts la lit (réunions
// d'équipe, lot U6, R4) sans tirer la lecture du Sheet.

export interface EquipeDef {
  id: string;
  /** Nom du Sheet — l'écran affiche la traduction `equipes.team.<id>`. */
  nom: string;
  soustitre: string;
  /** Clé de reconnaissance dans le Sheet, normalisée (accents et casse pliés). */
  cle: string;
  /** LOUANGE et EDD : la première ligne du bloc porte les sous-colonnes. */
  sousColonnes?: boolean;
}

/** Clé de langue du nom d'une équipe (lot 1 du chantier « équipes et groupes », EQ23) : le nom
 *  long (`equipes.team.<id>`, « TEAM DA ») ou court (`equipes.court.<id>`, « DA ») ; pour
 *  « louange », le public élargi `equipes.public.louange` (« Louange », 敬拜, EQ4), jamais
 *  « TEAM LOUANGE » : il est plus large que l'équipe. */
export function cleNomEquipe(id: string, court = false): string {
  return id === "louange" ? "equipes.public.louange" : `equipes.${court ? "court" : "team"}.${id}`;
}

/** Les 13 équipes, dans l'ordre du Sheet. Une équipe hors de cette table n'est
 *  jamais créée : elle ressort dans `inconnues` (D8). */
export const EQUIPES: EquipeDef[] = [
  { id: "orga", nom: "TEAM ORGA", soustitre: "Coordination générale", cle: "orga" },
  { id: "comite-franco", nom: "COMITÉ FRANCO", soustitre: "", cle: "comite franco" },
  { id: "da", nom: "TEAM DA", soustitre: "Direction Artistique", cle: "da" },
  { id: "medias", nom: "TEAM MÉDIAS", soustitre: "Photo, Vidéo", cle: "medias" },
  { id: "developpement", nom: "TEAM DÉVELOPPEMENT", soustitre: "GCCLouange, Siteweb, Livret digital", cle: "developpement" },
  { id: "regie", nom: "TEAM RÉGIE", soustitre: "Sono Live & PPT", cle: "regie" },
  { id: "traduction", nom: "TEAM TRADUCTION", soustitre: "", cle: "traduction" },
  { id: "theologie", nom: "TEAM THÉOLOGIE", soustitre: "", cle: "theologie" },
  { id: "evenementiel", nom: "TEAM ÉVÉNEMENTIEL", soustitre: "", cle: "evenementiel" },
  { id: "decoration", nom: "TEAM DÉCORATION", soustitre: "", cle: "decoration" },
  { id: "accueil-j1", nom: "TEAM ACCUEIL J1", soustitre: "Campus", cle: "accueil j1" },
  { id: "louange", nom: "TEAM LOUANGE", soustitre: "Franco / Inter", cle: "louange", sousColonnes: true },
  { id: "edd", nom: "TEAM EDD", soustitre: "École du Dimanche", cle: "edd", sousColonnes: true },
];


/** L'équipe Bêta (docs/spec-acces-beta.md) : hors de EQUIPES comme les comités. Définie ici (sans
 *  dépendance) pour être lue par organigramme.ts sans cycle ; réexportée par src/lib/access.ts. */
export const EQUIPE_BETA = "beta";
