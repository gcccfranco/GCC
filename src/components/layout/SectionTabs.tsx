"use client"

// Barre d'onglets d'une section (Planning, Évènements) : pilules neutres,
// l'onglet courant prend la teinte et le texte de sa couleur de service
// (décision Q11 b du 15/09/2026) ; 40 px de haut sous le doigt (16/09/2026) ;
// défilables, masquées au défilement vers le bas.
// Avec `menuLabel` (V7, 21/09/2026), le Planning et ses huit destinations : sur un
// téléphone, une pastille ouvre une feuille en tuiles ; dès que la rangée a la place
// (tablette, ordinateur), c'est elle qui reste — tranché sur planche par Timothée.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { FondDeBarre } from "@/components/layout/FondDeBarre"
import { useFonduLateral } from "@/hooks/useFonduLateral"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"

export type SectionTab = { href: string; label: string; color?: string }

/** Pilule teintée : fond à 14 % de la couleur du service, texte à sa couleur. */
const teinte = (color?: string) =>
  color ? { background: `color-mix(in srgb, ${color} 14%, transparent)`, color } : undefined

/** `pleineLargeur` : la section prend toute la zone de contenu (Planning, retours du 06/10/2026) ;
 *  la rangée part alors du même bord que la page, au lieu d'être centrée sur 1 080 px. */
/** `className` : posé sur la barre collante (le Planning la masque en grand, où ses plannings
 *  sont dans l'en-tête, agencement v18 R6). */
/** `sousLeTitre` : la barre repose sous un titre et ne colle qu'une fois défilée (le Planning, R6). */
export function SectionTabs({ tabs, rootHref, menuLabel, pleineLargeur = false, className = "", sousLeTitre = false }: { tabs: SectionTab[]; rootHref: string; menuLabel?: string; pleineLargeur?: boolean; className?: string; sousLeTitre?: boolean }) {
  const pathname = usePathname() || ""
  const scrollVisible = useScrollDirection()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)
  // La rangée s'estompe du côté où il reste des onglets, au lieu d'en couper un (V7).
  const rangee = useFonduLateral<HTMLElement>(tabs.length)
  useStandaloneScrollLock(feuilleOuverte)
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

  // Agencement v18 (R6) : la barre du Planning est posée SOUS le titre, et ne colle qu'une fois
  // le titre passé. La copie du halo de son fond (`.barre-halo`) remonte de la hauteur où la
  // barre se trouve vraiment (`--barre-top`, mesurée hors translation), sinon son fond, au repos
  // sous le titre, faisait une bande sur le halo ; et elle ne s'efface au défilement qu'une fois
  // collée, sinon elle remontait par-dessus le titre. Seulement sous un titre (`sousLeTitre`) :
  // ailleurs (Évènements), la barre est collée d'office et rien n'est mesuré au défilement.
  const barreRef = useRef<HTMLDivElement>(null)
  const [colle, setColle] = useState(true)
  useEffect(() => {
    const el = barreRef.current
    if (!el || !sousLeTitre) return
    let raf = 0
    let dernier = NaN
    const poser = () => {
      raf = 0
      const transform = getComputedStyle(el).transform
      const decalage = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42
      const haut = el.getBoundingClientRect().top - decalage
      // N'écrire que ce qui change : une fois collée, plus aucune écriture au défilement.
      if (haut !== dernier) { dernier = haut; el.style.setProperty("--barre-top", `${haut}px`) }
      setColle(haut <= parseFloat(getComputedStyle(el).top) + 1)
    }
    const demander = () => { if (!raf) raf = requestAnimationFrame(poser) }
    // La translation de la barre seule : les transitions de couleur des onglets remontent jusqu'ici.
    const finDeTransition = (e: TransitionEvent) => { if (e.target === el) demander() }
    demander()
    window.addEventListener("scroll", demander, { passive: true })
    window.addEventListener("resize", demander)
    el.addEventListener("transitionend", finDeTransition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", demander)
      window.removeEventListener("resize", demander)
      el.removeEventListener("transitionend", finDeTransition)
    }
  }, [sousLeTitre])

  const courant = tabs.find((tab) => isTabActive(tab.href)) ?? tabs[0]

  // Colle sous la navbar en la recouvrant d'1 px (`--recouvrement-navbar`) ; sans navbar
  // (ordinateur, lot U4), en haut de l'écran : sinon la copie du halo descendait d'1 px.
  return (
    <div ref={barreRef} data-testid="barre-section" className={`sticky top-[calc(var(--nav-h)-var(--recouvrement-navbar))] [--barre-top:calc(var(--nav-h)-var(--recouvrement-navbar))] [--barre-left:var(--barre-laterale)] z-40 material-chrome print:hidden transition-transform duration-300 ${className} ${scrollVisible || !colle ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <FondDeBarre sousNavbar />
      <div className={pleineLargeur ? "px-[var(--marge-page)]" : "max-w-[1080px] mx-auto px-4"}>
        {menuLabel && (
          <div className="md:hidden py-1">
            <button
              type="button"
              data-testid="menu-plannings"
              aria-label={menuLabel}
              aria-haspopup="dialog"
              onClick={() => setFeuilleOuverte(true)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${courant?.color ? "" : "bg-secondary text-foreground"}`}
              style={teinte(courant?.color)}
            >
              {courant?.label}
              <ChevronDown aria-hidden className="h-4 w-4 opacity-60" />
            </button>
            <Drawer open={feuilleOuverte} onOpenChange={setFeuilleOuverte}>
              <DrawerContent aria-describedby={undefined}>
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="text-sm font-semibold text-muted-foreground">{menuLabel}</DrawerTitle>
                </DrawerHeader>
                {/* Tuiles teintées, sans point de couleur : le fond porte déjà le service
                    (une forme, une information — règle de Christelle). */}
                <div data-testid="feuille-plannings" className="grid grid-cols-2 gap-2.5 px-4 pb-8">
                  {tabs.map((tab) => {
                    const active = isTabActive(tab.href)
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setFeuilleOuverte(false)}
                        className={`flex min-h-16 items-end rounded-xl px-3 py-2.5 text-sm font-bold transition-transform duration-150 active:scale-[.98] ${tab.color ? "svc-tuile" : "bg-secondary text-foreground"} ${active ? "ring-2 ring-current ring-offset-2 ring-offset-background" : ""}`}
                        style={tab.color ? ({ "--svc": tab.color } as React.CSSProperties) : undefined}
                      >
                        {tab.label}
                      </Link>
                    )
                  })}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        )}
        <nav
          ref={rangee}
          data-testid="onglets-section"
          className={`${menuLabel ? "hidden md:flex" : "flex"} gap-1.5 overflow-x-auto py-1 fondu-lateral`}
          style={{ scrollbarWidth: "none" }}
        >
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
