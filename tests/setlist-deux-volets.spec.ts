import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { compterLesRendus, defilerImageParImage } from "./helpers/rendus";

// Lot U5, tranche T4 (docs/spec-deux-volets.md, questions 1, 6 à 8, 14) : sur
// ordinateur et sur tablette couchée, la setlist passe en deux volets. Un en-tête
// pleine largeur qui colle en haut et s'escamote au défilement (titre, boutons) ;
// à gauche le « Sommaire » (chants, pastilles des étapes jouées, « Copier toutes
// les paroles ») ; à droite toutes les partitions à la suite. Plus de bascule ni
// de Retour : l'entrée « Setlists » de la barre latérale rouvre la liste filtrée.
// Téléphone et tablette debout gardent G (tests/setlist-g.spec.ts).

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const SETLIST_ID = "setlist-deux-volets";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Test M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`;
const CANVA = "https://www.canva.com/design/DAG123/view";

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

// Un chant FR transposé (G au lieu de A), un chant ZH sur son scan 简谱, une
// transition, une fusion (CLAUDE.md : au moins un chant FR et un chant ZH).
const SETLIST = {
  title: "Culte du 4 octobre",
  leader: "Présidence T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "Thème : la grâce.",
  ownerId: "uid-owner",
  isPrivate: false,
  presentationUrl: CANVA,
  items: [
    item({ songSlug: "abba-pere", position: 1, keyOverride: "G", notes: "Démarrer doux", structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] }),
    item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, structureOverride: ["verse-2-0", "chorus-3-1"] }),
    item({ type: "transition", songSlug: "", position: 3, transitionText: "Prière, piano doux" }),
    item({
      type: "fusion",
      songSlug: "",
      position: 4,
      fusionSongs: [
        { songSlug: "abba-pere", keyOverride: null, structureOverride: ["chorus-3"], sectionNotes: {} },
        { songSlug: "一生爱你", keyOverride: null, structureOverride: ["chorus-3"], sectionNotes: {} },
      ],
      mixedStructure: null,
    }),
  ],
};

const GRAND = ["ordinateur", "tablette-paysage", "ordinateur-1440"];

test.beforeEach(async ({ page }, info) => {
  test.skip(!GRAND.includes(info.project.name), "deux volets : ordinateur et tablette couchée (G ailleurs, setlist-g.spec.ts)");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
});

async function ouvrir(page: Page, to = `/setlists/${SETLIST_ID}`, extra: Record<string, Record<string, unknown>> = {}) {
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST, ...extra }, to);
  await chant(page, 1).waitFor();
  return db;
}

const enTete = (page: Page) => page.locator("[data-en-tete]");
const sommaire = (page: Page) => page.getByRole("navigation", { name: "Sommaire" });
/** Entrée du sommaire, par position de l'élément (celle de `?chant=`). */
const entree = (page: Page, n: number) => sommaire(page).locator(`[data-sommaire="${n}"]`);
const boutonChant = (page: Page, n: number) => entree(page, n).locator("[data-sommaire-chant]");
const pastilles = (page: Page, n: number) => entree(page, n).locator("[data-pastille]");
/** Un chant en partition (PartitionView). */
const chant = (page: Page, n: number) => page.locator(`[data-outline-item="${n}"]`);
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

/** Écart entre le haut d'un élément et le bas de l'en-tête. */
async function ecartSousEnTete(page: Page, el: ReturnType<Page["locator"]>) {
  const [haut, bas] = await Promise.all([
    el.evaluate((e) => e.getBoundingClientRect().top),
    enTete(page).evaluate((e) => e.getBoundingClientRect().bottom),
  ]);
  return Math.round(haut - bas);
}
/** Le chant amené commence 12 px sous l'en-tête (son fondu), comme sous la bascule de G. */
const SOUS_EN_TETE = 12;

/** Défile par petits pas, comme une molette : la page voit le sens du défilement. */
async function defiler(page: Page, dy: number) {
  const pas = Math.sign(dy) * 60;
  for (let fait = 0; Math.abs(fait) < Math.abs(dy); fait += pas) {
    await page.evaluate((d) => window.scrollBy(0, d), pas);
    await page.waitForTimeout(16);
  }
}

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("setlist en deux volets (ordinateur, tablette couchée)", () => {
  test("ni bascule ni Retour : l'en-tête en haut, le Sommaire à gauche, les partitions à droite", async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByTestId("bascule-vues")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Retour", exact: true })).toHaveCount(0);
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Culte du 4 octobre" })).toBeVisible();
    await expect(sommaire(page)).toBeVisible();
    const [s, p, e] = await Promise.all([sommaire(page).boundingBox(), chant(page, 1).boundingBox(), enTete(page).boundingBox()]);
    expect(s!.x + s!.width, "le sommaire à gauche des partitions").toBeLessThanOrEqual(p!.x);
    expect(s!.y, "sous l'en-tête").toBeGreaterThanOrEqual(e!.y + e!.height - 1);
    expect(s!.width, "volet de gauche de 320 à 400 px").toBeGreaterThanOrEqual(320);
    expect(s!.width).toBeLessThanOrEqual(400);
    await expect(chant(page, 2)).toBeAttached();
    expect(params(page), "rien dans l'adresse avant de lire").toEqual({});
    await capture(page, "deux-volets");
  });

  test("l'en-tête : catégorie et date, titre, présidence ; Présentation · Adapter · Ma version · Modifier · PDF · ⋯ · Mode louange", async ({ page }) => {
    await ouvrir(page);
    const e = enTete(page);
    await expect(e).toContainText("Culte Francophone");
    await expect(e).toContainText(/dimanche 4 octobre/i);
    await expect(e).toContainText("Présidence : Présidence T.");
    const noms = await e.locator("a, button").evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => el.getAttribute("aria-label") ?? el.textContent?.trim() ?? ""),
    );
    expect(noms).toEqual(["Présentation", "Adapter", "Ma version", "Modifier", "PDF", "Plus d'actions", "Mode Louange"]);
    // Libellés compris : ils se lisent, pas seulement à l'oreille.
    for (const nom of ["Adapter", "Ma version", "Modifier", "Mode Louange"]) {
      await expect(e.getByRole(nom === "Modifier" ? "link" : "button", { name: nom, exact: true })).toContainText(nom);
    }
    await expect(e.getByRole("link", { name: "Présentation" })).toHaveAttribute("href", CANVA);
    await expect(e.getByRole("link", { name: "Modifier", exact: true })).toHaveAttribute("href", new RegExp(`/setlists/${SETLIST_ID}/edit/?$`));
    // Ce que garde la question 4 : sous le titre, pas dans le menu.
    await expect(page.getByText("Vous pouvez modifier")).toBeVisible();
    await expect(page.getByText("Thème : la grâce.")).toBeVisible();
  });

  test("⋯ : Accords, Affichage, Prévenir l'équipe, Dupliquer, Partager, Supprimer", async ({ page }) => {
    await ouvrir(page);
    await enTete(page).getByRole("button", { name: "Plus d'actions" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitemcheckbox", { name: "Accords" })).toHaveAttribute("aria-checked", "true");
    for (const nom of ["Prévenir l'équipe", "Dupliquer", "Partager", "Supprimer"]) {
      await expect(menu.getByRole("menuitem", { name: nom })).toBeVisible();
    }
    // Accords : le réglage vaut pour les partitions (Abba Père en G : F#m devient Em).
    await expect(chant(page, 1).getByText("Em", { exact: true }).first()).toBeVisible();
    await menu.getByRole("menuitemcheckbox", { name: "Accords" }).click();
    await expect(chant(page, 1).getByText("Em", { exact: true })).toHaveCount(0);
    // Affichage, dans un sous-menu : trois positions, couleurs par section, 简谱.
    await page.keyboard.press("Escape");
    await enTete(page).getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Affichage" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Ordre joué" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("menuitemcheckbox", { name: "Pinyin" })).toBeVisible();
    await expect(page.getByRole("menuitemcheckbox", { name: "Couleurs par section" })).toBeVisible();
    await page.getByRole("menuitemradio", { name: "Structure seule" }).click();
    await expect(chant(page, 1).locator("[data-section]")).toHaveCount(0);
  });

  test("Sommaire complet : numéros, titres, tonalités et « orig. », pastilles des étapes, notes, « Partition 简谱 »", async ({ page }) => {
    await ouvrir(page);
    await expect(sommaire(page).getByText("Sommaire", { exact: true })).toBeVisible();
    // Abba Père : G au lieu de A, couplet puis refrain deux fois (sans « ×2 »).
    await expect(entree(page, 1)).toContainText("1");
    await expect(entree(page, 1)).toContainText("Abba Père");
    await expect(entree(page, 1).getByTestId("tonalite")).toHaveText("G");
    await expect(entree(page, 1).getByTestId("tonalite-origine")).toHaveText("orig. A");
    await expect(pastilles(page, 1)).toHaveText(["C1", "R", "R"]);
    await expect(entree(page, 1)).toContainText("Démarrer doux");
    // 一生爱你 : sur son scan.
    await expect(entree(page, 2)).toContainText("一生爱你");
    await expect(entree(page, 2).getByTestId("tonalite")).toHaveText("E");
    await expect(entree(page, 2).getByTestId("tonalite-origine")).toHaveCount(0);
    await expect(pastilles(page, 2)).toHaveText(["C", "R"]);
    await expect(entree(page, 2)).toContainText("Partition 简谱");
    // La transition n'est pas un chant ; la fusion est le 3ᵉ.
    await expect(entree(page, 3)).toHaveCount(0);
    await expect(entree(page, 4)).toContainText("3");
    await expect(entree(page, 4)).toContainText("Abba Père / 一生爱你");
    await expect(pastilles(page, 4)).toHaveText(["R", "R"]);
    // Au départ, le premier chant est le chant lu.
    await expect(boutonChant(page, 1)).toHaveAttribute("aria-current", "true");
  });

  test("un chant touché vient sous l'en-tête et devient le chant lu ; l'adresse le suit", async ({ page }) => {
    await ouvrir(page);
    await boutonChant(page, 2).click();
    await expect.poll(() => ecartSousEnTete(page, chant(page, 2))).toBe(SOUS_EN_TETE);
    await expect(boutonChant(page, 2)).toHaveAttribute("aria-current", "true");
    await expect(boutonChant(page, 1)).not.toHaveAttribute("aria-current", "true");
    await expect(enTete(page)).toBeInViewport();
    await expect.poll(() => params(page)).toEqual({ vue: "partitions", chant: "2" });
    // Le dernier chant, qui ne peut pas monter jusqu'en haut, reste le chant lu.
    await boutonChant(page, 4).click();
    await expect(boutonChant(page, 4)).toHaveAttribute("aria-current", "true");
    await page.waitForTimeout(300);
    await expect(boutonChant(page, 4)).toHaveAttribute("aria-current", "true");
  });

  test("une pastille amène à sa section, et la marque", async ({ page }) => {
    await ouvrir(page);
    // Le second refrain d'Abba Père (sa troisième étape).
    await pastilles(page, 1).nth(2).click();
    const section = chant(page, 1).locator("[data-section]").nth(2);
    await expect.poll(() => ecartSousEnTete(page, section)).toBe(SOUS_EN_TETE);
    await expect(pastilles(page, 1).nth(2)).toHaveAttribute("aria-current", "true");
    await expect(pastilles(page, 1).nth(0)).not.toHaveAttribute("aria-current", "true");
  });

  test("le surlignage suit le défilement, et l'adresse aussi (sans entrée d'historique)", async ({ page }) => {
    await ouvrir(page);
    const avant = await page.evaluate(() => history.length);
    const y = await chant(page, 2).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await defiler(page, y);
    await expect(boutonChant(page, 2)).toHaveAttribute("aria-current", "true");
    await expect.poll(() => params(page)).toEqual({ vue: "partitions", chant: "2" });
    await defiler(page, -y - 200);
    await expect(boutonChant(page, 1)).toHaveAttribute("aria-current", "true");
    expect(await page.evaluate(() => history.length)).toBe(avant);
  });

  test("ouvert par l'adresse au chant 2 : il est sous l'en-tête ; rechargé, il y reste", async ({ page }) => {
    await ouvrir(page, `/setlists/${SETLIST_ID}?vue=partitions&chant=2`);
    await expect.poll(() => ecartSousEnTete(page, chant(page, 2))).toBe(SOUS_EN_TETE);
    await expect(boutonChant(page, 2)).toHaveAttribute("aria-current", "true");
    await page.reload();
    await chant(page, 2).waitFor();
    await expect.poll(() => ecartSousEnTete(page, chant(page, 2))).toBe(SOUS_EN_TETE);
  });

  test("l'en-tête colle en haut et s'escamote au défilement ; le sommaire monte avec lui", async ({ page }) => {
    await ouvrir(page);
    const hauteur = (await enTete(page).boundingBox())!.height;
    await expect.poll(async () => Math.round((await sommaire(page).boundingBox())!.y)).toBe(Math.round(hauteur));
    await defiler(page, 600);
    await expect.poll(async () => { const b = (await enTete(page).boundingBox())!; return b.y + b.height; }).toBeLessThanOrEqual(1);
    await expect.poll(async () => Math.round((await sommaire(page).boundingBox())!.y)).toBe(0);
    await defiler(page, -120);
    await expect.poll(async () => Math.round((await enTete(page).boundingBox())!.y)).toBe(0);
    await expect.poll(async () => Math.round((await sommaire(page).boundingBox())!.y)).toBe(Math.round(hauteur));
  });

  test("« Copier toutes les paroles » : FR puis ZH (caractères puis pinyin), deux lignes vides entre deux chants", async ({ page }) => {
    await ouvrir(page);
    await sommaire(page).getByRole("button", { name: "Copier toutes les paroles" }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const chants = text.split("\n\n\n");
    expect(chants, "trois chants : Abba Père, 一生爱你, la fusion").toHaveLength(3);
    expect(chants[0].split("\n")[0]).toBe("Bien avant le chant qui créa l'univers,");
    expect(chants[1].split("\n").slice(0, 2)).toEqual([
      "亲爱的宝贵耶稣，你爱何等的甘甜，",
      "qīn ài de bǎo guì yē sū nǐ ài hé děng de gān tián",
    ]);
    expect(chants[2]).toContain("Abba Père, je suis à Toi");
    expect(chants[2]).toContain("一生爱你，一生敬拜你");
    expect(text, "ni titres ni noms de section").not.toMatch(/Couplet|Refrain|Abba Père\n/);
    expect(text, "pas d'accord").not.toMatch(/F#m/);
    await expect(sommaire(page).getByRole("button", { name: "Copié" })).toBeVisible();
  });

  test("« Copier toutes les paroles » n'est pas proposé quand un chant suit « Ma version »", async ({ page }) => {
    const mien = readFileSync("content/songs/abba-pere.cho", "utf8").replace("planait sur la", "flottait sur la");
    await ouvrir(page, `/setlists/${SETLIST_ID}`, {
      [VERSION_DOC]: { authorUid: MUSICIEN.uid, authorName: "Test M.", items: { "abba-pere": { content: mien, structure: null, shared: false } }, choices: {} },
    });
    await expect(entree(page, 1)).toBeVisible();
    await expect(sommaire(page).getByRole("button", { name: "Copier toutes les paroles" })).toHaveCount(0);
  });

  test("« Quel PDF ? » propose aussi « Liste », qui télécharge le PDF liste", async ({ page }) => {
    await ouvrir(page);
    await enTete(page).getByRole("button", { name: "PDF", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Quel PDF ?" });
    await expect(sheet.getByRole("radio")).toHaveCount(4);
    await sheet.getByRole("radio", { name: /^Liste/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      sheet.getByRole("button", { name: "Télécharger" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("Culte du 4 octobre-liste.pdf");
  });

  test("Adapter et Ma version s'ouvrent dans le volet de droite, sans rien perdre du sommaire", async ({ page }) => {
    await ouvrir(page);
    const adapter = enTete(page).getByRole("button", { name: "Adapter", exact: true });
    const maVersion = enTete(page).getByRole("button", { name: "Ma version", exact: true });
    await adapter.click();
    await expect(adapter).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Mode adaptation/)).toBeVisible();
    await expect(sommaire(page)).toBeVisible();
    await maVersion.click();
    await expect(maVersion).toHaveAttribute("aria-pressed", "true");
    await expect(adapter).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/Mode adaptation/)).toHaveCount(0);
    await expect(sommaire(page)).toBeVisible();
    await capture(page, "deux-volets-ma-version");
  });

  test("« Mode louange » s'ouvre au premier chant", async ({ page }) => {
    await ouvrir(page);
    await enTete(page).getByRole("button", { name: "Mode Louange" }).click();
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
  });

  test("l'entrée « Setlists » de la barre latérale rouvre la liste filtrée", async ({ page }) => {
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, "/setlists?tab=archived");
    await expect(page).toHaveURL(/tab=archived/);
    // La liste se retient une fois son état relu de l'adresse (`useSetlistsNavState`) : l'adresse
    // porte déjà `tab=archived` avant (connexion), d'où une course avec la page qui suit.
    await page.waitForFunction(() => sessionStorage.getItem("setlistsListPath")?.includes("tab=archived"));
    await page.goto(`/setlists/${SETLIST_ID}`);
    await chant(page, 1).waitFor();
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await navigation.getByRole("link", { name: "Setlists" }).click();
    await expect(page).toHaveURL(/\/setlists\/?\?tab=archived$/);
  });

  test("ordinateur, barre dépliée : deux volets dès 1 148 px, un seul en dessous ; barre réduite : deux volets dès 1 024 px", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "règle de Q1, jouée sur ordinateur");
    await page.setViewportSize({ width: 1147, height: 800 });
    await ouvrir(page, `/setlists/${SETLIST_ID}?vue=partitions&chant=1`);
    await expect(page.getByTestId("bascule-vues")).toBeVisible();
    await expect(sommaire(page)).toHaveCount(0);
    await page.setViewportSize({ width: 1148, height: 800 });
    await expect(sommaire(page)).toBeVisible();
    await expect(page.getByTestId("bascule-vues")).toHaveCount(0);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByTestId("bascule-vues")).toBeVisible();
    await page.getByRole("button", { name: "Réduire la barre latérale" }).click();
    await expect(sommaire(page)).toBeVisible();
    await expect(page.getByTestId("bascule-vues")).toHaveCount(0);
  });
});

// ─── Relecture du lot (05/10/2026) ────────────────────────────────────────────

/** Le chant ZH de la setlist, à son adresse (`/api/song/一生爱你`, encodée). */
const estLeChantZh = (url: URL) => decodeURIComponent(url.pathname).replace(/\/$/, "") === "/api/song/一生爱你";

test.describe("relecture : défilement, copie (deux volets)", () => {
  // `page.route` ne voit pas ce qui passe par le service worker.
  test.use({ serviceWorkers: "block" });

  test("défiler dans un même chant ne re-rend pas la page à chaque image", async ({ page }) => {
    const rendus = await compterLesRendus(page);
    await ouvrir(page);
    // Dans le premier chant, l'en-tête déjà escamoté ; scans et barres posés.
    await defiler(page, 300);
    await rendus.attendreLeCalme();
    const avant = (await rendus.lire()).length;
    expect(avant, "le crochet voit les rendus").toBeGreaterThan(0);
    await defilerImageParImage(page, 3, 20);
    const pendant = (await rendus.lire()).slice(avant);
    await expect(boutonChant(page, 1)).toHaveAttribute("aria-current", "true");
    // Un ou deux au passage d'une section (sa pastille marquée), jamais un par image. Avant la relecture :
    // deux par image, 40 ; la marge absorbe un scan ou une police arrivés en retard sous charge.
    expect(pendant.length, `vingt images dans le même chant : ${pendant.join(" | ")}`).toBeLessThanOrEqual(8);
  });

  test("« Copier toutes les paroles » attend que tous les chants soient chargés", async ({ page }) => {
    let lacher!: () => void;
    const retenu = new Promise<void>((r) => (lacher = r));
    await page.route((url) => estLeChantZh(url), async (route) => {
      await retenu;
      await route.continue();
    });
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, `/setlists/${SETLIST_ID}`);
    const bouton = sommaire(page).getByRole("button", { name: "Copier toutes les paroles" });
    await expect(bouton).toBeVisible();
    await expect(bouton, "le chant ZH n'est pas encore là").toBeDisabled();
    await expect(bouton).toHaveAttribute("aria-disabled", "true");
    lacher();
    await chant(page, 1).waitFor();
    await expect(bouton).toBeEnabled();
    await bouton.click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text.split("\n\n\n"), "les trois chants").toHaveLength(3);
  });

  test("« Copier toutes les paroles » reste inactif si un chant n'a pas pu être chargé", async ({ page }) => {
    await page.route((url) => estLeChantZh(url), (route) => route.abort("internetdisconnected"));
    await ouvrir(page);
    const bouton = sommaire(page).getByRole("button", { name: "Copier toutes les paroles" });
    await expect(bouton).toBeVisible();
    await expect(bouton).toBeDisabled();
    await expect(bouton).toHaveAttribute("aria-disabled", "true");
  });
});
