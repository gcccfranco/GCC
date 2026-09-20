// Définition des plannings remplis dans l'app (lot 17, docs/spec-planning-grille.md).
//
// Module PUR : aucune dépendance Firebase ni réseau, importable par les pages
// client, par `sheets.ts` (donc par le cron) et par les tests.
//
// Les colonnes sont EN DUR (décision T7) : leur `index` est la position dans la
// ligne rendue par le lecteur du Sheet (`fetchCulte`, `fetchIntergroupe`…) —
// c'est lui qui garantit que la grille de l'app et le Google Sheet produisent
// exactement le même tableau. Un test compare les index du Culte à
// `CULTE_ROLES` (src/lib/planning/names.ts).
//
// 19/09/2026 (Timothée : « pouvoir modifier tous les plannings sur le site ») :
// les onze grilles sont définies ici, une par onglet du Sheet — les classes de
// l'EDD et les deux moments du Campus ont chacun la leur, parce qu'un document
// `dimanches/{date}` ne porte qu'une ligne.

import { PLANNING_COLORS } from "@/lib/serviceColors"
import { TRI_ORDER, triVisibilities } from "./releases"
import { EDD_CLASSES, getAnnee, getTri } from "./utils"

export type ColonneGrille = {
  /** Clé du champ Firestore dans plannings/{key}/dimanches/{date}. */
  cle: string
  /** Libellé : une clé de `planning.roles.*`, déjà traduite en 中文. */
  i18n: string
  /** Position dans la ligne rendue par le lecteur du Sheet (0 = la date). */
  index: number
  /** Colonne qui ne s'affiche en lecture que si une case de la période est remplie. */
  optionnelle?: boolean
}

export type DefinitionGrille = {
  /** Clé Firestore (plannings/{key}) et du droit `plannings` du profil. */
  key: string
  /** Libellé français court : nom des fichiers exportés, cases de l'admin. */
  label: string
  i18nTitre: string
  /** Sous-titre du bandeau : littéral (classe EDD) ou clé i18n (moment du Campus). */
  sousTitre?: string
  i18nSousTitre?: string
  i18nHoraire?: string
  couleur: string
  colonnes: ColonneGrille[]
}

const col = (cle: string, i18n: string, index: number, optionnelle = false): ColonneGrille => ({
  cle, i18n: `planning.roles.${i18n}`, index, ...(optionnelle ? { optionnelle: true } : {}),
})

export const COLONNES_CULTE: ColonneGrille[] = [
  col("presidence", "presidence", 1),
  col("choriste1", "choriste1", 2),
  col("choriste2", "choriste2", 3),
  col("piano", "piano", 4),
  col("guitare", "guitare", 5),
  col("batterie", "batterie", 6),
  col("sono", "sono", 7),
  col("ppt", "ppt", 8),
  col("orateur", "orateur", 9),
  col("traduction", "trad", 10),
  // Ajoutée au T4 2026 : masquée tant qu'aucune case de la période ne la porte.
  col("sainteCene", "sainteCene", 11, true),
]

export const GRILLE_CULTE: DefinitionGrille = {
  key: "culte",
  label: "Culte Franco",
  i18nTitre: "planning.pages.culte",
  i18nHoraire: "planning.horaires.culte",
  couleur: PLANNING_COLORS.culte,
  colonnes: COLONNES_CULTE,
}

// Intergroupe (3 choristes) et Interfranco (2) : même structure que le Culte
// ensuite (piano … traduction), cf. `fetchIntergroupe` / `fetchInterfranco`.
export const GRILLE_INTERGROUPE: DefinitionGrille = {
  key: "intergroupe",
  label: "Intergroupe",
  i18nTitre: "planning.pages.intergroupe",
  couleur: PLANNING_COLORS.intergroupe,
  colonnes: [
    col("presidence", "presidence", 1), col("choriste1", "choriste1", 2), col("choriste2", "choriste2", 3),
    col("choriste3", "choriste3", 4), col("piano", "piano", 5), col("guitare", "guitare", 6),
    col("cajonBatterie", "cajonBatt", 7), col("sonoLive", "sonoLive", 8), col("ppt", "ppt", 9),
    col("orateur", "orateur", 10), col("traduction", "trad", 11),
  ],
}

export const GRILLE_INTERFRANCO: DefinitionGrille = {
  key: "interfranco",
  label: "Interfranco",
  i18nTitre: "planning.pages.interfranco",
  couleur: PLANNING_COLORS.interfranco,
  colonnes: [
    col("presidence", "presidence", 1), col("choriste1", "choriste1", 2), col("choriste2", "choriste2", 3),
    col("piano", "piano", 4), col("guitare", "guitare", 5), col("cajonBatterie", "cajonBatt", 6),
    col("sonoLive", "sonoLive", 7), col("ppt", "ppt", 8), col("orateur", "orateur", 9), col("traduction", "trad", 10),
  ],
}

// Groupes (quatre onglets par trimestre dans le Sheet, quatre colonnes).
export const GRILLE_PAIX: DefinitionGrille = {
  key: "paix",
  label: "Groupe Paix",
  i18nTitre: "planning.groupes.paix",
  couleur: PLANNING_COLORS.paix,
  colonnes: [col("presidence", "presidence", 1), col("musiciens", "musiciens", 2), col("orateur", "orateur", 3), col("theme", "theme", 4)],
}

export const GRILLE_BONTE: DefinitionGrille = {
  key: "bonte",
  label: "Groupe Bonté",
  i18nTitre: "planning.groupes.bonte",
  couleur: PLANNING_COLORS.bonte,
  colonnes: [col("presidence", "presidence", 1), col("musiciens", "musiciens", 2), col("orateur", "orateur", 3), col("theme", "theme", 4)],
}

export const GRILLE_FIDELITE: DefinitionGrille = {
  key: "fidelite",
  label: "Groupe Fidélité",
  i18nTitre: "planning.groupes.fidelite",
  couleur: PLANNING_COLORS.fidelite,
  colonnes: [col("presidence", "presidence", 1), col("orateur", "orateur", 2), col("theme", "theme", 3), col("pianiste", "pianiste", 4)],
}

export const GRILLE_FIDELITE_MUSICIENS: DefinitionGrille = {
  key: "fideliteMusiciens",
  label: "Groupe Fidélité musiciens",
  i18nTitre: "planning.groupes.fidelite",
  i18nSousTitre: "planning.groupes.planningMusiciens",
  couleur: PLANNING_COLORS.fidelite,
  colonnes: [col("presidence", "presidence", 1), col("piano", "piano", 2), col("guitare", "guitare", 3), col("batterie", "batterie", 4)],
}

// Prépa. Table du Seigneur + petit déjeuner : deux cases par dimanche.
export const GRILLE_TABLE: DefinitionGrille = {
  key: "table",
  label: "Prépa. Table",
  i18nTitre: "planning.pages.table",
  couleur: PLANNING_COLORS.table,
  colonnes: [col("equipe", "equipe", 1), col("petitDej", "petitDej", 2)],
}

// EDD : une grille par classe, cinq colonnes (cf. `fetchEDD`).
export const CLES_EDD: Record<(typeof EDD_CLASSES)[number], string> = { "中班": "eddZhongban", "大班": "eddDaban", "高班": "eddGaoban" }

export const GRILLES_EDD: DefinitionGrille[] = EDD_CLASSES.map((classe) => ({
  key: CLES_EDD[classe],
  label: `EDD ${classe}`,
  i18nTitre: "planning.pages.edd",
  sousTitre: classe,
  couleur: PLANNING_COLORS.edd,
  colonnes: [col("presidence", "presidence", 1), col("suppleant", "suppleant", 2), col("piano", "piano", 3), col("cajon", "cajon", 4), col("guitare", "guitare", 5)],
}))

// Campus : une grille par moment (matin, soir), la répétition en texte libre
// (« JJ/MM/AAAA HH:MM Salle », la graphie du Sheet lue par `fetchCampus`).
const COLONNES_CAMPUS: ColonneGrille[] = [
  col("presidence", "presidence", 1), col("choriste1", "choriste1", 2), col("choriste2", "choriste2", 3),
  col("piano", "piano", 4), col("guitare", "guitare", 5), col("batterie", "batterie", 6),
  col("sono", "sono", 7), col("ppt", "ppt", 8),
  col("chant1", "chant1", 9), col("chant2", "chant2", 10), col("chant3", "chant3", 11), col("chant4", "chant4", 12),
  col("repetition", "repetition", 13),
]

export const GRILLE_CAMPUS_MATIN: DefinitionGrille = {
  key: "campusMatin",
  label: "Campus matin",
  i18nTitre: "planning.pages.campus",
  i18nSousTitre: "planning.campus.morning",
  couleur: PLANNING_COLORS.campus,
  colonnes: COLONNES_CAMPUS,
}

export const GRILLE_CAMPUS_SOIR: DefinitionGrille = {
  key: "campusSoir",
  label: "Campus soir",
  i18nTitre: "planning.pages.campus",
  i18nSousTitre: "planning.campus.evening",
  couleur: PLANNING_COLORS.campus,
  colonnes: COLONNES_CAMPUS,
}

/** Toutes les grilles, dans l'ordre des onglets du planning. */
export const GRILLES: DefinitionGrille[] = [
  GRILLE_CULTE, GRILLE_TABLE, ...GRILLES_EDD, GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR,
  GRILLE_INTERGROUPE, GRILLE_INTERFRANCO, GRILLE_PAIX, GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS, GRILLE_BONTE,
]

export function grilleDe(key: string): DefinitionGrille | undefined {
  return GRILLES.find((g) => g.key === key)
}

/** Une ligne affichée : la ligne au format du lecteur du Sheet, et son état de publication. */
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

/** Les lignes d'un planning sans publication par trimestre (Intergroupe, Table…). */
export function lignesSimples(rows: string[][]): LigneGrille[] {
  return rows.map((row) => ({ row, nonPublie: false }))
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
