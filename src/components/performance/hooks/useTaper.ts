import { useRef } from "react";

const PAUSE_TAPER_MS = 2000;

/** Taper le tempo (bouton du panneau et touche T, une seule série) : moyenne des 4 derniers intervalles (5 appuis au plus),
 *  remise à zéro après 2 s, appliqué dès 2 appuis. */
export function useTaper(fixerTempo: (n: number) => void) {
  const appuis = useRef<number[]>([]);
  return () => {
    const maintenant = performance.now();
    const a = appuis.current;
    if (a.length && maintenant - a[a.length - 1] > PAUSE_TAPER_MS) a.length = 0;
    a.push(maintenant);
    if (a.length > 5) a.shift();
    if (a.length >= 2) fixerTempo(60000 / ((a[a.length - 1] - a[0]) / (a.length - 1)));
  };
}
