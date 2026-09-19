"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CAMP_LOUANGE_FALLBACK, CAMP_ENT_FALLBACK } from "@/lib/planning/data"
import { fetchCampus, fetchCampusGrilles } from "@/lib/planning/sheets"
import type { CampusSeance } from "@/lib/planning/utils"
import { fdLongL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning } from "@/lib/access"

// Campus : les cartes Louange / Répétition restent la lecture ; le volet
// « Grille » (19/09/2026, lot 17 G6) montre les deux grilles, matin puis soir,
// treize cases par séance, remplies dans l'app par qui en a le droit. Une case
// écrite dans la grille se retrouve dans les cartes au retour sur le volet.

const COLOR = PLANNING_COLORS.campus

type CampusSub = "louange" | "entrainement" | "grille"

function groupByDay(seances: CampusSeance[]) {
  const days: Record<string, CampusSeance[]> = {}
  const order: string[] = []
  for (const s of seances) {
    const day = s.d.split(" ")[0]
    if (!days[day]) { days[day] = []; order.push(day) }
    days[day].push(s)
  }
  return { days, order }
}

function Chip({ label }: { label: string }) {
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground mr-1 mb-1">{label}</span>
}

export default function CampusPage() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useProfile()
  const [louange, setLouange] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)
  const [entrainement, setEntrainement] = useState<CampusSeance[]>(CAMP_ENT_FALLBACK)
  const [grilles, setGrilles] = useState<{ matin: string[][]; soir: string[][] }>({ matin: [], soir: [] })
  const [sub, setSub] = useState<CampusSub>("louange")
  const [loading, setLoading] = useState(true)

  const peutMatin = canEditPlanning(user, profile, GRILLE_CAMPUS_MATIN.key)
  const peutSoir = canEditPlanning(user, profile, GRILLE_CAMPUS_SOIR.key)
  const matinApp = useGrilleApp(GRILLE_CAMPUS_MATIN.key, peutMatin)
  const soirApp = useGrilleApp(GRILLE_CAMPUS_SOIR.key, peutSoir)

  const chargerCartes = () =>
    fetchCampus().then(({ louange: l, entrainement: e }) => {
      if (l.length) setLouange(l)
      if (e.length) setEntrainement(e)
    })

  useEffect(() => {
    chargerCartes().finally(() => setLoading(false))
    fetchCampusGrilles().then(setGrilles)
  }, [])

  // Au changement de volet, on relit : une case écrite dans la grille doit se
  // voir dans les cartes (le cache de la grille est déjà vidé par l'écriture).
  function changerVolet(s: CampusSub) {
    setSub(s)
    if (s === "grille") void fetchCampusGrilles().then(setGrilles)
    else void chargerCartes()
  }

  const data = sub === "louange" ? louange : entrainement
  const { days, order } = groupByDay(data)
  const annee = t("planning.grille.periodeAnnee", { annee: new Date().getFullYear() })

  return (
    // Le volet Grille porte treize colonnes : toute la largeur ; les cartes gardent leur colonne étroite.
    <div className={`${sub === "grille" ? "max-w-full" : "max-w-2xl"} space-y-4 mx-auto`}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{t("planning.pages.campus")}</h2>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      <div className="flex gap-2">
        {(["louange","entrainement","grille"] as CampusSub[]).map(s => (
          <button
            key={s}
            onClick={() => changerVolet(s)}
            className={`flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
              sub === s ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
            style={sub === s ? { background: COLOR, borderColor: COLOR } : undefined}
          >
            {s === "louange" ? t("planning.campus.louange") : s === "entrainement" ? t("planning.campus.repetition") : t("planning.campus.grille")}
          </button>
        ))}
      </div>

      {sub === "grille" && (
        <div className="space-y-6">
          <PlanningGrille
            definition={GRILLE_CAMPUS_MATIN}
            periode={annee}
            lignes={lignesSimples(grilles.matin)}
            peutModifier={peutMatin}
            datesDansLApp={matinApp.datesDansLApp}
            nomsDesComptes={matinApp.nomsDesComptes}
          />
          <PlanningGrille
            definition={GRILLE_CAMPUS_SOIR}
            periode={annee}
            lignes={lignesSimples(grilles.soir)}
            peutModifier={peutSoir}
            datesDansLApp={soirApp.datesDansLApp}
            nomsDesComptes={soirApp.nomsDesComptes}
          />
        </div>
      )}

      {sub !== "grille" && order.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">{t("planning.campus.noSeance")}</div>
      )}

      {sub !== "grille" && order.map(day => (
        <div key={day} className="bg-card shadow-soft rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: COLOR }}>{day}</div>
          {days[day].map((s, i) => {
            const isSoir = !s.d.includes("Matin")
            const moment = isSoir ? t("planning.campus.evening") : t("planning.campus.morning")
            const choristes = s.ch.split(",").map(c => c.trim()).filter(Boolean)
            const musiciens = s.mu.split(",").map(m => m.trim()).filter(Boolean)
            const regie = s.rg.split(",").map(r => r.trim()).filter(Boolean)

            return (
              <div key={i} className="border-t border-border">
                {sub === "entrainement" && s.ent && (
                  <div className="px-4 py-2 text-xs font-semibold text-white" style={{ background: COLOR }}>
                    {t("planning.campus.repetitionLabel")} <span className="font-normal">
                      {fdLongL(s.ent, i18n.language)}
                      {s.entTime ? ` ${t("planning.campus.atTime", { time: s.entTime })}` : ""}
                      {s.entLieu ? ` — ${s.entLieu}` : ""}
                    </span>
                  </div>
                )}
                <div className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide ${isSoir ? "bg-muted/60 text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {sub === "entrainement" ? s.d : moment}
                </div>
                <div className="grid grid-cols-2 border-b border-border">
                  <div className="px-4 py-3 border-r border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.presChoristes")}</p>
                    {s.pres && (
                      <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{s.pres}</p>
                    )}
                    {choristes.map(c => <Chip key={c} label={c} />)}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.musiciens")}</p>
                    {musiciens.map(m => <Chip key={m} label={m} />)}
                  </div>
                </div>
                {regie.length > 0 && (
                  <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs border-b border-border bg-background">
                    {regie.map(r => {
                      const [role, name] = r.split(":").map(x => x.trim())
                      return (
                        <span key={r}>
                          <span className="text-muted-foreground">{role}</span>
                          {name && <span className="font-semibold text-foreground ml-1">{name}</span>}
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.chants")}</p>
                  <div className="space-y-1">
                    {(s.chants.some(c => c?.trim()) ? s.chants : ["","","",""]).map((c, ci) => (
                      <div key={ci} className={`text-xs px-3 py-1.5 rounded-lg border ${c?.trim() ? "border-border bg-card text-foreground font-medium" : "border-dashed border-border text-muted-foreground"}`}>
                        {c?.trim() || t("planning.campus.chantN", { n: ci + 1 })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
