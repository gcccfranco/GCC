"use client"

// Formulaire d'un évènement (lot 6) : création, modification, duplication.
// Reprend les images compressées et les liens des annonces. Une « info »
// n'a ni date ni inscription : elle est épinglée et expire.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { ImagePlus, Trash2 } from "lucide-react"
import { compressImage } from "@/lib/utils/compressImage"
import { categoryLabel, PLANNING_COLORS } from "@/lib/serviceColors"
import { EVENEMENT_TYPES, type Evenement, type EvenementType } from "@/types/evenement"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const COLOR = PLANNING_COLORS.scene
const MAX_IMAGES = 3
const MAX_TOTAL_CHARS = 750_000

export type EvenementValues = Omit<Evenement, "id" | "organisateurUid" | "organisateurNom" | "inscrits" | "createdAt" | "updatedAt">

export const EMPTY_EVENEMENT: EvenementValues = {
  titre: "", type: "loisir", pour: "eglise", date: "", heure: "", heureFin: "", dateFin: "", lieu: "", description: "",
  liens: [], images: [], placesMax: null, inscriptionOuverte: true, sansCompte: false, contact: "", epingle: false, expiresAt: null,
}

export function EvenementForm({ initial, pours, creation, onSubmit, onCancel }: {
  initial: EvenementValues
  /** Publics que la personne peut viser (« eglise » et/ou des sections). */
  pours: string[]
  /** À la création : bouton « Créer » et case « Prévenir les membres ». */
  creation: boolean
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
  const set = (patch: Partial<EvenementValues>) => setV((x) => ({ ...x, ...patch }))
  const field = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm"

  function setType(type: EvenementType) {
    set({ type, ...(type === "info" ? { date: "", heure: "", heureFin: "", dateFin: "", placesMax: null, inscriptionOuverte: false, sansCompte: false } : {}) })
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
    for (const l of v.liens) {
      if (l.url.trim() && !/^https?:\/\//i.test(l.url.trim())) { setError(t("annonces.form.errorLink", { url: l.url })); return }
    }
    setBusy(true); setError("")
    try {
      await onSubmit({
        ...v,
        titre: v.titre.trim(), lieu: v.lieu.trim(), description: v.description.trim(), contact: v.contact.trim(),
        liens: v.liens.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.url),
        expiresAt: info ? v.expiresAt || null : null,
        epingle: info ? v.epingle : false,
      }, creation && prevenir)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("evenements.form.errorSave"))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-card shadow-soft rounded-xl p-4 space-y-4" aria-labelledby="evenement-form-title">
      <h2 id="evenement-form-title" className="text-base font-bold">{creation ? t("evenements.nouveau") : t("evenements.modifier")}</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1">
        <label htmlFor="ev-titre" className="text-xs font-semibold">{t("evenements.form.titre")}</label>
        <Input id="ev-titre" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="ev-type" className="text-xs font-semibold">{t("evenements.form.type")}</label>
          <select id="ev-type" className={field} value={v.type} onChange={(e) => setType(e.target.value as EvenementType)}>
            {EVENEMENT_TYPES.map((x) => <option key={x} value={x}>{t(`evenements.types.${x}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ev-pour" className="text-xs font-semibold">{t("evenements.form.pour")}</label>
          <select id="ev-pour" className={field} value={v.pour} onChange={(e) => set({ pour: e.target.value as EvenementValues["pour"] })}>
            {pours.map((p) => <option key={p} value={p}>{p === "eglise" ? t("evenements.pourEglise") : categoryLabel(p)}</option>)}
          </select>
        </div>
      </div>

      {!info && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="ev-date" className="text-xs font-semibold">{t("evenements.form.date")}</label>
            <Input id="ev-date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <label htmlFor="ev-heure" className="text-xs font-semibold">{t("evenements.form.heure")}</label>
            <Input id="ev-heure" type="time" value={v.heure} onChange={(e) => set({ heure: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="ev-heure-fin" className="text-xs font-semibold">{t("evenements.form.heureFin")}</label>
            <Input id="ev-heure-fin" type="time" value={v.heureFin} onChange={(e) => set({ heureFin: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="ev-date-fin" className="text-xs font-semibold">{t("evenements.form.dateFin")}</label>
            <Input id="ev-date-fin" type="date" value={v.dateFin} onChange={(e) => set({ dateFin: e.target.value })} />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="ev-lieu" className="text-xs font-semibold">{t("evenements.form.lieu")}</label>
        <Input id="ev-lieu" value={v.lieu} maxLength={120} onChange={(e) => set({ lieu: e.target.value })} />
      </div>

      <div className="space-y-1">
        <label htmlFor="ev-description" className="text-xs font-semibold">{t("evenements.form.description")}</label>
        <Textarea id="ev-description" value={v.description} rows={4} maxLength={4000} onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold">{t("annonces.form.links")}</p>
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

      <div className="space-y-2">
        <p className="text-xs font-semibold">{t("annonces.form.images")}</p>
        {v.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {v.images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="rounded-lg w-full h-24 object-cover" />
                <button type="button" aria-label={t("evenements.form.removeImage")} className="absolute top-1 right-1 rounded-full bg-background/90 p-1"
                  onClick={() => set({ images: v.images.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        {v.images.length < MAX_IMAGES && (
          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: COLOR }}>
            <ImagePlus className="h-4 w-4" /> {compressing ? t("common.loading") : t("evenements.form.addImage")}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
          </label>
        )}
      </div>

      {!info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="ev-places" className="text-xs font-semibold">{t("evenements.form.places")}</label>
            <Input id="ev-places" type="number" min={1} max={999} value={v.placesMax ?? ""} placeholder={t("evenements.form.placesHint")}
              onChange={(e) => set({ placesMax: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-2 pt-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={v.inscriptionOuverte} onChange={(e) => set({ inscriptionOuverte: e.target.checked })} />
              {t("evenements.form.ouverte")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={v.sansCompte} onChange={(e) => set({ sansCompte: e.target.checked })} />
              {t("evenements.form.sansCompte")}
            </label>
          </div>
        </div>
      )}

      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm pt-5">
            <input type="checkbox" className="h-4 w-4" checked={v.epingle} onChange={(e) => set({ epingle: e.target.checked })} />
            {t("evenements.form.epingle")}
          </label>
          <div className="space-y-1">
            <label htmlFor="ev-expires" className="text-xs font-semibold">{t("evenements.form.expiresAt")}</label>
            <Input id="ev-expires" type="date" value={v.expiresAt ?? ""} onChange={(e) => set({ expiresAt: e.target.value || null })} />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="ev-contact" className="text-xs font-semibold">{t("evenements.form.contact")}</label>
        <Input id="ev-contact" value={v.contact} maxLength={80} placeholder={t("evenements.form.contactHint")} onChange={(e) => set({ contact: e.target.value })} />
      </div>

      {creation && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} />
          {t("evenements.form.prevenir")}
        </label>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy || compressing} style={{ background: COLOR }}>
          {creation ? t("evenements.form.create") : t("evenements.form.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("evenements.form.cancel")}</Button>
      </div>
    </form>
  )
}
