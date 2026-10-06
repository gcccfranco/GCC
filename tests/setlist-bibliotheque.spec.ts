import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, deuxColonnesAttendues, listeCourte, ouvrirBibliotheque, reglerElement, volet } from "./helpers/editeurSetlist";
import { readFileSync } from "fs";
import { chantsDeLaBibliotheque, trancheDeTempo, type FiltresBibliotheque } from "../src/lib/setlist/bibliotheque";
import { insererA, type FormListItem } from "../src/lib/setlist/formItems";
import type { SongIndexEntry } from "../src/types/song";

// Lot U5 bis (docs/spec-editeur-setlist.md), bibliothèque de l'éditeur :
// recherche titre, pinyin, artiste sans limite de 20, filtres langue, thème,
// tempo (Q11) ; « + » entre deux éléments (Q8). Tranche T1 : la logique pure.
// L'écran vient en T3 et T5.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;

const SANS_FILTRE: FiltresBibliotheque = { recherche: "", langue: "tous", theme: null, tempo: null };

const chant = (slug: string, over: Partial<SongIndexEntry> = {}): SongIndexEntry => ({
  slug,
  title: slug,
  titlePinyin: null,
  artist: "",
  language: "fr",
  originalKey: "C",
  recommendedKey: null,
  tempo: null,
  themes: [],
  youtubeUrl: null,
  spotifyUrl: null,
  appleMusicUrl: null,
  hasJianpu: false,
  jianpuKey: null,
  ...over,
});

const slugs = (songs: SongIndexEntry[]) => songs.map((s) => s.slug);

// ── Tempo ────────────────────────────────────────────────────────────────────

test("(pur) tempo en trois tranches : lent < 90, modéré 90–119, rapide ≥ 120", () => {
  expect(trancheDeTempo(65)).toBe("lent");
  expect(trancheDeTempo(89)).toBe("lent");
  expect(trancheDeTempo(90)).toBe("modere");
  expect(trancheDeTempo(119)).toBe("modere");
  expect(trancheDeTempo(120)).toBe("rapide");
  expect(trancheDeTempo(154)).toBe("rapide");
});

test("(pur) chant sans tempo : aucune tranche", () => {
  expect(trancheDeTempo(null)).toBeNull();
});

// ── Recherche ────────────────────────────────────────────────────────────────

test("(pur) recherche par titre : « Abba » trouve Abba Père en tête", () => {
  expect(slugs(chantsDeLaBibliotheque(INDEX, { ...SANS_FILTRE, recherche: "Abba" }))[0]).toBe("abba-pere");
});

test("(pur) recherche par pinyin : « Yi sheng ai ni » trouve 一生爱你", () => {
  const out = slugs(chantsDeLaBibliotheque(INDEX, { ...SANS_FILTRE, recherche: "Yi sheng ai ni" }));
  expect(out.slice(0, 5)).toContain("一生爱你");
});

test("(pur) recherche par artiste", () => {
  const songs = [chant("abba-pere", { title: "Abba Père", artist: "Auteur Fictif" }), chant("autre", { title: "Autre chant", artist: "Quelqu'un" })];
  expect(slugs(chantsDeLaBibliotheque(songs, { ...SANS_FILTRE, recherche: "Auteur Fictif" }))).toEqual(["abba-pere"]);
});

test("(pur) recherche sans limite de 20 résultats", () => {
  const songs = Array.from({ length: 30 }, (_, i) => chant(`louange-${i}`, { title: `Louange ${i}` }));
  expect(chantsDeLaBibliotheque(songs, { ...SANS_FILTRE, recherche: "Louange" })).toHaveLength(30);
});

test("(pur) sans recherche ni filtre : tous les chants, dans l'ordre de l'index", () => {
  expect(chantsDeLaBibliotheque(INDEX, SANS_FILTRE)).toEqual(INDEX);
});

// ── Filtres ──────────────────────────────────────────────────────────────────

const ABBA = chant("abba-pere", { title: "Abba Père", themes: ["adoration"] });
const YISHENG = chant("一生爱你", { title: "一生爱你", titlePinyin: "Yī shēng ài nǐ", language: "zh", tempo: 65, themes: ["爱慕", "敬拜"] });
const RAPIDE = chant("rapide-fr", { title: "Chant rapide", tempo: 132, themes: ["adoration", "joie"] });
const MODERE_ZH = chant("modere-zh", { title: "中速", language: "zh", tempo: 100, themes: ["adoration"] });
const BIBLIO = [ABBA, YISHENG, RAPIDE, MODERE_ZH];

test("(pur) langue : Tous · FR · 中文", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, SANS_FILTRE))).toEqual(["abba-pere", "一生爱你", "rapide-fr", "modere-zh"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, langue: "fr" }))).toEqual(["abba-pere", "rapide-fr"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, langue: "zh" }))).toEqual(["一生爱你", "modere-zh"]);
});

test("(pur) thème : comme la page Chants, le chant porte le thème", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, theme: "adoration" }))).toEqual([
    "abba-pere",
    "rapide-fr",
    "modere-zh",
  ]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, theme: "joie" }))).toEqual(["rapide-fr"]);
});

test("(pur) tempo : un chant sans tempo disparaît dès qu'un tempo est choisi", () => {
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "lent" }))).toEqual(["一生爱你"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "modere" }))).toEqual(["modere-zh"]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...SANS_FILTRE, tempo: "rapide" }))).toEqual(["rapide-fr"]);
});

test("(pur) recherche et filtres se cumulent", () => {
  const f: FiltresBibliotheque = { recherche: "Abba", langue: "zh", theme: null, tempo: null };
  expect(chantsDeLaBibliotheque(BIBLIO, f)).toEqual([]);
  expect(slugs(chantsDeLaBibliotheque(BIBLIO, { ...f, langue: "fr", theme: "adoration" }))).toEqual(["abba-pere"]);
});

// ── Insérer à un endroit ─────────────────────────────────────────────────────

const transition = (uid: string): FormListItem => ({ uid, kind: "transition", text: uid });
const uids = (items: FormListItem[]) => items.map((i) => i.uid);

test("(pur) insérer avant le premier, entre deux, à la fin", () => {
  const items = [transition("a"), transition("b")];
  expect(uids(insererA(items, 0, transition("n")))).toEqual(["n", "a", "b"]);
  expect(uids(insererA(items, 1, transition("n")))).toEqual(["a", "n", "b"]);
  expect(uids(insererA(items, 2, transition("n")))).toEqual(["a", "b", "n"]);
  // La liste d'origine ne bouge pas.
  expect(uids(items)).toEqual(["a", "b"]);
});

test("(pur) deux ajouts à la suite au même « + » gardent leur ordre", () => {
  let items = [transition("a"), transition("b")];
  items = insererA(items, 1, transition("x"));
  items = insererA(items, 2, transition("y"));
  expect(uids(items)).toEqual(["a", "x", "y", "b"]);
});

// ─── Tranches T3 et T4 : la bibliothèque dans le volet ou en feuille ────────
// Recherche, « Dans la setlist », « Ajouté », ajout à la fin dans la tonalité
// recommandée, compteur. Grands écrans : à la place des réglages (T3) ;
// téléphone et tablette en portrait : une feuille (T4). Filtres, aperçu et
// « + » entre deux chants : T5.

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Musicienne",
  lastName: "Test",
  planningName: "Musicienne T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-bibliotheque";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

const SETLIST = {
  title: "Culte Francophone 18/10",
  leader: "Présidence A",
  category: "Culte Francophone",
  date: "2026-10-18",
  language: "fr",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    { songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" },
  ],
};

async function ouvrirLaBibliotheque(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}/edit`);
  await attendreEditeur(page, "Abba Père");
  await ouvrirBibliotheque(page);
  return db;
}

const recherche = (page: Page) => volet(page).getByPlaceholder("Chercher un chant à ajouter…");
const resultats = (page: Page) => volet(page).locator("[data-resultat]");
const items = (db: FakeDb) => (db.doc(SETLIST_DOC)?.items ?? []) as { songSlug: string; keyOverride: string | null }[];

test("la recherche trouve par titre, pinyin et artiste ; le compteur suit", async ({ page }) => {
  await ouvrirLaBibliotheque(page);
  await expect(recherche(page)).toBeFocused();
  await expect(volet(page).getByText(`${INDEX.length} chants`)).toBeVisible();
  await recherche(page).fill("Je reviens au cœur");
  await expect(resultats(page).first()).toContainText("Je reviens au cœur");
  await recherche(page).fill("yi sheng ai ni");
  await expect(resultats(page).filter({ hasText: "一生爱你" })).toHaveCount(1);
  await recherche(page).fill("Samuel Olivier");
  await expect(resultats(page).filter({ hasText: "Abba Père" })).toHaveCount(1);
  const n = await resultats(page).count();
  await expect(volet(page).getByText(n === 1 ? "1 chant" : `${n} chants`, { exact: true })).toBeVisible();
});

test("un chant pris est « Dans la setlist », sans « + » ; un ajout dit « Ajouté », à la fin, dans la recommandée", async ({ page }, testInfo) => {
  const db = await ouvrirLaBibliotheque(page);
  await recherche(page).fill("Abba Père");
  const abba = resultats(page).filter({ hasText: "Abba Père" }).first();
  await expect(abba).toContainText("Dans la setlist");
  await expect(abba.getByRole("button", { name: /^Ajouter/ })).toHaveCount(0);

  await recherche(page).fill("Je reviens au cœur");
  const jeReviens = resultats(page).filter({ hasText: "Je reviens au cœur" }).first();
  await jeReviens.getByRole("button", { name: "Ajouter Je reviens au cœur", exact: true }).click();
  await expect(jeReviens).toContainText("Ajouté");
  await expect(jeReviens.getByRole("button", { name: /^Ajouter/ })).toHaveCount(0);
  await expect(listeCourte(page).locator("[data-element]").last()).toContainText("Je reviens au cœur");
  await expect
    .poll(() => items(db).map((i) => [i.songSlug, i.keyOverride]), { timeout: 10_000 })
    .toEqual([["abba-pere", null], ["je-reviens-au-coeur", "D"]]);
  await page.screenshot({ path: testInfo.outputPath(`bibliotheque-${testInfo.project.name}.png`) });
});

test("grand écran : « Terminé », Échap ou un élément touché rendent les réglages", async ({ page }, testInfo) => {
  test.skip(!deuxColonnesAttendues(testInfo), "grand écran seulement : la bibliothèque à la place des réglages");
  await ouvrirLaBibliotheque(page);
  await volet(page).getByRole("button", { name: "Terminé" }).click();
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();

  await page.locator("[data-colonne-setlist]").getByRole("button", { name: "Ajouter des chants" }).click();
  await expect(recherche(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();

  await page.locator("[data-colonne-setlist]").getByRole("button", { name: "Ajouter des chants" }).click();
  await reglerElement(page, "Abba Père");
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();
});

test("petits écrans : la bibliothèque en feuille — « N chants dans la setlist », « Terminé » la ferme et rend le focus ; Échap aussi", async ({ page }, testInfo) => {
  test.skip(deuxColonnesAttendues(testInfo), "téléphone et tablette en portrait seulement : feuilles");
  await ouvrirLaBibliotheque(page);
  const feuille = page.getByRole("dialog", { name: "Ajouter des chants" });
  await expect(feuille).toBeVisible();
  await expect(recherche(page)).toBeFocused();
  await expect(feuille.getByText("1 chant dans la setlist", { exact: true })).toBeVisible();
  await recherche(page).fill("Je reviens au cœur");
  await feuille.getByRole("button", { name: "Ajouter Je reviens au cœur", exact: true }).click();
  await expect(feuille.getByText("2 chants dans la setlist", { exact: true })).toBeVisible();
  // Presque toute la hauteur de l'écran.
  const h = (await feuille.boundingBox())!.height;
  expect(h).toBeGreaterThan(page.viewportSize()!.height * 0.85);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath(`bibliotheque-feuille-${testInfo.project.name}.png`) });

  await feuille.getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(volet(page)).toHaveCount(0);
  const ajouter = page.locator("[data-ouvrir-bibliotheque]");
  await expect(ajouter).toBeFocused();
  await expect(listeCourte(page).locator("[data-element]").last()).toContainText("Je reviens au cœur");

  await ajouter.click();
  await expect(recherche(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(volet(page)).toHaveCount(0);
});
