import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, onStage, ouvrirMenu, type Langue } from "./helpers/louange";

// TC-1 (docs/spec-louange-tous-les-chants.md) : le menu Setlist a deux onglets, « Cette setlist | Tous les chants ».
// Toucher un chant l'ajoute (local) après le chant en cours, ou y va s'il y est déjà. Comptes et setlists simulés, noms inventés.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const FR = "setlist-tc-fr";
const ZH = "setlist-tc-zh";
const MUSICIEN: FakeProfile = {
  uid: "uid-tous-les-chants", email: "tous-les-chants@example.com", firstName: "Ondine", lastName: "Bellefeuille",
  planningName: "Ondine Bellefeuille", dansEquipes: ["louange"], sousEquipes: ["musiciens"],
  lieuxLouange: ["Culte Francophone"], joue: ["piano"],
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (title: string, slugs: string[], language: string) => ({
  title, leader: "Basile Corbin", category: "Culte Francophone", date: "2026-11-15", language,
  notes: "", ownerId: "uid-autre", isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});
const DOCS: Record<string, Record<string, unknown>> = {
  [`setlists/${FR}`]: setlist("Culte d'essai tous les chants", ["a-jamais-tu-es-saint", "abba-pere"], "fr"),
  [`setlists/${ZH}`]: setlist("Culte chinois d'essai tous les chants", ["一切都更新", "一生敬拜你"], "zh"),
};

async function ouvrir(page: Page, o: { langue?: Langue; id?: string } = {}) {
  const { langue = "fr", id = FR } = o;
  await page.addInitScript((zh) => {
    try {
      localStorage.setItem("perf-role-preset", "pianiste");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-font-scale", "1.5"); // pas de gestes qui tournent la page pendant les essais
    } catch { /* ignore */ }
  }, langue === "zh");
  await signInAs(page, MUSICIEN, DOCS, `/setlists/${id}?louange=1`);
  await attendreMiseEnPage(page);
}

const barre = (page: Page) => page.locator("[data-performance-mode] [data-barre-haut]");
const onglet = (d: ReturnType<Page["getByRole"]>, o: "setlist" | "chants") => d.locator(`[role=tab][data-onglet="${o}"]`);
async function ouvrirChants(page: Page, langue: Langue = "fr") {
  const d = await ouvrirMenu(page, "setlist", langue);
  await onglet(d, "chants").click();
  await expect(d.locator("[data-tous-les-chants]")).toBeVisible();
  return d;
}
const chercher = async (d: ReturnType<Page["getByRole"]>, q: string) => d.locator("input[data-recherche-chants]").fill(q);
const ligne = (d: ReturnType<Page["getByRole"]>, slug: string) => d.locator(`[data-chant-slug="${slug}"]`);

test.describe("« Tous les chants » dans le menu Setlist", () => {
  test("onglets sous « Toutes mes setlists », liste, interrupteur, index ; rouvre sur le dernier onglet ; Échap ferme le menu, pas le mode", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirMenu(page, "setlist");
    const tout = (await d.locator("[data-toutes-setlists]").boundingBox())!;
    const onglets = (await d.locator("[data-onglets-setlist]").boundingBox())!;
    expect(onglets.y, "les onglets sont sous la ligne « Toutes mes setlists »").toBeGreaterThan(tout.y);
    await expect(onglet(d, "setlist")).toHaveAttribute("aria-selected", "true");
    await onglet(d, "chants").click();
    await expect(onglet(d, "chants")).toHaveAttribute("aria-selected", "true");
    await expect(d.locator("input[data-recherche-chants]")).toBeVisible();
    await expect(d.locator("[data-jianpu-ajout=avec]")).toHaveAttribute("aria-pressed", "true");
    await expect(d.locator("[data-jianpu-ajout=sans]")).toHaveAttribute("aria-pressed", "false");
    await expect(ligne(d, "abba-pere")).toBeVisible();
    await expect(d.locator("[data-index-tlc]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    const d2 = await ouvrirMenu(page, "setlist");
    await expect(onglet(d2, "chants")).toHaveAttribute("aria-selected", "true");
  });

  test("recherche : « lum », « 你的 » et « ni de » ; « Dans la setlist » sur un chant déjà là", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirChants(page);
    await chercher(d, "lum");
    await expect(ligne(d, "lumiere-du-monde")).toBeVisible();
    await chercher(d, "你的");
    await expect(ligne(d, "你的同在")).toBeVisible();
    await chercher(d, "ni de");
    await expect(ligne(d, "你的同在")).toBeVisible();
    await chercher(d, "abba");
    await expect(ligne(d, "abba-pere")).toContainText("Dans la setlist");
  });

  test("toucher un chant l'insère après le chant en cours ; un chant déjà dans la setlist : on y va, sans ajout", async ({ page }) => {
    await ouvrir(page);
    const avant = await lireCompteur(page);
    const d = await ouvrirChants(page);
    await chercher(d, "lum");
    await page.waitForTimeout(400);
    expect(await lireCompteur(page), "toucher dans le menu ne tourne pas la page").toBe(avant);
    await expect(barre(page)).toContainText("À jamais Tu es saint");
    await ligne(d, "lumiere-du-monde").click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("Lumière du monde", { timeout: 15_000 });
    await expect.poll(() => lireCompteur(page)).not.toBe(avant);
    const d2 = await ouvrirMenu(page, "setlist");
    await onglet(d2, "setlist").click();
    const lignes = d2.locator("ol > li");
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(1)).toContainText("Lumière du monde");
    await onglet(d2, "chants").click();
    await chercher(d2, "abba");
    await ligne(d2, "abba-pere").click();
    await expect(d2).toBeHidden();
    await expect(barre(page)).toContainText("Abba", { timeout: 15_000 });
    const d3 = await ouvrirMenu(page, "setlist");
    await onglet(d3, "setlist").click();
    await expect(d3.locator("ol > li")).toHaveCount(3);
    // Le chant en cours porte la coche : le « + » du chant ajouté se voit une fois parti sur un autre chant.
    await expect(d3.locator("ol > li").nth(1)).toContainText("+");
  });

  test("« Avec 简谱 » ouvre 你的同在 sur son scan", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirChants(page);
    await chercher(d, "你的");
    await ligne(d, "你的同在").click();
    await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible({ timeout: 15_000 });
  });

  test("« Sans » ouvre 你的同在 en paroles, et la valeur est retenue", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirChants(page);
    await d.locator("[data-jianpu-ajout=sans]").click();
    await expect(d.locator("[data-jianpu-ajout=sans]")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => localStorage.getItem("louange-ajout-jianpu"))).toBe("0");
    await chercher(d, "你的");
    await ligne(d, "你的同在").click();
    await expect(barre(page)).toContainText("你的同在", { timeout: 15_000 });
    await expect(onStage(page, "[data-jianpu-page]")).toHaveCount(0);
    const d2 = await ouvrirMenu(page, "setlist");
    await expect(d2.locator("[data-jianpu-ajout=sans]")).toHaveAttribute("aria-pressed", "true");
  });

  test("ordinateur seulement : « / » ouvre le menu sur « Tous les chants », champ actif", async ({ page, isMobile }) => {
    test.skip(isMobile || page.viewportSize()!.width < 1024, "raccourci clavier : ordinateur");
    await ouvrir(page);
    await page.keyboard.press("/");
    const d = page.getByRole("dialog", { name: "Setlist", exact: true });
    await expect(d).toBeVisible();
    await expect(onglet(d, "chants")).toHaveAttribute("aria-selected", "true");
    await expect(d.locator("input[data-recherche-chants]")).toBeFocused();
  });

  test("interface en chinois : onglets, interrupteur, champ", async ({ page }) => {
    await ouvrir(page, { langue: "zh", id: ZH });
    const d = await ouvrirChants(page, "zh");
    await expect(onglet(d, "setlist")).toHaveText("本歌单");
    await expect(onglet(d, "chants")).toHaveText("全部诗歌");
    await expect(d.locator("[data-jianpu-ajout=avec]")).toHaveText("用简谱");
    await expect(d.locator("[data-jianpu-ajout=sans]")).toHaveText("不用");
    await expect(d.locator("input[data-recherche-chants]")).toHaveAttribute("placeholder", "搜索诗歌");
  });

  test("captures", async ({ page }, testInfo) => {
    mkdirSync("test-results/captures-tc1", { recursive: true });
    await ouvrir(page);
    await ouvrirChants(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/captures-tc1/${testInfo.project.name}-liste.png` });
    await page.keyboard.press("Escape");
    await page.goto("about:blank");
    await ouvrir(page, { langue: "zh", id: ZH });
    await ouvrirChants(page, "zh");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/captures-tc1/${testInfo.project.name}-zh.png` });
  });
});
