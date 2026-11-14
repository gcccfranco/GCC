import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";

// Barre de la page d'un chant, piste A « Une barre, tout dedans » (docs/spec-barre-chant.md).
// Un chant FR avec vidéo (Abba Père) et un chant ZH sur son scan 简谱 (一生爱你), sur les cinq
// projets : la rangée tient sur une ligne, chaque action est joignable là où la spec la met,
// +1 demi-ton change la tonalité.

// Admin : Idées d'harmonie s'ouvre sur ce seul statut (lot 9).
const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };

const CHANTS = [
  { slug: "abba-pere", titre: /Abba Père/i, tonalite: "A", plusUn: /^(A#|Bb)/, video: true, zh: false },
  { slug: "一生爱你", titre: "一生爱你", tonalite: "E", plusUn: /^F/, video: false, zh: true },
] as const;

const barre = (page: Page) => page.getByTestId("barre-outils");
const rangee = (page: Page) => page.locator(".rangee-chant");
/** Dès la tablette debout (768 × 500 px de fenêtre), les actions sortent du menu ⋯ (Q2, Q3). */
const actionsDansLaBarre = (page: Page) => {
  const { width, height } = page.viewportSize()!;
  return width >= 768 && height >= 500;
};

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrir(page: Page, slug: string) {
  await signInAs(page, ADMIN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom").getByRole("heading", { level: 1 })).toBeVisible();
  // Le bouton Idées arrive avec le profil : la rangée est complète quand il est là.
  await expect(barre(page).getByRole("button", { name: "Harmonie", exact: true })).toBeAttached();
}

async function uneSeuleLigne(page: Page) {
  const r = rangee(page);
  // Une ligne : la hauteur d'un bouton (36 px) et ses marges (2 × 8 px), pas deux.
  await expect.poll(async () => (await r.boundingBox())!.height).toBeLessThanOrEqual(56);
  // Au toucher, la zone de 44 px (`::after`, src/lib/toucher44.ts) du dernier bouton dépasse de quelques pixels quand la rangée n'a
  // plus de marge intérieure (deux volets tactiles seulement, chants-8 ; au téléphone, aucune tolérance) : `scrollWidth` la compte, l'œil non (les bords des éléments, eux, sont mesurés plus bas).
  const toucher = await page.evaluate(() => (matchMedia("(pointer: coarse)").matches && innerWidth >= 1024 ? 6 : 0));
  expect(await r.evaluate((el) => el.scrollWidth - el.clientWidth), "rien ne déborde de la rangée").toBeLessThanOrEqual(1 + toucher);
  // … ni dans sa marge intérieure, que `scrollWidth` ne compte pas.
  const depasse = await r.evaluate((el) => {
    const fin = el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
    return Math.max(...[...el.children].map((c) => c.getBoundingClientRect().right - fin));
  });
  expect(depasse, "rien ne mord sur la marge de droite").toBeLessThanOrEqual(0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

for (const chant of CHANTS) {
  test.describe(`barre du chant — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("la rangée tient sur une ligne, chaque action est joignable", async ({ page }) => {
      await ouvrir(page, chant.slug);
      if (chant.zh) await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
      await uneSeuleLigne(page);
      const b = barre(page);
      // RU-3 : ce qui est passé dans la marge « Affichage » ou le menu ⋯ n'est plus dans la barre ; Accords (et Pinyin en ZH) y restent.
      for (const n of ["PDF", "Agrandir le texte", "Réduire le texte"]) await expect(b.getByRole("button", { name: n, exact: true })).toHaveCount(0);

      // Spec RU-3 : ←, puis à droite Harmonie, Vidéo, Crayon, Accords, Pinyin (ZH), Affichage et ⋯ ; tous sur la même ligne.
      const noms = ["Harmonie", ...(chant.video ? ["Vidéo"] : []), "Crayon", "Accords", ...(chant.zh ? ["Pinyin"] : []), "Affichage", "Plus d'actions"];
      const boites = await Promise.all(noms.map((n) => b.getByRole("button", { name: n, exact: true }).boundingBox()));
      // En deux volets (grand écran) le retour est masqué : la ligne se mesure alors sur Harmonie.
      const retour = (await b.locator(".retour-chant").boundingBox()) ?? boites[0]!;
      let x = retour.x - 1;
      for (const [i, boite] of boites.entries()) {
        expect(boite, `${noms[i]} visible`).not.toBeNull();
        expect(boite!.x, `${noms[i]} après le précédent`).toBeGreaterThan(x);
        expect(Math.abs(boite!.y - retour.y) <= 6, `${noms[i]} sur la ligne du retour`).toBe(true);
        x = boite!.x;
      }
      if (actionsDansLaBarre(page)) {
        // Q1 : la rangée a les bords de la partition.
        const main = (await page.locator("main.song-zoom").boundingBox())!;
        // RU-3 : les actions sont poussées à droite ; seul le retour (absent en deux volets) tient le bord gauche.
        const premier = (await b.locator(".retour-chant").boundingBox()) ?? null;
        const dernier = boites.at(-1)!;
        // Même marge intérieure que `main` : 16 px en un volet, 0 en deux volets (chants-8, les bords du chant sont ceux du volet).
        const [gauche, droit] = await page.locator("main.song-zoom").evaluate((el) => [parseFloat(getComputedStyle(el).paddingLeft), parseFloat(getComputedStyle(el).paddingRight)]);
        if (premier) expect(Math.abs(premier.x - (main.x + gauche)), "bord gauche de la partition").toBeLessThanOrEqual(2);
        expect(Math.abs(dernier.x + dernier.width - (main.x + main.width - droit)), "bord droit de la partition").toBeLessThanOrEqual(2);
      }
      await capture(page, `barre-chant-${chant.zh ? "zh" : "fr"}`);
      // Le menu ⋯ : PDF, Personnaliser, Signalement, rien d'autre (la disposition, la couleur et la notation sont dans la marge).
      await b.getByRole("button", { name: "Plus d'actions" }).click();
      await expect(page.getByRole("menuitem")).toHaveText([/PDF/, /Personnaliser/, /Signalement/]);
      await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
      await expect(page.getByRole("menuitemradio")).toHaveCount(0);
      // Q6 : l'entrée PDF ouvre la fenêtre « Quel PDF ? ».
      await page.getByRole("menuitem", { name: "PDF" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      // « Harmonie » ouvre ses idées (colonne ou feuille).
      await b.getByRole("button", { name: "Harmonie", exact: true }).click();
      await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    });
  });
}

test("Vidéo : le bouton ouvre le lecteur sous la barre et se marque actif (Q7)", async ({ page }) => {
  await ouvrir(page, "abba-pere");
  const video = barre(page).getByRole("button", { name: "Vidéo", exact: true });
  await expect(video).toHaveAttribute("aria-pressed", "false");
  await video.click();
  await expect(video).toHaveAttribute("aria-pressed", "true");
  const lecteur = page.locator(".video-chant iframe");
  await expect(lecteur).toBeVisible();
  const [bb, lb] = await Promise.all([barre(page).boundingBox(), lecteur.boundingBox()]);
  expect(lb!.y, "le lecteur est sous la barre").toBeGreaterThanOrEqual(bb!.y + bb!.height - 1);
  await uneSeuleLigne(page);
  await capture(page, "barre-chant-video");
  // La partition reprend juste sous le lecteur.
  const titre = (await page.locator("main.song-zoom").getByRole("heading", { level: 1 }).boundingBox())!;
  expect(titre.y).toBeGreaterThan(lb!.y + lb!.height);
  await video.click();
  await expect(video).toHaveAttribute("aria-pressed", "false");
  await expect(lecteur).toHaveCount(0);
});

test("téléphone couché : une seule rangée, qui s'escamote avec la barre", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "téléphone seulement");
  await page.setViewportSize({ width: 915, height: 412 });
  await ouvrir(page, "abba-pere");
  await expect(barre(page).locator(".actions-tel")).toHaveCount(0);
  await uneSeuleLigne(page);
  await capture(page, "barre-chant-fr-couche");
  // La barre s'escamote au défilement, revient en remontant.
  await page.evaluate(() => window.scrollBy(0, 600));
  await expect.poll(async () => (await barre(page).boundingBox())!.y + (await barre(page).boundingBox())!.height).toBeLessThanOrEqual(0);
  await page.evaluate(() => window.scrollBy(0, -200));
  await expect.poll(async () => (await barre(page).boundingBox())!.y).toBeGreaterThan(0);
});

test("barre rappelée d'un tap après défilement : collée en haut, sans trou sous l'en-tête escamoté", async ({ page }) => {
  await ouvrir(page, "abba-pere");
  await page.evaluate(() => window.scrollBy(0, 800));
  // L'en-tête et la barre s'escamotent ensemble.
  await expect.poll(async () => { const b = await barre(page).boundingBox(); return b!.y + b!.height; }).toBeLessThanOrEqual(0);
  // Un tap sur la partition rappelle la barre seule : elle prend la place de l'en-tête.
  // Au point de l'écran : `locator.click` ferait d'abord défiler, ce qui ramène aussi l'en-tête.
  const { height } = page.viewportSize()!;
  const partition = (await page.locator("main.song-zoom").boundingBox())!;
  await page.mouse.click(Math.round(partition.x + 30), Math.round(height / 2));
  // L'en-tête, lui, reste escamoté.
  await expect.poll(async () => { const n = await page.locator("header").first().boundingBox(); return n ? n.y + n.height : 0; }).toBeLessThanOrEqual(1);
  // Mesurer une fois la glissade finie (300 ms), pas en route.
  await barre(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  // En deux volets, elle colle 16 px sous le haut du panneau qu'elle dessine, lui-même aligné sur la liste (20 px) : 36 px.
  const decalage = await barre(page).evaluate((el) => (getComputedStyle(el).position === "sticky" ? 36 : 0));
  expect(Math.abs((await barre(page).boundingBox())!.y - decalage), "la barre colle en haut de l'écran").toBeLessThanOrEqual(1);
  await capture(page, "barre-chant-rappelee");
});

test.describe("deux volets : partition et barre jusqu'à 900 px (Q8)", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "ordinateur-1440", "ordinateur, 1 440 et 1 920 px"));

  test("à 1 440 px, Abba Père a tous ses libellés sur une ligne", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    // 3 = tout, avec le mot « Harmonie » ; 2 quand il ne tient pas.
    await expect(rangee(page)).toHaveAttribute("data-libelles", /^[23]$/);
    for (const n of ["Vidéo", "Affichage"]) await expect(rangee(page).getByText(n, { exact: true })).toBeVisible();
    // Harmonie : l'icône seule quand la place manque, son nom reste pour les lecteurs d'écran.
    await expect(rangee(page).getByRole("button", { name: "Harmonie", exact: true })).toBeVisible();
    await uneSeuleLigne(page);
  });

  for (const chant of CHANTS) {
    test(`à 1 920 px, ${chant.slug} : 900 px de partition, la barre aux mêmes bords`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await ouvrir(page, chant.slug);
      const main = (await page.locator("main.song-zoom").boundingBox())!;
      expect(Math.round(main.width)).toBe(900);
      const r = (await rangee(page).boundingBox())!;
      expect(Math.abs(r.x - main.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.width - main.width)).toBeLessThanOrEqual(1);
      await uneSeuleLigne(page);
      if (chant.zh) {
        // La 简谱 suit la colonne : plus large que les 640 px d'avant, sans déborder du volet.
        const scan = (await page.locator("[data-jianpu-page] img").first().boundingBox())!;
        expect(scan.width).toBeGreaterThan(800);
        const volet = (await page.locator("[data-volet-chant]").boundingBox())!;
        expect(scan.x + scan.width).toBeLessThanOrEqual(volet.x + volet.width + 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await capture(page, `barre-chant-1920-${chant.zh ? "zh" : "fr"}`);
    });
  }
});

// chants-2 (docs/spec-corrections-design/chants.md) : au téléphone, la rangée est alignée sur la gouttière de 16 px.
for (const largeur of [412, 390]) {
  test(`téléphone ${largeur} px : le retour est à 16 px du bord gauche, le ⋯ à 16 px du bord droit`, async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "la gouttière de 16 px n'est mesurée qu'au téléphone");
    await page.setViewportSize({ width: largeur, height: 800 });
    await ouvrir(page, "abba-pere");
    const retour = (await barre(page).locator(".retour-chant").boundingBox())!;
    const fin = (await barre(page).getByRole("button", { name: "Plus d'actions" }).boundingBox())!;
    expect(retour.x, "retour").toBe(16);
    expect(fin.x + fin.width, "fin de la rangée à 16 px du bord droit").toBeLessThanOrEqual(largeur - 16 + 1);
  });
}
