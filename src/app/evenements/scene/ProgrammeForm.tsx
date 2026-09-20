"use client"

// Formulaire d'un programme de scène (création ou modification) : nom court
// (c'est le nom de l'onglet), jour J, début des réservations.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ProgrammeValues = { nom: string; jourJ: string; debut: string }

export function ProgrammeForm({ title, initial, submitLabel, onSubmit, onCancel }: {
  title: string
  initial: ProgrammeValues
  submitLabel: string
  onSubmit: (values: ProgrammeValues) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState<ProgrammeValues>(initial)
  const [busy, setBusy] = useState(false)
  const valid = v.nom.trim() && v.jourJ && v.debut && v.debut < v.jourJ

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try { await onSubmit({ nom: v.nom.trim(), jourJ: v.jourJ, debut: v.debut }) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="bg-card shadow-soft rounded-xl p-4 space-y-3" aria-labelledby="programme-form-title">
      <h3 id="programme-form-title" className="text-sm font-bold">{title}</h3>
      <div className="space-y-1">
        <label htmlFor="programme-nom" className="text-xs font-semibold">{t("planning.programmes.nom")}</label>
        <Input id="programme-nom" value={v.nom} maxLength={30} onChange={(e) => setV({ ...v, nom: e.target.value })} required />
        <p className="text-[11px] text-muted-foreground">{t("planning.programmes.nomHint")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="programme-jourj" className="text-xs font-semibold">{t("planning.programmes.jourJ")}</label>
          <Input id="programme-jourj" type="date" value={v.jourJ} onChange={(e) => setV({ ...v, jourJ: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <label htmlFor="programme-debut" className="text-xs font-semibold">{t("planning.programmes.debut")}</label>
          <Input id="programme-debut" type="date" value={v.debut} onChange={(e) => setV({ ...v, debut: e.target.value })} required />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{t("planning.programmes.debutHint")}</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !valid} style={{ background: PLANNING_COLORS.scene }}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t("planning.programmes.cancel")}</Button>}
      </div>
    </form>
  )
}
