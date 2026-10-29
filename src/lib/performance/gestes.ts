// Lot L2 (docs/spec-mode-louange-forscore.md) : zones de toucher et balayage.
// Fonctions pures.

/** Largeur de chaque zone latérale, en part de la largeur de l'écran : 0,3 sur tablette
 *  (tactile grossier et petit côté ≥ 600 px), 1/3 sur téléphone et ordinateur. */
export function largeurZoneLaterale(largeur: number, hauteur: number, tactileGrossier: boolean): number {
  return tactileGrossier && Math.min(largeur, hauteur) >= 600 ? 0.3 : 1 / 3;
}

/** Tablette tenue en portrait (lot L6) : plus haute que large, tactile grossier, petit côté ≥ 600 px.
 *  Même définition de « tablette » que `largeurZoneLaterale`. */
export function estTabletteVerticale(largeur: number, hauteur: number, tactileGrossier: boolean): boolean {
  return hauteur > largeur && tactileGrossier && Math.min(largeur, hauteur) >= 600;
}

export type Geste = "toucher" | "balayage-gauche" | "balayage-droite" | null;

/** Classe un geste à un doigt. Balayage vers la gauche (dx < 0) = page suivante,
 *  vers la droite (dx > 0) = page précédente. */
export function classerGeste(dx: number, dy: number, dt: number): Geste {
  if (dt > 500) return null;
  if (Math.abs(dx) <= 40 && Math.abs(dy) <= 40) return "toucher";
  if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "balayage-gauche" : "balayage-droite";
  return null;
}
