import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";
import { loadChords } from "./helpers/jianpu";
import { bornesX, coupeMilieu, voletsDemiLignes, type SectionScan } from "../src/lib/performance/tranchesScan";

// Lot JV, tranche JV-3 (docs/spec-jianpu-deux-volets.md, piste B) : dans la vue Partitions, le scan 简谱 passe en deux
// colonnes de demi-lignes dès 1 000 px de zone (ordinateur-1440) ; en dessous (téléphone, tablette, 1 280, tablette
// paysage : zone < 1 000 px, décision déléguée) il reste sur une colonne de 920 px au plus. Captures : test-results/jv3/.
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

test("ordinateur-1440 : la fonction pure répartit tous les scans (fenêtres une fois, coupe entre systèmes, au plus 5 sans volets)", async ({}, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "Pure : indépendante de l'appareil");
  const systemes = lire("systemes.json").chants, marges = lire("marges.json"), sections = lire("sections.json").chants, chords = loadChords();
  let nuls = 0;
  for (const slug of Object.keys(systemes)) {
    const pages = systemes[slug].pages.map((p: { w: number; h: number; lignes: { y0: number; y1: number; barres: number[] }[] }, i: number) => ({ lignes: p.lignes, h: p.h, ...bornesX(p.w, marges[slug]?.[i]) }));
    const secs: SectionScan[] = sections[slug]?.sections ?? [];
    const v = voletsDemiLignes(pages, secs, 528, 920 / (systemes[slug].pages[0].w - 28), chords[slug]?.labelH ?? 0);
    if (!v) { nuls++; continue; }
    const tout = [...v.colonnes[0], ...v.colonnes[1]];
    const attendu = pages.flatMap((p: typeof pages[number], page: number) =>
      p.lignes.flatMap((l: { barres: number[] }, k: number) => (coupeMilieu(l.barres ?? [], p.x0, p.x1) === null ? [`${page}-${k}-`] : [`${page}-${k}-g`, `${page}-${k}-d`])));
    expect(tout.map((f) => `${f.page}-${f.ligne}-${f.moitie ?? ""}`), slug).toEqual(attendu);
    const a = v.colonnes[0].at(-1)!, b = v.colonnes[1][0];
    expect(a.page !== b.page || a.ligne !== b.ligne, `${slug} : coupe entre systèmes`).toBe(true);
    const debuts = new Set(secs.map((s) => `${s.page - 1}-${(s.anacrouse && s.ligne > 1 ? s.ligne - 1 : s.ligne) - 1}`));
    // Une coupe de section au-delà de 2 demi-lignes d'écart est refusée : la coupe est alors celle du milieu (sans sections).
    const milieu = voletsDemiLignes(pages, [], 528, 920 / (systemes[slug].pages[0].w - 28), chords[slug]?.labelH ?? 0)!;
    if (debuts.has(`${b.page}-${b.ligne}`) && milieu.colonnes[0].length !== v.colonnes[0].length) expect(Math.abs(v.colonnes[0].length - v.colonnes[1].length), `${slug} : colonnes`).toBeLessThanOrEqual(2);
  }
  expect(nuls, "scans sans volets à 528 px").toBeLessThanOrEqual(5);
});

test("ordinateur-1440 : deux colonnes de demi-lignes, accords ≥ 11 px et pas plus gros qu'aujourd'hui, calque calé, 为我而来 sans trou (JV-3)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "1 440 × 900");
  await ouvrir(page, info.project.name);
  await expect(enveloppe(page, 2)).toHaveAttribute("data-scan-volets", "2");
  await imagesChargees(page);
  const m = await enveloppe(page, 2).evaluate((env) => {
    const col = [0, 1].map((c) => env.querySelector(`[data-jianpu-volet="${c}"]`)!.getBoundingClientRect());
    const img = env.querySelector<HTMLImageElement>("[data-jianpu-page] img")!;
    const p0 = env.querySelector("[data-jianpu-page]")!.getBoundingClientRect();
    const fenetre = img.closest("[data-jianpu-fenetre]")!.getBoundingClientRect();
    const echelle = img.getBoundingClientRect().width / Number(img.getAttribute("width"));
    // Calque : chaque étiquette a sa gomme au même endroit (la gomme efface l'accord gravé, l'étiquette l'écrit).
    const labels = Array.from(env.querySelectorAll("[data-jianpu-label]")).map((e) => ({ r: e.getBoundingClientRect(), page: e.closest("[data-jianpu-page]")! }));
    const gommes = Array.from(env.querySelectorAll("[data-jianpu-gomme]")).map((e) => ({ r: e.getBoundingClientRect(), page: e.closest("[data-jianpu-page]")! }));
    const sansGomme = labels.filter((l) => !gommes.some((g) => g.page === l.page && Math.abs(g.r.left - l.r.left) <= 2 && Math.abs(g.r.top - l.r.top) <= 2)).length;
    return {
      gauche: col[0].left, droite: col[1].right, g0: col[0].right, d0: col[1].left, hautG: col[0].top, hautD: col[1].top,
      echelle, w: Number(img.getAttribute("width")), fenetre: fenetre.width, p0: p0.width, labels: labels.length, sansGomme,
      fenetres: env.querySelectorAll("[data-jianpu-moitie]").length,
    };
  });
  expect(m.d0, "colonnes côte à côte").toBeGreaterThanOrEqual(m.g0);
  expect(Math.abs(m.hautG - m.hautD), "colonnes alignées en haut").toBeLessThan(4);
  expect(m.droite, "rien au-delà de 1 440").toBeLessThanOrEqual(1440);
  const labelH = loadChords()["为我而来"].labelH;
  const imprime = labelH * m.echelle;
  const aujourdhui = (labelH * 920) / (m.w - 28);
  expect(imprime, "accords imprimés ≥ 11 px").toBeGreaterThanOrEqual(11);
  expect(imprime, "accords imprimés ≤ aujourd'hui").toBeLessThanOrEqual(aujourdhui + 0.5);
  expect(m.labels, "étiquettes rendues").toBeGreaterThan(0);
  expect(m.sansGomme, "étiquettes sans gomme alignée (±2 px)").toBe(0);

  // 为我而来 (deux pages) : chaque ligne des deux pages est rendue, une fenêtre par moitié.
  const systemes = lire("systemes.json").chants["为我而来"].pages, marges = lire("marges.json")["为我而来"];
  let attendu = 0;
  const lignes: string[] = [];
  systemes.forEach((p: { w: number; lignes: { y0: number; y1: number; barres: number[] }[] }, i: number) => {
    const { x0, x1 } = bornesX(p.w, marges?.[i]);
    p.lignes.forEach((l) => { attendu += coupeMilieu(l.barres ?? [], x0, x1) === null ? 1 : 2; lignes.push(`${i}:${l.y0}-${l.y1}`); });
  });
  const rendues = await enveloppe(page, 2).locator("[data-jianpu-moitie]").evaluateAll((els) =>
    els.map((e) => `${e.querySelector("[data-jianpu-page]")!.getAttribute("data-jianpu-page")}:${e.getAttribute("data-jianpu-lignes")}`));
  expect(rendues.length, "nombre de fenêtres").toBe(attendu);
  expect(Array.from(new Set(rendues)).sort(), "toutes les lignes des deux pages").toEqual([...lignes].sort());

  await enveloppe(page, 2).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/jv3/ordinateur-1440-zh-clair.png" });
  await page.locator('[data-outline-item="1"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/jv3/ordinateur-1440-fr-clair.png" });
});

test("ordinateur-1440 sombre : captures FR et 简谱 (JV-3)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "Sombre : 1 440 seulement");
  await ouvrir(page, info.project.name, true);
  await expect(enveloppe(page, 3)).toHaveAttribute("data-scan-volets", "2");
  await imagesChargees(page);
  await enveloppe(page, 3).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/jv3/ordinateur-1440-zh-sombre.png" });
  await page.locator('[data-outline-item="1"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/jv3/ordinateur-1440-fr-sombre.png" });
});

test("une colonne et rendu d'aujourd'hui : zone < 1 000 px (téléphone, tablette, 1 280, tablette paysage ; décision déléguée) (JV-3)", async ({ page }, info) => {
  test.skip(info.project.name === "ordinateur-1440", "Zone ≥ 1 000 px : volets");
  await ouvrir(page, info.project.name);
  const env = enveloppe(page, 2);
  await expect(env).toBeVisible();
  await imagesChargees(page);
  await expect(env).toHaveAttribute("data-scan-volets", "1");
  await expect(env.locator("[data-jianpu-volets]")).toHaveCount(0);
  expect((await env.boundingBox())!.width, "au plus 920 px").toBeLessThanOrEqual(920.5);
  await env.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/jv3/${info.project.name}-zh-clair.png` });
});
