// Lecture du planning par le cron du matin (docs/spec-corrections-audit.md, A2 ter) : un onglet raté ne passe plus
// pour un onglet vide. Les onglets ratés sont relus UNE fois après une courte pause ; ceux qui échouent encore
// font répondre `ok: false` et préviennent les admins. Serveur seulement (les envois se passent en paramètre).

import { lecturesSheet, relireOnglets } from "./sheets"

/** Pause avant la relecture des onglets ratés. */
const PAUSE_RELECTURE_MS = 1_500

type BilanLectures = {
  ok: boolean
  /** 500 seulement si TOUTES les lectures ont échoué (et aucune n'a réussi à la relecture), sinon 200. */
  status: 200 | 500
  /** Onglets encore illisibles après la relecture. */
  ratees: string[]
}

/** Le bilan d'un passage : `avant` = les lectures du premier chargement, `encore` = les onglets encore ratés après la relecture. */
export function bilanLectures(avant: { tentatives: number; echecs: string[] }, encore: string[]): BilanLectures {
  const uniques = new Set(avant.echecs).size
  const toutes = avant.tentatives > 0 && avant.echecs.length >= avant.tentatives && encore.length >= uniques && uniques > 0
  return { ok: encore.length === 0, status: toutes ? 500 : 200, ratees: encore }
}

/** La notification aux admins (français, comme les signalements). */
export function messageOngletsIllisibles(noms: string[]): { title: string; body: string; url: string; tag: string } {
  return {
    title: "Rappels du matin",
    body: `Rappels du matin : ${noms.length} onglet${noms.length > 1 ? "s" : ""} du planning illisible${noms.length > 1 ? "s" : ""} (${noms.join(", ")})`,
    url: "/admin",
    tag: "cron-onglets-illisibles",
  }
}

/** Charge le planning ; si des onglets ont échoué, les relit une fois après `pauseMs`, recharge si l'un d'eux est
 *  revenu, et prévient les admins (`prevenir`) de ceux qui restent illisibles. */
export async function lireAvecRelecture<T>(
  charger: () => Promise<T>,
  options: { pauseMs?: number; prevenir: (message: ReturnType<typeof messageOngletsIllisibles>) => Promise<unknown> },
): Promise<{ data: T } & BilanLectures> {
  let data = await charger()
  const avant = lecturesSheet()
  let encore = [...new Set(avant.echecs)]
  if (encore.length) {
    await new Promise((r) => setTimeout(r, options.pauseMs ?? PAUSE_RELECTURE_MS))
    const restent = await relireOnglets(encore)
    if (restent.length < encore.length) data = await charger()
    encore = restent
  }
  const bilan = bilanLectures(avant, encore)
  if (encore.length) {
    console.error(`[cron] ${encore.length} onglet(s) du planning illisible(s) après relecture : ${encore.join(", ")}`)
    await options.prevenir(messageOngletsIllisibles(encore)).catch((e) => console.error("[cron] admins non prévenus des onglets illisibles", e))
  }
  return { data, ...bilan }
}
