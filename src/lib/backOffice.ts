/** Back-office (tâches, équipes, planning en grille, évènements, scène, blocs
 *  d'administration qui vont avec) : coupé en ligne tant que la variable n'est
 *  pas posée sur Vercel. `.env.local` la pose à `1` : tout reste ouvert en local.
 *  Décision de Timothée du 20/09/2026, docs/spec-mise-en-ligne.md. */
export const BACK_OFFICE = process.env.NEXT_PUBLIC_BACK_OFFICE === "1"
