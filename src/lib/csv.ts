/** CSV de l'export Google Sheets, lu caractère par caractère : virgules, guillemets doublés (`""`) et
 *  retours à la ligne (`\n`, `\r\n`) entre guillemets gardés dans la cellule, lignes vides comprises
 *  (les rangs comptent dans la grille). Cellules brutes, sans `trim`. Partagé par le planning
 *  (`src/lib/planning/sheets.ts`) et les évènements (`src/lib/evenements/sheet.ts`). */
export function lireCSV(texte: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let cellule = ""
  let entreGuillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (entreGuillemets) {
      if (c !== '"') cellule += c
      else if (texte[i + 1] === '"') { cellule += '"'; i++ }
      else entreGuillemets = false
    } else if (c === '"') entreGuillemets = true
    else if (c === ",") { ligne.push(cellule); cellule = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++
      ligne.push(cellule); lignes.push(ligne)
      ligne = []; cellule = ""
    } else cellule += c
  }
  if (cellule || ligne.length) { ligne.push(cellule); lignes.push(ligne) }
  return lignes
}
