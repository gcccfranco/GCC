import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot DA / DA-3 (docs/spec-dictionnaire-accords.md, Q13, Q16) : l'agencement du panneau d'un accord et de la
// bulle d'aide, sur les cinq projets (SPECS_GRAND_ECRAN). Ne fait que les captures — rangées dans
// test-results/captures-accords-toucher/ pour être regardées — et la position des bulles. Le comportement est
// dans accords-toucher.spec.ts.

const DOSSIER = "test-results/captures-accords-toucher";
mkdirSync(DOSSIER, { recursive: true });
const photo = (page: Page, nom: string) => page.screenshot({ path: `${DOSSIER}/${nom}-${test.info().project.name}.png` });

const touchables = (page: Page) => page.locator("[data-accord-touchable]");
const panneau = (page: Page) => page.locator("[data-accord-panneau]");
const aide = (page: Page) => page.locator("[data-accords-aide]");
const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
const enBulle = (projet: string) => projet === "ordinateur" || projet === "ordinateur-1440";

const AMBROISE: FakeProfile = {
  uid: "uid-ambroise",
  email: "ambroise@example.com",
  firstName: "Ambroise",
  lastName: "Velin",
  planningName: "Ambroise V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Clémence R.", "", "", "Ambroise V.", "", "", "", "", "", "", ""],
]);

/** La boîte d'un élément : la bulle doit commencer sous celle de l'accord. */
const boite = async (el: ReturnType<Page["locator"]>) => (await el.boundingBox())!;

async function verifier(page: Page, accord: ReturnType<Page["locator"]>) {
  const projet = test.info().project.name;
  await accord.click();
  await expect(panneau(page)).toHaveAttribute("data-accord-panneau", enBulle(projet) ? "bulle" : "feuille");
  await expect(page.locator("[data-accord-nom]")).toBeVisible();
  const p = await boite(panneau(page));
  const vue = page.viewportSize()!;
  if (enBulle(projet)) {
    const a = await boite(accord);
    // Sous l'accord (ou calée dans l'écran quand il n'y a de place ni dessous ni dessus : écran bas).
    const sous = p.y >= a.y + a.height - 1;
    const calee = p.y >= 0 && p.y + p.height <= vue.height;
    expect(sous || calee, `bulle sous l'accord : accord ${JSON.stringify(a)}, bulle ${JSON.stringify(p)}`).toBe(true);
    expect(p.x, "dans l'écran").toBeGreaterThanOrEqual(0);
    expect(p.x + p.width, "dans l'écran").toBeLessThanOrEqual(vue.width);
    expect(p.y + p.height, "ne sort pas par le bas").toBeLessThanOrEqual(vue.height + 1);
  } else {
    expect(p.y + p.height, "feuille du bas, collée au bas de l'écran").toBeGreaterThanOrEqual(vue.height - 2);
    expect(p.y, "ne couvre pas tout l'écran").toBeGreaterThan(vue.height * 0.1);
  }
}

test("chant FR : le panneau d'un accord (capture)", async ({ page }) => {
  await sansAide(page);
  await page.goto("/songs/abba-pere");
  await expect(touchables(page).first()).toBeVisible();
  // Un accord de couplet, plus bas que l'intro : le cas courant.
  const accord = page.locator("[data-section] [data-copy-line] [data-accord-touchable]").nth(2);
  await accord.scrollIntoViewIfNeeded();
  await verifier(page, accord);
  await photo(page, "panneau-fr");
});

test("chant ZH : le panneau d'un accord (capture)", async ({ page }) => {
  await sansAide(page);
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.goto("/songs/" + encodeURIComponent("一切歌颂赞美"));
  await expect(touchables(page).first()).toBeVisible();
  const accord = touchables(page).nth(3);
  await accord.scrollIntoViewIfNeeded();
  await verifier(page, accord);
  await photo(page, "panneau-zh");
});

test("la bulle d'aide se pose sous le premier accord visible (capture)", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  const premier = touchables(page).first();
  await expect(premier).toBeVisible();
  await expect(aide(page)).toBeVisible();
  const a = await boite(premier);
  const b = await boite(aide(page));
  expect(b.y, "sous l'accord").toBeGreaterThanOrEqual(a.y + a.height - 1);
  const vue = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(vue.width);
  await expect(aide(page)).toHaveCSS("border-radius", "12px");
  await photo(page, "aide");
});

test("idées d'harmonie : l'accord proposé, puis son panneau (captures)", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await sansAide(page);
  await signInAs(page, AMBROISE, {}, "/songs/au-nom-de-jesus");
  await page.getByTestId("barre-outils").getByRole("button", { name: "Idées d'harmonie" }).click();
  const accord = page.locator("[data-idees-harmonie] [data-accord-touchable]").first();
  await expect(accord).toBeVisible();
  await accord.scrollIntoViewIfNeeded();
  await photo(page, "idees-carte");
  await verifier(page, accord);
  await photo(page, "idees-panneau");
  await page.keyboard.press("Escape");
  await expect(panneau(page)).toHaveCount(0);
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
});
