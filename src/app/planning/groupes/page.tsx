"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { OngletsRail } from "@/components/layout/Onglets"
import { BarreDeGrille, FiltreDeNom, compterCasesVides, ongletsDePeriode, useFiltreNom, useTrimestreEnLettres } from "@/components/planning/BarreDeGrille"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { getCurrentTri } from "@/lib/planning/utils"
import { PAIX_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK, BONTE_FALLBACK } from "@/lib/planning/data"
import { fetchPaix, fetchFidelite, fetchBonte, fetchInterfranco, fetchIntergroupe } from "@/lib/planning/sheets"
import { GRILLE_BONTE, GRILLE_FIDELITE, GRILLE_PAIX, completerMusiciensFidelite, dimanchesDe, dimanchesSpeciaux, vueTrimestrielle } from "@/lib/planning/grilles"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { BoutonPublication } from "@/components/planning/BoutonPublication"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
} from "@/lib/planning/releases"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { AncienTableau } from "./AncienTableau"

// Les trois groupes, remplis dans l'app depuis le 19/09/2026 (lot 17, G6) :
// une grille par groupe (Fidélité porte ses musiciens depuis le lot F, D24) ; la publication
// par trimestre (planningReleases/{groupe}) s'applique ligne par ligne comme au
// Culte. Les données de secours de 2026 restent tant que ces onglets ne sont
// pas importés dans l'app (D4 ne vaut que pour le Culte, pour l'instant).

type Groupe = "paix" | "fidelite" | "bonte"

const GRP_COLORS: Record<Groupe, string> = {
  paix:     PLANNING_COLORS.paix,
  fidelite: PLANNING_COLORS.fidelite,
  bonte:    PLANNING_COLORS.bonte,
}

function GroupesPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const gestion = useGestionPlanning()
  const filtre = useFiltreNom()
  const trimestre = useTrimestreEnLettres()
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(() => completerMusiciensFidelite(FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK))
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  // Lot U2 (Q5) : les dimanches d'Interfranco et d'Intergroupe, lus dans leur grille.
  const [interfranco, setInterfranco] = useState<string[][]>([])
  const [intergroupe, setIntergroupe] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [grp, setGrp] = useState<Groupe>("paix")
  const [tri, setTri] = useState(getCurrentTri())
  // Lot U2 : l'année choisie ; publication lue pour l'année en cours et la suivante.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const [pubByGrp, setPubByGrp] = useState<Record<string, string[]>>({})

  useEffect(() => {
    Promise.allSettled([
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
      fetchInterfranco().then(setInterfranco),
      fetchIntergroupe().then(setIntergroupe),
    ]).then(results => {
      setStale(results.some(r => r.status === "rejected"))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all(
      (["paix", "fidelite", "bonte"] as Groupe[]).flatMap(k =>
        [year, year + 1].map(y => getPublishedQuarters(k, y).then(q => [`${k}_${y}`, q] as const))
      )
    ).then(entries => setPubByGrp(Object.fromEntries(entries)))
  }, [])

  const color = GRP_COLORS[grp]
  const definition = grp === "paix" ? GRILLE_PAIX : grp === "bonte" ? GRILLE_BONTE : GRILLE_FIDELITE
  const rows = grp === "paix" ? paix : grp === "bonte" ? bonte : fid

  const peutModifier = gestion && canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, comptes } = useGrilleApp(definition.key, peutModifier)

  // Trimestres futurs non publiés du groupe actif : masqués aux membres, marqués aux publieurs.
  const planning = PUBLISHABLE_PLANNINGS.find(p => p.key === grp)!
  const canPublish = gestion && canPublishPlanning(planning, isAdminUser(user), profile?.notify ?? [])
  // Q4 (lot U2) : le brouillon se montre à qui remplit ou publie ce planning, et aux admins.
  const voitBrouillon = canPublish || peutModifier
  const {
    annees, annee: effAnnee, visibles: visibleTris, nonPublies: unpublishedTris, tri: effTri, lignes, aVenir, brouillon,
  } = vueTrimestrielle({
    definition, rows, anneeCourante, triCourant: getCurrentTri(), annee, tri,
    publies: (y) => pubByGrp[`${grp}_${y}`] ?? [], voitBrouillon,
  })

  const horaire = t(grp === "fidelite" ? "planning.horaires.fidelite" : "planning.horaires.groupes")

  function changerAnnee(a: number) {
    setAnnee(a)
    setTri(a === anneeCourante ? getCurrentTri() : "T1")
  }

  return (
    <div className="max-w-full space-y-4 mx-auto">
      {/* Agencement v18 (A3) : Paix · Fidélité · Bonté en rail, pastille de couleur devant chaque
          nom. Lot F (D24) : Fidélité n'a plus qu'un planning, plus de pilules Groupe · Musiciens. */}
      <BarreDeGrille
        titre={t("planning.pages.groupes")}
        couleur={color}
        detail={[horaire, effTri && trimestre(effTri, effAnnee)].filter(Boolean).join(" · ")}
        sousTitreBO={[t(definition.i18nTitre), horaire,
          t("planning.barre.casesVidesTrimestre", { count: compterCasesVides(definition, lignes) })].filter(Boolean).join(" · ")}
        chargement={loading}
      >
        <OngletsRail
          etiquette={t("planning.pages.groupes")}
          onglets={(["paix", "fidelite", "bonte"] as Groupe[]).map((g) => ({ id: g, label: t(`planning.groupes.${g}`), couleur: GRP_COLORS[g] }))}
          actif={grp}
          choisir={(g) => setGrp(g as Groupe)}
        />
        <AnneeSelecteur annees={annees} annee={effAnnee} onChange={changerAnnee} />
        {visibleTris.length > 0 && (
          <OngletsRail etiquette={t("planning.barre.trimestre")} onglets={ongletsDePeriode(visibleTris, unpublishedTris)} actif={effTri} choisir={setTri} />
        )}
        {canPublish && effTri && aVenir && (
          <BoutonPublication
            planningKey={planning.key}
            planningLabel={planning.label}
            annee={effAnnee}
            tri={effTri}
            publie={!unpublishedTris.includes(effTri)}
            onChange={(published) => setPubByGrp((prev) => ({ ...prev, [`${grp}_${effAnnee}`]: published }))}
          />
        )}
        <FiltreDeNom filtre={filtre} couleur={color} />
      </BarreDeGrille>

      <StaleBanner show={stale} />
      <BandeauAnnee
        annee={effAnnee}
        brouillon={brouillon}
        dimanches={brouillon && definition.dates === "dimanches" ? dimanchesDe(effAnnee).length : null}
      />

      <PlanningGrille
        key={definition.key}
        definition={definition}
        periode={`${effTri} ${effAnnee}`}
        filtre={filtre}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        dimanchesSpeciaux={dimanchesSpeciaux(interfranco, intergroupe)}
        // P7 : les responsables du planning et les admins exportent (Q13).
        exporter={voitBrouillon ? { annee: effAnnee, rang: Number(effTri.slice(1)) || 1, tout: isAdminUser(user) } : undefined}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? GroupesPage : AncienTableau
