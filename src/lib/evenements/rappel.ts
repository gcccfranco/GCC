// Rappel de la veille aux inscrits d'un évènement (lot 6), envoyé par le cron
// quotidien. Fonction pure, partagée avec les tests.

import type { Evenement } from "@/types/evenement";
import type { NotifLang } from "@/types/user";

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
