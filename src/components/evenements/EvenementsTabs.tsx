"use client"

// Onglets de la section Évènements : « Calendrier » (lot 6, public) puis, pour tout connecté,
// les deux fêtes de la scène, « Pâques » et « Noël » (docs/spec-scene-paques-noel.md, P4) :
// deux onglets fixes, qu'un programme existe ou non. `useOngletsEvenements` en donne la liste,
// rendue ici (agenda) et par l'en-tête de la section sous `/evenements/scene` (rail).

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { FETES } from "@/lib/scene/fetes"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { SectionTabs, type SectionTab } from "@/components/layout/SectionTabs"

/** Les onglets de la section, dans l'ordre : Calendrier, puis Pâques et Noël pour un connecté. */
export function useOngletsEvenements(): SectionTab[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const tabs: SectionTab[] = [{ href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user) {
    for (const fete of FETES) {
      tabs.push({ href: `/evenements/scene/${fete}`, label: t(`evenements.tabs.${fete}`), color: PLANNING_COLORS.scene })
    }
  }
  return tabs
}

/** `enLigne` (lot U4 bis, B2, planche `evenements-ordinateur`) : en deux volets, les onglets
 *  sont des pilules sous le titre de l'agenda, au lieu de la barre collante de la section. */
export function EvenementsTabs({ enLigne = false }: { enLigne?: boolean }) {
  const pathname = usePathname() || ""
  const tabs = useOngletsEvenements()
  if (enLigne) {
    const actif = (href: string) => href === "/evenements" ? !pathname.startsWith("/evenements/scene") : pathname.startsWith(href)
    return (
      <nav className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} aria-current={actif(tab.href) ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition-colors ${actif(tab.href) ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-muted"}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
    )
  }
  return <SectionTabs rootHref="/evenements" tabs={tabs} />
}
