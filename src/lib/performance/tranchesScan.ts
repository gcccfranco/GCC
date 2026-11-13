// Tranches d'un scan 简谱 certifié (lot JP-B) — pur, sans DOM.
// Un scan se coupe entre deux lignes (`systemes.json`), jamais au milieu : chaque tranche est un écran.

/** Une tranche : indices des lignes (première et dernière, incluses) et bornes en px image. */
export type Tranche = { y0: number; y1: number; premiere: number; derniere: number; demi?: Demi };

/** Fenêtre d'une demi-ligne (lot JP-C, téléphone en portrait) : `x0..x1` × `y0..y1` px image ; `moitie` absent : ligne entière. */
export type FenetreDemi = { x0: number; x1: number; y0: number; y1: number; ligne: number; moitie?: "g" | "d" };
/** Tranche en demi-lignes : fenêtres dans l'ordre d'affichage, échelle commune (px CSS par px image). */
export type Demi = { echelle: number; fenetres: FenetreDemi[]; /** Deux colonnes (JV-4) : indice de la première fenêtre de droite ; absent : une colonne. */ colonne2?: number };

/** Une ligne du scan : `y0`..`y1` inclus, px image ; `barres` : x des barres de mesure (la dernière est la barre finale). */
export type LigneTranche = { y0: number; y1: number; barres?: number[] };

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

/** Barre de mesure la plus proche du milieu de `x0..x1`, hors barre finale (la dernière) et hors de ]x0, x1[ ; `null` sinon. */
export function coupeMilieu(barres: number[], x0: number, x1: number): number | null {
  const milieu = (x0 + x1) / 2;
  return barres.slice(0, -1).filter((x) => x > x0 && x < x1).reduce<number | null>((m, x) => (m === null || Math.abs(x - milieu) < Math.abs(m - milieu) ? x : m), null);
}

/** Écart entre les deux moitiés d'une ligne, et entre deux systèmes (px CSS). */
export const ECART_MOITIES = 2;
export const ECART_SYSTEMES = 24;

/** Fenêtres d'une ligne : entière, ou deux moitiés coupées sur la barre la plus proche du milieu. */
function fenetresLigne(l: LigneTranche, k: number, haut: number, bas: number, x0: number, x1: number): FenetreDemi[] {
  const y0 = l.y0 - haut;
  const y1 = l.y1 + bas;
  const c = coupeMilieu(l.barres ?? [], x0, x1);
  return c === null ? [{ x0, x1, y0, y1, ligne: k }] : [{ x0, x1: c, y0, y1, ligne: k, moitie: "g" }, { x0: c, x1, y0, y1, ligne: k, moitie: "d" }];
}

/** Tranches en demi-lignes (téléphone en portrait) : chaque ligne coupée sur sa barre la plus proche du milieu donne
 *  deux fenêtres empilées (même `y0..y1`) ; une ligne sans coupe reste entière. Échelle commune à la page :
 *  `largeurDispoPx` / la plus large des fenêtres. On empile des systèmes entiers tant qu'ils tiennent ; un système
 *  seul plus haut que l'écran fait sa page, dont l'échelle baisse pour qu'elle tienne en hauteur (écarts fixes
 *  compris). `reserveDerniere` : comme `tranchesScan`. */
export function tranchesDemiLignes(
  lignes: LigneTranche[],
  pageH: number,
  x0: number,
  x1: number,
  largeurDispoPx: number,
  hauteurDispoPx: number,
  reserveDerniere = 0,
): Tranche[] {
  if (lignes.length === 0) return [];
  const { haut, bas } = marges(lignes, pageH);
  const fenetresDe = (k: number) => fenetresLigne(lignes[k], k, haut[k], bas[k], x0, x1);
  const mesure = (fs: FenetreDemi[]) => {
    const echelle = largeurDispoPx / Math.max(1, ...fs.map((f) => f.x1 - f.x0));
    const h = fs.reduce((t, f, n) => t + (f.y1 - f.y0) * echelle + (n === 0 ? 0 : f.moitie === "d" ? ECART_MOITIES : ECART_SYSTEMES), 0);
    return { echelle, h };
  };
  const out: Tranche[] = [];
  let p = 0;
  let fs: FenetreDemi[] = [];
  const clore = (d: number) => {
    const m = mesure(fs);
    let echelle = m.echelle;
    const dispo = hauteurDispoPx - (d === lignes.length - 1 ? reserveDerniere : 0);
    if (m.h > dispo) {
      const fixe = fs.reduce((t, f, n) => t + (n === 0 ? 0 : f.moitie === "d" ? ECART_MOITIES : ECART_SYSTEMES), 0);
      echelle = Math.min(echelle, Math.max(0, dispo - fixe) / Math.max(1, (m.h - fixe) / echelle));
    }
    out.push({ y0: fs[0].y0, y1: fs[fs.length - 1].y1, premiere: p, derniere: d, demi: { echelle, fenetres: fs } });
    p = d + 1;
    fs = [];
  };
  for (let k = 0; k < lignes.length; k++) {
    const nouvelles = fenetresDe(k);
    if (fs.length > 0 && mesure([...fs, ...nouvelles]).h > hauteurDispoPx - (k === lignes.length - 1 ? reserveDerniere : 0)) clore(k - 1);
    fs = [...fs, ...nouvelles];
  }
  clore(lignes.length - 1);
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

/** Fenêtre d'un volet : une demi-ligne et sa page (0-based). */
export type FenetreVolet = FenetreDemi & { page: number };
/** Deux colonnes de demi-lignes (vue Partitions, ≥ 1 000 px) ; échelle commune (px CSS par px image). */
export type Volets = { echelle: number; colonnes: [FenetreVolet[], FenetreVolet[]] };
/** Accords imprimés minimaux (px CSS) en deux volets : dessous, le scan reste sur une colonne. */
export const SEUIL_ACCORD_VOLETS = 11;

/** Répartit les demi-lignes de tout le chant en deux colonnes (jamais coupées entre les deux moitiés d'une ligne).
 *  Échelle = colonne / plus large fenêtre, plafonnée à `echelleMax`. `null` : une colonne (accords imprimés sous
 *  `seuilAccordPx`, ou moins de deux systèmes). Coupe au début de section si l'écart reste ≤ 2 demi-lignes, sinon
 *  au milieu (hauteurs les plus égales). */
export function voletsDemiLignes(
  pages: { lignes: LigneTranche[]; h: number; x0: number; x1: number }[],
  sections: SectionScan[],
  largeurColonnePx: number,
  echelleMax: number,
  hauteurAccordImg: number,
  seuilAccordPx = SEUIL_ACCORD_VOLETS,
): Volets | null {
  const systemes: FenetreVolet[][] = pages.flatMap((p, page) => {
    const { haut, bas } = marges(p.lignes, p.h);
    return p.lignes.map((l, k) => fenetresLigne(l, k, haut[k], bas[k], p.x0, p.x1).map((f) => ({ ...f, page })));
  });
  if (systemes.length < 2) return null;
  const large = Math.max(1, ...systemes.flat().map((f) => f.x1 - f.x0));
  const echelle = Math.min(echelleMax, largeurColonnePx / large);
  if (hauteurAccordImg * echelle < seuilAccordPx) return null;
  const hSysteme = (s: FenetreVolet[]) => s.reduce((t, f) => t + (f.y1 - f.y0) * echelle + (f.moitie === "d" ? ECART_MOITIES : 0), 0);
  // Hauteur d'une colonne de systèmes [a, b[ : écarts entre systèmes compris.
  const hauteur = (a: number, b: number) => systemes.slice(a, b).reduce((t, s, n) => t + hSysteme(s) + (n === 0 ? 0 : ECART_SYSTEMES), 0);
  const ecart = (c: number) => Math.abs(hauteur(0, c) - hauteur(c, systemes.length));
  const meilleure = (cs: number[]) => cs.reduce((m, c) => (ecart(c) < ecart(m) ? c : m));
  const tous = systemes.map((_, c) => c).filter((c) => c > 0);
  const debuts = new Set(sections.map((s) => { const [p, l] = debutSection(s); return `${p - 1}-${l - 1}`; }));
  const deSection = tous.filter((c) => debuts.has(`${systemes[c][0].page}-${systemes[c][0].ligne}`));
  const nb = (a: number, b: number) => systemes.slice(a, b).reduce((t, s) => t + s.length, 0);
  let c = meilleure(tous);
  if (deSection.length > 0) {
    const cs = meilleure(deSection);
    if (Math.abs(nb(0, cs) - nb(cs, systemes.length)) <= 2) c = cs;
  }
  return { echelle, colonnes: [systemes.slice(0, c).flat(), systemes.slice(c).flat()] };
}

/** Gouttière entre les deux colonnes de demi-lignes du mode louange (px CSS, comme la vue Partitions). */
export const GOUTTIERE_VOLETS = 24;

/** Mode louange, interrupteur « 2 colonnes » (lot JV, JV-4) : chaque page d'écran montre deux colonnes de demi-lignes
 *  au lieu de lignes entières. Chaque ligne est coupée sur sa barre la plus proche du milieu (`fenetresLigne`), jamais
 *  entre ses deux moitiés. Échelle = colonne / plus large fenêtre, plafonnée à `echelleMax` (celle des lignes entières :
 *  la taille de lecture ne grandit pas). On remplit la colonne de gauche, puis celle de droite, puis la page suivante ;
 *  la dernière page s'équilibre (la plus haute colonne la plus courte). Un système seul plus haut que l'écran baisse
 *  l'échelle de sa page. `null` : lignes entières (accords imprimés sous `seuilAccordPx`, ou une seule ligne).
 *  `demi.colonne2` : indice de la première fenêtre de la colonne de droite (= nombre de fenêtres : rien à droite). */
export function tranchesDeuxColonnes(
  lignes: LigneTranche[],
  pageH: number,
  x0: number,
  x1: number,
  largeurDispoPx: number,
  hauteurDispoPx: number,
  echelleMax: number,
  hauteurAccordImg: number,
  reserveDerniere = 0,
  seuilAccordPx = SEUIL_ACCORD_VOLETS,
): Tranche[] | null {
  if (lignes.length < 2) return null;
  const { haut, bas } = marges(lignes, pageH);
  const systemes = lignes.map((l, k) => fenetresLigne(l, k, haut[k], bas[k], x0, x1));
  const large = Math.max(1, ...systemes.flat().map((f) => f.x1 - f.x0));
  const echelle = Math.min(echelleMax, (largeurDispoPx - GOUTTIERE_VOLETS) / 2 / large);
  if (hauteurAccordImg * echelle < seuilAccordPx) return null;
  const fixe = (s: FenetreDemi[]) => (s.length > 1 ? ECART_MOITIES : 0);
  const hSys = (k: number) => systemes[k].reduce((t, f) => t + (f.y1 - f.y0) * echelle, 0) + fixe(systemes[k]);
  // Hauteur d'une colonne de systèmes [a, b[ (écarts compris).
  const hCol = (a: number, b: number) => { let t = 0; for (let k = a; k < b; k++) t += hSys(k) + (k > a ? ECART_SYSTEMES : 0); return t; };
  const dispo = (fin: number) => hauteurDispoPx - (fin === lignes.length ? reserveDerniere : 0);
  // Remplissage glouton : chaque page = [a, c[ à gauche, [c, b[ à droite.
  const pages: [number, number, number][] = [];
  let a = 0;
  while (a < lignes.length) {
    let c = a + 1;
    while (c < lignes.length && hCol(a, c + 1) <= dispo(c + 1)) c++;
    // Un système trop haut pour l'écran ne s'ouvre pas à droite : il fera sa page.
    let b = c < lignes.length && hSys(c) <= dispo(c + 1) ? c + 1 : c;
    while (b > c && b < lignes.length && hCol(c, b + 1) <= dispo(b + 1)) b++;
    pages.push([a, c, b]);
    a = b;
  }
  // Dernière page : la coupe qui rend la plus haute colonne la plus courte (la gauche prend le système de plus à égalité).
  const [da, , db] = pages[pages.length - 1];
  if (db - da > 1) {
    let meilleure = da + 1;
    for (let c = da + 1; c < db; c++) {
      if (Math.max(hCol(da, c), hCol(c, db)) < Math.max(hCol(da, meilleure), hCol(meilleure, db))) meilleure = c;
    }
    pages[pages.length - 1] = [da, meilleure, db];
  }
  return pages.map(([a, c, b]) => {
    const fenetres = systemes.slice(a, b).flat();
    const plusHaute = Math.max(hCol(a, c), c < b ? hCol(c, b) : 0);
    const place = dispo(b);
    let e = echelle;
    if (plusHaute > place) {
      const fixes = (x: number, y: number) => { let t = 0; for (let k = x; k < y; k++) t += fixe(systemes[k]) + (k > x ? ECART_SYSTEMES : 0); return t; };
      const f = Math.max(fixes(a, c), c < b ? fixes(c, b) : 0);
      e = Math.min(echelle, Math.max(0, place - f) / Math.max(1, (plusHaute - f) / echelle));
    }
    const colonne2 = systemes.slice(a, c).flat().length;
    return { y0: fenetres[0].y0, y1: fenetres[fenetres.length - 1].y1, premiere: a, derniere: b - 1, demi: { echelle: e, fenetres, colonne2 } };
  });
}
