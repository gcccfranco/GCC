"use client";

// Dictionnaire d'accords (lot DA, DA-2) — ouvrir le panneau d'un accord de n'importe où :
//
//   const { ouvrir, fermer } = useOuvrirAccord();
//   ouvrir({ accord: "D/F#", ancre: element, capo: 2, chant: { slug, titre } });
//
// Sur ordinateur (souris, 1 024 px et plus, comme `useDeuxVolets`) avec une ancre : une bulle sous l'accord.
// Ailleurs (téléphone, tablette, tablette en paysage) : la feuille du bas.
//
// DA-3 — l'interrupteur : seules les surfaces sous un fournisseur **actif** rendent des accords touchables
// (`AccordTouchable`). Le contexte par défaut est inactif ; `AccordsInactifs` coupe un sous-arbre (lignes
// d'édition, mode louange). Le fournisseur porte aussi le chant lu (pour « Signaler ») et, si `aide`, la
// bulle d'aide qui s'affiche une seule fois par appareil (Q16).

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ReportDialog } from "@/components/report/ReportDialog";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { analyserAccord, type Accord } from "@/lib/accords/analyse";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { PanneauAccord } from "./PanneauAccord";
import { decrire } from "./outils";

export type DemandeAccord = {
  /** L'accord tel qu'affiché : « D/F# », « (A) », « Bb2 ». */
  accord: string;
  /** L'élément touché : la bulle se pose dessous et lui rend le focus à la fermeture. */
  ancre?: HTMLElement | null;
  /** Capo : l'accord reçu est déjà celui affiché, le panneau le rappelle. */
  capo?: number;
  /** Le chant lu, pour le signalement d'un doigté manquant. */
  chant?: { slug: string; titre: string };
};

type Chant = { slug: string; titre: string };
type Contexte = {
  ouvrir: (d: DemandeAccord) => void;
  fermer: () => void;
  /** Vrai sous un fournisseur actif : les accords y sont touchables. */
  actif: boolean;
  /** Le chant lu, joint à chaque demande qui n'en porte pas. */
  chant?: Chant;
  /** Un accord touchable s'annonce (pour la bulle d'aide) ; renvoie son retrait. */
  enregistrer: (el: HTMLElement) => () => void;
};

const Rien: Contexte = { ouvrir: () => {}, fermer: () => {}, actif: false, enregistrer: () => () => {} };
const AccordsContext = createContext<Contexte>(Rien);

export function useOuvrirAccord(): Contexte {
  return useContext(AccordsContext);
}

/** Coupe les accords touchables de tout ce qui est dessous (édition d'une ligne, mode louange). */
export function AccordsInactifs({ children }: { children: React.ReactNode }) {
  return <AccordsContext.Provider value={Rien}>{children}</AccordsContext.Provider>;
}

/** Dit de quel chant sont les accords dessous (une setlist en porte plusieurs). */
export function ChantDesAccords({ chant, children }: { chant: Chant; children: React.ReactNode }) {
  const parent = useContext(AccordsContext);
  const valeur = useMemo(() => ({ ...parent, chant }), [parent, chant]);
  return <AccordsContext.Provider value={valeur}>{children}</AccordsContext.Provider>;
}

const CLE_AIDE = "accords-aide-vue";
function aideDejaVue(): boolean {
  try {
    return window.localStorage.getItem(CLE_AIDE) !== null;
  } catch {
    return false;
  }
}
function noterAideVue() {
  try {
    window.localStorage.setItem(CLE_AIDE, "1");
  } catch { /* stockage indisponible : l'aide reviendra */ }
}

type Ouvert = { accord: Accord; ancre: HTMLElement | null; capo?: number; chant?: { slug: string; titre: string } };

const ORDINATEUR = "(pointer: fine) and (min-width: 1024px)";
function suivreOrdinateur(changement: () => void) {
  const m = window.matchMedia(ORDINATEUR);
  m.addEventListener("change", changement);
  return () => m.removeEventListener("change", changement);
}
function useOrdinateur(): boolean {
  return useSyncExternalStore(suivreOrdinateur, () => window.matchMedia(ORDINATEUR).matches, () => false);
}

export function AccordsProvider({
  children,
  actif = true,
  chant,
  aide = false,
}: {
  children: React.ReactNode;
  /** Faux : le fournisseur reste monté mais les accords ne sont plus touchables (setlist en édition). */
  actif?: boolean;
  chant?: Chant;
  /** Montre, une seule fois par appareil, la bulle « Touchez un accord… » sous le premier accord visible. */
  aide?: boolean;
}) {
  const [ouvert, setOuvert] = useState<Ouvert | null>(null);
  const [aideAncre, setAideAncre] = useState<HTMLElement | null>(null);
  const touchables = useRef(new Set<HTMLElement>());
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signalement, setSignalement] = useState<{ accord: string; chant?: { slug: string; titre: string } } | null>(null);
  const derniereAncre = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();

  const fermer = useCallback(() => {
    setOuvert(null);
    const ancre = derniereAncre.current;
    derniereAncre.current = null;
    // Le focus revient à l'accord touché (après le rendu, que vaul ne le reprenne pas).
    if (ancre) setTimeout(() => ancre.isConnected && ancre.focus({ preventScroll: true }), 0);
  }, []);

  const fermerAide = useCallback(() => {
    setAideAncre(null);
    noterAideVue();
  }, []);

  const ouvrir = useCallback((d: DemandeAccord) => {
    const accord = analyserAccord(d.accord);
    if (!accord) return;
    derniereAncre.current = d.ancre ?? null;
    // Toucher un accord vaut lecture de l'aide.
    if (aideAncre) fermerAide();
    setOuvert({ accord, ancre: d.ancre ?? null, capo: d.capo, chant: d.chant ?? chant });
  }, [chant, aideAncre, fermerAide]);

  // La bulle d'aide : sous le premier accord visible, une fois les accords posés (les chants arrivent
  // par le réseau) ; si aucun n'est à l'écran, on réessaie au défilement.
  const chercherPremier = useCallback(() => {
    if (!aide || !actif || aideDejaVue()) return;
    const visibles = [...touchables.current].filter((el) => {
      if (!el.isConnected) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 96 && r.bottom <= window.innerHeight - 140;
    });
    visibles.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (visibles[0]) setAideAncre((courante) => courante ?? visibles[0]);
  }, [aide, actif]);

  const programmer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(chercherPremier, 500);
  }, [chercherPremier]);

  const enregistrer = useCallback((el: HTMLElement) => {
    touchables.current.add(el);
    programmer();
    return () => {
      touchables.current.delete(el);
    };
  }, [programmer]);

  useEffect(() => {
    if (!aide || !actif || aideAncre || aideDejaVue()) return;
    programmer();
    window.addEventListener("scroll", programmer, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", programmer, true);
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [aide, actif, aideAncre, programmer]);

  // Passage en édition : tout se referme (ajustement pendant le rendu, pas dans un effet).
  const [etaitActif, setEtaitActif] = useState(actif);
  if (etaitActif !== actif) {
    setEtaitActif(actif);
    if (!actif) {
      setOuvert(null);
      setAideAncre(null);
    }
  }

  const valeur = useMemo<Contexte>(
    () => (actif ? { ouvrir, fermer, actif: true, chant, enregistrer } : Rien),
    [actif, ouvrir, fermer, chant, enregistrer],
  );

  return (
    <AccordsContext.Provider value={valeur}>
      {children}
      {actif && aideAncre && <AideBulle ancre={aideAncre} onOk={fermerAide} />}
      {actif && ouvert && (
        <PanneauOuvert
          ouvert={ouvert}
          fermer={fermer}
          signaler={() => {
            setSignalement({ accord: ouvert.accord.texte, chant: ouvert.chant });
            fermer();
          }}
        />
      )}
      <ReportDialog
        open={!!signalement}
        onClose={() => setSignalement(null)}
        kind={signalement?.chant ? "song" : "site"}
        songSlug={signalement?.chant?.slug}
        songTitle={signalement?.chant?.titre}
        titreInitial={signalement ? t("accords.signalerTitre", { accord: signalement.accord }) : undefined}
        descriptionInitiale={
          signalement
            ? [
                t("accords.signalerDescription", { accord: signalement.accord }),
                signalement.chant && t("accords.signalerChant", { titre: signalement.chant.titre }),
              ].filter(Boolean).join("\n")
            : undefined
        }
      />
    </AccordsContext.Provider>
  );
}

function PanneauOuvert({ ouvert, fermer, signaler }: { ouvert: Ouvert; fermer: () => void; signaler: () => void }) {
  const ordinateur = useOrdinateur();
  const acces = useAccesHarmonie();
  const [instrument, setInstrument] = useInstrument(acces, "guitare");
  const commun = { accord: ouvert.accord, instrument, onInstrument: setInstrument, capo: ouvert.capo, onFermer: fermer, onSignaler: signaler };
  if (ordinateur && ouvert.ancre) return <Bulle ancre={ouvert.ancre} {...commun} />;
  return <Feuille {...commun} />;
}

function Feuille(props: Omit<React.ComponentProps<typeof PanneauAccord>, "variante"> & { onFermer: () => void }) {
  const { t } = useTranslation();
  useStandaloneScrollLock(true);
  return (
    <Drawer open onOpenChange={(o) => !o && props.onFermer()}>
      <DrawerContent className="max-h-[88vh] md:mx-auto md:max-w-xl" data-accord-panneau="feuille">
        <DrawerTitle className="sr-only">{props.accord.texte}</DrawerTitle>
        <DrawerDescription className="sr-only">{decrire(props.accord, t)}</DrawerDescription>
        <div className="overflow-y-auto">
          <PanneauAccord {...props} variante="feuille" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const LARGEUR_BULLE = 300;
const MARGE = 8;
const ECART = 12;

type Place = { left: number; top: number; fleche: number; dessus: boolean; sansFleche?: boolean };

function Bulle(props: Omit<React.ComponentProps<typeof PanneauAccord>, "variante"> & { onFermer: () => void; ancre: HTMLElement }) {
  const { ancre, onFermer } = props;
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  const placer = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (!ancre.isConnected) return onFermer();
    const r = ancre.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const centre = r.left + r.width / 2;
    const left = clamp(centre - w / 2, MARGE, Math.max(MARGE, window.innerWidth - w - MARGE));
    const tientDessous = r.bottom + ECART + h <= window.innerHeight - MARGE;
    const dessus = !tientDessous && r.top - ECART - h > MARGE;
    // Ni dessous ni dessus (écran bas, accord en haut de page) : la bulle se cale dans l'écran, sur l'accord, sans flèche.
    const cale = !tientDessous && !dessus;
    const top = dessus ? r.top - ECART - h : cale ? clamp(r.bottom + ECART, MARGE, Math.max(MARGE, window.innerHeight - h - MARGE)) : r.bottom + ECART;
    setPlace({ left, top, fleche: clamp(centre - left, 24, w - 24), dessus, sansFleche: cale });
  }, [ancre, onFermer]);

  useLayoutEffect(() => {
    placer();
    const el = ref.current;
    const obs = el ? new ResizeObserver(placer) : null;
    if (el) obs?.observe(el);
    window.addEventListener("resize", placer);
    window.addEventListener("scroll", placer, true);
    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", placer);
      window.removeEventListener("scroll", placer, true);
    };
  }, [placer]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    // Échap sur la fenêtre, en capture : par-dessus une feuille (Idées d'harmonie), il ferme la bulle
    // seule — la feuille, qui écoute Échap sur le document, ne le reçoit pas.
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onFermer();
    };
    const surAppui = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (!ref.current?.contains(cible) && !ancre.contains(cible)) onFermer();
    };
    window.addEventListener("keydown", surTouche, true);
    document.addEventListener("pointerdown", surAppui, true);
    return () => {
      window.removeEventListener("keydown", surTouche, true);
      document.removeEventListener("pointerdown", surAppui, true);
    };
  }, [ancre, onFermer]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={t("accords.titre") + " " + props.accord.texte}
      tabIndex={-1}
      data-accord-panneau="bulle"
      style={{
        position: "fixed",
        width: LARGEUR_BULLE,
        left: place?.left ?? 0,
        top: place?.top ?? 0,
        visibility: place ? "visible" : "hidden",
      }}
      className="pointer-events-auto z-50 rounded-2xl border border-border bg-card text-foreground shadow-xl outline-none"
    >
      {place && !place.sansFleche && (
        <span
          aria-hidden
          style={{ left: place.fleche - 6 }}
          className={`absolute h-3 w-3 rotate-45 bg-card ${place.dessus ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t"} border-border`}
        />
      )}
      {/* Plus haute que l'écran : le contenu défile sur lui-même plutôt que de sortir du cadre (la flèche reste dehors). */}
      <div className="overflow-y-auto rounded-2xl" style={{ maxHeight: window.innerHeight - 2 * MARGE }}>
        <PanneauAccord {...props} variante="bulle" />
      </div>
    </div>,
    document.body,
  );
}

/** La bulle d'aide de la première fois (Q16) : encre, en bas de l'écran, centrée, au-dessus de la barre du bas
 *  quand elle est rendue (C9, audit 24/10/2026). L'accord annoncé ne sert que de déclencheur, plus à placer. */
function AideBulle({ ancre, onOk }: { ancre: HTMLElement; onOk: () => void }) {
  const { t } = useTranslation();
  const ordinateur = useOrdinateur();
  const [surBarre, setSurBarre] = useState(false);
  // Centre de la colonne de lecture (en deux volets, la fenêtre entière déborderait sur la liste).
  const [centre, setCentre] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!ancre.isConnected) return onOk();
    const mesurer = () => {
      const barre = document.querySelector<HTMLElement>("[data-testid=barre-du-bas]");
      setSurBarre(!!barre && barre.offsetHeight > 0);
      const colonne = (ancre.closest("[data-copy-line]")?.parentElement ?? null)?.getBoundingClientRect();
      setCentre(colonne && colonne.width > 0 ? colonne.left + colonne.width / 2 : null);
    };
    mesurer();
    // La barre peut se rendre après la bulle (session qui arrive) : on la guette tant que la bulle est là.
    const obs = new MutationObserver(mesurer);
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", mesurer);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, [ancre, onOk]);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOk();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [onOk]);

  return createPortal(
    <div
      role="status"
      data-accords-aide
      style={{
        position: "fixed",
        width: `min(280px, 100vw - ${2 * MARGE}px)`,
        left: centre === null ? "50%" : `clamp(min(140px, 50vw), ${centre}px, max(100vw - 140px, 50vw))`,
        transform: "translateX(-50%)",
        bottom: surBarre
          ? "calc(var(--tabbar-bottom) + 78px + 8px)"
          : `calc(${3 * MARGE}px + env(safe-area-inset-bottom))`,
      }}
      className="pointer-events-auto z-50 rounded-[12px] bg-foreground px-4 py-3 text-sm leading-snug text-background shadow-xl"
    >
      <p className="relative">{t(ordinateur ? "accords.aideCliquer" : "accords.aideToucher")}</p>
      <div className="relative mt-2 flex justify-end">
        <button
          type="button"
          onClick={onOk}
          className="h-8 rounded-full bg-background/20 px-4 text-sm font-semibold outline-none hover:bg-background/30 focus-visible:ring-2 focus-visible:ring-background"
        >
          {t("accords.aideOk")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
