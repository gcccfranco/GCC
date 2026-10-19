import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Sons du RD-2000 (docs/spec-sons-rd2000.md, tranches S1 à S4) : le catalogue
// du clavier de l'église, pour les pianistes et les admins. Rien n'est joué.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Jonathan Z.", "", "", "Jo L.", "Éloïse M.", "Yiyi C.", "", "", "Hewei", "", ""],
]);

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", planningName: "Jo L." };
const ELOISE: FakeProfile = { uid: "uid-eloise", email: "eloise@example.com", firstName: "Éloïse", lastName: "M.", planningName: "Éloïse M." };

const DONNEES = JSON.parse(readFileSync("public/rd2000.json", "utf8")) as {
  sons: { n: string; nom: string; louange: number }[];
  moments: { groupe: string; moment: string; son: string; layer: string }[];
  recettes: { n: string; exemples: string[] }[];
  fiches: { n: string; reglages: { ecran: string }[] }[];
  parametres: unknown[];
};
const ESSENTIELS = DONNEES.sons.filter((s) => s.louange === 3).length;

async function entrer(page: Page, qui: FakeProfile, to: string) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test("un pianiste trouve les sons en tête d'Harmonie, ouverts sur « Par moment »", async ({ page }, info) => {
  await entrer(page, JO, "/harmonie");
  // Agencement v18 (A16) : l'onglet « Sons du RD-2000 » du rail partout ; la carte, sur téléphone seulement.
  const onglet = page.locator("header[data-entete-page]").getByRole("link", { name: "Sons du RD-2000" });
  await expect(onglet).toBeVisible();
  if (info.project.name === "telephone") {
    const ligne = page.locator("[data-harmonie]").getByRole("link", { name: /Sons du RD-2000/ });
    await expect(ligne).toContainText(`${ESSENTIELS} essentiels sur ${DONNEES.sons.length.toLocaleString("fr-FR")}`);
    await ligne.click();
  } else await onglet.click();
  await page.waitForURL(/\/harmonie\/rd2000\/?$/);
  await expect(page.getByRole("tab", { name: "Par moment" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-moment]")).toHaveCount(DONNEES.moments.length);
  await expect(page.locator("[data-regle]")).toBeVisible();
  await capture(page, "rd2000-par-moment");
});

test("par moment : le son principal et le layer mènent à leur page", async ({ page }) => {
  const avecLayer = DONNEES.moments.find((m) => m.layer)!;
  await entrer(page, JO, "/harmonie/rd2000");
  const moment = page.locator("[data-moment]", { hasText: avecLayer.moment }).first();
  await expect(moment.locator("[data-son]")).toHaveText([avecLayer.son, avecLayer.layer]);
  await moment.locator(`[data-son="${avecLayer.layer}"]`).click();
  await page.waitForURL(new RegExp(`/harmonie/rd2000/${avecLayer.layer}/?$`));
});

test("un guitariste n'a ni la ligne ni la page", async ({ page }) => {
  await entrer(page, ELOISE, "/harmonie");
  await expect(page.locator("[data-harmonie]")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sons du RD-2000/ })).toHaveCount(0);
  await page.goto("/harmonie/rd2000");
  await expect(page.locator("[data-rd2000]")).toHaveCount(0);
});

test("tous les sons : ★★★ d'abord, « Tous » donne le catalogue, la recherche porte sur tout", async ({ page }) => {
  await entrer(page, JO, "/harmonie/rd2000");
  await page.getByRole("tab", { name: "Tous les sons" }).click();
  await expect(page.locator("[data-vue=sons] [data-son]")).toHaveCount(ESSENTIELS);
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await expect(page.locator("[data-vue=sons] [data-son]")).toHaveCount(DONNEES.sons.length);
  await page.getByRole("button", { name: "★★★", exact: true }).click();

  const harpe = DONNEES.sons.find((s) => s.n === "0675")!;
  await page.getByRole("searchbox", { name: "Nom ou numéro" }).fill("0675");
  await expect(page.locator("[data-vue=sons] [data-son]")).toHaveText([harpe.n]);
  await page.getByRole("searchbox", { name: "Nom ou numéro" }).fill("stage grand");
  await expect(page.locator('[data-vue=sons] [data-son="S01"]')).toBeVisible();

  const debord = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(debord, "la page ne défile pas de côté").toBe(0);
  await capture(page, "rd2000-recherche");
});

test("premier choix : un badge sur la ligne et sur la page du son, plus d'étoile dans le commentaire", async ({ page }) => {
  await entrer(page, JO, "/harmonie/rd2000");
  await page.getByRole("tab", { name: "Tous les sons" }).click();
  const ligne = (n: string) => page.locator("[data-vue=sons] a", { has: page.locator(`[data-son="${n}"]`) });
  await expect(ligne("S01").getByText("Premier choix", { exact: true })).toBeVisible();
  await expect(ligne("0019").getByText("Premier choix", { exact: true }), "un ★★★ sans la marque").toHaveCount(0);
  await page.goto("/harmonie/rd2000/S01");
  const entete = page.locator("[data-son-page] header");
  await expect(entete.getByText("Premier choix", { exact: true })).toBeVisible();
  await expect(entete).toContainText("LE piano principal");
  await expect(entete).not.toContainText("★ LE piano");
});

test("la page d'un ★★★ : sa fiche de réglages, un titre par écran, et le MIDI", async ({ page }) => {
  const fiche = DONNEES.fiches.find((f) => f.n === "S01")!;
  await entrer(page, JO, "/harmonie/rd2000/S01");
  // h1 seul (téléphone, tablette portrait), h2 sous l'en-tête « Harmonie » en deux volets (agencement v18, R3).
  await expect(page.locator('[data-son-page="S01"] header').getByRole("heading")).toHaveText("Stage Grand");
  await expect(page.locator("[data-reglage]")).toHaveCount(fiche.reglages.length);
  const ecrans = fiche.reglages.map((r) => r.ecran).filter((e, i, a) => a.indexOf(e) === i);
  await expect(page.locator("[data-reglages] h2")).toHaveText(ecrans);
  await expect(page.locator("[data-midi]")).toContainText("(en MIDI : ");
  await capture(page, "rd2000-fiche");
});

test("un son sans fiche renvoie aux recettes ; une recette montre ses sons d'exemple ; un N° inconnu est dit", async ({ page }) => {
  await entrer(page, JO, "/harmonie/rd2000/0675");
  await expect(page.locator("[data-sans-fiche]")).toBeVisible();
  await expect(page.getByRole("link", { name: /^R\d/ })).toHaveCount(DONNEES.recettes.length);

  const recette = DONNEES.recettes.find((r) => r.exemples.length > 1)!;
  await page.goto(`/harmonie/rd2000/${recette.n}`);
  await expect(page.getByRole("heading", { name: "Sons d'exemple" })).toBeVisible();
  await expect(page.locator("[data-reglage]").first()).toBeVisible();

  await page.goto("/harmonie/rd2000/9999");
  await expect(page.getByText("Son introuvable.")).toBeVisible();
});

test("paramètres et mode d'emploi : tous les paramètres, sans les lignes propres au tableur", async ({ page }) => {
  await entrer(page, JO, "/harmonie/rd2000");
  await page.getByRole("tab", { name: "Paramètres" }).click();
  await expect(page.locator("[data-parametre]")).toHaveCount(DONNEES.parametres.length);
  await page.getByRole("button", { name: "Mode d'emploi" }).click();
  await expect(page.locator("[data-vue=legende]")).toBeVisible();
  await expect(page.locator("[data-vue=legende]")).not.toContainText("LES 5 ONGLETS");
});

test("interface 中文 : libellés chinois, et le contenu est annoncé en français", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await entrer(page, JO, "/harmonie/rd2000");
  await expect(page.getByRole("tab", { name: "按环节" })).toBeVisible();
  await expect(page.getByText("内容为法文。").first()).toBeVisible();
});
