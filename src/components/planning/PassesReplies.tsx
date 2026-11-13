"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/**
 * Les dimanches passés d'un trimestre, repliés en une rangée de 44 px devant les dimanches à venir (plannings-7) :
 * « Petit déj » et « Prépa. Table du Seigneur ». Le pli s'ouvre par `grid-template-rows` (0fr → 1fr, ≈ 0,3 s,
 * sans rebond) ; sous `prefers-reduced-motion: reduce`, un simple fondu enchaîné. Fermée, la zone est `inert`
 * (ni focus, ni lecture). L'état ouvert est local, non mémorisé. `count` : le nombre de dimanches passés.
 */
export function PassesReplies({ count, children }: { count: number; children: ReactNode }) {
  const { t } = useTranslation()
  const [ouvert, setOuvert] = useState(false)
  const zone = useId()
  return (
    <div>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={zone}
        onClick={() => setOuvert((o) => !o)}
        className="flex min-h-11 w-full items-center gap-1.5 border-t border-border text-left text-sm text-muted-foreground"
      >
        <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none", ouvert && "rotate-90")} aria-hidden />
        {t("planning.petitDej.passes", { count })}
      </button>
      <div
        id={zone}
        inert={!ouvert}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-opacity motion-reduce:duration-200",
          ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr] motion-reduce:opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
