import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Tranche B4a de docs/spec-corrections-audit.md : EtatVide, Impasse, Bandeau (composants partagés).
// Personnes fictives.
const MEMBRE: FakeProfile = { uid: "u-iris", email: "iris.test@example.com", firstName: "Iris", lastName: "T.", planningName: "Iris T." };
const PRESIDENTE: FakeProfile = {
  uid: "uid-mona", email: "mona@example.com", firstName: "Mona", lastName: "Q.", planningName: "Mona Q.",
  dansEquipes: ["louange"], sousEquipes: ["presidence"], lieuxLouange: ["Culte Francophone"],
};

const sansFirestore = (page: Page) =>
  page.route(/firestore\.googleapis\.com/, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));

/** Contraste WCAG du texte d'un élément sur le fond de la page (couleurs normalisées par un canvas). */
async function contraste(page: Page, selecteur: string): Promise<number> {
  return page.locator(selecteur).first().evaluate((el) => {
    const px = (css: string) => {
      const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      c.clearRect(0, 0, 1, 1);
      c.fillStyle = css;
      c.fillRect(0, 0, 1, 1);
      return Array.from(c.getImageData(0, 0, 1, 1).data);
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let fond = [255, 255, 255, 255];
    for (let n: Element | null = el; n; n = n.parentElement) {
      const p = px(getComputedStyle(n).backgroundColor);
      if (p[3] > 200) { fond = p; break; }
    }
    const a = lum(px(getComputedStyle(el).color));
    const b = lum(fond);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`404 (${theme}) : titre lisible (≥ 4,5:1) et « Voir les chants » mène à /songs`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/cette-page-n-existe-pas");
    const titre = page.getByText("Page introuvable", { exact: true });
    await expect(titre).toBeVisible();
    expect(await contraste(page, "text=Page introuvable")).toBeGreaterThanOrEqual(4.5);
    await page.getByRole("link", { name: "Voir les chants" }).click();
    await expect(page).toHaveURL(/\/songs\/?$/);
  });
}

test("/harmonie, visiteur : renvoyé vers /login?from=/harmonie (RequireAuth), jamais devant une page vide", async ({ page }) => {
  await sansFirestore(page);
  await page.goto("/harmonie");
  await expect(page).toHaveURL(/\/login\/?\?from=%2Fharmonie/);
});

test("/harmonie, connectée hors musiciens : Impasse avec « Voir les chants »", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, PRESIDENTE, {}, "/harmonie");
  await expect(page.getByText("Cette page est réservée aux musiciens de l'équipe.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir les chants" })).toHaveAttribute("href", /^\/songs\/?$/);
});

test("/questionnaire, visiteur : « Se connecter » vers /login?from=/questionnaire", async ({ page }) => {
  await sansFirestore(page);
  await page.goto("/questionnaire");
  await expect(page.getByText("Connecte-toi pour répondre au questionnaire.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", /^\/login\/?\?from=\/questionnaire$/);
});

test("Mes services sans service : un cadre vide (EtatVide), sans 🙂", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MEMBRE, {}, "/mes-services");
  const vide = page.getByText(/Aucun service à venir/);
  await expect(vide).toBeVisible();
  await expect(vide).not.toContainText("🙂");
  const cadre = vide.locator("xpath=..");
  expect(await cadre.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("dashed");
});

test("bandeau « planning périmé » : rôle status", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.abort());
  await signInAs(page, MEMBRE, {}, "/planning/culte");
  const bandeau = page.getByTestId("planning-stale");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toHaveAttribute("role", "status");
});

test("un chant FR et un chant ZH s'ouvrent toujours", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.goto("/songs/" + encodeURIComponent("一切歌颂赞美"));
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
