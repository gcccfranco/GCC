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

/** Une section d'un groupe : bords haut et bas mesurés à l'écran (px) et son nom, pour le rappel de la moitié basse. */
export type SectionDemi = { top: number; bottom: number; nom: string };

/** Un groupe de blocs superposés : l'en-tête du chant (pleine largeur) ou une colonne de la page. Bords mesurés à l'écran
 *  (px) sur le rendu : `blocs` = bords bas (page suivante, en haut) ou bords hauts (page en cours, en bas) des blocs
 *  qu'aucun autre bloc ne chevauche ; `lignes` = les mêmes bords pour les rangées de vers (accords + paroles, ou caractères
 *  + pinyin) et, en bas seulement, le haut du libellé de chaque section : jamais au milieu d'une rangée. `x0`/`x1` bornent
 *  le groupe, `top` est son bord haut. */
export type GroupeDemi = { x0: number; x1: number; top: number; blocs: number[]; lignes: number[]; sections: SectionDemi[] };
/** `haut` : groupes du rendu de la page suivante ; `bas` : groupes du rendu de la page en cours. */
export type BordsDemi = { haut: GroupeDemi[]; bas: GroupeDemi[] };

/** Zone visible d'un groupe : `y` = bord bas (en haut) ou bord haut (en bas) de ce qui se montre, `Infinity` si rien.
 *  `rappel` : nom de la section que la moitié basse reprend en son milieu (à rappeler au-dessus de sa première rangée). */
export type ZoneDemi = { x0: number; x1: number; y: number; rappel?: string };

/** Part de la hauteur de lecture au-delà de laquelle un vide au-dessus du filet fait préférer le bord de ligne au bord de bloc. */
const VIDE_MAX = 0.15;

/** Coupe pour une limite donnée (px écran) ; `hauteur` = hauteur de lecture (px), `reserve` = place (px) du rappel de section
 *  au-dessus de la reprise de la moitié basse.
 *  En haut chaque colonne se coupe au dernier bord bas de bloc ≤ limite ; s'il laisse plus de 15 % de `hauteur` vide au-dessus
 *  du filet (ou n'existe pas), au dernier bord bas de rangée ≤ limite. `yCoupe` = le plus bas de ces bords (le filet).
 *  En bas chaque groupe reprend au premier bord de rangée, de section ou de bloc ≥ `yCoupe` : rien de ce qui est sous la coupe
 *  n'y manque, et le blanc entre le filet et la reprise ne dépasse pas une rangée. Quand la reprise tombe au milieu d'une
 *  section, `reserve` px la séparent du filet pour son rappel (la coupe remonte d'autant). Nul si rien ne tient au-dessus de
 *  la limite : pas de demi-page. */
export function choisirCoupe(bords: BordsDemi, limite: number, hauteur: number = limite * 2, reserve = 0): { yCoupe: number; haut: ZoneDemi[]; bas: ZoneDemi[] } | null {
  let lim = limite;
  for (let tour = 0; tour < 60; tour++) {
    const l = lim;
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
    if (!bords.haut.some((g, i) => haut[i].y > g.top)) return null;
    const yCoupe = Math.max(...haut.map((z) => z.y));
    const bas: ZoneDemi[] = bords.bas.map((g) => {
      const tous = [...g.blocs, ...g.lignes].filter((y) => y >= yCoupe - 0.5);
      const y = tous.length ? Math.min(...tous) : Infinity;
      const s = Number.isFinite(y) ? g.sections.find((e) => e.top < y - 0.5 && e.bottom > y + 0.5) : undefined;
      return { x0: g.x0, x1: g.x1, y, rappel: s?.nom || undefined };
    });
    // Le rappel de section a besoin de `reserve` px entre le filet et la reprise : sinon la coupe remonte.
    const serre = bas.filter((z) => z.rappel && z.y - yCoupe < reserve).map((z) => z.y - reserve);
    if (serre.length === 0) return { yCoupe, haut, bas };
    lim = Math.min(...serre);
  }
  return null;
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
