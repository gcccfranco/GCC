"use client"

// Fiche d'un évènement (lot 6) : détails, places, organisateur. Sans compte,
// invitation à se connecter pour s'inscrire (E3 ajoute l'inscription).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, canSeeEvenement } from "@/lib/access"
import { deleteEvenement, getEvenement } from "@/lib/firebase/evenements"
import { isInfo } from "@/lib/evenements/agenda"
import { fdFullL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { Button } from "@/components/ui/button"
import { TypePour } from "../EvenementCard"
import { Inscriptions } from "./Inscriptions"
import { QrCodeButton } from "@/components/evenements/QrCode"

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
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/evenements" className="text-xs font-semibold text-muted-foreground hover:text-foreground">← {t("evenements.title")}</Link>
      <div>
        <h2 className="text-xl font-bold text-foreground text-balance">{e.titre}</h2>
        <div className="flex flex-wrap gap-1 mt-2"><TypePour e={e} /></div>
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
      {canEditEvenement(user, profile, e) && <QrCodeButton path={`/evenements/${e.id}`} label={e.titre} />}

      {!isInfo(e) && (
        <div className="bg-card shadow-soft rounded-xl px-4 py-3 text-sm space-y-1">
          <p className="font-semibold">
            {e.dateFin
              ? t("evenements.du", { from: fdFullL(e.date, i18n.language), to: fdFullL(e.dateFin, i18n.language) })
              : fdFullL(e.date, i18n.language)}
            {e.heure && <span className="font-normal text-muted-foreground"> · {e.heure}{e.heureFin ? ` – ${e.heureFin}` : ""}</span>}
          </p>
          {e.lieu && <p className="text-muted-foreground">{e.lieu}</p>}
        </div>
      )}

      {e.description && <Linkified text={e.description} />}

      {e.liens.length > 0 && (
        <ul className="space-y-1 text-sm">
          {e.liens.map((l, i) => (
            <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COLOR }}>{l.label || l.url}</a></li>
          ))}
        </ul>
      )}

      {e.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {e.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="rounded-lg w-full object-cover" />
          ))}
        </div>
      )}

      {!isInfo(e) && (
        <Inscriptions
          evenement={e}
          user={user}
          canEdit={canEditEvenement(user, profile, e)}
          onInscrits={(inscrits) => setEvenement({ ...e, inscrits })}
          onOuverte={(inscriptionOuverte) => setEvenement({ ...e, inscriptionOuverte })}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {t("evenements.organisePar", { nom: e.organisateurNom })}
        {e.contact ? ` · ${t("evenements.contact", { contact: e.contact })}` : ""}
      </p>
    </div>
  )
}
