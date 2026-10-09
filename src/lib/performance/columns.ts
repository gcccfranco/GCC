// Pagination du mode louange (PerformanceMode.tsx) — pur, sans DOM.
// Une colonne : les pages d'aujourd'hui. Deux colonnes (lot U5, T1,
// docs/spec-deux-volets.md Q2 à Q5) : sur tablette couchée et sur ordinateur,
// quand la largeur le permet.

/** Une page de rendu : en-tête de chant éventuel (pleine largeur), une ou deux
 *  colonnes de blocs, et un facteur d'échelle ≤ 1 (ajustement automatique pour
 *  faire tenir la page). `fit` : page occupée par une partition 简谱, qui se met
 *  à l'échelle de la hauteur disponible au lieu d'être paginée (une image ne se
 *  coupe pas). `twoColumns` : page posée en deux colonnes hors vue structure ;
 *  ses annotations ont leur propre clé (« x2 »). */
export type PerfPage = { header: number | null; cols: number[][]; scale: number; fit?: boolean; twoColumns?: boolean };

/** Dispositions « ordinateur » et « tablette paysage » de U4
 *  (spec-navigation-grand-ecran.md Q1, globals.css bloc « Lot U4 ») : les mêmes
 *  requêtes, relues par le code. Le mode louange est plein écran : la barre
 *  latérale n'y compte pas. */
export const GRAND_ECRAN =
  "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";

/** Largeur de mise en page minimale pour deux colonnes : 440 px chacune, marges
 *  et gouttière comprises. */
const MIN_TWO_COLUMNS_WIDTH = 960;

/** Deux colonnes possibles : grand écran, et `largeur ÷ taille du texte ≥ 960 px`
 *  (la mise en page se fait à cette largeur, PerformanceMode.tsx). */
export function twoColumnsPossible(grandEcran: boolean, width: number, fontScale: number): boolean {
  return grandEcran && width / fontScale >= MIN_TWO_COLUMNS_WIDTH;
}

/** Hauteur d'une page qui ne commence pas un chant : `reserveSuite` y est
 *  gardé pour le rappel de structure (Sections uniques, 32 px ; 0 sinon). */
const hauteurDePage = (premier: number | undefined, breakBefore: Set<number>, pageHeight: number, reserveSuite: number) =>
  premier !== undefined && breakBefore.has(premier) ? pageHeight : pageHeight - reserveSuite;

// Mode normal : une colonne par page. Chaque chant commence sur une nouvelle page
// (breakBefore = en-têtes de chant) ; à l'intérieur d'un chant, remplissage glouton.
export function paginateBlocks(
  idxs: number[],
  heights: number[],
  viewportH: number,
  breakBefore: Set<number>,
  reserveSuite = 0,
): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  let room = viewportH;
  for (const i of idxs) {
    const h = heights[i];
    if ((breakBefore.has(i) && current.length > 0) || (current.length > 0 && used + h > room)) {
      pages.push(current);
      current = [];
      used = 0;
    }
    if (current.length === 0) room = hauteurDePage(i, breakBefore, viewportH, reserveSuite);
    current.push(i);
    used += h;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

/** Les pages d'aujourd'hui, une colonne. Jamais de section coupée : une page qui
 *  déborde quand même (bloc seul plus haut que l'écran) est réduite pour tenir. */
export function pagesUneColonne(
  flow: number[],
  heights: number[],
  pageHeight: number,
  breakBefore: Set<number>,
  reserveSuite = 0,
): PerfPage[] {
  return paginateBlocks(flow, heights, pageHeight, breakBefore, reserveSuite).map((idxs) => {
    const pageH = idxs.reduce((s, i) => s + heights[i], 0);
    const room = Math.max(1, hauteurDePage(idxs[0], breakBefore, pageHeight, reserveSuite));
    return { header: null, cols: [idxs], scale: Math.min(1, room / Math.max(1, pageH)) };
  });
}

/**
 * Un chant (hors scan 简谱) en deux colonnes. Il tient sur une page en une
 * colonne, ou la mesure à la largeur d'une colonne manque : les pages
 * d'aujourd'hui. Sinon : l'en-tête en pleine largeur au-dessus des colonnes de
 * la première page, colonne de gauche puis de droite, pages suivantes ; aucun
 * bloc coupé ; la dernière page s'équilibre (la plus haute colonne la plus
 * courte possible) ; une colonne plus haute que la page réduit la page.
 */
export function paginateColumns({
  flow,
  header,
  heightsFull,
  heightsColumn,
  pageHeight,
  reserveSuite = 0,
}: {
  /** Blocs du chant hors en-tête, dans l'ordre joué. */
  flow: number[];
  header: number | null;
  /** Hauteurs mesurées pleine largeur / à la largeur d'une colonne. */
  heightsFull: number[];
  heightsColumn: number[];
  pageHeight: number;
  /** Place gardée en haut des pages suivantes pour le rappel de structure. */
  reserveSuite?: number;
}): PerfPage[] {
  const all = header != null ? [header, ...flow] : flow;
  const sum = (idxs: number[], h: number[]) => idxs.reduce((s, i) => s + h[i], 0);
  if (heightsColumn.length === 0 || flow.length < 2 || sum(all, heightsFull) <= pageHeight) {
    return pagesUneColonne(all, heightsFull, pageHeight, new Set(header != null ? [header] : []), reserveSuite);
  }

  const headerH = header != null ? heightsFull[header] : 0;
  const room = (page: number) => Math.max(1, pageHeight - (page === 0 ? headerH : reserveSuite));

  // Remplissage glouton : gauche, droite, page suivante ; au moins un bloc par colonne.
  const pages: number[][][] = [];
  let cols: number[][] = [[]];
  let used = 0;
  for (const i of flow) {
    if (cols[cols.length - 1].length > 0 && used + heightsColumn[i] > room(pages.length)) {
      if (cols.length === 1) cols.push([]);
      else {
        pages.push(cols);
        cols = [[]];
      }
      used = 0;
    }
    cols[cols.length - 1].push(i);
    used += heightsColumn[i];
  }
  pages.push(cols);

  // Dernière page : coupure qui rend la plus haute colonne la plus courte ; à
  // égalité, la colonne de gauche prend le bloc de plus.
  const last = pages[pages.length - 1].flat();
  if (last.length > 1) {
    const total = sum(last, heightsColumn);
    let best = { k: 1, maxH: Infinity };
    for (let k = 1; k < last.length; k++) {
      const left = sum(last.slice(0, k), heightsColumn);
      const maxH = Math.max(left, total - left);
      if (maxH <= best.maxH) best = { k, maxH };
    }
    pages[pages.length - 1] = [last.slice(0, best.k), last.slice(best.k)];
  } else {
    pages[pages.length - 1] = [last, []];
  }

  return pages.map((c, p) => {
    const tallest = Math.max(...c.map((col) => sum(col, heightsColumn)));
    return {
      header: p === 0 ? header : null,
      cols: c,
      scale: Math.min(1, room(p) / Math.max(1, tallest)),
      twoColumns: true,
    };
  });
}
