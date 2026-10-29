// Petit déj, le mercredi (lot U3, docs/spec-petit-dej.md, PD4) : si le dimanche
// qui vient n'a aucune ligne, une ligne de plus dans le rappel du matin (T5),
// jamais une notification de plus. Fonctions pures, partagées entre le cron
// (/api/cron/reminders) et les tests. Dates ISO « AAAA-MM-JJ », lues en UTC
// comme le reste du cron (08:00 UTC : la date UTC est déjà celle de Paris).

import type { LignePetitDej } from "@/types/petitDej"
import type { NotifLang } from "@/types/user"
import { formatReminderDate } from "@/lib/push/reminderMessage"
import { estLibre } from "@/lib/petitdej/lignes"

const jour = (iso: string) => new Date(`${iso}T12:00:00Z`)

export function estMercredi(today: string): boolean {
  return jour(today).getUTCDay() === 3
}

/** Le dimanche qui vient, strictement après `today` (J+4 un mercredi). */
export function prochainDimanche(today: string): string {
  const d = jour(today)
  d.setUTCDate(d.getUTCDate() + (7 - d.getUTCDay()))
  return d.toISOString().slice(0, 10)
}

/**
 * Les lignes du mercredi (Q5) : « Dimanche 20 septembre : personne pour le petit
 * déj. » puis où couper la préférence (un push n'a pas de lien dans son corps).
 * Rien un autre jour, rien si le dimanche a une ligne, rien si la lecture des
 * inscriptions a échoué (`null`, Q10 : un échec n'est pas « personne »).
 */
export function lignesMercredi(today: string, lignes: LignePetitDej[] | null, lang: NotifLang): string[] {
  if (!lignes || !estMercredi(today)) return []
  const dimanche = prochainDimanche(today)
  if (!estLibre(lignes, dimanche)) return []
  return lang === "zh-CN"
    ? [`${formatReminderDate(dimanche, "zh-CN")}：还没有人负责早餐。`, "不再接收：我 › 我的资料 › 通知 › 早餐"]
    : [`${formatReminderDate(dimanche, "fr")} : personne pour le petit déj.`, "Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj"]
}

/** Titre de la notification quand la ligne du mercredi part seule. */
export function petitDejTitre(lang: NotifLang): string {
  return lang === "zh-CN" ? "早餐" : "Petit déj"
}
