import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Défaut du 17/11/2026 : glisser dans la feuille « Réserver une salle » rechargeait la page (tirer-pour-actualiser).
// Firestore et planning simulés ; personne fictive.

const MEMBRE: FakeProfile = { uid: "uid-ysolde", email: "ysolde@example.com", firstName: "Ysolde", lastName: "Pelletier", serviceRoles: { "Groupe Bonté": ["chanteur"] } };

async function ouvrir(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MEMBRE, {}, "/evenements/salles");
}

/** touchstart à y=200 sur `sel`, puis touchmove à y=300 (un évènement par aller-retour, comme un vrai doigt). */
async function glisser(page: Page, sel: string) {
  for (const [type, y] of [["touchstart", 200], ["touchmove", 250], ["touchmove", 300]] as const) {
    await page.evaluate(({ sel, type, y }) => {
      const cible = document.querySelector(sel)!;
      cible.dispatchEvent(new TouchEvent(type, {
        touches: [new Touch({ identifier: 1, target: cible, clientX: 100, clientY: y })],
        changedTouches: [new Touch({ identifier: 1, target: cible, clientX: 100, clientY: y })],
        bubbles: true, cancelable: true,
      }));
    }, { sel, type, y });
  }
}

/** Le doigt se lève : c'est là que la version fautive rechargeait la page. */
async function relacher(page: Page, sel: string) {
  await page.evaluate((sel) => {
    const cible = document.querySelector(sel)!;
    cible.dispatchEvent(new TouchEvent("touchend", {
      touches: [], changedTouches: [new Touch({ identifier: 1, target: cible, clientX: 100, clientY: 300 })],
      bubbles: true, cancelable: true,
    }));
  }, sel);
}

const message = (page: Page) => page.getByText("Relâcher pour actualiser");

test.describe("Tirer pour actualiser", () => {
  test.beforeEach(({}, info) => test.skip(!["telephone", "tablette"].includes(info.project.name), "téléphone et tablette seulement"));

  test("sans feuille, tirer depuis le haut de la page arme l'actualisation (téléphone et tablette)", async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByRole("button", { name: "Réserver une salle" })).toBeVisible();
    await glisser(page, "main");
    await expect(message(page)).toBeVisible();
  });

  test("dans la feuille « Réserver une salle », tirer ne recharge pas la page (téléphone et tablette)", async ({ page }) => {
    await ouvrir(page);
    await page.getByRole("button", { name: "Réserver une salle" }).click();
    const feuille = page.getByRole("dialog", { name: "Réserver une salle" });
    await expect(feuille).toBeVisible();
    const champ = feuille.getByLabel("Pour quoi");
    await champ.fill("Répétition");
    await page.evaluate(() => { (window as unknown as { __marque: number }).__marque = 1; });
    // Comme sur l'iPhone de Timothée : la page derrière la feuille est en haut (la saisie l'a fait défiler ici).
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    let navigations = 0;
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigations++; });
    await glisser(page, '[role="dialog"] input');
    // Laisse à React le temps de rendre la pastille, si le geste l'avait armée.
    await page.waitForTimeout(500);
    await expect(message(page)).toHaveCount(0);
    await relacher(page, '[role="dialog"] input');
    // Un rechargement partirait juste après le relâcher : on lui laisse le temps de se produire.
    await page.waitForTimeout(1500);
    expect(navigations, "aucun rechargement").toBe(0);
    await expect(feuille).toBeVisible();
    await expect(champ).toHaveValue("Répétition");
    expect(await page.evaluate(() => (window as unknown as { __marque?: number }).__marque)).toBe(1);
  });
});
