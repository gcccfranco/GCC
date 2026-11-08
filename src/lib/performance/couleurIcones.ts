// Couleur des icônes du mode louange (FS-A, décisions 12 et 19) — par appareil (localStorage).
// Le choix s'applique aux icônes de la barre et à la poignée du curseur, jamais à la page : la
// couleur affichée est le choix corrigé par `garderContraste` contre le fond de la barre.
const KEY = "perf-couleur-icones";

export const TEINTES = [
  { id: "bleu", hex: "#3f63cf" },
  { id: "encre", hex: "#1c1c1e" },
  { id: "vert", hex: "#1f7a5c" },
  { id: "violet", hex: "#6d4bc3" },
  { id: "framboise", hex: "#c2185b" },
  { id: "gris", hex: "#636872" },
] as const;

export const COULEUR_DEFAUT = TEINTES[0].hex;
export const FOND_CLAIR = "#ffffff";
export const FOND_SOMBRE = "#000000";
/** Contraste visé contre le fond de la barre (WCAG 1.4.11, composants d'interface). */
export const CONTRASTE_MIN = 3;

const HEX = /^#[0-9a-f]{6}$/;

export function normaliserHex(v: string): string | null {
  let h = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return HEX.test(h) ? h : null;
}

export function getCouleurIcones(): string {
  try {
    return normaliserHex(localStorage.getItem(KEY) ?? "") ?? COULEUR_DEFAUT;
  } catch {
    return COULEUR_DEFAUT;
  }
}

export function setCouleurIcones(hex: string) {
  const h = normaliserHex(hex);
  if (!h) return;
  try { localStorage.setItem(KEY, h); } catch { /* ignore */ }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** [teinte 0-359, saturation 0-100, luminosité 0-100] */
export function hexVersHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(Math.round(h * 60) + 360) % 360, s * 100, l * 100];
}

export function hslVersHex(h: number, s: number, l: number): string {
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Éclaircit (fond sombre) ou assombrit (fond clair) la couleur, en HSL, jusqu'à un contraste
 *  d'au moins 3:1 contre le fond. Une couleur déjà assez contrastée ne bouge pas. */
export function garderContraste(hex: string, fond: string): string {
  const base = normaliserHex(hex) ?? COULEUR_DEFAUT;
  if (contraste(base, fond) >= CONTRASTE_MIN) return base;
  const [h, s, l] = hexVersHsl(base);
  const pas = luminance(fond) < 0.5 ? 1 : -1;
  for (let x = l + pas; x >= 0 && x <= 100; x += pas) {
    const c = hslVersHex(h, s, x);
    if (contraste(c, fond) >= CONTRASTE_MIN) return c;
  }
  return pas > 0 ? "#ffffff" : "#000000";
}
