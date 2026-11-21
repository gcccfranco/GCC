"use client"

// Salles, vue Liste (docs/spec-salles.md, lot 2, T2b ; SA1, SA2, SA4, SA14, AR12). Posé par `SectionEvenements` sur
// `/evenements/salles…`, comme l'agenda : la liste vit ici (bande de jours, ligne de contexte et repère d'heure, neuf
// lignes groupées avec l'état en mots), la journée d'une salle est la page de l'adresse (`/evenements/salles/[salle]`,
// `JourneeSalle`). En grand, deux volets : la liste seule dans la colonne tant qu'aucune salle n'est choisie, puis la
// semaine de la salle à droite ; en un volet, la liste, puis la journée en page. Le jour et l'heure choisis sont
// partagés avec la journée par un contexte. Connectés seulement (SA14).
// T2c : la vue Grille (`GrilleSalles`, SA3) et le sélecteur « Liste · Grille » (SA5 : Liste au téléphone et en
// tablette portrait, Grille en grand ; le choix est retenu sur l'appareil, `gcc-salles-vue`). La bande de jours, la
// ligne de contexte et le repère d'heure servent aux deux vues. La Grille prend toute la largeur de la page ; sur la
// journée d'une salle, le volet de gauche reste la Liste.
// T3a (lot 3) : la feuille « Réserver » (`FeuilleReserver`, SA6, SA7), ouverte par « Réserver une salle » (dans l'en-tête
// dès 768 px, par l'évènement `RESERVER_SALLE` ; en bas de la liste au téléphone, comme « Nouvel évènement ») ; les
// réservations lues avec les autres sources ; modifier et supprimer la sienne (SA10) depuis le détail d'un bloc ou la
// journée d'une salle : les actions passent par le contexte.

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { Squelette } from "@/components/layout/Squelette"
import { Segment } from "@/components/ui/segment"
import { useDisposition } from "@/hooks/useDisposition"
import { jourDeParis } from "@/lib/evenements/bascule"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { createReservation, deleteReservation, updateReservation, type Reservation } from "@/lib/firebase/reservations"
import { canEditReservation, canReserverPour, canReserverSalle, canSeeEvenement, isCoordination } from "@/lib/access"
import { BoutonNouveau } from "@/components/layout/BoutonNouveau"
import { useConfirmer } from "@/components/layout/Confirmer"
import { estSurLaListe } from "@/lib/deuxVolets"
import { addDays } from "@/lib/taches/echeances"
import { chargerReservations, chargerSalles } from "@/lib/salles/charger"
import { autreQuiCroise, chevauchement } from "@/lib/salles/conflit"
import { signalerConflit } from "@/lib/salles/signalerConflit"
import { varianteDu } from "@/lib/salles/emploi"
import { couleurDe, etatA, etatEnMots, nomOccupant, occupationsDe, occupationsDu, saisonFeteDu, type Occupation, type SourcesSalles } from "@/lib/salles/occupations"
import { feteDe, libelleEdition, nomFete } from "@/lib/scene/fetes"
import { dansUnePlage, famillesDe, quiPermis, saisonDe } from "@/lib/scene/saison"
import { SALLES, type GroupeSalle, type SalleId } from "@/lib/salles/salles"
import { GrilleSalles, type MomentCase } from "./GrilleSalles"
import { FeuilleReserver, type FeteDeLaFeuille, type Ouverture, type Saisie } from "./FeuilleReserver"

export const RACINE_SALLES = "/evenements/salles"
/** Évènement de la fenêtre : « Réserver une salle » de l'en-tête (`SectionEvenements`) ouvre la feuille. */
export const RESERVER_SALLE = "gcc-salles-reserver"
const JOURS_DE_LA_BANDE = 14

type Langue = "fr" | "zh"
type Vue = "liste" | "grille"

/** Le choix « Liste · Grille » retenu sur l'appareil (SA5) ; null tant qu'aucun n'est fait. */
const CLE_VUE = "gcc-salles-vue"
const CHANGEMENT_VUE = "gcc-salles-vue"
function suivreVue(changement: () => void) {
  window.addEventListener(CHANGEMENT_VUE, changement)
  window.addEventListener("storage", changement)
  return () => {
    window.removeEventListener(CHANGEMENT_VUE, changement)
    window.removeEventListener("storage", changement)
  }
}
function vueRetenue(): Vue | null {
  try {
    const v = localStorage.getItem(CLE_VUE)
    return v === "liste" || v === "grille" ? v : null
  } catch {
    return null
  }
}
function retenirVue(v: Vue) {
  try { localStorage.setItem(CLE_VUE, v) } catch {}
  window.dispatchEvent(new Event(CHANGEMENT_VUE))
}

interface EtatSalles {
  today: string
  date: string
  langue: Langue
  sources: SourcesSalles
  occupations: (date: string) => Occupation[]
  /** SA10 : la réservation d'une occupation, si la personne peut la modifier ; sinon null. */
  modifiable: (o: Occupation) => Reservation | null
  modifier: (r: Reservation) => void
  supprimer: (r: Reservation) => Promise<void>
}

const Contexte = createContext<EtatSalles | null>(null)

/** Le jour choisi, la langue et les occupations, pour la journée d'une salle (`JourneeSalle`). */
export function useSalles(): EtatSalles | null {
  return useContext(Contexte)
}

/** « HH:MM » de Paris, maintenant (le repère « maintenant » d'aujourd'hui, AR12). */
function heureDeParis(): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date())
}

/** « dimanche 15 novembre » / « 11月15日星期日 ». */
export function dateLongue(date: string, langue: Langue): string {
  return new Intl.DateTimeFormat(langue === "zh" ? "zh-CN" : "fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
    .format(new Date(`${date}T12:00:00Z`))
}

/** Une occupation en une ligne : « 17:00 – 18:00 · Sketch · Jeunes · Ysolde » ; le jour J, sans heures. */
export function ligneOccupation(o: Occupation, langue: Langue): string {
  const nom = nomOccupant(o, langue)
  const heures = o.debut === "00:00" && o.fin === "24:00" ? [] : [`${o.debut} – ${o.fin}`]
  return [...heures, nom, o.auteurNom].filter(Boolean).join(" · ")
}

const enMinutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const enHeure = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

/** Le moment pré-rempli de la feuille : l'heure du repère au quart d'heure suivant, entre 6:00 et 22:00, pour une
 *  heure (SA6). */
function momentDuRepere(heure: string): { debut: string; fin: string } {
  const m = Math.min(22 * 60, Math.max(6 * 60, Math.ceil(enMinutes(heure) / 15) * 15))
  return { debut: enHeure(m), fin: enHeure(m + 60) }
}

/** Les heures du repère : de 6:00 à 22:00, au quart d'heure (AR12). */
const HEURES = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const m = 6 * 60 + i * 15
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
})

export function SallesClient({ enTete, children }: { enTete: React.ReactNode; children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Salles enTete={enTete}>{children}</Salles>
    </RequireAuth>
  )
}

function Salles({ enTete, children }: { enTete: React.ReactNode; children: React.ReactNode }) {
  const { t, i18n } = useTranslation()
  const langue: Langue = i18n.language?.startsWith("zh") ? "zh" : "fr"
  const { user } = useAuth()
  const { profile } = useProfile()
  const confirmer = useConfirmer()
  const pathname = usePathname() || RACINE_SALLES
  const grand = useDisposition() === "grand"
  const surLaListe = estSurLaListe(pathname, RACINE_SALLES)
  const today = jourDeParis()
  const [date, setDate] = useState(today)
  // « maintenant » (aujourd'hui seulement) ou « HH:MM » ; un autre jour se lit à 08:00 (AR12).
  const [repere, setRepere] = useState("maintenant")
  const [lecture, setLecture] = useState<{ sources: SourcesSalles; echec: boolean } | null>(null)
  const [ouverture, setOuverture] = useState<Ouverture | null>(null)
  const retenue = useSyncExternalStore(suivreVue, vueRetenue, () => null)
  // Sur la journée d'une salle, le volet de gauche reste la Liste (la Grille ne tient pas dans un volet).
  const vue: Vue = !surLaListe ? "liste" : retenue ?? (grand ? "grille" : "liste")

  useEffect(() => {
    if (!user) return
    // Lot 4 : la réunion d'une équipe dont on n'est pas occupe sa salle sans être nommée.
    chargerSalles(today, (e) => canSeeEvenement(user, profile, e)).then(setLecture)
  }, [user, profile, today])

  // Après une écriture, les réservations se relisent (les autres sources ne changent pas).
  const relireReservations = async () => {
    const reservations = await chargerReservations(today)
    setLecture((l) => l && { ...l, sources: { ...l.sources, reservations } })
    return reservations
  }

  const etat = useMemo<EtatSalles | null>(() => lecture && ({
    today, date, langue, sources: lecture.sources,
    occupations: (d: string) => occupationsDu(d, lecture.sources),
    modifiable: (o) => (o.reservation && canEditReservation(user, profile, o.reservation) ? o.reservation : null),
    modifier: (r) => setOuverture({ reservation: r }),
    supprimer: async (r) => {
      const oui = await confirmer({ titre: t("salles.supprimer.titre"), texte: t("salles.supprimer.texte", { quoi: r.quoi }), action: t("common.buttons.delete"), destructif: true })
      if (!oui) return
      await deleteReservation(r.id)
      await relireReservations()
    },
  }), [lecture, today, date, langue, user, profile, confirmer, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const heureDuRepere = repere === "maintenant" ? heureDeParis() : repere
  const reserver = () => setOuverture({ date: date < today ? today : date, ...momentDuRepere(heureDuRepere) })
  // SA11 (T3c) : une case de la Grille (glisser, appui, Entrée) ouvre la feuille sur son moment et sa salle.
  const reserverCase = (m: MomentCase) => setOuverture({ date, ...m })
  // « Réserver une salle » de l'en-tête (dès 768 px).
  useEffect(() => {
    window.addEventListener(RESERVER_SALLE, reserver)
    return () => window.removeEventListener(RESERVER_SALLE, reserver)
  })

  // SA8 : avant d'écrire, les réservations se relisent ; une occupation qui croise désormais le moment (hors la
  // réservation qu'on modifie) refuse l'envoi, et la feuille, relue, nomme l'occupant. SA9 : après l'écriture, une
  // réservation enregistrée au même moment qui croise la sienne est signalée au serveur (message aux deux auteurs).
  const enregistrer = async (saisie: Saisie, id?: string): Promise<"ok" | "refus"> => {
    if (!user || !lecture) return "refus"
    const avant = await relireReservations()
    if (chevauchement(occupationsDu(saisie.date, { ...lecture.sources, reservations: avant }), saisie.salle, saisie, id)) return "refus"
    let ecrite = id
    // AS3, AS4 : une réservation de fête suit les règles de la fête ; hors des plages de la saison, c'est « un autre moment ».
    let champs: Saisie = saisie
    if (saisie.fete) {
      const p = lecture.sources.scene.find(({ programme }) => programme.id === saisie.fete)?.programme
      if (!p?.debut || !canReserverPour(user, profile, p, saisie.qui ?? [])) throw new Error("fete")
      if (!dansUnePlage(saisonDe({ ...p, debut: p.debut }), { dimanche: saisie.date, debut: saisie.debut, fin: saisie.fin })) champs = { ...saisie, libre: true }
    }
    if (id) await updateReservation(id, champs)
    else ecrite = await createReservation({ ...champs, auteurUid: user.uid, auteurNom: profile?.firstName?.trim() || user.email || "" })
    const apres = await relireReservations()
    const moi = apres.find((r) => r.id === ecrite)
    const autre = moi && autreQuiCroise(moi, apres)
    if (autre) void signalerConflit([moi.id, autre.id])
    return "ok"
  }

  const choisirJour = (d: string) => {
    setDate(d)
    setRepere(d === today ? "maintenant" : "08:00")
  }

  const liste = !etat ? <Squelette enTete={false} className="p-0" /> : (
    <Liste etat={etat} vue={vue} surGris={!grand || vue === "grille"} choisirVue={surLaListe ? retenirVue : null} repere={repere} setRepere={setRepere} choisirJour={choisirJour} reserver={canReserverSalle(user) ? reserver : null} reserverCase={canReserverSalle(user) && date >= today ? reserverCase : null} echec={lecture!.echec} actif={surLaListe ? null : pathname.split("/")[3] ?? null} />
  )

  return (
    <Contexte.Provider value={etat}>
      {grand && vue === "grille" ? (
        <div>
          {enTete}
          <div data-fond-groupe className="px-[var(--marge-page)] pb-6">{liste}</div>
        </div>
      ) : grand ? (
        <div>
          {enTete}
          <DeuxVolets racine={RACINE_SALLES} colonneSeule liste={<div className="px-3 py-4">{liste}</div>}>{children}</DeuxVolets>
        </div>
      ) : (
        <>
          {surLaListe && enTete}
          <main className={`px-[var(--marge-page)] pb-16 ${surLaListe ? "" : "pt-6"}`}>
            <DeuxVolets racine={RACINE_SALLES} liste={<div className="mx-auto max-w-2xl md:max-w-none">{liste}</div>}>{children}</DeuxVolets>
          </main>
        </>
      )}
      {etat && (
        <FeuilleReserver ouverture={ouverture} fermer={() => setOuverture(null)} today={today} langue={langue} occupationsDu={etat.occupations} enregistrer={enregistrer}
          feteDu={(d) => {
            const s = saisonFeteDu(d, etat.sources.scene)
            if (!s) return null
            const p = s.programme
            const coordination = isCoordination(user, profile)
            const familles = famillesDe(p.quiAutorises ?? []).map((f) => t(`planning.saison.familles.${f}`))
            return {
              id: p.id, nom: libelleEdition(s.fete, s.annee, langue), court: nomFete(s.fete, langue), ouverte: s.ouverte,
              permis: canReserverPour(user, profile, p, []), quiOptions: quiPermis(coordination ? {} : p),
              quiAutre: canReserverPour(user, profile, p, ["Autre…"]),
              familles: new Intl.ListFormat(langue === "zh" ? "zh-CN" : "fr", { style: "long", type: "conjunction" }).format(familles),
              saison: saisonDe({ ...p, debut: p.debut! }),
            } satisfies FeteDeLaFeuille
          }}
          nomFete={(id) => { const s = etat.sources.scene.find(({ programme }) => programme.id === id)?.programme; const f = s && feteDe(s); return s && f ? libelleEdition(f, s.annee ?? Number(s.jourJ.slice(0, 4)), langue) : null }} />
      )}
    </Contexte.Provider>
  )
}

const GROUPES: GroupeSalle[] = ["grande", "groupe", "bureaux"]

function Liste({ etat, vue, surGris, choisirVue, repere, setRepere, choisirJour, reserver, reserverCase, echec, actif }: {
  etat: EtatSalles
  vue: Vue
  /** La page est grise autour (un volet, ou la Grille) : le sélecteur prend la piste du fond de groupe. */
  surGris: boolean
  /** Le sélecteur « Liste · Grille » ; null sur la journée d'une salle. */
  choisirVue: ((v: Vue) => void) | null
  repere: string
  setRepere: (r: string) => void
  choisirJour: (d: string) => void
  /** « Réserver une salle », au téléphone en bas de la liste ; null sans droit. */
  reserver: (() => void) | null
  /** Une case de la Grille ouvre la feuille (SA11) ; null sans droit ou un jour passé. */
  reserverCase: ((m: MomentCase) => void) | null
  echec: boolean
  actif: string | null
}) {
  const { t } = useTranslation()
  const { today, date, langue, sources } = etat
  const occupations = etat.occupations(date)
  const heure = repere === "maintenant" ? heureDeParis() : repere
  const jours = Array.from({ length: JOURS_DE_LA_BANDE }, (_, i) => addDays(today, i))
  const fete = occupations.find((o) => o.source === "fete")
  const variante = new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ? varianteDu(date, sources.services) : null
  const nomDuJour = fete ? nomOccupant(fete, langue) : variante ? t(`salles.variante.${variante}`) : null

  return (
    <div className="space-y-4">
      {/* Bande de jours (SA1) : aujourd'hui et les treize suivants ; elle défile à l'horizontale. */}
      <div role="group" aria-label={t("salles.jours")} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {jours.map((j) => {
          const choisi = j === date
          const d = new Date(`${j}T12:00:00Z`)
          const court = new Intl.DateTimeFormat(langue === "zh" ? "zh-CN" : "fr-FR", { timeZone: "UTC", weekday: "short" }).format(d)
          return (
            <button
              key={j}
              type="button"
              aria-pressed={choisi}
              aria-label={dateLongue(j, langue)}
              onClick={() => choisirJour(j)}
              className={`flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1 text-xs leading-tight transition-colors ${
                choisi ? "bg-foreground text-background" : "bg-secondary text-foreground active:bg-secondary/70"
              }`}
            >
              <span className={choisi ? "" : "text-muted-foreground"}>{j === today ? t("salles.aujourdhui") : court.replace(".", "")}</span>
              <span className="text-sm font-semibold tabular-nums">{d.getUTCDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Ligne de contexte (SA1) : le jour, sa variante ou son jour J, le repère d'heure (AR12). */}
      <div data-contexte-salles className="space-y-0.5 px-1 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          <span className="font-semibold text-foreground first-letter:uppercase">{dateLongue(date, langue)}</span>
          {nomDuJour && <><span aria-hidden>·</span><span>{nomDuJour}</span></>}
          {/* Le sélecteur de vue, à droite de la ligne de contexte : un réglage, pas un onglet (critique-design T2c). */}
          {choisirVue && (
            <span className="ml-auto">
              <Segment
                etiquette={t("salles.vue.etiquette")}
                actif={vue}
                choisir={(v) => choisirVue(v as Vue)}
                surGris={surGris}
                onglets={[{ id: "liste", label: t("salles.vue.liste") }, { id: "grille", label: t("salles.vue.grille") }]}
              />
            </span>
          )}
        </div>
        {/* Le repère d'heure, sur sa ligne (critique-design T2b) : il se touche pour changer l'heure (AR12). */}
        <select
          aria-label={t("salles.heure")}
          value={repere}
          onChange={(e) => setRepere(e.target.value)}
          className="-mx-1 -my-1.5 min-h-11 cursor-pointer rounded-lg bg-transparent px-1 font-semibold text-foreground underline decoration-dotted underline-offset-4 hover:bg-secondary focus-visible:bg-secondary"
        >
          {date === today && <option value="maintenant">{t("salles.maintenant")}</option>}
          {HEURES.map((h) => <option key={h} value={h}>{t("salles.repere", { heure: h })}</option>)}
        </select>
      </div>

      {echec && <p role="status" className="px-1 text-xs text-muted-foreground">{t("salles.echec")}</p>}

      {vue === "grille" ? (
        <GrilleSalles occupations={occupations} heure={heure} ouvrir={reserverCase} langue={langue} dateLongue={dateLongue(date, langue)} />
      ) : (
      <ul aria-label={t("salles.liste")} className="carte-groupe overflow-hidden">
        {GROUPES.map((g) => [
          <li key={`groupe-${g}`} role="none" className="border-t border-border/60 px-4 pb-1 pt-3 first:border-t-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`salles.groupes.${g}`)}</h2>
          </li>,
          ...SALLES.filter((s) => s.groupe === g).map((s) => {
            const e = etatA(occupations, s.id, heure)
            const lignes = occupations.filter((o) => o.salle === s.id && o.source !== "fixe" && o.source !== "fete")
            const choisi = actif === s.id
            return (
              <li key={s.id} data-salle={s.id}>
                <Link
                  href={`${RACINE_SALLES}/${s.id}`}
                  aria-current={choisi ? "page" : undefined}
                  className={`flex min-h-12 items-start gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60 active:bg-secondary ${choisi ? "bg-secondary" : ""}`}
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: e.type === "occupe" ? couleurDe(e.occupation) : "transparent", boxShadow: e.type === "occupe" ? undefined : "inset 0 0 0 1.5px var(--muted-foreground)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{s.nom}</span>
                      {s.autreNom && <span className="text-sm text-muted-foreground">{s.autreNom}</span>}
                    </span>
                    <span data-etat className={`block text-sm ${e.type === "occupe" ? "text-muted-foreground" : "text-foreground"}`}>
                      {/* L'heure ne se sépare pas de « jusqu'à » / « 至 » en fin de ligne. */}
                      {etatEnMots(e, langue).replace(/ (\d\d:\d\d)/g, "\u00a0$1")}
                    </span>
                    {lignes.map((o, i) => (
                      <span key={o.id ?? i} className="block text-xs text-muted-foreground tabular-nums">{ligneOccupation(o, langue)}</span>
                    ))}
                  </span>
                </Link>
              </li>
            )
          }),
        ])}
      </ul>
      )}

      {/* Sous 768 px, « Réserver une salle » est une pilule en bas de la liste (dès 768 px : dans l'en-tête). */}
      {reserver && <div className="md:hidden"><BoutonNouveau dansLeFlux label={t("salles.reserver")} onClick={reserver} /></div>}
    </div>
  )
}

/** Les occupations d'une salle un jour (avec les lieux liés, AR6), pour la journée. */
export function occupationsDeLaSalle(etat: EtatSalles, salle: SalleId, date: string): Occupation[] {
  return occupationsDe(etat.occupations(date), salle)
}
