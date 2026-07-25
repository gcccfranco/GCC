"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { useRef, useEffect, useState } from "react"
import { PLANNING_COLORS } from "@/lib/serviceColors"

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
  const pathname = usePathname() || ""
  const scrollVisible = useScrollDirection()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  const isTabActive = (href: string) =>
    href === "/planning"
      ? pathname === "/planning" || pathname === "/planning/"
      : pathname.startsWith(href)

  useEffect(() => {
    const activeIndex = TABS.findIndex((tab) => isTabActive(tab.href))
    const el = tabRefs.current[activeIndex]
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
      // Amène l'onglet actif dans le champ visible (sinon, arriver sur
      // Interfranco laissait l'onglet actif hors écran, sans indice de scroll).
      el.scrollIntoView({ inline: "center", block: "nearest" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className={`sticky top-[calc(var(--nav-h)-1px)] z-40 border-b border-border bg-background/95 backdrop-blur-md print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <div className="max-w-[1080px] mx-auto px-4">
        <nav ref={navRef} className="relative flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab, i) => {
            const active = isTabActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={(el) => { tabRefs.current[i] = el }}
                className={`flex-shrink-0 px-4 py-3 text-[12.5px] font-semibold transition-colors duration-150 whitespace-nowrap ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`planning.tabs.${tab.key}`)}
              </Link>
            )
          })}
          {/* Indicateur glissant — placé DANS le <nav> scrollable : il suit le
              défilement des onglets et est rogné par overflow-x. Hors du nav, son
              left = offsetLeft des onglets de droite (Campus/Inter…) débordait la
              page sur téléphone (scroll horizontal). */}
          {indicator.ready && (
            <div
              className="absolute bottom-0 h-[2px] rounded-full transition-all duration-200"
              style={{
                left: indicator.left,
                width: indicator.width,
                background:
                  TABS.find((tab) => isTabActive(tab.href))?.color ??
                  "hsl(var(--foreground))",
              }}
            />
          )}
        </nav>
      </div>
    </div>
  )
}
