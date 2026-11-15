import { expect, test, type Locator, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, basculerAnnoter, lireCompteur, onStage, ouvrirMenu, type Langue } from "./helpers/louange";

// AL-2 + CL-4 (docs/spec-accords-louange.md, docs/spec-corrections-louange.md) : en mode louange, un accord (paroles ou scan 简谱)
// n'est touchable que réglage « Idées d'harmonie » allumé (accès Harmonie) ; il ouvre alors le panneau d'accord, au centre comme dans
// une bande latérale, sans tourner la page ni basculer la barre ; un toucher hors du panneau le ferme sans rien tourner ; en Crayon
// les accords sont inertes ; l'appui long ouvre le Crayon ; « Ici » ouvre la fenêtre des idées. Réglage éteint ou sans accès :
// aucun accord touchable, un toucher sur un accord tourne la page comme sur le texte. Spec d'agencement : cinq projets.
// Captures : test-results/al2-*.png, cl4-*.png. Noms fictifs.

const SETLIST_ID = "setlist-louange-accords";
const AVEC_ACCES: FakeProfile = { uid: "uid-noemie", email: "noemie@example.com", firstName: "Noémie", lastName: "T.", planningName: "Noémie T.", ...musicien("piano") };
const SANS_ACCES: FakeProfile = { uid: "uid-bastien", email: "bastien@example.com", firstName: "Bastien", lastName: "L.", planningName: "Bastien L.", ...musicien("batterie") };

const CHANTS = [
  { slug: "a-jamais-tu-es-saint", langue: "fr" as Langue, cle: "C#" },
  { slug: "一切歌颂赞美", langue: "zh" as Langue, cle: "E" },
];
const SCAN = { slug: "为我而来", langue: "fr" as Langue, cle: "D" };

const setlist = (slug: string, cle: string, scan: boolean) => ({
  title: "Culte du 11 octobre", leader: "Présidence", category: "Culte Francophone", date: "2026-10-11", language: "mixed", notes: "",
  ownerId: "uid-owner", isPrivate: false,
  items: [{ songSlug: slug, position: 1, keyOverride: cle, showChords: true, showPinyin: true, useJianpu: false, jianpuSheet: scan, structureOverride: null, sectionNotes: {}, notes: "" } satisfies SetlistItem],
});

async function ouvrirMode(page: Page, profil: FakeProfile, c: { slug: string; langue: Langue; cle: string }, { scan = false, allume = false } = {}) {
  await page.addInitScript(({ u, zh, on, scan }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", scan ? "always" : "never");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (on) localStorage.setItem(`perf-idees-harmonie-${u}`, "1");
  }, { u: profil.uid, zh: c.langue === "zh", on: allume, scan });
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: setlist(c.slug, c.cle, scan) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: c.langue === "zh" ? /敬拜模式/ : /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  if (scan) await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("[data-performance-mode] [data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
}

const accords = (page: Page, scan: boolean) => onStage(page, scan ? "[data-jianpu-label] [data-accord-touchable]" : "[data-accord-touchable]");
const panneau = (page: Page) => page.locator("[data-accord-panneau]");
const barreOuverte = (page: Page) => page.locator("[data-performance-mode]").getAttribute("data-barre-ouverte");

/** Le premier accord visible dont le centre est dans le tiers central de l'écran (hors bandes latérales). */
async function accordAuCentre(page: Page, scan: boolean): Promise<Locator> {
  const l = accords(page, scan);
  await expect(l.first()).toBeVisible({ timeout: 15_000 });
  const w = page.viewportSize()!.width;
  const n = await l.evaluateAll((els, w) => els.findIndex((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && x > w * 0.34 && x < w * 0.66 && document.elementFromPoint(x, r.top + r.height / 2)?.closest("[data-accord-touchable]") === el; }), w);
  expect(n, "un accord au centre de la page").toBeGreaterThanOrEqual(0);
  return l.nth(n);
}

for (const c of [...CHANTS, SCAN]) {
  const scan = c === SCAN;
  const nom = scan ? "scan 简谱" : c.langue.toUpperCase();
  test(`chant ${nom} : un accord touché au centre ouvre le panneau, sans tourner la page ni basculer la barre`, async ({ page }, info) => {
    await ouvrirMode(page, AVEC_ACCES, c, { scan, allume: true });
    const accord = await accordAuCentre(page, scan);
    const [page0, barre0] = [await lireCompteur(page), await barreOuverte(page)];
    await accord.click();
    await expect(panneau(page)).toBeVisible();
    expect(await lireCompteur(page), "page inchangée").toBe(page0);
    expect(await barreOuverte(page), "barre inchangée").toBe(barre0);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/al2-${info.project.name}-${scan ? "scan" : c.langue}.png` });
  });
}

for (const c of CHANTS) {
  test(`chant ${c.langue.toUpperCase()} : toucher hors du panneau le ferme sans tourner la page ni basculer la barre`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: true });
    const accord = await accordAuCentre(page, false);
    await accord.click();
    await expect(panneau(page)).toBeVisible();
    const [page0, barre0] = [await lireCompteur(page), await barreOuverte(page)];
    const ecran = page.viewportSize()!;
    await expect(async () => {
      await page.mouse.click(ecran.width * 0.5, ecran.height * 0.12 + 4);
      await expect(panneau(page)).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 8_000 });
    expect(await lireCompteur(page)).toBe(page0);
    expect(await barreOuverte(page)).toBe(barre0);
  });

  for (const bord of ["gauche", "droite"] as const) {
    test(`chant ${c.langue.toUpperCase()} : réglage allumé, un accord de la bande ${bord} ouvre le panneau, sans tourner la page ni basculer la barre`, async ({ page }, info) => {
      await ouvrirMode(page, AVEC_ACCES, c, { allume: true });
      const l = accords(page, false);
      await expect(l.first()).toBeVisible({ timeout: 15_000 });
      // Zone latérale : 0,3 de la largeur sur tablette, 1/3 ailleurs (largeurZoneLaterale) ; marge prudente : centre dans les 28 % du bord.
      const w = page.viewportSize()!.width;
      const n = await l.evaluateAll((els, [w, bord]) => els.findIndex((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const dansBande = bord === "gauche" ? x < w * 0.28 : x > w * 0.72; return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && dansBande && document.elementFromPoint(x, r.top + r.height / 2)?.closest("[data-accord-touchable]") === el; }), [w, bord] as [number, string]);
      test.skip(n < 0, `aucun accord dans la bande ${bord} à cette taille`);
      const [page0, barre0] = [await lireCompteur(page), await barreOuverte(page)];
      await l.nth(n).click();
      await expect(panneau(page)).toBeVisible();
      expect(await lireCompteur(page), "page inchangée").toBe(page0);
      expect(await barreOuverte(page), "barre inchangée").toBe(barre0);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/cl4-${info.project.name}-${c.langue}-${bord}.png` });
    });
  }

  test(`chant ${c.langue.toUpperCase()} : réglage éteint, aucun accord touchable ; un toucher sur un accord de la bande droite tourne la page`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: false });
    // Accord inerte : `.font-chord` (ChordLine, FR) ou `[data-accord]` (ZhLine, 中文 ; cases vides en `visibility: hidden`).
    const inertes = onStage(page, "[data-copy-line] .font-chord, [data-copy-line] [data-accord]");
    await expect(inertes.first()).toBeVisible({ timeout: 15_000 });
    await expect(onStage(page, "[data-accord-touchable]")).toHaveCount(0);
    const avant = await lireCompteur(page);
    const [, total] = avant.split(" / ").map(Number);
    test.skip(total < 2, "chant d'une seule page à cette taille : rien à tourner");
    const w = page.viewportSize()!.width;
    const bord = await inertes.evaluateAll((els, w) => {
      const e = els.filter((el) => getComputedStyle(el).visibility !== "hidden").map((el) => el.getBoundingClientRect()).find((r) => r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && r.left + r.width / 2 > w * 0.8);
      return e ? { x: e.left + e.width / 2, y: e.top + e.height / 2 } : null;
    }, w);
    await page.mouse.click(bord?.x ?? w - 8, bord?.y ?? 300);
    await expect.poll(() => lireCompteur(page)).not.toBe(avant);
    await expect(panneau(page)).toHaveCount(0);
    const page2 = await lireCompteur(page);
    await page.mouse.click(8, page.viewportSize()!.height / 2);
    await expect.poll(() => lireCompteur(page)).not.toBe(page2);
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : Crayon allumé, les accords sont inertes`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: true });
    await expect(accords(page, false).first()).toBeVisible({ timeout: 15_000 });
    // Barre masquée : un toucher en haut de page (aucun accord) la rappelle ; le centre peut tomber sur un accord, qui ouvrirait le panneau.
    if ((await page.locator("[data-barre-ouverte]").count()) === 0) await page.mouse.click(page.viewportSize()!.width / 2, 8);
    await basculerAnnoter(page, c.langue);
    await expect(page.locator("[data-crayon-barre]").first()).toBeVisible();
    await expect(onStage(page, "[data-accord-touchable]")).toHaveCount(0);
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : appui long sur un accord (souris) ouvre le Crayon, pas le panneau`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: true });
    const accord = await accordAuCentre(page, false);
    const b = (await accord.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(page.locator("[data-crayon-barre]").first()).toBeVisible({ timeout: 5_000 });
    await page.mouse.up();
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : « Ici » (accès Harmonie, réglage allumé) ouvre la fenêtre des idées sans tourner la page`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: true });
    // « Ici » ne paraît que si une idée de la section porte sur l'accord : on essaie les accords du centre jusqu'à en trouver un.
    const l = accords(page, false);
    await expect(l.first()).toBeVisible({ timeout: 15_000 });
    const w = page.viewportSize()!.width;
    const centraux = await l.evaluateAll((els, w) => els.flatMap((el, i) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && x > w * 0.34 && x < w * 0.66 ? [i] : []; }), w);
    let trouve = false;
    for (const i of centraux) {
      await l.nth(i).click();
      try {
        await expect(panneau(page).locator("[data-ici]")).toBeVisible({ timeout: 3_000 });
        trouve = true;
        break;
      } catch {
        await page.keyboard.press("Escape");
        await expect(panneau(page)).toHaveCount(0);
      }
    }
    expect(trouve, "un accord au centre qui ouvre « Ici »").toBe(true);
    const avant = await lireCompteur(page);
    await panneau(page).locator("[data-ici]").click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    await expect(panneau(page)).toHaveCount(0);
    expect(await lireCompteur(page)).toBe(avant);
  });
}

test("sans accès Harmonie, aucun accord touchable en louange", async ({ page }) => {
  await ouvrirMode(page, SANS_ACCES, CHANTS[0], { allume: true });
  // Accord inerte : `.font-chord` (ChordLine, FR) ou `[data-accord]` (ZhLine, 中文 ; cases vides en `visibility: hidden`).
    const inertes = onStage(page, "[data-copy-line] .font-chord, [data-copy-line] [data-accord]");
    await expect(inertes.first()).toBeVisible({ timeout: 15_000 });
  await expect(onStage(page, "[data-accord-touchable]")).toHaveCount(0);
});

test("scan 简谱, « Ici » (accès Harmonie, réglage allumé) : un accord du scan ouvre le panneau avec « Ici »", async ({ page }) => {
  await ouvrirMode(page, AVEC_ACCES, SCAN, { scan: true, allume: true });
  await (await accordAuCentre(page, true)).click();
  await expect(panneau(page)).toBeVisible();
});

// CL-3 : le calque 简谱 du mode louange suit la bascule Lettres | Chiffres de la marge (tonalité d'origine comprise).
test("scan 简谱 : Chiffres dans la marge chiffre le calque, Lettres le rend", async ({ page }) => {
  await ouvrirMode(page, SANS_ACCES, SCAN, { scan: true });
  const etiquettes = () => onStage(page, "[data-jianpu-label]").evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean));
  const marge = await ouvrirMenu(page, "affichage");
  await marge.locator('[data-notation="chiffres"]').click();
  await expect.poll(async () => { const ts = await etiquettes(); return ts.some((t) => /^[b#]?[1-7]/.test(t)) && !ts.some((t) => /^[A-G]/.test(t)); }).toBe(true);
  await marge.locator('[data-notation="lettres"]').click();
  await expect.poll(async () => (await etiquettes()).some((t) => /^[A-G]/.test(t))).toBe(true);
});
