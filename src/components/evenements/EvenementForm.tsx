"use client"

// Formulaire d'un évènement (lot 6, ordre de la maquette du lot 6 bis) :
// nom, catégorie · public, date · horaire, lieu, responsable, description,
// bannière, inscriptions (lien externe en tête, lot 11 ; sinon Automatique avec
// ouverture et fin, Ouvertes ou Fermées forcées,
// docs/spec-inscriptions-periode.md) ; les champs rares (fin
// de l'évènement, liens, places, sans compte) sous « Plus d'options ». Une
// « info » n'a ni date ni inscription : elle est épinglée et expire.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { ImagePlus, Trash2 } from "lucide-react"
import { compressImage } from "@/lib/utils/compressImage"
import { categoryLabel } from "@/lib/serviceColors"
import { poleDuPour } from "@/lib/access"
import { EVENEMENT_TYPES, type Evenement, type EvenementType } from "@/types/evenement"
import { ChoixInscriptions } from "@/components/evenements/ChoixInscriptions"
import { borneInscription, modeInscriptions } from "@/lib/evenements/agenda"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const MAX_IMAGES = 3
const MAX_TOTAL_CHARS = 750_000

export type EvenementValues = Omit<Evenement, "id" | "organisateurUid" | "organisateurNom" | "inscrits" | "createdAt" | "updatedAt">

export const EMPTY_EVENEMENT: EvenementValues = {
  titre: "", type: "loisir", pour: "eglise", date: "", heure: "", heureFin: "", dateFin: "", lieu: "", description: "",
  liens: [], images: [], placesMax: null, inscriptions: "auto", inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "", epingle: false, expiresAt: null,
}

/** « AAAA-MM-JJ » + « HH:MM » facultative ↔ « AAAA-MM-JJ[THH:MM] » ; sans jour, rien. */
const joindre = (jour: string, heure: string) => (jour ? (heure ? `${jour}T${heure}` : jour) : "")

/** Ouverture ou fin des inscriptions : un jour, une heure facultative, une aide. */
function Periode({ id, label, heureLabel, aide, value, onChange }: {
  id: string; label: string; heureLabel: string; aide: string; value: string; onChange: (v: string) => void
}) {
  const [jour = "", heure = ""] = value.split("T")
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <Input id={id} type="date" value={jour} onChange={(e) => onChange(joindre(e.target.value, heure))} />
        <Input type="time" aria-label={heureLabel} value={heure} disabled={!jour} onChange={(e) => onChange(joindre(jour, e.target.value))} />
      </div>
      <p className="text-xs text-muted-foreground">{aide}</p>
    </div>
  )
}

export function EvenementForm({ initial, pours, creation, inscrits = 0, onSubmit, onCancel }: {
  initial: EvenementValues
  /** Publics que la personne peut viser (« eglise » et/ou des sections). */
  pours: string[]
  /** À la création : bouton « Créer » et case « Prévenir les membres ». */
  creation: boolean
  /** Inscrits déjà comptés par l'app : ils interdisent le lien externe (lot 11). */
  inscrits?: number
  onSubmit: (values: EvenementValues, prevenir: boolean) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState<EvenementValues>({ ...initial, pour: pours.includes(initial.pour) ? initial.pour : (pours[0] as EvenementValues["pour"]) })
  const [prevenir, setPrevenir] = useState(initial.type !== "eglise")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const info = v.type === "info"
  // Réunion de pôle (lot 7) : pas d'inscriptions.
  const reunion = poleDuPour(v.pour) !== null
  const sansInscription = { inscriptions: "fermees" as const, inscriptionDebut: "", inscriptionFin: "", sansCompte: false, placesMax: null, lienExterne: "" }
  const mode = modeInscriptions(v)
  // Lien externe (lot 11) : l'inscription se passe ailleurs, le reste du bloc
  // ne s'applique plus (docs/spec-inscription-externe.md).
  const externe = v.lienExterne.trim() !== ""
  const set = (patch: Partial<EvenementValues>) => setV((x) => ({ ...x, ...patch }))
  // Listes au style des champs du site (fond gris, sans bord), libellés
  // discrets comme la maquette (retour du 17/09/2026).
  const field = "w-full h-10 rounded-lg border border-transparent bg-secondary px-3 text-base md:text-sm"
  const LABEL = "text-sm text-muted-foreground"

  function setType(type: EvenementType) {
    set({ type, ...(type === "info" ? { date: "", heure: "", heureFin: "", dateFin: "", ...sansInscription } : {}) })
    setPrevenir(type !== "eglise")
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return
    setError(""); setCompressing(true)
    try {
      const next = [...v.images]
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES) break
        const compressed = await compressImage(file)
        if (next.reduce((n, i) => n + i.length, 0) + compressed.length > MAX_TOTAL_CHARS) { setError(t("annonces.form.errorImages")); break }
        next.push(compressed)
      }
      set({ images: next })
    } catch (e) {
      setError(e instanceof Error ? e.message : t("annonces.form.errorImageAdd"))
    } finally {
      setCompressing(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.titre.trim()) { setError(t("evenements.form.errorTitre")); return }
    if (!info && !v.date) { setError(t("evenements.form.errorDate")); return }
    if (!info && v.dateFin && v.dateFin < v.date) { setError(t("evenements.form.errorDateFin")); return }
    if (mode === "auto" && v.inscriptionDebut && v.inscriptionFin
      && borneInscription(v.inscriptionFin, "23:59") < borneInscription(v.inscriptionDebut, "00:00")) {
      setError(t("evenements.form.errorInsFin")); return
    }
    for (const l of v.liens) {
      if (l.url.trim() && !/^https?:\/\//i.test(l.url.trim())) { setError(t("annonces.form.errorLink", { url: l.url })); return }
    }
    if (externe && !/^https?:\/\//i.test(v.lienExterne.trim())) { setError(t("annonces.form.errorLink", { url: v.lienExterne })); return }
    // Une seule porte d'inscription à la fois : des places déjà prises dans
    // l'app ne se perdent pas au profit d'un formulaire externe.
    if (externe && inscrits > 0) { setError(t("evenements.form.lienExterneOccupe", { count: inscrits })); return }
    setBusy(true); setError("")
    try {
      await onSubmit({
        ...v,
        titre: v.titre.trim(), lieu: v.lieu.trim(), description: v.description.trim(), contact: v.contact.trim(),
        liens: v.liens.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.url),
        lienExterne: v.lienExterne.trim(),
        expiresAt: info ? v.expiresAt || null : null,
        // Hors automatique, les dates ne servent pas : on ne les garde pas.
        inscriptions: mode,
        inscriptionDebut: mode === "auto" ? v.inscriptionDebut ?? "" : "",
        inscriptionFin: mode === "auto" ? v.inscriptionFin ?? "" : "",
        epingle: info ? v.epingle : false,
        ...(reunion ? sansInscription : {}),
      }, creation && prevenir)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("evenements.form.errorSave"))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-labelledby="evenement-form-title">
      <h2 id="evenement-form-title" className="text-base font-bold">{creation ? t("evenements.nouveau") : t("evenements.modifier")}</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div data-testid="form-carte" className="divide-y divide-border rounded-2xl bg-card">
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <label htmlFor="ev-titre" className={LABEL}>{t("evenements.form.titre")}</label>
          <Input id="ev-titre" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="ev-type" className={LABEL}>{t("evenements.form.type")}</label>
            <select id="ev-type" className={field} value={v.type} onChange={(e) => setType(e.target.value as EvenementType)}>
              {EVENEMENT_TYPES.map((x) => <option key={x} value={x}>{t(`evenements.types.${x}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="ev-pour" className={LABEL}>{t("evenements.form.pour")}</label>
            <select id="ev-pour" className={field} value={v.pour}
              onChange={(e) => set({ pour: e.target.value as EvenementValues["pour"], ...(poleDuPour(e.target.value) ? sansInscription : {}) })}>
              {pours.map((p) => {
                const pole = poleDuPour(p)
                return <option key={p} value={p}>{p === "eglise" ? t("evenements.pourEglise") : pole ? t("evenements.pourPole", { pole: t(`taches.pole.${pole}`) }) : categoryLabel(p)}</option>
              })}
            </select>
          </div>
        </div>

        {!info && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="ev-date" className={LABEL}>{t("evenements.form.date")}</label>
              <Input id="ev-date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label htmlFor="ev-heure" className={LABEL}>{t("evenements.form.heure")}</label>
              <Input id="ev-heure" type="time" value={v.heure} onChange={(e) => set({ heure: e.target.value })} />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="ev-lieu" className={LABEL}>{t("evenements.form.lieu")}</label>
          <Input id="ev-lieu" value={v.lieu} maxLength={120} onChange={(e) => set({ lieu: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label htmlFor="ev-contact" className={LABEL}>{t("evenements.form.contact")}</label>
          <Input id="ev-contact" value={v.contact} maxLength={80} placeholder={t("evenements.form.contactHint")} onChange={(e) => set({ contact: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label htmlFor="ev-description" className={LABEL}>{t("evenements.form.description")}</label>
          <Textarea id="ev-description" value={v.description} rows={4} maxLength={4000} onChange={(e) => set({ description: e.target.value })} />
        </div>
      </div>

      {/* Bannière : la première image ; jusqu'à trois. */}
      <div className="space-y-2 p-4">
        {v.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {v.images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={`w-full rounded-lg object-cover ${i === 0 ? "col-span-3 aspect-[16/9]" : "h-24"}`} />
                <button type="button" aria-label={t("evenements.form.removeImage")} className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
                  onClick={() => set({ images: v.images.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        {v.images.length < MAX_IMAGES && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ImagePlus className="h-5 w-5" aria-hidden />
            {compressing ? t("common.loading") : v.images.length === 0 ? t("evenements.form.banniere") : t("evenements.form.addImage")}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
          </label>
        )}
      </div>

      {!info && !reunion && (
        <div className="space-y-3 px-4 py-3.5">
          {/* Lot 11 : le lien externe est en tête, c'est lui qui décide si le reste s'applique. */}
          <div className="space-y-1">
            <label htmlFor="ev-lien-externe" className={LABEL}>{t("evenements.form.lienExterne")}</label>
            <Input id="ev-lien-externe" type="url" value={v.lienExterne} placeholder="https://…" onChange={(e) => set({ lienExterne: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("evenements.form.lienExterneAide")}</p>
          </div>
          {!externe && (
            <>
              <div className="space-y-2">
                <p className="text-sm">{t("evenements.form.inscriptions")}</p>
                <ChoixInscriptions label={t("evenements.form.inscriptions")} mode={mode} onChange={(m) => set({ inscriptions: m })} />
                {mode !== "auto" && <p className="text-xs text-muted-foreground">{t(`evenements.form.modeAide.${mode}`)}</p>}
              </div>
              {mode === "auto" && (
                <>
                  <Periode id="ev-ins-debut" label={t("evenements.form.insDebut")} heureLabel={t("evenements.form.insDebutHeure")}
                    aide={t("evenements.form.insDebutAide")} value={v.inscriptionDebut ?? ""} onChange={(x) => set({ inscriptionDebut: x })} />
                  <Periode id="ev-ins-fin" label={t("evenements.form.insFin")} heureLabel={t("evenements.form.insFinHeure")}
                    aide={t("evenements.form.insFinAide")} value={v.inscriptionFin ?? ""} onChange={(x) => set({ inscriptionFin: x })} />
                </>
              )}
            </>
          )}
        </div>
      )}

      {creation && (
        <label htmlFor="ev-prevenir" className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm">
          {t("evenements.form.prevenir")}
          <Switch id="ev-prevenir" checked={prevenir} onCheckedChange={setPrevenir} />
        </label>
      )}

      {info && (
        <div className="space-y-3 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={v.epingle} onChange={(e) => set({ epingle: e.target.checked })} />
            {t("evenements.form.epingle")}
          </label>
          <div className="space-y-1">
            <label htmlFor="ev-expires" className={LABEL}>{t("evenements.form.expiresAt")}</label>
            <Input id="ev-expires" type="date" value={v.expiresAt ?? ""} onChange={(e) => set({ expiresAt: e.target.value || null })} />
          </div>
        </div>
      )}

      <details>
        <summary className="cursor-pointer px-4 py-3.5 text-sm text-foreground">{t("evenements.form.plusOptions")}</summary>
        <div className="space-y-4 border-t border-border p-4">
          {!info && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="ev-heure-fin" className={LABEL}>{t("evenements.form.heureFin")}</label>
                <Input id="ev-heure-fin" type="time" value={v.heureFin} onChange={(e) => set({ heureFin: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="ev-date-fin" className={LABEL}>{t("evenements.form.dateFin")}</label>
                <Input id="ev-date-fin" type="date" value={v.dateFin} onChange={(e) => set({ dateFin: e.target.value })} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className={LABEL}>{t("annonces.form.links")}</p>
            {v.liens.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input aria-label={t("evenements.form.lienLabel")} value={l.label} placeholder={t("evenements.form.lienLabel")}
                  onChange={(e) => { const liens = [...v.liens]; liens[i] = { ...liens[i], label: e.target.value }; set({ liens }) }} />
                <Input aria-label={t("evenements.form.lienUrl")} value={l.url} placeholder="https://…"
                  onChange={(e) => { const liens = [...v.liens]; liens[i] = { ...liens[i], url: e.target.value }; set({ liens }) }} />
                <Button type="button" variant="ghost" size="sm" aria-label={t("evenements.form.removeLink")} onClick={() => set({ liens: v.liens.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set({ liens: [...v.liens, { label: "", url: "" }] })}>{t("evenements.form.addLink")}</Button>
          </div>

          {/* Lot 11 : avec un lien externe, ces réglages restent là mais ne
              servent plus — retirer le lien rend l'ancien réglage. */}
          {!info && !reunion && (
            <div className={`space-y-3 ${externe ? "opacity-60" : ""}`}>
              {externe && <p className="text-xs text-muted-foreground">{t("evenements.form.placesExterne")}</p>}
              <div className="space-y-1">
                <label htmlFor="ev-places" className={LABEL}>{t("evenements.form.places")}</label>
                <Input id="ev-places" type="number" min={1} max={999} value={v.placesMax ?? ""} placeholder={t("evenements.form.placesHint")} disabled={externe}
                  onChange={(e) => set({ placesMax: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={v.sansCompte} disabled={externe} onChange={(e) => set({ sansCompte: e.target.checked })} />
                {t("evenements.form.sansCompte")}
              </label>
            </div>
          )}
        </div>
      </details>

      <div className="space-y-1 p-4">
        <Button type="submit" size="lg" disabled={busy || compressing} className="w-full">
          {creation ? t("evenements.form.create") : t("evenements.form.save")}
        </Button>
        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>{t("evenements.form.cancel")}</Button>
      </div>
      </div>
    </form>
  )
}
