"use client"

// Une ligne de la journée (lot U1) : l'heure, puis « Libre », « Pris » ou la
// réservation (« Sketch · Jeunes » et son auteur). Même forme dans l'aperçu de
// la coordination et chez les membres, comme la planche bo-scene-reservations.

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
  const { t } = useTranslation()
  const reserve = ligne.type === "reserve" ? ligne : null
  // Une réservation hors grille garde son heure entière ; sinon la grille la dit.
  const heure = reserve?.horsGrille ? `${ligne.debut} – ${ligne.fin}` : ligne.debut
  const forme = reserve
    ? "border-[1.5px] border-solid"
    : ligne.type === "pris"
      ? "border-[1.5px] border-transparent bg-secondary"
      : "border-[1.5px] border-dashed border-foreground/15"
  const style = reserve ? ({ background: `${COLOR}14`, borderColor: COLOR, "--svc": COLOR } as CSSProperties) : undefined
  return (
    <li className={`rounded-xl px-3 py-2.5 ${forme}`} style={style}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <b className="min-w-[52px] tabular-nums" style={conflit ? { color: "#b91c1c" } : undefined}>{heure}</b>
        {reserve ? (
          <span className="min-w-0 font-semibold svc-ink">{reserve.creneau.quoi} · {reserve.creneau.qui.join(", ")}</span>
        ) : (
          <span className="font-semibold text-muted-foreground">{t(ligne.type === "pris" ? "planning.saison.pris" : "planning.saison.libre")}</span>
        )}
        {badges}
        {droite && <span className="ml-auto flex items-center gap-1 text-sm">{droite}</span>}
      </div>
      {sous}
    </li>
  )
}
