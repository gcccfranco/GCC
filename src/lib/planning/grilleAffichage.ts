// Fonctions pures de la grille de planning (lot N, tranche N6a, docs/spec-nettoyage-code.md) :
// sorties de `PlanningGrille.tsx`, sans état ni ref React. Les valeurs lues dans le composant
// (couleur, plage, ensemble des dimanches semés, comptes connus) arrivent en paramètres.

import type { CSSProperties } from "react"
import type { TFunction } from "i18next"
import { colonneDePersonnes } from "./choisir"
import { PREMIERE_ANNEE_APP, type ColonneGrille, type DefinitionGrille } from "./grilles"
import { phraseDuChangement, type ChangementGrille } from "./historique"
import { normalizeName, splitNames } from "./names"
import { fdLongL, getAnnee } from "./utils"
import type { CaseGeste } from "./gestes"

/** Pourquoi le serveur a refusé une écriture : hors ligne, sinon un droit retiré en cours de saisie (D6). */
export function motifDuRefus(): "horsLigne" | "droitRetire" {
  return typeof navigator !== "undefined" && navigator.onLine === false ? "horsLigne" : "droitRetire"
}

/** Faut-il recopier la ligne du Sheet (« semer ») avant la première écriture d'un dimanche ?
 *  Non dès l'année de l'app, pour un dimanche déjà dans l'app, ou déjà semé pendant la séance. */
export function doitSemer(date: string, datesDansLApp: readonly string[], semes: ReadonlySet<string>): boolean {
  return !(getAnnee(date) >= PREMIERE_ANNEE_APP || datesDansLApp.includes(date) || semes.has(date))
}

/** La colonne d'une grille par sa clé. */
export function colonneDe(definition: Pick<DefinitionGrille, "colonnes">, cle: string): ColonneGrille | undefined {
  return definition.colonnes.find((x) => x.cle === cle)
}

/** Les noms sans compte parmi les cases écrites (PG30) : aucun `planningName` ne leur correspond.
 *  `connus` = les noms de planning des comptes, normalisés. */
export function sansCompteDe(cases: CaseGeste[], connus: ReadonlySet<string>) {
  const noms: string[] = []
  const cles: string[] = []
  for (const c of cases) {
    if (!colonneDePersonnes(c.cle)) continue
    const inconnus = splitNames(c.apres).filter((n) => !connus.has(normalizeName(n)))
    if (!inconnus.length) continue
    cles.push(`${c.date}|${c.cle}`)
    for (const n of inconnus) if (!noms.includes(n)) noms.push(n)
  }
  return { noms, cles }
}

/** La phrase d'une entrée de l'historique d'une grille. */
export function phraseHistorique(
  t: TFunction,
  langue: string,
  definition: Pick<DefinitionGrille, "colonnes">,
  auteurNom: string,
  ch: ChangementGrille,
) {
  if (ch.kind === "import") return t("planning.grille.importe", { auteur: auteurNom, count: ch.count })
  if (ch.kind === "dimanche") return t(`planning.grille.${phraseDuChangement(ch)}`, { auteur: auteurNom, date: fdLongL(ch.date, langue) })
  const col = colonneDe(definition, ch.colonne)
  return t(`planning.grille.${phraseDuChangement(ch)}`, {
    auteur: auteurNom,
    avant: ch.from,
    apres: ch.to,
    colonne: col ? t(col.i18n) : ch.colonne,
    date: fdLongL(ch.date, langue),
  })
}

/** Le trait de la plage, posé en ombre intérieure sur ses seules arêtes ; `dansGeste` : la case vient du dernier geste. */
export function styleCase(
  plage: { r0: number; r1: number; c0: number; c1: number } | null,
  couleur: string,
  dansGeste: boolean,
  i: number,
  j: number,
): CSSProperties | undefined {
  const fond = dansGeste ? `${couleur}22` : undefined
  if (!plage || i < plage.r0 || i > plage.r1 || j < plage.c0 || j > plage.c1) return fond ? { background: fond } : undefined
  const bords = [
    i === plage.r0 && `inset 0 2px 0 0 ${couleur}`,
    i === plage.r1 && `inset 0 -2px 0 0 ${couleur}`,
    j === plage.c0 && `inset 2px 0 0 0 ${couleur}`,
    j === plage.c1 && `inset -2px 0 0 0 ${couleur}`,
  ].filter(Boolean).join(", ")
  return { background: fond ?? `${couleur}12`, boxShadow: bords }
}
