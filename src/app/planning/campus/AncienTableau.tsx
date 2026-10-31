"use client"

// Le tableau d'avant la grille (version de882b7 de cette page), servi tant que le
// back-office est coupé (lot 18, docs/spec-mise-en-ligne.md) : la grille du lot 17
// fait partie du back-office. Lit le Google Sheet seul.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CAMP_LOUANGE_FALLBACK, CAMP_ENT_FALLBACK } from "@/lib/planning/data"
import { fetchCampus } from "@/lib/planning/sheets"
import type { CampusSeance } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { CarteJourCampus, groupByDay } from "@/components/planning/CarteJourCampus"

const COLOR = PLANNING_COLORS.campus

type CampusSub = "louange" | "entrainement"

export function AncienTableau() {
  const { t } = useTranslation()
  const [louange, setLouange] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)
  const [entrainement, setEntrainement] = useState<CampusSeance[]>(CAMP_ENT_FALLBACK)
  const [sub, setSub] = useState<CampusSub>("louange")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampus().then(({ louange: l, entrainement: e }) => {
      if (l.length) setLouange(l)
      if (e.length) setEntrainement(e)
    }).finally(() => setLoading(false))
  }, [])

  const data = sub === "louange" ? louange : entrainement
  const { days, order } = groupByDay(data)

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.campus")}</h2>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <div className="flex gap-2">
        {(["louange","entrainement"] as CampusSub[]).map(s => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
              sub === s ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={sub === s ? { background: COLOR, borderColor: COLOR } : undefined}
          >
            {s === "louange" ? t("planning.campus.louange") : t("planning.campus.repetition")}
          </button>
        ))}
      </div>

      {order.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">{t("planning.campus.noSeance")}</div>
      )}

      {order.map(day => (
        <CarteJourCampus key={day} day={day} seances={days[day]} entrainement={sub === "entrainement"} />
      ))}
    </div>
  )
}
