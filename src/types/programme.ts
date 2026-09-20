// Programmes de scène (lot 3 bis, docs/spec-programme-scene.md) : un onglet du
// planning par programme (« Noël »), des créneaux d'entraînement sur scène le
// dimanche, et l'ordre de passage du jour J.

/** Ce qu'on répète ou présente — liste en dur (Timothée, 14/09/2026). */
export const QUOI = ["Séance louange", "Chant", "Danse", "Sketch", "Spectacle"] as const;

/** Qui répète ou passe — liste en dur (Timothée, 14/09/2026). Les libellés qui
 *  correspondent à une catégorie de l'app servent aux rappels (cf.
 *  src/lib/scene/dimanches.ts, quiCategory). */
export const QUI = [
  "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
  "Gp Bonté", "Gp Fidélité", "Gp Paix", "Gp Amour", "Gp Joie",
  "Franco", "敬拜团",
] as const;

/** Une ligne de l'ordre de passage du jour J — sans horaire ni durée. */
export interface Passage {
  quoi: string;
  qui: string[];
  titre: string;
}

/** Document programmes/{id}. Les dates sont en ISO « AAAA-MM-JJ ». */
export interface Programme {
  id: string;
  /** Nom court, aussi nom de l'onglet (« Noël »). */
  nom: string;
  jourJ: string;
  /** Premier jour où la scène se réserve (les dimanches à partir de là). */
  debut: string;
  /** Onglet affiché à tous les connectés ; masqué = programme invisible. */
  visible: boolean;
  passages: Passage[];
  createdBy: string;
  updatedAt: string;
}

/** Document programmes/{id}/creneaux/{cid} : la scène un dimanche. */
export interface Creneau {
  id: string;
  dimanche: string;
  /** « HH:MM », au quart d'heure. */
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
