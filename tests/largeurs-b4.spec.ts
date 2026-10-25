import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran } from "./helpers/agencement";

// Tranche B4b de docs/spec-corrections-audit.md : la règle de largeur du 25/10/2026. Blocs d'une page d'accueil à
// la même largeur ; tableaux et grilles = pleine largeur de la zone ; une liste sans élément choisi (et sans
// premier élément montré d'office) prend une colonne de 960 px au lieu d'un volet collé à gauche. Cinq projets.
// Personnes fictives.

const MEMBRE: FakeProfile = { uid: "u-eve", email: "eve.test@example.com", firstName: "Eve", lastName: "T.", planningName: "Eve T." };
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLISTS = {
  "setlists/sl-1": { title: "Culte test un", leader: "Noé T.", category: "Culte Francophone", date: "2026-10-04", language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false, items: [item("hosanna", 1)] },
  "setlists/sl-2": { title: "Culte test deux", leader: "Inès V.", category: "Culte Francophone", date: "2026-10-18", language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false, items: [item("abba-pere", 1)] },
};

const SANS_NOM: FakeProfile = { uid: "u-eve", email: "eve.test@example.com", firstName: "Eve", lastName: "T.", serviceRoles: { "Culte Francophone": ["musicien"] } };

async function ouvrir(page: Page, adresse: string, docs: Record<string, Record<string, unknown>> = {}, profil: FakeProfile = MEMBRE) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, profil, docs, adresse);
}

const largeur = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!.width;

test("accueil du Planning : cartes et verset dans la même colonne", async ({ page }) => {
  await ouvrir(page, "/planning");
  const verset = page.locator("blockquote").first();
  await expect(verset).toBeVisible();
  const colonne = verset.locator("xpath=..");
  const wV = await largeur(verset);
  expect(Math.abs((await largeur(colonne)) - wV), "verset = colonne").toBeLessThanOrEqual(2);
  // Chaque bloc de la colonne (la rangée des deux cartes en grand) a la largeur du verset.
  const largeurs = await colonne.evaluate((el) => Array.from(el.children).map((c) => c.getBoundingClientRect().width).filter((w) => w > 0));
  expect(largeurs.length).toBeGreaterThanOrEqual(2);
  for (const w of largeurs) expect(Math.abs(w - wV), "bloc à la largeur du verset").toBeLessThanOrEqual(2);
});

test("/setlists sans setlist choisie : la liste prend la colonne (plus de 600 px) ; une setlist choisie rend les deux volets", async ({ page }, info) => {
  test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
  await ouvrir(page, "/setlists", SETLISTS, SANS_NOM);
  const liste = page.locator('[data-volet="liste"]');
  await expect(liste).toBeVisible();
  await expect(page.getByText("Culte test un").first()).toBeVisible();
  expect(await largeur(liste), "la liste seule dans la colonne").toBeGreaterThan(600);
  expect(await largeur(liste)).toBeLessThanOrEqual(960 + 2);
  await expect(page.locator('[data-volet="detail"]')).toHaveCount(0);
  // Une setlist choisie : les deux volets d'avant.
  await ouvrir(page, "/setlists?apercu=sl-2", SETLISTS, SANS_NOM);
  await expect(page.locator('[data-volet="detail"]')).toBeVisible();
  expect(await largeur(page.locator('[data-volet="liste"]')), "le volet de la liste, ~400 px").toBeLessThan(450);
});

test("/mes-services sans service choisi : la liste prend la colonne", async ({ page }, info) => {
  test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
  await ouvrir(page, "/mes-services");
  const liste = page.locator('[data-volet="liste"]');
  await expect(liste).toBeVisible();
  expect(await largeur(liste)).toBeGreaterThan(600);
  await expect(page.locator('[data-volet="detail"]')).toHaveCount(0);
});

test("Campus : la zone des cartes occupe plus de 80 % de la zone de contenu", async ({ page }) => {
  await ouvrir(page, "/planning/campus");
  const cartes = page.getByTestId("campus-cartes");
  const barre = page.getByTestId("barre-grille");
  await expect(barre).toBeVisible();
  await expect(cartes).toBeVisible();
  const zone = await barre.locator("xpath=ancestor::main[1]").evaluate((el) => {
    const s = getComputedStyle(el);
    return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  });
  expect(await largeur(cartes)).toBeGreaterThan(zone * 0.8);
  // Le sélecteur Louange / Répétition / Grille est au-dessus, aligné avec le contenu.
  const x = (await barre.boundingBox())!.x;
  expect(Math.abs((await cartes.boundingBox())!.x - x)).toBeLessThanOrEqual(2);
  // Deux colonnes dès 1 024 px de fenêtre.
  const colonnes = await cartes.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  const fenetre = page.viewportSize()!.width;
  expect(colonnes).toBe(fenetre >= 1024 ? 2 : 1);
});

test("Prépa. Table : le tableau prend toute la zone de contenu", async ({ page }) => {
  await ouvrir(page, "/planning/table");
  const barre = page.getByTestId("barre-grille");
  await expect(barre).toBeVisible();
  const zone = await barre.locator("xpath=ancestor::main[1]").evaluate((el) => {
    const s = getComputedStyle(el);
    return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  });
  expect(await largeur(barre)).toBeGreaterThan(zone - 2);
});

test("le nom d'un planning ne se lit qu'une fois à l'écran : le h2 de la rangée ne double pas le sélecteur hors grand", async ({ page }, info) => {
  await ouvrir(page, "/planning/intergroupe");
  const titre = page.getByTestId("barre-grille").getByRole("heading", { level: 2, name: "Intergroupe" });
  await expect(titre).toHaveText("Intergroupe");
  const boite = (await titre.boundingBox())!;
  if (estGrandEcran(info)) {
    // En grand, les pilules de l'en-tête listent les plannings ; le h2 titre la rangée de la grille.
    expect(boite.width).toBeGreaterThan(40);
  } else {
    // Téléphone et tablette debout : « Intergroupe ⌄ » (le sélecteur) dit le planning ; le h2 reste pour les lecteurs d'écran.
    expect(boite.width, "h2 réservé aux lecteurs d'écran").toBeLessThanOrEqual(2);
    if (page.viewportSize()!.width < 768) await expect(page.getByTestId("menu-plannings")).toContainText("Intergroupe");
    else await expect(page.getByRole("link", { name: "Intergroupe", exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
});
