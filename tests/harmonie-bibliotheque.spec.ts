import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { avantApres } from "../src/lib/harmonie/avantApres";

// Harmonie H6-1 (docs/spec-harmonie-accords.md) : la bibliothèque. Filtres Ressenti et Usage, liste à plat
// ordonnée par niveau, lignes sans troncature, parcours replié, fiche large en deux volets. Personne fictive.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Léa M.", "", "", "Mathilde R.", "", "", "", "", "", "", ""],
]);
const MATHILDE: FakeProfile = { uid: "uid-mathilde", email: "mathilde.r@example.com", planningName: "Mathilde R.", ...musicien("piano") };

const LIGNES = "[data-harmonie] a[href^='/harmonie/']:not([href^='/harmonie/cours']):not([href^='/harmonie/rd2000']):not([data-parcours] a)";

// Une fiche qui a une carte « Avant → après » lisible et des passages dans « a-jamais-tu-es-saint » (premier : chorus-4-3).
const FICHE = "/harmonie/substitutions/2m7-pour-4";

async function ouvrirFiche(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MATHILDE, {}, FICHE);
  await expect(page.locator(`[data-fiche="${FICHE.slice(10)}"]`)).toBeVisible();
}

async function ouvrir(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MATHILDE, {}, "/harmonie");
  await expect(page.locator(LIGNES).first()).toBeVisible();
}

for (const [rangee, mot] of [["Ressenti", "Chaleureux"], ["Usage", "Refrain"]] as const) {
  test(`le filtre ${rangee} « ${mot} » réduit la liste, chaque ligne le porte ; un second appui rend tout`, async ({ page }) => {
    await ouvrir(page);
    const lignes = page.locator(LIGNES);
    const total = await lignes.count();
    const pilule = page.getByRole("group", { name: rangee }).getByRole("button", { name: mot, exact: true });
    await pilule.click();
    await expect.poll(() => lignes.count()).toBeLessThan(total);
    const textes = await lignes.allTextContents();
    expect(textes.length).toBeGreaterThan(0);
    for (const t of textes) expect(t).toContain(mot);
    await pilule.click();
    await expect.poll(() => lignes.count()).toBe(total);
  });
}

test("le niveau ordonne la liste : aucune fiche « Facile » après une « Intermédiaire » ou « Avancé »", async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByText("Du plus simple au plus avancé")).toBeVisible();
  const rang = (t: string) => (/Facile\s*$/.test(t) ? 0 : /Intermédiaire\s*$/.test(t) ? 1 : /Avancé\s*$/.test(t) ? 2 : 3);
  const rangs = (await page.locator(LIGNES).allTextContents()).map(rang);
  expect(rangs).toContain(0);
  expect(rangs).toContain(2);
  expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
});

test("aucune ligne de sous-titre n'est tronquée", async ({ page }) => {
  await ouvrir(page);
  const m = await page.locator(`${LIGNES} .text-muted-foreground`).evaluateAll((els) =>
    els.map((el) => ({ coupe: el.scrollHeight > el.clientHeight + 1, points: getComputedStyle(el).textOverflow === "ellipsis" })),
  );
  expect(m.length).toBeGreaterThan(0);
  expect(m.filter((x) => x.coupe || x.points)).toEqual([]);
});

test("« Par où commencer » est replié au départ, puis se déplie sur place", async ({ page }) => {
  await ouvrir(page);
  const bouton = page.locator("[data-parcours]").getByRole("button", { name: /Par où commencer/ });
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-parcours]").getByRole("link")).toHaveCount(3);
});

test("ordinateur : la fiche a au moins 640 px de large (liste de 280 px)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "ordinateur 1 280 seulement");
  await ouvrir(page);
  const b = await page.locator('[data-volet="detail"]').boundingBox();
  expect(b!.width).toBeGreaterThanOrEqual(640);
});

test("la fiche écrit ressentis, usages et niveau en pastilles, la famille au-dessus, et plus d'ambiances", async ({ page }) => {
  await ouvrirFiche(page);
  const pastilles = page.locator("[data-fiche] [data-pastilles]");
  await expect(pastilles).toContainText("Chaleureux");
  await expect(pastilles).toContainText("Élan");
});

test("la carte « Avant → après » a un bouton Écouter pour l'avant et pour l'après", async ({ page }) => {
  await ouvrirFiche(page);
  const rangee = page.locator("[data-ecouter-avant-apres]");
  await expect(rangee.getByRole("button", { name: "Écouter" })).toHaveCount(2);
});

// Piano enregistré (13/11/2026) : les notes se chargent au premier « Écouter », pas à l'ouverture, et deviennent des
// sources audio ; sans elles (hors ligne), l'onde triangle prend le relais.
async function compterSources(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __sources: { piano: number; onde: number } };
    w.__sources = { piano: 0, onde: 0 };
    const proto = AudioContext.prototype;
    const buf = proto.createBufferSource;
    const osc = proto.createOscillator;
    proto.createBufferSource = function () { w.__sources.piano++; return buf.call(this); };
    proto.createOscillator = function () { w.__sources.onde++; return osc.call(this); };
  });
}
const sources = (page: Page) => page.evaluate(() => (window as unknown as { __sources: { piano: number; onde: number } }).__sources);

test("« Écouter » charge les notes de piano au premier appui et joue des sources de piano", async ({ page }) => {
  await compterSources(page);
  const notes: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/audio/piano/")) notes.push(r.url()); });
  await ouvrirFiche(page);
  const bouton = page.locator("[data-ecouter-avant-apres]").getByRole("button", { name: "Écouter" }).first();
  await expect(bouton).toBeVisible();
  expect(notes).toHaveLength(0);
  await bouton.click();
  await expect.poll(async () => (await sources(page)).piano).toBeGreaterThan(0);
  expect(notes).toHaveLength(12);
  expect((await sources(page)).onde).toBe(0);
});

test("« Écouter » sans les notes de piano joue l'onde de repli", async ({ page }) => {
  await compterSources(page);
  await page.route(/\/audio\/piano\//, (route) => route.abort());
  await ouvrirFiche(page);
  await page.locator("[data-ecouter-avant-apres]").getByRole("button", { name: "Écouter" }).first().click();
  await expect.poll(async () => (await sources(page)).onde).toBeGreaterThan(0);
  expect((await sources(page)).piano).toBe(0);
});

test("« Où l'entendre » : une ligne par chant, le lien mène au premier passage", async ({ page }) => {
  await ouvrirFiche(page);
  const liens = page.locator("[data-ecoutes] a");
  await expect(liens.first()).toBeVisible();
  for (const href of await liens.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) expect(href).toContain("?passage=");
  // Les chants se classent par setlists : celui-ci peut être derrière « Voir les autres ».
  const autres = page.locator("[data-fiche]").getByRole("button", { name: /^Voir les \d+ autres$/ });
  if (await autres.count()) await autres.click();
  await expect(page.locator("[data-ecoutes] a[href*='/songs/a-jamais-tu-es-saint'][href$='?passage=%22chorus-4-3%22']")).toHaveCount(1);
});

test("la page chant ouverte avec ?passage= fait défiler la section et la surligne", async ({ page }) => {
  // Le surlignage ne dure que 2,5 s : un observateur en note le passage dans `window`.
  await page.addInitScript(() => {
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target as HTMLElement;
        if (el.dataset?.sectionUids && el.classList.contains("harmonie-surligne")) {
          (window as unknown as { __surligne?: string }).__surligne = el.dataset.sectionUids;
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  await page.goto("/songs/a-jamais-tu-es-saint?passage=%22chorus-4-3%22", { waitUntil: "commit" });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __surligne?: string }).__surligne ?? ""), { timeout: 15000 }).toContain("chorus-4");
  const uids = await page.evaluate(() => (window as unknown as { __surligne?: string }).__surligne!);
  await expect(page.locator(`[data-section-uids="${uids}"]`)).toBeInViewport();
});

test("précédente / suivante suit la liste filtrée, sans « précédente » sur la première", async ({ page }) => {
  await ouvrir(page);
  await page.getByRole("group", { name: "Ressenti" }).getByRole("button", { name: "Chaleureux", exact: true }).click();
  const hrefs = await page.locator(LIGNES).evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(1);
  await page.locator(LIGNES).first().click();
  await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
  const nav = page.locator("[data-fiche-nav]");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fiche précédente" })).toHaveCount(0);
  await nav.getByRole("link", { name: "Fiche suivante" }).click();
  await expect(page).toHaveURL(new RegExp(`${hrefs[1]}$`));
  await expect(page.locator("[data-fiche-nav]").getByRole("link", { name: "Fiche précédente" })).toBeVisible();
});

test("avantApres lit les deux suites d'accords, ôte les parenthèses, refuse l'illisible", () => {
  expect(avantApres("`G → A` devient `Em7 → A` · degrés `4 → 5` devient `2m7 → 5`.")).toEqual({ avant: ["G", "A"], apres: ["Em7", "A"] });
  expect(avantApres("`D … D` devient `D … Bm` · degrés `1 → 1`")).toEqual({ avant: ["D", "D"], apres: ["D", "Bm"] });
  expect(avantApres("`G → A → Bm` devient `G – A/G → F#m → Bm` · degrés")).toEqual({ avant: ["G", "A", "Bm"], apres: ["G", "A/G", "F#m", "Bm"] });
  expect(avantApres("`A` (dernier accord) devient `Asus4 (tenu) → A` · degrés")).toEqual({ avant: ["A"], apres: ["Asus4", "A"] });
  expect(avantApres("`A → D` devient `Bb – C → D` · degrés")).toEqual({ avant: ["A", "D"], apres: ["Bb", "C", "D"] });
  expect(avantApres("la mélodie reste en place")).toBeNull();
  expect(avantApres("`la basse` devient `monte` · degrés")).toBeNull();
});
