import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 1a (docs/spec-planning-petits-lots.md) : la colonne « Sainte cène » de
// Franco_Louange (index 11) est un service à part entière — « Ce dimanche »,
// onglet Culte, Mes services — visible seulement quand la case est remplie.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Même forme que la vraie feuille : « Sainte cène » après « Traducteur », puis
// une colonne de notes de travail (index 12) qui ne doit jamais s'afficher.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["13/09", "Jonathan Z.", "Daniela W.", "Alice Q.", "Timothée C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", "", "à confirmer"],
  ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Eva C.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "Ruth K.", "chants ?"],
]);

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K." };

async function open(page: Page, dimanche: string, to: string) {
  const vendredi = new Date(`${dimanche}T10:00:00`);
  vendredi.setDate(vendredi.getDate() - 2);
  await page.clock.setFixedTime(vendredi);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, RUTH, {}, to);
}

test("Ce dimanche : la personne de la Sainte cène apparaît dans le Culte Franco quand la case est remplie", async ({ page }) => {
  await open(page, "2026-09-20", "/planning");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Sainte cène", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Ruth K.")).toBeVisible();
  await expect(dimanche.getByText("chants ?"), "les notes de travail restent dans la feuille").toHaveCount(0);
});

test("Ce dimanche : pas de ligne Sainte cène quand la case est vide", async ({ page }) => {
  await open(page, "2026-09-13", "/planning");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Jonathan Z.")).toBeVisible();
  await expect(dimanche.getByText("Sainte cène", { exact: true })).toHaveCount(0);
});

test("onglet Culte : la colonne Sainte cène n'existe que si une case du trimestre est remplie", async ({ page }) => {
  await open(page, "2026-09-20", "/planning/culte");
  // Tableau (ordinateur, tablette) et cartes (téléphone) coexistent dans le DOM.
  await expect(page.getByText("Ruth K.").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Sainte cène", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("chants ?")).toHaveCount(0);
});

test("Mes services : la Sainte cène est un service, avec son rôle", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services");
  await expect(page.getByText("Culte Franco", { exact: true })).toBeVisible();
  await expect(page.getByText("Sainte cène", { exact: true })).toBeVisible();
});

test("en 中文 : libellé traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, "2026-09-20", "/planning");
  const dimanche = page.getByRole("region", { name: /本主日/ });
  await expect(dimanche.getByText("圣餐", { exact: true })).toBeVisible();
});
