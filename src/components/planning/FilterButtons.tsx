"use client"

import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"

interface FilterButtonsProps {
  options: string[]
  active: string
  onChange: (v: string) => void
  className?: string
  color?: string
  /** Options à marquer « non publié » (cadenas) — visibles par les responsables uniquement. */
  unpublished?: readonly string[]
}

export function FilterButtons({ options, active, onChange, className, color, unpublished }: FilterButtonsProps) {
  const { t } = useTranslation()
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-none ${className ?? ""}`}>
      {options.map(opt => {
        const unpub = unpublished?.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            title={unpub ? t("planning.unpublishedTooltip") : undefined}
            className={`relative flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] ${
              opt === active
                ? color ? "text-white" : "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            style={opt === active && color ? { background: color } : undefined}
          >
            {opt}
            {unpub && <Lock className="h-3 w-3 opacity-70" />}
          </button>
        )
      })}
    </div>
  )
}
