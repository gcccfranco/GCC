// Notifications des tâches par équipe (lot 7, docs/spec-taches.md ; lot 1 du chantier « équipes et
// groupes », EQ12, EQ13) : nouvelle tâche, tâche faite, rappels d'échéance ajoutés à la notification
// du jour. Fonctions pures, en français ou en 中文, partagées avec les tests.

import fr from "@/locales/fr.json";
import zh from "@/locales/zh-CN.json";
import { cleNomEquipe } from "@/lib/equipes/table";
import { formatReminderDate } from "@/lib/push/reminderMessage";
import { addDays, echeancesDe, joursEntre } from "@/lib/taches/echeances";
import type { NotifLang } from "@/types/user";
import type { Fois, Tache } from "@/types/tache";

const LOCALES: Record<NotifLang, unknown> = { fr, "zh-CN": zh };

/** Nom d'une équipe, lu dans les fichiers de langue (une seule source, EQ13) : le long (« TEAM
 *  MÉDIAS », 媒体组) pour les notifications, le court (« Médias ») pour les écrans ; « Louange » /
 *  敬拜 pour le public Louange (EQ4). Une équipe hors des fichiers garde son id. */
export function nomEquipe(equipe: string, lang: NotifLang, court = false): string {
  const nom = cleNomEquipe(equipe, court).split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], LOCALES[lang]);
  return typeof nom === "string" ? nom : equipe;
}

/** Date dans une phrase : « vendredi 18 septembre » / « 9月18日星期五 ». */
function dateDansPhrase(iso: string, lang: NotifLang): string {
  const s = formatReminderDate(iso, lang);
  return lang === "fr" ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export function nouvelleTacheMessage(t: Pick<Tache, "titre" | "equipe" | "echeance">, lang: NotifLang) {
  return lang === "fr"
    ? { title: `Nouvelle tâche : ${t.titre}`, body: `${nomEquipe(t.equipe, "fr")} · pour ${dateDansPhrase(t.echeance, "fr")}` }
    : { title: `新任务：${t.titre}`, body: `${nomEquipe(t.equipe, "zh-CN")} · 截止 ${dateDansPhrase(t.echeance, "zh-CN")}` };
}

export function tacheFaiteMessage(t: Pick<Tache, "titre" | "equipe">, parNom: string, lang: NotifLang) {
  return lang === "fr"
    ? { title: `Tâche faite : ${t.titre}`, body: `${parNom} (${nomEquipe(t.equipe, "fr")}) l'a terminée.` }
    : { title: `任务完成：${t.titre}`, body: `${parNom}（${nomEquipe(t.equipe, "zh-CN")}）已完成。` };
}

export type RappelTache = {
  tache: Tache;
  date: string;
  quand: "J3" | "J1" | "retard" | "encours";
  /** « encours » : jours entiers depuis le début, si on le sait (lot 13). */
  depuis?: number;
};

/** Fois sans document dont l'échéance est dans 3 jours, demain, ou était hier ;
 *  et, chaque matin, les fois « en cours » dont l'échéance est passée (lot 13 :
 *  une ligne de plus dans la notification du jour, jamais un envoi de plus). */
export function rappelsDuJour(items: { tache: Tache; fois: Fois[] }[], today: string): RappelTache[] {
  const cibles: [string, RappelTache["quand"]][] = [
    [addDays(today, 3), "J3"],
    [addDays(today, 1), "J1"],
    [addDays(today, -1), "retard"],
  ];
  const out: RappelTache[] = [];
  for (const { tache, fois } of items) {
    // Une fois qui porte un document est prise en main : ni « À faire » ni « En retard ».
    const touchees = new Set(fois.map((f) => f.date));
    for (const [date, quand] of cibles) {
      if (!touchees.has(date) && echeancesDe(tache, date, date).length) out.push({ tache, date, quand });
    }
    for (const f of fois) {
      if (f.etat !== "encours" || f.date >= today) continue;
      out.push({ tache, date: f.date, quand: "encours", ...(f.debutLe ? { depuis: joursEntre(f.debutLe, today) } : {}) });
    }
  }
  return out;
}

export function ligneRappelTache(r: RappelTache, lang: NotifLang): string {
  const quoi = lang === "fr" ? `${r.tache.titre} (${nomEquipe(r.tache.equipe, "fr")})` : `${r.tache.titre}（${nomEquipe(r.tache.equipe, "zh-CN")}）`;
  if (r.quand === "encours") {
    if (r.depuis === undefined) return lang === "fr" ? `En cours : ${quoi}` : `进行中：${quoi}`;
    if (r.depuis === 0) return lang === "fr" ? `En cours depuis aujourd'hui : ${quoi}` : `今天开始：${quoi}`;
    return lang === "fr"
      ? `En cours depuis ${r.depuis} jour${r.depuis > 1 ? "s" : ""} : ${quoi}`
      : `进行中 ${r.depuis} 天：${quoi}`;
  }
  if (r.quand === "retard") return lang === "fr" ? `En retard : ${quoi}, pour hier` : `逾期：${quoi}，昨天到期`;
  return lang === "fr" ? `À faire : ${quoi}, ${dateDansPhrase(r.date, "fr")}` : `待办：${quoi}，${dateDansPhrase(r.date, "zh-CN")}`;
}

/** Clé notifLog d'un rappel (EQ12) : `rappel-tache-${quand}-${equipe}-${id}-${date}` ; « en cours »
 *  revient chaque matin, le jour d'envoi entre dans la clé (lot 13). */
export function cleRappelTache(r: RappelTache, today: string): string {
  return r.quand === "encours"
    ? `rappel-tache-encours-${r.tache.equipe}-${r.tache.id}-${r.date}-${today}`
    : `rappel-tache-${r.quand}-${r.tache.equipe}-${r.tache.id}-${r.date}`;
}

export function rappelTachesTitre(lang: NotifLang): string {
  return lang === "fr" ? "Rappel de tâches" : "任务提醒";
}

/** Corps d'une notification du jour, les tâches ajoutées à la ligne. */
export function corpsAvecTaches(body: string, rappels: RappelTache[], lang: NotifLang): string {
  return [body, ...rappels.map((r) => ligneRappelTache(r, lang))].filter(Boolean).join("\n");
}
