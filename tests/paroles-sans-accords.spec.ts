import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Accords masqués : le texte d'après un accord garde son espace. « à[F] Lui » s'affichait
// « àLui » (31/10/2026). Un chant FR, et un chant ZH qui ne doit pas bouger.
const MEMBRE: FakeProfile = { uid: "uid-lise", email: "lise.marchal@example.com", firstName: "Lise", lastName: "M." };

const lignes = (page: import("@playwright/test").Page) =>
  page.locator("main.song-zoom [data-copy-line]").evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, " ").trim()));

test("sans accords, « à Lui » garde son espace", async ({ page }) => {
  await signInAs(page, MEMBRE, {}, "/songs/en-toi-je-sais-qui-je-suis");
  const main = page.locator("main.song-zoom");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByTestId("barre-outils").getByRole("button", { name: "Accords", exact: true }).click();
  await expect(main.getByText("à Lui.").first()).toBeVisible();
  const texte = (await lignes(page)).join("\n");
  expect(texte).toContain("Je suis enfant de Dieu, je suis à Lui.");
  expect(texte).not.toContain("àLui");
  if (process.env.PW_CAPTURES) await page.screenshot({ path: `${process.env.PW_CAPTURES}/sans-accords-${test.info().project.name}.png` });
});

test("sans accords, un mot coupé par des accords se recolle (« digne »)", async ({ page }) => {
  await signInAs(page, MEMBRE, {}, "/songs/toi-seul-es-digne");
  const main = page.locator("main.song-zoom");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByTestId("barre-outils").getByRole("button", { name: "Accords", exact: true }).click();
  await expect(main.getByText("digne").first()).toBeVisible();
  const texte = (await lignes(page)).join("\n");
  expect(texte).toMatch(/es digne/);
  expect(texte).not.toMatch(/di ?- ?gne|di gne/);
});
