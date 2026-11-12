"use client";

// Porte 2 en colonne (docs/spec-harmonie-accords.md, H4-2) : grand écran = tablette en paysage et ordinateur.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const GRAND = "(min-width: 1024px)";
const CLE = "gcc-harmonie-colonne";

function suivre(changement: () => void) {
  const m = window.matchMedia(GRAND);
  m.addEventListener("change", changement);
  return () => m.removeEventListener("change", changement);
}

/** Vrai dès 1 024 px de fenêtre ; faux côté serveur. */
export function useGrandEcranHarmonie(): boolean {
  return useSyncExternalStore(suivre, () => window.matchMedia(GRAND).matches, () => false);
}

/** La zone de lecture (partition + colonne) mesure-t-elle au moins `seuil` px (400 de colonne, 24 d'écart, 400 de partition) ? Sinon la colonne écraserait la
 *  partition (deux volets, rail de la setlist) : c'est la feuille, comme au téléphone. */
export function useZoneAssezLarge(seuil = 824) {
  const [zone, setZone] = useState<HTMLElement | null>(null);
  const [assez, setAssez] = useState(false);
  useEffect(() => {
    if (!zone) { setAssez(false); return; }
    const ro = new ResizeObserver(([e]) => setAssez(e.contentRect.width >= seuil));
    ro.observe(zone);
    return () => ro.disconnect();
  }, [zone, seuil]);
  return [setZone, assez] as const;
}

/** Colonne ouverte ou fermée, mémorisé par appareil ; lu après le montage (pas d'écart d'hydratation). */
export function useColonneHarmonie(): [boolean, (ouverte: boolean) => void] {
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(CLE) === "1") setOuverte(true); } catch { /* stockage indisponible : fermée */ }
  }, []);
  const poser = useCallback((o: boolean) => {
    setOuverte(o);
    try { localStorage.setItem(CLE, o ? "1" : "0"); } catch { /* ignore */ }
  }, []);
  return [ouverte, poser];
}
