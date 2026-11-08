"use client";

import { createContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Compteur publié par le conteneur d'un chant à chaque changement de largeur : les lignes (ChordLine) recalculent
 *  leur coupure sans avoir chacune leur ResizeObserver (lot CV). `null` hors d'un conteneur : la ligne observe seule. */
export const LargeurCoupureContext = createContext<number | null>(null);

/** Vrai dans les copies de mesure du mode louange : seules leurs lignes publient le signal de coupure (lot CV-3). */
export const CoupureMesureContext = createContext(false);

export function ConteneurCoupure({ className, children, mesure = false }: { className?: string; children: ReactNode; mesure?: boolean }) {
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
        <div ref={ref} className={className}>
          {children}
        </div>
      </CoupureMesureContext.Provider>
    </LargeurCoupureContext.Provider>
  );
}

/** Bord droit (px écran) jusqu'où une ligne peut déborder dans la marge : celui de l'élément `data-bord-coupure` le plus
 *  proche (la page entière, à l'écran du mode louange comme dans ses copies de mesure : même place en unités non mises
 *  à l'échelle), sinon le plus étroit de la fenêtre et du cadre de zoom de la page du chant. */
export function bordCoupure(el: Element): number {
  const page = el.closest("[data-bord-coupure]");
  if (page) return page.getBoundingClientRect().right;
  return Math.min(document.documentElement.clientWidth, el.closest(".song-zoom")?.getBoundingClientRect().right ?? Infinity);
}
