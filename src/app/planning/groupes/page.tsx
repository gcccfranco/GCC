"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { getCurrentTri, getTri } from "@/lib/planning/utils"
import { PAIX_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK, BONTE_FALLBACK } from "@/lib/planning/data"
import { fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte } from "@/lib/planning/sheets"
import { GRILLE_BONTE, GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS, GRILLE_PAIX, lignesPubliees } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
  triVisibilities,
  TRI_ORDER,
} from "@/lib/planning/releases"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Les trois groupes, remplis dans l'app depuis le 19/09/2026 (lot 17, G6) :
// une grille par groupe, plus celle des musiciens de Fidélité ; la publication
// par trimestre (planningReleases/{groupe}) s'applique ligne par ligne comme au
// Culte. Les données de secours de 2026 restent tant que ces onglets ne sont
// pas importés dans l'app (D4 ne vaut que pour le Culte, pour l'instant).

type Groupe = "paix" | "fidelite" | "bonte"
type FidSub = "groupe" | "musiciens"

const GRP_COLORS: Record<Groupe, string> = {
  paix:     PLANNING_COLORS.paix,
  fidelite: PLANNING_COLORS.fidelite,
  bonte:    PLANNING_COLORS.bonte,
}

const GRP_INACTIVE = "bg-card text-muted-foreground border-border hover:text-foreground"

function GroupesPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(FIDELITE_FALLBACK)
  const [fidM, setFidM] = useState(FIDELITE_MUSIC_FALLBACK)
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [grp, setGrp] = useState<Groupe>("paix")
  const [fidSub, setFidSub] = useState<FidSub>("groupe")
  const [tri, setTri] = useState(getCurrentTri())
  const [pubByGrp, setPubByGrp] = useState<Record<string, string[]>>({})

  useEffect(() => {
    Promise.allSettled([
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchFideliteMusic().then(d => { if (d.length) setFidM(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
    ]).then(results => {
      setStale(results.some(r => r.status === "rejected"))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all(
      (["paix", "fidelite", "bonte"] as Groupe[]).map(k =>
        getPublishedQuarters(k, year).then(q => [k, q] as const)
      )
    ).then(entries => setPubByGrp(Object.fromEntries(entries)))
  }, [])

  const color = GRP_COLORS[grp]
  const definition =
    grp === "paix" ? GRILLE_PAIX
    : grp === "bonte" ? GRILLE_BONTE
    : fidSub === "musiciens" ? GRILLE_FIDELITE_MUSICIENS
    : GRILLE_FIDELITE
  const rows = grp === "paix" ? paix : grp === "bonte" ? bonte : fidSub === "musiciens" ? fidM : fid

  const peutModifier = canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, nomsDesComptes } = useGrilleApp(definition.key, peutModifier)

  // Trimestres futurs non publiés du groupe actif : masqués aux membres, marqués aux publieurs.
  const planning = PUBLISHABLE_PLANNINGS.find(p => p.key === grp)!
  const canPublish = canPublishPlanning(planning, isAdminUser(user), profile?.notify ?? [])
  const vis = triVisibilities(TRI_ORDER, pubByGrp[grp] ?? [], getCurrentTri(), canPublish)
  const visibleTris = vis.filter(v => v.visible).map(v => v.tri)
  const unpublishedTris = vis.filter(v => v.unpublished).map(v => v.tri)
  const effTri = visibleTris.includes(tri) ? tri : getCurrentTri()
  const lignes = lignesPubliees(rows, pubByGrp[grp] ?? [], getCurrentTri(), new Date().getFullYear(), canPublish)
    .filter((l) => getTri(l.row[0]) === effTri)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.groupes")}</h2>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <StaleBanner show={stale} />

      <div className="flex gap-2">
        {(["paix","fidelite","bonte"] as Groupe[]).map(g => (
          <button
            key={g}
            onClick={() => { setGrp(g); if (g !== "fidelite") setFidSub("groupe") }}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer ${grp === g ? "text-white border-transparent" : GRP_INACTIVE}`}
            style={grp === g ? { background: GRP_COLORS[g], borderColor: GRP_COLORS[g] } : undefined}
          >
            {t(`planning.groupes.${g}`)}
          </button>
        ))}
      </div>

      {grp === "fidelite" && (
        <div className="flex gap-2">
          {(["groupe","musiciens"] as FidSub[]).map(sub => (
            <button
              key={sub}
              onClick={() => setFidSub(sub)}
              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                fidSub === sub
                  ? "border-transparent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
              style={fidSub === sub ? { background: `${color}15`, borderColor: color, color } : undefined}
            >
              {sub === "groupe" ? t("planning.groupes.planningGroupe") : t("planning.groupes.planningMusiciens")}
            </button>
          ))}
        </div>
      )}

      <FilterButtons options={visibleTris} active={effTri} onChange={setTri} color={color} unpublished={unpublishedTris} />

      <PlanningGrille
        key={definition.key}
        definition={definition}
        periode={`${effTri} ${new Date().getFullYear()}`}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        nomsDesComptes={nomsDesComptes}
      />
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? GroupesPage : AncienTableau
