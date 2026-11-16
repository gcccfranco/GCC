"use client"

// Les onglets de la section Évènements, en liste : ce fichier n'exporte qu'un hook,
// `useOngletsEvenements`, et ne rend rien. L'en-tête de la section (`SectionEvenements`,
// agencement v18, A10, R4) les pose dans son rail gris (`OngletsRail`), sous le titre, sur
// l'agenda comme sur la scène ; un seul onglet (visiteur sans compte) : pas de rail.
// La liste : « Calendrier » (lot 6, public) puis, pour tout connecté, les deux fêtes de la scène,
// « Pâques » et « Noël » (docs/spec-scene-paques-noel.md, P4) : deux onglets fixes, qu'un
// programme existe ou non, sans lecture (le rail ne saute pas).

import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { FETES } from "@/lib/scene/fetes"
import type { OngletRail } from "@/components/layout/Onglets"

/** Les onglets de la section, pour `OngletsRail` : « Évènements », puis Salles, Pâques et Noël pour un connecté. */
export function useOngletsEvenements(): OngletRail[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const onglets: OngletRail[] = [{ id: "calendrier", href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user) {
    // Salles (docs/spec-salles.md, AR10, SA14) : deuxième place, connectés seulement.
    onglets.push({ id: "salles", href: "/evenements/salles", label: t("evenements.tabs.salles") })
    for (const fete of FETES) {
      onglets.push({ id: fete, href: `/evenements/scene/${fete}`, label: t(`evenements.tabs.${fete}`) })
    }
  }
  return onglets
}
