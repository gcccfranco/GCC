import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 9, tranche MV (docs/spec-harmonie.md) : dans « Ma version », une retouche
// d'une section répétée vaut pour « Toutes les répétitions » (comme avant) ou
// pour « Seulement ce passage » — copie de section du mode Adapter. Une version
// partagée s'affiche « au même endroit » chez quelqu'un dont la structure
// diffère : la dernière occurrence reste la dernière, les autres se repèrent
// par leur rang depuis le début.

const RUTH: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const CHRISTELLE: FakeProfile = {
  uid: "uid-christelle",
  email: "christelle@example.com",
  firstName: "Christelle",
  lastName: "Durand",
  planningName: "Christelle D.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-passage";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const RUTH_DOC = `setlists/${SETLIST_ID}/versions/${RUTH.uid}`;

/** Deux refrains chez la présidence (C R C R), un refrain répété en 中文. */
const DEUX_REFRAINS = ["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-3-3"];
const TROIS_REFRAINS = ["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-3-3", "chorus-3-4"];
const UN_REFRAIN = ["verse-2-0", "chorus-3-1"];
const ZH_DEUX_REFRAINS = ["verse-2-0", "chorus-3-1", "chorus-3-2"];

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

const setlist = (structure: string[] = DEUX_REFRAINS, zhStructure: string[] = ZH_DEUX_REFRAINS) => ({
  title: "Culte du 28 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-28",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, structureOverride: structure }),
    item({ songSlug: "一生爱你", position: 2, structureOverride: zhStructure }),
  ],
});

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const CHORUS = ABBA.slice(ABBA.indexOf("{start_of_chorus"), ABBA.indexOf("{end_of_chorus}") + "{end_of_chorus}".length);
/** Version de Ruth avec un seul passage retouché : le refrain copié en fin de
 *  source (7e section → `chorus-7`) dit « Abba Papa » sur sa 2e ligne. */
const ABBA_PASSAGE = `${ABBA}\n\n${CHORUS.replace("Abba [D]Père, je [E]suis", "Abba [D]Papa, je [E]suis")}`;
/** Première ligne du refrain, retouchée dans la feuille d'édition. */
const LIGNE_PAPA = "Abba Père, je suis à Toi, Abba Père, je suis à Toi,".replaceAll("Père", "Papa");

const ruthDoc = (items: Record<string, unknown>) => ({
  authorUid: RUTH.uid,
  authorName: "Ruth K.",
  items,
  choices: {},
});

/** Ma version de Ruth : le refrain retouché est la copie `chorus-7`, placée
 *  dans sa structure. */
const passageItem = (structure: string[]) => ({
  content: ABBA_PASSAGE,
  structure,
  shared: true,
  sectionOrigins: { "chorus-7": "chorus-3" },
});

const song = (page: Page, position: number) => page.locator(`[data-outline-item="${position}"]`);
const bodySections = (page: Page, position: number) => song(page, position).locator("[data-section]");
const sectionAt = (page: Page, position: number, uid: string) =>
  song(page, position).locator(`[data-section-uids="${uid}"]`);
const lyricLine = (page: Page, text: string) => page.locator("[data-copy-line]", { hasText: text });
const versionSelect = (page: Page, position: number) => song(page, position).getByRole("combobox", { name: "Version" });
/** Page affichée du mode louange, sans la copie invisible qui sert à mesurer. */
const onStage = (page: Page, text: string) =>
  page.locator("[data-performance-mode] [data-copy-line]:not([aria-hidden=true] *)", { hasText: text });
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function openPartitions(
  page: Page,
  extraDocs: Record<string, Record<string, unknown>> = {},
  who: FakeProfile = RUTH,
  doc: Record<string, unknown> = setlist(),
) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, who, { [SETLIST_DOC]: doc, ...extraDocs }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

/** Touche une ligne d'une occurrence précise (mode d'édition). */
async function tapLine(page: Page, position: number, uid: string, text: string) {
  await sectionAt(page, position, uid).getByRole("button").filter({ hasText: text }).first().click();
}

/** Retouche les paroles d'une ligne, en choisissant la portée si elle est proposée. */
async function editLyrics(page: Page, uid: string, text: string, next: string, scope?: string) {
  await tapLine(page, 1, uid, text);
  if (scope) await page.getByRole("button", { name: scope }).click();
  await page.getByRole("button", { name: "Modifier les paroles" }).click();
  await page.locator("textarea").fill(next);
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("button", { name: "Modifier les paroles" })).toBeVisible();
  await page.getByRole("button", { name: "Valider" }).click();
}

const myItems = (db: Awaited<ReturnType<typeof openPartitions>>) =>
  db.writes.filter((w) => w.path === RUTH_DOC).pop()!.data.items as Record<
    string,
    { content: string | null; structure: string[] | null; sectionOrigins?: Record<string, string> }
  >;

test("le choix de portée n'apparaît que dans une section répétée", async ({ page }) => {
  await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();

  await tapLine(page, 1, "verse-2-0", "planait");
  await expect(page.getByRole("button", { name: "Seulement ce passage" }), "un couplet joué une fois").toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).first().click();

  await tapLine(page, 1, "chorus-3-3", "Abba");
  await expect(page.getByRole("button", { name: "Toutes les répétitions" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Seulement ce passage" })).toBeVisible();
  await capture(page, "mv-choix-de-portee");
});

test("« Toutes les répétitions » (par défaut) retouche les deux refrains", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await editLyrics(page, "chorus-3-3", "Abba", LIGNE_PAPA);

  await expect(lyricLine(page, "Papa"), "les deux refrains changent").toHaveCount(2);
  const items = myItems(db);
  expect(items["abba-pere"].structure, "ma structure ne bouge pas").toBeNull();
  expect(items["abba-pere"].sectionOrigins).toBeUndefined();
});

test("« Seulement ce passage » ne retouche que le refrain touché", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await editLyrics(page, "chorus-3-3", "Abba", LIGNE_PAPA, "Seulement ce passage");

  await expect(lyricLine(page, "Papa")).toHaveCount(1);
  await expect(bodySections(page, 1).nth(1), "le premier refrain est intact").not.toContainText("Papa");
  await expect(bodySections(page, 1).nth(3)).toContainText("Papa");
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toBeVisible();
  await capture(page, "mv-seulement-ce-passage");

  const items = myItems(db);
  expect(items["abba-pere"].structure).toEqual(["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-7-3"]);
  expect(items["abba-pere"].sectionOrigins).toEqual({ "chorus-7": "chorus-3" });
  expect(items["abba-pere"].content).toContain("Abba [D]Papa");
  expect(db.writes.filter((w) => w.path === SETLIST_DOC), "la setlist ne bouge pas").toHaveLength(0);
});

test("le mode louange joue le passage retouché seul", async ({ page }) => {
  await openPartitions(page, { [RUTH_DOC]: ruthDoc({ "abba-pere": passageItem(["chorus-3-0", "chorus-7-1"]) }) });
  await expect(lyricLine(page, "Papa")).toHaveCount(1);

  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(onStage(page, "Papa")).toHaveCount(1);
  await capture(page, "mv-mode-louange");
});

test("version partagée : le dernier refrain retouché reste le dernier", async ({ page }) => {
  await openPartitions(
    page,
    { [RUTH_DOC]: ruthDoc({ "abba-pere": passageItem(["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-7-3"]) }) },
    CHRISTELLE,
    setlist(TROIS_REFRAINS),
  );
  await versionSelect(page, 1).selectOption(RUTH.uid);

  await expect(lyricLine(page, "Papa")).toHaveCount(1);
  await expect(bodySections(page, 1), "C R C R R chez la présidence").toHaveCount(5);
  await expect(bodySections(page, 1).nth(1), "les deux premiers refrains sont intacts").not.toContainText("Papa");
  await expect(bodySections(page, 1).nth(3)).not.toContainText("Papa");
  await expect(bodySections(page, 1).nth(4), "le troisième refrain est le dernier ici").toContainText("Papa");
  await bodySections(page, 1).nth(4).scrollIntoViewIfNeeded();
  await capture(page, "mv-partagee-dernier-refrain");
});

/** Ruth a retouché son 2e refrain sur trois : il n'est pas le dernier. */
const MILIEU = ["chorus-3-0", "chorus-7-1", "chorus-3-2"];

test("version partagée : un refrain du milieu garde son rang", async ({ page }) => {
  await openPartitions(
    page,
    { [RUTH_DOC]: ruthDoc({ "abba-pere": passageItem(MILIEU) }) },
    CHRISTELLE,
    setlist(TROIS_REFRAINS),
  );
  await versionSelect(page, 1).selectOption(RUTH.uid);

  await expect(lyricLine(page, "Papa")).toHaveCount(1);
  await expect(bodySections(page, 1).nth(3), "2e refrain de la présidence").toContainText("Papa");
  await expect(bodySections(page, 1).nth(4)).not.toContainText("Papa");
  await bodySections(page, 1).nth(3).scrollIntoViewIfNeeded();
  await capture(page, "mv-partagee-rang-du-milieu");
});

test("version partagée : un rang qui n'existe pas ne s'affiche pas", async ({ page }) => {
  await openPartitions(
    page,
    { [RUTH_DOC]: ruthDoc({ "abba-pere": passageItem(MILIEU) }) },
    CHRISTELLE,
    setlist(UN_REFRAIN),
  );
  await versionSelect(page, 1).selectOption(RUTH.uid);

  await expect(lyricLine(page, "Papa"), "un seul refrain chez la présidence").toHaveCount(0);
  await expect(bodySections(page, 1), "le refrain copié ne s'ajoute pas à la fin").toHaveCount(2);
  await bodySections(page, 1).nth(1).scrollIntoViewIfNeeded();
  await capture(page, "mv-partagee-rang-absent");
});

test("chant chinois : « Seulement ce passage » garde le pinyin de l'autre refrain", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await expect(lyricLine(page, "敬")).toHaveCount(2);

  await sectionAt(page, 2, "chorus-3-2").getByRole("button").filter({ hasText: "敬" }).first().click();
  await page.getByRole("button", { name: "Seulement ce passage" }).click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();

  await expect(lyricLine(page, "敬")).toHaveCount(1);
  await expect(song(page, 2).locator("span").filter({ hasText: /^jìng$/ }).first()).toBeVisible();
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "mv-zh-seulement-ce-passage");

  const items = myItems(db);
  expect(items["一生爱你"].structure).toEqual(["verse-2-0", "chorus-3-1", "chorus-4-2"]);
  expect(items["一生爱你"].sectionOrigins).toEqual({ "chorus-4": "chorus-3" });
});
