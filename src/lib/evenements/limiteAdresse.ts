// Limite des inscriptions sans compte par adresse : 5 par fenêtre de 10 minutes. Mémoire du processus,
// horloge passée en argument (testable). Même lecture de l'adresse que /api/report.

const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 5;

/** Enregistre une inscription pour `ip` à l'instant `now` ; vrai si elle dépasse la limite. */
export function limiteAtteinte(hits: Map<string, number[]>, ip: string, now: number): boolean {
  if (hits.size > 1000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < FENETRE_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PAR_FENETRE;
}

/** La limite ne vise que les inscriptions sans compte : avec un compte (`user`), rien n'est compté. */
export function limiteSansCompte(user: unknown, hits: Map<string, number[]>, ip: string, now: number): boolean {
  return !user && limiteAtteinte(hits, ip, now);
}
