"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { CULTE_FALLBACK } from "@/lib/planning/data"
import { fetchCulte } from "@/lib/planning/sheets"
import { fetchGrille } from "@/lib/planning/grille"
import { GRILLE_CULTE, lignesPubliees } from "@/lib/planning/grilles"
import { listProfiles, useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
} from "@/lib/planning/releases"

// Lot 17 / G1 : la grille continue remplace les quatre pilules de trimestre.
// La publication par trimestre, elle, ne bouge pas : elle s'applique ligne par
// ligne (lignesPubliees, D7) — sans quoi la grille continue révélerait le
// trimestre suivant à toute l'église.

const CULTE = PUBLISHABLE_PLANNINGS.find(p => p.key === "culte")!

export default function CultePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet(fetchCulte, CULTE_FALLBACK)
  const [published, setPublished] = useState<string[]>([])
  const [datesDansLApp, setDatesDansLApp] = useState<string[]>([])
  const [nomsDesComptes, setNomsDesComptes] = useState<string[]>([])

  const peutModifier = canEditPlanning(user, profile, "culte")

  useEffect(() => {
    getPublishedQuarters("culte", new Date().getFullYear()).then(setPublished)
    // Dimanches déjà écrits dans l'app : les autres viennent encore du Sheet,
    // et une première écriture doit les recopier (cf. `semer`).
    fetchGrille("culte").then(g => setDatesDansLApp(g.map(r => r[0])))
  }, [])

  useEffect(() => {
    // Noms des comptes pour l'autocomplétion : seulement pour qui remplit.
    if (!peutModifier) return
    listProfiles()
      .then(ps => setNomsDesComptes(ps.map(p => p.planningName).filter(Boolean)))
      .catch(() => { /* suggestions en moins, saisie libre inchangée */ })
  }, [peutModifier])

  const canPublish = canPublishPlanning(CULTE, isAdminUser(user), profile?.notify ?? [])
  const lignes = lignesPubliees(rows, published, getCurrentTri(), new Date().getFullYear(), canPublish)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.culte")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />

      <PlanningGrille
        definition={GRILLE_CULTE}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
        dateBadge={(row, all) =>
          isFirstSundayOfMonth(row[0], all) ? (
            <span className="inline-block text-xs font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 mt-0.5">
              {t("planning.sainteCene")}
            </span>
          ) : null
        }
      />
    </div>
  )
}
