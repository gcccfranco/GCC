// Tranches d'un scan 简谱 certifié (lot JP-B) — pur, sans DOM.
// Un scan se coupe entre deux lignes (`systemes.json`), jamais au milieu : chaque tranche est un écran.

/** Une tranche : indices des lignes (première et dernière, incluses) et bornes en px image. */
export type Tranche = { y0: number; y1: number; premiere: number; derniere: number };

/** Une ligne du scan : `y0`..`y1` inclus, px image. */
export type LigneTranche = { y0: number; y1: number };

/** Air laissé de part et d'autre de l'encre (px image) : le bord de l'encre ne touche pas celui de la feuille. */
export const AIR_X = 16;
/** Plus grande marge verticale prise de part et d'autre d'une tranche (px image). */
export const MARGE_Y_MAX = 12;
/** Place gardée (px de page, échelle 1) au-dessus du scan pour l'en-tête d'une ligne et le bandeau de structure de
 *  `PageScan` : la pagination ne peut pas les mesurer (ils ne sont rendus que sur la page de scan affichée), elle
 *  prend cette réserve fixe. Large : mieux vaut une tranche un peu courte qu'un scan réduit pour tenir. */
export const RESERVE_ENTETE_SCAN = 104;
/** Largeur maximale de la feuille de scan (px CSS, ordinateur : centrée). */
export const LARGEUR_FEUILLE_MAX = 1040;

/** Bornes horizontales de la fenêtre d'une page : l'encre (page moins ses marges blanches) plus l'air, dans la page. */
export function bornesX(w: number, marges: [number, number] | undefined): { x0: number; x1: number } {
  const [g, d] = marges ?? [0, 0];
  return { x0: Math.max(0, g - AIR_X), x1: Math.min(w, w - d + AIR_X) };
}

/** Marges au-dessus et au-dessous de chaque ligne : au plus MARGE_Y_MAX et la moitié de l'écart avec la ligne
 *  voisine (le bord de la page pour la première et la dernière) ; des lignes qui se chevauchent : 0. */
function marges(lignes: LigneTranche[], pageH: number): { haut: number[]; bas: number[] } {
  const m = (ecart: number) => Math.max(0, Math.min(MARGE_Y_MAX, Math.floor(ecart / 2)));
  return {
    haut: lignes.map((l, k) => m(l.y0 - (k > 0 ? lignes[k - 1].y1 : 0))),
    bas: lignes.map((l, k) => m((k < lignes.length - 1 ? lignes[k + 1].y0 : pageH) - l.y1)),
  };
}

/** Coupe une page de scan en tranches. L'échelle est celle de la feuille pleine largeur
 *  (`largeurDispoPx / largeurEncreImg`) : on ne rapetisse jamais pour faire tenir. On empile des lignes entières
 *  tant que la tranche (marges comprises) tient dans `hauteurDispoPx` ; on coupe toujours entre deux lignes ; une
 *  ligne seule plus haute que l'écran fait sa tranche seule (le seul cas où l'affichage la réduit pour tenir).
 *  `reserveDerniere` : place retirée à la dernière tranche de la page (la pastille « Ensuite » du dernier scan d'un
 *  chant suivi d'un autre). */
export function tranchesScan(
  lignes: LigneTranche[],
  pageH: number,
  largeurEncreImg: number,
  largeurDispoPx: number,
  hauteurDispoPx: number,
  reserveDerniere = 0,
): Tranche[] {
  if (lignes.length === 0) return [];
  const echelle = largeurDispoPx / Math.max(1, largeurEncreImg);
  const { haut, bas } = marges(lignes, pageH);
  const bornes = (p: number, d: number): Tranche => ({
    y0: lignes[p].y0 - haut[p],
    y1: lignes[d].y1 + bas[d],
    premiere: p,
    derniere: d,
  });
  const out: Tranche[] = [];
  let p = 0;
  for (let k = 1; k <= lignes.length; k++) {
    if (k < lignes.length) {
      const t = bornes(p, k);
      if ((t.y1 - t.y0) * echelle <= hauteurDispoPx - (k === lignes.length - 1 ? reserveDerniere : 0)) continue;
    }
    out.push(bornes(p, k - 1));
    p = k;
  }
  return out;
}
