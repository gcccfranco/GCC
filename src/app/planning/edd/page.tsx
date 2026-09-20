"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { getCurrentEddPeriode, EDD_PERIODES, EDD_CLASSES } from "@/lib/planning/utils"
import { EDD_FALLBACK } from "@/lib/planning/data"
import { fetchEDD } from "@/lib/planning/sheets"
import { GRILLES_EDD, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning } from "@/lib/access"
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
  const rows = eddData[periode]?.classes?.[classe] ?? []
  const peutModifier = canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(definition.key, peutModifier)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.edd")}</h2>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

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
        periode={`${t(`planning.edd.${PERIODE_KEYS[EDD_PERIODES.indexOf(periode)]}`)} ${new Date().getFullYear()}`}
        lignes={lignesSimples(rows)}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? EddPage : AncienTableau
