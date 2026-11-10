// Taille du texte à laquelle un chant a été annoté (docs/spec-mode-louange-forscore.md, lot L5) :
// mémorisée par compte, par setlist et par chant, sur cet appareil (les traits sont par setlist). L'ancienne clé sans compte
// sert de valeur de départ au seul compte qui a hérité des réglages d'appareil (marque `perf-role-migre`). La clé de page garde `z<taille>` ; cette valeur sert à
// figer la taille pendant l'annotation et à prévenir quand on lit à une autre taille.
// Stockage en try/catch : indisponible = aucune taille mémorisée.
import { MAX_FONT_SCALE, MIN_FONT_SCALE } from "@/lib/fontScalePref";
import { estPremierCompte } from "./roleCompte";

const cleAncienne = (setlistId: string, slug: string) => `perf-annot-scale-${setlistId}-${slug}`;
const cle = (uid: string, setlistId: string, slug: string) => `perf-annot-scale-${uid}-${setlistId}-${slug}`;

/** Taille du texte à laquelle ce compte a annoté ce chant sur cet appareil, ou null (sans compte : rien). */
export function getTailleAnnotee(uid: string | null, setlistId: string, slug: string): number | null {
  if (!uid) return null;
  try {
    const brut = localStorage.getItem(cle(uid, setlistId, slug))
      ?? (estPremierCompte(uid) ? localStorage.getItem(cleAncienne(setlistId, slug)) : null);
    if (brut === null) return null;
    const v = parseFloat(brut);
    return v >= MIN_FONT_SCALE && v <= MAX_FONT_SCALE ? v : null;
  } catch {
    return null;
  }
}

export function setTailleAnnotee(uid: string | null, setlistId: string, slug: string, v: number) {
  if (!uid) return;
  if (!(v >= MIN_FONT_SCALE && v <= MAX_FONT_SCALE)) return;
  try { localStorage.setItem(cle(uid, setlistId, slug), String(v)); } catch { /* stockage indisponible */ }
}
