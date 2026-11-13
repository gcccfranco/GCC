import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, remplit, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { COLONNES_CULTE } from "../src/lib/planning/grilles";

// Lot « retouches d'usage », tranche T3 (docs/spec-retouches-usage.md) : zones de toucher de 44 px du calendrier
// (flèches du mois, « Aujourd'hui »), du « ⋯ » non compact (MenuActions) et des cases de nom du planning (cellule du
// tableau sur tablette, ligne de carte sur téléphone). Zone mesurée dans la page : `::after` ≥ 44 px, dessin < 44 px,
// toucher à 20 px du centre. Base et Sheets simulés ; comptes et noms inventés.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Maëlle T.", "Odon F.", "Ilse R.", "Corto V.", "Sabine L.", "Yann P.", "Nell A.", "Hugo B.", "Pasteur LEROY", "", "", ""],
  ["27/09", "Tiphaine G.", "Odon F.", "Ilse R.", "Corto V.", "Sabine L.", "Yann P.", "Nell A.", "Hugo B.", "Pasteur LEROY", "", "", ""],
]);

const LISE: FakeProfile = {
  uid: "uid-lise", email: "lise@example.com", firstName: "Lise", lastName: "Vernet", planningName: "Lise V.", ...remplit("culte"),
};
const NOOR = { email: "noor@example.com", firstName: "Noor", lastName: "Aubriot", planningName: "Noor A.", serviceRoles: {}, annonces: [], notify: [] };
const OCEANE = { email: "oceane@example.com", firstName: "Océane", lastName: "Rivard", planningName: "Océane R.", serviceRoles: {}, annonces: [], notify: [] };
const DOCS = { "users/uid-noor": NOOR, "users/uid-oceane": OCEANE };

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };

/** Le planning du Culte en modification, le vendredi 18/09/2026 (dimanche courant 20/09). */
async function ouvrirPlanning(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, LISE, DOCS, "/back-office/planning/culte");
}

const laCase = (page: Page, date: string, colonne: string) => page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });
const estTactile = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
const hauteurApres = async (el: Locator) => parseFloat(await el.evaluate((e) => getComputedStyle(e, "::after").height));
const largeurApres = async (el: Locator) => parseFloat(await el.evaluate((e) => getComputedStyle(e, "::after").width));
/** `touchscreen.tap` ne fait pas défiler : on amène l'élément au milieu de l'écran (hors barre du bas) avant de le mesurer. */
const aumilieu = (el: Locator) => el.evaluate((e) => e.scrollIntoView({ block: "center" }));
const choisirNom = (page: Page, nom: string) => page.getByRole("dialog").getByRole("option", { name: new RegExp(`^${nom.replace(/\./g, "\\.")}`) }).click();

test.describe("calendrier : flèches du mois et « Aujourd'hui »", () => {
  async function ouvrirCalendrier(page: Page) {
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await signInAs(page, ADMIN, {}, "/back-office/calendrier");
    await expect(page.getByTestId("mois-affiche")).toContainText("2026");
  }

  test("appareils tactiles : flèches et « Aujourd'hui » ont une zone de 44 px sans changer le dessin", async ({ page }) => {
    await ouvrirCalendrier(page);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    for (const nom of ["Mois précédent", "Mois suivant", "Aujourd'hui"]) {
      const bouton = page.getByRole("button", { name: nom });
      expect(await hauteurApres(bouton), `hauteur du ::after de « ${nom} »`).toBeGreaterThanOrEqual(44);
      expect(await largeurApres(bouton), `largeur du ::after de « ${nom} »`).toBeGreaterThanOrEqual(44);
      expect((await bouton.boundingBox())!.height, `le dessin de « ${nom} » ne grandit pas`).toBeLessThan(44);
    }
  });

  test("appareils tactiles : un toucher à 20 px du centre de la flèche change le mois, puis « Aujourd'hui » le ramène", async ({ page }) => {
    await ouvrirCalendrier(page);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const mois = page.getByTestId("mois-affiche");
    const avant = (await mois.textContent())!;
    const suivant = (await page.getByRole("button", { name: "Mois suivant" }).boundingBox())!;
    await page.touchscreen.tap(suivant.x + suivant.width / 2, suivant.y + suivant.height / 2 - 20);
    await expect(mois).not.toHaveText(avant);
    const aujourdhui = (await page.getByRole("button", { name: "Aujourd'hui" }).boundingBox())!;
    await page.touchscreen.tap(aujourdhui.x + aujourdhui.width / 2, aujourdhui.y + aujourdhui.height / 2 + 20);
    await expect(mois).toHaveText(avant);
  });
});

test("appareils tactiles : le « ⋯ » non compact d'une carte de dimanche a une zone de 44 px et s'ouvre à 20 px du centre", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "le « ⋯ » non compact est celui des cartes de dimanche : téléphone seul (ordinateur et tablette : « ⋯ » compact, hors de cette tranche)");
  await ouvrirPlanning(page);
  test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
  const carte = page.locator('[data-date-carte="2026-09-27"]');
  const plus = carte.getByRole("button", { name: "Plus d'actions" });
  await expect(plus).toBeVisible();
  await aumilieu(plus);
  expect(await hauteurApres(plus), "hauteur du ::after").toBeGreaterThanOrEqual(44);
  const b = (await plus.boundingBox())!;
  expect(b.height, "le dessin ne grandit pas").toBeLessThan(44);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 - 20);
  await expect(page.getByRole("menuitem").first()).toBeVisible();
});

test.describe("planning : cases de nom", () => {
  const [presidence, suivante] = COLONNES_CULTE.map((c) => c.cle);

  test("la feuille de choix d'un nom : chaque ligne fait au moins 44 px (lignes de 40 px avant le 12/11/2026)", async ({ page }) => {
    await ouvrirPlanning(page);
    const zone = laCase(page, "2026-09-27", presidence);
    await zone.getByRole("button").click();
    const options = page.getByRole("dialog").getByRole("option");
    await expect(options.first()).toBeVisible();
    const hauteurs = await options.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(hauteurs.length).toBeGreaterThan(1);
    expect(Math.min(...hauteurs)).toBeGreaterThanOrEqual(44);
  });

  test("appareils tactiles : la case de nom a une zone de 44 px, un toucher à 20 px du centre l'ouvre", async ({ page }) => {
    await ouvrirPlanning(page);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const zone = laCase(page, "2026-09-27", presidence);
    await expect(zone).toContainText("Tiphaine G.");
    expect(await hauteurApres(zone), "hauteur du ::after de la cellule ou de la ligne").toBeGreaterThanOrEqual(44);
    const bouton = zone.getByRole("button");
    await aumilieu(bouton);
    const b = (await bouton.boundingBox())!;
    expect(b.height, "le dessin de la case ne grandit pas").toBeLessThan(44);
    expect(await bouton.evaluate((e) => getComputedStyle(e).overflow), "la case porte `truncate`").toBe("hidden");
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 - 20);
    await choisirNom(page, "Noor A.");
    await expect(zone).toContainText("Noor A.");
  });

  test("appareils tactiles : toucher entre deux cases de nom ouvre la bonne, sans recouvrement des zones", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "les cartes, où les cases se suivent dans une colonne : téléphone seul");
    await ouvrirPlanning(page);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const haut = laCase(page, "2026-09-27", presidence);
    const bas = laCase(page, "2026-09-27", suivante);
    await expect(haut).toBeVisible();
    await expect(bas).toBeVisible();
    await aumilieu(haut);
    const h = (await haut.getByRole("button").boundingBox())!;
    const s = (await bas.getByRole("button").boundingBox())!;
    expect(s.y - (h.y + h.height), "écart entre deux cases").toBeGreaterThanOrEqual(8);
    // Le centre de l'écart sépare les deux zones : 3 px de chaque côté, la case la plus proche s'ouvre.
    const milieu = (h.y + h.height + s.y) / 2;
    await page.touchscreen.tap(h.x + h.width / 2, milieu - 3);
    await choisirNom(page, "Noor A.");
    await expect(haut).toContainText("Noor A.");
    await expect(bas).not.toContainText("Noor A.");
    // La page a pu bouger à la fermeture du dialogue : on remesure avant le second toucher.
    await aumilieu(bas);
    const s2 = (await bas.getByRole("button").boundingBox())!;
    const h2 = (await haut.getByRole("button").boundingBox())!;
    const milieu2 = (h2.y + h2.height + s2.y) / 2;
    await page.touchscreen.tap(s2.x + s2.width / 2, milieu2 + 3);
    await choisirNom(page, "Océane R.");
    await expect(bas).toContainText("Océane R.");
    await expect(haut).toContainText("Noor A.");
  });

  test("appareils tactiles : tablette, un toucher dans la marge de la cellule, entre la case et le bord, ouvre la case", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "le tableau : ordinateur et tablette (au téléphone, les cartes)");
    await ouvrirPlanning(page);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const cellule = laCase(page, "2026-09-27", presidence);
    await expect(cellule).toContainText("Tiphaine G.");
    const c = (await cellule.boundingBox())!;
    const b = (await cellule.getByRole("button").boundingBox())!;
    expect(c.height, "la cellule contient la zone de 44 px").toBeGreaterThanOrEqual(44);
    await page.touchscreen.tap(b.x + b.width / 2, (c.y + b.y) / 2 + 1);
    await choisirNom(page, "Noor A.");
    await expect(cellule).toContainText("Noor A.");
  });
});
