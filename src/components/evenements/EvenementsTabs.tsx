"use client"

// Les onglets de la section Évènements, en liste : ce fichier n'exporte qu'un hook,
// `useOngletsEvenements`, et ne rend rien. L'en-tête de la section (`SectionEvenements`,
// agencement v18, A10, R4) les pose dans son rail gris (`OngletsRail`), sous le titre, sur
// l'agenda comme sur la scène ; un seul onglet (sans compte) : pas de rail.
// La liste : « Calendrier » (lot 6, public) puis, pour les connectés, le programme de scène
// affiché (« Noël », lot 3 bis) ; sans programme affiché, seule la coordination voit ce second
// onglet (« Scène ») pour en créer un. Le programme affiché est calculé par `currentProgramme`
// (lot 12), la même fonction que la page. Rechargée après chaque écriture (PROGRAMMES_CHANGED).

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
