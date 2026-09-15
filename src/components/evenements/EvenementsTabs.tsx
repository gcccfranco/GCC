"use client"

// Onglets de la section Évènements : « Calendrier » (lot 6, public) et le
// programme de scène affiché (« Noël », lot 3 bis) pour les connectés ; sans
// programme affiché, seule la coordination voit ce second onglet (« Scène »)
// pour en créer un. Rechargé après chaque écriture (PROGRAMMES_CHANGED).

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { listProgrammes, PROGRAMMES_CHANGED } from "@/lib/firebase/programmes"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { SectionTabs, type SectionTab } from "@/components/layout/SectionTabs"
import type { Programme } from "@/types/programme"

export function EvenementsTabs() {
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

  const current = programmes.find((p) => p.visible)
  const tabs: SectionTab[] = [{ href: "/evenements", label: t("evenements.tabs.calendrier") }]
  if (user && (current || isCoordination(user, profile))) {
    tabs.push({ href: "/evenements/scene", label: current?.nom ?? t("planning.tabs.scene"), color: PLANNING_COLORS.scene })
  }
  return <SectionTabs rootHref="/evenements" tabs={tabs} />
}
