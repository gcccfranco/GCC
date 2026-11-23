import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";

// L'armure de la page chant (docs/spec-reglages-unifies.md, RU-1) : un bouton, une fenêtre de douze tonalités,
// deux touchers de la fermeture à n'importe quelle tonalité. Un chant FR et un chant ZH, sur les trois appareils.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };

const CHANTS = [
  { slug: "abba-pere", zh: false },
  { slug: "一生爱你", zh: true },
] as const;

const armure = (page: Page) => page.getByTestId("armure");
const fenetre = (page: Page) => page.getByTestId("fenetre-armure");

async function ouvrir(page: Page, slug: string) {
  await signInAs(page, ADMIN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom").getByRole("heading", { level: 1 })).toBeVisible();
  await expect(armure(page)).toBeVisible();
}

/** Une ligne : la hauteur du texte ne dépasse pas 1,6 fois la taille de la police. */
async function surUneLigne(page: Page, selecteur: string) {
  const { h, fs } = await page.locator(selecteur).first().evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return { h: r.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(el).fontSize) };
  });
  expect(h).toBeLessThanOrEqual(1.6 * fs);
}

for (const chant of CHANTS) {
  test.describe(`armure — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("au contour, « 1= » en chinois ; un toucher ouvre la fenêtre ; deux touchers pour changer de tonalité", async ({ page }) => {
      await ouvrir(page, chant.slug);
      await expect(armure(page)).toHaveAttribute("data-armure", "equipe");
      if (chant.zh) await expect(armure(page)).toHaveText(/^1=/);
      const avant = (await armure(page).textContent())!;
      const accordAvant = chant.zh ? null : await page.locator("[data-accord-touchable]").first().textContent();

      await armure(page).click();
      await expect(fenetre(page)).toBeVisible();
      await expect(fenetre(page)).toContainText("Pour moi, le temps de la page");
      const groupe = fenetre(page).getByRole("radiogroup");
      await expect(groupe.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);

      await page.screenshot({ path: `test-results/armure/${test.info().project.name}-${chant.zh ? "zh" : "fr"}.png` });

      // Deuxième toucher : une tonalité éloignée.
      const autre = groupe.locator('[role="radio"][aria-checked="false"]').nth(4);
      const nom = (await autre.locator("span").first().textContent())!;
      await autre.click();
      await expect(armure(page)).toHaveAttribute("data-armure", "moi");
      await expect(armure(page)).toHaveText(chant.zh ? `1=${nom}` : nom);
      expect(await armure(page).textContent()).not.toBe(avant);
      await expect(fenetre(page)).toBeVisible();
      if (accordAvant !== null) await expect(page.locator("[data-accord-touchable]").first()).not.toHaveText(accordAvant);
    });

    test("flèche : la voisine est choisie et a le focus ; Échap ferme et rend le focus", async ({ page }) => {
      await ouvrir(page, chant.slug);
      await armure(page).click();
      const groupe = fenetre(page).getByRole("radiogroup");
      const courante = groupe.locator('[role="radio"][aria-checked="true"]');
      await courante.focus();
      const radios = groupe.getByRole("radio");
      const i = await radios.evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-checked") === "true"));
      await page.keyboard.press("ArrowRight");
      const voisine = radios.nth((i + 1) % (await radios.count()));
      await expect(voisine).toHaveAttribute("aria-checked", "true");
      await expect(voisine).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(fenetre(page)).toBeHidden();
      await expect(armure(page)).toBeFocused();
    });

    test("toucher dehors ferme", async ({ page }) => {
      await ouvrir(page, chant.slug);
      await armure(page).click();
      await expect(fenetre(page)).toBeVisible();
      const { width, height } = page.viewportSize()!;
      await page.mouse.click(width - 2, height / 2);
      await expect(fenetre(page)).toBeHidden();
    });

    test("♯ et ♭ ne passent jamais sur deux lignes ; Lettres | Chiffres bascule", async ({ page }) => {
      await ouvrir(page, chant.slug);
      await armure(page).click();
      const groupe = fenetre(page).getByRole("radiogroup");
      // Une tonalité avec altération : Db, Eb, F#, Ab ou Bb selon le chant.
      const alteree = groupe.getByRole("radio").filter({ hasText: /^[A-G][#b♯♭]/ }).first();
      await alteree.click();
      await surUneLigne(page, '[data-testid="armure"]');
      for (const r of await groupe.getByRole("radio").all()) {
        const { h, fs } = await r.locator("span").first().evaluate((el) => ({ h: el.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(el).fontSize) }));
        expect(h).toBeLessThanOrEqual(1.6 * fs);
      }
      const chiffres = fenetre(page).locator('[data-notation="chiffres"]');
      await chiffres.click();
      await expect(chiffres).toHaveAttribute("aria-pressed", "true");
      await expect(fenetre(page).locator('[data-notation="lettres"]')).toHaveAttribute("aria-pressed", "false");
    });
  });
}
