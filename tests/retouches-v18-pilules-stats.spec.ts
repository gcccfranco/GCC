import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue, ouvrirAvecBarre, pilules, verifierSansDebordement, zoneDeContenu,
} from "./helpers/agencement";

// Retouches v18, tranches R5 et R6 (docs/spec-retouches-v18.md, D9 et D11).
// - R5 (D9) : les pilules (`Pilules`) sont compactes en grand, ≈ 28 px (13 px, gras, comme la planche
//   `v18-bo-statistiques`) dès 1 024 px de large avec un pointeur fin, et gardent 40 px au doigt
//   (téléphone, tablette debout et couchée). Une règle du composant commun : la rangée des plannings
//   du Back-Office, autrefois « compacte » à 32 px partout, la suit aussi.
// - R6 (D11) : Statistiques › « Les plus joués » : sous ≈ 1 100 px de conteneur, les chiffres passent
//   au-dessus du tableau ; rien ne défile de côté.
// Cinq projets. Firestore, Sheets et date simulés ; personnes fictives.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T.", planningName: "Pianiste D." };

/** Hauteur attendue des pilules selon l'appareil : fixée ici d'après D9, pas lue dans le CSS. */
const hauteurAttendue = (projet: string) => (projet.startsWith("ordinateur") ? 28 : 40);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string, fullPage = false) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage });
}

// ─── Statistiques ────────────────────────────────────────────────────────────

const TONS = ["C", "D", "E", "F", "G", "A", "Bb"];
const num = (i: number) => String(i).padStart(3, "0");
const RECUEIL = [
  ...Array.from({ length: 40 }, (_, i) => ({
    slug: `chant-fr-${num(i + 1)}`, title: `Chant français numéro ${num(i + 1)}`, language: "fr", artist: `Auteur ${i + 1}`, originalKey: TONS[i % 7],
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    slug: `zh-${num(i + 1)}`, title: `中文诗歌 ${num(i + 1)}`, language: "zh", artist: `作者 ${i + 1}`, originalKey: TONS[(i + 3) % 7],
  })),
];
const chant = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, slugs: string[]) => ({
  title: `Setlist du ${date}`, date, category: "Culte Francophone", leader: "Président A.", language: "fr", notes: "",
  items: slugs.map(chant), isDraft: false, isPrivate: false,
});
/** Douze setlists de juin à septembre : un classement de plusieurs lignes, toutes les colonnes remplies. */
const SETLISTS = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => {
    const date = `2026-${String(6 + Math.floor(i / 3)).padStart(2, "0")}-${String(7 + (i % 3) * 7).padStart(2, "0")}`;
    return [`setlists/s${i}`, setlist(date, [`chant-fr-${num((i % 5) + 1)}`, `chant-fr-${num((i % 8) + 6)}`, `zh-${num((i % 3) + 1)}`])];
  }),
);

async function ouvrirStatistiques(page: Page) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  await signInAs(page, ADMIN, SETLISTS, "/back-office/statistiques");
  await expect(page.getByRole("heading", { level: 1, name: "Statistiques" })).toBeVisible();
  await expect(page.getByTestId("setlists-comptees")).toBeVisible();
}

/** La hauteur et la taille du texte de chaque pilule d'une rangée. */
const mesurer = (rangee: Locator) =>
  rangee.evaluate((el) =>
    [...el.querySelectorAll(":scope > a, :scope > button")].map((p) => ({
      nom: p.textContent?.trim() ?? "",
      hauteur: Math.round(p.getBoundingClientRect().height),
      texte: parseFloat(getComputedStyle(p).fontSize),
    })),
  );

function verifierTaille(mesures: { nom: string; hauteur: number; texte: number }[], projet: string) {
  expect(mesures.length, "des pilules").toBeGreaterThan(1);
  const hauteur = hauteurAttendue(projet);
  for (const m of mesures) {
    expect(Math.abs(m.hauteur - hauteur), `« ${m.nom} » : ${m.hauteur} px, attendu ≈ ${hauteur} px`).toBeLessThanOrEqual(1);
    expect(m.texte, `« ${m.nom} » : texte`).toBe(hauteur === 28 ? 13 : 15);
  }
}

test.describe("R5 · D9 : les pilules compactes en grand, 40 px au doigt", () => {
  test.use({ serviceWorkers: "block" });

  test("Statistiques : les périodes en pilules, ≈ 28 px à la souris dès 1 024 px, 40 px au doigt", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    verifierTaille(await mesurer(periodes), info.project.name);
    await capture(page, "r5-pilules-statistiques");
  });

  test("Statistiques : les menus Service, Langue, Présidence à la hauteur des pilules de la même rangée", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    // Planche v18-bo-statistiques : les menus sont des pastilles de la même taille que les périodes.
    const hauteur = hauteurAttendue(info.project.name);
    for (const nom of ["Service", "Langue", "Présidence"]) {
      const menu = page.getByRole("combobox", { name: nom });
      const h = Math.round((await menu.boundingBox())!.height);
      expect(Math.abs(h - hauteur), `« ${nom} » : ${h} px, attendu ≈ ${hauteur} px`).toBeLessThanOrEqual(1);
      if (hauteur === 28) expect(await menu.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)), `« ${nom} » : texte`).toBe(13);
    }
    await capture(page, "r5-menus-statistiques");
  });

  test("Back-Office › Planning : la rangée des plannings suit la même règle (plus de taille propre)", async ({ page }, info) => {
    interdireDialoguesNatifs(page);
    await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/back-office/planning/culte");
    const plannings = page.getByTestId("barre-grille").filter({ visible: true }).getByRole("navigation", { name: "Plannings" });
    await expect(plannings.getByRole("link", { name: "Culte Franco" })).toBeVisible();
    verifierTaille(await mesurer(plannings), info.project.name);
    await capture(page, "r5-pilules-planning");
  });

  test("ordinateur sous 1 024 px : 40 px, même à la souris (ordinateur)", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre passe à 1 000 px");
    await page.setViewportSize({ width: 1000, height: 800 });
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    verifierTaille(await mesurer(periodes), "telephone");
  });
});

// ─── R6 : « Les plus joués » ─────────────────────────────────────────────────

const chiffres = (page: Page) => page.getByTestId("setlists-comptees");
const chantsDifferents = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Chants différents" }) });
const carteTableau = (page: Page) => page.locator("table").locator("..");

/** Le tableau ne défile pas dans sa carte, et la page ne déborde pas. */
async function verifierSansDefilement(page: Page) {
  const carte = carteTableau(page);
  await expect(carte).toBeVisible();
  expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le tableau ne défile pas de côté").toBeLessThanOrEqual(0);
  await verifierSansDebordement(page);
}

/** Les chiffres à gauche du tableau (dans une colonne à part), ou au-dessus (en grand : sur une rangée).
 *  « À gauche » d'abord : dans la colonne de droite, les dix premiers précèdent le tableau, et la carte
 *  des chiffres finit donc plus haut que lui dans les deux dispositions. */
async function disposition(page: Page) {
  const c = (await chiffres(page).boundingBox())!;
  const t = (await carteTableau(page).boundingBox())!;
  if (c.x + c.width <= t.x + 1) return "gauche";
  if (c.y + c.height <= t.y + 1) return "dessus";
  return "autre";
}

test.describe("R6 · D11 : « Les plus joués », les chiffres au-dessus du tableau sous ≈ 1 100 px", () => {
  test.use({ serviceWorkers: "block" });

  for (const largeur of [1024, 1060, 1100]) {
    test(`fenêtre de ${largeur} px, barre dépliée : les chiffres sur une rangée au-dessus, rien ne défile de côté (ordinateur)`, async ({ page }, info) => {
      test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre change de largeur");
      await page.setViewportSize({ width: largeur, height: 800 });
      await ouvrirAvecBarre(page, "depliee");
      await ouvrirStatistiques(page);
      expect(await disposition(page)).toBe("dessus");
      // Les trois chiffres de la planche restent, côte à côte : Setlists comptées, Chants différents, Jamais joués.
      const c = (await chiffres(page).boundingBox())!;
      const d = (await chantsDifferents(page).boundingBox())!;
      expect(Math.abs(d.y - c.y), "« Chants différents » sur la rangée des chiffres").toBeLessThanOrEqual(1);
      expect(d.x).toBeGreaterThan(c.x + c.width);
      await expect(page.getByRole("button", { name: /Jamais joués/ }).filter({ hasText: "voir l'onglet" })).toBeVisible();
      await verifierSansDefilement(page);
      if (largeur === 1024) await capture(page, "r6-plus-joues-1024", true);
    });
  }

  test("à chaque appareil : au-dessus sous 1 100 px de conteneur, à gauche au-delà ; jamais de défilement de côté", async ({ page }, info) => {
    if (info.project.name === "ordinateur-1440") await ouvrirAvecBarre(page, "depliee");
    await ouvrirStatistiques(page);
    if (estTelephone(info)) {
      // Le téléphone garde sa liste : pas de tableau.
      await expect(page.locator("table")).toBeHidden();
      await verifierSansDebordement(page);
      return;
    }
    const zone = await zoneDeContenu(page);
    const conteneur = zone.droite - zone.gauche - 2 * (await margeAttendue(page));
    expect(await disposition(page), `conteneur de ${conteneur} px`).toBe(conteneur < 1100 ? "dessus" : "gauche");
    // La planche (1 440 px, barre dépliée) : les chiffres à gauche.
    if (info.project.name === "ordinateur-1440") expect(conteneur).toBeGreaterThanOrEqual(1100);
    if (estGrandEcran(info) && conteneur < 1100) await expect(chantsDifferents(page)).toBeVisible();
    await verifierSansDefilement(page);
    await capture(page, "r6-plus-joues", true);
  });
});
