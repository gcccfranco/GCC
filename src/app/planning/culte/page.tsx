"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { filterByTri, getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { CULTE_FALLBACK } from "@/lib/planning/data"
import { fetchCulte } from "@/lib/planning/sheets"
import { useProfile } from "@/lib/firebase/users"
import { isAdminUser } from "@/lib/access"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
  triVisibilities,
  TRI_ORDER,
} from "@/lib/planning/releases"

const COLOR = PLANNING_COLORS.culte
const CULTE = PUBLISHABLE_PLANNINGS.find(p => p.key === "culte")!

export default function CultePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet(fetchCulte, CULTE_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())
  const [published, setPublished] = useState<string[]>([])
  const COLS = [t("planning.roles.date"), t("planning.roles.presidence"), t("planning.roles.choriste1"), t("planning.roles.choriste2"), t("planning.roles.piano"), t("planning.roles.guitare"), t("planning.roles.batterie"), t("planning.roles.sono"), t("planning.roles.ppt"), t("planning.roles.orateur"), t("planning.roles.trad")]

  useEffect(() => {
    getPublishedQuarters("culte", new Date().getFullYear()).then(setPublished)
  }, [])

  // Trimestres futurs non publiés : masqués aux membres, marqués pour les publieurs.
  const canPublish = canPublishPlanning(CULTE, isAdminUser(user), profile?.notify ?? [])
  const vis = triVisibilities(TRI_ORDER, published, getCurrentTri(), canPublish)
  const visibleTris = vis.filter(v => v.visible).map(v => v.tri)
  const unpublishedTris = vis.filter(v => v.unpublished).map(v => v.tri)
  const effTri = visibleTris.includes(tri) ? tri : getCurrentTri()

  const filtered = filterByTri(rows, effTri)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.culte")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />

      <FilterButtons options={visibleTris} active={effTri} onChange={setTri} color={COLOR} unpublished={unpublishedTris} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        {t("planning.legendCurrentSunday")}
      </div>

      <PlanningTable
        cols={COLS}
        rows={filtered}
        color={COLOR}
        minWidth={680}
        dateBadge={(row, all) =>
          isFirstSundayOfMonth(row[0], all) ? (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 mt-0.5">
              {t("planning.sainteCene")}
            </span>
          ) : null
        }
      />
    </div>
  )
}
