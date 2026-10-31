import { expect, test } from "@playwright/test";

// Barre du chant rappelée d'un tap sur la partition après un défilement (18/10/2026) :
// l'en-tête reste escamoté, la barre prend sa place en haut de l'écran au lieu de laisser
// un trou de la hauteur de l'en-tête où le texte défilait. Un chant FR, un chant ZH.

for (const slug of ["abba-pere", "一生爱你"]) {
  test(`barre rappelée collée en haut, sans trou sous l'en-tête escamoté — ${slug}`, async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const barre = page.getByTestId("barre-outils");
    await expect(barre.locator("select").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollBy(0, 800));
    // L'en-tête et la barre s'escamotent ensemble.
    await expect.poll(async () => { const b = await barre.boundingBox(); return b!.y + b!.height; }).toBeLessThanOrEqual(0);
    // Au point de l'écran : `locator.click` ferait d'abord défiler, ce qui ramène aussi l'en-tête.
    const { height } = page.viewportSize()!;
    const partition = (await page.locator("main.song-zoom").boundingBox())!;
    await page.mouse.click(Math.round(partition.x + 30), Math.round(height / 2));
    // L'en-tête, lui, reste escamoté.
    await expect.poll(async () => { const n = await page.locator("header").first().boundingBox(); return n ? n.y + n.height : 0; }).toBeLessThanOrEqual(1);
    // Mesurer une fois la glissade finie (300 ms), pas en route.
    await expect.poll(async () => (await barre.boundingBox())!.y).toBeGreaterThan(-20);
    await barre.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    expect(Math.abs((await barre.boundingBox())!.y), "la barre colle en haut de l'écran").toBeLessThanOrEqual(1);
    const dir = process.env.PW_CAPTURES;
    if (dir) await page.screenshot({ path: `${dir}/main-barre-rappelee-${test.info().project.name}-${slug === "abba-pere" ? "fr" : "zh"}.png` });
  });
}
