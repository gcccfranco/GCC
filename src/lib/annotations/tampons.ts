// Texte, tampons et formes du Crayon (AN-5) : le menu et la géométrie des signes, sans DOM.
// Les polylignes sont des points écran ; l'appelant en fait des traits `pen` (épaisseur et couleur du préréglage actif).

import type { GenreTampon } from "@/types/partition";

type Point = [number, number];

export type EntreeSigne = {
  cle: string;
  groupe: "texte" | "tampons" | "formes";
  /** `texte` : champ de saisie ; `stamp` : enregistré par genre ; `pen` : traits ordinaires. */
  nature: "texte" | "stamp" | "pen";
  genre?: GenreTampon;
  /** Forme tracée du début à la fin du glisser (sinon un toucher pose le signe). */
  glisser?: boolean;
};

/** Ordre du menu. Le sens affiché sous chaque signe : `performance.signes.<cle>`. */
export const SIGNES: EntreeSigne[] = [
  { cle: "texte", groupe: "texte", nature: "texte" },
  { cle: "p", groupe: "tampons", nature: "stamp", genre: "p" },
  { cle: "mf", groupe: "tampons", nature: "stamp", genre: "mf" },
  { cle: "f", groupe: "tampons", nature: "stamp", genre: "f" },
  { cle: "ff", groupe: "tampons", nature: "stamp", genre: "ff" },
  { cle: "crescendo", groupe: "tampons", nature: "pen" },
  { cle: "decrescendo", groupe: "tampons", nature: "pen" },
  { cle: "respiration", groupe: "tampons", nature: "pen" },
  { cle: "orgue", groupe: "tampons", nature: "pen" },
  { cle: "x2", groupe: "tampons", nature: "stamp", genre: "x2" },
  { cle: "seul", groupe: "tampons", nature: "stamp", genre: "seul" },
  { cle: "tutti", groupe: "tampons", nature: "stamp", genre: "tutti" },
  { cle: "fleche", groupe: "formes", nature: "pen", glisser: true },
  { cle: "cercle", groupe: "formes", nature: "pen", glisser: true },
  { cle: "trait", groupe: "formes", nature: "pen", glisser: true },
];

/** Tailles à la pose, en em de la ligne. */
export const TAILLE_NUANCE = 1.6;
export const LONGUEUR_SOUFFLET = 3;

// Glyphes Noto Music (sous-ensemble de scripts/build-fonts.py, couverture contrôlée par `npm run validate`).
const P = "\u{1D18F}";
const M = "\u{1D190}";
const F = "\u{1D191}";
export const CODES_MUSIQUE = [0x1d18f, 0x1d190, 0x1d191, 0x1d192, 0x1d193, 0x1d110, 0x1d112];

/** Nuances en glyphes de Noto Music ; les autres en texte ordinaire. */
export const glyphesTampon = (g: GenreTampon) => g === "p" || g === "mf" || g === "f" || g === "ff";

/** Ce que le tampon affiche : seul et tutti suivent la langue (on enregistre le genre). */
export function texteTampon(g: GenreTampon, langue: string): string {
  const zh = langue.startsWith("zh");
  return { p: P, mf: M + F, f: F, ff: F + F, x2: "×2", seul: zh ? "独" : "seul", tutti: zh ? "齐" : "tutti" }[g];
}

/** Soufflet « < » (crescendo) ou « > » (decrescendo) centré en (x, y), `u` = em en px ; une polyligne. */
export function soufflet(sens: "<" | ">", [x, y]: Point, u: number): Point[][] {
  const l = LONGUEUR_SOUFFLET * u / 2;
  const h = l / 3;
  return [sens === "<" ? [[x + l, y - h], [x - l, y], [x + l, y + h]] : [[x - l, y - h], [x + l, y], [x - l, y + h]]];
}

/** Respiration : une virgule au-dessus de la portée. */
export function respiration([x, y]: Point, u: number): Point[][] {
  return [[[x + 0.1 * u, y - 0.7 * u], [x + 0.25 * u, y - 0.4 * u], [x + 0.1 * u, y], [x - 0.15 * u, y + 0.45 * u]]];
}

/** Point d'orgue : un arc et un point dessous. */
export function pointOrgue([x, y]: Point, u: number): Point[][] {
  const arc: Point[] = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / 12;
    return [x + u * Math.cos(a), y + 0.3 * u + 0.8 * u * Math.sin(a)];
  });
  return [arc, [[x, y + 0.1 * u]]];
}

/** Flèche de `a` vers `b` : la tige, puis la pointe. */
export function fleche(a: Point, b: Point): Point[][] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy);
  if (!len) return [[a, b]];
  const h = Math.min(len * 0.4, 16);
  const pointe = (s: number): Point => {
    const t = Math.atan2(dy, dx) + Math.PI + s * 0.45;
    return [b[0] + h * Math.cos(t), b[1] + h * Math.sin(t)];
  };
  return [[a, b], [pointe(1), b, pointe(-1)]];
}

/** Ellipse inscrite dans le rectangle de `a` à `b`, polyligne fermée. */
export function cercle(a: Point, b: Point): Point[][] {
  const [cx, cy, rx, ry] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2];
  return [Array.from({ length: 33 }, (_, i) => [cx + rx * Math.cos((i * Math.PI) / 16), cy + ry * Math.sin((i * Math.PI) / 16)] as Point)];
}

export const trait = (a: Point, b: Point): Point[][] => [[a, b]];

/** Polylignes d'un signe `pen` : posé au toucher (`u` = em en px) ou tracé de `a` à `b`. */
export function polylignes(cle: string, a: Point, b: Point, u: number): Point[][] {
  switch (cle) {
    case "crescendo": return soufflet("<", a, u);
    case "decrescendo": return soufflet(">", a, u);
    case "respiration": return respiration(a, u);
    case "orgue": return pointOrgue(a, u);
    case "fleche": return fleche(a, b);
    case "cercle": return cercle(a, b);
    default: return trait(a, b);
  }
}
