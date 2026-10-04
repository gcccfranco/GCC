import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U4 — navigation sur grand écran (docs/spec-navigation-grand-ecran.md).
// Quatre dispositions décidées par le CSS seul (Q1) : ordinateur = pointeur fin
// et ≥ 1024 px ; tablette en paysage = pointeur grossier, paysage et ≥ 1024 px ;
// sinon le modèle du téléphone (barre du haut et barre du bas).
// Lancé sur les cinq projets ; un test propre à une disposition le dit dans son titre.

const MEMBRE: FakeProfile = { uid: "u-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K." };
const ENCRE = "rgb(28, 28, 30)";

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";
const aBarreLaterale = (info: TestInfo) => estOrdinateur(info) || estTablettePaysage(info);

/** La barre latérale (visible seulement sur grand écran). */
const barreLaterale = (page: Page) => page.getByTestId("barre-laterale");
const navigation = (page: Page) => page.getByRole("navigation", { name: "Navigation principale" });
const pxVar = (page: Page, nom: string) =>
  page.evaluate((n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0, nom);
/** Attendre la fin des animations (fondu d'entrée de la page, libellés). */
const animationsFinies = (page: Page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

test.describe("navigation sur grand écran (U4) : précondition", () => {
  // Sans elle, les projets mentiraient : un « iPad » qui aurait un pointeur fin
  // serait pris pour un ordinateur, et tous les tests suivants seraient faux.
  test("pointeur grossier sur téléphone et tablettes, fin sur les deux projets ordinateur", async ({ page }, info) => {
    await page.goto("/songs");
    const grossier = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    expect(grossier, `projet ${info.project.name}`).toBe(!estOrdinateur(info));
  });
});

test.describe("navigation sur grand écran (U4) : une seule cloche", () => {
  // Q7 : le hook des notifications interroge Firestore toutes les 10 min. Deux
  // barres montées (navbar et barre latérale) ne doivent pas doubler les lectures.
  // Le hook se rafraîchit au retour sur la page (`focus`) : un retour = une
  // requête par cloche montée. Deux cloches en feraient deux.
  test("un retour sur la page relance une seule requête de notifications", async ({ page }) => {
    let requetes = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes(":runQuery") && (r.postData() ?? "").includes('"collectionId":"notifications"')) requetes++;
    });
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect.poll(() => requetes, { message: "la cloche a chargé" }).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    requetes = 0;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(1500);
    expect(requetes, "une seule cloche interroge Firestore").toBe(1);
  });
});

/** Ce qui est visible : barre du haut, barre du bas, barre latérale. */
async function barresVisibles(page: Page) {
  return {
    haut: await page.locator("header").isVisible(),
    bas: await page.getByTestId("barre-du-bas").isVisible(),
    laterale: await barreLaterale(page).isVisible(),
  };
}

test.describe("navigation sur grand écran (U4) : dispositions", () => {
  test("ordinateur, de 1 024 à 1 920 px : la barre latérale seule, la page à sa droite, aucun défilement horizontal", async ({ page }, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    for (const largeur of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await expect.poll(() => barresVisibles(page), { message: `${largeur} px` }).toEqual({ haut: false, bas: false, laterale: true });
      expect(Math.round((await barreLaterale(page).boundingBox())!.width), `${largeur} px : barre dépliée`).toBe(248);
      expect(await pxVar(page, "--barre-laterale")).toBe(248);
      expect(await pxVar(page, "--nav-h"), "plus de barre du haut : la page commence en haut").toBe(0);
      const titre = await page.getByRole("heading", { level: 1, name: "Chants" }).boundingBox();
      expect(titre!.x, "le titre est à droite de la barre").toBeGreaterThanOrEqual(248);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${largeur} px`).toBe(0);
    }
  });

  test("téléphone et tablette en portrait : barre du haut et barre du bas, comme aujourd'hui", async ({ page }, info) => {
    test.skip(aBarreLaterale(info), "téléphone et tablette en portrait seulement");
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    expect(await pxVar(page, "--barre-laterale")).toBe(0);
  });
});

// Trois cas limites, chacun lancé sur le projet de sa famille (pointeur et toucher).
test.describe("navigation sur grand écran (U4) : cas limites, barres du haut et du bas", () => {
  test.describe("iPad Pro 13 pouces debout (1 024 × 1 366, tactile)", () => {
    test.use({ viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "tablette", "projet tablette seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
  test.describe("téléphone couché (915 × 412, tactile)", () => {
    test.use({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "telephone", "projet téléphone seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
  test.describe("fenêtre d'ordinateur de 900 px", () => {
    test.use({ viewport: { width: 900, height: 800 } });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "ordinateur", "projet ordinateur seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
});

test.describe("navigation sur grand écran (U4) : barre dépliée, ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });
  const sansSheet = (page: Page) =>
    page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

  test("membre : les cinq entrées dans l'ordre, la courante en pastille d'encre ; « GCC Louange » puis « Planning » en rouge du logo", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const nav = navigation(page);
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    const chants = nav.getByRole("link", { name: "Chants" });
    await expect(chants).toHaveAttribute("aria-current", "page");
    await expect.poll(() => chants.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe(ENCRE);
    expect(await nav.getByRole("link", { name: "Setlists" }).evaluate((a) => getComputedStyle(a).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    const label = barreLaterale(page).getByTestId("label-section");
    await expect(label).toHaveText("Louange");
    expect(await label.evaluate((el) => getComputedStyle(el).color), "rouge du logo").toBe("rgb(207, 42, 32)");
    await nav.getByRole("link", { name: "Setlists" }).click();
    await expect(page).toHaveURL(/\/setlists\/?$/);
    await expect(label).toHaveText("Louange");
    await nav.getByRole("link", { name: "Planning" }).click();
    await expect(page).toHaveURL(/\/planning\/?$/);
    await expect(label).toHaveText("Planning");
    // En fondu : le label porte une animation d'opacité courte à chaque changement.
    expect(await label.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
    await expect(nav.getByRole("link", { name: "Planning" })).toHaveAttribute("aria-current", "page");
  });

  test("membre : le pied porte l'initiale, le nom, la cloche et la langue ; l'initiale ouvre le menu « Compte »", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied).toContainText("Ruth K.");
    await expect(pied.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeVisible();
    await expect(barreLaterale(page).getByRole("button", { name: /mode (clair|sombre)/i }), "le thème d'un membre est dans Moi").toHaveCount(0);
    await pied.getByRole("button", { name: "Compte" }).click();
    const menu = page.getByRole("menu");
    for (const nom of ["Mon profil", "Guide d'utilisation", "Ton avis sur le site", "Signaler un problème", "Déconnexion"]) {
      await expect(menu.getByRole("menuitem", { name: nom })).toBeVisible();
    }
    // Le menu s'ouvre à côté de la barre, pas dessous.
    expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(240);
  });

  test("visiteur : Chants · Évènements ; en bas « Connexion », la langue et le thème", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveText(["Chants", "Évènements"]);
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied.getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeVisible();
    await expect(pied.getByRole("button", { name: /Mode (clair|sombre)/ })).toBeVisible();
  });

  test("la place du sélecteur App ↔ Back-Office existe, vide, sous le label (U6 la remplira)", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const place = barreLaterale(page).getByTestId("place-selecteur");
    await expect(place).toHaveCount(1);
    expect(await place.evaluate((el) => el.childElementCount)).toBe(0);
  });

  test("Tab parcourt le logo, puis les entrées, puis le pied", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await barreLaterale(page).getByRole("link").first().focus();
    const ordre: string[] = [];
    for (let i = 0; i < 5; i++) {
      ordre.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim()));
      await page.keyboard.press("Tab");
    }
    expect(ordre[0]).toMatch(/GCC/);
    expect(ordre.slice(1, 3)).toEqual(["Chants", "Évènements"]);
  });
});
