import { expect, test, type Page } from "@playwright/test";

const phone = {
  viewport: { width: 390, height: 664 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
};

const index = (page: Page) => page.getByRole("navigation", { name: /index/i });

async function openSongs(page: Page) {
  await page.goto("/songs");
  await page.getByRole("searchbox").waitFor();
  await expect(index(page)).toBeVisible();
}

test.describe("index A–Z sur téléphone", () => {
  test.use(phone);

  test("la recherche n'est pas recouverte par l'index", async ({ page }) => {
    await openSongs(page);
    const search = await page.getByRole("searchbox").boundingBox();
    const idx = await index(page).boundingBox();
    expect(search!.x + search!.width).toBeLessThanOrEqual(idx!.x);
  });

  test("glisser le doigt sur l'index fait défiler la liste en continu", async ({ page }) => {
    await openSongs(page);
    const letters = index(page).getByRole("button");
    const a = await letters.filter({ hasText: /^A$/ }).boundingBox();
    const j = await letters.filter({ hasText: /^J$/ }).boundingBox();
    const cx = a!.x + a!.width / 2;

    // Référence : là où un tap sur « J » amène la liste (comportement existant).
    await letters.filter({ hasText: /^J$/ }).click();
    const scrollJ = await page.evaluate(() => window.scrollY);
    expect(scrollJ).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // Vrais événements tactiles : `page.mouse` ne reproduit pas le défilement
    // de page qu'un doigt déclenche.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: cx, y }],
      });

    const ay = a!.y + a!.height / 2;
    const jy = j!.y + j!.height / 2;
    await touch("touchStart", ay);
    const steps = 12;
    let midway = 0;
    for (let i = 1; i <= steps; i++) {
      await touch("touchMove", ay + ((jy - ay) * i) / steps);
      if (i === steps / 2) midway = await page.evaluate(() => window.scrollY);
    }
    // Doigt toujours posé : la liste doit déjà être sur la lettre J.
    await page.waitForTimeout(100);
    const scrolled = await page.evaluate(() => window.scrollY);
    await touch("touchEnd", jy);

    expect(midway, "la liste bouge pendant le geste, pas seulement à la fin").toBeGreaterThan(0);
    expect(midway).toBeLessThan(scrollJ);
    expect(Math.abs(scrolled - scrollJ), "doigt sur J : même endroit qu'un tap sur J").toBeLessThanOrEqual(2);
  });
});

test.describe("index A–Z sur ordinateur", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("la recherche et les cartes sont alignées, l'index est à côté de la liste", async ({ page }) => {
    await openSongs(page);
    const search = (await page.getByRole("searchbox").boundingBox())!;
    const card = (await page.locator('li[id^="song-li-"]').first().boundingBox())!;
    const idx = (await index(page).boundingBox())!;
    expect(Math.round(search.x + search.width)).toBe(Math.round(card.x + card.width));
    expect(idx.x - (card.x + card.width), "l'index reste près de la liste qu'il pilote").toBeLessThanOrEqual(24);
    expect(idx.x).toBeGreaterThanOrEqual(card.x + card.width);
  });
});

test.describe("index A–Z en bas de liste", () => {
  test.use(phone);

  test("toutes les lettres restent à l'écran en bas de la liste", async ({ page }) => {
    await openSongs(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const letters = index(page).getByRole("button");
    await expect(letters.first()).toBeInViewport({ ratio: 1 });
    await expect(letters.last()).toBeInViewport({ ratio: 1 });
  });
});
