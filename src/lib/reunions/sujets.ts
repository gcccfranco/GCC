// Calculs purs des « Sujets à aborder » d'une réunion (lot U6, R1,
// docs/spec-back-office.md) : tri, rouge, nouvel ordre après un glisser.

import { aCommence } from "@/lib/evenements/agenda";
import type { Evenement } from "@/types/evenement";
import type { Sujet } from "@/types/reunion";

/** Ordre choisi par l'organisateur ; à ordre égal (deux ajouts au même
 *  moment), le premier ajouté d'abord. */
export function trierSujets(sujets: Sujet[]): Sujet[] {
  return [...sujets].sort((a, b) => a.ordre - b.ordre || a.creeLe.localeCompare(b.creeLe));
}

/** Rang d'un nouveau sujet : après le dernier. */
export function ordreSuivant(sujets: Sujet[]): number {
  return sujets.reduce((max, s) => Math.max(max, s.ordre + 1), 0);
}

/** Rouge (Q9) : la réunion a commencé — la même frontière que l'ajout — et le
 *  sujet n'est ni traité ni repris dans une autre réunion. */
export function estRouge(e: Pick<Evenement, "type" | "date" | "heure">, sujet: Sujet, nowIso: string): boolean {
  return aCommence(e, nowIso) && !sujet.traite && !sujet.reprisDans;
}

/** Le sujet `de` passe au rang `vers` ; les rangs sont renumérotés 0, 1, 2…
 *  et seuls les sujets dont le rang change sont à réécrire. */
export function reordonner(sujets: Sujet[], de: number, vers: number): { sujets: Sujet[]; changes: { id: string; ordre: number }[] } {
  const liste = [...sujets];
  liste.splice(vers, 0, ...liste.splice(de, 1));
  const changes = liste.flatMap((s, i) => (s.ordre === i ? [] : [{ id: s.id, ordre: i }]));
  return { sujets: liste.map((s, i) => ({ ...s, ordre: i })), changes };
}

// ─── R2 : reprise des sujets non traités, réunions précédentes ──────────────

type Moment = Pick<Evenement, "id" | "date" | "heure">;
const moment = (e: Pick<Evenement, "date" | "heure">) => `${e.date}T${e.heure || "00:00"}`;

/** Réunions du même public tenues avant `courante` (date et heure), la plus
 *  récente d'abord. */
export function reunionsPrecedentes<T extends Moment & Pick<Evenement, "pour">>(reunions: T[], courante: Moment & Pick<Evenement, "pour">): T[] {
  return reunions
    .filter((r) => r.id !== courante.id && r.pour === courante.pour && moment(r) < moment(courante))
    .sort((a, b) => moment(b).localeCompare(moment(a)));
}

/** Un sujet laissé, avec la réunion qui l'a laissé. */
export interface SujetAReprendre {
  sujet: Sujet;
  reunion: { id: string; date: string };
}

/** Réunions à relire pour la reprise (relecture du lot U6) : les `n` dernières déjà
 *  commencées, la plus récente d'abord : une requête par réunion lue, le coût ne grandit
 *  plus avec l'historique. Un sujet laissé plus loin reste rouge dans sa réunion. */
export function reunionsALire<T extends Moment & Pick<Evenement, "type">>(reunions: T[], nowIso: string, n = 6): T[] {
  return reunions
    .filter((r) => aCommence(r, nowIso))
    .sort((a, b) => moment(b).localeCompare(moment(a)))
    .slice(0, n);
}

/** Ce qu'on propose de reprendre à la création d'une réunion (R2, question 11) :
 *  les sujets rouges — réunion commencée, ni traités ni repris — de chaque
 *  réunion lue, la plus ancienne d'abord, chacune dans son ordre. */
export function sujetsAReprendre(
  lus: { reunion: Moment & Pick<Evenement, "type">; sujets: Sujet[] }[],
  nowIso: string,
): SujetAReprendre[] {
  return [...lus]
    .sort((a, b) => moment(a.reunion).localeCompare(moment(b.reunion)))
    .flatMap(({ reunion, sujets }) => trierSujets(sujets)
      .filter((s) => estRouge(reunion, s, nowIso))
      .map((sujet) => ({ sujet, reunion: { id: reunion.id, date: reunion.date } })));
}

/** Le sujet recopié dans la nouvelle réunion : écrit par qui la crée (les règles
 *  le veulent à son nom), l'auteur d'origine affiché, ni traité ni repris, lié
 *  à la réunion qui l'avait laissé. */
export function copieReprise({ sujet, reunion }: SujetAReprendre, parUid: string, ordre: number): Omit<Sujet, "id"> {
  return {
    texte: sujet.texte, auteurUid: parUid, auteurNom: sujet.auteurNom, creeLe: sujet.creeLe, ordre, traite: false,
    reprisDans: null, repriseDe: { reunionId: reunion.id, date: reunion.date },
  };
}

/** « 3 octobre » (« 3 oct. » en court) d'une date « AAAA-MM-JJ », en 中文
 *  « 10月3日 » ; l'année en plus si on la demande. */
export function jourDuMois(date: string, lang: string, { court = false, annee = false } = {}): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", {
    day: "numeric", month: court ? "short" : "long", ...(annee ? { year: "numeric" } : {}),
  });
}
