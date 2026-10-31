"use client"

// Carte d'un jour du planning Campus (séances du matin / du soir), commune à la page
// (grille, back-office ouvert) et à AncienTableau (back-office coupé) : lot N2f,
// docs/spec-nettoyage-code.md. Lit des séances déjà chargées, n'écrit rien.

import { useTranslation } from "react-i18next"
import type { CampusSeance } from "@/lib/planning/utils"
import { fdLongL } from "@/lib/planning/utils"
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

  return (
    <div className="bg-card shadow-soft rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: COLOR }}>{day}</div>
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
            <div className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide ${isSoir ? "bg-muted/60 text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {entrainement ? seanceLibelle(t, zh, s.d) : moment}
            </div>
            <div className="grid grid-cols-2 border-b border-border">
              <div className="px-4 py-3 border-r border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.presChoristes")}</p>
                {s.pres && (
                  <p className="text-sm font-semibold mb-1 texte-service" style={styleTexteService(COLOR)}>{s.pres}</p>
                )}
                {choristes.map(c => <Chip key={c} label={c} />)}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.musiciens")}</p>
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
  )
}
