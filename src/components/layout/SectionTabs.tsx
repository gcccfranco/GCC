"use client"

// Barre d'onglets d'une section (Planning, Évènements) : onglets défilables,
// indicateur glissant coloré, masquée au défilement vers le bas.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useScrollDirection } from "@/hooks/useScrollDirection"

export type SectionTab = { href: string; label: string; color?: string }

export function SectionTabs({ tabs, rootHref }: { tabs: SectionTab[]; rootHref: string }) {
  const pathname = usePathname() || ""
  const scrollVisible = useScrollDirection()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })
  // Clé stable des onglets : un tableau recréé à chaque rendu ne relance pas l'effet.
  const tabsKey = tabs.map((tab) => `${tab.href}|${tab.label}`).join(",")

  const isTabActive = (href: string) =>
    href === rootHref
      ? pathname === rootHref || pathname === `${rootHref}/`
      : pathname.startsWith(href)

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => isTabActive(tab.href))
    const el = tabRefs.current[activeIndex]
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
      // Amène l'onglet actif dans le champ visible (sinon, arriver sur
      // Interfranco laissait l'onglet actif hors écran, sans indice de scroll).
      el.scrollIntoView({ inline: "center", block: "nearest" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tabsKey])

  return (
    <div className={`sticky top-[calc(var(--nav-h)-1px)] z-40 border-b border-border bg-background/95 backdrop-blur-md print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <div className="max-w-[1080px] mx-auto px-4">
        <nav className="relative flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab, i) => {
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
                background: tabs.find((tab) => isTabActive(tab.href))?.color ?? "hsl(var(--foreground))",
              }}
            />
          )}
        </nav>
      </div>
    </div>
  )
}
