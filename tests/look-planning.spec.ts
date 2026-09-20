import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 4 « Nouveau look », tranche T4 : planning, Mes services (docs/spec-look.md).
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "", ""],
]);
const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K." };
const phone = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const CULTE_COULEUR = "rgb(45, 90, 101)"; // PLANNING_COLORS.culte
const MUET = "rgb(108, 108, 114)"; // --muted-foreground

async function open(page: Page, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, RUTH, {}, to);
}
const couleur = (l: ReturnType<Page["locator"]>) => l.evaluate((el) => getComputedStyle(el).color);

test.describe("planning (T4)", () => {
  test.use(phone);

  // 5C1, retour de Christelle (vue D) : le filet de couleur suffit, le petit carré part.
  test("accueil : grand titre, prochain service en vignette de date, services marqués d'un filet de couleur, sans carré", async ({ page }) => {
    await open(page, "/planning");
    await expect(page.getByRole("heading", { level: 1, name: "Planning" })).toBeVisible();
    // Le lien du prochain service (pas l'onglet « Culte Franco » de la barre de section).
    const prochain = page.locator('main a[href^="/mes-services"]').first();
    await expect(prochain.getByTestId("tuile")).toContainText("20");
    await expect(prochain.getByTestId("tuile")).toContainText("sept");
    expect(await couleur(prochain.getByTestId("tuile"))).toBe(CULTE_COULEUR);
    const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
    await expect(dimanche.getByText("Ruth K.")).toBeVisible();
    await expect(dimanche.getByTestId("carre-service")).toHaveCount(0);
    const service = dimanche.getByTestId("service-dimanche").first();
    expect(await service.evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("3px");
    expect(await service.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe(CULTE_COULEUR);
  });

  test("onglets de section : neutres, l'onglet courant prend sa couleur", async ({ page }) => {
    await open(page, "/planning/culte");
    const onglets = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "Accueil" }) });
    const culte = onglets.getByRole("link", { name: "Culte Franco" });
    const campus = onglets.getByRole("link", { name: "Campus" });
    await expect(culte).toHaveAttribute("aria-current", "page");
    expect(await couleur(culte)).toBe(CULTE_COULEUR);
    expect(await culte.evaluate((el) => getComputedStyle(el).backgroundColor), "l'onglet courant est teinté").not.toBe("rgba(0, 0, 0, 0)");
    expect(await couleur(campus), "les autres onglets restent neutres").toBe(MUET);
  });

  test("Mes services : chaque service porte sa date en vignette, dans sa couleur", async ({ page }) => {
    await open(page, "/mes-services");
    await expect(page.getByRole("heading", { level: 1, name: "Mes services" })).toBeVisible();
    const tuile = page.getByTestId("tuile").first();
    await expect(tuile).toContainText("20");
    await expect(tuile).toContainText("sept");
    expect(await couleur(tuile)).toBe(CULTE_COULEUR);
    await expect(page.getByText("Culte Franco", { exact: true })).toBeVisible();
  });
});
