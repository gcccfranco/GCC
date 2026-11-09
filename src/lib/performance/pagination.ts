import type { PerformanceBlock, SectionBlock } from "@/lib/performance/blocks";
import { retrouverAncre, type AncreLecture } from "@/lib/performance/blocks";
import { GRAND_ECRAN, pagesUneColonne, paginateColumns, type PerfPage } from "@/lib/performance/columns";
import { estTabletteVerticale } from "@/lib/performance/gestes";
import { formatSectionName } from "@/lib/chordpro/parser";
import { isRepeatOf, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { isDp } from "@/lib/setlist/dp";

// Fonctions pures de la pagination du mode louange, sorties de PerformanceMode.tsx (lot N, N5a).
// Pages en une et en deux colonnes (`PerfPage`) : columns.ts.

/** « Transitions » coupé : le bandeau n'en montre plus (les notes restent). */
export function sansTransitions(steps: SectionOccurrence[], showTransitions: boolean): SectionOccurrence[] {
  return showTransitions ? steps : steps.map((s) => (s.transition ? { ...s, transition: "" } : s));
}

// Une page de scan 简谱 = une page d'écran, avec l'en-tête du chant s'il la
// précède immédiatement. Le reste des blocs est paginé normalement autour.
export function splitSheetPages(
  idxs: number[],
  kindOf: (i: number) => PerformanceBlock["kind"] | undefined,
  paginate: (flow: number[]) => PerfPage[],
): PerfPage[] {
  const out: PerfPage[] = [];
  let flow: number[] = [];
  const flush = () => {
    if (flow.length > 0) out.push(...paginate(flow));
    flow = [];
  };
  for (const i of idxs) {
    if (kindOf(i) !== "jianpu-sheet") {
      flow.push(i);
      continue;
    }
    // L'en-tête juste avant la partition part avec elle. Il n'est pas rendu
    // (la page de scan a son en-tête d'une ligne) mais reste rattaché à la
    // page : le sommaire, la progression dans le chant et le panneau capo
    // repèrent le chant courant par l'indice de son en-tête.
    const last = flow[flow.length - 1];
    const header = last !== undefined && kindOf(last) === "song-header" ? flow.pop()! : null;
    flush();
    out.push({ header, cols: [[i]], scale: 1, fit: true });
  }
  flush();
  return out;
}

// Vue structure : place gardée en bas pour la pastille « Suivant : … », qui recouvrirait la dernière ligne.
export const NEXT_PILL_RESERVE = 40;

/** Les lignes d'une page s'étirent jusqu'à remplir l'écran, sans dépasser ce multiple de leur hauteur naturelle. */
export const ETIREMENT_MAX = 3;

/** Le contenu des lignes (repère, nom, note, pastille) grossit avec la place libre, jusqu'à ce facteur ; le reste de
 *  la place s'ajoute aux espaces. */
export const ECHELLE_MAX = 1.6;

/** Poids d'une ligne de la feuille de route : son nombre de lignes de paroles (1 au moins, 6 au plus), pour garder
 *  l'indication de durée d'une section (une section sans paroles pèse 1). */
export function poidsSection(block: SectionBlock): number {
  const n = block.section.lines.filter((l) => l.tokens.some((tk) => tk.type === "lyric" && tk.value.trim() !== "")).length;
  return Math.min(6, Math.max(1, n));
}

/** Vue structure, feuille de route du batteur (FS-D) : une colonne, échelle 1, une ligne par section à sa hauteur
 *  naturelle mesurée. Si l'en-tête, toutes les lignes et la place de la pastille « Suivant » tiennent, une page ;
 *  sinon on coupe entre deux lignes (jamais au milieu d'une), les pages suivantes sans en-tête. Une page dont les
 *  lignes tiennent à leur hauteur naturelle (`naturel`, somme à l'échelle 1) porte `etire` : l'écran grossit d'abord
 *  leur contenu (jusqu'à ECHELLE_MAX), puis étire les espaces, au plus jusqu'à ETIREMENT_MAX fois `naturel`. */
export function layoutFeuilleDeRoute(headerIdx: number | null, body: number[], heights: number[], viewportH: number): PerfPage[] {
  const headerH = headerIdx != null ? heights[headerIdx] : 0;
  const pages: PerfPage[] = [];
  let ligne: number[] = [];
  let cumul = 0;
  let enTete = headerIdx;
  let room = Math.max(1, viewportH - headerH - NEXT_PILL_RESERVE);
  const fermer = () => {
    const etire = cumul > 0 && room / cumul >= 1;
    pages.push({ header: enTete, cols: [ligne], scale: 1, ...(etire ? { etire, naturel: cumul } : null) });
    ligne = [];
    cumul = 0;
    enTete = null;
    room = Math.max(1, viewportH - NEXT_PILL_RESERVE);
  };
  for (const i of body) {
    if (ligne.length > 0 && cumul + heights[i] > room) fermer();
    ligne.push(i);
    cumul += heights[i];
  }
  fermer();
  return pages;
}

/** Mesures et réglages dont dépend la pagination du flux normal (une ou deux colonnes). */
type ContextePagination = {
  blocks: PerformanceBlock[];
  heights: number[];
  heightsColumn: number[];
  viewportH: number;
  twoColumns: boolean;
  /** Indice du bloc → indice de l'en-tête de son chant (-1 avant le premier). */
  enteteDe: Map<number, number>;
  /** Hauteur de la pastille « Ensuite » comptée dans la dernière page d'un chant suivi d'un autre (absent : 0). */
  pastille?: number;
};

/** Pagine tous les blocs hors vue structure ; `reservesDe` : place gardée en haut des pages 2 et suivantes, par en-tête. */
export function paginer(reservesDe: Map<number, number>, ctx: ContextePagination): PerfPage[] {
  const { blocks, heights, heightsColumn, viewportH, twoColumns, enteteDe, pastille = 0 } = ctx;
  const dernierEntete = blocks.reduce((m, b, i) => (b.kind === "song-header" ? i : m), -1);
  const kindOf = (i: number) => blocks[i]?.kind;
  const all = blocks.map((_, i) => i);
  const breakBefore = new Set(blocks.flatMap((b, i) => (b.kind === "song-header" ? [i] : [])));
  return splitSheetPages(all, kindOf, (flow) => {
    // Chant par chant (chacun ouvre une page) : chacun garde la réserve de son rappel.
    const songs: number[][] = [];
    for (const i of flow) {
      if (kindOf(i) === "song-header" || songs.length === 0) songs.push([]);
      songs[songs.length - 1].push(i);
    }
    return songs.flatMap((song) => {
      const reserveSuite = reservesDe.get(enteteDe.get(song[0]) ?? -1) ?? 0;
      // Chant suivi d'un autre : sa dernière page porte la pastille « Ensuite » dans le flux.
      const placePastille = (enteteDe.get(song[0]) ?? -1) < dernierEntete ? pastille : 0;
      if (!twoColumns) return pagesUneColonne(song, heights, viewportH, breakBefore, reserveSuite, placePastille);
      const header = kindOf(song[0]) === "song-header" ? song[0] : null;
      return paginateColumns({
        flow: header != null ? song.slice(1) : song,
        header,
        heightsFull: heights,
        heightsColumn,
        pageHeight: viewportH,
        reserveSuite,
        pastille: placePastille,
      });
    });
  });
}

/** Page à garder à l'écran après une nouvelle mise en page : celle qui contient le premier bloc de la page lue
 *  (`lecture`), ou, si les blocs ont été reconstruits, celui que retrouve l'ancre ; sinon la page `prev` ramenée
 *  dans les bornes. */
export function pageAncree(
  computed: PerfPage[],
  blocks: PerformanceBlock[],
  prev: number,
  lecture: { page: number; block: number | undefined; blocks?: PerformanceBlock[]; ancre?: AncreLecture | null },
): number {
  const pageDe = (i: number) => computed.findIndex((p) => p.header === i || p.cols.some((c) => c.includes(i)));
  const { page, block, blocks: lus, ancre } = lecture;
  let anchored = -1;
  if (page === prev && block !== undefined) {
    if (lus === blocks) anchored = pageDe(block);
    else if (ancre) {
      for (const i of retrouverAncre(blocks, ancre)) {
        anchored = pageDe(i);
        if (anchored >= 0) break;
      }
    }
  }
  return anchored >= 0 ? anchored : Math.min(prev, Math.max(0, computed.length - 1));
}

/** Vue structure : passages consécutifs identiques repliés sur le premier
 *  (« Refrain ×2 ») ; les suivants ne sont ni rendus ni comptés en hauteur.
 *  Une transition masquée ne sépare pas deux passages. */
export function replisStructure(
  blocks: PerformanceBlock[],
  structureMode: boolean,
  showTransitions: boolean,
  t: Parameters<typeof formatSectionName>[1] & ((key: string, options?: { defaultValue?: string }) => string),
): { repeatCount: Map<number, number>; repeatHidden: Set<number> } {
  const repeatCount = new Map<number, number>();
  const repeatHidden = new Set<number>();
  if (!structureMode) return { repeatCount, repeatHidden };
  const step = (b: SectionBlock) => ({
    label: formatSectionName(b.section, t),
    note: b.note,
    nuance: b.nuance,
    targetKey: b.keyChange,
  });
  let lead = -1;
  blocks.forEach((b, i) => {
    if (b.kind === "transition-intra" && !showTransitions) return;
    if (b.kind !== "section") {
      lead = -1;
      return;
    }
    const first = blocks[lead];
    // Un Dp rejoué de suite (même section) se replie quelle que soit sa nuance.
    const dpRepete = first?.kind === "section" && isDp(b.section) && isDp(first.section) && first.section.id === b.section.id;
    if (first?.kind === "section" && !isDp(b.section) && !isDp(first.section) ? isRepeatOf(step(first), step(b)) : dpRepete) {
      repeatCount.set(lead, (repeatCount.get(lead) ?? (first as SectionBlock).repeat ?? 1) + (b.repeat ?? 1));
      repeatHidden.add(i);
    } else {
      lead = i;
    }
  });
  return { repeatCount, repeatHidden };
}

/** Disposition et largeur de la fenêtre : le mode louange est plein écran. */
export function lireEcran(): { grand: boolean; largeur: number; hauteur: number; tabletteVerticale: boolean } {
  if (typeof window === "undefined") return { grand: false, largeur: 0, hauteur: 0, tabletteVerticale: false };
  const grossier = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return {
    grand: window.matchMedia(GRAND_ECRAN).matches,
    largeur: window.innerWidth,
    hauteur: window.innerHeight,
    tabletteVerticale: estTabletteVerticale(window.innerWidth, window.innerHeight, grossier),
  };
}
