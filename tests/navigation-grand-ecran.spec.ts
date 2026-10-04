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
