// Calculs purs des programmes de scène : dimanches réservables, clôture,
// chevauchements. Dates ISO « AAAA-MM-JJ », comparées comme du texte.

const DAY = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Dimanches réservables : du premier dimanche ≥ `debut` au dernier avant
 *  `jourJ` (le jour J ne se réserve pas), croissants. */
export function sundaysBetween(debut: string, jourJ: string): string[] {
  const end = toUtc(jourJ);
  let t = toUtc(debut);
  t += ((7 - new Date(t).getUTCDay()) % 7) * DAY;
  const out: string[] = [];
  for (; t < end; t += 7 * DAY) out.push(toIso(t));
  return out;
}

/** Dernier dimanche strictement avant le jour J. */
export function lastSundayBefore(jourJ: string): string {
  let t = toUtc(jourJ) - DAY;
  t -= new Date(t).getUTCDay() * DAY;
  return toIso(t);
}

/** Vrai à partir du lendemain du dernier dimanche réservable : le volet
 *  Entraînements disparaît, le programme seul reste. */
export function reservationsClosed(today: string, jourJ: string): boolean {
  return today > lastSundayBefore(jourJ);
}

/** Date locale du jour en ISO (le navigateur, donc l'horloge simulée des tests). */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Deux plages « HH:MM » du même dimanche se chevauchent-elles ? */
export function overlaps(
  a: { dimanche: string; debut: string; fin: string },
  b: { dimanche: string; debut: string; fin: string },
): boolean {
  return a.dimanche === b.dimanche && a.debut < b.fin && b.debut < a.fin;
}
