import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, ouvrirBibliotheque, volet } from "./helpers/editeurSetlist";

// Lot ST, ST5 (docs/spec-jianpu-entete-statistiques.md) : les statistiques sous chaque chant de la
// bibliothèque de l'éditeur de setlist, les pastilles verte (jamais dans ce service) et orange (joué dans
// ce service à moins de 21 jours), le tri « Moins joués ici ». Ordinateur à pointeur fin : colonnes
// « {Service} » et « Total » au lieu de la ligne sous le titre. Lancé aussi sur `tablette-paysage` et
// `ordinateur-1440` (SPECS_GRAND_ECRAN). Horloge au 20/11/2026 ; setlists simulées, noms fictifs.

const MEMBRE: FakeProfile = {
  uid: "uid-membre-st5", email: "membre-st5@example.com", firstName: "Nadia", lastName: "F.",
  planningName: "Nadia F.", serviceRoles: { "Groupe Fidélité": ["musicien"] },
};
const CAPTURES = "/tmp/claude-0/-home-user-GCC/2b3dc4d2-42d2-52cc-93a8-fc40dc07ed80/scratchpad/st-d";
const FID = "Groupe Fidélité";

const JOUE_FID = "abba-pere";                 // Fidélité le 14/06 et le 15/11 (J−7)
const PREVU_FID = "a-jamais-tu-es-saint";     // Fidélité le 06/09, prévu le 01/12 (J+9)
const JAMAIS_FID = "jamais-marche-seul";      // seulement Groupe Paix
const ZH = "回家";                            // Fidélité le 04/10 et le 11/10
const NULLE_PART = "abrite-moi";

const INDEX = (JSON.parse(fs.readFileSync("public/songs-index.json", "utf8")) as { songs: { slug: string; title: string }[] }).songs;
const titre = (slug: string) => INDEX.find((s) => s.slug === slug)!.title;

const chant = (songSlug: string) => ({
  songSlug, position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, category: string, slugs: string[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader: "Luc Fictif", language: "fr", notes: "",
  items: slugs.map(chant), isDraft: false, isPrivate: false, ...extra,
});

const EN_COURS = "en-cours";
const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/f1": setlist("2026-06-14", FID, [JOUE_FID]),
  "setlists/f2": setlist("2026-11-15", FID, [JOUE_FID]),            // J−7
  "setlists/f3": setlist("2026-09-06", FID, [PREVU_FID]),
  "setlists/f4": setlist("2026-12-01", FID, [PREVU_FID]),           // J+9, à venir
  "setlists/f5": setlist("2026-10-04", FID, [ZH]),
  "setlists/f6": setlist("2026-10-11", FID, [ZH]),
  "setlists/p1": setlist("2026-10-04", "Groupe Paix", [JAMAIS_FID]),
  "setlists/brouillon": setlist("2026-11-20", FID, [JAMAIS_FID], { isDraft: true }),
  // La setlist qu'on édite : jamais comptée dans ses propres statistiques.
  [`setlists/${EN_COURS}`]: setlist("2026-11-22", FID, [JOUE_FID], { ownerId: MEMBRE.uid, title: "Fidélité 22/11" }),
};

const colonnes = () => ["ordinateur", "ordinateur-1440"].includes(test.info().project.name);
const telephone = () => test.info().project.name === "telephone";

async function ouvrirEditeur(page: Page, { langue = "fr", chemin = `/setlists/${EN_COURS}/edit` }: { langue?: "fr" | "zh-CN"; chemin?: string } = {}) {
  await page.addInitScript((l) => { localStorage.setItem("i18nextLng", l); localStorage.setItem("theme", "light"); }, langue);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.clock.setFixedTime(new Date("2026-11-20T10:00:00"));
  await signInAs(page, MEMBRE, SETLISTS, chemin);
  if (chemin.includes("edit") && langue === "fr") await attendreEditeur(page, titre(JOUE_FID));
  else await expect(page.locator("[data-ouvrir-bibliotheque]")).toBeVisible();
  if (langue === "zh-CN") {
    // L'aide de `ouvrirBibliotheque` cherche un titre français.
    await page.locator("[data-ouvrir-bibliotheque]").click();
    await expect(volet(page).locator("[data-resultat]").first()).toBeVisible();
  } else await ouvrirBibliotheque(page);
}

const rangee = (page: Page, slug: string) => volet(page).locator("[data-resultat]").filter({ hasText: titre(slug) }).first();
const pilule = (page: Page) => volet(page).locator("[data-tri-moins-joues]");

async function capture(page: Page, nom: string) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(CAPTURES, `${test.info().project.name}-${nom}.png`) });
}

test("service et date choisis : dernière fois, total, pastille orange (7 j avant, 9 j après), pastille verte", async ({ page }) => {
  await ouvrirEditeur(page);
  const joue = rangee(page, JOUE_FID);
  // La setlist éditée ne compte pas : 2 fois (14/06 et 15/11), pas 3.
  await expect(joue.locator("[data-stats-recent]")).toHaveText("Fidélité : il y a 7 j");
  const prevu = rangee(page, PREVU_FID);
  await expect(prevu.locator("[data-stats-recent]")).toHaveText("Fidélité : prévu le 01/12");
  const vert = rangee(page, JAMAIS_FID);
  await expect(vert.getByText("Jamais à Fidélité")).toBeVisible();
  await expect(vert.locator("[data-stats-recent]")).toHaveCount(0); // le brouillon ne compte pas

  if (colonnes()) {
    await expect(volet(page).locator("[data-stats-entete]")).toContainText("Fidélité");
    await expect(volet(page).locator("[data-stats-entete]")).toContainText("Total");
    await expect(joue.locator("[data-stats-col-service]")).toHaveText("15/11");
    await expect(joue.locator("[data-stats-col-total]")).toHaveText("2");
    await expect(rangee(page, ZH).locator("[data-stats-col-service]")).toHaveText("11/10");
    await expect(vert.locator("[data-stats-col-total]")).toHaveText("1");
    await expect(rangee(page, NULLE_PART).locator("[data-stats-ligne]")).toHaveText("Jamais joué à GCC");
  } else {
    await expect(joue).toContainText("Fidélité : 15/11 · 2 fois au total");
    await expect(rangee(page, ZH)).toContainText("Fidélité : 11/10 · 2 fois au total");
    await expect(vert).toContainText("· 1 fois au total");
    await expect(rangee(page, NULLE_PART)).toContainText("Jamais joué à GCC");
  }
  await expect(rangee(page, NULLE_PART).locator("[data-stats-vert]")).toHaveCount(0);
  await expect(rangee(page, NULLE_PART).locator("[data-stats-recent]")).toHaveCount(0);
  // Rien n'est bloqué : le « + » reste.
  await expect(volet(page).getByRole("button", { name: `Ajouter ${titre(PREVU_FID)}`, exact: true })).toBeVisible();
  await capture(page, "bibliotheque");
});

test("« Moins joués ici » : les chants jamais joués à Fidélité d'abord, puis la dernière fois la plus ancienne", async ({ page }) => {
  await ouvrirEditeur(page);
  await expect(pilule(page)).toBeEnabled();
  await expect(pilule(page)).toHaveAttribute("aria-pressed", "false");
  const titres = () => volet(page).locator("[data-resultat]").evaluateAll(
    (els) => els.map((e) => e.querySelector("button[aria-expanded] span.truncate")?.textContent ?? ""),
  );
  const avant = await titres();
  await pilule(page).click();
  await expect(pilule(page)).toHaveAttribute("aria-pressed", "true");
  const apres = await titres();
  expect(apres).not.toEqual(avant);
  const rang = (slug: string) => apres.indexOf(titre(slug));
  // Jamais à Fidélité (vert ou nulle part) avant tout chant joué ; puis 06/09 < 11/10 < 15/11.
  expect(rang(JAMAIS_FID)).toBeGreaterThanOrEqual(0);
  expect(rang(JAMAIS_FID)).toBeLessThan(rang(PREVU_FID));
  expect(rang(NULLE_PART)).toBeLessThan(rang(PREVU_FID));
  expect(rang(PREVU_FID)).toBeLessThan(rang(ZH));
  expect(rang(ZH)).toBeLessThan(rang(JOUE_FID));
  expect(rang(JOUE_FID)).toBe(apres.length - 1);
  await capture(page, "moins-joues");
  await pilule(page).click();
  await expect(pilule(page)).toHaveAttribute("aria-pressed", "false");
  expect(await titres()).toEqual(avant);
});

test("setlist sans service : seulement le total, pas de pastille, tri grisé avec l'aide", async ({ page }) => {
  await ouvrirEditeur(page, { chemin: "/setlists/new?autre=1" });
  await expect(pilule(page)).toBeDisabled();
  await expect(pilule(page)).toHaveAttribute("aria-disabled", "true");
  await expect(volet(page).getByText("Choisis d'abord le service")).toBeVisible();
  if (colonnes()) {
    await expect(volet(page).locator("[data-stats-entete]")).toContainText("Total");
    await expect(rangee(page, JOUE_FID).locator("[data-stats-col-total]")).toHaveText("2");
    await expect(volet(page).locator("[data-stats-col-service]")).toHaveCount(0);
  } else {
    await expect(rangee(page, JOUE_FID)).toContainText("2 fois au total");
    await expect(rangee(page, JOUE_FID)).not.toContainText("Fidélité :");
  }
  await expect(volet(page).locator("[data-stats-vert], [data-stats-recent]")).toHaveCount(0);
  await expect(rangee(page, NULLE_PART)).toContainText("Jamais joué à GCC");
  await capture(page, "sans-service");
});

test("中文 : les lignes et le tri sont traduits", async ({ page }) => {
  await ouvrirEditeur(page, { langue: "zh-CN" });
  await expect(pilule(page)).toHaveText("这里唱得最少");
  await expect(rangee(page, JOUE_FID).locator("[data-stats-recent]")).toHaveText("信实团契：7 天前");
  await expect(rangee(page, PREVU_FID).locator("[data-stats-recent]")).toHaveText("信实团契：预定 01/12");
  await expect(rangee(page, JAMAIS_FID).getByText("信实团契从未唱过")).toBeVisible();
  const zh = rangee(page, ZH);
  if (colonnes()) await expect(zh.locator("[data-stats-col-total]")).toHaveText("2");
  else await expect(zh).toContainText("信实团契：11/10 · 共 2 次");
  await expect(rangee(page, NULLE_PART)).toContainText("尚未在 GCC 唱过");
  if (telephone()) await capture(page, "zh");
});
