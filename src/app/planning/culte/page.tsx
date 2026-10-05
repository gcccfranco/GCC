"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { BoutonPublication } from "@/components/planning/BoutonPublication"
import { getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { useSheet } from "@/lib/planning/useSheet"
import { fetchCulte } from "@/lib/planning/sheets"
import { GRILLE_CULTE, dimanchesDe, vueTrimestrielle } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
} from "@/lib/planning/releases"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useGestionPlanning } from "@/lib/planning/gestion"
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
//
// Lot U2 : sélecteur d'année ; l'année suivante est un brouillon, trimestre par
// trimestre, jusqu'à « Publier le T… » (vueTrimestrielle).

const CULTE = PUBLISHABLE_PLANNINGS.find(p => p.key === "culte")!

function CultePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows, status } = useSheet<string[]>(fetchCulte, [])
  const [tri, setTri] = useState(getCurrentTri())
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const [published, setPublished] = useState<Record<number, string[]>>({})

  const gestion = useGestionPlanning()
  const peutModifier = gestion && canEditPlanning(user, profile, "culte")
  const { datesDansLApp, comptes } = useGrilleApp("culte", peutModifier)

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all([year, year + 1].map(y => getPublishedQuarters("culte", y).then(q => [y, q] as const)))
      .then(entries => setPublished(Object.fromEntries(entries)))
  }, [])

  const canPublish = gestion && canPublishPlanning(CULTE, isAdminUser(user), profile?.notify ?? [])
  // Q4 (lot U2) : le brouillon se montre à qui remplit ou publie ce planning, et aux admins.
  const voitBrouillon = canPublish || peutModifier
  const {
    annees, annee: effAnnee, visibles: visibleTris, nonPublies: unpublishedTris, tri: effTri, lignes, aVenir, brouillon,
  } = vueTrimestrielle({
    definition: GRILLE_CULTE, rows, anneeCourante, triCourant: getCurrentTri(), annee, tri,
    publies: (y) => published[y] ?? [], voitBrouillon,
  })

  function changerAnnee(a: number) {
    setAnnee(a)
    setTri(a === anneeCourante ? getCurrentTri() : "T1")
  }

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-foreground">{t("planning.pages.culte")}</h2>
          <AnneeSelecteur annees={annees} annee={effAnnee} onChange={changerAnnee} />
        </div>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
        {canPublish && effTri && aVenir && (
          <BoutonPublication
            planningKey={CULTE.key}
            planningLabel={CULTE.label}
            annee={effAnnee}
            tri={effTri}
            publie={!unpublishedTris.includes(effTri)}
            onChange={(p) => setPublished((prev) => ({ ...prev, [effAnnee]: p }))}
          />
        )}
      </div>

      <StaleBanner show={status === "stale"} />
      <BandeauAnnee annee={effAnnee} brouillon={brouillon} dimanches={brouillon ? dimanchesDe(effAnnee).length : null} />

      <FilterButtons
        options={visibleTris}
        active={effTri}
        onChange={setTri}
        color={GRILLE_CULTE.couleur}
        unpublished={unpublishedTris}
      />

      <PlanningGrille
        definition={GRILLE_CULTE}
        periode={`${effTri} ${effAnnee}`}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        // P7 : les responsables du planning et les admins exportent (Q13).
        exporter={voitBrouillon ? { annee: effAnnee, rang: Number(effTri.slice(1)) || 1, tout: isAdminUser(user) } : undefined}
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
