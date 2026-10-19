// Prévenir des changements d'un planning publié (lot 3, docs/spec-planning-gestes.md, PG33 à PG47).
//
// Module PUR : la grille, la feuille « Prévenir des changements » et la route serveur
// /api/planning/changements s'en servent des deux côtés. L'« état annoncé » est ce que les
// personnes ont déjà été prévenues d'avoir (planningReleases/{clé}_{année}.annonces.{T}) : une
// case a changé quand sa valeur affichée en diffère.

import type { DefinitionGrille } from "./grilles"
import { colonneDePersonnes } from "./choisir"
import { normalizeName, splitNames } from "./names"
import { getAnnee, getTri } from "./utils"

/** Ce qui a été annoncé d'un trimestre : les cases non vides (`AAAA-MM-JJ|clé` → valeur). */
export type EtatAnnonce = {
  cases: Record<string, string>
  /** Date de la dernière écriture de l'état, et son auteur (uid). */
  le?: string
  par?: string
  /** Date de la publication (posée seulement après « Publier le T… », PG37 a). */
  publieLe?: string
}

/** Une case changée depuis l'état annoncé. */
export type ChangementAnnonce = { date: string; cle: string; avant: string; apres: string }

/** Une valeur de case dans l'état annoncé : tronquée (client et serveur pareil), jamais rejetée. */
export const MAX_VALEUR = 200
export const borne = (v: string) => v.slice(0, MAX_VALEUR)

export const cleDeCase = (date: string, cle: string) => `${date}|${cle}`

const MS_JOUR = 86_400_000

/** Le dimanche en cours : le premier dimanche égal ou postérieur à `jour` (AAAA-MM-JJ). */
export function premierDimancheDepuis(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`)
  const reste = (7 - d.getUTCDay()) % 7
  return new Date(d.getTime() + reste * MS_JOUR).toISOString().slice(0, 10)
}

/**
 * Les cases d'un trimestre telles que la grille les affiche (PG37, PG38) : seulement les non vides,
 * sans colonne en lecture seule ni présidence imposée (Interfranco, Intergroupe).
 */
export function casesDuTrimestre(
  definition: DefinitionGrille,
  lignes: readonly (readonly string[])[],
  speciaux: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of lignes) {
    for (const c of definition.colonnes) {
      if (c.lectureSeule || (c.cle === "presidence" && speciaux[row[0]])) continue
      const v = borne((row[c.index] ?? "").trim())
      if (v) out[cleDeCase(row[0], c.cle)] = v
    }
  }
  return out
}

/**
 * Les cases changées (PG38) : valeur affichée différente de l'état annoncé, pour un dimanche à partir
 * du dimanche en cours, et seulement si la case est écrite dans l'app (`ecrites`). Pas d'état = rien.
 */
export function changementsDepuis(
  etat: EtatAnnonce | null | undefined,
  cases: Readonly<Record<string, string>>,
  ecrites: ReadonlySet<string>,
  dimancheEnCours: string,
): ChangementAnnonce[] {
  if (!etat) return []
  const cles = new Set([...Object.keys(etat.cases), ...Object.keys(cases)])
  const out: ChangementAnnonce[] = []
  for (const k of cles) {
    const [date, cle] = k.split("|")
    if (date < dimancheEnCours || !ecrites.has(k)) continue
    const avant = etat.cases[k] ?? ""
    const apres = cases[k] ?? ""
    if (avant !== apres) out.push({ date, cle, avant, apres })
  }
  return out.sort((a, b) => (a.date === b.date ? a.cle.localeCompare(b.cle) : a.date.localeCompare(b.date)))
}

export const datesDesChangements = (chs: readonly ChangementAnnonce[]): string[] => [...new Set(chs.map((c) => c.date))].sort()

export type PersonneTouchee = {
  nom: string
  /** Un compte lui correspond-il ? Sinon : « à prévenir toi-même ». */
  compte: boolean
  motifs: { sens: "ajout" | "retrait"; date: string; cle: string }[]
}

/**
 * Qui est touché (PG42) : un nom présent après et pas avant est ajouté, l'inverse est retiré. Une
 * personne n'apparaît qu'une fois, avec toutes ses cases. Les colonnes de texte libre (Thème) ne
 * touchent personne.
 */
export function personnesTouchees(chs: readonly ChangementAnnonce[], aUnCompte: (nom: string) => boolean): PersonneTouchee[] {
  const parNom = new Map<string, PersonneTouchee>()
  const noter = (nom: string, sens: "ajout" | "retrait", c: ChangementAnnonce) => {
    const k = normalizeName(nom)
    let p = parNom.get(k)
    if (!p) { p = { nom, compte: aUnCompte(nom), motifs: [] }; parNom.set(k, p) }
    p.motifs.push({ sens, date: c.date, cle: c.cle })
  }
  for (const c of chs) {
    if (!colonneDePersonnes(c.cle)) continue
    const avant = splitNames(c.avant)
    const apres = splitNames(c.apres)
    const dans = (liste: string[], nom: string) => liste.some((n) => normalizeName(n) === normalizeName(nom))
    for (const n of apres) if (!dans(avant, n)) noter(n, "ajout", c)
    for (const n of avant) if (!dans(apres, n)) noter(n, "retrait", c)
  }
  return [...parNom.values()]
}

/** Les cases de l'état annoncé après ces changements : les valeurs « après », une case vidée disparaît (PG36). */
export function etatApres(etat: EtatAnnonce | null | undefined, chs: readonly ChangementAnnonce[]): Record<string, string> {
  const cases = { ...(etat?.cases ?? {}) }
  for (const c of chs) {
    if (c.apres) cases[cleDeCase(c.date, c.cle)] = c.apres
    else delete cases[cleDeCase(c.date, c.cle)]
  }
  return cases
}

/**
 * Ce que le serveur vérifie avant d'envoyer ou d'ignorer (PG45) : chaque date est dans le trimestre
 * et à partir du dimanche en cours, « avant » égale l'état annoncé, « après » égale le document du
 * dimanche (`dimanches` : date → clé → valeur). Un seul écart refuse tout.
 */
export function verifierChangements(
  etat: EtatAnnonce | null | undefined,
  dimanches: Readonly<Record<string, Readonly<Record<string, string>>>>,
  chs: readonly ChangementAnnonce[],
  dimancheEnCours: string,
  trimestre: { annee: number; tri: string },
  colonnes: ReadonlySet<string>,
): { ok: true } | { ok: false; raison: string } {
  if (!chs.length) return { ok: false, raison: "aucun changement" }
  // Un trimestre jamais annoncé (brouillon, ou pas encore amorcé) n'a rien à prévenir (PG34).
  if (!etat) return { ok: false, raison: "pas d'état annoncé" }
  for (const c of chs) {
    // Une colonne de la grille, hors lecture seule (modifiePar, etc.) : sinon n'importe quel champ du document passerait.
    if (!colonnes.has(c.cle)) return { ok: false, raison: "colonne hors grille" }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || getAnnee(c.date) !== trimestre.annee || getTri(c.date) !== trimestre.tri) return { ok: false, raison: "hors du trimestre" }
    if (c.date < dimancheEnCours) return { ok: false, raison: "dimanche passé" }
    if ((etat?.cases[cleDeCase(c.date, c.cle)] ?? "") !== c.avant) return { ok: false, raison: "avant différent de l'état annoncé" }
    // Seule une case écrite dans l'app (présente dans le document) peut avoir changé (PG38).
    if (!(c.cle in (dimanches[c.date] ?? {}))) return { ok: false, raison: "case non écrite dans l'app" }
    if (borne(dimanches[c.date][c.cle] ?? "") !== c.apres) return { ok: false, raison: "après différent du planning" }
    if (c.avant === c.apres) return { ok: false, raison: "case inchangée" }
  }
  return { ok: true }
}

/** Le plafond de cases d'une référence : un trimestre en a une centaine ; l'état tient dans un document. */
export const MAX_CASES_REFERENCE = 600

/**
 * Ce que le serveur vérifie d'une référence envoyée par la grille : des cases du trimestre seulement, et,
 * quand le document du dimanche porte la case, la même valeur. Les valeurs du Sheet (2026) ne se vérifient pas.
 */
export function verifierReference(
  cases: Readonly<Record<string, string>>,
  dimanches: Readonly<Record<string, Readonly<Record<string, string>>>>,
  trimestre: { annee: number; tri: string },
): { ok: true } | { ok: false; raison: string } {
  const entrees = Object.entries(cases)
  if (entrees.length > MAX_CASES_REFERENCE) return { ok: false, raison: "trop de cases" }
  for (const [k, v] of entrees) {
    if (!/^\d{4}-\d{2}-\d{2}\|[A-Za-z0-9]+$/.test(k) || typeof v !== "string") return { ok: false, raison: "clé invalide" }
    const [date, cle] = k.split("|")
    if (getAnnee(date) !== trimestre.annee || getTri(date) !== trimestre.tri) return { ok: false, raison: "hors du trimestre" }
    const doc = dimanches[date]
    if (doc && cle in doc && borne(doc[cle] ?? "") !== v) return { ok: false, raison: "différent du planning" }
  }
  return { ok: true }
}
