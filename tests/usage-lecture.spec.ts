import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { verifierSansDebordement } from "./helpers/agencement";
import { CLES_USAGE } from "../src/lib/usageCles";

// Comptage d'usage, T4 (docs/spec-comptage-usage.md) : l'écran de lecture /back-office/usage. Lectures interceptées
// (`**/documents/usage/**`) : deux mois simulés, les autres en 404 ; jamais de vraie base.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." }; // adresse de ADMIN_EMAILS, comme back-office-admin.spec.ts
const MEMBRE: FakeProfile = { uid: "uid-usage-t4-brume", email: "ondine.brume@example.com", firstName: "Ondine", lastName: "Brume" };

const mois = (decalage: number) => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - decalage, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const ent = (v: number) => ({ integerValue: String(v) });
const champ = (j: number, n: number) => ({ mapValue: { fields: { j: ent(j), n: ent(n) } } });

// Total actif : 500 + 500 = 1000 jours-appareils sur deux mois lus (le troisième est absent : 404).
const DOCS: Record<string, Record<string, unknown>> = {
  [mois(0)]: { _actif: champ(500, 0), "cmd.chant.pdf": champ(100, 120), "cmd.chant.capo": champ(5, 6), "cmd.chant.annoter": champ(1, 1), "cmd.chant.transposer": champ(4, 9) },
  [mois(1)]: { _actif: champ(500, 0), "cmd.chant.pdf": champ(100, 200), "cmd.chant.capo": champ(5, 6), "cmd.chant.transposer": champ(4, 9) },
};

async function lectures(page: Page) {
  await page.route("**/documents/usage/**", (route) => {
    const champs = DOCS[route.request().url().split("/usage/")[1].split("?")[0]];
    return champs
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ name: "x", fields: champs }) })
      : route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: 404, status: "NOT_FOUND" } }) });
  });
}

async function ouvrir(page: Page, profil: FakeProfile) {
  await signInAs(page, profil, {}, "/songs");
  await lectures(page);
  await page.goto("/back-office/usage");
}

const ligne = (page: Page, cle: string) => page.locator(`[data-testid="ligne-usage"][data-cle="${cle}"]`);

test("la liste suit le registre, une clé jamais utilisée apparaît à 0, la moins utilisée est en tête", async ({ page }) => {
  await ouvrir(page, ADMIN);
  await expect(page.getByTestId("usage-total")).toHaveText(/^Jours-appareils actifs : 1\s000$/);
  await expect(page.getByTestId("usage-resume")).toContainText("Mois lus : 2 sur 3");
  await expect(page.getByTestId("ligne-usage")).toHaveCount(Object.keys(CLES_USAGE).filter((c) => c !== "_actif").length);
  await expect(ligne(page, "cmd.louange.cercle").locator("td").nth(1)).toHaveText("0");
  const principal = page.getByTestId("tableau-usage").getByTestId("ligne-usage");
  await expect(principal.first().locator("td").nth(1)).toHaveText("0");
  await expect(principal.last()).toHaveAttribute("data-cle", "cmd.chant.pdf");
});

test("la marque « candidate » suit le seuil, une exception ne l'est jamais", async ({ page }) => {
  await ouvrir(page, ADMIN);
  await expect(page.getByTestId("ligne-usage").first()).toBeVisible();
  await expect(ligne(page, "cmd.louange.cercle")).toHaveAttribute("data-candidate", "true"); // 0 %
  await expect(ligne(page, "cmd.louange.cercle")).toContainText("Candidate au retrait");
  await expect(ligne(page, "cmd.chant.annoter")).toHaveAttribute("data-candidate", "true"); // 0,1 % et 0,5 par mois
  await expect(ligne(page, "cmd.chant.capo")).toHaveAttribute("data-candidate", "false"); // 10 / 1000 = 1 % pile : pas sous le seuil
  await expect(ligne(page, "cmd.chant.transposer")).toHaveAttribute("data-candidate", "false"); // 0,8 % mais 4 par mois : pas sous 4
  await expect(ligne(page, "cmd.chant.pdf")).toHaveAttribute("data-candidate", "false");
  await expect(ligne(page, "cmd.chant.signaler")).toHaveAttribute("data-candidate", "false"); // 0 mais exception
  await expect(page.getByTestId("tableau-usage-exceptions").locator('[data-cle="cmd.chant.signaler"]')).toHaveCount(1);
  await expect(page.getByTestId("tableau-usage").locator('[data-cle="cmd.chant.signaler"]')).toHaveCount(0);
});

test("un membre non admin voit « réservé » et pas le tableau", async ({ page }) => {
  await ouvrir(page, MEMBRE);
  await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
  await expect(page.getByTestId("tableau-usage")).toHaveCount(0);
});

test("aucune donnée : aucune candidate, une phrase", async ({ page }) => {
  await signInAs(page, ADMIN, {}, "/songs");
  await page.route("**/documents/usage/**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: 404, status: "NOT_FOUND" } }) }));
  await page.goto("/back-office/usage");
  await expect(page.getByText("Pas encore de données sur cette période.")).toBeVisible();
  await expect(page.getByText("Candidate au retrait")).toHaveCount(0);
  await expect(page.getByTestId("ligne-usage")).toHaveCount(0);
});

test("agencement : titre et tableau visibles, sans débordement, capture à hauteur d’écran", async ({ page }, testInfo) => {
  await ouvrir(page, ADMIN);
  await expect(page.getByRole("heading", { level: 1, name: "Usage du site" })).toBeVisible();
  await expect(page.getByTestId("tableau-usage")).toBeVisible();
  await expect(page.getByTestId("ligne-usage").first()).toBeVisible();
  await verifierSansDebordement(page);
  await page.screenshot({ path: `test-results/usage-lecture/${testInfo.project.name}.png`, fullPage: false });
});

test.describe("back-office coupé", () => {
  test.use({ baseURL: BASE_URL_COUPE });
  test("/back-office/usage répond 404, aucun tableau", async ({ page }) => {
    const rep = await page.goto("/back-office/usage");
    expect(rep?.status()).toBe(404);
    await expect(page.getByTestId("tableau-usage")).toHaveCount(0);
  });
});
