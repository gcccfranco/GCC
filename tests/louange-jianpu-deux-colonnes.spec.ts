import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, fermerBarre, lireCompteur } from "./helpers/louange";
import { bornesX, ECART_SYSTEMES, echelleFenetre, GOUTTIERE_VOLETS, tranchesDeuxColonnes } from "../src/lib/performance/tranchesScan";

// Lot JV, JV-4 (docs/spec-jianpu-deux-volets.md) : dans le mode louange, l'interrupteur « 2 colonnes » allumé pose un
// scan 简谱 certifié en deux colonnes de demi-lignes par page d'écran (ordinateur, tablette paysage) ; éteint, les
// tranches de lignes entières d'avant. Aucun accès Firestore réel : tout est simulé (`signInAs`).

type Ligne = { y0: number; y1: number; barres: number[] };
type Systemes = { chants: Record<string, { pages: { w: number; h: number; lignes: Ligne[] }[] }> };
const SYSTEMES = JSON.parse(readFileSync("public/jianpu/systemes.json", "utf8")) as Systemes;

const UN = "一生爱你"; // un scan d'une page
const DEUX = "为我而来"; // un scan de deux pages
const FR = "abba-pere"; // chant sans scan

const MUSICIENNE: FakeProfile = {
  uid: "uid-jv4",
  email: "jv4@example.com",
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
  const chants = opts.chants ?? [UN, DEUX, FR];
  await signInAs(page, MUSICIENNE, {
    "setlists/setlist-jv4": {
      title: "Culte du 22 novembre", leader: "Léa Exemple", category: "Culte Francophone", date: "2026-11-22",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: chants.map((slug, i) => ({ ...item, songSlug: slug, position: i + 1, keyOverride: null, jianpuSheet: slug !== FR })),
    },
  }, "/setlists/setlist-jv4");
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/, 30_000);
  await page.locator("[data-performance-mode]").waitFor();
  await expect(page.locator("[data-performance-mode] [data-jianpu-tranche]").first()).toBeAttached({ timeout: 30_000 });
  // Pagination stable (systemes.json, chords.json arrivés).
  let dernier = "";
  await expect(async () => {
    const lu = (await lireCompteur(page)).split("/")[1];
    const stable = lu === dernier;
    dernier = lu;
    expect(stable).toBe(true);
  }).toPass({ timeout: 15_000, intervals: [500] });
}

type Ecran = { titre: string; volets: { x: number; right: number; fenetres: { tranche: string; moitie: string; x: number; right: number; top: number; bottom: number }[] }[]; fenetres: number };

async function lireEcran(page: Page): Promise<Ecran> {
  return page.evaluate(() => {
    const scene = Array.from(document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-jianpu-fenetre]")).filter((e) => !e.closest("[aria-hidden=true]"));
    const titre = document.querySelector("[data-performance-mode] [data-barre-haut] p")?.textContent ?? "";
    const volets = Array.from(document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-jianpu-volet]"))
      .filter((v) => !v.closest("[aria-hidden=true]"))
      .map((v) => {
        const r = v.getBoundingClientRect();
        return {
          x: r.x, right: r.right,
          fenetres: Array.from(v.querySelectorAll<HTMLElement>("[data-jianpu-fenetre]")).map((f) => {
            const q = f.getBoundingClientRect();
            return { tranche: f.getAttribute("data-jianpu-tranche") ?? "", moitie: f.getAttribute("data-jianpu-moitie") ?? "", x: q.x, right: q.right, top: q.top, bottom: q.bottom };
          }),
        };
      });
    return { titre, volets, fenetres: scene.length };
  });
}

// ─── tranchesDeuxColonnes, pur ──────────────────────────────────────────────

test.describe("tranchesDeuxColonnes (pur)", () => {
  const p = SYSTEMES.chants[UN].pages[0];
  const { x0, x1 } = bornesX(p.w, undefined);
  const echelleMax = 1040 / (x1 - x0);

  test("toutes les lignes, dans l'ordre, une fois ; une page finit toujours sur une ligne complète", () => {
    const t = tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 1040, 640, echelleMax, 40)!;
    expect(t).not.toBeNull();
    const lignes = t.flatMap((tr) => tr.demi!.fenetres.map((f) => f.ligne));
    expect([...new Set(lignes)]).toEqual(p.lignes.map((_, k) => k));
    for (const tr of t) {
      const c2 = tr.demi!.colonne2!;
      expect(c2).toBeGreaterThan(0);
      // La page commence et finit sur une ligne complète ; la moitié droite d'une ligne peut ouvrir la colonne de droite.
      expect(tr.demi!.fenetres[0].moitie).not.toBe("d");
      expect(tr.demi!.fenetres.at(-1)!.moitie).not.toBe("g");
      expect(tr.premiere).toBe(tr.demi!.fenetres[0].ligne);
      expect(tr.derniere).toBe(tr.demi!.fenetres.at(-1)!.ligne);
    }
    // Pages contiguës.
    for (let k = 1; k < t.length; k++) expect(t[k].premiere).toBe(t[k - 1].derniere + 1);
  });

  test("échelle : la colonne sur la plus large demi-ligne, plafonnée à celle des lignes entières ; une ligne sans coupe se rapetisse seule", () => {
    const etroit = tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 1040, 5000, echelleMax, 40)!;
    const fs = etroit[0].demi!.fenetres;
    const large = Math.max(...(fs.some((f) => f.moitie) ? fs.filter((f) => f.moitie) : fs).map((f) => f.x1 - f.x0));
    // Paysage (Timothée, 13/11/2026) : chaque fenêtre tient dans sa colonne, aucune n'en déborde.
    for (const f of fs) expect((f.x1 - f.x0) * echelleFenetre(f, etroit[0].demi!.echelle, etroit[0].demi!.largeurCol)).toBeLessThanOrEqual((1040 - GOUTTIERE_VOLETS) / 2 + 0.01);
    expect(etroit[0].demi!.echelle).toBeCloseTo((1040 - GOUTTIERE_VOLETS) / 2 / large, 5);
    const plafond = tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 1040, 5000, 0.3, 40)!;
    expect(plafond[0].demi!.echelle).toBe(0.3);
  });

  test("tout tient : une page, colonnes équilibrées ; les hauteurs tiennent dans l'écran", () => {
    const t = tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 1040, 5000, echelleMax, 40)!;
    expect(t.length).toBe(1);
    const d = t[0].demi!;
    const h = (fs: typeof d.fenetres) => fs.reduce((s, f, n) => s + (f.y1 - f.y0) * echelleFenetre(f, d.echelle, d.largeurCol) + (n === 0 ? 0 : f.moitie === "d" ? 2 : ECART_SYSTEMES), 0);
    const g = h(d.fenetres.slice(0, d.colonne2));
    const dr = h(d.fenetres.slice(d.colonne2));
    expect(Math.abs(g - dr)).toBeLessThan(Math.max(g, dr));
    for (const tr of tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 1040, 600, echelleMax, 40)!) {
      const e = tr.demi!;
      for (const col of [e.fenetres.slice(0, e.colonne2), e.fenetres.slice(e.colonne2)]) {
        const haut = col.reduce((s, f, n) => s + (f.y1 - f.y0) * echelleFenetre(f, e.echelle, e.largeurCol) + (n === 0 ? 0 : f.moitie === "d" ? 2 : ECART_SYSTEMES), 0);
        expect(haut).toBeLessThanOrEqual(600 + 0.5);
      }
    }
  });

  test("accords imprimés sous 11 px ou une seule ligne : null (lignes entières)", () => {
    expect(tranchesDeuxColonnes(p.lignes, p.h, x0, x1, 400, 640, echelleMax, 40)).toBeNull();
    expect(tranchesDeuxColonnes(p.lignes.slice(0, 1), p.h, x0, x1, 1040, 640, echelleMax, 40)).toBeNull();
  });
});

// ─── Dans le mode louange ───────────────────────────────────────────────────

test("« 2 colonnes » allumé (grand écran) : chaque écran de scan montre deux colonnes de demi-lignes, toutes les lignes une fois, accords pas plus grands qu'en lignes entières", async ({ page }) => {
  test.setTimeout(150_000);
  test.skip(!grandEcran(page), "« 2 colonnes » n'existe qu'en grand écran (ordinateur, tablette paysage)");
  await ouvrirLouange(page, { chants: [UN, FR] });
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const lignesVues: number[] = [];
  let largeurDemi = 0;
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    const e = await lireEcran(page);
    if (e.fenetres > 0) {
      expect(e.volets.length, `écran ${n} : deux colonnes`).toBe(2);
      const [g, d] = e.volets;
      if (d.fenetres.length > 0) expect(d.x, "la colonne de droite est à droite").toBeGreaterThanOrEqual(g.right + GOUTTIERE_VOLETS - 1);
      for (const v of e.volets) {
        for (const f of v.fenetres) {
          expect(f.top).toBeGreaterThanOrEqual(0);
          expect(f.bottom, "rien ne sort de l'écran").toBeLessThanOrEqual(page.viewportSize()!.height + 1);
          largeurDemi = Math.max(largeurDemi, f.right - f.x);
        }
      }
      // L'écran commence sur une ligne complète.
      expect(g.fenetres[0].moitie).not.toBe("d");
      for (const v of e.volets) for (const f of v.fenetres) if (f.moitie !== "d") lignesVues.push(Number(f.tranche.split("-")[0]));
    }
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  const lignes = SYSTEMES.chants[UN].pages[0].lignes;
  expect(lignesVues.length, "chaque ligne une fois").toBe(lignes.length);
  expect([...lignesVues].sort((a, b) => a - b)).toEqual(lignesVues);
  expect(largeurDemi).toBeLessThanOrEqual(1040);
});

test("« 2 colonnes » éteint : lignes entières, comme avant (clé j4), aucune colonne", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  await ouvrirLouange(page, { colonnes: false, chants: [UN, FR] });
  const e = await lireEcran(page);
  expect(e.volets.length).toBe(0);
  expect(await page.locator("[data-performance-mode] [data-jianpu-moitie]:not([aria-hidden=true] *)").count()).toBe(0);
});

test("téléphone et tablette portrait : inchangés (aucune colonne de scan)", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(grandEcran(page), "petits écrans seulement");
  await ouvrirLouange(page, { chants: [UN, FR] });
  expect((await lireEcran(page)).volets.length).toBe(0);
});

test("clé d'annotation j6-<y0> en deux colonnes ; l'interrupteur repasse en lignes entières à chaud", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
    if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
  });
  await ouvrirLouange(page, { chants: [UN, FR] });
  await expect.poll(() => lues.some((c) => /j6-\d+$/.test(c))).toBe(true);
  // « 2 colonnes » éteint (préférence de l'appareil) : lignes entières.
  await page.evaluate(() => { localStorage.setItem("perf-two-columns", "0"); });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await expect(page.locator("[data-performance-mode] [data-jianpu-tranche]").first()).toBeAttached({ timeout: 30_000 });
  await expect.poll(async () => (await lireEcran(page)).volets.length).toBe(0);
  await expect.poll(() => lues.some((c) => /j4-\d+$/.test(c))).toBe(true);
});

test("deux pages de scan (为我而来) : chaque page de scan passe en colonnes, sans trou", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  await ouvrirLouange(page, { chants: [DEUX, FR] });
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  let vues = 0;
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    const e = await lireEcran(page);
    if (e.fenetres > 0) { expect(e.volets.length).toBe(2); vues += e.volets.flatMap((v) => v.fenetres).filter((f) => f.moitie !== "d").length; }
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  const attendu = SYSTEMES.chants[DEUX].pages.reduce((s, p) => s + p.lignes.length, 0);
  expect(vues).toBe(attendu);
});

test("demi-page en deux colonnes : coupe verticale, à gauche la colonne suivante, à droite celle de l'écran en cours", async ({ page }, info) => {
  test.setTimeout(120_000);
  test.skip(!grandEcran(page), "grand écran seulement");
  await ouvrirLouange(page, { chants: [DEUX], demi: true });
  const total = Number((await lireCompteur(page)).split("/")[1]);
  test.skip(total < 2, "le scan tient en un écran");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-performance-mode][data-demi-page]")).toHaveCount(1);
  await expect(page.locator("[data-performance-mode] [data-demi-filet-vertical]")).toHaveCount(1);
  expect(await lireCompteur(page)).toMatch(/^1 \//);
  // Le filet tombe dans la gouttière : aucune fenêtre visible ne le traverse.
  const traverse = await page.evaluate(() => {
    const f = document.querySelector("[data-performance-mode] [data-demi-filet-vertical]")!.getBoundingClientRect();
    const x = f.left + f.width / 2;
    return Array.from(document.querySelectorAll("[data-performance-mode] [data-demi-page-calques] [data-jianpu-fenetre]"))
      .map((e) => e.getBoundingClientRect()).filter((q) => q.width > 0 && q.left < x - 1 && q.right > x + 1).length;
  });
  expect(traverse).toBe(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/jv4-${info.project.name}-demi.png` });
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
});

// ─── Captures : FR et 中文, clair et sombre, sur chaque projet ──────────────

for (const zh of [false, true]) {
  for (const sombre of [false, true]) {
    test(`capture JV-4, ${zh ? "中文" : "FR"}, ${sombre ? "sombre" : "clair"}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await ouvrirLouange(page, { zh, sombre, chants: [UN, FR] });
      await fermerBarre(page);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/jv4-${info.project.name}-${zh ? "zh" : "fr"}-${sombre ? "sombre" : "clair"}.png` });
    });
  }
}
