import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 9 / H1 (docs/spec-harmonie.md) : le catalogue « Harmonie ». Réservé aux
// pianistes et aux guitaristes — l'instrument se lit dans les colonnes Piano /
// Guitare des plannings, pas dans le profil — et aux admins.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Jo tient le piano, Éloïse la guitare, Yiyi la batterie : trois accès
// différents avec le même profil.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Paul W.", "", "", "Jo L.", "Éloïse M.", "Yiyi C.", "", "", "Hewei", "", ""],
]);

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", planningName: "Jo L." };
const ELOISE: FakeProfile = { uid: "uid-eloise", email: "eloise@example.com", planningName: "Éloïse M." };
const YIYI: FakeProfile = { uid: "uid-yiyi", email: "yiyi@example.com", planningName: "Yiyi C." };

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string, pleinePage = false) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: pleinePage });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, to);
}

test("un pianiste trouve « Harmonie » dans l'onglet Chants et ouvre le catalogue", async ({ page }) => {
  await ouvrir(page, JO, "/songs");
  const lien = page.locator("[data-lien-harmonie]");
  await expect(lien).toBeVisible();
  await lien.click();
  await expect(page).toHaveURL(/\/harmonie\/?$/);
  await expect(page.getByRole("heading", { name: "Harmonie" })).toBeVisible();
  await capture(page, "harmonie-catalogue");
});

test("un batteur ne voit ni la ligne ni le catalogue", async ({ page }) => {
  await ouvrir(page, YIYI, "/songs");
  await expect(page.locator("[data-lien-harmonie]")).toHaveCount(0);
  await page.goto("/harmonie");
  await expect(page.locator("[data-harmonie]")).toHaveCount(0);
  // Et il lit une phrase, pas le nom d'une clé de traduction.
  await expect(page.getByText("Cette page est réservée aux musiciens de l'équipe.")).toBeVisible();
});

test("le parcours « Par où commencer » mène à sa première fiche", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  const parcours = page.locator("section", { has: page.getByRole("heading", { name: "Par où commencer" }) });
  // Trois étapes visibles, les dix après « Voir plus » (un téléphone ne tient
  // pas dix lignes avant les filtres).
  await expect(parcours.getByRole("link")).toHaveCount(3);
  await parcours.getByRole("button", { name: "Voir plus" }).click();
  await expect(parcours.getByRole("link")).toHaveCount(10);
  await parcours.getByRole("link").first().click();
  await expect(page.locator("[data-fiche]")).toBeVisible();
});

test("les filtres réduisent la liste, et « Tout afficher » la rend", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  const fiches = page.locator("[data-harmonie] a[href^='/harmonie/']");
  await expect(fiches.first(), "le catalogue est chargé avant de compter").toBeVisible();
  const total = await fiches.count();
  await page.getByRole("group", { name: "Sensation" }).getByRole("button", { name: "Tension" }).click();
  await expect.poll(async () => fiches.count(), { message: "moins de fiches avec un filtre" }).toBeLessThan(total);
  await page.getByRole("group", { name: "Sensation" }).getByRole("button", { name: "Tension" }).click();
  await expect.poll(async () => fiches.count()).toBe(total);
});

test("une fiche montre avant → après, le pourquoi, les pièges et les exemples", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  await expect(page.getByRole("heading", { name: "Le 2m7 à la place du 4" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avant → après" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pourquoi ça marche" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quand l'éviter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Au piano" }), "Jo est pianiste").toBeVisible();
  await expect(page.getByRole("heading", { name: "Dans le répertoire" })).toBeVisible();
  await expect(page.getByText(/chants? qui le joue/), "les exemples sont comptés").toBeVisible();
  await capture(page, "harmonie-fiche");
});

test("changer de tonalité transpose les accords de la fiche", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  const avant = page.locator("section", { has: page.getByRole("heading", { name: "Avant → après" }) });
  await expect(avant.getByText("Em7 → A", { exact: true }), "écrite en D").toBeVisible();
  await avant.getByLabel("Tonalité").selectOption("F");
  await expect(avant.getByText("Gm7 → C", { exact: true }), "la même fiche en F").toBeVisible();
  await expect(avant.getByText("Em7 → A", { exact: true })).toHaveCount(0);
});

test("un guitariste voit la partie guitare, avec son diagramme", async ({ page }) => {
  await ouvrir(page, ELOISE, "/harmonie/substitutions/2m7-pour-4");
  await expect(page.getByRole("heading", { name: "À la guitare" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Au piano" })).toHaveCount(0);
  await page.getByRole("heading", { name: "À la guitare" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("img", { name: /Doigté guitare/ }).first()).toBeVisible();
  await capture(page, "harmonie-fiche-guitare", true);
});

test("le capo donne les formes jouées, côté guitare", async ({ page }) => {
  await ouvrir(page, ELOISE, "/harmonie/substitutions/2m7-pour-4");
  const guitare = page.locator("section", { has: page.getByRole("heading", { name: "À la guitare" }) });
  await expect(guitare.getByText("Formes écrites en D."), "la fiche est écrite en D").toBeVisible();
  await guitare.getByLabel("Capo").selectOption("2");
  // Les doigtés ne changent pas : avec un capo 2, ces formes de D sonnent en E.
  await expect(guitare.getByText("Ces formes (écrites en D) sonnent en E.")).toBeVisible();
});

test("en 中文 : le catalogue est traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, JO, "/harmonie");
  await expect(page.getByRole("heading", { name: "和声" })).toBeVisible();
  await expect(page.getByRole("group", { name: "感觉" })).toBeVisible();
  await expect(page.getByRole("button", { name: "张力" })).toBeVisible();
});
