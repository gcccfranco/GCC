// Tâches par équipe (lot 7, docs/spec-taches.md ; lot 1 du chantier « équipes et groupes »,
// docs/spec-equipes-sans-poles.md, EQ6, EQ7). Firestore : equipes/{equipe}/taches/{id} et
// equipes/{equipe}/taches/{id}/fois/{AAAA-MM-JJ}. Une équipe est désignée par son id
// (src/lib/equipes/table.ts) ; « louange » est le public Louange élargi (voir equipesDe,
// src/lib/access.ts).

export type Rythme = "semaine" | "2semaines" | "mois" | "an";

/** Répétition : le jour de la semaine est celui de la première échéance ; pour
 *  « mois », `rang` = 1 à 4, ou -1 pour le dernier (« le 1er dimanche du mois »).
 *  « an » garde le mois et le quantième de la première échéance, et ignore `rang`. */
export interface Repetition {
  rythme: Rythme;
  rang?: number;
}

/** Qui prévenir quand une fois est cochée : les membres d'une équipe, ou la régie
 *  de ce service le dimanche qui suit l'échéance (planning). */
export type Prevenir = { equipe: string } | { regie: string } | null;

export interface Tache {
  id: string;
  /** Id de l'équipe, celui du chemin. */
  equipe: string;
  titre: string;
  /** null = pour toute l'équipe. */
  responsableUid: string | null;
  responsableNom: string;
  /** AAAA-MM-JJ : l'échéance d'une tâche unique, la première d'une tâche répétée. */
  echeance: string;
  repetition: Repetition | null;
  lien: string;
  note: string;
  prevenir: Prevenir;
  /** Évènement daté auquel la tâche est rattachée (lot 14), un au plus. Le
   *  titre est mémorisé : il reste lisible si l'évènement est supprimé. Une
   *  tâche liée ne se répète pas. Absent des documents d'avant : lu `null`. */
  evenement: { id: string; titre: string } | null;
  auteurUid: string;
  createdAt: string;
  updatedAt: string;
}

/** Où en est une échéance (lot 13). Un document d'avant ce lot n'a pas d'état :
 *  il se lit « terminee » (fromFsFois, src/lib/firebase/taches.ts). */
export type EtatFois = "encours" | "terminee";

/** Une fois commencée ou terminée (id du document = sa date d'échéance). Elle
 *  n'existe pas tant que personne n'y a touché. */
export interface Fois {
  date: string;
  parUid: string;
  parNom: string;
  /** ISO : quand elle a pris son état courant. */
  le: string;
  etat: EtatFois;
  /** ISO du passage en « En cours » ; "" si on ne le sait pas. */
  debutLe: string;
}
