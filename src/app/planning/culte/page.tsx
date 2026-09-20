"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { getCurrentTri, getTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { fetchCulte } from "@/lib/planning/sheets"
import { GRILLE_CULTE, lignesPubliees } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import {
  PUBLISHABLE_PLANNINGS,
  TRI_ORDER,
  canPublishPlanning,
  getPublishedQuarters,
  triVisibilities,
} from "@/lib/planning/releases"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Lot 17 / G1 : la grille s'affiche **trimestre par trimestre** (Timothée,
// 18/09/2026 : « L'affichage du planning doit être affiché trimestre par
// trimestre »), comme le Sheet et comme les sept autres onglets du planning.
// La publication par trimestre ne bouge pas : elle décide des pilules visibles
// ET s'applique ligne par ligne (lignesPubliees, D7), les deux — c'est cette
// règle-là que la contre-épreuve a prouvée.
//
// G5 (D4, 19/09/2026) : plus de données de secours de 2026 — grille vide =
// « Planning à venir » et la bannière d'indisponibilité, pas des noms périmés.

const CULTE = PUBLISHABLE_PLANNINGS.find(p => p.key === "culte")!

function CultePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet<string[]>(fetchCulte, [])
  const [tri, setTri] = useState(getCurrentTri())
  const [published, setPublished] = useState<string[]>([])

  const peutModifier = canEditPlanning(user, profile, "culte")
  const { datesDansLApp, nomsDesComptes } = useGrilleApp("culte", peutModifier)

  useEffect(() => {
    getPublishedQuarters("culte", new Date().getFullYear()).then(setPublished)
  }, [])

  const canPublish = canPublishPlanning(CULTE, isAdminUser(user), profile?.notify ?? [])
  // Pilules visibles : un trimestre futur non publié est masqué aux membres,
  // marqué d'un cadenas pour les publieurs.
  const vis = triVisibilities(TRI_ORDER, published, getCurrentTri(), canPublish)
  const visibleTris = vis.filter(v => v.visible).map(v => v.tri)
  const unpublishedTris = vis.filter(v => v.unpublished).map(v => v.tri)
  const effTri = visibleTris.includes(tri) ? tri : getCurrentTri()
  // `lignesPubliees` rend des LigneGrille (ligne + marque « non publié ») :
  // on filtre sur leur date, pas avec `filterByTri` qui attend des tableaux.
  const lignes = lignesPubliees(rows, published, getCurrentTri(), new Date().getFullYear(), canPublish)
    .filter((l) => getTri(l.row[0]) === effTri)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.culte")}</h2>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />

      <FilterButtons
        options={visibleTris}
        active={effTri}
        onChange={setTri}
        color={GRILLE_CULTE.couleur}
        unpublished={unpublishedTris}
      />

      <PlanningGrille
        definition={GRILLE_CULTE}
        periode={`${effTri} ${new Date().getFullYear()}`}
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

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? CultePage : AncienTableau
