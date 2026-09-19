// Import initial d'un planning depuis le Google Sheet vers la grille de l'app
// (lot 17, tranche G4, décision T8 de docs/spec-planning-grille.md). Module
// PUR, partagé par la route /api/admin/importer-planning et les tests.
//
// Rejouable sans doublon : un dimanche déjà écrit dans l'app n'est jamais
// réécrit (une case modifiée entre-temps ne peut donc pas être écrasée).

import type { DefinitionGrille } from "./grilles"
import { normalizeName, splitNames } from "./names"

export type PlanImport = {
  /** Lignes du Sheet à écrire (format `fetchCulte`), absentes de l'app. */
  aEcrire: string[][]
  /** Dimanches déjà dans l'app, laissés tels quels. */
  ignores: number
}

export function planifierImport(sheet: readonly string[][], datesDansLApp: readonly string[]): PlanImport {
  const deja = new Set(datesDansLApp)
  const aEcrire = sheet.filter((r) => r[0] && !deja.has(r[0]))
  return { aEcrire, ignores: sheet.length - aEcrire.length }
}

/** Le document `plannings/{key}/dimanches/{date}` d'une ligne du Sheet. */
export function documentDimanche(
  def: DefinitionGrille,
  row: readonly string[],
  auteur: string,
  quand: string
): Record<string, string> {
  const doc: Record<string, string> = { date: row[0], modifieLe: quand, modifiePar: auteur }
  for (const c of def.colonnes) doc[c.cle] = row[c.index] ?? ""
  return doc
}

/**
 * Les noms écrits dans les cases qu'aucun compte ne porte en nom de planning
 * (comparés par `normalizeName`) : la liste que l'admin regarde après l'import
 * pour rattacher les comptes manquants. Triés, sans doublon.
 */
export function nomsNonRattaches(
  rows: readonly string[][],
  def: DefinitionGrille,
  nomsDesComptes: readonly string[]
): string[] {
  const comptes = new Set(nomsDesComptes.map(normalizeName).filter(Boolean))
  const vus = new Map<string, string>()
  for (const r of rows) {
    for (const c of def.colonnes) {
      for (const nom of splitNames(r[c.index] ?? "")) {
        const cle = normalizeName(nom)
        if (cle && !comptes.has(cle) && !vus.has(cle)) vus.set(cle, nom)
      }
    }
  }
  return [...vus.values()].sort((a, b) => a.localeCompare(b, "fr"))
}
