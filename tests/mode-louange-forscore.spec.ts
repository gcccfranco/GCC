import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirReglages } from "./helpers/louange";

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
