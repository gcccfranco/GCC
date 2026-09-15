"use client"

// Modification d'un évènement (lot 6) : organisateur + coordination. Le
// compteur d'inscrits n'est jamais envoyé.

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canEditEvenement, creatableEvenementPours } from "@/lib/access"
import { getEvenement, updateEvenement } from "@/lib/firebase/evenements"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import type { Evenement } from "@/types/evenement"
import { EvenementForm } from "@/components/evenements/EvenementForm"

export function ModifierClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [evenement, setEvenement] = useState<Evenement | null | undefined>(undefined)

  useEffect(() => { getEvenement(id).then(setEvenement) }, [id])

  if (profileLoading || !user || evenement === undefined) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (!evenement) return <p className="text-sm text-muted-foreground">{t("evenements.notFound")}</p>
  if (!canEditEvenement(user, profile, evenement)) return <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("evenements.reserved")}</p>

  const { id: _id, organisateurUid, organisateurNom, inscrits, createdAt, updatedAt, ...initial } = evenement
  void _id; void organisateurUid; void organisateurNom; void inscrits; void createdAt; void updatedAt
  // L'organisateur garde le public de sa fiche même s'il ne pourrait plus le choisir aujourd'hui.
  const pours = Array.from(new Set([evenement.pour, ...creatableEvenementPours(user, profile, ANNONCE_SECTIONS)]))

  return (
    <div className="max-w-2xl mx-auto">
      <EvenementForm
        initial={initial}
        pours={pours}
        creation={false}
        onSubmit={async (values) => {
          await updateEvenement(evenement.id, values)
          router.push(`/evenements/${evenement.id}`)
        }}
        onCancel={() => router.push(`/evenements/${evenement.id}`)}
      />
    </div>
  )
}
