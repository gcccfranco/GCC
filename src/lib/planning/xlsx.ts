// Le .xlsx d'un planning au modèle de son onglet du Google Sheet (lot U2, P8,
// docs/spec-planning-2027.md). Module PUR : il ne prend de `write-excel-file`
// (question 1) que ses types ; exporter.tsx écrit le fichier.
//
// Une feuille par onglet du Sheet (Q9) : les pages qui portent le même nom de
// feuille (les quatre trimestres du Culte, les six périodes de l'EDD) se
// suivent dans la même feuille ; les groupes ont une feuille par trimestre.
// En-tête commun (Q11, « Commun à tous les onglets ») : rangée 1 l'église,
// rangée 2 vide, rangée 3 le logo, rangée 5 le titre, rangées 7 et 8 la période
// et l'horaire, deux rangées vides, puis le tableau à la mise en forme de SON
// onglet. Polices par leur nom, comme le Sheet (Lora, Calibri, Georgia, Ma Shan
// Zheng). Quadrillage masqué ; ni en-tête ni pied de page.

import type { Cell, CellObject, Row, Sheet } from "write-excel-file/browser"
import type { ColonneModele, LigneExport, PageExport } from "./modeles"

/** Hauteurs relevées dans le Sheet, en points : rangées 1 et 2 (63 px), rangée 3 du logo (219 px). */
const HAUTEUR_EGLISE = 47.25
const HAUTEUR_LOGO = 164.25
/** Côté du logo dans la feuille, en pixels (environ 200 px dans le Sheet). */
const COTE_LOGO = 200
const PX_PAR_POINT = 4 / 3

/** Largeur de colonne en « caractères » d'Excel pour une largeur du Sheet en px (px ≈ 7 × l + 5). */
const enCaracteres = (px: number) => Math.round(((px - 5) / 7) * 100) / 100
const enPixels = (caracteres: number) => Math.round(caracteres * 7 + 5)

type Colonne = { largeur: number; colonne?: ColonneModele }

/** Les colonnes de la feuille : la colonne fusionnée (mois, classe) à sa place, puis celles de la page. */
function colonnesDe(page: PageExport): Colonne[] {
  const fusion = page.modele.fusion
  const cases: Colonne[] = page.colonnes.map((c) => ({ largeur: c.largeur, colonne: c }))
  if (!fusion) return cases
  return fusion.position === "debut" ? [{ largeur: fusion.largeur }, ...cases] : [...cases, { largeur: fusion.largeur }]
}

/** Une ligne d'une seule case sur toute la largeur (église, titre, période, bandeau, mois). Les cases
 *  couvertes par une fusion restent `null` : write-excel-file leur donne le style de la première. */
function pleineLargeur(n: number, cellule: CellObject): Row {
  return [n > 1 ? { ...cellule, columnSpan: n } : cellule, ...Array.from({ length: n - 1 }, () => null)]
}

/** Le tableau d'une page, au modèle de son onglet. */
function tableau(page: PageExport): Row[] {
  const m = page.modele
  const colonnes = colonnesDe(page)
  const n = colonnes.length
  const debut = m.fusion?.position === "debut" ? 1 : 0
  const base: CellObject = {
    fontFamily: m.policeTableau,
    fontSize: m.taille,
    align: m.alignement === "centre" ? "center" : "left",
    alignVertical: "center",
    wrap: true,
    borderStyle: "thin",
    borderColor: m.couleurs.bordure,
  }
  const rows: Row[] = []

  if (page.bandeau) {
    rows.push(pleineLargeur(n, { ...base, value: page.bandeau, fontWeight: "bold", align: "center", textColor: m.couleurs.texteEntete, backgroundColor: m.couleurs.bandeau }))
  }

  // En-têtes : deux colonnes voisines au même libellé n'en font qu'un (Choristes).
  const entete: Cell[] = colonnes.map(({ colonne }) => ({
    ...base,
    value: colonne?.entete || undefined,
    fontWeight: "bold",
    align: "center",
    textColor: m.couleurs.texteEntete,
    backgroundColor: colonne?.fondEntete ?? m.couleurs.fondEntete,
  }))
  for (let i = debut; i < n; ) {
    let j = i + 1
    while (j < n && colonnes[j].colonne && colonnes[j].colonne!.entete === colonnes[i].colonne!.entete) j++
    if (j - i > 1) {
      ;(entete[i] as CellObject).columnSpan = j - i
      for (let k = i + 1; k < j; k++) entete[k] = null
    }
    i = j
  }
  rows.push(entete)

  const ligne = (l: LigneExport): Row => {
    const fond = l.alterne ? m.couleurs.alterne : undefined
    const cases: Cell[] = page.colonnes.map((c, j) => ({
      ...base,
      value: l.cellules[j] || undefined,
      backgroundColor: c.fond ?? fond,
      ...(c.texte ? { textColor: c.texte } : {}),
      ...(c.cle === "moment" ? { fontWeight: "bold" as const } : {}),
    }))
    cases[0] = {
      ...(cases[0] as CellObject),
      backgroundColor: m.couleurs.date ?? fond,
      ...(m.dateGras ? { fontWeight: "bold" as const } : {}),
      ...(m.couleurs.texteDate ? { textColor: m.couleurs.texteDate } : {}),
    }
    if (l.special) {
      // Fidélité musiciens : le dimanche spécial s'écrit sur toute la ligne (Présidence → Percussion).
      for (let k = 2; k < cases.length; k++) cases[k] = null
      cases[1] = { ...base, value: l.special, fontWeight: "bold", align: "center", columnSpan: cases.length - 1, backgroundColor: fond }
    }
    return cases
  }

  for (const bloc of page.blocs) {
    if (bloc.titre) {
      rows.push(pleineLargeur(n, { ...base, value: bloc.titre, fontWeight: "bold", align: "left", textColor: m.couleurs.texteMois, backgroundColor: m.couleurs.mois }))
    }
    bloc.lignes.forEach((l, k) => {
      const cases = ligne(l)
      if (m.fusion) {
        // La case du mois (Fidélité musiciens) ou de la classe (EDD) couvre tout le bloc.
        const premiere: CellObject = {
          ...base,
          backgroundColor: m.couleurs.fusion,
          value: bloc.fusion || undefined,
          fontWeight: "bold",
          align: "center",
          fontSize: m.assemblage === "classes" ? 14 : m.taille,
          ...(bloc.lignes.length > 1 ? { rowSpan: bloc.lignes.length } : {}),
        }
        const c = k === 0 ? premiere : null
        if (m.fusion.position === "debut") cases.unshift(c)
        else cases.push(c)
      }
      rows.push(cases)
    })
  }
  return rows
}

/** Le texte de l'en-tête : sur toute la largeur du tableau, centré, en Lora. */
const enTete = (n: number, value: string, fontSize: number, extra: CellObject = {}): Row =>
  pleineLargeur(n, { value, fontFamily: "Lora", fontSize, align: "center", alignVertical: "center", ...extra })
const vide = (height?: number): Row => [height ? { height } : null]

/**
 * Le classeur d'un export : une feuille par nom de feuille, dans l'ordre des
 * pages (celui des onglets du Sheet). `logo` : le logo réduit (exporter.tsx),
 * une image par feuille, centrée sur la largeur du tableau.
 */
export function classeurXlsx<C>(pages: PageExport[], logo: C): Sheet<C>[] {
  const feuilles: { nom: string; pages: PageExport[] }[] = []
  for (const p of pages) {
    const derniere = feuilles[feuilles.length - 1]
    if (derniere?.nom === p.feuille) derniere.pages.push(p)
    else feuilles.push({ nom: p.feuille, pages: [p] })
  }

  return feuilles.map(({ nom, pages: [premiere, ...suivantes] }) => {
    const m = premiere.modele
    const colonnes = colonnesDe(premiere)
    const n = colonnes.length
    const largeurs = colonnes.map((c) => enCaracteres(c.largeur))

    const data: Row[] = [
      m.eglise === "zh"
        ? enTete(n, premiere.eglise, 36, { fontFamily: "Ma Shan Zheng", height: HAUTEUR_EGLISE })
        : enTete(n, premiere.eglise, 22, { height: HAUTEUR_EGLISE }),
      vide(HAUTEUR_EGLISE),
      vide(HAUTEUR_LOGO),
      vide(),
      enTete(n, premiere.titre, 22),
      vide(),
      enTete(n, premiere.periode, 16),
      ...(premiere.horaire ? [enTete(n, premiere.horaire, 16)] : []),
      vide(),
      vide(),
      ...tableau(premiere),
    ]
    // Les pages suivantes de la même feuille (Culte, Table, EDD, Fidélité musiciens) : la période, puis le tableau.
    for (const p of suivantes) {
      data.push(vide(), vide(), enTete(n, p.periode, 16), ...(p.horaire ? [enTete(n, p.horaire, 16)] : []), vide(), ...tableau(p))
    }

    // Le logo, centré sur le tableau : la colonne où tombe son bord gauche, puis le décalage dans cette colonne.
    const px = largeurs.map(enPixels)
    let gauche = Math.max(0, (px.reduce((s, x) => s + x, 0) - COTE_LOGO) / 2)
    let colonne = 0
    while (colonne < px.length - 1 && gauche >= px[colonne]) gauche -= px[colonne++]
    const image: NonNullable<Sheet<C>["images"]>[number] = {
      content: logo,
      contentType: "image/jpeg",
      width: COTE_LOGO,
      height: COTE_LOGO,
      dpi: 96,
      anchor: { row: 3, column: colonne + 1 },
      offsetX: Math.round(gauche),
      offsetY: Math.round((HAUTEUR_LOGO * PX_PAR_POINT - COTE_LOGO) / 2),
      title: "Logo",
    }

    return {
      sheet: nom,
      data,
      columns: largeurs.map((width) => ({ width })),
      showGridLines: false,
      ...(m.orientation === "paysage" ? { orientation: "landscape" as const } : {}),
      images: [image],
    }
  })
}
