import { expect, test, type Page } from "@playwright/test";
import { chiffrerEtiquette } from "../src/lib/harmonie/degres";
import { openSheet } from "./helpers/jianpu";

// Harmonie H7-1 (docs/spec-harmonie-accords.md) : la bascule Lettres / Chiffres des accords de la partition.

test("chiffrerEtiquette : racine et basse en degrés, le reste gardé", () => {
  expect(chiffrerEtiquette("D", "D")).toBe("1");
  expect(chiffrerEtiquette("Em7", "D")).toBe("2m7");
  expect(chiffrerEtiquette("Gmaj7", "D")).toBe("4maj7");
  expect(chiffrerEtiquette("Asus4", "D")).toBe("5sus4");
  expect(chiffrerEtiquette("A/C#", "D")).toBe("5/7");
  expect(chiffrerEtiquette("Bm/A", "D")).toBe("6m/5");
  expect(chiffrerEtiquette("C", "D")).toBe("b7");
  expect(chiffrerEtiquette("Em", "Em")).toBe("1m");
  expect(chiffrerEtiquette("N.C.", "D")).toBe("N.C.");
  expect(chiffrerEtiquette("D", undefined)).toBe("D");
});

const CHANTS = [
  { slug: "hosanna", zh: false, cle: "D" },
  { slug: "一切歌颂赞美", zh: true, cle: "E" },
] as const;
const CHIFFRE = /^[b#]?[1-7]/;
const accords = (page: Page) => page.locator("[data-section] [data-copy-line] [data-accord-touchable]");
const textes = (page: Page) => accords(page).evaluateAll((els) => els.map((e) => e.textContent ?? ""));
const barre = (page: Page, n: "lettres" | "chiffres") => page.getByTestId("barre-outils").locator(`[data-notation="${n}"]`);

async function ouvrir(page: Page, slug: string, zh: boolean, query = "") {
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  if (zh) {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  }
  await page.goto(`/songs/${encodeURIComponent(slug)}${query}`);
  await expect(accords(page).first()).toBeVisible();
}

for (const c of CHANTS) {
  test(`chant ${c.zh ? "ZH" : "FR"} : chiffres puis retour aux lettres, préférence gardée au rechargement (ordinateur, tablette)`, async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "la bascule de barre est cachée au téléphone : voir le test du menu ⋯");
    await ouvrir(page, c.slug, c.zh);
    const lettres = await textes(page);
    expect(lettres.some((t) => /^[A-G]/.test(t))).toBe(true);
    await expect(barre(page, "lettres")).toHaveAttribute("aria-pressed", "true");
    await barre(page, "chiffres").click();
    await expect(barre(page, "chiffres")).toHaveAttribute("aria-pressed", "true");
    const chiffres = await textes(page);
    expect(chiffres).toHaveLength(lettres.length);
    for (const t of chiffres) expect(t).toMatch(CHIFFRE);
    // Les accords s'ouvrent toujours en lettres.
    await expect(accords(page).first()).toHaveAttribute("data-accord-touchable", /^[A-G]/);
    await page.reload();
    await expect(accords(page).first()).toBeVisible();
    await expect.poll(() => textes(page)).toEqual(chiffres);
    await barre(page, "lettres").click();
    await expect.poll(() => textes(page)).toEqual(lettres);
  });
}

test("transposer ne change pas les chiffres", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("accords-notation", "chiffres"));
  await ouvrir(page, "hosanna", false);
  // Le compte se charge avant que la préférence s'applique : attendre les chiffres.
  await expect.poll(async () => (await textes(page)).every((t) => CHIFFRE.test(t))).toBe(true);
  const avant = await textes(page);
  await page.goto(`/songs/hosanna?key=${encodeURIComponent(JSON.stringify("F"))}`);
  await expect(accords(page).first()).toBeVisible();
  await expect.poll(() => textes(page)).toEqual(avant);
  expect(avant.length).toBeGreaterThan(0);
});

for (const c of CHANTS) {
  test(`chant ${c.zh ? "ZH" : "FR"} : toucher un chiffre ouvre le panneau de la lettre`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("accords-notation", "chiffres"));
    await ouvrir(page, c.slug, c.zh);
    const accord = accords(page).nth(2);
    const lettre = await accord.getAttribute("data-accord-touchable");
    await expect(accord).toHaveText(CHIFFRE);
    await expect(async () => {
      await accord.click();
      await expect(page.locator("[data-accord-panneau]")).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await expect(page.locator("[data-accord-nom]").first()).toHaveText(lettre!);
  });
}

test("calque 简谱 inchangé en chiffres", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("accords-notation", "chiffres"));
  await openSheet(page, "一生爱你", { key: "F" });
  const calque = page.locator("[data-jianpu-page] [data-accord-touchable]");
  await expect(calque.first()).toBeVisible();
  expect(await calque.first().textContent()).toBe("F");
});

test("la bascule de barre est cachée au téléphone, le menu ⋯ la porte", async ({ page }, info) => {
  await ouvrir(page, "hosanna", false);
  const visible = info.project.name !== "telephone";
  await expect(barre(page, "chiffres")).toBeVisible({ visible });
  await page.getByRole("button", { name: /Plus d'actions|更多操作/ }).filter({ visible: true }).first().click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Notation des accords")).toBeVisible();
  await menu.getByRole("button", { name: "Chiffres" }).click();
  await expect(menu.getByRole("button", { name: "Chiffres" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await textes(page)).every((t) => CHIFFRE.test(t))).toBe(true);
});
