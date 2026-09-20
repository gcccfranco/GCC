import { expect, test, type Page } from "@playwright/test";

// Lot 4 « Nouveau look », tranche T1 : fondations (docs/spec-look.md), reprises
// par la direction 5C1 « Encre · Relief » (§ 20/09/2026, tranche V1).
const FOND_CLAIR = "rgb(255, 255, 255)";
const FOND_SOMBRE = "rgb(0, 0, 0)";
const ENCRE = "rgb(28, 28, 30)";
const ENCRE_SOMBRE = "rgb(242, 242, 247)";
const ROUGE_DU_LOGO = "rgb(207, 42, 32)";

const fondDe = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("fondations du nouveau look (T1)", () => {
  test("couleur système et fond : blanc en clair, noir pur en sombre", async ({ page }) => {
    await page.goto("/login");
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((ms) => ms.map((m) => [m.getAttribute("media"), m.getAttribute("content")]));
    expect(metas).toEqual(
      expect.arrayContaining([
        ["(prefers-color-scheme: light)", "#ffffff"],
        ["(prefers-color-scheme: dark)", "#000000"],
      ])
    );
    expect(await fondDe(page)).toBe(FOND_CLAIR);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => fondDe(page)).toBe(FOND_SOMBRE);
  });

  test("le bouton plein est en encre, s'inverse en sombre, et répond à l'appui", async ({ page }) => {
    await page.goto("/login");
    const bouton = page.locator('button[type="submit"]').first();
    await bouton.waitFor();
    expect(await bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ENCRE);
    expect(await bouton.evaluate((b) => getComputedStyle(b).color)).toBe("rgb(255, 255, 255)");
    expect(await bouton.evaluate((b) => getComputedStyle(b).transitionProperty)).toContain("transform");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ENCRE_SOMBRE);
    expect(await bouton.evaluate((b) => getComputedStyle(b).color)).toBe(ENCRE);
  });

  test("le rouge du logo ne reste que sur le label de la navbar", async ({ page }) => {
    await page.goto("/songs");
    const label = page.locator("header a span span").first();
    await label.waitFor();
    expect(await label.evaluate((e) => getComputedStyle(e).color)).toBe(ROUGE_DU_LOGO);
  });

  test("l'interface est en police du système, plus en Inter", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const police = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(police).not.toMatch(/Inter/);
    expect(police).toMatch(/system-ui|-apple-system/);
  });

  for (const chemin of ["/songs", "/login"]) {
    test(`aucun texte sous 11 px sur ${chemin}`, async ({ page }) => {
      await page.goto(chemin);
      await page.locator("main").first().waitFor();
      const petits = await page.evaluate(() => {
        const trouves: string[] = [];
        const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let noeud: Node | null;
        while ((noeud = marcheur.nextNode())) {
          const texte = noeud.textContent?.trim();
          if (!texte) continue;
          const el = noeud.parentElement!;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const taille = parseFloat(style.fontSize);
          if (taille < 11) trouves.push(`${el.tagName.toLowerCase()} « ${texte.slice(0, 24)} » ${taille}px`);
        }
        return trouves;
      });
      expect(petits).toEqual([]);
    });
  }
});
