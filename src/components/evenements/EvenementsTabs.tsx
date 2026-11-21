"use client"

// Les onglets de la section Évènements, en liste : ce fichier n'exporte qu'un hook,
// `useOngletsEvenements`, et ne rend rien. L'en-tête de la section (`SectionEvenements`,
// agencement v18, A10, R4) les pose dans son rail gris (`OngletsRail`), sous le titre, sur
// l'agenda comme sur la scène ; un seul onglet (visiteur sans compte) : pas de rail.
// La liste : « Évènements » (public) puis, pour tout connecté, « Salles » (AS8, lot AS : deux onglets).
// Les pages des fêtes (`/evenements/scene/…`) restent et allument « Évènements » (préfixe de chemin).

import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import type { OngletRail } from "@/components/layout/Onglets"

/** Les onglets de la section, pour `OngletsRail` : « Évènements », puis Salles pour un connecté. */
export function useOngletsEvenements(): OngletRail[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const onglets: OngletRail[] = [{ id: "calendrier", href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user) {
    // Salles (docs/spec-salles.md, AR10, SA14) : deuxième place, connectés seulement.
    onglets.push({ id: "salles", href: "/evenements/salles", label: t("evenements.tabs.salles") })
  }
  return onglets
}
