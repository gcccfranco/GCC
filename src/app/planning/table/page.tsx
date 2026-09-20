"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { DEJEUNER_FALLBACK } from "@/lib/planning/data"
import { fetchTable } from "@/lib/planning/sheets"
import { GRILLE_TABLE, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Prépa. Table du Seigneur + petit déjeuner : une grille à deux cases par
// dimanche, remplie dans l'app depuis le 19/09/2026 (lot 17, G6) par qui en a
// le droit ; les dimanches non écrits viennent encore du Sheet. Les données de
// secours (équipes de 2026) restent le repli si le Sheet est injoignable.

const REPLI = DEJEUNER_FALLBACK.map((r) => [r[0], r[1], ""])

function TablePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet<string[]>(fetchTable, REPLI)
  const [tri, setTri] = useState(getCurrentTri())
  const peutModifier = canEditPlanning(user, profile, GRILLE_TABLE.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(GRILLE_TABLE.key, peutModifier)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.table")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={GRILLE_TABLE.couleur} />

      <PlanningGrille
        definition={GRILLE_TABLE}
        periode={`${tri} ${new Date().getFullYear()}`}
        lignes={lignesSimples(filterByTri(rows, tri))}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? TablePage : AncienTableau
