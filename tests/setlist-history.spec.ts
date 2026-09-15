import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Chantier Setlist, lot 2 (docs/spec-setlist.md) : historique des
// modifications, une entrée par passage, lu depuis la page de la setlist.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-histo";

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

const SETLIST = {
  title: "Culte du 21 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1 }),
    item({ songSlug: "一生爱你", position: 2 }),
  ],
};

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const entry = (authorUid: string, authorName: string, at: string, changes: Record<string, unknown>[]) => ({
  authorUid,
  authorName,
  at,
  changes,
});

async function emptyPlanning(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
}

async function openEditor(page: Page, extraDocs: Record<string, Record<string, unknown>> = {}) {
  await emptyPlanning(page);
  const db = await signInAs(
    page,
    MUSICIEN,
    { [`setlists/${SETLIST_ID}`]: SETLIST, ...extraDocs },
    `/setlists/${SETLIST_ID}/edit`,
  );
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  return db;
}

async function finishAndOpenHistory(page: Page) {
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  return page.getByRole("dialog", { name: "Historique des modifications" });
}

test("après une retouche, la setlist dit qui l'a modifiée et quoi (FR + 中文 dans la setlist)", async ({ page }) => {
  await openEditor(page);
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await page.getByLabel("Tonalité de 一生爱你").selectOption("F");
  await page.getByLabel("Titre").fill("Culte du 21 septembre (révisé)");

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByText("Tonalité de Abba Père : A → B")).toBeVisible();
  await expect(sheet.getByText("Tonalité de 一生爱你 : E → F")).toBeVisible();
  await expect(sheet.getByText("Titre : Culte du 21 septembre → Culte du 21 septembre (révisé)")).toBeVisible();
  await expect(sheet.getByRole("listitem"), "aucune phrase de trop").toHaveCount(3);
});

test("une retouche moins de 15 min après la précédente rejoint la même entrée", async ({ page }) => {
  await openEditor(page, {
    [`setlists/${SETLIST_ID}/history/avant`]: entry("uid-musicien", "Ruth K.", minutesAgo(5), [{ kind: "notes" }]),
  });
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByRole("article")).toHaveCount(1);
  await expect(sheet.getByRole("article")).toContainText("Notes de la setlist modifiées");
  await expect(sheet.getByRole("article")).toContainText("Tonalité de Abba Père : A → B");
  await expect(sheet.getByRole("listitem")).toHaveCount(2);
});

test("une retouche plus de 15 min après la précédente ouvre une nouvelle entrée", async ({ page }) => {
  await openEditor(page, {
    [`setlists/${SETLIST_ID}/history/avant`]: entry("uid-musicien", "Ruth K.", minutesAgo(20), [{ kind: "notes" }]),
  });
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");

  const sheet = await finishAndOpenHistory(page);
  await sheet.getByRole("button", { name: "Voir plus" }).click();
  await expect(sheet.getByRole("article")).toHaveCount(2);
  await expect(sheet.getByRole("article").first()).toContainText("Tonalité de Abba Père : A → B");
  await expect(sheet.getByRole("article").first()).not.toContainText("Notes de la setlist modifiées");
});

test("une modification annulée dans le même passage ne laisse pas de phrase", async ({ page }) => {
  await openEditor(page);
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByLabel("Tonalité de 一生爱你").selectOption("F");
  await page.getByLabel("Tonalité de Abba Père").selectOption("");

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByText("Tonalité de 一生爱你 : E → F")).toBeVisible();
  await expect(sheet.getByText(/Tonalité de Abba Père/)).toHaveCount(0);
});

test("la feuille montre la dernière entrée, puis 5, puis toutes", async ({ page }) => {
  const docs: Record<string, Record<string, unknown>> = { [`setlists/${SETLIST_ID}`]: SETLIST };
  for (let i = 0; i < 7; i++) {
    docs[`setlists/${SETLIST_ID}/history/e${i}`] = entry(`uid-${i}`, `Membre ${i}`, minutesAgo(60 * (i + 1)), [
      { kind: "songAdded", song: "abba-pere" },
    ]);
  }
  await signInAs(page, MUSICIEN, docs, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Modifiée par Membre 0/ }).click();
  const sheet = page.getByRole("dialog", { name: "Historique des modifications" });
  await expect(sheet.getByRole("article")).toHaveCount(1);
  await expect(sheet.getByRole("article")).toContainText("A ajouté Abba Père");
  await sheet.getByRole("button", { name: "Voir plus" }).click();
  await expect(sheet.getByRole("article")).toHaveCount(5);
  await sheet.getByRole("button", { name: "Tout voir" }).click();
  await expect(sheet.getByRole("article")).toHaveCount(7);
});

test("en 中文, la ligne et les phrases sont traduites", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: SETLIST,
      [`setlists/${SETLIST_ID}/history/e1`]: entry("uid-musicien", "Ruth K.", minutesAgo(90), [
        { kind: "key", song: "一生爱你", from: null, to: "F" },
      ]),
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Ruth K\..*修改/ }).click();
  await expect(page.getByRole("dialog").getByText("一生爱你 的调：E → F")).toBeVisible();
});

test("publier une nouvelle setlist écrit « A créé la setlist »", async ({ page }) => {
  await emptyPlanning(page);
  await signInAs(page, MUSICIEN, {}, "/setlists/new");
  await page.getByLabel("Titre").fill("Culte du 28 septembre");
  await page.getByLabel("Catégorie").selectOption("Culte Francophone");
  await page.getByLabel("Présidence *", { exact: true }).selectOption("__other__");
  await page.getByPlaceholder("ex. Timothée").fill("Jonathan Z.");
  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForURL(/\/setlists\/fake-/);
  await page.getByRole("button", { name: /Créée par Ruth K\./ }).click();
  await expect(page.getByRole("dialog").getByText("A créé la setlist")).toBeVisible();
});

test("si l'historique est refusé, la setlist est quand même enregistrée", async ({ page }) => {
  const db = await openEditor(page);
  // Règles pas encore publiées dans la console : écriture de l'historique refusée.
  await page.route(/\/history\//, (route) =>
    route.request().method() === "GET"
      ? route.fallback()
      : route.fulfill({ status: 403, contentType: "application/json", body: '{"error":{"code":403}}' }),
  );
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await expect
    .poll(() => (db.doc(`setlists/${SETLIST_ID}`)?.items as { keyOverride: string | null }[])[0].keyOverride)
    .toBe("B");
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible();
});

test("rétablir l'original d'un chant adapté (vue partitions) s'écrit dans l'historique", async ({ page }) => {
  const source = readFileSync("content/songs/abba-pere.cho", "utf8");
  const adapted = { ...SETLIST, ownerId: MUSICIEN.uid, items: [
    item({ songSlug: "abba-pere", position: 1, contentOverride: source.replace("{title: Abba Père}", "{title: Abba Père}\n# adapté") }),
    item({ songSlug: "一生爱你", position: 2 }),
  ] };
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: adapted }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await page.getByRole("button", { name: "Adapter" }).click();
  await page.getByRole("button", { name: "Rétablir l'original" }).click();
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  await expect(page.getByRole("dialog").getByText("Adaptation de Abba Père modifiée (accords ou paroles)")).toBeVisible();
});

test("vue partitions : adapter une ligne puis rétablir l'original ne laisse pas de phrase", async ({ page }) => {
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: { ...SETLIST, ownerId: MUSICIEN.uid } }, `/setlists/${SETLIST_ID}`);
  const phrases = () => db.list(`setlists/${SETLIST_ID}/history`).map((p) => (db.doc(p)?.changes as unknown[]).length);
  await page.getByRole("button", { name: "Partitions" }).click();
  await page.getByRole("button", { name: "Adapter" }).click();
  await page.getByRole("button").filter({ hasText: "planait" }).first().click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("button", { name: /Modifiée par Ruth K\./ })).toBeVisible();

  await page.getByRole("button", { name: "Rétablir l'original" }).click();
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.getByText("Version modifiée")).toHaveCount(0);
  // Une seule entrée, vidée de sa phrase (lue en base : la ligne, rechargée, est
  // absente un instant quoi qu'il arrive).
  await expect.poll(phrases).toEqual([0]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Culte du 21 septembre" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Modifiée par Ruth K\./ })).toHaveCount(0);
});

test("éditeur resté ouvert : une retouche 20 min après la précédente ouvre une nouvelle entrée", async ({ page }) => {
  await openEditor(page);
  const start = Date.now();
  await page.clock.setFixedTime(start);
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.clock.setFixedTime(start + 20 * 60_000);
  await page.getByLabel("Tonalité de 一生爱你").selectOption("F");

  const sheet = await finishAndOpenHistory(page);
  await sheet.getByRole("button", { name: "Voir plus" }).click();
  await expect(sheet.getByRole("article")).toHaveCount(2);
  await expect(sheet.getByRole("article").first()).toContainText("Tonalité de 一生爱你 : E → F");
  await expect(sheet.getByRole("article").first()).not.toContainText("Abba Père");
});
