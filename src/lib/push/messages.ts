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

/** `annee` : donnée seulement quand ce n'est pas l'année en cours (lot U2 : le
 *  T1 2027 publié en décembre 2026 ne se lit pas comme un trimestre passé). */
export type PlanningRelease = { label: string; tri: string; annee?: number };

export function planningReleaseMessage(p: PlanningRelease, lang: NotifLang): { title: string; body: string } {
  if (lang === "zh-CN") {
    const tri = p.annee ? `${p.annee} 年 ${p.tri}` : p.tri;
    return { title: `${tri} 服事表已上线`, body: `${p.label} 的 ${tri} 服事表已可查看。` };
  }
  const tri = p.annee ? `${p.tri} ${p.annee}` : p.tri;
  return { title: `Planning ${tri} en ligne`, body: `Le planning ${p.label} du ${tri} est disponible.` };
}

// ─── Lot 3 (docs/spec-planning-gestes.md, PG43, PG44) : « Prévenir des changements » ───

const jourMois = (iso: string) => `${parseInt(iso.slice(8, 10))}/${parseInt(iso.slice(5, 7))}`;
const moisJour = (iso: string) => `${parseInt(iso.slice(5, 7))}月${parseInt(iso.slice(8, 10))}日`;

/** Titre et message pré-remplis (PG44). `label` : « Groupe Paix » ou « Culte Franco » ; `dates` : AAAA-MM-JJ. */
export function changementPlanningParDefaut(p: { label: string; dates: string[] }, lang: NotifLang): { title: string; body: string } {
  const groupe = p.label.startsWith("Groupe ");
  const nom = p.label.replace(/^Groupe /, "");
  const vues = p.dates.slice(0, 3);
  const autres = p.dates.length - vues.length;
  if (lang === "zh-CN") {
    const jours = vues.map(moisJour).join("、") + (autres ? ` 等 ${p.dates.length} 天` : "");
    return { title: `${nom}服事表有变动：${jours}`, body: `${nom}服事表有变动，请打开查看你的安排。` };
  }
  const jours = vues.map((d) => `le ${jourMois(d)}`);
  const fin = autres ? `${jours.join(", ")} et ${autres} autre${autres > 1 ? "s" : ""}` : jours.length > 1 ? `${jours.slice(0, -1).join(", ")} et ${jours[jours.length - 1]}` : jours[0];
  return {
    title: `Planning ${nom} : changement ${fin}`,
    body: `Le planning du ${groupe ? `groupe ${nom}` : p.label} a changé. Ouvre-le pour voir ta place.`,
  };
}

/** Le push d'une personne (PG43) : sa place après le changement pour chaque dimanche touché, puis le message.
 *  `roles` : les noms de ses colonnes ce jour-là, déjà dans sa langue ; vide = elle n'y est plus. */
export function changementPlanningMessage(
  p: { titre: string; message: string; jours: { date: string; roles: string[] }[] },
  lang: NotifLang,
): { title: string; body: string } {
  const lignes = p.jours.map((j) =>
    lang === "zh-CN"
      ? `${moisJour(j.date)}主日：${j.roles.length ? j.roles.join("、") : "你已不在服事表上"}`
      : `Dim. ${jourMois(j.date)} : ${j.roles.length ? j.roles.join(", ") : "tu n'es plus au planning"}`,
  );
  return { title: p.titre, body: [...lignes, p.message].filter(Boolean).join("\n") };
}
