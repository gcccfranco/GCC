// Rappel de la veille aux inscrits d'un évènement (lot 6), envoyé par le cron
// quotidien. Fonction pure, partagée avec les tests.

import type { Evenement } from "@/types/evenement";
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
