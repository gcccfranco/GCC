import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";

// Harmonie H4-2 (docs/spec-harmonie-accords.md) : la porte 2 en colonne de 400 px à droite de la partition,
// seulement quand la zone de lecture (partition + colonne) fait 824 px au moins (400 + 24 + 400) ; sinon la feuille.
// Page chant : la page Chants a deux volets (liste + chant) dès 1 024 px ; la colonne n'y tient qu'à partir d'environ
// 1 650 px de fenêtre (test à 1 800 px) ; à 1 080, 1 280 et 1 440 px c'est la feuille. Setlist : colonne à 1 080, 1 280 et 1 440 px.

const CLE = "gcc-harmonie-colonne";
const AGNES: FakeProfile = { uid: "uid-agnes", email: "agnes@example.com", firstName: "Agnès", lastName: "T.", planningName: "Agnès T.", ...musicien("piano") };

const nom = (info: TestInfo) => info.project.name;
const colonneSurChant = (info: TestInfo) => nom(info) === "ordinateur";
const colonneSurSetlist = (info: TestInfo) => ["ordinateur", "ordinateur-1440", "tablette-paysage"].includes(nom(info));
const largeur = (page: Page) => page.viewportSize()?.width ?? 0;
const bouton = (page: Page) => page.getByTestId("barre-outils").getByRole("button", { name: /^(Harmonie|和声)$/ });
const colonne = (page: Page) => page.locator("[data-harmonie-colonne]");
const feuille = (page: Page) => page.locator("[data-idees-harmonie]");
const pref = (page: Page) => page.evaluate((k) => localStorage.getItem(k), CLE);

async function ouvrirChant(page: Page, slug = "a-jamais-tu-es-saint", zh = false) {
  if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* ignore */ } });
  await signInAs(page, AGNES, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom [data-copy-line]").first()).toBeVisible();
}

test("page chant : fermée par défaut", async ({ page }) => {
  await ouvrirChant(page);
  await expect(colonne(page)).toHaveCount(0);
  await expect(feuille(page)).toHaveCount(0);
});

/** Fenêtre assez large pour que la zone de lecture de la page Chants (à droite de la liste) fasse 824 px. */
async function ouvrirChantLarge(page: Page) {
  await page.setViewportSize({ width: 1800, height: 900 });
  await ouvrirChant(page);
}

test("page chant, grande fenêtre : le bouton ouvre une colonne de 400 px à droite de la partition, sans voile", async ({ page }, info) => {
  test.skip(!colonneSurChant(info), "ordinateur seulement");
  await ouvrirChantLarge(page);
  await expect(bouton(page)).toHaveAttribute("aria-expanded", "false");
  await bouton(page).click();
  await expect(colonne(page)).toBeVisible();
  await expect(bouton(page)).toHaveAttribute("aria-expanded", "true");
  await expect(colonne(page).getByRole("heading", { name: "Harmonie de ce chant" })).toBeVisible();
  await expect(page.locator("[data-vaul-overlay]"), "pas de voile").toHaveCount(0);
  const c = (await colonne(page).boundingBox())!;
  const p = (await page.locator("main.song-zoom").boundingBox())!;
  expect(Math.round(c.width)).toBe(400);
  expect(p.x + p.width, "la partition finit avant la colonne").toBeLessThanOrEqual(c.x + 1);
  expect(c.x + c.width).toBeLessThanOrEqual(largeur(page) + 1);
  expect(p.width, "une partition lisible").toBeGreaterThanOrEqual(400);
  // Le haut de la colonne est celui de la partition (même marge haute que `main`).
  expect(Math.abs(c.y - p.y)).toBeLessThanOrEqual(1);
  expect(c.x + c.width).toBeLessThanOrEqual(1800 + 1);
});

test("page chant, grande fenêtre : préférence gardée après rechargement ; la croix ferme et rend le focus", async ({ page }, info) => {
  test.skip(!colonneSurChant(info), "ordinateur seulement");
  await ouvrirChantLarge(page);
  await bouton(page).click();
  await expect(colonne(page)).toBeVisible();
  expect(await pref(page)).toBe("1");
  await page.reload();
  await expect(colonne(page)).toBeVisible();
  await colonne(page).getByRole("button", { name: "Fermer" }).click();
  await expect(colonne(page)).toHaveCount(0);
  await expect(bouton(page)).toBeFocused();
  expect(await pref(page)).toBe("0");
  await page.reload();
  await expect(page.locator("main.song-zoom [data-copy-line]").first()).toBeVisible();
  await expect(colonne(page)).toHaveCount(0);
});

test("page chant, grande fenêtre : Échap ferme la colonne sans que le focus y soit", async ({ page }, info) => {
  test.skip(!colonneSurChant(info), "ordinateur seulement");
  await ouvrirChantLarge(page);
  await bouton(page).click();
  await expect(colonne(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(colonne(page)).toHaveCount(0);
});

test("page Chants à deux volets (1 080, 1 280, 1 440 px) : zone trop étroite, c'est la feuille, même avec la préférence « 1 »", async ({ page }, info) => {
  test.skip(!["ordinateur", "ordinateur-1440", "tablette-paysage"].includes(nom(info)), "grand écran seulement");
  await page.addInitScript((k) => { try { localStorage.setItem(k, "1"); } catch { /* ignore */ } }, CLE);
  await ouvrirChant(page);
  await expect(colonne(page)).toHaveCount(0);
  await bouton(page).click();
  await expect(feuille(page)).toBeVisible();
  await expect(colonne(page)).toHaveCount(0);
  const p = (await page.locator("main.song-zoom").boundingBox())!;
  expect(p.width, "la partition garde sa largeur").toBeGreaterThanOrEqual(400);
});

test("téléphone et tablette portrait : le bouton ouvre la feuille, avec sa croix, pas de colonne", async ({ page }, info) => {
  test.skip(!["telephone", "tablette"].includes(nom(info)), "petit écran seulement");
  await ouvrirChant(page);
  await bouton(page).click();
  await expect(feuille(page)).toBeVisible();
  await expect(colonne(page)).toHaveCount(0);
  await expect(feuille(page).getByRole("button", { name: "Fermer" })).toBeVisible();
});

test("chant chinois, interface chinoise : 和声 et 这首歌的和声", async ({ page }) => {
  await ouvrirChant(page, "一切歌颂赞美", true);
  await expect(bouton(page)).toHaveText("和声");
  await bouton(page).click();
  await expect(feuille(page).getByText("这首歌的和声")).toBeVisible();
  await expect(feuille(page).getByRole("button", { name: "关闭" })).toBeVisible();
});

const SETLIST_COLONNE = {
  title: "Culte d'essai", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21", language: "fr", notes: "",
  ownerId: AGNES.uid, isPrivate: false,
  items: [
    { songSlug: "abba-pere", position: 1 }, { songSlug: "a-jamais-tu-es-saint", position: 2 },
  ].map((i) => ({ keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...i })),
};
const puce = (page: Page, n: number) => page.locator(`[data-outline-item="${n}"]`).getByRole("button", { name: "Harmonie", exact: true });

async function ouvrirSetlist(page: Page) {
  await signInAs(page, AGNES, { "setlists/setlist-colonne": SETLIST_COLONNE }, "/setlists/setlist-colonne");
  await ouvrirPartitions(page);
}

test("setlist : la colonne s'ouvre pour le chant courant, sous l'en-tête collant, jusqu'au bas de la fenêtre", async ({ page }, info) => {
  test.skip(!colonneSurSetlist(info), "ordinateur seulement");
  await ouvrirSetlist(page);
  await puce(page, 2).click();
  await expect(colonne(page)).toBeVisible();
  const c = (await colonne(page).boundingBox())!;
  expect(Math.round(c.width)).toBe(400);
  // Elle colle sous l'en-tête collant de la setlist quand il est visible (il s'escamote au défilement).
  const entete = (await page.locator("[data-en-tete]").boundingBox())!;
  if (entete.y + entete.height > 0) expect(c.y, "sous l'en-tête").toBeGreaterThanOrEqual(entete.y + entete.height - 1);
  expect(Math.round(c.y + c.height), "jusqu'au bas de la fenêtre").toBe(page.viewportSize()!.height);
  expect(c.x + c.width).toBeLessThanOrEqual(largeur(page) + 1);
  await expect(colonne(page).getByText(/jamais tu es saint/i).first()).toBeVisible();
  // Après défilement, jusqu'en fin de page : collée, croix visible, bas de la fenêtre atteint.
  const h = page.viewportSize()!.height;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => { const b = (await colonne(page).boundingBox())!; return Math.abs(b.y + b.height - h); }).toBeLessThanOrEqual(2);
  const d = (await colonne(page).boundingBox())!;
  expect(d.y, "haut de la colonne dans la fenêtre").toBeGreaterThanOrEqual(0);
  const croix = (await colonne(page).getByRole("button").first().boundingBox())!;
  expect(croix.y).toBeGreaterThanOrEqual(0);
  expect(croix.y + croix.height).toBeLessThanOrEqual(h);
});

test("setlist : la croix rend le focus à la puce ; Échap ferme sans que le focus soit dans la colonne", async ({ page }, info) => {
  test.skip(!colonneSurSetlist(info), "ordinateur seulement");
  await ouvrirSetlist(page);
  await puce(page, 2).click();
  await colonne(page).getByRole("button", { name: "Fermer" }).click();
  await expect(colonne(page)).toHaveCount(0);
  await expect(puce(page, 2)).toBeFocused();
  expect(await pref(page)).toBe("0");
  await puce(page, 2).click();
  await expect(colonne(page)).toBeVisible();
  await page.mouse.click(5, 5);
  await page.keyboard.press("Escape");
  await expect(colonne(page)).toHaveCount(0);
});

test("setlist : la préférence « 1 » ouvre la colonne au chargement, sur le chant lu, et la colonne le suit", async ({ page }, info) => {
  test.skip(!colonneSurSetlist(info), "ordinateur seulement");
  await page.addInitScript((k) => { try { localStorage.setItem(k, "1"); } catch { /* ignore */ } }, CLE);
  await ouvrirSetlist(page);
  await expect(colonne(page)).toBeVisible();
  await expect(colonne(page).getByText(/Abba/i).first()).toBeVisible();
  await page.locator('[data-outline-item="2"]').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(colonne(page).getByText(/jamais tu es saint/i).first()).toBeVisible();
});

test("setlist : une bulle d'accord ouverte se ferme à l'ouverture de la colonne", async ({ page }, info) => {
  // Au toucher, l'accord s'ouvre en feuille modale qui couvre la puce : la bulle est celle de la souris.
  test.skip(!["ordinateur", "ordinateur-1440"].includes(nom(info)), "souris seulement");
  await ouvrirSetlist(page);
  const accord = page.locator('[data-outline-item="1"] [data-accord-touchable]').first();
  await accord.click();
  await expect(page.locator("[data-accord-panneau]")).toBeVisible();
  await puce(page, 1).click();
  await expect(colonne(page)).toBeVisible();
  await expect(page.locator("[data-accord-panneau]")).toHaveCount(0);
});

test("setlist : la fenêtre se rétrécit colonne ouverte, la colonne se ferme (pas de feuille d'office), la préférence reste", async ({ page }, info) => {
  test.skip(!colonneSurSetlist(info), "ordinateur seulement");
  await ouvrirSetlist(page);
  await puce(page, 1).click();
  await expect(colonne(page)).toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(colonne(page)).toHaveCount(0);
  await expect(feuille(page)).toHaveCount(0);
  expect(await pref(page)).toBe("1");
});
