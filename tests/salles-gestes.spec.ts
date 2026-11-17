import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 3, tranche T3c : les gestes de la Grille (SA11, SA6). Glisser sur une case
// vide (souris, trackpad, stylet : ordinateur, tablette) crée la plage au quart d'heure et ouvre la feuille
// « Réserver » pré-remplie (date du jour affiché, de, à, la salle de la colonne) ; au toucher, un appui sur une case
// suffit ; au clavier, Entrée sur une case l'ouvre à cette heure. Le toucher d'un bloc ouvre toujours son détail (SA4).
// Firestore, planning et date simulés ; personnes fictives.

const MAINTENANT = "2026-11-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  // Dimanche 15 novembre : Salle de réunion prise de 19:00 à 20:30 par Oriane.
  "reservations/r-oriane": {
    salle: "reunion", date: "2026-11-15", debut: "19:00", fin: "20:30", pour: "", quoi: "Préparation des chants",
    auteurUid: "uid-oriane", auteurNom: "Oriane", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

const MEMBRE: FakeProfile = { uid: "uid-anselme", email: "anselme@example.com", firstName: "Anselme", lastName: "Vautrin", serviceRoles: { "Groupe Bonté": ["chanteur"] } };

/** Dimanche 15 novembre 2026 (dimanche ordinaire), à 14:00 de Paris. */
const DIMANCHE_14H = "2026-11-15T14:00:00+01:00";
/** Hauteur d'une heure dans la Grille, en px (GrilleSalles, `H`). */
const H = 44;

async function ouvrir(page: Page, zh = false) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(DIMANCHE_14H));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript((z) => {
    try {
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("gcc-salles-vue", "grille");
    } catch {}
  }, zh);
  const db = await signInAs(page, MEMBRE, DOCS, "/evenements/salles");
  await expect(page.locator("[data-grille-salles]")).toBeVisible();
  return db;
}

const feuille = (page: Page) => page.getByRole("dialog", { name: /^(Réserver une salle|预订场地)$/ });
const colonne = (page: Page, id: string) => page.locator(`[data-grille-salles] [data-colonne="${id}"]`);
const corps = (page: Page, id: string) => colonne(page, id).locator("[data-corps]");
const caseDe = (page: Page, id: string, heure: string) => colonne(page, id).locator(`[data-case="${heure}"]`);

/** Le point de la colonne `id` à `minutes` après 8:00. */
async function point(page: Page, id: string, minutes: number) {
  const c = corps(page, id);
  await c.scrollIntoViewIfNeeded();
  const b = (await c.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + (minutes / 60) * H };
}

async function attendreLaFeuille(page: Page, de: string, a: string, salle = /Salle de réunion/) {
  const f = feuille(page);
  await expect(f).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-11-15");
  await expect(f.getByLabel("De", { exact: true })).toHaveValue(de);
  await expect(f.getByLabel("À", { exact: true })).toHaveValue(a);
  await expect(f.getByRole("radio", { name: salle })).toBeChecked();
}

test.describe("AR, T3c : gestes de la Grille", () => {
  test("glisser sur des cases vides : la plage au quart d'heure, puis la feuille pré-remplie (ordinateur, tablette)", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "Au téléphone, un appui suffit (test suivant)");
    await ouvrir(page);
    // De 14:03 à 15:26 : la plage couvre les quarts touchés, 14:00 – 15:30.
    const a = await point(page, "reunion", 6 * 60 + 3);
    const b = await point(page, "reunion", 7 * 60 + 26);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x, (a.y + b.y) / 2, { steps: 4 });
    await page.mouse.move(b.x, b.y, { steps: 4 });
    // Pendant le geste, la plage se dessine avec ses heures.
    await expect(colonne(page, "reunion").locator("[data-plage]")).toHaveText(/14:00\s*–\s*15:30/);
    await page.mouse.up();
    await attendreLaFeuille(page, "14:00", "15:30");
    await expect(colonne(page, "reunion").locator("[data-plage]")).toHaveCount(0);
  });

  test("glisser vers le haut : la plage se lit dans l'ordre (ordinateur, tablette)", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "Au téléphone, un appui suffit");
    await ouvrir(page);
    const a = await point(page, "imprimante", 9 * 60 + 40); // 17:40
    const b = await point(page, "imprimante", 8 * 60 + 20); // 16:20
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    await attendreLaFeuille(page, "16:15", "17:45", /Salle imprimante/);
  });

  test("un clic sans glisser ouvre la feuille à l'heure de la case, pour une heure (ordinateur, tablette)", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "Au téléphone : appui");
    await ouvrir(page);
    const p = await point(page, "reunion", 8 * 60 + 30); // au milieu de la case de 16:00
    await page.mouse.click(p.x, p.y);
    await attendreLaFeuille(page, "16:00", "17:00");
  });

  test("au toucher, un appui sur une case suffit (téléphone, tablette)", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("ordinateur"), "Pas d'écran tactile à l'ordinateur");
    await ouvrir(page);
    await caseDe(page, "reunion", "16:00").tap();
    await attendreLaFeuille(page, "16:00", "17:00");
  });

  test("au clavier : Entrée sur une case ouvre la feuille à cette heure ; les flèches changent de case", async ({ page }) => {
    await ouvrir(page);
    const c = caseDe(page, "reunion", "16:00");
    await c.focus();
    await expect(c).toHaveAccessibleName("Réserver Salle de réunion à 16:00");
    // Une seule case dans l'ordre de tabulation : les flèches se déplacent dans la Grille.
    await expect(page.locator('[data-grille-salles] [data-case][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press("ArrowDown");
    await expect(caseDe(page, "reunion", "17:00")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await attendreLaFeuille(page, "16:00", "17:00");
    await page.keyboard.press("Escape");
    await expect(feuille(page)).toHaveCount(0);
    await c.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("[data-grille-salles] [data-case]:focus")).toHaveAttribute("data-case", "16:00");
    await expect(page.locator("[data-grille-salles] [data-case]:focus")).not.toHaveAttribute("data-salle", "reunion");
  });

  test("le toucher d'un bloc ouvre toujours son détail, pas la feuille (SA4)", async ({ page }) => {
    await ouvrir(page);
    await colonne(page, "reunion").locator('[data-bloc][data-debut="19:00"]').click();
    await expect(page.getByRole("dialog", { name: "Préparation des chants" })).toBeVisible();
    await expect(feuille(page)).toHaveCount(0);
  });

  test("la feuille ouverte d'une case s'enregistre comme les autres (Firestore simulé)", async ({ page }) => {
    const db = await ouvrir(page);
    await caseDe(page, "reunion", "16:00").focus();
    await page.keyboard.press("Enter");
    const f = feuille(page);
    await f.getByLabel("Pour quoi").fill("Répétition des chœurs");
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(f).toHaveCount(0);
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data).toMatchObject({ salle: "reunion", date: "2026-11-15", debut: "16:00", fin: "17:00", quoi: "Répétition des chœurs" });
  });

  test("en 中文, la case se nomme dans la langue", async ({ page }) => {
    await ouvrir(page, true);
    await expect(caseDe(page, "reunion", "16:00")).toHaveAccessibleName("预订 Salle de réunion 16:00");
  });
});
