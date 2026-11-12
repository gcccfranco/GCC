import { expect, test, type Page } from "@playwright/test";
import { chiffrerEtiquette } from "../src/lib/harmonie/degres";
import { openSheet } from "./helpers/jianpu";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Membre fictif : la préférence se garde par compte, et la bascule attend la fin de la lecture du compte.
const ROMANE: FakeProfile = { uid: "uid-romane", email: "romane@example.com", firstName: "Romane", lastName: "V." };

// Harmonie H7-1 (docs/spec-harmonie-accords.md) : la bascule Lettres / Chiffres des accords de la partition.

test("chiffrerEtiquette : racine et basse en degrés, le reste gardé", () => {
  expect(chiffrerEtiquette("D", "D")).toBe("1");
  expect(chiffrerEtiquette("Em7", "D")).toBe("2m7");
  expect(chiffrerEtiquette("Gmaj7", "D")).toBe("4maj7");
  expect(chiffrerEtiquette("Asus4", "D")).toBe("5sus4");
  expect(chiffrerEtiquette("A/C#", "D")).toBe("5/7");
  expect(chiffrerEtiquette("Bm/A", "D")).toBe("6m/5");
  expect(chiffrerEtiquette("C", "D")).toBe("b7");
  // H7-2 : des chiffres collés au degré se liraient comme un nombre (« 57 », « 12 ») : en exposant.
  expect(chiffrerEtiquette("A7", "D")).toBe("5⁷");
  expect(chiffrerEtiquette("D2", "D")).toBe("1²");
  expect(chiffrerEtiquette("A7sus4", "D")).toBe("5⁷sus4");
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

/** Choisit une notation par la barre si elle y est (rangée assez large), sinon par le menu ⋯. */
async function choisir(page: Page, n: "lettres" | "chiffres") {
  const b = barre(page, n);
  if (await b.isVisible()) {
    await b.click();
  } else {
    await page.getByRole("button", { name: /Plus d'actions|更多操作/ }).filter({ visible: true }).first().click();
    await page.getByRole("menu").locator(`[data-notation="${n}"]`).click();
    await page.keyboard.press("Escape");
  }
}

async function ouvrir(page: Page, slug: string, zh: boolean, query = "") {
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  if (zh) {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  }
  await signInAs(page, ROMANE, {}, `/songs/${encodeURIComponent(slug)}${query}`);
  await expect(accords(page).first()).toBeVisible();
}

for (const c of CHANTS) {
  test(`chant ${c.zh ? "ZH" : "FR"} : chiffres puis retour aux lettres, préférence gardée au rechargement (ordinateur, tablette)`, async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "la bascule de barre est cachée au téléphone : voir le test du menu ⋯");
    await ouvrir(page, c.slug, c.zh);
    const lettres = await textes(page);
    expect(lettres.some((t) => /^[A-G]/.test(t))).toBe(true);
    await choisir(page, "chiffres");
    await expect.poll(async () => (await textes(page)).every((t) => CHIFFRE.test(t))).toBe(true);
    const chiffres = await textes(page);
    expect(chiffres).toHaveLength(lettres.length);
    for (const t of chiffres) expect(t).toMatch(CHIFFRE);
    // Les accords s'ouvrent toujours en lettres.
    await expect(accords(page).first()).toHaveAttribute("data-accord-touchable", /^[A-G]/);
    await page.reload();
    await expect(accords(page).first()).toBeVisible();
    await expect.poll(() => textes(page)).toEqual(chiffres);
    await choisir(page, "lettres");
    await expect.poll(() => textes(page)).toEqual(lettres);
  });
}

test("transposer ne change pas les chiffres", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("accords-notation-uid-romane", "chiffres"));
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
    await page.addInitScript(() => localStorage.setItem("accords-notation-uid-romane", "chiffres"));
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
  // Au téléphone la bascule n'est jamais dans la barre ; ailleurs elle y est si la rangée a la place (data-bascule).
  if (info.project.name === "telephone") await expect(barre(page, "chiffres")).toBeHidden();
  await page.getByRole("button", { name: /Plus d'actions|更多操作/ }).filter({ visible: true }).first().click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Notation des accords")).toBeVisible();
  await menu.getByRole("button", { name: "Chiffres" }).click();
  await expect(menu.getByRole("button", { name: "Chiffres" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await textes(page)).every((t) => CHIFFRE.test(t))).toBe(true);
});

// H7-2 : les lignes d'harmonie suivent la bascule, une seule notation (Hosanna, compte avec l'accès Harmonie).
const AGATHE: FakeProfile = { uid: "uid-agathe", email: "agathe@example.com", firstName: "Agathe", lastName: "R.", planningName: "Agathe R.", ...musicien("piano") };

async function ouvrirPorte2(page: Page, notation: "lettres" | "chiffres") {
  await page.addInitScript(([k, v]) => { localStorage.setItem("accords-aide-vue", "1"); localStorage.setItem(k, v); }, [`accords-notation-${AGATHE.uid}`, notation]);
  await signInAs(page, AGATHE, {}, "/songs/hosanna");
  await expect(accords(page).first()).toBeVisible();
  await page.getByTestId("barre-outils").getByRole("button", { name: /^Harmonie$/ }).click();
  const porte2 = page.locator("[data-idees-harmonie], [data-harmonie-colonne]");
  await expect(porte2.locator("[data-passage]").first()).toBeVisible();
  return porte2;
}

for (const n of ["lettres", "chiffres"] as const) {
  test(`H7-2 porte 2 en ${n} : la grille du premier passage n'a qu'une notation, les cartes avant → après aussi`, async ({ page }) => {
    const porte2 = await ouvrirPorte2(page, n);
    const grille = porte2.locator("[data-passage]").first().locator("[data-accord-touchable]");
    await expect(grille.first()).toBeVisible();
    const textes = await grille.evaluateAll((els) => els.map((e) => e.textContent ?? ""));
    for (const t of textes) expect(n === "chiffres" ? CHIFFRE.test(t) : /^[A-G]/.test(t), t).toBe(true);
    // Plus de ligne de degrés sous « avant → après » : les accords de la carte sont dans la même notation.
    const carte = porte2.locator("[data-suggestion] [data-accord-touchable]");
    await expect(carte.first()).toBeVisible();
    for (const t of await carte.evaluateAll((els) => els.map((e) => e.textContent ?? ""))) expect(n === "chiffres" ? CHIFFRE.test(t) : /^[A-G]/.test(t), t).toBe(true);
    await expect(porte2.locator("[data-suggestion] p.text-base span.block")).toHaveCount(0);
  });

  test(`H7-2 panneau en ${n} : titre « dans » + lettre, « Ensuite » dans la notation, une seule colonne d'accord`, async ({ page }) => {
    await page.addInitScript(([k, v]) => { localStorage.setItem("accords-aide-vue", "1"); localStorage.setItem(k, v); }, [`accords-notation-${AGATHE.uid}`, n]);
    await signInAs(page, AGATHE, {}, "/songs/hosanna");
    await expect(accords(page).first()).toBeVisible();
    await expect(async () => {
      await accords(page).nth(2).click();
      await expect(page.locator("[data-accord-panneau]")).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    const panneau = page.locator("[data-accord-panneau]");
    await expect(panneau.locator("[data-accord-chiffre]")).toHaveText(/^\S+ dans [A-G][#b]?m?$/);
    const ensuite = panneau.getByRole("button", { name: /^Ensuite/ });
    await expect(ensuite).toBeVisible();
    const replie = (await ensuite.textContent()) ?? "";
    expect(n === "chiffres" ? CHIFFRE.test(replie.replace(/^Ensuite\s*:?\s*/, "")) : /^Ensuite\s*:?\s*[A-G]/.test(replie), replie).toBe(true);
    await ensuite.click();
    const ligne = panneau.locator("[data-ensuite] li").first();
    await expect(ligne.locator("> span").first().locator("[data-accord-touchable]")).toHaveCount(1);
    await expect(ligne.locator("[data-accord-touchable]")).toHaveCount(1);
    const t = (await ligne.locator("[data-accord-touchable]").textContent()) ?? "";
    expect(n === "chiffres" ? CHIFFRE.test(t) : /^[A-G]/.test(t), t).toBe(true);
  });
}
