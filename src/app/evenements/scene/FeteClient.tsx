"use client"

// L'onglet d'une fête dans l'App, Évènements › Pâques ou Noël (docs/spec-scene-paques-noel.md, P4,
// Q4, Q9, Q16, Q17 ; planches `v18-scene-a-membres-*` et `v18-scene-a-sans-saison-*`). L'édition
// montrée est calculée (`editionCourante`) ; son titre aussi (« Noël 2026 », Q11). À gauche (la
// liste en carte de `DeuxVolets`) : l'en-tête de l'édition, la carte de son état, les années
// passées, l'ordre de passage en bas ; à droite : la grille quand on réserve, sinon un ordre de
// passage en lecture. Sur téléphone et tablette debout, une colonne ; l'ordre de passage s'y
// ouvre en page (`?vue=ordre`). Les paramètres d'adresse (`?vue=`, `?annee=`) remplacent
// l'adresse sans entrée d'historique. Rien ne s'écrit ici : ouvrir l'onglet ne crée rien (Q6).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { CalendarClock, ChevronRight, CircleHelp, ListOrdered } from "lucide-react"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { listCreneaux, listProgrammes, PROGRAMMES_CHANGED } from "@/lib/firebase/programmes"
import { todayIso } from "@/lib/scene/dimanches"
import {
  anneeDe, editionCourante, editionsDe, etatEdition, jourJParDefaut, libelleEdition, reglagesRepris, type Fete,
} from "@/lib/scene/fetes"
import { joursReservables, saisonDe } from "@/lib/scene/saison"
import { reportConflict } from "@/lib/scene/reportConflict"
import { fdFullL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import type { Creneau, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { Retour } from "@/components/layout/EnTetePage"
import { Entrainements } from "./Entrainements"
import { OrdrePassage } from "./OrdrePassage"
import { joursDeLaSemaine, jourEnLettres } from "./libelles"

const COLOR = PLANNING_COLORS.scene

/** Les créneaux chargés, et l'édition à qui ils appartiennent. */
type Charge = { pour: string; creneaux: Creneau[] }

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function FeteClient({ fete }: { fete: Fete }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const langue = lang === "zh-CN" ? "zh" : "fr"
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const pathname = usePathname() ?? `/evenements/scene/${fete}`
  const params = useSearchParams()
  const deuxVolets = useDeuxVolets()
  const [programmes, setProgrammes] = useState<Programme[] | null>(null)
  const [charge, setCharge] = useState<Charge | null>(null)
  // Seule la dernière demande pose l'état : une réponse plus lente, partie avant, mettrait
  // sinon les créneaux d'une autre édition sous l'écran.
  const demandes = useRef(0)

  const reload = useCallback(async () => {
    const n = ++demandes.current
    const tous = await listProgrammes()
    const today = todayIso()
    const edition = editionCourante(fete, tous, today)
    const creneaux = edition.programme && etatEdition(edition, today) === "ouvertes" ? await listCreneaux(edition.programme.id) : []
    if (n !== demandes.current) return
    setProgrammes(tous)
    setCharge(edition.programme ? { pour: edition.programme.id, creneaux } : null)
  }, [fete])

  useEffect(() => {
    if (!user) return
    const load = () => { reload().catch(() => {}) }
    load()
    window.addEventListener(PROGRAMMES_CHANGED, load)
    return () => window.removeEventListener(PROGRAMMES_CHANGED, load)
  }, [user, reload])

  if (profileLoading || !programmes || !user) {
    return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("common.loading")}</p>
  }

  const today = todayIso()
  const anneeDuJour = Number(today.slice(0, 4))
  const edition = editionCourante(fete, programmes, today)
  const etat = etatEdition(edition, today)
  const programme = edition.programme
  const titre = libelleEdition(fete, edition.annee, langue)
  const jourJ = programme?.jourJ ?? jourJParDefaut(fete, edition.annee)
  // Les éditions des années passées qui ont été lancées (un brouillon resté brouillon n'a rien eu).
  const passees = editionsDe(fete, programmes).filter((p) => anneeDe(p)! < edition.annee && p.ouvert !== false)
  const anneeVoulue = Number(params.get("annee"))
  const passeeChoisie = passees.find((p) => anneeDe(p) === anneeVoulue) ?? passees[0] ?? null
  const vueOrdre = params.get("vue") === "ordre" && !!programme && etat !== "brouillon"
  const lance = !!programme && etat !== "brouillon"
  const avantOuverture = etat === "aucune" || etat === "brouillon" || etat === "bientot"
  // La saison telle qu'elle est, ou telle qu'elle naîtra (Q7) : la durée de « Comment réserver ? ».
  const saison = saisonDe(programme ?? reglagesRepris(passees[0] ?? null, fete, edition.annee))
  const jours = programme ? joursReservables(saison, jourJ) : []
  const creneaux = programme && charge?.pour === programme.id ? charge.creneaux : null

  /** Le jour J de l'en-tête : « jeudi 24 décembre », avec l'année quand ce n'est pas celle
   *  d'aujourd'hui (planche : « dimanche 28 mars 2027 ») ; les autres dates s'en passent. */
  const dateDuJour = (iso: string) => {
    const y = Number(iso.slice(0, 4))
    if (y === anneeDuJour) return jourEnLettres(iso, lang)
    return lang === "zh-CN" ? `${y}年${jourEnLettres(iso, lang)}` : `${jourEnLettres(iso, lang)} ${y}`
  }
  const numeros = (p: Programme) => (p.passages.length ? t("planning.fete.numeros", { count: p.passages.length }) : t("planning.fete.aucunNumero"))

  /** Change un paramètre d'adresse, sans entrée d'historique (Q9). */
  function changer(changements: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changements)) {
      if (v === null) q.delete(k)
      else q.set(k, v)
    }
    const s = q.toString()
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false })
  }

  // ─── La colonne de la fête ───────────────────────────────────────────────

  const enTeteEdition = (
    <div>
      <h2 className="text-[22px] leading-tight font-bold tracking-tight text-foreground">{titre}</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {t("planning.programmes.jourJLabel", { date: dateDuJour(jourJ) })}
        {(etat === "bientot" || etat === "ouvertes") && jours.length > 0 && <> · {t("planning.fete.jusquau", { date: jourEnLettres(jours.at(-1)!, lang) })}</>}
      </p>
    </div>
  )

  const carteEtat = (() => {
    if (etat === "aucune") return <CarteInfo titre={t("planning.fete.pasOuvertes", { edition: titre })} />
    if (etat === "brouillon" || etat === "bientot") {
      return (
        <CarteInfo
          titre={t("planning.fete.ouvriront", { date: jourEnLettres(programme!.debut, lang) })}
          texte={t("planning.fete.ouvrirontDetail", {
            fete: t(`evenements.tabs.${fete}`),
            jours: joursDeLaSemaine(saison.jours, lang, t("planning.fete.et")),
            fin: jourEnLettres(jours.at(-1) ?? saison.fin, lang),
          })}
        />
      )
    }
    if (etat === "fermees") return <CarteInfo titre={t("planning.fete.fermees")} texte={t("planning.fete.fermeesDetail")} />
    if (etat === "passee") {
      return (
        <section className="raised rounded-2xl p-4 space-y-1.5" aria-labelledby="scene-passee-titre">
          <h3 id="scene-passee-titre" className="text-[15px] font-bold" style={{ color: COLOR }}>{t("planning.scene.passed", { nom: titre })}</h3>
          <p className="text-sm text-muted-foreground">{t("planning.scene.passedHint")}</p>
        </section>
      )
    }
    return null
  })()

  const anneesPassees = avantOuverture && passees.length > 0 && (
    <section aria-labelledby="scene-annees-passees" className="space-y-1">
      <h3 id="scene-annees-passees" className="px-1 text-[13px] font-semibold text-muted-foreground">{t("planning.fete.anneesPassees")}</h3>
      <div className="space-y-1">
        {passees.map((p) => {
          const choisie = p.id === passeeChoisie?.id
          return (
            <button
              key={p.id}
              type="button"
              aria-current={choisie ? "true" : undefined}
              onClick={() => changer({ annee: String(anneeDe(p)), vue: null })}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${choisie ? "bg-foreground text-background" : "hover:bg-secondary"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{libelleEdition(fete, anneeDe(p)!, langue)}</span>
                <span className={`block text-[13px] ${choisie ? "opacity-75" : "text-muted-foreground"}`}>{jourEnLettres(p.jourJ, lang)} · {numeros(p)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            </button>
          )
        })}
      </div>
    </section>
  )

  // Q16 : une seule entrée, en bas de la colonne. Sur téléphone, inutile quand l'ordre est déjà
  // dessous (réservations fermées, après le jour J).
  const ordreDessous = !deuxVolets && (etat === "fermees" || etat === "passee")
  const entreeOrdre = lance && !ordreDessous && (
    <button
      type="button"
      aria-current={deuxVolets && vueOrdre ? "true" : undefined}
      onClick={() => changer({ vue: "ordre", annee: null })}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${deuxVolets && vueOrdre ? "bg-secondary" : "hover:bg-secondary"}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${COLOR} 12%, transparent)`, color: COLOR }}>
        <ListOrdered className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{t("planning.fete.ordreEntree")}</span>
        <span className="block text-[13px] text-muted-foreground">{jourEnLettres(jourJ, lang)} · {numeros(programme!)}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )

  const gerer = isCoordination(user, profile) && (
    <Button asChild size="sm" variant="outline">
      {/* P7 : vers l'onglet de la même fête au Back-Office (`/back-office/evenements/scene/{fete}`). */}
      <Link href="/back-office/evenements/scene">{t("backOffice.gerer")}</Link>
    </Button>
  )

  // ─── Ce qui se lit à droite (ou dessous, sur téléphone) ──────────────────

  const ordreDe = (p: Programme, sousTitre: string) => (
    <section className="space-y-3" aria-labelledby={`ordre-${p.id}`}>
      <div>
        <h2 id={`ordre-${p.id}`} className="text-[22px] leading-tight font-bold tracking-tight text-foreground">
          {t("planning.fete.ordreTitre", { edition: libelleEdition(fete, anneeDe(p)!, langue) })}
        </h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{sousTitre}</p>
      </div>
      <OrdrePassage passages={p.passages} canEdit={false} onSave={async () => undefined} />
    </section>
  )
  const ordreCourant = programme && ordreDe(programme, majuscule(fdFullL(jourJ, lang)))
  const commentReserver = (
    <div className="raised rounded-2xl flex items-start gap-3 p-4">
      <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
      <div>
        <p className="text-[15px] font-semibold">{t("planning.fete.commentReserver")}</p>
        <p className="text-[13.5px] text-muted-foreground">
          {t("planning.fete.commentReserverTexte", { duree: t(`planning.saison.dureeCourte.${saison.duree}`) })}
        </p>
      </div>
    </div>
  )
  const grille = programme && (creneaux ? (
    <Entrainements
      programme={programme} creneaux={creneaux} user={user} profile={profile} onChanged={reload}
      onConflict={(a, b) => reportConflict(programme.id, [a.id, b.id])}
    />
  ) : <p className="text-sm text-muted-foreground">{t("common.loading")}</p>)

  const droite: ReactNode = vueOrdre ? ordreCourant
    : avantOuverture ? (
      <div className="space-y-4">
        {passeeChoisie && ordreDe(passeeChoisie, `${majuscule(fdFullL(passeeChoisie.jourJ, lang))} · ${t("planning.fete.anDernier")}`)}
        {commentReserver}
      </div>
    )
      : etat === "ouvertes" ? grille
        : ordreCourant

  const colonne = (
    <div className={deuxVolets ? "space-y-5 p-5" : "space-y-5"}>
      {enTeteEdition}
      {gerer}
      {carteEtat}
      {anneesPassees}
      {deuxVolets && entreeOrdre && <div className="border-t border-border pt-3">{entreeOrdre}</div>}
    </div>
  )

  if (deuxVolets) {
    return (
      <DeuxVolets racine={pathname} liste={colonne} premier={droite} largeurListe={400}>
        {null}
      </DeuxVolets>
    )
  }

  // Une colonne : l'ordre de passage en page, ou la colonne puis ce qui se lit dessous (l'ordre
  // de l'année passée choisie, la grille, l'ordre de l'édition), et l'entrée de l'ordre de
  // passage en carte tout en bas (planche `v18-scene-a-membres-telephone`).
  if (vueOrdre) {
    return (
      <div className="space-y-3 px-[var(--marge-page)]">
        <Retour href={pathname}>{titre}</Retour>
        {ordreCourant}
      </div>
    )
  }
  return (
    <div className="space-y-5 px-[var(--marge-page)]">
      {colonne}
      {droite}
      {entreeOrdre && <div className="raised rounded-2xl p-1">{entreeOrdre}</div>}
    </div>
  )
}

/** Une carte d'annonce de la colonne (planche : icône de calendrier, titre, texte). */
function CarteInfo({ titre, texte }: { titre: string; texte?: string }) {
  return (
    <div className="raised rounded-2xl flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${COLOR} 12%, transparent)`, color: COLOR }}>
        <CalendarClock className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[16px] leading-snug font-bold text-foreground">{titre}</p>
        {texte && <p className="mt-1 text-[13.5px] text-muted-foreground">{texte}</p>}
      </div>
    </div>
  )
}
