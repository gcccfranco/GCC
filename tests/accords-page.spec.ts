import { expect, test, type Page } from "@playwright/test";

// Lot DA / DA-2 (docs/spec-dictionnaire-accords.md) : la page /accords, ouverte à tous. Sans compte : aucune
// fausse session. La page est agencée (carte + groupes qui passent l'un sous l'autre) : cinq projets
// (SPECS_GRAND_ECRAN). Les captures sont rangées dans test-results/captures-accords/ pour être regardées.

const carte = (page: Page) => page.locator("[data-carte-accord]");
const notes = (page: Page) => page.getByRole("group", { name: "Note" });
const chercher = (page: Page) => page.getByRole("searchbox");

async function ouvrir(page: Page, accord?: string) {
  await page.goto(accord ? `/accords?accord=${encodeURIComponent(accord)}` : "/accords");
  await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
}

test("la page s'ouvre sans compte : titre, ligne d'aide, accord C par défaut", async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByText("C = Do", { exact: false }).first()).toBeVisible();
  await expect(carte(page).locator("[data-accord-nom]")).toHaveText("C");
  await expect(notes(page).getByRole("button", { name: "C", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Les plus joués" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avec une basse" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plus rares" })).toBeVisible();
  // Pas de défilement horizontal.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("?accord=D%2FF%23 montre D/F# et sa grille 2x0232", async ({ page }) => {
  await ouvrir(page, "D/F#");
  await expect(carte(page).locator("[data-accord-nom]")).toHaveText("D/F#");
  await expect(carte(page).locator("[data-grille]")).toHaveAttribute("data-grille", "2x0232");
  await expect(carte(page).getByRole("img")).toHaveAccessibleName(/2x0232/);
  // Les basses de D, épelées : D/F#, D/A, D/E, D/C, D/B.
  const basses = page.getByRole("heading", { name: "Avec une basse" }).locator("..");
  for (const b of ["D/F#", "D/A", "D/E", "D/C", "D/B"]) await expect(basses.getByRole("button", { name: b, exact: true })).toBeVisible();
  // La pastille de l'accord affiché est pleine.
  await expect(basses.getByRole("button", { name: "D/F#", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("la recherche A# allume la pastille Bb et garde l'écriture A#", async ({ page }) => {
  await ouvrir(page);
  await chercher(page).fill("A#");
  await expect(carte(page).locator("[data-accord-nom]")).toHaveText("A#");
  await expect(notes(page).getByRole("button", { name: "Bb", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/accord=A%23/);
  // Une note seule, lettre en minuscule.
  await chercher(page).fill("f#");
  await expect(notes(page).getByRole("button", { name: "F#", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Rien de valide : un message discret, l'accord affiché ne change pas.
  await chercher(page).fill("zzz");
  await expect(page.getByText("Accord inconnu")).toBeVisible();
  await expect(carte(page).locator("[data-accord-nom]")).toHaveText("F#");
});

test("un accord à trois positions : Position 1 sur 3, puis 2 sur 3", async ({ page }) => {
  await ouvrir(page, "G");
  await expect(carte(page).getByText("Position 1 sur 3")).toBeVisible();
  const premiere = await carte(page).locator("[data-grille]").getAttribute("data-grille");
  await carte(page).getByRole("button", { name: "Position suivante" }).click();
  await expect(carte(page).getByText("Position 2 sur 3")).toBeVisible();
  expect(await carte(page).locator("[data-grille]").getAttribute("data-grille")).not.toBe(premiere);
});

test("Piano : Main gauche F# pour D/F#, et le choix est retenu après rechargement", async ({ page }) => {
  await ouvrir(page, "D/F#");
  await expect(page.getByRole("radio", { name: "Guitare" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Piano" }).click();
  await expect(carte(page).getByText("Main gauche : F#")).toBeVisible();
  await expect(carte(page).getByText("Main droite : D F# A")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Piano" })).toHaveAttribute("aria-checked", "true");
  await expect(carte(page).getByText("Main gauche : F#")).toBeVisible();
});

test("D2 dit D2 = Dsus2, D5 dit accord de puissance", async ({ page }) => {
  await ouvrir(page);
  await chercher(page).fill("D2");
  await expect(carte(page).getByText("D2 = Dsus2")).toBeVisible();
  await chercher(page).fill("D5");
  await expect(carte(page).getByText("D5 = accord de puissance (D et A seulement)")).toBeVisible();
});

test("Adim9 : « Pas encore de doigté » avec Signaler, et le piano s'affiche", async ({ page }) => {
  await ouvrir(page, "Adim9");
  await expect(carte(page).getByText("Pas encore de doigté")).toBeVisible();
  await carte(page).getByRole("button", { name: "Signaler" }).click();
  // Sans compte, le signalement invite à se connecter ; l'accord est pré-rempli pour les membres.
  await expect(page.getByRole("heading", { name: /Signaler|Signalement/i })).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("radio", { name: "Piano" }).click();
  await expect(carte(page).getByText(/Main droite/)).toBeVisible();
  await expect(carte(page).getByText("Pas encore de doigté")).toHaveCount(0);
});

test("en 中文 les libellés sont traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.goto("/accords?accord=G");
  await expect(page.getByRole("heading", { level: 1, name: "和弦" })).toBeVisible();
  await expect(chercher(page)).toHaveAttribute("placeholder", /搜索/);
  await expect(page.getByRole("radio", { name: "吉他" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "钢琴" })).toBeVisible();
  await expect(carte(page).getByText("第 1 种按法，共 3 种")).toBeVisible();
  await expect(carte(page).getByText(/大三和弦/)).toBeVisible();
  await page.getByRole("radio", { name: "钢琴" }).click();
  await expect(carte(page).getByText(/左手/)).toBeVisible();
});

test("aucun lien vers /accords dans la navigation", async ({ page }) => {
  for (const chemin of ["/songs", "/accords"]) {
    await page.goto(chemin);
    await expect(page.locator("main, body").first()).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator("nav a[href^='/accords'], aside a[href^='/accords']")).toHaveCount(0);
  }
});

for (const [langue, stockee] of [["fr", "fr"], ["zh", "zh-CN"]] as const) {
  test(`captures de la page (${langue})`, async ({ page }, testInfo) => {
    await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), stockee);
    await page.goto("/accords?accord=D%2FF%23");
    await expect(carte(page).locator("[data-grille]")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/captures-accords/${testInfo.project.name}-${langue}.png`, fullPage: true });
    if (langue === "fr") {
      await page.getByRole("radio", { name: "Piano" }).click();
      await expect(carte(page).getByText("Main gauche : F#")).toBeVisible();
      await carte(page).screenshot({ path: `test-results/captures-accords/${testInfo.project.name}-panneau-piano.png` });
    }
  });
}
