"use client"

import { usePathname } from "next/navigation"
import { PLANNING_TABS } from "@/components/planning/PlanningTabs"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { ONGLETS_PLANNING } from "@/lib/access"
import { Halo } from "@/components/layout/Halo"

/** Le halo de la section Planning (V7) : porté par la mise en page, il suit le planning
 *  ouvert au lieu de disparaître dès qu'on quitte l'accueil. Accueil et Groupes n'ont
 *  pas de couleur propre : ils gardent le bleu-vert du Culte Franco, celle de la section.
 *  Au Back-Office (agencement v18, R12), un planning ouvert prend aussi la couleur de son
 *  service ; ailleurs (Sans compte), le halo du Back-Office reste. */
export function PlanningHalo() {
  const pathname = usePathname() || ""
  const backOffice = pathname.match(/^\/back-office\/planning\/([^/]+)/)
  if (pathname.startsWith("/back-office") && !(backOffice && (ONGLETS_PLANNING as readonly string[]).includes(backOffice[1]))) return null
  const chemin = backOffice ? `/planning/${backOffice[1]}` : pathname
  const onglet = PLANNING_TABS.find((tab) => tab.href !== "/planning" && chemin.startsWith(tab.href))
  return <Halo color={onglet?.color ?? PLANNING_COLORS.culte} />
}
