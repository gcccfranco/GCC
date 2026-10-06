// Saison de réservation de la scène (lot U1, docs/spec-scene-saison.md) : la
// coordination règle dates, jours, plages, durée d'un créneau et « qui
// réserve » ; les groupes prennent un créneau de la grille. Fonctions pures.
// Dates ISO « AAAA-MM-JJ » et heures « HH:MM », comparées comme du texte.

import { QUI, type Duree, type Plage } from "@/types/programme";
import { lastSundayBefore } from "./dimanches";

/** La saison complète d'un programme, défauts compris. `jours` = jours cochés
 *  (0 = dimanche) : déduits des plages en base, ils ne divergent que dans le
 *  formulaire, le temps d'une erreur (« un jour coché sans plage »). */
export interface Saison {
  debut: string;
  fin: string;
  jours: number[];
  plages: Plage[];
  duree: Duree;
  /** Valeurs de QUI permises ; vide = tout membre connecté. */
  quiAutorises: string[];
  ouvert: boolean;
}

export const DUREES: readonly Duree[] = [30, 60, 90, 120];

/** Ordre d'affichage des jours : lundi → dimanche (comme l'écran). */
export const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Saison d'un programme d'avant U1 (Q7) : le dimanche, 14:00–19:00. */
export const PLAGES_DEFAUT: readonly Plage[] = [{ jour: 0, debut: "14:00", fin: "19:00" }];

const DAY = 86_400_000;

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Jour de la semaine d'une date ISO (0 = dimanche). */
export function jourDeSemaine(date: string): number {
  return new Date(utc(date)).getUTCDay();
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hhmm(min: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(min / 60))}:${p(min % 60)}`;
}

/** Jours qui ont au moins une plage, dans l'ordre lundi → dimanche. */
export function joursDes(plages: readonly Plage[]): number[] {
  return ORDRE_JOURS.filter((j) => plages.some((p) => p.jour === j));
}

/** Plages triées dans l'ordre de l'écran : lundi → dimanche, puis l'heure. */
export function triPlages(plages: readonly Plage[]): Plage[] {
  const rang = (j: number) => ORDRE_JOURS.indexOf(j as (typeof ORDRE_JOURS)[number]);
  return [...plages].sort((a, b) => rang(a.jour) - rang(b.jour) || a.debut.localeCompare(b.debut));
}

/** La saison complète d'un programme : ses champs, ou les défauts de Q7
 *  (dimanche 14:00–19:00, 1 h, tout membre connecté, fermeture au dernier
 *  dimanche avant le jour J ; absent = ouvert). */
export function saisonDe(p: {
  debut: string;
  jourJ: string;
  fin?: string;
  plages?: Plage[];
  duree?: Duree;
  quiAutorises?: string[];
  ouvert?: boolean;
}): Saison {
  const plages = p.plages ?? [...PLAGES_DEFAUT];
  return {
    debut: p.debut,
    fin: p.fin ?? lastSundayBefore(p.jourJ),
    jours: joursDes(plages),
    plages,
    duree: p.duree ?? 60,
    quiAutorises: p.quiAutorises ?? [],
    ouvert: p.ouvert !== false,
  };
}

/** Créneaux d'un jour de la semaine (0 = dimanche) : depuis le début de chaque
 *  plage de ce jour, de la durée choisie, tant qu'ils tiennent dans la plage. */
function grilleDeJourSemaine(saison: Pick<Saison, "plages" | "duree">, jour: number): { debut: string; fin: string }[] {
  const out: { debut: string; fin: string }[] = [];
  for (const p of triPlages(saison.plages.filter((x) => x.jour === jour))) {
    const fin = minutes(p.fin);
    for (let t = minutes(p.debut); t + saison.duree <= fin; t += saison.duree) {
      out.push({ debut: hhmm(t), fin: hhmm(t + saison.duree) });
    }
  }
  return out;
}

/** Créneaux d'une date, selon son jour de la semaine. */
export function grilleDuJour(saison: Pick<Saison, "plages" | "duree">, date: string): { debut: string; fin: string }[] {
  return grilleDeJourSemaine(saison, jourDeSemaine(date));
}

/** Dates réservables : entre l'ouverture et la fermeture, dont le jour de la
 *  semaine a une plage — jamais le jour J. Croissantes. */
export function joursReservables(saison: Pick<Saison, "debut" | "fin" | "plages">, jourJ: string): string[] {
  const jours = new Set(saison.plages.map((p) => p.jour));
  const fin = Math.min(utc(saison.fin), utc(jourJ) - DAY);
  const out: string[] = [];
  for (let t = utc(saison.debut); t <= fin; t += DAY) {
    if (jours.has(new Date(t).getUTCDay())) out.push(iso(t));
  }
  return out;
}

type CreneauLike = { dimanche: string; debut: string; fin: string };

/** Une ligne de la journée : créneau libre, ou réservation à son heure.
 *  `couvre` = nombre de créneaux de la grille qu'elle absorbe (Q13) ; `aussi` =
 *  les heures de ceux qui ne commencent pas avec elle (« prend aussi le
 *  créneau de 18:00 »). */
export type Ligne<C extends CreneauLike> =
  | { type: "libre"; debut: string; fin: string }
  | { type: "reserve"; debut: string; fin: string; creneau: C; horsGrille: boolean; couvre: number; aussi: string[] };

/** Grille du jour s'il est dans la période, vide sinon. */
function grilleDans(saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">, date: string) {
  return date >= saison.debut && date <= saison.fin ? grilleDuJour(saison, date) : [];
}

const pile = (g: { debut: string; fin: string }, c: CreneauLike) => g.debut === c.debut && g.fin === c.fin;
const chevauche = (g: { debut: string; fin: string }, c: CreneauLike) => c.debut < g.fin && g.debut < c.fin;

/** Grille et réservations d'un jour, fusionnées et triées par heure. Une
 *  réservation hors grille (U1, Q8) reste à son heure, sur une seule ligne :
 *  les créneaux qu'elle chevauche n'ont plus de ligne à eux (Q13). */
export function lignesDuJour<C extends CreneauLike>(
  saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">,
  date: string,
  creneaux: C[],
): Ligne<C>[] {
  const grille = grilleDans(saison, date);
  const resas = creneaux.filter((c) => c.dimanche === date);
  const lignes: Ligne<C>[] = grille
    .filter((g) => !resas.some((c) => chevauche(g, c)))
    .map((g) => ({ type: "libre" as const, ...g }));
  for (const c of resas) {
    const pris = grille.filter((g) => chevauche(g, c));
    lignes.push({
      type: "reserve", debut: c.debut, fin: c.fin, creneau: c, horsGrille: !grille.some((g) => pile(g, c)),
      couvre: pris.length, aussi: pris.filter((g) => g.debut !== c.debut).map((g) => g.debut),
    });
  }
  return lignes.sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Une semaine de la saison, du lundi au dimanche (Q12) : ses jours
 *  réservables, une case par créneau de la grille (`true` = pris, une
 *  réservation hors grille comprise) et le nombre de places libres. */
export interface Semaine {
  lundi: string;
  jours: string[];
  cases: boolean[];
  libres: number;
}

/** Lundi de la semaine d'une date ISO. */
function lundiDe(date: string): string {
  return iso(utc(date) - ((jourDeSemaine(date) + 6) % 7) * DAY);
}

/** Les jours réservables rangés en semaines, dans l'ordre. */
export function semainesDe(
  saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">,
  jourJ: string,
  creneaux: CreneauLike[],
): Semaine[] {
  const semaines: Semaine[] = [];
  for (const jour of joursReservables(saison, jourJ)) {
    const lundi = lundiDe(jour);
    let s = semaines.at(-1);
    if (s?.lundi !== lundi) semaines.push((s = { lundi, jours: [], cases: [], libres: 0 }));
    s.jours.push(jour);
    const resas = creneaux.filter((c) => c.dimanche === jour);
    for (const g of grilleDuJour(saison, jour)) s.cases.push(resas.some((c) => chevauche(g, c)));
  }
  for (const s of semaines) s.libres = s.cases.filter((pris) => !pris).length;
  return semaines;
}

/** Les comptes des aides de la saison (Q19) : créneaux par jour de la semaine
 *  (lundi → dimanche), nombre de semaines et créneaux en tout. */
export function compteCreneaux(
  saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">,
  jourJ: string,
): { parJour: { jour: number; creneaux: number }[]; semaines: number; total: number } {
  const semaines = semainesDe(saison, jourJ, []);
  return {
    parJour: joursDes(saison.plages).map((jour) => ({ jour, creneaux: grilleDeJourSemaine(saison, jour).length })),
    semaines: semaines.length,
    total: semaines.reduce((n, s) => n + s.cases.length, 0),
  };
}

/** Réservations hors des jours, de la période ou des créneaux de la grille. */
export function horsGrille<C extends CreneauLike>(
  saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">,
  creneaux: C[],
): C[] {
  return creneaux.filter((c) => !grilleDans(saison, c.dimanche).some((g) => pile(g, c)));
}

/** Ce qui empêche d'enregistrer une saison. */
export type ErreurSaison =
  | "dateInvalide"
  | "finApresJourJ"
  | "finAvantDebut"
  | "aucunJour"
  | "jourSansPlage"
  | "plageInvalide"
  | "plageCourte"
  | "plagesChevauchent"
  | "autreFete";

// Année en 20xx : un champ date tapé au clavier passe par 0002, 0020, 0202
// avant 2026 ; rien ne s'écrit tant que l'année n'est pas entière.
export const DATE = /^20\d{2}-\d{2}-\d{2}$/;
const HEURE = /^\d{2}:\d{2}$/;

/** `autre` : la période de réservation de l'édition de l'autre fête (non
 *  archivée) ; les deux ne se croisent pas, la scène est une seule salle (Q8). */
export function erreursSaison(saison: Saison, jourJ: string, autre?: Pick<Saison, "debut" | "fin">): ErreurSaison[] {
  const e: ErreurSaison[] = [];
  const { debut, fin, jours, plages, duree } = saison;
  if (!DATE.test(debut) || !DATE.test(fin)) e.push("dateInvalide");
  else {
    if (fin >= jourJ) e.push("finApresJourJ");
    if (fin < debut) e.push("finAvantDebut");
    if (autre && debut <= autre.fin && autre.debut <= fin) e.push("autreFete");
  }
  if (plages.length === 0) e.push("aucunJour");
  if (jours.some((j) => !plages.some((p) => p.jour === j))) e.push("jourSansPlage");
  const valides = plages.filter((p) => HEURE.test(p.debut) && HEURE.test(p.fin) && p.fin > p.debut);
  if (valides.length < plages.length) e.push("plageInvalide");
  if (valides.some((p) => minutes(p.fin) - minutes(p.debut) < duree)) e.push("plageCourte");
  if (valides.some((a, i) => valides.some((b, k) => k > i && a.jour === b.jour && a.debut < b.fin && b.debut < a.fin))) {
    e.push("plagesChevauchent");
  }
  return e;
}

type Qui = (typeof QUI)[number];

/** Familles de « Qui peut réserver » (Q5), dans l'ordre de l'écran. */
export const FAMILLES = [
  { cle: "groupes", qui: ["Gp Bonté", "Gp Fidélité", "Gp Paix", "Gp Amour", "Gp Joie"] },
  { cle: "edd", qui: ["EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"] },
  { cle: "jeunes", qui: ["Jeunes"] },
  { cle: "louange", qui: ["Franco", "敬拜团"] },
  { cle: "chorale", qui: ["Chorale"] },
] as const satisfies readonly { cle: string; qui: readonly Qui[] }[];

export type Famille = (typeof FAMILLES)[number]["cle"];

/** Groupes proposés par la feuille « Réserver » : tous sans limite, sinon les
 *  groupes permis, rangés par famille comme la planche (Groupes, EDD, Jeunes,
 *  Louange, Chorale). La coordination n'est pas limitée : `quiPermis({})`. */
export function quiPermis(p: { quiAutorises?: string[] }): string[] {
  const permis = p.quiAutorises ?? [];
  const parFamille: string[] = FAMILLES.flatMap((f) => f.qui);
  return permis.length === 0 ? parFamille : parFamille.filter((q) => permis.includes(q));
}

/** Familles dont tous les groupes sont permis, dans l'ordre de l'écran. */
export function famillesDe(quiAutorises: string[]): Famille[] {
  return FAMILLES.filter((f) => f.qui.every((q) => quiAutorises.includes(q))).map((f) => f.cle);
}

/** Groupes permis par ces familles, dans l'ordre de QUI. */
export function quiDesFamilles(cles: Famille[]): string[] {
  const groupes = FAMILLES.filter((f) => cles.includes(f.cle)).flatMap((f) => [...f.qui] as string[]);
  return QUI.filter((q) => groupes.includes(q));
}

/** Heure locale « HH:MM » (le navigateur, donc l'horloge simulée des tests). */
export function heureLocale(now = new Date()): string {
  return hhmm(now.getHours() * 60 + now.getMinutes());
}

/** Un créneau commencé (ou d'un jour passé) ne se réserve plus (Q11). */
export function commence(jour: string, debut: string, today: string, maintenant: string): boolean {
  return jour < today || (jour === today && debut <= maintenant);
}

/** Une place de la grille : un jour et un créneau. */
export type Place = { jour: string; debut: string; fin: string };

/** Créneaux de la grille encore réservables : à venir, pas commencés, sans
 *  réservation qui les chevauche — sauf celle qu'on déplace (`sauf`). */
export function creneauxLibres<C extends CreneauLike & { id: string }>(
  saison: Pick<Saison, "debut" | "fin" | "plages" | "duree">,
  jourJ: string,
  creneaux: C[],
  opts: { sauf?: string; today: string; maintenant: string },
): Place[] {
  const autres = creneaux.filter((c) => c.id !== opts.sauf);
  return joursReservables(saison, jourJ)
    .filter((jour) => jour >= opts.today)
    .flatMap((jour) => grilleDuJour(saison, jour).map((g) => ({ jour, ...g })))
    .filter((p) => !commence(p.jour, p.debut, opts.today, opts.maintenant))
    .filter((p) => !autres.some((c) => c.dimanche === p.jour && c.debut < p.fin && p.debut < c.fin));
}
