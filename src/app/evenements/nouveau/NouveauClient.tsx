"use client"

// Création d'un évènement (lot 6), ou duplication (`?from=id`) : le formulaire
// est pré-rempli sans les dates. Réservé à qui peut créer (coordination,
// droit d'annonces d'une section).

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { creatableEvenementPours } from "@/lib/access"
import { createEvenement, getEvenement } from "@/lib/firebase/evenements"
import { notifyEvenement } from "@/lib/evenements/notify"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import { EMPTY_EVENEMENT, EvenementForm, type EvenementValues } from "@/components/evenements/EvenementForm"

export function NouveauClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const from = useSearchParams().get("from")
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [initial, setInitial] = useState<EvenementValues | null>(from ? null : EMPTY_EVENEMENT)

  useEffect(() => {
    if (!from) return
    getEvenement(from).then((e) => {
      if (!e) { setInitial(EMPTY_EVENEMENT); return }
      const { id, organisateurUid, organisateurNom, inscrits, createdAt, updatedAt, ...rest } = e
      void id; void organisateurUid; void organisateurNom; void inscrits; void createdAt; void updatedAt
      setInitial({ ...rest, date: "", heure: e.heure, heureFin: e.heureFin, dateFin: "" })
    })
  }, [from])

  const pours = creatableEvenementPours(user, profile, ANNONCE_SECTIONS)
  if (profileLoading || !user || !initial) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (pours.length === 0) return <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("evenements.reserved")}</p>

  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  return (
    <div className="max-w-2xl mx-auto">
      <EvenementForm
        initial={initial}
        pours={pours}
        creation
        onSubmit={async (values, prevenir) => {
          const now = new Date().toISOString()
          const id = await createEvenement({ ...values, organisateurUid: user.uid, organisateurNom: nom, inscrits: 0, createdAt: now, updatedAt: now })
          if (prevenir) await notifyEvenement(id)
          router.push(`/evenements/${id}`)
        }}
        onCancel={() => router.push(from ? `/evenements/${from}` : "/evenements")}
      />
    </div>
  )
}
