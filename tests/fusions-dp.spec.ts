import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, reglerElement } from "./helpers/editeurSetlist";
import { enDeuxVolets, ouvrirPartitions } from "./helpers/setlist";
import { withoutLastPhrases } from "../src/lib/setlist/lastPhrase";
import { diffSetlists } from "../src/lib/setlist/history";
import { playedSections } from "../src/lib/setlist/playedSections";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { buildSetlistItems } from "../src/lib/setlist/buildSetlistItems";
import type { FormItem } from "../src/lib/setlist/formItems";
import type { SongIndexEntry } from "../src/types/song";

// Fusions et Dernière phrase (docs/spec-fusions-dp.md), retours de Timothée du
// 27/09/2026, go du 01/10/2026. Chant FR (Abba Père, en A) + chant ZH (一生爱你,
// en E), comme les autres specs de setlist.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-fusions-dp";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const YISHENG = readFileSync("content/songs/一生爱你.cho", "utf8");

/** Abba Père a six sections : la Dp ajoutée à la suite est la septième. Format
 *  d'avant le 26/09 (`start_of_other`), puis celui de David (`start_of_Dp`). */
const DP_ABBA_ANCIEN = `${ABBA.trimEnd()}\n\n{start_of_other: Dernière phrase – R}\nAbba [D]Père, je [E]suis à To[F#m]i, Abba [Bm]Père, je [E]suis à Toi.[(A)]\n{end_of_other}\n`;
const DP_ABBA = `${ABBA.trimEnd()}\n\n{start_of_Dp: Dernière phrase – R}\nAbba [D]Père, je [E]suis à To[F#m]i, Abba [Bm]Père, je [E]suis à Toi.[(A)]\n{end_of_Dp}\n`;

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const setlist = (items: Record<string, unknown>[]) => ({
  title: "Culte du 4 octobre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items,
});

async function ouvrir(page: Page, data: Record<string, unknown>, to = `/setlists/${SETLIST_ID}`) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  return signInAs(page, MUSICIEN, { [SETLIST_DOC]: data }, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

// ── T1 : « Dp » dans la liste ───────────────────────────────────────────────

test("historique : une Dernière phrase se reconnaît dans les deux formats (other et Dp)", () => {
  expect(withoutLastPhrases(DP_ABBA_ANCIEN)).toEqual({ source: ABBA.trimEnd(), count: 1 });
  expect(withoutLastPhrases(DP_ABBA)).toEqual({ source: ABBA.trimEnd(), count: 1 });
});

/** Pastilles d'un chant du Sommaire (deux volets, docs/spec-deux-volets.md, Q6), à la
 *  manière de la structure abrégée de la liste : « C1 · R · Dp ». */
const pastillesDuSommaire = async (page: Page, position: number) =>
  (await page.locator(`[data-sommaire="${position}"] [data-pastille]`).allTextContents()).join(" · ");

test("liste (sommaire en deux volets) : une Dernière phrase écrite dans l'ancien format s'affiche « Dp », pas « other »", async ({ page }) => {
  await ouvrir(page, setlist([
    item({
      songSlug: "abba-pere",
      position: 1,
      contentOverride: DP_ABBA_ANCIEN,
      structureOverride: ["verse-2-0", "chorus-3-1", "other-7-9"],
    }),
  ]));
  if (await enDeuxVolets(page)) {
    await expect.poll(() => pastillesDuSommaire(page, 1)).toBe("C1 · R · Dp");
    return;
  }
  const ligne = page.getByRole("listitem").filter({ hasText: "Abba Père" });
  await expect(ligne).toContainText("C1 · R · Dp");
  await expect(ligne).not.toContainText("other");
});

// ── T2 : chant ouvert depuis la setlist ─────────────────────────────────────

/** Abba Père (R) · 一生爱你 (R) · Abba Père (R) : le refrain FR revient. */
const MELANGE = [
  { songSlug: "abba-pere", sectionId: "chorus-3" },
  { songSlug: "一生爱你", sectionId: "chorus-3" },
  { songSlug: "abba-pere", sectionId: "chorus-3" },
];

const FUSION_MIXTE = item({
  type: "fusion",
  songSlug: "",
  position: 2,
  fusionSongs: [
    { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
    { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
  mixedStructure: MELANGE,
});

// Le titre du chant dans les partitions mène à sa page (setlist G,
// docs/spec-deux-volets.md, Q12) : la ligne de la liste ouvre les partitions.
test("titre du chant dans les partitions : la page du chant montre sa Dernière phrase", async ({ page }) => {
  await ouvrir(page, setlist([
    item({ songSlug: "abba-pere", position: 1, contentOverride: DP_ABBA, structureOverride: ["verse-2-0", "chorus-3-1", "Dp-7-9"] }),
  ]));
  await ouvrirPartitions(page);
  await page.locator('[data-outline-item="1"]').getByRole("link", { name: "Abba Père" }).click();
  await page.waitForURL(/\/songs\/abba-pere/);
  await expect(page.getByText("Dernière phrase – R").first()).toBeVisible();
  await capture(page, "fusions-dp-chant-depuis-setlist");
});

test("titre d'un chant d'une fusion dans les partitions : la page du chant montre sa Dernière phrase", async ({ page }) => {
  await ouvrir(page, setlist([
    item({ songSlug: "一生爱你", position: 1 }),
    item({
      type: "fusion",
      songSlug: "",
      position: 2,
      fusionSongs: [
        { songSlug: "abba-pere", keyOverride: null, structureOverride: ["chorus-3-0", "Dp-7-9"], sectionNotes: {}, contentOverride: DP_ABBA },
        { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
      ],
      mixedStructure: null,
    }),
  ]));
  await ouvrirPartitions(page);
  await page.locator('[data-outline-item="2"]').getByRole("link", { name: "Abba Père" }).click();
  await page.waitForURL(/\/songs\/abba-pere/);
  await expect(page.getByText("Dernière phrase – R").first()).toBeVisible();
});

// ── T3 : affichage d'une fusion à structure mélangée ───────────────────────

const sectionsDeLaFusion = (page: Page) => page.locator('[data-outline-item="2"] [data-section]');

async function partitionsAvecMode(page: Page, mode: "played" | "unique" | "structure") {
  await page.addInitScript((m) => localStorage.setItem("partition-layout", m), mode);
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_MIXTE]));
  await ouvrirPartitions(page);
  await expect(page.locator('[data-outline-item="1"]').getByRole("list", { name: "Structure" })).toBeVisible();
}

test("fusion mélangée, ordre joué : chaque passage est imprimé, reprises comprises", async ({ page }) => {
  await partitionsAvecMode(page, "played");
  await expect(sectionsDeLaFusion(page)).toHaveCount(3);
});

test("fusion mélangée, sections uniques : le refrain repris n'est imprimé qu'une fois", async ({ page }) => {
  await partitionsAvecMode(page, "unique");
  await expect(sectionsDeLaFusion(page)).toHaveCount(2);
  await expect(sectionsDeLaFusion(page).first()).toContainText("Abba");
  await expect(sectionsDeLaFusion(page).nth(1)).toContainText("一生");
});

test("fusion mélangée, structure seule : le bandeau sans les paroles", async ({ page }) => {
  await partitionsAvecMode(page, "structure");
  await expect(sectionsDeLaFusion(page)).toHaveCount(0);
  await expect(page.locator('[data-outline-item="2"]').getByRole("list", { name: "Structure" })).toBeVisible();
  await capture(page, "fusions-dp-structure-seule");
});

// ── T4 : Dernière phrase sur une fusion ─────────────────────────────────────

const FUSION_SUITE = item({
  type: "fusion",
  songSlug: "",
  position: 2,
  fusionSongs: [
    { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
    { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
  mixedStructure: null,
});

/** Abba Père joue son refrain puis sa Dernière phrase, 一生爱你 en entier. */
const FUSION_SUITE_DP = item({
  ...FUSION_SUITE,
  fusionSongs: [
    { songSlug: "abba-pere", keyOverride: null, structureOverride: ["chorus-3-0", "Dp-7-9"], sectionNotes: {}, contentOverride: DP_ABBA },
    { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
});

/** Le mélange, suivi de la Dernière phrase d'Abba Père. */
const FUSION_MIXTE_DP = item({
  ...FUSION_MIXTE,
  fusionSongs: [
    { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {}, contentOverride: DP_ABBA },
    { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
  mixedStructure: [...MELANGE, { songSlug: "abba-pere", sectionId: "Dp-7" }],
});

type Saved = { items?: { fusionSongs?: { contentOverride?: string; structureOverride?: string[] | null }[]; mixedStructure?: { songSlug: string; sectionId: string }[] }[] };

async function ouvrirEditeur(page: Page, fusion: Record<string, unknown>) {
  const db = await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), fusion]), `/setlists/${SETLIST_ID}/edit`);
  await attendreEditeur(page, "Abba Père / 一生爱你");
  return db;
}

test("éditeur, fusion à la suite : un chant de la fusion reçoit sa Dernière phrase", async ({ page }) => {
  const db = await ouvrirEditeur(page, FUSION_SUITE);
  await reglerElement(page, "Abba Père / 一生爱你");
  const carte = page.locator("[data-fusion-song]").filter({ hasText: "Abba Père" });
  await carte.getByRole("button", { name: "Dernière phrase", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Dernière phrase (Dp)" });
  await sheet.getByLabel("Section").selectOption("chorus-3");
  await sheet.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect
    .poll(() => {
      const abba = (db.doc(SETLIST_DOC) as Saved | undefined)?.items?.[1]?.fusionSongs?.[0];
      return !!abba?.contentOverride?.includes("{start_of_Dp: Dernière phrase – R}") && (abba.structureOverride?.at(-1) ?? "").startsWith("Dp-7");
    }, { timeout: 10_000 })
    .toBe(true);
});

test("éditeur, fusion mélangée : la Dernière phrase s'ajoute à la suite du mélange", async ({ page }) => {
  const db = await ouvrirEditeur(page, FUSION_MIXTE);
  await reglerElement(page, "Abba Père / 一生爱你");
  await page.getByRole("button", { name: "Dernière phrase", exact: true }).first().click();
  const sheet = page.getByRole("dialog", { name: "Dernière phrase (Dp)" });
  // Proposée d'office : le dernier passage d'Abba Père dans le mélange.
  await expect(sheet.getByLabel("Section")).toHaveValue("chorus-3");
  await sheet.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect
    .poll(() => {
      const fusion = (db.doc(SETLIST_DOC) as Saved | undefined)?.items?.[1];
      const abba = fusion?.fusionSongs?.[0];
      return {
        dernier: fusion?.mixedStructure?.at(-1),
        adapte: !!abba?.contentOverride?.includes("{start_of_Dp: Dernière phrase – R}"),
        // À la suite du mélange seulement, pas dans la structure propre du chant.
        dansLeChant: (abba?.structureOverride ?? []).some((uid) => uid.startsWith("Dp-")),
      };
    }, { timeout: 10_000 })
    .toEqual({ dernier: { songSlug: "abba-pere", sectionId: "Dp-7" }, adapte: true, dansLeChant: false });
});

test("partitions, fusion à la suite : la Dernière phrase s'imprime avec ses accords, « Dp » au bandeau", async ({ page }) => {
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_SUITE_DP]));
  await ouvrirPartitions(page);
  const fusion = page.locator('[data-outline-item="2"]');
  await expect(fusion.getByRole("list", { name: "Structure" }).first().getByRole("listitem")).toHaveText(["R", "Dp"]);
  await expect(fusion.locator("[data-section]").nth(1)).toContainText("Bm");
  await capture(page, "fusions-dp-partitions-suite");
});

test("partitions, fusion mélangée : la Dernière phrase termine le mélange", async ({ page }) => {
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_MIXTE_DP]));
  await ouvrirPartitions(page);
  const fusion = page.locator('[data-outline-item="2"]');
  await expect(fusion.getByRole("list", { name: "Structure" }).getByRole("listitem").last()).toHaveText("Dp");
  await expect(fusion.locator("[data-section]")).toHaveCount(4);
  await expect(fusion.locator("[data-section]").last()).toContainText("Bm");
  await capture(page, "fusions-dp-partitions-mixte");
});

test("liste (sommaire en deux volets) : la Dernière phrase d'un chant de fusion s'affiche « Dp », mélangée ou à la suite", async ({ page }) => {
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_SUITE_DP, { ...FUSION_MIXTE_DP, position: 3 }]));
  if (await enDeuxVolets(page)) {
    await expect.poll(() => pastillesDuSommaire(page, 2)).toContain("R · Dp");
    await expect.poll(() => pastillesDuSommaire(page, 3)).toContain("R · Dp");
    return;
  }
  const lignes = page.getByRole("listitem").filter({ hasText: "Fusion" });
  await expect(lignes.first()).toContainText("R · Dp");
  await expect(lignes.nth(1)).toContainText("R · Dp");
});

test("mode louange : la Dernière phrase d'un chant de fusion est jouée", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_MIXTE_DP]));
  await page.getByRole("button", { name: "Mode louange" }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(page.locator("[data-performance-mode]").getByText("Dernière phrase – R").first()).toBeAttached();
});

test("historique : une Dernière phrase ajoutée à un chant de fusion se dit en une phrase", () => {
  const base = { title: "Culte", leader: "", category: "", date: "2026-10-04", notes: "" };
  const changes = diffSetlists({ ...base, items: [FUSION_SUITE as never] }, { ...base, items: [FUSION_SUITE_DP as never] });
  expect(changes).toContainEqual({ kind: "lastPhrase", song: "abba-pere" });
  expect(changes).not.toContainEqual({ kind: "adapted", song: "abba-pere" });
});

test("copie des paroles : la Dernière phrase d'un chant de fusion y est", () => {
  const contenu = (slug: string, source: string) => ({ slug, source, ast: parseChordPro(source) });
  const contents = { "abba-pere": contenu("abba-pere", ABBA), "一生爱你": contenu("一生爱你", YISHENG) };
  expect(playedSections(FUSION_SUITE_DP as never, contents).map((s) => s.name)).toContain("Dernière phrase – R");
  expect(playedSections(FUSION_MIXTE_DP as never, contents).at(-1)?.name).toBe("Dernière phrase – R");
});

// ── Idées d'harmonie sur une fusion (demande de Timothée du 01/10/2026) ─────

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Ruth tient le piano : c'est le planning qui lui ouvre Harmonie.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Jonathan Z.", "", "", "Ruth K.", "Éloïse M.", "", "", "", "Hewei", "", ""],
]);

test("idées d'harmonie : chaque chant d'une fusion a les siennes, mélangée ou à la suite", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MUSICIEN, { [SETLIST_DOC]: setlist([FUSION_SUITE_DP, { ...FUSION_MIXTE, position: 3 }]) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);

  const suite = page.locator('[data-outline-item="2"]');
  await expect(suite.getByRole("button", { name: /Idées d'harmonie/ })).toHaveCount(2);
  const mixte = page.locator('[data-outline-item="3"]');
  await mixte.getByRole("button", { name: "Idées d'harmonie · 一生爱你" }).click();
  const feuille = page.locator("[data-idees-harmonie]");
  await expect(feuille).toBeVisible();
  await expect(feuille).toContainText("一生爱你");
  await expect(feuille.locator("[data-suggestion]").first()).toBeVisible();
  await capture(page, "fusions-dp-idees");
});

// ── Retirer une Dernière phrase (relecture du 01/10/2026) ───────────────────

test("Dernière phrase retirée de la structure : elle ne se joue plus, chant seul comme chant de fusion", () => {
  const index = JSON.parse(readFileSync("public/songs-index.json", "utf8")).songs as SongIndexEntry[];
  const chant = (slug: string, contentOverride?: string): FormItem => {
    const song = index.find((s) => s.slug === slug)!;
    return {
      uid: `form-${slug}`,
      song,
      keyOverride: null,
      notes: "",
      // La structure d'origine : l'étape « Dp » vient d'être retirée.
      sectionItems: (song.sections ?? []).map((s, i) => ({
        uid: `${s.id}-${i}`, sectionId: s.id, name: s.name, note: "", transition: "", nuanceTags: [], nuanceNote: "", keyChange: "",
      })),
      contentOverride,
    };
  };
  const [seul, fusion] = buildSetlistItems([
    chant("abba-pere", DP_ABBA),
    { uid: "form-fusion", kind: "fusion", songs: [chant("abba-pere", DP_ABBA), chant("一生爱你")], mixedStructure: null },
  ]);
  const contenu = (slug: string, source: string) => ({ slug, source, ast: parseChordPro(source) });
  const contents = { "abba-pere": contenu("abba-pere", ABBA), "一生爱你": contenu("一生爱你", YISHENG) };
  expect(playedSections(seul, contents).map((s) => s.name)).not.toContain("Dernière phrase – R");
  expect(playedSections(fusion, contents).map((s) => s.name)).not.toContain("Dernière phrase – R");
});

// ── Compléments de la relecture du 01/10/2026 ───────────────────────────────

/** 一生爱你 (trois sections) : sa Dernière phrase, quatrième section, reprend la
 *  dernière ligne du refrain avec son pinyin. */
const DP_YISHENG = `${YISHENG.trimEnd()}\n\n{start_of_Dp: Dernière phrase – R}\n一生奉[G#m]献，一生不回[C#m]头，一生[F#m]爱你，[Bsus4]跟[B]随[E]你。\nyī shēng fèng xiàn yī shēng bù huí tóu yī shēng ài nǐ gēn suí nǐ\n{end_of_Dp}\n`;

test("partitions, fusion : la Dernière phrase d'un chant chinois s'imprime avec accords et pinyin", async ({ page }) => {
  await ouvrir(page, setlist([item({
    ...FUSION_SUITE,
    position: 1,
    fusionSongs: [
      { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
      { songSlug: "一生爱你", keyOverride: null, structureOverride: ["chorus-3-0", "Dp-4-9"], sectionNotes: {}, contentOverride: DP_YISHENG },
    ],
  })]));
  await ouvrirPartitions(page);
  const fusion = page.locator('[data-outline-item="1"]');
  await expect(fusion.getByRole("list", { name: "Structure" }).last().getByRole("listitem")).toHaveText(["R", "Dp"]);
  const dp = fusion.locator("[data-section]").last();
  await expect(dp).toContainText("Bsus4");
  await expect(dp).toContainText("gēn");
});

test("partitions, fusion mélangée : chaque chant ouvre sa page depuis la setlist", async ({ page }) => {
  await ouvrir(page, setlist([item({ songSlug: "一生爱你", position: 1 }), FUSION_MIXTE]));
  await ouvrirPartitions(page);
  await page.locator('[data-outline-item="2"]').getByRole("link", { name: "Abba Père" }).first().click();
  await page.waitForURL(/\/songs\/abba-pere/);
  expect(new URL(page.url()).searchParams.get("item")).toBe("2");
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
});

test("page du chant sans session : le chant d'origine, sans la Dernière phrase", async ({ page }) => {
  const query = new URLSearchParams({
    structure: JSON.stringify(["verse-2-0", "chorus-3-1", "Dp-7-9"]),
    setlist: JSON.stringify(SETLIST_ID),
    item: JSON.stringify(1),
  });
  await page.goto(`/songs/abba-pere?${query}`);
  await expect(page.getByText("Refrain").first()).toBeVisible();
  await expect(page.getByText("Dernière phrase – R")).toHaveCount(0);
});

test("page du chant ouverte depuis la setlist : les accords retouchés sur le scan y sont", async ({ page }) => {
  await ouvrir(page, setlist([
    item({ songSlug: "到各山岭去传扬", position: 1, jianpuSheet: true, jianpuChords: { changed: { 0: "Em" } } }),
  ]));
  await ouvrirPartitions(page);
  await page.locator('[data-outline-item="1"]').getByRole("link", { name: "到各山岭去传扬" }).click();
  await page.waitForURL(/\/songs\//);
  await page.getByRole("button", { name: /简谱/ }).click();
  await page.locator("[data-jianpu-page] img").first().waitFor();
  // Gravure intacte (même tonalité) : seule l'étiquette retouchée se dessine.
  await expect(page.locator("[data-jianpu-label]")).toHaveText(["Em"]);
});
