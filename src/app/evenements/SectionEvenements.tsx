"use client"

import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useOngletsEvenements } from "@/components/evenements/EvenementsTabs"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { Halo } from "@/components/layout/Halo"
import { OngletsRail } from "@/components/layout/Onglets"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { CalendrierClient } from "./CalendrierClient"

// La section Évènements (lot U4 bis, B2) : l'agenda et ses fiches passent par le calendrier
// (deux volets en grand, `CalendrierClient`). Les onglets Pâques et Noël de la scène
// (docs/spec-scene-paques-noel.md, P4) prennent toute la zone, sous l'en-tête de la section
// (A10 de docs/spec-agencement-v18.md : titre, sous-titre et rail ne bougent pas d'un onglet à
// l'autre ; pas d'action principale sur une fête), au halo de la scène.
export function SectionEvenements({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  if (pathname.startsWith("/evenements/scene")) return <SectionScene>{children}</SectionScene>
  return <CalendrierClient>{children}</CalendrierClient>
}

function SectionScene({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const onglets = useOngletsEvenements()
  return (
    <>
      <Halo color={PLANNING_COLORS.scene} />
      <div className="relative pb-16">
        <EnTetePage
          titre={t("evenements.title")}
          sousTitre={t("evenements.sousTitre")}
          onglets={
            <OngletsRail
              etiquette={t("evenements.title")}
              onglets={onglets.map((o) => ({ id: o.href, label: o.label, href: o.href }))}
            />
          }
        />
        {children}
      </div>
    </>
  )
}
