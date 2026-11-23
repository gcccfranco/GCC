// Lot FS-E (docs/spec-mode-louange-forscore-2.md) : la demi-page du mode louange. Réglages par appareil (localStorage) et
// choix de la coupe (fonctions pures).
const CLE = "perf-demi-page";
const CLE_PART = "perf-demi-page-part";

export const PART_DEMI_DEFAUT = 0.5;
export const PART_DEMI_MIN = 0.25;
export const PART_DEMI_MAX = 0.75;

export function bornerPart(v: number): number {
  return Number.isFinite(v) ? Math.min(PART_DEMI_MAX, Math.max(PART_DEMI_MIN, v)) : PART_DEMI_DEFAUT;
}

/** Interrupteur « Demi-page » : "1" allumé, absent ou "0" coupé (coupé par défaut). */
export function getDemiPagePref(): boolean {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

export function setDemiPagePref(v: boolean) {
  try { localStorage.setItem(CLE, v ? "1" : "0"); } catch { /* ignore */ }
}

/** Proportion de la hauteur donnée à la moitié haute, bornée entre 0,25 et 0,75. */
export function getDemiPart(): number {
  try {
    const brut = localStorage.getItem(CLE_PART);
    return brut === null ? PART_DEMI_DEFAUT : bornerPart(parseFloat(brut));
  } catch {
    return PART_DEMI_DEFAUT;
  }
}

export function setDemiPart(v: number) {
  try { localStorage.setItem(CLE_PART, String(bornerPart(v))); } catch { /* ignore */ }
}

/** Une section d'un groupe : bords haut et bas mesurés à l'écran (px), son nom, sa couleur (`--sec-c` posée sur la section),
 *  le retrait de son libellé (x écran), le haut de ce libellé (`libelleTop` : une reprise posée à son niveau n'a pas besoin
 *  de rappel, le nom est déjà là) pour le rappel de la moitié basse, et les bords latéraux de son cadre (x, épaisseur,
 *  couleur) que le filet prolonge quand la coupe rogne le cadre. */
export type SectionDemi = {
  top: number; bottom: number; nom: string;
  couleur?: string; retrait?: number; libelleTop?: number;
  bords?: Array<{ x: number; w: number; c: string }>;
};

/** Un groupe de blocs superposés : l'en-tête du chant (pleine largeur) ou une colonne de la page. Bords mesurés à l'écran
 *  (px) sur le rendu : `blocs` = bords bas (page suivante, en haut) ou bords hauts (page en cours, en bas) des blocs
 *  qu'aucun autre bloc ne chevauche ; `lignes` = les mêmes bords pour les rangées de vers (accords + paroles, ou caractères
 *  + pinyin) et, en bas seulement, le haut du libellé de chaque section : jamais au milieu d'une rangée. `plages` (en bas
 *  seulement) = [haut, bas] de ces rangées : une coupe qui en traverse une la ferait disparaître. `x0`/`x1` bornent
 *  le groupe, `top` est son bord haut. */
export type GroupeDemi = {
  x0: number; x1: number; top: number; blocs: number[]; lignes: number[]; sections: SectionDemi[];
  plages?: Array<[number, number]>;
};
/** `haut` : groupes du rendu de la page suivante ; `bas` : groupes du rendu de la page en cours. */
export type BordsDemi = { haut: GroupeDemi[]; bas: GroupeDemi[] };

/** Zone visible d'un groupe : `y` = bord bas (en haut) ou bord haut (en bas) de ce qui se montre, `Infinity` si rien.
 *  `rappel` : nom de la section que la moitié basse reprend en son milieu (à rappeler au-dessus de sa première rangée),
 *  avec sa couleur et le x écran de son retrait. */
export type ZoneDemi = { x0: number; x1: number; y: number; rappel?: string; rappelCouleur?: string; rappelX?: number };

/** Part de la hauteur de lecture au-delà de laquelle un vide au-dessus du filet fait préférer le bord de ligne au bord de bloc. */
const VIDE_MAX = 0.08;
/** Blanc (px) de part et d'autre du filet : entre le bas de la dernière rangée du haut et lui, entre lui et la première du bas. */
export const MARGE_FILET = 12;
/** Décalage maximal (px) de la moitié basse vers le bas pour loger les marges du filet (la marge de page du bas en offre 16). */
export const DECALAGE_MAX = 24;

type Reprise = { y: number; rappel?: string; rappelCouleur?: string; rappelX?: number };

/** Coupe pour une limite donnée (px écran, la part réglée) ; `hauteur` = hauteur de lecture (px), `reserve` = place (px) du
 *  rappel de section au-dessus de la reprise de la moitié basse.
 *  La moitié basse reprend à une rangée de la page en cours : chaque groupe (colonne) à la première rangée sous la ligne de
 *  coupe, ou à celle que la ligne traverse (jamais une rangée coupée en deux, jamais une rangée perdue). Entre deux rangées
 *  d'une même section il n'y a presque pas de blanc : la moitié basse descend de `decalage` px (≤ `DECALAGE_MAX`) pour que
 *  le filet ait `MARGE_FILET` px de blanc sous lui (plus la place du rappel de section, qui se loge là, sans faire remonter
 *  la coupe). Le haut se coupe, par colonne, au dernier bord bas de bloc (de rangée s'il laisse plus de 8 % de `hauteur`
 *  vide) qui laisse `MARGE_FILET` px au-dessus du filet. On retient, parmi les reprises possibles, celle dont le filet
 *  (`yCoupe`) tombe au plus près de la limite. Nul si rien ne tient au-dessus du filet : pas de demi-page. */
export function choisirCoupe(bords: BordsDemi, limite: number, hauteur: number = limite * 2, reserve = 0): { yCoupe: number; yHaut: number; decalage: number; haut: ZoneDemi[]; bas: ZoneDemi[] } | null {
  const hautPour = (l: number): ZoneDemi[] | null => {
    const avant = (liste: number[]) => liste.filter((y) => y <= l + 0.5);
    const haut: ZoneDemi[] = bords.haut.map((g) => {
      const b = avant(g.blocs);
      const bloc = b.length ? Math.max(...b) : null;
      let y = bloc;
      if (y === null || l - y > VIDE_MAX * hauteur) {
        const c = avant(g.lignes);
        if (c.length) y = Math.max(y ?? -Infinity, ...c);
      }
      return { x0: g.x0, x1: g.x1, y: y ?? g.top };
    });
    return bords.haut.some((g, i) => haut[i].y > g.top) ? haut : null;
  };
  const bordsBas = (g: GroupeDemi) => [...g.blocs, ...g.lignes].sort((p, q) => p - q);
  // Reprise d'un groupe du bas à la hauteur `y` (px écran, avant décalage) : le rappel de la section qu'elle coupe, s'il y en a une.
  const repriseA = (g: GroupeDemi, y: number): Reprise => {
    if (!Number.isFinite(y)) return { y };
    const s = g.sections.find((e) => e.top < y - 0.5 && e.bottom > y + 0.5);
    // Reprise au libellé même (le cadre commence un peu au-dessus de lui) : le nom est déjà à l'écran, pas de rappel doublé.
    if (s && s.libelleTop !== undefined && y <= s.libelleTop + 0.5) return { y };
    return { y, rappel: s?.nom || undefined, rappelCouleur: s?.couleur, rappelX: s?.retrait };
  };
  // Reprise de chaque groupe du bas pour une ligne de coupe `c` (px écran, avant décalage).
  const reprises = (c: number): Reprise[] =>
    bords.bas.map((g) => {
      const suivant = bordsBas(g).find((y) => y >= c - 0.5);
      const traversees = (g.plages ?? []).filter(([t, b]) => t < c - 0.5 && b > c + 0.5).map(([t]) => t);
      return repriseA(g, Math.min(suivant ?? Infinity, ...traversees));
    });
  const candidats = Array.from(new Set(bords.bas.flatMap(bordsBas)));
  let meilleur: { score: number; yCoupe: number; decalage: number; rep: Reprise[]; haut: ZoneDemi[] } | null = null;
  const essayer = (c: number, tolerant = false) => {
    let rep = reprises(c);
    let decalage = 0;
    let yCoupe = limite;
    const calculer = () => {
      const tops = rep.filter((r) => Number.isFinite(r.y)).map((r) => r.y - (r.rappel ? reserve : 0));
      decalage = 0;
      yCoupe = limite;
      if (tops.length) {
        const tmin = Math.min(...tops);
        decalage = Math.min(DECALAGE_MAX, Math.max(0, limite + MARGE_FILET - tmin));
        yCoupe = tmin + decalage - MARGE_FILET;
      }
    };
    // Une rangée masquée (avant la reprise) ne doit pas se retrouver sous le filet une fois décalée : elle aurait disparu ;
    // la reprise du groupe la reprend alors (elle ne fait que remonter ; au-delà de deux reprises la ligne est écartée).
    for (let tour = 0; tour < 3; tour++) {
      calculer();
      let change = false;
      rep = rep.map((r, k) => {
        if (!Number.isFinite(r.y)) return r;
        const gen = (bords.bas[k].plages ?? []).filter(([t]) => t < r.y - 0.5 && t + decalage >= yCoupe - 1).map(([t]) => t);
        if (gen.length === 0) return r;
        change = true;
        return repriseA(bords.bas[k], Math.min(...gen));
      });
      if (!change) break;
      // Deux reprises de suite ne suffisent pas : cette ligne de coupe ne convient pas (une autre sera meilleure).
      if (tour === 2 && !tolerant) return;
    }
    // Repli tolérant : la dernière réécriture des reprises change `decalage` et `yCoupe`, à recalculer (sans effet sinon).
    calculer();
    const haut = hautPour(yCoupe - MARGE_FILET);
    if (!haut) return;
    const score = Math.abs(yCoupe - limite) + 0.01 * decalage;
    if (!meilleur || score < meilleur.score) meilleur = { score, yCoupe, decalage, rep, haut };
  };
  for (const c of candidats) essayer(c);
  if (!meilleur) for (const c of candidats) essayer(c, true);
  if (!meilleur) essayer(Infinity, true);
  const m = meilleur as { score: number; yCoupe: number; decalage: number; rep: Reprise[]; haut: ZoneDemi[] } | null;
  if (!m) return null;
  const bas: ZoneDemi[] = bords.bas.map((g, k) => {
    const r = m.rep[k];
    return { x0: g.x0, x1: g.x1, y: Number.isFinite(r.y) ? r.y + m.decalage : Infinity, rappel: r.rappel, rappelCouleur: r.rappelCouleur, rappelX: r.rappelX };
  });
  return { yCoupe: m.yCoupe, yHaut: Math.max(...m.haut.map((z) => z.y)), decalage: m.decalage, haut: m.haut, bas };
}

/** Bords qu'aucun autre élément ne chevauche : `rects[i]` = [haut, bas] ; garde les bas (ou les hauts) libres. */
export function bordsLibres(rects: Array<[number, number]>, cote: "haut" | "bas"): number[] {
  return bordsParmi(rects, rects, cote);
}

/** Comme `bordsLibres`, pour des candidats pris parmi des obstacles (les rangées dans leur ligne, les libellés de section). */
export function bordsParmi(candidats: Array<[number, number]>, obstacles: Array<[number, number]>, cote: "haut" | "bas"): number[] {
  const res: number[] = [];
  for (const [h, b] of candidats) {
    if (b - h < 1) continue;
    const y = cote === "bas" ? b : h;
    if (obstacles.some(([h2, b2]) => b2 - h2 >= 1 && h2 < y - 0.5 && b2 > y + 0.5)) continue;
    res.push(y);
  }
  return res;
}
