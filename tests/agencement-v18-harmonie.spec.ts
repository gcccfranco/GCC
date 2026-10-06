import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";

// Agencement v18, tranche T11 (docs/spec-agencement-v18.md, A16 ; planche `v18-app-harmonie`, v17 sur
// téléphone et tablette portrait). Harmonie en onglets : un layout pose l'en-tête « Harmonie », son
// sous-titre et le rail Fiches · Cours · Sons du RD-2000 au-dessus des trois listes ; les titres de
// liste disparaissent ; les cartes Cours et Sons du catalogue restent sur téléphone seulement. Un lien
// direct vers une fiche, une leçon, un son garde ses deux volets (la fiche s'y titre en h2 de 24 px).
// Plannings simulés ; personnes fictives. Cinq projets.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Le planning donne l'accès : Ruth au piano (fiches, cours, sons), Samuel à la guitare (pas de sons).
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Léa M.", "", "", "Ruth K.", "Samuel K.", "Paul D.", "", "", "Orateur Z.", "", ""],
]);
const PIANISTE: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K." };
const GUITARISTE: FakeProfile = { uid: "uid-samuel", email: "samuel@example.com", firstName: "Samuel", lastName: "K.", planningName: "Samuel K." };

const CATALOGUE = JSON.parse(readFileSync("public/harmonie-index.json", "utf8")) as { fiches: { id: string; instrument?: string }[] };
const COURS = JSON.parse(readFileSync("public/harmonie-cours/index.json", "utf8")) as { chapitres: { id: string; numero: number | null }[] };
const FICHE = CATALOGUE.fiches.filter((f) => !f.instrument || f.instrument === "piano")[4];
const CADENCES = COURS.chapitres.find((c) => c.numero === 9)!;

async function entrer(page: Page, to: string, qui: FakeProfile = PIANISTE) {
  interdireDialoguesNatifs(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. L'écran seul : une capture
 *  pleine page redimensionne la fenêtre de l'iPad couché, qui passe alors en portrait (un volet). */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const rail = (page: Page) => enTete(page).locator('[data-onglets="rail"]');
const ONGLETS = [
  { adresse: "/harmonie", nom: "Fiches", attendu: "[data-harmonie]" },
  { adresse: "/harmonie/cours", nom: "Cours", attendu: "[data-cours]" },
  { adresse: "/harmonie/rd2000", nom: "Sons du RD-2000", attendu: "[data-rd2000]" },
] as const;

test.describe("Harmonie en onglets (T11)", () => {
  for (const o of ONGLETS) {
    test(`${o.adresse} : l'en-tête « Harmonie », le rail, l'onglet « ${o.nom} » allumé, sans titre de liste`, async ({ page }, info) => {
      await entrer(page, o.adresse);
      await expect(page.locator(o.attendu).first()).toBeVisible();
      const entete = enTete(page);
      await expect(entete.getByRole("heading", { level: 1, name: "Harmonie", exact: true })).toBeVisible();
      await expect(entete.getByText("Des idées pour réharmoniser, au piano et à la guitare.")).toBeVisible();
      await expect(rail(page).getByRole("link")).toHaveText(["Fiches", "Cours", "Sons du RD-2000"]);
      await expect(rail(page).locator('a[aria-current="page"]')).toHaveText(o.nom);
      await expect(enTete(page).locator('[data-onglets="rail"]'), "un seul rail dans l'en-tête").toHaveCount(1);
      // Les titres de liste ont disparu : plus de « Harmonie », « Cours », « Sons du RD-2000 » en titre sous l'en-tête
      // (le seul h1 de la page est celui de l'en-tête, `verifierAgencement`).
      await expect(page.locator("main h2").filter({ hasText: /^(Harmonie|Cours|Sons du RD-2000)$/ }).filter({ visible: true }))
        .toHaveCount(0);
      // Le premier bloc sous l'en-tête : la carte de la liste en grand, la liste elle-même sinon.
      await verifierAgencement(page, { premierBloc: estGrandEcran(info) ? liste(page) : page.locator(o.attendu).first() });
      await capture(page, `t11-${o.nom.split(" ")[0].toLowerCase()}`);
    });
  }

  test("l'onglet suit l'adresse : du catalogue au cours, puis aux sons, et retour arrière", async ({ page }) => {
    await entrer(page, "/harmonie");
    await expect(page.locator("[data-harmonie]")).toBeVisible();
    await rail(page).getByRole("link", { name: "Cours", exact: true }).click();
    await expect(page).toHaveURL(/\/harmonie\/cours\/?$/);
    await expect(page.locator("[data-cours]")).toBeVisible();
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveText("Cours");
    await rail(page).getByRole("link", { name: "Sons du RD-2000" }).click();
    await expect(page).toHaveURL(/\/harmonie\/rd2000\/?$/);
    await expect(page.locator("[data-rd2000]")).toBeVisible();
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveText("Sons du RD-2000");
    await page.goBack();
    await expect(page.locator("[data-cours]")).toBeVisible();
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveText("Cours");
  });

  test("sans le piano, pas d'onglet « Sons du RD-2000 »", async ({ page }) => {
    await entrer(page, "/harmonie", GUITARISTE);
    await expect(page.locator("[data-harmonie]")).toBeVisible();
    await expect(rail(page).getByRole("link")).toHaveText(["Fiches", "Cours"]);
  });

  test("les cartes Cours et Sons du catalogue : sur téléphone seulement", async ({ page }, info) => {
    await entrer(page, "/harmonie");
    const cat = page.locator("[data-harmonie]");
    await expect(cat).toBeVisible();
    const cartes = cat.getByRole("link", { name: /Cours de théorie musicale|Sons du RD-2000/ });
    if (estTelephone(info)) await expect(cartes.filter({ visible: true })).toHaveCount(2);
    else await expect(cartes.filter({ visible: true })).toHaveCount(0);
  });

  // R4 : les vues d'une page en rail (Piano · Guitare, Par moment · Tous les sons · Paramètres), les filtres en pilules.
  test("les vues en rail, les filtres en pilules", async ({ page }) => {
    await entrer(page, "/harmonie/rd2000");
    const vues = page.locator("[data-rd2000]").getByRole("tablist", { name: "Sons du RD-2000" });
    await expect(vues).toHaveAttribute("data-onglets", "rail");
    await expect(vues.getByRole("tab", { name: "Par moment" })).toHaveAttribute("aria-selected", "true");
    await vues.getByRole("tab", { name: "Tous les sons" }).click();
    await expect(page.locator('[data-vue="sons"]')).toBeVisible();
    await expect(vues.getByRole("tab", { name: "Tous les sons" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-rd2000]").getByRole("group", { name: "Catégorie" })).toHaveAttribute("data-onglets", "pilules");
  });

  test("Piano · Guitare en rail pour qui joue des deux", async ({ page }) => {
    const LES_DEUX: FakeProfile = { uid: "uid-eve", email: "eve@example.com", firstName: "Ève", lastName: "N.", planningName: "Ève N." };
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet");
      const deux = csv([
        ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
        ["04/10", "Léa M.", "", "", "Ève N.", "", "", "", "", "", "", ""],
        ["11/10", "Léa M.", "", "", "", "Ève N.", "", "", "", "", "", ""],
      ]);
      return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? deux : "" });
    });
    interdireDialoguesNatifs(page);
    await signInAs(page, LES_DEUX, {}, "/harmonie");
    const instrument = page.locator("[data-harmonie]").getByRole("tablist", { name: "Piano" });
    await expect(instrument).toHaveAttribute("data-onglets", "rail");
    await instrument.getByRole("tab", { name: "Guitare" }).click();
    await expect(instrument.getByRole("tab", { name: "Guitare" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-harmonie]").getByRole("group", { name: "Sensation" })).toHaveAttribute("data-onglets", "pilules");
  });

  const DIRECTS = [
    { nom: "une fiche", adresse: `/harmonie/${FICHE.id}`, onglet: "Fiches", fiche: `[data-fiche="${FICHE.id}"]`, retour: "Harmonie" },
    { nom: "une leçon", adresse: `/harmonie/cours/${CADENCES.id}`, onglet: "Cours", fiche: `[data-chapitre="${CADENCES.id}"]`, retour: "Cours" },
    { nom: "un son", adresse: "/harmonie/rd2000/S01", onglet: "Sons du RD-2000", fiche: '[data-son-page="S01"]', retour: "Sons du RD-2000" },
  ] as const;
  for (const d of DIRECTS) {
    test(`un lien direct vers ${d.nom} garde ses deux volets en grand ; seul avec son retour sinon`, async ({ page }, info) => {
      await entrer(page, d.adresse);
      if (estGrandEcran(info)) {
        await expect(detail(page).locator(d.fiche)).toBeVisible();
        await expect(liste(page)).toBeVisible();
        await expect(rail(page).locator('a[aria-current="page"]')).toHaveText(d.onglet);
        // La fiche du volet de droite : un h2 de 24 px, sans marge à gauche (elle part du bord du volet).
        const titre = detail(page).locator("h2").first();
        expect(await titre.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)), "titre de fiche : 24 px").toBe(24);
        const fiche = detail(page).locator(d.fiche);
        const [volet, boiteFiche] = [(await detail(page).boundingBox())!, (await fiche.boundingBox())!];
        expect(Math.abs(boiteFiche.x - volet.x), "la fiche part du bord du volet").toBeLessThanOrEqual(1);
        expect(await fiche.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)), "la fiche ne pose plus de marge").toBe(0);
        await verifierAgencement(page, { premierBloc: liste(page) });
      } else {
        await expect(page.locator(d.fiche)).toBeVisible();
        await expect(liste(page)).toHaveCount(0);
        await expect(enTete(page), "une fiche seule : pas d'en-tête de section au-dessus").toHaveCount(0);
        await expect(page.locator("h1").filter({ visible: true }), "le titre de la fiche est le h1").toHaveCount(1);
        await expect(page.getByRole("link", { name: d.retour, exact: true }).first()).toBeVisible();
      }
      await capture(page, `t11-direct-${d.onglet.split(" ")[0].toLowerCase()}`);
    });
  }
});
