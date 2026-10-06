import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { EQUIPES } from "../src/lib/equipes/organigramme";
import type { MembreEquipe } from "../src/types/equipe";

// Lot U4 bis, tranche B6 — Guide et Équipes (docs/spec-pages-en-grand.md, Q11 et Q12 ; planches
// `guide-*` et `equipes-*`).
// Guide : en grand, le sommaire collant à gauche (270 px) et la lecture à 720 px au plus ;
// tablette portrait, le sommaire sur deux colonnes en tête ; téléphone, en une colonne.
// Équipes : l'écran garde sa hauteur, l'organigramme défile de gauche à droite (bandeau) ; une
// pilule par équipe sert d'index ; flèches sur ordinateur (pointeur fin) seulement.
// Personnes fictives ; Sheets simulés, rien ne sort sur le réseau.

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", firstName: "Léa", lastName: "M." };

const enGrand = (info: TestInfo) => !["telephone", "tablette"].includes(info.project.name);
const pointeurFin = (info: TestInfo) => info.project.name.startsWith("ordinateur");

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function sansSheets(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}

// ── Organigramme fictif, aux effectifs d'aujourd'hui (Louange 28, EDD 33) ───────────────────

const NOMS = [
  "Léa M.", "Noé T.", "Inès V.", "Samuel K.", "Paul D.", "Marc A.", "Ruth K.", "Hélène W.", "Jun L.", "Clara B.",
  "Joël F.", "Lina P.", "Sarah Y.", "Daniel H.", "Mei Z.", "Hugo L.", "Chloé D.", "Félix R.", "Yann M.", "Anaïs P.",
  "Aurore B.", "Bastien G.", "Camille R.", "Elsa N.", "Gabriel S.", "Iris F.", "Jules C.", "Kevin T.", "Laura S.",
  "Maëlle G.", "Nathan B.", "Océane L.", "Pierre V.", "Quentin H.", "Rose A.", "Simon E.", "Tom R.", "Ugo P.",
  "Victor M.", "Wendy K.", "Zoé F.", "王丽", "李明", "陈静", "张伟", "刘洋", "杨帆", "赵敏", "周婷", "吴昊", "孙磊",
];
const nom = (i: number) => NOMS[i % NOMS.length];
const M = (n: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom: n, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });
const simples = (debut: number, n: number) => Array.from({ length: n }, (_, i) => M(nom(debut + i)));
const groupe = (g: string, debut: number, n: number) => Array.from({ length: n }, (_, i) => M(nom(debut + i), { groupe: g }));

const MEMBRES: Record<string, MembreEquipe[]> = {
  orga: simples(0, 9),
  "comite-franco": simples(9, 7),
  da: [M(nom(20), { mention: "Référente", referent: true }), ...simples(23, 2)],
  medias: [M(nom(6), { mention: "Référente", referent: true }), ...simples(27, 3)],
  developpement: simples(30, 3),
  regie: [M(nom(18), { mention: "Référent", referent: true }), ...simples(33, 5)],
  traduction: simples(8, 3),
  theologie: simples(12, 5),
  evenementiel: [M(nom(3), { mention: "Référent", referent: true })],
  decoration: [M(nom(23), { mention: "Référente", referent: true })],
  "accueil-j1": simples(31, 3),
  louange: [
    M(nom(4), { mention: "Référent", referent: true }),
    ...groupe("Présidences", 0, 8), ...groupe("Choristes", 16, 9), ...groupe("Pianistes", 10, 4),
    ...groupe("Guitaristes", 3, 2), ...groupe("Batteurs", 21, 4),
  ],
  edd: [
    M(nom(12), { mention: "Référente", referent: true }),
    ...groupe("Professeurs louange", 13, 14), ...groupe("Professeurs cours", 22, 6), ...groupe("Pianistes", 26, 6),
    ...groupe("Guitaristes", 37, 2), ...groupe("Cajon", 18, 4),
  ],
};
const DOCS = Object.fromEntries(
  EQUIPES.map((def) => [
    `equipes/${def.id}`,
    { pole: def.pole, membres: MEMBRES[def.id], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
  ]),
);

test("les données fictives ont les effectifs d'aujourd'hui", () => {
  expect(MEMBRES.louange).toHaveLength(28);
  expect(MEMBRES.edd).toHaveLength(33);
});

async function ouvrirEquipes(page: Page) {
  await sansSheets(page);
  await signInAs(page, MEMBRE, DOCS, "/equipes");
  await expect(page.getByTestId("equipe-edd")).toContainText("Cajon");
  // Le bandeau est rangé une fois les cartes mesurées.
  await expect(page.getByTestId("bandeau-equipes")).toHaveAttribute("data-range", "1");
}

const COURTS: Record<string, string> = {
  orga: "Orga", "comite-franco": "Comité Franco", da: "DA", medias: "Médias", developpement: "Développement",
  regie: "Régie", traduction: "Traduction", theologie: "Théologie", evenementiel: "Événementiel",
  decoration: "Décoration", "accueil-j1": "Accueil J1", louange: "Louange", edd: "EDD",
};

const bandeau = (page: Page) => page.getByTestId("bandeau-equipes");
const index = (page: Page) => page.getByRole("navigation", { name: "Index des équipes" });
const pilule = (page: Page, nomCourt: string) => index(page).getByRole("button", { name: nomCourt, exact: true });

// ── Équipes ─────────────────────────────────────────────────────────────────────────────────

test.describe("Équipes en bandeau", () => {
  test("la page tient dans la hauteur de la fenêtre ; seul le bandeau défile en largeur", async ({ page }) => {
    await ouvrirEquipes(page);
    const mesure = await page.evaluate(() => ({
      haut: document.documentElement.scrollHeight,
      large: document.documentElement.scrollWidth,
      fenetreH: window.innerHeight,
      fenetreL: window.innerWidth,
    }));
    expect(mesure.haut).toBeLessThanOrEqual(mesure.fenetreH + 1);
    expect(mesure.large).toBeLessThanOrEqual(mesure.fenetreL + 1);
    const b = await bandeau(page).evaluate((el) => ({ scroll: el.scrollWidth, visible: el.clientWidth, overflow: getComputedStyle(el).overflowX }));
    expect(b.overflow).toBe("auto");
    expect(b.scroll).toBeGreaterThan(b.visible);
    await capture(page, "b6-equipes");
  });

  test("les équipes gardent l'ordre d'aujourd'hui, en colonnes jamais plus hautes que le bandeau ; Louange et EDD en colonnes larges, en dernier", async ({ page }) => {
    await ouvrirEquipes(page);
    const ordre = await bandeau(page).locator("[data-testid^='equipe-']").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    expect(ordre).toEqual(EQUIPES.map((d) => `equipe-${d.id}`));
    const colonnes = await bandeau(page).locator("[data-colonne]").evaluateAll((els) =>
      els.map((c) => ({
        large: c.getAttribute("data-large") === "1",
        cartes: c.querySelectorAll("[data-testid^='equipe-']").length,
        haut: c.scrollHeight,
        ids: [...c.querySelectorAll("[data-testid^='equipe-']")].map((e) => e.getAttribute("data-testid")),
      })),
    );
    // Plusieurs équipes se partagent une colonne : la grille n'est pas une carte par colonne.
    expect(colonnes.length).toBeLessThan(EQUIPES.length);
    expect(colonnes.slice(-2).map((c) => [c.large, c.ids])).toEqual([[true, ["equipe-louange"]], [true, ["equipe-edd"]]]);
    expect(colonnes.slice(0, -2).every((c) => !c.large)).toBe(true);
    const hauteur = await bandeau(page).evaluate((el) => el.clientHeight);
    for (const c of colonnes) {
      if (c.cartes > 1) expect(c.haut).toBeLessThanOrEqual(hauteur);
    }
  });

  test("toucher « Louange » dans l'index amène la carte Louange dans le bandeau et allume sa pilule", async ({ page }) => {
    await ouvrirEquipes(page);
    await expect(pilule(page, "Orga")).toHaveAttribute("aria-current", "true");
    await pilule(page, "Louange").click();
    await expect(pilule(page, "Louange")).toHaveAttribute("aria-current", "true");
    await expect(pilule(page, "Orga")).not.toHaveAttribute("aria-current", "true");
    await expect
      .poll(async () => {
        const b = (await bandeau(page).boundingBox())!;
        const l = (await page.getByTestId("equipe-louange").boundingBox())!;
        return l.x >= b.x - 1 && l.x < b.x + b.width / 2;
      })
      .toBe(true);
    await capture(page, "b6-equipes-louange");
  });

  test("la pilule allumée suit le défilement du bandeau", async ({ page }) => {
    await ouvrirEquipes(page);
    await expect(pilule(page, "Orga")).toHaveAttribute("aria-current", "true");
    // Défilement à la main jusqu'à la colonne de Régie.
    await bandeau(page).evaluate((el) => {
      const carte = el.querySelector("[data-testid='equipe-regie']")!;
      const colonne = carte.closest("[data-colonne]") as HTMLElement;
      el.scrollTo({ left: colonne.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: "instant" });
    });
    const premiere = await bandeau(page).evaluate((el) =>
      el.querySelector("[data-testid='equipe-regie']")!.closest("[data-colonne]")!.querySelector("[data-testid^='equipe-']")!.getAttribute("data-testid")!.replace("equipe-", ""),
    );
    await expect(pilule(page, COURTS[premiere])).toHaveAttribute("aria-current", "true");
    await expect(pilule(page, "Orga")).not.toHaveAttribute("aria-current", "true");
    await bandeau(page).evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    await expect(pilule(page, "Orga")).toHaveAttribute("aria-current", "true");
  });

  test("flèches ‹ › sur ordinateur seulement ; accroche aux colonnes sur écran tactile", async ({ page }, info) => {
    await ouvrirEquipes(page);
    const suivantes = page.getByRole("button", { name: "Équipes suivantes" });
    const snap = await bandeau(page).evaluate((el) => getComputedStyle(el).scrollSnapType);
    if (!pointeurFin(info)) {
      await expect(suivantes).toBeHidden();
      expect(snap).toContain("x");
      expect(snap).toContain("mandatory");
      return;
    }
    expect(snap).not.toContain("mandatory");
    await expect(page.getByRole("button", { name: "Équipes précédentes" })).toBeHidden();
    await suivantes.click();
    await expect.poll(() => bandeau(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(page.getByRole("button", { name: "Équipes précédentes" })).toBeVisible();
    await expect(pilule(page, "Orga")).not.toHaveAttribute("aria-current", "true");
  });

  test("中文 : l'index porte les noms d'équipe traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await sansSheets(page);
    await signInAs(page, MEMBRE, DOCS, "/equipes");
    const idx = page.getByRole("navigation", { name: "团队索引" });
    await expect(idx.getByRole("button", { name: "敬拜组" })).toBeVisible();
    await expect(idx.getByRole("button", { name: "主日学" })).toBeVisible();
    await capture(page, "b6-equipes-zh");
  });
});

// ── Guide ───────────────────────────────────────────────────────────────────────────────────

const sommaire = (page: Page) => page.getByRole("navigation", { name: "Sur cette page" });

async function ouvrirGuide(page: Page) {
  await sansSheets(page);
  await signInAs(page, MEMBRE, {}, "/guide");
  await expect(page.getByRole("heading", { level: 1, name: "Guide d'utilisation" })).toBeVisible();
}

test.describe("Guide", () => {
  test("aucun défilement horizontal de la page", async ({ page }) => {
    await ouvrirGuide(page);
    const { large, fenetre } = await page.evaluate(() => ({ large: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(large).toBeLessThanOrEqual(fenetre + 1);
    await capture(page, "b6-guide");
  });

  test("en grand : sommaire collant à gauche (270 px), lecture à 720 px au plus", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets seulement (ordinateur, iPad paysage)");
    await ouvrirGuide(page);
    const nav = (await sommaire(page).boundingBox())!;
    const lecture = (await page.locator("section#songs").boundingBox())!;
    expect(Math.round(nav.width)).toBe(270);
    expect(nav.x + nav.width).toBeLessThanOrEqual(lecture.x);
    expect(lecture.width).toBeLessThanOrEqual(721);
    expect(lecture.width).toBeGreaterThan(560);
    // Le sommaire reste à l'écran quand on lit plus bas.
    await page.locator("section#account").scrollIntoViewIfNeeded();
    const apres = (await sommaire(page).boundingBox())!;
    const hauteur = await page.evaluate(() => window.innerHeight);
    expect(apres.y).toBeGreaterThanOrEqual(0);
    expect(apres.y).toBeLessThan(hauteur / 2);
    await capture(page, "b6-guide-bas");
  });

  test("en grand : la partie lue s'allume dans le sommaire", async ({ page }, info) => {
    test.skip(!enGrand(info), "deux volets seulement (ordinateur, iPad paysage)");
    await ouvrirGuide(page);
    await expect(sommaire(page).getByRole("link", { name: "Trouver et lire un chant" })).toHaveAttribute("aria-current", "location");
    await sommaire(page).getByRole("link", { name: "Harmonie" }).click();
    await expect(sommaire(page).getByRole("link", { name: "Harmonie" })).toHaveAttribute("aria-current", "location");
    await expect(sommaire(page).getByRole("link", { name: "Trouver et lire un chant" })).not.toHaveAttribute("aria-current", "location");
    // Au défilement, sans toucher le sommaire.
    await page.evaluate(() => window.scrollTo({ top: document.getElementById("planning")!.getBoundingClientRect().top + window.scrollY - 60, behavior: "instant" }));
    await expect(sommaire(page).getByRole("link", { name: "Planning et Mes Services" })).toHaveAttribute("aria-current", "location");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect(sommaire(page).getByRole("link", { name: "Compte, langue et thème" })).toHaveAttribute("aria-current", "location");
  });

  test("tablette portrait : le sommaire sur deux colonnes, en tête (tablette)", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait");
    await ouvrirGuide(page);
    const liens = sommaire(page).getByRole("link");
    const a = (await liens.nth(0).boundingBox())!;
    const b = (await liens.nth(1).boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    const nav = (await sommaire(page).boundingBox())!;
    const lecture = (await page.locator("section#songs").boundingBox())!;
    expect(nav.y + nav.height).toBeLessThanOrEqual(lecture.y);
    // La lecture prend la largeur de l'écran, pas une colonne de 672 px.
    expect(lecture.width).toBeGreaterThan(700);
  });

  test("téléphone : le sommaire en une colonne, en tête (téléphone)", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone");
    await ouvrirGuide(page);
    const liens = sommaire(page).getByRole("link");
    const a = (await liens.nth(0).boundingBox())!;
    const b = (await liens.nth(1).boundingBox())!;
    expect(Math.abs(a.x - b.x)).toBeLessThan(2);
    expect(b.y).toBeGreaterThan(a.y);
    // Des lignes qu'on touche du pouce.
    expect(a.height).toBeGreaterThanOrEqual(40);
  });
});
