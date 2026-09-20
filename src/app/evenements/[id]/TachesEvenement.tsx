"use client"

// Tâches rattachées à l'évènement (lot 14) : sous la fiche, les tâches de MES
// pôles liées à cet évènement, cochées du même geste que sur /taches, et
// « Nouvelle tâche » qui en crée une déjà liée. Réservé aux membres d'un pôle
// et aux admins ; rien sans compte, rien sur la fiche publique.
//
// AUCUNE règle Firestore à publier, aucun changement de src/lib/access.ts,
// aucune collection, aucun cron : `evenement` n'est qu'un champ de plus dans
// poles/{pole}/taches/{id}, que ses règles (isTachePole) couvrent déjà — on ne
// lit et n'écrit ici que dans ses propres pôles.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { TacheForm } from "@/components/taches/TacheForm"
import { TacheLigne } from "@/components/taches/TacheLigne"
import { texteRetour } from "@/components/taches/retour"
import { isAdminUser, polesDe } from "@/lib/access"
import { createTache, cyclerEtat, type TacheValues } from "@/lib/firebase/taches"
import { listProfiles } from "@/lib/firebase/users"
import { todayIso } from "@/lib/scene/dimanches"
import { lignesDeTache, type Ligne } from "@/lib/taches/echeances"
import { prevenirFait, prevenirResponsable } from "@/lib/taches/prevenir"
import { useTaches } from "@/lib/taches/useTaches"
import type { Evenement } from "@/types/evenement"
import { TACHE_POLES, type TachePole } from "@/types/tache"
import type { UserProfile } from "@/types/user"

export function TachesEvenement({ evenement, user, profile }: {
  evenement: Pick<Evenement, "id" | "titre">
  user: { uid: string; email?: string | null } | null
  profile: UserProfile | null
}) {
  const { t } = useTranslation()
  const mesPoles = isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile)
  const { items, loading, reload } = useTaches(mesPoles)
  const [creation, setCreation] = useState(false)
  const [membres, setMembres] = useState<UserProfile[]>([])
  const [retour, setRetour] = useState("")

  // Les responsables possibles ne servent qu'au formulaire : lus à son ouverture.
  useEffect(() => {
    if (creation) listProfiles().then(setMembres).catch(() => {})
  }, [creation])

  if (!user || mesPoles.length === 0) return null

  const today = todayIso()
  const lignes = items
    .flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today))
    .filter((l) => l.tache.evenement?.id === evenement.id)
    .sort((a, b) => a.date.localeCompare(b.date))
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  // Même cycle que /taches : À faire → En cours → Terminé ; on ne prévient qu'à « Terminé ».
  async function cocher(l: Ligne) {
    if (!user) return
    setRetour("")
    const etat = await cyclerEtat(l.tache.pole, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom })
    await reload()
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(l.tache.pole, l.tache.id, l.date), l.tache))
    }
  }

  async function creer(values: TacheValues, pole: TachePole) {
    if (!user) return
    const id = await createTache(pole, values, user.uid)
    setCreation(false)
    await reload()
    // Nommé par quelqu'un d'autre : le responsable est prévenu, comme sur la page du pôle.
    if (values.responsableUid && values.responsableUid !== user.uid) prevenirResponsable(pole, id)
  }

  return (
    <section data-testid="taches-carte" className="space-y-3 rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{t("evenements.taches.titre")}</h3>
        <Button size="sm" variant="outline" onClick={() => setCreation(true)}>{t("taches.nouvelle")}</Button>
      </div>
      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}
      {!loading && lignes.length === 0 && <p className="text-sm text-muted-foreground">{t("evenements.taches.vide")}</p>}
      {lignes.length > 0 && (
        <div className="-mx-4 -mb-2">
          {lignes.map((l) => (
            <TacheLigne key={`${l.tache.pole}-${l.tache.id}-${l.date}`} ligne={l} poleLabel={t(`taches.pole.${l.tache.pole}`)} sansEvenement onToggle={() => cocher(l)} />
          ))}
        </div>
      )}
      <TacheForm
        open={creation}
        pole={mesPoles[0]}
        poles={mesPoles}
        evenement={{ id: evenement.id, titre: evenement.titre }}
        initial={null}
        membres={membres}
        onSubmit={creer}
        onClose={() => setCreation(false)}
      />
    </section>
  )
}
