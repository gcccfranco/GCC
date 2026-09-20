"use client"

// Inscriptions sur la fiche (lot 6, look du lot 6 bis) : bouton plein
// « S'inscrire », puis invités (et nom sans compte) et « Confirmer » ; badge
// « Inscrit » et désinscription ; compteur « N déjà inscrits » et places.
// Tout membre connecté voit qui est inscrit (17/09/2026) ; sans compte, le
// nombre seulement. L'organisateur s'inscrit comme tout le monde. Pour
// l'organisateur et la coordination, le panneau (compteur, ouverture /
// fermeture, liste des inscrits et retrait d'une place) vit dans la carte de
// gestion, au-dessus de la fiche.

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import type { User } from "firebase/auth"
import { canSeeInscrits } from "@/lib/access"
import { getInscription, listInscriptions, updateEvenement } from "@/lib/firebase/evenements"
import { desinscrire, inscrire } from "@/lib/evenements/inscription"
import { categoryColor } from "@/lib/serviceColors"
import { serviceButtonFill } from "@/lib/serviceButton"
import { aCommence, modeInscriptions, nowIsoParis, placesRestantes, refusInscription } from "@/lib/evenements/agenda"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement, Inscription, ModeInscriptions } from "@/types/evenement"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChoixInscriptions, useRaisonInscription } from "@/components/evenements/ChoixInscriptions"

const COLOR = PLANNING_COLORS.scene
const INVITES = [0, 1, 2, 3, 4, 5]

/** Qui est inscrit : nom, invités, « sans compte » ; « Retirer » pour qui gère. */
/** 5C1 : un bouton plein est en encre ; sur l'évènement d'une section il en prend la couleur. */
const pleinDe = (pour: string): React.CSSProperties | undefined =>
  pour === "eglise" ? undefined : { backgroundColor: serviceButtonFill(categoryColor(pour)), color: "#ffffff" }

function ListeInscrits({ liste, busy, onRetirer }: { liste: Inscription[]; busy?: boolean; onRetirer?: (i: Inscription) => void }) {
  const { t } = useTranslation()
  return (
    <ul className="divide-y divide-border text-left" aria-label={t("evenements.inscrits")}>
      {liste.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
          <span>{i.nom}{i.invites > 0 ? <span className="text-muted-foreground"> · {t("evenements.invites", { count: i.invites })}</span> : null}{i.uid ? "" : <span className="text-muted-foreground text-xs"> · {t("evenements.sansCompteTag")}</span>}</span>
          {onRetirer && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onRetirer(i)}>{t("evenements.retirer")}</Button>
          )}
        </li>
      ))}
    </ul>
  )
}

export function Inscriptions({ evenement: e, user, organisateur, onInscrits }: {
  evenement: Evenement
  user: User | null
  /** Le panneau de la carte de gestion porte déjà le compteur. */
  organisateur: boolean
  /** Le serveur a changé le compteur. */
  onInscrits: (n: number) => void
}) {
  const { t } = useTranslation()
  const raison = useRaisonInscription()
  const [mine, setMine] = useState<Inscription | null | undefined>(user ? undefined : null)
  const [choosing, setChoosing] = useState(false)
  const [invites, setInvites] = useState(0)
  const [nom, setNom] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  // La liste des inscrits, pour un membre ; celui qui gère l'a dans son panneau.
  const voitInscrits = canSeeInscrits(user) && !organisateur
  const [liste, setListe] = useState<Inscription[] | null>(null)
  const [showListe, setShowListe] = useState(false)

  useEffect(() => {
    if (user) getInscription(e.id, user.uid).then(setMine).catch(() => setMine(null))
  }, [e.id, user])
  useEffect(() => {
    if (voitInscrits) listInscriptions(e.id).then(setListe).catch(() => setListe([]))
  }, [e.id, voitInscrits])

  const now = nowIsoParis()
  const places = placesRestantes(e)
  const refus = refusInscription(e, invites, now)
  const commence = aCommence(e, now)

  // Lot 11 : l'inscription se passe sur un formulaire externe. Le grand bouton
  // y mène et l'app ne compte plus rien — ni places, ni inscrits, ni période.
  if (refus === "externe") {
    return (
      <section className="space-y-3" aria-label={t("evenements.inscription")}>
        <a href={e.lienExterne} target="_blank" rel="noopener noreferrer" style={pleinDe(e.pour)} className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("evenements.sinscrire")}
        </a>
        <p className="text-center text-sm text-muted-foreground">{raison(e, refus)}</p>
      </section>
    )
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError("")
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : t("evenements.inscriptionError")) } finally { setBusy(false) }
  }

  function participe(ev: FormEvent) {
    ev.preventDefault()
    run(async () => {
      const r = await inscrire(e.id, invites, user ? undefined : nom.trim())
      onInscrits(r.inscrits)
      if (user) setMine(r.mine); else setDone(true)
      setChoosing(false)
      if (voitInscrits) setListe(await listInscriptions(e.id))
    })
  }

  return (
    <section className="space-y-3" aria-label={t("evenements.inscription")}>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {mine === undefined ? null : mine ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" aria-hidden />
            <span>{t("evenements.inscrit")}</span>
            {mine.invites > 0 && <span className="font-normal"> · {t("evenements.invites", { count: mine.invites })}</span>}
          </span>
          {!commence && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => {
              const r = await desinscrire(e.id)
              onInscrits(r.inscrits); setMine(null)
              if (voitInscrits) setListe(await listInscriptions(e.id))
            })}>{t("evenements.meDesinscrire")}</Button>
          )}
        </div>
      ) : done ? (
        <p className="text-sm font-semibold">✓ {t("evenements.inscriptionEnregistree")}</p>
      ) : refus === "complet" ? null : refus ? (
        <p className="text-center text-sm text-muted-foreground">{raison(e, refus)}</p>
      ) : user || e.sansCompte ? (
        choosing ? (
          <form onSubmit={participe} className="space-y-3 rounded-xl bg-secondary/60 p-4">
            {!user && (
              <div className="space-y-1">
                <label htmlFor="ins-nom" className="text-xs font-semibold">{t("evenements.tonNom")}</label>
                <Input id="ins-nom" value={nom} maxLength={40} required autoFocus onChange={(ev) => setNom(ev.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="ins-invites" className="text-xs font-semibold">{t("evenements.invitesLabel")}</label>
              <select id="ins-invites" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={invites} onChange={(ev) => setInvites(Number(ev.target.value))}>
                {INVITES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="flex-1">{t("evenements.confirmer")}</Button>
              <Button type="button" variant="ghost" onClick={() => setChoosing(false)}>{t("evenements.annuler")}</Button>
            </div>
          </form>
        ) : (
          <Button size="lg" className="w-full" style={pleinDe(e.pour)} onClick={() => setChoosing(true)}>{t("evenements.sinscrire")}</Button>
        )
      ) : (
        <p className="text-sm">
          {t("evenements.loginToRegister")}{" "}
          <Link href={`/login?from=${encodeURIComponent(`/evenements/${e.id}`)}`} className="font-semibold underline" style={{ color: COLOR }}>
            {t("evenements.login")}
          </Link>
        </p>
      )}

      {!organisateur && (
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">
            {t("evenements.dejaInscrits", { count: e.inscrits })}
            {places !== null && (
              <span className={places === 0 ? " font-semibold text-destructive" : ""}>
                {" · "}{places === 0 ? t("evenements.complet") : t("evenements.places", { count: places })}
              </span>
            )}
          </p>
          {liste && liste.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setShowListe((v) => !v)}>
                {showListe ? t("evenements.masquerInscrits") : t("evenements.voirInscrits", { count: liste.length })}
              </Button>
              {showListe && <ListeInscrits liste={liste} />}
            </>
          )}
        </div>
      )}
    </section>
  )
}

/** Panneau « Inscriptions » de la carte de gestion : état calculé (Ouvertes ·
 *  Bientôt · Fermées) et sa raison, compteur, réglage Automatique · Ouvertes ·
 *  Fermées (période d'inscription, 17/09/2026), liste des inscrits repliée. */
export function PanneauInscriptions({ evenement: e, relire, onInscrits, onMode, onRetire }: {
  evenement: Evenement
  /** Change quand l'organisateur s'inscrit ou se désinscrit dans la fiche. */
  relire: number
  onInscrits: (n: number) => void
  onMode: (mode: ModeInscriptions) => void
  /** Une place retirée (id = uid pour un compte) : la fiche relit la sienne. */
  onRetire: (id: string) => void
}) {
  const { t } = useTranslation()
  const raison = useRaisonInscription()
  const [liste, setListe] = useState<Inscription[] | null>(null)
  const [showListe, setShowListe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    listInscriptions(e.id).then(setListe).catch(() => setListe([]))
  }, [e.id, relire])

  // L'état se lit sans les places : « Complet » est une autre information, le compteur la porte.
  const refus = refusInscription({ ...e, placesMax: null }, 0, nowIsoParis())
  // Lot 11 : sur formulaire externe, le réglage et le compteur ne veulent plus rien dire.
  const externe = refus === "externe"
  const etat = externe ? "externe" : refus === null ? "ouvertes" : refus === "pasEncore" ? "bientot" : "fermees"

  async function run(action: () => Promise<void>) {
    setBusy(true); setError("")
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : t("evenements.inscriptionError")) } finally { setBusy(false) }
  }

  return (
    <section aria-label={t("evenements.panneauInscriptions")} className="space-y-3 rounded-xl bg-secondary/60 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("evenements.panneauInscriptions")}</h3>
        <span data-testid="etat-inscriptions" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${etat === "ouvertes" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : etat === "bientot" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}>
          {t(`evenements.${etat}`)}
        </span>
      </div>
      {refus && refus !== "complet" && <p className="text-sm text-muted-foreground">{raison(e, refus)}</p>}
      {externe ? (
        <a href={e.lienExterne} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-foreground underline underline-offset-4">{e.lienExterne}</a>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{e.inscrits}</span>
            <span className="text-sm text-muted-foreground">{t("evenements.inscrits").toLowerCase()}</span>
          </p>
          <ChoixInscriptions label={t("evenements.reglageInscriptions")} mode={modeInscriptions(e)} disabled={busy}
            onChange={(m) => run(async () => { await updateEvenement(e.id, { inscriptions: m }); onMode(m) })} />
        </>
      )}
      {liste && liste.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => setShowListe((v) => !v)}>
          {showListe ? t("evenements.masquerInscrits") : t("evenements.voirInscrits", { count: liste.length })}
        </Button>
      )}
      {showListe && liste && liste.length > 0 && (
        <ListeInscrits liste={liste} busy={busy} onRetirer={(i) => {
          if (!window.confirm(t("evenements.confirmRetirer", { nom: i.nom }))) return
          run(async () => {
            const r = await desinscrire(e.id, i.id)
            onInscrits(r.inscrits)
            setListe((l) => (l ?? []).filter((x) => x.id !== i.id))
            onRetire(i.id)
          })
        }} />
      )}
    </section>
  )
}
