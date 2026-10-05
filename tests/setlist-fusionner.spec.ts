import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import {
  fusionner,
  isFormFusion,
  makeDefaultSections,
  type FormFusionItem,
  type FormItem,
  type FormListItem,
} from "../src/lib/setlist/formItems";
import type { SongIndexEntry } from "../src/types/song";

// Lot U5 bis (docs/spec-editeur-setlist.md), « Fusionner » (Q1) : on choisit
// les chants seuls à fusionner ; la fusion prend la place du premier coché,
// dans l'ordre de la setlist. Tranche T1 : la logique pure, extraite de
// `mergeSongs` (SetlistForm). Le choix à l'écran vient en T3 et T4.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
const song = (slug: string) => INDEX.find((s) => s.slug === slug)!;

const chant = (uid: string, slug: string, over: Partial<FormItem> = {}): FormItem => ({
  uid,
  song: song(slug),
  keyOverride: null,
  notes: "",
  sectionItems: makeDefaultSections(song(slug).sections ?? []),
  ...over,
});

const ABBA = chant("a", "abba-pere", { keyOverride: "B" });
const TRANSITION: FormListItem = { uid: "t", kind: "transition", text: "Prière" };
const YISHENG = chant("b", "一生爱你");
const BOUCHE = chant("c", "que-ma-bouche-chante-ta-louange");
const FUSION: FormFusionItem = { uid: "f", kind: "fusion", songs: [chant("f1", "abba-pere"), chant("f2", "一生爱你")], mixedStructure: null };

const uids = (items: FormListItem[]) => items.map((i) => i.uid);

test("(pur) deux chants non voisins : la fusion prend la place du premier, dans l'ordre de la setlist", () => {
  const out = fusionner([ABBA, TRANSITION, YISHENG, BOUCHE], ["c", "a"]);
  expect(out).toHaveLength(3);
  const fusion = out[0];
  expect(isFormFusion(fusion)).toBe(true);
  // Ordre de la setlist, pas celui des cases cochées.
  expect((fusion as FormFusionItem).songs.map((s) => s.uid)).toEqual(["a", "c"]);
  expect(uids(out.slice(1))).toEqual(["t", "b"]);
});

test("(pur) le premier coché plus bas dans la liste : la fusion s'y place", () => {
  const out = fusionner([TRANSITION, ABBA, YISHENG, BOUCHE], ["b", "c"]);
  expect(uids(out).slice(0, 2)).toEqual(["t", "a"]);
  expect(isFormFusion(out[2])).toBe(true);
  expect((out[2] as FormFusionItem).songs.map((s) => s.uid)).toEqual(["b", "c"]);
  expect(out).toHaveLength(3);
});

test("(pur) la fusion est neuve, sans mélange, et chaque chant garde ses réglages", () => {
  const out = fusionner([ABBA, YISHENG], ["a", "b"]);
  const fusion = out[0] as FormFusionItem;
  expect(fusion.kind).toBe("fusion");
  expect(fusion.mixedStructure).toBeNull();
  expect(["a", "b"]).not.toContain(fusion.uid);
  expect(fusion.songs[0]).toBe(ABBA);
  expect(fusion.songs[0].keyOverride).toBe("B");
});

test("(pur) moins de deux chants seuls cochés : rien ne change", () => {
  const items = [ABBA, TRANSITION, YISHENG];
  expect(fusionner(items, ["a"])).toEqual(items);
  expect(fusionner(items, [])).toEqual(items);
});

test("(pur) ni transition ni fusion ne se fusionnent : elles restent à leur place", () => {
  const items = [ABBA, TRANSITION, FUSION, YISHENG];
  // Un seul chant seul parmi les cochés : rien ne change.
  expect(fusionner(items, ["a", "t", "f"])).toEqual(items);
  // Deux chants seuls : eux seuls fusionnent, la transition et la fusion restent.
  const out = fusionner(items, ["a", "t", "f", "b"]);
  expect(isFormFusion(out[0])).toBe(true);
  expect((out[0] as FormFusionItem).songs.map((s) => s.uid)).toEqual(["a", "b"]);
  expect(uids(out.slice(1))).toEqual(["t", "f"]);
});

test("(pur) la liste d'origine ne bouge pas", () => {
  const items = [ABBA, TRANSITION, YISHENG];
  fusionner(items, ["a", "b"]);
  expect(uids(items)).toEqual(["a", "t", "b"]);
});
