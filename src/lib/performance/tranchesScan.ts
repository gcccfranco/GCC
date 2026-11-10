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

/** Une section du scan (`sections.json`) : page et ligne de début, 1-based. */
export type SectionScan = { id: string; page: number; ligne: number; anacrouse?: boolean };

/** Rang de début d'une section dans le chant : (page, ligne). Une anacrouse commence en fin de la ligne d'avant
 *  (la 1re ligne de la page reste la 1re : rien avant elle sur cette page). */
function debutSection(s: SectionScan): [number, number] {
  return [s.page, s.anacrouse && s.ligne > 1 ? s.ligne - 1 : s.ligne];
}

const avant = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

/** Sections présentes sur une tranche : celles dont l'intervalle [début, début de la suivante) chevauche les lignes
 *  de la tranche. `page` : 1-based ; `premiere` et `derniere` : indices 0 de la tranche (`Tranche`). Des sections qui
 *  commencent à la même ligne (couplets sur la même musique) partagent l'intervalle qui court jusqu'au début suivant. */
export function sectionsDeTranche(sections: SectionScan[], page: number, tranche: Pick<Tranche, "premiere" | "derniere">): Set<string> {
  const debuts = sections.map(debutSection);
  const a: [number, number] = [page, tranche.premiere + 1];
  const b: [number, number] = [page, tranche.derniere + 1];
  const out = new Set<string>();
  sections.forEach((s, k) => {
    const d = debuts[k];
    const fin = debuts.filter((x) => avant(d, x)).reduce<[number, number] | null>((m, x) => (m === null || avant(x, m) ? x : m), null);
    if (!avant(b, d) && (fin === null || avant(a, fin))) out.add(s.id);
  });
  return out;
}

/** Indice de la première tranche (d'un scan, page 1-based) qui contient la ligne de début de la section ;
 *  -1 si la page n'a pas de tranche qui la contienne. */
export function trancheDeSection(section: SectionScan, tranchesDeLaPage: Pick<Tranche, "premiere" | "derniere">[]): number {
  const [, ligne] = debutSection(section);
  return tranchesDeLaPage.findIndex((t) => t.premiere + 1 <= ligne && ligne <= t.derniere + 1);
}
