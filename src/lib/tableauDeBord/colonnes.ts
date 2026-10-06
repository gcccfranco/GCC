// Tableau de bord en colonnes (agencement v18, B14 et R15 de docs/spec-agencement-v18.md ; planches
// `v18-bo-tableau-de-bord` et `-reduite`). En grand, hors personnalisation, les widgets ne sont plus
// en rangées (une grille laisse 1 300 px de blanc sous un widget court) mais en colonnes : une large
// et une étroite barre dépliée, une large et deux étroites quand la zone le permet (barre réduite à
// 1 440 px). En personnalisation, sur tablette et téléphone : la grille (`GRILLE_WIDGETS`).
import type { Taille } from "@/types/backOffice";

/** Largeurs relatives des colonnes (la large d'abord) : `grid-template-columns` en `fr`. */
export const COLONNES_DEUX = [1.55, 1];
export const COLONNES_TROIS = [1.6, 1, 1];
/** Largeur du contenu (zone moins ses marges) dès laquelle on passe à trois colonnes : 1 316 px
 *  barre réduite à 1 440 px, 1 112 px barre dépliée, 1 156 px barre réduite à 1 280 px. */
export const SEUIL_TROIS_COLONNES = 1200;

export const fractionsPour = (largeur: number) => (largeur >= SEUIL_TROIS_COLONNES ? COLONNES_TROIS : COLONNES_DEUX);

/**
 * Répartit les widgets dans les colonnes (fonction pure). La colonne large (la première) prend les
 * widgets « Grand » (`l`) ou, s'il n'y en a pas, le premier ; chaque autre widget, dans l'ordre du
 * tableau, va dans la colonne la moins haute (à égalité, la plus à gauche). L'ordre du tableau est
 * gardé dans chaque colonne.
 * `hauteurs` : la hauteur de chaque widget dans une colonne de 1 fr (absente = 0) ; dans une colonne
 * de `f` fr, le même widget, plus large, est réputé `f` fois moins haut.
 */
export function repartirWidgets<W extends { id: string; taille: Taille }>(
  widgets: W[], hauteurs: Record<string, number>, fractions: number[],
): W[][] {
  const colonnes: W[][] = fractions.map(() => []);
  const charge = fractions.map(() => 0);
  const poser = (w: W, c: number) => {
    colonnes[c].push(w);
    charge[c] += (hauteurs[w.id] ?? 0) / fractions[c];
  };
  const larges = widgets.filter((w) => w.taille === "l");
  const dansLaLarge = new Set(larges.length > 0 ? larges : widgets.slice(0, 1));
  for (const w of dansLaLarge) poser(w, 0);
  for (const w of widgets) {
    if (dansLaLarge.has(w)) continue;
    let c = 0;
    for (let i = 1; i < charge.length; i++) if (charge[i] < charge[c]) c = i;
    poser(w, c);
  }
  const rang = new Map(widgets.map((w, i) => [w, i]));
  return colonnes.map((col) => col.sort((a, b) => rang.get(a)! - rang.get(b)!));
}

/** Hauteur de la plus haute colonne (même modèle que `repartirWidgets`) : la longueur de la page. */
export function hauteurMax<W extends { id: string }>(colonnes: W[][], hauteurs: Record<string, number>, fractions: number[]): number {
  return Math.max(0, ...colonnes.map((col, c) => col.reduce((s, w) => s + (hauteurs[w.id] ?? 0), 0) / fractions[c]));
}
