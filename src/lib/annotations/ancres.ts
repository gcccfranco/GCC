// Traits accrochés au texte (docs/spec-ma-partition.md, § Traits) : calcul pur, sans DOM.
// Un tracé écran (px) est découpé par ligne, puis exprimé dans l'unité de la ligne : em pour un texte, largeur de
// l'image pour un scan 简谱. `Repere` = coin haut-gauche (px écran) du caractère ou de l'image, et l'unité en px écran.

import type { ElementTrait, Trait } from "@/types/partition";
import type { Stroke } from "./strokes";

export type Rect = { left: number; top: number; right: number; bottom: number };
export type Repere = { x: number; y: number; unite: number };
type Point = [number, number];

/** Découpe un tracé écran par ligne : chaque point va à la ligne qui le contient verticalement (à défaut, la plus
 *  proche ; à égalité verticale, la plus proche à l'horizontale : colonnes). Au changement de ligne, le point de
 *  jonction est repris dans les deux morceaux pour que le trait reste continu. */
export function decouper(points: Point[], lignes: Rect[]): { ligne: number; points: Point[] }[] {
  if (!lignes.length) return [];
  const dist = (v: number, a: number, b: number) => (v < a ? a - v : v > b ? v - b : 0);
  const choisir = ([x, y]: Point) => {
    let best = 0;
    let bd: [number, number] = [Infinity, Infinity];
    lignes.forEach((r, i) => {
      const d: [number, number] = [dist(y, r.top, r.bottom), dist(x, r.left, r.right)];
      if (d[0] < bd[0] || (d[0] === bd[0] && d[1] < bd[1])) { best = i; bd = d; }
    });
    return best;
  };
  const out: { ligne: number; points: Point[] }[] = [];
  for (const p of points) {
    const l = choisir(p);
    const dernier = out[out.length - 1];
    if (dernier && dernier.ligne === l) dernier.points.push(p);
    else {
      if (dernier) dernier.points.push(p);
      out.push({ ligne: l, points: [p] });
    }
  }
  return out;
}

const arrondir = (n: number, d: number) => Math.round(n * d) / d;

/** Écran → ancré. 2 décimales en em (texte) ; 4 en fraction de largeur (scan), où une unité vaut tout l'écran. */
export function ancrer(s: Pick<Stroke, "tool" | "size" | "color" | "points" | "alpha">, ancre: Trait["ancre"], r: Repere): Trait {
  const d = "scan" in ancre ? 1e4 : 1e2;
  return {
    ancre,
    outil: s.tool,
    couleur: s.color,
    epaisseur: arrondir(s.size / r.unite, d),
    ...(s.alpha !== undefined && { alpha: s.alpha }),
    points: s.points.map(([x, y]) => [arrondir((x - r.x) / r.unite, d), arrondir((y - r.y) / r.unite, d)]),
  };
}

/** Ancré → écran. */
export function projeter(t: Trait, r: Repere): Stroke {
  return {
    tool: t.outil,
    size: t.epaisseur * r.unite,
    color: t.couleur,
    alpha: t.alpha,
    points: t.points.map(([x, y]) => [r.x + x * r.unite, r.y + y * r.unite]),
  };
}

const ancreConnue = (a: Record<string, unknown> | null | undefined): boolean => !!a && (a.scan === true ? typeof a.image === "number" : typeof a.section === "string" && typeof a.ligne === "number" && typeof a.car === "number");

/** Un vrai trait (ancre, outil et points en paires connus) ; les autres éléments de la liste ne font que passer. */
export const estTrait = (e: ElementTrait): e is Trait => {
  const t = e as Trait;
  return ancreConnue(t.ancre) && (t.outil === "pen" || t.outil === "highlighter") && typeof t.couleur === "string" && typeof t.epaisseur === "number" && Array.isArray(t.points) && t.points.every((p) => Array.isArray(p) && p.length === 2);
};

/** Firestore refuse un tableau directement dans un tableau : à l'écriture, `points` d'un vrai trait devient [x0, y0, x1, y1, …] ;
 *  un élément inconnu repart tel quel. */
export function traitsAplatis(traits: ElementTrait[]): unknown[] {
  return traits.map((t) => (estTrait(t) ? { ...t, points: t.points.flat() } : t));
}

/** Relecture : accepte les points à plat (Firestore) ou en paires. Un trait connu garde ses champs inconnus ; tout autre
 *  objet (ancre ou outil inconnus, ex. un tampon, ou trait abîmé) est gardé tel quel et réécrit ; le reste est ignoré. */
export function traitsValides(brut: unknown): ElementTrait[] {
  if (!Array.isArray(brut)) return [];
  const out: ElementTrait[] = [];
  for (const t of brut) {
    if (!t || typeof t !== "object" || Array.isArray(t)) continue;
    let points: Point[] | null = null;
    if (ancreConnue(t.ancre) && (t.outil === "pen" || t.outil === "highlighter") && typeof t.couleur === "string" && typeof t.epaisseur === "number" && Array.isArray(t.points)) {
      const pts: unknown[] = t.points;
      if (pts.every((n) => typeof n === "number") && pts.length % 2 === 0) {
        points = Array.from({ length: pts.length / 2 }, (_, i) => [pts[2 * i], pts[2 * i + 1]] as Point);
      } else if (pts.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number"))) points = pts as Point[];
    }
    out.push(points ? { ...t, points } : t);
  }
  return out;
}
