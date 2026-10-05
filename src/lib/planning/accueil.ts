// Accueil A (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14) : ce que la page lit
// pour « Pour moi » — le prochain service, les suivants, la setlist du service. Pur,
// testé sans navigateur.

import type { FSSetlist } from "@/lib/firebase/setlists"
import { normalizeName, serviceCategory, type ServiceEntry } from "./names"

/** Un service d'une personne, ses rôles réunis (« Piano », « Présidence »…). */
export type ServiceDuJour = {
  date: string
  service: string
  roles: string[]
  setlistDate?: string
  leader?: string
  moment?: "matin" | "soir"
}

/** Réunit les rôles d'un même service le même jour, dans l'ordre des dates (comme Mes services). */
export function reunirServices(entries: ServiceEntry[]): ServiceDuJour[] {
  const parCle = new Map<string, ServiceDuJour>()
  for (const e of entries) {
    const cle = `${e.date}|${e.service}|${e.setlistDate ?? ""}|${e.moment ?? ""}`
    const deja = parCle.get(cle)
    if (deja) {
      if (!deja.roles.includes(e.role)) deja.roles.push(e.role)
    } else {
      parCle.set(cle, { date: e.date, service: e.service, roles: [e.role], setlistDate: e.setlistDate, leader: e.leader, moment: e.moment })
    }
  }
  return [...parCle.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** « Pour moi » : les services du prochain jour où la personne sert, puis au plus
 *  `combienEnsuite` services des jours suivants. `null` sans service à venir : le bloc
 *  disparaît (Q14). `aujourdhui` compte comme à venir. */
export function pourMoi(
  entries: ServiceEntry[],
  aujourdhui: string,
  combienEnsuite: number,
): { prochain: ServiceDuJour[]; ensuite: ServiceDuJour[] } | null {
  const aVenir = reunirServices(entries.filter((e) => e.date >= aujourdhui))
  if (!aVenir.length) return null
  const jour = aVenir[0].date
  return {
    prochain: aVenir.filter((s) => s.date === jour),
    ensuite: aVenir.filter((s) => s.date !== jour).slice(0, combienEnsuite),
  }
}

/** La setlist d'un service parmi celles de sa date et de sa catégorie : une seule, on la
 *  prend ; plusieurs, on départage par le moment (Campus), puis par la présidence ; un
 *  doute, aucune (mieux vaut pas de lien qu'un mauvais). Règle de Mes services. */
export function choisirSetlist<S extends Pick<FSSetlist, "leader" | "moment">>(
  candidates: S[],
  categorie: string,
  leader?: string,
  moment?: "matin" | "soir",
): S | undefined {
  if (!candidates.length) return undefined
  const parPresidence = () => {
    if (!leader) return undefined
    const voulu = normalizeName(leader)
    return candidates.find((s) => normalizeName(s.leader) === voulu)
  }
  if (categorie === "Campus") {
    if (moment) {
      const m = candidates.find((s) => s.moment === moment)
      if (m) return m
    }
    return parPresidence()
  }
  if (candidates.length === 1) return candidates[0]
  return parPresidence()
}

/** La setlist d'un service de « Pour moi », parmi toutes les setlists lues. */
export function setlistDuService<S extends Pick<FSSetlist, "date" | "category" | "leader" | "moment">>(
  setlists: S[],
  s: ServiceDuJour,
): S | undefined {
  const categorie = serviceCategory(s.service)
  if (!categorie) return undefined
  const date = s.setlistDate ?? s.date
  return choisirSetlist(setlists.filter((x) => x.date === date && x.category === categorie), categorie, s.leader, s.moment)
}

/** Jours entre deux dates ISO (heure locale, sans décalage d'été). */
export function joursAvant(date: string, aujourdhui: string): number {
  const [y1, m1, d1] = aujourdhui.split("-").map(Number)
  const [y2, m2, d2] = date.split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** Vrai si la case (un ou plusieurs noms, « A, B ») porte le nom de la personne. */
export function porteLeNom(cellule: string, nom: string): boolean {
  if (!nom.trim()) return false
  const voulu = normalizeName(nom)
  return cellule.split(/[,，]/).some((n) => normalizeName(n.trim()) === voulu)
}
