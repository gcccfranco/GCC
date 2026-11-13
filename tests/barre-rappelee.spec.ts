import { expect, test } from "@playwright/test";

// Barre du chant rappelée d'un tap sur la partition après un défilement (18/10/2026) :
// l'en-tête reste escamoté, la barre prend sa place en haut de l'écran au lieu de laisser
// un trou de la hauteur de l'en-tête où le texte défilait. Un chant FR, un chant ZH.

for (const slug of ["abba-pere", "一生爱你"]) {
  test(`barre rappelée collée en haut, sans trou sous l'en-tête escamoté — ${slug}`, async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const barre = page.getByTestId("barre-outils");
    await expect(barre.locator("select").first()).toBeVisible();
    // React a hydraté la barre (même repère que fakeSession) : avant, l'écouteur de défilement de la barre n'est pas
    // branché, le défilement passe inaperçu et la barre ne s'escamote jamais.
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="barre-outils"]');
      return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
    });
    await page.waitForLoadState("networkidle");
    // Serveur froid : la partition (le scan 简谱 de 一生爱你) peut n'être pas encore posée, et la page trop courte pour
    // défiler ; la barre ne s'escamoterait alors jamais (seuil de 40 px, useScrollDirection). On attend une page qui défile.
    await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeGreaterThan(60);
    // L'en-tête et la barre s'escamotent ensemble. Sous charge, rarement (1 passe complète sur 3, jamais avec un
    // journal des défilements), la barre revient juste après : un défilement tardif de l'ouverture, non attrapé. Ce test
    // juge la barre rappelée, pas l'ouverture : on repart du haut et on redéfile (trois essais au plus).
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollBy(0, 800));
      await expect.poll(async () => { const b = await barre.boundingBox(); return b!.y + b!.height; }, { timeout: 3000 }).toBeLessThanOrEqual(0);
    }).toPass({ timeout: 12_000, intervals: [500] });
    // Au point de l'écran : `locator.click` ferait d'abord défiler, ce qui ramène aussi l'en-tête.
    const { height } = page.viewportSize()!;
    const partition = (await page.locator("main.song-zoom").boundingBox())!;
    await page.mouse.click(Math.round(partition.x + 30), Math.round(height / 2));
    // L'en-tête, lui, reste escamoté.
    await expect.poll(async () => { const n = await page.locator("header").first().boundingBox(); return n ? n.y + n.height : 0; }).toBeLessThanOrEqual(1);
    // Mesurer une fois la glissade finie (300 ms), pas en route.
    await expect.poll(async () => (await barre.boundingBox())!.y).toBeGreaterThan(-20);
    await barre.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    // Chant en deux volets (ordinateur, iPad couché ; reprise du 05/11/2026, 1b0c716) : la barre est dans le panneau du
    // chant, dont le haut s'aligne sur la carte de la liste ; collée, elle se pose à 16 px sous ce haut, comme la barre
    // collée au défilement (« barre collée au bord de l'écran » était le défaut corrigé). En un volet : en haut de l'écran.
    const carte = page.locator(".chants-volets .chants-liste");
    const deuxVolets = await carte.isVisible() && (await page.locator(".chants-chant").isVisible());
    const attendu = deuxVolets ? (await carte.boundingBox())!.y + 16 : 0;
    expect(Math.abs((await barre.boundingBox())!.y - attendu), deuxVolets ? "la barre se pose dans le panneau, alignée sur la carte de la liste" : "la barre colle en haut de l'écran").toBeLessThanOrEqual(1);
    const dir = process.env.PW_CAPTURES;
    if (dir) await page.screenshot({ path: `${dir}/main-barre-rappelee-${test.info().project.name}-${slug === "abba-pere" ? "fr" : "zh"}.png` });
  });
}
