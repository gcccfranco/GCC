"use client"

// Formulaire d'un évènement (lot 6, ordre de la maquette du lot 6 bis) :
// nom, catégorie · public, date · horaire, lieu, responsable, description,
// bannière, inscriptions (lien externe en tête, lot 11 ; sinon Automatique avec
// ouverture et fin, Ouvertes ou Fermées forcées,
// docs/spec-inscriptions-periode.md) ; les champs rares (fin
// de l'évènement, liens, places, sans compte) sous « Plus d'options ». Une
// « info » n'a ni date ni inscription : elle est épinglée et expire.
// Corrections du design (bo-reunions-taches-8, -13) : en mode réunion, le même formulaire parle de réunion
// (« Nom de la réunion », « Équipe », ni « Catégorie », bannière sous « Plus d'options », « Créer la réunion ») ;
// libellés par `Champ` (13 px semi-gras gris), champs de 44 px. Depuis le 08/11/2026, une réunion a son propre
// formulaire (`ReunionForm`) : les pages de réunion n'arrivent plus ici, ce mode ne sert plus qu'à un cas limite.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, ImagePlus, Trash2 } from "lucide-react"
import { compressImage } from "@/lib/utils/compressImage"
import { categoryLabel } from "@/lib/serviceColors"
import { equipeDuPour, estReunion, publicDeReunion } from "@/lib/access"
import { cleNomEquipe } from "@/lib/equipes/table"
import { EVENEMENT_TYPES, type Evenement, type EvenementType } from "@/types/evenement"
import { ChoixInscriptions } from "@/components/evenements/ChoixInscriptions"
import { borneInscription, modeInscriptions } from "@/lib/evenements/agenda"
import { dansLeSheet, dernierJourDuSheet } from "@/lib/evenements/bascule"
import { lienOngletSheet } from "@/lib/evenements/sheet"
import { Button } from "@/components/ui/button"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const MAX_IMAGES = 3
// Une réunion (lot U6, relecture) a toujours une date : jamais « Info » (sujets jusqu'au début,
// rappel de la veille, réunions précédentes). Elle prend « Église » si elle était une info.
const TYPE_REUNION: EvenementType = "eglise"
const MAX_TOTAL_CHARS = 750_000
// Le champ date de Chrome laisse taper une année à cinq chiffres, que le calendrier (lot U8)
// et le déplacement ne savent pas lire : on la borne.
const DATE_MAX = "9999-12-31"

export type EvenementValues = Omit<Evenement, "id" | "organisateurUid" | "organisateurNom" | "inscrits" | "createdAt" | "updatedAt" | "compteRendu">

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
    <Champ id={id} label={label}>
      <div className="grid grid-cols-2 gap-3">
        <Input id={id} className="h-11" type="date" max={DATE_MAX} value={jour} onChange={(e) => onChange(joindre(e.target.value, heure))} />
        <Input className="h-11" type="time" aria-label={heureLabel} value={heure} disabled={!jour} onChange={(e) => onChange(joindre(jour, e.target.value))} />
      </div>
      <p className="text-xs text-muted-foreground">{aide}</p>
    </Champ>
  )
}

export function EvenementForm({ initial, pours, creation, inscrits = 0, titreCache = false, onSubmit, onCancel }: {
  initial: EvenementValues
  /** Publics que la personne peut viser (« eglise » et/ou des sections). */
  pours: string[]
  /** À la création : bouton « Créer » et case « Prévenir les membres ». */
  creation: boolean
  /** Inscrits déjà comptés par l'app : ils interdisent le lien externe (lot 11). */
  inscrits?: number
  /** Le titre de la page le dit déjà (agencement v18 : en-tête commun d'une page de formulaire). */
  titreCache?: boolean
  onSubmit: (values: EvenementValues, prevenir: boolean) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState<EvenementValues>(() => {
    const pour = pours.includes(initial.pour) ? initial.pour : (pours[0] as EvenementValues["pour"])
    return { ...initial, pour, ...(estReunion({ ...initial, pour }) && initial.type === "info" ? { type: TYPE_REUNION } : {}) }
  })
  const [prevenir, setPrevenir] = useState(initial.type !== "eglise")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const info = v.type === "info"
  // Réunion d'équipe (lot U6, R4) : pas d'inscriptions. Un évènement d'équipe (`reunion: false`,
  // « Nouvel évènement », lot E) en a, comme un évènement de l'assemblée.
  const reunion = estReunion(v)
  // Un évènement d'équipe ne se voit que de ses membres : pas d'inscription sans compte
  // (la route la refuse, retouches v18, E6).
  const reserve = publicDeReunion(v.pour)
  const sansInscription = { inscriptions: "fermees" as const, inscriptionDebut: "", inscriptionFin: "", sansCompte: false, placesMax: null, lienExterne: "" }
  const mode = modeInscriptions(v)
  // Lien externe (lot 11) : l'inscription se passe ailleurs, le reste du bloc
  // ne s'applique plus (docs/spec-inscription-externe.md).
  const externe = v.lienExterne.trim() !== ""
  // Pas de doublon avec le Sheet (U9, Q3). À la modification, seul le passage dans le Sheet est
  // refusé : un évènement déjà dans l'app (créé avant la règle) se corrige toujours.
  const refusSheet = dansLeSheet(v) && (creation || !dansLeSheet(initial))
  const set = (patch: Partial<EvenementValues>) => setV((x) => ({ ...x, ...patch }))
  // Listes au style des champs du site (fond gris, sans bord), de 44 px comme les champs d'une ligne.
  // Le titre dit l'action d'une réunion ; un évènement garde « Nouvel évènement » / « Modifier ».
  const Titre = reunion && !titreCache ? "h1" : "h2"

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
    // La raison est déjà écrite sous la date : on y ramène.
    if (refusSheet) { setError(""); document.getElementById("ev-date")?.focus(); return }
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
        sansCompte: !reserve && v.sansCompte,
        ...(reunion ? sansInscription : {}),
      }, creation && prevenir)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("evenements.form.errorSave"))
      setBusy(false)
    }
  }

  /** La zone « Ajouter une bannière » : visible pour un évènement, sous « Plus d'options » pour une réunion. */
  const banniere = (classe: string) => (
      <div className={classe}>
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
  )

  return (
    <form onSubmit={submit} className="space-y-4 [&>.sr-only+*]:!mt-0" aria-labelledby="evenement-form-title">
      <Titre id="evenement-form-title" className={titreCache ? "sr-only" : reunion ? "text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground text-balance" : "text-base font-bold"}>
        {reunion ? t(creation ? "backOffice.nouvelleReunion" : "backOffice.modifierReunion") : creation ? t("evenements.nouveau") : t("evenements.modifier")}
      </Titre>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div data-testid="form-carte" className="divide-y divide-border rounded-2xl bg-card">
      <div className="space-y-4 p-4">
        <Champ id="ev-titre" label={t(reunion ? "evenements.form.titreReunion" : "evenements.form.titre")}>
          <Input id="ev-titre" className="h-11" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} required />
        </Champ>

        <div className={reunion ? undefined : "grid grid-cols-2 gap-3"}>
          {/* Une réunion n'a pas de catégorie à choisir : la valeur déjà stockée reste (-8). */}
          {!reunion && (
            <Champ id="ev-type" label={t("evenements.form.type")}>
              <ChampSelect id="ev-type" value={v.type} onChange={(e) => setType(e.target.value as EvenementType)}>
                {EVENEMENT_TYPES.map((x) => <option key={x} value={x}>{t(`evenements.types.${x}`)}</option>)}
              </ChampSelect>
            </Champ>
          )}
          <Champ id="ev-pour" label={t(reunion ? "evenements.form.pourReunion" : "evenements.form.pour")}>
            <ChampSelect id="ev-pour" value={v.pour}
              onChange={(e) => set({
                pour: e.target.value as EvenementValues["pour"],
                ...(estReunion({ ...v, pour: e.target.value }) ? { ...sansInscription, ...(info ? { type: TYPE_REUNION } : {}) } : {}),
              })}>
              {pours.map((p) => {
                const equipe = equipeDuPour(p)
                return <option key={p} value={p}>{p === "eglise" ? t("evenements.pourEglise") : equipe ? t(cleNomEquipe(equipe, reunion)) : categoryLabel(p)}</option>
              })}
            </ChampSelect>
          </Champ>
        </div>

        {!info && (
          <div className="grid grid-cols-2 gap-3">
            <Champ id="ev-date" label={t("evenements.form.date")}>
              <Input id="ev-date" className="h-11" type="date" max={DATE_MAX} value={v.date} onChange={(e) => set({ date: e.target.value })} required
                aria-invalid={refusSheet || undefined} aria-describedby={refusSheet ? "ev-date-sheet" : undefined} />
            </Champ>
            <Champ id="ev-heure" label={t("evenements.form.heure")}>
              <Input id="ev-heure" className="h-11" type="time" value={v.heure} onChange={(e) => set({ heure: e.target.value })} />
            </Champ>
          </div>
        )}
        {refusSheet && (
          <p id="ev-date-sheet" className="-mt-2 text-sm text-destructive">
            {t("evenements.form.refusSheet", { jour: dernierJourDuSheet() })}{" "}
            <a href={lienOngletSheet(v.date)} target="_blank" rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2">
              {t("evenements.form.ouvrirSheet")}
            </a>
          </p>
        )}

        <Champ id="ev-lieu" label={t("evenements.form.lieu")}>
          <Input id="ev-lieu" className="h-11" value={v.lieu} maxLength={120} onChange={(e) => set({ lieu: e.target.value })} />
        </Champ>

        <Champ id="ev-contact" label={t("evenements.form.contact")}>
          <Input id="ev-contact" className="h-11" value={v.contact} maxLength={80} placeholder={t("evenements.form.contactHint")} onChange={(e) => set({ contact: e.target.value })} />
        </Champ>

        <Champ id="ev-description" label={t("evenements.form.description")}>
          <Textarea id="ev-description" value={v.description} rows={4} maxLength={4000} onChange={(e) => set({ description: e.target.value })} />
        </Champ>
      </div>

      {/* Bannière : la première image ; jusqu'à trois. Une réunion la range sous « Plus d'options » (-8). */}
      {!reunion && banniere("space-y-2 p-4")}

      {!info && !reunion && (
        <>
          {/* Lot 11 : le lien externe est en tête, c'est lui qui décide si le reste s'applique. Deux blocs frères :
              le filet de `divide-y` sépare l'aide du lien du groupe « Inscriptions » (bo-evenements-14). */}
          <div className="space-y-4 p-4">
            <Champ id="ev-lien-externe" label={t("evenements.form.lienExterne")}>
              <Input id="ev-lien-externe" className="h-11" type="url" value={v.lienExterne} placeholder="https://…" onChange={(e) => set({ lienExterne: e.target.value })} />
              <p className="text-xs text-muted-foreground">{t("evenements.form.lienExterneAide")}</p>
            </Champ>
          </div>
          {!externe && (
            <div className="space-y-4 p-4">
              <Champ label={t("evenements.form.inscriptions")}>
                <ChoixInscriptions label={t("evenements.form.inscriptions")} mode={mode} onChange={(m) => set({ inscriptions: m })} />
                {mode !== "auto" && <p className="text-xs text-muted-foreground">{t(`evenements.form.modeAide.${mode}`)}</p>}
              </Champ>
              {mode === "auto" && (
                <>
                  <Periode id="ev-ins-debut" label={t("evenements.form.insDebut")} heureLabel={t("evenements.form.insDebutHeure")}
                    aide={t("evenements.form.insDebutAide")} value={v.inscriptionDebut ?? ""} onChange={(x) => set({ inscriptionDebut: x })} />
                  <Periode id="ev-ins-fin" label={t("evenements.form.insFin")} heureLabel={t("evenements.form.insFinHeure")}
                    aide={t("evenements.form.insFinAide")} value={v.inscriptionFin ?? ""} onChange={(x) => set({ inscriptionFin: x })} />
                </>
              )}
            </div>
          )}
        </>
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
          <Champ id="ev-expires" label={t("evenements.form.expiresAt")}>
            <Input id="ev-expires" className="h-11" type="date" value={v.expiresAt ?? ""} onChange={(e) => set({ expiresAt: e.target.value || null })} />
          </Champ>
        </div>
      )}

      {/* Chevron du site au lieu du triangle du navigateur (retouche iPhone du 08/11/2026). */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm text-foreground [&::-webkit-details-marker]:hidden">
          {t("evenements.form.plusOptions")}
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          {/* Fin : même ordre que « Date | Horaire » plus haut, libellés courts (sur une ligne au téléphone). */}
          {!info && (
            <div className="grid grid-cols-2 gap-3">
              <Champ id="ev-date-fin" label={t("evenements.form.dateFin")}>
                <Input id="ev-date-fin" className="h-11" type="date" max={DATE_MAX} value={v.dateFin} onChange={(e) => set({ dateFin: e.target.value })} />
              </Champ>
              <Champ id="ev-heure-fin" label={t("evenements.form.heureFin")}>
                <Input id="ev-heure-fin" className="h-11" type="time" value={v.heureFin} onChange={(e) => set({ heureFin: e.target.value })} />
              </Champ>
            </div>
          )}

          {reunion && banniere("space-y-2")}

          <Champ label={t("annonces.form.links")}>
            <div className="space-y-2">
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
          </Champ>

          {/* Lot 11 : avec un lien externe, ces réglages restent là mais ne
              servent plus — retirer le lien rend l'ancien réglage. */}
          {!info && !reunion && (
            <div className={`space-y-3 ${externe ? "opacity-60" : ""}`}>
              {externe && <p className="text-xs text-muted-foreground">{t("evenements.form.placesExterne")}</p>}
              <Champ id="ev-places" label={t("evenements.form.places")}>
                <Input id="ev-places" className="h-11" type="number" min={1} max={999} value={v.placesMax ?? ""} placeholder={t("evenements.form.placesHint")} disabled={externe}
                  onChange={(e) => set({ placesMax: e.target.value ? Number(e.target.value) : null })} />
              </Champ>
              {!reserve && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={v.sansCompte} disabled={externe} onChange={(e) => set({ sansCompte: e.target.checked })} />
                  {t("evenements.form.sansCompte")}
                </label>
              )}
            </div>
          )}
        </div>
      </details>

      <div className="space-y-1 p-4">
        <Button type="submit" size="lg" disabled={busy || compressing} className="w-full">
          {creation ? t(reunion ? "evenements.form.createReunion" : "evenements.form.create") : t("evenements.form.save")}
        </Button>
        <Button type="button" variant="ghost" className="w-full text-foreground" onClick={onCancel}>{t("evenements.form.cancel")}</Button>
      </div>
      </div>
    </form>
  )
}
