import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U5, tranche T2 (docs/spec-deux-volets.md, questions 3, 9 à 12 et 14) :
// sur téléphone et tablette portrait, la setlist relie Liste et Partitions (G).
// Toucher une ligne ouvre les partitions à ce chant ; « Liste » ramène à la ligne
// du chant lu ; l'adresse et le retour du navigateur suivent ; la même barre des
// deux côtés ; le titre d'un chant des partitions mène à sa page. Le glissement
// d'une vue à l'autre viendra avec T3. Sur ordinateur et tablette couchée, la
// setlist passera en deux volets (T4) : ces tests ne visent pas ces dispositions.

const SETLIST_ID = "setlist-g";
/** Artiste d'Abba Père, lu dans l'index (pas de nom de personne écrit ici). */
const ARTISTE_ABBA: string = JSON.parse(readFileSync("public/songs-index.json", "utf8")).songs.find(
  (s: { slug: string }) => s.slug === "abba-pere",
).artist;
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Test M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

// Un chant FR transposé, un chant ZH sur son scan 简谱, une transition, une fusion
// (CLAUDE.md : au moins un chant FR et un chant ZH).
const SETLIST = {
  title: "Culte du 4 octobre",
  leader: "Présidence T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "Thème : la grâce.",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, keyOverride: "G", notes: "Démarrer doux", structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] }),
    item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, structureOverride: ["verse-2-0", "chorus-3-1"] }),
    item({ type: "transition", songSlug: "", position: 3, transitionText: "Prière, piano doux" }),
    item({
      type: "fusion",
      songSlug: "",
      position: 4,
      fusionSongs: [
        { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
        { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
      ],
      mixedStructure: null,
    }),
  ],
};

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === "ordinateur", "G : téléphone et tablette portrait (deux volets sur ordinateur, T4)");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
});

async function ouvrir(page: Page, to = `/setlists/${SETLIST_ID}`) {
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, to);
}

const bascule = (page: Page) => page.getByTestId("bascule-vues");
const boutonVue = (page: Page, nom: "Liste" | "Partitions") => bascule(page).getByRole("button", { name: nom, exact: true });
const barre = (page: Page) => page.getByTestId("barre-outils");
/** Ligne de la vue liste, par position de l'élément (celle de `?chant=`). */
const ligne = (page: Page, n: number) => page.locator(`[data-ligne="${n}"]`);
const lienLigne = (page: Page, n: number) => ligne(page, n).getByRole("link");
/** Un chant en partition (PartitionView). */
const chant = (page: Page, n: number) => page.locator(`[data-outline-item="${n}"]`);
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

/** Écart entre le haut du chant `n` et le bas de la bascule, posée sous la barre. */
async function ecartSousLaBarre(page: Page, n: number) {
  const [haut, bas] = await Promise.all([
    chant(page, n).evaluate((el) => el.getBoundingClientRect().top),
    bascule(page).evaluate((el) => el.getBoundingClientRect().bottom),
  ]);
  return Math.round(haut - bas);
}
/** Le chant commence juste sous la bascule : 12 px, le fondu du bas de la bascule. */
const SOUS_LA_BARRE = 12;

/** Libellés des commandes visibles de la barre, dans l'ordre. */
const commandes = (page: Page) =>
  barre(page).locator("a, button").evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetParent !== null).map((el) => el.getAttribute("aria-label") ?? ""),
  );

test.describe("setlist G, téléphone et tablette portrait", () => {
  test("la bascule « Liste | Partitions » est sous l'en-tête, hors de la barre ; la Liste d'abord", async ({ page }) => {
    await ouvrir(page);
    await expect(boutonVue(page, "Liste")).toHaveAttribute("aria-pressed", "true");
    await expect(boutonVue(page, "Partitions")).toHaveAttribute("aria-pressed", "false");
    await expect(barre(page).getByRole("button", { name: "Partitions", exact: true })).toHaveCount(0);
    const [titre, b] = await Promise.all([
      page.getByRole("heading", { level: 1, name: "Culte du 4 octobre" }).boundingBox(),
      bascule(page).boundingBox(),
    ]);
    expect(b!.y, "sous le titre").toBeGreaterThan(titre!.y + titre!.height);
    await expect(ligne(page, 1)).toBeVisible();
    await expect(chant(page, 1)).toHaveCount(0);
    expect(params(page)).toEqual({});
  });

  test("bascule : pleine largeur sur téléphone, 360 px au plus sur tablette", async ({ page }, info) => {
    await ouvrir(page);
    const b = (await bascule(page).getByRole("button").first().evaluate((el) => el.parentElement!.getBoundingClientRect().width));
    const largeur = page.viewportSize()!.width;
    if (info.project.name === "telephone") expect(b).toBeGreaterThan(largeur - 40);
    else expect(b).toBeLessThanOrEqual(361);
  });

  test("toucher la ligne 2 ouvre les partitions au chant 2, sous la barre, et l'adresse le dit", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect(chant(page, 2)).toBeVisible();
    expect(params(page)).toEqual({ vue: "partitions", chant: "2" });
    await expect(boutonVue(page, "Partitions")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => ecartSousLaBarre(page, 2), "le chant 2 commence sous la barre").toBe(SOUS_LA_BARRE);
    await expect(bascule(page), "la bascule reste à l'écran").toBeInViewport();
  });

  test("toute la ligne d'une fusion ouvre aussi les partitions à sa place", async ({ page }) => {
    await ouvrir(page);
    await ligne(page, 4).click({ position: { x: 200, y: 8 } });
    await expect(chant(page, 4)).toBeVisible();
    expect(params(page)).toEqual({ vue: "partitions", chant: "4" });
    await expect.poll(() => ecartSousLaBarre(page, 4)).toBe(SOUS_LA_BARRE);
  });

  test("une transition se déplie comme aujourd'hui, sans quitter la liste", async ({ page }) => {
    await ouvrir(page);
    await page.getByRole("button", { name: "Transition" }).click();
    await expect(page.getByText("Prière, piano doux")).toBeVisible();
    expect(params(page)).toEqual({});
    await expect(chant(page, 1)).toHaveCount(0);
  });

  test("« Liste » ramène à la ligne du chant touché, marquée", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    await boutonVue(page, "Liste").click();
    await expect(ligne(page, 1)).toBeVisible();
    expect(params(page)).toEqual({});
    await expect(lienLigne(page, 2)).toHaveAttribute("aria-current", "true");
    await expect(lienLigne(page, 1)).not.toHaveAttribute("aria-current", /.+/);
    await expect(ligne(page, 2)).toBeInViewport({ ratio: 1 });
  });

  test("après défilement jusqu'au chant 1, « Liste » ramène la ligne 1", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => params(page).chant, "l'adresse suit le chant lu").toBe("1");
    await boutonVue(page, "Liste").click();
    await expect(lienLigne(page, 1)).toHaveAttribute("aria-current", "true");
    await expect(lienLigne(page, 2)).not.toHaveAttribute("aria-current", /.+/);
  });

  test("« Partitions » rouvre là où on était", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    // Descendre cache les barres (et la bascule avec elles) ; remonter un peu les ramène.
    const image = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.scrollBy(0, 150));
    await image();
    await page.evaluate(() => window.scrollBy(0, -20));
    await image();
    const y = await page.evaluate(() => window.scrollY);
    await expect(bascule(page)).toBeInViewport({ ratio: 1 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    await boutonVue(page, "Liste").click();
    await expect(ligne(page, 2)).toBeVisible();
    await boutonVue(page, "Partitions").click();
    await expect(chant(page, 2)).toBeVisible();
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(y));
    expect(params(page)).toEqual({ vue: "partitions", chant: "2" });
  });

  test("le retour du navigateur revient à la Liste, puis quitte la setlist", async ({ page }) => {
    await ouvrir(page, "/setlists");
    await page.goto(`/setlists/${SETLIST_ID}`);
    await lienLigne(page, 2).click();
    await expect(chant(page, 2)).toBeVisible();
    await page.goBack();
    await expect(ligne(page, 2)).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^/setlists/${SETLIST_ID}/?$`));
    expect(params(page)).toEqual({});
    await expect(lienLigne(page, 2)).toHaveAttribute("aria-current", "true");
    await page.goBack();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/setlists\/?$/);
  });

  test("« Liste » après une ouverture directe des partitions ne quitte pas la setlist", async ({ page }) => {
    await ouvrir(page, `/setlists/${SETLIST_ID}?vue=partitions&chant=2`);
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    await boutonVue(page, "Liste").click();
    await expect(ligne(page, 2)).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^/setlists/${SETLIST_ID}/?$`));
    expect(params(page)).toEqual({});
  });

  test("rechargement : la même vue, au même chant", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    await page.reload();
    await expect(chant(page, 2)).toBeVisible();
    expect(params(page)).toEqual({ vue: "partitions", chant: "2" });
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
  });

  test("la même barre des deux côtés", async ({ page }) => {
    await ouvrir(page);
    await expect(barre(page).getByRole("button", { name: "Mode Louange" })).toBeVisible();
    const cote = await commandes(page);
    expect(cote).toEqual(["Retour", "Affichage", "Adapter", "Accords", "Ma version", "Mode Louange", "Plus d'actions"]);
    await boutonVue(page, "Partitions").click();
    await expect(chant(page, 1)).toBeVisible();
    expect(await commandes(page)).toEqual(cote);
  });

  test("Adapter depuis la Liste ouvre les partitions au chant lu, en adaptation", async ({ page }) => {
    await ouvrir(page);
    await lienLigne(page, 2).click();
    await expect.poll(() => ecartSousLaBarre(page, 2)).toBe(SOUS_LA_BARRE);
    await boutonVue(page, "Liste").click();
    await barre(page).getByRole("button", { name: "Adapter" }).click();
    await expect(page.getByText(/Mode adaptation/)).toBeVisible();
    expect(params(page)).toEqual({ vue: "partitions", chant: "2" });
    await expect(barre(page).getByRole("button", { name: "Adapter" })).toHaveAttribute("aria-pressed", "true");
  });

  test("Ma version depuis la Liste ouvre les partitions dans ce mode", async ({ page }) => {
    await ouvrir(page);
    await barre(page).getByRole("button", { name: "Ma version" }).click();
    await expect(page.getByText(/^Ma version :/)).toBeVisible();
    expect(params(page)).toEqual({ vue: "partitions", chant: "1" });
  });

  test("Accords depuis la Liste change le réglage des partitions", async ({ page }) => {
    await ouvrir(page);
    const accords = barre(page).getByRole("button", { name: "Accords" });
    await expect(accords).toHaveAttribute("aria-pressed", "true");
    await accords.click();
    await expect(accords).toHaveAttribute("aria-pressed", "false");
    expect(params(page), "on reste sur la liste").toEqual({});
    await boutonVue(page, "Partitions").click();
    await expect(chant(page, 1).getByText("Bien avant le chant", { exact: false }).first()).toBeVisible();
    // Abba Père en G : F#m devient Em.
    await expect(chant(page, 1).getByText("Em", { exact: true })).toHaveCount(0);
    await accords.click();
    await expect(chant(page, 1).getByText("Em", { exact: true }).first()).toBeVisible();
  });

  test("Affichage : ordre joué, sections uniques, structure seule, pinyin, couleurs, 简谱", async ({ page }) => {
    await ouvrir(page);
    await barre(page).getByRole("button", { name: "Affichage" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitemradio")).toHaveText([
      "Ordre joué", "Sections uniques", "Structure seule", "Choix du responsable", "Toujours", "Jamais",
    ].map((t) => new RegExp(t)));
    await expect(menu.getByRole("menuitemcheckbox", { name: "Pinyin" })).toBeVisible();
    await expect(menu.getByRole("menuitemcheckbox", { name: "Couleurs par section" })).toBeVisible();
    // Le réglage choisi sur la Liste vaut pour les partitions.
    await menu.getByRole("menuitemradio", { name: "Structure seule" }).click();
    await page.keyboard.press("Escape");
    await boutonVue(page, "Partitions").click();
    await expect(chant(page, 1)).toBeVisible();
    await expect(chant(page, 1).locator("[data-section]")).toHaveCount(0);
  });

  test("toutes les informations : en-tête, lignes, menu ⋯", async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByRole("heading", { level: 1, name: "Culte du 4 octobre" })).toBeVisible();
    await expect(page.getByText("Présidence T.")).toBeVisible();
    await expect(page.getByText("Thème : la grâce.")).toBeVisible();
    await expect(page.getByText("Vous pouvez modifier")).toBeVisible();
    // Une ligne : numéro, titre, artiste, structure abrégée, notes, tonalité et « orig. », chevron.
    const abba = ligne(page, 1);
    await expect(abba).toContainText("1");
    await expect(abba).toContainText("Abba Père");
    await expect(abba).toContainText(ARTISTE_ABBA);
    await expect(abba).toContainText("C1 · R · R");
    await expect(abba).toContainText("Démarrer doux");
    await expect(abba.getByTestId("tonalite")).toHaveText("G");
    await expect(abba).toContainText("orig. A");
    await expect(abba.locator("[data-chevron]")).toBeVisible();
    const zh = ligne(page, 2);
    await expect(zh).toContainText("Yī shēng ài nǐ");
    await expect(zh).toContainText("谱 简谱");
    await expect(ligne(page, 4)).toContainText("Abba Père / 一生爱你");
    await barre(page).getByRole("button", { name: "Plus d'actions" }).click();
    const menu = page.getByRole("menu");
    for (const nom of ["Modifier", "Prévenir l'équipe", "Dupliquer", "Partager", "PDF"]) {
      await expect(menu.getByRole("menuitem", { name: new RegExp(nom) })).toBeVisible();
    }
  });

  test("côté Partitions : numéro, « Copier les paroles », notes, scan 简谱", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await ouvrir(page, `/setlists/${SETLIST_ID}?vue=partitions&chant=1`);
    await expect(chant(page, 1).getByRole("button", { name: "Copier les paroles" })).toBeVisible();
    await expect(chant(page, 1)).toContainText("Démarrer doux");
    await expect(chant(page, 2).locator("[data-jianpu-page] img").first()).toBeVisible();
  });

  test("le titre d'un chant des partitions mène à sa page, dans les réglages de la setlist", async ({ page }) => {
    await ouvrir(page);
    await boutonVue(page, "Partitions").click();
    const titre = chant(page, 1).getByRole("link", { name: /Abba Père/i });
    await expect(titre).toHaveAttribute("href", /^\/songs\/abba-pere\/?\?/);
    const href = new URL((await titre.getAttribute("href"))!, "http://x");
    expect(href.searchParams.get("key")).toBe('"G"');
    expect(href.searchParams.get("setlist")).toBe(`"${SETLIST_ID}"`);
    // Le chant sur son scan et les chants d'une fusion aussi.
    await expect(chant(page, 2).getByRole("link", { name: "一生爱你" })).toHaveAttribute("href", /^\/songs\/%E4%B8%80/);
    await expect(chant(page, 4).getByRole("link", { name: /Abba Père/i })).toHaveAttribute("href", /^\/songs\/abba-pere\/?\?/);
    await titre.click();
    await page.waitForURL(/\/songs\/abba-pere\/?\?/);
    expect(new URL(page.url()).searchParams.get("key")).toBe('"G"');
  });

  test("les partitions se chargent juste après l'affichage de la liste", async ({ page }) => {
    const chants = new Set<string>();
    page.on("request", (r) => {
      const m = /\/api\/song\/([^/?]+)/.exec(r.url());
      if (m) chants.add(decodeURIComponent(m[1]));
    });
    await ouvrir(page);
    await expect(ligne(page, 1)).toBeVisible();
    await expect.poll(() => [...chants].sort()).toEqual(["abba-pere", "一生爱你"]);
    await expect(chant(page, 1), "toujours sur la liste").toHaveCount(0);
  });
});
