// Rappels de service : UN message par personne et par échéance, qui liste ses
// services du jour avec le rôle, en français ou en 中文 (langue mémorisée dans
// notifPrefs/{uid}.lang par la navbar). Fonctions pures, partagées entre le
// cron (/api/cron/reminders) et les tests. Voir docs/spec-planning-petits-lots.md.

import { findMyServices, type PlanningData } from "@/lib/planning/names";
import type { NotifLang } from "@/types/user";

export type ReminderTag = "J7" | "J3" | "J1";

export interface ReminderService {
  /** Libellé de findMyServices : « Culte Franco », « Prépa. Table », « Campus (répét.) »… */
  service: string;
  /** Rôles réunis (« Piano », « Sainte cène »…) ; vide pour la Prépa. Table. */
  roles: string[];
  time?: string;
  location?: string;
}

// Les séances Campus (matin/soir) restent hors rappels : pendant la semaine du
// campus on sert tous les jours, seule la répétition est rappelée (règle conservée).
const isCampusSeance = (service: string) => service === "Campus (matin)" || service === "Campus (soir)";
// « Équipe » (Prépa. Table) n'est pas un rôle à afficher ; à la répétition
// Campus tout le monde vient, seuls l'heure et le lieu comptent.
const SILENT_ROLES = new Set(["Équipe"]);
const ROLELESS_SERVICES = new Set(["Campus (répét.)"]);

/** Services de `name` le jour `dateISO`, un par service, rôles réunis. */
export function reminderServicesFor(planning: PlanningData, name: string, dateISO: string): ReminderService[] {
  const out: ReminderService[] = [];
  for (const e of findMyServices(planning, name)) {
    if (e.date !== dateISO || isCampusSeance(e.service)) continue;
    let s = out.find((x) => x.service === e.service);
    if (!s) {
      s = { service: e.service, roles: [] };
      if (e.time) s.time = e.time;
      if (e.location) s.location = e.location;
      out.push(s);
    }
    if (SILENT_ROLES.has(e.role) || ROLELESS_SERVICES.has(e.service) || s.roles.includes(e.role)) continue;
    s.roles.push(e.role);
  }
  return out;
}

// Mêmes mots que les locales (planning.tabs, planning.roles, planning.groupes).
const SERVICES_ZH: Record<string, string> = {
  "Culte Franco": "法语崇拜",
  "Prépa. Table": "圣餐预备",
  "Groupe Paix": "和平团契",
  "Groupe Fidélité": "信实团契",
  "Groupe Bonté": "良善团契",
  Intergroupe: "联合聚会",
  Interfranco: "法语团契聚会",
  "Campus (répét.)": "夏令营排练",
  "Entraînement sur scène": "舞台排练",
};
const ROLES_ZH: Record<string, string> = {
  Présidence: "司会", Choriste: "和声", Chant: "和声", Piano: "钢琴", Guitare: "吉他",
  Batterie: "架子鼓", Cajon: "箱鼓", "Cajon/Batterie": "箱鼓/鼓", Sono: "音控", PPT: "投影",
  Régie: "音控/投影", Orateur: "讲员", Traduction: "翻译", Musicien: "乐手",
  Suppléant: "替补", "Sainte cène": "圣餐",
};
const WHEN: Record<NotifLang, Record<ReminderTag, string>> = {
  fr: { J7: "dans 1 semaine", J3: "dans 3 jours", J1: "demain" },
  "zh-CN": { J7: "一周后", J3: "3天后", J1: "明天" },
};

function serviceLabel(service: string, lang: NotifLang): string {
  if (lang === "fr") return service;
  if (service.startsWith("EDD ")) return `主日学 ${service.slice(4)}`;
  return SERVICES_ZH[service] ?? service;
}

function serviceText(s: ReminderService, lang: NotifLang): string {
  const roles = s.roles.map((r) => (lang === "fr" ? r : ROLES_ZH[r] ?? r));
  let text = serviceLabel(s.service, lang);
  if (roles.length) text += lang === "fr" ? ` (${roles.join(", ")})` : `（${roles.join("、")}）`;
  if (s.time) text += lang === "fr" ? ` à ${s.time}` : ` ${s.time}`;
  if (s.location) text += lang === "fr" ? `, ${s.location}` : `，${s.location}`;
  return text;
}

export function formatReminderDate(dateISO: string, lang: NotifLang): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  const s = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "zh-CN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(d);
  return lang === "fr" ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function reminderTitle(lang: NotifLang): string {
  return lang === "fr" ? "Rappel de service" : "服务提醒";
}

/** « Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano) · Prépa. Table ». */
export function reminderBody(dateISO: string, tag: ReminderTag, services: ReminderService[], lang: NotifLang): string {
  const list = services.map((s) => serviceText(s, lang)).join(" · ");
  return lang === "fr"
    ? `${formatReminderDate(dateISO, "fr")} (${WHEN.fr[tag]}) : ${list}`
    : `${formatReminderDate(dateISO, "zh-CN")}（${WHEN["zh-CN"][tag]}）：${list}`;
}
