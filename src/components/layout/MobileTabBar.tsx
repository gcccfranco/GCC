"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarDays, Music, ListMusic, UserRound } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const TABS = [
  { href: "/planning", key: "common.header.planning", Icon: CalendarDays },
  { href: "/songs", key: "common.header.songs", Icon: Music },
  { href: "/setlists", key: "common.header.setlists", Icon: ListMusic },
  { href: "/mes-services", key: "common.header.myServices", Icon: UserRound },
];

/**
 * Barre d'onglets fixée en bas d'écran : met les 4 destinations quotidiennes à
 * portée de pouce. Visible sur tout appareil tactile (téléphone ET tablette, y
 * compris iPad en paysage ≥1024px) ; masquée seulement sur un poste desktop
 * (souris + grand écran, via `.hide-on-desktop`). Membres connectés seulement —
 * le menu hamburger reste pour les pages secondaires. Masquée en plein écran
 * (vue partition / pupitre) pour ne jamais recouvrir une partition ; le mode
 * louange (z-9999) passe par-dessus de toute façon.
 */
export function MobileTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname() || "";
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Comme la navbar du haut : masquée au scroll vers le bas, réaffichée dès
  // qu'on remonte — plus d'espace de lecture pendant la navigation.
  const scrollVisible = useScrollDirection();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!mounted || loading || !user || fullscreen) return null;

  return (
    <>
      {/* Cale en flux : le contenu ne finit pas caché derrière la barre */}
      <div aria-hidden className="hide-on-desktop h-[calc(56px+env(safe-area-inset-bottom))] print:hidden" />
      <nav
        aria-label="Navigation principale"
        className={`hide-on-desktop print:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
          scrollVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex h-[56px]">
          {TABS.map(({ href, key, Icon }) => {
            const active =
              href === "/planning"
                ? pathname === "/planning" || pathname.startsWith("/planning/")
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors active:bg-secondary/60 ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.9} />
                {t(key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
