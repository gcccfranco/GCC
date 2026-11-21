"use client"

// Volet Entraînements. Lot U1 (docs/spec-scene-saison.md, planche scene-reserver-telephone),
// rangé en semaines par Pâques · Noël, P5 (docs/spec-scene-paques-noel.md, Q12, Q14 ; planche
// `v18-scene-a-membres-*`) : « Mes réservations » en tête (toucher une ligne choisit sa
// semaine), les semaines du lundi au dimanche (liste en deux volets, pastilles qui défilent en
// largeur sur une colonne), et la semaine choisie en cartes par jour — l'heure, « Libre ·
// Réserver », ou la réservation et son auteur. La semaine choisie est dans l'adresse
// (`?semaine=` le lundi, remplacée sans entrée d'historique) ; par défaut, la première qui a un
// jour réservable à partir d'aujourd'hui ; les passées attendent derrière « Semaines passées ».
// Lot 5 de Salles (docs/spec-salles.md, AR22) : plus de créneaux fixes. Chaque jour dit quand la
// scène est libre (« Libre 14:30 – 15:00 · 17:00 – 19:00 », dans les plages de la saison, moins
// l'emploi du temps fixe, Salles et les évènements, montrés en gris) ; « Réserver » sur une fenêtre
// ouvre la seule feuille « de / à », la fenêtre pré-remplie, rien de coché (Q15). Sur sa
// réservation (toutes pour la coordination), « ⋯ » (`MenuActions`, Q14) : « Déplacer » et
// « Modifier » rouvrent la même feuille, « Retirer » la supprime après la confirmation du site ;
// « à moi » remplace mon nom. Un chevauchement avec toute occupation de la Scène ou de la Grande
// salle est refusé à l'enregistrement (SA8) et marqué en rouge s'il existe malgré tout. L'appelant pose les trois
// morceaux où il veut (`children`). Le Back-Office (P8) pose aussi « ⋯ » et « Déplacer » dans son
// tableau de toutes les réservations : la même feuille, le même menu.

import { langueCourte } from "@/lib/utils/formatDate";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react"
import type { User } from "firebase/auth"
import { canAnnulerReservation, canEditCreneau, canReserverPour, canSeeEvenement, isCoordination } from "@/lib/access"
import { deleteCreneau, reservationDeCreneau } from "@/lib/firebase/programmes"
import { listReservations, type Reservation } from "@/lib/firebase/reservations"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import { TOUCHER_44 } from "@/lib/toucher44"
import {
  fenetresLibres, heureLocale, lignesDuJour, saisonDe, semainesDe, type Autre, type Semaine,
} from "@/lib/scene/saison"
import { chargerAutresScene } from "@/lib/salles/charger"
import { nomOccupant, occupationsDe, occupationsDu, type SourcesSalles } from "@/lib/salles/occupations"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { styleTexteService } from "@/lib/couleurSombre"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import type { Creneau, Programme } from "@/types/programme"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { MenuActions, type ActionDuMenu } from "@/components/layout/MenuActions"
import { BadgeHorsGrille, Fleche, TuileDate } from "./pieces"
import { FeuilleReserver, type Ouverture } from "../salles/FeuilleReserver"
import { FeuilleAnnuler } from "@/components/salles/FeuilleAnnuler"
import { useReserver } from "../salles/useReserver"
import { LigneJour } from "./LigneJour"
import { bornesSemaine, jourCourt, jourEnLettres, joursCourts, semaineCourte, titreDuJour } from "./libelles"
import { libelleQui } from "@/lib/fetes/qui"

const COLOR = PLANNING_COLORS.scene

/** Les trois morceaux que l'appelant pose (P5) : « Mes réservations » (rien sans réservation à
 *  moi), la liste des semaines, la semaine choisie. Pour le tableau du Back-Office (P8) : le
 *  menu « ⋯ » d'une réservation, la feuille « Déplacer », et l'erreur d'un retrait manqué. */
export type MorceauxEntrainements = {
  mes: ReactNode
  semaines: ReactNode
  semaine: ReactNode
  menu: (c: Creneau) => ReactNode
  deplacer: (c: Creneau) => void
  erreur: ReactNode
}

/** Lundi d'une date ISO (minuit UTC, comme `saison.ts`). */
function lundiDe(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export function Entrainements({ programme, creneaux, user, profile, onChanged, semaineActive = true, children }: {
  programme: Programme
  creneaux: Creneau[]
  user: User
  profile: UserProfile | null
  onChanged: () => Promise<void>
  /** Faux quand la semaine n'est pas ce qui se lit à droite (Back-Office, P8) : aucune
   *  semaine n'est alors marquée choisie dans la liste. */
  semaineActive?: boolean
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
  const langue = langueCourte(lang) === "zh" ? "zh" : "fr"
  // AR22 : ce qui prend la scène d'autre part pendant la saison (emploi du temps fixe, Salles, évènements).
  const [sources, setSources] = useState<SourcesSalles | null>(null)
  useEffect(() => {
    let vivant = true
    chargerAutresScene(saison.debut, saison.fin, today, programme.id, (e) => canSeeEvenement(user, profile, e))
      .then((s) => { if (vivant) setSources(s) })
    return () => { vivant = false }
    // Relu quand la période change ; le reste ne bouge pas depuis cette page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programme.id, saison.debut, saison.fin])
  const idsFete = new Set(creneaux.map((c) => c.id))
  const autresDu = (d: string): Autre[] => !sources ? [] : occupationsDe(occupationsDu(d, sources), "grande")
    .filter((o) => !(o.id && idsFete.has(o.id)))
    .map((o) => ({ debut: o.debut, fin: o.fin, libelle: nomOccupant(o, langue) }))
  const horloge = { today, maintenant }
  const semaines = semainesDe(saison, programme.jourJ, creneaux, autresDu)
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
  // La feuille unique « Réserver » (AS1) : ouverte sur une fenêtre libre, ou sur la réservation à modifier.
  const [ouverture, setOuverture] = useState<Ouverture | null>(null)
  const [erreurRetrait, setErreurRetrait] = useState("")
  // AS16 : la réservation d'un autre, annulée par la coordination avec un motif.
  const [aAnnuler, setAAnnuler] = useState<Reservation | null>(null)

  const conflicts = new Set(creneaux.filter((c) => creneaux.some((o) => o.id !== c.id && overlaps(c, o))).map((c) => c.id))
  const quiDe = (c: Creneau) => c.qui.map((q) => libelleQui(q, langueCourte(lang))).join(", ")
  // « Réserver » sur une fenêtre libre : réservations ouvertes et « Qui peut réserver » le permet (SQ-R8).
  const peutReserver = saison.ouvert && programme.fermees !== true && canReserverPour(user, profile, programme, [])

  // Les réservations de la fête comptent avec les autres pour la feuille (la sienne ne se compte pas, SA10) ; celles
  // relues à l'envoi (SA8) passent devant, pour que la feuille nomme ce qui a pris la place entre-temps.
  const [relues, setRelues] = useState<Reservation[]>([])
  const relire = async (d: string) => {
    const r = await listReservations(d, d)
    setRelues((p) => [...p.filter((x) => x.date !== d), ...r])
    return r
  }
  const sourcesFeuille = sources && {
    ...sources,
    reservations: [...new Map([...(sources.reservations ?? []), ...creneaux.map((c) => reservationDeCreneau(programme.id, c)), ...relues].map((r) => [r.id, r])).values()],
  }
  const { feteDu, nomFete, enregistrer } = useReserver({ sources: sourcesFeuille, relire, apres: async () => { await onChanged(); setRelues([]) } })
  const ouvrirReservation = (c: Creneau) => setOuverture({ reservation: reservationDeCreneau(programme.id, c) })

  // `?reserver=1` (la carte de la fête, AS10) : la feuille s'ouvre une fois, « Oui » d'avance, sur la première fenêtre
  // libre à partir d'aujourd'hui ; puis `reserver` quitte l'adresse. Réservations pas ouvertes : la page seule.
  const aOuvrir = useRef(params.get("reserver") === "1")
  useEffect(() => {
    if (!aOuvrir.current || (peutReserver && !sources)) return
    aOuvrir.current = false
    if (peutReserver) {
      let moment = { date: saison.debut > today ? saison.debut : today, debut: "18:00", fin: "19:00" }
      for (const d of semaines.flatMap((s) => s.jours).filter((j) => j >= today)) {
        const l = lignesDuJour(saison, d, creneaux, autresDu(d), horloge).find((x) => x.type === "libre")
        if (l) { moment = { date: d, debut: l.debut, fin: l.fin }; break }
      }
      setOuverture({ ...moment, salle: "grande", pourFete: true })
    }
    const q = new URLSearchParams(params.toString())
    q.delete("reserver")
    router.replace(q.size ? `${pathname}?${q.toString()}` : pathname, { scroll: false })
    // Une fois, quand les sources arrivent : le reste se lit à ce moment-là.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peutReserver, sources])

  async function remove(c: Creneau) {
    setErreurRetrait("")
    try {
      await deleteCreneau(programme.id, c.id)
      setRelues([])
      await onChanged()
    } catch {
      setErreurRetrait(t("planning.programme.error"))
    }
  }

  /** « ⋯ » d'une réservation que je peux changer (Q14) ; Retirer passe par la confirmation du site. */
  const actionsDe = (c: Creneau): ActionDuMenu[] => [
    { label: t("planning.saison.deplacer"), aide: t("planning.semaines.aideDeplacer"), icone: ArrowLeftRight, onSelect: () => ouvrirReservation(c) },
    { label: t("planning.programme.edit"), aide: t("planning.semaines.aideModifier"), icone: Pencil, onSelect: () => ouvrirReservation(c) },
    canAnnulerReservation(user, profile, c) ? {
      label: t("salles.annuler.titre"), icone: Trash2, destructif: true, onSelect: () => setAAnnuler(reservationDeCreneau(programme.id, c)),
    } : {
      label: t("planning.programme.remove"), aide: t("planning.semaines.aideRetirer"), icone: Trash2, destructif: true, onSelect: () => remove(c),
      confirmer: {
        titre: t("planning.programme.confirmRemove"),
        texte: t("planning.semaines.retirerTexte", { resa: `${c.quoi} · ${quiDe(c)}`, jour: jourEnLettres(c.dimanche, lang), debut: c.debut, fin: c.fin }),
        action: t("planning.programme.remove"),
      },
    },
  ]
  const menu = (c: Creneau) => canEditCreneau(user, profile, c) && (
    <MenuActions actions={actionsDe(c)} label={`${t("common.moreActions")} · ${c.quoi} · ${quiDe(c)}`} />
  )

  /** Choisit une semaine : l'adresse change, sans entrée d'historique (Q9). La semaine prend
   *  la place de ce qui se lisait à droite (`?vue=`). */
  function choisir(lundi: string) {
    setDemandee(lundi)
    const q = new URLSearchParams(params.toString())
    q.set("semaine", lundi)
    q.delete("vue")
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

  const places = (libres: number, cases: number, court = false) => (cases === 0 ? null : libres ? t(court ? "planning.semaines.libresCourt" : "planning.semaines.placesLibres", { count: libres }) : t("planning.semaines.complet"))
  const mesResas = creneaux
    .filter((c) => c.auteurUid === user.uid && (c.dimanche > today || (c.dimanche === today && c.fin > maintenant)))
    .sort((a, b) => (a.dimanche + a.debut).localeCompare(b.dimanche + b.debut))
  const titreSection = deuxVolets ? "px-1 text-sm font-semibold text-muted-foreground" : "text-lg font-bold text-foreground"

  // ─── Mes réservations (Q14) ──────────────────────────────────────────────

  const mes = mesResas.length > 0 && (
    <section aria-labelledby="scene-mes" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="scene-mes" className={titreSection}>{t("planning.semaines.mes")}</h3>
        <span data-testid="compte" className="px-1 text-sm tabular-nums text-muted-foreground">{mesResas.length}</span>
      </div>
      <ul className="carte-groupe rounded-2xl p-1.5">
        {mesResas.map((c) => (
          <li key={c.id} className="flex items-center gap-1 pr-1.5">
            <button
              type="button"
              onClick={() => allerA(c)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-secondary"
            >
              <TuileDate iso={c.dimanche} lang={lang} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{c.quoi} · {quiDe(c)}</span>
                <span className="block text-sm text-muted-foreground tabular-nums">{jourCourt(c.dimanche, lang)} · {c.debut} – {c.fin}</span>
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
            className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {voirPassees ? t("planning.semaines.masquerPassees") : t("planning.semaines.passees", { n: passees.length })}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${voirPassees ? "rotate-180" : ""}`} aria-hidden />
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
          const actif = semaineActive && s === choisie
          const detailLong = [joursCourts(s.jours, lang, t("planning.fete.et")), places(s.libres, s.cases.length)].filter(Boolean).join(" · ")
          // Une colonne : le détail court se voit, le long reste dit aux lecteurs d'écran (critique).
          const detailCourt = deuxVolets ? null : places(s.libres, s.cases.length, true)
          return (
            <li key={s.lundi} className={deuxVolets ? "py-0.5" : "shrink-0"}>
              <button
                type="button"
                aria-current={actif ? "true" : undefined}
                onClick={() => choisir(s.lundi)}
                className={deuxVolets
                  ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${actif ? "bg-foreground text-background" : "hover:bg-secondary"}`
                  : `flex min-w-[124px] flex-col gap-1.5 whitespace-nowrap rounded-2xl px-3 py-2.5 text-left transition-colors ${actif ? "bg-foreground text-background" : "sur-gris"}`}
              >
                <span className={deuxVolets ? "min-w-0 flex-1" : "contents"}>
                  <span className="block text-base font-semibold tabular-nums">{semaineCourte(s.jours, lang)}</span>
                  {detailCourt === null
                    ? <span className={`block text-sm ${actif ? "opacity-75" : "text-muted-foreground"}`}>{detailLong}</span>
                    : <><span aria-hidden className={`block text-sm ${actif ? "opacity-75" : "text-muted-foreground"}`}>{detailCourt}</span><span className="sr-only">{detailLong}</span></>}
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

  const erreur = erreurRetrait && <p role="alert" className="text-sm text-destructive">{erreurRetrait}</p>
  const bornes = choisie && bornesSemaine(choisie.jours, lang)
  const semaine = choisie && (
    <div className="space-y-3">
      {erreur}
      {deuxVolets && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl leading-tight font-bold tracking-tight text-foreground">
              {bornes!.au ? t("planning.semaines.titre", bornes!) : t("planning.semaines.titreJour", { du: bornes!.du })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {places(choisie.libres, choisie.cases.length)}
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
        const autres = autresDu(d)
        const lignes = lignesDuJour(saison, d, creneaux, autres, horloge)
        const fenetres = lignes.filter((l) => l.type === "libre")
        // « Libre 14:30 – 15:00 · 17:00 – 19:00 », « complet » quand les plages sont prises.
        const resume = d < today ? null
          : fenetres.length > 0 ? t("planning.semaines.libreA", { heures: fenetres.map((f) => `${f.debut} – ${f.fin}`).join(" · ") })
            : fenetresLibres(saison, d, []).length > 0 ? t("planning.semaines.complet") : null
        return (
          <section key={d} id={`scene-jour-${d}`} aria-label={label} className="carte-groupe rounded-2xl scroll-mt-[calc(var(--nav-h)+12px)]">
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
              <TuileDate iso={d} lang={lang} />
              <h3 className="min-w-0 flex-1 text-lg font-bold text-foreground">{label}</h3>
            </div>
            {resume && <p data-testid="libre-du-jour" className="px-4 pb-2 -mt-1 text-sm text-muted-foreground tabular-nums">{resume}</p>}
            <ul className="px-3 pb-3 space-y-1.5">
              {lignes.map((l) => {
                if (l.type !== "reserve") {
                  const libre = l.type === "libre" && peutReserver
                  return (
                    <LigneJour
                      key={`${l.type}-${l.debut}-${l.fin}`}
                      ligne={l}
                      droite={libre ? (
                        <Button size="sm" className={`h-8 px-4 svc-ink hover:opacity-80 ${TOUCHER_44}`}
                          style={{ "--svc": COLOR, background: `${COLOR}1f` } as CSSProperties}
                          aria-label={t("planning.saison.reserverA", { debut: l.debut, fin: l.fin })}
                          onClick={() => setOuverture({ date: d, debut: l.debut, fin: l.fin, salle: "grande", pourFete: true })}>
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
                          ? <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">{t("planning.semaines.aMoi")}</span>
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

  // Montée sans attendre les sources : la feuille s'ouvre aussitôt (occupations vides tant qu'elles n'ont pas répondu).
  const sheet = (
    <FeuilleReserver ouverture={ouverture} fermer={() => setOuverture(null)} today={today} langue={langue}
      occupationsDu={(d) => (sourcesFeuille ? occupationsDu(d, sourcesFeuille) : [])} feteDu={feteDu} nomFete={nomFete} enregistrer={enregistrer} />
  )
  const feuilleAnnuler = <FeuilleAnnuler reservation={aAnnuler} fermer={() => setAAnnuler(null)} apres={async () => { setRelues([]); await onChanged() }} />

  const morceaux: MorceauxEntrainements = {
    mes, semaines: listeSemaines, semaine, menu, erreur,
    deplacer: ouvrirReservation,
  }
  return (
    <>
      {children ? children(morceaux) : <div className="space-y-5">{mes}{listeSemaines}{semaine}</div>}
      {sheet}
      {feuilleAnnuler}
    </>
  )
}

/** Une case par créneau de la semaine : pleine = pris (Q12). */
function Cases({ cases, actif }: { cases: boolean[]; actif: boolean }) {
  if (cases.length === 0) return null
  // Hors carte active, la teinte du service en variante sombre (`texte-service`) ; sur la carte active, l'encre de la carte.
  return (
    <span aria-hidden className={`flex shrink-0 flex-wrap gap-[3px] ${actif ? "" : "texte-service"}`} style={actif ? undefined : styleTexteService(COLOR)}>
      {cases.map((pris, i) => (
        <span key={i} data-case={pris ? "pris" : "libre"} className="h-[8px] w-[8px] rounded-[2.5px] border-[1.5px]"
          style={{ borderColor: pris ? "currentColor" : "color-mix(in srgb, currentColor 60%, transparent)", background: pris ? "currentColor" : undefined }} />
      ))}
    </span>
  )
}
