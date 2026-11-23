import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, curseurPage, lireCompteur, onStage, ouvrirMenu, type Langue } from "./helpers/louange";

// TC-1 (docs/spec-louange-tous-les-chants.md) : le menu Setlist a deux onglets, « Mes setlists | Tous les chants ».
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
  test("onglets en tête, liste, interrupteur, index ; autres setlists sous la liste numérotée, absentes de « Tous les chants » ; rouvre sur le dernier onglet ; Échap ferme le menu, pas le mode", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirMenu(page, "setlist");
    const onglets = (await d.locator("[data-onglets-setlist]").boundingBox())!;
    for (const sel of ["[data-toutes-setlists]", "[data-autre-setlist]"]) {
      for (const y of await d.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top))) {
        expect(y, "aucune ligne de setlist au-dessus des onglets").toBeGreaterThan(onglets.y);
      }
    }
    const liste = (await d.locator("ol").boundingBox())!;
    await d.locator("[data-toutes-setlists]").scrollIntoViewIfNeeded();
    expect((await d.locator("[data-toutes-setlists]").boundingBox())!.y, "« Mes autres setlists » sous la liste numérotée").toBeGreaterThan(liste.y);
    await expect(onglet(d, "setlist")).toHaveAttribute("aria-selected", "true");
    await onglet(d, "chants").click();
    await expect(onglet(d, "chants")).toHaveAttribute("aria-selected", "true");
    await expect(d.locator("input[data-recherche-chants]")).toBeVisible();
    await expect(d.locator("[data-toutes-setlists], [data-autre-setlist]")).toHaveCount(0);
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

  test("flèches Droite et Gauche changent d'onglet et déplacent le focus", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirMenu(page, "setlist");
    await onglet(d, "setlist").focus();
    await page.keyboard.press("ArrowRight");
    await expect(onglet(d, "chants")).toHaveAttribute("aria-selected", "true");
    await expect(onglet(d, "chants")).toBeFocused();
    await expect(onglet(d, "chants")).toHaveAttribute("tabindex", "0");
    await expect(onglet(d, "setlist")).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("ArrowLeft");
    await expect(onglet(d, "setlist")).toHaveAttribute("aria-selected", "true");
    await expect(onglet(d, "setlist")).toBeFocused();
  });

  test("après un ajout depuis « Tous les chants », le menu rouvert est sur l'onglet setlist", async ({ page }) => {
    await ouvrir(page);
    const d = await ouvrirChants(page);
    await chercher(d, "lum");
    await ligne(d, "lumiere-du-monde").click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("Lumière du monde", { timeout: 15_000 });
    const d2 = await ouvrirMenu(page, "setlist");
    await expect(onglet(d2, "setlist")).toHaveAttribute("aria-selected", "true");
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
    await onglet(d2, "chants").click(); // le menu rouvre sur l'onglet setlists après un ajout
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
    await expect(onglet(d, "setlist")).toHaveText("我的歌单");
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

// TC-2 : marques d'un chant ajouté (points creux, « + », « Retirer »), « Revenir à … », Crayon masqué, hors ligne.
test.describe("TC-2 : chants ajoutés", () => {
  /** Ajoute un chant depuis l'onglet « Tous les chants » ; le menu se ferme et la page va sur lui. */
  async function ajouter(page: Page, recherche: string, slug: string, titre: string) {
    const d = await ouvrirChants(page);
    await chercher(d, recherche);
    await ligne(d, slug).click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText(titre, { timeout: 15_000 });
  }
  async function menuSetlist(page: Page) {
    const d = await ouvrirMenu(page, "setlist");
    await onglet(d, "setlist").click();
    return d;
  }

  test("points creux, « + » et « Retirer » sur un chant ajouté (un FR, un ZH)", async ({ page }) => {
    await ouvrir(page);
    await expect(page.locator("[data-performance-mode] [data-curseur-page] [data-point][data-ajout]")).toHaveCount(0);
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    await ajouter(page, "你的", "你的同在", "你的同在");
    await ajouter(page, "abba", "abba-pere", "Abba");
    await expect(page.locator("[data-performance-mode] [data-curseur-page] [data-point][data-ajout]").first()).toBeAttached();
    await expect(page.locator("[data-performance-mode] [data-curseur-page] [data-point]:not([data-ajout])").first()).toBeAttached();
    const d = await menuSetlist(page);
    const lignes = d.locator("ol > li");
    await expect(lignes).toHaveCount(4);
    for (const i of [1, 2]) {
      await expect(lignes.nth(i)).toContainText("+");
      await expect(lignes.nth(i).locator("[data-retirer]")).toHaveText("Retirer");
      expect((await lignes.nth(i).locator("[data-retirer]").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(d.locator("[data-retirer]")).toHaveCount(2);
  });

  test("« Retirer » le chant en cours : la ligne disparaît, la page revient au chant précédent, le menu reste ouvert", async ({ page }) => {
    await ouvrir(page);
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    const d = await menuSetlist(page);
    await expect(d.locator("ol > li")).toHaveCount(3);
    await d.locator("ol > li").nth(1).locator("[data-retirer]").click();
    await expect(d.locator("ol > li")).toHaveCount(2);
    await expect(d).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("À jamais Tu es saint", { timeout: 15_000 });
  });

  test("« Retirer » une ligne qui n'est pas le chant en cours : le chant en cours reste, le focus reste dans le menu", async ({ page }) => {
    await ouvrir(page);
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    await ajouter(page, "你的", "你的同在", "你的同在");
    // 你的同在 arrive juste après le chant en cours (Lumière) : on vérifie l'ordre affiché.
    let d = await menuSetlist(page);
    const lignes = d.locator("ol > li");
    await expect(lignes).toHaveCount(4);
    await expect(lignes.nth(1)).toContainText("Lumière du monde");
    await expect(lignes.nth(2)).toContainText("你的同在");
    await lignes.nth(1).locator("button").first().click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("Lumière du monde", { timeout: 15_000 });
    d = await menuSetlist(page);
    await expect(lignes.nth(2)).toContainText("你的同在");
    await lignes.nth(2).locator("[data-retirer]").click();
    await expect(lignes).toHaveCount(3);
    await expect(lignes.filter({ hasText: "你的同在" })).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.tagName), "le focus n'est pas tombé sur body").not.toBe("BODY");
    expect(await d.evaluate((el) => el.contains(document.activeElement)), "le focus est dans le menu").toBe(true);
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("Lumière du monde");
  });

  test("zh : « 移除 » sur la ligne ajoutée et « 返回 » dans la ligne de retour", async ({ page }) => {
    await ouvrir(page, { langue: "zh", id: ZH });
    let d = await ouvrirMenu(page, "setlist", "zh");
    await onglet(d, "chants").click();
    await chercher(d, "你的");
    await ligne(d, "你的同在").click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("你的同在", { timeout: 15_000 });
    d = await ouvrirMenu(page, "setlist", "zh");
    await onglet(d, "setlist").click();
    await expect(d.locator("[data-retirer]")).toHaveText("移除");
    await expect(d.locator("[data-revenir]")).toContainText("返回《");
  });

  test("« Revenir à … » ramène au chant et à la page notés", async ({ page }) => {
    await ouvrir(page);
    // Page 2 du chant si le chant en a deux, sinon page 1.
    await curseurPage(page).focus();
    await page.keyboard.press("PageDown");
    const noté = await lireCompteur(page);
    const pageNotee = Number(noté.split(" / ")[0]);
    expect(pageNotee, "le chant a au moins deux pages").toBe(2);
    await expect(barre(page)).toContainText("À jamais Tu es saint");
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    const d = await menuSetlist(page);
    const revenir = d.locator("[data-revenir]");
    await expect(revenir).toContainText(`Revenir à « À jamais Tu es saint », page ${pageNotee}`);
    expect((await revenir.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await revenir.click();
    await expect(d).toBeHidden();
    await expect(barre(page)).toContainText("À jamais Tu es saint", { timeout: 15_000 });
    // Le chant ajouté reste dans la suite : le total grandit, la page notée ne bouge pas.
    await attendreCompteur(page, new RegExp(`^${pageNotee} / `));
    const d2 = await ouvrirMenu(page, "setlist");
    await expect(d2.locator("[data-revenir]")).toHaveCount(0);
  });

  test("le Crayon est absent sur un chant ajouté (ordinateur et tablette)", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, "téléphone : le bouton Crayon n'est pas dans la barre");
    await ouvrir(page);
    const crayon = page.locator("[data-performance-mode]").getByRole("button", { name: "Crayon", exact: true });
    await expect(crayon).toBeVisible({ timeout: 15_000 });
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    await expect(crayon).toHaveCount(0);
  });

  test("hors ligne : phrase en tête, chants gardés ouverts, les autres grisés et inertes", async ({ page, context }) => {
    await ouvrir(page);
    const d = await ouvrirChants(page);
    await page.evaluate(() => caches.open("test-tc").then((c) => c.put("/api/song/lumiere-du-monde", new Response("{}"))));
    try {
      await context.setOffline(true);
      await expect(d.locator("[data-hors-ligne]")).toHaveText("Hors ligne : seuls les chants gardés sur cet appareil s'ouvrent.");
      await chercher(d, "lum");
      await expect(ligne(d, "lumiere-du-monde")).not.toHaveAttribute("data-indisponible", /.*/);
      await chercher(d, "你的");
      const grise = ligne(d, "你的同在");
      await expect(grise).toHaveAttribute("aria-disabled", "true");
      await expect(grise).toContainText("Pas sur cet appareil");
      // aria-disabled : Playwright refuse le clic ordinaire ; on force pour vérifier que le toucher ne fait rien.
      await grise.click({ force: true });
      await expect(d).toBeVisible();
      await onglet(d, "setlist").click();
      await expect(d.locator("ol > li")).toHaveCount(2);
    } finally {
      await context.setOffline(false);
    }
  });

  test("fermer le mode puis le rouvrir : aucun chant ajouté", async ({ page }) => {
    await ouvrir(page);
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    await page.getByRole("button", { name: "Quitter" }).click();
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
    await page.getByRole("button", { name: "Mode Louange" }).first().click();
    await attendreMiseEnPage(page);
    const d = await menuSetlist(page);
    await expect(d.locator("ol > li")).toHaveCount(2);
    await expect(d.locator("[data-retirer]")).toHaveCount(0);
  });

  test("captures", async ({ page, context }, testInfo) => {
    const dossier = "test-results/captures-tc2";
    mkdirSync(dossier, { recursive: true });
    const nom = (x: string) => `${dossier}/${testInfo.project.name}-${x}.png`;
    await ouvrir(page);
    await ajouter(page, "lum", "lumiere-du-monde", "Lumière du monde");
    await ajouter(page, "你的", "你的同在", "你的同在");
    await page.waitForTimeout(500);
    await page.screenshot({ path: nom("points") });
    await menuSetlist(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: nom("setlist") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const d = await ouvrirChants(page);
    try {
      await context.setOffline(true);
      await expect(d.locator("[data-hors-ligne]")).toBeVisible();
      await chercher(d, "a");
      await page.waitForTimeout(500);
      await page.screenshot({ path: nom("hors-ligne") });
    } finally {
      await context.setOffline(false);
    }
  });
});
