import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { marge, ouvrirMarge } from "./helpers/marge";

// La marge « Affichage » (docs/spec-reglages-unifies.md, RU-2), montée sur la page chant (RU-3) : colonne de
// 320 px qui pousse la musique dès 1 024 px, feuille basse opaque de 40 % (560 px dès 768 px) sans voile en dessous,
// deux groupes (plus de « Je joue » sur la page chant) et une mention de portée chacun, réglages retenus sous les clés existantes, mouvement.

const MUSICIEN: FakeProfile = { uid: "uid-banc", email: "banc@example.com", firstName: "Camille", lastName: "B." };
const CHANTS = [
  { slug: "abba-pere", zh: false },
  { slug: "一生爱你", zh: true },
] as const;

// La musique : la zone de lecture de la page chant, à gauche de la colonne.
const musique = (page: Page) => page.locator("main.song-zoom");

async function ouvrir(page: Page, slug: string, opts: { zh?: boolean } = {}) {
  if (opts.zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  await signInAs(page, MUSICIEN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(musique(page)).toBeVisible();
  await ouvrirMarge(page);
}

for (const chant of CHANTS) {
  test.describe(`marge Affichage — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("disposition selon la largeur ; captures ; deux groupes et deux mentions de portée", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const vp = page.viewportSize()!;
      const m = (await marge(page).boundingBox())!;
      const zone = (await musique(page).boundingBox())!;
      // Colonne seulement si la musique garde 340 px (RU-3) : sinon feuille de 560 px, même dès 1 024 px.
      const place = await marge(page).getAttribute("data-place");
      if (vp.width < 1024) expect(place).toBe(vp.width < 768 ? "feuille" : "feuille-large");
      if (place === "colonne") {
        expect(m.width).toBeCloseTo(320, 0);
        expect(zone.width).toBeGreaterThanOrEqual(340);
        const armure = page.getByTestId("armure");
        const droite = (await armure.count()) ? (await armure.boundingBox())!.x + (await armure.boundingBox())!.width : zone.x + zone.width;
        expect(m.x - droite, "écart musique / filet de la colonne").toBeGreaterThanOrEqual(16);
        expect(zone.x + zone.width).toBeLessThanOrEqual(m.x + 0.5);
        // Aux grandes largeurs la page chant est dans la carte « chants » : la colonne en suit le bord intérieur (marge de page + 24 px de remplissage).
        const carte = page.locator(".chants-chant");
        const bord = (await carte.count()) ? await carte.evaluate((el) => el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight)) : vp.width;
        expect(m.x + m.width).toBeCloseTo(bord, 0);
      } else {
        // En deux volets, la feuille se centre sur le volet du chant : 560 px au plus, moins si le volet est plus étroit.
        const volet = page.locator(".chants-chant");
        if (vp.width >= 768 && (await volet.count())) expect(m.width).toBeLessThanOrEqual(560.5);
        else expect(m.width).toBeCloseTo(vp.width >= 768 ? 560 : vp.width, 0);
        expect(m.height).toBeCloseTo(0.4 * vp.height, 0);
        expect(m.y + m.height).toBeLessThanOrEqual(vp.height + 0.5);
        const fond = await marge(page).evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(fond).not.toMatch(/rgba\(.*,\s*0(\.\d+)?\)$/);
        expect(fond).not.toBe("transparent");
      }
      await expect(page.locator("[data-groupe]")).toHaveCount(2);
      await expect(marge(page).getByText(chant.zh ? "保存在本设备" : "Retenu sur cet appareil", { exact: true })).toHaveCount(2);
      await expect(marge(page).getByRole("heading", { level: 2 })).toHaveText(chant.zh ? "显示" : "Affichage");
      await expect(marge(page).getByRole("button", { name: chant.zh ? "关闭显示" : "Fermer l'affichage" })).toBeVisible();
      await expect(marge(page).getByRole("radio", { name: chant.zh ? "钢琴手" : "Pianiste" })).toHaveCount(0);
      if (chant.zh) await expect(marge(page).getByText("每段一次")).toBeVisible();
      await page.screenshot({ path: `test-results/marge-affichage-captures/${test.info().project.name}-${chant.zh ? "zh" : "fr"}.png` });
    });

    test("pas de groupe « Je joue » sur la page chant : tout est montré", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      await expect(marge(page).getByText(chant.zh ? "我演奏" : "Je joue")).toHaveCount(0);
      await expect(marge(page).getByRole("radiogroup", { name: chant.zh ? "我演奏" : "Je joue" })).toHaveCount(0);
      await expect(marge(page).getByText(chant.zh ? "和弦颜色" : "Couleur des accords")).toBeVisible();
      await expect(marge(page).getByRole("switch", { name: chant.zh ? "和弦" : "Accords" })).toBeVisible();
      await expect(marge(page).locator("[data-notation]").first()).toBeVisible();
    });

    test("le bouton Accords de la barre et l'interrupteur de la marge restent synchronisés", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const bouton = page.getByTestId("barre-outils").getByRole("button", { name: chant.zh ? "和弦" : "Accords", exact: true });
      const inter = marge(page).getByRole("switch", { name: chant.zh ? "和弦" : "Accords" });
      await expect(bouton).toHaveAttribute("aria-pressed", "true");
      await bouton.click();
      await expect(inter).not.toBeChecked();
      await expect(bouton).toHaveAttribute("aria-pressed", "false");
      await inter.click();
      await expect(bouton).toHaveAttribute("aria-pressed", "true");
    });
  });
}

test.describe("marge Affichage — mesures", () => {
  test("412 × 700 : feuille opaque de 40 %, sans voile, dernier réglage atteignable et entièrement visible", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "一生爱你", { zh: true });
    const m = (await marge(page).boundingBox())!;
    expect(m.height).toBeCloseTo(280, 0);
    expect(m.y + m.height).toBeLessThanOrEqual(700.5);
    const dernier = marge(page).locator("[data-groupe]").last().locator("p").last();
    await dernier.scrollIntoViewIfNeeded();
    const b = (await dernier.boundingBox())!;
    const corps = (await page.getByTestId("marge-corps").boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(corps.y - 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(Math.min(corps.y + corps.height, 700) + 0.5);
    // Rien ne couvre le dernier réglage (barre d'onglets, bouton flottant) : le point visé appartient à la marge.
    const couvert = await dernier.evaluate((el) => {
      const r = el.getBoundingClientRect();
      // Centre du réglage : la pastille de Next en développement (nextjs-portal, coin bas gauche) n'existe pas en ligne.
      const haut = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(haut && el.closest("[data-testid=marge-affichage]")!.contains(haut));
    });
    expect(couvert).toBe(false);
    // Aucun voile : aucun élément fixe, presque plein écran, semi-transparent.
    const voiles = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const a = s.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(",").map(Number);
      const alpha = a ? (a.length > 3 ? a[3] : 1) : 0;
      return s.position === "fixed" && r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && alpha > 0 && alpha < 1;
    }).length);
    expect(voiles).toBe(0);
  });

  test("ordinateur 1 920 × 1 080 : colonne de 320 px, musique d'au moins 340 px, 16 px d'écart avec l'armure", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "viewport forcé : un seul appareil");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await ouvrir(page, "一生爱你", { zh: true });
    await expect(marge(page)).toHaveAttribute("data-place", "colonne");
    const m = (await marge(page).boundingBox())!;
    expect((await musique(page).boundingBox())!.width).toBeGreaterThanOrEqual(340);
    const a = (await page.getByTestId("armure").boundingBox())!;
    expect(m.x - (a.x + a.width)).toBeGreaterThanOrEqual(16);
  });

  test("412 × 700 : le bas de la musique remonte au-dessus de la feuille", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "abba-pere");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const fin = (await musique(page).evaluate((el) => {
      const k = el.lastElementChild ?? el; const r = k.getBoundingClientRect(); return r.bottom;
    }));
    const m = (await marge(page).boundingBox())!;
    expect(fin).toBeLessThanOrEqual(m.y + 0.5);
  });

  test("un réglage choisi garde le focus (pas de retour au bouton fermer)", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    const chiffres = marge(page).getByRole("radio", { name: "Plan", exact: true });
    await chiffres.focus();
    await chiffres.press("Enter");
    await page.waitForTimeout(200);
    await expect(chiffres).toBeFocused();
  });

  test("tablette portrait : feuille de 560 px centrée", async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    await ouvrir(page, "abba-pere");
    const m = (await marge(page).boundingBox())!;
    expect(m.width).toBeCloseTo(560, 0);
    expect(m.x + m.width / 2).toBeCloseTo(405, 0);
    expect(m.height).toBeCloseTo(432, 0);
  });

  test("Échap ferme la marge et rend le focus au bouton", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await page.keyboard.press("Escape");
    await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
    await expect(page.getByTestId("barre-outils").getByRole("button", { name: "Affichage" })).toBeFocused();
  });

  test("mode page : ressort de 300 ms ; mouvement réduit : fondu de 150 ms (le mode louange : RU-5)", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await expect(marge(page)).toHaveAttribute("data-mode", "page");
    const d = await marge(page).evaluate((el) => ({ p: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration }));
    expect(d.p).toContain("transform");
    expect(d.d.startsWith("0.3s")).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const r = await marge(page).evaluate((el) => ({ p: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration }));
    expect(r.p.startsWith("opacity")).toBe(true);
    expect(r.p).not.toContain("transform");
    expect(r.d.startsWith("0.15s")).toBe(true);
  });

  test("pinyin et ordre des sections : clés existantes écrites, valeurs retrouvées au rechargement", async ({ page }) => {
    await ouvrir(page, "一生爱你", { zh: true });
    // Le scan 简谱 remplace les paroles : on passe en paroles pour voir les lignes de pinyin.
    await marge(page).getByRole("radio", { name: "歌词" }).click();
    const pinyin = marge(page).getByRole("switch", { name: "拼音" });
    await expect(pinyin).toBeChecked();
    await expect(page.locator('[data-ligne="pinyin"]').first()).toBeVisible();
    await pinyin.click();
    await marge(page).getByRole("radio", { name: "只看结构" }).click();
    await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
    const cles = await page.evaluate(() => ({
      pinyin: localStorage.getItem("gcc.showPinyin"),
      ordre: Object.keys(localStorage).filter((k) => k.startsWith("partition-layout")).map((k) => localStorage.getItem(k)),
    }));
    expect(cles.pinyin).toBe("0");
    expect(cles.ordre).toContain("structure");
    await page.reload();
    await expect(musique(page)).toBeVisible();
    await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
    await ouvrirMarge(page);
    await expect(marge(page).getByRole("switch", { name: "拼音" })).not.toBeChecked();
    await expect(marge(page).getByRole("radio", { name: "只看结构" })).toHaveAttribute("aria-checked", "true");
  });

  test("taille du texte : pas de 10 %", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await expect(page.getByTestId("marge-taille")).toHaveText("100 %");
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
    await expect(page.getByTestId("marge-taille")).toHaveText("110 %");
  });
});
