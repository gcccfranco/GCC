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

/** Un jour en court (P5, « Mes réservations ») : « dim. 11 oct. » / « 10月11日周日 ». */
export function jourCourt(iso: string, lang: string): string {
  const d = jourLocal(iso)
  if (lang === "zh-CN") return `${d.getMonth() + 1}月${d.getDate()}日${d.toLocaleDateString("zh-CN", { weekday: "short" }).replace("星期", "周")}`
  const num = d.getDate() === 1 ? "1er" : String(d.getDate())
  return `${d.toLocaleDateString("fr-FR", { weekday: "short" })} ${num} ${d.toLocaleDateString("fr-FR", { month: "short" })}`
}

/** La tuile de date (P5) : « 11 » sur « oct. » / « 10月 ». */
export function tuileDate(iso: string, lang: string): { jour: string; mois: string } {
  const d = jourLocal(iso)
  return { jour: String(d.getDate()), mois: lang === "zh-CN" ? `${d.getMonth() + 1}月` : d.toLocaleDateString("fr-FR", { month: "short" }) }
}

/** Les jours d'une semaine en court (P5) : « sam. et dim. » / « 周六和周日 ». */
export function joursCourts(jours: string[], lang: string, et: string): string {
  const noms = jours.map((iso) => {
    const d = jourLocal(iso)
    return lang === "zh-CN" ? d.toLocaleDateString("zh-CN", { weekday: "short" }).replace("星期", "周") : d.toLocaleDateString("fr-FR", { weekday: "short" })
  })
  return noms.length < 2 ? noms.join("") : `${noms.slice(0, -1).join(lang === "zh-CN" ? "、" : ", ")}${et}${noms.at(-1)}`
}

/** Les deux bornes du titre d'une semaine (P5) : « 10 » et « 11 octobre », « 31 octobre » et
 *  « 1er novembre » / « 10月10日 » et « 11日 ». Un seul jour : `au` vaut `null`. */
export function bornesSemaine(jours: string[], lang: string): { du: string; au: string | null } {
  const [a, b] = [jourLocal(jours[0]), jourLocal(jours[jours.length - 1])]
  if (jours.length === 1) return { du: dateCourte(jours[0], lang), au: null }
  const memeMois = a.getMonth() === b.getMonth()
  const au = dateCourte(jours[jours.length - 1], lang)
  if (lang === "zh-CN") return { du: dateCourte(jours[0], lang), au: memeMois ? `${b.getDate()}日` : au }
  return { du: memeMois ? (a.getDate() === 1 ? "1er" : String(a.getDate())) : dateCourte(jours[0], lang), au }
}

/** Un jour de la semaine (0 = dimanche), en tête de phrase (P7, aides de la saison) :
 *  « Samedi » / « 周六 ». */
export function nomDuJour(j: number, lang: string): string {
  const d = new Date(2026, 9, 4 + j) // 4 octobre 2026 : un dimanche
  if (lang === "zh-CN") return d.toLocaleDateString("zh-CN", { weekday: "short" }).replace("星期", "周")
  const s = d.toLocaleDateString("fr-FR", { weekday: "long" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Une heure de plage en court (P7, P9) : « 10 », « 10:30 » — « sam. 10–12 ». */
export const heureCourte = (h: string) => (h.endsWith(":00") ? String(Number(h.slice(0, 2))) : h)
