"use client"

// Une ligne de la journée (lot U1) : les heures, puis « Libre », la réservation
// (« Sketch · Jeunes » et son auteur) ou, depuis le lot 5 de Salles
// (docs/spec-salles.md, AR22), ce qui prend la scène d'autre part (emploi du
// temps fixe, réservation de Salles, évènement), en gris et sans action. Même
// forme dans l'aperçu de la coordination et chez les membres. Plus de grille :
// chaque ligne dit son début et sa fin (« 17:00 → 19:00 »).

import { langueCourte } from "@/lib/utils/formatDate";
import type { CSSProperties, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Ligne } from "@/lib/scene/saison"
import type { Creneau } from "@/types/programme"
import { libelleQui } from "@/lib/fetes/qui"

const COLOR = PLANNING_COLORS.scene

export function LigneJour({ ligne, droite, badges, conflit, sous }: {
  ligne: Ligne<Creneau>
  /** À droite : « Réserver », l'auteur, les boutons. */
  droite?: ReactNode
  /** Pastilles après le titre (hors des plages, chevauchement). */
  badges?: ReactNode
  /** Heure en rouge : la réservation en chevauche une autre. */
  conflit?: boolean
  /** Sous la ligne : la note. */
  sous?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const reserve = ligne.type === "reserve" ? ligne : null
  const forme = reserve ? "border-[1.5px] border-solid"
    : ligne.type === "occupe" ? "bg-secondary/60"
      : "border-[1.5px] border-dashed border-foreground/15"
  const style = reserve ? ({ background: `${COLOR}14`, borderColor: COLOR, "--svc": COLOR } as CSSProperties) : undefined
  return (
    <li data-ligne={ligne.type} className={`flex flex-col justify-center rounded-xl px-3 py-2.5 ${forme}`} style={style}>
      <div className="flex items-center gap-x-3">
        <span className="min-w-[52px] flex-none leading-tight">
          <b className={`tabular-nums ${ligne.type === "occupe" ? "font-semibold text-muted-foreground" : ""}`} style={conflit ? { color: "#b91c1c" } : undefined}>{ligne.debut}</b>
          <span className="block text-xs text-muted-foreground tabular-nums">→ {ligne.fin === "24:00" ? "23:59" : ligne.fin}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {reserve ? (
            <span className="min-w-0 font-semibold svc-ink">
              {reserve.creneau.quoi} · {reserve.creneau.qui.map((q) => libelleQui(q, langueCourte(i18n.language))).join(", ")}
            </span>
          ) : ligne.type === "occupe" ? (
            <span className="min-w-0 text-muted-foreground">{ligne.autre.libelle}</span>
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
