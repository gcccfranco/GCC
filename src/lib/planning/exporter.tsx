"use client"

// Export d'un planning au modèle du Sheet (lot U2, P7 PDF et P8 .xlsx, docs/spec-planning-2027.md) :
// dans le navigateur, chargé à la demande, sans route ni coût serveur (Q8).
// Les lignes se relisent au moment d'exporter (grille de l'app et Sheet réunis,
// comme les pages) : « Toute l'année » et « Tous les plannings » dépassent ce que
// la page tient en mémoire. Qui exporte voit déjà le brouillon de ce qu'il
// exporte (responsables du planning, admins — Q13) : rien à filtrer de plus.

import { fetchGrille } from "./grille"
import { fusionnerLignes } from "./grilles"
import { lireSheetDe } from "./sheets"
import { grillesAExporter, nomFichierExport, pagesExport, type Portee } from "./modeles"

/** Côté du logo dans le fichier, en pixels (Q12 : 1 024 px, 1,16 Mo à l'origine). */
export const COTE_LOGO = 300

async function lignesDe(keys: string[]): Promise<Record<string, string[][]>> {
  const paires = await Promise.all(
    keys.map(async (k) => [k, fusionnerLignes(await fetchGrille(k), await lireSheetDe(k))] as const),
  )
  return Object.fromEntries(paires)
}

/** Le logo de l'église réduit à la volée (aucun fichier de logo nouveau), en JPEG
 *  sur fond blanc : une copie légère par page. */
async function logoReduit(): Promise<string> {
  const img = new Image()
  img.src = "/logo.png"
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = COTE_LOGO
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, COTE_LOGO, COTE_LOGO)
  ctx.drawImage(img, 0, 0, COTE_LOGO, COTE_LOGO)
  return canvas.toDataURL("image/jpeg", 0.92)
}

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nom
  a.click()
  URL.revokeObjectURL(url)
}

export async function exporterModele(format: "pdf" | "xlsx", p: {
  portee: Portee
  /** Planning affiché (clé de grille). */
  key: string
  /** Libellé du planning (nom du fichier). */
  label: string
  annee: number
  /** Page affichée : trimestre (1 à 4), période de l'EDD (1 à 6), 1 pour l'année. */
  rang: number
  /** Ce que le nom du fichier dit de la page affichée (« T1 », « P5 »). */
  periodeCourte: string
}): Promise<void> {
  const [lignes, logo] = await Promise.all([lignesDe(grillesAExporter(p.portee, p.key)), logoReduit()])
  const pages = pagesExport({ portee: p.portee, annee: p.annee, key: p.key, rang: p.rang, lignes })
  const nom = nomFichierExport(p.portee, p.label, p.periodeCourte, p.annee, format)
  if (format === "pdf") {
    const [{ pdf }, { PlanningModelePDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/pdf/PlanningModelePDF"),
    ])
    telecharger(await pdf(<PlanningModelePDF pages={pages} logo={logo} titre={nom.replace(/\.pdf$/, "")} />).toBlob(), nom)
  } else {
    // P8 : une feuille par onglet du Sheet (xlsx.ts), écrite par write-excel-file (question 1).
    const [{ default: writeXlsxFile }, { classeurXlsx }, image] = await Promise.all([
      import("write-excel-file/browser"),
      import("./xlsx"),
      fetch(logo).then((r) => r.blob()),
    ])
    telecharger(await writeXlsxFile(classeurXlsx(pages, image)).toBlob(), nom)
  }
}
