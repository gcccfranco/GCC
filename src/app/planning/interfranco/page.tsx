"use client"

import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { useSheet } from "@/lib/planning/useSheet"
import { fetchInterfranco } from "@/lib/planning/sheets"
import { GRILLE_INTERFRANCO, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Une séance par trimestre, pas de publication par trimestre : toute l'année
// s'affiche. Rempli dans l'app depuis le 19/09/2026 (lot 17, G6).

function InterfrancoPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet<string[]>(fetchInterfranco, [])
  const peutModifier = canEditPlanning(user, profile, GRILLE_INTERFRANCO.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(GRILLE_INTERFRANCO.key, peutModifier)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.interfranco")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <PlanningGrille
        definition={GRILLE_INTERFRANCO}
        periode={t("planning.grille.periodeAnnee", { annee: new Date().getFullYear() })}
        lignes={lignesSimples(rows)}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? InterfrancoPage : AncienTableau
