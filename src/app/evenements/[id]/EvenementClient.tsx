"use client"

// Fiche d'un évènement (lot 6) : une carte blanche qui porte la bannière,
// les badges, le titre, date · horaire · lieu à icône, la description,
// « Pour plus d'infos » et l'inscription (lot 6 bis, maquette du 16/09/2026 :
// même rendu sur ordinateur, téléphone et tablette). L'organisateur a en plus,
// au-dessus, la carte de gestion de la maquette ; titre et badges y passent.
// Lot U6, B3 (Q14) : Modifier, Dupliquer, Supprimer passent au Back-Office
// (`espace="back-office"`, `/back-office/evenements/<id>`) ; la fiche de l'App
// garde l'inscription, les sujets, le compte rendu, et mène à la gestion par
// « Gérer dans le Back-Office ». Une réunion, au Back-Office : l'en-tête et les
// deux colonnes de la planche bo-reunion-avant.
// Lot U4 bis, B2 (docs/spec-pages-en-grand.md, Q5) : dans l'App, en grand, la fiche se lit à
// droite de l'agenda (planche `evenements-ordinateur`), titre et « Gérer dans le Back-Office » en
// tête. Agencement v18 (A10) : sous 760 px de volet, une seule colonne (bannière, infos et
// inscription, texte, gestion, tâches) ; au-delà, deux (bannière, texte et gestion à gauche ; infos,
// inscription et tâches à droite). En un volet, l'inscription remonte sous les infos (planche
// `evenement-fiche-telephone`).
// `id` : la fiche montrée sans être l'adresse (le prochain évènement de l'agenda, Q3).
// Agencement v18 (B3, B4, docs/spec-agencement-v18.md) : au Back-Office, la fiche de gestion d'un
// évènement (`FicheGestion`) et celle d'une réunion sont dans le volet de droite en grand (titre en h2,
// sous l'en-tête de l'entrée), en page sinon (en-tête commun, « ‹ Évènements » / « ‹ Réunions »).
// Retouches v18 (docs/spec-retouches-v18.md, R1, D1) : « Partager » sur la fiche de l'App, à droite du
// titre en grand, dans la barre de la fiche sinon ; pas au Back-Office (la planche ne l'y montre pas).
// R2 (D2) : en grand, Date · Heure · Lieu titrées, en trois colonnes quand la carte a la place.

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { baseBackOffice } from "@/lib/navigation"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { Button, buttonVariants } from "@/components/ui/button"
import { ArrowRight, Check, Share2 } from "lucide-react"
import { Retour } from "@/components/layout/EnTetePage"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, canSeeEvenement, entreesBackOffice, estDeLaReunion, estResponsable, estReunion } from "@/lib/access"
import { deleteEvenement, getEvenement, listReunionsDu } from "@/lib/firebase/evenements"
import { listSujets, retirerSujet } from "@/lib/firebase/sujets"
import { isInfo } from "@/lib/evenements/agenda"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { Banniere, EnteteEvenement, InfosEvenement, PlusInfos, TitreEvenement, TypePour } from "../EvenementCard"
import { useDisposition } from "@/hooks/useDisposition"
import { Inscriptions, PanneauInscriptions } from "./Inscriptions"
import { TachesEvenement } from "./TachesEvenement"
import { QrCodeLink } from "@/components/evenements/QrCode"
import { SujetsAborder } from "@/components/reunions/SujetsAborder"
import { ReunionsPrecedentes } from "@/components/reunions/ReunionsPrecedentes"
import { CompteRenduCarte } from "@/components/reunions/CompteRenduCarte"
import { EnTeteReunion } from "@/components/reunions/EnTeteReunion"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import { FicheGestion } from "@/app/back-office/evenements/FicheGestion"
import styles from "@/app/back-office/evenements/gestion.module.css"

const COLOR = PLANNING_COLORS.scene
const URL_RE = /(https?:\/\/[^\s]+)/g

/** Texte avec ses URLs cliquables (même règle que les annonces). */
function Linkified({ text }: { text: string }) {
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {text.split(URL_RE).map((part, i) =>
        URL_RE.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COLOR }}>{part}</a>
          : <span key={i}>{part}</span>,
      )}
    </p>
  )
}

const sansAbonnement = () => () => {}
/** La feuille de partage ou le presse-papiers : ni l'un ni l'autre hors https (sauf localhost). */
const peutPartager = () => typeof navigator.share === "function" || navigator.clipboard != null

/** « Partager » (R1, D1) : au doigt, la feuille de partage du système quand elle existe ; à la souris
 *  (ou sans feuille), le lien copié et « Lien copié » à la place du libellé pendant 2,5 s. `compact` :
 *  rond sous 640 px, libellé réservé aux lecteurs d'écran, même copié (la barre de la fiche y garde
 *  « Gérer » à côté). Le nom du bouton est son libellé ; la copie est annoncée par une région `status`
 *  voisine, les enfants d'un bouton n'étant pas annoncés. Sans feuille ni presse-papiers, pas de bouton. */
function Partager({ e, className, compact = false }: { e: Evenement; className: string; compact?: boolean }) {
  const { t } = useTranslation()
  const possible = useSyncExternalStore(sansAbonnement, peutPartager, () => false)
  const [copie, setCopie] = useState(false)
  useEffect(() => {
    if (!copie) return
    const minuteur = window.setTimeout(() => setCopie(false), 2500)
    return () => window.clearTimeout(minuteur)
  }, [copie])

  async function partager() {
    const url = `${window.location.origin}/evenements/${e.id}`
    if (typeof navigator.share === "function" && (window.matchMedia("(pointer: coarse)").matches || !navigator.clipboard)) {
      try { await navigator.share({ title: e.titre, url }) } catch { /* partage annulé */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
    } catch { /* écriture refusée */ }
  }

  if (!possible) return null
  return (
    <>
      <button type="button" onClick={partager} className={className}>
        {copie ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
        <span className={compact ? "max-sm:sr-only" : undefined}>
          {copie ? t("evenements.lienCopie") : t("evenements.partager")}
        </span>
      </button>
      <span role="status" className="sr-only">{copie ? t("evenements.lienCopie") : ""}</span>
    </>
  )
}

export function EvenementClient({ espace = "app", id: idDonne }: { espace?: "app" | "back-office"; id?: string }) {
  const { t } = useTranslation()
  const confirmer = useConfirmer()
  const params = useParams<{ id?: string }>()
  const id = idDonne ?? params.id ?? ""
  const grand = useDisposition() === "grand"
  // Au Back-Office (agencement v18, B3, B4) : dans le volet de droite en grand, en page sinon.
  const deuxVolets = useDeuxVolets()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [evenement, setEvenement] = useState<Evenement | null | undefined>(undefined)
  // L'organisateur a les deux cartes : sa place retirée dans le panneau fait
  // relire la fiche, son inscription dans la fiche fait relire le panneau.
  const [cleInscription, setCleInscription] = useState(0)
  const [relireListe, setRelireListe] = useState(0)
  const [erreurSuppression, setErreurSuppression] = useState(false)

  useEffect(() => {
    if (authLoading) return
    getEvenement(id).then(setEvenement).catch(() => setEvenement(null))
  }, [id, authLoading])

  // Lot U6 (R2) : les réunions du même pôle ou de la même équipe (R4), pour
  // « Réunions précédentes » et dater un sujet « repris le … ».
  const pourReunion = user && evenement && estReunion(evenement) ? evenement.pour : null
  const [memePublic, setMemePublic] = useState<Evenement[]>([])
  useEffect(() => {
    if (!pourReunion) return
    listReunionsDu(pourReunion).then(setMemePublic).catch(() => setMemePublic([]))
  }, [pourReunion])

  // Agencement v18 (B15) : au Back-Office, une réunion se gère sous Réunions et un évènement
  // sous Évènements ; ouverte sous l'autre entrée, la fiche y repart.
  const chemin = usePathname() || ""
  const baseBO = espace === "back-office" && evenement ? baseBackOffice(evenement) : null
  const ailleurs = !!baseBO && !chemin.startsWith(`${baseBO}/`)
  useEffect(() => { if (ailleurs && baseBO) router.replace(`${baseBO}/${id}`) }, [ailleurs, baseBO, id, router])
  // Retouches v18, lot G (G2, D28) : une réunion n'est plus dans l'App ; son adresse mène à sa
  // fiche de Back-Office › Réunions pour qui la voit et a cette entrée.
  const versReunions = espace === "app" && !!evenement && estReunion(evenement) && canSeeEvenement(user, profile, evenement)
    && entreesBackOffice(user, profile).includes("reunions")
  useEffect(() => { if (versReunions) router.replace(`/back-office/reunions/${id}`) }, [versReunions, id, router])

  if (authLoading || (user && profileLoading) || evenement === undefined) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }
  if (ailleurs || versReunions) return null
  if (!evenement || !canSeeEvenement(user, profile, evenement)) {
    return <p className="text-sm text-muted-foreground">{t("evenements.notFound")}</p>
  }

  const e = evenement
  // Organisateur ou coordination : ceux qui gèrent l'évènement.
  const gestionnaire = canEditEvenement(user, profile, e)
  const reunion = estReunion(e)
  const avecInscriptions = !isInfo(e) && !reunion
  const backOffice = espace === "back-office"
  // Au Back-Office : qui gère, ou une personne de la réunion (sujets, compte rendu).
  const deLaReunion = !!user && reunion && estDeLaReunion(user, profile, e)
  if (backOffice && !gestionnaire && !deLaReunion) {
    return <p className="text-sm text-muted-foreground max-w-2xl">{t("evenements.reserved")}</p>
  }
  const liste = backOffice ? baseBackOffice(e) : "/evenements"

  async function supprimer() {
    if (!(await confirmer({ titre: t("evenements.confirmDelete", { titre: e.titre }), texte: t("evenements.confirmDeleteTexte"),
      action: t("common.buttons.delete"), destructif: true }))) return
    setErreurSuppression(false)
    try {
      // Les sujets d'une réunion partent avec elle : orphelins, leurs règles (qui lisent la
      // réunion) ne les laisseraient plus ni lire ni supprimer. Au mieux : un sujet refusé
      // n'empêche pas la suppression.
      if (reunion) {
        const sujets = await listSujets(e.id).catch(() => [])
        await Promise.allSettled(sujets.map((s) => retirerSujet(e.id, s.id)))
      }
      await deleteEvenement(e.id)
      router.push(liste)
    } catch {
      setErreurSuppression(true)
    }
  }
  const messageSuppression = erreurSuppression && (
    <p role="alert" className="text-sm text-destructive">{t("evenements.erreurSuppression")}</p>
  )

  const cartesReunion = user && deLaReunion ? {
    compteRendu: <CompteRenduCarte evenement={e} user={user} profile={profile} onChange={(compteRendu) => setEvenement({ ...e, compteRendu })} />,
    sujets: <SujetsAborder evenement={e} user={user} profile={profile} reunions={memePublic} />,
    precedentes: <ReunionsPrecedentes courante={e} reunions={memePublic} espace={espace} />,
  } : null

  // Réunion au Back-Office (planche bo-reunion-avant ; agencement v18, B4, planche `v18-bo-reunions`) :
  // « Sujets à aborder » (large) à gauche ; compte rendu, réunions précédentes et tâches à droite ; sur
  // une colonne (volet étroit, téléphone), le compte rendu en tête. En un volet, la fiche est une page.
  if (backOffice && reunion) {
    return (
      <div className={`${styles.cadre} space-y-4 ${deuxVolets ? "" : "[&>*:not(header)]:mx-[var(--marge-page)]"}`}>
        <EnTeteReunion e={e} gestion={gestionnaire} onSupprimer={supprimer} />
        {messageSuppression}
        {e.description && <Linkified text={e.description} />}
        {cartesReunion && (
          <div className={styles.reunion}>
            <div data-zone="sujets">{cartesReunion.sujets}</div>
            <div data-zone="droite" className="space-y-4">
              {cartesReunion.compteRendu}
              {cartesReunion.precedentes}
            </div>
            {e.date && <div data-zone="taches"><TachesEvenement evenement={e} user={user} profile={profile} /></div>}
          </div>
        )}
      </div>
    )
  }

  const contenu = (
    <>
      {e.description && <Linkified text={e.description} />}
      {e.liens.length > 0 && (
        <ul className="space-y-1 text-sm">
          {e.liens.map((l, i) => (
            <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COLOR }}>{l.label || l.url}</a></li>
          ))}
        </ul>
      )}
      {e.images.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {e.images.slice(1).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="rounded-lg w-full object-cover" />
          ))}
        </div>
      )}
    </>
  )
  const inscriptions = avecInscriptions && (
    <Inscriptions
      key={cleInscription}
      evenement={e}
      user={user}
      organisateur={gestionnaire}
      onInscrits={(inscrits) => { setEvenement({ ...e, inscrits }); setRelireListe((n) => n + 1) }}
    />
  )
  const panneau = gestionnaire && (
    <>
      {avecInscriptions && (
        <PanneauInscriptions evenement={e} relire={relireListe} onMode={(inscriptions) => setEvenement({ ...e, inscriptions })}
          onInscrits={(inscrits) => setEvenement({ ...e, inscrits })}
          onRetire={(id) => { if (id === user?.uid) setCleInscription((c) => c + 1) }} />
      )}
      <QrCodeLink path={`/evenements/${e.id}`} label={e.titre} avecInscriptions={avecInscriptions} />
    </>
  )
  const reunionEtTaches = (
    <>
      {cartesReunion && (
        <>
          {cartesReunion.compteRendu}
          {cartesReunion.sujets}
          {cartesReunion.precedentes}
        </>
      )}
      {e.date && <TachesEvenement evenement={e} user={user} profile={profile} />}
    </>
  )

  // App, en grand (agencement v18, A10 ; planches `v18-app-evenements*`) : le titre en h2 de 24 px
  // (le h1 est celui de la section, au-dessus des deux volets) et « Gérer dans le Back-Office » en
  // contour à côté ; une colonne sous 760 px de volet, deux au-delà (`.fiche-colonnes`). Sans image,
  // la fiche commence par son titre : plus de cadre gris. La fiche ne pose pas de marge (R10).
  if (!backOffice && grand) {
    return (
      <div className="fiche-grand space-y-4">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1"><TitreEvenement e={e} niveau="h2" grand /></div>
          {gestionnaire && estResponsable(user, profile) && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={`${baseBackOffice(e)}/${e.id}`}>
                <ArrowRight aria-hidden />
                {t("backOffice.gerer")}
              </Link>
            </Button>
          )}
          <Partager e={e} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })} />
        </div>
        <div className="fiche-colonnes">
          <div>
            {e.images[0] && <div className="order-1"><Banniere e={e} /></div>}
            <div className="order-3 space-y-4 empty:hidden">{contenu}</div>
            {/* La gestion des inscriptions (organisateur) : la colonne large, ses trois choix y tiennent. */}
            {panneau && <div data-testid="gestion-carte" className="raised order-4 space-y-4 rounded-2xl p-4">{panneau}</div>}
          </div>
          <div>
            <div data-testid="fiche-carte" className="raised order-2 space-y-4 rounded-2xl p-4">
              <InfosEvenement e={e} titrees />
              <PlusInfos e={e} />
              {inscriptions}
            </div>
            <div className="order-5 space-y-3 empty:hidden">{reunionEtTaches}</div>
          </div>
        </div>
      </div>
    )
  }

  // App, un volet : la barre « ‹ Évènements · Gérer dans le Back-Office » (planche
  // `evenement-fiche-telephone`), puis la fiche d'une carte, l'inscription sous les infos
  // (premier écran). L'organisateur garde sa carte de gestion (panneau, lien d'inscription).
  if (!backOffice) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <div data-testid="barre-fiche" className="flex min-h-10 items-center justify-between gap-3">
          {/* Le seul retour du site (R8, tranche Z). */}
          <Retour href={liste}>{t("evenements.title")}</Retour>
          <div className="flex min-w-0 items-center gap-2">
            {gestionnaire && estResponsable(user, profile) && (
              <Link href={`${baseBackOffice(e)}/${e.id}`} className="raised inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.97]">
                <ArrowRight className="h-4 w-4" aria-hidden />
                {t("backOffice.gerer")}
              </Link>
            )}
            <Partager e={e} compact className="raised inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.97] sm:px-4" />
          </div>
        </div>
        {gestionnaire && (
          <div data-testid="gestion-carte" className="space-y-4 rounded-2xl bg-card p-4">
            <div>
              <h2 className="text-xl font-bold text-foreground text-balance">{e.titre}</h2>
              <div className="mt-2 flex flex-wrap gap-1"><TypePour e={e} /></div>
            </div>
            {panneau}
          </div>
        )}
        <div data-testid="fiche-carte" className="space-y-4 rounded-2xl bg-card p-4">
          <EnteteEvenement e={e} titre={gestionnaire ? false : "h2"} />
          <PlusInfos e={e} />
          {inscriptions}
          {contenu}
        </div>
        {reunionEtTaches}
      </div>
    )
  }

  // Au Back-Office, un évènement : la fiche de gestion (agencement v18, B3).
  return (
    <FicheGestion e={e} user={user} profile={profile} onSupprimer={supprimer} erreur={messageSuppression}
      onChange={setEvenement} />
  )
}
