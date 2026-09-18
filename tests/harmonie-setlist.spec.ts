import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 9 / H2 et H4 dans une setlist : le bouton « Idées d'harmonie » sur un
// chant, l'essai dans Ma version (jamais dans la setlist de la présidence), et
// la transition vers le chant suivant.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Ruth tient le piano : c'est le planning qui le dit, pas son profil.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Jonathan Z.", "", "", "Ruth K.", "Éloïse M.", "", "", "", "Hewei", "", ""],
]);

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-harmonie";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`;

const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...over,
});

// Abba Père est en A, 一生爱你 en E : un quart plus haut, la transition le dit.
const SETLIST = {
  title: "Culte du 21 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })],
};

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrirPartitions(page: Page, extra: Record<string, Record<string, unknown>> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  const db = await signInAs(page, MUSICIEN, { [SETLIST_DOC]: SETLIST, ...extra }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

const ouvrirLesIdees = async (page: Page) => {
  await page.getByRole("button", { name: "Idées d'harmonie" }).first().click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
};

test("un pianiste ouvre les idées d'un chant de la setlist, avec la transition vers le suivant", async ({ page }) => {
  await ouvrirPartitions(page);
  await ouvrirLesIdees(page);
  await expect(page.locator("[data-suggestion]").first()).toBeVisible();
  const transition = page.locator("section", { has: page.getByRole("heading", { name: "Vers le chant suivant" }) });
  await expect(transition, "Abba Père (A) → 一生爱你 (E) : une quinte plus haut").toContainText("Vers la tonalité du 5");
  await expect(transition).toContainText("一生爱你");
  await capture(page, "idees-setlist");
});

test("hors « Ma version », l'idée se lit mais ne s'applique pas", async ({ page }) => {
  await ouvrirPartitions(page);
  await ouvrirLesIdees(page);
  await expect(page.getByRole("button", { name: "Essayer dans Ma version" })).toHaveCount(0);
});

test("« Essayer dans Ma version » écrit dans mon document, jamais dans la setlist", async ({ page }) => {
  const db = await ouvrirPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await ouvrirLesIdees(page);
  const premiere = page.locator("[data-suggestion]").first();
  // Les accords proposés sont les seconds de la ligne « avant → après ».
  const apres = await premiere.locator(".font-chord").nth(1).innerText();
  await premiere.getByRole("button", { name: "Essayer dans Ma version" }).click();

  await expect.poll(() => db.writes.filter((w) => w.path === VERSION_DOC).length).toBeGreaterThan(0);
  const dernier = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  const items = dernier.data.items as Record<string, { content: string }>;
  const premierAccord = apres.split(" – ")[0];
  expect(items["abba-pere"].content, `le nouvel accord ${premierAccord} est écrit`).toContain(`[${premierAccord}]`);
  expect(
    db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)),
    "la setlist de la présidence ne bouge pas",
  ).toHaveLength(0);
});

test("« Appliquer à la setlist » fait monter le dernier refrain", async ({ page }) => {
  const db = await ouvrirPartitions(page);
  await ouvrirLesIdees(page);
  const modulation = page.locator("[data-modulation='modulations/ton-par-le-5']");
  await expect(modulation, "un ton plus haut, amené par le 5").toContainText("en B");
  await modulation.getByRole("button", { name: "Appliquer à la setlist" }).click();

  await expect.poll(() => db.writes.filter((w) => w.path === SETLIST_DOC).length).toBeGreaterThan(0);
  const ecrit = db.writes.filter((w) => w.path === SETLIST_DOC).pop()!;
  const items = ecrit.data.items as Array<{ songSlug: string; sectionKeys?: Record<string, string>; contentOverride?: string }>;
  const abba = items.find((i) => i.songSlug === "abba-pere")!;
  expect(Object.values(abba.sectionKeys ?? {}), "le dernier refrain monte en B").toContain("B");
  expect(abba.contentOverride, "l'accord d'approche est posé avant").toContain("F#7");
});

test("chant lu sur son scan 简谱 : l'app rappelle de reporter le changement", async ({ page }) => {
  // Préférence « toujours le scan » : la retouche part bien dans la version
  // texte, mais l'image ne bouge pas — l'app doit le dire.
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await ouvrirPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await page.getByRole("button", { name: "Idées d'harmonie" }).first().click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
  const premiere = page.locator("[data-suggestion]").first();
  await premiere.getByRole("button", { name: "Essayer dans Ma version" }).click();
  await expect(page.getByText(/À reporter sur la partition 简谱/)).toBeVisible();
});

test("un 升调 se voit au-dessus du scan 简谱, qui ne peut pas le montrer", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  const avecModulation = {
    ...SETLIST,
    items: [
      SETLIST.items[0],
      item({ songSlug: "一生爱你", position: 2, sectionKeys: { "chorus-3": "F#" } }),
    ],
  };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MUSICIEN, { [SETLIST_DOC]: avecModulation }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  const bandeau = page.locator("[data-bandeau-modulation]");
  await expect(bandeau.first()).toContainText("on monte en F#");
});

test("un chanteur ne voit pas le bouton", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, { ...MUSICIEN, planningName: "Personne" }, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Idées d'harmonie" })).toHaveCount(0);
});
