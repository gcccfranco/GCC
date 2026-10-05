import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import { chantsDeLaBibliotheque, trancheDeTempo, type FiltresBibliotheque } from "../src/lib/setlist/bibliotheque";
import { insererA, type FormListItem } from "../src/lib/setlist/formItems";
import type { SongIndexEntry } from "../src/types/song";

// Lot U5 bis (docs/spec-editeur-setlist.md), bibliothèque de l'éditeur :
// recherche titre, pinyin, artiste sans limite de 20, filtres langue, thème,
// tempo (Q11) ; « + » entre deux éléments (Q8). Tranche T1 : la logique pure.
// L'écran vient en T3 et T5.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;

const SANS_FILTRE: FiltresBibliotheque = { recherche: "", langue: "tous", theme: null, tempo: null };

const chant = (slug: string, over: Partial<SongIndexEntry> = {}): SongIndexEntry => ({
  slug,
  title: slug,
  titlePinyin: null,
  artist: "",
  language: "fr",
  originalKey: "C",
  recommendedKey: null,
  tempo: null,
  themes: [],
  youtubeUrl: null,
  spotifyUrl: null,
  appleMusicUrl: null,
  hasJianpu: false,
  jianpuKey: null,
  ...over,
});

const slugs = (songs: SongIndexEntry[]) => songs.map((s) => s.slug);

// ── Tempo ────────────────────────────────────────────────────────────────────

test("(pur) tempo en trois tranches : lent < 90, modéré 90–119, rapide ≥ 120", () => {
  expect(trancheDeTempo(65)).toBe("lent");
  expect(trancheDeTempo(89)).toBe("lent");
  expect(trancheDeTempo(90)).toBe("modere");
  expect(trancheDeTempo(119)).toBe("modere");
  expect(trancheDeTempo(120)).toBe("rapide");
  expect(trancheDeTempo(154)).toBe("rapide");
});

test("(pur) chant sans tempo : aucune tranche", () => {
  expect(trancheDeTempo(null)).toBeNull();
});

// ── Recherche ────────────────────────────────────────────────────────────────

test("(pur) recherche par titre : « Abba » trouve Abba Père en tête", () => {
  expect(slugs(chantsDeLaBibliotheque(INDEX, { ...SANS_FILTRE, recherche: "Abba" }))[0]).toBe("abba-pere");
});

test("(pur) recherche par pinyin : « Yi sheng ai ni » trouve 一生爱你", () => {
  const out = slugs(chantsDeLaBibliotheque(INDEX, { ...SANS_FILTRE, recherche: "Yi sheng ai ni" }));
  expect(out.slice(0, 5)).toContain("一生爱你");
});

test("(pur) recherche par artiste", () => {
  const songs = [chant("abba-pere", { title: "Abba Père", artist: "Auteur Fictif" }), chant("autre", { title: "Autre chant", artist: "Quelqu'un" })];
  expect(slugs(chantsDeLaBibliotheque(songs, { ...SANS_FILTRE, recherche: "Auteur Fictif" }))).toEqual(["abba-pere"]);
});

test("(pur) recherche sans limite de 20 résultats", () => {
  const songs = Array.from({ length: 30 }, (_, i) => chant(`louange-${i}`, { title: `Louange ${i}` }));
  expect(chantsDeLaBibliotheque(songs, { ...SANS_FILTRE, recherche: "Louange" })).toHaveLength(30);
});

test("(pur) sans recherche ni filtre : tous les chants, dans l'ordre de l'index", () => {
  expect(chantsDeLaBibliotheque(INDEX, SANS_FILTRE)).toEqual(INDEX);
});

// ── Filtres ──────────────────────────────────────────────────────────────────

const ABBA = chant("abba-pere", { title: "Abba Père", themes: ["adoration"] });
const YISHENG = chant("一生爱你", { title: "一生爱你", titlePinyin: "Yī shēng ài nǐ", language: "zh", tempo: 65, themes: ["爱慕", "敬拜"] });
const RAPIDE = chant("rapide-fr", { title: "Chant rapide", tempo: 132, themes: ["adoration", "joie"] });
const MODERE_ZH = chant("modere-zh", { title: "中速", language: "zh", tempo: 100, themes: ["adoration"] });
const BIBLIO = [ABBA, YISHENG, RAPIDE, MODERE_ZH];

test("(pur) langue : Tous · FR · 中文", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, SANS_FILTRE))).toEqual(["abba-pere", "一生爱你", "rapide-fr", "modere-zh"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, langue: "fr" }))).toEqual(["abba-pere", "rapide-fr"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, langue: "zh" }))).toEqual(["一生爱你", "modere-zh"]);
});

test("(pur) thème : comme la page Chants, le chant porte le thème", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, theme: "adoration" }))).toEqual([
    "abba-pere",
    "rapide-fr",
    "modere-zh",
  ]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, theme: "joie" }))).toEqual(["rapide-fr"]);
});

test("(pur) tempo : un chant sans tempo disparaît dès qu'un tempo est choisi", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "lent" }))).toEqual(["一生爱你"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "modere" }))).toEqual(["modere-zh"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "rapide" }))).toEqual(["rapide-fr"]);
});

test("(pur) recherche et filtres se cumulent", () => {
  const f: FiltresBibliotheque = { recherche: "Abba", langue: "zh", theme: null, tempo: null };
  expect(chantsDeLaBibliotheque(BIBLIO, f)).toEqual([]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...f, langue: "fr", theme: "adoration" }))).toEqual(["abba-pere"]);
});

// ── Insérer à un endroit ─────────────────────────────────────────────────────

const transition = (uid: string): FormListItem => ({ uid, kind: "transition", text: uid });
const uids = (items: FormListItem[]) => items.map((i) => i.uid);

test("(pur) insérer avant le premier, entre deux, à la fin", () => {
  const items = [transition("a"), transition("b")];
  expect(uids(insererA(items, 0, transition("n")))).toEqual(["n", "a", "b"]);
  expect(uids(insererA(items, 1, transition("n")))).toEqual(["a", "n", "b"]);
  expect(uids(insererA(items, 2, transition("n")))).toEqual(["a", "b", "n"]);
  // La liste d'origine ne bouge pas.
  expect(uids(items)).toEqual(["a", "b"]);
});

test("(pur) deux ajouts à la suite au même « + » gardent leur ordre", () => {
  let items = [transition("a"), transition("b")];
  items = insererA(items, 1, transition("x"));
  items = insererA(items, 2, transition("y"));
  expect(uids(items)).toEqual(["a", "x", "y", "b"]);
});
