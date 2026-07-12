"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarDays, Music, ListMusic, UserRound } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";

const TABS = [
  { href: "/planning", key: "common.header.planning", Icon: CalendarDays },
  { href: "/songs", key: "common.header.songs", Icon: Music },
  { href: "/setlists", key: "common.header.setlists", Icon: ListMusic },
  { href: "/mes-services", key: "common.header.myServices", Icon: UserRound },
];

/**
 * Barre d'onglets fixée en bas d'écran (mobile uniquement) : met les 4
 * destinations quotidiennes à portée de pouce. Membres connectés seulement —
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
      <div aria-hidden className="lg:hidden h-[calc(56px+env(safe-area-inset-bottom))] print:hidden" />
      <nav
        aria-label="Navigation principale"
        className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
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
                  active ? "text-primary" : "text-muted-foreground"
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
