import { expect, test, type Page } from "@playwright/test";
import { openSheet } from "./helpers/jianpu";

// Lot JE, JE3 et JE4 (docs/spec-jianpu-entete-statistiques.md) : l'en-tête de la page chant
// (sous-titre, référence biblique, ligne « mesure · ♩ » ; le « 1= » est dans l'armure depuis RU-3) et les deux colonnes sur 简谱
// quand la colonne du chant a la place (décision de Timothée du 31/10/2026).

const SLUG = "回家";
const normaliser = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

async function enParoles(page: Page) {
  await page.getByRole("radiogroup", { name: "简谱 · Paroles" }).getByRole("radio", { name: "Paroles" }).click();
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
}

test("回家 en 简谱 : sous-titre, référence biblique, armure « 1=D » et « 4/4 · ♩ = 66 » sans « 1= » ; en paroles de même", async ({ page }) => {
  await openSheet(page, SLUG);
  await expect(page.getByTestId("sous-titre")).toHaveText("Coming Home");
  await expect(page.getByTestId("reference-biblique")).toHaveText("路15:11-32");
  await expect(page.getByTestId("ligne-tempo")).toBeVisible();
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("4/4 · ♩ = 66");
  await expect(page.getByTestId("armure")).toHaveText("1=D");

  await enParoles(page);
  await expect(page.getByTestId("sous-titre")).toHaveText("Coming Home");
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("4/4 · ♩ = 66");
});

test("回家 transposé en E, vue 简谱 : l'armure dit « 1=E », la ligne de tempo n'a pas de « 1= »", async ({ page }) => {
  await openSheet(page, SLUG, { key: "E" });
  await expect(page.getByTestId("ligne-tempo")).toBeVisible();
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("4/4 · ♩ = 66");
  await expect(page.getByTestId("armure")).toHaveText("1=E");
});

test("un chant français sans {time} ni {subtitle} : ni sous-titre ni référence, la ligne se réduit au tempo", async ({ page }) => {
  await page.goto("/songs/aucune-peur");
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.getByTestId("sous-titre")).toHaveCount(0);
  await expect(page.getByTestId("reference-biblique")).toHaveCount(0);
  expect(normaliser(await page.getByTestId("ligne-tempo").textContent())).toBe("♩ = 95");
});

test("aux tailles des projets : une colonne, l'en-tête est au-dessus du scan", async ({ page }) => {
  await openSheet(page, SLUG);
  const [liste, scan] = await Promise.all([
    page.getByRole("list", { name: "Structure" }).boundingBox(),
    page.locator("[data-jianpu-fenetre]").first().boundingBox(),
  ]);
  expect(liste!.y + liste!.height).toBeLessThanOrEqual(scan!.y);
});

test("(ordinateur, 1920 px) une colonne aussi sur grand écran : l'en-tête au-dessus du scan", async ({ page }, info) => {
  // Timothée, 31/10/2026 : les deux colonnes A2 sont retirées, une colonne à toutes les tailles.
  test.skip(info.project.name !== "ordinateur", "mesuré au projet ordinateur, élargi à 1920 px");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openSheet(page, SLUG);
  const [liste, scan] = await Promise.all([
    page.getByRole("list", { name: "Structure" }).boundingBox(),
    page.locator("[data-jianpu-fenetre]").first().boundingBox(),
  ]);
  expect(liste!.y + liste!.height).toBeLessThanOrEqual(scan!.y);
});

// chants-11 : la ligne de l'auteur est un crédit (12 px, 16 px de ligne, 8 px au-dessus), le latin en Atkinson 400.
// Lot CD, T4a (P13) : gris, il passe à 13 px dès 1 024 px de fenêtre ; son `leading-4` garde la ligne de 16 px.
for (const [slug, nom] of [["一切歌颂赞美", "chant chinois"], ["aucune-peur", "chant français"]] as const) {
  test(`${nom} : la ligne de l'auteur est un crédit de 12 px, 8 px sous le groupe du titre, en graisse 400`, async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const auteur = page.getByTestId("auteur");
    await expect(auteur).toBeVisible();
    const style = await auteur.evaluate((el) => {
      const s = getComputedStyle(el);
      return { taille: s.fontSize, hauteur: s.lineHeight, marge: s.marginTop, graisse: s.fontWeight, police: s.fontFamily };
    });
    expect(style.taille).toBe(page.viewportSize()!.width >= 1024 ? "13px" : "12px");
    expect(style.hauteur).toBe("16px");
    expect(style.marge).toBe("8px");
    expect(style.graisse).toBe("400");
    // Pile Atkinson d'abord (le latin y prend sa graisse 400), puis Source Han (chant chinois) pour les seuls caractères chinois.
    const familles = style.police.split(",").map((f) => f.trim());
    expect(familles[0], "Atkinson en tête de pile").toMatch(/chord_font/);
    if (slug === "一切歌颂赞美") {
      const zh = familles.findIndex((f) => /zh_lyric_font/.test(f));
      expect(zh, "Source Han après Atkinson").toBeGreaterThan(0);
    }
  });
}

// chants-10 : ligne de tempo à 12 px au téléphone, 13 px dès 768 px, « ♩ = 92 » à espaces fines insécables.
test("ligne de tempo : 12 px au téléphone, 13 px dès 768 px, espaces fines autour du signe égal", async ({ page }) => {
  await page.goto("/songs/aucune-peur");
  const ligne = page.getByTestId("ligne-tempo");
  await expect(ligne).toBeVisible();
  const largeur = page.viewportSize()!.width;
  expect(await ligne.evaluate((el) => getComputedStyle(el).fontSize)).toBe(largeur >= 768 ? "13px" : "12px");
  expect(await ligne.textContent()).toBe("♩ = 95");
  expect(await ligne.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "la ligne ne déborde pas").toBe(true);
});
