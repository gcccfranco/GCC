"use client"

// Fiche d'un évènement (lot 6) : une carte blanche qui porte la bannière,
// les badges, le titre, date · horaire · lieu à icône, la description,
// « Pour plus d'infos » et l'inscription (lot 6 bis, maquette du 16/09/2026 :
// même rendu sur ordinateur, téléphone et tablette). L'organisateur a en plus,
// au-dessus, la carte de gestion de la maquette ; titre et badges y passent.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, canSeeEvenement, poleDuPour } from "@/lib/access"
import { deleteEvenement, getEvenement } from "@/lib/firebase/evenements"
import { isInfo } from "@/lib/evenements/agenda"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { Button } from "@/components/ui/button"
import { EnteteEvenement, PlusInfos, TypePour } from "../EvenementCard"
import { Inscriptions, PanneauInscriptions } from "./Inscriptions"
import { QrCodeLink } from "@/components/evenements/QrCode"

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

export function EvenementClient() {
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

  useEffect(() => {
    if (authLoading) return
    getEvenement(id).then(setEvenement).catch(() => setEvenement(null))
  }, [id, authLoading])

  if (authLoading || (user && profileLoading) || evenement === undefined) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }
  if (!evenement || !canSeeEvenement(user, profile, evenement)) {
    return <p className="text-sm text-muted-foreground">{t("evenements.notFound")}</p>
  }

  const e = evenement
  // Organisateur ou coordination : ceux qui gèrent l'évènement.
  const gestionnaire = canEditEvenement(user, profile, e)
  const avecInscriptions = !isInfo(e) && !poleDuPour(e.pour)

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <Link href="/evenements" className="text-xs font-semibold text-muted-foreground hover:text-foreground">← {t("evenements.title")}</Link>

      {/* Organisateur (maquette du 16/09/2026, choix du 17/09/2026) : la carte
          de gestion en haut, puis la fiche des membres, où il peut s'inscrire. */}
      {gestionnaire && (
        <div data-testid="gestion-carte" className="space-y-4 rounded-2xl bg-card p-4">
          <div>
            <h2 className="text-xl font-bold text-foreground text-balance">{e.titre}</h2>
            <div className="mt-2 flex flex-wrap gap-1"><TypePour e={e} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button asChild variant="outline"><Link href={`/evenements/${e.id}/modifier`}>{t("evenements.modifier")}</Link></Button>
            <Button asChild variant="outline"><Link href={`/evenements/nouveau?from=${e.id}`}>{t("evenements.dupliquer")}</Link></Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={async () => {
              if (!window.confirm(t("evenements.confirmDelete", { titre: e.titre }))) return
              await deleteEvenement(e.id)
              router.push("/evenements")
            }}>{t("evenements.supprimer")}</Button>
          </div>
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
    </div>
  )
}
