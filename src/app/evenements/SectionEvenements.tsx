"use client"

import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { creatableEvenementPours, estResponsable } from "@/lib/access"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import { useOngletsEvenements } from "@/components/evenements/EvenementsTabs"
import { BoutonNouveau } from "@/components/layout/BoutonNouveau"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { Halo } from "@/components/layout/Halo"
import { OngletsRail } from "@/components/layout/Onglets"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { CalendrierClient } from "./CalendrierClient"

// La section Évènements (lot U4 bis, B2) : l'agenda et ses fiches passent par le calendrier
// (deux volets en grand, `CalendrierClient`). Les onglets Pâques et Noël de la scène
// (docs/spec-scene-paques-noel.md, P4) prennent toute la zone, au halo de la scène.
// Agencement v18 (A10, docs/spec-agencement-v18.md ; planches `v18-app-evenements*`) : l'en-tête est
// celui de toute la section, agenda et scène — « Évènements », son sous-titre, le rail des onglets sous
// le titre ; « + Nouvel évènement » (U6, B3 : le formulaire est au Back-Office, ouvert aux responsables)
// sauf sur une fête, pour que le rail ne bouge pas d'un onglet à l'autre. Le contenu d'une fête pose
// lui-même la marge de la zone (`FeteClient`, `DeuxVolets`) : rien n'est centré dans une borne (R2).
// `peutCreer` est calculé ici seulement et passé à l'agenda (son indice « rien de prévu »).
export function SectionEvenements({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const pathname = usePathname() || ""
  const { user } = useAuth()
  const { profile } = useProfile()
  const onglets = useOngletsEvenements()
  const scene = pathname.startsWith("/evenements/scene")
  const peutCreer = estResponsable(user, profile) && creatableEvenementPours(user, profile, ANNONCE_SECTIONS).length > 0

  const enTete = (
    <EnTetePage
      titre={t("evenements.title")}
      sousTitre={t("evenements.sousTitre")}
      action={!scene && peutCreer && <BoutonNouveau label={t("evenements.nouveau")} href="/back-office/evenements/nouveau" />}
      onglets={onglets.length > 1 && <OngletsRail etiquette={t("evenements.onglets")} onglets={onglets} />}
    />
  )

  if (scene) {
    return (
      <>
        <Halo color={PLANNING_COLORS.scene} />
        <div className="relative pb-16">
          {enTete}
          {children}
        </div>
      </>
    )
  }
  return <CalendrierClient enTete={enTete} peutCreer={peutCreer}>{children}</CalendrierClient>
}
