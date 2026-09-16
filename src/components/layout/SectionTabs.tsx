"use client"

// Barre d'onglets d'une section (Planning, Évènements) : pilules neutres,
// l'onglet courant prend la teinte et le texte de sa couleur de service
// (décision Q11 b du 15/09/2026) ; 40 px de haut sous le doigt (16/09/2026) ;
// défilables, masquées au défilement vers le bas.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useScrollDirection } from "@/hooks/useScrollDirection"

export type SectionTab = { href: string; label: string; color?: string }

export function SectionTabs({ tabs, rootHref }: { tabs: SectionTab[]; rootHref: string }) {
  const pathname = usePathname() || ""
  const scrollVisible = useScrollDirection()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  // Clé stable des onglets : un tableau recréé à chaque rendu ne relance pas l'effet.
  const tabsKey = tabs.map((tab) => `${tab.href}|${tab.label}`).join(",")

  const isTabActive = (href: string) =>
    href === rootHref
      ? pathname === rootHref || pathname === `${rootHref}/`
      : pathname.startsWith(href)

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => isTabActive(tab.href))
    // Amène l'onglet actif dans le champ visible (sinon, arriver sur
    // Interfranco laissait l'onglet actif hors écran, sans indice de scroll).
    tabRefs.current[activeIndex]?.scrollIntoView({ inline: "center", block: "nearest" })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tabsKey])

  return (
    <div className={`sticky top-[calc(var(--nav-h)-1px)] z-40 material-chrome shadow-[0_1px_0_hsl(var(--border))] print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <div className="max-w-[1080px] mx-auto px-4">
        <nav className="flex gap-1.5 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab, i) => {
            const active = isTabActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={(el) => { tabRefs.current[i] = el }}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 flex-shrink-0 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                  active
                    ? tab.color ? "" : "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={active && tab.color ? { background: `color-mix(in srgb, ${tab.color} 14%, transparent)`, color: tab.color } : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
