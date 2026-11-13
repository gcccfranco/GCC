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
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ReportDialog } from "@/components/report/ReportDialog";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { tonaliteDesEtiquettes } from "@/lib/harmonie/suites";
import { analyserAccord, type Accord } from "@/lib/accords/analyse";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { PanneauAccord } from "./PanneauAccord";
import { decrire } from "./outils";
import { compter } from "@/lib/usage";
import type { ChordProSection } from "@/types/chordPro";

type DemandeAccord = {
  /** L'accord tel qu'affiché : « D/F# », « (A) », « Bb2 ». */
  accord: string;
  /** L'élément touché : la bulle se pose dessous et lui rend le focus à la fermeture. */
  ancre?: HTMLElement | null;
  /** Capo : l'accord reçu est déjà celui affiché, le panneau le rappelle. */
  capo?: number;
  /** Le chant lu, pour le signalement d'un doigté manquant. */
  chant?: { slug: string; titre: string };
  /** Tonalité affichée du chant (posée par le fournisseur, jamais par l'appelant). */
  tonalite?: string;
  /** De quoi ouvrir la porte 2 au passage de l'accord (posé par le fournisseur, jamais par l'appelant). */
  ici?: IciDuChant;
};

/** H5-2 : ce qu'il faut pour calculer la ligne « Ici » et ouvrir la porte 2 au bloc d'un passage. */
export type IciDuChant = {
  sections: ChordProSection[];
  /** Tonalité jouée (celle de la porte 2). */
  tonalite: string;
  tonaliteOrigine?: string;
  /** `depuisNom` : touché sur le nom de la section (JV-5a) ; la feuille s'ouvre à mi-hauteur au téléphone. */
  ouvrir: (sectionUid: string, idee?: string, options?: { depuisNom?: boolean; /** Le nom touché : la page le remonte sous la barre avant d'ouvrir la feuille. */ element?: HTMLElement | null }) => void;
};

/** Ce que le panneau sait du chant lu : la tonalité affichée et l'accord qui suit vraiment dans la partition. */
export type HarmonieDuPanneau = {
  /** Tonalité des étiquettes (capo déduit). */
  tonalite: string;
  suivant?: string;
  /** Accord d'une section de la partition : « Ensuite » ; sinon (calque 简谱, en-tête) chiffre et Écouter seulement. */
  enSection: boolean;
  /** Les uid de la section de l'accord touché et de quoi ouvrir la porte 2 (H5-2). */
  sectionUids?: string[];
  ici?: IciDuChant;
};

type Chant = { slug: string; titre: string };
type Contexte = {
  ouvrir: (d: DemandeAccord) => void;
  fermer: () => void;
  /** Ferme sans rendre le focus à l'accord touché (la colonne Harmonie s'ouvre ailleurs). */
  fermerSansFocus: () => void;
  /** Vrai sous un fournisseur actif : les accords y sont touchables. */
  actif: boolean;
  /** Le chant lu, joint à chaque demande qui n'en porte pas. */
  chant?: Chant;
  /** Un accord touchable s'annonce (pour la bulle d'aide) ; renvoie son retrait. */
  enregistrer: (el: HTMLElement) => () => void;
  /** Aide « dans le flux » (`aide="flux"`) : présent seulement tant qu'elle est à afficher ; ferme l'aide. */
  fermerAideLigne?: () => void;
  /** JV-5a : de quoi ouvrir la porte 2 au passage d'une section (nom de section touchable) ; absent sans accès Harmonie. */
  ici?: IciDuChant;
};

const Rien: Contexte = { ouvrir: () => {}, fermer: () => {}, fermerSansFocus: () => {}, actif: false, enregistrer: () => () => {} };
const AccordsContext = createContext<Contexte>(Rien);

/** Joint la tonalité affichée à chaque demande qui descend du fournisseur (H5-1 ; H5-2 y ajoutera les passages). */
function avecTonalite(parent: Contexte, tonalite?: string, ici?: IciDuChant): Contexte {
  return tonalite ? { ...parent, ouvrir: (d) => parent.ouvrir({ tonalite, ici, ...d }) } : parent;
}

export function useOuvrirAccord(): Contexte {
  return useContext(AccordsContext);
}

/** JV-5a : l'`ici` du fournisseur le plus proche (le nom d'une section ouvre la porte 2 par le même chemin que « Ici »). */
export function useIciDuChant(): IciDuChant | undefined {
  return useContext(AccordsContext).ici;
}

/** Coupe les accords touchables de tout ce qui est dessous (édition d'une ligne, mode louange). */
export function AccordsInactifs({ children }: { children: React.ReactNode }) {
  return <AccordsContext.Provider value={Rien}>{children}</AccordsContext.Provider>;
}

/** Dit de quel chant sont les accords dessous (une setlist en porte plusieurs). */
export function ChantDesAccords({ chant, tonalite, ici, children }: { chant: Chant; tonalite?: string; ici?: IciDuChant; children: React.ReactNode }) {
  const parent = useContext(AccordsContext);
  const valeur = useMemo(() => avecTonalite({ ...parent, chant, ici }, tonalite, ici), [parent, chant, tonalite, ici]);
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

type Ouvert = { accord: Accord; ancre: HTMLElement | null; capo?: number; chant?: { slug: string; titre: string }; harmonie?: HarmonieDuPanneau };

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
  tonalite,
  ici,
  aide = false,
}: {
  children: React.ReactNode;
  /** Faux : le fournisseur reste monté mais les accords ne sont plus touchables (setlist en édition). */
  actif?: boolean;
  chant?: Chant;
  /** Tonalité affichée du chant lu : le panneau situe l'accord touché dans la partition (page chant). */
  tonalite?: string;
  /** H5-2 : de quoi ouvrir la porte 2 au passage de l'accord touché (page chant). */
  ici?: IciDuChant;
  /** Montre, une seule fois par appareil, la bulle « Touchez un accord… » sous le premier accord visible.
   *  `"flux"` : pas de bulle posée par-dessus, l'aide se dessine là où l'on pose `AideAccordsEnLigne`. */
  aide?: boolean | "flux";
}) {
  const [ouvert, setOuvert] = useState<Ouvert | null>(null);
  const [aideAncre, setAideAncre] = useState<HTMLElement | null>(null);
  const enLigne = aide === "flux";
  const bulle = aide === true;
  const [aideLigne, setAideLigne] = useState(false);
  const aideLigneFermee = useRef(false);
  const touchables = useRef(new Set<HTMLElement>());
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signalement, setSignalement] = useState<{ accord: string; chant?: { slug: string; titre: string } } | null>(null);
  const derniereAncre = useRef<HTMLElement | null>(null);
  const courant = useRef<Ouvert | null>(null);
  const { t } = useTranslation();

  const fermer = useCallback(() => {
    setOuvert(null);
    courant.current = null;
    const ancre = derniereAncre.current;
    derniereAncre.current = null;
    // Le focus revient à l'accord touché (après le rendu, que vaul ne le reprenne pas).
    if (ancre) setTimeout(() => ancre.isConnected && ancre.focus({ preventScroll: true }), 0);
  }, []);

  const fermerSansFocus = useCallback(() => {
    setOuvert(null);
    courant.current = null;
    derniereAncre.current = null;
  }, []);

  const fermerAide = useCallback(() => {
    setAideAncre(null);
    setAideLigne(false);
    aideLigneFermee.current = true;
    noterAideVue();
  }, []);

  const ouvrir = useCallback((d: DemandeAccord) => {
    const accord = analyserAccord(d.accord);
    if (!accord) return;
    compter("cmd.chant.accord");
    // Un accord touché dans le panneau (« Ensuite ») garde l'ancre et la tonalité du panneau, sans suite lue au DOM.
    const dansPanneau = !!d.ancre?.closest("[data-accord-panneau]");
    const ancre = dansPanneau ? derniereAncre.current : d.ancre ?? null;
    derniereAncre.current = ancre;
    // Toucher un accord vaut lecture de l'aide.
    if (aideAncre || aideLigne) fermerAide();
    // Porte 2 (`data-idees-harmonie`) : pas de situation dans le chant.
    const capo = dansPanneau ? courant.current?.capo : d.capo;
    const hors = d.ancre?.closest("[data-idees-harmonie]");
    // Avec un capo, les étiquettes sont des positions : le chiffre se lit dans leur tonalité (D capo 2, étiquette C : « 1 dans C »).
    const tonaliteDuChant = dansPanneau ? courant.current?.harmonie?.tonalite : hors ? undefined : tonaliteDesEtiquettes(d.tonalite, d.capo);
    const section = !dansPanneau && d.ancre?.closest<HTMLElement>("[data-section-uids]");
    const suivant = tonaliteDuChant && section && d.ancre ? accordSuivant(section, d.ancre, accord.texte) : undefined;
    const sectionUids = section ? section.dataset.sectionUids?.split(" ").filter(Boolean) : undefined;
    const enSection = dansPanneau ? !!courant.current?.harmonie?.enSection : !!section;
    courant.current = {
      accord, ancre, capo, chant: d.chant ?? chant,
      harmonie: tonaliteDuChant
        ? {
            tonalite: tonaliteDuChant, suivant, enSection,
            ...(dansPanneau ? { sectionUids: courant.current?.harmonie?.sectionUids, ici: courant.current?.harmonie?.ici } : { sectionUids, ici: section ? d.ici : undefined }),
          }
        : undefined,
    };
    setOuvert(courant.current);
  }, [chant, aideAncre, aideLigne, fermerAide]);

  // La bulle d'aide : sous le premier accord visible, une fois les accords posés (les chants arrivent
  // par le réseau) ; si aucun n'est à l'écran, on réessaie au défilement.
  const chercherPremier = useCallback(() => {
    if (!bulle || !actif || aideDejaVue()) return;
    const visibles = [...touchables.current].filter((el) => {
      if (!el.isConnected) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 96 && r.bottom <= window.innerHeight - 140;
    });
    visibles.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (visibles[0]) setAideAncre((courante) => courante ?? visibles[0]);
  }, [bulle, actif]);

  const programmer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(chercherPremier, 500);
  }, [chercherPremier]);

  const enregistrer = useCallback((el: HTMLElement) => {
    touchables.current.add(el);
    // Aide dans le flux : dès qu'un accord touchable est posé (accords masqués, rien à toucher : pas d'aide).
    if (enLigne && !aideLigneFermee.current && !aideDejaVue()) setAideLigne(true);
    programmer();
    return () => {
      touchables.current.delete(el);
    };
  }, [programmer, enLigne]);

  useEffect(() => {
    if (!bulle || !actif || aideAncre || aideDejaVue()) return;
    programmer();
    window.addEventListener("scroll", programmer, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", programmer, true);
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [bulle, actif, aideAncre, programmer]);

  // Passage en édition : tout se referme (ajustement pendant le rendu, pas dans un effet).
  const [etaitActif, setEtaitActif] = useState(actif);
  if (etaitActif !== actif) {
    setEtaitActif(actif);
    if (!actif) {
      setOuvert(null);
      setAideAncre(null);
      setAideLigne(false);
    }
  }

  useEffect(() => {
    if (!actif || !aideLigne) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("[role=menu], [role=dialog]")) return;
      fermerAide();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [actif, aideLigne, fermerAide]);

  const valeur = useMemo<Contexte>(
    () => (actif ? { ouvrir: tonalite ? (d: DemandeAccord) => ouvrir({ tonalite, ici, ...d }) : ouvrir, fermer, fermerSansFocus, actif: true, chant, enregistrer, fermerAideLigne: aideLigne ? fermerAide : undefined, ici } : Rien),
    [actif, ouvrir, fermer, fermerSansFocus, chant, tonalite, ici, enregistrer, aideLigne, fermerAide],
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

/** L'accord qui suit vraiment dans la section de l'ancre : le prochain accord touchable différent de celui touché. */
function accordSuivant(section: Element, ancre: HTMLElement, accord: string): string | undefined {
  const tous = [...section.querySelectorAll<HTMLElement>("[data-accord-touchable]")];
  const i = tous.indexOf(ancre);
  if (i < 0) return undefined;
  return tous.slice(i + 1).map((el) => el.dataset.accordTouchable).find((a) => a && a !== accord);
}

function PanneauOuvert({ ouvert, fermer, signaler }: { ouvert: Ouvert; fermer: () => void; signaler: () => void }) {
  const ordinateur = useOrdinateur();
  const acces = useAccesHarmonie();
  const [instrument, setInstrument] = useInstrument(acces, "guitare");
  const commun = { accord: ouvert.accord, instrument, onInstrument: setInstrument, capo: ouvert.capo, harmonie: ouvert.harmonie, chant: ouvert.chant, onFermer: fermer, onSignaler: signaler };
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

type Place = { left: number; top: number; fleche: number; dessus: boolean; sansFleche?: boolean; hauteurMax: number };

function Bulle(props: Omit<React.ComponentProps<typeof PanneauAccord>, "variante"> & { onFermer: () => void; ancre: HTMLElement }) {
  const { ancre, onFermer } = props;
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const placeCourante = useRef<Place | null>(null);

  // `garder` : le contenu a grandi (« Ensuite » déplié) — le haut de la bulle reste où il était, le bas défile.
  const placer = useCallback((garder?: boolean) => {
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
    const avant = placeCourante.current;
    const fige = garder === true && avant && !avant.dessus;
    const haut = fige ? avant.top : top;
    const suivante = {
      left, top: haut, fleche: clamp(centre - left, 24, w - 24), dessus: fige ? false : dessus, sansFleche: fige ? avant.sansFleche : cale,
      hauteurMax: fige ? window.innerHeight - haut - MARGE : window.innerHeight - 2 * MARGE,
    };
    placeCourante.current = suivante;
    setPlace(suivante);
  }, [ancre, onFermer]);

  useLayoutEffect(() => {
    placer();
    const el = ref.current;
    const obs = el ? new ResizeObserver(() => placer(true)) : null;
    const plein = () => placer();
    // Le défilement interne de la bulle ne la déplace pas.
    const defilement = (e: Event) => { if (!el?.contains(e.target as Node)) placer(); };
    if (el) obs?.observe(el);
    window.addEventListener("resize", plein);
    window.addEventListener("scroll", defilement, true);
    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", plein);
      window.removeEventListener("scroll", defilement, true);
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
      className="pointer-events-auto z-50 rounded-2xl bg-card [box-shadow:var(--shadow-flottant)] text-foreground outline-none"
    >
      {place && !place.sansFleche && (
        <span
          aria-hidden
          style={{ left: place.fleche - 6 }}
          className={`absolute h-3 w-3 rotate-45 bg-card ${place.dessus ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t"} border-border`}
        />
      )}
      {/* Plus haute que l'écran : le contenu défile sur lui-même plutôt que de sortir du cadre (la flèche reste dehors). */}
      <div className="overflow-y-auto rounded-2xl" style={{ maxHeight: place?.hauteurMax ?? window.innerHeight - 2 * MARGE }}>
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
      // z-40, sous le voile des fenêtres et feuilles (z-50, src/components/ui/dialog.tsx) : en bas de l'écran
      // depuis C9, elle couvrait « Télécharger » de « Quel PDF ? », ouvert par-dessus.
      className="pointer-events-auto z-40 rounded-[12px] bg-foreground px-4 py-3 text-sm leading-snug text-background shadow-xl"
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


/** L'aide de la première fois, dans le flux (`<AccordsProvider aide="flux">`) : un bloc pleine largeur de colonne,
 *  que l'appelant pose entre les pastilles de structure du premier chant et sa première section. */
export function AideAccordsEnLigne() {
  const { t } = useTranslation();
  const ordinateur = useOrdinateur();
  const { fermerAideLigne } = useContext(AccordsContext);
  if (!fermerAideLigne) return null;
  return (
    <div role="status" data-accords-aide className="mb-2 flex items-center gap-1 rounded-[12px] bg-secondary pl-4 pr-0.5 text-sm leading-snug text-foreground print:hidden">
      <p className="min-w-0 flex-1 py-1.5">{t(ordinateur ? "accords.aideCliquer" : "accords.aideToucher")}</p>
      <button
        type="button"
        onClick={fermerAideLigne}
        aria-label={t("accords.aideOk")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
