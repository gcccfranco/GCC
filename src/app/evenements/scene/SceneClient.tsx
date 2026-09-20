"use client"

// Section Évènements, onglet unique « Scène » (lot 3 bis) : le programme affiché (un
// seul à la fois) avec ses volets Entraînements et « Programme {nom} » ; la
// coordination (pôle Événement + admins) crée, modifie, affiche, masque et
// supprime les programmes en haut de la même page. Sans programme affiché, les
// membres ne voient pas l'onglet ; la coordination y crée le suivant.
// Lot 12 : le programme affiché est **calculé** (currentProgramme), jamais
// écrit — après le jour J l'onglet remercie sept jours, puis le programme
// s'archive et la bascule prend le suivant dès l'ouverture de ses
// réservations. `visible` n'est plus que l'épinglage de la coordination.

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import {
  createProgramme, deleteProgramme, listCreneaux, listProgrammes, updateProgramme,
} from "@/lib/firebase/programmes"
import {
  archiveDate, currentProgramme, lastSundayBefore, programmeState, reservationsClosed, sundaysBetween, todayIso,
} from "@/lib/scene/dimanches"
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
  const current = currentProgramme(programmes, todayIso())
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
  const [ordre, setOrdre] = useState<string | null>(null)
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
  const today = todayIso()
  const current = programmes ? currentProgramme(programmes, today) : null
  const state = current ? programmeState(current, today) : null
  // Tous les autres programmes : en attente, à venir ou archivés.
  const others = programmes?.filter((p) => p.id !== current?.id) ?? []
  const next = current
    ? others.find((p) => p.jourJ > current.jourJ && programmeState(p, today) !== "archived") ?? null
    : null

  async function run(action: () => Promise<void>) {
    setError("")
    try { await action(); await reload() } catch { setError(t("planning.programmes.error")) }
  }

  /** « Afficher » épingle ce programme, et désépingle les autres : un seul
   *  affiché à la fois. Un programme choisi automatiquement n'est épinglé nulle
   *  part, donc forcer le suivant ne coûte qu'une écriture. */
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
        // Lot 12 : le programme créé n'est pas épinglé et ne vole l'onglet à
        // personne ; il apparaîtra quand ses réservations ouvriront.
        await createProgramme({ ...values, visible: false, passages: [], createdBy: user.uid, updatedAt: new Date().toISOString() })
      }
      setForm(null)
    })
  }

  /** Dépli « Voir l'ordre de passage », en lecture seule ; un seul ouvert à la fois. */
  function ordreDepli(p: Programme) {
    const open = ordre === p.id
    return (
      <div className="w-full space-y-2">
        <Button size="sm" variant="ghost" onClick={() => setOrdre(open ? null : p.id)}>
          {t(open ? "planning.scene.hideOrdre" : "planning.scene.viewOrdre")}
        </Button>
        {open && <OrdrePassage passages={p.passages} canEdit={false} onSave={async () => undefined} />}
      </div>
    )
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
              {/* Rien à désépingler sur un programme choisi automatiquement : pas de bouton. */}
              {current.visible && (
                <Button size="sm" variant="outline" onClick={() => run(() => updateProgramme(current.id, { visible: false }))}>{t("planning.programmes.hide")}</Button>
              )}
            </>
          )}
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setForm("new")}>{t("planning.scene.newProgramme")}</Button>
          )}
        </div>
      )}

      {coordination && current && !current.visible && (
        <p className="text-xs text-muted-foreground">
          {t("planning.scene.autoChosen", { date: fdLongL(current.debut, i18n.language) })}
        </p>
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

      {current && state === "passed" ? (
        <section className="bg-card shadow-soft rounded-xl p-4 space-y-2" aria-labelledby="scene-passed-title">
          <h3 id="scene-passed-title" className="text-sm font-bold" style={{ color: COLOR }}>
            {t("planning.scene.passed", { nom: current.nom })}
          </h3>
          <p className="text-sm text-muted-foreground">{t("planning.scene.passedHint")}</p>
          {next && (
            <p className="text-sm">{t("planning.scene.nextSoon", { nom: next.nom, date: fdLongL(next.debut, i18n.language) })}</p>
          )}
          {coordination && (
            <>
              <p className="text-xs text-muted-foreground">
                {t("planning.scene.willArchive", { date: fdLongL(archiveDate(current.jourJ), i18n.language) })}
              </p>
              {ordreDepli(current)}
            </>
          )}
        </section>
      ) : current ? (
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

      {coordination && others.length > 0 && (
        <section className="space-y-2" aria-label={t("planning.scene.others")}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("planning.scene.others")}</h3>
          <ul className="space-y-2">
            {others.map((p) => {
              const dimanches = sundaysBetween(p.debut, p.jourJ)
              const st = programmeState(p, today)
              return (
                <li key={p.id} className="bg-card shadow-soft rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold flex items-center gap-2">
                      {p.nom}
                      {(st === "archived" || st === "open") && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${COLOR}18`, color: COLOR }}>
                          {t(st === "archived" ? "planning.programmes.archived" : "planning.programmes.waiting")}
                        </span>
                      )}
                    </p>
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
                  {ordreDepli(p)}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
