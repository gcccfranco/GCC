"use client"

// Création d'un évènement (lot 6), ou duplication (`?from=id`) : le formulaire
// est pré-rempli sans les dates. Réservé à qui peut créer (coordination,
// droit d'annonces d'une section). En dupliquant, on propose de copier les
// tâches de ses pôles rattachées à l'évènement source, aux mêmes délais (lot 14).
// Une réunion de pôle (lot U6, R2) : si des réunions déjà tenues du même pôle
// ont laissé des sujets, on demande s'il faut les reprendre (Créer comme Dupliquer).
// Lot U6, B3 : le formulaire est au Back-Office (`/back-office/evenements/nouveau`).
// Agencement v18 (B15) : « Nouvelle réunion » est `/back-office/reunions/nouvelle` (`reunion`),
// qui ne propose que les réunions ; l'ancienne `…/evenements/nouveau?reunion=1` y redirige.
// Lot U8, C5 : `?date=AAAA-MM-JJ` (un jour du calendrier) pré-remplit la date.
// Agencement v18 (B3, B4) : en grand, le formulaire s'ouvre dans le volet de droite, sous l'en-tête de
// l'entrée et à côté de la liste ; en un volet, c'est une page, avec « ‹ Évènements » (ou « ‹ Réunions »).

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import { baseBackOffice } from "@/lib/navigation"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { creatableEvenementPours, estReunion, isAdminUser, polesDe } from "@/lib/access"
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

export function NouveauClient({ reunion = false }: { reunion?: boolean }) {
  const { t } = useTranslation()
  const confirmer = useConfirmer()
  const router = useRouter()
  const deuxVolets = useDeuxVolets()
  const params = useSearchParams()
  const from = params.get("from")
  const base = reunion ? "/back-office/reunions" : "/back-office/evenements"
  // Ancienne adresse d'une nouvelle réunion : on garde les autres paramètres (`from`, `date`).
  const ancienneAdresse = !reunion && params.get("reunion") === "1"
  const date = params.get("date") ?? ""
  const vide = /^\d{4}-\d{2}-\d{2}$/.test(date) ? { ...EMPTY_EVENEMENT, date } : EMPTY_EVENEMENT
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [initial, setInitial] = useState<EvenementValues | null>(from ? null : vide)
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
    if (!ancienneAdresse) return
    const suite = new URLSearchParams(params.toString())
    suite.delete("reunion")
    const reste = suite.toString()
    router.replace(`/back-office/reunions/nouvelle${reste ? `?${reste}` : ""}`)
  }, [ancienneAdresse, params, router])

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

  const pours = creatableEvenementPours(user, profile, ANNONCE_SECTIONS).filter((p) => !reunion || estReunion(p))
  if (ancienneAdresse) return null
  const titre = t(reunion ? "backOffice.nouvelleReunion" : "evenements.nouveau")
  const page = (contenu: React.ReactNode) => deuxVolets ? <div className="max-w-[720px]">{contenu}</div> : (
    <>
      <EnTetePage retour={{ href: base, label: t(reunion ? "backOffice.parties.reunions" : "backOffice.parties.evenements") }} titre={titre} />
      <div className="px-[var(--marge-page)]">{contenu}</div>
    </>
  )
  if (profileLoading || !user || !initial) return page(<p className="text-sm text-muted-foreground">{t("common.loading")}</p>)
  if (pours.length === 0) return page(<p className="text-sm text-muted-foreground">{t("evenements.reserved")}</p>)

  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  return page(
    <>
      <EvenementForm
        initial={{ ...initial, contact: initial.contact || nom }}
        pours={pours}
        titreCache={!deuxVolets}
        creation
        onSubmit={async (values, prevenir) => {
          // Réponse avant d'écrire quoi que ce soit : sans réunion créée, rien n'est repris.
          const laisses = estReunion(values.pour) ? await lireSujetsAReprendre(values.pour, nowIsoParis()) : []
          const reprendre = laisses.length > 0 && await demanderReprise(laisses)
          const now = new Date().toISOString()
          const id = await createEvenement({ ...values, organisateurUid: user.uid, organisateurNom: nom, inscrits: 0, createdAt: now, updatedAt: now })
          if (prevenir) await notifyEvenement(id)
          if (reprendre) await reprendreSujets(laisses, id, user.uid)
          const liees = items.map((x) => x.tache).filter((tache) => tache.evenement?.id === from)
          if (sourceDate && values.date && liees.length > 0
            && await confirmer({ titre: t("evenements.copierTaches", { count: liees.length }), action: t("evenements.copierTachesOui") })) {
            try {
              for (const c of tachesDupliquees(liees, sourceDate, values.date, { id, titre: values.titre })) {
                await createTache(c.pole, c.values, user.uid)
              }
            } catch {
              // L'évènement existe : on ouvre sa fiche, dont le bloc Tâches montre ce qui a été copié.
            }
          }
          router.push(`${baseBackOffice(values.pour)}/${id}`)
        }}
        onCancel={() => router.push(from ? `${base}/${from}` : base)}
      />
      <RepriseSujets aReprendre={aReprendre} onChoix={(reprendre) => { setAReprendre(null); repondre.current(reprendre) }} />
    </>
  )
}
