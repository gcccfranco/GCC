"use client"

import { useTranslation } from "react-i18next"
import { OngletsRail } from "@/components/layout/Onglets"

// Sélecteur d'année du planning (lot U2, docs/spec-planning-2027.md) : « 2026 · 2027 ».
// Agencement v18 (B7) : un rail, comme T1–T4, dans la rangée de la grille. Une seule
// année visible : rien à choisir, rien d'affiché (un membre en 2026).

export function AnneeSelecteur({ annees, annee, onChange }: {
  annees: readonly number[]
  annee: number
  onChange: (annee: number) => void
}) {
  const { t } = useTranslation()
  if (annees.length < 2) return null
  return (
    <OngletsRail
      etiquette={t("planning.annee.label")}
      onglets={annees.map((a) => ({ id: String(a), label: <span className="tabular-nums">{a}</span> }))}
      actif={String(annee)}
      choisir={(id) => onChange(Number(id))}
    />
  )
}
