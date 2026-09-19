"use client"

// Création d'un évènement (lot 6), ou duplication (`?from=id`) : le formulaire
// est pré-rempli sans les dates. Réservé à qui peut créer (coordination,
// droit d'annonces d'une section). En dupliquant, on propose de copier les
// tâches de ses pôles rattachées à l'évènement source, aux mêmes délais (lot 14).

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { creatableEvenementPours, isAdminUser, polesDe } from "@/lib/access"
import { createEvenement, getEvenement } from "@/lib/firebase/evenements"
import { createTache } from "@/lib/firebase/taches"
import { notifyEvenement } from "@/lib/evenements/notify"
import { tachesDupliquees } from "@/lib/taches/echeances"
import { useTaches } from "@/lib/taches/useTaches"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import { TACHE_POLES } from "@/types/tache"
import { EMPTY_EVENEMENT, EvenementForm, type EvenementValues } from "@/components/evenements/EvenementForm"

export function NouveauClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const from = useSearchParams().get("from")
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [initial, setInitial] = useState<EvenementValues | null>(from ? null : EMPTY_EVENEMENT)
  // Duplication : la date de l'évènement source (le formulaire repart sans) et
  // les tâches de mes pôles, pour les copier aux mêmes délais.
  const [sourceDate, setSourceDate] = useState("")
  const { items } = useTaches(!from ? [] : isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile))

  useEffect(() => {
    if (!from) return
    getEvenement(from).then((e) => {
      if (!e) { setInitial(EMPTY_EVENEMENT); return }
      setSourceDate(e.date)
      const { id, organisateurUid, organisateurNom, inscrits, createdAt, updatedAt, ...rest } = e
      void id; void organisateurUid; void organisateurNom; void inscrits; void createdAt; void updatedAt
      setInitial({ ...rest, date: "", heure: e.heure, heureFin: e.heureFin, dateFin: "", inscriptionDebut: "", inscriptionFin: "" })
    })
  }, [from])

  const pours = creatableEvenementPours(user, profile, ANNONCE_SECTIONS)
  if (profileLoading || !user || !initial) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (pours.length === 0) return <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("evenements.reserved")}</p>

  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  return (
    <div className="max-w-2xl mx-auto">
      <EvenementForm
        initial={{ ...initial, contact: initial.contact || nom }}
        pours={pours}
        creation
        onSubmit={async (values, prevenir) => {
          const now = new Date().toISOString()
          const id = await createEvenement({ ...values, organisateurUid: user.uid, organisateurNom: nom, inscrits: 0, createdAt: now, updatedAt: now })
          if (prevenir) await notifyEvenement(id)
          const liees = items.map((x) => x.tache).filter((tache) => tache.evenement?.id === from)
          if (sourceDate && values.date && liees.length > 0 && window.confirm(t("evenements.copierTaches", { count: liees.length }))) {
            try {
              for (const c of tachesDupliquees(liees, sourceDate, values.date, { id, titre: values.titre })) {
                await createTache(c.pole, c.values, user.uid)
              }
            } catch {
              // L'évènement existe : on ouvre sa fiche, dont le bloc Tâches montre ce qui a été copié.
            }
          }
          router.push(`/evenements/${id}`)
        }}
        onCancel={() => router.push(from ? `/evenements/${from}` : "/evenements")}
      />
    </div>
  )
}
