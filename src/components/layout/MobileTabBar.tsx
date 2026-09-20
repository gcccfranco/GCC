"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { useTranslation } from "react-i18next";
import { CalendarDays, ListMusic, Music, Ticket, UserRound, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useScrollDirection } from "@/hooks/useScrollDirection";

type Tab = { href: string; key: string; Icon: LucideIcon; match: string[] };

// Chants et Setlists ont chacun leur onglet (décision du 16/09/2026 : un
// onglet « Louange » cachait les setlists, injoignables sur tactile). « Moi »
// est la porte de tout ce qui me concerne : services, profil, guide,
// réglages, déconnexion.
const MEMBER_TABS: Tab[] = [
  { href: "/songs", key: "common.header.songs", Icon: Music, match: ["/songs"] },
  { href: "/setlists", key: "common.header.setlists", Icon: ListMusic, match: ["/setlists"] },
  { href: "/planning", key: "common.header.planning", Icon: CalendarDays, match: ["/planning"] },
  { href: "/evenements", key: "common.header.evenements", Icon: Ticket, match: ["/evenements"] },
  { href: "/moi", key: "common.header.moi", Icon: UserRound, match: ["/moi", "/mes-services", "/taches", "/profil", "/guide", "/questionnaire", "/notifier", "/admin"] },
];

// Sans compte : les chants et le calendrier public (décision Q10).
const VISITOR_TABS: Tab[] = [
  { href: "/songs", key: "common.header.songs", Icon: Music, match: ["/songs"] },
  { href: "/evenements", key: "common.header.evenements", Icon: Ticket, match: ["/evenements"] },
];

/**
 * Barre d'onglets fixée en bas d'écran, sur tout appareil tactile (téléphone
 * ET tablette, y compris iPad en paysage ≥1024px) ; masquée seulement sur un
 * poste desktop (souris + grand écran, via `.hide-on-desktop`). Masquée en
 * plein écran (vue partition / pupitre) pour ne jamais recouvrir une
 * partition ; le mode louange (z-9999) passe par-dessus de toute façon.
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

  if (!mounted || loading || fullscreen) return null;
  // Back-office coupé (lot 18) : la section Évènements n'est pas en ligne.
  const tabs = (user ? MEMBER_TABS : VISITOR_TABS).filter((tab) => BACK_OFFICE || tab.href !== "/evenements");

  return (
    <>
      {/* Cale en flux : le contenu ne finit pas caché derrière la barre */}
      <div aria-hidden className="hide-on-desktop h-[calc(92px+env(safe-area-inset-bottom))] print:hidden" />
      <nav
        aria-label={t("common.aria.navigationPrincipale")}
        // 5C1 : la barre flotte, en verre ; l'onglet courant est une pastille d'encre.
        className={`hide-on-desktop print:hidden fixed inset-x-2 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 rounded-[32px] material-bar transition-transform duration-300 min-[360px]:inset-x-3.5 sm:left-1/2 sm:right-auto sm:w-[560px] sm:max-w-[calc(100%-28px)] sm:-translate-x-1/2 ${
          scrollVisible ? "translate-y-0" : "translate-y-[calc(100%+28px+env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="flex h-16 gap-0.5 p-1.5">
          {tabs.map(({ href, key, Icon, match }) => {
            const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                // `flex-auto` : un libellé long (« Évènements ») prend la place qu'il lui faut, même à 320 px.
                className={`flex flex-auto flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-[26px] px-1.5 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.97] ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
