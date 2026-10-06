"use client"

// Une ligne de la journée (lot U1) : l'heure, puis « Libre » ou la réservation
// (« Sketch · Jeunes » et son auteur). Même forme dans l'aperçu de la
// coordination et chez les membres, comme la planche bo-scene-reservations.
// Une réservation hors grille tient sur une ligne, de la hauteur des créneaux
// qu'elle prend (spec-scene-paques-noel, Q13) : « 17:00 → 18:30 ».

import type { CSSProperties, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Ligne } from "@/lib/scene/saison"
import type { Creneau } from "@/types/programme"

const COLOR = PLANNING_COLORS.scene

export function LigneJour({ ligne, droite, badges, conflit, sous }: {
  ligne: Ligne<Creneau>
  /** À droite : « Réserver », l'auteur, les boutons. */
  droite?: ReactNode
  /** Pastilles après le titre (hors grille, chevauchement). */
  badges?: ReactNode
  /** Heure en rouge : la réservation en chevauche une autre. */
  conflit?: boolean
  /** Sous la ligne : la note, ou le formulaire ouvert sur ce créneau. */
  sous?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const reserve = ligne.type === "reserve" ? ligne : null
  const forme = reserve ? "border-[1.5px] border-solid" : "border-[1.5px] border-dashed border-foreground/15"
  const couvre = Math.max(1, reserve?.couvre ?? 1)
  const style = reserve
    ? ({ background: `${COLOR}14`, borderColor: COLOR, "--svc": COLOR, minHeight: couvre > 1 ? `${couvre * 46 + (couvre - 1) * 6}px` : undefined } as CSSProperties)
    : undefined
  const heures = reserve?.aussi.length
    ? new Intl.ListFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr", { type: "conjunction" }).format(reserve.aussi)
    : null
  return (
    <li className={`flex flex-col justify-center rounded-xl px-3 py-2.5 ${forme}`} style={style}>
      <div className="flex items-center gap-x-3">
        <span className="min-w-[52px] flex-none leading-tight">
          <b className="tabular-nums" style={conflit ? { color: "#b91c1c" } : undefined}>{ligne.debut}</b>
          {reserve?.horsGrille && <span className="block text-xs text-muted-foreground tabular-nums">→ {ligne.fin}</span>}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {reserve ? (
            <span className="min-w-0">
              <span className="block font-semibold svc-ink">{reserve.creneau.quoi} · {reserve.creneau.qui.join(", ")}</span>
              {heures && (
                <span className="block text-[12.5px] text-muted-foreground">
                  {ligne.debut} – {ligne.fin} · {t("planning.saison.prendAussi", { count: reserve.aussi.length, heures })}
                </span>
              )}
            </span>
          ) : (
            <span className="font-semibold text-muted-foreground">{t("planning.saison.libre")}</span>
          )}
          {badges}
          {droite && <span className="ml-auto flex items-center gap-1 text-sm">{droite}</span>}
        </div>
      </div>
      {sous}
    </li>
  )
}
