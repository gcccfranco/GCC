import { expect, test, type Page } from "@playwright/test";

/** Téléphone émulé dans Chromium. Pas `devices["iPhone …"]` : ils imposent
 *  WebKit, que `test.use` ne peut pas changer dans un groupe. */
const phone = (width: number, height: number) => ({
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

const burger = (page: Page) => page.getByRole("button", { name: /menu/i });
const panel = (page: Page) => page.getByTestId("mobile-menu");

async function openSongs(page: Page) {
  await page.goto("/songs");
  await page.getByRole("searchbox").waitFor();
}

test.describe("navbar à 320 px (iPhone en « Zoom de l'affichage »)", () => {
  test.use(phone(320, 568));

  for (const lang of ["fr", "zh-CN"]) test(`toutes les commandes de la barre restent dans l'écran (${lang})`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
    await openSongs(page);
    const boxes = await page.locator("header > div a, header > div button").evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null && getComputedStyle(el).visibility !== "hidden")
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { label: el.getAttribute("aria-label") ?? el.textContent?.trim(), left: r.left, right: r.right };
        })
    );
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) {
      expect.soft(b.left, `${b.label} déborde à gauche`).toBeGreaterThanOrEqual(0);
      expect.soft(b.right, `${b.label} déborde à droite`).toBeLessThanOrEqual(320);
    }
    await expect(burger(page)).toBeInViewport({ ratio: 1 });
  });
});

test.describe("menu mobile", () => {
  test.use(phone(390, 664));

  test("le panneau est opaque et commence sous la navbar", async ({ page }) => {
    await openSongs(page);
    await burger(page).tap();
    await expect(panel(page)).toBeVisible();
    await panel(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const m = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="mobile-menu"]') as HTMLElement;
      const header = document.querySelector("header")!;
      const bg = getComputedStyle(p).backgroundColor;
      const alpha = /rgba?\(([^)]+)\)/.exec(bg)![1].split(",").map(Number)[3] ?? 1;
      return {
        alpha,
        panelTop: p.getBoundingClientRect().top,
        headerBottom: header.getBoundingClientRect().bottom,
      };
    });
    expect(m.alpha, "la page ne doit pas se lire à travers le menu").toBe(1);
    expect(Math.round(m.panelTop)).toBe(Math.round(m.headerBottom));
  });

  test("sur un écran trop court, le panneau défile et sa dernière entrée reste atteignable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 300 });
    await openSongs(page);
    await burger(page).tap();
    await expect(panel(page)).toBeVisible();
    const box = await panel(page).boundingBox();
    expect(box!.y + box!.height, "le panneau ne dépasse pas le bas de l'écran").toBeLessThanOrEqual(300);
    const last = panel(page).getByRole("link").last();
    // Le défilement est redemandé à chaque tentative : demandé pendant
    // l'animation d'ouverture, il ne se fait pas (profils mobiles).
    await expect
      .poll(async () => {
        await last.scrollIntoViewIfNeeded();
        const b = (await last.boundingBox())!;
        return b.y >= box!.y && b.y + b.height <= 300;
      }, { message: "dernière entrée entièrement à l'écran" })
      .toBe(true);
  });

  test("re-toucher le bouton pendant la fermeture rouvre le menu", async ({ page }) => {
    await openSongs(page);
    await burger(page).tap();
    await expect(panel(page)).toBeVisible();
    await page.waitForTimeout(300); // fin de l'animation d'ouverture
    await burger(page).tap(); // fermeture (animation de 160 ms)
    await page.waitForTimeout(60);
    await burger(page).tap(); // l'utilisateur se ravise
    await page.waitForTimeout(400);
    await expect(panel(page)).toBeVisible();
  });
});

test.describe("menu mobile interrompu", () => {
  test.use(phone(390, 664));

  test("rouvert pendant sa fermeture, il repart de là où il était", async ({ page }) => {
    await openSongs(page);
    await burger(page).tap();
    await panel(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await page.waitForTimeout(100);

    await burger(page).tap(); // fermeture
    await page.waitForTimeout(40); // en cours de route

    // Relevé à chaque image : décalage vertical et opacité du panneau. Le
    // re-tap part dans le même tour que le premier relevé : un tap Playwright
    // arriverait quelques images plus tard, fermeture toujours en cours.
    await page.evaluate(() => {
      const samples: { ty: number; opacity: number }[] = [];
      (window as unknown as { __samples: typeof samples }).__samples = samples;
      const read = () => {
        const p = document.querySelector('[data-testid="mobile-menu"]');
        if (!p) return;
        const s = getComputedStyle(p);
        samples.push({ ty: new DOMMatrix(s.transform).m42, opacity: Number(s.opacity) });
      };
      read();
      (document.querySelector('button[aria-label="Toggle menu"]') as HTMLElement).click(); // l'utilisateur se ravise
      const t0 = performance.now();
      const tick = () => { read(); if (performance.now() - t0 < 400) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.waitForTimeout(500);

    const samples = await page.evaluate(
      () => (window as unknown as { __samples: { ty: number; opacity: number }[] }).__samples
    );
    const [start, ...after] = samples;
    // Position de départ d'une ouverture : -8 px (-translate-y-2).
    expect(start.ty, "la fermeture était bien en cours").toBeLessThan(0);
    expect(start.ty, "la fermeture n'était pas déjà finie").toBeGreaterThan(-7);
    // Le navigateur applique l'inversion au recalcul de style suivant : une
    // image peut encore avancer un peu. Mais jamais jusqu'au point de départ.
    const lowest = Math.min(...after.map((s) => s.ty));
    expect(lowest, "ne repart pas du début de l'animation").toBeGreaterThan(-7.5);
    expect(Math.min(...after.map((s) => s.opacity))).toBeGreaterThan(0.05);
    expect(after.at(-1)).toEqual({ ty: 0, opacity: 1 });
  });
});
