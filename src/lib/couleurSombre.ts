import type React from "react";

// Variante sombre des couleurs de service (serviceColors.ts reste gelé) : la couleur est mélangée vers le blanc,
// par pas de 2 %, jusqu'à 4,5:1 sur #2c2c2e (le fond le plus clair des cartes et pastilles sombres, donc aussi
// sur #1c1c1e). Une couleur qui passe déjà est rendue telle quelle.

const FOND_SOMBRE = "#2c2c2e";
const SEUIL = 4.5;

function rgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contraste WCAG entre deux couleurs hexadécimales. */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminance(rgb(a)), luminance(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const cache = new Map<string, string>();

/** Éclaircit `hex` (vers le blanc, pas de 2 %) jusqu'à 4,5:1 sur #2c2c2e. */
export function couleurSombre(hex: string): string {
  const memo = cache.get(hex);
  if (memo) return memo;
  let sortie = hex;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) && contraste(hex, FOND_SOMBRE) < SEUIL) {
    const [r, g, b] = rgb(hex);
    for (let p = 2; p <= 100; p += 2) {
      const m = (v: number) => Math.round(v + (255 - v) * (p / 100));
      sortie = "#" + [m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
      if (contraste(sortie, FOND_SOMBRE) >= SEUIL) break;
    }
  }
  cache.set(hex, sortie);
  return sortie;
}

/** Style d'un texte dans une couleur de service : à associer à la classe `texte-service` (globals.css). */
export function styleTexteService(hex: string): React.CSSProperties {
  return { "--svc-clair": hex, "--svc-sombre": couleurSombre(hex) } as React.CSSProperties;
}
