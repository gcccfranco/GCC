"use client"

import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { currentSundayStr, fdShort, getMois, moisName, filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { DEJEUNER_FALLBACK } from "@/lib/planning/data"
import { fetchDejeuner } from "@/lib/planning/sheets"
import { PLANNING_COLORS } from "@/lib/serviceColors"

const COLOR = PLANNING_COLORS.table

export default function TablePage() {
  const { t, i18n } = useTranslation()
  const { rows, status } = useSheet(fetchDejeuner, DEJEUNER_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())

  const sun = currentSundayStr()
  const filtered = filterByTri(rows, tri)

  let lastMonth = ""

  return (
    <div className="max-w-lg space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.table")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={COLOR} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        {t("planning.legendCurrentSunday")}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("planning.table.noData")}</td></tr>
            )}
            {filtered.map((row) => {
              const month = moisName(getMois(row[0]), i18n.language)
              const showSep = month !== lastMonth
              if (showSep) lastMonth = month
              const isThis = row[0] === sun

              return (
                <Fragment key={row[0]}>
                  {showSep && (
                    <tr style={{ background: `${COLOR}15` }}>
                      <td colSpan={2} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLOR }}>
                        {month}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-border transition-colors ${!isThis ? "hover:bg-secondary/50" : ""}`}
                    style={isThis ? { background: `${COLOR}1a` } : undefined}
                  >
                    <td className="px-3 py-2.5 font-semibold w-16 align-top pt-3" style={{ color: COLOR }}>
                      {isThis ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5" style={{ background: COLOR }}>{t("planning.table.thisWeek")}</span>
                      ) : fdShort(row[0])}
                    </td>
                    <td className="px-3 py-2.5 text-foreground leading-relaxed">{row[1] || "—"}</td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
