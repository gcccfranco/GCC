import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// 5C1, tranches V6 et V6 bis (docs/spec-look.md § « Le halo d'en-tête, oublié » et
// « Barres et halo : réouvert… ») : l'ellipse floue des planches, en haut de l'en-tête.
// Téléphone et tablette : valeurs relevées sur les planches. À partir de 1024 px de
// large (ordinateur, tranché le 20/09/2026 au soir) : le même halo, agrandi à l'écran.
const BLEU_ACCORDS = "rgb(63, 99, 207)"; // --chord-color
const BLEU_ACCORDS_SOMBRE = "rgb(143, 176, 255)"; // --chord-color en sombre
const ORANGE_REFRAIN = "rgb(224, 86, 10)"; // --sec-chorus
const CULTE = "rgb(45, 90, 101)"; // PLANNING_COLORS.culte
const INTERGROUPE = "rgb(168, 123, 15)"; // CATEGORY_COLORS.Intergroupe

const GRAND = { largeur: "860px", hauteur: "560px", haut: "-200px", flou: "blur(90px)" };
const GEOMETRIE = {
  page: { petit: { largeur: "320px", hauteur: "240px", gauche: "-60px", haut: "-80px", flou: "blur(40px)" }, grand: { ...GRAND, gauche: "-140px" } },
  fiche: { petit: { largeur: "300px", hauteur: "220px", gauche: "-40px", haut: "-60px", flou: "blur(44px)" }, grand: { ...GRAND, gauche: "-140px" } },
  chant: { petit: { largeur: "300px", hauteur: "220px", droite: "-80px", haut: "-60px", flou: "blur(44px)" }, grand: { ...GRAND, droite: "-140px" } },
};
/** Le projet « ordinateur » fait 1280 px de large ; téléphone (412) et tablette (810) gardent la taille des planches. */
const geometrie = (variante: keyof typeof GEOMETRIE) => GEOMETRIE[variante][test.info().project.name === "ordinateur" ? "grand" : "petit"];

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

/** L'ellipse : le pseudo-élément du calque, telle que le navigateur la calcule. */
const ellipse = (page: Page) =>
  page.getByTestId("halo").evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    return { couleur: s.backgroundColor, opacite: s.opacity, flou: s.filter, largeur: s.width, hauteur: s.height, gauche: s.left, droite: s.right, haut: s.top };
  });

/** Le calque part du coin haut de la fenêtre et en fait toute la largeur, sans rien capter ni élargir. */
async function auCoinDeLaFenetre(page: Page) {
  const halo = page.getByTestId("halo");
  await expect(halo).toBeVisible();
  const largeur = await page.evaluate(() => document.documentElement.clientWidth);
  await expect.poll(() => halo.boundingBox()).toMatchObject({ x: 0, y: 0, width: largeur });
  expect(await halo.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(halo).toHaveAttribute("aria-hidden", "true");
  expect(await debordement(page)).toBe(0);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("halo d'en-tête (5C1, V6)", () => {
  test("Chants : bleu des accords à 10 %, en haut à gauche", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await capture(page, "halo-chants");
    await auCoinDeLaFenetre(page);
    expect(await ellipse(page)).toMatchObject({ couleur: BLEU_ACCORDS, opacite: "0.1", ...geometrie("page") });
  });

  // Un chant français et un chant chinois (CLAUDE.md).
  for (const [nom, slug] of [["fr", "beni-soit-ton-nom"], ["zh", "一生爱你"]] as const) {
    test(`un chant (${nom}) : orange du refrain à 12 %, en haut à droite`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await page.getByTestId("barre-outils").waitFor();
      await capture(page, `halo-chant-${nom}`);
      await auCoinDeLaFenetre(page);
      expect(await ellipse(page)).toMatchObject({ couleur: ORANGE_REFRAIN, opacite: "0.12", ...geometrie("chant") });
    });
  }

  // La page d'un chant change de largeur avec la taille du texte (zoom par `transform`) :
  // le halo, lui, reste accroché à la fenêtre.
  for (const taille of ["0.8", "1.5"]) {
    test(`un chant, texte à ${taille} : le halo reste au coin de la fenêtre`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("perf-font-scale", t), taille);
      await page.goto("/songs/beni-soit-ton-nom");
      await page.getByTestId("barre-outils").waitFor();
      const halo = page.getByTestId("halo");
      const largeur = await page.evaluate(() => document.documentElement.clientWidth);
      await expect.poll(() => halo.boundingBox()).toMatchObject({ x: 0, y: 0, width: largeur });
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
      await capture(page, `halo-setlist-${id}`);
      await auCoinDeLaFenetre(page);
      expect(await ellipse(page)).toMatchObject({ couleur, opacite: "0.14", ...geometrie("fiche") });
    });
  }

  test("Planning : bleu-vert du Culte Franco à 10 %, comme Chants", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/planning");
    await page.getByRole("heading", { level: 1, name: "Planning" }).waitFor();
    await capture(page, "halo-planning");
    await auCoinDeLaFenetre(page);
    expect(await ellipse(page)).toMatchObject({ couleur: CULTE, opacite: "0.1", ...geometrie("page") });
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
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(async () => (await ellipse(page)).couleur).toBe(BLEU_ACCORDS_SOMBRE);
    await capture(page, "halo-chants-sombre");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("halo")).toBeHidden();
  });
});
