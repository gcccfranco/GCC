import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, basculerAnnoter, attendreMiseEnPage, lireCompteur, onStage, ouvrirMenu, ouvrirOutils, ouvrirReglages } from "./helpers/louange";

// Mode louange « façon forScore » (docs/spec-mode-louange-forscore.md), seul mode depuis le 27/10/2026.
// Setlist et compte simulés : aucun accès au Firestore réel.

const SETLIST_ID = "setlist-forscore";
const MUSICIEN: FakeProfile = {
  uid: "uid-lecteur",
  email: "lecteur@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const setlist = {
  title: "Culte d'essai",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-09-14",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    {
      songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true,
      useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
    },
  ],
};

async function ouvrir(page: Page, opts: { chants?: number } = {}) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
  });
  const doc = opts.chants
    ? {
        ...setlist,
        items: Array.from({ length: opts.chants }, (_, i) => ({ ...setlist.items[0], position: i + 1 })),
      }
    : setlist;
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: doc }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

test("stockage inaccessible : mode ouvert, sans erreur", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(() => {
    // Seules les clés du mode louange lèvent : la connexion simulée et le reste du site
    // ont besoin du stockage pour afficher leur formulaire.
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const lever = () => { throw new Error("stockage indisponible"); };
    Storage.prototype.getItem = function (k: string) { return k.startsWith("perf-") ? lever() : getItem.call(this, k); };
    Storage.prototype.setItem = function (k: string, v: string) { return k.startsWith("perf-") ? lever() : setItem.call(this, k, v); };
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toBeVisible();
  expect(erreurs).toEqual([]);
});

// Lot L1 : barre à la demande et bandes invisibles qui ne captent plus.

const BARRES = "[data-performance-mode] .material-chrome";

async function toucherCentre(page: Page) {
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width / 2, ecran.height / 2);
}

/** Vrai si l'élément au milieu de la bande est dans l'une des deux barres. */
async function bandeCapte(page: Page, bande: "haut" | "bas") {
  return page.evaluate(([b, sel]) => {
    const barre = [...document.querySelectorAll(sel)][b === "haut" ? 0 : 1] as HTMLElement;
    const r = barre.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!el && [...document.querySelectorAll(sel)].some((x) => x.contains(el));
  }, [bande, BARRES] as const);
}

test("barre masquée : les bandes haute et basse ne captent plus", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await ouvrir(page);
  const barreHaute = page.locator(BARRES).first();
  await expect(barreHaute).toBeVisible();
  await toucherCentre(page);
  await expect(page.locator("[data-performance-mode] .material-chrome").first()).toHaveCSS("pointer-events", "none");
  await expect(async () => {
    expect(await bandeCapte(page, "haut")).toBe(false);
    expect(await bandeCapte(page, "bas")).toBe(false);
  }).toPass({ timeout: 5_000 });
  expect(erreurs).toEqual([]);
});

test("forScore : la barre visible le reste 5 s ; toucher centre la masque, un autre la remontre pour 5 s", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await ouvrir(page);
  const reglages = page.getByRole("button", { name: "Options d'affichage" });
  await expect(reglages).toBeVisible();
  await page.waitForTimeout(5_000);
  await expect(reglages).toBeVisible();

  await toucherCentre(page);
  await expect(reglages).toBeHidden();

  await toucherCentre(page);
  await expect(reglages).toBeVisible();
  await page.waitForTimeout(5_000);
  await expect(reglages).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("forScore, barre masquée : un toucher à la hauteur de la bande basse, côté droit, tourne la page", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await ouvrir(page, { chants: 4 });
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();

  const avant = (await lireCompteur(page))!.trim();
  const total = Number(avant.split("/")[1]);
  expect(total).toBeGreaterThan(1);
  const bas = await page.locator(BARRES).nth(1).boundingBox();
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width - 20, bas!.y + bas!.height / 2);
  await expect.poll(() => lireCompteur(page)).not.toBe(avant);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  expect(erreurs).toEqual([]);
});

// Lot L2 : zones de toucher et balayage.

function surveillerErreurs(page: Page) {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return erreurs;
}

const lirePage = async (page: Page) => (await lireCompteur(page))!.trim();
const numero = async (page: Page) => Number((await lirePage(page)).split("/")[0]);

/** Barre masquée, plusieurs pages. */
async function ouvrirMasquee(page: Page) {
  await ouvrir(page, { chants: 4 });
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  const ecran = page.viewportSize()!;
  return { ecran, y: ecran.height / 2 };
}

async function cliquerA(page: Page, part: number) {
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width * part, ecran.height / 2);
}

async function glisser(page: Page, dx: number, dy: number) {
  const ecran = page.viewportSize()!;
  const x = ecran.width / 2;
  const y = ecran.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 });
  await page.mouse.move(x + dx, y + dy, { steps: 3 });
  await page.mouse.up();
}

test("forScore : toucher à 15 % = page précédente, à 85 % = suivante, à 50 % = ouvre la barre", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirMasquee(page);
  const total = Number((await lirePage(page)).split("/")[1]);
  expect(total).toBeGreaterThan(2);

  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);
  const reglages = page.getByRole("button", { name: "Options d'affichage" });
  await expect(reglages).toBeHidden();

  await cliquerA(page, 0.15);
  await expect.poll(() => numero(page)).toBe(1);
  await expect(reglages).toBeHidden();

  await cliquerA(page, 0.5);
  await expect(reglages).toBeVisible();
  expect(await numero(page)).toBe(1);
  expect(erreurs).toEqual([]);
});

test("forScore, téléphone et ordinateur : un toucher à 32 % tourne la page", async ({ page }, testInfo) => {
  test.skip(/^tablette/.test(testInfo.project.name), "propre au téléphone et à l'ordinateur");
  await ouvrirMasquee(page);
  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);
  await cliquerA(page, 0.32);
  await expect.poll(() => numero(page)).toBe(1);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
});

test("forScore, tablette : un toucher à 32 % ouvre la barre sans tourner, à 29 % il tourne", async ({ page }, testInfo) => {
  test.skip(!/^tablette/.test(testInfo.project.name), "propre aux tablettes");
  await ouvrirMasquee(page);
  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);

  await cliquerA(page, 0.32);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeVisible();
  expect(await numero(page)).toBe(2);

  await cliquerA(page, 0.5);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  await cliquerA(page, 0.29);
  await expect.poll(() => numero(page)).toBe(1);
});

test("forScore : glissé de 80 px vers la gauche = page suivante, vers la droite = précédente, barre inchangée", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirMasquee(page);
  const reglages = page.getByRole("button", { name: "Options d'affichage" });

  await glisser(page, -80, 0);
  await expect.poll(() => numero(page)).toBe(2);
  await expect(reglages).toBeHidden();

  await glisser(page, 80, 0);
  await expect.poll(() => numero(page)).toBe(1);
  await expect(reglages).toBeHidden();
  expect(erreurs).toEqual([]);
});

test("forScore : glissé vertical de 80 px et glissé de 30 px sans effet de page", async ({ page }) => {
  await ouvrirMasquee(page);
  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);

  await glisser(page, 0, 80);
  await glisser(page, -30, 0);
  await page.waitForTimeout(500);
  expect(await numero(page)).toBe(2);
});

// Lot L3 : « Ensuite : titre · tonalité », touchable, sans confirmation.

const itemChant = (songSlug: string, position: number, keyOverride: string | null = null) => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});

/** Setlist de deux chants (Abba Père puis À l'agneau en G) ; se place sur la dernière page du premier. */
async function ouvrirDernierePage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
  });
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: { ...setlist, items: [itemChant("abba-pere", 1), itemChant("a-l-agneau", 2, "G")] },
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
}

test("« Ensuite » sur la dernière page du chant, un toucher amène à la 1re page du suivant", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirDernierePage(page);
  const suivant = onStage(page, "[data-suivant]");
  await expect(async () => {
    if (await suivant.count()) return;
    await page.keyboard.press("ArrowRight");
    await expect(suivant).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(suivant).toBeVisible();
  await expect(suivant).toContainText("Ensuite");
  await expect(suivant).toContainText("À l'agneau");
  await expect(suivant).toContainText("G");
  expect((await suivant.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const avant = await numero(page);
  // La barre du bas (z 20) recouvre le bandeau tant qu'elle est visible : on la masque.
  // Elle reste jusqu'à un toucher au centre.
  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none", { timeout: 10_000 });
  await suivant.click();
  // Une page de plus, pas deux : le toucher n'a pas aussi tourné la page.
  await expect.poll(() => numero(page)).toBe(avant + 1);
  await page.waitForTimeout(500);
  expect(await numero(page)).toBe(avant + 1);
  // Le chant suivant est le dernier : plus de bandeau.
  await expect(onStage(page, "[data-suivant]")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("dernier chant de la setlist, aucun bandeau « Ensuite »", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page);
  await expect(page.locator("[data-suivant]")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("L3 colonne scan 简谱 (paysage grand écran seulement) : « Ensuite » de la colonne change de chant", async ({ page }) => {
  test.setTimeout(90_000);
  const erreurs = surveillerErreurs(page);
  // Scan non certifié : "一生爱你" est certifié, donc en tranches sans colonne ; on le rend non certifié.
  await page.route("**/jianpu/systemes.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"version":1,"chants":{}}' }));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: {
      ...setlist,
      items: [{ ...itemChant("一生爱你", 1, "D"), jianpuSheet: true }, itemChant("abba-pere", 2)],
    },
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const grand = await page.evaluate(() =>
    matchMedia("(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)").matches);
  test.skip(!grand, "paysage sur grand écran seulement");
  const colonne = onStage(page, "[data-colonne-scan]");
  await expect(colonne).toBeVisible({ timeout: 30_000 });
  const suivant = colonne.locator("[data-suivant]");
  await expect(suivant).toContainText("Ensuite");
  await expect(suivant).toContainText("Abba Père");
  await expect(onStage(page, "[data-suivant]")).toHaveCount(1);
  expect((await suivant.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const avant = await numero(page);
  await suivant.click();
  await expect.poll(() => numero(page)).toBeGreaterThan(avant);
  await expect(onStage(page, "[data-colonne-scan]")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

// Lot L4 : tempo sur toutes les pages, métronome visuel (bande des temps).

async function ouvrirChantL4(
  page: Page,
  slug: string,
  opts: { metronome?: boolean } = {},
) {
  await page.addInitScript(({ metronome }) => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
    if (metronome && localStorage.getItem("perf-metronome") === null) localStorage.setItem("perf-metronome", "1");
  }, { metronome: opts.metronome });
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: { ...setlist, items: [itemChant(slug, 1)] },
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

/** Bouton ▶ / ■ du métronome : celui de la barre (grand écran) ou celui de la bande (téléphone). */
const marcheBtn = (page: Page) => page.locator("[data-metronome-marche]:visible").first();
const tempsActif = (page: Page) => page.locator("[data-bande-temps] [data-actif]").getAttribute("data-temps");

test("un chant avec {tempo} affiche ♩ N dans la barre, sur une page texte", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous");
  await expect(page.locator("[data-jianpu-page]:not([aria-hidden=true] *)")).toHaveCount(0);
  await expect(page.locator("[data-tempo-barre]")).toHaveText(/♩\s*94/);
  expect(erreurs).toEqual([]);
});

test("un chant sans tempo, métronome actif : la bande est à ♩ 72", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "abba-pere", { metronome: true });
  await expect(page.locator("[data-bande-temps]")).toHaveCount(1);
  await expect(page.locator("[data-tempo-barre]")).toHaveText(/♩\s*72/);
  expect(erreurs).toEqual([]);
});

test("métronome inactif par défaut : pas de bande, même avec un tempo", async ({ page }) => {
  await ouvrirChantL4(page, "avec-nous");
  await expect(page.locator("[data-tempo-barre]")).toHaveCount(1);
  await expect(page.locator("[data-bande-temps]")).toHaveCount(0);
});

test("métronome actif : la bande (36 px) est là et la pastille allumée change au fil des temps après Marche", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  const bande = page.locator("[data-bande-temps]");
  await expect(bande).toHaveCount(1);
  await expect(bande).toHaveCSS("height", "36px");
  await expect(bande.locator("[data-actif]")).toHaveCount(0);
  await marcheBtn(page).click();
  await expect(marcheBtn(page)).toHaveAttribute("aria-pressed", "true");
  await expect(bande.locator("[data-actif]")).toHaveCount(1);
  const vus = new Set<string | null>();
  for (let i = 0; i < 8; i++) {
    vus.add(await tempsActif(page).catch(() => null));
    await page.waitForTimeout(200);
  }
  expect(vus.size).toBeGreaterThanOrEqual(2);
  expect(erreurs).toEqual([]);
});

test("mouvement réduit : pas de transition sur les pastilles, le temps avance", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  await expect(page.locator("[data-bande-temps] [data-temps]").first()).toHaveCSS("animation-name", "none");
  await marcheBtn(page).click();
  const vus = new Set<string | null>();
  for (let i = 0; i < 8; i++) {
    vus.add(await tempsActif(page).catch(() => null));
    await page.waitForTimeout(200);
  }
  expect(vus.size).toBeGreaterThanOrEqual(2);
});

/** Le menu du tempo : « Tempo » (♩ de la barre) à partir de md ; au téléphone, ses lignes sont dans Outils. */
const ouvrirTempo = (page: Page) => (page.viewportSize()!.width < 768 ? ouvrirOutils(page) : ouvrirMenu(page, "tempo"));

test("tempo réglé par chant : gardé après rechargement, « Tempo du fichier » l'efface", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous");
  const options = await ouvrirReglages(page);
  // Au téléphone, Options porte aussi Outils en tête, donc les lignes du tempo.
  if (page.viewportSize()!.width >= 768) await expect(options.locator("[data-tempo-valeur]")).toHaveCount(0);
  await options.locator("[data-metronome]").click();
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  let reglages = await ouvrirTempo(page);
  const valeur = reglages.locator("[data-tempo-valeur]");
  await expect(valeur).toHaveText(/♩\s*94/);
  await expect(reglages.locator("[data-tempo-fichier]")).toHaveCount(0);
  await reglages.locator("[data-tempo-plus]").click();
  await reglages.locator("[data-tempo-plus]").click();
  await expect(valeur).toHaveText(/♩\s*96/);
  await expect(reglages.locator("[data-tempo-fichier]")).toHaveCount(1);

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  reglages = await ouvrirTempo(page);
  await expect(reglages.locator("[data-tempo-valeur]")).toHaveText(/♩\s*96/);
  await reglages.locator("[data-tempo-fichier]").click();
  await expect(reglages.locator("[data-tempo-valeur]")).toHaveText(/♩\s*94/);
  await expect(reglages.locator("[data-tempo-fichier]")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("perf-tempo-avec-nous"))).toBeNull();
  expect(erreurs).toEqual([]);
});

// Lot L5 : annotations stables. Taille du texte mémorisée par compte, par setlist et par chant (`perf-annot-scale-<uid>-<setlist>-<slug>`),
// figée en annotation ; bannière « Revenir à cette taille » quand on lit à une autre taille.
// Les traits sont dessinés à la souris sur le canevas ; le Firestore est simulé (`db.writes`).

const CLE_TAILLE = `perf-annot-scale-${MUSICIEN.uid}-${SETLIST_ID}-abba-pere`;
const calqueLecture = (page: Page) => page.locator("[data-performance-mode] > canvas");
// MP-5 : le Crayon écrit des traits accrochés au texte dans ma partition (`partitions/`), plus dans `annotations/`.
const ecritesAnnot = (db: { writes: { path: string }[] }) => db.writes.filter((w) => w.path.startsWith("partitions/"));
/** La bannière « autre taille » ne vient plus que des anciennes annotations (lecture seule) : on pose à la main la taille qu'elles avaient. */
const poserTailleAnnotee = (page: Page) => page.evaluate((c) => localStorage.setItem(c, "1"), CLE_TAILLE);

async function ouvrirL5(page: Page) {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  return { db, erreurs };
}

/** Ouvre le Crayon, trace un trait à la souris au centre, attend l'enregistrement, ressort. */
async function tracerTrait(page: Page, db: { writes: { path: string }[] }) {
  await basculerAnnoter(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  const ecran = page.viewportSize()!;
  const x = ecran.width * 0.4;
  const y = ecran.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 15, { steps: 4 });
  await page.mouse.move(x + 90, y + 30, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => ecritesAnnot(db).length).toBeGreaterThan(0);
  await basculerAnnoter(page);
  await expect(calqueLecture(page)).toHaveCount(1);
}

async function changerTaille(page: Page, bouton: "Agrandir le texte" | "Réduire le texte", fois = 1) {
  const reglages = await ouvrirReglages(page);
  for (let i = 0; i < fois; i++) await reglages.getByRole("button", { name: bouton }).click();
  const pct = (await reglages.getByText(/^\d+%$/).textContent())!;
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  return pct;
}

const pourcentage = async (page: Page) => {
  const reglages = await ouvrirReglages(page);
  const pct = (await reglages.getByText(/^\d+%$/).textContent())!;
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  return pct;
};

test("forScore, L5 : trait tracé, taille changée : le trait suit le texte, sans bannière (MP-5) ; la bannière ne vient que d'une ancienne annotation", async ({ page }) => {
  const { db, erreurs } = await ouvrirL5(page);
  await tracerTrait(page, db);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE), "un trait accroché au texte ne mémorise pas de taille").toBeNull();
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);

  // autre taille : le trait est toujours lu (il suit le texte), aucune bannière
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  await expect(calqueLecture(page)).toHaveCount(1);
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);

  // une ancienne annotation (taille mémorisée à 100 %) : la bannière prévient, « Revenir à cette taille » la retire
  await poserTailleAnnotee(page);
  expect(await changerTaille(page, "Réduire le texte")).toBe("100%");
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  const bandeau = page.locator("[data-alerte-annotations]");
  await expect(bandeau).toBeVisible();
  // La bannière (z 6) est sous la barre haute (z 20) : on masque la barre pour la toucher.
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  await expect(bandeau).toContainText("Des annotations existent à une autre taille (100");
  await expect(bandeau).toHaveCSS("pointer-events", "none");
  const bouton = bandeau.getByRole("button", { name: "Revenir à cette taille" });
  expect((await bouton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const numeroPage = async () => (await lirePage(page)).split("/")[0].trim();
  const p = await numeroPage();
  await bouton.click();
  await expect(bandeau).toHaveCount(0);
  // la page n'a pas tourné sous le toucher du bouton
  expect(await numeroPage()).toBe(p);
  expect(await pourcentage(page)).toBe("100%");
  expect(erreurs).toEqual([]);
});

test("forScore, L5 : au Crayon la taille du texte ne se règle pas, et rouvrir le Crayon rend la taille mémorisée (ancienne annotation)", async ({ page }) => {
  const { erreurs } = await ouvrirL5(page);
  await poserTailleAnnotee(page);
  expect(await changerTaille(page, "Agrandir le texte", 2)).toBe("120%");

  await basculerAnnoter(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  // AN-3a : la barre d'annotation remplace la barre de titre, Options d'affichage (A− / A+) n'est plus offert en Crayon.
  await expect(page.locator("[data-performance-mode]").getByRole("button", { name: "Options d'affichage" })).toHaveCount(0);
  await basculerAnnoter(page);
  const reglages = await ouvrirReglages(page);
  await expect(reglages.getByText(/^\d+%$/)).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  expect(erreurs).toEqual([]);
});

test("L5 : un trait relu après rechargement (sans taille mémorisée sur l'appareil) se lit, sans bannière", async ({ page }) => {
  // Le trait est posé dans ma partition : relu au rechargement, sans taille mémorisée.
  const { db } = await ouvrirL5(page);
  await tracerTrait(page, db);

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);
});

// Lot L6 : aperçu de la page suivante (tablette en portrait seulement), retiré le 13/11/2026 (go de Timothée,
// « Oui retire ») : les tests vérifient son absence, et que la page reprend la hauteur de la bande.
// `chants: 4` répète Abba Père : plusieurs pages, et des pages suivantes qui ouvrent un autre chant.

const APERCU = "[data-apercu-suivant]";
const BLOCS = "[data-section], [data-entete-chant]";
const blocsPage = (page: Page) => page.locator(`[data-performance-mode] :is(${BLOCS}):not([aria-hidden=true] *)`);

const nombrePages = async (page: Page) => Number((await lirePage(page)).split("/")[1]);
async function allerPremierePage(page: Page) {
  for (let i = 0; i < 40 && (await numero(page)) > 1; i++) {
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(60);
  }
  expect(await numero(page)).toBe(1);
}
async function pageSuivante(page: Page) {
  const n = await numero(page);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => numero(page)).toBe(n + 1);
}

test("forScore, tablette portrait : plus d'aperçu de la page suivante, ni à la page 1, ni après un tour et un retour", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "propre à la tablette en portrait (l'aperçu n'existait que là)");
  const erreurs = surveillerErreurs(page);
  await ouvrir(page, { chants: 4 });
  await attendreCompteur(page, /^1 \/ \d+$/);
  expect(await nombrePages(page)).toBeGreaterThan(2);
  const apercu = page.locator(`[data-performance-mode] ${APERCU}`);
  await expect(apercu).toHaveCount(0);
  await pageSuivante(page);
  await expect(apercu).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => numero(page)).toBe(1);
  await expect(apercu).toHaveCount(0);

  // Pas de défilement horizontal, pas d'erreur.
  const debord = await page.evaluate(() => {
    const racine = document.querySelector("[data-performance-mode]") as HTMLElement;
    return { page: document.documentElement.scrollWidth - window.innerWidth, racine: racine.scrollWidth - racine.clientWidth };
  });
  expect(debord.page).toBeLessThanOrEqual(0);
  expect(debord.racine).toBeLessThanOrEqual(0);
  expect(erreurs).toEqual([]);
});

for (const taille of [100, 120]) {
  test(`forScore, tablette portrait, texte à ${taille} % : aucun aperçu, rien n'est rogné`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette", "propre à la tablette en portrait");
    test.setTimeout(120_000);
    await ouvrir(page, { chants: 4 });
    await attendreCompteur(page, /^1 \/ \d+$/);
    if (taille === 120) {
      expect(await changerTaille(page, "Agrandir le texte", 2)).toBe("120%");
      await attendreMiseEnPage(page);
      await allerPremierePage(page);
    }
    const apercu = page.locator(`[data-performance-mode] ${APERCU}`);
    const total = await nombrePages(page);
    expect(total).toBeGreaterThan(2);
    for (let p = 1; p <= total; p++) {
      expect(await numero(page)).toBe(p);
      const dernier = blocsPage(page).last();
      await expect(dernier).toBeVisible();
      await expect(apercu).toHaveCount(0);
      await expect(dernier).toBeInViewport({ ratio: 1 });
      if (p < total) await pageSuivante(page);
    }
  });
}

test("forScore, tablette portrait : sur la dernière page d'un chant, « Ensuite » seul, sans aperçu dessous", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "l'aperçu n'existait qu'en tablette portrait");
  await ouvrirDernierePage(page);
  const suivant = onStage(page, "[data-suivant]");
  await expect(async () => {
    if (await suivant.count()) return;
    await page.keyboard.press("ArrowRight");
    await expect(suivant).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(onStage(page, "[data-apercu-suivant]")).toHaveCount(0);
});

test("forScore : aucun aperçu, sur aucun appareil", async ({ page }) => {
  await ouvrir(page, { chants: 4 });
  await attendreCompteur(page, /^1 \/ ([2-9]|\d\d+)$/);
  await expect(page.locator(APERCU)).toHaveCount(0);
});

// Lot L7 : curseur de page sur toute la setlist, repères au début de chaque chant.

const TROIS_CHANTS = ["abba-pere", "a-l-agneau", "avec-nous"];
const CURSEUR = "[data-performance-mode] [data-curseur-page] input[type=range]";
const REPERES = "[data-performance-mode] [data-repere-chant]";

async function ouvrirTroisChants(page: Page, slugs = TROIS_CHANTS) {
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
  });
  const doc = {
    ...setlist,
    items: slugs.map((songSlug, i) => ({ ...setlist.items[0], songSlug, position: i + 1 })),
  };
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: doc }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  // La rangée de points est tout en bas (FS-A) : la pastille de développement de Next la recouvre à gauche.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/** Rappelle la barre (geste au centre) si elle est masquée. */
async function barreVisible(page: Page) {
  const curseur = page.locator(CURSEUR);
  await expect(async () => {
    if (!(await curseur.isVisible())) await toucherCentre(page);
    await expect(curseur).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

const titreBarreHaute = (page: Page) => page.locator("[data-performance-mode] [data-barre-haut]").locator("p").first();

test("forScore, L7 : le curseur couvre toute la setlist, 3 repères = débuts de chant, un clic amène au 1er page du chant", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirTroisChants(page);
  const total = Number((await lirePage(page)).split("/")[1]);
  expect(total).toBeGreaterThanOrEqual(3);
  const curseur = page.locator(CURSEUR);
  await expect(curseur).toBeVisible();
  await expect(page.locator("[data-performance-mode]").getByRole("slider", { name: "Aller à la page" })).toHaveCount(1);
  await expect(curseur).toHaveAttribute("max", String(total - 1));
  await expect(curseur).toHaveAttribute("min", "0");
  await expect(curseur).toHaveAttribute("aria-valuetext", `Page 1 sur ${total}`);

  const reperes = page.locator(REPERES);
  await expect(reperes).toHaveCount(3);
  const debuts = await reperes.evaluateAll((els) => els.map((e) => ({ page: Number(e.getAttribute("data-page")), titre: e.getAttribute("data-titre")! })));
  expect(debuts[0].page).toBe(0);
  expect(debuts[1].page).toBeGreaterThan(debuts[0].page);
  expect(debuts[2].page).toBeGreaterThan(debuts[1].page);
  expect(debuts[2].page).toBeLessThanOrEqual(total - 1);

  // On visite les repères du dernier au premier : chaque clic amène au 1er page du chant, titre en barre haute.
  for (const i of [2, 1, 0]) {
    await barreVisible(page);
    await reperes.nth(i).click({ force: true }); // le repère ne capte aucun pointeur : le clic est reçu par la rangée
    await expect.poll(() => numero(page)).toBe(debuts[i].page + 1);
    await expect(curseur).toHaveValue(String(debuts[i].page));
    await expect(titreBarreHaute(page)).toHaveText(debuts[i].titre);
  }
  expect(erreurs).toEqual([]);
});

test("forScore, FS-A : plus d'étiquette « page n / N » ni de flèches ‹ › ; le curseur et le titre suivent un saut de page (dimanche-24)", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirTroisChants(page);
  const total = Number((await lirePage(page)).split("/")[1]);
  await barreVisible(page);
  const curseur = page.locator(CURSEUR);
  await expect(page.locator("[data-performance-mode] [data-curseur-etiquette]")).toHaveCount(0);
  await expect(page.locator("[data-performance-mode]").getByRole("button", { name: "Page précédente" })).toHaveCount(0);
  await expect(page.locator("[data-performance-mode]").getByRole("button", { name: "Page suivante" })).toHaveCount(0);
  const reperes = page.locator(REPERES);
  const debuts = await reperes.evaluateAll((els) => els.map((e) => ({ page: Number(e.getAttribute("data-page")), titre: e.getAttribute("data-titre")! })));
  await expect(titreBarreHaute(page)).toHaveText(debuts[0].titre);
  await expect(curseur).toHaveAttribute("aria-valuetext", `Page 1 sur ${total}`);
  // Saut au dernier chant : le titre, la valeur et son texte suivent.
  await reperes.nth(2).click({ force: true });
  await expect(titreBarreHaute(page)).toHaveText(debuts[2].titre);
  await expect(curseur).toHaveValue(String(debuts[2].page));
  await expect(curseur).toHaveAttribute("aria-valuetext", `Page ${debuts[2].page + 1} sur ${total}`);
  // Le titre tronqué ne pousse pas la barre hors de l'écran.
  const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(debord).toBeLessThanOrEqual(0);
  // Le curseur couvre la navigation des anciennes flèches : un cran en arrière puis en avant (clavier).
  await curseur.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => numero(page)).toBe(debuts[2].page);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => numero(page)).toBe(debuts[2].page + 1);
  // Au premier chant, Début ramène à la page 1 (l'ancien « ‹ » désactivé).
  await page.keyboard.press("Home");
  await expect.poll(() => numero(page)).toBe(1);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => numero(page)).toBe(1);
  expect(erreurs).toEqual([]);
});

test("forScore : barres du mode louange opaques (fond d'alpha 1, sans flou), dimanche-1", async ({ page }) => {
  await ouvrir(page);
  await expect(async () => {
    if ((await page.locator(BARRES).first().evaluate((el) => getComputedStyle(el).pointerEvents)) === "none") await toucherCentre(page);
    await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  const barres = page.locator(BARRES);
  for (const i of [0, 1]) {
    const m = await barres.nth(i).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { fond: cs.backgroundColor, flou: cs.backdropFilter };
    });
    // Alpha exactement 1 : « rgb(r, g, b) », sans quatrième composante (rgba, color() ou oklch avec « / a »).
    expect(m.fond).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(m.flou === "none" || m.flou === "").toBe(true);
  }
});

test("forScore, tablette portrait : aucun aperçu, barre affichée comme escamotée (dimanche-10)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "propre à la tablette en portrait");
  await ouvrir(page, { chants: 4 });
  await attendreCompteur(page, /^1 \/ \d+$/);
  const apercu = page.locator(`[data-performance-mode] ${APERCU}`);
  // Première ouverture sur l'appareil : la barre est affichée.
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await expect(apercu).toHaveCount(0);
  // Escamotée (état normal en service) : toujours rien au bas de la page.
  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  await expect(apercu).toHaveCount(0);
});

test("forScore, L7 : le curseur au clavier (Fin, Début, flèche) change de page et le compteur suit", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirTroisChants(page);
  const total = Number((await lirePage(page)).split("/")[1]);
  const curseur = page.locator(CURSEUR);
  await barreVisible(page);
  await curseur.focus();
  await page.keyboard.press("End");
  await expect.poll(() => numero(page)).toBe(total);
  await page.keyboard.press("Home");
  await expect.poll(() => numero(page)).toBe(1);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => numero(page)).toBe(2);
  await expect(curseur).toHaveAttribute("aria-valuetext", `Page 2 sur ${total}`);
  await page.keyboard.press("PageDown");
  await expect.poll(() => numero(page)).toBe(3);
  expect(erreurs).toEqual([]);
});

test("forScore, L7 : la barre basse tient dans l'écran, fine, sans défilement horizontal", async ({ page }) => {
  await ouvrirTroisChants(page);
  await barreVisible(page);
  const hauteurAvec = await page.evaluate(() => (document.querySelector("[data-performance-mode] [data-barre-bas]") as HTMLElement).offsetHeight);
  const m = await page.evaluate(() => {
    const barre = document.querySelector("[data-performance-mode] [data-barre-bas]") as HTMLElement;
    const r = barre.getBoundingClientRect();
    const racine = document.querySelector("[data-performance-mode]") as HTMLElement;
    return {
      bas: r.bottom, gauche: r.left, droite: r.right, h: window.innerHeight, w: window.innerWidth,
      debordPage: document.documentElement.scrollWidth - window.innerWidth,
      debordRacine: racine.scrollWidth - racine.clientWidth,
      debordBarre: barre.scrollWidth - barre.clientWidth,
      piste: (document.querySelector("[data-curseur-page] input") as HTMLElement).getBoundingClientRect().height,
    };
  });
  expect(m.bas).toBeLessThanOrEqual(m.h + 0.5);
  expect(m.gauche).toBeGreaterThanOrEqual(-0.5);
  expect(m.droite).toBeLessThanOrEqual(m.w + 0.5);
  expect(m.debordPage).toBeLessThanOrEqual(0);
  expect(m.debordRacine).toBeLessThanOrEqual(0);
  expect(m.debordBarre).toBeLessThanOrEqual(0);
  expect(m.piste).toBeGreaterThanOrEqual(44);
  expect(hauteurAvec).toBeLessThan(150);
});

test("forScore, L7 : la ligne du curseur pèse au plus 44 px de mise en page (une cible tactile, plus d'étiquette dessous)", async ({ page }) => {
  await ouvrirTroisChants(page);
  await barreVisible(page);
  const avec = await page.evaluate(() => (document.querySelector("[data-performance-mode] [data-barre-bas]") as HTMLElement).offsetHeight);
  const ligne = await page.evaluate(() => {
    const c = document.querySelector("[data-curseur-page]") as HTMLElement;
    const cs = getComputedStyle(c);
    return c.offsetHeight + parseFloat(cs.marginBottom);
  });
  expect(ligne).toBeLessThanOrEqual(44);
  expect(avec).toBeGreaterThan(0);
});

test("forScore, L7 : une seule page, pas de curseur", async ({ page }) => {
  // Un chant court (13 lignes) tient sur une page.
  await ouvrirTroisChants(page, ["benediction"]);
  const total = Number((await lirePage(page)).split("/")[1]);
  test.skip(total !== 1, "ce chant n'est pas sur une seule page à cette taille d'écran");
  await expect(page.locator("[data-curseur-page]")).toHaveCount(0);
});

test("forScore, L7 : un clic sur la piste va à la page visée, sans décalage de la racine", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirTroisChants(page);
  const total = Number((await lirePage(page)).split("/")[1]);
  const curseur = page.locator(CURSEUR);
  await barreVisible(page);
  const b = (await curseur.boundingBox())!;
  // Au milieu de la piste (hors repères, qui sont en haut de la ligne).
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2 + 4);
  const cible = Number(await curseur.inputValue());
  expect(cible).toBeGreaterThan(0);
  expect(Math.abs(cible - (total - 1) / 2)).toBeLessThanOrEqual(1.5);
  await expect.poll(() => numero(page)).toBe(cible + 1);
  await page.waitForTimeout(400);
  expect(await numero(page)).toBe(cible + 1);
  expect(erreurs).toEqual([]);
});

test("forScore, L7 : glisser le curseur montre le titre du chant visé en bulle", async ({ page }) => {
  await ouvrirTroisChants(page);
  const curseur = page.locator(CURSEUR);
  await barreVisible(page);
  const b = (await curseur.boundingBox())!;
  const y = b.y + b.height / 2 + 4;
  await page.mouse.move(b.x + 12, y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 12, y, { steps: 8 });
  const bulle = page.locator("[data-performance-mode] [data-bulle-curseur]");
  await expect(bulle).toBeVisible();
  await expect(bulle).toHaveAttribute("aria-hidden", "true");
  await expect(bulle.locator("[data-bulle-titre]")).toHaveText("Avec nous (Emmanuel)");
  await expect(bulle.locator("[data-bulle-page]")).toHaveText(/^page \d+$/);
  await page.mouse.up();
  await expect(bulle).toHaveCount(0);
});

// Correctifs de l'audit du 27/10/2026 : clavier, barre masquée, taille annotée par setlist,
// pastille et bannière sous la barre ouverte, liseré, feuilles, souris.

test("forScore, clavier : Réglages ouverts, Espace et flèche droite ne tournent pas la page", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page, { chants: 4 });
  const avant = await numero(page);
  const reglages = await ouvrirReglages(page);
  await reglages.locator("[data-metronome]").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(300);
  // Espace bascule le métronome : la bande fait descendre la page, le total de pages change ; le numéro, non.
  expect(await numero(page)).toBe(avant);
  // Échap referme la feuille, puis les flèches tournent de nouveau la page.
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => numero(page)).toBe(2);
  expect(erreurs).toEqual([]);
});

test("forScore, barre masquée : aucun bouton de la barre n'est focalisable ; ouverte, « Quitter » l'est", async ({ page }) => {
  await ouvrir(page);
  const quitter = page.getByRole("button", { name: "Quitter" });
  await quitter.focus();
  await expect(quitter).toBeFocused();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate((sel) => {
      const el = document.activeElement;
      return !!el && [...document.querySelectorAll(sel)].some((b) => b.contains(el));
    }, BARRES)).toBe(false);
  }
  await expect(page.locator("[data-performance-mode] [inert]")).toHaveCount(1);

  await toucherCentre(page);
  await expect(page.locator("[data-performance-mode] [inert]")).toHaveCount(0);
  await quitter.focus();
  await expect(quitter).toBeFocused();
});

test("forScore, L5 : la taille annotée est propre à la setlist (pas de bannière dans une autre setlist)", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  const AUTRE = "setlist-autre";
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: setlist,
    [`setlists/${AUTRE}`]: { ...setlist, title: "Autre culte" },
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await poserTailleAnnotee(page);
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  await expect(page.locator("[data-alerte-annotations]")).toBeVisible();

  await page.goto(`/setlists/${AUTRE}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  expect(await pourcentage(page)).toBe("110%");
  await page.waitForTimeout(500);
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);
  expect(await page.evaluate((c) => localStorage.getItem(c), `perf-annot-scale-${MUSICIEN.uid}-${AUTRE}-abba-pere`)).toBeNull();
  expect(erreurs).toEqual([]);
});

test("forScore, L5 : l'ancienne clé sans compte sert de taille de départ au premier compte, pas à un autre", async ({ page }) => {
  // Taille annotée avant les comptes : 130 %, lue à 100 % -> la bannière prévient ; l'ancienne clé n'est pas réécrite.
  await page.addInitScript((c) => { if (!localStorage.getItem("perf-role-migre")) localStorage.setItem(c, "1.3"); }, `perf-annot-scale-${SETLIST_ID}-abba-pere`);
  await ouvrirL5(page);
  await expect(page.locator("[data-alerte-annotations]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("perf-role-migre"))).toBe(MUSICIEN.uid);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE)).toBeNull();
});

test("forScore, L5 : en annulant le dernier trait, ma partition est réécrite sans trait ; la taille mémorisée (ancienne annotation) reste", async ({ page }) => {
  const { db, erreurs } = await ouvrirL5(page);
  await poserTailleAnnotee(page);
  await basculerAnnoter(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  const ecran = page.viewportSize()!;
  const x = ecran.width * 0.4;
  const y = ecran.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 15, { steps: 4 });
  await page.mouse.move(x + 90, y + 30, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => ecritesAnnot(db).length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  // Plus aucun trait : on attend l'écriture de la partition sans trait avant de regarder la clé.
  await expect.poll(() => ecritesAnnot(db).length).toBeGreaterThan(1);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE)).toBe("1");
  // Sortie du Crayon, puis autre taille : la bannière apparaît ; « Revenir à cette taille » la retire.
  await basculerAnnoter(page);
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  const bandeau = page.locator("[data-alerte-annotations]");
  await expect(bandeau).toBeVisible();
  await bandeau.getByRole("button", { name: "Revenir à cette taille" }).click();
  await expect(bandeau).toHaveCount(0);
  expect(await pourcentage(page)).toBe("100%");
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE)).toBe("1");
  expect(erreurs).toEqual([]);
});

// Barre du mode : visible à la toute première ouverture sur l'appareil (drapeau `perf-barre-vue`), masquée ensuite.

async function rouvrirApresRechargement(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

test("barre : toute première ouverture sur un appareil vierge, la barre est visible", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page);
  const barre = page.locator(BARRES).first();
  await expect(barre).not.toHaveCSS("pointer-events", "none");
  await expect(page.locator("[data-performance-mode] [inert]")).toHaveCount(0);
  await expect(barre.locator("xpath=..")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("perf-barre-vue"))).toBe("1");
  expect(erreurs).toEqual([]);
});

test("barre : après rechargement et réouverture, masquée (aria-hidden, inert) ; un toucher au centre la montre", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page);
  await rouvrirApresRechargement(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  await expect(page.locator("[data-performance-mode] [inert][aria-hidden='true']")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  await toucherCentre(page);
  await expect(page.locator("[data-performance-mode] [inert]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeVisible();
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  expect(erreurs).toEqual([]);
});

test("barre : fermer le mode puis le rouvrir sans recharger la page, elle reste masquée", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page);
  await page.getByRole("button", { name: "Quitter" }).click();
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  await expect(page.locator("[data-performance-mode] [inert][aria-hidden='true']")).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

test("barre masquée à l'ouverture : la pastille « Ensuite » est dans le flux, sous le dernier bloc ; barre ouverte, elle reste au-dessus de la barre", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirDernierePage(page);
  await rouvrirApresRechargement(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  const suivant = onStage(page, "[data-suivant]");
  await expect(async () => {
    if (await suivant.count()) return;
    await page.keyboard.press("ArrowRight");
    await expect(suivant).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  const hauteurEcran = page.viewportSize()!.height;
  const bas = (await suivant.boundingBox())!;
  expect(bas.y + bas.height).toBeLessThanOrEqual(hauteurEcran + 0.5);
  // Dans le flux (dimanche-11) : aucun bloc de la page ne passe sous la pastille.
  const intersections = await page.evaluate(() => {
    const p = document.querySelector("[data-performance-mode] [data-suivant]:not([aria-hidden=true] *)")!.getBoundingClientRect();
    return [...document.querySelectorAll("[data-performance-mode] [data-section]")]
      .filter((el) => !el.closest("[aria-hidden=true]"))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.left < p.right && r.right > p.left && r.top < p.bottom - 0.5 && r.bottom > p.top + 0.5).length;
  });
  expect(intersections).toBe(0);
  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  const barreBasse = (await page.locator(BARRES).nth(1).boundingBox())!;
  // Barre ouverte : la pastille reste visible au-dessus de la barre du bas — dans le flux si la barre ne la
  // couvre pas (elle ne bouge pas), sinon posée au-dessus de la barre, comme avant dimanche-11.
  await expect(suivant).toHaveCount(1);
  const apres = (await suivant.boundingBox())!;
  if (bas.y + bas.height <= barreBasse.y + 0.5) expect(Math.abs(apres.y - bas.y)).toBeLessThan(1);
  expect(apres.y + apres.height).toBeLessThanOrEqual(barreBasse.y + 0.5);
  expect(erreurs).toEqual([]);
});

test("barre masquée à l'ouverture : la bande du métronome se pose sous la zone de sécurité, sous la barre une fois ouverte", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  await rouvrirApresRechargement(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  const liseret = page.locator("[data-bande-temps]");
  await expect(liseret).toHaveCount(1);
  const haute = (await page.locator(BARRES).first().boundingBox())!;
  await expect.poll(async () => (await liseret.boundingBox())!.y).toBeLessThan(haute.y + haute.height - 1);
  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await expect.poll(async () => (await liseret.boundingBox())!.y).toBeGreaterThanOrEqual(haute.y + haute.height - 1);
  expect(erreurs).toEqual([]);
});

test("barre masquée à l'ouverture : la bannière « autre taille » est en haut de l'écran et touchable", async ({ page }) => {
  const { erreurs } = await ouvrirL5(page);
  await poserTailleAnnotee(page);
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  await rouvrirApresRechargement(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  const bandeau = page.locator("[data-alerte-annotations]");
  await expect(bandeau).toBeVisible();
  const haute = (await page.locator(BARRES).first().boundingBox())!;
  const bouton = bandeau.getByRole("button", { name: "Revenir à cette taille" });
  // Barre masquée : la bannière remonte dans la bande de la barre, sans attendre qu'on l'ouvre.
  expect((await bouton.boundingBox())!.y).toBeLessThan(haute.y + haute.height - 0.5);
  await bouton.click();
  await expect(bandeau).toHaveCount(0);
  expect(await pourcentage(page)).toBe("100%");
  expect(erreurs).toEqual([]);
});

test("barre : stockage perf-* qui lève, le mode s'ouvre sans erreur et la barre est visible", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const lever = () => { throw new Error("stockage indisponible"); };
    Storage.prototype.getItem = function (k: string) { return k.startsWith("perf-") ? lever() : getItem.call(this, k); };
    Storage.prototype.setItem = function (k: string, v: string) { return k.startsWith("perf-") ? lever() : setItem.call(this, k, v); };
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("barre : la sortie du mode annotation la laisse visible, et la réouverture suivante ne la montre pas", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page);
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  await toucherCentre(page);
  await basculerAnnoter(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await basculerAnnoter(page);
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeVisible();
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Quitter" }).click();
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  await expect(page.locator("[data-performance-mode] [inert][aria-hidden='true']")).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

test("forScore : barre ouverte, la pastille « Ensuite » reste visible et touchable", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirDernierePage(page);
  const suivant = onStage(page, "[data-suivant]");
  await expect(async () => {
    if (await suivant.count()) return;
    await page.keyboard.press("ArrowRight");
    await expect(suivant).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  await expect(suivant).toBeVisible();
  const haut = (await suivant.boundingBox())!;
  const bas = (await page.locator(BARRES).nth(1).boundingBox())!;
  expect(haut.y + haut.height).toBeLessThanOrEqual(bas.y + 0.5);
  const avant = await numero(page);
  await suivant.click();
  await expect.poll(() => numero(page)).toBe(avant + 1);
  await page.waitForTimeout(500);
  expect(await numero(page)).toBe(avant + 1);
  expect(erreurs).toEqual([]);
});

test("forScore, L5 : barre ouverte, la bannière « autre taille » reste touchable", async ({ page }) => {
  const { erreurs } = await ouvrirL5(page);
  await poserTailleAnnotee(page);
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  const bandeau = page.locator("[data-alerte-annotations]");
  await expect(bandeau).toBeVisible();
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  const haute = (await page.locator(BARRES).first().boundingBox())!;
  const bouton = bandeau.getByRole("button", { name: "Revenir à cette taille" });
  expect((await bouton.boundingBox())!.y).toBeGreaterThanOrEqual(haute.y + haute.height - 0.5);
  await bouton.click();
  await expect(bandeau).toHaveCount(0);
  expect(await pourcentage(page)).toBe("100%");
  expect(erreurs).toEqual([]);
});

test("forScore, L4 : barre ouverte, la bande du métronome est visible sous la barre haute", async ({ page }) => {
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  const liseret = page.locator("[data-bande-temps]");
  await expect(liseret).toHaveCount(1);
  await expect(page.locator(BARRES).first()).not.toHaveCSS("pointer-events", "none");
  const haute = (await page.locator(BARRES).first().boundingBox())!;
  const l = (await liseret.boundingBox())!;
  expect(l.y).toBeGreaterThanOrEqual(haute.y + haute.height - 1);
  // Barre masquée : il remonte sous la zone de sécurité.
  await toucherCentre(page);
  await expect(page.locator(BARRES).first()).toHaveCSS("pointer-events", "none");
  await expect.poll(async () => (await liseret.boundingBox())!.y).toBeLessThan(haute.y + haute.height - 1);
});

test("forScore : Échap quitte le mode quand le curseur de page a le focus", async ({ page }) => {
  await ouvrirTroisChants(page);
  await barreVisible(page);
  await page.locator(CURSEUR).focus();
  await expect(page.locator(CURSEUR)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
});

test("forScore : un toucher sur le fond sombre d'une feuille ne tourne pas la page", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrir(page, { chants: 4 });
  const avant = await lirePage(page);
  const reglages = await ouvrirReglages(page);
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width - 12, 12);
  await expect(reglages).toBeHidden();
  await page.waitForTimeout(400);
  expect(await lirePage(page)).toBe(avant);
  expect(erreurs).toEqual([]);
});

test.describe("tempo du fichier aberrant", () => {
  test.use({ serviceWorkers: "block" });
  test("{tempo: 600} est ramené aux bornes : la bande bat à 240, pas à 10 Hz", async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await page.route("**/api/song/avec-nous", async (route) => {
      const rep = await route.fetch();
      const corps = (await rep.text()).replace("{tempo: 94}", "{tempo: 600}");
      await route.fulfill({ response: rep, body: corps });
    });
    await ouvrirChantL4(page, "avec-nous", { metronome: true });
    await expect(page.locator("[data-bande-temps]")).toHaveCount(1);
    await expect.poll(() =>
      page.locator("[data-bande-temps]").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--duree-temps")),
    ).toBe("250ms");
    expect(erreurs).toEqual([]);
  });
});

test("forScore : un clic droit au bord droit ne tourne pas la page", async ({ page }) => {
  await ouvrirMasquee(page);
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width - 20, ecran.height / 2, { button: "right" });
  await page.waitForTimeout(400);
  expect(await numero(page)).toBe(1);
  await page.mouse.click(ecran.width - 20, ecran.height / 2);
  await expect.poll(() => numero(page)).toBe(2);
});

// DP-E, B1 : la pastille des Repères ouvre sa bulle ; le toucher ne tourne pas la page et n'ouvre pas la barre.
test("forScore, Repères : toucher la pastille d'une section ouvre sa bulle, sans tourner la page ni rappeler la barre", async ({ page }) => {
  // L'indice de rappel (première fois par appareil) se pose sur la pastille en paysage : déjà vu ici.
  await page.addInitScript(() => {
    localStorage.setItem("disposition", "reperes");
    localStorage.setItem("perf-astuce-rappel-joue", "1");
    localStorage.setItem("perf-astuce-rappel-unique", "1");
  });
  await ouvrir(page, { chants: 4 });
  await toucherCentre(page); // barre masquée
  await expect(page.getByRole("button", { name: "Options d'affichage" })).toBeHidden();
  const ecran = page.viewportSize()!;
  // Une page plus loin : un toucher dans la zone de gauche tournerait en arrière.
  const premiere = await lireCompteur(page);
  await page.mouse.click(ecran.width - 20, ecran.height / 2);
  await expect.poll(() => lireCompteur(page)).not.toBe(premiere);
  const avant = await lireCompteur(page);
  const pastille = onStage(page, "[data-repere-pastille]").last();
  await expect(pastille).toBeVisible();
  await pastille.click();
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
  expect(await lireCompteur(page), "la page n'a pas tourné").toBe(avant);
  await expect(page.getByRole("button", { name: "Options d'affichage" }), "la barre ne s'est pas ouverte").toBeHidden();
});
