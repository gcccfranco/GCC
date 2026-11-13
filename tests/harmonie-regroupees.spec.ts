import { expect, test, type Locator, type Page } from "@playwright/test";
import { basculerMode } from "./helpers/menuSetlist";
import * as fs from "fs";
import * as path from "path";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
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
  ...musicien("piano", "guitare"),
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
  await page.getByTestId("barre-outils").getByRole("button", { name: "Harmonie", exact: true }).click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
}

/** La carte d'une fiche dans le bloc d'un passage, « Voir plus » du bloc si elle n'est pas dans les trois premières. */
async function carte(page: Page, passage: string, fiche: string): Promise<Locator> {
  const bloc = page.locator(`[data-idees-harmonie] [data-passage="${passage}"]`);
  const cartes = bloc.locator(`[data-suggestion^="${fiche}__"]`);
  const voirPlus = bloc.getByRole("button", { name: "Voir plus" });
  // Les cartes arrivent avec le catalogue des fiches : les attendre avant de compter.
  await expect(page.locator("[data-suggestion]").first()).toBeVisible();
  if ((await cartes.count()) === 0 && (await voirPlus.isVisible())) await voirPlus.click();
  await expect(cartes).toHaveCount(1);
  return cartes;
}

// Plus de regroupement (H4-1, docs/spec-harmonie-accords.md) : une carte par idée et par passage.
// Supprimés, sans objet : « Montrer i/n » (un seul « Montrer », qui va au passage), la contraction
// « Couplets 1 et 2 · Pont » sous le titre, le compteur d'endroits, « Essayer où ? » et ses puces de section.
test("une idée qui revient dans trois sections a une carte dans chacun de ces passages", async ({ page }) => {
  await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  for (const uid of [COUPLET_1, COUPLET_2, PONT]) {
    const maj7 = await carte(page, uid, "couleurs/maj7");
    await expect(maj7).toContainText("Gmaj7");
  }
  const premiere = await carte(page, COUPLET_1, "couleurs/maj7");
  await premiere.scrollIntoViewIfNeeded();
  await capture(page, "idees-par-passage");
});

test("« Montrer » d'une carte entoure son passage : Couplet 1, puis Couplet 2", async ({ page }) => {
  await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  let maj7 = await carte(page, COUPLET_1, "couleurs/maj7");
  const enColonne = (await page.locator("[data-harmonie-colonne]").count()) > 0;
  await maj7.getByRole("button", { name: "Montrer", exact: true }).click();
  // En colonne : elle reste ouverte à côté de la partition ; la feuille, elle, s'efface.
  if (enColonne) await expect(page.locator("[data-harmonie-colonne]")).toBeVisible();
  else await expect(page.locator("[data-idees-harmonie]")).toBeHidden();
  const entouree = page.locator(".harmonie-surligne");
  await expect(entouree).toHaveCount(1);
  expect((await entouree.getAttribute("data-section-uids"))?.split(" ")).toContain(COUPLET_1);
  await expect(entouree, "l'entourage s'efface").toHaveCount(0, { timeout: 6000 });

  await ouvrirLaFeuille(page);
  maj7 = await carte(page, COUPLET_2, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Montrer", exact: true }).click();
  await expect(entouree).toHaveCount(1);
  expect((await entouree.getAttribute("data-section-uids"))?.split(" ")).toContain(COUPLET_2);
});

test("« Ne marche pas » écarte l'idée dans tout le chant : un refus par passage, une ligne par fiche dans les écartées", async ({ page }) => {
  const db = await ouvrirChant(page);
  await ouvrirLaFeuille(page);
  const maj7 = await carte(page, COUPLET_1, "couleurs/maj7");
  await maj7.getByRole("button", { name: "Ne marche pas sur ce chant" }).click();
  await expect(page.locator('[data-suggestion^="couleurs/maj7__"]')).toHaveCount(0);

  const refus = db.writes.filter((w) => w.path.startsWith(`harmonie/${SLUG}/rejets/`));
  expect(refus.map((w) => w.data.suggestion).sort()).toEqual(
    [COUPLET_1, COUPLET_2, PONT].map((uid) => `couleurs/maj7__${uid}`).sort(),
  );

  const ecartees = page.getByText("1 idée écartée");
  await expect(ecartees, "une ligne pour la fiche, pas trois").toBeVisible();
  await ecartees.click();
  await expect(page.locator("details li")).toHaveCount(1);
  await expect(page.locator("details li")).toContainText("Velin");
});

test("un refus d'une seule section retire la carte de ce passage, pas celles des autres", async ({ page }) => {
  const ancien = `couleurs/maj7__${COUPLET_2}`;
  await ouvrirChant(page, {
    [`harmonie/${SLUG}/rejets/${ancien.replace(/\//g, "~")}`]: {
      uid: "uid-ambroise", auteur: "Ambroise Velin", suggestion: ancien, creeLe: "2026-10-01T10:00:00Z",
    },
  });
  await ouvrirLaFeuille(page);
  await carte(page, COUPLET_1, "couleurs/maj7");
  await carte(page, PONT, "couleurs/maj7");
  await expect(page.locator(`[data-passage="${COUPLET_2}"] [data-suggestion^="couleurs/maj7__"]`)).toHaveCount(0);
  const ecartees = page.getByText("1 idée écartée");
  await expect(ecartees).toBeVisible();
  await ecartees.click();
  await expect(page.locator("details li")).toHaveCount(1);
});

// --- Dans une setlist, Ma version -------------------------------------------

const SETLIST_ID = "setlist-regroupees";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
// MP-3 : l'essai écrit ma partition (`versions/{uid}` n'est plus écrit).
const VERSION_DOC = `partitions/${AMBROISE.uid}__${SLUG}`;
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

test("Essayer dans Ma version : la carte d'un passage s'applique à ce passage, et à lui seul", async ({ page }) => {
  await routeSheet(page);
  const db = await signInAs(page, AMBROISE, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await basculerMode(page, "Ma version");
  await page.getByRole("button", { name: "Harmonie", exact: true }).first().click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();

  const maj7 = await carte(page, COUPLET_2, "couleurs/maj7");
  await maj7.scrollIntoViewIfNeeded();
  await capture(page, "essayer-passage");
  await maj7.getByRole("button", { name: "Essayer dans Ma version", exact: true }).click();
  await expect.poll(() => db.writes.filter((w) => w.path === VERSION_DOC).length).toBeGreaterThan(0);
  const dernier = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  const contenu = String(dernier.data.content);
  const entre = (a: string, b: string) => contenu.slice(contenu.indexOf(a), contenu.indexOf(b));
  expect(entre("{start_of_verse: Couplet 2}", "{start_of_chorus"), "Couplet 2 prend Gmaj7").toContain("[Gmaj7]");
  expect(entre("{start_of_verse: Couplet 1}", "{start_of_verse: Interlude}"), "Couplet 1 reste tel quel").not.toContain("[Gmaj7]");
  expect(
    db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)),
    "la setlist de la présidence ne bouge pas",
  ).toHaveLength(0);
});

test("chant chinois, interface en 中文 : la feuille « 这首歌的和声 » a un bloc par passage et des cartes avec « 指出位置 »", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await routeSheet(page);
  await signInAs(page, AMBROISE, {}, `/songs/${encodeURIComponent("永活盼望")}`);
  await page.getByTestId("barre-outils").getByRole("button", { name: "和声", exact: true }).click();
  const feuille = page.locator("[data-idees-harmonie]");
  await expect(feuille).toBeVisible();
  await expect(feuille.locator("[data-passage]").first()).toBeVisible();
  await expect(feuille.locator("[data-suggestion]").first().getByRole("button", { name: "指出位置" })).toBeVisible();
  await capture(page, "idees-par-passage-zh");
});
