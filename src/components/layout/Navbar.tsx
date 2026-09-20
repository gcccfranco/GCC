"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSetLanguage } from "@/lib/I18nProvider";
import { Sun, Moon, Globe, LogIn, LogOut, ChevronDown, UserRound, Bell, BookOpen, MessageSquareHeart, TriangleAlert, Megaphone, ShieldCheck, Network, Sparkles } from "lucide-react";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { useTheme } from "next-themes";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser, polesDe } from "@/lib/access";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";
import { BACK_OFFICE } from "@/lib/backOffice";
import { saveNotifLang } from "@/lib/firebase/notifPrefs";
import { ReportDialog } from "@/components/report/ReportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIF_KIND_KEYS: Record<NotificationItem["kind"], string> = {
  "annonce": "notifications.annonce",
  "setlist-created": "notifications.setlistCreated",
  "setlist-updated": "notifications.setlistUpdated",
  "manual": "notifications.manual",
  "reminder": "notifications.reminder",
  "broadcast": "notifications.broadcast",
  "presentation": "notifications.presentation",
  "scene": "notifications.scene",
  "evenement": "notifications.evenement",
  "tache": "notifications.tache",
};

// Bouton d'icône de la barre : rond, sans bordure, réponse dès l'appui.
const ICON_BUTTON =
  "h-10 w-10 shrink-0 rounded-full bg-secondary text-foreground/80 hover:text-foreground transition-[background-color,color,transform] duration-150 active:scale-[.94] flex items-center justify-center cursor-pointer";
const SECTION_LINK = "px-3 py-[7px] rounded-full text-sm font-semibold transition-colors duration-150 whitespace-nowrap";
const sectionClass = (active: boolean) =>
  `${SECTION_LINK} ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`;

/**
 * Navbar « GCC » + label de section (décisions du 15/09/2026, docs/spec-look.md).
 * Sur ordinateur : les sections, la cloche, la langue, le thème et un menu
 * compte. Sur tactile : la barre du bas porte les sections et « Moi » range
 * le reste ; il ne reste ici que la cloche et la langue (Connexion sans compte).
 */
export function Navbar() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const toggleTheme = () => setTheme(dark ? "light" : "dark");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { items: notifItems, unreadCount, markAllSeen } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language;
  const isZh = currentLang === "zh-CN";
  const scrollVisible = useScrollDirection();

  // Bord de défilement (apple-design § 12) : le filet sous la barre n'apparaît
  // que quand du contenu passe dessous.
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Changement de route (barre du bas, retour…) : fermer le menu Louange.
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [dropdownOpen]);

  const setLanguage = useSetLanguage();
  const toggleLanguage = () => {
    setLanguage(currentLang === "zh-CN" ? "fr" : "zh-CN");
  };

  // Langue mémorisée côté serveur (notifPrefs/{uid}.lang) : les rappels du
  // cron partent dans la langue de l'interface. Écrite à la connexion puis à
  // chaque changement, une fois par valeur et par compte.
  const sentLangRef = useRef("");
  useEffect(() => {
    if (!user) return;
    const key = `${user.uid}|${currentLang}`;
    if (sentLangRef.current === key) return;
    sentLangRef.current = key;
    saveNotifLang(user.uid, currentLang === "zh-CN" ? "zh-CN" : "fr").catch(() => {});
  }, [user, currentLang]);

  const isActiveSongs = pathname.startsWith("/songs");
  const isActiveSetlists = pathname.startsWith("/setlists");
  const isActiveLouange = isActiveSongs || isActiveSetlists;
  const isActivePlanning = pathname.startsWith("/planning");
  const isActiveMesServices = pathname.startsWith("/mes-services");
  const isActiveEvenements = pathname.startsWith("/evenements");
  const isActiveTaches = pathname.startsWith("/taches");
  const admin = isAdminUser(user);
  const canNotify = admin || (profile?.notify?.length ?? 0) > 0;
  const headerLabel = isActivePlanning
    ? t("common.header.planning")
    : isActiveMesServices
      ? t("common.header.service")
      : isActiveEvenements
          ? t("common.header.evenements")
          : isActiveTaches
            ? t("common.header.taches")
            : t("common.header.louange");
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user?.email || "";
  const initial = (profile?.firstName || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full h-[var(--nav-h)] material-chrome print:hidden transition-[transform,box-shadow] duration-300 ${
          scrollVisible ? "translate-y-0" : "-translate-y-full"
        } ${atTop ? "" : "shadow-[0_1px_0_hsl(var(--border))]"}`}
      >
        <div className="max-w-[1080px] mx-auto px-4 h-full flex items-center gap-3">
          {/* Brand */}
          <Link href={user ? "/planning" : "/songs"} className="flex items-center gap-2.5 shrink-0">
            <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white shadow-sm">
              <Image
                src="/logo.png"
                alt="GCC Logo"
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-bold text-lg text-foreground min-w-[111px] whitespace-nowrap flex items-center gap-1">
              GCC{" "}
              <span
                key={headerLabel}
                className="text-brand animate-in fade-in duration-150"
              >
                {headerLabel}
              </span>
            </span>
          </Link>

          {/* Sections (ordinateur) */}
          <nav className="hidden lg:flex items-center gap-1 ml-2" aria-label={t("common.aria.sections")}>
            {!authLoading && user && (
              <Link href="/planning" className={sectionClass(isActivePlanning)}>
                {t("common.header.planning")}
              </Link>
            )}
            {/* Louange : menu déroulant (connecté) ou lien direct vers les chants (visiteur) */}
            {!authLoading && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-expanded={dropdownOpen}
                  className={`${sectionClass(isActiveLouange)} flex items-center gap-1 cursor-pointer`}
                >
                  {t("common.header.louange")}
                  <ChevronDown
                    className={`h-3 w-3 opacity-60 transition-transform duration-150 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                <div
                  className={`absolute left-0 top-full pt-1 z-50 transition-all duration-150 ${
                    dropdownOpen
                      ? "opacity-100 visible translate-y-0"
                      : "opacity-0 invisible -translate-y-1"
                  }`}
                >
                  <div className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                    <Link
                      href="/songs"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-semibold transition-colors ${
                        isActiveSongs ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t("common.header.songs")}
                    </Link>
                    <Link
                      href="/setlists"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-semibold transition-colors ${
                        isActiveSetlists ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t("common.header.setlists")}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              !authLoading && (
                <Link href="/songs" className={sectionClass(isActiveSongs)}>
                  {t("common.header.songs")}
                </Link>
              )
            )}
            {BACK_OFFICE && !authLoading && (
              <Link href="/evenements" className={sectionClass(isActiveEvenements)}>
                {t("common.header.evenements")}
              </Link>
            )}
            {!authLoading && user && (
              <Link href="/mes-services" className={sectionClass(isActiveMesServices)}>
                {t("common.header.myServices")}
              </Link>
            )}
            {/* Tâches (lot 7) : pour les membres d'un pôle et les admins. */}
            {BACK_OFFICE && !authLoading && user && (admin || polesDe(profile).length > 0) && (
              <Link href="/taches" className={sectionClass(isActiveTaches)}>
                {t("common.header.taches")}
              </Link>
            )}
          </nav>

          {/* Actions — pushed to far right */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            {!authLoading && user && (
              <DropdownMenu onOpenChange={(open) => { if (open) markAllSeen(); }}>
                <DropdownMenuTrigger asChild>
                  <button aria-label={t("notifications.title")} className={`relative ${ICON_BUTTON}`}>
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
                  <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-96 overflow-y-auto">
                    {notifItems.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {t("notifications.empty")}
                      </p>
                    ) : (
                      notifItems.map((n) => (
                        <DropdownMenuItem key={n.id} asChild>
                          <Link href={n.href} className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-medium text-foreground truncate w-full">
                              {n.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t(NOTIF_KIND_KEYS[n.kind])}
                              {n.category && (
                                <>
                                  {" · "}
                                  {t("categories." + n.category, { defaultValue: n.category })}
                                </>
                              )}
                              {" · "}
                              {new Intl.DateTimeFormat(isZh ? "zh-CN" : "fr-FR", {
                                day: "numeric",
                                month: "short",
                              }).format(n.date)}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Langue : partout, pour les sinophones sans compte aussi */}
            <button
              onClick={toggleLanguage}
              aria-label={isZh ? "Changer en français" : "切换为中文"}
              className={`${ICON_BUTTON} w-auto min-w-10 px-3 gap-1.5 text-sm font-semibold`}
            >
              <Globe className="h-4 w-4" aria-hidden />
              <span className={user ? "" : "hidden min-[400px]:inline"}>{isZh ? "中文" : "FR"}</span>
            </button>

            {/* Thème : sur ordinateur ; sur tactile, un membre le trouve dans « Moi » */}
            <button
              onClick={toggleTheme}
              aria-label={dark ? t("common.aria.modeClair") : t("common.aria.modeSombre")}
              className={`${ICON_BUTTON} ${user ? "hidden lg:flex" : "hidden sm:flex"}`}
            >
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {/* Compte (ordinateur) ou Connexion */}
            {!authLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={t("common.header.account")}
                      title={displayName}
                      className="hidden lg:flex h-9 w-9 shrink-0 rounded-full bg-foreground text-background text-sm font-bold items-center justify-center transition-transform duration-150 active:scale-[.94] cursor-pointer"
                    >
                      {initial}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      <div className="font-semibold truncate">{displayName}</div>
                      {profile?.planningName && (
                        <div className="text-xs font-normal text-muted-foreground truncate">{profile.planningName}</div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profil"><UserRound aria-hidden />{t("common.header.profile")}</Link>
                    </DropdownMenuItem>
                    {BACK_OFFICE && (
                      <DropdownMenuItem asChild>
                        <Link href="/equipes"><Network aria-hidden />{t("equipes.title")}</Link>
                      </DropdownMenuItem>
                    )}
                    <HarmonieMenuItem label={t("harmonie.titre")} />
                    <DropdownMenuItem asChild>
                      <Link href="/guide"><BookOpen aria-hidden />{t("common.header.guide")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/questionnaire"><MessageSquareHeart aria-hidden />{t("survey.title")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                      <TriangleAlert aria-hidden />{t("common.report")}
                    </DropdownMenuItem>
                    {(canNotify || admin) && <DropdownMenuSeparator />}
                    {canNotify && (
                      <DropdownMenuItem asChild>
                        <Link href="/notifier"><Megaphone aria-hidden />{t("common.header.notify")}</Link>
                      </DropdownMenuItem>
                    )}
                    {admin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin"><ShieldCheck aria-hidden />{t("common.header.admin")}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => logOut()} className="text-destructive focus:text-destructive">
                      <LogOut aria-hidden />{t("common.header.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  aria-label={t("common.header.login")}
                  href="/login"
                  className="flex h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-[background-color,transform] duration-150 active:scale-[.96] items-center justify-center gap-1.5 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  <span className="max-[359px]:hidden">{t("common.header.login")}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} kind="site" />
    </>
  );
}

/** Entrée « Harmonie » du menu du compte (ordinateur). Rendue seulement une
 *  fois le menu ouvert, donc l'accès (qui lit les plannings pour trouver
 *  l'instrument) n'est calculé qu'à ce moment-là, jamais à chaque page. */
function HarmonieMenuItem({ label }: { label: string }) {
  const acces = useAccesHarmonie();
  if (acces.chargement || !acces.peut) return null;
  return (
    <DropdownMenuItem asChild>
      <Link href="/harmonie"><Sparkles aria-hidden />{label}</Link>
    </DropdownMenuItem>
  );
}
