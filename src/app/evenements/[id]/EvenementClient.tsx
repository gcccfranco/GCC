"use client"

// Fiche d'un évènement (lot 6) : une carte blanche qui porte la bannière,
// les badges, le titre, date · horaire · lieu à icône, la description,
// « Pour plus d'infos » et l'inscription (lot 6 bis, maquette du 16/09/2026 :
// même rendu sur ordinateur, téléphone et tablette).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, canSeeEvenement, poleDuPour } from "@/lib/access"
import { deleteEvenement, getEvenement } from "@/lib/firebase/evenements"
import { isInfo } from "@/lib/evenements/agenda"
import { fdFullL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { CalendarDays, Clock, Image as ImageIcon, Info, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TypePour } from "../EvenementCard"
import { Inscriptions } from "./Inscriptions"
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
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [evenement, setEvenement] = useState<Evenement | null | undefined>(undefined)

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

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <Link href="/evenements" className="text-xs font-semibold text-muted-foreground hover:text-foreground">← {t("evenements.title")}</Link>
      <div data-testid="fiche-carte" className="space-y-4 rounded-2xl bg-card p-4">
      {(!isInfo(e) || e.images[0]) && (
        <div data-testid="banniere" className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-secondary">
          {e.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.images[0]} alt={e.titre} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
          )}
        </div>
      )}
      <div>
        <div className="flex flex-wrap gap-1"><TypePour e={e} /></div>
        <h2 className="mt-2 text-xl font-bold text-foreground text-balance">{e.titre}</h2>
      </div>

      {canEditEvenement(user, profile, e) && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link href={`/evenements/${e.id}/modifier`}>{t("evenements.modifier")}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href={`/evenements/nouveau?from=${e.id}`}>{t("evenements.dupliquer")}</Link></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
            if (!window.confirm(t("evenements.confirmDelete", { titre: e.titre }))) return
            await deleteEvenement(e.id)
            router.push("/evenements")
          }}>{t("evenements.supprimer")}</Button>
        </div>
      )}

      {!isInfo(e) && (
        <ul className="space-y-1.5 text-sm text-foreground">
          <li className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-semibold">
              {e.dateFin
                ? t("evenements.du", { from: fdFullL(e.date, i18n.language), to: fdFullL(e.dateFin, i18n.language) })
                : fdFullL(e.date, i18n.language)}
            </span>
          </li>
          {e.heure && (
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{e.heure}{e.heureFin ? ` – ${e.heureFin}` : ""}</span>
            </li>
          )}
          {e.lieu && (
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{e.lieu}</span>
            </li>
          )}
        </ul>
      )}

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

      <p className="flex items-start gap-2.5 border-t border-border pt-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t("evenements.plusInfos", { nom: e.contact || e.organisateurNom })}</span>
      </p>

      {!isInfo(e) && !poleDuPour(e.pour) && (
        <Inscriptions
          evenement={e}
          user={user}
          canEdit={canEditEvenement(user, profile, e)}
          onInscrits={(inscrits) => setEvenement({ ...e, inscrits })}
          onOuverte={(inscriptionOuverte) => setEvenement({ ...e, inscriptionOuverte })}
        />
      )}

      {canEditEvenement(user, profile, e) && <QrCodeLink path={`/evenements/${e.id}`} label={e.titre} />}
      </div>
    </div>
  )
}
