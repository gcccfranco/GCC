"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { filterByTri, getCurrentTri } from "@/lib/planning/utils"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { useSheet } from "@/lib/planning/useSheet"
import { DEJEUNER_FALLBACK } from "@/lib/planning/data"
import { fetchTable } from "@/lib/planning/sheets"
import { GRILLE_TABLE, anneeRemplie, anneesDuPlanning, dimanchesDe, lignesDeLAnnee, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
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
  const { datesDansLApp, comptes } = useGrilleApp(GRILLE_TABLE.key, peutModifier)
  // Lot U2 : l'année suivante s'ouvre à qui remplit, et à tous dès une case remplie.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const annees = anneesDuPlanning(anneeCourante, peutModifier || anneeRemplie(rows, anneeCourante + 1))
  const effAnnee = annees.includes(annee) ? annee : anneeCourante
  const suivante = effAnnee > anneeCourante && peutModifier

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-foreground">{t("planning.pages.table")}</h2>
          <AnneeSelecteur
            annees={annees}
            annee={effAnnee}
            onChange={(a) => { setAnnee(a); setTri(a === anneeCourante ? getCurrentTri() : "T1") }}
          />
        </div>
        {status === "loading" && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={status === "stale"} />
      <BandeauAnnee annee={effAnnee} brouillon={false} dimanches={suivante ? dimanchesDe(effAnnee).length : null} />

      <FilterButtons options={["T1","T2","T3","T4"]} active={tri} onChange={setTri} color={GRILLE_TABLE.couleur} />

      <PlanningGrille
        definition={GRILLE_TABLE}
        periode={`${tri} ${effAnnee}`}
        lignes={lignesSimples(filterByTri(lignesDeLAnnee(GRILLE_TABLE, effAnnee, rows), tri))}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        exporter={peutModifier ? { annee: effAnnee, rang: Number(tri.slice(1)), tout: isAdminUser(user) } : undefined}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? TablePage : AncienTableau
