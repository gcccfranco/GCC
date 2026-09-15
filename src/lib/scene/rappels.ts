// Rappels des entraînements sur scène (lot 3 bis) : fondus dans les rappels
// regroupés des services (src/lib/push/reminderMessage.ts). Fonctions pures.

import type { ReminderService } from "@/lib/push/reminderMessage";
import type { Creneau } from "@/types/programme";

export const SCENE_SERVICE = "Entraînement sur scène";

// « Qui » d'un créneau → catégorie de l'app (clé de serviceRoles) dont les
// membres reçoivent le rappel. Sans correspondance (EDD 小班, Gp Amour, Gp Joie,
// 敬拜团), seul l'auteur est prévenu.
const QUI_CATEGORY: Record<string, string> = {
  Franco: "Culte Francophone",
  "EDD 中班": "中班",
  "EDD 大班": "大班",
  "EDD 高班": "高班",
  "Gp Paix": "Groupe Paix",
  "Gp Fidélité": "Groupe Fidélité",
  "Gp Bonté": "Groupe Bonté",
};

export function quiCategory(qui: string): string | null {
  return QUI_CATEGORY[qui] ?? null;
}

export function quiCategories(qui: string[]): string[] {
  return qui.map(quiCategory).filter((c): c is string => c !== null);
}

/** Ligne de rappel d'un créneau : « Entraînement sur scène (Chant · EDD 中班) à 17:00–18:30 ». */
export function sceneReminder(c: Pick<Creneau, "debut" | "fin" | "quoi" | "qui">): ReminderService {
  return { service: SCENE_SERVICE, roles: [`${c.quoi} · ${c.qui.join(", ")}`], time: `${c.debut}–${c.fin}` };
}
