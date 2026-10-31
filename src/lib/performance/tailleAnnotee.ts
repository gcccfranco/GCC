// Taille du texte à laquelle un chant a été annoté (docs/spec-mode-louange-forscore.md, lot L5) :
// mémorisée par setlist, par chant et par appareil (les traits sont par setlist). La clé de page garde `z<taille>` ; cette valeur sert à
// figer la taille pendant l'annotation et à prévenir quand on lit à une autre taille.
// Stockage en try/catch : indisponible = aucune taille mémorisée.
import { MAX_FONT_SCALE, MIN_FONT_SCALE } from "@/lib/fontScalePref";

const cle = (setlistId: string, slug: string) => `perf-annot-scale-${setlistId}-${slug}`;

/** Taille du texte à laquelle ce chant a été annoté sur cet appareil, ou null. */
export function getTailleAnnotee(setlistId: string, slug: string): number | null {
  try {
    const brut = localStorage.getItem(cle(setlistId, slug));
    if (brut === null) return null;
    const v = parseFloat(brut);
    return v >= MIN_FONT_SCALE && v <= MAX_FONT_SCALE ? v : null;
  } catch {
    return null;
  }
}

export function setTailleAnnotee(setlistId: string, slug: string, v: number) {
  if (!(v >= MIN_FONT_SCALE && v <= MAX_FONT_SCALE)) return;
  try { localStorage.setItem(cle(setlistId, slug), String(v)); } catch { /* stockage indisponible */ }
}
