import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { ADMIN_EMAIL, signInAs } from "./helpers/fakeSession";

// Tranche B3 de docs/spec-corrections-audit.md : barre du bas (C8), zoom (C5), fenêtre « Signaler » (G9).
const MEMBRE = { uid: "u-noemie", email: "noemie.test@example.com", firstName: "Noémie", lastName: "T.", planningName: "Noémie T." };

const estTelephone = (page: Page) => (page.viewportSize()?.width ?? 0) < 640;

/** Le centre du contrôle appartient bien au contrôle : rien (la barre du bas) ne le recouvre. */
async function nonRecouvert(page: Page, nom: "button" | "link", libelle: string) {
  const cible = page.getByRole(nom, { name: libelle });
  await cible.scrollIntoViewIfNeeded();
  const libre = await cible.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const haut = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!haut && el.contains(haut);
  });
  expect(libre, `« ${libelle} » n'est pas recouvert`).toBe(true);
}

test.describe("site en ligne (interrupteur du back-office coupé)", () => {
  test.use({ baseURL: BASE_URL_COUPE });

  test("un visiteur n'a pas de barre du bas : une seule destination, pas de cale", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(page.getByTestId("barre-du-bas")).toHaveCount(0);
  });
});

test("inscription : « Suivant » et « J'ai déjà un compte » ne finissent jamais sous la barre", async ({ page }) => {
  await page.route(/firestore\.googleapis\.com/, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "Créer un compte" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nonRecouvert(page, "button", "Suivant");
  await nonRecouvert(page, "link", "J'ai déjà un compte");
  if (estTelephone(page)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const bas = await page.getByRole("button", { name: "Suivant" }).evaluate((el) => el.getBoundingClientRect().bottom);
    expect(bas, "« Suivant » tient dans l'écran sans défiler").toBeLessThanOrEqual(page.viewportSize()!.height);
  }
});

test.describe("zoom pincé (C5)", () => {
  const viewport = (page: Page) => page.locator('meta[name="viewport"]').getAttribute("content");

  test("permis sur Moi et le planning, interdit sur la page d'un chant", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/moi");
    await expect(page.getByRole("heading", { level: 1, name: "Moi" })).toBeVisible();
    expect(await viewport(page)).not.toContain("user-scalable=no");
    expect(await viewport(page)).toContain("width=device-width");
    await page.goto("/planning");
    await expect.poll(() => viewport(page)).not.toContain("user-scalable=no");
    await page.goto("/songs/abba-pere");
    await expect.poll(() => viewport(page)).toContain("user-scalable=no");
    expect(await viewport(page)).toContain("maximum-scale=1");
    await page.goto("/songs");
    await expect.poll(() => viewport(page)).not.toContain("user-scalable=no");
  });
});

test("« Signaler » : une vraie fenêtre (rôle dialog), Échap la ferme, le focus revient au déclencheur", async ({ page }) => {
  await signInAs(page, MEMBRE, {}, "/moi");
  await expect(page.getByRole("heading", { level: 1, name: "Moi" })).toBeVisible();
  const compte = page.getByRole("button", { name: "Compte", exact: true });
  let declencheur;
  if (await compte.isVisible()) {
    // Au clavier : l'indicateur de Next (mode dev) recouvre le bas de la barre latérale.
    await compte.focus();
    await page.keyboard.press("Enter");
    declencheur = compte;
    await page.getByRole("menuitem", { name: "Signaler un problème" }).click();
  } else {
    declencheur = page.getByRole("button", { name: "Signaler un problème" });
    await declencheur.click();
  }
  const fenetre = page.getByRole("dialog", { name: "Signaler un problème" });
  await expect(fenetre).toBeVisible();
  await expect(fenetre).toHaveAttribute("aria-modal", "true");
  const fermer = fenetre.getByRole("button", { name: /Fermer/ });
  expect((await fermer.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  expect(await fenetre.evaluate((el) => el.contains(document.activeElement)), "le focus est dans la fenêtre").toBe(true);
  await page.keyboard.press("Escape");
  await expect(fenetre).toHaveCount(0);
  await expect(declencheur).toBeFocused();
});

test("organigramme : région au clavier nommée ; sur téléphone, une colonne, aucune carte coupée par le bord", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, { ...MEMBRE, email: ADMIN_EMAIL, uid: "u-admin-b3" }, {}, "/equipes");
  const bandeau = page.getByTestId("bandeau-equipes");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toHaveAttribute("role", "region");
  await expect(bandeau).toHaveAttribute("tabindex", "0");
  await expect(bandeau).toHaveAttribute("aria-label", "Organigramme");
  if (!estTelephone(page)) return;
  const largeur = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth), "la page ne défile pas de côté").toBeLessThanOrEqual(largeur);
  const cartes = await page.getByTestId(/^equipe-/).all();
  expect(cartes.length).toBeGreaterThan(2);
  for (const carte of cartes) {
    const b = (await carte.boundingBox())!;
    expect(b.x, "carte dans l'écran, à gauche").toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, "carte dans l'écran, à droite").toBeLessThanOrEqual(largeur);
  }
});
