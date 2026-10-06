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

/** Une semaine par ses jours réservables (Q12) : « 3 – 4 oct. », « 31 oct. –
 *  1er nov. » / « 10月3日 – 4日 », « 10月31日 – 11月1日 ». */
export function semaineCourte(jours: string[], lang: string): string {
  const [a, b] = [jourLocal(jours[0]), jourLocal(jours[jours.length - 1])]
  const memeMois = a.getMonth() === b.getMonth()
  if (lang === "zh-CN") {
    const de = `${a.getMonth() + 1}月${a.getDate()}日`
    if (jours.length === 1) return de
    return `${de} – ${memeMois ? "" : `${b.getMonth() + 1}月`}${b.getDate()}日`
  }
  const num = (d: Date) => (d.getDate() === 1 ? "1er" : String(d.getDate()))
  const mois = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short" })
  if (jours.length === 1) return `${num(a)} ${mois(a)}`
  return memeMois ? `${num(a)} – ${num(b)} ${mois(b)}` : `${num(a)} ${mois(a)} – ${num(b)} ${mois(b)}`
}

/** Les jours de la semaine d'une saison (0 = dimanche), du lundi au dimanche (P4) :
 *  « le samedi et le dimanche » / « 周六和周日 ». */
export function joursDeLaSemaine(jours: number[], lang: string, et: string): string {
  const noms = [...jours].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((j) => {
    const d = new Date(2026, 9, 4 + j) // 4 octobre 2026 : un dimanche
    return lang === "zh-CN" ? d.toLocaleDateString("zh-CN", { weekday: "short" }).replace("星期", "周") : `le ${d.toLocaleDateString("fr-FR", { weekday: "long" })}`
  })
  return noms.length < 2 ? noms.join("") : `${noms.slice(0, -1).join(lang === "zh-CN" ? "、" : ", ")}${et}${noms.at(-1)}`
}
