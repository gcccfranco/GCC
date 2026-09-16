// Notifications des tâches par pôle (lot 7, docs/spec-taches.md) : nouvelle
// tâche, tâche faite, rappels d'échéance ajoutés à la notification du jour.
// Fonctions pures, en français ou en 中文, partagées avec les tests.

import { formatReminderDate } from "@/lib/push/reminderMessage";
import { addDays, echeancesDe } from "@/lib/taches/echeances";
import type { NotifLang } from "@/types/user";
import type { Fois, Tache, TachePole } from "@/types/tache";

// Mêmes mots que les locales (taches.pole).
const POLE: Record<NotifLang, Record<TachePole, string>> = {
  fr: { da: "DA", media: "Média", orga: "Orga", louange: "Louange", evenement: "Événement" },
  "zh-CN": { da: "美工", media: "媒体", orga: "组织", louange: "敬拜", evenement: "活动" },
};

export function poleLabel(pole: TachePole, lang: NotifLang): string {
  return POLE[lang][pole];
}

/** Date dans une phrase : « vendredi 18 septembre » / « 9月18日星期五 ». */
function dateDansPhrase(iso: string, lang: NotifLang): string {
  const s = formatReminderDate(iso, lang);
  return lang === "fr" ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export function nouvelleTacheMessage(t: Pick<Tache, "titre" | "pole" | "echeance">, lang: NotifLang) {
  return lang === "fr"
    ? { title: `Nouvelle tâche : ${t.titre}`, body: `Pôle ${poleLabel(t.pole, "fr")} · pour ${dateDansPhrase(t.echeance, "fr")}` }
    : { title: `新任务：${t.titre}`, body: `${poleLabel(t.pole, "zh-CN")}部门 · 截止 ${dateDansPhrase(t.echeance, "zh-CN")}` };
}

export function tacheFaiteMessage(t: Pick<Tache, "titre" | "pole">, parNom: string, lang: NotifLang) {
  return lang === "fr"
    ? { title: `Tâche faite : ${t.titre}`, body: `${parNom} (${poleLabel(t.pole, "fr")}) l'a terminée.` }
    : { title: `任务完成：${t.titre}`, body: `${parNom}（${poleLabel(t.pole, "zh-CN")}）已完成。` };
}

export type RappelTache = { tache: Tache; date: string; quand: "J3" | "J1" | "retard" };

/** Fois non cochées dont l'échéance est dans 3 jours, demain, ou était hier. */
export function rappelsDuJour(items: { tache: Tache; fois: Fois[] }[], today: string): RappelTache[] {
  const cibles: [string, RappelTache["quand"]][] = [
    [addDays(today, 3), "J3"],
    [addDays(today, 1), "J1"],
    [addDays(today, -1), "retard"],
  ];
  const out: RappelTache[] = [];
  for (const { tache, fois } of items) {
    const faites = new Set(fois.map((f) => f.date));
    for (const [date, quand] of cibles) {
      if (!faites.has(date) && echeancesDe(tache, date, date).length) out.push({ tache, date, quand });
    }
  }
  return out;
}

export function ligneRappelTache(r: RappelTache, lang: NotifLang): string {
  const quoi = lang === "fr" ? `${r.tache.titre} (${poleLabel(r.tache.pole, "fr")})` : `${r.tache.titre}（${poleLabel(r.tache.pole, "zh-CN")}）`;
  if (r.quand === "retard") return lang === "fr" ? `En retard : ${quoi}, pour hier` : `逾期：${quoi}，昨天到期`;
  return lang === "fr" ? `À faire : ${quoi}, ${dateDansPhrase(r.date, "fr")}` : `待办：${quoi}，${dateDansPhrase(r.date, "zh-CN")}`;
}

export function rappelTachesTitre(lang: NotifLang): string {
  return lang === "fr" ? "Rappel de tâches" : "任务提醒";
}

/** Corps d'une notification du jour, les tâches ajoutées à la ligne. */
export function corpsAvecTaches(body: string, rappels: RappelTache[], lang: NotifLang): string {
  return [body, ...rappels.map((r) => ligneRappelTache(r, lang))].filter(Boolean).join("\n");
}
