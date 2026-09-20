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

// ─── Avant / après (docs/spec-historique-avant-apres.md) ─────────────────────

/** Ligne d'une section dans l'éditeur de structure. */
const sectionRow = (page: Page, name: string) =>
  page.locator("div.rounded.border.text-xs").filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });

/** Phrase d'un changement dans la feuille (l'élément de liste qui la porte). */
const changeItem = (sheet: ReturnType<Page["getByRole"]>, phrase: string) =>
  sheet.locator("article > ul > li").filter({ hasText: phrase });

test("H1 — structure : la section retirée et la section ajoutée se voient avant / après", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Structure", exact: true }).first().click();
  await sectionRow(page, "Pont").getByRole("button").last().click();
  await page.getByRole("button", { name: "Refrain", exact: true }).click();

  const sheet = await finishAndOpenHistory(page);
  const change = changeItem(sheet, "Structure de Abba Père modifiée");
  await expect(change.getByRole("list", { name: "Avant" }).getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "P (retiré)"]);
  await expect(change.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "R (ajouté)"]);
  await expect(change.getByRole("list", { name: "Avant" }).getByRole("listitem").last()).toHaveAttribute("data-mark", "removed");
});

test("H1 — structure retouchée puis remise comme avant : pas de phrase de structure", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Structure", exact: true }).first().click();
  await sectionRow(page, "Pont").getByRole("button").last().click();
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "Pont", exact: true }).click();
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByText("Tonalité de Abba Père : A → B")).toBeVisible();
  await expect(sheet.getByText(/Structure de/)).toHaveCount(0);
});

test("H1 — deux retouches à moins de 15 min : l'avant de la première, l'après de la dernière", async ({ page }) => {
  const withoutBridge = {
    ...SETLIST,
    items: [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4"] }),
      item({ songSlug: "一生爱你", position: 2 }),
    ],
  };
  await openEditor(page, {
    [`setlists/${SETLIST_ID}`]: withoutBridge,
    [`setlists/${SETLIST_ID}/history/avant`]: entry("uid-musicien", "Ruth K.", minutesAgo(5), [
      { kind: "structure", song: "abba-pere", from: ["I", "C1", "R", "Pm", "C2", "P"], to: ["I", "C1", "R", "Pm", "C2"] },
    ]),
  });
  await page.getByRole("button", { name: /^Structure/ }).first().click();
  await page.getByRole("button", { name: "Refrain", exact: true }).click();

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByRole("article")).toHaveCount(1);
  const change = changeItem(sheet, "Structure de Abba Père modifiée");
  await expect(change.getByRole("list", { name: "Avant" }).getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "P (retiré)"]);
  await expect(change.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "R (ajouté)"]);
});

test("H1 — section déplacée, fusion numérotée, ancienne entrée sans avant / après", async ({ page }) => {
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: SETLIST,
      [`setlists/${SETLIST_ID}/history/e1`]: entry("uid-musicien", "Ruth K.", minutesAgo(30), [
        { kind: "structure", song: "abba-pere", from: ["I", "C1", "R", "P"], to: ["I", "P", "C1", "R"] },
        { kind: "fusionStructure", songs: ["abba-pere", "一生爱你"], from: ["1 R", "2 R"], to: ["1 R", "2 C", "2 R"] },
        { kind: "structure", song: "一生爱你" },
      ]),
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  const sheet = page.getByRole("dialog", { name: "Historique des modifications" });

  const moved = changeItem(sheet, "Structure de Abba Père modifiée");
  await expect(moved.getByRole("list", { name: "Avant" }).getByRole("listitem")).toHaveText(["I", "C1", "R", "P"]);
  await expect(moved.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["I", "P (déplacé)", "C1", "R"]);

  const fusion = changeItem(sheet, "Structure de Abba Père + 一生爱你 modifiée");
  await expect(fusion.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["1 R", "2 C (ajouté)", "2 R"]);
  await expect(fusion).toContainText("1 Abba Père");
  await expect(fusion).toContainText("2 一生爱你");

  const old = changeItem(sheet, "Structure de 一生爱你 modifiée");
  await expect(old).toBeVisible();
  await expect(old.getByRole("list")).toHaveCount(0);
});

test("H1 — en 中文, avant / après traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: SETLIST,
      [`setlists/${SETLIST_ID}/history/e1`]: entry("uid-musicien", "Ruth K.", minutesAgo(90), [
        { kind: "structure", song: "一生爱你", from: ["I", "C", "R"], to: ["I", "C", "R", "R"] },
      ]),
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Ruth K\..*修改/ }).click();
  const change = page.getByRole("dialog").locator("article > ul > li").filter({ hasText: "修改了 一生爱你 的结构" });
  await expect(change.getByRole("list", { name: "之前" }).getByRole("listitem")).toHaveText(["I", "C", "R"]);
  await expect(change.getByRole("list", { name: "之后" }).getByRole("listitem").last()).toHaveText(/R.*新增/);
});

test("H2 — chant retiré : « Voir avant / après » montre la liste des chants", async ({ page }) => {
  await openEditor(page);
  const row = page.locator("div.flex.items-start.gap-2.p-3").filter({ has: page.getByLabel("Tonalité de 一生爱你") });
  await row.getByRole("button").last().click();

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByText("A retiré 一生爱你")).toBeVisible();
  const change = changeItem(sheet, "Chants de la setlist");
  await expect(change.getByRole("list")).toHaveCount(0);
  await change.getByRole("button", { name: "Voir avant / après" }).click();
  await expect(change.getByRole("list", { name: "Avant" }).getByRole("listitem")).toHaveText(["1 Abba Père", "2 一生爱你 (retiré)"]);
  await expect(change.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["1 Abba Père"]);
});

test("H2 — chant déplacé, fusion ajoutée ; deux colonnes sauf sur téléphone", async ({ page }, testInfo) => {
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: SETLIST,
      [`setlists/${SETLIST_ID}/history/e1`]: entry("uid-musicien", "Ruth K.", minutesAgo(30), [
        { kind: "order" },
        { kind: "songs", from: ["abba-pere", "一生爱你", "ma-passion"], to: ["ma-passion", "abba-pere", "一生爱你+abrite-moi"] },
      ]),
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  const sheet = page.getByRole("dialog", { name: "Historique des modifications" });
  const change = changeItem(sheet, "Chants de la setlist");
  await change.getByRole("button", { name: "Voir avant / après" }).click();

  const before = change.getByRole("list", { name: "Avant" });
  const after = change.getByRole("list", { name: "Après" });
  // Ma passion reste dans l'ordre commun : c'est Abba Père qui est déplacé.
  await expect(before.getByRole("listitem")).toHaveText(["1 Abba Père", "2 一生爱你 (retiré)", "3 Ma passion"]);
  await expect(after.getByRole("listitem")).toHaveText(["1 Ma passion", "2 Abba Père (déplacé)", "3 一生爱你 + Abrite-moi (ajouté)"]);
  await expect(change.getByRole("button", { name: "Masquer avant / après" })).toBeVisible();

  const [a, b] = [await before.boundingBox(), await after.boundingBox()];
  if (testInfo.project.name === "telephone") expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
  else expect(Math.abs(b!.y - a!.y)).toBeLessThan(2);
});

test("H3 — notes de la setlist : mots ajoutés et retirés, ponctuation à part", async ({ page }) => {
  await openEditor(page, { [`setlists/${SETLIST_ID}`]: { ...SETLIST, notes: "Prier avant le culte, puis annonces" } });
  await page.getByLabel("Notes (optionnel)").fill("Prier longtemps avant le culte");

  const sheet = await finishAndOpenHistory(page);
  const change = changeItem(sheet, "Notes de la setlist modifiées");
  await change.getByRole("button", { name: "Voir avant / après" }).click();
  await expect(change.getByRole("group", { name: "Avant" }).locator("del")).toHaveText([", puis annonces (retiré)"]);
  await expect(change.getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["longtemps (ajouté)"]);
});

test("H3 — note d'un chant en 中文 : caractère par caractère", async ({ page }) => {
  await openEditor(page, {
    [`setlists/${SETLIST_ID}`]: { ...SETLIST, items: [SETLIST.items[0], { ...SETLIST.items[1], notes: "慢一点" }] },
  });
  await page.getByPlaceholder("Note (optionnel)…").nth(1).fill("慢一点再唱");

  const sheet = await finishAndOpenHistory(page);
  const change = changeItem(sheet, "Note de 一生爱你 modifiée");
  await change.getByRole("button", { name: "Voir avant / après" }).click();
  await expect(change.getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["再唱 (ajouté)"]);
});

test("H3 — notes de section par section ; une ancienne entrée garde sa phrase seule", async ({ page }) => {
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: SETLIST,
      [`setlists/${SETLIST_ID}/history/e1`]: entry("uid-musicien", "Ruth K.", minutesAgo(30), [
        {
          kind: "sectionNotes",
          song: "abba-pere",
          from: [{ section: "R (2)", note: "Tout doux" }, { section: "P", note: "Batterie seule" }],
          to: [{ section: "R (2)", note: "Tout doux puis fort" }, { section: "C2", note: "Guitare seule" }],
        },
        { kind: "songNote", song: "一生爱你" },
      ]),
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  const sheet = page.getByRole("dialog", { name: "Historique des modifications" });
  const change = changeItem(sheet, "Notes de section de Abba Père modifiées");
  await change.getByRole("button", { name: "Voir avant / après" }).click();

  const chorus = change.getByRole("group", { name: "R (2)" });
  await expect(chorus.getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["puis fort (ajouté)"]);
  const bridge = change.getByRole("group", { name: "P", exact: true });
  await expect(bridge.getByRole("group", { name: "Avant" }).locator("del")).toHaveText(["Batterie seule (retiré)"]);
  const verse = change.getByRole("group", { name: "C2" });
  await expect(verse.getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["Guitare seule (ajouté)"]);

  const old = changeItem(sheet, "Note de 一生爱你 modifiée");
  await expect(old).toBeVisible();
  await expect(old.getByRole("button")).toHaveCount(0);
});

test("H3 — note de section écrite dans l'éditeur : nommée par son abréviation", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Structure", exact: true }).first().click();
  await sectionRow(page, "Refrain").getByTitle("Note").click();
  // Le champ de la note de section prend le focus à l'ouverture.
  await page.keyboard.type("Tout doux");

  const sheet = await finishAndOpenHistory(page);
  const change = changeItem(sheet, "Notes de section de Abba Père modifiées");
  await change.getByRole("button", { name: "Voir avant / après" }).click();
  const chorus = change.getByRole("group", { name: "R", exact: true });
  await expect(chorus.getByRole("group", { name: "Avant" })).toHaveText("—");
  await expect(chorus.getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["Tout doux (ajouté)"]);
});

test("H1 — mode Adapter, copie d'une section répétée : pas de phrase de structure (même écriture)", async ({ page }) => {
  const repeated = {
    ...SETLIST,
    ownerId: MUSICIEN.uid,
    items: [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["intro-1-0", "verse-2-1", "verse-2-2"] }),
      item({ songSlug: "一生爱你", position: 2 }),
    ],
  };
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: repeated }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await page.getByRole("button", { name: "Adapter" }).click();
  // Ligne du 2e Couplet 1 : l'édition matérialise une copie de la section.
  await page.getByRole("button").filter({ hasText: "planait" }).last().click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  const structure = () => (db.doc(`setlists/${SETLIST_ID}`)?.items as { structureOverride: string[] }[])[0].structureOverride;
  await expect.poll(() => structure()[2], "la copie a bien été faite").not.toBe("verse-2-2");

  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  const sheet = page.getByRole("dialog", { name: "Historique des modifications" });
  await expect(sheet.getByText("Adaptation de Abba Père modifiée (accords ou paroles)")).toBeVisible();
  await expect(sheet.getByText(/Structure de/)).toHaveCount(0);
});

const FUSION = {
  ...SETLIST,
  items: [{
    type: "fusion",
    songSlug: "",
    position: 1,
    keyOverride: null,
    showChords: true,
    showPinyin: false,
    useJianpu: false,
    structureOverride: null,
    sectionNotes: {},
    notes: "",
    fusionSongs: [
      { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
      { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
    ],
    mixedStructure: [{ songSlug: "abba-pere", sectionId: "chorus-3" }, { songSlug: "一生爱你", sectionId: "chorus-3", transition: "Doucement" }],
  }],
};

async function openFusionEditor(page: Page) {
  await emptyPlanning(page);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: FUSION }, `/setlists/${SETLIST_ID}/edit`);
}

test("Fusion — note et transition du mélange : leurs phrases, sans « Structure … modifiée »", async ({ page }) => {
  await openFusionEditor(page);
  const step = page.locator("div.rounded.border.text-xs").filter({ hasText: "副歌/Refrain" });
  await step.getByTitle("Note").click();
  await page.keyboard.type("Tout doux");
  await step.getByTitle("Transition").click();
  await page.keyboard.type(" puis enchaîner");

  const sheet = await finishAndOpenHistory(page);
  await expect(sheet.getByText("Transitions de section de Abba Père + 一生爱你 modifiées")).toBeVisible();
  await expect(sheet.getByText(/Structure de/)).toHaveCount(0);
  const notes = changeItem(sheet, "Notes de section de Abba Père + 一生爱你 modifiées");
  await notes.getByRole("button", { name: "Voir avant / après" }).click();
  await expect(notes.getByRole("group", { name: "2 R" }).getByRole("group", { name: "Après" }).locator("ins")).toHaveText(["Tout doux (ajouté)"]);
});

test("Fusion — passage retiré du mélange : structure avant / après, rien d'autre", async ({ page }) => {
  await openFusionEditor(page);
  await page.locator("div.rounded.border.text-xs").filter({ hasText: /^\s*Refrain\s*Abba Père\s*$/ }).getByRole("button").last().click();

  const sheet = await finishAndOpenHistory(page);
  const change = changeItem(sheet, "Structure de Abba Père + 一生爱你 modifiée");
  await expect(change.getByRole("list", { name: "Avant" }).getByRole("listitem")).toHaveText(["1 R (retiré)", "2 R"]);
  await expect(change.getByRole("list", { name: "Après" }).getByRole("listitem")).toHaveText(["2 R"]);
  await expect(sheet.locator("article > ul > li"), "ni notes ni transitions : elles n'ont pas bougé").toHaveCount(1);
});
