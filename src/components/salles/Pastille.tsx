"use client"

import type { CSSProperties } from "react"
import { Check } from "lucide-react"
import { PLANNING_COLORS } from "@/lib/serviceColors"

/** Une pastille de la feuille : case ou bouton radio posé sur toute la pastille (invisible), coche dessinée quand elle
 *  est choisie. */
export function Pastille({ type, name, label, checked, onChange, retire }: {
  type: "radio" | "checkbox"
  name: string
  label: string
  checked: boolean
  onChange: () => void
  /** Valeur sortie de la liste : grisée (la marque « retiré » est dans `label`). */
  retire?: boolean
}) {
  return (
    <label
      className={`relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${retire ? "opacity-60" : ""} ${checked ? "svc-ink" : "bg-card text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))]"}`}
      style={checked ? { "--svc": PLANNING_COLORS.scene, background: `${PLANNING_COLORS.scene}1a`, boxShadow: `inset 0 0 0 1.5px ${PLANNING_COLORS.scene}` } as CSSProperties : undefined}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="absolute inset-0 cursor-pointer opacity-0" />
      {checked && <Check className="h-4 w-4" aria-hidden />}
      {label}
    </label>
  )
}
