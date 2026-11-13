import { useState, useEffect } from "react";

/** Barre d'outils rappelée d'un tap sur la partition (tablette au pupitre :
 *  éviter de devoir remonter la page pour transposer / zoomer) ; elle repart
 *  dès que la page a défilé de plus de 60 px. */
export function useBarreRappelee() {
  const [barPinned, setBarPinned] = useState(false);
  useEffect(() => {
    if (!barPinned) return;
    const y0 = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - y0) > 60) setBarPinned(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [barPinned]);
  return { barPinned, setBarPinned };
}
