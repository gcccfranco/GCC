// Cases vides d'un planning (lot U6, docs/spec-back-office.md, widget 4) — repris par
// le calendrier (U8). Module pur.
import { lignesDeLAnnee, type ColonneGrille, type DefinitionGrille } from "./grilles"
import { getAnnee } from "./utils"

export type CasesVides = { date: string; colonnes: ColonneGrille[] }

/** Les colonnes d'une ligne à remplir : ni optionnelles (Sainte cène, percussion), ni
 *  remplies ailleurs (petit déj). */
export function colonnesVides(def: DefinitionGrille, row: string[]): ColonneGrille[] {
  return def.colonnes.filter((c) => !c.optionnelle && !c.lectureSeule && !(row[c.index] ?? "").trim())
}

/**
 * Pour chaque date demandée qui a une ligne (`lignesDeLAnnee` : dès 2027, tout dimanche
 * d'un planning hebdomadaire en a une, vide ; un planning à dates choisies, seulement
 * ses dates posées ; avant, celles du Sheet), ses colonnes vides. Les dates sans case
 * vide sont omises.
 */
export function casesVides(def: DefinitionGrille, rows: string[][], dates: string[]): CasesVides[] {
  const parAnnee = new Map<number, Map<string, string[]>>()
  const ligne = (date: string) => {
    const annee = getAnnee(date)
    if (!parAnnee.has(annee)) parAnnee.set(annee, new Map(lignesDeLAnnee(def, annee, rows).map((r) => [r[0], r])))
    return parAnnee.get(annee)!.get(date)
  }
  return dates.flatMap((date) => {
    const row = ligne(date)
    const colonnes = row ? colonnesVides(def, row) : []
    return colonnes.length ? [{ date, colonnes }] : []
  })
}
