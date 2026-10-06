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

// ─── Tranche T5 : bibliothèque complète ─────────────────────────────────────
// Filtres langue, thème, tempo (Q11) ; aperçu chargé à la demande (Q12) ;
// « + » entre deux éléments, sur ordinateur seulement (Q8, planche
// `creer-piste2-bibliotheque` ; tablette couchée et feuilles : sans).

const compteur = (page: Page, n: number) => volet(page).getByText(n === 1 ? "1 chant" : `${n} chants`, { exact: true });
const attendus = (f: Partial<FiltresBibliotheque>) => chantsDeLaBibliotheque(INDEX, { ...SANS_FILTRE, ...f }).length;

/** Texte chanté d'une ligne de l'aperçu, sans ses accords. */
const paroles = (ligne: ReturnType<Page["locator"]>) =>
  ligne.evaluate((el) => {
    const copie = el.cloneNode(true) as HTMLElement;
    copie.querySelectorAll("[data-copy-ignore]").forEach((n) => n.remove());
    return (copie.textContent ?? "").replace(/\s+/g, " ").trim();
  });
const accords = (ligne: ReturnType<Page["locator"]>) => ligne.locator(".font-chord").allTextContents();

test("filtre de langue : Tous · FR · 中文, le compteur suit", async ({ page }) => {
  await ouvrirLaBibliotheque(page);
  const langue = volet(page).getByRole("group", { name: "Langue" });
  await expect(langue.getByRole("button", { name: "Tous" })).toHaveAttribute("aria-pressed", "true");

  await langue.getByRole("button", { name: "中文" }).click();
  await expect(langue.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
  await expect(compteur(page, attendus({ langue: "zh" }))).toBeVisible();
  await recherche(page).fill("Abba Père");
  await expect(resultats(page).filter({ hasText: "Abba Père" })).toHaveCount(0);
  await recherche(page).fill("yi sheng ai ni");
  await expect(resultats(page).filter({ hasText: "一生爱你" })).toHaveCount(1);

  await langue.getByRole("button", { name: "FR" }).click();
  await expect(resultats(page).filter({ hasText: "一生爱你" })).toHaveCount(0);
  await recherche(page).fill("");
  await expect(compteur(page, attendus({ langue: "fr" }))).toBeVisible();

  await langue.getByRole("button", { name: "Tous" }).click();
  await expect(compteur(page, INDEX.length)).toBeVisible();
});

test("filtres thème et tempo : le compteur suit ; un chant sans tempo disparaît", async ({ page }, testInfo) => {
  await ouvrirLaBibliotheque(page);
  const theme = volet(page).getByLabel("Thème", { exact: true });
  const tempo = volet(page).getByLabel("Tempo", { exact: true });

  await theme.selectOption("adoration");
  await expect(compteur(page, attendus({ theme: "adoration" }))).toBeVisible();
  await theme.selectOption("");
  await expect(compteur(page, INDEX.length)).toBeVisible();

  await tempo.selectOption("lent");
  await expect(compteur(page, attendus({ tempo: "lent" }))).toBeVisible();
  // Abba Père n'a pas de tempo : il disparaît ; 一生爱你 (65) est lent.
  await recherche(page).fill("Abba Père");
  await expect(resultats(page).filter({ hasText: "Abba Père" })).toHaveCount(0);
  await recherche(page).fill("yi sheng ai ni");
  await expect(resultats(page).filter({ hasText: "一生爱你" })).toHaveCount(1);
  await tempo.selectOption("rapide");
  await expect(resultats(page).filter({ hasText: "一生爱你" })).toHaveCount(0);
  await recherche(page).fill("");
  await expect(compteur(page, attendus({ tempo: "rapide" }))).toBeVisible();

  // Les filtres se cumulent.
  await theme.selectOption("adoration");
  await expect(compteur(page, attendus({ tempo: "rapide", theme: "adoration" }))).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`bibliotheque-filtres-${testInfo.project.name}.png`) });
});

test("aperçu FR : le titre déplie deux lignes avec accords, dans la tonalité d'ajout ; « Voir la partition » dans un nouvel onglet", async ({ page }, testInfo) => {
  await ouvrirLaBibliotheque(page);
  await recherche(page).fill("Je reviens au cœur");
  const ligne = resultats(page).filter({ hasText: "Je reviens au cœur" }).first();
  const titre = ligne.getByRole("button", { name: /^Je reviens au cœur/ });
  await expect(titre).toHaveAttribute("aria-expanded", "false");
  await titre.click();
  await expect(titre).toHaveAttribute("aria-expanded", "true");

  const apercu = ligne.locator("[data-apercu]");
  const lignes = apercu.locator("[data-apercu-ligne]");
  await expect(lignes).toHaveCount(2);
  // Écrit en Eb, ajouté en D (tonalité recommandée) : Bb/D devient A/C#.
  expect(await paroles(lignes.nth(0))).toBe("Le chant terminé, le rideau retombe.");
  expect(await accords(lignes.nth(0))).toEqual(["D", "A/C#", "Em7"]);
  expect(await paroles(lignes.nth(1))).toBe("Je viens simplement");
  await expect(apercu).not.toContainText("Porter mon");

  const lien = apercu.getByRole("link", { name: "Voir la partition" });
  await expect(lien).toHaveAttribute("href", `/songs/je-reviens-au-coeur?key=${encodeURIComponent('"D"')}`);
  await expect(lien).toHaveAttribute("target", "_blank");
  await page.screenshot({ path: testInfo.outputPath(`bibliotheque-apercu-${testInfo.project.name}.png`) });

  // Toucher de nouveau le titre replie l'aperçu.
  await titre.click();
  await expect(apercu).toHaveCount(0);
});

test("aperçu 中文 : deux lignes chantées avec accords, sans pinyin", async ({ page }) => {
  await ouvrirLaBibliotheque(page);
  await recherche(page).fill("yi sheng ai ni");
  const ligne = resultats(page).filter({ hasText: "一生爱你" }).first();
  await ligne.getByRole("button", { name: /^一生爱你/ }).click();
  const lignes = ligne.locator("[data-apercu] [data-apercu-ligne]");
  await expect(lignes).toHaveCount(2);
  // L'intro (accords seuls) n'est pas chantée : on part du couplet.
  expect(await paroles(lignes.nth(0))).toBe("亲爱的宝贵耶稣，你爱何等的甘甜，");
  expect(await accords(lignes.nth(0))).toEqual(["E", "A", "F#m", "Bsus4", "B"]);
  expect(await paroles(lignes.nth(1))).toBe("我的心深深被你吸引，爱你是我的喜乐。");
  await expect(ligne.locator("[data-apercu]")).not.toContainText("qīn");
  await expect(ligne.locator("[data-apercu]")).not.toContainText("wǒ de");
});

const SETLIST_DEUX_ID = "setlist-bibliotheque-deux";
const SETLIST_DEUX_DOC = `setlists/${SETLIST_DEUX_ID}`;

async function ouvrirSetlistDeDeux(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(
    page,
    MUSICIENNE,
    {
      [SETLIST_DEUX_DOC]: {
        ...SETLIST,
        items: [
          SETLIST.items[0],
          { ...SETLIST.items[0], songSlug: "一生爱你", position: 2 },
        ],
      },
    },
    `/setlists/${SETLIST_DEUX_ID}/edit`,
  );
  await attendreEditeur(page, "一生爱你");
  return db;
}

const PROJETS_ORDINATEUR = ["ordinateur", "ordinateur-1440"];

test("ordinateur : « + » entre deux éléments insère à cet endroit, deux ajouts gardent leur ordre", async ({ page }, testInfo) => {
  test.skip(!PROJETS_ORDINATEUR.includes(testInfo.project.name), "ordinateur seulement (tablette couchée et feuilles : sans « + »)");
  const db = await ouvrirSetlistDeDeux(page);
  const colonne = page.locator("[data-colonne-setlist]");
  const inserer = colonne.getByRole("button", { name: "Insérer ici, après Abba Père" });
  await expect(colonne.getByRole("button", { name: "Insérer ici, au début" })).toHaveCount(1);
  await inserer.click();
  await expect(volet(page).getByRole("heading", { name: "Ajouter des chants" })).toBeVisible();
  await expect(recherche(page)).toBeFocused();
  await expect(inserer).toHaveAttribute("aria-pressed", "true");
  await expect(inserer).toContainText("Insérer ici");

  await recherche(page).fill("Je reviens au cœur");
  await volet(page).getByRole("button", { name: "Ajouter Je reviens au cœur", exact: true }).click();
  await recherche(page).fill("Abrite-moi");
  await volet(page).getByRole("button", { name: "Ajouter Abrite-moi", exact: true }).click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath(`bibliotheque-inserer-${testInfo.project.name}.png`) });

  await expect(listeCourte(page).locator("[data-element]")).toHaveText([/Abba Père/, /Je reviens au cœur/, /Abrite-moi/, /一生爱你/]);
  await expect
    .poll(() => (db.doc(SETLIST_DEUX_DOC)?.items as { songSlug: string }[] | undefined)?.map((i) => i.songSlug), { timeout: 10_000 })
    .toEqual(["abba-pere", "je-reviens-au-coeur", "abrite-moi", "一生爱你"]);
  // La ligne d'insertion suit les ajouts : elle est maintenant après Abrite-moi.
  await expect(colonne.getByRole("button", { name: "Insérer ici, après Abrite-moi" })).toHaveAttribute("aria-pressed", "true");

  // « Ajouter des chants » ajoute de nouveau à la fin.
  await colonne.locator("[data-ouvrir-bibliotheque]").click();
  await expect(colonne.locator("[data-inserer][aria-pressed=true]")).toHaveCount(0);
  await recherche(page).fill("Amour parfait");
  await volet(page).getByRole("button", { name: "Ajouter Amour parfait", exact: true }).click();
  await expect(listeCourte(page).locator("[data-element]").last()).toContainText("Amour parfait");
});

test("tablette couchée, téléphone, tablette en portrait : pas de « + » entre deux éléments", async ({ page }, testInfo) => {
  test.skip(PROJETS_ORDINATEUR.includes(testInfo.project.name), "sans « + » hors de l'ordinateur");
  await ouvrirSetlistDeDeux(page);
  await ouvrirBibliotheque(page);
  await expect(page.locator("[data-inserer]")).toHaveCount(0);
});
