import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 4 « Nouveau look », tranche T5 : pages secondaires au nouveau style,
// sans réorganisation (docs/spec-look.md).
const MEMBRE: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.", annonces: ["Culte Francophone"] };
const phone = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

/** Contrôles communs : aucune erreur console, boutons pleins en pilule rouge,
 *  liens en encre, aucun texte sous 11 px. */
async function verifie(page: Page, erreurs: string[]) {
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(400);
  expect(erreurs, "aucune erreur console").toEqual([]);
  const mesures = await page.evaluate(() => {
    const rouge = "rgb(207, 42, 32)";
    const pleins = [...document.querySelectorAll("main button, main a")].filter((el) => getComputedStyle(el).backgroundColor === rouge);
    const nonPilules = pleins.filter((el) => getComputedStyle(el).borderTopLeftRadius !== "9999px").map((el) => el.textContent?.trim().slice(0, 30));
    const liensRouges = [...document.querySelectorAll("main a")].filter((el) => getComputedStyle(el).color === rouge && getComputedStyle(el).backgroundColor !== rouge).map((el) => el.textContent?.trim().slice(0, 30));
    const petits: string[] = [];
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let noeud: Node | null;
    while ((noeud = marcheur.nextNode())) {
      const texte = noeud.textContent?.trim();
      if (!texte) continue;
      const style = getComputedStyle(noeud.parentElement!);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (parseFloat(style.fontSize) < 11) petits.push(`${texte.slice(0, 20)} ${style.fontSize}`);
    }
    return { nonPilules, liensRouges, petits };
  });
  expect(mesures.nonPilules, "les boutons pleins sont des pilules").toEqual([]);
  expect(mesures.liensRouges, "les liens sont en encre, pas en rouge").toEqual([]);
  expect(mesures.petits, "aucun texte sous 11 px").toEqual([]);
}

function ecouteErreurs(page: Page) {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|404|Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return erreurs;
}

test.describe("pages secondaires (T5), téléphone", () => {
  test.use(phone);

  for (const chemin of ["/login", "/signup", "/page-qui-n-existe-pas"]) {
    test(`sans compte : ${chemin}`, async ({ page }) => {
      const erreurs = ecouteErreurs(page);
      await page.goto(chemin);
      await verifie(page, erreurs);
    });
  }

  test("login et inscription gardent leurs champs", async ({ page }) => {
    await page.goto("/login");
    await page.locator("main input").first().waitFor();
    expect(await page.locator("main input").count()).toBeGreaterThanOrEqual(2);
    await page.goto("/signup");
    await page.locator("main input").first().waitFor();
    expect(await page.locator("main input, main select").count()).toBeGreaterThanOrEqual(3);
  });

  test("questionnaire : sous-titre sur deux lignes sans coupe, bande d'étape collante, pied empilé (compte-2, -3, -15)", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, { ...MEMBRE, firstName: "Marie-Charlotte", lastName: "Bérengère D." }, {}, "/questionnaire");
    // compte-2 : le sous-titre passe à la ligne (deux lignes au plus), sans « … ».
    const sousTitre = page.locator("header[data-entete-page] h1 + p");
    await expect(sousTitre).toBeVisible();
    expect(await sousTitre.evaluate((el) => ({ coupe: el.scrollHeight > el.clientHeight + 1, clamp: getComputedStyle(el).webkitLineClamp }))).toEqual({ coupe: false, clamp: "2" });
    // compte-15 : la bande reste collée sous la barre du haut, dans le viewport, après défilement.
    const bande = page.getByTestId("bande-etape");
    await expect(bande).toBeVisible();
    await expect(bande).toContainText("1 / 3");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const navH = await page.evaluate(() => {
      const sonde = document.createElement("div");
      sonde.style.height = "var(--nav-h)";
      document.body.appendChild(sonde);
      const h = sonde.getBoundingClientRect().height;
      sonde.remove();
      return h;
    });
    // La barre du haut se cache au défilement vers le bas : la bande la suit (bas de la barre, ou haut de l'écran).
    await page.waitForTimeout(400);
    const basBarre = await page.evaluate(() => Math.max(0, document.querySelector("body > div header, header")!.getBoundingClientRect().bottom));
    const boite = (await bande.boundingBox())!;
    expect(navH).toBeGreaterThan(0);
    expect(Math.abs(boite.y - basBarre)).toBeLessThanOrEqual(2);
    expect(boite.y + boite.height).toBeLessThanOrEqual(664);
    // compte-3 : étape 1, « Suivant » seul en pleine largeur ; étape 2, deux moitiés de 44 px ; mention sans point doublé.
    await expect(page.getByRole("button", { name: "Précédent" })).toHaveCount(0);
    const mention = page.getByText(/^Envoyé par /);
    await expect(mention).toHaveText("Envoyé par Marie-Charlotte Bérengère D.");
    expect(await mention.evaluate((el) => el.textContent!.includes(".."))).toBe(false);
    // « Suivant » seul : 44 px de haut, la largeur de la carte (moins ses retraits), sous la mention.
    const suivant = page.getByRole("button", { name: "Suivant" });
    const s1 = (await suivant.boundingBox())!;
    expect(Math.round(s1.height)).toBe(44);
    const carte = (await page.getByTestId("questions").boundingBox())!;
    expect(s1.width).toBeGreaterThan(carte.width - 60);
    expect((await mention.boundingBox())!.y + (await mention.boundingBox())!.height).toBeLessThanOrEqual(s1.y);
  });

  for (const chemin of ["/profil", "/guide", "/questionnaire", "/notifier"]) {
    test(`connecté : ${chemin}`, async ({ page }) => {
      const erreurs = ecouteErreurs(page);
      await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
      await signInAs(page, MEMBRE, {}, chemin);
      await verifie(page, erreurs);
    });
  }
});
