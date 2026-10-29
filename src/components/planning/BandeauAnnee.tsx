"use client"

import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Bandeau } from "@/components/layout/Bandeau"

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
    <Bandeau
      ton="info"
      testId="bandeau-annee"
      icone={brouillon ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : undefined}
    >
      {brouillon && <span className="font-semibold">{t("planning.annee.brouillon", { annee })} </span>}
      {dimanches !== null && t("planning.annee.poses", { annee, avant: annee - 1, n: dimanches })}
    </Bandeau>
  )
}
