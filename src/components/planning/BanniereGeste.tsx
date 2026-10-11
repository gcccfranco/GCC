"use client"

import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

// Bannière d'un geste de la grille (lot 3, PG6) : ce que le dernier geste a fait, avec « Annuler »
// (qui réécrit les valeurs d'avant) et ✕. Elle a la largeur de la grille.

export function BanniereGeste({ texte, notes, onAnnuler, onFermer }: {
  texte: string
  /** Lignes en plus (cases verrouillées, noms sans compte, cases hors de la grille). */
  notes?: string[]
  onAnnuler: () => void
  onFermer: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      data-testid="banniere-geste"
      className="flex items-start gap-3 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
    >
      <div className="min-w-0 flex-1">
        <p>{texte}</p>
        {notes?.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
      </div>
      <button type="button" onClick={onAnnuler} className="shrink-0 font-semibold underline underline-offset-2">
        {t("planning.gestes.annuler")}
      </button>
      <button type="button" onClick={onFermer} aria-label={t("common.buttons.close")} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
