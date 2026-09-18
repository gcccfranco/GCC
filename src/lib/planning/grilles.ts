// Définition des plannings remplis dans l'app (lot 17, docs/spec-planning-grille.md).
//
// Module PUR : aucune dépendance Firebase ni réseau, importable par les pages
// client, par `sheets.ts` (donc par le cron) et par les tests.
//
// Les colonnes sont EN DUR (décision T7) : leur `index` est la position dans la
// ligne rendue par `fetchCulte` — c'est lui qui garantit que la grille de l'app
// et le Google Sheet produisent exactement le même tableau. Un test compare ces
// index à `CULTE_ROLES` (src/lib/planning/names.ts).

import { PLANNING_COLORS } from "@/lib/serviceColors"
import { TRI_ORDER, triVisibilities } from "./releases"
import { getAnnee, getTri } from "./utils"

export type ColonneGrille = {
  /** Clé du champ Firestore dans plannings/{key}/dimanches/{date}. */
  cle: string
  /** Libellé : une clé de `planning.roles.*`, déjà traduite en 中文. */
  i18n: string
  /** Position dans la ligne rendue par `fetchCulte` (0 = la date). */
  index: number
  /** Colonne qui ne s'affiche en lecture que si une case de la période est remplie. */
  optionnelle?: boolean
}

export type DefinitionGrille = {
  /** Mêmes clés que PUBLISHABLE_PLANNINGS et planningReleases/{key}_{year}. */
  key: string
  i18nTitre: string
  i18nHoraire: string
  couleur: string
  colonnes: ColonneGrille[]
}

export const COLONNES_CULTE: ColonneGrille[] = [
  { cle: "presidence", i18n: "planning.roles.presidence", index: 1 },
  { cle: "choriste1", i18n: "planning.roles.choriste1", index: 2 },
  { cle: "choriste2", i18n: "planning.roles.choriste2", index: 3 },
  { cle: "piano", i18n: "planning.roles.piano", index: 4 },
  { cle: "guitare", i18n: "planning.roles.guitare", index: 5 },
  { cle: "batterie", i18n: "planning.roles.batterie", index: 6 },
  { cle: "sono", i18n: "planning.roles.sono", index: 7 },
  { cle: "ppt", i18n: "planning.roles.ppt", index: 8 },
  { cle: "orateur", i18n: "planning.roles.orateur", index: 9 },
  { cle: "traduction", i18n: "planning.roles.trad", index: 10 },
  // Ajoutée au T4 2026 : masquée tant qu'aucune case de la période ne la porte.
  { cle: "sainteCene", i18n: "planning.roles.sainteCene", index: 11, optionnelle: true },
]

export const GRILLE_CULTE: DefinitionGrille = {
  key: "culte",
  i18nTitre: "planning.pages.culte",
  i18nHoraire: "planning.horaires.culte",
  couleur: PLANNING_COLORS.culte,
  colonnes: COLONNES_CULTE,
}

const GRILLES: DefinitionGrille[] = [GRILLE_CULTE]

export function grilleDe(key: string): DefinitionGrille | undefined {
  return GRILLES.find((g) => g.key === key)
}

/** Une ligne affichée : la ligne au format `fetchCulte`, et son état de publication. */
export type LigneGrille = { row: string[]; nonPublie: boolean }

/**
 * Publication par trimestre appliquée LIGNE PAR LIGNE (décision D7) — la grille
 * est continue, mais la règle d'aujourd'hui ne bouge pas : un dimanche d'un
 * trimestre futur non publié est retiré pour les membres, et montré aux
 * publieurs avec la marque « Non publié ». Sans cela, supprimer les pilules de
 * trimestre publierait le trimestre suivant à toute l'église.
 *
 * `published` ne couvre que `anneeCourante` (planningReleases/{key}_{year}) :
 * une année ultérieure n'a donc rien de publié, et reste masquée aux membres.
 */
export function lignesPubliees(
  rows: string[][],
  published: string[],
  currentTri: string,
  anneeCourante: number,
  canPublish: boolean
): LigneGrille[] {
  const vis = new Map(triVisibilities(TRI_ORDER, published, currentTri, canPublish).map((v) => [v.tri, v]))
  return rows.flatMap((row) => {
    const annee = getAnnee(row[0])
    if (annee < anneeCourante) return [{ row, nonPublie: false }]
    if (annee > anneeCourante) return canPublish ? [{ row, nonPublie: true }] : []
    const v = vis.get(getTri(row[0]))
    if (!v) return [{ row, nonPublie: false }]
    return v.visible ? [{ row, nonPublie: v.unpublished }] : []
  })
}

/**
 * Grille de l'app et Google Sheet réunis, DIMANCHE PAR DIMANCHE : un dimanche
 * écrit dans l'app remplace entièrement celui du Sheet (sinon une case effacée
 * dans l'app ressusciterait) ; les autres continuent de venir du Sheet. Grille
 * vide = le Sheet tel quel, donc le jour où la grille est pleine, le Sheet
 * n'est plus qu'une archive.
 */
export function fusionnerLignes(app: string[][], sheet: string[][]): string[][] {
  const parDate = new Map(sheet.map((r) => [r[0], r]))
  for (const r of app) parDate.set(r[0], r)
  return [...parDate.values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}
