import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, fermerBarre, lireCompteur, onStage } from "./helpers/louange";

// Lot CL, CL-1 (docs/spec-corrections-louange.md ; ex-JV-4) : dans le mode louange, l'interrupteur « 2 colonnes » ne vaut
// plus que pour les chants en texte ; un scan 简谱 reste une page d'écran entière, allumé comme éteint (clé j2 / j3,
// aucune colonne de scan). Aucun accès Firestore réel : tout est simulé (`signInAs`).

type Ligne = { y0: number; y1: number; barres: number[] };
type Systemes = { chants: Record<string, { pages: { w: number; h: number; lignes: Ligne[] }[] }> };
const SYSTEMES = JSON.parse(readFileSync("public/jianpu/systemes.json", "utf8")) as Systemes;

const UNE = "恒久恒久以前"; // un scan d'une page
const DEUX = "为我而来"; // un scan de deux pages
const FR = "abba-pere"; // chant en texte, sans scan

const MUSICIENNE: FakeProfile = {
  uid: "uid-cl1",
  email: "cl1@example.com",
  firstName: "Iris",
  lastName: "Exemplaire",
  planningName: "Iris E.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

test.use({ deviceScaleFactor: 1 });

const grandEcran = (page: Page) => page.viewportSize()!.width >= 1024;

async function ouvrirLouange(page: Page, opts: { colonnes?: boolean; sombre?: boolean; zh?: boolean; chants?: string[]; demi?: boolean } = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(
    ([colonnes, sombre, zh, demi]) => {
      localStorage.setItem("perf-role-preset", "pianiste");
      if (colonnes === false) localStorage.setItem("perf-two-columns", "0");
      if (sombre) localStorage.setItem("theme", "dark");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      if (demi && !sessionStorage.getItem("demi-init")) { sessionStorage.setItem("demi-init", "1"); localStorage.setItem("perf-demi-page", "1"); }
    },
    [opts.colonnes ?? true, !!opts.sombre, !!opts.zh, !!opts.demi] as const,
  );
  const item = { showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" };
  const chants = opts.chants ?? [UNE, DEUX, FR];
  await signInAs(page, MUSICIENNE, {
    "setlists/setlist-cl1": {
      title: "Culte du 22 novembre", leader: "Léa Exemple", category: "Culte Francophone", date: "2026-11-22",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: chants.map((slug, i) => ({ ...item, songSlug: slug, position: i + 1, keyOverride: null, jianpuSheet: slug !== FR })),
    },
  }, "/setlists/setlist-cl1");
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/, 30_000);
  await page.locator("[data-performance-mode]").waitFor();
  if (chants.some((c) => c !== FR)) await expect(page.locator("[data-performance-mode] [data-jianpu-fenetre]").first()).toBeAttached({ timeout: 30_000 });
  // Pagination stable (systemes.json arrivé).
  let dernier = "";
  await expect(async () => {
    const lu = (await lireCompteur(page)).split("/")[1];
    const stable = lu === dernier;
    dernier = lu;
    expect(stable).toBe(true);
  }).toPass({ timeout: 15_000, intervals: [500] });
}

type Ecran = { fenetres: number; tranches: number; volets: number; cle: string };

async function lireEcran(page: Page): Promise<Ecran> {
  return page.evaluate(() => {
    const vu = (e: Element) => !e.closest("[aria-hidden=true]");
    const q = (s: string) => Array.from(document.querySelectorAll(`[data-performance-mode] ${s}`)).filter(vu).length;
    return {
      fenetres: q("[data-jianpu-fenetre]"), tranches: q("[data-jianpu-tranche]"), volets: q("[data-jianpu-volet]"),
      cle: document.querySelector("[data-performance-mode]")!.getAttribute("data-cle-page") ?? "",
    };
  });
}

/** Bords gauches distincts des sections de la page en texte affichée : 1 = une colonne, 2 = deux. */
async function colonnesTexte(page: Page): Promise<number> {
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
  const lefts = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  return new Set(lefts).size;
}

async function parcourir(page: Page): Promise<Ecran[]> {
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const out: Ecran[] = [];
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    out.push(await lireEcran(page));
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  return out;
}

// ─── Dans le mode louange ───────────────────────────────────────────────────

test("« 2 colonnes » allumé (grand écran) : un scan reste une page entière, clé j2 / j3, aucune colonne de scan", async ({ page }) => {
  test.setTimeout(150_000);
  test.skip(!grandEcran(page), "« 2 colonnes » n'existe qu'en grand écran (ordinateur, tablette paysage)");
  await ouvrirLouange(page, { chants: [UNE, FR] });
  await fermerBarre(page);
  const ecrans = await parcourir(page);
  const scans = ecrans.filter((e) => e.fenetres > 0);
  expect(scans.length, "une page de scan, une page d'écran").toBe(SYSTEMES.chants[UNE].pages.length);
  for (const e of scans) {
    expect(e.fenetres, "une seule fenêtre").toBe(1);
    expect(e.tranches, "sans tranche").toBe(0);
    expect(e.volets, "aucune colonne de scan").toBe(0);
    expect(e.cle).toMatch(/j3$/);
  }
});

test("« 2 colonnes » allumé ou éteint : le scan est identique, une page entière", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  await ouvrirLouange(page, { chants: [UNE, FR] });
  const allume = await lireEcran(page);
  // Éteint (préférence de l'appareil) : la même page entière.
  await page.evaluate(() => { localStorage.setItem("perf-two-columns", "0"); });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await expect.poll(() => lireEcran(page), { timeout: 30_000 }).toEqual(allume);
});

test("un chant en texte garde ses deux colonnes quand « 2 colonnes » est allumé (une colonne éteint)", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  await ouvrirLouange(page, { chants: [FR] });
  expect(await colonnesTexte(page)).toBe(2);
  await page.evaluate(() => { localStorage.setItem("perf-two-columns", "0"); });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await expect.poll(() => colonnesTexte(page)).toBe(1);
});

test("téléphone et tablette portrait : un scan est une page entière, aucune colonne de scan", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(grandEcran(page), "petits écrans seulement");
  await ouvrirLouange(page, { chants: [UNE, FR] });
  const e = await lireEcran(page);
  expect(e.fenetres).toBe(1);
  expect(e.tranches + e.volets).toBe(0);
  expect(e.cle).toMatch(/j2$/);
});

test("deux pages de scan (为我而来) : deux pages d'écran entières, sans trou", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [DEUX, FR] });
  await fermerBarre(page);
  const ecrans = await parcourir(page);
  const scans = ecrans.filter((e) => e.fenetres > 0);
  expect(scans.length).toBe(SYSTEMES.chants[DEUX].pages.length);
  // Les deux premiers écrans se suivent (pas de page vide entre les deux pages du scan).
  expect(ecrans.slice(0, scans.length).every((e) => e.fenetres === 1 && e.tranches === 0 && e.volets === 0)).toBe(true);
  expect(new Set(scans.map((e) => e.cle)).size, "deux clés distinctes").toBe(scans.length);
});

test("demi-page sur un scan : la coupe tombe entre deux pages d'écran entières, sans colonne", async ({ page }, info) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [DEUX], demi: true });
  const total = Number((await lireCompteur(page)).split("/")[1]);
  expect(total).toBe(SYSTEMES.chants[DEUX].pages.length);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-performance-mode][data-demi-page]")).toHaveCount(1);
  expect(await lireCompteur(page)).toMatch(/^1 \//);
  await expect(page.locator("[data-performance-mode] [data-jianpu-volet]")).toHaveCount(0);
  await expect(page.locator("[data-performance-mode] [data-jianpu-tranche]")).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/cl1-${info.project.name}-demi.png` });
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
});

// ─── Captures CL-1 : FR et 中文, clair et sombre, sur chaque projet ─────────

for (const zh of [false, true]) {
  for (const sombre of [false, true]) {
    for (const chant of [UNE, DEUX]) {
      test(`capture CL-1, ${zh ? "中文" : "FR"}, ${sombre ? "sombre" : "clair"}, ${chant}`, async ({ page }, info) => {
        test.setTimeout(90_000);
        await ouvrirLouange(page, { zh, sombre, chants: [chant, FR] });
        await fermerBarre(page);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `test-results/cl1-${info.project.name}-${zh ? "zh" : "fr"}-${sombre ? "sombre" : "clair"}-${chant}.png` });
      });
    }
  }
}
