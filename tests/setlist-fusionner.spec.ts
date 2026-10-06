import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, boutonTonalite, deuxColonnesAttendues, groupeTonalites, listeCourte, reglerElement, volet } from "./helpers/editeurSetlist";
import type { SetlistItem } from "../src/types/setList";
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
// `mergeSongs` (SetlistForm). Le choix à l'écran : T3 (volet) et T4 (feuille).

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

// ─── Tranches T3 et T4 : le choix à l'écran ──────────────────────────────────
// « Fusionner » est dans les réglages du chant ; il ouvre, dans le volet (ou la
// même feuille sur téléphone et tablette en portrait), le choix des autres chants
// seuls. Les numéros sont ceux des chants et des fusions (une transition n'en a
// pas, comme la planche).

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Musicienne",
  lastName: "Test",
  planningName: "Musicienne T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-fusionner";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

const ligne = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const FUSION_EN_BASE = {
  ...ligne({ songSlug: "", position: 4, showPinyin: false }),
  type: "fusion",
  fusionSongs: [
    { songSlug: "je-reviens-au-coeur", keyOverride: null, structureOverride: null, sectionNotes: {} },
    { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
  mixedStructure: null,
};

const SETLIST = {
  title: "Culte Francophone 18/10",
  leader: "Présidence A",
  category: "Culte Francophone",
  date: "2026-10-18",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    ligne({ songSlug: "que-ma-bouche-chante-ta-louange", position: 1, keyOverride: "D" }),
    { ...ligne({ songSlug: "", position: 2 }), type: "transition", transitionText: "Prière" },
    ligne({ songSlug: "一生爱你", position: 3, notes: "Lent" }),
    FUSION_EN_BASE,
  ],
};

type Enregistre = SetlistItem & { fusionSongs?: { songSlug: string; keyOverride: string | null }[] };
const itemsEnBase = (db: FakeDb) => (db.doc(SETLIST_DOC)?.items ?? []) as Enregistre[];

async function ouvrir(page: Page, _testInfo: TestInfo, doc: Record<string, unknown> = SETLIST) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: doc }, `/setlists/${SETLIST_ID}/edit`);
  await attendreEditeur(page, "一生爱你");
  return db;
}

const choix = (page: Page) => volet(page).getByRole("group", { name: /^Fusionner .* avec…$/ });

test("« Fusionner » ouvre le choix, chant de départ coché en tête ; ni transition ni fusion proposées", async ({ page }, testInfo) => {
  await ouvrir(page, testInfo);
  await reglerElement(page, "一生爱你");
  await volet(page).getByRole("button", { name: "Fusionner", exact: true }).click();
  await expect(volet(page).getByRole("heading", { name: "Fusionner 一生爱你 avec…" })).toBeVisible();
  const cases = choix(page).getByRole("checkbox");
  await expect(cases).toHaveCount(2);
  await expect(cases.nth(0)).toHaveAccessibleName(/一生爱你/);
  await expect(cases.nth(0)).toBeChecked();
  await expect(cases.nth(1)).toHaveAccessibleName(/Que ma bouche chante ta louange/);
  await expect(cases.nth(1)).not.toBeChecked();
  // La ligne de la question 7 : ce qu'une fusion ne garde pas — accords retouchés sur un scan compris
  // (`FusionSong` n'a pas `jianpuChords` : à l'enregistrement, ils sont perdus).
  await expect(volet(page)).toContainText(
    "la note du chant, les transitions de section, le choix 简谱 et les accords retouchés sur le scan 简谱 ne sont pas gardés",
  );
  // Inactif tant qu'aucun autre chant n'est coché.
  await expect(volet(page).getByRole("button", { name: /^Fusionner \(/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath(`fusionner-choix-${testInfo.project.name}.png`) });
});

test("deux chants non voisins — la fusion prend la place du premier, dans l'ordre de la setlist", async ({ page }, testInfo) => {
  const db = await ouvrir(page, testInfo);
  await reglerElement(page, "一生爱你");
  await volet(page).getByRole("button", { name: "Fusionner", exact: true }).click();
  await choix(page).getByRole("checkbox", { name: /Que ma bouche/ }).check();
  await volet(page).getByRole("button", { name: "Fusionner (2)" }).click();

  await expect
    .poll(() => itemsEnBase(db).map((i) => (i.type === "fusion" ? i.fusionSongs!.map((s) => s.songSlug).join("+") : i.type ?? i.songSlug)), { timeout: 10_000 })
    .toEqual(["que-ma-bouche-chante-ta-louange+一生爱你", "transition", "je-reviens-au-coeur+abba-pere"]);
  // La fusion est choisie, ses réglages s'ouvrent ; la tonalité de chaque chant reste.
  await expect(volet(page).getByRole("heading", { name: "1 · Que ma bouche chante ta louange / 一生爱你" })).toBeVisible();
  if (deuxColonnesAttendues(testInfo)) {
    await expect(listeCourte(page).getByRole("button", { name: "Que ma bouche chante ta louange / 一生爱你", exact: true })).toHaveAttribute("aria-current", "true");
  }
  expect(itemsEnBase(db)[0].fusionSongs!.map((s) => s.keyOverride)).toEqual(["D", null]);
});

test("« Annuler » ne change rien", async ({ page }, testInfo) => {
  const db = await ouvrir(page, testInfo);
  await reglerElement(page, "一生爱你");
  await volet(page).getByRole("button", { name: "Fusionner", exact: true }).click();
  await choix(page).getByRole("checkbox", { name: /Que ma bouche/ }).check();
  await volet(page).getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(volet(page).getByRole("heading", { name: "2 · 一生爱你" })).toBeVisible();
  await expect(listeCourte(page).locator("[data-element]")).toHaveCount(4);
  await page.waitForTimeout(2_500);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);
});

test("réglages d'une fusion — tonalité par chant, « Mélanger », « Défusionner »", async ({ page }, testInfo) => {
  const db = await ouvrir(page, testInfo);
  await reglerElement(page, "Je reviens au cœur / Abba Père");
  await expect(volet(page).getByRole("heading", { name: "3 · Je reviens au cœur / Abba Père" })).toBeVisible();
  await boutonTonalite(groupeTonalites(volet(page), "Abba Père"), "B").click();
  await expect.poll(() => itemsEnBase(db)[3]?.fusionSongs?.map((s) => s.keyOverride), { timeout: 10_000 }).toEqual([null, "B"]);

  await volet(page).getByRole("button", { name: "Mélanger" }).click();
  await expect(volet(page).getByText("Structure mélangée")).toBeVisible();
  await expect.poll(() => (itemsEnBase(db)[3]?.mixedStructure ?? []).length, { timeout: 10_000 }).toBeGreaterThan(0);

  await volet(page).getByRole("button", { name: "Défusionner" }).click();
  await expect(listeCourte(page).locator("[data-element]")).toHaveCount(5);
  await expect.poll(() => itemsEnBase(db).map((i) => i.songSlug), { timeout: 10_000 }).toEqual([
    "que-ma-bouche-chante-ta-louange", "", "一生爱你", "je-reviens-au-coeur", "abba-pere",
  ]);
});

test("« Fusionner » absent quand il ne reste aucun autre chant seul ; plus aucun « Sélectionner »", async ({ page }, testInfo) => {
  await ouvrir(page, testInfo, { ...SETLIST, items: [SETLIST.items[1], SETLIST.items[2], FUSION_EN_BASE] });
  await reglerElement(page, "一生爱你");
  await expect(volet(page).getByRole("heading", { name: "1 · 一生爱你" })).toBeVisible();
  await expect(volet(page).getByRole("button", { name: "Fusionner", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
});

test("petits écrans : le choix remplace le contenu de la même feuille ; « ‹ Retour » rend les réglages du chant", async ({ page }, testInfo) => {
  test.skip(deuxColonnesAttendues(testInfo), "téléphone et tablette en portrait seulement : feuilles");
  await ouvrir(page, testInfo);
  await reglerElement(page, "一生爱你");
  await volet(page).getByRole("button", { name: "Fusionner", exact: true }).click();
  // Une seule feuille, titrée par la question.
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Fusionner 一生爱你 avec…" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath(`fusionner-feuille-${testInfo.project.name}.png`) });
  await volet(page).getByRole("button", { name: "Retour", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "2 · 一生爱你" })).toBeVisible();
});
