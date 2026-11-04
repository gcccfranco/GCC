"use client"

// Carte d'un jour du planning Campus (séances du matin / du soir), commune à la page
// (grille, back-office ouvert) et à AncienTableau (back-office coupé) : lot N2f,
// docs/spec-nettoyage-code.md. Lit des séances déjà chargées, n'écrit rien.

import { useTranslation } from "react-i18next"
import type { CampusSeance } from "@/lib/planning/utils"
import { fdLongL, jourCourtL } from "@/lib/planning/utils"
import { todayIso } from "@/lib/scene/dimanches"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { cellulePoste, poste, seanceLibelle } from "@/app/planning/campus/postes"
import { styleTexteService } from "@/lib/couleurSombre"

const COLOR = PLANNING_COLORS.campus

export function groupByDay(seances: CampusSeance[]) {
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

// `entrainement` : volet « Répétition » (bandeau de répétition et libellé de séance) ; sinon volet « Louange ».
export function CarteJourCampus({ day, seances, entrainement }: { day: string; seances: CampusSeance[]; entrainement: boolean }) {
  const { t, i18n } = useTranslation()
  const zh = i18n.language === "zh-CN"

  // plannings-5 : l'en-tête de la carte reprend la recette de Culte (`CarteDimanche`) : teinte à 5 %, date en couleur
  // de service avec le jour de la semaine ; le jour courant passe à 10 %, filet de 1 px et badge plein.
  const iso = seances[0]?.date
  const aujourdhui = !!iso && iso === todayIso()
  return (
    <div className="bg-card shadow-soft rounded-xl overflow-hidden border border-transparent" style={{ borderColor: aujourdhui ? COLOR : undefined }}>
      <div className="px-4 py-2 flex items-center gap-2" style={{ background: aujourdhui ? `${COLOR}1a` : `${COLOR}0d` }}>
        <span className="text-sm font-bold texte-service" style={styleTexteService(COLOR)}>{iso ? jourCourtL(iso, i18n.language) : day}</span>
        {aujourdhui && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: COLOR }}>{t("planning.accueil.aujourdhui")}</span>
        )}
      </div>
      {seances.map((s, i) => {
        const isSoir = !s.d.includes("Matin")
        const moment = isSoir ? t("planning.campus.evening") : t("planning.campus.morning")
        const choristes = s.ch.split(",").map(c => c.trim()).filter(Boolean)
        const musiciens = s.mu.split(",").map(m => m.trim()).filter(Boolean)
        const regie = s.rg.split(",").map(r => r.trim()).filter(Boolean)

        return (
          <div key={i} className="border-t border-border">
            {entrainement && s.ent && (
              <div className="px-4 py-2 text-xs font-semibold text-white" style={{ background: COLOR }}>
                {t("planning.campus.repetitionLabel")} <span className="font-normal">
                  {fdLongL(s.ent, i18n.language)}
                  {s.entTime ? ` ${t("planning.campus.atTime", { time: s.entTime })}` : ""}
                  {s.entLieu ? ` — ${s.entLieu}` : ""}
                </span>
              </div>
            )}
            <div className={`px-4 py-2 text-[13px] font-semibold ${isSoir ? "bg-muted/60 text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {entrainement ? seanceLibelle(t, zh, s.d) : moment}
            </div>
            <div className="grid grid-cols-2 border-b border-border">
              <div className="px-4 py-3 border-r border-border">
                <p className="text-[13px] font-semibold text-muted-foreground mb-2">{t("planning.campus.presChoristes")}</p>
                {s.pres && (
                  <p className="text-sm font-semibold mb-1 texte-service" style={styleTexteService(COLOR)}>{s.pres}</p>
                )}
                {choristes.map(c => <Chip key={c} label={c} />)}
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] font-semibold text-muted-foreground mb-2">{t("planning.campus.musiciens")}</p>
                {musiciens.map(m => <Chip key={m} label={cellulePoste(t, zh, m)} />)}
              </div>
            </div>
            {regie.length > 0 && (
              <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs border-b border-border bg-background">
                {regie.map(r => {
                  const [role, name] = r.split(":").map(x => x.trim())
                  return (
                    <span key={r}>
                      <span className="text-muted-foreground">{zh ? poste(t, role) : role}</span>
                      {name && <span className="font-semibold text-foreground ml-1">{name}</span>}
                    </span>
                  )
                })}
              </div>
            )}
            <div className="px-4 py-3 bg-secondary/30">
              <p className="text-[13px] font-semibold text-muted-foreground mb-2">{t("planning.campus.chants")}</p>
              {s.chants.some(c => c?.trim()) ? (
                <div className="space-y-1">
                  {s.chants.filter(c => c?.trim()).map((c, ci) => (
                    <div key={ci} className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground font-medium">
                      {c.trim()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("planning.campus.chantsAVenir")}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
