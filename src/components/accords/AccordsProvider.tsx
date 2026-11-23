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
  /** AL-1 : section d'un accord du scan 简谱 (sans `data-section-uids` au DOM), posée par l'appelant. */
  sectionUids?: string[];
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
  /** AL-2 : l'`ici` joint aux demandes d'accord ; absent de `ici` quand les noms de section restent inertes (mode louange, réglage éteint). */
  iciAccords?: IciDuChant;
  /** Réglage « Idées d'harmonie » éteint (pages de lecture) : `ici` n'est plus transmis, seules ses sections restent (`reperes`). */
  ideesEteintes?: boolean;
  /** Sections du chant quand le réglage est éteint : les pastilles du scan 简谱 restent des repères, sans rien ouvrir. */
  reperes?: ChordProSection[];
};

const Rien: Contexte = { ouvrir: () => {}, fermer: () => {}, fermerSansFocus: () => {}, actif: false, enregistrer: () => () => {} };
const AccordsContext = createContext<Contexte>(Rien);

/** Joint la tonalité affichée à chaque demande qui descend du fournisseur (H5-1 ; H5-2 y ajoutera les passages). */
function avecTonalite(parent: Contexte, tonalite?: string, ici?: IciDuChant, chant?: Chant): Contexte {
  return tonalite ? { ...parent, ouvrir: (d) => parent.ouvrir({ tonalite, ici, chant, ...d }) } : parent;
}

export function useOuvrirAccord(): Contexte {
  return useContext(AccordsContext);
}

/** JV-5a : l'`ici` du fournisseur le plus proche (le nom d'une section ouvre la porte 2 par le même chemin que « Ici »). */
export function useIciDuChant(): IciDuChant | undefined {
  return useContext(AccordsContext).ici;
}

/** AL-2 : de quoi situer un accord dans ses sections, même quand les noms de section ne sont pas touchables. */
export function useIciDesAccords(): IciDuChant | undefined {
  const c = useContext(AccordsContext);
  return c.iciAccords ?? c.ici;
}

/** Les sections du chant quand « Idées d'harmonie » est éteint : de quoi garder les repères du scan, inertes. */
export function useReperesDuScan(): ChordProSection[] | undefined {
  return useContext(AccordsContext).reperes;
}

/** Coupe les accords touchables de tout ce qui est dessous (édition d'une ligne, mode louange). `actif` à faux : laisse
 *  passer le fournisseur du dessus sans changer l'arbre (P1 : une ligne garde sa place en entrant dans le Crayon). */
export function AccordsInactifs({ children, actif = true }: { children: React.ReactNode; actif?: boolean }) {
  const parent = useContext(AccordsContext);
  return <AccordsContext.Provider value={actif ? Rien : parent}>{children}</AccordsContext.Provider>;
}

/** Dit de quel chant sont les accords dessous (une setlist en porte plusieurs). */
export function ChantDesAccords({ chant, tonalite, ici, sansNoms, children }: { chant: Chant; tonalite?: string; ici?: IciDuChant; /** Les noms de section ne lisent pas `ici` (il ne sert qu'au panneau). */ sansNoms?: boolean; children: React.ReactNode }) {
  const parent = useContext(AccordsContext);
  const valeur = useMemo(() => {
    const vu = parent.ideesEteintes ? undefined : ici;
    return avecTonalite({ ...parent, chant, ici: sansNoms ? undefined : vu, iciAccords: vu, reperes: parent.ideesEteintes ? ici?.sections : undefined }, tonalite, vu, chant);
  }, [parent, chant, tonalite, ici, sansNoms]);
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
  ici: iciRecu,
  ideesEteintes = false,
  aide,
  louange = false,
}: {
  children: React.ReactNode;
  /** Faux : le fournisseur reste monté mais les accords ne sont plus touchables (setlist en édition). */
  actif?: boolean;
  chant?: Chant;
  /** Tonalité affichée du chant lu : le panneau situe l'accord touché dans la partition (page chant). */
  tonalite?: string;
  /** H5-2 : de quoi ouvrir la porte 2 au passage de l'accord touché (page chant). */
  ici?: IciDuChant;
  /** Réglage « Idées d'harmonie » éteint : `ici` ne sert plus qu'aux repères du scan (pastilles inertes). */
  ideesEteintes?: boolean;
  /** `"flux"` : l'aide de la première fois (une seule par appareil) se dessine là où l'on pose `AideAccordsEnLigne`. */
  aide?: "flux";
  /** AL-2 : posé par-dessus le mode louange (z-[9999]) : bulle et feuille passent au-dessus. */
  louange?: boolean;
}) {
  const ici = ideesEteintes ? undefined : iciRecu;
  const reperes = ideesEteintes ? iciRecu?.sections : undefined;
  const [ouvert, setOuvert] = useState<Ouvert | null>(null);
  const enLigne = aide === "flux";
  const [aideLigne, setAideLigne] = useState(false);
  const aideLigneFermee = useRef(false);
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
    if (aideLigne) fermerAide();
    // Porte 2 (`data-idees-harmonie`) : pas de situation dans le chant.
    const capo = dansPanneau ? courant.current?.capo : d.capo;
    const hors = d.ancre?.closest("[data-idees-harmonie]");
    // Avec un capo, les étiquettes sont des positions : le chiffre se lit dans leur tonalité (D capo 2, étiquette C : « 1 dans C »).
    const tonaliteDuChant = dansPanneau ? courant.current?.harmonie?.tonalite : hors ? undefined : tonaliteDesEtiquettes(d.tonalite, d.capo);
    const section = !dansPanneau && d.ancre?.closest<HTMLElement>("[data-section-uids]");
    const suivant = tonaliteDuChant && section && d.ancre ? accordSuivant(section, d.ancre, accord.texte) : undefined;
    const sectionUids = section ? section.dataset.sectionUids?.split(" ").filter(Boolean) : d.sectionUids;
    const enSection = dansPanneau ? !!courant.current?.harmonie?.enSection : !!section;
    courant.current = {
      accord, ancre, capo, chant: d.chant ?? chant,
      harmonie: tonaliteDuChant
        ? {
            tonalite: tonaliteDuChant, suivant, enSection,
            ...(dansPanneau ? { sectionUids: courant.current?.harmonie?.sectionUids, ici: courant.current?.harmonie?.ici } : { sectionUids, ici: section || d.sectionUids?.length ? d.ici : undefined }),
          }
        : undefined,
    };
    setOuvert(courant.current);
  }, [chant, aideLigne, fermerAide]);

  const enregistrer = useCallback(() => {
    // Aide dans le flux : dès qu'un accord touchable est posé (accords masqués, rien à toucher : pas d'aide).
    if (enLigne && !aideLigneFermee.current && !aideDejaVue()) setAideLigne(true);
    return () => {};
  }, [enLigne]);

  // Passage en édition : tout se referme (ajustement pendant le rendu, pas dans un effet).
  const [etaitActif, setEtaitActif] = useState(actif);
  if (etaitActif !== actif) {
    setEtaitActif(actif);
    if (!actif) {
      setOuvert(null);
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
    () => (actif ? { ouvrir: tonalite ? (d: DemandeAccord) => ouvrir({ tonalite, ici, ...d }) : ouvrir, fermer, fermerSansFocus, actif: true, chant, enregistrer, fermerAideLigne: aideLigne ? fermerAide : undefined, ici, ideesEteintes, reperes } : Rien),
    [actif, ouvrir, fermer, fermerSansFocus, chant, tonalite, ici, ideesEteintes, reperes, enregistrer, aideLigne, fermerAide],
  );

  return (
    <AccordsContext.Provider value={valeur}>
      {children}
      {actif && ouvert && (
        <PanneauOuvert
          ouvert={ouvert}
          louange={louange}
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

// B4 ter : aucun autre accord visible du même conteneur, sur la même rangée, n'a son bord gauche à plus de 8 px à gauche du sien.
function premierDeLigne(ancre: HTMLElement): boolean {
  const section = ancre.closest("[data-section-uids]") ?? document;
  const r = ancre.getBoundingClientRect();
  return ![...section.querySelectorAll<HTMLElement>("[data-accord-touchable]")].some((el) => {
    if (el === ancre) return false;
    const o = el.getBoundingClientRect();
    return o.width > 0 && Math.abs(o.top + o.height / 2 - (r.top + r.height / 2)) < r.height / 2 && o.left < r.left - 8;
  });
}

function PanneauOuvert({ ouvert, louange, fermer, signaler }: { ouvert: Ouvert; louange: boolean; fermer: () => void; signaler: () => void }) {
  const ordinateur = useOrdinateur();
  const acces = useAccesHarmonie();
  const [instrument, setInstrument] = useInstrument(acces, "guitare");
  const commun = { accord: ouvert.accord, instrument, onInstrument: setInstrument, capo: ouvert.capo, harmonie: ouvert.harmonie, chant: ouvert.chant, onFermer: fermer, onSignaler: signaler };
  if (ordinateur && ouvert.ancre) return <Bulle ancre={ouvert.ancre} louange={louange} {...commun} />;
  return <Feuille louange={louange} {...commun} />;
}

function Feuille({ louange, ...props }: Omit<React.ComponentProps<typeof PanneauAccord>, "variante"> & { onFermer: () => void; louange?: boolean }) {
  const { t } = useTranslation();
  useStandaloneScrollLock(true);
  return (
    <Drawer open onOpenChange={(o) => !o && props.onFermer()}>
      <DrawerContent className={`max-h-[88vh] md:mx-auto md:max-w-xl${louange ? " z-[10000]" : ""}`} overlayClassName={louange ? "z-[10000]" : undefined} data-accord-panneau="feuille">
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

type Place = { left: number; top: number; fleche: number; dessus: boolean; sansFleche?: boolean; hauteurMax: number; cote?: "gauche" | "droite" };

function Bulle({ louange, ...props }: Omit<React.ComponentProps<typeof PanneauAccord>, "variante"> & { onFermer: () => void; ancre: HTMLElement; louange?: boolean }) {
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
    // B4 ter : côté libre, jamais par-dessus l'accord : à gauche pour le premier accord d'une ligne, sinon à droite ; `cale` si aucun côté ne tient.
    const tientDroite = r.right + ECART + w <= window.innerWidth - MARGE;
    const tientGauche = r.left - ECART - w >= MARGE;
    const avant = placeCourante.current;
    const fige = garder === true && avant && !avant.dessus;
    const cote: Place["cote"] = fige && avant.cote ? avant.cote
      : !cale ? undefined
      : tientGauche && premierDeLigne(ancre) ? "gauche"
      : tientDroite ? "droite" : tientGauche ? "gauche" : undefined;
    const top = cote ? clamp(r.top + r.height / 2 - h / 2, MARGE, Math.max(MARGE, window.innerHeight - h - MARGE))
      : dessus ? r.top - ECART - h : cale ? clamp(r.bottom + ECART, MARGE, Math.max(MARGE, window.innerHeight - h - MARGE)) : r.bottom + ECART;
    const haut = fige ? avant.top : top;
    const suivante: Place = {
      left: cote === "droite" ? r.right + ECART : cote === "gauche" ? r.left - ECART - w : left,
      top: haut, fleche: clamp(centre - left, 24, w - 24), dessus: fige ? false : dessus, sansFleche: fige ? avant.sansFleche : cale, cote,
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
      className={`pointer-events-auto ${louange ? "z-[10000]" : "z-50"} rounded-2xl bg-card [box-shadow:var(--shadow-flottant)] text-foreground outline-none`}
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
