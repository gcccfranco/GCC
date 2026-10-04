"use client"

// Formulaire d'un créneau sur scène. Lot U1 : plus d'heure à taper. Une
// nouvelle réservation rappelle le jour et le créneau pris dans la grille
// (« Samedi 10 octobre · 10:00–11:00 ») ; « Modifier » propose les créneaux
// libres de la saison, jour par jour (le créneau actuel compris), pour déplacer.
// Puis quoi (un), qui (un ou plusieurs, limité aux groupes permis), note.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { QUI, QUOI } from "@/types/programme"
import type { Place } from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { titreDuJour } from "./libelles"

export type CreneauValues = {
  dimanche: string
  debut: string
  fin: string
  quoi: string
  qui: string[]
  note: string
}

/** Cases « Qui » (un ou plusieurs), partagées par les créneaux et les passages. */
export function QuiChecklist({ value, onChange, options = QUI }: {
  value: string[]
  onChange: (qui: string[]) => void
  /** Groupes proposés (lot U1 : ceux que « Qui peut réserver » permet). */
  options?: readonly string[]
}) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold">{t("planning.programme.qui")}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((q) => {
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

const cle = (p: { debut: string; fin: string }) => `${p.debut}-${p.fin}`

export function CreneauForm({ title, place, places, initial, quiOptions, onSubmit, onCancel }: {
  title: string
  /** Nouvelle réservation : le créneau choisi dans la grille, rappelé en tête. */
  place?: Place
  /** Modifier ou déplacer : les créneaux proposés, jour par jour. */
  places?: Place[]
  initial: CreneauValues
  quiOptions: readonly string[]
  /** Renvoie un message d'erreur, ou null si le créneau est enregistré. */
  onSubmit: (values: CreneauValues) => Promise<string | null>
  onCancel: () => void
}) {
  const { t, i18n } = useTranslation()
  const [v, setV] = useState<CreneauValues>(initial)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const select = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
  const jours = places ? [...new Set(places.map((p) => p.jour))] : []
  const duJour = places?.filter((p) => p.jour === v.dimanche) ?? []

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (v.qui.length === 0) { setError(t("planning.programme.needQui")); return }
    setBusy(true); setError("")
    const err = await onSubmit({ ...v, note: v.note.trim() })
    setBusy(false)
    if (err) setError(err)
  }

  function choisirJour(jour: string) {
    const premier = places?.find((p) => p.jour === jour)
    if (premier) setV({ ...v, dimanche: jour, debut: premier.debut, fin: premier.fin })
  }

  function choisirCreneau(valeur: string) {
    const p = duJour.find((x) => cle(x) === valeur)
    if (p) setV({ ...v, debut: p.debut, fin: p.fin })
  }

  return (
    <form onSubmit={submit} className="mt-2 bg-card shadow-soft rounded-xl p-4 space-y-3 text-left" aria-labelledby="creneau-form-title">
      <div>
        <h3 id="creneau-form-title" className="text-sm font-bold">{title}</h3>
        {place && (
          <p className="text-sm text-muted-foreground">
            {t("planning.saison.place", { jour: titreDuJour(place.jour, i18n.language), debut: place.debut, fin: place.fin })}
          </p>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {places && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="creneau-jour" className="text-xs font-semibold">{t("planning.saison.jour")}</label>
            <select id="creneau-jour" className={select} value={v.dimanche} onChange={(e) => choisirJour(e.target.value)}>
              {jours.map((d) => <option key={d} value={d}>{titreDuJour(d, i18n.language)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="creneau-place" className="text-xs font-semibold">{t("planning.saison.creneau")}</label>
            <select id="creneau-place" className={select} value={cle(v)} onChange={(e) => choisirCreneau(e.target.value)}>
              {duJour.map((p) => <option key={cle(p)} value={cle(p)}>{p.debut} – {p.fin}</option>)}
            </select>
          </div>
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="creneau-quoi" className="text-xs font-semibold">{t("planning.programme.quoi")}</label>
        <select id="creneau-quoi" className={select} value={v.quoi} onChange={(e) => setV({ ...v, quoi: e.target.value })}>
          {QUOI.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <QuiChecklist value={v.qui} options={quiOptions} onChange={(qui) => setV({ ...v, qui })} />
      <div className="space-y-1">
        <label htmlFor="creneau-note" className="text-xs font-semibold">{t("planning.programme.note")}</label>
        <Input id="creneau-note" value={v.note} maxLength={120} placeholder={t("planning.programme.noteHint")} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="text-white" style={{ background: PLANNING_COLORS.scene }}>{t("planning.programme.save")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
      </div>
    </form>
  )
}
