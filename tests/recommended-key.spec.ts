import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ajouterChant, boutonTonalite, groupeTonalites, reglerElement } from "./helpers/editeurSetlist";

// Chantier Setlist, lot 3 (docs/spec-setlist.md) : la tonalité la plus chantée
// à Grace Church, validée par Timothée (docs/tonalites-recommandees.md), est
// inscrite dans le chant et affichée par défaut. L'originale reste proposée.

// RU-3 (docs/spec-reglages-unifies.md) : le sélecteur de la barre a laissé place à l'armure, à côté du titre ;
// sa fenêtre offre les douze tonalités, légendées « reco. » et « orig. ».
const musical = (k: string) => k.replace(/^([A-G])b/, "$1♭").replace(/^([A-G])#/, "$1♯");
const armure = (page: Page) => page.getByTestId("armure").first();
const tonalite = (page: Page, k: string) =>
  page.getByTestId("fenetre-armure").getByRole("radio", { name: new RegExp(`^${musical(k)}(?![♭♯])`) });

async function openSong(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await armure(page).waitFor();
  return armure(page);
}

/** La tonalité lue sur l'armure (« 1=F » pour un chant chinois). */
const expectCle = (page: Page, k: string, zh = false) => expect(armure(page)).toHaveText(zh ? `1=${musical(k)}` : musical(k));

/** Ouvre la fenêtre de l'armure (avant l'hydratation le toucher est perdu : on recommence). */
async function ouvrirFenetre(page: Page) {
  await expect(async () => {
    if (!(await page.getByTestId("fenetre-armure").isVisible())) await armure(page).click();
    await expect(page.getByTestId("fenetre-armure")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

test("page du chant : démarre dans la recommandée, l'originale reste proposée (FR)", async ({ page }) => {
  await openSong(page, "/songs/je-reviens-au-coeur");
  await expectCle(page, "D");
  await ouvrirFenetre(page);
  await expect(tonalite(page, "D")).toHaveAttribute("aria-checked", "true");
  await expect(tonalite(page, "D")).toContainText("reco.");
  await expect(tonalite(page, "Eb")).toContainText("orig.");
});

test("page du chant : démarre dans la recommandée (中文)", async ({ page }) => {
  await openSong(page, `/songs/${encodeURIComponent("不停赞美你")}`);
  await expectCle(page, "F", true);
  await ouvrirFenetre(page);
  await expect(tonalite(page, "G")).toContainText(/orig\.|原调/);
});

test("page du chant : une originale écrite autrement (C#) reste dans la fenêtre", async ({ page }) => {
  await openSong(page, "/songs/a-jamais-tu-es-saint");
  await expectCle(page, "A");
  await ouvrirFenetre(page);
  await expect(tonalite(page, "C#")).toContainText("orig.");
});

test("page du chant : plus de bouton de retour à la recommandée (retiré le 18/10/2026)", async ({ page }) => {
  await openSong(page, "/songs/je-reviens-au-coeur");
  await expectCle(page, "D");
  await ouvrirFenetre(page);
  await tonalite(page, "Eb").click();
  await expectCle(page, "Eb");
  await expect(page.getByRole("button", { name: "Revenir à la tonalité recommandée" })).toHaveCount(0);
  // La recommandée reste dans la fenêtre.
  await tonalite(page, "D").click();
  await expectCle(page, "D");
});

test("ouverte depuis une setlist où le chant est à l'originale, la page reste dans l'originale", async ({ page }) => {
  await openSong(page, `/songs/je-reviens-au-coeur?setlist=${encodeURIComponent('"s1"')}`);
  await expectCle(page, "Eb");
});

test("chant sans tonalité recommandée : inchangé", async ({ page }) => {
  await openSong(page, "/songs/abba-pere");
  await expectCle(page, "A");
  await ouvrirFenetre(page);
  await expect(page.getByTestId("fenetre-armure").getByText("reco.")).toHaveCount(0);
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
