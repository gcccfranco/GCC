// Corbeille des setlists (SC2, docs/spec-createur-corbeille-absences.md) : une setlist mise à la
// corbeille y reste 30 jours, puis le cron `/api/cron/reminders` la purge.

export const CORBEILLE_JOURS = 30;

/** Date-heure ISO avant laquelle une mise à la corbeille est périmée : `supprimeeLe` plus ancien = à purger. */
export function limiteDePurge(maintenant: Date): string {
  return new Date(maintenant.getTime() - CORBEILLE_JOURS * 24 * 3600 * 1000).toISOString();
}
