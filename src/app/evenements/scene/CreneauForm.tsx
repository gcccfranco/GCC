"use client"

// Formulaire d'un créneau sur scène (création ou modification) : dimanche à
// venir, début et fin au quart d'heure, quoi (un), qui (un ou plusieurs), note.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { QUI, QUOI } from "@/types/programme"
import { fdLongL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type CreneauValues = {
  dimanche: string
  debut: string
  fin: string
  quoi: string
  qui: string[]
  note: string
}

const quarter = (t: string) => /^\d{2}:\d{2}$/.test(t) && Number(t.slice(3)) % 15 === 0

/** Cases « Qui » (un ou plusieurs), partagées par les créneaux et les passages. */
export function QuiChecklist({ value, onChange }: { value: string[]; onChange: (qui: string[]) => void }) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold">{t("planning.programme.qui")}</legend>
      <div className="flex flex-wrap gap-2">
        {QUI.map((q) => {
          const checked = value.includes(q)
          return (
            <label key={q} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${checked ? "" : "bg-background border-border text-muted-foreground"}`}
              style={checked ? { background: `${PLANNING_COLORS.scene}15`, borderColor: PLANNING_COLORS.scene, color: PLANNING_COLORS.scene } : undefined}>
              <input type="checkbox" className="h-3.5 w-3.5" checked={checked}
                onChange={() => onChange(checked ? value.filter((x) => x !== q) : [...value, q])} />
              {q}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function CreneauForm({ title, dimanches, initial, onSubmit, onCancel }: {
  title: string
  /** Dimanches proposés (ISO), déjà limités à ceux à venir. */
  dimanches: string[]
  initial: CreneauValues
  /** Renvoie un message d'erreur, ou null si le créneau est enregistré. */
  onSubmit: (values: CreneauValues) => Promise<string | null>
  onCancel: () => void
}) {
  const { t, i18n } = useTranslation()
  const [v, setV] = useState<CreneauValues>(initial)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const select = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm"

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!quarter(v.debut) || !quarter(v.fin) || v.fin <= v.debut) { setError(t("planning.programme.invalidTime")); return }
    if (v.qui.length === 0) { setError(t("planning.programme.needQui")); return }
    setBusy(true); setError("")
    const err = await onSubmit({ ...v, note: v.note.trim() })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="bg-card shadow-soft rounded-xl p-4 space-y-3" aria-labelledby="creneau-form-title">
      <h3 id="creneau-form-title" className="text-sm font-bold">{title}</h3>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-1">
        <label htmlFor="creneau-dimanche" className="text-xs font-semibold">{t("planning.programme.dimanche")}</label>
        <select id="creneau-dimanche" className={select} value={v.dimanche} onChange={(e) => setV({ ...v, dimanche: e.target.value })}>
          {dimanches.map((d) => <option key={d} value={d}>{t("planning.programme.sunday", { date: fdLongL(d, i18n.language) })}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="creneau-debut" className="text-xs font-semibold">{t("planning.programme.debut")}</label>
          <Input id="creneau-debut" type="time" step={900} value={v.debut} onChange={(e) => setV({ ...v, debut: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <label htmlFor="creneau-fin" className="text-xs font-semibold">{t("planning.programme.fin")}</label>
          <Input id="creneau-fin" type="time" step={900} value={v.fin} onChange={(e) => setV({ ...v, fin: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="creneau-quoi" className="text-xs font-semibold">{t("planning.programme.quoi")}</label>
        <select id="creneau-quoi" className={select} value={v.quoi} onChange={(e) => setV({ ...v, quoi: e.target.value })}>
          {QUOI.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <QuiChecklist value={v.qui} onChange={(qui) => setV({ ...v, qui })} />
      <div className="space-y-1">
        <label htmlFor="creneau-note" className="text-xs font-semibold">{t("planning.programme.note")}</label>
        <Input id="creneau-note" value={v.note} maxLength={120} placeholder={t("planning.programme.noteHint")} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} style={{ background: PLANNING_COLORS.scene }}>{t("planning.programme.save")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
      </div>
    </form>
  )
}
