// Export d'une grille de planning (lot 17, tranche G4, décision D5 de
// docs/spec-planning-grille.md). Module PUR : aucune dépendance, importable
// par la grille, par les tests et par la route d'import.
//
// Le fichier reproduit l'onglet du Google Sheet, ligne d'en-tête comprise :
// séparateur virgule (celui que `parseCSV` relit), UTF-8 avec BOM (sinon
// Sheets et Excel abîment les accents), guillemets seulement autour d'une case
// qui en a besoin, dates en JJ/MM (la graphie du Sheet, celle que `parseDate`
// lit), cases vides vides. Une colonne optionnelle (Sainte cène) n'est
// exportée que si une case de la plage la porte.

import type { ColonneGrille, DefinitionGrille } from "./grilles"

export const BOM = "﻿"

/** « 2026-10-04 » → « 04/10 ». */
export function dateJJMM(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function cellule(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Les colonnes exportées : toutes, sauf une optionnelle qu'aucune ligne ne remplit. */
export function colonnesExportees(def: DefinitionGrille, rows: readonly string[][]): ColonneGrille[] {
  return def.colonnes.filter((c) => !c.optionnelle || rows.some((r) => (r[c.index] ?? "").trim()))
}

/**
 * Le CSV d'une plage de lignes (format `fetchCulte` : date ISO puis les cases
 * à l'index de leur colonne). `libelle` traduit une clé i18n de colonne.
 */
export function versCSV(
  rows: readonly string[][],
  def: DefinitionGrille,
  libelle: (i18n: string) => string,
  libelleDate = "DATE"
): string {
  const cols = colonnesExportees(def, rows)
  const lignes = [[libelleDate, ...cols.map((c) => libelle(c.i18n))]]
  for (const r of rows) lignes.push([dateJJMM(r[0]), ...cols.map((c) => r[c.index] ?? "")])
  return BOM + lignes.map((l) => l.map(cellule).join(",")).join("\n") + "\n"
}

/** « Culte Franco » + plage → `Culte_Franco_2026-10-04_2026-12-27.csv`. */
export function nomFichier(label: string, rows: readonly string[][], extension: "csv" | "pdf"): string {
  const dates = rows.map((r) => r[0]).filter(Boolean).sort()
  const base = label.trim().replace(/\s+/g, "_")
  const plage = dates.length ? `_${dates[0]}_${dates[dates.length - 1]}` : ""
  return `${base}${plage}.${extension}`
}

/** Lignes d'un CSV relu (`parseCSV`) ramenées au format de la grille : la
 *  ligne d'en-tête tombe (pas de date), chaque case retrouve l'index de sa
 *  colonne. `parseDate` est injecté pour ne pas dépendre de `sheets.ts`. */
export function depuisCSV(
  rows: readonly string[][],
  def: DefinitionGrille,
  parseDate: (s: string) => string | null
): string[][] {
  const cols = colonnesExportees(def, [])
  const largeur = Math.max(...def.colonnes.map((c) => c.index)) + 1
  return rows.flatMap((r) => {
    const date = parseDate(r[0] ?? "")
    if (!date) return []
    const ligne = Array<string>(largeur).fill("")
    ligne[0] = date
    cols.forEach((c, i) => { ligne[c.index] = r[i + 1] ?? "" })
    return [ligne]
  })
}
