"use client"

import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"

// Bandeau d'une année à venir (lot U2, planche bo-planning-2027) : « 2027 ·
// brouillon… » pour qui voit le brouillon d'un planning publié par trimestre,
// et « les 52 dimanches de 2027 sont déjà posés » pour un planning hebdomadaire.

export function BandeauAnnee({ annee, brouillon, dimanches }: {
  annee: number
  /** Planning publié par trimestre, vu par un responsable : le texte du brouillon. */
  brouillon: boolean
  /** Nombre de dimanches posés d'office (planning hebdomadaire), sinon null. */
  dimanches: number | null
}) {
  const { t } = useTranslation()
  if (!brouillon && dimanches === null) return null
  return (
    <p data-testid="bandeau-annee" className="flex gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm text-foreground">
      {brouillon && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      <span>
        {brouillon && <span className="font-semibold">{t("planning.annee.brouillon", { annee })} </span>}
        {dimanches !== null && t("planning.annee.poses", { annee, avant: annee - 1, n: dimanches })}
      </span>
    </p>
  )
}
