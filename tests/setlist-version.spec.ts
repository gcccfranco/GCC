import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Version perso d'un chant dans une setlist (docs/spec-version-perso.md).
// V1 : « Ma version » — accords et paroles retouchés pour soi, enregistrés
// par compte, sans toucher la setlist de la présidence ; jouée en mode louange.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-perso";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`;

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

/** Ma version d'Abba Père : « planait » devient « flottait » (couplet 1). */
const MY_ABBA = readFileSync("content/songs/abba-pere.cho", "utf8").replace("planait sur la", "flottait sur la");

const myDoc = (items: Record<string, unknown>) => ({
  authorUid: MUSICIEN.uid,
  authorName: "Ruth K.",
  items,
  choices: {},
});

const lyricLine = (page: Page, text: string) => page.locator("[data-copy-line]", { hasText: text });
/** Page affichée du mode louange, sans la copie invisible qui sert à mesurer. */
const onStage = (page: Page, text: string) =>
  page.locator("[data-performance-mode] [data-copy-line]:not([aria-hidden=true] *)", { hasText: text });
const song = (page: Page, position: number) => page.locator(`[data-outline-item="${position}"]`);
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function openPartitions(page: Page, extraDocs: Record<string, Record<string, unknown>> = {}, who: FakeProfile = MUSICIEN) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, who, { [SETLIST_DOC]: SETLIST, ...extraDocs }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

async function deleteLine(page: Page, text: string | RegExp) {
  await page.getByRole("button").filter({ hasText: text }).first().click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
}

test("« Ma version » : retoucher une ligne écrit dans mon document, jamais dans la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await page.getByRole("button", { name: "Ma version" }).click();
  await expect(page.getByText(/Toi seul vois ces changements/)).toBeVisible();
  await capture(page, "v1-mode-ma-version");
  await deleteLine(page, "planait");

  await expect(song(page, 1).getByText("Ma version", { exact: true })).toBeVisible();
  await capture(page, "v1-apres-retouche");
  await expect(lyricLine(page, "planait")).toHaveCount(0);
  await expect(lyricLine(page, "le chant qui")).toHaveCount(1);

  const mine = db.writes.filter((w) => w.path === VERSION_DOC);
  expect(mine.length).toBeGreaterThan(0);
  const items = mine[mine.length - 1].data.items as Record<string, { content: string; shared: boolean }>;
  expect(items["abba-pere"].content).toContain("Bien a[F#m]vant le chant");
  expect(items["abba-pere"].content).not.toContain("planait");
  expect(items["abba-pere"].shared).toBe(false);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)), "la setlist et son historique ne bougent pas").toHaveLength(0);
});

test("ma version s'affiche dans la vue partitions et se joue en mode louange", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(lyricLine(page, "planait")).toHaveCount(0);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toBeVisible();
  await expect(song(page, 2).getByText("Ma version", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(onStage(page, "flottait").first()).toBeVisible();
  await expect(onStage(page, "planait")).toHaveCount(0);
  await capture(page, "v1-mode-louange");
});

test("revenir à la présidence retire ma version", async ({ page }) => {
  const db = await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await page.getByRole("button", { name: "Ma version" }).click();
  await page.getByRole("button", { name: "Revenir à la présidence" }).click();
  await capture(page, "v1-revenir-presidence");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();

  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toHaveCount(0);
  const last = db.writes.filter((w) => w.path === VERSION_DOC).pop();
  expect(last).toBeDefined();
  expect(Object.keys(last!.data.items as object)).toHaveLength(0);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);
});

test("un responsable en mode « Adapter » voit la version de la présidence, pas la sienne", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await page.getByRole("button", { name: "Adapter" }).click();
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(lyricLine(page, "flottait")).toHaveCount(0);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Adapter" }).click();
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
});

test("chant chinois : ma version garde les caractères et le pinyin des autres lignes", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await deleteLine(page, "宝");

  await expect(song(page, 2).getByText("Ma version", { exact: true })).toBeVisible();
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v1-zh");
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(page.locator("span").filter({ hasText: /^wǒ$/ }).first()).toBeVisible();
  const items = db.writes.filter((w) => w.path === VERSION_DOC).pop()!.data.items as Record<string, { content: string }>;
  expect(items["一生爱你"].content).not.toContain("宝贵");
  expect(items["一生爱你"].content).toContain("wǒ de xīn shēn shēn");
  expect(items["abba-pere"]).toBeUndefined();
});

// ── V2 : ma structure (quelles sections voir, dans quel ordre) ────────────────

/** Ma structure d'Abba Père : C1 R P, une fois chacune. */
const MY_STRUCTURE = ["verse-2", "chorus-3", "bridge-6"];
const strip = (page: Page, position: number) => song(page, position).locator("ol abbr");
const bodySections = (page: Page, position: number) => song(page, position).locator("[data-section]");
/** Sommaire : masqué par CSS sous 1280 px (téléphone, tablette), mais toujours rendu. */
const outline = (page: Page) => page.getByRole("navigation", { name: "Déroulé", includeHidden: true });

test("ma structure : le corps la suit, le bandeau, le sommaire et la liste restent cohérents", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  });
  await expect(bodySections(page, 1)).toHaveCount(3);
  await expect(bodySections(page, 1).nth(0)).toContainText("Couplet 1");
  await expect(bodySections(page, 1).nth(1)).toContainText("Refrain");
  await expect(bodySections(page, 1).nth(2)).toContainText("Pont");
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toBeVisible();
  await expect(strip(page, 1), "le bandeau garde la structure de la présidence").toHaveText(["I", "C1", "R", "Pm", "C2", "P"]);
  await expect(outline(page).getByText("Interlude"), "le sommaire suit ce qui est affiché").toHaveCount(0);
  await expect(outline(page).getByText("Pont")).toHaveCount(1);
  await capture(page, "v2-ma-structure");

  await page.getByRole("button", { name: "Liste" }).click();
  // 5C1 (20/09/2026) : la liste écrit la structure en abrégé — l'interlude de la présidence y est « Pm ».
  await expect(page.getByRole("listitem").filter({ hasText: "Abba Père" }).first(), "la vue liste garde la présidence").toContainText("Pm");
});

test("la feuille « Sections » enregistre ma structure sans toucher la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await expect(bodySections(page, 1)).toHaveCount(6);
  await page.getByRole("button", { name: "Ma version" }).click();
  await song(page, 1).getByRole("button", { name: "Sections" }).click();
  const sheet = page.getByRole("dialog", { name: "Sections" });
  await expect(sheet).toBeVisible();
  await capture(page, "v2-feuille-sections");
  // Retirer « Interlude » : dernier bouton de sa ligne (corbeille).
  await sheet.locator("span", { hasText: /^Interlude$/ }).locator("..").locator("button").last().click();
  await sheet.getByRole("button", { name: "Enregistrer" }).click();

  await expect(sheet).toBeHidden();
  await expect(bodySections(page, 1)).toHaveCount(5);
  await expect(song(page, 1).getByText("Interlude")).toHaveCount(0);
  const items = db.writes.filter((w) => w.path === VERSION_DOC).pop()!.data.items as Record<string, { content: string | null; structure: string[] }>;
  expect(items["abba-pere"].structure).toEqual(["intro-1", "verse-2", "chorus-3", "verse-5", "bridge-6"]);
  expect(items["abba-pere"].content).toBeNull();
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);
});

test("« Réinitialiser » dans la feuille revient à la structure de la présidence", async ({ page }) => {
  const db = await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  });
  await page.getByRole("button", { name: "Ma version" }).click();
  await song(page, 1).getByRole("button", { name: "Sections" }).click();
  await page.getByRole("dialog", { name: "Sections" }).getByRole("button", { name: "Réinitialiser" }).click();

  await expect(bodySections(page, 1)).toHaveCount(6);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toHaveCount(0);
  const last = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  expect(Object.keys(last.data.items as object)).toHaveLength(0);
});

test("« Structure seule » masque le corps même avec ma structure", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  });
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitemradio", { name: "Structure seule" }).click();
  await expect(bodySections(page, 1)).toHaveCount(0);
  await expect(strip(page, 1)).toHaveText(["I", "C1", "R", "Pm", "C2", "P"]);
});

test("mode louange : ma structure, sans les notes d'occurrence de la présidence", async ({ page }) => {
  const withNote = {
    ...SETLIST,
    items: [item({ songSlug: "abba-pere", position: 1, sectionNotes: { "verse-2": "doucement" } }), SETLIST.items[1]],
  };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, {
    [SETLIST_DOC]: withNote,
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(bodySections(page, 1)).toHaveCount(3);
  await expect(song(page, 1).getByText("doucement"), "la note reste dans le bandeau, pas dans le corps").toHaveCount(1);
  await expect(bodySections(page, 1).getByText("doucement")).toHaveCount(0);

  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  const stage = page.locator("[data-performance-mode] [data-section]:not([aria-hidden=true] *)");
  await expect(stage.first()).toContainText("Couplet 1");
  await expect(page.locator("[data-performance-mode]").getByText("Interlude")).toHaveCount(0);
  await capture(page, "v2-mode-louange");
});

test("chant chinois : ma structure ne garde que le refrain, avec son pinyin", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "一生爱你": { content: null, structure: ["chorus-3"], shared: false } }),
  });
  await expect(bodySections(page, 2)).toHaveCount(1);
  await expect(bodySections(page, 2).first()).toContainText("Refrain");
  await expect(song(page, 2).locator("span").filter({ hasText: /^yī$/ }).first()).toBeVisible();
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(strip(page, 2)).toHaveText(["I", "C", "R"]);
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v2-zh");
});

// ── V3 : partager ma version, choisir celle d'un autre ────────────────────────

const CHRISTELLE: FakeProfile = {
  uid: "uid-christelle",
  email: "christelle@example.com",
  firstName: "Christelle",
  lastName: "Durand",
  planningName: "Christelle D.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const CHRISTELLE_DOC = `setlists/${SETLIST_ID}/versions/${CHRISTELLE.uid}`;
/** La version de Ruth (« flottait »), partagée. */
const RUTH_SHARED = myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: true } });
/** Version de Ruth de 一生爱你 : première ligne du couplet (et son pinyin) retirée. */
const MY_ZH = readFileSync("content/songs/一生爱你.cho", "utf8")
  .split("\n")
  .filter((l) => !l.includes("宝贵") && !l.startsWith("qīn ài de bǎo guì"))
  .join("\n");
const versionSelect = (page: Page, position: number) => song(page, position).getByRole("combobox", { name: "Version" });
const copyButton = (page: Page, position: number) => song(page, position).getByRole("button", { name: "Copier les paroles" });

test("une version partagée se choisit, et le choix suit mon compte jusqu'en mode louange", async ({ page }) => {
  const db = await openPartitions(page, { [VERSION_DOC]: RUTH_SHARED }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveValue("presidence");
  await expect(versionSelect(page, 2), "pas d'alternative sur le second chant").toHaveCount(0);
  await versionSelect(page, 1).selectOption(MUSICIEN.uid);

  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(song(page, 1).getByText("Version de Ruth K.", { exact: true })).toBeVisible();
  await expect(copyButton(page, 1), "pas de copie des paroles hors présidence").toHaveCount(0);
  await capture(page, "v3-version-choisie");
  const last = db.writes.filter((w) => w.path === CHRISTELLE_DOC).pop()!;
  expect(last.data.choices).toEqual({ "abba-pere": MUSICIEN.uid });
  expect(last.data.authorUid).toBe(CHRISTELLE.uid);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);

  await page.reload();
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(lyricLine(page, "flottait"), "le choix est retrouvé au rechargement").toHaveCount(1);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(onStage(page, "flottait").first()).toBeVisible();
});

test("partager ma version, puis retirer le partage", async ({ page }) => {
  const db = await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await page.getByRole("button", { name: "Ma version" }).click();
  const share = song(page, 1).getByRole("checkbox", { name: "Partager ma version" });
  await expect(share).not.toBeChecked();
  await share.click();
  await expect(share).toBeChecked();
  await capture(page, "v3-partager");
  let items = db.writes.filter((w) => w.path === VERSION_DOC).pop()!.data.items as Record<string, { shared: boolean; content: string }>;
  expect(items["abba-pere"].shared).toBe(true);
  expect(items["abba-pere"].content).toContain("flottait");

  await share.click();
  await expect(share).not.toBeChecked();
  items = db.writes.filter((w) => w.path === VERSION_DOC).pop()!.data.items as Record<string, { shared: boolean; content: string }>;
  expect(items["abba-pere"].shared).toBe(false);
});

test("une version non partagée n'est proposée à personne", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveCount(0);
  await expect(song(page, 1).getByText(/Version de/)).toHaveCount(0);
});

test("un choix vers une version retirée du partage revient à la présidence", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
    [CHRISTELLE_DOC]: { authorUid: CHRISTELLE.uid, authorName: "Christelle D.", items: {}, choices: { "abba-pere": MUSICIEN.uid } },
  }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(lyricLine(page, "flottait")).toHaveCount(0);
  await expect(song(page, 1).getByText(/Version de/)).toHaveCount(0);
});

test("choisir « Présidence » alors que j'ai ma version, sans la perdre", async ({ page }) => {
  const db = await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveValue(MUSICIEN.uid);
  await versionSelect(page, 1).selectOption("presidence");

  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toHaveCount(0);
  const last = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  expect(last.data.choices).toEqual({ "abba-pere": "presidence" });
  expect(Object.keys(last.data.items as object)).toEqual(["abba-pere"]);
});

test("chant chinois : la version partagée de Ruth, avec son pinyin", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "一生爱你": { content: MY_ZH, structure: null, shared: true } }),
  }, CHRISTELLE);
  await expect(lyricLine(page, "宝")).toHaveCount(1);
  await versionSelect(page, 2).selectOption(MUSICIEN.uid);
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(song(page, 2).locator("span").filter({ hasText: /^wǒ$/ }).first()).toBeVisible();
  await expect(song(page, 2).getByText("Version de Ruth K.", { exact: true })).toBeVisible();
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v3-zh");
});

test("« Copier les paroles » n'existe que si je suis la setlist de la présidence", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({
      "abba-pere": { content: MY_ABBA, structure: null, shared: false },
      "一生爱你": { content: null, structure: ["chorus-3"], shared: false },
    }),
  });
  await expect(copyButton(page, 1), "ma version d'accords et paroles").toHaveCount(0);
  await expect(copyButton(page, 2), "ma structure").toHaveCount(0);
  await versionSelect(page, 1).selectOption("presidence");
  await expect(copyButton(page, 1), "de retour sur la présidence").toHaveCount(1);
  await expect(copyButton(page, 2)).toHaveCount(0);
});
