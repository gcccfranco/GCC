// Barre d'annotation détachable (AN-3b) : calculs purs du point d'accroche et de la place, sans DOM.
/** `attachee` : la barre pleine largeur d'AN-3a (haut sur tablette et ordinateur, bas au téléphone), valeur d'origine de
 *  toutes les dispositions ; `haut` et `bas` ne désignent que des capsules détachées. */
export type Accroche = "attachee" | "haut" | "bas" | "gauche" | "droite" | "libre";
/** `x`, `y` : coin haut-gauche en fractions [0,1] de l'espace libre, pour une accroche `libre`. */
export type PositionBarre = { accroche: Accroche; x?: number; y?: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type Zone = { left: number; top: number; right: number; bottom: number };

/** Un bord à moins de 48 px du bord de zone : aimant. Au-delà, une vitesse de plus de 0,5 px/ms lance la barre
 *  (centre projeté à 200 ms) ; sinon elle reste libre. */
export const AIMANT_PX = 48;
export const VITESSE_LANCER = 0.5;
export const PROJECTION_MS = 200;

const BORDS: Accroche[] = ["gauche", "droite", "haut", "bas"];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
const nette = (v: number) => (Number.isFinite(v) ? clamp(v, 0, 1) : 0.5);

/** Accroche au lâcher : `rect` de la barre, `zone` permise, `vitesse` en px/ms. */
export function poserBarre(rect: Rect, zone: Zone, vitesse: { x: number; y: number }): PositionBarre {
  const dist = [rect.left - zone.left, zone.right - (rect.left + rect.width), rect.top - zone.top, zone.bottom - (rect.top + rect.height)];
  const plusProche = (d: number[]) => BORDS[d.indexOf(Math.min(...d))];
  if (Math.min(...dist) < AIMANT_PX) return { accroche: plusProche(dist) };
  if (Math.hypot(vitesse.x, vitesse.y) > VITESSE_LANCER) {
    const cx = rect.left + rect.width / 2 + vitesse.x * PROJECTION_MS;
    const cy = rect.top + rect.height / 2 + vitesse.y * PROJECTION_MS;
    return { accroche: plusProche([Math.abs(cx - zone.left), Math.abs(zone.right - cx), Math.abs(cy - zone.top), Math.abs(zone.bottom - cy)]) };
  }
  return {
    accroche: "libre",
    x: nette((rect.left - zone.left) / (zone.right - zone.left - rect.width)),
    y: nette((rect.top - zone.top) / (zone.bottom - zone.top - rect.height)),
  };
}

/** Place de la barre, toujours dans la zone (rendu, lâcher, recalage à la rotation). */
export function placerBarre(position: PositionBarre, taille: { largeur: number; hauteur: number }, zone: Zone): { left: number; top: number; colonne: boolean } {
  const { largeur: w, hauteur: h } = taille;
  const librX = zone.right - zone.left - w;
  const librY = zone.bottom - zone.top - h;
  const centreX = librX / 2, centreY = librY / 2;
  const { accroche: a } = position;
  const x = a === "gauche" ? 0 : a === "droite" ? librX : a === "libre" ? nette(position.x ?? 0.5) * librX : centreX;
  const y = a === "haut" ? 0 : a === "bas" ? librY : a === "libre" ? nette(position.y ?? 0.5) * librY : centreY;
  return { left: clamp(zone.left + x, zone.left, zone.right - w), top: clamp(zone.top + y, zone.top, zone.bottom - h), colonne: a === "gauche" || a === "droite" };
}

/** Le bord où la barre attachée se trouve : un lâcher qui s'y accroche la rattache. */
export const bordAttache = (telephone: boolean): Accroche => (telephone ? "bas" : "haut");
export const normaliser = (pos: PositionBarre, telephone: boolean): PositionBarre => (pos.accroche === bordAttache(telephone) ? { accroche: "attachee" } : pos);

/** Entrée ou Espace sur la poignée : attachée, droite, opposée de l'attachée, gauche, attachée. */
export function accrocheSuivante(a: Accroche, telephone: boolean): Accroche {
  const cycle: Accroche[] = ["attachee", "droite", telephone ? "haut" : "bas", "gauche"];
  return cycle[(cycle.indexOf(a) + 1) % cycle.length];
}

/** Lecture de `localStorage["annot-barre-position"]` : une valeur invalide donne « attachée ». */
export function lirePosition(brut: string | null): PositionBarre {
  try {
    const v = JSON.parse(brut ?? "null") as PositionBarre | null;
    if (v && typeof v === "object" && ([...BORDS, "libre"] as string[]).includes(v.accroche)) {
      if (v.accroche !== "libre") return { accroche: v.accroche };
      if (Number.isFinite(v.x) && Number.isFinite(v.y)) return { accroche: "libre", x: nette(v.x!), y: nette(v.y!) };
    }
  } catch { /* valeur illisible : attachée */ }
  return { accroche: "attachee" };
}
