"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bandeau } from "@/components/layout/Bandeau"

// Bandeau « Setlist mise à la corbeille — Annuler » (SC2.7, docs/spec-createur-corbeille-absences.md) :
// huit secondes, puis il se retire seul. « Annuler » rend la main à la page, qui restaure les setlists.
// Mêmes classes que `BanniereGeste` (planning).

const DUREE_MS = 8000

export function BandeauCorbeille({ count, onAnnuler, onFermer }: {
  count: number
  /** Restaure les setlists mises à la corbeille ; le bandeau est fermé par la page ensuite. */
  onAnnuler: () => Promise<void>
  onFermer: () => void
}) {
  const { t } = useTranslation()
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    const minuteur = window.setTimeout(onFermer, DUREE_MS)
    return () => window.clearTimeout(minuteur)
  }, [onFermer])

  return (
    <Bandeau ton="info" testId="bandeau-corbeille" className="mb-4">
      <div className="flex items-center gap-3">
      <p className="min-w-0 flex-1">{t("setlists.corbeille.bandeau", { count })}</p>
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          setEnCours(true)
          void onAnnuler().finally(() => setEnCours(false))
        }}
        className="inline-flex min-h-11 shrink-0 items-center px-2 font-semibold underline underline-offset-2 disabled:opacity-40"
      >
        {t("setlists.corbeille.annuler")}
      </button>
      </div>
    </Bandeau>
  )
}
