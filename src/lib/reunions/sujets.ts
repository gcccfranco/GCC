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
