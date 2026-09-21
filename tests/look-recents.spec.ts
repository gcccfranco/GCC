import { expect, test, type Page } from "@playwright/test";

// V7 (docs/spec-look.md § « V7 », 21/09/2026) : la rangée « Récemment consultés » était
// tranchée net au bord de la colonne — une pastille coupée en deux. Elle glisse toujours,
// mais s'estompe du côté où il reste des chants à voir.
const RECENTS = ["beni-soit-ton-nom", "abba-pere", "abrite-moi", "a-l-agneau", "au-dessus-de-tout", "一生爱你", "我们的神", "不停赞美"];

const fondu = (page: Page) =>
  page.getByTestId("recents").evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      gauche: s.getPropertyValue("--fondu-gauche").trim(),
      droite: s.getPropertyValue("--fondu-droite").trim(),
      masque: (s.maskImage || s.webkitMaskImage) !== "none",
    };
  });

async function ouvrir(page: Page) {
  await page.addInitScript((slugs) => localStorage.setItem("recentSongs", JSON.stringify(slugs)), RECENTS);
  await page.goto("/songs");
  await page.getByTestId("recents").waitFor();
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("récemment consultés : un bord fondu, plus de pastille coupée (V7)", () => {
  test("au départ : rien à gauche, ça s'estompe à droite", async ({ page }) => {
    await ouvrir(page);
    expect(await fondu(page)).toMatchObject({ gauche: "0px", droite: "24px", masque: true });
    await capture(page, "recents-depart");
  });

  test("après un glissement : ça s'estompe des deux côtés, puis plus à droite en bout de course", async ({ page }) => {
    await ouvrir(page);
    const rangee = page.getByTestId("recents");
    await rangee.evaluate((el) => el.scrollTo({ left: 60 }));
    await expect.poll(async () => (await fondu(page)).gauche).toBe("24px");
    expect((await fondu(page)).droite, "il reste des chants à droite").toBe("24px");
    await capture(page, "recents-milieu");

    await rangee.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect.poll(async () => (await fondu(page)).droite).toBe("0px");
    expect((await fondu(page)).gauche).toBe("24px");
    await capture(page, "recents-bout");
  });

  test("un seul chant récent : pas de fondu, la rangée tient", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("recentSongs", JSON.stringify(["abba-pere"])));
    await page.goto("/songs");
    await page.getByTestId("recents").waitFor();
    expect(await fondu(page)).toMatchObject({ gauche: "0px", droite: "0px" });
  });
});
