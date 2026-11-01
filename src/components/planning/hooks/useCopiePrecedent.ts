import { useState } from "react"
import type { TFunction } from "i18next"
import type { DefinitionGrille } from "@/lib/planning/grilles"
import { fdShort } from "@/lib/planning/utils"
import { colonnesACopier, lignePrecedente, planCopie, type CaseGeste } from "@/lib/planning/gestes"
import type { DemandeCopie } from "../FenetreCopie"

interface Entree {
  definition: DefinitionGrille
  mode: "lecture" | "edition"
  datesDuPlanning: string[]
  lireCase: (date: string, cle: string) => string
  verrou: (date: string, cle: string) => boolean
  appliquer: (cases: CaseGeste[], texte: string | null, notes?: string[], sansCompte?: string[]) => Promise<CaseGeste[]>
  t: TFunction
}

/** « Copier le dimanche précédent » (PG13 à PG15) : le dimanche dont l'aperçu est posé, la fenêtre, et le geste. */
export function useCopiePrecedent({ definition, mode, datesDuPlanning, lireCase, verrou, appliquer, t }: Entree) {
  const [apercu, setApercu] = useState<string | null>(null)
  const [fenetreCopie, setFenetreCopie] = useState<DemandeCopie | null>(null)

  /** Copier le dimanche précédent sur `date` (PG10 à PG16) ; null : pas en modification. Un planning
   *  hebdomadaire dont le J−7 manque garde sa source (vide, PG10) ; à dates choisies sans date
   *  précédente, `source` est null. Dans les deux cas rien n'est offert (PG16). */
  const copiePour = (date: string) => {
    if (mode !== "edition") return null
    const source = lignePrecedente(definition, datesDuPlanning, date)
      ?? (definition.dates === "dimanches" ? new Date(new Date(`${date}T12:00:00Z`).getTime() - 7 * 86_400_000).toISOString().slice(0, 10) : null)
    if (!source) return { source: null, plan: { vides: [], remplace: [], verrouillees: 0 }, offert: false }
    const plan = planCopie({ colonnes: colonnesACopier(definition), source, cible: date, lire: lireCase, verrou })
    return { source, plan, offert: plan.vides.length + plan.remplace.length > 0 }
  }
  /** L'aide de l'infobulle et du menu : ce qui sera copié, et ce qui ne l'est pas (PG14, PG15). */
  const colonnesExclues = () =>
    definition.colonnes.filter((x) => x.cle === "orateur" || x.cle === "theme").map((x) => t(x.i18n)).join(", ")
  const aideCopie = (c: NonNullable<ReturnType<typeof copiePour>>) => {
    if (!c.source) return undefined
    const d = fdShort(c.source)
    if (!c.offert) return t("planning.gestes.rienACopier", { date: d })
    const base = c.plan.vides.length
      ? t("planning.gestes.copierAide", { date: d, count: c.plan.vides.length })
      : t("planning.gestes.copierAideRemplacer", { date: d, count: c.plan.remplace.length })
    const exclues = colonnesExclues()
    return exclues ? `${base} ${t("planning.gestes.exclues", { colonnes: exclues })}` : base
  }
  /** L'infobulle de la pastille (PG14) : « Les N cases vides reprennent le 17/1. … Un nom déjà posé reste. » */
  const infobulleCopie = (c: NonNullable<ReturnType<typeof copiePour>>) => {
    if (!c.source) return ""
    const d = fdShort(c.source)
    const exclues = colonnesExclues()
    return [
      c.plan.vides.length
        ? t("planning.gestes.copierInfobulle", { date: d, count: c.plan.vides.length })
        : t("planning.gestes.copierAideRemplacer", { date: d, count: c.plan.remplace.length }),
      exclues && t("planning.gestes.exclues", { colonnes: exclues }),
      c.plan.vides.length && t("planning.gestes.nomPoseReste"),
    ].filter(Boolean).join(" ")
  }

  function faireCopie(source: string, cible: string, cases: CaseGeste[], verrouillees: number) {
    void appliquer(
      cases,
      t("planning.gestes.copie", { cible: fdShort(cible), source: fdShort(source), count: cases.length }),
      verrouillees ? [t("planning.gestes.verrouillees", { count: verrouillees })] : [],
    )
  }
  /** Le geste (PG12, PG13) : sans fenêtre quand il ne tombe que dans des cases vides. */
  function copier(date: string) {
    const c = copiePour(date)
    setApercu(null)
    if (!c?.offert || !c.source) return
    if (c.plan.remplace.length) setFenetreCopie({ source: c.source, cible: date, vides: c.plan.vides, remplace: c.plan.remplace, verrouillees: c.plan.verrouillees })
    else faireCopie(c.source, date, c.plan.vides, c.plan.verrouillees)
  }
  function choixDeLaFenetre(choix: "vides" | "tout" | null) {
    const d = fenetreCopie
    setFenetreCopie(null)
    if (!d || !choix) return
    faireCopie(d.source, d.cible, choix === "tout" ? [...d.vides, ...d.remplace] : d.vides, d.verrouillees)
  }

  return { apercu, setApercu, fenetreCopie, copiePour, aideCopie, infobulleCopie, copier, choixDeLaFenetre }
}
