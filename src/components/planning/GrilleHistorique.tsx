"use client"

import { History } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TOUCHER_44 } from "@/lib/toucher44";
import type { EntreeGrille } from "@/lib/firebase/planningHistorique"
import { phraseHistorique } from "@/lib/planning/grilleAffichage"
import type { DefinitionGrille } from "@/lib/planning/grilles"

/** L'historique nommé sous la grille (T6) : un bouton, puis la liste des dernières entrées. Sorti de
 *  `PlanningGrille` (lot N, N6b) ; `onBascule` ouvre ou ferme, et relit l'historique à l'ouverture. */
export function GrilleHistorique({
  definition,
  ouvert,
  entrees,
  onBascule,
}: {
  definition: DefinitionGrille
  ouvert: boolean
  entrees: EntreeGrille[]
  onBascule: () => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <div>
      <button
        onClick={onBascule}
        aria-expanded={ouvert}
        className={`${TOUCHER_44} inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground`}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        {t("planning.grille.historique")}
      </button>
      {ouvert && (
        <ul className="mt-2 space-y-1.5">
          {entrees.map((e) => (
            <li key={e.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
              <ul className="space-y-0.5">
                {e.changes.map((ch, i) => (
                  <li key={i}>{phraseHistorique(t, i18n.language, definition, e.authorName || t("setlists.history.someone"), ch)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
