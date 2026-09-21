import { expect, test, type Page } from "@playwright/test";

// V7, tranche T6 (docs/spec-look.md) : la page monte jusque sous l'heure et la batterie,
// au lieu de s'arrêter sous une bande blanche. Le même code sert les deux systèmes :
// iOS ouvre la zone à l'app installée (`black-translucent`) et la déclare par
// `env(safe-area-inset-top)` ; Android ne l'ouvre pas, mais peint sa barre d'état avec
// `theme-color`, que chaque écran accorde à son halo. Ailleurs (navigateur), la zone
// vaut 0 et rien ne bouge.
//
// Playwright ne simule pas de zone sûre : on la pose à la main sur `--sat`, comme la
// barre du bas le fait déjà avec `--sab` (look-navigation).
const SAT = 59; // iPhone à Dynamic Island

const themeColor = (page: Page) =>
  page.locator('meta[name="theme-color"]').first().getAttribute("content");

async function poserZoneSure(page: Page, px: number) {
  await page.addStyleTag({ content: `:root { --sat: ${px}px !important; }` });
}

test.describe("zone de l'heure (V7, T6)", () => {
  test("sans zone sûre, rien ne bouge : la navbar fait 58 px et commence à 0", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = await page.locator("header").first().boundingBox();
    expect(barre).toMatchObject({ y: 0, height: 58 });
  });

  test("avec la zone sûre d'un iPhone, la barre la couvre et son contenu reste dessous", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await poserZoneSure(page, SAT);
    const header = page.locator("header").first();
    // La barre s'étend sous l'heure : elle part toujours de 0, mais grandit d'autant.
    await expect.poll(async () => (await header.boundingBox())?.height).toBe(58 + SAT);
    expect((await header.boundingBox())?.y).toBe(0);
    // Le logo, lui, descend sous l'heure : rien d'utile ne se cache derrière.
    const logo = await page.locator("header img").first().boundingBox();
    expect(logo!.y).toBeGreaterThanOrEqual(SAT);
  });

  test("le contenu de la page descend d'autant : le titre ne passe pas sous l'heure", async ({ page }) => {
    await page.goto("/songs");
    const titre = page.getByRole("heading", { level: 1, name: "Chants" });
    await titre.waitFor();
    const avant = (await titre.boundingBox())!.y;
    await poserZoneSure(page, SAT);
    await expect.poll(async () => (await titre.boundingBox())!.y).toBeCloseTo(avant + SAT, 0);
  });

  test("le halo monte jusqu'en haut de l'écran et garde sa composition sous la barre", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await poserZoneSure(page, SAT);
    const halo = page.getByTestId("halo");
    await expect.poll(async () => (await halo.boundingBox())?.y).toBe(0);
    // L'ellipse descend avec la barre, sinon la lueur resterait coincée derrière l'heure.
    // Elle est plus haute sur grand écran, où le halo est agrandi (V6 bis).
    const repos = test.info().project.name === "ordinateur" ? -200 : -80;
    const haut = await halo.evaluate((el) => getComputedStyle(el, "::before").top);
    expect(haut).toBe(`${repos + SAT}px`);
  });

  // Android ne laisse pas la page monter sous la barre d'état : il la peint avec
  // `theme-color`. Chaque écran l'accorde à son halo pour que la couture ne se voie pas.
  test("Android : la barre d'état prend la teinte du halo de l'écran", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Chants : bleu des accords (#3f63cf) à 10 % sur le fond blanc.
    await expect.poll(() => themeColor(page)).toBe("#eceffa");
  });

  test("Android : un écran sans halo garde la couleur du fond", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').first().waitFor();
    await expect.poll(() => themeColor(page)).toBe("#ffffff");
  });

  test("Android : en sombre, la teinte se calcule sur le fond sombre", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Le bleu des accords du sombre (#8fb0ff) à 10 % sur le fond noir.
    await expect.poll(() => themeColor(page)).toBe("#0e121a");
  });
});
