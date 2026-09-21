import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// V7 (docs/spec-look.md § « V7 », 21/09/2026) : huit plannings, trois et demi visibles sur
// un téléphone — il fallait faire glisser la rangée pour trouver le sien. Sous 1024 px elle
// devient un menu : une pastille à la couleur du planning ouvert, qui déroule les huit.
// À partir de 1024 px les huit tiennent : la rangée reste. Évènements n'est pas touché.
const CULTE = "rgb(45, 90, 101)";
const CAMPUS = "rgb(36, 113, 163)";
const PLANNINGS = ["Accueil", "Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"];

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

/** Les huit tiennent sur une rangée à partir de 1024 px ; le projet « ordinateur » fait 1280. */
const surOrdinateur = () => test.info().project.name === "ordinateur";

const ouvrir = async (page: Page, route: string) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MUSICIEN, {}, route);
  await page.getByRole("navigation").first().waitFor();
};
const menu = (page: Page) => page.getByTestId("menu-plannings");
const rangee = (page: Page) => page.getByTestId("onglets-section");
const couleur = (l: ReturnType<Page["getByTestId"]>) => l.evaluate((el) => getComputedStyle(el).color);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("plannings : un menu sous 1024 px, la rangée au-delà (V7)", () => {
  test("le planning ouvert se lit sur la pastille, dans sa couleur", async ({ page }) => {
    await ouvrir(page, "/planning/campus");
    if (surOrdinateur()) {
      await expect(menu(page)).toBeHidden();
      await expect(rangee(page)).toBeVisible();
      return;
    }
    await expect(rangee(page), "la rangée ne reste pas cachée derrière le menu").toBeHidden();
    await expect(menu(page)).toContainText("Campus");
    expect(await couleur(menu(page))).toBe(CAMPUS);
    await capture(page, "menu-plannings-ferme");
  });

  test("la pastille déroule les huit plannings, le courant coché", async ({ page }) => {
    test.skip(surOrdinateur(), "la rangée porte les huit onglets");
    await ouvrir(page, "/planning/campus");
    await menu(page).click();
    const liens = page.getByRole("menu").getByRole("menuitem");
    await expect(liens).toHaveCount(8);
    await expect(liens).toHaveText(PLANNINGS.map((n) => new RegExp(n.replace(".", "\\."))));
    await expect(page.getByRole("menuitem", { name: "Campus" })).toHaveAttribute("aria-current", "page");
    // Mesurer (et capturer) pendant l'ouverture donnerait 41,8 px et un panneau
    // translucide : le menu arrive en `zoom-in-95 fade-in-0`.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await capture(page, "menu-plannings-ouvert");
    // Arrondi : sur un écran à 2,625 la mesure tombe à 43,99999.
    for (const box of await liens.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });

  test("choisir un planning y mène, et la pastille le dit", async ({ page }) => {
    test.skip(surOrdinateur(), "la rangée porte les huit onglets");
    await ouvrir(page, "/planning");
    await expect(menu(page)).toContainText("Accueil");
    await menu(page).click();
    await page.getByRole("menuitem", { name: "Culte Franco" }).click();
    await expect(page).toHaveURL(/\/planning\/culte\/?$/);
    await expect(menu(page)).toContainText("Culte Franco");
    expect(await couleur(menu(page))).toBe(CULTE);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("plus rien ne glisse sur le côté dans la barre de section", async ({ page }) => {
    test.skip(surOrdinateur(), "la rangée glisse toujours, et les huit y tiennent");
    await ouvrir(page, "/planning");
    const trop = await page.getByTestId("barre-section").evaluate((el) =>
      [el, ...Array.from(el.querySelectorAll("*"))].some((n) => n.scrollWidth > n.clientWidth + 1)
    );
    expect(trop).toBe(false);
  });

  test("Évènements garde sa rangée d'onglets", async ({ page }) => {
    await ouvrir(page, "/evenements");
    await expect(page.getByTestId("barre-section")).toBeVisible();
    await expect(menu(page)).toHaveCount(0);
  });
});
