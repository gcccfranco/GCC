import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Harmonie H6-1 (docs/spec-harmonie-accords.md) : la bibliothèque. Filtres Ressenti et Usage, liste à plat
// ordonnée par niveau, lignes sans troncature, parcours replié, fiche large en deux volets. Personne fictive.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Léa M.", "", "", "Mathilde R.", "", "", "", "", "", "", ""],
]);
const MATHILDE: FakeProfile = { uid: "uid-mathilde", email: "mathilde.r@example.com", planningName: "Mathilde R.", ...musicien("piano") };

const LIGNES = "[data-harmonie] a[href^='/harmonie/']:not([href^='/harmonie/cours']):not([href^='/harmonie/rd2000']):not([data-parcours] a)";

async function ouvrir(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MATHILDE, {}, "/harmonie");
  await expect(page.locator(LIGNES).first()).toBeVisible();
}

for (const [rangee, mot] of [["Ressenti", "Chaleureux"], ["Usage", "Refrain"]] as const) {
  test(`le filtre ${rangee} « ${mot} » réduit la liste, chaque ligne le porte ; un second appui rend tout`, async ({ page }) => {
    await ouvrir(page);
    const lignes = page.locator(LIGNES);
    const total = await lignes.count();
    const pilule = page.getByRole("group", { name: rangee }).getByRole("button", { name: mot, exact: true });
    await pilule.click();
    await expect.poll(() => lignes.count()).toBeLessThan(total);
    const textes = await lignes.allTextContents();
    expect(textes.length).toBeGreaterThan(0);
    for (const t of textes) expect(t).toContain(mot);
    await pilule.click();
    await expect.poll(() => lignes.count()).toBe(total);
  });
}

test("le niveau ordonne la liste : aucune fiche « Facile » après une « Intermédiaire » ou « Avancé »", async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByText("Du plus simple au plus avancé")).toBeVisible();
  const rang = (t: string) => (/Facile\s*$/.test(t) ? 0 : /Intermédiaire\s*$/.test(t) ? 1 : /Avancé\s*$/.test(t) ? 2 : 3);
  const rangs = (await page.locator(LIGNES).allTextContents()).map(rang);
  expect(rangs).toContain(0);
  expect(rangs).toContain(2);
  expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
});

test("aucune ligne de sous-titre n'est tronquée", async ({ page }) => {
  await ouvrir(page);
  const m = await page.locator(`${LIGNES} .text-muted-foreground`).evaluateAll((els) =>
    els.map((el) => ({ coupe: el.scrollHeight > el.clientHeight + 1, points: getComputedStyle(el).textOverflow === "ellipsis" })),
  );
  expect(m.length).toBeGreaterThan(0);
  expect(m.filter((x) => x.coupe || x.points)).toEqual([]);
});

test("« Par où commencer » est replié au départ, puis se déplie sur place", async ({ page }) => {
  await ouvrir(page);
  const bouton = page.locator("[data-parcours]").getByRole("button", { name: /Par où commencer/ });
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-parcours]").getByRole("link")).toHaveCount(3);
});

test("ordinateur : la fiche a au moins 640 px de large (liste de 280 px)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "ordinateur 1 280 seulement");
  await ouvrir(page);
  const b = await page.locator('[data-volet="detail"]').boundingBox();
  expect(b!.width).toBeGreaterThanOrEqual(640);
});
