"use client"

// Modification d'un évènement (lot 6) : organisateur + coordination. Le
// compteur d'inscrits n'est jamais envoyé. Lot U6, B3 : au Back-Office ; une réunion sous
// Réunions, un évènement sous Évènements (agencement v18, B15), l'autre adresse redirige.
// Agencement v18 (B3, B4) : en grand, le formulaire s'ouvre dans le volet de droite ; en un volet, c'est
// une page, avec « ‹ Évènements » (ou « ‹ Réunions ») pour retour.

import { useEffect, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, creatableEvenementPours, estReunion } from "@/lib/access"
import { baseBackOffice } from "@/lib/navigation"
import { getEvenement, updateEvenement } from "@/lib/firebase/evenements"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import type { Evenement } from "@/types/evenement"
import { EvenementForm } from "@/components/evenements/EvenementForm"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"

export function ModifierClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const deuxVolets = useDeuxVolets()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [evenement, setEvenement] = useState<Evenement | null | undefined>(undefined)

  useEffect(() => { getEvenement(id).then(setEvenement) }, [id])

  const chemin = usePathname() || ""
  const base = evenement ? baseBackOffice(evenement) : null
  const ailleurs = !!base && !chemin.startsWith(`${base}/`)
  useEffect(() => { if (ailleurs && base) router.replace(`${base}/${id}/modifier`) }, [ailleurs, base, id, router])

  if (ailleurs) return null

  const reunion = !!evenement && estReunion(evenement)
  const page = (contenu: React.ReactNode) => deuxVolets ? <div className="max-w-[720px]">{contenu}</div> : (
    <>
      <EnTetePage
        retour={{ href: reunion ? "/back-office/reunions" : "/back-office/evenements", label: t(reunion ? "backOffice.parties.reunions" : "backOffice.parties.evenements") }}
        titre={evenement ? evenement.titre : t("evenements.modifier")}
        sousTitre={evenement ? t("evenements.modifier") : undefined}
      />
      <div className="px-[var(--marge-page)]">{contenu}</div>
    </>
  )
  if (profileLoading || !user || evenement === undefined) return page(<p className="text-sm text-muted-foreground">{t("common.loading")}</p>)
  if (!evenement) return page(<p className="text-sm text-muted-foreground">{t("evenements.notFound")}</p>)
  if (!canEditEvenement(user, profile, evenement)) return page(<p className="text-sm text-muted-foreground">{t("evenements.reserved")}</p>)

  // Le compte rendu (lot U6) a sa carte : le formulaire ne le réécrit jamais.
  const { id: _id, organisateurUid, organisateurNom, inscrits, createdAt, updatedAt, compteRendu, ...initial } = evenement
  void _id; void organisateurUid; void organisateurNom; void inscrits; void createdAt; void updatedAt; void compteRendu
  // L'organisateur garde le public de sa fiche même s'il ne pourrait plus le choisir aujourd'hui.
  const pours = Array.from(new Set([evenement.pour, ...creatableEvenementPours(user, profile, ANNONCE_SECTIONS)]))

  return page(
    <EvenementForm
      initial={initial}
      pours={pours}
      creation={false}
      inscrits={evenement.inscrits}
      onSubmit={async (values) => {
        await updateEvenement(evenement.id, values)
        router.push(`${base}/${evenement.id}`)
      }}
      onCancel={() => router.push(`${base}/${evenement.id}`)}
    />
  )
}
