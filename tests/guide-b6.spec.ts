import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { FIGURES } from "../src/lib/guide/figures";

// Tranche B6b (docs/spec-corrections-audit.md, G11) : le guide d'utilisation. Chaque figure a sa capture
// (public/guide/<id>.png, 2560×1600), le texte dit « Chants » et non « Louange » pour l'onglet, et aucun
// nombre de chants n'y est écrit en dur. Compte fictif ; Sheets simulés.
// Les captures se refont avec `GUIDE_CAPTURES=1 npx playwright test tests/guide-captures.spec.ts --project=ordinateur`.

const MEMBRE: FakeProfile = { uid: "uid-guide-b6", email: "guide.b6@example.com", firstName: "Inès", lastName: "Garnier" };
const IDS = Object.values(FIGURES).flat().map((f) => f.id);

async function sansSheets(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}

async function ouvrirGuide(page: Page, langue: "fr" | "zh") {
  if (langue === "zh") await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await sansSheets(page);
  await signInAs(page, MEMBRE, {}, "/guide");
  await expect(page.getByRole("heading", { level: 1, name: langue === "fr" ? "Guide d'utilisation" : "使用指南" })).toBeVisible();
}

/** Toutes les images des figures sont chargées (le défilement les amène : elles sont paresseuses). */
async function imagesChargees(page: Page) {
  for (const id of IDS) {
    const img = page.locator(`img[src*="/guide/${id}.png"]`).first();
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), { message: `image ${id}` }).toBeGreaterThan(0);
  }
}

for (const [langue, titre] of [["fr", "français"], ["zh", "中文"]] as const) {
  test(`/guide en ${titre} : chaque figure a son image, ni « onglet Louange » ni nombre de chants écrit`, async ({ page }) => {
    await ouvrirGuide(page, langue);
    await imagesChargees(page);
    const texte = await page.locator("main, body").first().innerText();
    expect(texte).not.toMatch(/onglet\s+\*{0,2}Louange/i);
    expect(texte).not.toContain("敬拜」标签");
    expect(texte).not.toContain("敬拜标签");
    expect(texte).not.toMatch(/\b(369|370)\b/);
  });
}

test("figures : chaque capture référencée existe et fait 2560×1600", () => {
  expect(IDS.length).toBeGreaterThan(10);
  for (const id of IDS) {
    const png = readFileSync(`public/guide/${id}.png`);
    // En-tête PNG : signature (8 octets), « IHDR » (8), largeur puis hauteur sur 4 octets chacune.
    expect(png.subarray(1, 4).toString("latin1"), `${id}.png est un PNG`).toBe("PNG");
    expect({ id, largeur: png.readUInt32BE(16), hauteur: png.readUInt32BE(20) }).toEqual({ id, largeur: 2560, hauteur: 1600 });
  }
});

// Vues à regarder à l'œil (test-results/guide-b6/) : chaque figure annotée du guide, ordinateur 1440 en français
// clair puis téléphone en 中文 sombre. On vérifie à la main que cercles, flèches et légendes tombent sur leurs cibles.
for (const vue of [
  { nom: "ordinateur-1440-fr-clair", langue: "fr", clair: true, taille: { width: 1440, height: 900 } },
  { nom: "telephone-zh-sombre", langue: "zh", clair: false, taille: { width: 390, height: 800 } },
] as const) {
  test(`vues du guide : ${vue.nom}`, async ({ page }) => {
    await page.setViewportSize(vue.taille);
    await page.emulateMedia({ colorScheme: vue.clair ? "light" : "dark" });
    await ouvrirGuide(page, vue.langue);
    await imagesChargees(page);
    for (const id of IDS) {
      const figure = page.locator("figure").filter({ has: page.locator(`img[src*="/guide/${id}.png"]`) });
      await figure.scrollIntoViewIfNeeded();
      await figure.screenshot({ path: `test-results/guide-b6/${vue.nom}-${id}.png` });
    }
  });
}
