// Chevauchement passé malgré le refus côté client (deux enregistrements au même
// moment) : message aux deux auteurs et clé anti-doublon. Fonctions pures,
// partagées par la route /api/scene/conflit et les tests.

import { formatReminderDate } from "@/lib/push/reminderMessage";
import type { Creneau } from "@/types/programme";
import type { NotifLang } from "@/types/user";

/** Une clé par programme et par paire de créneaux, dans un ordre stable. */
export function conflictKey(programmeId: string, creneauIds: string[]): string {
  return `conflit-${programmeId}-${[...creneauIds].sort().join("-")}`;
}

function slot(c: Creneau, lang: NotifLang): string {
  const who = `${c.quoi} · ${c.qui.join(", ")}`;
  return lang === "fr"
    ? `${c.debut}–${c.fin} (${who}, ${c.auteurNom})`
    : `${c.debut}–${c.fin}（${who}，${c.auteurNom}）`;
}

export function conflictMessage(a: Creneau, b: Creneau, lang: NotifLang): { title: string; body: string } {
  const [x, y] = [a, b].sort((p, q) => (p.debut + p.id).localeCompare(q.debut + q.id));
  const date = formatReminderDate(a.dimanche, lang);
  return lang === "fr"
    ? { title: "Scène : chevauchement", body: `${date} : ${slot(x, "fr")} et ${slot(y, "fr")} se chevauchent sur scène. Mettez-vous d'accord.` }
    : { title: "舞台：时段重叠", body: `${date}：${slot(x, "zh-CN")} 与 ${slot(y, "zh-CN")} 的舞台时段重叠，请协商。` };
}
