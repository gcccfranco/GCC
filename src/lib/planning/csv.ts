// Grille de planning et CSV du Google Sheet (lot 17, tranche G4, décision D5
// de docs/spec-planning-grille.md). Module PUR : aucune dépendance.
//
// L'export CSV et le PDF du lot 17 ont laissé la place à « Exporter (modèle du
// Sheet) » (lot U2, P7, question 6) : `versCSV`, `nomFichier` et
// `PlanningPDF.tsx` sont partis avec eux. Reste la lecture d'un CSV au format
// de l'onglet. Une colonne optionnelle (Sainte cène) ne compte que si une case
// de la plage la porte.

import type { ColonneGrille, DefinitionGrille } from "./grilles"

/** Les colonnes exportées : toutes, sauf une optionnelle qu'aucune ligne ne remplit. */
export function colonnesExportees(def: DefinitionGrille, rows: readonly string[][]): ColonneGrille[] {
  return def.colonnes.filter((c) => !c.optionnelle || rows.some((r) => (r[c.index] ?? "").trim()))
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
