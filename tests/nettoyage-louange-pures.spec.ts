import { expect, test } from "@playwright/test";
import type { PerformanceBlock } from "../src/lib/performance/blocks";
import { GRAND_ECRAN, type PerfPage } from "../src/lib/performance/columns";
import {
  NEXT_PILL_RESERVE,
  layoutFeuilleDeRoute,
  lireEcran,
  pageAncree,
  paginer,
  replisStructure,
  sansTransitions,
  splitSheetPages,
} from "../src/lib/performance/pagination";
import type { SectionOccurrence } from "../src/lib/setlist/sectionSteps";

// Lot N5, tranche N5a (docs/spec-nettoyage-code.md) : fonctions pures de pagination sorties de PerformanceMode.
// Spec sans page : elle fige le comportement lu dans le code d'origine (entrées → sorties, identité d'objet).

const bloc = (kind: string, p: Record<string, unknown> = {}) => ({ kind, uid: `${kind}-${Math.random()}`, ...p }) as unknown as PerformanceBlock;
const entete = (position = 1) => bloc("song-header", { position });
const section = (p: Record<string, unknown> = {}, type = "chorus", extra: Record<string, unknown> = {}) =>
  bloc("section", { section: { type, id: "s", ...extra }, ...p });
const traduit = (key: string) => key;

test.describe("sansTransitions", () => {
  const a = { label: "Couplet" } as unknown as SectionOccurrence;
  const b = { label: "Refrain", transition: "Pont vers G" } as unknown as SectionOccurrence;
  test("transitions affichées : même tableau", () => {
    const steps = [a, b];
    expect(sansTransitions(steps, true)).toBe(steps);
  });
  test("transitions coupées : la transition est vidée, le reste garde son identité", () => {
    const steps = [a, b];
    const out = sansTransitions(steps, false);
    expect(out).not.toBe(steps);
    expect(out[0]).toBe(a);
    expect(out[1]).not.toBe(b);
    expect(out[1]).toEqual({ label: "Refrain", transition: "" });
    expect(b.transition).toBe("Pont vers G");
  });
  test("liste vide", () => {
    expect(sansTransitions([], false)).toEqual([]);
  });
});

test.describe("splitSheetPages", () => {
  const kinds = (ks: PerformanceBlock["kind"][]) => (i: number) => ks[i];
  const stub = (appels: number[][]) => (flow: number[]): PerfPage[] => {
    appels.push(flow);
    return [{ header: null, cols: [flow], scale: 1 }];
  };
  test("aucun bloc : rien, et la pagination n'est pas appelée", () => {
    const appels: number[][] = [];
    expect(splitSheetPages([], kinds([]), stub(appels))).toEqual([]);
    expect(appels).toEqual([]);
  });
  test("sans scan : un seul appel avec tout le flux", () => {
    const appels: number[][] = [];
    const out = splitSheetPages([0, 1, 2], kinds(["song-header", "section", "section"]), stub(appels));
    expect(appels).toEqual([[0, 1, 2]]);
    expect(out).toEqual([{ header: null, cols: [[0, 1, 2]], scale: 1 }]);
  });
  test("un scan coupe le flux ; l'en-tête qui le précède part avec lui", () => {
    const appels: number[][] = [];
    const out = splitSheetPages(
      [0, 1, 2, 3, 4, 5],
      kinds(["section", "song-header", "jianpu-sheet", "jianpu-sheet", "song-header", "section"]),
      stub(appels),
    );
    expect(appels).toEqual([[0], [4, 5]]);
    expect(out).toEqual([
      { header: null, cols: [[0]], scale: 1 },
      { header: 1, cols: [[2]], scale: 1, fit: true },
      { header: null, cols: [[3]], scale: 1, fit: true },
      { header: null, cols: [[4, 5]], scale: 1 },
    ]);
  });
  test("un scan seul : une page, sans en-tête ; une section avant lui n'est pas prise pour un en-tête", () => {
    const appels: number[][] = [];
    const out = splitSheetPages([0], kinds(["jianpu-sheet"]), stub(appels));
    expect(appels).toEqual([]);
    expect(out).toEqual([{ header: null, cols: [[0]], scale: 1, fit: true }]);
  });
});

test.describe("layoutFeuilleDeRoute", () => {
  test("tout tient : une page, échelle 1, lignes étirées", () => {
    // room = 400 - 10 - 40 = 350 ; lignes = 300 → 350/300 ≤ 3
    expect(layoutFeuilleDeRoute(0, [1, 2, 3], [10, 100, 100, 100], 400)).toEqual([{ header: 0, cols: [[1, 2, 3]], scale: 1, etire: true }]);
  });
  test("trop haut : coupe entre deux lignes, pages suivantes sans en-tête", () => {
    const pages = layoutFeuilleDeRoute(0, [1, 2, 3, 4], [10, 100, 100, 100, 100], 300);
    expect(pages.map((p) => [p.header, p.cols])).toEqual([[0, [[1, 2]]], [null, [[3, 4]]]]);
    expect(pages.every((p) => p.scale === 1)).toBe(true);
  });
  test("une ligne plus haute que la page reste seule sur sa page", () => {
    expect(layoutFeuilleDeRoute(null, [0, 1], [500, 50], 300).map((p) => p.cols)).toEqual([[[0]], [[1]]]);
  });
  test("peu de lignes sur une grande page : pas d'étirement au-delà de ×3", () => {
    expect(layoutFeuilleDeRoute(null, [0], [50], 1000)).toEqual([{ header: null, cols: [[0]], scale: 1 }]);
  });
  test("aucune ligne : une page vide avec l'en-tête", () => {
    expect(layoutFeuilleDeRoute(0, [], [10], 300)).toEqual([{ header: 0, cols: [[]], scale: 1 }]);
  });
  test("place gardée pour la pastille Suivant", () => {
    expect(NEXT_PILL_RESERVE).toBe(40);
    expect(layoutFeuilleDeRoute(null, [0, 1], [140, 140], 300).length).toBe(2);
  });
});

test.describe("paginer", () => {
  const ctx = (blocks: PerformanceBlock[], heights: number[], p: { viewportH?: number; twoColumns?: boolean; heightsColumn?: number[] } = {}) => {
    const enteteDe = new Map<number, number>();
    let courant = -1;
    blocks.forEach((b, i) => {
      if (b.kind === "song-header") courant = i;
      enteteDe.set(i, courant);
    });
    return { blocks, heights, heightsColumn: p.heightsColumn ?? [], viewportH: p.viewportH ?? 300, twoColumns: p.twoColumns ?? false, enteteDe };
  };
  const chant = () => [entete(), section(), section(), section(), section()];

  test("aucun bloc : aucune page", () => {
    expect(paginer(new Map(), ctx([], []))).toEqual([]);
  });
  test("un seul bloc : une page", () => {
    expect(paginer(new Map(), ctx([entete()], [50]))).toEqual([{ header: null, cols: [[0]], scale: 1 }]);
  });
  test("une colonne : remplissage glouton, un chant par page", () => {
    const blocks = [entete(1), section(), section(), section(), entete(2), section()];
    const out = paginer(new Map(), ctx(blocks, [50, 100, 100, 100, 50, 100]));
    expect(out).toEqual([
      { header: null, cols: [[0, 1, 2]], scale: 1 },
      { header: null, cols: [[3]], scale: 1 },
      { header: null, cols: [[4, 5]], scale: 1 },
    ]);
  });
  test("la réserve du rappel raccourcit les pages 2 et suivantes du chant", () => {
    const blocks = chant();
    const h = [50, 100, 100, 100, 100];
    expect(paginer(new Map(), ctx(blocks, h)).map((p) => p.cols)).toEqual([[[0, 1, 2]], [[3, 4]]]);
    expect(paginer(new Map([[0, 150]]), ctx(blocks, h)).map((p) => p.cols)).toEqual([[[0, 1, 2]], [[3]], [[4]]]);
  });
  test("bloc plus grand que la page : seul sur sa page, réduit", () => {
    const out = paginer(new Map(), ctx([entete(), section()], [50, 600]));
    expect(out).toEqual([
      { header: null, cols: [[0]], scale: 1 },
      { header: null, cols: [[1]], scale: 300 / 600 },
    ]);
  });
  test("scan 简谱 : une page d'écran par page de scan, l'en-tête rattaché à la première", () => {
    const out = paginer(new Map(), ctx([entete(), bloc("jianpu-sheet"), bloc("jianpu-sheet")], [50, 800, 800]));
    expect(out).toEqual([
      { header: 0, cols: [[1]], scale: 1, fit: true },
      { header: null, cols: [[2]], scale: 1, fit: true },
    ]);
  });
  test("deux colonnes : en-tête pleine largeur, colonnes équilibrées", () => {
    const blocks = chant();
    const out = paginer(new Map(), ctx(blocks, [50, 100, 100, 100, 100], { twoColumns: true, heightsColumn: [60, 60, 60, 60, 60] }));
    expect(out).toEqual([{ header: 0, cols: [[1, 2], [3, 4]], scale: 1, twoColumns: true }]);
  });
  test("deux colonnes sans mesure de colonne : pages d'une colonne", () => {
    const out = paginer(new Map(), ctx(chant(), [50, 100, 100, 100, 100], { twoColumns: true }));
    expect(out.map((p) => p.cols)).toEqual([[[0, 1, 2]], [[3, 4]]]);
  });
});

test.describe("pageAncree", () => {
  const pages: PerfPage[] = [
    { header: 0, cols: [[1, 2]], scale: 1 },
    { header: 3, cols: [[4]], scale: 1 },
  ];
  const blocks = [entete(1), section({ occurrenceUids: ["u0"] }), entete(2), section({ occurrenceUids: ["u1"] }), section({ occurrenceUids: ["u2"] })];
  test("mêmes blocs : la page du bloc lu, en-tête compris", () => {
    expect(pageAncree(pages, blocks, 1, { page: 1, block: 4, blocks })).toBe(1);
    expect(pageAncree(pages, blocks, 0, { page: 0, block: 2, blocks })).toBe(0);
    expect(pageAncree(pages, blocks, 1, { page: 1, block: 3, blocks })).toBe(1);
  });
  test("blocs reconstruits : retrouvés par l'ancre (section du même chant, sinon son en-tête)", () => {
    const lus: PerformanceBlock[] = [];
    expect(pageAncree(pages, blocks, 1, { page: 1, block: 0, blocks: lus, ancre: { position: 2, rang: 0, uids: ["u2"] } })).toBe(1);
    expect(pageAncree(pages, blocks, 0, { page: 0, block: 0, blocks: lus, ancre: { position: 1, rang: 0, uids: null } })).toBe(0);
  });
  test("blocs reconstruits sans ancre, page tournée ou bloc inconnu : la page d'avant, ramenée dans les bornes", () => {
    expect(pageAncree(pages, blocks, 1, { page: 1, block: 4, blocks: [] })).toBe(1);
    expect(pageAncree(pages, blocks, 5, { page: 5, block: 4, blocks: [] })).toBe(1);
    expect(pageAncree(pages, blocks, 0, { page: 1, block: 4, blocks })).toBe(0);
    expect(pageAncree(pages, blocks, 1, { page: 1, block: 99, blocks })).toBe(1);
    expect(pageAncree(pages, blocks, 1, { page: 1, block: undefined, blocks })).toBe(1);
  });
  test("aucune page : 0", () => {
    expect(pageAncree([], blocks, 3, { page: 3, block: 1, blocks })).toBe(0);
  });
});

test.describe("replisStructure", () => {
  const res = (blocks: PerformanceBlock[], structure = true, transitions = true) => {
    const r = replisStructure(blocks, structure, transitions, traduit);
    return { count: [...r.repeatCount], hidden: [...r.repeatHidden] };
  };
  test("hors vue structure : rien de replié", () => {
    expect(res([section(), section()], false)).toEqual({ count: [], hidden: [] });
  });
  test("deux passages identiques : le second se replie sur le premier", () => {
    expect(res([section(), section()])).toEqual({ count: [[0, 2]], hidden: [1] });
  });
  test("trois passages, puis une autre section", () => {
    expect(res([section(), section(), section(), section({}, "verse")])).toEqual({ count: [[0, 3]], hidden: [1, 2] });
  });
  test("les reprises déjà comptées s'additionnent", () => {
    expect(res([section({ repeat: 2 }), section({ repeat: 3 })])).toEqual({ count: [[0, 5]], hidden: [1] });
  });
  test("note ou nuance différente : pas un même passage", () => {
    expect(res([section({ note: "x" }), section({ note: "y" })])).toEqual({ count: [], hidden: [] });
    expect(res([section({ nuance: { tags: ["f"] } }), section()])).toEqual({ count: [], hidden: [] });
    expect(res([section({ keyChange: "G" }), section()])).toEqual({ count: [], hidden: [] });
  });
  test("transition masquée : ne sépare pas ; affichée : sépare", () => {
    const b = [section(), bloc("transition-intra"), section()];
    expect(res(b, true, false)).toEqual({ count: [[0, 2]], hidden: [2] });
    expect(res(b, true, true)).toEqual({ count: [], hidden: [] });
  });
  test("un en-tête de chant ou une transition entre chants sépare", () => {
    expect(res([section(), entete(), section()], true, false)).toEqual({ count: [], hidden: [] });
    expect(res([section(), bloc("transition-inter"), section()], true, false)).toEqual({ count: [], hidden: [] });
  });
  test("Dernière phrase rejouée de suite : repliée quelle que soit la nuance, mais pas si l'id diffère", () => {
    const dp = (id: string, p: Record<string, unknown> = {}) => section(p, "other", { id, name: "Dernière phrase – R" });
    expect(res([dp("d1"), dp("d1", { nuance: { tags: ["f"] } })])).toEqual({ count: [[0, 2]], hidden: [1] });
    expect(res([dp("d1"), dp("d2")])).toEqual({ count: [], hidden: [] });
    expect(res([dp("d1"), section()])).toEqual({ count: [], hidden: [] });
    expect(res([section(), dp("d1")])).toEqual({ count: [], hidden: [] });
  });
});

test.describe("lireEcran", () => {
  const g = globalThis as Record<string, unknown>;
  const sauve = g.window;
  test.afterEach(() => {
    g.window = sauve;
  });
  test("sans fenêtre (serveur) : valeurs neutres", () => {
    delete g.window;
    expect(lireEcran()).toEqual({ grand: false, largeur: 0, hauteur: 0, tabletteVerticale: false });
  });
  test("tablette tactile en portrait", () => {
    g.window = { innerWidth: 800, innerHeight: 1200, matchMedia: (q: string) => ({ matches: q === "(pointer: coarse)" }) };
    expect(lireEcran()).toEqual({ grand: false, largeur: 800, hauteur: 1200, tabletteVerticale: true });
  });
  test("ordinateur : grand écran, souris", () => {
    g.window = { innerWidth: 1440, innerHeight: 900, matchMedia: (q: string) => ({ matches: q === GRAND_ECRAN }) };
    expect(lireEcran()).toEqual({ grand: true, largeur: 1440, hauteur: 900, tabletteVerticale: false });
  });
});
