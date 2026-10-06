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

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, canSeeEvenement, estDeLaReunion, estResponsable, estReunion } from "@/lib/access"
import { deleteEvenement, getEvenement, listReunionsDu } from "@/lib/firebase/evenements"
import { listSujets, retirerSujet } from "@/lib/firebase/sujets"
import { isInfo } from "@/lib/evenements/agenda"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { Button } from "@/components/ui/button"
import { EnteteEvenement, PlusInfos, TypePour } from "../EvenementCard"
import { Inscriptions, PanneauInscriptions } from "./Inscriptions"
import { TachesEvenement } from "./TachesEvenement"
import { QrCodeLink } from "@/components/evenements/QrCode"
import { SujetsAborder } from "@/components/reunions/SujetsAborder"
import { ReunionsPrecedentes } from "@/components/reunions/ReunionsPrecedentes"
import { CompteRenduCarte } from "@/components/reunions/CompteRenduCarte"
import { EnTeteReunion } from "@/components/reunions/EnTeteReunion"

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

export function EvenementClient({ espace = "app" }: { espace?: "app" | "back-office" }) {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
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
  const pourReunion = user && evenement && estReunion(evenement.pour) ? evenement.pour : null
  const [memePublic, setMemePublic] = useState<Evenement[]>([])
  useEffect(() => {
    if (!pourReunion) return
    listReunionsDu(pourReunion).then(setMemePublic).catch(() => setMemePublic([]))
  }, [pourReunion])

  if (authLoading || (user && profileLoading) || evenement === undefined) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }
  if (!evenement || !canSeeEvenement(user, profile, evenement)) {
    return <p className="text-sm text-muted-foreground">{t("evenements.notFound")}</p>
  }

  const e = evenement
  // Organisateur ou coordination : ceux qui gèrent l'évènement.
  const gestionnaire = canEditEvenement(user, profile, e)
  const reunion = estReunion(e.pour)
  const avecInscriptions = !isInfo(e) && !reunion
  const backOffice = espace === "back-office"
  // Au Back-Office : qui gère, ou une personne de la réunion (sujets, compte rendu).
  const deLaReunion = !!user && reunion && estDeLaReunion(user, profile, e)
  if (backOffice && !gestionnaire && !deLaReunion) {
    return <p className="text-sm text-muted-foreground max-w-2xl">{t("evenements.reserved")}</p>
  }
  const liste = backOffice ? (reunion ? "/back-office/evenements/reunions" : "/back-office/evenements") : "/evenements"

  async function supprimer() {
    if (!window.confirm(t("evenements.confirmDelete", { titre: e.titre }))) return
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

  const retour = (
    <Link href={liste} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
      ← {backOffice ? t(reunion ? "backOffice.parties.reunions" : "backOffice.parties.evenements") : t("evenements.title")}
    </Link>
  )
  const cartesReunion = user && deLaReunion ? {
    compteRendu: <CompteRenduCarte evenement={e} user={user} profile={profile} onChange={(compteRendu) => setEvenement({ ...e, compteRendu })} />,
    sujets: <SujetsAborder evenement={e} user={user} profile={profile} reunions={memePublic} />,
    precedentes: <ReunionsPrecedentes courante={e} reunions={memePublic} espace={espace} />,
  } : null

  // Réunion au Back-Office (planche bo-reunion-avant) : sujets à gauche, compte rendu et
  // réunions précédentes à droite ; sur téléphone, le compte rendu en tête.
  if (backOffice && reunion) {
    return (
      <div className="max-w-5xl space-y-4">
        {retour}
        <EnTeteReunion e={e} gestion={gestionnaire} onSupprimer={supprimer} />
        {messageSuppression}
        {e.description && <Linkified text={e.description} />}
        {cartesReunion && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <div className="space-y-4">
              {cartesReunion.sujets}
              {e.date && <TachesEvenement evenement={e} user={user} profile={profile} />}
            </div>
            <div className="order-first space-y-4 lg:order-none">
              {cartesReunion.compteRendu}
              {cartesReunion.precedentes}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {retour}

      {/* Organisateur (maquette du 16/09/2026, choix du 17/09/2026) : la carte
          de gestion en haut, puis la fiche des membres, où il peut s'inscrire. */}
      {gestionnaire && (
        <div data-testid="gestion-carte" className="space-y-4 rounded-2xl bg-card p-4">
          <div>
            <h2 className="text-xl font-bold text-foreground text-balance">{e.titre}</h2>
            <div className="mt-2 flex flex-wrap gap-1"><TypePour e={e} /></div>
          </div>
          {backOffice ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Button asChild variant="outline"><Link href={`/back-office/evenements/${e.id}/modifier`}>{t("evenements.modifier")}</Link></Button>
                <Button asChild variant="outline"><Link href={`/back-office/evenements/nouveau?from=${e.id}`}>{t("evenements.dupliquer")}</Link></Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={supprimer}>{t("evenements.supprimer")}</Button>
              </div>
              {messageSuppression}
            </>
          ) : estResponsable(user, profile) && (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/back-office/evenements/${e.id}`}>{t("backOffice.gerer")}</Link>
            </Button>
          )}
          {avecInscriptions && (
            <PanneauInscriptions evenement={e} relire={relireListe} onMode={(inscriptions) => setEvenement({ ...e, inscriptions })}
              onInscrits={(inscrits) => setEvenement({ ...e, inscrits })}
              onRetire={(id) => { if (id === user?.uid) setCleInscription((c) => c + 1) }} />
          )}
          <QrCodeLink path={`/evenements/${e.id}`} label={e.titre} avecInscriptions={avecInscriptions} />
        </div>
      )}

      <div data-testid="fiche-carte" className="space-y-4 rounded-2xl bg-card p-4">
      <EnteteEvenement e={e} titre={gestionnaire ? false : "h2"} />

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

      <PlusInfos e={e} />

      {avecInscriptions && (
        <Inscriptions
          key={cleInscription}
          evenement={e}
          user={user}
          organisateur={gestionnaire}
          onInscrits={(inscrits) => { setEvenement({ ...e, inscrits }); setRelireListe((n) => n + 1) }}
        />
      )}
      </div>

      {/* Lot U6 (R1 à R4) : le compte rendu en tête, les sujets d'une réunion
          de pôle ou d'équipe et les réunions précédentes, pour les personnes de
          la réunion — les mêmes cartes pour les membres et pour qui la gère. */}
      {cartesReunion && (
        <>
          {cartesReunion.compteRendu}
          {cartesReunion.sujets}
          {cartesReunion.precedentes}
        </>
      )}

      {/* Lot 14 : les tâches de mes pôles rattachées à l'évènement. Daté
          seulement (réunions de pôle comprises) : une info sans date n'a pas de délai. */}
      {e.date && <TachesEvenement evenement={e} user={user} profile={profile} />}
    </div>
  )
}
