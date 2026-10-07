"use client"

// Fiche de gestion d'un évènement au Back-Office, pour qui le gère (organisateur, coordination) (agencement v18, B3, piste A ; planche
// `v18-bo-evenements-a`). En grand, dans le volet de droite : vignette (si image), badges, titre en h2,
// « Voir comme un membre » (la fiche de l'App), « Modifier », « ⋯ » (Dupliquer, Supprimer) ; le bandeau
// d'infos (date, heure, lieu, public, contact) ; « Inscrits » (jauge, liste, Exporter) à gauche,
// « Tâches » et « Période d'inscription » (réglage, QR code) à droite — l'un sous l'autre quand le volet
// est étroit. En un volet, la fiche est une page : son en-tête commun porte le seul retour,
// « ‹ Évènements » (R8). La suppression passe par la fenêtre du site (R9), dans `EvenementClient`.
// Aucune donnée nouvelle : « Exporter » écrit un CSV de la liste déjà lue.

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import type { User } from "firebase/auth"
import { CalendarDays, Clock, Copy, Download, Eye, Info, MapPin, Pencil, Trash2, Users } from "lucide-react"
import { useConfirmer } from "@/components/layout/Confirmer"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { MenuActions } from "@/components/layout/MenuActions"
import { ChoixInscriptions, useRaisonInscription } from "@/components/evenements/ChoixInscriptions"
import { QrCodeLink } from "@/components/evenements/QrCode"
import { Button } from "@/components/ui/button"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import { equipeDuPour, poleDuPour } from "@/lib/access"
import { isInfo, modeInscriptions, nowIsoParis, refusInscription } from "@/lib/evenements/agenda"
import { desinscrire } from "@/lib/evenements/inscription"
import { listInscriptions, updateEvenement } from "@/lib/firebase/evenements"
import { fdFullL } from "@/lib/planning/utils"
import { categoryLabel } from "@/lib/serviceColors"
import { cn } from "@/lib/utils"
import type { Evenement, Inscription } from "@/types/evenement"
import type { UserProfile } from "@/types/user"
import { TypePour } from "@/app/evenements/EvenementCard"
import { ListeInscrits } from "@/app/evenements/[id]/Inscriptions"
import { TachesEvenement } from "@/app/evenements/[id]/TachesEvenement"
import styles from "./gestion.module.css"

const BASE = "/back-office/evenements"
const carte = "raised rounded-2xl p-4"

/** Une cellule CSV : entre guillemets si besoin (`;`, guillemet, retour à la ligne). */
const cellule = (v: string | number) => {
  const s = String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function FicheGestion({ e, user, profile, onSupprimer, erreur, onChange }: {
  e: Evenement
  user: User | null
  profile: UserProfile | null
  onSupprimer: () => void
  /** Le message d'une suppression refusée. */
  erreur: ReactNode
  onChange: (e: Evenement) => void
}) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const deuxVolets = useDeuxVolets()
  const avecInscriptions = !isInfo(e)

  const menu = (
    <MenuActions actions={[
      { label: t("evenements.dupliquer"), icone: Copy, onSelect: () => router.push(`${BASE}/nouveau?from=${e.id}`) },
      { label: t("evenements.supprimer"), icone: Trash2, destructif: true, onSelect: onSupprimer },
    ]} />
  )
  const modifier = (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={`${BASE}/${e.id}/modifier`}><Pencil aria-hidden /> {t("evenements.modifier")}</Link>
    </Button>
  )
  const voir = (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={`/evenements/${e.id}`}><Eye aria-hidden /> {t("backOffice.gestion.voirCommeMembre")}</Link>
    </Button>
  )

  const publicLabel = e.pour === "eglise"
    ? t("evenements.pourEglise")
    : poleDuPour(e.pour) ? t("evenements.pourPole", { pole: t(`taches.pole.${poleDuPour(e.pour)}`) })
    : equipeDuPour(e.pour) ? t(`equipes.team.${equipeDuPour(e.pour)}`)
    : categoryLabel(e.pour)
  const infos: [typeof CalendarDays, string][] = [
    ...(isInfo(e) ? [] : [[CalendarDays, e.dateFin
      ? t("evenements.du", { from: fdFullL(e.date, i18n.language), to: fdFullL(e.dateFin, i18n.language) })
      : fdFullL(e.date, i18n.language)] as [typeof CalendarDays, string]]),
    ...(e.heure ? [[Clock, `${e.heure}${e.heureFin ? ` – ${e.heureFin}` : ""}`] as [typeof CalendarDays, string]] : []),
    ...(e.lieu ? [[MapPin, e.lieu] as [typeof CalendarDays, string]] : []),
    [Users, publicLabel],
    [Info, t("backOffice.gestion.contact", { nom: e.contact || e.organisateurNom })],
  ]

  return (
    <article data-testid="fiche-gestion" className={cn(styles.cadre, "space-y-4", !deuxVolets && "[&>*:not(header)]:mx-[var(--marge-page)]")}>
      {deuxVolets ? (
        <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {e.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.images[0]} alt="" className="h-[60px] w-24 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1"><TypePour e={e} /></div>
              <h2 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">{e.titre}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{voir}{modifier}{menu}</div>
        </header>
      ) : (
        <>
          <EnTetePage retour={{ href: BASE, label: t("backOffice.parties.evenements") }} titre={e.titre} outils={<>{modifier}{menu}</>} />
          <div className="flex flex-wrap items-center gap-2">
            <TypePour e={e} />
            <span className="ml-auto">{voir}</span>
          </div>
        </>
      )}
      {erreur}

      <section data-testid="infos-gestion" className={cn(carte, "space-y-3")}>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
          {infos.map(([Icone, texte]) => (
            <li key={texte} className="flex items-center gap-2">
              <Icone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="first-letter:uppercase">{texte}</span>
            </li>
          ))}
        </ul>
        {e.description && <p className="border-t border-border pt-3 text-sm whitespace-pre-wrap break-words text-muted-foreground">{e.description}</p>}
      </section>

      <div className={styles.colonnes}>
        {avecInscriptions && <CarteInscrits e={e} onChange={onChange} />}
        <div className="space-y-4">
          {e.date && <TachesEvenement evenement={e} user={user} profile={profile} />}
          {avecInscriptions && <CartePeriode e={e} onChange={onChange} />}
          {!avecInscriptions && <div className={carte}><QrCodeLink path={`/evenements/${e.id}`} label={e.titre} avecInscriptions={false} /></div>}
        </div>
      </div>
    </article>
  )
}

/** « Inscrits » : la jauge (n sur N places, inscrits et invités), la liste, « Retirer », « Exporter ». */
function CarteInscrits({ e, onChange }: { e: Evenement; onChange: (e: Evenement) => void }) {
  const { t } = useTranslation()
  const confirmer = useConfirmer()
  const [liste, setListe] = useState<Inscription[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState("")
  const externe = refusInscription({ ...e, placesMax: null }, 0, nowIsoParis()) === "externe"

  useEffect(() => { listInscriptions(e.id).then(setListe).catch(() => setListe([])) }, [e.id, e.inscrits])

  const invites = (liste ?? []).reduce((n, i) => n + i.invites, 0)

  function exporter() {
    const lignes = [
      [t("backOffice.gestion.csv.nom"), t("evenements.invitesLabel"), t("evenements.sansCompteTag"), t("backOffice.gestion.csv.le")],
      ...(liste ?? []).map((i) => [i.nom, i.invites, i.uid ? "" : "✓", i.createdAt.slice(0, 10)]),
    ]
    // BOM : Excel lit l'UTF-8 (accents, chinois).
    const blob = new Blob(["﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${t("evenements.inscrits")} - ${e.titre}.csv`.replace(/[\\/:*?"<>|]/g, "-")
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function retirer(i: Inscription) {
    if (!(await confirmer({ titre: t("evenements.confirmRetirer", { nom: i.nom }), action: t("common.buttons.remove"), destructif: true }))) return
    setBusy(true); setErreur("")
    try {
      const r = await desinscrire(e.id, i.id)
      setListe((l) => (l ?? []).filter((x) => x.id !== i.id))
      onChange({ ...e, inscrits: r.inscrits })
    } catch (err) {
      setErreur(err instanceof Error ? err.message : t("evenements.inscriptionError"))
    } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby={`inscrits-${e.id}`} className={cn(carte, "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={`inscrits-${e.id}`} className="text-base font-semibold text-foreground">{t("evenements.inscrits")}</h3>
        {!externe && liste && liste.length > 0 && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={exporter}><Download aria-hidden /> {t("backOffice.gestion.exporter")}</Button>
        )}
      </div>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {externe ? (
        <a href={e.lienExterne} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-foreground underline underline-offset-4">{e.lienExterne}</a>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{e.inscrits}</span>
            <span className="text-sm text-muted-foreground">
              {[
                e.placesMax ? t("backOffice.gestion.surPlaces", { count: e.placesMax }) : "",
                liste ? [t("backOffice.gestion.personnes", { count: liste.length }), invites > 0 ? t("evenements.invites", { count: invites }) : ""].filter(Boolean).join(", ") : "",
              ].filter(Boolean).join(" · ")}
            </span>
          </p>
          {liste && liste.length > 0 && <ListeInscrits liste={liste} busy={busy} onRetirer={retirer} />}
        </>
      )}
    </section>
  )
}

/** « Période d'inscription » : l'état (Ouvertes · Bientôt · Fermées) et sa raison, le réglage, le QR code. */
function CartePeriode({ e, onChange }: { e: Evenement; onChange: (e: Evenement) => void }) {
  const { t } = useTranslation()
  const raison = useRaisonInscription()
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState("")
  const refus = refusInscription({ ...e, placesMax: null }, 0, nowIsoParis())
  const externe = refus === "externe"
  const etat = externe ? "externe" : refus === null ? "ouvertes" : refus === "pasEncore" ? "bientot" : "fermees"

  return (
    <section aria-labelledby={`periode-${e.id}`} className={cn(carte, "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={`periode-${e.id}`} className="text-base font-semibold text-foreground">{t("backOffice.gestion.periode")}</h3>
        <span data-testid="etat-inscriptions" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${etat === "ouvertes" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : etat === "bientot" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}>
          {t(`evenements.${etat}`)}
        </span>
      </div>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {!externe && (
        <ChoixInscriptions label={t("evenements.reglageInscriptions")} mode={modeInscriptions(e)} disabled={busy}
          onChange={async (m) => {
            setBusy(true); setErreur("")
            try { await updateEvenement(e.id, { inscriptions: m }); onChange({ ...e, inscriptions: m }) }
            catch (err) { setErreur(err instanceof Error ? err.message : t("evenements.inscriptionError")) }
            finally { setBusy(false) }
          }} />
      )}
      {refus && refus !== "complet" && <p className="text-sm text-muted-foreground">{raison(e, refus)}</p>}
      <QrCodeLink path={`/evenements/${e.id}`} label={e.titre} avecInscriptions />
    </section>
  )
}
