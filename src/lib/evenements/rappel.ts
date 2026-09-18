// Rappel de la veille aux inscrits d'un évènement (lot 6) et ligne « Inscriptions
// ouvertes » du jour d'ouverture (période d'inscription, 17/09/2026), envoyés
// par le cron quotidien. Fonctions pures, partagées avec les tests.

import type { Evenement } from "@/types/evenement";
import { isInfo, isPast, modeInscriptions } from "@/lib/evenements/agenda";
import { poleDuPour } from "@/lib/access";
import type { NotifLang } from "@/types/user";
import { formatReminderDate } from "@/lib/push/reminderMessage";

export function evenementReminder(e: Pick<Evenement, "titre" | "heure" | "lieu">, lang: NotifLang): { title: string; body: string } {
  if (lang === "zh-CN") {
    const when = e.heure ? ` ${e.heure}` : "";
    const where = e.lieu ? `，${e.lieu}` : "";
    return { title: `提醒 — ${e.titre}`, body: `明天：${e.titre}${when}${where}` };
  }
  const when = e.heure ? ` à ${e.heure}` : "";
  const where = e.lieu ? `, ${e.lieu}` : "";
  return { title: `Rappel — ${e.titre}`, body: `Demain : ${e.titre}${when}${where}` };
}

/** Push d'un nouvel évènement (lot 6), dans la langue du destinataire (lot 8). */
export function nouvelEvenementMessage(
  e: Pick<Evenement, "titre" | "type" | "lieu" | "description" | "date" | "heure">,
  lang: NotifLang,
): { title: string; body: string } {
  const info = e.type === "info";
  if (lang === "zh-CN") {
    const when = e.date ? `，${formatReminderDate(e.date, "zh-CN")}${e.heure ? ` ${e.heure}` : ""}` : "";
    return {
      title: `${info ? "通知" : "活动"}：${e.titre}`,
      body: `${e.lieu || e.description.slice(0, 80)}${when}`.trim() || e.titre,
    };
  }
  const when = e.date ? ` — ${e.date.split("-").reverse().join("/")}${e.heure ? ` ${e.heure}` : ""}` : "";
  return {
    title: info ? `Info — ${e.titre}` : `Évènement — ${e.titre}`,
    body: `${e.lieu || e.description.slice(0, 80)}${when}`.trim() || e.titre,
  };
}

/** Les inscriptions s'ouvrent aujourd'hui : mode automatique, ouverture datée
 *  du jour, évènement à inscriptions (ni info ni réunion de pôle) pas passé.
 *  Un formulaire externe (lot 11) n'ouvre rien : l'app n'inscrit plus personne,
 *  et la date d'ouverture restée dans la fiche n'a plus cours. */
export function ouvertureDuJour(
  e: Pick<Evenement, "type" | "date" | "dateFin" | "pour" | "lienExterne" | "inscriptions" | "inscriptionOuverte" | "inscriptionDebut">,
  today: string,
): boolean {
  return !e.lienExterne && modeInscriptions(e) === "auto" && !isInfo(e) && !poleDuPour(e.pour)
    && (e.inscriptionDebut ?? "").slice(0, 10) === today && !isPast(e, today);
}

/** « Inscriptions ouvertes : titre (dès 10:00) », dans la langue du destinataire. */
export function ligneOuverture(e: Pick<Evenement, "titre" | "inscriptionDebut">, lang: NotifLang): string {
  const heure = (e.inscriptionDebut ?? "").split("T")[1];
  if (lang === "zh-CN") return `报名开始：${e.titre}${heure ? `（${heure} 起）` : ""}`;
  return `Inscriptions ouvertes : ${e.titre}${heure ? ` (dès ${heure})` : ""}`;
}

/** Titre d'une notification qui ne porte que des ouvertures d'inscriptions. */
export function ouverturesTitre(lang: NotifLang): string {
  return lang === "zh-CN" ? "报名开始" : "Inscriptions ouvertes";
}

/** Corps d'une notification du jour, des lignes ajoutées à la suite. */
export function avecLignes(body: string, lignes: string[]): string {
  return [body, ...lignes].filter(Boolean).join("\n");
}
