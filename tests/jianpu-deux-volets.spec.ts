import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";

// Lot CL, CL-1 (docs/spec-corrections-louange.md ; JV-3 retiré) : dans la vue Partitions, le scan 简谱 reste sur une
// colonne de 920 px au plus, à toutes les largeurs (1 440 compris), calque calé sur l'image. Captures : test-results/cl1-*-partitions.png.
// Setlist et compte simulés, noms fictifs.

const MEMBRE: FakeProfile = {
  uid: "uid-membre", email: "membre@example.com", firstName: "Lison", lastName: "Verdier", planningName: "Lison V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const item = (songSlug: string, position: number, keyOverride: string | null = null) => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const DOCS = {
  "setlists/sjv": {
    title: "Veillée du 15 novembre", leader: "Lison V.", category: "Culte Francophone", date: "2026-11-15", language: "mixed",
    notes: "", ownerId: "uid-membre", isPrivate: false, items: [item("hosanna", 1), item("为我而来", 2, "D"), item("全新的你", 3)],
  },
};
const FENETRES: Record<string, { width: number; height: number }> = {
  telephone: { width: 390, height: 844 },
  tablette: { width: 820, height: 1180 },
  "tablette-paysage": { width: 1080, height: 810 },
  ordinateur: { width: 1280, height: 720 },
  "ordinateur-1440": { width: 1440, height: 900 },
};
const JIANPU = path.resolve(__dirname, "..", "public", "jianpu");
const lire = (f: string) => JSON.parse(fs.readFileSync(path.join(JIANPU, f), "utf8"));

async function ouvrir(page: Page, projet: string, sombre = false) {
  await page.setViewportSize(FENETRES[projet]);
  await page.addInitScript((dark) => {
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", "always");
    if (dark) localStorage.setItem("theme", "dark");
  }, sombre);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MEMBRE, DOCS, "/setlists/sjv");
  await ouvrirPartitions(page);
  await page.evaluate(() => document.fonts.ready);
}
const enveloppe = (page: Page, n: number) => page.locator(`[data-outline-item="${n}"] [data-enveloppe-scan]`);
const imagesChargees = (page: Page) =>
  page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));

test("vue Partitions : scan en une colonne à toutes les largeurs (1 440 compris), au plus 920 px, accords lisibles, calque calé sur l'image", async ({ page }, info) => {
  await ouvrir(page, info.project.name);
  const env = enveloppe(page, 2);
  await expect(env).toBeVisible();
  await imagesChargees(page);
  await expect(env.locator("[data-jianpu-volets], [data-jianpu-volet], [data-jianpu-moitie]")).toHaveCount(0);
  expect((await env.boundingBox())!.width, "au plus 920 px").toBeLessThanOrEqual(920.5);
  // 为我而来 : une fenêtre par page de scan, la page entière.
  const pages = lire("systemes.json").chants["为我而来"].pages.length;
  await expect(env.locator("[data-jianpu-fenetre]")).toHaveCount(pages);
  const m = await env.evaluate((e) => {
    const calque = Array.from(e.querySelectorAll("[data-jianpu-page]")).map((p, i) => {
      const f = p.querySelector("[data-jianpu-filtre]")!.getBoundingClientRect();
      // Le calque n'existe que sur la première page d'un scan.
      const cel = p.querySelector("[data-jianpu-calque]");
      if (!cel) return { dx: i === 0 ? Infinity : 0, dy: i === 0 ? Infinity : 0 };
      const c = cel.getBoundingClientRect();
      return { dx: Math.max(Math.abs(f.left - c.left), Math.abs(f.right - c.right)), dy: Math.max(Math.abs(f.top - c.top), Math.abs(f.bottom - c.bottom)) };
    });
    // Calque : chaque étiquette a sa gomme au même endroit (la gomme efface l'accord gravé, l'étiquette l'écrit).
    const labels = Array.from(e.querySelectorAll("[data-jianpu-label]")).map((l) => ({ r: l.getBoundingClientRect(), page: l.closest("[data-jianpu-page]")! }));
    const gommes = Array.from(e.querySelectorAll("[data-jianpu-gomme]")).map((g) => ({ r: g.getBoundingClientRect(), page: g.closest("[data-jianpu-page]")! }));
    const sansGomme = labels.filter((l) => !gommes.some((g) => g.page === l.page && Math.abs(g.r.left - l.r.left) <= 2 && Math.abs(g.r.top - l.r.top) <= 2)).length;
    return { calque, labels: labels.length, sansGomme };
  });
  for (const c of m.calque) { expect(c.dx, "calque calé en largeur").toBeLessThanOrEqual(1.5); expect(c.dy, "calque calé en hauteur").toBeLessThanOrEqual(1.5); }
  expect(m.labels, "étiquettes rendues").toBeGreaterThan(0);
  expect(m.sansGomme, "étiquettes sans gomme alignée (±2 px)").toBe(0);
  await env.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/cl1-${info.project.name}-partitions-zh.png` });
});

test("vue Partitions, FR clair : capture", async ({ page }, info) => {
  await ouvrir(page, info.project.name);
  await imagesChargees(page);
  await page.locator('[data-outline-item="2"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/cl1-${info.project.name}-partitions.png` });
});

test("vue Partitions, sombre : une colonne aussi à 1 440 px", async ({ page }, info) => {
  await ouvrir(page, info.project.name, true);
  await imagesChargees(page);
  await expect(enveloppe(page, 3).locator("[data-jianpu-volets], [data-jianpu-volet]")).toHaveCount(0);
  await expect(enveloppe(page, 2).locator("[data-jianpu-volets], [data-jianpu-volet]")).toHaveCount(0);
});
