// Calculs purs du calendrier des évènements : tri, groupes par mois, passés,
// places restantes. Dates ISO comparées comme du texte.

import type { Evenement, ModeInscriptions } from "@/types/evenement";

export const isInfo = (e: Pick<Evenement, "type" | "date">) => e.type === "info" || !e.date;

/** Date de fin effective (dateFin si donnée, sinon la date). */
const finDe = (e: Pick<Evenement, "date" | "dateFin">) => e.dateFin || e.date;

/** Passé = terminé avant aujourd'hui. Une info sans date n'est jamais passée. */
export function isPast(e: Pick<Evenement, "type" | "date" | "dateFin">, today: string): boolean {
  return !isInfo(e) && finDe(e) < today;
}

/** Une info expirée disparaît (comme les annonces). */
export function isExpired(e: Pick<Evenement, "expiresAt">, today: string): boolean {
  return !!e.expiresAt && e.expiresAt < today;
}

/** L'évènement a commencé (les inscriptions ferment d'elles-mêmes). */
export function aCommence(e: Pick<Evenement, "type" | "date" | "heure">, nowIso: string): boolean {
  if (isInfo(e)) return false;
  return `${e.date}T${e.heure || "00:00"}` <= nowIso;
}

/** Places restantes (inscrits + invités déjà comptés) ; null = sans limite. */
export function placesRestantes(e: Pick<Evenement, "placesMax" | "inscrits">): number | null {
  return e.placesMax === null ? null : Math.max(0, e.placesMax - e.inscrits);
}

export const byDate = (a: Pick<Evenement, "date" | "heure">, b: Pick<Evenement, "date" | "heure">) =>
  `${a.date} ${a.heure}`.localeCompare(`${b.date} ${b.heure}`);

export function monthLabel(yyyyMm: string, lang: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (lang === "zh-CN") return `${y}年${m}月`;
  const s = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface MonthGroup<E extends Pick<Evenement, "date" | "heure">> {
  key: string;
  label: string;
  evenements: E[];
}

/** Évènements datés, triés, groupés par mois (les infos sans date sont ignorées). */
export function groupByMonth<E extends Pick<Evenement, "date" | "heure" | "type">>(evenements: E[], lang: string): MonthGroup<E>[] {
  const groups: MonthGroup<E>[] = [];
  for (const e of [...evenements].filter((x) => !isInfo(x)).sort(byDate)) {
    const key = e.date.slice(0, 7);
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: monthLabel(key, lang), evenements: [] }; groups.push(g); }
    g.evenements.push(e);
  }
  return groups;
}

/** Date ISO à `days` jours avant aujourd'hui (fenêtre des passés : 3 mois ≈ 92 jours). */
export function daysAgo(today: string, days: number): string {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - days * 86_400_000).toISOString().slice(0, 10);
}

export type RefusInscription = "externe" | "fermee" | "pasEncore" | "terminee" | "commencee" | "complet";

/** Mode des inscriptions (docs/spec-inscriptions-periode.md). Un évènement
 *  d'avant le 17/09/2026 n'a que l'interrupteur `inscriptionOuverte`. */
export function modeInscriptions(e: Pick<Evenement, "inscriptions" | "inscriptionOuverte">): ModeInscriptions {
  return e.inscriptions ?? (e.inscriptionOuverte ? "auto" : "fermees");
}

/** Borne d'une période d'inscription, comparable à `nowIsoParis()` : sans heure,
 *  l'ouverture se fait à 00:00 et la fin à 23:59. */
export function borneInscription(valeur: string, sansHeure: "00:00" | "23:59"): string {
  return valeur.includes("T") ? valeur : `${valeur}T${sansHeure}`;
}

/** Pourquoi une inscription (1 personne + `invites`) serait refusée, ou null si
 *  elle passe. Même règle côté client (boutons) et côté serveur (transaction).
 *  Un lien externe (lot 11) l'emporte sur tout : l'app n'inscrit plus personne,
 *  ni fermeture, ni places, ni période ne sont évaluées. Sinon : « Fermées » par
 *  le responsable l'emporte ; les places tiennent toujours, même « Ouvertes »
 *  forcées ; en automatique : ouverture, fin, sinon début de l'évènement. */
export function refusInscription(
  e: Pick<Evenement, "type" | "date" | "heure" | "lienExterne" | "inscriptions" | "inscriptionOuverte" | "inscriptionDebut" | "inscriptionFin" | "placesMax" | "inscrits">,
  invites: number,
  nowIso: string,
): RefusInscription | null {
  if (e.lienExterne) return "externe";
  const mode = modeInscriptions(e);
  if (isInfo(e) || mode === "fermees") return "fermee";
  if (e.placesMax !== null && e.inscrits + 1 + invites > e.placesMax) return "complet";
  if (mode === "ouvertes") return null;
  if (e.inscriptionDebut && nowIso < borneInscription(e.inscriptionDebut, "00:00")) return "pasEncore";
  if (e.inscriptionFin) return nowIso > borneInscription(e.inscriptionFin, "23:59") ? "terminee" : null;
  return aCommence(e, nowIso) ? "commencee" : null;
}

/** Maintenant, en heure de Paris, « AAAA-MM-JJTHH:MM » (serveur comme navigateur). */
export function nowIsoParis(d = new Date()): string {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return s.replace(" ", "T");
}
