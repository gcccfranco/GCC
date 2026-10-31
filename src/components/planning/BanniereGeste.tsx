"use client"

import type { CSSProperties } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Bandeau } from "@/components/layout/Bandeau"

// Bannière d'un geste de la grille (lot 3, PG6) : ce que le dernier geste a fait, avec « Annuler »
// (qui réécrit les valeurs d'avant) et ✕. Elle a la largeur de la grille.

export function BanniereGeste({ texte, notes, onAnnuler, onFermer }: {
  texte: string
  /** Lignes en plus (cases verrouillées, noms sans compte, cases hors de la grille). */
  notes?: string[]
  /** Absent : rien à annuler (un collage qui n'a rien écrit), la bannière ne porte que ✕. */
  onAnnuler?: () => void
  onFermer: () => void
}) {
  const { t } = useTranslation()
  return (
    <Bandeau ton="info" testId="banniere-geste" onFermer={onFermer}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p>{texte}</p>
          {notes?.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
        </div>
        {onAnnuler && (
          <button type="button" onClick={onAnnuler} className="shrink-0 font-semibold underline underline-offset-2">
            {t("planning.gestes.annuler")}
          </button>
        )}
      </div>
    </Bandeau>
  )
}

/** La barre d'un collage qui remplace des noms (PG29) : l'aperçu est dans la grille, rien n'est écrit. */
export function BarreCollage({ count, remplace, videsSeulement, onAnnuler, onVides, onColler }: {
  count: number
  remplace: number
  /** « Cases vides seulement » n'a de sens que si le bloc tombe sur une case vide. */
  videsSeulement: boolean
  onAnnuler: () => void
  onVides: () => void
  onColler: () => void
}) {
  const { t } = useTranslation()
  return (
    <Bandeau ton="alerte" testId="apercu-collage">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="min-w-0 flex-1 basis-64">{t("planning.gestes.apercu", { count, remplace })}</p>
      <button type="button" onClick={onAnnuler} className="shrink-0 font-semibold underline underline-offset-2">
        {t("common.buttons.cancel")}
      </button>
      <button
        type="button"
        onClick={onVides}
        disabled={!videsSeulement}
        className="shrink-0 rounded-md border border-amber-500 px-2.5 py-1 font-semibold disabled:opacity-40"
      >
        {t("planning.gestes.casesVidesSeulement")}
      </button>
      <button type="button" onClick={onColler} className="shrink-0 rounded-md bg-amber-700 px-2.5 py-1 font-semibold text-white">
        {t("planning.gestes.coller")}
      </button>
      </div>
    </Bandeau>
  )
}

/** La barre de sélection (PG23), sombre, sous la plage : les touches sont des rappels, pas des boutons. */
export function BarreSelection({ count, dimanches, colonnes, style, onFermer }: {
  count: number
  dimanches: number
  colonnes: number
  style?: CSSProperties
  onFermer: () => void
}) {
  const { t } = useTranslation()
  const cmd = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+"
  return (
    <div
      data-testid="barre-selection"
      role="status"
      style={style}
      className="absolute z-30 flex w-max max-w-[calc(100%-1rem)] items-center gap-x-3 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg"
    >
      <span className="font-semibold">{t("planning.gestes.selection", { count, dimanches, colonnes })}</span>
      <span className="opacity-80">{cmd}C {t("planning.gestes.copier")}</span>
      <span className="opacity-80">{cmd}V {t("planning.gestes.coller")}</span>
      <span className="opacity-80">⌫ {t("planning.gestes.vider")}</span>
      <button type="button" onClick={onFermer} aria-label={t("common.buttons.close")} className="rounded p-0.5 opacity-80 hover:opacity-100">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
