"use client"

// Section Évènements, onglet unique « Scène » (lot 3 bis) : le programme affiché (un
// seul à la fois) avec ses volets Entraînements et « Programme {nom} » ; la
// coordination (pôle Événement + admins) crée, modifie, affiche, masque et
// supprime les programmes en haut de la même page. Sans programme affiché, les
// membres ne voient pas l'onglet ; la coordination y crée le suivant.
// Lot 12 : le programme affiché est **calculé** (Pâques · Noël, P3 : l'édition affichée
// au jour J le plus proche, `editionsAffichees` puis `editionProche`), jamais
// écrit — après le jour J l'onglet remercie sept jours, puis le programme
// s'archive et la bascule prend le suivant dès l'ouverture de ses
// réservations. `visible` (l'épinglage) n'est plus lu (Q11) ; « Afficher » part avec P7.
// Lot U6, B3 (U1 Q12) : la gestion (`gestion`) est à Back-Office › Évènements ›
// Scène ; dans l'App, la coordination réserve comme les groupes et trouve
// « Gérer dans le Back-Office ».

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import {
  createProgramme, deleteProgramme, listCreneaux, listProgrammes, updateProgramme,
} from "@/lib/firebase/programmes"
import {
  archiveDate, programmeState, reservationsClosed, todayIso,
} from "@/lib/scene/dimanches"
import { editionProche, editionsAffichees } from "@/lib/scene/fetes"
import { famillesDe, joursReservables, saisonDe } from "@/lib/scene/saison"
import { reportConflict } from "@/lib/scene/reportConflict"
import { fdFullL, fdLongL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Passage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Entrainements } from "./Entrainements"
import { OrdrePassage } from "./OrdrePassage"
import { ProgrammeForm, type ProgrammeValues } from "./ProgrammeForm"
import { SaisonEcran } from "./SaisonEcran"
import { dateCourte } from "./libelles"

const COLOR = PLANNING_COLORS.scene

/** Le programme montré : l'édition affichée au jour J le plus proche (Q10), comme l'onglet. */
const programmeAffiche = (programmes: Programme[], today: string) =>
  editionProche(editionsAffichees(programmes, today), today)?.programme ?? null

type Volet = "entrainements" | "programme"

/** Créneaux chargés, et le programme à qui ils appartiennent. */
type Charge = { pour: string | null; creneaux: Creneau[] }

/** Les programmes, et les créneaux du programme montré : celui dont la
 *  coordination a ouvert la saison (`focusId`, lot U1), sinon le programme affiché. */
async function fetchAll(focusId: string | null): Promise<{ programmes: Programme[] } & Charge> {
  const programmes = await listProgrammes()
  const focus = programmes.find((p) => p.id === focusId) ?? programmeAffiche(programmes, todayIso())
  return { programmes, pour: focus?.id ?? null, creneaux: focus ? await listCreneaux(focus.id) : [] }
}

export function SceneClient({ gestion = false }: { gestion?: boolean }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [programmes, setProgrammes] = useState<Programme[] | null>(null)
  const [charge, setCharge] = useState<Charge | null>(null)
  const [volet, setVolet] = useState<Volet>("entrainements")
  const [form, setForm] = useState<"new" | Programme | null>(null)
  const [ordre, setOrdre] = useState<string | null>(null)
  const [error, setError] = useState("")
  /** Lot U1 : programme dont la coordination a ouvert l'écran de la saison. */
  const [saisonOuverte, setSaisonOuverte] = useState<string | null>(null)
  // Le même, lu par `reload` : un rechargement lancé depuis un rendu plus ancien
  // demande quand même le programme montré maintenant.
  const focus = useRef<string | null>(null)
  // Seule la dernière demande pose l'état : une réponse plus lente, partie avant,
  // mettrait sinon les créneaux d'un autre programme sous l'écran.
  const demandes = useRef(0)

  const reload = useCallback(async () => {
    const n = ++demandes.current
    const data = await fetchAll(focus.current)
    if (n !== demandes.current) return
    setProgrammes(data.programmes)
    setCharge({ pour: data.pour, creneaux: data.creneaux })
  }, [])

  function montrer(id: string | null) {
    focus.current = id
    setSaisonOuverte(id)
  }

  useEffect(() => {
    if (user) reload()
  }, [user, saisonOuverte, reload])

  const coordination = gestion && isCoordination(user, profile)
  const today = todayIso()
  const current = programmes ? programmeAffiche(programmes, today) : null
  const state = current ? programmeState(current, today) : null
  // Tous les autres programmes : en attente, à venir ou archivés.
  const others = programmes?.filter((p) => p.id !== current?.id) ?? []
  // Q3 : un brouillon n'est jamais annoncé, pas même par son nom.
  const next = current
    ? others.find((p) => p.ouvert !== false && p.jourJ > current.jourJ && programmeState(p, today) !== "archived") ?? null
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
        // personne. Lot U1 : il part en brouillon, ouvert au jour de sa
        // création, et l'écran s'ouvre directement sur sa saison.
        const id = await createProgramme({
          ...values, debut: todayIso(), ouvert: false, visible: false, passages: [], createdBy: user.uid, updatedAt: new Date().toISOString(),
        })
        montrer(id)
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

  const chargement = <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (profileLoading || !programmes || !user) return chargement
  /** Les créneaux de ce programme, ou null tant que ce ne sont pas les siens qui sont chargés. */
  const creneauxDe = (p: Programme) => (charge?.pour === p.id ? charge.creneaux : null)

  // Lot U1 : l'écran de la saison (brouillon, ou « Modifier la saison ») prend la page.
  const edited = coordination ? programmes.find((p) => p.id === saisonOuverte) ?? null : null
  if (edited) {
    const creneaux = creneauxDe(edited)
    if (!creneaux) return chargement
    return <SaisonEcran programme={edited} creneaux={creneaux} onChanged={reload} onClose={() => montrer(null)} />
  }

  const closed = current ? reservationsClosed(todayIso(), current.jourJ, current.fin) : false
  const creneauxCourant = current ? creneauxDe(current) : null
  const activeVolet: Volet = closed ? "programme" : volet
  // Sans aucun programme, la coordination voit directement le formulaire.
  const showForm = form !== null || (coordination && programmes.length === 0)
  const formInitial: ProgrammeValues = form && form !== "new" ? { nom: form.nom, jourJ: form.jourJ } : { nom: "", jourJ: "" }
  const formApres = form && form !== "new" ? form.fin ?? form.debut : today

  /** « Saison : 1er octobre → 20 décembre · sam., dim. · 1 h · Groupes, EDD » (Q12). */
  function resumeSaison(p: Programme): string {
    const s = saisonDe(p)
    const familles = famillesDe(s.quiAutorises)
    return t("planning.saison.resume", {
      from: dateCourte(s.debut, i18n.language),
      to: dateCourte(s.fin, i18n.language),
      jours: s.jours.map((j) => t(`planning.saison.jourCourt.${j}`)).join(", "),
      duree: t(`planning.saison.dureeCourte.${s.duree}`),
      qui: s.quiAutorises.length === 0
        ? t("planning.saison.tous")
        : familles.map((f) => t(`planning.saison.familles.${f}`)).join(", "),
    })
  }

  // Planche scene-reserver-telephone : « Réservations : du 3 octobre au 20
  // décembre », du premier au dernier jour réservable, tant qu'on réserve.
  const joursSaison = current ? joursReservables(saisonDe(current), current.jourJ) : []

  return (
    <div className="max-w-2xl lg:max-w-none space-y-4 mx-auto">
      <div>
        <h2 className="text-[26px] leading-tight font-bold tracking-tight text-foreground">{current ? current.nom : t("planning.tabs.scene")}</h2>
        {current && (
          <p className="mt-1 text-[13px] font-semibold" style={{ color: COLOR }}>
            {t("planning.programmes.jourJLabel", { date: fdFullL(current.jourJ, i18n.language) })}
          </p>
        )}
        {current && state !== "passed" && !closed && joursSaison.length > 0 && (
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {t("planning.programmes.reservations", {
              from: dateCourte(joursSaison[0], i18n.language),
              to: dateCourte(joursSaison.at(-1)!, i18n.language),
            })}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!gestion && isCoordination(user, profile) && (
        <Button asChild size="sm" variant="outline">
          <Link href="/back-office/evenements/scene">{t("backOffice.gerer")}</Link>
        </Button>
      )}

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
          apres={formApres}
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
          {coordination && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-secondary px-3 py-2 text-sm">
              <span>{resumeSaison(current)}</span>
              <button type="button" className="font-semibold underline-offset-4 hover:underline" onClick={() => montrer(current.id)}>
                {t("planning.saison.modifierSaison")}
              </button>
            </div>
          )}
          {!closed && (
            <div className="flex gap-2">
              {(["entrainements", "programme"] as Volet[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVolet(v)}
                  className={`flex-1 h-11 px-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
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
            creneauxCourant ? (
              <Entrainements
                programme={current} creneaux={creneauxCourant} user={user} profile={profile} onChanged={reload}
                onConflict={(a, b) => reportConflict(current.id, [a.id, b.id])}
              />
            ) : chargement
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
              const saison = saisonDe(p)
              const jours = joursReservables(saison, p.jourJ)
              const st = programmeState(p, today)
              const brouillon = p.ouvert === false
              // Lot U1 : un brouillon n'est jamais affiché, même épinglé — il se prépare.
              const badge = brouillon ? "planning.saison.brouillon"
                : st === "archived" ? "planning.programmes.archived"
                  : st === "open" ? "planning.programmes.waiting" : null
              return (
                <li key={p.id} className="bg-card shadow-soft rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold flex items-center gap-2">
                      {p.nom}
                      {badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${COLOR}18`, color: COLOR }}>
                          {t(badge)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("planning.programmes.jourJLabel", { date: fdLongL(p.jourJ, i18n.language) })}
                      {" · "}
                      {t("planning.programmes.reservations", {
                        from: jours[0] ? fdLongL(jours[0], i18n.language) : "—",
                        to: fdLongL(jours.at(-1) ?? saison.fin, i18n.language),
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {brouillon || st !== "archived" ? (
                      <Button size="sm" variant="outline" onClick={() => montrer(p.id)}>
                        {t(brouillon ? "planning.saison.preparerSaison" : "planning.saison.modifierSaison")}
                      </Button>
                    ) : null}
                    {!brouillon && <Button size="sm" variant="outline" onClick={() => run(() => show(p.id))}>{t("planning.programmes.show")}</Button>}
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
