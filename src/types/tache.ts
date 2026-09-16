// Tâches par pôle (lot 7, docs/spec-taches.md). Firestore :
// poles/{pole}/taches/{id} et poles/{pole}/taches/{id}/fois/{AAAA-MM-JJ}.

/** Pôles d'une tâche. « louange » n'est jamais stocké dans un profil : en est
 *  membre qui a au moins un rôle de service (voir polesDe, src/lib/access.ts). */
export const TACHE_POLES = ["da", "media", "orga", "louange", "evenement"] as const;
export type TachePole = (typeof TACHE_POLES)[number];

export type Rythme = "semaine" | "2semaines" | "mois";

/** Répétition : le jour de la semaine est celui de la première échéance ; pour
 *  « mois », `rang` = 1 à 4, ou -1 pour le dernier (« le 1er dimanche du mois »). */
export interface Repetition {
  rythme: Rythme;
  rang?: number;
}

/** Qui prévenir quand une fois est cochée : les membres d'un pôle, ou la régie
 *  de ce service le dimanche qui suit l'échéance (planning). */
export type Prevenir = { pole: TachePole } | { regie: string } | null;

export interface Tache {
  id: string;
  pole: TachePole;
  titre: string;
  /** null = pour tout le pôle. */
  responsableUid: string | null;
  responsableNom: string;
  /** AAAA-MM-JJ : l'échéance d'une tâche unique, la première d'une tâche répétée. */
  echeance: string;
  repetition: Repetition | null;
  lien: string;
  note: string;
  prevenir: Prevenir;
  auteurUid: string;
  createdAt: string;
  updatedAt: string;
}

/** Une fois cochée « faite » (id du document = sa date d'échéance). */
export interface Fois {
  date: string;
  parUid: string;
  parNom: string;
  /** ISO : quand elle a été cochée. */
  le: string;
}
