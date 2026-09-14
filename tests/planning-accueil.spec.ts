import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Chantier Planning (docs/spec-planning.md) : un dimanche d'Interfranco ou
// d'Intergroupe, « Ce dimanche » remplace toute la section Groupes par ce
// service et son planning. Feuilles Google et date simulées.

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com" };

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Mêmes colonnes que les vraies feuilles (en-tête compris).
const INTERFRANCO = csv([
  ["INTERFRANCO Année 2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Cajon/Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur"],
  ["14/06", "Jonathan Z.", "Christelle Z.", "Daniela W.", "Christelle C.", "David S.", "Yiyi C.", "Lorenzo S.", "Denis F.", "", ""],
]);
const INTERGROUPE = csv([
  ["INTERGROUPE Année 2026 DATE", "Présidence", "Choristes", "", "", "Pianiste", "Guitariste", "Cajon/Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur"],
  ["06/09", "徐欢乐", "Paul W.", "Christelle Z.", "David C.", "Jonathan Z.", "Christelle C.", "Stéphane Z.", "Denis F.", "Lorenzo S.", "Yiping WANG", "Karémy X."],
]);

/** Ouvre l'accueil du planning le vendredi qui précède `dimanche` (AAAA-MM-JJ). */
async function openPlanning(page: Page, dimanche: string) {
  const vendredi = new Date(`${dimanche}T10:00:00`);
  vendredi.setDate(vendredi.getDate() - 2);
  await page.clock.setFixedTime(vendredi);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    const body = sheet === "Interfranco" ? INTERFRANCO : sheet === "Intergroupe" ? INTERGROUPE : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body });
  });
  await signInAs(page, MEMBRE, {}, "/planning");
}

test("dimanche d'Interfranco : la section Groupes laisse la place à Interfranco", async ({ page }) => {
  await openPlanning(page, "2026-06-14");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Interfranco", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Jonathan Z.")).toBeVisible();
  await expect(dimanche.getByText("Christelle Z., Daniela W.")).toBeVisible();
  await expect(dimanche.getByText("Lorenzo S.")).toBeVisible();
  await expect(dimanche.getByText("Groupes", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Paix", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Culte Franco", { exact: true }), "le Culte Franco a lieu normalement").toBeVisible();
});

test("dimanche d'Intergroupe : section Intergroupe avec ses trois choristes", async ({ page }) => {
  await openPlanning(page, "2026-09-06");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Intergroupe", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("徐欢乐")).toBeVisible();
  await expect(dimanche.getByText("Paul W., Christelle Z., David C.")).toBeVisible();
  await expect(dimanche.getByText("Groupes", { exact: true })).toHaveCount(0);
});

test("dimanche ordinaire : la section Groupes reste", async ({ page }) => {
  await openPlanning(page, "2026-06-21");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Groupes", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Paix", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Interfranco", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Intergroupe", { exact: true })).toHaveCount(0);
});

test("en 中文 : le service remplaçant porte son nom traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await openPlanning(page, "2026-06-14");
  const dimanche = page.getByRole("region", { name: /本主日/ });
  await expect(dimanche.getByText("法语团契聚会", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("团契", { exact: true })).toHaveCount(0);
});
