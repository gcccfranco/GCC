/** Une ligne du petit déj : une équipe, un dimanche (docs/spec-petit-dej.md).
 *  Firestore : `petitDej/{id}`, id automatique, une ligne par document. */
export type LignePetitDej = {
  id: string
  dimanche: string   // AAAA-MM-JJ
  nom: string        // texte affiché, 1 à 80 caractères, réécrivable
  uid: string        // l'inscrit par « Je m'inscris » ; "" : posée par un écrivain ou par la reprise
  auteurUid: string  // qui a posé la ligne
  creeLe: string     // ISO
  modifieLe: string  // ISO
}
