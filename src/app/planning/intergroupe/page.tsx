"use client"

import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { useSheet } from "@/lib/planning/useSheet"
import { fetchIntergroupe } from "@/lib/planning/sheets"
import { GRILLE_INTERGROUPE, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Une séance par trimestre, pas de publication par trimestre : toute l'année
// s'affiche. Rempli dans l'app depuis le 19/09/2026 (lot 17, G6) par qui en a
// le droit (canEditPlanning), le Sheet restant la source des dates non écrites.

function IntergroupePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  // Pas de fallback compilé : une liste vide est un état valide (aucun
  // intergroupe planifié), on n'affiche donc pas de bannière « périmé ».
  const { rows, status } = useSheet<string[]>(fetchIntergroupe, [])
  const peutModifier = canEditPlanning(user, profile, GRILLE_INTERGROUPE.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(GRILLE_INTERGROUPE.key, peutModifier)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.intergroupe")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <PlanningGrille
        definition={GRILLE_INTERGROUPE}
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
export default BACK_OFFICE ? IntergroupePage : AncienTableau
