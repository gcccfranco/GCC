"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { getCurrentEddPeriode, EDD_PERIODES, EDD_CLASSES } from "@/lib/planning/utils"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { OngletsRail } from "@/components/layout/Onglets"
import { BarreDeGrille, FiltreDeNom, compterCasesVides, useFiltreNom } from "@/components/planning/BarreDeGrille"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { EDD_FALLBACK } from "@/lib/planning/data"
import { fetchEDD, periodeEdd } from "@/lib/planning/sheets"
import { GRILLES_EDD, anneeRemplie, anneesDuPlanning, dimanchesDe, lignesDeLAnnee, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { EddDataStructure, EddPeriode, EddClasse } from "@/lib/planning/utils"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { AncienTableau } from "./AncienTableau"

// EDD : une grille par classe (中班, 大班, 高班), cinq cases par dimanche,
// remplie dans l'app depuis le 19/09/2026 (lot 17, G6) par qui a le droit sur
// la classe ; la période se choisit comme avant.

const COLOR = PLANNING_COLORS.edd
const PERIODE_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

function EddPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const [eddData, setEddData] = useState<EddDataStructure>(EDD_FALLBACK)
  const [periode, setPeriode] = useState<EddPeriode>(getCurrentEddPeriode())
  const [classe, setClasse] = useState<EddClasse>("中班")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEDD().then(d => setEddData(d)).finally(() => setLoading(false))
  }, [])

  const definition = GRILLES_EDD.find((g) => g.sousTitre === classe) ?? GRILLES_EDD[0]
  const gestion = useGestionPlanning()
  const filtre = useFiltreNom()
  const peutModifier = gestion && canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, comptes } = useGrilleApp(definition.key, peutModifier)
  // Lot U2 : `fetchEDD` range par période sans regarder l'année ; la page
  // reprend toutes les lignes de la classe et garde l'année choisie.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const toutes = Object.values(eddData).flatMap((p) => p.classes?.[classe] ?? [])
  const annees = anneesDuPlanning(anneeCourante, peutModifier || anneeRemplie(toutes, anneeCourante + 1))
  const effAnnee = annees.includes(annee) ? annee : anneeCourante
  const rows = lignesDeLAnnee(definition, effAnnee, toutes).filter((r) => periodeEdd(r[0]) === periode)
  const suivante = effAnnee > anneeCourante && peutModifier
  const lignes = lignesSimples(rows)
  const libellePeriode = `${t(`planning.edd.${PERIODE_KEYS[EDD_PERIODES.indexOf(periode)]}`)} ${effAnnee}`

  return (
    <div className="max-w-full space-y-4 mx-auto">
      {/* Agencement v18 (B7, R4) : la classe (une vue) et la période en rail, dans la rangée. */}
      <BarreDeGrille
        titre={t("planning.pages.edd")}
        couleur={COLOR}
        detail={libellePeriode}
        sousTitreBO={[t("planning.pages.edd"), classe, t("planning.barre.casesVidesPeriode", { count: compterCasesVides(definition, lignes) })].join(" · ")}
        chargement={loading}
      >
        <OngletsRail etiquette={t("planning.barre.classe")} onglets={EDD_CLASSES.map((c) => ({ id: c, label: c }))} actif={classe} choisir={(c) => setClasse(c as EddClasse)} />
        <AnneeSelecteur
          annees={annees}
          annee={effAnnee}
          onChange={(a) => { setAnnee(a); setPeriode(a === anneeCourante ? getCurrentEddPeriode() : EDD_PERIODES[0]) }}
        />
        <OngletsRail
          etiquette={t("planning.barre.periode")}
          onglets={EDD_PERIODES.map((p, i) => ({ id: p, label: t(`planning.edd.${PERIODE_KEYS[i]}`) }))}
          actif={periode}
          choisir={(p) => setPeriode(p as EddPeriode)}
        />
        <FiltreDeNom filtre={filtre} couleur={COLOR} />
      </BarreDeGrille>

      <BandeauAnnee annee={effAnnee} brouillon={false} dimanches={suivante ? dimanchesDe(effAnnee).length : null} />

      <PlanningGrille
        key={definition.key}
        definition={definition}
        periode={libellePeriode}
        filtre={filtre}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        exporter={peutModifier ? { annee: effAnnee, rang: EDD_PERIODES.indexOf(periode) + 1, tout: isAdminUser(user) } : undefined}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? EddPage : AncienTableau
