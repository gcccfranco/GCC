"use client"

// Inscriptions sur la fiche (lot 6, look du lot 6 bis) : bouton plein
// « S'inscrire », puis invités (et nom sans compte) et « Confirmer » ; badge
// « Inscrit » et désinscription ; compteur « N déjà inscrits » et places.
// Pour l'organisateur et la coordination, la liste des inscrits, le retrait
// d'une place et l'ouverture / fermeture.

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import type { User } from "firebase/auth"
import { getInscription, listInscriptions, updateEvenement } from "@/lib/firebase/evenements"
import { desinscrire, inscrire } from "@/lib/evenements/inscription"
import { aCommence, nowIsoParis, placesRestantes, refusInscription } from "@/lib/evenements/agenda"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement, Inscription } from "@/types/evenement"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const COLOR = PLANNING_COLORS.scene
const INVITES = [0, 1, 2, 3, 4, 5]

export function Inscriptions({ evenement: e, user, canEdit, onInscrits, onOuverte }: {
  evenement: Evenement
  user: User | null
  canEdit: boolean
  /** Le serveur a changé le compteur. */
  onInscrits: (n: number) => void
  onOuverte: (ouverte: boolean) => void
}) {
  const { t } = useTranslation()
  const [mine, setMine] = useState<Inscription | null | undefined>(user ? undefined : null)
  const [liste, setListe] = useState<Inscription[] | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [showListe, setShowListe] = useState(false)
  const [invites, setInvites] = useState(0)
  const [nom, setNom] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) getInscription(e.id, user.uid).then(setMine).catch(() => setMine(null))
  }, [e.id, user])
  useEffect(() => {
    if (canEdit) listInscriptions(e.id).then(setListe).catch(() => setListe([]))
  }, [e.id, canEdit])

  const now = nowIsoParis()
  const places = placesRestantes(e)
  const refus = refusInscription(e, invites, now)
  const commence = aCommence(e, now)

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
      if (canEdit) setListe(await listInscriptions(e.id))
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
              if (canEdit) setListe(await listInscriptions(e.id))
            })}>{t("evenements.meDesinscrire")}</Button>
          )}
        </div>
      ) : done ? (
        <p className="text-sm font-semibold">✓ {t("evenements.inscriptionEnregistree")}</p>
      ) : refus === "complet" ? null : refus ? (
        <p className="text-sm text-muted-foreground">{t("evenements.closed")}</p>
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
          <Button size="lg" className="w-full" onClick={() => setChoosing(true)}>{t("evenements.sinscrire")}</Button>
        )
      ) : (
        <p className="text-sm">
          {t("evenements.loginToRegister")}{" "}
          <Link href={`/login?from=${encodeURIComponent(`/evenements/${e.id}`)}`} className="font-semibold underline" style={{ color: COLOR }}>
            {t("evenements.login")}
          </Link>
        </p>
      )}

      {/* Compteur : pour l'organisateur, le panneau ci-dessous le porte déjà. */}
      {!canEdit && (
      <p className="text-center text-sm text-muted-foreground">
        {t("evenements.dejaInscrits", { count: e.inscrits })}
        {places !== null && (
          <span className={places === 0 ? " font-semibold text-destructive" : ""}>
            {" · "}{places === 0 ? t("evenements.complet") : t("evenements.places", { count: places })}
          </span>
        )}
      </p>
      )}

      {canEdit && (
        <section aria-label={t("evenements.panneauInscriptions")} className="space-y-3 rounded-xl bg-secondary/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{t("evenements.panneauInscriptions")}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.inscriptionOuverte ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
              {e.inscriptionOuverte ? t("evenements.ouvertes") : t("evenements.fermees")}
            </span>
          </div>
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">{e.inscrits}</span>
            <span className="text-sm text-muted-foreground">{t("evenements.inscrits").toLowerCase()}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => {
              await updateEvenement(e.id, { inscriptionOuverte: !e.inscriptionOuverte })
              onOuverte(!e.inscriptionOuverte)
            })}>
              {e.inscriptionOuverte ? t("evenements.fermerInscriptions") : t("evenements.ouvrirInscriptions")}
            </Button>
            {liste && liste.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setShowListe((v) => !v)}>
                {showListe ? t("evenements.masquerInscrits") : t("evenements.voirInscrits", { count: liste.length })}
              </Button>
            )}
          </div>
          {showListe && liste && liste.length > 0 && (
            <ul className="divide-y divide-border" aria-label={t("evenements.inscrits")}>
              {liste.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span>{i.nom}{i.invites > 0 ? <span className="text-muted-foreground"> · {t("evenements.invites", { count: i.invites })}</span> : null}{i.uid ? "" : <span className="text-muted-foreground text-xs"> · {t("evenements.sansCompteTag")}</span>}</span>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
                    if (!window.confirm(t("evenements.confirmRetirer", { nom: i.nom }))) return
                    run(async () => {
                      const r = await desinscrire(e.id, i.id)
                      onInscrits(r.inscrits)
                      setListe((l) => (l ?? []).filter((x) => x.id !== i.id))
                      if (user && i.id === user.uid) setMine(null)
                    })
                  }}>{t("evenements.retirer")}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  )
}
