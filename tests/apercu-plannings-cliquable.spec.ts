import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// L'aperçu « Ce dimanche » de l'accueil du Planning (Timothée, 29/10/2026) : chaque carte ouvre
// son planning d'un toucher, sans passer par le bouton « Accueil » et sa liste. Trois appareils,
// français et chinois. Noms fictifs seulement.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["15/11", "Présidente Ysaline", "Choriste Odilon", "", "Pianiste Firmin", "", "", "", "", "", "", "", ""],
]);
const MEMBRE: FakeProfile = { uid: "uid-apercu", email: "apercu@example.com", planningName: "Pianiste Firmin" };

async function ouvrir(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-15T09:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MEMBRE, {}, "/planning");
  await expect(page.getByTestId("carte-culte")).toBeVisible();
}

for (const [carte, url] of [
  ["carte-culte", /\/planning\/culte\/?$/],
  ["carte-groupes", /\/planning\/groupes\/?$/],
  ["carte-edd", /\/planning\/edd\/?$/],
  ["carte-table", /\/planning\/table\/?$/],
] as const) {
  test(`un toucher sur ${carte} (pas seulement sur son titre) ouvre son planning`, async ({ page }) => {
    await ouvrir(page);
    const c = page.getByTestId(carte);
    await c.scrollIntoViewIfNeeded();
    const b = (await c.boundingBox())!;
    // Bas de la carte, loin du titre : toute la carte se touche.
    await page.mouse.click(b.x + b.width / 2, b.y + b.height - 6);
    await expect(page).toHaveURL(url);
  });
}

test("le titre de chaque carte est un lien, en chinois aussi", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page);
  for (const [carte, href] of [["carte-culte", "/planning/culte"], ["carte-groupes", "/planning/groupes"], ["carte-edd", "/planning/edd"], ["carte-table", "/planning/table"]]) {
    await expect(page.getByTestId(carte).locator(`a[href="${href}"], a[href="${href}/"]`).first()).toBeVisible();
  }
});
