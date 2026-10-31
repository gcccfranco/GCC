"use client"

import type { CSSProperties, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { tuileDate } from "./libelles"

const COLOR = PLANNING_COLORS.scene

/** Pastille « Hors grille » : réservation hors des jours ou des créneaux de la saison. */
export function BadgeHorsGrille() {
  const { t } = useTranslation()
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold border border-foreground/30 text-foreground">{t("planning.saison.horsGrille")}</span>
}

/** La tuile de date (planche : « 11 » sur « oct. »). */
export function TuileDate({ iso, lang }: { iso: string; lang: string }) {
  const { jour, mois } = tuileDate(iso, lang)
  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl leading-none svc-ink"
      style={{ "--svc": COLOR, background: `color-mix(in srgb, ${COLOR} 10%, transparent)` } as CSSProperties}>
      <span className="text-[15px] font-bold tabular-nums">{jour}</span>
      <span className="mt-0.5 text-[10.5px] font-semibold">{mois}</span>
    </span>
  )
}

/** ‹ et › de la semaine (deux volets). */
export function Fleche({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className="raised flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-opacity disabled:opacity-40">
      {children}
    </button>
  )
}
