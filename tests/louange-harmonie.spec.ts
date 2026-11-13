import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, lireCompteur, onStage, ouvrirMenu, ouvrirOptions, type Langue } from "./helpers/louange";

// JV-5b (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») : dans le mode louange, le NOM d'une section ouvre
// le volet Harmonie du chant (toutes les propositions du passage, une seule notation) posé par-dessus la page : dès 768 px une
// fenêtre comme le menu Setlist, accrochée au nom touché (Timothée, 13/11/2026 : « Fait une fenêtre comme pour les setlists
// dans le mode louange » ; elle remplace la colonne de 1 024 px), feuille à mi-hauteur en dessous ; la page n'est ni
// tournée, ni rétrécie, ni recomptée. Le point
// et la bande d'H8 sont retirés. Réglage « Idées d'harmonie » éteint par défaut, par compte, absent sans accès harmonie.
// Spec d'agencement : cinq projets (SPECS_GRAND_ECRAN). Captures : test-results/jv5b-*.png. Noms fictifs.

const SETLIST_ID = "setlist-louange-harmonie";
const SANS_ACCES: FakeProfile = { uid: "uid-camille", email: "camille@example.com", firstName: "Camille", lastName: "V.", planningName: "Camille V.", ...musicien("batterie") };
const AVEC_ACCES: FakeProfile = { uid: "uid-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "R.", planningName: "Sacha R.", ...musicien("piano") };

const CHANTS = [
  { slug: "a-jamais-tu-es-saint", langue: "fr" as Langue, cle: "C#" },
  { slug: "一切歌颂赞美", langue: "zh" as Langue, cle: "E" },
];

const setlist = (slug: string, cle: string) => ({
  title: "Culte du 11 octobre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [{
    songSlug: slug, position: 1, keyOverride: cle, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "",
  } satisfies SetlistItem],
});

async function ouvrirMode(page: Page, profil: FakeProfile, c: (typeof CHANTS)[number], { allume = true, depart = c.slug, sombre = false } = {}) {
  await page.addInitScript(({ u, zh, on, sombre }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", "never");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (sombre) localStorage.setItem("theme", "dark");
    if (on) localStorage.setItem(`perf-idees-harmonie-${u}`, "1");
  }, { u: profil.uid, zh: c.langue === "zh", on: allume, sombre });
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: setlist(depart, c.cle) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: c.langue === "zh" ? /敬拜模式/ : /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
}

const noms = (page: Page) => onStage(page, "button[data-section-nom-bouton]");
// La feuille et la fenêtre sortent dans un portail (body).
const volet = (page: Page) => page.locator("[data-idees-harmonie]");
const grandEcran = (page: Page) => (page.viewportSize()?.width ?? 0) >= 768;

for (const c of CHANTS) {
  const reglage = c.langue === "zh" ? "和声提示" : "Idées d'harmonie";

  test(`chant ${c.langue.toUpperCase()} : réglage éteint par défaut, les noms ne sont pas des boutons ; allumé, ils le deviennent`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: false });
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(noms(page)).toHaveCount(0);
    const feuille = await ouvrirOptions(page, c.langue);
    await feuille.getByRole("button", { name: reglage }).click();
    await page.keyboard.press("Escape"); // la feuille couvre la scène au téléphone
    await expect(feuille).toBeHidden();
    await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate((u) => localStorage.getItem(`perf-idees-harmonie-${u}`), AVEC_ACCES.uid)).toBe("1");
  });

  test(`chant ${c.langue.toUpperCase()} : sans accès harmonie, ni réglage ni nom touchable, même si la clé dit oui`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(noms(page)).toHaveCount(0);
    const feuille = await ouvrirOptions(page, c.langue);
    await expect(feuille.getByRole("button", { name: reglage })).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : le nom ouvre le volet au bloc du passage, par-dessus la page, sans la tourner ni la recompter`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c);
    // Plus de point ni de bande d'H8.
    await expect(onStage(page, "[data-idee-harmonie], [data-idee-harmonie-bande]")).toHaveCount(0);
    const nom = noms(page).first();
    await expect(nom).toBeVisible({ timeout: 15_000 });
    const avant = await lireCompteur(page);
    // Poignée gardée : la feuille (dialogue) cache le reste aux lecteurs d'écran (aria-hidden), `onStage` ne la verrait plus.
    const carte = (await onStage(page, "[data-section]").first().elementHandle())!;
    const boiteAvant = await carte.boundingBox();
    const titre = (await nom.innerText()).trim();

    await nom.click();
    await expect(volet(page)).toBeVisible();
    if (grandEcran(page)) {
      // Une fenêtre comme le menu Setlist, accrochée au nom touché : au-dessus ou au-dessous de lui, à sa hauteur de colonne.
      await expect(volet(page)).toHaveAttribute("data-harmonie-fenetre");
      const ecran = page.viewportSize()!;
      const [b, n] = [(await volet(page).boundingBox())!, (await nom.boundingBox())!];
      expect(b.x, "fenêtre entière à l'écran").toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(ecran.width);
      expect(b.y + b.height).toBeLessThanOrEqual(ecran.height);
      expect(b.width, "fenêtre, pas une colonne pleine hauteur").toBeLessThanOrEqual(26 * 16 + 1);
      expect(b.y >= n.y + n.height - 1 || b.y + b.height <= n.y + 1, "au-dessus ou au-dessous du nom touché").toBe(true);
      expect(b.x < n.x + n.width && b.x + b.width > n.x, "à l'aplomb du nom touché").toBe(true);
      // Sous la barre du haut : la croix du mode louange reste visible.
      const haut = await page.locator("[data-performance-mode] [data-barre-haut]").boundingBox();
      expect(b.y).toBeGreaterThanOrEqual(haut!.y + haut!.height - 1);
      await expect(page.locator("[data-performance-mode] [data-barre-haut] button").last()).toBeInViewport();
    } else {
      // Feuille à mi-hauteur : son haut est vers le milieu de l'écran.
      await expect(async () => {
        const b = await volet(page).boundingBox();
        expect(Math.abs(b!.y - page.viewportSize()!.height / 2)).toBeLessThan(page.viewportSize()!.height * 0.1);
      }).toPass({ timeout: 5_000 });
    }
    // Le bloc du passage touché est dans le volet, visible.
    const bloc = volet(page).locator("[data-passage-uids]").filter({ has: page.getByRole("heading", { name: new RegExp(`^${titre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }) }).first();
    await expect(bloc).toBeInViewport();
    // Ni tournée, ni rétrécie, ni recomptée.
    expect(await lireCompteur(page), "le toucher ne tourne pas la page").toBe(avant);
    expect(await carte.boundingBox(), "la page n'est pas rétrécie").toEqual(boiteAvant);

    // Échap ferme le volet, pas le mode louange.
    await page.keyboard.press("Escape");
    await expect(volet(page)).toHaveCount(0);
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    expect(await lireCompteur(page)).toBe(avant);
  });

  test(`chant ${c.langue.toUpperCase()} : toucher dans le volet ne tourne pas la page`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c);
    await noms(page).first().click();
    await expect(volet(page)).toBeVisible();
    const avant = await lireCompteur(page);
    // La feuille monte : on attend qu'elle soit posée (deux lectures égales), sinon le clic tombe sur le fond, qui la ferme.
    let b = await volet(page).boundingBox();
    await expect(async () => {
      const prec = b;
      b = await volet(page).boundingBox();
      expect(b!.y).toBe(prec!.y);
    }).toPass({ timeout: 5_000, intervals: [200] });
    await page.mouse.click(b!.x + b!.width / 2, b!.y + Math.min(b!.height - 10, 200));
    await expect(volet(page)).toBeVisible();
    expect(await lireCompteur(page)).toBe(avant);
  });
}

for (const c of CHANTS) {
  test(`chant ${c.langue.toUpperCase()} : toucher hors du volet le ferme sans tourner la page`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c);
    await noms(page).first().click();
    await expect(volet(page)).toBeVisible();
    const avant = await lireCompteur(page);
    const ecran = page.viewportSize()!;
    // Bord droit, au tiers de la hauteur : la page (fenêtre accrochée au premier nom, à gauche) ou le fond de la feuille.
    await expect(async () => {
      await page.mouse.click(ecran.width - 12, Math.round(ecran.height * 0.3));
      await expect(volet(page)).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 8_000 });
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    expect(await lireCompteur(page), "le toucher qui ferme ne tourne pas la page").toBe(avant);
  });
}

// TC-3 (docs/spec-louange-tous-les-chants.md) : un chant ajouté par l'onglet « Tous les chants » a ses noms touchables.
test("chant ajouté par « Tous les chants » : son nom de section ouvre le volet", async ({ page }) => {
  await ouvrirMode(page, AVEC_ACCES, CHANTS[0], { depart: "abba-pere" });
  const d = await ouvrirMenu(page, "setlist");
  await d.locator('[role=tab][data-onglet="chants"]').click();
  await d.locator("input[data-recherche-chants]").fill("jamais");
  await d.locator(`[data-chant-slug="${CHANTS[0].slug}"]`).click();
  await expect(d).toBeHidden();
  await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText("À jamais Tu es saint", { timeout: 15_000 });
  const nom = noms(page).filter({ visible: true }).first();
  await expect(nom).toBeVisible({ timeout: 15_000 });
  await nom.click();
  await expect(volet(page)).toBeVisible();
});

// ─── Captures : FR et 中文, clair et sombre, sur chaque projet ──────────────
for (const c of CHANTS) {
  for (const sombre of [false, true]) {
    test(`capture JV-5b, ${c.langue === "zh" ? "中文" : "FR"}, ${sombre ? "sombre" : "clair"}`, async ({ page }, info) => {
      await ouvrirMode(page, AVEC_ACCES, c, { sombre });
      await noms(page).first().click();
      await expect(volet(page)).toBeVisible();
      await page.waitForTimeout(600); // la feuille finit de monter, le bloc de défiler
      await page.screenshot({ path: `test-results/jv5b-${info.project.name}-${c.langue}-${sombre ? "sombre" : "clair"}.png` });
    });
  }
}
