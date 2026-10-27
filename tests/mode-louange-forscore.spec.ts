import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirReglages } from "./helpers/louange";

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
const compteur = (page: Page) => page.locator("[data-performance-mode] span.tabular-nums:not([data-tempo-barre])").first();

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
  const reglages = page.getByRole("button", { name: "Réglages" });
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
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();

  const avant = (await compteur(page).textContent())!.trim();
  const total = Number(avant.split("/")[1]);
  expect(total).toBeGreaterThan(1);
  const bas = await page.locator(BARRES).nth(1).boundingBox();
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width - 20, bas!.y + bas!.height / 2);
  await expect(compteur(page)).not.toHaveText(avant);
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
  expect(erreurs).toEqual([]);
});

// Lot L2 : zones de toucher et balayage.

function surveillerErreurs(page: Page) {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return erreurs;
}

const lirePage = async (page: Page) => (await compteur(page).textContent())!.trim();
const numero = async (page: Page) => Number((await lirePage(page)).split("/")[0]);

/** Barre masquée, plusieurs pages. */
async function ouvrirMasquee(page: Page) {
  await ouvrir(page, { chants: 4 });
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
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
  const reglages = page.getByRole("button", { name: "Réglages" });
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
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
});

test("forScore, tablette : un toucher à 32 % ouvre la barre sans tourner, à 29 % il tourne", async ({ page }, testInfo) => {
  test.skip(!/^tablette/.test(testInfo.project.name), "propre aux tablettes");
  await ouvrirMasquee(page);
  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);

  await cliquerA(page, 0.32);
  await expect(page.getByRole("button", { name: "Réglages" })).toBeVisible();
  expect(await numero(page)).toBe(2);

  await cliquerA(page, 0.5);
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
  await cliquerA(page, 0.29);
  await expect.poll(() => numero(page)).toBe(1);
});

test("forScore : glissé de 80 px vers la gauche = page suivante, vers la droite = précédente, barre inchangée", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirMasquee(page);
  const reglages = page.getByRole("button", { name: "Réglages" });

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
  await expect(compteur(page)).toHaveText(/^\d+ \/ \d+$/);
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

// Lot L4 : tempo sur toutes les pages, métronome visuel (liseré silencieux).

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

const largeurs = async (page: Page) => {
  const vus: number[] = [];
  for (let i = 0; i < 8; i++) {
    vus.push(await page.locator("[data-liseret-barre]").evaluate((el) => el.getBoundingClientRect().width));
    await page.waitForTimeout(250);
  }
  return vus;
};

test("un chant avec {tempo} affiche ♩ N dans la barre, sur une page texte", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous");
  await expect(page.locator("[data-jianpu-page]:not([aria-hidden=true] *)")).toHaveCount(0);
  await expect(page.locator("[data-tempo-barre]")).toHaveText(/♩\s*94/);
  expect(erreurs).toEqual([]);
});

test("un chant sans tempo n'affiche ni ♩ ni liseré, même métronome actif", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "abba-pere", { metronome: true });
  await expect(page.locator("[data-tempo-barre]")).toHaveCount(0);
  await expect(page.locator("[data-performance-mode] .material-chrome").first()).not.toContainText("♩");
  await expect(page.locator("[data-liseret]")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("métronome inactif par défaut : pas de liseré, même avec un tempo", async ({ page }) => {
  await ouvrirChantL4(page, "avec-nous");
  await expect(page.locator("[data-tempo-barre]")).toHaveCount(1);
  await expect(page.locator("[data-liseret]")).toHaveCount(0);
});

test("métronome actif : le liseré se remplit au fil des pulsations", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  const liseret = page.locator("[data-liseret]");
  await expect(liseret).toHaveCount(1);
  await expect(liseret).toHaveAttribute("aria-hidden", "true");
  await expect(liseret).toHaveCSS("pointer-events", "none");
  await expect(liseret).toHaveCSS("height", "3px");
  const vus = await largeurs(page);
  expect(new Set(vus.map((w) => Math.round(w))).size).toBeGreaterThanOrEqual(2);
  expect(erreurs).toEqual([]);
});

test("mouvement réduit : le liseré ne bouge pas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ouvrirChantL4(page, "avec-nous", { metronome: true });
  await expect(page.locator("[data-liseret]")).toHaveCount(1);
  const vus = await largeurs(page);
  expect(new Set(vus.map((w) => Math.round(w))).size).toBe(1);
});

test("tempo réglé par chant : gardé après rechargement, « Tempo du fichier » l'efface", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await ouvrirChantL4(page, "avec-nous");
  let reglages = await ouvrirReglages(page);
  await expect(reglages.locator("[data-tempo-valeur]")).toHaveCount(0);
  await reglages.locator("[data-metronome-on]").click();
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
  reglages = await ouvrirReglages(page);
  await expect(reglages.locator("[data-tempo-valeur]")).toHaveText(/♩\s*96/);
  await reglages.locator("[data-tempo-fichier]").click();
  await expect(reglages.locator("[data-tempo-valeur]")).toHaveText(/♩\s*94/);
  await expect(reglages.locator("[data-tempo-fichier]")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("perf-tempo-avec-nous"))).toBeNull();
  expect(erreurs).toEqual([]);
});

// Lot L5 : annotations stables. Taille du texte mémorisée par chant (`perf-annot-scale-<slug>`),
// figée en annotation ; bannière « Revenir à cette taille » quand on lit à une autre taille.
// Les traits sont dessinés à la souris sur le canevas ; le Firestore est simulé (`db.writes`).

const CLE_TAILLE = "perf-annot-scale-abba-pere";
const calqueLecture = (page: Page) => page.locator("[data-performance-mode] > canvas");
const ecritesAnnot = (db: { writes: { path: string }[] }) => db.writes.filter((w) => w.path.startsWith("annotations/"));

async function ouvrirL5(page: Page) {
  const erreurs = surveillerErreurs(page);
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  return { db, erreurs };
}

/** Ouvre Annoter, trace un trait à la souris au centre, attend l'enregistrement, ressort. */
async function tracerTrait(page: Page, db: { writes: { path: string }[] }) {
  await page.getByRole("button", { name: "Annoter" }).click();
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
  await page.getByRole("button", { name: "Annoter" }).click();
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

test("forScore, L5 : trait tracé, taille changée puis rétablie : le trait est relu ; bannière et « Revenir à cette taille »", async ({ page }) => {
  const { db, erreurs } = await ouvrirL5(page);
  await tracerTrait(page, db);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE)).toBe("1");
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);

  // (b) autre taille : le trait n'est plus lu, la bannière prévient
  expect(await changerTaille(page, "Agrandir le texte")).toBe("110%");
  await expect(calqueLecture(page)).toHaveCount(0);
  const bandeau = page.locator("[data-alerte-annotations]");
  await expect(bandeau).toBeVisible();
  // La bannière (z 6) est sous la barre haute (z 20) : on masque la barre pour la toucher.
  await toucherCentre(page);
  await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
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

  // (a) la taille d'origine est revenue : le trait est de nouveau lu
  await expect(calqueLecture(page)).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

test("forScore, L5 : en annotation A− / A+ sont désactivés, et rouvrir l'annotation rend la taille mémorisée", async ({ page }) => {
  const { db, erreurs } = await ouvrirL5(page);
  await tracerTrait(page, db);
  expect(await changerTaille(page, "Agrandir le texte", 2)).toBe("120%");

  await page.getByRole("button", { name: "Annoter" }).click();
  await expect(calqueLecture(page)).toHaveCount(1);
  const reglages = await ouvrirReglages(page);
  await expect(reglages.getByRole("button", { name: "Réduire le texte" })).toBeDisabled();
  await expect(reglages.getByRole("button", { name: "Agrandir le texte" })).toBeDisabled();
  await expect(reglages.getByText(/^\d+%$/)).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  expect(erreurs).toEqual([]);
});

test("L5 : un trait ancien (sans taille mémorisée sur l'appareil) se lit encore, sans bannière", async ({ page }) => {
  // Le trait est posé, puis la taille mémorisée est effacée : comme un trait fait avant le lot L5.
  const { db } = await ouvrirL5(page);
  await tracerTrait(page, db);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLE_TAILLE)).toBe("1");

  await page.evaluate((c) => localStorage.removeItem(c), CLE_TAILLE);
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(calqueLecture(page)).toHaveCount(1);
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);
});

// Lot L6 : aperçu de la page suivante (tablette en portrait seulement).
// `chants: 4` répète Abba Père : plusieurs pages, et des pages suivantes qui ouvrent un autre chant.

const APERCU = "[data-apercu-suivant]";
const BLOCS = "[data-section], [data-entete-chant]";
const blocsPage = (page: Page) => page.locator(`[data-performance-mode] :is(${BLOCS}):not([aria-hidden=true] *)`);
const normaliser = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

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
const premierBlocApercu = (page: Page) => page.locator(`[data-performance-mode] ${APERCU} :is(${BLOCS})`).first();
const textePremierBlocPage = async (page: Page) => normaliser(await blocsPage(page).first().textContent());

test("forScore, tablette portrait : l'aperçu montre le début de la page suivante, mis à jour par un tour de page et le retour", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "propre à la tablette en portrait");
  const erreurs = surveillerErreurs(page);
  await ouvrir(page, { chants: 4 });
  await expect(compteur(page)).toHaveText(/^1 \/ \d+$/);
  expect(await nombrePages(page)).toBeGreaterThan(2);
  const apercu = page.locator(`[data-performance-mode] ${APERCU}`);
  await expect(apercu).toBeVisible();
  await expect(apercu).toHaveAttribute("aria-hidden", "true");
  await expect(apercu).toHaveCSS("pointer-events", "none");
  const un = normaliser(await premierBlocApercu(page).textContent());
  expect(un.length).toBeGreaterThan(5);

  await pageSuivante(page);
  // Le tour de page montre ce que l'aperçu annonçait.
  expect(await textePremierBlocPage(page)).toBe(un);
  // Page qui clôt un chant : « Ensuite » prend la bande, sans aperçu dessous ; sinon l'aperçu se met à jour.
  if (await onStage(page, "[data-suivant]").count()) {
    await expect(apercu).toHaveCount(0);
  } else {
    await expect(apercu).toBeVisible();
    expect(normaliser(await premierBlocApercu(page).textContent())).not.toBe(un);
  }

  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => numero(page)).toBe(1);
  expect(normaliser(await premierBlocApercu(page).textContent())).toBe(un);

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
  test(`forScore, tablette portrait, texte à ${taille} % : l'aperçu ne chevauche jamais la dernière ligne, rien n'est rogné, aucun aperçu sur la dernière page`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette", "propre à la tablette en portrait");
    test.setTimeout(120_000);
    await ouvrir(page, { chants: 4 });
    await expect(compteur(page)).toHaveText(/^1 \/ \d+$/);
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
      if (p < total && (await onStage(page, "[data-suivant]").count())) {
        // Dernière page d'un chant : la pastille « Ensuite » occupe la bande, pas d'aperçu.
        await expect(apercu).toHaveCount(0);
        await pageSuivante(page);
      } else if (p < total) {
        await expect(apercu).toBeVisible();
        const haut = (await apercu.boundingBox())!.y;
        const bas = (await dernier.boundingBox())!.y + (await dernier.boundingBox())!.height;
        expect(bas, `page ${p} : dernier bloc sous le haut de l'aperçu`).toBeLessThanOrEqual(haut + 0.5);
        // Le haut de l'aperçu est sous le dernier bloc, et la bande tient dans la fenêtre.
        expect((await apercu.boundingBox())!.y + (await apercu.boundingBox())!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 0.5);
        await pageSuivante(page);
      } else {
        // Dernière page de la setlist : aucun aperçu.
        await expect(apercu).toHaveCount(0);
      }
      await expect(dernier).toBeInViewport({ ratio: 1 });
    }
  });
}

test("forScore, tablette portrait : sur la dernière page d'un chant, « Ensuite » seul, sans aperçu dessous", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "l'aperçu n'existe qu'en tablette portrait");
  await ouvrirDernierePage(page);
  const suivant = onStage(page, "[data-suivant]");
  await expect(async () => {
    if (await suivant.count()) return;
    await page.keyboard.press("ArrowRight");
    await expect(suivant).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(onStage(page, "[data-apercu-suivant]")).toHaveCount(0);
});

test("forScore : aucun aperçu hors tablette en portrait (téléphone, paysage, ordinateur)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "tablette", "la tablette en portrait a l'aperçu");
  await ouvrir(page, { chants: 4 });
  await expect(compteur(page)).toHaveText(/^1 \/ ([2-9]|\d\d+)$/);
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
}

/** Rappelle la barre (geste au centre) si elle est masquée. */
async function barreVisible(page: Page) {
  const curseur = page.locator(CURSEUR);
  await expect(async () => {
    if (!(await curseur.isVisible())) await toucherCentre(page);
    await expect(curseur).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

const titreBarreHaute = (page: Page) => page.locator("[data-performance-mode] .material-chrome").first().locator("p").first();

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
    await reperes.nth(i).click();
    await expect.poll(() => numero(page)).toBe(debuts[i].page + 1);
    await expect(curseur).toHaveValue(String(debuts[i].page));
    await expect(titreBarreHaute(page)).toHaveText(debuts[i].titre);
  }
  expect(erreurs).toEqual([]);
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
  const hauteurAvec = await page.evaluate(() => (document.querySelectorAll("[data-performance-mode] .material-chrome")[1] as HTMLElement).offsetHeight);
  const m = await page.evaluate(() => {
    const barre = document.querySelectorAll("[data-performance-mode] .material-chrome")[1] as HTMLElement;
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

test("forScore, L7 : la ligne du curseur pèse au plus 36 px de mise en page", async ({ page }) => {
  await ouvrirTroisChants(page);
  await barreVisible(page);
  const avec = await page.evaluate(() => (document.querySelectorAll("[data-performance-mode] .material-chrome")[1] as HTMLElement).offsetHeight);
  const ligne = await page.evaluate(() => {
    const c = document.querySelector("[data-curseur-page]") as HTMLElement;
    const cs = getComputedStyle(c);
    return c.offsetHeight + parseFloat(cs.marginBottom);
  });
  expect(ligne).toBeLessThanOrEqual(36);
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
  await expect(bulle).toHaveText("Avec nous (Emmanuel)");
  await page.mouse.up();
  await expect(bulle).toHaveCount(0);
});
