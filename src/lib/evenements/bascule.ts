// Lot U9 (docs/spec-evenements-2027.md, Q1) : la bascule des évènements de toute l'église,
// du Sheet « [2026-2027] Calendrier des événements » vers le site. Seule source de la date :
// lecteur du Sheet (U8), calendrier, agenda public, formulaire et ligne d'annonce la lisent.
//
// La date de l'ÉVÈNEMENT décide, pas le jour de la création : un évènement du 10/01/2027 se
// crée sur le site dès décembre. Le jour courant (`todayIso`) passé ici fait basculer ce qui
// dépend de l'horloge (pastille du calendrier, mois lus dans le Sheet).

export const BASCULE_EVENEMENTS = "2027-01-01"

/** Une date (« AAAA-MM-JJ », heure facultative) d'avant la bascule : le Sheet fait foi. */
export function avantBascule(date: string): boolean {
  return date.slice(0, 10) < BASCULE_EVENEMENTS
}

/** Le dernier jour du Sheet, « JJ/MM/AAAA » (31/12/2026), pour les phrases qui le citent. */
export function dernierJourDuSheet(): string {
  const veille = new Date(`${BASCULE_EVENEMENTS}T12:00:00Z`)
  veille.setUTCDate(veille.getUTCDate() - 1)
  return veille.toISOString().slice(0, 10).split("-").reverse().join("/")
}
