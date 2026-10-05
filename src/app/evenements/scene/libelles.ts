// Dates de la saison de scène (lot U1), en français ou en 中文 : « samedi
// 10 octobre » / « 10月10日星期六 », « 1er octobre » / « 10月1日 ».

function jourLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** « jeudi 1er octobre » / « 10月1日星期四 ». */
export function jourEnLettres(iso: string, lang: string): string {
  const d = jourLocal(iso)
  if (lang === "zh-CN") return d.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long" })
  const mois = d.toLocaleDateString("fr-FR", { month: "long" })
  return `${jour} ${d.getDate() === 1 ? "1er" : d.getDate()} ${mois}`
}

/** « Samedi 10 octobre » : titre d'un bloc de jour. */
export function titreDuJour(iso: string, lang: string): string {
  const s = jourEnLettres(iso, lang)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** « 1er octobre » / « 10月1日 ». */
export function dateCourte(iso: string, lang: string): string {
  const d = jourLocal(iso)
  if (lang === "zh-CN") return `${d.getMonth() + 1}月${d.getDate()}日`
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "long" })}`
}
