import { expect, test, type Page } from "@playwright/test";

// Revenir d'un chant vers la liste doit ramener exactement là où on était,
// dès la première image visible : ni position perdue, ni saut.
test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

const POSITION = 4000;

/** Enregistre, à chaque image, le défilement et l'opacité de la page. */
async function recordFrames(page: Page) {
  await page.evaluate(() => {
    const frames: { list: boolean; opacity: number; y: number }[] = [];
    (window as unknown as { __frames: typeof frames }).__frames = frames;
    const t0 = performance.now();
    const tick = () => {
      const wrap = document.querySelector("main > div");
      frames.push({
        list: !!document.querySelector('input[type="search"]'),
        opacity: wrap ? Number(getComputedStyle(wrap).opacity) : 0,
        y: Math.round(window.scrollY),
      });
      if (performance.now() - t0 < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const retourParLeBouton = (page: Page) =>
  // Sur téléphone, le libellé est masqué : le lien se reconnaît à sa flèche.
  page.evaluate(() =>
    (document.querySelector('a[href^="/songs"] path[d="M19 12H5m6-7l-7 7 7 7"]')!.closest("a") as HTMLElement).click()
  );

for (const [nom, liste, revenir] of [
  ["le bouton Retour", "/songs", retourParLeBouton],
  ["le bouton Retour, filtre 中文 actif", "/songs?lang=zh", retourParLeBouton],
  ["le retour du navigateur", "/songs", (page: Page) => page.goBack()],
] as const) {
  test(`revenir par ${nom} ramène au même endroit, sans saut`, async ({ page }) => {
    await page.goto(liste);
    await page.getByRole("searchbox").waitFor();
    // La page arrive du serveur non filtrée ; le filtre de l'adresse
    // (?lang=zh) s'applique à l'hydratation. Choisir une carte avant, sous
    // charge, visait un chant que le filtre retire ensuite.
    await page.waitForFunction(() => {
      const search = document.querySelector('input[type="search"]');
      return !!search && Object.keys(search).some((k) => k.startsWith("__reactProps"));
    });
    // Tant que la page s'hydrate (filtre de l'URL appliqué), un défilement
    // peut encore être déplacé : on répète jusqu'à ce qu'il tienne.
    await expect
      .poll(async () => {
        await page.evaluate((y) => window.scrollTo(0, y), POSITION);
        await page.waitForTimeout(200);
        return page.evaluate(() => window.scrollY);
      })
      .toBe(POSITION);

    const card = await page.evaluate(
      () => [...document.querySelectorAll('li[id^="song-li-"]')].find((li) => li.getBoundingClientRect().top > 150)!.id
    );
    await page.locator(`#${card} a`).click();
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(600);

    await recordFrames(page);
    await revenir(page);
    await page.waitForTimeout(1000);

    const frames = await page.evaluate(
      () => (window as unknown as { __frames: { list: boolean; opacity: number; y: number }[] }).__frames
    );
    const visibles = frames.filter((f) => f.list && f.opacity > 0.05);
    expect(visibles.length).toBeGreaterThan(0);
    expect(visibles.at(-1)!.y, "position retrouvée").toBe(POSITION);
    expect(new URL(page.url()).search).toBe(new URL(liste, "http://x").search);
    expect(visibles.map((f) => f.y), "aucune image visible ailleurs qu'à la position retrouvée").toEqual(
      visibles.map(() => POSITION)
    );
  });
}
