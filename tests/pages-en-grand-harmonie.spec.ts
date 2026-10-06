import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { couperEnDeuxColonnes } from "../src/lib/harmonie/rd2000";

// Lot U4 bis, tranche B3 — Harmonie en grand (docs/spec-pages-en-grand.md, Q6 ; planches
// `harmonie-*`). En grand (ordinateur, iPad paysage) : le catalogue à gauche et la fiche à
// droite ; le sommaire du cours à gauche (le chapitre ouvert y déplie ses parties) et la leçon
// à droite ; « Par moment » à gauche et le son à droite. Sans élément choisi, le premier de la
// liste telle qu'elle est filtrée (Q3). Tablette portrait et téléphone : un volet, comme
// aujourd'hui, à la largeur de l'écran. Plannings simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Ruth tient le piano : c'est le planning qui le dit (accès à Harmonie et aux sons).
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Léa M.", "", "", "Ruth K.", "Samuel K.", "Paul D.", "", "", "Orateur Z.", "", ""],
]);
const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K." };

const CATALOGUE = JSON.parse(readFileSync("public/harmonie-index.json", "utf8")) as {
  fiches: { id: string; nom: string; familleNom: string; instrument?: string; niveau: Record<string, string> }[];
};
const COURS = JSON.parse(readFileSync("public/harmonie-cours/index.json", "utf8")) as {
  chapitres: { id: string; numero: number | null; niveau: number | null; sousParties: string[] }[];
};
const RD2000 = JSON.parse(readFileSync("public/rd2000.json", "utf8")) as { moments: { son: string }[] };

const fichesPiano = CATALOGUE.fiches.filter((f) => !f.instrument || f.instrument === "piano");
const PREMIERE = fichesPiano[0];
const AUTRE = fichesPiano[4];
const CADENCES = COURS.chapitres.find((c) => c.numero === 9)!;
/** Le chapitre en cours d'une personne qui n'a rien fini : le premier du niveau 1. */
const PREMIER_CHAPITRE = COURS.chapitres.find((c) => c.niveau === 1)!;

async function entrer(page: Page, to: string) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, RUTH, {}, to);
}

const enGrand = (info: TestInfo) => !["telephone", "tablette"].includes(info.project.name);
const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;
const sansDefilementHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("Réglages du RD-2000 en deux colonnes : la règle, sans navigateur", () => {
  const g = (ecran: string, n: number) => ({ ecran, reglages: Array.from({ length: n }, (_, i) => ({ ecran, parametre: `${ecran} ${i}`, valeur: String(i), pourquoi: "" })) });

  test("un long écran se coupe en deux, la suite garde son nom ; l'ordre est gardé", () => {
    const [a, b] = couperEnDeuxColonnes([g("Piano Designer", 11), g("Zone Edit", 1), g("Key Touch", 1)]);
    expect(a.map((x) => [x.ecran, x.reglages.length, x.suite])).toEqual([["Piano Designer", 7, false]]);
    expect(b.map((x) => [x.ecran, x.reglages.length, x.suite])).toEqual([["Piano Designer", 4, true], ["Zone Edit", 1, false], ["Key Touch", 1, false]]);
    expect([...a, ...b].flatMap((x) => x.reglages.map((r) => r.parametre))).toEqual([
      ...Array.from({ length: 11 }, (_, i) => `Piano Designer ${i}`), "Zone Edit 0", "Key Touch 0",
    ]);
  });

  test("des écrans courts ne se coupent pas ; un seul réglage reste dans une colonne", () => {
    const [a, b] = couperEnDeuxColonnes([g("A", 3), g("B", 3), g("C", 2)]);
    expect(a.map((x) => x.ecran)).toEqual(["A"]);
    expect(b.map((x) => [x.ecran, x.suite])).toEqual([["B", false], ["C", false]]);
    expect(couperEnDeuxColonnes([g("A", 1)])).toEqual([[{ ...g("A", 1), suite: false }], []]);
    // Tone Designer (6) + Zone Edit (3) : couper laisserait « Tone Designer (suite) » à un seul réglage.
    const [c, d] = couperEnDeuxColonnes([g("Tone Designer", 6), g("Zone Edit", 3)]);
    expect(c.map((x) => [x.ecran, x.reglages.length])).toEqual([["Tone Designer", 6]]);
    expect(d.map((x) => [x.ecran, x.reglages.length, x.suite])).toEqual([["Zone Edit", 3, false]]);
  });
});

test.describe("Harmonie : le catalogue", () => {
  test("en grand, le catalogue à gauche et, sans fiche choisie, la première de la liste à droite", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, "/harmonie");
    await expect(liste(page).getByRole("heading", { name: "Harmonie" })).toBeVisible();
    await expect(detail(page).locator(`[data-fiche="${PREMIERE.id}"]`)).toBeVisible();
    await expect(page, "l'adresse ne change qu'au premier toucher").toHaveURL(/\/harmonie\/?$/);
    const l = await boite(liste(page));
    const d = await boite(detail(page));
    expect(d.x, "la fiche à droite de la liste").toBeGreaterThanOrEqual(l.x + l.width - 1);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-harmonie");
  });

  test("en grand, un lien direct vers une fiche : la liste à gauche, la ligne allumée, sans « Retour »", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, `/harmonie/${AUTRE.id}`);
    await expect(detail(page).locator(`[data-fiche="${AUTRE.id}"]`)).toBeVisible();
    await expect(liste(page).getByRole("heading", { name: "Harmonie" })).toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]')).toHaveAttribute("href", new RegExp(`/harmonie/${AUTRE.id}/?$`));
    await expect(detail(page).getByRole("link", { name: "Harmonie" }), "la liste est là : pas de retour").toHaveCount(0);
  });

  test("en grand, les filtres restent d'une fiche à l'autre ; la première suit le filtre ; retour arrière", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, "/harmonie");
    const avance = liste(page).getByRole("group", { name: "Niveau" }).getByRole("button", { name: "Avancé" });
    await avance.click();
    const premiereAvancee = fichesPiano.find((f) => f.niveau.piano === "avance")!;
    await expect(detail(page).locator(`[data-fiche="${premiereAvancee.id}"]`), "Q3 : la première de la liste filtrée").toBeVisible();
    const lignes = liste(page).locator("a[href^='/harmonie/']:not([href^='/harmonie/cours']):not([href^='/harmonie/rd2000'])");
    // L'adresse de la deuxième ligne, lue avant le toucher : la fiche qu'on attend à droite.
    const deuxieme = (await lignes.nth(1).getAttribute("href"))!.replace(/^\/harmonie\//, "").replace(/\/$/, "");
    expect(deuxieme).not.toBe(premiereAvancee.id);
    await lignes.nth(1).click();
    await expect(detail(page).locator(`[data-fiche="${deuxieme}"]`)).toBeVisible();
    await lignes.nth(0).click();
    await expect(detail(page).locator(`[data-fiche="${premiereAvancee.id}"]`)).toBeVisible();
    await expect(avance, "le filtre est resté").toHaveAttribute("aria-pressed", "true");
    await page.goBack();
    await expect(detail(page).locator(`[data-fiche="${deuxieme}"]`), "retour arrière rend la fiche précédente").toBeVisible();
    await expect(avance).toHaveAttribute("aria-pressed", "true");
  });

  test("un volet : la liste seule, puis la fiche avec son retour, comme aujourd'hui", async ({ page }, info) => {
    test.skip(enGrand(info), "un volet : téléphone et tablette portrait");
    await entrer(page, "/harmonie");
    await expect(page.getByRole("heading", { name: "Harmonie" })).toBeVisible();
    await expect(page.locator("[data-fiche]")).toHaveCount(0);
    await page.locator(`a[href^="/harmonie/${PREMIERE.id}"]`).first().click();
    await expect(page.locator(`[data-fiche="${PREMIERE.id}"]`)).toBeVisible();
    await expect(liste(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Harmonie" })).toBeVisible();
    expect(await sansDefilementHorizontal(page)).toBe(true);
  });

  // Relecture du lot : les exemples d'une fiche se classent par les setlists ; le layout les lit
  // une fois pour toute la section, plus chaque fiche ouverte (ni la première, montrée d'office).
  test("les setlists ne se lisent qu'une fois, d'une fiche à l'autre", async ({ page }, info) => {
    const completes: string[] = [];
    page.on("request", (r) => {
      if (!r.url().includes(":runQuery")) return;
      const q = (r.postDataJSON() as { structuredQuery?: { from?: { collectionId: string }[]; where?: unknown; limit?: number } } | null)?.structuredQuery;
      if (q?.from?.[0]?.collectionId === "setlists" && !q.where && !q.limit) completes.push(r.url());
    });
    await entrer(page, "/harmonie");
    for (const f of [fichesPiano[1], fichesPiano[2], fichesPiano[3]]) {
      if (enGrand(info)) await liste(page).locator(`a[href^="/harmonie/${f.id}"]`).first().click();
      else {
        if (await page.locator("[data-fiche]").count()) await page.goBack();
        await page.locator(`a[href^="/harmonie/${f.id}"]`).first().click();
      }
      await expect(page.locator(`[data-fiche="${f.id}"]`)).toBeVisible();
    }
    // Une lecture en trop partirait dès le montage : une seconde suffit à la voir (le réseau
    // n'est jamais au repos sous charge, `networkidle` n'est pas fiable ici).
    await page.waitForTimeout(1000);
    expect(completes).toHaveLength(1);
  });

  test("partout, les filtres au-dessus de « Par où commencer » (question 5)", async ({ page }) => {
    await entrer(page, "/harmonie");
    const cat = page.locator("[data-harmonie]");
    const filtres = await boite(cat.getByRole("group", { name: "Sensation" }));
    const parcours = await boite(cat.getByRole("heading", { name: "Par où commencer" }));
    expect(parcours.y).toBeGreaterThan(filtres.y);
  });

  test("tablette portrait : cours et sons côte à côte, le parcours en cartes, les familles sur deux colonnes", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait seulement");
    await entrer(page, "/harmonie");
    const cat = page.locator("[data-harmonie]");
    const cours = await boite(cat.getByRole("link", { name: /Cours de théorie musicale/ }));
    const sons = await boite(cat.getByRole("link", { name: /Sons du RD-2000/ }));
    expect(Math.abs(cours.y - sons.y)).toBeLessThan(2);
    expect(sons.x).toBeGreaterThan(cours.x + cours.width - 1);
    const etapes = cat.locator("[data-parcours] a");
    const [e1, e2] = [await boite(etapes.nth(0)), await boite(etapes.nth(1))];
    expect(Math.abs(e1.y - e2.y)).toBeLessThan(2);
    const familles = cat.locator("[data-famille]");
    const [f1, f2] = [await boite(familles.nth(0)), await boite(familles.nth(1))];
    expect(Math.abs(f1.y - f2.y), "deux familles côte à côte").toBeLessThan(2);
    expect(f2.x).toBeGreaterThan(f1.x + f1.width - 1);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-harmonie");
  });
});

test.describe("Harmonie : le cours", () => {
  test("en grand, le sommaire à gauche et le chapitre en cours à droite", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, "/harmonie/cours");
    await expect(liste(page).getByRole("heading", { name: "Cours" })).toBeVisible();
    await expect(detail(page).locator(`[data-chapitre="${PREMIER_CHAPITRE.id}"]`)).toBeVisible();
    await expect(page).toHaveURL(/\/harmonie\/cours\/?$/);
  });

  test("en grand, un lien direct vers une leçon : son chapitre allumé déplie ses parties ; pas de second sommaire", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, `/harmonie/cours/${CADENCES.id}`);
    await expect(detail(page).locator(`[data-chapitre="${CADENCES.id}"]`)).toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]')).toHaveAttribute("href", new RegExp(`/harmonie/cours/${CADENCES.id}/?$`));
    const parties = liste(page).locator("[data-parties] a");
    await expect(parties).toHaveCount(CADENCES.sousParties.length);
    await expect(parties.first()).toHaveAttribute("href", "#partie-0");
    await expect(detail(page).getByRole("navigation", { name: "Sommaire" }), "les parties sont à gauche").toHaveCount(0);
    await expect(detail(page).getByRole("link", { name: "Cours" })).toHaveCount(0);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-cours");
  });

  test("en grand, une autre leçon s'ouvre à droite, la liste reste ; retour arrière rend la précédente", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, `/harmonie/cours/${CADENCES.id}`);
    await expect(detail(page).locator(`[data-chapitre="${CADENCES.id}"]`)).toBeVisible();
    await liste(page).locator('a[href^="/harmonie/cours/les-intervalles"]').first().click();
    await expect(detail(page).locator('[data-chapitre="les-intervalles"]')).toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]')).toHaveAttribute("href", /\/harmonie\/cours\/les-intervalles\/?$/);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/harmonie/cours/${CADENCES.id}/?$`));
    await expect(detail(page).locator(`[data-chapitre="${CADENCES.id}"]`), "retour arrière rend la leçon précédente").toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]')).toHaveAttribute("href", new RegExp(`/harmonie/cours/${CADENCES.id}/?$`));
  });

  test("tablette portrait : « Sommaire » ouvre le sommaire du cours par-dessus la leçon", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait seulement");
    await entrer(page, `/harmonie/cours/${CADENCES.id}`);
    await expect(page.locator(`[data-chapitre="${CADENCES.id}"]`)).toBeVisible();
    await page.getByRole("button", { name: "Sommaire" }).click();
    const panneau = page.getByRole("dialog", { name: "Sommaire" });
    await expect(panneau.getByText("Mode d'emploi")).toBeVisible();
    await expect(panneau.locator("[data-parties] a")).toHaveCount(CADENCES.sousParties.length);
    await capture(page, "b3-cours-sommaire");
    await panneau.getByRole("link", { name: /Les intervalles/ }).click();
    await expect(page.locator('[data-chapitre="les-intervalles"]')).toBeVisible();
    await expect(panneau).toHaveCount(0);
  });

  test("téléphone : le sommaire de la leçon en tête, un grand tableau en blocs empilés (question 4)", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement");
    await entrer(page, `/harmonie/cours/${CADENCES.id}`);
    await expect(page.getByRole("navigation", { name: "Sommaire" })).toBeVisible();
    const tableaux = page.locator("[data-cours-tableau]");
    await expect(tableaux.first()).toBeVisible();
    // « Toutes les cadences » : six colonnes, une ligne du tableau par bloc ; rien ne glisse.
    const grand = tableaux.first();
    await expect(grand.locator("thead")).toBeHidden();
    expect(await grand.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const lignes = grand.locator("tbody tr");
    const [a, b] = [await boite(lignes.nth(0)), await boite(lignes.nth(1))];
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
    await expect(lignes.nth(0)).toContainText("Formule");
    // « Choisir la cadence selon le texte » : deux colonnes, il reste un tableau.
    await expect(tableaux.nth(1).locator("thead")).toBeVisible();
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-cours-lecon");
  });
});

test.describe("Harmonie : les sons du RD-2000", () => {
  test("en grand, « Par moment » à gauche et le premier son à droite", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, "/harmonie/rd2000");
    await expect(liste(page).getByRole("button", { name: "Par moment" })).toHaveAttribute("aria-pressed", "true");
    await expect(detail(page).locator(`[data-son-page="${RD2000.moments[0].son}"]`)).toBeVisible();
    await expect(page).toHaveURL(/\/harmonie\/rd2000\/?$/);
  });

  test("en grand, un lien direct vers un son : la ligne allumée, les réglages sur deux colonnes", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets : ordinateur et tablette paysage");
    await entrer(page, "/harmonie/rd2000/S01");
    await expect(detail(page).locator('[data-son-page="S01"]')).toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]').first()).toHaveAttribute("href", /\/harmonie\/rd2000\/S01\/?$/);
    const colonnes = detail(page).locator("[data-colonne-reglages]");
    await expect(colonnes).toHaveCount(2);
    const [a, b] = [await boite(colonnes.nth(0)), await boite(colonnes.nth(1))];
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    await expect(detail(page).getByText("Piano Designer (suite)")).toBeVisible();
    await expect(detail(page).getByRole("link", { name: "Sons du RD-2000" })).toHaveCount(0);
    // Le son suivant s'ouvre à droite, la liste reste.
    await liste(page).locator('a[href^="/harmonie/rd2000/0385"]').first().click();
    await expect(detail(page).locator('[data-son-page="0385"]')).toBeVisible();
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-rd2000");
    await page.goBack();
    await expect(page).toHaveURL(/\/harmonie\/rd2000\/S01\/?$/);
    await expect(detail(page).locator('[data-son-page="S01"]'), "retour arrière rend le son précédent").toBeVisible();
    await expect(liste(page).locator('a[aria-current="page"]').first()).toHaveAttribute("href", /\/harmonie\/rd2000\/S01\/?$/);
  });

  test("tablette portrait : un moment par carte, deux cartes par rangée", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait seulement");
    await entrer(page, "/harmonie/rd2000");
    const moments = page.locator("[data-moment]");
    await expect(moments.first()).toBeVisible();
    const [a, b] = [await boite(moments.nth(0)), await boite(moments.nth(1))];
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-rd2000");
  });

  test("téléphone : la liste, puis le son avec son retour, réglages sur une colonne", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement");
    await entrer(page, "/harmonie/rd2000/S01");
    await expect(page.locator('[data-son-page="S01"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Sons du RD-2000" })).toBeVisible();
    await expect(page.locator("[data-colonne-reglages]")).toHaveCount(0);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b3-rd2000-son");
  });
});
