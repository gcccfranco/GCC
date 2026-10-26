import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirReglages } from "./helpers/louange";

// Lot L0 (docs/spec-mode-louange-forscore.md) : réglage « Style de lecture »,
// par appareil. Setlist et compte simulés : aucun accès au Firestore réel.

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

async function ouvrir(page: Page, opts: { style?: "forscore"; chants?: number } = {}) {
  await page.addInitScript((style) => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
    if (style) localStorage.setItem("perf-style-lecture", style);
  }, opts.style);
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

test("appareil vierge : style de lecture Classique", async ({ page }) => {
  await ouvrir(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "classique");
});

test("choisir forScore dans les Réglages : conservé après rechargement", async ({ page }) => {
  await ouvrir(page);
  const reglages = await ouvrirReglages(page);
  await reglages.getByRole("button", { name: "forScore" }).click();
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "forscore");

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "forscore");
});

test("stockage inaccessible : mode ouvert en Classique, sans erreur", async ({ page }) => {
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
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "classique");
  expect(erreurs).toEqual([]);
});

// Lot L1 : barre à la demande (forScore) et bandes invisibles qui ne captent plus.

const BARRES = "[data-performance-mode] .material-chrome";
const compteur = (page: Page) => page.locator("[data-performance-mode] span.tabular-nums").first();

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

for (const style of [undefined, "forscore"] as const) {
  const nom = style ? "forScore" : "Classique";

  test(`${nom} : barre masquée, les bandes haute et basse ne captent plus`, async ({ page }) => {
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
    await ouvrir(page, { style });
    const barreHaute = page.locator(BARRES).first();
    await expect(barreHaute).toBeVisible();
    if (style) {
      await toucherCentre(page);
    } else {
      await page.waitForTimeout(3_500);
    }
    await expect(page.locator("[data-performance-mode] .material-chrome").first()).toHaveCSS("pointer-events", "none");
    await expect(async () => {
      expect(await bandeCapte(page, "haut")).toBe(false);
      expect(await bandeCapte(page, "bas")).toBe(false);
    }).toPass({ timeout: 5_000 });
    expect(erreurs).toEqual([]);
  });
}

test("forScore : la barre visible le reste 5 s ; toucher centre la masque, un autre la remontre pour 5 s", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await ouvrir(page, { style: "forscore" });
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
  await ouvrir(page, { style: "forscore", chants: 4 });
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

/** Style forScore, barre masquée, positionné sur la page 2 (au moins). */
async function ouvrirMasquee(page: Page, style: "forscore" | undefined = "forscore") {
  await ouvrir(page, { style, chants: 4 });
  if (style) {
    await toucherCentre(page);
    await expect(page.getByRole("button", { name: "Réglages" })).toBeHidden();
  }
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

test("Classique : un glissé de 80 px ne tourne pas la page", async ({ page }) => {
  await ouvrirMasquee(page, undefined);
  await cliquerA(page, 0.85);
  await expect.poll(() => numero(page)).toBe(2);

  await glisser(page, -80, 0);
  await glisser(page, 80, 0);
  await page.waitForTimeout(500);
  expect(await numero(page)).toBe(2);
});

// Lot L3 : « Ensuite : titre · tonalité », touchable, sans confirmation.

const itemChant = (songSlug: string, position: number, keyOverride: string | null = null) => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});

/** Setlist de deux chants (Abba Père puis À l'agneau en G) ; se place sur la dernière page du premier. */
async function ouvrirDernierePage(page: Page, style: "forscore" | undefined) {
  await page.addInitScript((st) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    if (st) localStorage.setItem("perf-style-lecture", st);
  }, style);
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: { ...setlist, items: [itemChant("abba-pere", 1), itemChant("a-l-agneau", 2, "G")] },
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(compteur(page)).toHaveText(/^\d+ \/ \d+$/);
}

for (const style of [undefined, "forscore"] as const) {
  const nom = style ? "forScore" : "Classique";

  test(`${nom} : « Ensuite » sur la dernière page du chant, un toucher amène à la 1re page du suivant`, async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await ouvrirDernierePage(page, style);
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
    // forScore la garde jusqu'à un toucher au centre ; Classique la retire seule après 3 s.
    if (style) await toucherCentre(page);
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

  test(`${nom} : dernier chant de la setlist, aucun bandeau « Ensuite »`, async ({ page }) => {
    const erreurs = surveillerErreurs(page);
    await ouvrir(page, { style });
    await expect(page.locator("[data-suivant]")).toHaveCount(0);
    expect(erreurs).toEqual([]);
  });
}

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
