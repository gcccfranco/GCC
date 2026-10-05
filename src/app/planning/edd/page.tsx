"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { getCurrentEddPeriode, EDD_PERIODES, EDD_CLASSES } from "@/lib/planning/utils"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { EDD_FALLBACK } from "@/lib/planning/data"
import { fetchEDD, periodeEdd } from "@/lib/planning/sheets"
import { GRILLES_EDD, anneeRemplie, anneesDuPlanning, dimanchesDe, lignesDeLAnnee, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { EddDataStructure, EddPeriode, EddClasse } from "@/lib/planning/utils"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// EDD : une grille par classe (中班, 大班, 高班), cinq cases par dimanche,
// remplie dans l'app depuis le 19/09/2026 (lot 17, G6) par qui a le droit sur
// la classe ; la période se choisit comme avant.

const COLOR = PLANNING_COLORS.edd
const PERIODE_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

function EddPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const [eddData, setEddData] = useState<EddDataStructure>(EDD_FALLBACK)
  const [periode, setPeriode] = useState<EddPeriode>(getCurrentEddPeriode())
  const [classe, setClasse] = useState<EddClasse>("中班")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEDD().then(d => setEddData(d)).finally(() => setLoading(false))
  }, [])

  const definition = GRILLES_EDD.find((g) => g.sousTitre === classe) ?? GRILLES_EDD[0]
  const peutModifier = canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(definition.key, peutModifier)
  // Lot U2 : `fetchEDD` range par période sans regarder l'année ; la page
  // reprend toutes les lignes de la classe et garde l'année choisie.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const toutes = Object.values(eddData).flatMap((p) => p.classes?.[classe] ?? [])
  const annees = anneesDuPlanning(anneeCourante, peutModifier || anneeRemplie(toutes, anneeCourante + 1))
  const effAnnee = annees.includes(annee) ? annee : anneeCourante
  const rows = lignesDeLAnnee(definition, effAnnee, toutes).filter((r) => periodeEdd(r[0]) === periode)
  const suivante = effAnnee > anneeCourante && peutModifier

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-foreground">{t("planning.pages.edd")}</h2>
          <AnneeSelecteur
            annees={annees}
            annee={effAnnee}
            onChange={(a) => { setAnnee(a); setPeriode(a === anneeCourante ? getCurrentEddPeriode() : EDD_PERIODES[0]) }}
          />
        </div>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <BandeauAnnee annee={effAnnee} brouillon={false} dimanches={suivante ? dimanchesDe(effAnnee).length : null} />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {EDD_PERIODES.map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
              p === periode ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={p === periode ? { background: COLOR, borderColor: COLOR } : {}}
          >
            {t(`planning.edd.${PERIODE_KEYS[i]}`)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {EDD_CLASSES.map(c => (
          <button
            key={c}
            onClick={() => setClasse(c)}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-semibold text-center transition-all duration-150 cursor-pointer ${
              c === classe ? "border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={c === classe ? { background: `${COLOR}15`, borderColor: COLOR, color: COLOR } : {}}
          >
            {c}
          </button>
        ))}
      </div>

      <PlanningGrille
        key={definition.key}
        definition={definition}
        periode={`${t(`planning.edd.${PERIODE_KEYS[EDD_PERIODES.indexOf(periode)]}`)} ${effAnnee}`}
        lignes={lignesSimples(rows)}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
        exporter={peutModifier ? { annee: effAnnee, rang: EDD_PERIODES.indexOf(periode) + 1, tout: isAdminUser(user) } : undefined}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? EddPage : AncienTableau
