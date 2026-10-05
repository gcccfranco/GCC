"use client"

// Création d'un évènement (lot 6), ou duplication (`?from=id`) : le formulaire
// est pré-rempli sans les dates. Réservé à qui peut créer (coordination,
// droit d'annonces d'une section). En dupliquant, on propose de copier les
// tâches de ses pôles rattachées à l'évènement source, aux mêmes délais (lot 14).
// Une réunion de pôle (lot U6, R2) : si des réunions déjà tenues du même pôle
// ont laissé des sujets, on demande s'il faut les reprendre (Créer comme Dupliquer).

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { creatableEvenementPours, isAdminUser, poleDuPour, polesDe } from "@/lib/access"
import { createEvenement, getEvenement } from "@/lib/firebase/evenements"
import { createTache } from "@/lib/firebase/taches"
import { lireSujetsAReprendre, reprendreSujets } from "@/lib/firebase/sujets"
import { nowIsoParis } from "@/lib/evenements/agenda"
import type { SujetAReprendre } from "@/lib/reunions/sujets"
import { RepriseSujets } from "@/components/reunions/RepriseSujets"
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
  // La question de la reprise attend sa réponse : `repondre` tient la promesse.
  const [aReprendre, setAReprendre] = useState<SujetAReprendre[] | null>(null)
  const repondre = useRef<(reprendre: boolean) => void>(() => {})
  const demanderReprise = (liste: SujetAReprendre[]) =>
    new Promise<boolean>((resolve) => { repondre.current = resolve; setAReprendre(liste) })

  useEffect(() => {
    if (!from) return
    getEvenement(from).then((e) => {
      if (!e) { setInitial(EMPTY_EVENEMENT); return }
      setSourceDate(e.date)
      const { id, organisateurUid, organisateurNom, inscrits, createdAt, updatedAt, compteRendu, ...rest } = e
      void id; void organisateurUid; void organisateurNom; void inscrits; void createdAt; void updatedAt; void compteRendu
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
          // Réponse avant d'écrire quoi que ce soit : sans réunion créée, rien n'est repris.
          const laisses = poleDuPour(values.pour) ? await lireSujetsAReprendre(values.pour, nowIsoParis()) : []
          const reprendre = laisses.length > 0 && await demanderReprise(laisses)
          const now = new Date().toISOString()
          const id = await createEvenement({ ...values, organisateurUid: user.uid, organisateurNom: nom, inscrits: 0, createdAt: now, updatedAt: now })
          if (prevenir) await notifyEvenement(id)
          if (reprendre) await reprendreSujets(laisses, id, user.uid)
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
      <RepriseSujets aReprendre={aReprendre} onChoix={(reprendre) => { setAReprendre(null); repondre.current(reprendre) }} />
    </div>
  )
}
