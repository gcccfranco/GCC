// Messages push automatiques restés en français seul après le lot 8 (audit du
// 19/09/2026, I4) : « Setlist prête » et « Planning en ligne ». Fonctions pures,
// une fournée par langue côté route (patron de presentationMessage et
// evenementReminder). 中文 à relire par Timothée (règle du lot 8).

import type { NotifLang } from "@/types/user";

export type SetlistReady = { title: string; leader: string; songCount: number; category?: string };

export function setlistReadyMessage(s: SetlistReady, lang: NotifLang): { title: string; body: string } {
  const sujet = s.title || s.category || "";
  if (lang === "zh-CN") {
    return {
      title: `敬拜歌单已就绪 — ${sujet}`,
      body: `${s.leader || "负责人"} 已准备好歌单（${s.songCount} 首）。`,
    };
  }
  return {
    title: `Setlist prête — ${sujet}`,
    body: `${s.leader || "Le responsable"} a préparé la setlist (${s.songCount} chants).`,
  };
}

export type PlanningRelease = { label: string; tri: string };

export function planningReleaseMessage(p: PlanningRelease, lang: NotifLang): { title: string; body: string } {
  if (lang === "zh-CN") {
    return { title: `${p.tri} 服事表已上线`, body: `${p.label} 的 ${p.tri} 服事表已可查看。` };
  }
  return { title: `Planning ${p.tri} en ligne`, body: `Le planning ${p.label} du ${p.tri} est disponible.` };
}
