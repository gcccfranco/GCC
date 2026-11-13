import { expect, test } from "@playwright/test";
import { adresseVue, lireAdresse, poser, surLaSetlist } from "../src/lib/setlist/adresseVue";
import {
  withChosenItem,
  withMineStructureItem,
  withMyJianpuItem,
  type SongVersionView,
} from "../src/lib/setlist/versionChoice";
import type { VersionItem } from "../src/types/setlistVersions";
import type { SetlistItem } from "../src/types/setList";

// Lot N4, tranche N4b (docs/spec-nettoyage-code.md) : fonctions pures sorties de SetlistDetailClient. Spec sans page :
// elle fige le comportement lu dans le code d'origine (entrées → sorties, identité d'objet quand rien ne change).

const item = (p: Partial<SetlistItem> = {}) => ({ songSlug: "chant-a", sectionNotes: { x: "n" }, ...p }) as unknown as SetlistItem;
const mine = (p: Partial<VersionItem>) => ({ "chant-a": p as VersionItem });
const vue = (p: Partial<SongVersionView>) => p as SongVersionView;
const retouches = { changed: { a: "G" } } as never;

test.describe("adresseVue", () => {
  const g = globalThis as Record<string, unknown>;
  const sauve = { window: g.window, document: g.document, raf: g.requestAnimationFrame };
  test.afterEach(() => {
    g.window = sauve.window;
    g.document = sauve.document;
    g.requestAnimationFrame = sauve.raf;
  });
  const fenetre = (pathname: string, search = "") => {
    g.window = { location: { pathname, search }, scrollY: 0 };
  };

  test("adresseVue", () => {
    fenetre("/setlists/s1");
    expect(adresseVue(null)).toBe("/setlists/s1");
    expect(adresseVue(3)).toBe("/setlists/s1?vue=partitions&chant=3");
  });
  test("surLaSetlist", () => {
    fenetre("/setlists/s1/");
    expect(surLaSetlist("s1")).toBe(true);
    expect(surLaSetlist("s2")).toBe(false);
    fenetre("/songs/chant-a");
    expect(surLaSetlist("s1")).toBe(false);
  });
  test("lireAdresse", () => {
    fenetre("/setlists/s1", "");
    expect(lireAdresse()).toBeNull();
    fenetre("/setlists/s1", "?vue=liste&chant=2");
    expect(lireAdresse()).toBeNull();
    fenetre("/setlists/s1", "?vue=partitions");
    expect(lireAdresse()).toEqual({ chant: null });
    fenetre("/setlists/s1", "?vue=partitions&chant=4");
    expect(lireAdresse()).toEqual({ chant: 4 });
    fenetre("/setlists/s1", "?vue=partitions&chant=0");
    expect(lireAdresse()).toEqual({ chant: null });
    fenetre("/setlists/s1", "?vue=partitions&chant=2.5");
    expect(lireAdresse()).toEqual({ chant: null });
  });
  test("poser", () => {
    const attrs = new Set<string>();
    const appels: unknown[] = [];
    const files: (() => void)[] = [];
    g.document = {
      documentElement: {
        setAttribute: (n: string) => attrs.add(n),
        removeAttribute: (n: string) => attrs.delete(n),
      },
    };
    g.window = { scrollY: 42, scrollTo: (o: unknown) => appels.push(o) };
    g.requestAnimationFrame = (f: () => void) => files.push(f);
    expect(poser(-5.4)).toBe(42);
    expect(appels).toEqual([{ top: 0, behavior: "instant" }]);
    expect(attrs.has("data-nav-lock")).toBe(true);
    files.shift()!();
    files.shift()!();
    expect(attrs.has("data-nav-lock")).toBe(false);
    poser(100.6);
    expect(appels[1]).toEqual({ top: 101, behavior: "instant" });
  });
});

test.describe("choix de version", () => {
  test("withMyJianpuItem", () => {
    const it = item();
    expect(withMyJianpuItem(it, undefined)).toBe(it);
    expect(withMyJianpuItem(it, mine({}))).toBe(it);
    expect(withMyJianpuItem(it, mine({ jianpuChords: {} as never }))).toBe(it);
    const r = withMyJianpuItem(it, mine({ jianpuChords: retouches }));
    expect(r).not.toBe(it);
    expect(r).toEqual({ ...it, jianpuChords: retouches });
  });

  test("withChosenItem", () => {
    const it = item();
    expect(withChosenItem(it, undefined, undefined)).toBe(it);
    expect(withChosenItem(it, vue({ content: null }), mine({}))).toBe(it);
    expect(withChosenItem(it, vue({ content: "choisie" }), undefined)).toEqual({ ...it, contentOverride: "choisie" });
    // le contenu de la vue prime ; mes retouches 简谱 s'ajoutent
    expect(withChosenItem(it, vue({ content: "choisie" }), mine({ content: "mienne", jianpuChords: retouches }))).toEqual({
      ...it,
      contentOverride: "choisie",
      jianpuChords: retouches,
    });
  });

  test("withMineStructureItem", () => {
    const it = item({ structureOverride: ["v1"], sectionTransitions: { v1: "t" }, sectionNuances: { v1: "p" } as never });
    expect(withMineStructureItem(it, undefined, undefined)).toBe(it);
    expect(withMineStructureItem(it, vue({ bodyStructure: null }), mine({ structure: ["c"] }))).toBe(it);
    expect(withMineStructureItem(it, vue({ bodyStructure: [] }), mine({ structure: ["c"] }))).toBe(it);
    // je garde la structure de la présidence (pas la mienne) : seules les sections retouchées entrent
    expect(withMineStructureItem(it, vue({ bodyStructure: ["v1", "v1-copie"] }), mine({}))).toEqual({
      ...it,
      structureOverride: ["v1", "v1-copie"],
    });
    // j'ai ma structure : les réglages d'occurrence de la présidence tombent
    expect(withMineStructureItem(it, vue({ bodyStructure: ["c", "v1"] }), mine({ structure: ["c", "v1"] }))).toEqual({
      ...it,
      structureOverride: ["c", "v1"],
      sectionNotes: {},
      sectionTransitions: {},
      sectionNuances: {},
    });
    // structure à moi vide : comme si je n'en avais pas
    expect(withMineStructureItem(it, vue({ bodyStructure: ["c"] }), mine({ structure: [] }))).toEqual({ ...it, structureOverride: ["c"] });
  });
});
