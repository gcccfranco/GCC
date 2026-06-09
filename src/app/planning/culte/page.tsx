"use client"

import { useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { filterByTri, getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { CULTE_FALLBACK } from "@/lib/planning/data"
import { fetchCulte } from "@/lib/planning/sheets"

const COLS = ["Date","Présidence","Choriste 1","Choriste 2","Piano","Guitare","Batterie","Sono","PPT","Orateur","Trad."]
const COLOR = "#2d5a65"

export default function CultePage() {
  const [rows, setRows] = useState(CULTE_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCulte().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  const filtered = filterByTri(rows, tri)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Culte Franco</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={COLOR} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        Dimanche de la semaine courante
      </div>

      <PlanningTable
        cols={COLS}
        rows={filtered}
        color={COLOR}
        minWidth={680}
        dateBadge={(row, all) =>
          isFirstSundayOfMonth(row[0], all) ? (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 mt-0.5">
              Sainte Cène
            </span>
          ) : null
        }
      />
    </div>
  )
}
