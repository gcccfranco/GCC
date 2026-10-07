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
import { OngletsRail } from "@/components/layout/Onglets"
import { BarreDeGrille, FiltreDeNom, compterCasesVides, ongletsDePeriode, useFiltreNom, useTrimestreEnLettres } from "@/components/planning/BarreDeGrille"
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
  const filtre = useFiltreNom()
  const trimestre = useTrimestreEnLettres()
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
      {/* Agencement v18 (A2, B6, B7) : la rangée de la grille, puis la grille. */}
      <BarreDeGrille
        titre={t("planning.pages.culte")}
        couleur={GRILLE_CULTE.couleur}
        detail={[t("planning.horaires.culte"), effTri && trimestre(effTri, effAnnee)].filter(Boolean).join(" · ")}
        sousTitreBO={[t("planning.pages.culte"), t("planning.horaires.culte"),
          t("planning.barre.casesVidesTrimestre", { count: compterCasesVides(GRILLE_CULTE, lignes) })].join(" · ")}
        chargement={status === "loading"}
      >
        <AnneeSelecteur annees={annees} annee={effAnnee} onChange={changerAnnee} />
        {visibleTris.length > 0 && (
          <OngletsRail etiquette={t("planning.barre.trimestre")} onglets={ongletsDePeriode(visibleTris, unpublishedTris)} actif={effTri} choisir={setTri} />
        )}
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
        <FiltreDeNom filtre={filtre} couleur={GRILLE_CULTE.couleur} />
      </BarreDeGrille>

      <StaleBanner show={status === "stale"} />
      <BandeauAnnee annee={effAnnee} brouillon={brouillon} dimanches={brouillon ? dimanchesDe(effAnnee).length : null} />

      <PlanningGrille
        definition={GRILLE_CULTE}
        periode={`${effTri} ${effAnnee}`}
        filtre={filtre}
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
