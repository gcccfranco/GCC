"use client"

// Volet Entraînements. Lot U1 (docs/spec-scene-saison.md, planche scene-reserver-telephone),
// rangé en semaines par Pâques · Noël, P5 (docs/spec-scene-paques-noel.md, Q12, Q14 ; planche
// `v18-scene-a-membres-*`) : « Mes réservations » en tête (toucher une ligne choisit sa
// semaine), les semaines du lundi au dimanche (liste en deux volets, pastilles qui défilent en
// largeur sur une colonne), et la semaine choisie en cartes par jour — l'heure, « Libre ·
// Réserver », ou la réservation et son auteur. La semaine choisie est dans l'adresse
// (`?semaine=` le lundi, remplacée sans entrée d'historique) ; par défaut, la première qui a un
// jour réservable à partir d'aujourd'hui ; les passées attendent derrière « Semaines passées ».
// « Réserver » ouvre la feuille sur ce créneau, rien de coché (P6, Q15). Sur sa réservation
// (toutes pour la coordination), « ⋯ » (`MenuActions`, Q14) : « Déplacer » propose les créneaux
// libres en pastilles, « Modifier » quoi, qui et note, « Retirer » la supprime après la
// confirmation du site ; « à moi » remplace mon nom. Les chevauchements restent refusés à
// l'enregistrement et marqués en rouge s'ils existent malgré tout. L'appelant pose les trois
// morceaux où il veut (`children`).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react"
import type { User } from "firebase/auth"
import { canEditCreneau, canReserverPour, isCoordination } from "@/lib/access"
import { createCreneau, deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import {
  commence, creneauxLibres, heureLocale, lignesDuJour, quiPermis, saisonDe, semainesDe, type Place, type Semaine,
} from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import type { Creneau, Programme } from "@/types/programme"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { MenuActions, type ActionDuMenu } from "@/components/layout/MenuActions"
import { BadgeHorsGrille } from "./Apercu"
import { CreneauForm, type CreneauValues } from "./CreneauForm"
import { LigneJour } from "./LigneJour"
import { bornesSemaine, jourCourt, jourEnLettres, joursCourts, semaineCourte, titreDuJour, tuileDate } from "./libelles"

const COLOR = PLANNING_COLORS.scene

type Action = { type: "nouveau"; place: Place } | { type: "modifier" | "deplacer"; creneau: Creneau }

/** Les trois morceaux que l'appelant pose (P5) : « Mes réservations » (rien sans réservation à
 *  moi), la liste des semaines, la semaine choisie. */
export type MorceauxEntrainements = { mes: ReactNode; semaines: ReactNode; semaine: ReactNode }

/** Lundi d'une date ISO (minuit UTC, comme `saison.ts`). */
function lundiDe(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** Les semaines de la saison, plus les jours d'une réservation hors des jours réservables
 *  (U1, Q8 : rien ne disparaît), rangés dans leur semaine — qui naît sans case s'il le faut. */
function semainesAvecHorsGrille(semaines: Semaine[], jours: string[]): Semaine[] {
  const out = semaines.map((s) => ({ ...s, jours: [...s.jours] }))
  for (const d of jours) {
    if (out.some((s) => s.jours.includes(d))) continue
    const lundi = lundiDe(d)
    const s = out.find((x) => x.lundi === lundi)
    if (s) s.jours = [...s.jours, d].sort()
    else out.push({ lundi, jours: [d], cases: [], libres: 0 })
  }
  return out.sort((a, b) => a.lundi.localeCompare(b.lundi))
}

export function Entrainements({ programme, creneaux, user, profile, onChanged, onConflict, children }: {
  programme: Programme
  creneaux: Creneau[]
  user: User
  profile: UserProfile | null
  onChanged: () => Promise<void>
  /** Appelé quand un créneau qu'on vient d'enregistrer en chevauche un autre (course perdue). */
  onConflict?: (a: Creneau, b: Creneau) => void
  /** Pose les morceaux (deux volets de l'onglet de la fête) ; sinon l'un sous l'autre. */
  children?: (m: MorceauxEntrainements) => ReactNode
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const params = useSearchParams()
  const deuxVolets = useDeuxVolets()
  const saison = saisonDe(programme)
  const today = todayIso()
  const maintenant = heureLocale()
  const coordination = isCoordination(user, profile)
  const semaines = semainesAvecHorsGrille(semainesDe(saison, programme.jourJ, creneaux), creneaux.map((c) => c.dimanche))
  const passees = semaines.filter((s) => s.jours.at(-1)! < today)
  // La semaine demandée gagne tant que l'adresse ne l'a pas rattrapée (`router.replace` est
  // asynchrone) : deux ‹ touchés vite reculent bien de deux semaines.
  const [demandee, setDemandee] = useState<string | null>(null)
  const dansAdresse = params.get("semaine")
  if (demandee !== null && demandee === dansAdresse) setDemandee(null)
  const parametre = demandee ?? dansAdresse
  const choisie: Semaine | undefined = semaines.find((s) => s.lundi === parametre) ?? semaines.find((s) => s.jours.at(-1)! >= today) ?? semaines.at(-1)
  const iChoisie = choisie ? semaines.indexOf(choisie) : -1
  const [showPast, setShowPast] = useState(false)
  const voirPassees = showPast || (!!choisie && passees.includes(choisie))
  const bande = useRef<HTMLUListElement>(null)
  // Le jour d'une réservation touchée dans « Mes réservations » : on y descend une fois rendu.
  const viser = useRef<string | null>(null)
  // La feuille garde son contenu pendant qu'elle se referme : `action` reste,
  // `ouverte` passe à faux. `fois` la remonte à neuf à chaque ouverture.
  const [action, setAction] = useState<Action | null>(null)
  const [ouverte, setOuverte] = useState(false)
  const [fois, setFois] = useState(0)

  const conflicts = new Set(creneaux.filter((c) => creneaux.some((o) => o.id !== c.id && overlaps(c, o))).map((c) => c.id))
  const slotLabel = (c: Creneau) => `${c.debut} – ${c.fin} · ${c.quoi} · ${c.qui.join(", ")} (${c.auteurNom})`
  const auteurNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""
  // Q4 : la coordination n'est pas limitée ; un membre choisit parmi les groupes permis.
  const quiLimite = !coordination && saison.quiAutorises.length > 0
  const quiOptions = quiPermis(coordination ? {} : programme)

  function ouvrir(a: Action) {
    setAction(a)
    setOuverte(true)
    setFois((n) => n + 1)
  }

  async function save(values: CreneauValues): Promise<string | null> {
    const editingId = action && action.type !== "nouveau" ? action.creneau.id : null
    // Q11, revu à l'enregistrement : la feuille a pu rester ouverte pendant que le
    // créneau commençait. Garder son créneau (changer la note, le qui) reste permis.
    const autreCreneau = !action || action.type === "nouveau"
      || values.dimanche !== action.creneau.dimanche || values.debut !== action.creneau.debut
    if (autreCreneau && commence(values.dimanche, values.debut, todayIso(), heureLocale())) return t("planning.saison.dejaCommence")
    if (!canReserverPour(user, profile, programme, values.qui)) {
      return t("planning.saison.quiRefuse", { qui: values.qui.filter((q) => !quiPermis(programme).includes(q)).join(", ") })
    }
    try {
      // Relecture juste avant d'écrire : la scène est unique, un chevauchement est refusé.
      const fresh = await listCreneaux(programme.id)
      const clash = fresh.find((c) => c.id !== editingId && overlaps(c, values))
      if (clash) return t("planning.programme.overlap", { slot: slotLabel(clash) })
      const now = new Date().toISOString()
      let id = editingId
      if (id) await updateCreneau(programme.id, id, values)
      else id = await createCreneau(programme.id, { ...values, auteurUid: user.uid, auteurNom, createdAt: now, updatedAt: now })
      // Course perdue (deux enregistrements à la même seconde) : on prévient.
      const after = await listCreneaux(programme.id)
      const mine = after.find((c) => c.id === id)
      const other = mine && after.find((c) => c.id !== id && overlaps(c, mine))
      if (mine && other) onConflict?.(mine, other)
      setOuverte(false)
      await onChanged()
      return null
    } catch {
      return t("planning.programme.error")
    }
  }

  async function remove(c: Creneau) {
    await deleteCreneau(programme.id, c.id)
    await onChanged()
  }

  /** « ⋯ » d'une réservation que je peux changer (Q14) ; Retirer passe par la confirmation du site. */
  const actionsDe = (c: Creneau): ActionDuMenu[] => [
    { label: t("planning.saison.deplacer"), icone: ArrowLeftRight, onSelect: () => ouvrir({ type: "deplacer", creneau: c }) },
    { label: t("planning.programme.edit"), icone: Pencil, onSelect: () => ouvrir({ type: "modifier", creneau: c }) },
    {
      label: t("planning.programme.remove"), icone: Trash2, destructif: true, onSelect: () => remove(c),
      confirmer: {
        titre: t("planning.programme.confirmRemove"),
        texte: t("planning.semaines.retirerTexte", { resa: `${c.quoi} · ${c.qui.join(", ")}`, jour: jourEnLettres(c.dimanche, lang), debut: c.debut, fin: c.fin }),
        action: t("planning.programme.remove"),
      },
    },
  ]
  const menu = (c: Creneau) => canEditCreneau(user, profile, c) && (
    <MenuActions actions={actionsDe(c)} label={`${t("common.moreActions")} · ${c.quoi} · ${c.qui.join(", ")}`} />
  )

  /** Choisit une semaine : l'adresse change, sans entrée d'historique (Q9). */
  function choisir(lundi: string) {
    setDemandee(lundi)
    const q = new URLSearchParams(params.toString())
    q.set("semaine", lundi)
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }

  // Une colonne : la pastille choisie se montre dans sa bande (seule la bande défile).
  useEffect(() => {
    const b = bande.current
    const li = b?.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement
    if (!b || !li || deuxVolets) return
    b.scrollLeft = Math.max(0, li.offsetLeft - parseFloat(getComputedStyle(b).paddingLeft))
  }, [choisie?.lundi, deuxVolets, voirPassees])

  const versLeJour = (d: string) => document.getElementById(`scene-jour-${d}`)?.scrollIntoView({ block: "start", behavior: "smooth" })
  // Après un toucher dans « Mes réservations » : la carte du jour, une fois sa semaine rendue.
  useEffect(() => {
    const d = viser.current
    if (!d || !choisie?.jours.includes(d)) return
    viser.current = null
    versLeJour(d)
  }, [choisie])

  /** Toucher une de mes réservations : sa semaine, puis sa carte du jour. */
  function allerA(c: Creneau) {
    if (choisie?.jours.includes(c.dimanche)) return versLeJour(c.dimanche)
    viser.current = c.dimanche
    choisir(lundiDe(c.dimanche))
  }

  const places = (libres: number, cases: number) => (cases === 0 ? null : libres ? t("planning.semaines.placesLibres", { count: libres }) : t("planning.semaines.complet"))
  const mesResas = creneaux
    .filter((c) => c.auteurUid === user.uid && (c.dimanche > today || (c.dimanche === today && c.fin > maintenant)))
    .sort((a, b) => (a.dimanche + a.debut).localeCompare(b.dimanche + b.debut))
  const titreSection = deuxVolets ? "px-1 text-[13px] font-semibold text-muted-foreground" : "text-[17px] font-bold text-foreground"

  // ─── Mes réservations (Q14) ──────────────────────────────────────────────

  const mes = mesResas.length > 0 && (
    <section aria-labelledby="scene-mes" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="scene-mes" className={titreSection}>{t("planning.semaines.mes")}</h3>
        <span data-testid="compte" className="px-1 text-[13px] tabular-nums text-muted-foreground">{mesResas.length}</span>
      </div>
      <ul className="raised rounded-2xl p-1.5">
        {mesResas.map((c) => (
          <li key={c.id} className="flex items-center gap-1 pr-1.5">
            <button
              type="button"
              onClick={() => allerA(c)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-secondary"
            >
              <TuileDate iso={c.dimanche} lang={lang} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{c.quoi} · {c.qui.join(", ")}</span>
                <span className="block text-[13px] text-muted-foreground tabular-nums">{jourCourt(c.dimanche, lang)} · {c.debut} – {c.fin}</span>
              </span>
            </button>
            {menu(c)}
          </li>
        ))}
      </ul>
    </section>
  )

  // ─── Les semaines (Q12) : liste en deux volets, pastilles sur une colonne ─

  const visibles = semaines.filter((s) => voirPassees || !passees.includes(s))
  const listeSemaines = (
    <section aria-labelledby="scene-entrainements" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="scene-entrainements" className={titreSection}>{t("planning.programme.entrainements")}</h3>
        {passees.length > 0 && (
          <button type="button" aria-expanded={voirPassees} onClick={() => setShowPast(!voirPassees)}
            className="px-1 text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground">
            {t("planning.semaines.passees", { n: passees.length })}
          </button>
        )}
      </div>
      <ul
        ref={bande}
        aria-label={t("planning.semaines.liste")}
        className={deuxVolets
          ? "divide-y divide-border"
          : "relative -mx-[var(--marge-page)] flex gap-2 overflow-x-auto overscroll-x-contain px-[var(--marge-page)] py-1 [scrollbar-width:none]"}
      >
        {visibles.map((s) => {
          const actif = s === choisie
          const detail = [joursCourts(s.jours, lang, t("planning.fete.et")), places(s.libres, s.cases.length)].filter(Boolean).join(" · ")
          return (
            <li key={s.lundi} className={deuxVolets ? "py-0.5" : "shrink-0"}>
              <button
                type="button"
                aria-current={actif ? "true" : undefined}
                onClick={() => choisir(s.lundi)}
                className={deuxVolets
                  ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${actif ? "bg-foreground text-background" : "hover:bg-secondary"}`
                  : `flex min-w-[124px] flex-col gap-1.5 whitespace-nowrap rounded-2xl px-3 py-2.5 text-left transition-colors ${actif ? "bg-foreground text-background" : "raised"}`}
              >
                <span className={deuxVolets ? "min-w-0 flex-1" : "contents"}>
                  <span className="block text-[15px] font-semibold tabular-nums">{semaineCourte(s.jours, lang)}</span>
                  <span className={deuxVolets ? `block text-[13px] ${actif ? "opacity-75" : "text-muted-foreground"}` : "sr-only"}>{detail}</span>
                </span>
                <Cases cases={s.cases} actif={actif} />
                {deuxVolets && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )

  // ─── La semaine choisie, en cartes par jour ──────────────────────────────

  const bornes = choisie && bornesSemaine(choisie.jours, lang)
  const semaine = choisie && (
    <div className="space-y-3">
      {deuxVolets && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] leading-tight font-bold tracking-tight text-foreground">
              {bornes!.au ? t("planning.semaines.titre", bornes!) : t("planning.semaines.titreJour", { du: bornes!.du })}
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {[places(choisie.libres, choisie.cases.length), t("planning.semaines.unCreneau", { duree: t(`planning.saison.dureeCourte.${saison.duree}`) })].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Fleche label={t("planning.semaines.precedente")} disabled={iChoisie <= 0} onClick={() => choisir(semaines[iChoisie - 1].lundi)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Fleche>
            <Fleche label={t("planning.semaines.suivante")} disabled={iChoisie >= semaines.length - 1} onClick={() => choisir(semaines[iChoisie + 1].lundi)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Fleche>
          </div>
        </div>
      )}
      {choisie.jours.map((d) => {
        const label = titreDuJour(d, lang)
        const lignes = lignesDuJour(saison, d, creneaux)
        const libres = lignes.filter((l) => l.type === "libre" && !commence(d, l.debut, today, maintenant)).length
        const grille = lignes.filter((l) => l.type === "libre" || l.couvre > 0).length
        return (
          <section key={d} id={`scene-jour-${d}`} aria-label={label} className="raised rounded-2xl scroll-mt-[calc(var(--nav-h)+12px)]">
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
              <TuileDate iso={d} lang={lang} />
              <h3 className="min-w-0 flex-1 text-[17px] font-bold text-foreground">{label}</h3>
              {d >= today && <span className="shrink-0 text-[13px] text-muted-foreground">{places(libres, grille)}</span>}
            </div>
            <ul className="px-3 pb-3 space-y-1.5">
              {lignes.map((l) => {
                if (l.type !== "reserve") {
                  const libre = l.type === "libre" && !commence(d, l.debut, today, maintenant)
                  return (
                    <LigneJour
                      key={`${l.type}-${l.debut}`}
                      ligne={l}
                      droite={libre ? (
                        <Button size="sm" className="h-11 -my-2 -mr-2 px-4 svc-ink hover:opacity-80"
                          style={{ "--svc": COLOR, background: `${COLOR}1f` } as CSSProperties}
                          aria-label={t("planning.saison.reserverA", { debut: l.debut, fin: l.fin })}
                          onClick={() => ouvrir({ type: "nouveau", place: { jour: d, debut: l.debut, fin: l.fin } })}>
                          {t("planning.saison.reserver")}
                        </Button>
                      ) : undefined}
                    />
                  )
                }
                const c = l.creneau
                const conflict = conflicts.has(c.id)
                return (
                  <LigneJour
                    key={c.id}
                    ligne={l}
                    conflit={conflict}
                    badges={
                      <>
                        {conflict && <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-800">⚠ {t("planning.programme.conflict")}</span>}
                        {coordination && l.horsGrille && <BadgeHorsGrille />}
                      </>
                    }
                    droite={
                      <>
                        {c.auteurUid === user.uid
                          ? <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[12px] font-semibold text-background">{t("planning.semaines.aMoi")}</span>
                          : <span className="text-foreground/80">{c.auteurNom}</span>}
                        {menu(c)}
                      </>
                    }
                    sous={c.note && <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>}
                  />
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )

  // Réserver : rien de coché (Q15). Modifier : quoi, qui, note sur le même créneau. Déplacer :
  // les créneaux libres de la saison (le sien compris s'il est dans la grille), seul choix.
  const feuille = action && (() => {
    if (action.type === "nouveau") {
      const { jour, debut, fin } = action.place
      return { title: t("planning.saison.reserver"), submitLabel: t("planning.saison.reserver"), place: action.place, quiOptions,
        initial: { dimanche: jour, debut, fin, quoi: "", qui: [], note: "" } }
    }
    const c = action.creneau
    const initial = { dimanche: c.dimanche, debut: c.debut, fin: c.fin, quoi: c.quoi, qui: c.qui, note: c.note }
    if (action.type === "modifier") {
      return { title: t("planning.programme.editTitle"), submitLabel: t("planning.programme.save"), initial,
        place: { jour: c.dimanche, debut: c.debut, fin: c.fin }, quiOptions: [...new Set([...quiOptions, ...c.qui])] }
    }
    return { title: t("planning.saison.deplacerTitre"), submitLabel: t("planning.saison.deplacer"), initial, quiOptions,
      places: creneauxLibres(saison, programme.jourJ, creneaux, { sauf: c.id, today, maintenant }) }
  })()

  const sheet = feuille && (
    <CreneauForm
      key={fois}
      open={ouverte}
      {...feuille}
      quiLimite={quiLimite}
      onSubmit={save}
      onCancel={() => setOuverte(false)}
    />
  )

  const morceaux = { mes, semaines: listeSemaines, semaine }
  return (
    <>
      {children ? children(morceaux) : <div className="space-y-5">{mes}{listeSemaines}{semaine}</div>}
      {sheet}
    </>
  )
}

/** La tuile de date (planche : « 11 » sur « oct. »). */
function TuileDate({ iso, lang }: { iso: string; lang: string }) {
  const { jour, mois } = tuileDate(iso, lang)
  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl leading-none svc-ink"
      style={{ "--svc": COLOR, background: `color-mix(in srgb, ${COLOR} 10%, transparent)` } as CSSProperties}>
      <span className="text-[15px] font-bold tabular-nums">{jour}</span>
      <span className="mt-0.5 text-[10.5px] font-semibold">{mois}</span>
    </span>
  )
}

/** Une case par créneau de la semaine : pleine = pris (Q12). */
function Cases({ cases, actif }: { cases: boolean[]; actif: boolean }) {
  if (cases.length === 0) return null
  const c = actif ? "currentColor" : COLOR
  return (
    <span aria-hidden className="flex shrink-0 flex-wrap gap-[3px]">
      {cases.map((pris, i) => (
        <span key={i} data-case={pris ? "pris" : "libre"} className="h-[8px] w-[8px] rounded-[2.5px] border-[1.5px]"
          style={{ borderColor: pris ? c : `color-mix(in srgb, ${c} 45%, transparent)`, background: pris ? c : undefined }} />
      ))}
    </span>
  )
}

/** ‹ et › de la semaine (deux volets). */
function Fleche({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className="raised flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-opacity disabled:opacity-40">
      {children}
    </button>
  )
}
