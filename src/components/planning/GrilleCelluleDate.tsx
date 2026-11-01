"use client"

import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { styleTexteService } from "@/lib/couleurSombre"
import { fdShort } from "@/lib/planning/utils"

/** La cellule de la date d'une ligne du tableau (figée au défilement) : la date, « Cette semaine », « non publié »,
 *  le badge, le retrait et la copie du dimanche précédent. Sorti de `PlanningGrille` (lot N, N6b). */
export function GrilleCelluleDate({
  date,
  app,
  couleur,
  fond,
  cetteSemaine,
  nonPublie,
  badge,
  retirer,
  copie,
}: {
  date: string
  app: boolean
  couleur: string
  fond: string | undefined
  cetteSemaine: boolean
  nonPublie: boolean | undefined
  /** Le badge de `dateBadge` (Sainte Cène), déjà rendu. */
  badge: ReactNode
  /** Le bouton « Retirer », ou null quand la date ne se retire pas. */
  retirer: ReactNode
  /** La pastille « Copier le … » (survol) ou le « ⋯ » du dimanche, déjà posés. */
  copie: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <td
      data-date-cell={date}
      className="sticky left-0 z-10 w-[112px] px-3 py-2 font-semibold whitespace-nowrap bg-card texte-service"
      style={{ ...styleTexteService(couleur), backgroundImage: fond ? `linear-gradient(${fond}, ${fond})` : undefined }}
    >
      {/* La date, puis « Cette semaine » dessous (planches `v18-app-planning-grille-a`, `v18-bo-planning-a`). */}
      <div>{fdShort(date)}</div>
      {cetteSemaine && (
        <span className={`mt-0.5 mr-1 inline-block text-xs font-bold px-1.5 py-0.5 rounded ${app ? "bg-foreground text-background" : "text-white"}`} style={app ? undefined : { background: couleur }}>
          {t("planning.table.thisWeek")}
        </span>
      )}
      {nonPublie && (
        <span
          data-non-publie={date}
          title={t("planning.unpublishedTooltip")}
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
        >
          <Lock className="h-3 w-3" aria-hidden />
          {t("planning.grille.nonPublie")}
        </span>
      )}
      {badge}
      {retirer}
      {copie}
    </td>
  )
}
