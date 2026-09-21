"use client"

import { usePathname } from "next/navigation"
import { PLANNING_TABS } from "@/components/planning/PlanningTabs"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { Halo } from "@/components/layout/Halo"

/** Le halo de la section Planning (V7) : porté par la mise en page, il suit le planning
 *  ouvert au lieu de disparaître dès qu'on quitte l'accueil. Accueil et Groupes n'ont
 *  pas de couleur propre : ils gardent le bleu-vert du Culte Franco, celle de la section. */
export function PlanningHalo() {
  const pathname = usePathname() || ""
  const onglet = PLANNING_TABS.find((tab) => tab.href !== "/planning" && pathname.startsWith(tab.href))
  return <Halo color={onglet?.color ?? PLANNING_COLORS.culte} />
}
