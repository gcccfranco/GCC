import { expect, test, type Page } from "@playwright/test";
import { openSheet } from "./helpers/jianpu";

// Lot JE, JE3 et JE4 (docs/spec-jianpu-entete-statistiques.md) : l'en-tête de la page chant
// (sous-titre, référence biblique, ligne « 1= · mesure · ♩ ») et les deux colonnes sur 简谱
// quand la colonne du chant a la place (décision de Timothée du 31/10/2026).

const SLUG = "回家";
const normaliser = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

async function enParoles(page: Page) {
  await page.getByRole("radiogroup", { name: "简谱 · Paroles" }).getByRole("radio", { name: "Paroles" }).click();
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
}

test("回家 en 简谱 : sous-titre, référence biblique et « 1=D · 4/4 · ♩ = 66 » ; en paroles sans « 1= »", async ({ page }) => {
  await openSheet(page, SLUG);
  await expect(page.getByTestId("sous-titre")).toHaveText("Coming Home");
  await expect(page.getByTestId("reference-biblique")).toHaveText("路15:11-32");
  await expect(page.getByTestId("ligne-tempo")).toBeVisible();
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("1=D · 4/4 · ♩ = 66");

  await enParoles(page);
  await expect(page.getByTestId("sous-titre")).toHaveText("Coming Home");
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("4/4 · ♩ = 66");
});

test("回家 transposé en E, vue 简谱 : la ligne commence par « 1=E »", async ({ page }) => {
  await openSheet(page, SLUG, { key: "E" });
  await expect(page.getByTestId("ligne-tempo")).toBeVisible();
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toMatch(/^1=E · 4\/4 · ♩ = 66$/);
});

test("un chant français sans {time} ni {subtitle} : ni sous-titre ni référence, la ligne se réduit au tempo", async ({ page }) => {
  await page.goto("/songs/aucune-peur");
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.getByTestId("sous-titre")).toHaveCount(0);
  await expect(page.getByTestId("reference-biblique")).toHaveCount(0);
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("♩ = 95");
});

test("aux tailles des projets : une colonne, l'en-tête est au-dessus du scan", async ({ page }) => {
  await openSheet(page, SLUG);
  const [liste, scan] = await Promise.all([
    page.getByRole("list", { name: "Structure" }).boundingBox(),
    page.locator("[data-jianpu-fenetre]").first().boundingBox(),
  ]);
  expect(liste!.y + liste!.height).toBeLessThanOrEqual(scan!.y);
});

test("(ordinateur, 1920 px) une colonne aussi sur grand écran : l'en-tête au-dessus du scan", async ({ page }, info) => {
  // Timothée, 31/10/2026 : les deux colonnes A2 sont retirées, une colonne à toutes les tailles.
  test.skip(info.project.name !== "ordinateur", "mesuré au projet ordinateur, élargi à 1920 px");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openSheet(page, SLUG);
  const [liste, scan] = await Promise.all([
    page.getByRole("list", { name: "Structure" }).boundingBox(),
    page.locator("[data-jianpu-fenetre]").first().boundingBox(),
  ]);
  expect(liste!.y + liste!.height).toBeLessThanOrEqual(scan!.y);
});
