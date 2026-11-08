"use client";

import { createContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Compteur publié par le conteneur d'un chant à chaque changement de largeur : les lignes (ChordLine) recalculent
 *  leur coupure sans avoir chacune leur ResizeObserver (lot CV). `null` hors d'un conteneur : la ligne observe seule. */
export const LargeurCoupureContext = createContext<number | null>(null);

export function ConteneurCoupure({ className, children }: { className?: string; children: ReactNode }) {
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
      <div ref={ref} className={className}>
        {children}
      </div>
    </LargeurCoupureContext.Provider>
  );
}
