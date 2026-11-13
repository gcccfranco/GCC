import { useState, useEffect } from "react";
import { getFontScalePref, setFontScalePref, MIN_FONT_SCALE, MAX_FONT_SCALE } from "@/lib/fontScalePref";

/** Taille de texte (zoom, persistée) — chargée après montage pour éviter
 *  un écart d'hydratation (le composant est rendu côté serveur). */
export function useTailleTexte() {
  const [fontScale, setFontScale] = useState(1);
  // Même taille que le mode louange (fontScalePref).
  useEffect(() => setFontScale(getFontScalePref()), []);
  const changeFontScale = (delta: number) => {
    setFontScale((s) => {
      const next = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round((s + delta) * 10) / 10));
      setFontScalePref(next);
      return next;
    });
  };
  return { fontScale, changeFontScale };
}
