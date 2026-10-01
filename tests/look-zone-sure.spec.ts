import { expect, test, type Page } from "@playwright/test";

// Garde-fou (21/09/2026) : `black-translucent` a été en ligne quelques heures, et iOS
// FIGE ce réglage à l'installation de l'icône — il ne le relit jamais. Les appareils où
// l'icône a été installée ce jour-là passent donc toujours sous la barre d'état. La
// navbar doit lui réserver sa place, sinon le logo et les boutons se retrouvent derrière
// l'heure (ce qui est arrivé sur l'iPhone de Timothée après le retrait de T6).
//
// Playwright ne simule pas de zone sûre : on la pose à la main, comme `look-navigation`
// le fait déjà avec `--sab` pour la barre du bas.
const SAT = 59;
const poser = (page: Page, px: number) => page.addStyleTag({ content: `:root { --sat: ${px}px !important; }` });

test.describe("zone sûre du haut", () => {
  test("sans zone sûre, rien ne bouge : la navbar fait 58 px", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    expect(await page.locator("header").first().boundingBox()).toMatchObject({ y: 0, height: 58 });
  });

  test("avec une zone sûre, la navbar la réserve et son contenu reste dessous", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await poser(page, SAT);
    const header = page.locator("header").first();
    await expect.poll(async () => (await header.boundingBox())?.height).toBe(58 + SAT);
    const logo = await page.locator("header img").first().boundingBox();
    expect(logo!.y, "le logo passerait derrière l'heure").toBeGreaterThanOrEqual(SAT);
  });

  test("le contenu de la page descend d'autant", async ({ page }) => {
    await page.goto("/songs");
    const titre = page.getByRole("heading", { level: 1, name: "Chants" });
    await titre.waitFor();
    const avant = (await titre.boundingBox())!.y;
    await poser(page, SAT);
    await expect.poll(async () => (await titre.boundingBox())!.y).toBeCloseTo(avant + SAT, 0);
  });

  test("le halo suit la barre au lieu de rester derrière l'heure", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await poser(page, SAT);
    const repos = test.info().project.name === "ordinateur" ? -200 : -80;
    await expect
      .poll(() => page.getByTestId("halo").evaluate((el) => getComputedStyle(el, "::before").top))
      .toBe(`${repos + SAT}px`);
  });
});
