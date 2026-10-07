"use client"

// Onglets de la section Évènements : « Calendrier » (lot 6, public) et le
// programme de scène affiché (« Noël », lot 3 bis) pour les connectés ; sans
// programme affiché, seule la coordination voit ce second onglet (« Scène »)
// pour en créer un. Rechargé après chaque écriture (PROGRAMMES_CHANGED).
// Lot 12 : le programme affiché est calculé par `currentProgramme`, la même
// fonction que la page — le nom de l'onglet et la page ne peuvent pas diverger.

// Agencement v18 (A10, R4, docs/spec-agencement-v18.md) : les onglets sont le rail gris de l'en-tête
// de la section (`EnTetePage`, posé par `SectionEvenements`), sous le titre, sur l'agenda comme sur la
// scène ; plus de barre collante au-dessus du titre (R6). Ce fichier n'en donne que la liste
// (`useOngletsEvenements`) ; un seul onglet (sans compte) : la section ne pose pas de rail.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { listProgrammes, PROGRAMMES_CHANGED } from "@/lib/firebase/programmes"
import { currentProgramme, todayIso } from "@/lib/scene/dimanches"
import type { OngletRail } from "@/components/layout/Onglets"
import type { Programme } from "@/types/programme"

/** Les onglets de la section, pour `OngletsRail` : « Calendrier », puis la scène. */
export function useOngletsEvenements(): OngletRail[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [programmes, setProgrammes] = useState<Programme[]>([])

  useEffect(() => {
    if (!user) return
    const load = () => { listProgrammes().then(setProgrammes).catch(() => {}) }
    load()
    window.addEventListener(PROGRAMMES_CHANGED, load)
    return () => window.removeEventListener(PROGRAMMES_CHANGED, load)
  }, [user])

  const current = currentProgramme(programmes, todayIso())
  const onglets: OngletRail[] = [{ id: "calendrier", href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user && (current || isCoordination(user, profile))) {
    onglets.push({ id: "scene", href: "/evenements/scene", label: current?.nom ?? t("planning.tabs.scene") })
  }
  return onglets
}
