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

// ─── Lot 12 : archivage et bascule automatiques (docs/spec-programme-bascule.md) ──
// L'affichage d'un programme est **calculé** ici, jamais écrit : la page,
// la barre d'onglets et le cron des rappels appellent les mêmes fonctions.

/** Jour où un programme passé s'archive : jour J + `jours` (24/12 → 31/12). */
export function archiveDate(jourJ: string, jours = 7): string {
  return toIso(toUtc(jourJ) + jours * DAY);
}

/** Où en est un programme le jour `today`. */
export type ProgrammeState = "soon" | "open" | "passed" | "archived";

export function programmeState(p: { debut: string; jourJ: string }, today: string): ProgrammeState {
  if (today < p.debut) return "soon";
  if (today <= p.jourJ) return "open";
  if (today <= archiveDate(p.jourJ)) return "passed";
  return "archived";
}

/** Le programme affiché le jour `today`, ou `null` (pas d'onglet pour les
 *  membres). `programmes` est trié par jour J croissant (`listProgrammes`),
 *  donc le premier retenu est l'échéance la plus proche. Les archivés sont
 *  écartés ; un programme épinglé par la coordination (`visible`) gagne ; sinon
 *  la bascule prend le premier programme ouvert — ou passé, dont le message de
 *  remerciement a la priorité sur sa semaine. */
export function currentProgramme<T extends { debut: string; jourJ: string; visible: boolean }>(
  programmes: T[],
  today: string,
): T | null {
  const vivants = programmes.filter((p) => programmeState(p, today) !== "archived");
  return vivants.find((p) => p.visible)
    ?? vivants.find((p) => programmeState(p, today) !== "soon")
    ?? null;
}
