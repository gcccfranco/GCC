"use client"

// Onglets de la section Évènements : « Calendrier » (lot 6, public) et le
// programme de scène affiché (« Noël », lot 3 bis) pour les connectés ; sans
// programme affiché, seule la coordination voit ce second onglet (« Scène »)
// pour en créer un. Rechargé après chaque écriture (PROGRAMMES_CHANGED).
// Pâques · Noël (P3) : le programme affiché est l'édition affichée au jour J le plus
// proche (`editionsAffichees`, `editionProche`), comme la page — le nom de l'onglet et la
// page ne peuvent pas diverger. P4 en fait les onglets des deux fêtes.

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { listProgrammes, PROGRAMMES_CHANGED } from "@/lib/firebase/programmes"
import { todayIso } from "@/lib/scene/dimanches"
import { editionProche, editionsAffichees } from "@/lib/scene/fetes"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { SectionTabs, type SectionTab } from "@/components/layout/SectionTabs"
import type { Programme } from "@/types/programme"

/** `enLigne` (lot U4 bis, B2, planche `evenements-ordinateur`) : en deux volets, les onglets
 *  sont des pilules sous le titre de l'agenda, au lieu de la barre collante de la section. */
export function EvenementsTabs({ enLigne = false }: { enLigne?: boolean }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const pathname = usePathname() || ""
  const [programmes, setProgrammes] = useState<Programme[]>([])

  useEffect(() => {
    if (!user) return
    const load = () => { listProgrammes().then(setProgrammes).catch(() => {}) }
    load()
    window.addEventListener(PROGRAMMES_CHANGED, load)
    return () => window.removeEventListener(PROGRAMMES_CHANGED, load)
  }, [user])

  const today = todayIso()
  const current = editionProche(editionsAffichees(programmes, today), today)?.programme ?? null
  const tabs: SectionTab[] = [{ href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user && (current || isCoordination(user, profile))) {
    tabs.push({ href: "/evenements/scene", label: current?.nom ?? t("planning.tabs.scene"), color: PLANNING_COLORS.scene })
  }
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
