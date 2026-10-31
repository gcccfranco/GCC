import { expect, test } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { BASE_URL_COUPE } from "../playwright.config";
import { openSheet } from "./helpers/jianpu";

// Tranche A6 (docs/spec-corrections-audit.md) : marge de la barre du bas sur la page chant, tiret de liaison (C10).
// Comptes simulés, noms fictifs.

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne-a6",
  email: "musicienne-a6@example.com",
  firstName: "Perrine",
  lastName: "Lamarque",
  planningName: "Perrine L.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
  ...musicien("piano"),
};

const padBas = (page: import("@playwright/test").Page) =>
  page.getByTestId("marge-barre").evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));

test.describe("marge de la barre du bas", () => {
  test.describe("site en ligne (interrupteur du back-office coupé : une seule destination, pas de barre)", () => {
    test.use({ baseURL: BASE_URL_COUPE });
    test("visiteur : barre absente, pas de marge sous la partition", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "marge propre au téléphone");
    await openSheet(page, "一生爱你", { key: "F" });
    await expect(page.getByTestId("barre-du-bas")).toHaveCount(0);
    expect(await padBas(page)).toBe(0);
    });
  });

  test("connecté : barre rendue, marge présente", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "marge propre au téléphone");
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
    await signInAs(page, MUSICIENNE, {}, "/songs/%E4%B8%80%E7%94%9F%E7%88%B1%E4%BD%A0");
    await expect(page.getByTestId("barre-du-bas")).toBeVisible();
    await page.locator("[data-jianpu-page]").first().waitFor();
    expect(await padBas(page)).toBeGreaterThanOrEqual(78);
  });
});

test.describe("tiret de liaison (C10)", () => {
  test("chant FR : « ra – yonne » porte un tiret, hors copie et hors lecture d'écran", async ({ page }) => {
    await page.goto("/songs/aucun-autre-nom");
    await page.locator("[data-copy-line]").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const tirets = page.locator("[data-copy-line] span[aria-hidden=true][data-copy-ignore]", { hasText: "–" });
    await expect(tirets.first()).toBeAttached();
    await expect
      .poll(() => tirets.evaluateAll((els) => els.filter((e) => getComputedStyle(e.firstElementChild!).visibility === "visible").length))
      .toBeGreaterThan(0);
    // Le tiret tient entièrement dans la colonne : jamais rogné.
    const rognes = await tirets.evaluateAll((els) =>
      els.filter((c) => {
        const t = c.firstElementChild as HTMLElement;
        return getComputedStyle(t).visibility === "visible" && t.offsetWidth > c.clientWidth;
      }).length);
    expect(rognes).toBe(0);
    // La copie des paroles ne le voit pas.
    const texte = await page.evaluate(() => {
      const l = [...document.querySelectorAll("[data-copy-line]")].find((e) => e.textContent?.includes("yonne"))!;
      const c = l.cloneNode(true) as HTMLElement;
      c.querySelectorAll("[data-copy-ignore]").forEach((n) => n.remove());
      return c.textContent;
    });
    expect(texte).toContain("rayonne");
  });

  test("« À l'agneau » : « vi – vant » porte un tiret même quand deux accords se suivent dans le mot", async ({ page }) => {
    await page.goto("/songs/a-l-agneau");
    await page.locator("[data-copy-line]").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    // « [G]Vi[C]vant, [F]vi[C][G]vant, » : un tiret à chaque coupe du mot, la seconde avec deux accords.
    const ligne = page.locator("[data-copy-line]").filter({ hasText: /Vi.*vant,/ }).first();
    const tirets = ligne.locator("span[aria-hidden=true][data-copy-ignore]", { hasText: "–" });
    await expect
      .poll(() => tirets.evaluateAll((els) => els.filter((e) => getComputedStyle(e.firstElementChild!).visibility === "visible").length))
      .toBeGreaterThanOrEqual(2);
    // La copie des paroles ne voit pas les tirets.
    const texte = await ligne.evaluate((l) => {
      const c = l.cloneNode(true) as HTMLElement;
      c.querySelectorAll("[data-copy-ignore]").forEach((n) => n.remove());
      return c.textContent;
    });
    expect(texte).toContain("vivant");
  });

  test("chant ZH : aucun tiret", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.goto("/songs/" + encodeURIComponent("向主欢呼"));
    await page.locator("[data-copy-line]").first().waitFor();
    await expect(page.locator("[data-copy-line] span[aria-hidden=true][data-copy-ignore]", { hasText: "–" })).toHaveCount(0);
  });
});

test.describe("barre de la setlist sur téléphone (G15)", () => {
  const setlist = {
    title: "Culte du 4 octobre",
    leader: "Gaspard T.",
    category: "Culte Francophone",
    date: "2026-10-04",
    language: "mixed",
    notes: "",
    ownerId: MUSICIENNE.uid,
    isPrivate: false,
    items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
  };

  test("libellés courts sous les icônes, une seule rangée ; droits repliés derrière « i »", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "propre au téléphone");
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MUSICIENNE, { "setlists/setlist-a6": setlist }, "/setlists/setlist-a6");
    const barre = page.getByTestId("barre-outils");
    await expect(barre.getByRole("button", { name: "Accords" })).toBeVisible();
    for (const libelle of ["Affichage", "Accords", "Louange"]) await expect(barre.locator("span[aria-hidden=true]", { hasText: libelle }).first()).toBeVisible();
    // Une seule rangée : les contrôles se suivent de gauche à droite, sans retour à la ligne.
    const gauches = await barre.locator(".rangee-outils > *").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
    expect(gauches.every((g, k) => k === 0 || g > gauches[k - 1]), "une seule rangée").toBe(true);
    const phrase = page.getByText(/Modifiable par/).first();
    await expect(phrase).toBeHidden();
    const i = page.getByRole("button", { name: "Qui peut modifier" }).filter({ visible: true }).first();
    await expect(i).toHaveAttribute("aria-expanded", "false");
    await i.click();
    await expect(i).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/Modifiable par/).filter({ visible: true }).first()).toBeVisible();
  });
});
