// Programmes de scène (lot 3 bis, docs/spec-programme-scene.md) : un onglet du
// planning par programme (« Noël »), des créneaux d'entraînement sur scène le
// dimanche, et l'ordre de passage du jour J.

/** Ce qu'on répète ou présente — liste en dur (Timothée, 14/09/2026). */
export const QUOI = ["Séance louange", "Chant", "Danse", "Sketch", "Spectacle"] as const;

/** Qui répète ou passe — liste en dur, dans l'ordre de la décision 34 (lot « chants des fêtes »,
 *  docs/spec-chants-fetes.md) : une seule liste pour les passages et les réservations. Les libellés
 *  qui correspondent à une catégorie de l'app servent aux rappels (cf. src/lib/scene/rappels.ts,
 *  quiCategory). La valeur stockée « Franco » s'affiche « Culte Francophone » (libelleQui,
 *  src/lib/fetes/qui.ts). 敬拜团, Jeunes et Chorale sont retirés : une donnée ancienne qui les porte
 *  est lue telle quelle. */
export const QUI = [
  "Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie",
  "Franco",
  "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
] as const;

/** Lot U1 : une plage horaire réservable, par jour de la semaine (0 = dimanche). */
export interface Plage {
  jour: number;
  /** « HH:MM ». */
  debut: string;
  fin: string;
}

/** Durée d'un créneau de la grille, en minutes. */
export type Duree = 30 | 60 | 90 | 120;

/** Une ligne de l'ordre de passage du jour J — sans horaire ni durée. */
export interface Passage {
  /** Identifiant stable (8 caractères [a-z0-9]) tiré à la création ; absent dans un passage d'avant
   *  le lot « chants des fêtes » (docs/spec-chants-fetes.md, CF1). */
  id?: string;
  quoi: string;
  /** Une ou plusieurs valeurs de QUI ; plusieurs = danse ou sketch, sans chants (décision 37). */
  qui: string[];
  titre: string;
  /** Musiques et danses du passage, pour la régie (décision 27). Absent = aucune. */
  medias?: MediaPassage[];
}

/** Une musique ou une danse d'un passage (CF22). */
export interface MediaPassage {
  id: string;
  type: "musique" | "danse";
  /** Obligatoire, 80 caractères au plus. */
  titre: string;
  /** https, "" = sans. */
  lien: string;
  /** « m:ss », "" = sans. */
  duree: string;
  /** « m:ss », "" = sans. */
  depart: string;
  /** Pour la régie, 200 caractères au plus, "" = sans. */
  note: string;
}

/** Document programmes/{id}. Les dates sont en ISO « AAAA-MM-JJ ». */
export interface Programme {
  id: string;
  /** Nom court, aussi nom de l'onglet (« Noël »). */
  nom: string;
  jourJ: string;
  /** Premier jour réservable, et jour où l'onglet apparaît (lot 12). */
  debut: string;
  // `visible` (l'ancien épinglage) n'est plus lu ni écrit (Pâques · Noël, Q11) : il reste,
  // sans effet, dans les anciens documents.
  passages: Passage[];
  createdBy: string;
  updatedAt: string;
  // Saison (lot U1, docs/spec-scene-saison.md) : tous facultatifs, absents =
  // défauts lus par saisonDe (src/lib/scene/saison.ts).
  /** Dernier jour réservable (ISO), avant le jour J. */
  fin?: string;
  /** Plages par jour de la semaine ; les jours réservables s'en déduisent. */
  plages?: Plage[];
  duree?: Duree;
  /** Valeurs de QUI permises ; vide = tout membre connecté. */
  quiAutorises?: string[];
  /** `false` = brouillon, jamais affiché ; absent = ouvert (programme d'avant U1). */
  ouvert?: boolean;
  // Pâques · Noël (docs/spec-scene-paques-noel.md, Q1-Q2) : absents dans un
  // programme d'avant ce lot = déduits du mois et de l'année du jour J
  // (feteDe, anneeDe, src/lib/scene/fetes.ts).
  fete?: "paques" | "noel";
  /** Année du jour J ; l'identifiant d'une édition est `{fete}-{annee}`. */
  annee?: number;
  /** Prénom de qui a écrit en dernier (retouches v18, D20) : le refus d'un ordre de passage le nomme. */
  modifiePar?: string;
  /** `updateTime` du document lu (métadonnée REST, jamais écrite) : précondition de l'ordre de passage (D20). */
  version?: string;
}

/** Document programmes/{id}/creneaux/{cid} : la scène un jour réservable. */
export interface Creneau {
  id: string;
  /** Jour réservé (ISO). Garde son nom d'avant U1, même pour un samedi. */
  dimanche: string;
  /** « HH:MM » : un créneau de la grille (lot U1), ou une heure d'avant U1. */
  debut: string;
  fin: string;
  quoi: string;
  qui: string[];
  note: string;
  auteurUid: string;
  auteurNom: string;
  createdAt: string;
  updatedAt: string;
}
