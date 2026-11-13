import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// La marge « Affichage » (docs/spec-reglages-unifies.md, RU-2), montée sur le banc /banc/marge-affichage : colonne de
// 320 px qui pousse la musique dès 1 024 px, feuille basse opaque de 60 % (560 px dès 768 px) sans voile en dessous,
// trois groupes et une mention de portée chacun, réglages retenus sous les clés existantes, mouvement.

const MUSICIEN: FakeProfile = { uid: "uid-banc", email: "banc@example.com", firstName: "Camille", lastName: "B." };
const CHANTS = [
  { slug: "abba-pere", zh: false },
  { slug: "一生爱你", zh: true },
] as const;

const marge = (page: Page) => page.getByTestId("marge-affichage");

async function ouvrir(page: Page, slug: string, opts: { zh?: boolean; mode?: "page" | "louange" } = {}) {
  if (opts.zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  await signInAs(page, MUSICIEN, {}, `/banc/marge-affichage?slug=${encodeURIComponent(slug)}&mode=${opts.mode ?? "page"}`);
  await expect(page.getByTestId("musique")).toBeVisible();
  const bouton = page.getByTestId("musique").getByRole("button");
  // Un clic avant l'hydratation se perd : on recommence tant que la marge n'est pas ouverte.
  await expect(async () => {
    if ((await marge(page).getAttribute("data-ouvert")) !== "true") await bouton.click();
    await expect(marge(page)).toHaveAttribute("data-ouvert", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(marge(page)).toBeVisible();
  await page.waitForTimeout(400); // fin du ressort
}

for (const chant of CHANTS) {
  test.describe(`marge Affichage — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("disposition selon la largeur ; captures ; trois groupes et trois mentions de portée", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const vp = page.viewportSize()!;
      const m = (await marge(page).boundingBox())!;
      const musique = (await page.getByTestId("musique").boundingBox())!;
      if (vp.width >= 1024) {
        expect(m.width).toBeCloseTo(320, 0);
        expect(musique.x + musique.width).toBeLessThanOrEqual(m.x + 0.5);
        expect(m.x + m.width).toBeCloseTo(vp.width, 0);
      } else {
        expect(m.width).toBeCloseTo(vp.width >= 768 ? 560 : vp.width, 0);
        expect(m.height).toBeCloseTo(0.6 * vp.height, 0);
        expect(m.y + m.height).toBeLessThanOrEqual(vp.height + 0.5);
        const fond = await marge(page).evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(fond).not.toMatch(/rgba\(.*,\s*0(\.\d+)?\)$/);
        expect(fond).not.toBe("transparent");
      }
      await expect(page.locator("[data-groupe]")).toHaveCount(3);
      await expect(marge(page).getByText(chant.zh ? "保存在本设备" : "Retenu sur cet appareil", { exact: true })).toHaveCount(3);
      await expect(marge(page).getByRole("heading", { level: 2 })).toHaveText(chant.zh ? "显示" : "Affichage");
      await expect(marge(page).getByRole("button", { name: chant.zh ? "关闭显示" : "Fermer l'affichage" })).toBeVisible();
      await expect(marge(page).getByRole("radio", { name: chant.zh ? "钢琴手" : "Pianiste" })).toBeVisible();
      if (chant.zh) await expect(marge(page).getByText("每段一次")).toBeVisible();
      await page.screenshot({ path: `test-results/marge-affichage-captures/${test.info().project.name}-${chant.zh ? "zh" : "fr"}.png` });
    });

    test("Choriste masque Accords, Lettres | Chiffres et la couleur des accords", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      await expect(marge(page).getByText(chant.zh ? "和弦颜色" : "Couleur des accords")).toBeVisible();
      await marge(page).getByRole("radio", { name: chant.zh ? "和声" : "Choriste" }).click();
      await expect(marge(page).getByText(chant.zh ? "和弦颜色" : "Couleur des accords")).toHaveCount(0);
      await expect(marge(page).getByRole("switch", { name: chant.zh ? "和弦" : "Accords" })).toHaveCount(0);
      await expect(marge(page).locator("[data-notation]")).toHaveCount(0);
    });
  });
}

test.describe("marge Affichage — mesures", () => {
  test("412 × 700 : feuille opaque de 60 %, sans voile, dernier réglage atteignable et entièrement visible", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "一生爱你", { zh: true });
    const m = (await marge(page).boundingBox())!;
    expect(m.height).toBeCloseTo(420, 0);
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

  test("412 × 700 : le bas de la musique remonte au-dessus de la feuille", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "abba-pere");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const fin = (await page.getByTestId("musique").evaluate((el) => {
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
    expect(m.height).toBeCloseTo(648, 0);
  });

  test("Échap ferme la marge et rend le focus au bouton", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await page.keyboard.press("Escape");
    await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
    await expect(page.getByTestId("musique").getByRole("button")).toBeFocused();
  });

  test("mode louange : aucune transition ; mode page : ressort de 300 ms ; mouvement réduit : fondu de 150 ms", async ({ page }) => {
    await ouvrir(page, "abba-pere", { mode: "louange" });
    expect(await marge(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
    await page.goto("/banc/marge-affichage?slug=abba-pere&mode=page");
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
    await expect(page.getByTestId("musique")).toBeVisible();
    await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
    await expect(async () => {
      if ((await marge(page).getAttribute("data-ouvert")) !== "true") await page.getByTestId("musique").getByRole("button").click();
      await expect(marge(page)).toHaveAttribute("data-ouvert", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
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
