// Taille du texte — une seule par appareil (localStorage), pour la page du
// chant et le mode louange (docs/spec-mode-louange.md). La clé du mode louange
// est gardée : les annotations y sont liées. Sans elle, la taille déjà choisie
// sur la page du chant (song-font-scale) est reprise.
const KEY = "perf-font-scale";
const LEGACY_KEY = "song-font-scale";

export const MIN_FONT_SCALE = 0.8;
export const MAX_FONT_SCALE = 1.5;

export function getFontScalePref(): number {
  try {
    const v = parseFloat(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? "1");
    return v >= MIN_FONT_SCALE && v <= MAX_FONT_SCALE ? v : 1;
  } catch {
    return 1;
  }
}

export function setFontScalePref(v: number) {
  try { localStorage.setItem(KEY, String(v)); } catch { /* stockage indisponible */ }
}
