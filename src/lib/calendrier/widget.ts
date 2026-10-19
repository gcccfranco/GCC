// Widget Calendrier du tableau de bord (lot U8, tranche C8, docs/spec-calendrier.md
// § Écrans) : S les prochains jours, M la semaine, L le mois à points. Module pur ; les
// entrées viennent de `entreesCalendrier` (C2), comme la page. Ses réglages vivent dans
// `backOffice/{uid}` (U6) : `sources` (absent = toutes celles qu'on peut voir) et
// `seulementMoi`. Dates ISO « AAAA-MM-JJ ».

import { SOURCES, type EntreeCalendrier, type SourceCalendrier } from "@/lib/calendrier/entrees";
import { joursDeLaGrille, libelleCourt } from "@/lib/calendrier/grille";
import { addDays } from "@/lib/taches/echeances";
import type { Reglages, Taille } from "@/types/backOffice";
import type { NotifLang } from "@/types/user";

/** Les sources réglables au widget (planche : sans Setlists). */
export const SOURCES_DU_WIDGET: readonly SourceCalendrier[] = SOURCES.filter((s) => s !== "setlists");

/** Le choix « Seulement moi », rangé avec les sources dans les réglages (planche). */
export const MOI = "moi";

/** S : trois jours au plus, cherchés sur quatorze. */
const JOURS_S = 3;
const HORIZON_S = 14;

/** Les sources affichées : celles du réglage (absent = toutes), parmi celles qu'on peut voir. */
export function sourcesDuWidget(r: Reglages, permises: readonly SourceCalendrier[]): SourceCalendrier[] {
  const voulues = Array.isArray(r.sources) ? r.sources : SOURCES_DU_WIDGET;
  return SOURCES_DU_WIDGET.filter((s) => permises.includes(s) && voulues.includes(s));
}

/** Les sept jours de la semaine de `date`, du lundi au dimanche. */
export function semaineDe(date: string): string[] {
  const dimancheZero = new Date(`${date}T00:00:00Z`).getUTCDay();
  const lundi = addDays(date, -((dimancheZero + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(lundi, i));
}

/** La période à lire selon la taille. */
export function fenetreDuWidget(taille: Taille, today: string): { debut: string; fin: string } {
  if (taille === "s") return { debut: today, fin: addDays(today, HORIZON_S - 1) };
  const jours = taille === "m" ? semaineDe(today) : joursDeLaGrille(today.slice(0, 7));
  return { debut: jours[0], fin: jours[jours.length - 1] };
}

const avecEntrees = (parJour: Map<string, EntreeCalendrier[]>, jours: string[]) =>
  jours.filter((d) => (parJour.get(d)?.length ?? 0) > 0);

/** S : les trois premiers jours qui ont une entrée, d'aujourd'hui à quatorze jours. */
export function prochainsJours(parJour: Map<string, EntreeCalendrier[]>, today: string): string[] {
  const jours = Array.from({ length: HORIZON_S }, (_, i) => addDays(today, i));
  return avecEntrees(parJour, jours).slice(0, JOURS_S);
}

/** M : les jours de la semaine qui restent (aujourd'hui compris) et qui ont une entrée. */
export function joursRestants(parJour: Map<string, EntreeCalendrier[]>, today: string): string[] {
  return avecEntrees(parJour, semaineDe(today).filter((d) => d >= today));
}

/** Le nom court d'une entrée dans une ligne : « Scène » pour un créneau, « Petit déj : libre ». */
function nomCourt(e: EntreeCalendrier, lang: NotifLang): string {
  if (e.source === "scene") return e.titre.split(" · ")[0];
  if (e.source === "petitDej" && e.cle.startsWith("petitDej:libre:")) return libelleCourt(e, lang);
  return e.titre;
}

/** Une ligne par jour (planche : « Sam. 3 · Réunion DA · 20:00 ») : les titres à la suite,
 *  et l'heure de la première entrée qui en a une. */
export function ligneDuJour(entrees: EntreeCalendrier[], lang: NotifLang): { titres: string; heure: string } {
  return {
    titres: entrees.map((e) => nomCourt(e, lang)).join(" · "),
    heure: entrees.find((e) => e.heure)?.heure ?? "",
  };
}

const JOURS_FR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const JOURS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** « Aujourd'hui », « Sam. 3 » ; « 今天 », « 周六 3日 ». */
export function jourDuWidget(date: string, today: string, lang: NotifLang): string {
  const zh = lang === "zh-CN";
  if (date === today) return zh ? "今天" : "Aujourd'hui";
  const j = new Date(`${date}T00:00:00Z`).getUTCDay();
  const n = Number(date.slice(8, 10));
  return zh ? `${JOURS_ZH[j]} ${n}日` : `${JOURS_FR[j]} ${n}`;
}

/** La page du calendrier ouverte sur ce jour. */
export function lienDuJour(date: string): string {
  return `/back-office/calendrier?jour=${date}`;
}
