"use client"

// Barre d'onglets d'une section (Planning, Évènements) : pilules neutres,
// l'onglet courant prend la teinte et le texte de sa couleur de service
// (décision Q11 b du 15/09/2026) ; 40 px de haut sous le doigt (16/09/2026) ;
// défilables, masquées au défilement vers le bas.
// Avec `menuLabel` (V7, 21/09/2026), la rangée laisse place à un menu sous 1024 px :
// le Planning a huit destinations, on n'en voyait que trois et demie sur un téléphone.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { Check, ChevronDown } from "lucide-react"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type SectionTab = { href: string; label: string; color?: string }

/** Pilule teintée : fond à 14 % de la couleur du service, texte à sa couleur. */
const teinte = (color?: string) =>
  color ? { background: `color-mix(in srgb, ${color} 14%, transparent)`, color } : undefined

export function SectionTabs({ tabs, rootHref, menuLabel }: { tabs: SectionTab[]; rootHref: string; menuLabel?: string }) {
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

  const courant = tabs.find((tab) => isTabActive(tab.href)) ?? tabs[0]

  return (
    <div data-testid="barre-section" className={`sticky top-[calc(var(--nav-h)-1px)] z-40 material-chrome print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <div className="max-w-[1080px] mx-auto px-4">
        {menuLabel && (
          <div className="lg:hidden py-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="menu-plannings"
                  aria-label={menuLabel}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${courant?.color ? "" : "bg-secondary text-foreground"}`}
                  style={teinte(courant?.color)}
                >
                  {courant?.color && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
                  {courant?.label}
                  <ChevronDown aria-hidden className="h-4 w-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[13rem]">
                {tabs.map((tab) => {
                  const active = isTabActive(tab.href)
                  return (
                    <DropdownMenuItem key={tab.href} asChild className="min-h-11 gap-2.5 px-3">
                      <Link href={tab.href} aria-current={active ? "page" : undefined}>
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: tab.color ?? "transparent" }} />
                        <span className="flex-1">{tab.label}</span>
                        {active && <Check aria-hidden className="h-4 w-4 shrink-0" />}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <nav data-testid="onglets-section" className={`${menuLabel ? "hidden lg:flex" : "flex"} gap-1.5 overflow-x-auto py-1`} style={{ scrollbarWidth: "none" }}>
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
                style={active ? teinte(tab.color) : undefined}
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
