import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ajouterChant, boutonTonalite, groupeTonalites, reglerElement } from "./helpers/editeurSetlist";

// Chantier Setlist, lot 3 (docs/spec-setlist.md) : la tonalité la plus chantée
// à Grace Church, validée par Timothée (docs/tonalites-recommandees.md), est
// inscrite dans le chant et affichée par défaut. L'originale reste proposée.

async function openSong(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Dans la barre du chant : en deux volets, la liste (et son choix de thème) est à côté (lot U5).
  const select = page.getByTestId("barre-outils").locator("select").first();
  await select.waitFor();
  return select;
}

const optionTexts = (page: Page) =>
  page.getByTestId("barre-outils").locator("select").first().locator("option").evaluateAll((els) => els.map((e) => e.textContent?.trim()));

test("page du chant : démarre dans la recommandée, l'originale reste proposée (FR)", async ({ page }) => {
  const select = await openSong(page, "/songs/je-reviens-au-coeur");
  await expect(select).toHaveValue("D");
  const texts = await optionTexts(page);
  expect(texts).toContain("D (reco.)");
  expect(texts).toContain("Eb (orig.)");
});

test("page du chant : démarre dans la recommandée (中文)", async ({ page }) => {
  const select = await openSong(page, `/songs/${encodeURIComponent("不停赞美你")}`);
  await expect(select).toHaveValue("F");
  expect(await optionTexts(page)).toContain("G (orig.)");
});

test("page du chant : une originale écrite autrement (C#) reste dans le sélecteur", async ({ page }) => {
  const select = await openSong(page, "/songs/a-jamais-tu-es-saint");
  await expect(select).toHaveValue("A");
  expect(await optionTexts(page)).toContain("C# (orig.)");
});

test("page du chant : le bouton de retour ramène à la recommandée", async ({ page }) => {
  const select = await openSong(page, "/songs/je-reviens-au-coeur");
  // Le rendu du serveur porte déjà l'originale (Eb) et le bouton de retour : choisir Eb
  // avant l'hydratation « réussit », puis la page passe à D et le bouton disparaît sous le
  // clic. On attend donc la recommandée, posée une fois la page hydratée.
  await expect(select).toHaveValue("D");
  // Avant l'hydratation le choix est perdu : on recommence jusqu'à ce que la page réponde.
  await expect(async () => {
    await select.selectOption("Eb");
    await expect(select).toHaveValue("Eb", { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: "Revenir à la tonalité recommandée" }).click();
  await expect(select).toHaveValue("D");
});

test("ouverte depuis une setlist où le chant est à l'originale, la page reste dans l'originale", async ({ page }) => {
  const select = await openSong(page, `/songs/je-reviens-au-coeur?setlist=${encodeURIComponent('"s1"')}`);
  await expect(select).toHaveValue("Eb");
});

test("chant sans tonalité recommandée : inchangé", async ({ page }) => {
  const select = await openSong(page, "/songs/abba-pere");
  await expect(select).toHaveValue("A");
  expect(await optionTexts(page)).not.toContainEqual(expect.stringContaining("reco."));
});

test("liste des chants : affiche la recommandée", async ({ page }) => {
  await page.goto("/songs");
  const row = page.getByRole("link", { name: /Je reviens au cœur/ });
  await expect(row.getByText("D", { exact: true })).toBeVisible();
  await expect(row.getByText("Eb", { exact: true })).toHaveCount(0);
});

test("éditeur de setlist : un chant ajouté démarre dans la recommandée", async ({ page }) => {
  const musicien: FakeProfile = {
    uid: "uid-musicien",
    email: "musicien@example.com",
    planningName: "Ruth K.",
    serviceRoles: { "Culte Francophone": ["musicien"] },
  };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, musicien, {}, "/setlists/new?autre=1");
  await ajouterChant(page, "Je reviens au cœur");
  // Lot U5 bis : la tonalité est un groupe de boutons dans les réglages du chant.
  await reglerElement(page, "Je reviens au cœur");
  const groupe = groupeTonalites(page, "Je reviens au cœur");
  await expect(boutonTonalite(groupe, "D")).toBeChecked();
  await expect(boutonTonalite(groupe, "Eb")).toHaveAccessibleName("Eb orig.");
});
