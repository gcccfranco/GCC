import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// 5C1, tranche V6 (docs/spec-look.md § « Le halo d'en-tête, oublié ») : l'ellipse
// floue des planches, en haut de l'en-tête. Valeurs relevées sur les planches.
// Tranché par Timothée le 20/09/2026 : téléphone et tablette seulement.
const BLEU_ACCORDS = "rgb(63, 99, 207)"; // --chord-color
const BLEU_ACCORDS_SOMBRE = "rgb(143, 176, 255)"; // --chord-color en sombre
const ORANGE_REFRAIN = "rgb(224, 86, 10)"; // --sec-chorus
const CULTE = "rgb(45, 90, 101)"; // PLANNING_COLORS.culte
const INTERGROUPE = "rgb(168, 123, 15)"; // CATEGORY_COLORS.Intergroupe

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Ruth K.",
  // Un rôle dans chaque culte : la visibilité d'une setlist suit les services de la personne.
  serviceRoles: { "Culte Francophone": ["musicien"], Intergroupe: ["musicien"] },
};
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const debordement = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const surOrdinateur = () => test.info().project.name === "ordinateur";

/** L'ellipse : le pseudo-élément du calque, telle que le navigateur la calcule. */
const ellipse = (page: Page) =>
  page.getByTestId("halo").evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    return { couleur: s.backgroundColor, opacite: s.opacity, flou: s.filter, largeur: s.width, hauteur: s.height, gauche: s.left, droite: s.right, haut: s.top };
  });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("halo d'en-tête (5C1, V6)", () => {
  test("Chants : bleu des accords à 10 %, en haut à gauche ; rien sur ordinateur", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const halo = page.getByTestId("halo");
    await capture(page, "halo-chants");
    if (surOrdinateur()) return void (await expect(halo).toBeHidden());
    await expect(halo).toBeVisible();
    expect(await ellipse(page)).toMatchObject({
      couleur: BLEU_ACCORDS, opacite: "0.1", flou: "blur(40px)", largeur: "320px", hauteur: "240px", gauche: "-60px", haut: "-80px",
    });
  });

  test("le halo part du haut de l'écran, ne capte ni le doigt ni le lecteur d'écran, et n'élargit pas la page", async ({ page }) => {
    test.skip(surOrdinateur(), "pas de halo sur ordinateur");
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const halo = page.getByTestId("halo");
    const boite = await halo.boundingBox();
    expect(boite).toMatchObject({ x: 0, y: 0, width: page.viewportSize()!.width });
    expect(await halo.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    await expect(halo).toHaveAttribute("aria-hidden", "true");
    expect(await debordement(page)).toBe(0);
  });

  // `100vw` compte la barre de défilement classique d'un ordinateur : dans une fenêtre
  // étroite le calque dépasserait. Souris = ordinateur, quelle que soit la largeur.
  test("ordinateur, fenêtre étroite : toujours pas de halo, et la page ne s'élargit pas", async ({ page }) => {
    test.skip(!surOrdinateur(), "propre à l'ordinateur");
    await page.setViewportSize({ width: 800, height: 720 });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(page.getByTestId("halo")).toBeHidden();
    expect(await debordement(page)).toBe(0);
  });

  // Un chant français et un chant chinois (CLAUDE.md).
  for (const [nom, slug] of [["fr", "beni-soit-ton-nom"], ["zh", "一生爱你"]] as const) {
    test(`un chant (${nom}) : orange du refrain à 12 %, en haut à droite, sans élargir la page`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await page.getByTestId("barre-outils").waitFor();
      const halo = page.getByTestId("halo");
      await capture(page, `halo-chant-${nom}`);
      if (surOrdinateur()) return void (await expect(halo).toBeHidden());
      await expect(halo).toBeVisible();
      expect(await ellipse(page)).toMatchObject({
        couleur: ORANGE_REFRAIN, opacite: "0.12", flou: "blur(44px)", largeur: "300px", hauteur: "220px", droite: "-80px", haut: "-60px",
      });
      expect(await debordement(page)).toBe(0);
    });
  }

  const fiche = (category: string) => ({
    title: `${category} 27/09`, leader: "Élise R.", category, date: "2026-09-27", language: "mixed", notes: "",
    ownerId: "uid-owner", isPrivate: false, isDraft: false, items: [],
  });
  for (const [id, couleur] of [["culte", CULTE], ["inter", INTERGROUPE]] as const) {
    test(`une setlist prend la couleur de son culte, à 14 % (${id})`, async ({ page }) => {
      await sansSheet(page);
      await signInAs(page, MUSICIEN, { "setlists/culte": fiche("Culte Francophone"), "setlists/inter": fiche("Intergroupe") }, `/setlists/${id}`);
      await page.getByRole("button", { name: "Mode louange" }).waitFor();
      const halo = page.getByTestId("halo");
      await capture(page, `halo-setlist-${id}`);
      if (surOrdinateur()) return void (await expect(halo).toBeHidden());
      await expect(halo).toBeVisible();
      expect(await ellipse(page)).toMatchObject({
        couleur, opacite: "0.14", flou: "blur(44px)", largeur: "300px", hauteur: "220px", gauche: "-40px", haut: "-60px",
      });
    });
  }

  test("Planning : bleu-vert du Culte Franco à 10 %, comme Chants", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/planning");
    await page.getByRole("heading", { level: 1, name: "Planning" }).waitFor();
    const halo = page.getByTestId("halo");
    await capture(page, "halo-planning");
    if (surOrdinateur()) return void (await expect(halo).toBeHidden());
    await expect(halo).toBeVisible();
    expect(await ellipse(page)).toMatchObject({
      couleur: CULTE, opacite: "0.1", flou: "blur(40px)", largeur: "320px", hauteur: "240px", gauche: "-60px", haut: "-80px",
    });
  });

  test("pas de halo hors des quatre écrans de la planche", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').first().waitFor();
    await expect(page.getByTestId("halo")).toHaveCount(0);
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/setlists");
    await page.getByRole("heading", { level: 1, name: "Setlists" }).waitFor();
    await expect(page.getByTestId("halo")).toHaveCount(0);
  });

  test("en sombre le halo reste, au bleu des accords du sombre ; à l'impression il disparaît", async ({ page }) => {
    test.skip(surOrdinateur(), "pas de halo sur ordinateur");
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(async () => (await ellipse(page)).couleur).toBe(BLEU_ACCORDS_SOMBRE);
    await capture(page, "halo-chants-sombre");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("halo")).toBeHidden();
  });
});
