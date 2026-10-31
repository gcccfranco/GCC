// Gestes de la grille d'un planning : copier le dimanche précédent, remplir vers le bas,
// copier-coller au clavier (lot 3 du chantier « équipes et groupes »,
// docs/spec-planning-gestes.md, PG2 à PG32).
//
// Module PUR : la grille lit ses cases (`lire`, `verrou`) et donne ces fonctions ; elles rendent
// des listes de cases à écrire. Une case « verrouillée » (présidence imposée, colonne en lecture
// seule) n'est jamais écrite par un geste (PG2).

import type { ColonneGrille, DefinitionGrille } from "./grilles"
import { colonneDePersonnes } from "./choisir"
import { getAnnee, getTri } from "./utils"

/** Une case qu'un geste change : sa valeur affichée avant, celle d'après. */
export type CaseGeste = { date: string; cle: string; avant: string; apres: string }

export type LireCase = (date: string, cle: string) => string
export type VerrouCase = (date: string, cle: string) => boolean

const MS_JOUR = 86_400_000
const midi = (iso: string) => new Date(`${iso}T12:00:00Z`).getTime()
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * La ligne dont on recopie (PG10). Planning hebdomadaire : le dimanche J−7 exactement, absent
 * de `dates` il est vide. Planning à dates choisies : la date posée qui précède.
 */
export function lignePrecedente(def: DefinitionGrille, dates: readonly string[], date: string): string | null {
  if (def.dates === "dimanches") {
    const avant = iso(midi(date) - 7 * MS_JOUR)
    return dates.includes(avant) ? avant : null
  }
  const avant = dates.filter((d) => d < date).sort()
  return avant.length ? avant[avant.length - 1] : null
}

/** Les colonnes recopiées (PG11) : des personnes, sans Orateur, ni colonne en lecture seule. */
export function colonnesACopier(def: DefinitionGrille): ColonneGrille[] {
  return def.colonnes.filter((c) => colonneDePersonnes(c.cle) && c.cle !== "orateur" && !c.lectureSeule)
}

/** Copier une ligne sur une autre (PG11 à PG13). */
export function planCopie(p: {
  colonnes: readonly ColonneGrille[]
  source: string
  cible: string
  lire: LireCase
  verrou: VerrouCase
}): { vides: CaseGeste[]; remplace: CaseGeste[]; verrouillees: number } {
  const vides: CaseGeste[] = []
  const remplace: CaseGeste[] = []
  let verrouillees = 0
  for (const c of p.colonnes) {
    // Une présidence imposée, à la source comme à la cible, n'est jamais recopiée (PG2).
    if (p.verrou(p.cible, c.cle) || p.verrou(p.source, c.cle)) { verrouillees++; continue }
    const apres = p.lire(p.source, c.cle).trim()
    if (!apres) continue
    const avant = p.lire(p.cible, c.cle)
    if (avant === apres) continue
    ;(avant.trim() ? remplace : vides).push({ date: p.cible, cle: c.cle, avant, apres })
  }
  return { vides, remplace, verrouillees }
}

/** Les dimanches qui suivent `date`, dans son trimestre (PG19) ; `dates` = lignes données à la grille. */
export function datesApres(dates: readonly string[], date: string): string[] {
  return dates
    .filter((d) => d > date && getAnnee(d) === getAnnee(date) && getTri(d) === getTri(date))
    .sort()
}

/** Remplir vers le bas (PG19) : les seules cases vides de la colonne, aux `dates` données. */
export function planRemplir(p: {
  cle: string
  nom: string
  dates: readonly string[]
  lire: LireCase
  verrou: VerrouCase
}): { cases: CaseGeste[]; verrouillees: number; fin: string } {
  const cases: CaseGeste[] = []
  let verrouillees = 0
  for (const date of p.dates) {
    if (p.verrou(date, p.cle)) { verrouillees++; continue }
    if (!p.lire(date, p.cle).trim()) cases.push({ date, cle: p.cle, avant: p.lire(date, p.cle), apres: p.nom })
  }
  return { cases, verrouillees, fin: p.dates[p.dates.length - 1] ?? "" }
}

/**
 * Le texte d'un presse-papiers de Google Sheets ou d'Excel : lignes par `\n` ou `\r\n`, colonnes
 * par tabulation, dernière ligne vide ignorée, cellules entre guillemets (guillemets doublés) qui
 * peuvent porter un saut de ligne, remplacé par « , » (PG26).
 */
export function lireCollage(texte: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let cellule = ""
  let guillemets = false
  const finCellule = () => { ligne.push(cellule); cellule = "" }
  const finLigne = () => { finCellule(); lignes.push(ligne); ligne = [] }
  for (let i = 0; i < texte.length; i++) {
    const ch = texte[i]
    if (guillemets) {
      if (ch === '"') {
        if (texte[i + 1] === '"') { cellule += '"'; i++ } else guillemets = false
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texte[i + 1] === "\n") i++
        cellule += ", "
      } else cellule += ch
    } else if (ch === '"' && cellule === "") guillemets = true
    else if (ch === "\t") finCellule()
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texte[i + 1] === "\n") i++
      finLigne()
    } else cellule += ch
  }
  if (cellule !== "" || ligne.length) finLigne()
  return lignes
}

/** Longueur au-delà de laquelle une cellule collée est refusée. */
export const CELLULE_MAX = 200

/** Coller un bloc à partir d'une ancre (PG26 et PG27). */
export function planCollage(p: {
  bloc: readonly (readonly string[])[]
  /** Rang de la ligne et de la colonne du coin haut-gauche, parmi les lignes et colonnes affichées. */
  ligne: number
  col: number
  dates: readonly string[]
  cles: readonly string[]
  lire: LireCase
  verrou: VerrouCase
}): { cases: CaseGeste[]; remplace: number; vides: number; horsGrille: number; verrouillees: number; tropLongues: number } {
  const cases: CaseGeste[] = []
  let remplace = 0, vides = 0, horsGrille = 0, verrouillees = 0, tropLongues = 0
  p.bloc.forEach((cellules, i) => {
    cellules.forEach((brut, j) => {
      const date = p.dates[p.ligne + i]
      const cle = p.cles[p.col + j]
      const apres = brut.trim()
      if (date === undefined || cle === undefined) { horsGrille++; return }
      if (p.verrou(date, cle)) { verrouillees++; return }
      // Une cellule vide n'efface jamais une case : seul ⌫ vide (PG27).
      if (!apres) return
      // Une cellule démesurée (un tableau entier collé dans une case) n'est pas un nom : refusée et comptée.
      if (apres.length > CELLULE_MAX) { tropLongues++; return }
      const avant = p.lire(date, cle)
      if (avant === apres) return
      cases.push({ date, cle, avant, apres })
      if (avant.trim()) remplace++
      else vides++
    })
  })
  return { cases, remplace, vides, horsGrille, verrouillees, tropLongues }
}

/** Une plage en texte tabulé (PG25) ; une case `masque` se copie vide. */
export function enTexteTabule(
  dates: readonly string[],
  cles: readonly string[],
  lire: LireCase,
  masque: VerrouCase,
): string {
  return dates
    .map((d) => cles.map((c) => (masque(d, c) ? "" : lire(d, c))).join("\t"))
    .join("\n")
}

/** Les cases d'un geste groupées par dimanche, dans l'ordre des dates (PG4). */
export function parDimanche(cases: readonly CaseGeste[]): { date: string; champs: Record<string, string> }[] {
  const groupes = new Map<string, Record<string, string>>()
  for (const c of cases) groupes.set(c.date, { ...groupes.get(c.date), [c.cle]: c.apres })
  return [...groupes.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, champs]) => ({ date, champs }))
}
