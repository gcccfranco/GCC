export function formatDate(iso: string, language: string): string {
  const locale = language === "zh-CN" ? "zh-CN" : "fr-FR";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}
/** Le jour et le mois, courts, dans la langue : « 20/10 » en français, « 10月20日 » en 中文. */
export function formatJourMois(iso: string, language: string): string {
  const d = new Date(iso + "T12:00:00");
  if (language === "zh-CN") return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(d);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d);
}

/** Une date lue de Firestore, tolérante (BO-G, 15) : un `Timestamp` devenu `Date`, `{seconds}` (ou `_seconds`), une chaîne ISO,
 *  un nombre (millisecondes, ou secondes s'il est petit) ou une `Date`. Tout le reste, ou une date invalide : `null`. */
export function versDate(v: unknown): Date | null {
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === "string" && v.trim()) d = new Date(v);
  else if (typeof v === "number" && Number.isFinite(v)) d = new Date(Math.abs(v) < 1e11 ? v * 1000 : v);
  else if (typeof v === "object" && v !== null) {
    const o = v as { seconds?: unknown; _seconds?: unknown; nanoseconds?: unknown; _nanoseconds?: unknown };
    const s = Number(o.seconds ?? o._seconds);
    if ((o.seconds ?? o._seconds) != null && Number.isFinite(s)) d = new Date(s * 1000 + Math.floor(Number(o.nanoseconds ?? o._nanoseconds ?? 0) / 1e6));
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
