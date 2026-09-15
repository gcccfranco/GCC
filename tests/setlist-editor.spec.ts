import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";

// Chantier Setlist, lot 1 (docs/spec-setlist.md) : l'éditeur est une seule
// page, enregistrée automatiquement ; « Publier » à la création seulement.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-edit";

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

/** Planning vide : l'éditeur propose alors « Autre » pour la présidence. */
async function emptyPlanning(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
}

const setlistWrites = (db: FakeDb, id?: string) =>
  db.writes.filter((w) => (id ? w.path === `setlists/${id}` : /^setlists\/[^/]+$/.test(w.path)) && w.method !== "DELETE");

async function openEditor(page: Page) {
  await emptyPlanning(page);
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, `/setlists/${SETLIST_ID}/edit`);
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  return db;
}

test("création : une seule page, brouillon enregistré tout seul, « Publier » la rend visible", async ({ page }) => {
  await emptyPlanning(page);
  const db = await signInAs(page, MUSICIEN, {}, "/setlists/new");

  await expect(page.getByRole("button", { name: /Suivant/ })).toHaveCount(0);
  // Infos et chants sur la même page.
  await expect(page.getByPlaceholder("Chercher un chant à ajouter…")).toBeVisible();

  await page.getByLabel("Titre").fill("Culte du 28 septembre");
  await page.getByLabel("Catégorie").selectOption("Culte Francophone");
  await page.getByLabel("Présidence *", { exact: true }).selectOption("__other__");
  await page.getByPlaceholder("ex. Timothée").fill("Jonathan Z.");
  await page.getByPlaceholder("Chercher un chant à ajouter…").fill("Abba Père");
  await page.getByRole("button", { name: "Ajouter" }).first().click();

  await expect.poll(() => setlistWrites(db).at(-1)?.data.isDraft, { timeout: 10_000 }).toBe(true);
  const draft = setlistWrites(db).at(-1)!;
  expect(draft.data.items).toHaveLength(1);

  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/${draft.path}`);
  expect(db.doc(draft.path)?.isDraft).toBe(false);
});

test("modification : un changement de tonalité est enregistré sans bouton (FR + 中文)", async ({ page }) => {
  const db = await openEditor(page);
  await expect(page.getByRole("button", { name: /Enregistrer les modifications/ })).toHaveCount(0);

  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await page.getByLabel("Tonalité de 一生爱你").selectOption("F");

  await expect
    .poll(() => (db.doc(`setlists/${SETLIST_ID}`)?.items as { keyOverride: string | null }[]).map((i) => i.keyOverride))
    .toEqual(["B", "F"]);
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible();
});

test("modification : titre vidé, rien n'est enregistré et le repère le dit", async ({ page }) => {
  const db = await openEditor(page);
  await page.getByLabel("Titre").fill("");
  await expect(page.getByText("Pas enregistré : le titre est obligatoire.")).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(3_000);
  expect(setlistWrites(db, SETLIST_ID)).toHaveLength(0);
});

test("modification : « Terminé » envoie le changement en cours et ramène à la setlist", async ({ page }) => {
  const db = await openEditor(page);
  await page.getByLabel("Notes (optionnel)").fill("Thème : la grâce");
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/setlists/${SETLIST_ID}`);
  await expect.poll(() => db.doc(`setlists/${SETLIST_ID}`)?.notes).toBe("Thème : la grâce");
});

test("création : « Publier » juste après une retouche, sur réseau lent, ne repasse pas en brouillon", async ({ page }) => {
  await emptyPlanning(page);
  const db = await signInAs(page, MUSICIEN, {}, "/setlists/new");
  await page.getByLabel("Titre").fill("Culte du 28 septembre");
  await page.getByLabel("Catégorie").selectOption("Culte Francophone");
  await page.getByLabel("Présidence *", { exact: true }).selectOption("__other__");
  await page.getByPlaceholder("ex. Timothée").fill("Jonathan Z.");
  await expect.poll(() => setlistWrites(db).length, { timeout: 10_000 }).toBeGreaterThan(0);
  // Réseau lent : chaque écriture de la setlist met 2,5 s à partir.
  await page.route(/documents\/setlists\/[^/:?]+\?/, async (route) => {
    await new Promise((r) => setTimeout(r, 2_500));
    await route.fallback();
  });
  await page.getByLabel("Notes (optionnel)").fill("Thème : la grâce");
  await page.getByRole("button", { name: "Publier" }).click();
  const id = setlistWrites(db)[0].path;
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/${id}`, { timeout: 15_000 });
  await page.waitForTimeout(6_000);
  expect(db.doc(id)?.isDraft).toBe(false);
});

test("modification : quitter l'éditeur sans « Terminé » envoie le changement et prévient l'équipe", async ({ page }) => {
  const db = await openEditor(page);
  const notified: string[] = [];
  await page.route("**/api/push/notify-setlist", (route) => {
    notified.push(route.request().postData() ?? "");
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.getByLabel("Notes (optionnel)").fill("Thème : la paix");
  await page.evaluate(() => history.back());
  await expect.poll(() => db.doc(`setlists/${SETLIST_ID}`)?.notes).toBe("Thème : la paix");
  await expect.poll(() => notified.length).toBe(1);
  expect(notified[0]).toContain(SETLIST_ID);
});
