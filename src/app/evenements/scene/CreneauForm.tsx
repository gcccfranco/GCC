"use client"

// Feuille d'une réservation de la scène. Lot U1 (docs/spec-scene-saison.md), Pâques · Noël P6
// (docs/spec-scene-paques-noel.md, Q14, Q15) : quoi (un), qui (un ou plusieurs, limité aux groupes
// permis), note ; rien n'est coché d'avance, le bouton plein dit « Choisis quoi et qui » tant qu'il
// manque l'un ou l'autre. La liste « Qui » tient en dix valeurs (docs/spec-chants-fetes.md, CF3).
// Lot 5 de Salles (docs/spec-salles.md, AR22) : plus de créneaux fixes ; une seule feuille, celle
// de l'ancien « Un autre moment » : date, « de » et « à » au pas de 15 minutes, pré-remplis par la
// fenêtre libre touchée. Un chevauchement refusé s'affiche avec le message de Salles (SA8,
// `RefusSalle`) et « Décaler ».

import { langueCourte } from "@/lib/utils/formatDate";
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { QUI, QUOI } from "@/types/programme"
import { RefusSalle } from "@/components/salles/RefusSalle"
import type { Occupation } from "@/lib/salles/occupations"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { jourEnLettres } from "./libelles"
import { estQuiLibre, libelleQui, normaliserQui } from "@/lib/fetes/qui"
import { styleTexteService } from "@/lib/couleurSombre"

const COLOR = PLANNING_COLORS.scene

export type CreneauValues = {
  dimanche: string
  debut: string
  fin: string
  quoi: string
  qui: string[]
  note: string
}

/** Un chevauchement refusé (SA8) : ce qui prend la scène, et la première fenêtre de même durée après. */
export type RefusScene = { bloque: Occupation; decale: { debut: string; fin: string } | null }

/** Heures au pas de 15 minutes (SQ10) : « 00:00 » … « 23:45 ». */
const HEURES = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`)
const plus15 = (h: string) => HEURES[Math.min(95, HEURES.indexOf(h) + 1)]

/** Cases « Qui » (un ou plusieurs) de l'ordre de passage. Une valeur retirée de la liste (敬拜团,
 *  Jeunes, Chorale) encore présente dans le passage reste affichée, cochée et grisée « retiré », pour
 *  que la coordination la décoche ; elle n'est plus proposée à un nouveau passage (CF3). */
export function QuiChecklist({ value, onChange }: { value: string[]; onChange: (qui: string[]) => void }) {
  const { t, i18n } = useTranslation()
  const langue = langueCourte(i18n.language)
  const retires = value.filter((q) => !(QUI as readonly string[]).includes(q) && !estQuiLibre(q))
  const libre = value.find(estQuiLibre)
  const [autre, setAutre] = useState(libre !== undefined)
  const [texte, setTexte] = useState(libre ?? "")
  const emet = (base: string[], a: boolean, tx: string) => {
    const n = a ? normaliserQui(tx) : ""
    onChange(n && !base.includes(n) ? [...base, n] : base)
  }
  const sansLibre = value.filter((q) => !estQuiLibre(q))
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold">{t("planning.programme.qui")}</legend>
      <div className="flex flex-wrap gap-2">
        {[...QUI, ...retires].map((q) => {
          const checked = value.includes(q)
          const retire = retires.includes(q)
          return (
            <label key={q} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${checked ? "texte-service" : "bg-background border-border text-muted-foreground"} ${retire ? "opacity-60" : ""}`}
              style={checked ? { background: `${PLANNING_COLORS.scene}15`, borderColor: PLANNING_COLORS.scene, ...styleTexteService(PLANNING_COLORS.scene) } : undefined}>
              <input type="checkbox" className="h-3.5 w-3.5" checked={checked}
                onChange={() => onChange(checked ? value.filter((x) => x !== q) : [...value, q])} />
              {libelleQui(q, langue)}
              {retire && <span className="font-normal"> · {t("planning.programme.quiRetire")}</span>}
            </label>
          )
        })}
        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${autre ? "texte-service" : "bg-background border-border text-muted-foreground"}`}
          style={autre ? { background: `${PLANNING_COLORS.scene}15`, borderColor: PLANNING_COLORS.scene, ...styleTexteService(PLANNING_COLORS.scene) } : undefined}>
          <input type="checkbox" className="h-3.5 w-3.5" checked={autre}
            onChange={() => { setAutre(!autre); emet(sansLibre, !autre, texte) }} />
          {t("planning.programme.quiAutre")}
        </label>
      </div>
      {autre && (
        <Input className="h-11 rounded-xl" value={texte} maxLength={40} aria-label={t("planning.programme.quiAutreChamp")}
          placeholder={t("planning.programme.quiAutreChamp")}
          onChange={(e) => { setTexte(e.target.value); emet(sansLibre, true, e.target.value) }} />
      )}
    </fieldset>
  )
}

/** Une pastille de la feuille : case ou bouton radio posé sur toute la
 *  pastille (invisible), coche dessinée quand elle est choisie. */
function Pastille({ type, name, label, checked, onChange, retire }: {
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
      <legend className="mb-2 text-sm font-semibold text-muted-foreground">{legende}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

type Props = {
  open: boolean
  title: string
  /** Libellé du bouton plein : « Réserver », ou « Enregistrer » pour modifier. */
  submitLabel: string
  initial: CreneauValues
  quiOptions: readonly string[]
  /** « Qui » limité par la saison : la légende le dit. */
  quiLimite?: boolean
  /** « Autre… » (SQ5) : montrée à tous sans limite, sinon à qui passe outre « Qui peut réserver ». */
  quiAutre?: boolean
  /** La période de la saison : la date se choisit entre `min` et `max`. */
  periode: { min: string; max: string }
  /** Renvoie un message d'erreur, un refus de chevauchement, ou null si la réservation est enregistrée. */
  onSubmit: (values: CreneauValues) => Promise<string | RefusScene | null>
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

function Champs({ submitLabel, initial, quiOptions, quiLimite, quiAutre, periode, onSubmit, onCancel }: Omit<Props, "open" | "title">) {
  const { t, i18n } = useTranslation()
  const langue = langueCourte(i18n.language)
  const libreInitial = initial.qui.find(estQuiLibre)
  const [v, setV] = useState<CreneauValues>({ ...initial, qui: initial.qui.filter((q) => !estQuiLibre(q)) })
  const [autre, setAutre] = useState(libreInitial !== undefined)
  const [texte, setTexte] = useState(libreInitial ?? "")
  const libre = autre ? normaliserQui(texte) : ""
  const quiFinal = libre && !v.qui.includes(libre) ? [...v.qui, libre] : v.qui
  const [error, setError] = useState("")
  // Le refus se montre tant que le moment n'a pas changé.
  const [refus, setRefus] = useState<(RefusScene & { cle: string }) | null>(null)
  const cleMoment = `${v.dimanche}|${v.debut}|${v.fin}`
  const [busy, setBusy] = useState(false)
  // La date d'origine d'une modification n'est pas bornée (saison raccourcie, jour passé) : ni le message, ni la validation native.
  const dateGardee = v.dimanche === initial.dimanche
  const horsPeriode = v.dimanche !== "" && !dateGardee && (v.dimanche < periode.min || v.dimanche > periode.max)
  const pret = v.dimanche !== "" && !horsPeriode && v.quoi !== "" && quiFinal.length > 0 && (!autre || libre !== "")

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pret) return
    setBusy(true); setError(""); setRefus(null)
    const err = await onSubmit({ ...v, qui: quiFinal, note: v.note.trim() })
    setBusy(false)
    if (typeof err === "string") setError(err)
    else if (err) setRefus({ ...err, cle: cleMoment })
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
              <label className="space-y-1 text-sm font-semibold text-muted-foreground">
                {t("planning.saison.autreDate")}
                <Input type="date" aria-label={t("planning.saison.autreDate")} className="h-11 rounded-xl" value={v.dimanche} min={dateGardee ? undefined : periode.min} max={dateGardee ? undefined : periode.max}
                  onChange={(e) => setV({ ...v, dimanche: e.target.value })} />
              </label>
              <label className="space-y-1 text-sm font-semibold text-muted-foreground">
                {t("planning.saison.autreDe")}
                <ChampSelect classeConteneur="w-28" aria-label={t("planning.saison.autreDe")} value={v.debut}
                  onChange={(e) => setV({ ...v, debut: e.target.value, fin: v.fin > e.target.value ? v.fin : plus15(e.target.value) })}>
                  {HEURES.slice(0, 95).map((h) => <option key={h} value={h}>{h}</option>)}
                </ChampSelect>
              </label>
              <label className="space-y-1 text-sm font-semibold text-muted-foreground">
                {t("planning.saison.autreA")}
                <ChampSelect classeConteneur="w-28" aria-label={t("planning.saison.autreA")} value={v.fin}
                  onChange={(e) => setV({ ...v, fin: e.target.value })}>
                  {HEURES.filter((h) => h > v.debut).map((h) => <option key={h} value={h}>{h}</option>)}
                </ChampSelect>
              </label>
            </div>
            {horsPeriode && (
              <p role="alert" className="text-sm text-destructive">
                {t("planning.saison.autreHorsPeriode", { debut: jourEnLettres(periode.min, i18n.language), fin: jourEnLettres(periode.max, i18n.language) })}
              </p>
            )}
            {refus && refus.cle === cleMoment && (
              <RefusSalle salle="scene" bloque={refus.bloque} libres={[]} decale={refus.decale} langue={langue === "zh" ? "zh" : "fr"}
                decaler={(p) => setV({ ...v, debut: p.debut, fin: p.fin })} choisir={() => undefined} />
            )}
          </div>
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
            {quiOptions.filter((q) => !estQuiLibre(q)).map((q) => {
              const checked = v.qui.includes(q)
              const retire = !(QUI as readonly string[]).includes(q)
              return (
                <Pastille key={q} type="checkbox" name="creneau-qui" retire={retire}
                  label={retire ? `${libelleQui(q, langue)} · ${t("planning.programme.quiRetire")}` : libelleQui(q, langue)} checked={checked}
                  onChange={() => setV({ ...v, qui: checked ? v.qui.filter((x) => x !== q) : [...v.qui, q] })} />
              )
            })}
            {quiAutre && <Pastille type="checkbox" name="creneau-qui" label={t("planning.programme.quiAutre")} checked={autre} onChange={() => setAutre(!autre)} />}
          </Groupe>
          {quiAutre && autre && (
            <Input className="h-11 rounded-xl" value={texte} maxLength={40} aria-label={t("planning.programme.quiAutreChamp")}
              placeholder={t("planning.programme.quiAutreChamp")} onChange={(e) => setTexte(e.target.value)} />
          )}
          <div className="space-y-2">
            <label htmlFor="creneau-note" className="text-sm font-semibold text-muted-foreground">
              {t("planning.programme.note")}<span className="font-normal"> · {t("planning.saison.facultatif")}</span>
            </label>
            <Input id="creneau-note" className="h-11 rounded-xl" value={v.note} maxLength={120} placeholder={t("planning.programme.noteHint")} onChange={(e) => setV({ ...v, note: e.target.value })} />
          </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="h-11" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
        {/* Inactif : gris, comme la planche ; prêt : plein, de la couleur de la scène. */}
        <Button type="submit" disabled={busy || !pret}
          className={`h-11 flex-1 ${pret ? "text-white hover:opacity-90" : "bg-secondary text-muted-foreground disabled:opacity-100"}`}
          style={pret ? { background: COLOR } : undefined}>
          {pret ? submitLabel : t("planning.saison.choisisQuoiQui")}
        </Button>
      </div>
    </form>
  )
}
