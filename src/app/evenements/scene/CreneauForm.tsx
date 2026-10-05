"use client"

// Feuille d'un créneau sur scène. Lot U1 (docs/spec-scene-saison.md, planche
// scene-reserver-feuille-telephone) : plus d'heure à taper. « Réserver »
// rappelle le jour et le créneau pris dans la grille (« Dimanche 11 octobre ·
// 15:00 – 16:00 ») ; « Modifier » ou « Déplacer » proposent les créneaux libres
// de la saison, jour par jour (le créneau actuel compris). Puis quoi (un), qui
// (un ou plusieurs, limité aux groupes permis), note.

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { CalendarClock, Check } from "lucide-react"
import { QUI, QUOI } from "@/types/programme"
import type { Place } from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { titreDuJour } from "./libelles"

const COLOR = PLANNING_COLORS.scene

export type CreneauValues = {
  dimanche: string
  debut: string
  fin: string
  quoi: string
  qui: string[]
  note: string
}

/** Cases « Qui » (un ou plusieurs) de l'ordre de passage. */
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

/** Une pastille de la feuille : case ou bouton radio posé sur toute la
 *  pastille (invisible), coche dessinée quand elle est choisie. */
function Pastille({ type, name, label, checked, onChange }: {
  type: "radio" | "checkbox"
  name: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      className={`relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${checked ? "svc-ink" : "bg-card text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))]"}`}
      style={checked ? { "--svc": COLOR, background: `${COLOR}1a`, boxShadow: `inset 0 0 0 1.5px ${COLOR}` } as CSSProperties : undefined}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="absolute inset-0 cursor-pointer opacity-0" />
      {checked && <Check className="h-4 w-4" aria-hidden />}
      {label}
    </label>
  )
}

function Groupe({ legende, children }: { legende: ReactNode; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{legende}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

const cle = (p: { debut: string; fin: string }) => `${p.debut}-${p.fin}`

type Props = {
  open: boolean
  title: string
  /** Libellé du bouton plein : « Réserver », ou « Enregistrer » pour modifier. */
  submitLabel: string
  /** Nouvelle réservation : le créneau choisi dans la grille, rappelé en tête. */
  place?: Place
  /** Modifier ou déplacer : les créneaux proposés, jour par jour. */
  places?: Place[]
  initial: CreneauValues
  quiOptions: readonly string[]
  /** « Qui » limité par la saison : la légende le dit. */
  quiLimite?: boolean
  /** Renvoie un message d'erreur, ou null si le créneau est enregistré. */
  onSubmit: (values: CreneauValues) => Promise<string | null>
  onCancel: () => void
}

/** La feuille (en bas sur téléphone, centrée et étroite au-delà, comme les tâches). */
export function CreneauForm({ open, title, onCancel, ...champs }: Props) {
  useStandaloneScrollLock(open)
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onCancel()}>
      <DrawerContent className="max-h-[92vh] md:max-w-lg md:mx-auto" aria-describedby={undefined}>
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>
        </DrawerHeader>
        <Champs {...champs} onCancel={onCancel} />
      </DrawerContent>
    </Drawer>
  )
}

function Champs({ submitLabel, place, places, initial, quiOptions, quiLimite, onSubmit, onCancel }: Omit<Props, "open" | "title">) {
  const { t, i18n } = useTranslation()
  const [v, setV] = useState<CreneauValues>(initial)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const select = "w-full h-11 rounded-xl bg-secondary px-3 text-base md:text-sm"
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
    <form onSubmit={submit} className="px-4 pb-6 space-y-4 overflow-y-auto">
      {place && (
        <p className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-semibold svc-ink"
          style={{ "--svc": COLOR, background: `${COLOR}1a` } as CSSProperties}>
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
          {t("planning.saison.place", { jour: titreDuJour(place.jour, i18n.language), debut: place.debut, fin: place.fin })}
        </p>
      )}
      {places && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="creneau-jour" className="text-[13px] font-semibold text-muted-foreground">{t("planning.saison.jour")}</label>
            <select id="creneau-jour" className={select} value={v.dimanche} onChange={(e) => choisirJour(e.target.value)}>
              {jours.map((d) => <option key={d} value={d}>{titreDuJour(d, i18n.language)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="creneau-place" className="text-[13px] font-semibold text-muted-foreground">{t("planning.saison.creneau")}</label>
            <select id="creneau-place" className={select} value={cle(v)} onChange={(e) => choisirCreneau(e.target.value)}>
              {duJour.map((p) => <option key={cle(p)} value={cle(p)}>{p.debut} – {p.fin}</option>)}
            </select>
          </div>
        </div>
      )}
      <Groupe legende={t("planning.programme.quoi")}>
        {QUOI.map((q) => (
          <Pastille key={q} type="radio" name="creneau-quoi" label={q} checked={v.quoi === q} onChange={() => setV({ ...v, quoi: q })} />
        ))}
      </Groupe>
      <Groupe legende={
        <>
          {t("planning.programme.qui")}
          {quiLimite && <span className="font-normal"> · {t("planning.saison.quiPermisTitre")}</span>}
        </>
      }>
        {quiOptions.map((q) => {
          const checked = v.qui.includes(q)
          return (
            <Pastille key={q} type="checkbox" name="creneau-qui" label={q} checked={checked}
              onChange={() => setV({ ...v, qui: checked ? v.qui.filter((x) => x !== q) : [...v.qui, q] })} />
          )
        })}
      </Groupe>
      <div className="space-y-2">
        <label htmlFor="creneau-note" className="text-[13px] font-semibold text-muted-foreground">{t("planning.programme.note")}</label>
        <Input id="creneau-note" className="h-11 rounded-xl" value={v.note} maxLength={120} placeholder={t("planning.programme.noteHint")} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="h-11" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
        <Button type="submit" disabled={busy} className="h-11 flex-1 text-white hover:opacity-90" style={{ background: COLOR }}>{submitLabel}</Button>
      </div>
    </form>
  )
}
