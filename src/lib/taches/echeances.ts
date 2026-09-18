// Calculs purs des tâches par pôle (lot 7, docs/spec-taches.md) : échéances
// d'une tâche répétée, fois visibles, groupes de la page, dimanche de la régie.
// Dates ISO « AAAA-MM-JJ », comparées comme du texte.

import type { Fois, Tache } from "@/types/tache";

const DAY = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(toUtc(iso) + n * DAY);
}

/** Le `rang`-ième jour `weekday` (0 = dimanche) du mois ; -1 = le dernier. */
function nthWeekday(year: number, month: number, weekday: number, rang: number): string {
  if (rang === -1) {
    const last = Date.UTC(year, month + 1, 0);
    return toIso(last - ((new Date(last).getUTCDay() - weekday + 7) % 7) * DAY);
  }
  const first = Date.UTC(year, month, 1);
  return toIso(first + ((weekday - new Date(first).getUTCDay() + 7) % 7) * DAY + (rang - 1) * 7 * DAY);
}

/** Échéances de la tâche comprises entre `from` et `to` (inclus), jamais avant
 *  la première. */
export function echeancesDe(t: Pick<Tache, "echeance" | "repetition">, from: string, to: string): string[] {
  const start = from > t.echeance ? from : t.echeance;
  if (!t.repetition) return t.echeance >= from && t.echeance <= to ? [t.echeance] : [];
  const out: string[] = [];
  const { rythme, rang = 1 } = t.repetition;
  if (rythme === "mois") {
    const first = new Date(toUtc(t.echeance));
    const weekday = first.getUTCDay();
    for (let y = first.getUTCFullYear(), m = first.getUTCMonth(); ; m++) {
      const d = nthWeekday(y + Math.floor(m / 12), m % 12, weekday, rang);
      if (d > to) break;
      if (d >= start) out.push(d);
    }
    return out;
  }
  if (rythme === "an") {
    // Même mois, même quantième, chaque année. `Date.UTC(2027, 1, 29)` déborde
    // sur le 1er mars : on borne au dernier jour du mois (29/02 → 28/02). Le
    // calcul repart toujours de `echeance`, jamais de l'année d'avant.
    const [an0, mois, jour] = t.echeance.split("-").map(Number);
    for (let y = an0; ; y++) {
      const dernier = new Date(Date.UTC(y, mois, 0)).getUTCDate();
      const d = `${y}-${String(mois).padStart(2, "0")}-${String(Math.min(jour, dernier)).padStart(2, "0")}`;
      if (d > to) break;
      if (d >= start) out.push(d);
    }
    return out;
  }
  const step = rythme === "semaine" ? 7 : 14;
  const skip = Math.max(0, Math.ceil((toUtc(start) - toUtc(t.echeance)) / DAY / step));
  for (let d = addDays(t.echeance, skip * step); d <= to; d = addDays(d, step)) out.push(d);
  return out;
}

export type Ligne = { tache: Tache; date: string; fois: Fois | null };

/** Ce que la page montre d'une tâche : les fois à faire visibles, et les fois
 *  cochées depuis 30 jours. Une fois répétée apparaît 7 jours avant son
 *  échéance ; non cochée, elle disparaît quand la suivante apparaît, mais
 *  jamais avant la fin du lendemain de son échéance. Une tâche unique reste
 *  en retard jusqu'à ce qu'on la coche. */
export function lignesDeTache(t: Tache, fois: Fois[], today: string): Ligne[] {
  const done = new Map(fois.map((f) => [f.date, f]));
  const out: Ligne[] = fois
    .filter((f) => f.etat === "encours" || f.le.slice(0, 10) >= addDays(today, -30))
    .map((f) => ({ tache: t, date: f.date, fois: f }));
  const horizon = addDays(today, 7);
  if (!t.repetition) {
    if (!done.has(t.echeance)) out.push({ tache: t, date: t.echeance, fois: null });
  } else {
    // Une fois annuelle oubliée n'est remplacée qu'un an plus tard : sans ce
    // recul, elle sortirait de la page au bout de deux mois (lot 13).
    const recul = t.repetition.rythme === "an" ? 400 : 62;
    for (const d of echeancesDe(t, addDays(today, -recul), horizon)) {
      if (done.has(d)) continue;
      const next = echeancesDe(t, addDays(d, 1), addDays(d, recul + 8))[0];
      const visible = d >= today || today <= addDays(d, 1) || !next || next > horizon;
      if (visible) out.push({ tache: t, date: d, fois: null });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Dimanche de la semaine en cours (aujourd'hui s'il est dimanche). */
function dimancheDeLaSemaine(today: string): string {
  return addDays(today, (7 - new Date(toUtc(today)).getUTCDay()) % 7);
}

/** Reste à faire : pas de document, ou un document seulement « en cours ». */
export function resteAFaire(l: Ligne): boolean {
  return !l.fois || l.fois.etat === "encours";
}

export function grouperLignes(lignes: Ligne[], today: string) {
  const dimanche = dimancheDeLaSemaine(today);
  const aFaire = lignes.filter(resteAFaire);
  const byDate = (a: Ligne, b: Ligne) => a.date.localeCompare(b.date);
  return {
    enRetard: aFaire.filter((l) => l.date < today).sort(byDate),
    cetteSemaine: aFaire.filter((l) => l.date >= today && l.date <= dimanche).sort(byDate),
    plusTard: aFaire.filter((l) => l.date > dimanche).sort(byDate),
    faites: lignes.filter((l) => l.fois?.etat === "terminee").sort((a, b) => b.fois!.le.localeCompare(a.fois!.le)),
  };
}

/** Dimanche strictement après l'échéance : celui dont on prévient la régie. */
export function dimancheApres(echeance: string): string {
  const wd = new Date(toUtc(echeance)).getUTCDay();
  return addDays(echeance, wd === 0 ? 7 : 7 - wd);
}

/** « Mes tâches » : ce qui reste à faire pour moi — les tâches dont je suis
 *  responsable et celles de mes pôles sans responsable. */
export function aFairePour(lignes: Ligne[], uid: string): Ligne[] {
  return lignes.filter((l) => resteAFaire(l) && (l.tache.responsableUid === uid || l.tache.responsableUid === null));
}

/** Jours entiers entre deux dates ISO (`debutLe` peut porter une heure). */
export function joursEntre(debut: string, today: string): number {
  return Math.round((toUtc(today) - toUtc(debut.slice(0, 10))) / DAY);
}
