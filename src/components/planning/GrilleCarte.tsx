"use client"

import type { MouseEvent, ReactNode } from "react"
import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { styleTexteService } from "@/lib/couleurSombre"
import { fdShort } from "@/lib/planning/utils"
import { TOUCHER_44 } from "@/lib/toucher44"

/** Zone de 44 px d'une case de nom, posée sur la cellule (ou la ligne de carte) : le bouton de la case porte `truncate`
 *  et rognerait une zone posée sur lui. Au toucher, la zone passe sous le contenu (`isolate` + `-z-10`) : le bouton reste
 *  atteignable, et un toucher sur le reste de la zone est renvoyé au bouton par `ouvrirLaCase`. */
export const ZONE_CASE = `${TOUCHER_44} [@media(pointer:coarse)]:isolate [@media(pointer:coarse)]:after:-z-10`

/** Un toucher dans la zone, hors du bouton, ouvre la case (au toucher seulement : au pointeur, le bord de la case ne fait rien). */
export function ouvrirLaCase(e: MouseEvent<HTMLElement>) {
  if (e.target !== e.currentTarget || !matchMedia("(pointer: coarse)").matches) return
  e.currentTarget.querySelector<HTMLElement>(":scope > button")?.click()
}

/** La carte d'un dimanche sur téléphone : l'en-tête (date, « Cette semaine », « non publié », badge, actions) et,
 *  dessous, les cases (`children`). Sorti de `PlanningGrille` (lot N, N6b). */
export function CarteDimanche({
  date,
  couleur,
  cetteSemaine,
  nonPublie,
  badge,
  actions,
  children,
}: {
  date: string
  couleur: string
  cetteSemaine: boolean
  nonPublie: boolean | undefined
  /** Le badge de `dateBadge` (Sainte Cène), déjà rendu. */
  badge: ReactNode
  /** Le retrait et le « ⋯ » de copie, déjà posés (null : rien). */
  actions: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div
      data-testid="grille-carte"
      data-date-carte={date}
      className="border border-transparent dark:border-0 carte-groupe overflow-hidden"
      style={cetteSemaine ? { borderColor: couleur, borderWidth: 1, boxShadow: "none" } : undefined}
    >
      <div
        className="px-3.5 py-2 flex items-center gap-2 flex-wrap"
        style={{ background: cetteSemaine ? `${couleur}1a` : `${couleur}0d` }}
      >
        <span className="text-sm font-bold texte-service" style={styleTexteService(couleur)}>{fdShort(date)}</span>
        {cetteSemaine && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: couleur }}>
            {t("planning.table.thisWeek")}
          </span>
        )}
        {nonPublie && (
          <span data-non-publie={date} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />
            {t("planning.grille.nonPublie")}
          </span>
        )}
        {badge}
        {actions}
      </div>
      {/* Au toucher, 12 px entre deux lignes : les zones de 44 px des cases (32 px de dessin) se touchent sans se recouvrir. */}
      <div className="px-3.5 py-2.5 space-y-1 [@media(pointer:coarse)]:space-y-3">{children}</div>
    </div>
  )
}

/** Une ligne de carte : le libellé de la colonne, puis la case (`children`, déjà rendue par `laCase`). */
export function LigneDeCarte({
  libelle,
  dataCase,
  dansGeste,
  apercu,
  changement,
  couleur,
  children,
}: {
  libelle: string
  dataCase: string
  dansGeste: boolean
  apercu: string | undefined
  changement: true | undefined
  couleur: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{libelle}</span>
      <span data-case={dataCase} data-geste={dansGeste || undefined} data-apercu={apercu} data-changement={changement} onClick={ouvrirLaCase} className={`relative min-w-0 flex-1 rounded-md ${ZONE_CASE} ${changement ? "bg-amber-100/70 pr-4 dark:bg-amber-500/15" : ""}`} style={dansGeste ? { background: `${couleur}22` } : undefined}>{children}</span>
    </div>
  )
}
