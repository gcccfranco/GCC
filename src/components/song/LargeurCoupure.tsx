"use client";

import { createContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Compteur publié par le conteneur d'un chant à chaque changement de largeur : les lignes (ChordLine) recalculent
 *  leur coupure sans avoir chacune leur ResizeObserver (lot CV). `null` hors d'un conteneur : la ligne observe seule. */
export const LargeurCoupureContext = createContext<number | null>(null);

/** Vrai dans les copies de mesure du mode louange : seules leurs lignes publient le signal de coupure (lot CV-3). */
export const CoupureMesureContext = createContext(false);

export function ConteneurCoupure({ className, children, mesure = false, disposition, style }: { className?: string; children: ReactNode; mesure?: boolean; disposition?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let largeur = el.clientWidth;
    const obs = new ResizeObserver(() => {
      if (el.clientWidth === largeur) return;
      largeur = el.clientWidth;
      setVersion((v) => v + 1);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <LargeurCoupureContext.Provider value={version}>
      <CoupureMesureContext.Provider value={mesure}>
        <div ref={ref} className={className} data-disposition={disposition} style={style}>
          {children}
        </div>
      </CoupureMesureContext.Provider>
    </LargeurCoupureContext.Provider>
  );
}

/** P1 (audit de performance du 21/11/2026) : les lignes sont mémoïsées, un changement qui ne touche que leur propre
 *  largeur (cadre du Crayon, disposition) sans changer celle du conteneur ne les re-rend plus. Un seul observateur
 *  pour toutes les lignes prévient la ligne dont la largeur change, à l'image suivante (après la remesure que le
 *  conteneur a pu déjà déclencher : la ligne compare avec sa dernière mesure) ; l'observation du montage est ignorée. */
const lignesObservees = new WeakMap<Element, { vue: boolean; rappel: (largeur: number) => void }>();
let observateurLignes: ResizeObserver | null = null;
export function observerLargeurLigne(el: Element, rappel: (largeur: number) => void): () => void {
  observateurLignes ??= new ResizeObserver((entrees) => {
    // Un seul rappel d'image pour toutes les lignes : leurs mesures partent ensemble dans la file commune (R6).
    const aPrevenir: (() => void)[] = [];
    for (const e of entrees) {
      const l = lignesObservees.get(e.target);
      if (!l) continue;
      const largeur = e.contentRect.width;
      if (l.vue) aPrevenir.push(() => lignesObservees.get(e.target) === l && l.rappel(largeur));
      l.vue = true;
    }
    if (aPrevenir.length) requestAnimationFrame(() => aPrevenir.forEach((f) => f()));
  });
  lignesObservees.set(el, { vue: false, rappel });
  observateurLignes.observe(el);
  return () => {
    observateurLignes?.unobserve(el);
    lignesObservees.delete(el);
  };
}

/** Bord droit (px écran) jusqu'où une ligne peut déborder dans la marge : celui de l'élément `data-bord-coupure` le plus
 *  proche (la page entière, à l'écran du mode louange comme dans ses copies de mesure : même place en unités non mises
 *  à l'échelle), sinon le plus étroit de la fenêtre et du cadre de zoom de la page du chant. */
export function bordCoupure(el: Element): number {
  const page = el.closest("[data-bord-coupure]");
  if (page) return page.getBoundingClientRect().right;
  return Math.min(document.documentElement.clientWidth, el.closest(".song-zoom")?.getBoundingClientRect().right ?? Infinity);
}
