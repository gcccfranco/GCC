"use client"

import { useTranslation } from "react-i18next"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { useSheet } from "@/lib/planning/useSheet"
import { fetchIntergroupe } from "@/lib/planning/sheets"
import { PLANNING_COLORS } from "@/lib/serviceColors"

const COLOR = PLANNING_COLORS.intergroupe

export default function IntergroupePage() {
  const { t } = useTranslation()
  // Pas de fallback compilé : une liste vide est un état valide (aucun
  // intergroupe planifié), on n'affiche donc pas de bannière « périmé ».
  const { rows, status } = useSheet<string[]>(fetchIntergroupe, [])
  const COLS = [t("planning.roles.date"), t("planning.roles.presidence"), t("planning.roles.choriste1"), t("planning.roles.choriste2"), t("planning.roles.choriste3"), t("planning.roles.piano"), t("planning.roles.guitare"), t("planning.roles.cajonBatt"), t("planning.roles.sonoLive"), t("planning.roles.ppt"), t("planning.roles.orateur"), t("planning.roles.trad")]

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.intergroupe")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <PlanningTable cols={COLS} rows={rows} color={COLOR} minWidth={760} groupBy="year" />
    </div>
  )
}
