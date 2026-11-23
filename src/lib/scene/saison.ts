// Saison de réservation de la scène (lot U1, docs/spec-scene-saison.md) : la
// coordination règle dates, jours, plages et « qui réserve ». Depuis le lot 5
// de Salles (docs/spec-salles.md, AR22), plus de grille de créneaux : la scène
// se réserve à l'heure qu'on veut, dans ses fenêtres libres. Fonctions pures.
// Dates ISO « AAAA-MM-JJ » et heures « HH:MM », comparées comme du texte.

import { QUI, type Plage } from "@/types/programme";
import { JOUR_MS as DAY, versUtc as utc, versIso as iso } from "@/lib/dates/iso";
import { lastSundayBefore } from "./dimanches";

/** La saison complète d'un programme, défauts compris. `jours` = jours cochés
 *  (0 = dimanche) : déduits des plages en base, ils ne divergent que dans le
 *  formulaire, le temps d'une erreur (« un jour coché sans plage »). */
export interface Saison {
  debut: string;
  fin: string;
  jours: number[];
  plages: Plage[];
  /** Valeurs de QUI permises ; vide = tout membre connecté. */
  quiAutorises: string[];
  ouvert: boolean;
}

/** Ordre d'affichage des jours : lundi → dimanche (comme l'écran). */
export const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Saison d'un programme d'avant U1 (Q7) : le dimanche, 14:00–19:00. */
export const PLAGES_DEFAUT: readonly Plage[] = [{ jour: 0, debut: "14:00", fin: "19:00" }];

/** Jour de la semaine d'une date ISO (0 = dimanche). */
export function jourDeSemaine(date: string): number {
  return new Date(utc(date)).getUTCDay();
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
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
  quiAutorises?: string[];
  ouvert?: boolean;
}): Saison {
  const plages = p.plages ?? [...PLAGES_DEFAUT];
  return {
    debut: p.debut,
    fin: p.fin ?? lastSundayBefore(p.jourJ),
    jours: joursDes(plages),
    plages,
    quiAutorises: p.quiAutorises ?? [],
    ouvert: p.ouvert !== false,
  };
}

/** Plages d'une date (selon son jour de la semaine), triées ; vide hors de la période. */
export function plagesDuJour(saison: Pick<Saison, "debut" | "fin" | "plages">, date: string): { debut: string; fin: string }[] {
  if (date < saison.debut || date > saison.fin) return [];
  const jour = jourDeSemaine(date);
  return triPlages(saison.plages.filter((p) => p.jour === jour)).map(({ debut, fin }) => ({ debut, fin }));
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

type Plage2 = { debut: string; fin: string };
type CreneauLike = { dimanche: string; debut: string; fin: string; libre?: boolean };

/** Plus petite fenêtre libre montrée : un quart d'heure (le pas de la feuille). */
const PAS = 15;

/** Quart d'heure suivant (ou égal) une heure « HH:MM ». */
function quartSuivant(h: string): string {
  return hhmm(Math.ceil(minutes(h) / PAS) * PAS);
}

/** AR22 (docs/spec-salles.md) : quand la scène est libre une date — ses plages, moins ce qui l'occupe (créneaux de la
 *  fête, emploi du temps fixe, réservations de Salles, évènements, tous passés en `occupees`), moins le temps déjà
 *  passé aujourd'hui (`horloge`). Une fenêtre de moins d'un quart d'heure ne compte pas. */
export function fenetresLibres(
  saison: Pick<Saison, "debut" | "fin" | "plages">,
  date: string,
  occupees: readonly Plage2[],
  horloge?: { today: string; maintenant: string },
): Plage2[] {
  if (horloge && date < horloge.today) return [];
  const depuis = horloge && date === horloge.today ? quartSuivant(horloge.maintenant) : "00:00";
  const out: Plage2[] = [];
  for (const p of plagesDuJour(saison, date)) {
    let debut = p.debut > depuis ? p.debut : depuis;
    const dedans = occupees.filter((o) => o.debut < p.fin && p.debut < o.fin).sort((a, b) => a.debut.localeCompare(b.debut));
    for (const o of dedans) {
      if (o.debut > debut) out.push({ debut, fin: o.debut < p.fin ? o.debut : p.fin });
      if (o.fin > debut) debut = o.fin;
    }
    if (debut < p.fin) out.push({ debut, fin: p.fin });
  }
  return out.filter((f) => minutes(f.fin) - minutes(f.debut) >= PAS);
}

/** Une réservation dans une plage de son jour (dans la période) ; sinon « hors des plages ». */
export function dansUnePlage(saison: Pick<Saison, "debut" | "fin" | "plages">, c: CreneauLike): boolean {
  return plagesDuJour(saison, c.dimanche).some((p) => p.debut <= c.debut && c.fin <= p.fin);
}

/** Une autre occupation de la Scène ou de la Grande salle (emploi du temps fixe, Salles, évènement) : ses heures et
 *  son nom à l'écran. */
export type Autre = Plage2 & { libelle: string };

/** Une ligne de la journée : une fenêtre libre, une réservation de la fête, ou une autre occupation de la scène.
 *  `horsGrille` : la réservation déborde des plages (ni « autre moment », ni dans une plage). */
export type Ligne<C extends CreneauLike> =
  | { type: "libre"; debut: string; fin: string }
  | { type: "reserve"; debut: string; fin: string; creneau: C; horsGrille: boolean }
  | { type: "occupe"; debut: string; fin: string; autre: Autre };

/** Fenêtres libres, réservations et autres occupations d'un jour, triées par heure. Une autre occupation n'est
 *  montrée que si elle touche une plage du jour. */
export function lignesDuJour<C extends CreneauLike>(
  saison: Pick<Saison, "debut" | "fin" | "plages">,
  date: string,
  creneaux: C[],
  autres: readonly Autre[] = [],
  horloge?: { today: string; maintenant: string },
): Ligne<C>[] {
  const resas = creneaux.filter((c) => c.dimanche === date);
  const plages = plagesDuJour(saison, date);
  const lignes: Ligne<C>[] = [
    ...fenetresLibres(saison, date, [...resas, ...autres], horloge).map((f) => ({ type: "libre" as const, ...f })),
    ...resas.map((c) => ({ type: "reserve" as const, debut: c.debut, fin: c.fin, creneau: c, horsGrille: !c.libre && !dansUnePlage(saison, c) })),
    ...autres.filter((o) => plages.some((p) => o.debut < p.fin && p.debut < o.fin)).map((autre) => ({ type: "occupe" as const, debut: autre.debut, fin: autre.fin, autre })),
  ];
  return lignes.sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Une semaine de la saison, du lundi au dimanche (Q12) : ses jours
 *  réservables, une case par jour réservable (`true` = plus rien de libre)
 *  et le nombre de jours qui ont encore une fenêtre libre. */
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

/** Les jours réservables rangés en semaines, dans l'ordre. `autresDu` : les autres occupations d'une date. */
export function semainesDe(
  saison: Pick<Saison, "debut" | "fin" | "plages">,
  jourJ: string,
  creneaux: CreneauLike[],
  autresDu: (date: string) => readonly Plage2[] = () => [],
): Semaine[] {
  const semaines: Semaine[] = [];
  for (const jour of joursReservables(saison, jourJ)) {
    const lundi = lundiDe(jour);
    let s = semaines.at(-1);
    if (s?.lundi !== lundi) semaines.push((s = { lundi, jours: [], cases: [], libres: 0 }));
    s.jours.push(jour);
    const occupees = [...creneaux.filter((c) => c.dimanche === jour), ...autresDu(jour)];
    s.cases.push(fenetresLibres(saison, jour, occupees).length === 0);
  }
  // SQ-R11 : un jour hors de la saison qui porte une réservation entre dans sa semaine, sans case.
  for (const d of new Set(creneaux.map((c) => c.dimanche))) {
    if (semaines.some((s) => s.jours.includes(d))) continue;
    const lundi = lundiDe(d);
    const s = semaines.find((x) => x.lundi === lundi);
    if (s) s.jours = [...s.jours, d].sort();
    else semaines.push({ lundi, jours: [d], cases: [], libres: 0 });
  }
  semaines.sort((a, b) => a.lundi.localeCompare(b.lundi));
  for (const s of semaines) s.libres = s.cases.filter((pris) => !pris).length;
  return semaines;
}

/** Les comptes des aides de la saison : nombre de semaines et de jours réservables. */
export function compteJours(saison: Pick<Saison, "debut" | "fin" | "plages">, jourJ: string): { semaines: number; jours: number } {
  const semaines = semainesDe(saison, jourJ, []);
  return { semaines: semaines.length, jours: semaines.reduce((n, s) => n + s.cases.length, 0) };
}

/** Réservations hors des jours, de la période ou des plages (un « autre moment » n'en est pas). */
export function horsGrille<C extends CreneauLike>(saison: Pick<Saison, "debut" | "fin" | "plages">, creneaux: C[]): C[] {
  return creneaux.filter((c) => !c.libre && !dansUnePlage(saison, c));
}

/** Ce qui empêche d'enregistrer une saison. */
type ErreurSaison =
  | "dateInvalide"
  | "finApresJourJ"
  | "finAvantDebut"
  | "aucunJour"
  | "jourSansPlage"
  | "plageInvalide"
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
  const { debut, fin, jours, plages } = saison;
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
  if (valides.some((a, i) => valides.some((b, k) => k > i && a.jour === b.jour && a.debut < b.fin && b.debut < a.fin))) {
    e.push("plagesChevauchent");
  }
  return e;
}

type Qui = (typeof QUI)[number];

/** Familles de « Qui peut réserver » (Q5), dans l'ordre de l'écran. */
export const FAMILLES = [
  { cle: "groupes", qui: ["Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie"] },
  { cle: "edd", qui: ["EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"] },
  { cle: "louange", qui: ["Franco", "Intergroupe", "Interfranco"] },
] as const satisfies readonly { cle: string; qui: readonly Qui[] }[];

export type Famille = (typeof FAMILLES)[number]["cle"];

/** Groupes proposés par la feuille « Réserver » : tous sans limite, sinon les
 *  groupes permis, rangés par famille comme la planche (Groupes, EDD, Jeunes,
 *  Louange, Chorale). La coordination n'est pas limitée : `quiPermis({})`. */
export function quiPermis(p: { quiAutorises?: string[] }): string[] {
  const permis = p.quiAutorises ?? [];
  const parFamille: string[] = FAMILLES.flatMap((f) => f.qui);
  // Choix faute de réponse : si la saison ne garde que des valeurs retirées (Jeunes, Chorale…), aucune
  // n'est proposée ; on retombe alors sur l'ensemble des Qui actuels plutôt que sur une feuille vide.
  const retenus = parFamille.filter((q) => permis.includes(q));
  return retenus.length === 0 ? parFamille : retenus;
}

/** Familles dont au moins un groupe est permis (SQ-R4 : une saison d'avant « Intergroupe » garde louange), dans l'ordre de l'écran. */
export function famillesDe(quiAutorises: string[]): Famille[] {
  return FAMILLES.filter((f) => f.qui.some((q) => quiAutorises.includes(q))).map((f) => f.cle);
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

/** Une place proposée : un jour et des heures. */
export type Place = { jour: string; debut: string; fin: string };

/** Où déplacer une réservation (le Calendrier) : dans chaque fenêtre libre d'un jour à venir assez longue pour sa
 *  durée, la même heure de début si elle y tient, sinon le début de la fenêtre. `autresDu` : les autres occupations
 *  de la scène ; `sauf` : la réservation qu'on déplace. */
export function creneauxLibres<C extends CreneauLike & { id: string }>(
  saison: Pick<Saison, "debut" | "fin" | "plages">,
  jourJ: string,
  creneaux: C[],
  opts: { sauf?: string; today: string; maintenant: string; autresDu?: (date: string) => readonly Plage2[] },
): Place[] {
  const moi = creneaux.find((c) => c.id === opts.sauf);
  const duree = moi ? minutes(moi.fin) - minutes(moi.debut) : 60;
  const autres = creneaux.filter((c) => c.id !== opts.sauf);
  return joursReservables(saison, jourJ)
    .filter((jour) => jour >= opts.today)
    .flatMap((jour) => {
      const occupees = [...autres.filter((c) => c.dimanche === jour), ...(opts.autresDu?.(jour) ?? [])];
      return fenetresLibres(saison, jour, occupees, opts).flatMap((f) => {
        const debuts = [...new Set([moi?.debut, f.debut])].filter((d): d is string => !!d && d >= f.debut && minutes(d) + duree <= minutes(f.fin));
        return debuts.sort().map((d) => ({ jour, debut: d, fin: hhmm(minutes(d) + duree) }));
      });
    });
}
