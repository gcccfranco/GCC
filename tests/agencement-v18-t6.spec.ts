import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ouvrirAvecBarre, verifierAgencement,
} from "./helpers/agencement";
import { COLONNES_DEUX, COLONNES_TROIS, repartirWidgets } from "../src/lib/tableauDeBord/colonnes";
import type { Taille } from "../src/types/backOffice";

// Agencement v18, tranche T6 (docs/spec-agencement-v18.md, B13, B14) : Back-Office › Statistiques
// (titre « Statistiques », rail des vues sous le titre, filtres dessous, « Jamais joués » en deux
// cartes) et Tableau de bord en colonnes (deux barre dépliée, trois barre réduite dès 1 440 px,
// `repartirWidgets`), la grille en personnalisation, sur tablette et sur téléphone.
// Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN). Données simulées (fakeSession).

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };

/** Le Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string, fullPage = false) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(600); // le fondu d'arrivée de la page
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage });
}

// ─── Statistiques (B13) ──────────────────────────────────────────────────────

const TONS = ["C", "D", "E", "F", "G", "A", "Bb"];
const num = (i: number) => String(i).padStart(3, "0");
/** Un recueil assez long pour que « Jamais joués » ait besoin de « Tout afficher » : 120 FR, 60 中文. */
const RECUEIL = [
  ...Array.from({ length: 120 }, (_, i) => ({
    slug: `chant-fr-${num(i + 1)}`, title: `Chant français ${num(i + 1)}`, language: "fr", artist: `Auteur ${i + 1}`, originalKey: TONS[i % 7],
  })),
  ...Array.from({ length: 60 }, (_, i) => ({
    slug: `zh-${num(i + 1)}`, title: `中文诗歌 ${num(i + 1)}`, language: "zh", artist: `作者 ${i + 1}`, originalKey: TONS[(i + 3) % 7],
  })),
];
const chant = (songSlug: string) => ({
  songSlug, position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, items: unknown[]) => ({
  title: `Setlist du ${date}`, date, category: "Culte Francophone", leader: "Marc L.", language: "fr", notes: "", items, isDraft: false, isPrivate: false,
});
const SETLISTS = {
  "setlists/s1": setlist("2026-05-31", [chant("chant-fr-001")]),
  "setlists/s2": setlist("2026-09-20", [chant("zh-001")]),
};

async function ouvrirStatistiques(page: Page, chemin = "/back-office/statistiques") {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  await signInAs(page, ADMIN, SETLISTS, chemin);
  await expect(page.getByRole("heading", { level: 1, name: "Statistiques" })).toBeVisible();
}

const vue = (page: Page, nom: string) => page.getByRole("tablist", { name: "Vue" }).getByRole("tab", { name: nom, exact: true });
const carteFr = (page: Page) => page.getByTestId("jamais-fr");
const carteZh = (page: Page) => page.getByTestId("jamais-zh");
const lignesVisibles = (carte: ReturnType<typeof carteFr>) => carte.locator('[data-testid="ligne-jamais"]:visible');

test.describe("T6 — Statistiques (B13)", () => {
  test.use({ serviceWorkers: "block" });

  test("le h1 est « Statistiques » sur les trois vues ; le sous-titre compte les setlists ; l'agencement commun", async ({ page }) => {
    await ouvrirStatistiques(page);
    await verifierAgencement(page);
    await expect(enTete(page).locator("p").first()).toHaveText(
      "Visible par les admins seulement · 2 setlists comptées, du 31 mai 2026 au 20 septembre 2026");
    for (const nom of ["Jamais joués", "À redécouvrir", "Les plus joués"]) {
      await vue(page, nom).click();
      await expect(vue(page, nom)).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("h1").filter({ visible: true })).toHaveText(["Statistiques"]);
    }
  });

  test("le rail des vues est sous le titre, dans l'en-tête ; les périodes en pilules dessous, avec les listes", async ({ page }) => {
    await ouvrirStatistiques(page);
    const h1 = (await enTete(page).locator("h1").boundingBox())!;
    const rail = enTete(page).locator('[data-onglets="rail"]');
    await expect(rail).toHaveAttribute("aria-label", "Vue");
    const r = (await rail.boundingBox())!;
    expect(r.y, "le rail sous le titre").toBeGreaterThanOrEqual(h1.y + h1.height);
    expect(Math.abs(r.x - h1.x), "le rail au bord du titre").toBeLessThanOrEqual(1);

    const periodes = enTete(page).locator('[data-onglets="pilules"]');
    await expect(periodes).toHaveAttribute("aria-label", "Période");
    await expect(periodes.getByRole("button", { name: "12 mois" })).toHaveAttribute("aria-pressed", "true");
    expect((await periodes.boundingBox())!.y, "les filtres sous le rail").toBeGreaterThanOrEqual(r.y + r.height);
    await expect(enTete(page).getByRole("combobox", { name: "Service" })).toBeVisible();
    await expect(enTete(page).getByRole("combobox", { name: "Présidence" })).toBeVisible();

    await periodes.getByRole("button", { name: "3 mois" }).click();
    await expect(page).toHaveURL(/periode=3/);
    await expect(enTete(page).locator("p").first()).toContainText("1 setlist comptée, du 20 septembre 2026 au 20 septembre 2026");
    await capture(page, "t6-statistiques");
  });

  test("« Jamais joués » : deux cartes, « En français » puis « En chinois », ne dépassent pas deux écrans avant « Tout afficher »", async ({ page }, info) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues");
    await expect(carteFr(page).getByRole("heading", { name: "En français · 119" })).toBeVisible();
    await expect(carteZh(page).getByRole("heading", { name: "En chinois · 59" })).toBeVisible();
    const [fr, zh] = estTelephone(info) ? [10, 10] : [40, 20];
    await expect(lignesVisibles(carteFr(page))).toHaveCount(fr);
    await expect(lignesVisibles(carteZh(page))).toHaveCount(zh);
    expect(await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight), "deux écrans au plus").toBeLessThanOrEqual(2);
    await capture(page, "t6-statistiques-jamais");

    // Une ligne : le titre (lien vers le chant), l'artiste, la dernière fois, la tonalité.
    const premiere = lignesVisibles(carteFr(page)).first();
    await expect(premiere.getByRole("link", { name: "Chant français 002" })).toHaveAttribute("href", /^\/songs\/chant-fr-002\/?$/);
    await expect(premiere.locator('[data-champ="artiste"]')).toHaveText("Auteur 2");
    await expect(premiere.locator('[data-champ="derniere"]')).toHaveText("jamais");
    await expect(premiere.locator('[data-champ="tonalite"]')).toHaveText("D");

    await carteFr(page).getByRole("button", { name: "Tout afficher" }).click();
    await expect(lignesVisibles(carteFr(page))).toHaveCount(119);
    await expect(carteFr(page).getByRole("button", { name: "Tout afficher" })).toHaveCount(0);
    await expect(lignesVisibles(carteZh(page))).toHaveCount(zh);
  });

  test("« Jamais joués » en grand : le français sur deux colonnes, le chinois sur une, côte à côte", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand seulement (ordinateur, tablette couchée)");
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues");
    await expect(lignesVisibles(carteFr(page))).toHaveCount(40);
    const xs = async (carte: ReturnType<typeof carteFr>) =>
      new Set(await lignesVisibles(carte).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x))));
    expect((await xs(carteFr(page))).size, "FR : deux colonnes").toBe(2);
    expect((await xs(carteZh(page))).size, "中文 : une colonne").toBe(1);
    const f = (await carteFr(page).boundingBox())!;
    const z = (await carteZh(page).boundingBox())!;
    expect(z.x, "côte à côte").toBeGreaterThan(f.x + f.width - 1);
    expect(Math.abs(z.y - f.y)).toBeLessThanOrEqual(1);
    expect(f.width / z.width).toBeCloseTo(2, 0);
  });

  test("« Jamais joués » avec la langue « FR » : la seule carte en français", async ({ page }) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues&langue=fr");
    await expect(carteFr(page)).toBeVisible();
    await expect(carteZh(page)).toHaveCount(0);
  });
});

// ─── Tableau de bord (B14) ──────────────────────────────────────────────────

async function ouvrirTableau(page: Page, barre?: "depliee" | "reduite") {
  interdireDialoguesNatifs(page);
  if (barre) await ouvrirAvecBarre(page, barre);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sansSheet(page);
  await signInAs(page, ADMIN, {}, "/back-office");
  await expect(page.getByTestId("grille-widgets").locator('[data-widget="dimanche"]')).toBeVisible();
}

const zoneWidgets = (page: Page) => page.getByTestId("grille-widgets");
/** Les colonnes : chaque widget dit la sienne (`data-colonne`, 0 = la large) ; de haut en bas. */
const colonnesAffichees = (page: Page) =>
  zoneWidgets(page).locator("[data-widget][data-colonne]").evaluateAll((els) => {
    const cols: { largeur: number; ids: string[]; ys: number[] }[] = [];
    for (const e of els) {
      const c = Number(e.getAttribute("data-colonne"));
      const r = e.getBoundingClientRect();
      cols[c] ??= { largeur: r.width, ids: [], ys: [] };
      cols[c].ids.push(e.getAttribute("data-widget")!);
      cols[c].ys.push(r.y);
    }
    return cols;
  });

/** L'ordre du défaut d'un admin (tests/tableau-de-bord.spec.ts). */
const DEFAUT_ADMIN = ["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "raccourcis", "scene", "comptes"];

async function verifierColonnes(page: Page, nombre: number) {
  await expect.poll(async () => (await colonnesAffichees(page)).length, { message: `${nombre} colonnes` }).toBe(nombre);
  await expect(zoneWidgets(page)).toHaveAttribute("data-disposition", "colonnes");
  const cols = await colonnesAffichees(page);
  const fractions = nombre === 3 ? COLONNES_TROIS : COLONNES_DEUX;
  expect(cols[0].largeur / cols[1].largeur, "la colonne large").toBeCloseTo(fractions[0], 1);
  expect(cols[0].ids[0], "la colonne large commence par le premier widget").toBe("dimanche");
  // Chaque widget une fois, chaque colonne remplie, l'ordre du tableau gardé dans chaque colonne.
  expect(cols.flatMap((c) => c.ids).sort()).toEqual([...DEFAUT_ADMIN].sort());
  for (const c of cols) {
    expect(c.ids.length, "aucune colonne vide").toBeGreaterThan(0);
    const rangs = c.ids.map((id) => DEFAUT_ADMIN.indexOf(id));
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
    expect(c.ys, "de haut en bas, dans l'ordre du tableau").toEqual([...c.ys].sort((a, b) => a - b));
  }
}

const nombreDeColonnes = (info: TestInfo, barre: "depliee" | "reduite") =>
  barre === "reduite" && info.project.name === "ordinateur-1440" ? 3 : 2;

test.describe("T6 — Tableau de bord (B14)", () => {
  test("l'agencement commun ; « Personnaliser » en contour dans l'en-tête", async ({ page }) => {
    await ouvrirTableau(page);
    await verifierAgencement(page);
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Tableau de bord");
    await expect(enTete(page).getByRole("button", { name: "Personnaliser" })).toHaveCSS("border-top-width", "1px"); // en contour
  });

  for (const barre of ["depliee", "reduite"] as const) {
    test(`en grand, barre ${barre === "depliee" ? "dépliée" : "réduite"} : les widgets en colonnes, une large et ${barre === "depliee" ? "une étroite" : "deux étroites dès 1 440 px"}`, async ({ page }, info) => {
      test.skip(!estGrandEcran(info), "en grand seulement (ordinateur, tablette couchée)");
      await ouvrirTableau(page, barre);
      await verifierColonnes(page, nombreDeColonnes(info, barre));
      await capture(page, `t6-tableau-${barre}`);
    });
  }

  test("en grand, « Personnaliser » rend la grille ; « Terminé » rend les colonnes", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand seulement (ordinateur, tablette couchée)");
    await ouvrirTableau(page);
    await verifierColonnes(page, 2);
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await expect(zoneWidgets(page)).toHaveAttribute("data-disposition", "grille");
    await expect(zoneWidgets(page).locator("[data-colonne]")).toHaveCount(0);
    await capture(page, "t6-tableau-personnaliser");
    await page.getByRole("button", { name: "Terminé" }).click();
    await verifierColonnes(page, 2);
  });

  test("téléphone et tablette en portrait : la grille d'aujourd'hui", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "téléphone et tablette en portrait seulement");
    await ouvrirTableau(page);
    await expect(zoneWidgets(page)).toHaveAttribute("data-disposition", "grille");
    await expect(zoneWidgets(page).locator("[data-colonne]")).toHaveCount(0);
    await capture(page, "t6-tableau");
  });
});

// ─── repartirWidgets (pur) ───────────────────────────────────────────────────

const w = (id: string, taille: Taille = "m") => ({ id, taille });
const ids = (cols: { id: string }[][]) => cols.map((c) => c.map((x) => x.id));

test.describe("T6 — repartirWidgets (pur)", () => {
  test("sans « Grand », la colonne large prend le premier ; chaque suivant va dans la moins haute", () => {
    // a dans la large (300 / 1,55 ≈ 194) ; b dans l'étroite (0) ; c dans l'étroite (100 < 194) ;
    // d dans la large (194 < 200).
    const h = { a: 300, b: 100, c: 100, d: 100 };
    expect(ids(repartirWidgets([w("a"), w("b"), w("c"), w("d")], h, COLONNES_DEUX))).toEqual([["a", "d"], ["b", "c"]]);
  });

  test("les « Grand » vont dans la colonne large, et l'ordre est gardé dans chaque colonne", () => {
    const h = { a: 100, b: 400, c: 100, d: 100 };
    // b (L) dans la large (400 / 1,6 = 250) ; a, c, d vers la moins haute des deux étroites.
    expect(ids(repartirWidgets([w("a"), w("b", "l"), w("c"), w("d", "s")], h, COLONNES_TROIS))).toEqual([["b"], ["a", "d"], ["c"]]);
    // a, avant b dans le tableau, rejoint la large (à égalité, la plus à gauche) : il y reste avant b.
    const h2 = { a: 100, b: 0, c: 50 };
    expect(ids(repartirWidgets([w("a"), w("b", "l"), w("c")], h2, COLONNES_DEUX))).toEqual([["a", "b"], ["c"]]);
  });

  test("à hauteur égale, la colonne la plus à gauche ; rien à répartir, des colonnes vides", () => {
    expect(ids(repartirWidgets([w("a"), w("b"), w("c")], { a: 155, b: 100, c: 100 }, COLONNES_DEUX))).toEqual([["a", "c"], ["b"]]);
    expect(repartirWidgets([], {}, COLONNES_TROIS)).toEqual([[], [], []]);
  });
});
