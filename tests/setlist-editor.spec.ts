import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { ajouterChant, attendreEditeur, champNotes, champPresidence, choisirTonalite, fermerFeuille } from "./helpers/editeurSetlist";
import { buildFormItems } from "../src/lib/setlist/formItems";
import { buildSetlistItems } from "../src/lib/setlist/buildSetlistItems";
import type { SetlistItem } from "../src/types/setList";
import type { SongIndexEntry } from "../src/types/song";
import { readFileSync } from "fs";

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
  await attendreEditeur(page, "Abba Père");
  return db;
}

test("création : une seule page, brouillon enregistré tout seul, « Publier » la rend visible", async ({ page }) => {
  await emptyPlanning(page);
  const db = await signInAs(page, MUSICIEN, {}, "/setlists/new?autre=1");

  await expect(page.getByRole("button", { name: /Suivant/ })).toHaveCount(0);
  // Infos et chants sur la même page.
  await expect(page.locator("[data-ouvrir-bibliotheque]")).toBeVisible();

  await page.getByLabel("Titre").fill("Culte du 28 septembre");
  await page.getByLabel("Catégorie").selectOption("Culte Francophone");
  await champPresidence(page).selectOption("__other__");
  await page.getByPlaceholder("ex. Timothée").fill("Jonathan Z.");
  await ajouterChant(page, "Abba Père");

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

  await choisirTonalite(page, "Abba Père", "B");
  await choisirTonalite(page, "一生爱你", "F");
  await fermerFeuille(page);

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
  await champNotes(page).fill("Thème : la grâce");
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/setlists/${SETLIST_ID}`);
  await expect.poll(() => db.doc(`setlists/${SETLIST_ID}`)?.notes).toBe("Thème : la grâce");
});

test("création : « Publier » juste après une retouche, sur réseau lent, ne repasse pas en brouillon", async ({ page }) => {
  await emptyPlanning(page);
  const db = await signInAs(page, MUSICIEN, {}, "/setlists/new?autre=1");
  await page.getByLabel("Titre").fill("Culte du 28 septembre");
  await page.getByLabel("Catégorie").selectOption("Culte Francophone");
  await champPresidence(page).selectOption("__other__");
  await page.getByPlaceholder("ex. Timothée").fill("Jonathan Z.");
  await expect.poll(() => setlistWrites(db).length, { timeout: 10_000 }).toBeGreaterThan(0);
  // Réseau lent : chaque écriture de la setlist met 2,5 s à partir.
  await page.route(/documents\/setlists\/[^/:?]+\?/, async (route) => {
    await new Promise((r) => setTimeout(r, 2_500));
    await route.fallback();
  });
  await champNotes(page).fill("Thème : la grâce");
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
  await champNotes(page).fill("Thème : la paix");
  await page.evaluate(() => history.back());
  await expect.poll(() => db.doc(`setlists/${SETLIST_ID}`)?.notes).toBe("Thème : la paix");
  await expect.poll(() => notified.length).toBe(1);
  expect(notified[0]).toContain(SETLIST_ID);
});

// « Modifier » réécrit tous les items : les accords retouchés sur un scan 简谱
// (mode Adapter, `jianpuChords`) doivent être reconduits tels quels.
const RETOUCHES = { changed: { 0: "Em7", 3: "" }, added: [{ page: 0, x: 800, y: 1163, c: "G" }] };
const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
const SONGS_MAP = Object.fromEntries(INDEX.map((s) => [s.slug, s]));
const AVEC_RETOUCHES = [
  item({ songSlug: "abba-pere", position: 1 }),
  item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, jianpuChords: RETOUCHES }),
] as SetlistItem[];

test("(pur) jianpuChords : relus par buildFormItems, réécrits par buildSetlistItems", () => {
  const relus = buildSetlistItems(buildFormItems(AVEC_RETOUCHES, SONGS_MAP));
  expect(relus[1].songSlug).toBe("一生爱你");
  expect(relus[1].jianpuSheet).toBe(true);
  expect(relus[1].jianpuChords).toEqual(RETOUCHES);
});

test("(pur) jianpuChords : un chant sans retouche n'a pas la clé", () => {
  const relus = buildSetlistItems(buildFormItems(AVEC_RETOUCHES, SONGS_MAP));
  expect("jianpuChords" in relus[0]).toBe(false);
});

test("modification : un changement ailleurs garde les accords retouchés sur un scan 简谱", async ({ page }) => {
  await emptyPlanning(page);
  const db = await signInAs(
    page,
    MUSICIEN,
    { [`setlists/${SETLIST_ID}`]: { ...SETLIST, items: AVEC_RETOUCHES } },
    `/setlists/${SETLIST_ID}/edit`,
  );
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await expect.poll(() => setlistWrites(db, SETLIST_ID).length).toBeGreaterThan(0);
  const items = setlistWrites(db, SETLIST_ID).pop()!.data.items as Record<string, unknown>[];
  expect(items.find((i) => i.songSlug === "abba-pere")!.keyOverride).toBe("B");
  expect(items.find((i) => i.songSlug === "一生爱你")!.jianpuChords, "retouches du scan conservées").toEqual(RETOUCHES);
  expect("jianpuChords" in items.find((i) => i.songSlug === "abba-pere")!).toBe(false);
});
