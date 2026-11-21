import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { verifierSansDebordement } from "./helpers/agencement";
import { PLANNING_COLORS } from "../src/lib/serviceColors";

// Lot « Image de fête », IF-2 (docs/spec-scene-saison.md) : la carte de la fête de la page Église prend, avec une
// image, le gabarit de l'épinglé avec image (image 16:9 en tête, texte dessous) ; sans image, le bandeau bleu.

const NOEL = { nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", fin: "2026-12-20", ouvert: true, passages: [], createdBy: "uid-ophelia", updatedAt: "2026-09-14T20:00:00Z" };
const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="#3a7"/></svg>')}`;
const EPINGLE = {
  titre: "Gala d'hiver", type: "loisir", pour: "eglise", date: "2026-12-12", heure: "18:30", heureFin: "", dateFin: "", lieu: "Salle des fêtes", description: "",
  liens: [], images: [IMAGE], placesMax: null, inscriptions: "fermees", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-solenne", organisateurNom: "Solenne", epingle: true, expiresAt: null, inscrits: 0,
  createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z",
};
const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", serviceRoles: { "Groupe Paix": ["chanteur"] } };

/** Le 01/12 : Noël dans 23 jours, réservations ouvertes ; `image` null : la fête sans image. */
async function ouvrir(page: Page, image: string | null, plus: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-12-01T10:00:00"));
  const programmesLus = page.waitForResponse((r) => r.url().includes(":runQuery") && (r.request().postData() ?? "").includes('"programmes"'));
  await signInAs(page, LEA, { "programmes/noel-2026": image ? { ...NOEL, image } : NOEL, ...plus }, "/evenements");
  await programmesLus;
}
const carte = (page: Page) => page.getByTestId("carte-fete");
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES ?? "test-results/evenements-fete-image";
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}
const tablettePortrait = () => test.info().project.name.includes("tablette") && !test.info().project.name.includes("paysage");

test("(a) sans image : bandeau bleu, ni data-image ni img", async ({ page }) => {
  await ouvrir(page, null);
  await expect(carte(page)).toBeVisible();
  await expect(carte(page)).not.toHaveAttribute("data-image", /.*/);
  const bleu = await page.evaluate((c) => { const d = document.createElement("div"); d.style.background = c; document.body.appendChild(d); const r = getComputedStyle(d).backgroundColor; d.remove(); return r; }, PLANNING_COLORS.scene);
  await expect(carte(page)).toHaveCSS("background-color", bleu);
  await expect(carte(page).locator("img")).toHaveCount(0);
  await capture(page, "a-sans-image");
});

test("(b) avec image : 16:9 en tête, titre, « dans 23 jours », « Réserver » et « Voir la fête »", async ({ page }) => {
  await ouvrir(page, IMAGE);
  const c = carte(page);
  await expect(c).toHaveAttribute("data-image", "1");
  const img = c.locator('img[alt=""]');
  await expect(img).toBeVisible();
  const [bi, bt, bc] = [await img.boundingBox(), await c.getByRole("heading", { name: "Noël 2026" }).boundingBox(), await c.boundingBox()];
  expect(Math.abs(bi!.width / bi!.height - 16 / 9)).toBeLessThan(0.05);
  expect(Math.abs(bi!.y - bc!.y)).toBeLessThan(2);
  expect(bt!.y).toBeGreaterThanOrEqual(bi!.y + bi!.height - 1);
  await expect(c).toContainText("dans 23 jours");
  await expect(c.getByRole("link", { name: "Réserver la Grande salle" })).toHaveAttribute("href", /^\/evenements\/scene\/noel\/?\?reserver=1$/);
  await expect(c.getByRole("link", { name: "Voir la fête" })).toBeVisible();
  await verifierSansDebordement(page);
  expect(bc!.x + bc!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await capture(page, "b-image");
});

test("(c) avec image + un épinglé avec image : côte à côte en tablette portrait, l'un sous l'autre sinon", async ({ page }) => {
  await ouvrir(page, IMAGE, { "evenements/gala": EPINGLE });
  await expect(carte(page)).toHaveAttribute("data-image", "1");
  await page.waitForTimeout(300);
  const f = (await carte(page).boundingBox())!;
  const e = (await page.getByTestId("carte-epingle").boundingBox())!;
  if (tablettePortrait()) {
    expect(Math.abs(f.y - e.y)).toBeLessThan(2);
    expect(f.x).toBeLessThan(e.x);
    expect(Math.abs(f.height - e.height)).toBeLessThan(2);
  } else {
    expect(e.y).toBeGreaterThanOrEqual(f.y + f.height + 16);
  }
  await capture(page, "c-fete-epingle");
});

test("(d) thème sombre avec image : titre lisible", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.emulateMedia({ colorScheme: "dark" });
  await ouvrir(page, IMAGE);
  await expect(carte(page)).toHaveAttribute("data-image", "1");
  const titre = carte(page).getByRole("heading", { name: "Noël 2026" });
  await expect(titre).toBeVisible();
  // Couleur calculée ramenée en RGB par un canvas (Tailwind peut la donner en oklch).
  const [r, g, b] = await titre.evaluate((el) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = getComputedStyle(el).color; ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  });
  expect(0.299 * r + 0.587 * g + 0.114 * b).toBeGreaterThan(150);
  await capture(page, "d-sombre");
});

test("(e) 中文 avec image : « 圣诞节 2026 » et « 预约大厅 »", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, IMAGE);
  await expect(carte(page)).toHaveAttribute("data-image", "1");
  await expect(carte(page).getByRole("heading", { name: "圣诞节 2026" })).toBeVisible();
  await expect(carte(page).getByRole("link", { name: "预约大厅" })).toBeVisible();
  await capture(page, "e-zh");
});
