import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";
import { accentsParDefaut, creerHorloge, dureeTemps, parseMesure } from "../src/lib/performance/metronome";

// Métronome MT-1 (docs/spec-metronome.md) : la bande des temps, sans son. Setlist et compte simulés.

const SETLIST_ID = "setlist-metronome";
const MUSICIEN: FakeProfile = { uid: "uid-lecteur", email: "lecteur@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai", leader: "Présidence", category: "Culte Francophone", date: "2026-09-14", language: "mixed",
  notes: "", ownerId: "uid-owner", isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});

async function ouvrir(page: Page, slugs: string[], opts: { tempo?: string; clock?: boolean } = {}) {
  if (opts.clock) await page.clock.install();
  await page.addInitScript(({ slug, tempo }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-metronome", "1");
    if (tempo) localStorage.setItem(`perf-tempo-${slug}`, tempo);
  }, { slug: slugs[0], tempo: opts.tempo });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

const bande = (page: Page) => page.locator("[data-bande-temps]");
const marche = (page: Page) => page.locator("[data-metronome-marche]:visible").first();
const actif = (page: Page) => bande(page).locator("[data-actif]");

test("parseMesure, accentsParDefaut, dureeTemps et l'horloge (unitaire)", () => {
  expect(parseMesure("3/4")).toMatchObject({ temps: 3, groupes: [3], compose: false });
  expect(parseMesure("6/8")).toMatchObject({ temps: 6, groupes: [3, 3], compose: true });
  expect(parseMesure("12/8").groupes).toEqual([3, 3, 3, 3]);
  expect(parseMesure("5/8")).toMatchObject({ temps: 5, compose: false });
  expect(parseMesure("13/4").temps).toBe(4);
  expect(parseMesure("n'importe quoi").temps).toBe(4);
  expect(parseMesure(null).temps).toBe(4);
  expect(accentsParDefaut(parseMesure("3/4"))).toEqual(["fort", "faible", "faible"]);
  expect(accentsParDefaut(parseMesure("12/8")).map((a, i) => (a === "moyen" ? i + 1 : 0)).filter(Boolean)).toEqual([4, 7, 10]);
  expect(dureeTemps(120, parseMesure("4/4"))).toBe(500);
  expect(dureeTemps(60, parseMesure("6/8"))).toBeCloseTo(1000 / 3);
  const h = creerHorloge();
  expect(h.position(0)).toBeNull();
  h.demarrer(0, 500, 4);
  expect(h.position(1600)).toMatchObject({ temps: 3, mesure: 0 });
  h.changerTempo(250, 1600); // prend effet au temps suivant (2000)
  expect(h.position(1999)).toMatchObject({ temps: 3 });
  expect(h.position(2000)).toMatchObject({ temps: 0, mesure: 1 });
  expect(h.position(2250)).toMatchObject({ temps: 1, mesure: 1 });
  h.changerMesure(3, 2300); // à la mesure suivante : 4 temps de 250 ms depuis 2000, soit 3000
  expect(h.position(2999)).toMatchObject({ temps: 3, mesure: 1 });
  expect(h.position(3000)).toMatchObject({ temps: 0, mesure: 2 });
  h.arreter();
  expect(h.position(3000)).toBeNull();
});

test("à 120 en 4/4, la pastille allumée avance d'un temps toutes les 500 ms", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { tempo: "120", clock: true });
  await expect(bande(page).locator("[data-temps]")).toHaveCount(4);
  await expect(actif(page)).toHaveCount(0);
  await marche(page).click();
  await expect(actif(page)).toHaveCount(1);
  // React rend le temps suivant après l'image (horloge simulée) : on attend l'attribut au lieu de le lire aussitôt.
  const debut = Number(await actif(page).getAttribute("data-temps"));
  for (let i = 1; i < 5; i++) {
    await page.clock.runFor(500);
    await expect(actif(page)).toHaveAttribute("data-temps", String(((debut - 1 + i) % 4) + 1));
  }
});

test("6/8 : six pastilles en deux groupes, temps 1 fort et 4 moyen", async ({ page }) => {
  await ouvrir(page, ["为我而来"]);
  await expect(bande(page).locator("[data-temps]")).toHaveCount(6);
  await expect(bande(page).locator("[data-bande-groupe]")).toHaveCount(2);
  await expect(bande(page).locator('[data-temps="1"]')).toHaveAttribute("data-accent", "fort");
  await expect(bande(page).locator('[data-temps="4"]')).toHaveAttribute("data-accent", "moyen");
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "faible");
});

test("12/8 : douze pastilles ; au téléphone chiffrées seulement 1, 4, 7, 10 (téléphone)", async ({ page }, info) => {
  await ouvrir(page, ["活出爱"]);
  await expect(bande(page).locator("[data-temps]")).toHaveCount(12);
  test.skip(info.project.name !== "telephone", "chiffres limités au téléphone");
  const chiffres = await bande(page).locator("[data-temps]").evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ""));
  expect(chiffres).toEqual(["1", "", "", "4", "", "", "7", "", "", "10", "", ""]);
  for (const h of await bande(page).locator("[data-temps]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeLessThanOrEqual(24);
  const m = (await marche(page).boundingBox())!;
  expect(m.width).toBeGreaterThanOrEqual(44);
});

// Le temps muet tramé (tirets au repos, trame en cours) se règle et se vérifie depuis MT-2 : tests/metronome-panneau.spec.ts.

test("mouvement réduit : ni transition ni animation sur les pastilles, le temps avance toujours", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ouvrir(page, ["avec-nous"], { tempo: "120", clock: true });
  const p = bande(page).locator("[data-temps]").first();
  await expect(p).toHaveCSS("transition-duration", "0s");
  await expect(p).toHaveCSS("animation-name", "none");
  await marche(page).click();
  const a = Number(await actif(page).getAttribute("data-temps"));
  await page.clock.runFor(500);
  await expect(actif(page)).toHaveAttribute("data-temps", String((a % 4) + 1));
});

test("aucun chevauchement entre la bande et le premier élément de la page", async ({ page }) => {
  for (const slug of ["avec-nous", "为我而来"]) {
    await ouvrir(page, [slug]);
    const b = (await bande(page).boundingBox())!;
    // Scan : la boîte qui rogne (parent de [data-jianpu-page]), car une tranche déborde au-dessus de ce qu'on voit.
    const premier = slug === "avec-nous" ? onStage(page, "[data-section]").first() : onStage(page, "[data-jianpu-page]").first();
    await expect(premier).toBeVisible();
    // JV-5c : le parent est un enveloppe `display: contents` ; la boîte qui rogne est le premier ancêtre qui a un rectangle.
    const hauts = slug === "avec-nous"
      ? [(await premier.boundingBox())!.y]
      : await onStage(page, "[data-jianpu-page]").evaluateAll((els) => els.map((e) => {
        let p = e.parentElement;
        while (p && p.getBoundingClientRect().width === 0) p = p.parentElement;
        return p!.getBoundingClientRect();
      }).filter((r) => r.width > 0 && r.height > 0).map((r) => r.top));
    expect(hauts.length).toBeGreaterThan(0);
    expect(Math.min(...hauts)).toBeGreaterThanOrEqual(b.y + b.height - 0.5);
    await page.goto("about:blank");
  }
});

test("contraste du contour au repos >= 3:1, en clair et en sombre", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  for (const sombre of [false, true]) {
    await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
    const [contour, fond] = await page.evaluate(() => {
      const p = document.querySelector("[data-bande-temps] [data-temps=\"2\"]")!;
      return [getComputedStyle(p).borderTopColor, getComputedStyle(document.querySelector("[data-bande-temps]")!).backgroundColor];
    });
    const rgba = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const [fr, fg, fb] = rgba(fond);
    const [r, g, b, a = 1] = rgba(contour);
    const mix = [r, g, b].map((v, i) => v * a + [fr, fg, fb][i] * (1 - a));
    const lum = ([x, y, z]: number[]) => [x, y, z].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
    const l1 = lum(mix), l2 = lum([fr, fg, fb]);
    expect((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toBeGreaterThanOrEqual(3);
  }
});

test("changement de chant : le métronome s'arrête", async ({ page }) => {
  await ouvrir(page, ["avec-nous", "abba-pere"]);
  await marche(page).click();
  await expect(actif(page)).toHaveCount(1);
  const suivant = onStage(page, "[data-suivant]");
  for (let i = 0; i < 20 && (await suivant.count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(suivant).toHaveCount(1);
  await suivant.dispatchEvent("click");
  await expect(marche(page)).toHaveAttribute("aria-pressed", "false");
  await expect(actif(page)).toHaveCount(0);
});

test("à l'arrêt : aucune pastille allumée, bouton ▶", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await expect(actif(page)).toHaveCount(0);
  await expect(marche(page)).toHaveAttribute("aria-pressed", "false");
});
