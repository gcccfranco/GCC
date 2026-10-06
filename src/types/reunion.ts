// Réunions de pôle (lot U6, docs/spec-back-office.md) : les « Sujets à aborder »
// d'une réunion, un document par sujet dans evenements/{id}/sujets/{sid} — un
// tableau dans l'évènement se réécrirait en entier, et deux ajouts simultanés
// s'effaceraient (Q7). Droits : firestore.rules et src/lib/access.ts.

export interface Sujet {
  id: string;
  texte: string;
  auteurUid: string;
  auteurNom: string;
  /** ISO, heure d'ajout. */
  creeLe: string;
  /** Ordre choisi par l'organisateur ; un ajout va à la fin. */
  ordre: number;
  traite: boolean;
  /** Id de la réunion qui l'a repris (R2). */
  reprisDans: string | null;
  /** Réunion d'où il a été repris (R2). */
  repriseDe: { reunionId: string; date: string } | null;
}
