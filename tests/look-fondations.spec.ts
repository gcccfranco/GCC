import { expect, test, type Page } from "@playwright/test";

// Lot 4 « Nouveau look », tranche T1 : fondations (docs/spec-look.md).
const FOND_CLAIR = "rgb(242, 242, 239)";
const FOND_SOMBRE = "rgb(0, 0, 0)";
const ROUGE = "rgb(207, 42, 32)";
const ROUGE_SOMBRE = "rgb(255, 107, 97)";

const fondDe = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("fondations du nouveau look (T1)", () => {
  test("couleur système et fond : gris chaud en clair, noir pur en sombre", async ({ page }) => {
    await page.goto("/login");
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((ms) => ms.map((m) => [m.getAttribute("media"), m.getAttribute("content")]));
    expect(metas).toEqual(
      expect.arrayContaining([
        ["(prefers-color-scheme: light)", "#f2f2ef"],
        ["(prefers-color-scheme: dark)", "#000000"],
      ])
    );
    expect(await fondDe(page)).toBe(FOND_CLAIR);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => fondDe(page)).toBe(FOND_SOMBRE);
  });

  test("le bouton principal est rouge du logo, en clair comme en sombre, et répond à l'appui", async ({ page }) => {
    await page.goto("/login");
    const bouton = page.locator('button[type="submit"]').first();
    await bouton.waitFor();
    expect(await bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ROUGE);
    expect(await bouton.evaluate((b) => getComputedStyle(b).transitionProperty)).toContain("transform");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ROUGE_SOMBRE);
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
