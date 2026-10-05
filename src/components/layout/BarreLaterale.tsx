"use client";

// Barre latérale (lot U4, docs/spec-navigation-grand-ecran.md) : sur ordinateur, elle remplace
// la barre du haut et celle du bas. Montée partout, montrée par le CSS seul (`.barre-laterale`,
// bloc « Lot U4 » de globals.css) : la disposition ne se décide jamais par l'agent utilisateur,
// et rien ne saute au chargement. Mêmes entrées que la barre du bas (`entreesBarre`).
// Réductible en icônes (N3) : le choix est retenu par appareil (`barreLateralePref`), et c'est
// encore le CSS qui l'applique, d'après `<html data-barre="reduite">`.
// Tablette en paysage (N4) : réduite toujours (CSS) ; « Déplier » pose la barre dépliée
// PAR-DESSUS la page (feuille `vaul` par la gauche, sans mise à l'échelle), sur un voile ; elle
// se referme au choix d'une entrée, sur un toucher du voile, par Échap ou « Réduire », et ne
// retient rien.
import { useEffect, useRef, useState, useSyncExternalStore, type Ref } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { LogIn, Moon, PanelLeft, PanelLeftClose, Sun } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { useAuth } from "@/lib/firebase/auth";
import { useSetLanguage } from "@/lib/I18nProvider";
import { BACK_OFFICE } from "@/lib/backOffice";
import { entreesBarre, estEntreeActive, labelDeSection } from "@/lib/navigation";
import { getBarreReduite, setBarreReduite } from "@/lib/barreLateralePref";
import { Cloche } from "@/components/layout/Cloche";
import { MenuCompte, useNomDuMembre } from "@/components/layout/MenuCompte";
import { Drawer, DrawerOverlay, DrawerPortal, DrawerTitle } from "@/components/ui/drawer";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";

// Pastille ronde du pied (cloche, langue, thème) : en relief, comme sur la planche.
const PASTILLE =
  "h-9 w-9 shrink-0 rounded-full raised text-foreground/80 hover:text-foreground transition-[color,transform] duration-150 active:scale-[.94] flex items-center justify-center cursor-pointer";
// Bouton « Réduire » / « Déplier » : discret, gris, comme sur la planche.
const BASCULE =
  "shrink-0 items-center justify-center text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors duration-150 cursor-pointer";

/** Les menus du pied s'ouvrent à côté de la barre, à 8 px de son bord. Radix place un menu
 *  par rapport au bouton qui l'ouvre : le décalage se mesure depuis ce bouton, à l'ouverture. */
function useACoteDeLaBarre() {
  const [sideOffset, setSideOffset] = useState(8);
  const mesurer = (e: React.SyntheticEvent<HTMLElement>) => {
    // L'enveloppe est en `display: contents` (pas de boîte) : on mesure le bouton touché.
    const bouton = (e.target as Element).closest("button")?.getBoundingClientRect();
    const barre = e.currentTarget.closest("[data-barre-conteneur]")?.getBoundingClientRect();
    if (bouton && barre) setSideOffset(Math.round(barre.right - bouton.right + 8));
  };
  return { sideOffset, ouvrir: { onPointerDownCapture: mesurer, onKeyDownCapture: mesurer } };
}

/** Tablette en paysage : la condition du CSS (bloc « Lot U4 » de globals.css, Q1), jamais l'agent utilisateur. */
const TABLETTE_PAYSAGE = "(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";
const suivreTablette = (changement: () => void) => {
  const m = window.matchMedia(TABLETTE_PAYSAGE);
  m.addEventListener("change", changement);
  return () => m.removeEventListener("change", changement);
};
function useTablettePaysage() {
  return useSyncExternalStore(suivreTablette, () => window.matchMedia(TABLETTE_PAYSAGE).matches, () => false);
}

export function BarreLaterale() {
  const { t } = useTranslation();
  const pathname = usePathname() || "";
  const tablette = useTablettePaysage();
  const [mounted, setMounted] = useState(false);
  // Réduite : sert aux infobulles seulement ; la mise en page, elle, suit le CSS dès l'en-tête.
  const [reduite, setReduite] = useState(false);
  useEffect(() => {
    setMounted(true);
    setReduite(getBarreReduite());
  }, []);
  const basculer = (v: boolean) => {
    setBarreReduite(v);
    setReduite(v);
  };
  // Tablette en paysage : la barre dépliée par-dessus la page, ouverte à la demande. Elle est
  // ouverte SUR une page : une page choisie (entrée, logo, menu « Compte ») la referme.
  const [ouverteSur, setOuverteSur] = useState<string | null>(null);
  const ouverte = ouverteSur === pathname;
  const setOuverte = (v: boolean) => setOuverteSur(v ? pathname : null);
  const deplierRef = useRef<HTMLButtonElement>(null);
  useStandaloneScrollLock(ouverte);
  // L'iPad tourné (debout, plus de barre latérale) la referme aussi.
  useEffect(() => suivreTablette(() => setOuverteSur(null)), []);

  return (
    <>
      <div
        data-testid="barre-laterale"
        data-barre-conteneur
        className="barre-laterale print:hidden fixed inset-y-0 left-0 z-40 w-[var(--barre-laterale)] flex-col gap-3.5 overflow-y-auto px-3.5 pb-3.5 pt-[calc(18px+var(--sat))]"
      >
        <ContenuBarre
          mounted={mounted}
          enIcones={reduite || tablette}
          onReduire={() => basculer(true)}
          onDeplier={() => (tablette ? setOuverte(true) : basculer(false))}
          deplierRef={deplierRef}
        />
      </div>
      {/* Q11, Q12 : plan 50, voile à 35 %, glissé depuis la gauche (fondu en mouvement réduit,
          globals.css) ; la page dessous ne bouge pas (pas de mise à l'échelle). */}
      <Drawer direction="left" shouldScaleBackground={false} open={ouverte} onOpenChange={setOuverte}>
        <DrawerPortal>
          <DrawerOverlay data-testid="voile-barre" className="print:hidden" />
          <DrawerPrimitive.Content
            data-testid="barre-par-dessus"
            data-barre-conteneur
            aria-describedby={undefined}
            // Le focus revient sur « Déplier » (sans `Trigger`, Radix ne saurait où le rendre).
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              deplierRef.current?.focus();
            }}
            className="barre-par-dessus print:hidden fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col gap-3.5 overflow-y-auto px-3.5 pb-3.5 pt-[calc(18px+var(--sat))] outline-none"
          >
            <DrawerTitle className="sr-only">{t("common.aria.navigationPrincipale")}</DrawerTitle>
            <ContenuBarre parDessus mounted={mounted} enIcones={false} onReduire={() => setOuverte(false)} onChoix={() => setOuverte(false)} />
          </DrawerPrimitive.Content>
        </DrawerPortal>
      </Drawer>
    </>
  );
}

/** Le contenu de la barre : dans la barre fixe (dépliée, ou réduite par le CSS) et, sur la
 *  tablette en paysage, dans la barre dépliée par-dessus la page (`parDessus`). */
function ContenuBarre({
  mounted,
  parDessus = false,
  enIcones,
  onReduire,
  onDeplier,
  onChoix,
  deplierRef,
}: {
  mounted: boolean;
  parDessus?: boolean;
  /** Barre réduite : les noms passent en infobulle. */
  enIcones: boolean;
  onReduire: () => void;
  onDeplier?: () => void;
  /** Une entrée ou le logo touché (barre par-dessus : elle se referme). */
  onChoix?: () => void;
  deplierRef?: Ref<HTMLButtonElement>;
}) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() || "";
  const { user, loading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = mounted && resolvedTheme === "dark";
  const setLanguage = useSetLanguage();
  const isZh = i18n.language === "zh-CN";
  const label = t(labelDeSection(pathname));
  const { displayName, initial, planningName } = useNomDuMembre();
  const compte = useACoteDeLaBarre();
  const cloche = useACoteDeLaBarre();
  // Back-office coupé (lot 18) : la section Évènements n'est pas en ligne.
  const entrees = loading ? [] : entreesBarre("app", { connecte: !!user, backOffice: BACK_OFFICE });

  // Barre réduite : la langue d'un membre n'y figure pas (Q5), celle du visiteur si.
  const langue = (classe = "") => (
    <button
      onClick={() => setLanguage(isZh ? "fr" : "zh-CN")}
      aria-label={isZh ? "Changer en français" : "切换为中文"}
      className={`${PASTILLE} text-xs font-bold ${classe}`}
    >
      {isZh ? "中文" : "FR"}
    </button>
  );

  return (
    <>
      {/* Logo et label contextuel (comportement gelé : contextuel, rouge du logo, en fondu),
          puis « Réduire » ; barre réduite : le logo seul. */}
      <div className="flex items-center gap-1">
        <Link href={user ? "/planning" : "/songs"} onClick={onChoix} className="flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-0.5">
          <span className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full">
            <Image src="/logo.png" alt="GCC Logo" fill sizes="30px" className="object-contain" priority />
          </span>
          <span className="barre-texte whitespace-nowrap text-[17px] font-bold tracking-[-0.01em] text-foreground">
            GCC{" "}
            <span key={label} data-testid="label-section" className="text-brand animate-in fade-in duration-150">
              {label}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onReduire}
          aria-label={t("common.aria.reduireBarre")}
          title={t("common.aria.reduireBarre")}
          className={`barre-si-depliee ml-auto flex h-8 w-8 rounded-[9px] ${BASCULE}`}
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Place du sélecteur App ↔ Back-Office : vide en U4, U6 la remplit pour les responsables. */}
      <div data-testid="place-selecteur" className="barre-si-depliee empty:hidden" />

      <nav aria-label={t("common.aria.navigationPrincipale")} className="flex flex-col gap-0.5">
        {entrees.map((entree) => {
          const { href, cle, Icone } = entree;
          const active = estEntreeActive(entree, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={t(cle)}
              title={enIcones ? t(cle) : undefined}
              onClick={onChoix}
              className={`barre-entree flex items-center gap-3 rounded-xl px-3 py-[9px] text-[15px] font-semibold transition-colors duration-150 ${
                active ? "bg-primary text-primary-foreground" : "text-foreground/85 hover:bg-foreground/5"
              }`}
            >
              <Icone className="h-5 w-5 shrink-0" strokeWidth={active ? 2.1 : 1.9} aria-hidden />
              <span className="barre-texte">{t(cle)}</span>
            </Link>
          );
        })}
      </nav>

      {!parDessus && (
        <button
          ref={deplierRef}
          type="button"
          onClick={onDeplier}
          aria-label={t("common.aria.deplierBarre")}
          title={t("common.aria.deplierBarre")}
          className={`barre-si-reduite h-11 w-11 rounded-xl ${BASCULE}`}
        >
          <PanelLeft className="h-5 w-5" aria-hidden />
        </button>
      )}

      <div data-testid="pied-barre" className="barre-pied barre-laterale-filet mt-auto flex items-center gap-2 border-t px-1.5 pt-2">
        {!loading &&
          (user ? (
            <>
              <span className="contents" {...compte.ouvrir}>
                <MenuCompte side="right" align="end" sideOffset={compte.sideOffset}>
                  <button
                    aria-label={t("common.header.account")}
                    title={displayName}
                    className="barre-fin h-8 w-8 shrink-0 rounded-full bg-foreground text-background text-[13px] font-bold flex items-center justify-center transition-transform duration-150 active:scale-[.94] cursor-pointer"
                  >
                    {initial}
                  </button>
                </MenuCompte>
              </span>
              <div className="barre-si-depliee min-w-0 flex-1 text-[13px] leading-4">
                <div className="truncate font-bold text-foreground">{displayName}</div>
                {planningName && planningName !== displayName && (
                  <div className="truncate text-muted-foreground">{planningName}</div>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <span className="contents" {...cloche.ouvrir}>
                  <Cloche boutonClassName={PASTILLE} side="right" align="end" sideOffset={cloche.sideOffset} />
                </span>
                {langue("barre-si-depliee")}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-label={t("common.header.login")}
                title={enIcones ? t("common.header.login") : undefined}
                className="barre-connexion h-9 min-w-0 flex-1 rounded-full bg-primary px-3 text-primary-foreground hover:bg-primary/90 transition-[background-color,transform] duration-150 active:scale-[.96] flex items-center justify-center gap-1.5 text-sm font-semibold"
              >
                <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                <span className="barre-texte truncate">{t("common.header.login")}</span>
              </Link>
              {langue()}
              <button
                onClick={() => setTheme(dark ? "light" : "dark")}
                aria-label={dark ? t("common.aria.modeClair") : t("common.aria.modeSombre")}
                className={PASTILLE}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </>
          ))}
      </div>
    </>
  );
}
