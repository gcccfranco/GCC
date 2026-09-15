"use client"

// Section Évènements, onglet unique « Scène » (lot 3 bis) : le programme affiché (un
// seul à la fois) avec ses volets Entraînements et « Programme {nom} » ; la
// coordination (pôle Événement + admins) crée, modifie, affiche, masque et
// supprime les programmes en haut de la même page. Sans programme affiché, les
// membres ne voient pas l'onglet ; la coordination y crée le suivant.

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import {
  createProgramme, deleteProgramme, listCreneaux, listProgrammes, updateProgramme,
} from "@/lib/firebase/programmes"
import { lastSundayBefore, reservationsClosed, sundaysBetween, todayIso } from "@/lib/scene/dimanches"
import { reportConflict } from "@/lib/scene/reportConflict"
import { fdFullL, fdLongL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Passage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Entrainements } from "./Entrainements"
import { OrdrePassage } from "./OrdrePassage"
import { ProgrammeForm, type ProgrammeValues } from "./ProgrammeForm"

const COLOR = PLANNING_COLORS.scene
type Volet = "entrainements" | "programme"

async function fetchAll(): Promise<{ programmes: Programme[]; creneaux: Creneau[] }> {
  const programmes = await listProgrammes()
  const current = programmes.find((p) => p.visible)
  return { programmes, creneaux: current ? await listCreneaux(current.id) : [] }
}

export function SceneClient() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [programmes, setProgrammes] = useState<Programme[] | null>(null)
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [volet, setVolet] = useState<Volet>("entrainements")
  const [form, setForm] = useState<"new" | Programme | null>(null)
  const [error, setError] = useState("")

  const reload = useCallback(async () => {
    const data = await fetchAll()
    setProgrammes(data.programmes)
    setCreneaux(data.creneaux)
  }, [])

  useEffect(() => {
    if (!user) return
    fetchAll().then((data) => { setProgrammes(data.programmes); setCreneaux(data.creneaux) })
  }, [user])

  const coordination = isCoordination(user, profile)
  const current = programmes?.find((p) => p.visible) ?? null
  const hidden = programmes?.filter((p) => !p.visible) ?? []

  async function run(action: () => Promise<void>) {
    setError("")
    try { await action(); await reload() } catch { setError(t("planning.programmes.error")) }
  }

  /** Un seul programme affiché à la fois : afficher celui-ci masque les autres. */
  async function show(id: string) {
    for (const p of programmes ?? []) if (p.visible && p.id !== id) await updateProgramme(p.id, { visible: false })
    await updateProgramme(id, { visible: true })
  }

  async function saveProgramme(values: ProgrammeValues) {
    if (!user) return
    // Formulaire ouvert sans programme (form === null) ou « Nouveau programme » : création.
    const editing = form && form !== "new" ? form : null
    await run(async () => {
      if (editing) {
        await updateProgramme(editing.id, values)
      } else {
        for (const p of programmes ?? []) if (p.visible) await updateProgramme(p.id, { visible: false })
        await createProgramme({ ...values, visible: true, passages: [], createdBy: user.uid, updatedAt: new Date().toISOString() })
      }
      setForm(null)
    })
  }

  function remove(p: Programme) {
    if (window.confirm(t("planning.programmes.confirmDelete", { nom: p.nom }))) run(() => deleteProgramme(p.id))
  }

  if (profileLoading || !programmes || !user) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>

  const closed = current ? reservationsClosed(todayIso(), current.jourJ) : false
  const activeVolet: Volet = closed ? "programme" : volet
  // Sans aucun programme, la coordination voit directement le formulaire.
  const showForm = form !== null || (coordination && programmes.length === 0)
  const formInitial: ProgrammeValues = form && form !== "new" ? { nom: form.nom, jourJ: form.jourJ, debut: form.debut } : { nom: "", jourJ: "", debut: "" }

  return (
    <div className="max-w-2xl space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-baseline justify-between">
        <h2 className="text-base font-bold text-foreground">{current ? current.nom : t("planning.tabs.scene")}</h2>
        {current && (
          <p className="text-xs font-semibold" style={{ color: COLOR }}>
            {t("planning.programmes.jourJLabel", { date: fdFullL(current.jourJ, i18n.language) })}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {coordination && (
        <div className="flex flex-wrap gap-2">
          {current && (
            <>
              <Button size="sm" variant="outline" onClick={() => setForm(current)}>{t("planning.scene.editProgramme")}</Button>
              <Button size="sm" variant="outline" onClick={() => run(() => updateProgramme(current.id, { visible: false }))}>{t("planning.programmes.hide")}</Button>
            </>
          )}
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setForm("new")}>{t("planning.scene.newProgramme")}</Button>
          )}
        </div>
      )}

      {coordination && showForm && (
        <ProgrammeForm
          key={form === "new" || form === null ? "new" : form.id}
          title={form && form !== "new" ? t("planning.programmes.editTitle", { nom: form.nom }) : t("planning.programmes.newTitle")}
          initial={formInitial}
          submitLabel={form && form !== "new" ? t("planning.programmes.save") : t("planning.programmes.create")}
          onSubmit={saveProgramme}
          onCancel={programmes.length === 0 && form === null ? undefined : () => setForm(null)}
        />
      )}

      {current ? (
        <>
          {!closed && (
            <div className="flex gap-2">
              {(["entrainements", "programme"] as Volet[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVolet(v)}
                  className={`flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    activeVolet === v ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={activeVolet === v ? { background: COLOR, borderColor: COLOR } : undefined}
                >
                  {v === "entrainements" ? t("planning.programme.entrainements") : t("planning.programme.programmeTab", { nom: current.nom })}
                </button>
              ))}
            </div>
          )}
          {activeVolet === "entrainements" ? (
            <Entrainements
              programme={current} creneaux={creneaux} user={user} profile={profile} onChanged={reload}
              onConflict={(a, b) => reportConflict(current.id, [a.id, b.id])}
            />
          ) : (
            <OrdrePassage
              passages={current.passages}
              canEdit={coordination}
              onSave={async (passages: Passage[]) => { await updateProgramme(current.id, { passages }); await reload() }}
            />
          )}
        </>
      ) : (
        !coordination && <p className="text-sm text-muted-foreground">{t("planning.scene.noCurrent")}</p>
      )}

      {coordination && hidden.length > 0 && (
        <section className="space-y-2" aria-label={t("planning.scene.others")}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("planning.scene.others")}</h3>
          <ul className="space-y-2">
            {hidden.map((p) => {
              const dimanches = sundaysBetween(p.debut, p.jourJ)
              return (
                <li key={p.id} className="bg-card shadow-soft rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold">{p.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("planning.programmes.jourJLabel", { date: fdLongL(p.jourJ, i18n.language) })}
                      {" · "}
                      {t("planning.programmes.reservations", {
                        from: dimanches[0] ? fdLongL(dimanches[0], i18n.language) : "—",
                        to: fdLongL(lastSundayBefore(p.jourJ), i18n.language),
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => run(() => show(p.id))}>{t("planning.programmes.show")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setForm(p)}>{t("planning.programmes.edit")}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)}>{t("planning.programmes.delete")}</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
