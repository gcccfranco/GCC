import { expect, test, type Locator, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";
import { parseChordPro } from "../src/lib/chordpro/parser";

// Lot IR (docs/spec-idees-regroupees.md) : une carte par changement d'accords,
// pas par section. Sur « Au nom de Jésus » (en D), Gmaj7 couvre Couplet 1,
// Couplet 2 et Pont : une carte, trois sections, trois refus, trois puces.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Clémence R.", "", "", "Ambroise V.", "", "", "", "", "", "", ""],
]);

const AMBROISE: FakeProfile = {
  uid: "uid-ambroise",
  email: "ambroise@example.com",
  firstName: "Ambroise",
  lastName: "Velin",
  planningName: "Ambroise V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SLUG = "au-nom-de-jesus";
const chant = parseChordPro(fs.readFileSync(path.join(process.cwd(), "content", "songs", `${SLUG}.cho`), "utf-8"));
const uidDe = (nom: string) => chant.sections.find((s) => s.name === nom)!.uid;
const COUPLET_1 = uidDe("Couplet 1");
const COUPLET_2 = uidDe("Couplet 2");
const PONT = uidDe("Pont");

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

const routeSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });

async function ouvrirChant(page: Page, docs: Record<string, Record<string, unknown>> = {}) {
  await routeSheet(page);
  return signInAs(page, AMBROISE, docs, `/songs/${SLUG}`);
}

async function ouvrirLaFeuille(page: Page) {
  await page.getByTestId("barre-outils").getByRole("button", { name: "Idées d'harmonie" }).click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
}

/** La carte d'une fiche, « Voir plus » si elle n'est pas dans les cinq premières. */
async function carte(page: Page, fiche: string): Promise<Locator> {
  const cartes = page.locator(`[data-suggestion^="${fiche}__"]`);
  const voirPlus = page.getByRole("button", { name: "Voir plus" });
  // Les cartes arrivent avec le catalogue des fiches : les attendre avant de compter.
  await expect(page.locator("[data-suggestion]").first()).toBeVisible();
  if ((await cartes.count()) === 0 && (await voirPlus.isVisible())) await voirPlus.click();
  await expect(cartes).toHaveCount(1);
  return cartes;
}

test("une idée qui revient dans trois sections n'est qu'une carte, ses sections sous le titre", async ({ page }) => {
  await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  await carte(page, "couleurs/m7");
  const maj7 = await carte(page, "couleurs/maj7");
  await expect(maj7.locator("p").first()).toContainText("Couplets 1 et 2 · Pont");
  await expect(maj7, "pas de compteur d'endroits quand la carte couvre plusieurs sections").not.toContainText("endroits");
  await maj7.scrollIntoViewIfNeeded();
  await capture(page, "idees-regroupees");
});

test("« Montrer 1/3 » entoure le Couplet 1, puis la feuille rouverte dit 2/3 et mène au Couplet 2", async ({ page }) => {
  await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  let maj7 = await carte(page, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Montrer 1/3" }).click();
  await expect(page.locator("[data-idees-harmonie]")).toBeHidden();
  const entouree = page.locator(".harmonie-surligne");
  await expect(entouree).toHaveCount(1);
  const premiere = await entouree.getAttribute("data-section-uids");
  expect(premiere?.split(" ")).toContain(COUPLET_1);
  await expect(entouree, "l'entourage s'efface avant le pas suivant").toHaveCount(0, { timeout: 6000 });

  await ouvrirLaFeuille(page);
  maj7 = await carte(page, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Montrer 2/3" }).click();
  await expect(entouree).toHaveCount(1);
  const seconde = await entouree.getAttribute("data-section-uids");
  expect(seconde, "une autre section que la première").not.toBe(premiere);
  expect(seconde?.split(" ")).toContain(COUPLET_2);
});

test("« Ne marche pas » écarte la carte entière : un refus par section, une ligne dans les écartées", async ({ page }) => {
  const db = await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  const maj7 = await carte(page, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Ne marche pas sur ce chant" }).click();
  await expect(page.locator('[data-suggestion^="couleurs/maj7__"]')).toHaveCount(0);

  const refus = db.writes.filter((w) => w.path.startsWith(`harmonie/${SLUG}/rejets/`));
  expect(refus.map((w) => w.data.suggestion).sort()).toEqual(
    [COUPLET_1, COUPLET_2, PONT].map((uid) => `couleurs/maj7__${uid}`).sort(),
  );

  const ecartees = page.getByText("1 idée écartée");
  await expect(ecartees, "une ligne pour la carte, pas trois").toBeVisible();
  await ecartees.click();
  await expect(page.locator("details li")).toHaveCount(1);
  await expect(page.locator("details li")).toContainText("Velin");
});

test("un ancien refus d'une seule section retire cette section de la carte, pas les autres", async ({ page }) => {
  const ancien = `couleurs/maj7__${COUPLET_2}`;
  await ouvrirChant(page, {
    [`harmonie/${SLUG}/rejets/${ancien.replace(/\//g, "~")}`]: {
      uid: "uid-ambroise", auteur: "Ambroise Velin", suggestion: ancien, creeLe: "2026-10-01T10:00:00Z",
    },
  });
  await ouvrirLaFeuille(page);
  const maj7 = await carte(page, "couleurs/maj7");
  await expect(maj7.locator("p").first()).toContainText("Couplet 1 · Pont");
  await expect(maj7.getByRole("button", { name: "Montrer 1/2" })).toBeVisible();
  const ecartees = page.getByText("1 idée écartée");
  await expect(ecartees).toBeVisible();
  await ecartees.click();
  await expect(page.locator("details li")).toHaveCount(1);
});

// --- Dans une setlist, Ma version -------------------------------------------

const SETLIST_ID = "setlist-regroupees";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${AMBROISE.uid}`;
const SETLIST = {
  title: "Culte du 21 septembre",
  leader: "Clémence R.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "fr",
  notes: "",
  ownerId: AMBROISE.uid,
  isPrivate: false,
  items: [{
    songSlug: SLUG, position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "",
  }],
};

test("Essayer dans Ma version : on choisit la section, et seule celle-ci change", async ({ page }) => {
  await routeSheet(page);
  const db = await signInAs(page, AMBROISE, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await page.getByRole("button", { name: "Idées d'harmonie" }).first().click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();

  const maj7 = await carte(page, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Essayer dans Ma version…" }).click();
  await expect(maj7.getByText("Essayer dans Ma version, où ?")).toBeVisible();
  const puces = maj7.getByRole("button", { name: /^(Couplet [12]|Pont)$/ });
  await expect(puces).toHaveCount(3);
  await maj7.scrollIntoViewIfNeeded();
  await capture(page, "essayer-ou");

  await puces.filter({ hasText: "Couplet 2" }).click();
  await expect.poll(() => db.writes.filter((w) => w.path === VERSION_DOC).length).toBeGreaterThan(0);
  const dernier = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  const contenu = (dernier.data.items as Record<string, { content: string }>)[SLUG].content;
  const entre = (a: string, b: string) => contenu.slice(contenu.indexOf(a), contenu.indexOf(b));
  expect(entre("{start_of_verse: Couplet 2}", "{start_of_chorus"), "Couplet 2 prend Gmaj7").toContain("[Gmaj7]");
  expect(entre("{start_of_verse: Couplet 1}", "{start_of_verse: Interlude}"), "Couplet 1 reste tel quel").not.toContain("[Gmaj7]");
  expect(
    db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)),
    "la setlist de la présidence ne bouge pas",
  ).toHaveLength(0);
});

test("chant chinois, interface en 中文 : les trois premiers 主歌 se contractent en « 主歌 1–3 »", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await routeSheet(page);
  await signInAs(page, AMBROISE, {}, `/songs/${encodeURIComponent("永活盼望")}`);
  await page.getByTestId("barre-outils").getByRole("button", { name: "和声灵感" }).click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
  const cartes = page.locator('[data-suggestion^="couleurs/maj7__"]');
  const voirPlus = page.getByRole("button", { name: "查看更多" });
  await expect(page.locator("[data-suggestion]").first()).toBeVisible();
  if ((await cartes.count()) === 0 && (await voirPlus.isVisible())) await voirPlus.click();
  const maj7 = cartes.filter({ hasText: "主歌 1–3 · 主歌 4 (To Chorus)" });
  await expect(maj7).toHaveCount(1);
  await expect(maj7.getByRole("button", { name: "指出位置 1/4" })).toBeVisible();
  await maj7.scrollIntoViewIfNeeded();
  await capture(page, "idees-regroupees-zh");
});
