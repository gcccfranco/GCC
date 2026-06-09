"use client"

import { useEffect, useState } from "react"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { getCurrentEddPeriode, EDD_PERIODES, EDD_PERIODES_LABELS, EDD_CLASSES } from "@/lib/planning/utils"
import { EDD_FALLBACK } from "@/lib/planning/data"
import { fetchEDD } from "@/lib/planning/sheets"
import type { EddDataStructure, EddPeriode, EddClasse } from "@/lib/planning/utils"

const COLOR = "#3b6d11"

export default function EddPage() {
  const [eddData, setEddData] = useState<EddDataStructure>(EDD_FALLBACK)
  const [periode, setPeriode] = useState<EddPeriode>(getCurrentEddPeriode())
  const [classe, setClasse] = useState<EddClasse>("中班")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEDD().then(d => setEddData(d)).finally(() => setLoading(false))
  }, [])

  const rows = eddData[periode]?.classes?.[classe] ?? []

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">EDD — École du Dimanche</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
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
            {EDD_PERIODES_LABELS[i]}
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        Dimanche de la semaine courante
      </div>

      <PlanningTable
        cols={["Date","Présidence","Suppléant","Piano","Cajon","Guitare"]}
        rows={rows}
        color={COLOR}
        minWidth={480}
      />
    </div>
  )
}
