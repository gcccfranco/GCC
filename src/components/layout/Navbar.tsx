"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSetLanguage } from "@/lib/I18nProvider";
import { Sun, Moon, Globe, LogIn, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { equipesDe, isAdminUser } from "@/lib/access";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { BACK_OFFICE } from "@/lib/backOffice";
import { saveNotifLang } from "@/lib/firebase/notifPrefs";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { espaceDe, labelDeSection } from "@/lib/navigation";
import { Cloche } from "@/components/layout/Cloche";
import { IconeMessages, IconeMessagesRetenue } from "@/components/layout/IconeMessages";
import { useBarreMontree } from "@/components/layout/BarreLaterale";
import { MenuCompte, useNomDuMembre } from "@/components/layout/MenuCompte";
import { SelecteurEspace, useFormeAffichee, useRetenirForme } from "@/components/layout/SelecteurEspace";

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
 * Lot U4 : sur ordinateur, la barre latérale la remplace ; masquée par `.barre-haut`,
 * elle reste montée (elle mémorise la langue des rappels).
 */
export function Navbar() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loading: authLoading, probablementConnecte } = useAuth();
  const { profile } = useProfile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Lot CH (C1, C2) : pendant que Firebase lit la session, la marque « était connecté » fait dessiner la forme
  // du membre (jamais l'en-tête des visiteurs) ; les éléments qui demandent le compte ou le profil gardent leur place.
  const attente = authLoading && probablementConnecte;
  const membre = !!user || attente;
  const dark = mounted && resolvedTheme === "dark";
  const toggleTheme = () => setTheme(dark ? "light" : "dark");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language;
  const isZh = currentLang === "zh-CN";
  const scrollVisible = useScrollDirection();

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
  const headerLabel = t(labelDeSection(pathname));
  const { displayName, initial } = useNomDuMembre();
  // Lot U6 (spec-back-office.md, question 5) : pour un responsable, le sélecteur
  // « App · Back-Office » suit le label ; sur téléphone il en prend la place, et la
  // langue passe par « Moi » (à 390 px, les quatre ne tiennent pas ensemble).
  const forme = useFormeAffichee();
  const responsable = forme.responsable;
  useRetenirForme();
  // Piste A, BO2 : Messages n'est pas un onglet de la barre du bas, c'est une icône ici, à côté de la cloche.
  // Là où la barre latérale est montrée, c'est elle qui porte Messages et lit ses comptes : pas deux fois.
  const barreMontree = useBarreMontree();
  const avecMessages = !barreMontree && responsable && (!!user || forme.retenue) && espaceDe(pathname) === "back-office" && forme.messages;

  return (
    <>
      <header
        className={`barre-haut fixed top-0 z-50 w-full h-[var(--nav-h)] pt-[var(--sat)] material-chrome print:hidden transition-transform duration-300 ${
          scrollVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <FondDeBarre />
        <div className="max-w-[1080px] mx-auto px-4 h-full flex items-center gap-3">
          {/* Brand */}
          <Link href={membre ? "/planning" : "/songs"} className="relative flex items-center gap-2.5 shrink-0 after:absolute after:-inset-1 after:content-['']">
            <div className="relative h-9 w-9 rounded-full overflow-hidden shadow-sm">
              <Image
                src="/logo.png"
                alt="GCC Logo"
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
            </div>
            <span className={`brand-nom font-bold text-lg text-foreground min-w-[111px] whitespace-nowrap flex items-center gap-1 ${responsable ? "max-sm:hidden" : ""}`}>
              GCC{" "}
              <span
                key={headerLabel}
                className="text-brand animate-in fade-in duration-150"
              >
                {headerLabel}
              </span>
            </span>
          </Link>

          {responsable && <SelecteurEspace />}
          {/* C6 : avant l'hydratation, `data-responsable` (posé par le script) garde la place du sélecteur. */}
          {!responsable && <span aria-hidden className="place-selecteur" />}

          {/* Sections (ordinateur) */}
          <nav className="hidden lg:flex items-center gap-1 ml-2" aria-label={t("common.aria.sections")}>
            {membre && (
              <Link href="/planning" className={sectionClass(isActivePlanning)}>
                {t("common.header.planning")}
              </Link>
            )}
            {/* Louange : menu déroulant (connecté) ou lien direct vers les chants (visiteur) */}
            {membre ? (
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
            {BACK_OFFICE && (!authLoading || attente) && (
              <Link href="/evenements" className={sectionClass(isActiveEvenements)}>
                {t("common.header.evenements")}
              </Link>
            )}
            {membre && (
              <Link href="/mes-services" className={sectionClass(isActiveMesServices)}>
                {t("common.header.myServices")}
              </Link>
            )}
            {/* Tâches (lot 7 ; EQ15) : pour les membres d'une équipe (Louange élargi) et les admins. */}
            {BACK_OFFICE && !authLoading && user && (admin || equipesDe(profile).length > 0) && (
              <Link href="/taches" className={sectionClass(isActiveTaches)}>
                {t("common.header.taches")}
              </Link>
            )}
          </nav>

          {/* Actions — pushed to far right */}
          <div className="ml-auto flex items-center gap-2">
            {avecMessages && (forme.retenue ? <IconeMessagesRetenue boutonClassName={ICON_BUTTON} /> : <IconeMessages boutonClassName={ICON_BUTTON} />)}
            {/* Notifications */}
            {!authLoading && user && <Cloche boutonClassName={ICON_BUTTON} />}
            {attente && <span aria-hidden className={`${ICON_BUTTON} pointer-events-none`} />}

            {/* Langue : partout, pour les sinophones sans compte aussi */}
            <button
              onClick={toggleLanguage}
              aria-label={isZh ? "Changer en français" : "切换为中文"}
              className={`${ICON_BUTTON} w-auto min-w-10 px-3 gap-1.5 text-sm font-semibold ${responsable ? "max-sm:hidden" : ""}`}
            >
              <Globe className="h-4 w-4" aria-hidden />
              <span className={membre ? "" : "hidden min-[400px]:inline"}>{isZh ? "中文" : "FR"}</span>
            </button>

            {/* Thème : sur ordinateur ; sur tactile, un membre le trouve dans « Moi » */}
            <button
              onClick={toggleTheme}
              aria-label={dark ? t("common.aria.modeClair") : t("common.aria.modeSombre")}
              className={`${ICON_BUTTON} ${membre ? "hidden lg:flex" : "hidden sm:flex"}`}
            >
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {/* Compte (ordinateur) ou Connexion */}
            {attente && <span aria-hidden className="hidden lg:flex h-9 w-9 shrink-0 rounded-full bg-secondary" />}
            {!authLoading && (
              user ? (
                <MenuCompte>
                  <button
                    aria-label={t("common.header.account")}
                    title={displayName}
                    className="relative hidden lg:flex h-9 w-9 shrink-0 rounded-full after:absolute after:-inset-1 after:content-[''] bg-foreground text-background text-sm font-bold items-center justify-center transition-transform duration-150 active:scale-[.94] cursor-pointer"
                  >
                    {initial}
                  </button>
                </MenuCompte>
              ) : (
                <Link
                  aria-label={t("common.header.login")}
                  href="/login"
                  className="connexion-visiteur flex h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-[background-color,transform] duration-150 active:scale-[.96] items-center justify-center gap-1.5 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  <span className="max-[359px]:hidden">{t("common.header.login")}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </header>
    </>
  );
}
