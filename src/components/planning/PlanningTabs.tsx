"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { useRef, useEffect, useState } from "react"

// `color` = couleur de service de la page (mêmes valeurs que le COLOR de
// chaque page planning) — reprise par l'indicateur d'onglet actif.
const TABS: { label: string; href: string; color?: string }[] = [
  { label: "Accueil", href: "/planning" },
  { label: "Culte Franco", href: "/planning/culte", color: "#2d5a65" },
  { label: "Prépa. Table", href: "/planning/table", color: "#c87941" },
  { label: "Groupes", href: "/planning/groupes" },
  { label: "EDD", href: "/planning/edd", color: "#3b6d11" },
  { label: "Campus", href: "/planning/campus", color: "#2471a3" },
  { label: "Intergroupe", href: "/planning/intergroupe", color: "#a87b0f" },
  { label: "Interfranco", href: "/planning/interfranco", color: "#9d3c63" },
]

export function PlanningTabs() {
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
                {tab.label}
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
