"use client"

// Formulaire d'une réunion (Timothée, 08/11/2026 : « une réunion n'est pas un évènement », un formulaire par sorte de
// fiche — tâche, réunion, évènement). Une réunion a un nom, une équipe, un jour et une heure, un lieu, un responsable,
// une description et des liens (ordre du jour, document partagé), visibles d'emblée ; ni bannière, ni fin, ni
// inscriptions, ni « Plus d'options ». Sujets à aborder, compte rendu et réunions précédentes vivent sur sa fiche.
// Stockée comme un évènement (`reunion: true`) : bannière ou fin d'une réunion plus ancienne restent telles quelles.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import { categoryLabel } from "@/lib/serviceColors"
import { equipeDuPour, publicDeReunion } from "@/lib/access"
import { cleNomEquipe } from "@/lib/equipes/table"
import type { EvenementValues } from "@/components/evenements/EvenementForm"
import { Button } from "@/components/ui/button"
import { TOUCHER_44 } from "@/lib/toucher44"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Une réunion a toujours une date (sujets jusqu'au début, rappel de la veille) : jamais « Info » (lot U6).
const TYPE_REUNION: EvenementValues["type"] = "eglise"
// Le champ date de Chrome laisse taper une année à cinq chiffres : on la borne (comme EvenementForm).
const DATE_MAX = "9999-12-31"
// Une réunion n'a pas d'inscriptions (lot U6, R4).
const SANS_INSCRIPTION = { inscriptions: "fermees" as const, inscriptionDebut: "", inscriptionFin: "", sansCompte: false, placesMax: null, lienExterne: "" }

export function ReunionForm({ initial, pours, creation, titreCache = false, onSubmit, onCancel }: {
  initial: EvenementValues
  /** Équipes que la personne peut viser. */
  pours: string[]
  /** À la création : « Créer la réunion » et « Prévenir les membres ». */
  creation: boolean
  /** Le titre de la page le dit déjà (en-tête commun d'une page de formulaire). */
  titreCache?: boolean
  onSubmit: (values: EvenementValues, prevenir: boolean) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  // Seulement des équipes : à la modification, la page passe aussi « toute l'église » et les sections, qui feraient de
  // la réunion un évènement.
  const equipes = pours.filter((p) => publicDeReunion(p) || p === initial.pour)
  const [v, setV] = useState<EvenementValues>(() => ({
    ...initial,
    pour: equipes.includes(initial.pour) ? initial.pour : (equipes[0] as EvenementValues["pour"]),
    ...(initial.type === "info" ? { type: TYPE_REUNION } : {}),
  }))
  // Une nouvelle réunion prévient ses membres par défaut, dupliquée comme créée de rien.
  const [prevenir, setPrevenir] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<EvenementValues>) => setV((x) => ({ ...x, ...patch }))
  const Titre = titreCache ? "h2" : "h1"

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.titre.trim()) { setError(t("evenements.form.errorTitre")); return }
    if (!v.date) { setError(t("evenements.form.errorDate")); return }
    for (const l of v.liens) {
      if (l.url.trim() && !/^https?:\/\//i.test(l.url.trim())) { setError(t("annonces.form.errorLink", { url: l.url })); return }
    }
    setBusy(true); setError("")
    // La fin d'une ancienne réunion n'a pas de champ ici : reportée après elle, la réunion la perd (sinon elle passerait
    // dans « passé » dès l'enregistrement).
    const finPerdue = !!v.dateFin && v.dateFin < v.date
    try {
      await onSubmit({
        ...v,
        ...(finPerdue ? { dateFin: "", heureFin: "" } : {}),
        titre: v.titre.trim(), lieu: v.lieu.trim(), description: v.description.trim(), contact: v.contact.trim(),
        liens: v.liens.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.url),
        expiresAt: null, epingle: false,
        ...SANS_INSCRIPTION,
      }, creation && prevenir)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("evenements.form.errorSave"))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 [&>.sr-only+*]:!mt-0" aria-labelledby="reunion-form-title">
      <Titre id="reunion-form-title" className={titreCache ? "sr-only" : "text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground text-balance"}>
        {t(creation ? "backOffice.nouvelleReunion" : "backOffice.modifierReunion")}
      </Titre>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div data-testid="form-carte" className="divide-y divide-border rounded-2xl bg-card">
        <div className="space-y-4 p-4">
          <Champ id="ev-titre" label={t("evenements.form.titreReunion")}>
            <Input id="ev-titre" className="h-11" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} required />
          </Champ>

          <Champ id="ev-pour" label={t("evenements.form.pourReunion")}>
            <ChampSelect id="ev-pour" value={v.pour} onChange={(e) => set({ pour: e.target.value as EvenementValues["pour"] })}>
              {equipes.map((p) => {
                const equipe = equipeDuPour(p)
                return <option key={p} value={p}>{equipe ? t(cleNomEquipe(equipe, true)) : categoryLabel(p)}</option>
              })}
            </ChampSelect>
          </Champ>

          <div className="grid grid-cols-2 gap-3">
            <Champ id="ev-date" label={t("evenements.form.date")}>
              <Input id="ev-date" className="h-11" type="date" max={DATE_MAX} value={v.date} onChange={(e) => set({ date: e.target.value })} required />
            </Champ>
            <Champ id="ev-heure" label={t("evenements.form.heure")}>
              <Input id="ev-heure" className="h-11" type="time" value={v.heure} onChange={(e) => set({ heure: e.target.value })} />
            </Champ>
          </div>

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

        {/* Les liens d'une réunion (ordre du jour, document partagé) : visibles d'emblée. */}
        <div className="p-4">
          <Champ label={t("annonces.form.links")}>
            <div className="space-y-2">
              {v.liens.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input aria-label={t("evenements.form.lienLabel")} value={l.label} placeholder={t("evenements.form.lienLabel")}
                    onChange={(e) => { const liens = [...v.liens]; liens[i] = { ...liens[i], label: e.target.value }; set({ liens }) }} />
                  <Input aria-label={t("evenements.form.lienUrl")} value={l.url} placeholder="https://…"
                    onChange={(e) => { const liens = [...v.liens]; liens[i] = { ...liens[i], url: e.target.value }; set({ liens }) }} />
                  <Button type="button" variant="ghost" size="sm" className={TOUCHER_44} aria-label={t("evenements.form.removeLink")} onClick={() => set({ liens: v.liens.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className={TOUCHER_44} onClick={() => set({ liens: [...v.liens, { label: "", url: "" }] })}>{t("evenements.form.addLink")}</Button>
            </div>
          </Champ>
        </div>

        {creation && (
          <label htmlFor="ev-prevenir" className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm">
            {t("evenements.form.prevenir")}
            <Switch id="ev-prevenir" checked={prevenir} onCheckedChange={setPrevenir} />
          </label>
        )}

        <div className="space-y-1 p-4">
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {creation ? t("evenements.form.createReunion") : t("evenements.form.save")}
          </Button>
          <Button type="button" variant="ghost" className="w-full text-foreground" onClick={onCancel}>{t("evenements.form.cancel")}</Button>
        </div>
      </div>
    </form>
  )
}
