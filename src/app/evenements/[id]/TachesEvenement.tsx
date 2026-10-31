"use client"

// Tâches rattachées à l'évènement (lot 14) : sous la fiche, les tâches de MES
// équipes liées à cet évènement, cochées du même geste que sur /taches, et
// « Nouvelle tâche » qui en crée une déjà liée. Rien sans compte, rien sur la
// fiche publique. Lot 1 du chantier « équipes et groupes » (EQ16) : la carte ne
// s'affiche que s'il y a des tâches liées, ou si la personne crée quelque part
// (référents et admins, `equipesOuCreer`) ; « Nouvelle tâche » aussi ; la case
// d'une tâche qu'on ne peut pas cocher est inerte (`peutCocher`).
//
// `evenement` n'est qu'un champ de plus dans equipes/{equipe}/taches/{id}, que
// ses règles couvrent déjà — on ne lit et n'écrit ici que dans ses équipes.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { TacheForm } from "@/components/taches/TacheForm"
import { TacheLigne } from "@/components/taches/TacheLigne"
import { texteRetour } from "@/components/taches/retour"
import { equipesDesTaches, equipesOuCreer, peutCocher } from "@/lib/access"
import { cleNomEquipe } from "@/lib/equipes/table"
import { createTache, cyclerEtat, type TacheValues } from "@/lib/firebase/taches"
import { listProfiles } from "@/lib/firebase/users"
import { todayIso } from "@/lib/scene/dimanches"
import { lignesDeTache, type Ligne } from "@/lib/taches/echeances"
import { prevenirFait, prevenirResponsable } from "@/lib/taches/prevenir"
import { useTaches } from "@/lib/taches/useTaches"
import type { Evenement } from "@/types/evenement"
import type { UserProfile } from "@/types/user"

export function TachesEvenement({ evenement, user, profile }: {
  evenement: Pick<Evenement, "id" | "titre">
  user: { uid: string; email?: string | null } | null
  profile: UserProfile | null
}) {
  const { t } = useTranslation()
  const mesEquipes = equipesDesTaches(user, profile)
  const ouCreer = equipesOuCreer(user, profile)
  const { items, loading, reload } = useTaches(mesEquipes)
  const [creation, setCreation] = useState(false)
  const [membres, setMembres] = useState<UserProfile[]>([])
  const [retour, setRetour] = useState("")

  // Les responsables possibles ne servent qu'au formulaire : lus à son ouverture.
  useEffect(() => {
    if (creation) listProfiles().then(setMembres).catch(() => {})
  }, [creation])

  const today = todayIso()
  const lignes = items
    .flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today))
    .filter((l) => l.tache.evenement?.id === evenement.id)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!user || mesEquipes.length === 0 || (ouCreer.length === 0 && lignes.length === 0)) return null
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  // Même cycle que /taches : À faire → En cours → Terminé ; on ne prévient qu'à « Terminé ».
  async function cocher(l: Ligne) {
    if (!user) return
    setRetour("")
    const etat = await cyclerEtat(l.tache.equipe, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom })
    await reload()
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(l.tache.equipe, l.tache.id, l.date), l.tache))
    }
  }

  async function creer(values: TacheValues, equipe: string) {
    if (!user) return
    const id = await createTache(equipe, values, user.uid)
    setCreation(false)
    await reload()
    // Nommé par quelqu'un d'autre : le responsable est prévenu, comme sur la page de l'équipe.
    if (values.responsableUid && values.responsableUid !== user.uid) prevenirResponsable(equipe, id)
  }

  return (
    <section data-testid="taches-carte" className="space-y-3 raised rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{t("evenements.taches.titre")}</h3>
        {ouCreer.length > 0 && <Button size="sm" variant="outline" onClick={() => setCreation(true)}>{t("taches.nouvelle")}</Button>}
      </div>
      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}
      {!loading && lignes.length === 0 && <p className="text-sm text-muted-foreground">{t("evenements.taches.vide")}</p>}
      {lignes.length > 0 && (
        <div className="-mx-4 -mb-2">
          {lignes.map((l) => (
            <TacheLigne
              key={`${l.tache.equipe}-${l.tache.id}-${l.date}`} ligne={l} equipeLabel={t(cleNomEquipe(l.tache.equipe, true))} sansEvenement
              onToggle={peutCocher(user, profile, l.tache) ? () => cocher(l) : undefined}
            />
          ))}
        </div>
      )}
      {ouCreer.length > 0 && <TacheForm
        open={creation}
        equipe={ouCreer[0]}
        equipes={ouCreer}
        evenement={{ id: evenement.id, titre: evenement.titre }}
        initial={null}
        membres={membres}
        onSubmit={creer}
        onClose={() => setCreation(false)}
      />}
    </section>
  )
}
