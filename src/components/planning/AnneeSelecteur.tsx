"use client"

import { useTranslation } from "react-i18next"

// Sélecteur d'année du planning (lot U2, docs/spec-planning-2027.md) :
// « 2026 · 2027 », segmenté comme sur la planche bo-planning-2027. Une seule
// année visible : rien à choisir, rien d'affiché (un membre en 2026).

export function AnneeSelecteur({ annees, annee, onChange }: {
  annees: readonly number[]
  annee: number
  onChange: (annee: number) => void
}) {
  const { t } = useTranslation()
  if (annees.length < 2) return null
  return (
    <div role="group" aria-label={t("planning.annee.label")} className="inline-flex rounded-full bg-secondary p-[3px] gap-0.5">
      {annees.map((a) => (
        <button
          key={a}
          type="button"
          aria-pressed={a === annee}
          onClick={() => onChange(a)}
          className={`min-h-9 sm:min-h-8 px-3.5 rounded-full text-sm font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-150 cursor-pointer ${
            a === annee ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
