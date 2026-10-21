"use client";

// Dictionnaire d'accords (lot DA, DA-2) — ouvrir le panneau d'un accord de n'importe où :
//
//   const { ouvrir, fermer } = useOuvrirAccord();
//   ouvrir({ accord: "D/F#", ancre: element, capo: 2, chant: { slug, titre } });
//
// Sur ordinateur (souris, 1 024 px et plus, comme `useDeuxVolets`) avec une ancre : une bulle sous l'accord.
// Ailleurs (téléphone, tablette, tablette en paysage) : la feuille du bas. Le fournisseur n'est monté nulle
// part encore : DA-3 le posera avec les surfaces de chant.

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

type Contexte = { ouvrir: (d: DemandeAccord) => void; fermer: () => void };

const Rien: Contexte = { ouvrir: () => {}, fermer: () => {} };
const AccordsContext = createContext<Contexte>(Rien);

export function useOuvrirAccord(): Contexte {
  return useContext(AccordsContext);
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

export function AccordsProvider({ children }: { children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState<Ouvert | null>(null);
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

  const ouvrir = useCallback((d: DemandeAccord) => {
    const accord = analyserAccord(d.accord);
    if (!accord) return;
    derniereAncre.current = d.ancre ?? null;
    setOuvert({ accord, ancre: d.ancre ?? null, capo: d.capo, chant: d.chant });
  }, []);

  const valeur = useMemo(() => ({ ouvrir, fermer }), [ouvrir, fermer]);

  return (
    <AccordsContext.Provider value={valeur}>
      {children}
      {ouvert && (
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

type Place = { left: number; top: number; fleche: number; dessus: boolean };

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
    const dessus = r.bottom + ECART + h > window.innerHeight - MARGE && r.top - ECART - h > MARGE;
    const top = dessus ? r.top - ECART - h : r.bottom + ECART;
    setPlace({ left, top, fleche: clamp(centre - left, 24, w - 24), dessus });
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
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    const surAppui = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (!ref.current?.contains(cible) && !ancre.contains(cible)) onFermer();
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("pointerdown", surAppui, true);
    return () => {
      document.removeEventListener("keydown", surTouche);
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
      style={{ position: "fixed", width: LARGEUR_BULLE, left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? "visible" : "hidden" }}
      className="z-50 rounded-2xl border border-border bg-card text-foreground shadow-xl outline-none"
    >
      {place && (
        <span
          aria-hidden
          style={{ left: place.fleche - 6 }}
          className={`absolute h-3 w-3 rotate-45 bg-card ${place.dessus ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t"} border-border`}
        />
      )}
      <PanneauAccord {...props} variante="bulle" />
    </div>,
    document.body,
  );
}
