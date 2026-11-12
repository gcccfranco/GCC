import { expect, test } from "@playwright/test";

// Bug du 12/11/2026 (capture d'iPhone) : en défilant doucement la page d'un chant, l'en-tête et la barre se cachaient
// dès 40 px alors que la place qu'ils réservent en haut était encore à l'écran : une bande vide au-dessus du titre.
// Les barres restent désormais jusqu'à ce que cette place soit sortie (useScrollDirection). Un chant FR, un chant ZH.

for (const slug of ["abba-pere", "活着为要敬拜你"]) {
  test(`pas de bande vide en haut en défilant doucement — ${slug}`, async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const barre = page.getByTestId("barre-outils");
    await expect(barre.locator("select").first()).toBeVisible();
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="barre-outils"]');
      return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
    });
    await page.waitForLoadState("networkidle");
    await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeGreaterThan(170);
    // Deux volets (ordinateur, iPad couché) : la barre colle dans le panneau du chant, elle ne réserve pas de bande.
    const fixe = await barre.evaluate((el) => getComputedStyle(el).position === "fixed");
    test.skip(!fixe, "barre collante dans le panneau du chant (deux volets) : pas de bande réservée");
    const bas = async () => { const b = await barre.boundingBox(); return b!.y + b!.height; };
    const basAuRepos = await bas();
    // Défilement doux : 72 px par pas de 8, la place réservée (barres fixes) est encore à l'écran.
    for (let i = 0; i < 9; i++) { await page.evaluate(() => window.scrollBy(0, 8)); await page.waitForTimeout(40); }
    await page.waitForTimeout(500);
    expect(await bas()).toBeGreaterThan(basAuRepos - 2);
    // Une fois la place sortie, les barres se cachent comme avant.
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
    await expect.poll(bas, { timeout: 3000 }).toBeLessThanOrEqual(0);
  });
}
