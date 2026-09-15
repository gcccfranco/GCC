"use client"

import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { SectionTabs } from "@/components/layout/SectionTabs"

// `key` = clé i18n (planning.tabs.*), `color` = couleur de service reprise par
// l'indicateur d'onglet actif (source unique : PLANNING_COLORS).
const TABS: { key: string; href: string; color?: string }[] = [
  { key: "accueil", href: "/planning" },
  { key: "culte", href: "/planning/culte", color: PLANNING_COLORS.culte },
  { key: "table", href: "/planning/table", color: PLANNING_COLORS.table },
  { key: "groupes", href: "/planning/groupes" },
  { key: "edd", href: "/planning/edd", color: PLANNING_COLORS.edd },
  { key: "campus", href: "/planning/campus", color: PLANNING_COLORS.campus },
  { key: "intergroupe", href: "/planning/intergroupe", color: PLANNING_COLORS.intergroupe },
  { key: "interfranco", href: "/planning/interfranco", color: PLANNING_COLORS.interfranco },
]

export function PlanningTabs() {
  const { t } = useTranslation()
  return (
    <SectionTabs
      rootHref="/planning"
      tabs={TABS.map((tab) => ({ href: tab.href, label: t(`planning.tabs.${tab.key}`), color: tab.color }))}
    />
  )
}
