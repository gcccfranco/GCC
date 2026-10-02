// Cours d'Harmonie (docs/spec-cours-harmonie.md) : le cours de Timothée, un
// chapitre = une leçon que chacun valide à son rythme.

export type ItemListe = { texte: string; sous?: { ordonnee: boolean; items: ItemListe[] } };

/** Un bloc de texte d'un chapitre ; le texte garde le markdown léger des fiches
 *  (gras, italique, accents graves), rendu par `TexteFiche`. */
export type BlocCours =
  | { t: "paragraphe"; texte: string }
  | { t: "titre"; texte: string }
  | { t: "liste"; ordonnee: boolean; items: ItemListe[] }
  | { t: "tableau"; entetes: string[]; lignes: string[][] }
  | { t: "code"; texte: string }
  | { t: "citation"; texte: string }
  | { t: "schema"; nom: string };

export type SousPartie = { titre: string; blocs: BlocCours[] };

export type ChapitreResume = {
  id: string;
  /** null : le mode d'emploi. */
  numero: number | null;
  titre: string;
  /** 0 mode d'emploi, 1 à 3 les parties du cours, 4 les annexes. */
  partie: number;
  /** 1 Fondations · 2 Accompagnateur · 3 Musicien d'équipe · 4 Directeur musical ;
   *  null pour le mode d'emploi et les annexes, qui ne se cochent pas. */
  niveau: number | null;
  statut: string;
  sousParties: string[];
  exercices: number;
};

export type Chapitre = ChapitreResume & { intro: BlocCours[]; contenu: SousPartie[] };

export type CoursIndex = { genereLe: string; chapitres: ChapitreResume[] };
