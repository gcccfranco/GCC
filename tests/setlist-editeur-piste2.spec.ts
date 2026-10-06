import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import {
  attendreEditeur,
  boutonPlusTransition,
  champNoteDuChant,
  champNotes,
  choisirTonalite,
  deuxColonnesAttendues,
  fermerFeuille,
  groupeTonalites,
  ligneSection,
  listeCourte,
  reglerElement,
  retirerChant,
  retirerSection,
  volet,
} from "./helpers/editeurSetlist";
import { buildFormItems } from "../src/lib/setlist/formItems";
import { buildSetlistItems } from "../src/lib/setlist/buildSetlistItems";
import type { SetlistItem } from "../src/types/setList";
import type { SongIndexEntry } from "../src/types/song";

// Lot U5 bis (docs/spec-editeur-setlist.md), éditeur de setlist « piste 2 ».
// Tranche T1 : le défaut trouvé (question 6) — tout enregistrement de
// l'éditeur effaçait les accords retouchés sur un scan 简谱 (`jianpuChords`,
// mode Adapter, lot 9). Ils sont reconduits tels quels, comme `contentOverride`.
// Mise en page en deux colonnes : T3 ; feuilles sur téléphone et tablette portrait : T4.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
const SONGS_MAP = Object.fromEntries(INDEX.map((s) => [s.slug, s]));

/** Chant chinois affiché en scan (calque certifié), comme harmonie-jianpu.spec.ts. */
const SCAN = "到各山岭去传扬";
const RETOUCHES = { changed: { 0: "Em7", 3: "" }, added: [{ page: 0, x: 800, y: 1163, c: "G" }] };

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Musicienne",
  lastName: "Test",
  planningName: "Musicienne T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-editeur-piste2";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

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

const SETLIST = {
  title: "Culte Francophone 18/10",
  leader: "Présidence A",
  category: "Culte Francophone",
  date: "2026-10-18",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, showPinyin: false }),
    item({ songSlug: SCAN, position: 2, jianpuSheet: true, jianpuChords: RETOUCHES }),
  ],
};

async function ouvrirEditeur(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}/edit`);
  await attendreEditeur(page, "Abba Père");
  return db;
}

test("(pur) jianpuChords : relus par buildFormItems, réécrits par buildSetlistItems", () => {
  const relus = buildSetlistItems(buildFormItems(SETLIST.items as SetlistItem[], SONGS_MAP));
  expect(relus[1].songSlug).toBe(SCAN);
  expect(relus[1].jianpuSheet).toBe(true);
  expect(relus[1].jianpuChords).toEqual(RETOUCHES);
});

test("(pur) jianpuChords : un chant sans retouche n'en reçoit pas", () => {
  const relus = buildSetlistItems(buildFormItems(SETLIST.items as SetlistItem[], SONGS_MAP));
  expect("jianpuChords" in relus[0]).toBe(false);
});

test("« Modifier » : changer la tonalité d'un autre chant garde les accords retouchés sur le scan (FR + 中文)", async ({ page }) => {
  const db = await ouvrirEditeur(page);
  await choisirTonalite(page, "Abba Père", "B");

  await expect
    .poll(() => (db.doc(SETLIST_DOC)?.items as SetlistItem[])[0].keyOverride, { timeout: 10_000 })
    .toBe("B");
  const scan = (db.doc(SETLIST_DOC)?.items as SetlistItem[])[1];
  expect(scan.jianpuSheet).toBe(true);
  expect(scan.jianpuChords).toEqual(RETOUCHES);
});

// ─── Tranches T3 et T4 : la piste 2 ──────────────────────────────────────────
// En-tête compact, liste courte, réglages de l'élément choisi (chant, transition,
// fusion). T3 : deux colonnes sur ordinateur et tablette en paysage. T4 : feuilles
// sur téléphone et tablette en portrait. Les tests « grand écran » et « petits
// écrans » valent pour une disposition ; les autres pour toutes, par les aides.

const SETLIST_T3 = {
  ...SETLIST,
  notes: "Thème : la fidélité",
  items: [
    item({ songSlug: "abba-pere", position: 1, showPinyin: false, notes: "Piano seul sur le couplet 1." }),
    { ...item({ songSlug: "", position: 2 }), type: "transition", transitionText: "Prière, piano doux" },
    item({ songSlug: "一生爱你", position: 3, keyOverride: "F" }),
    item({ songSlug: SCAN, position: 4, jianpuSheet: true, jianpuChords: RETOUCHES }),
  ],
};

const grandEcranSeulement = (testInfo: TestInfo) =>
  test.skip(!deuxColonnesAttendues(testInfo), "grand écran seulement : deux colonnes");
const petitsEcransSeulement = (testInfo: TestInfo) =>
  test.skip(deuxColonnesAttendues(testInfo), "téléphone et tablette en portrait seulement : feuilles");

async function ouvrirT3(page: Page, doc: Record<string, unknown> = SETLIST_T3) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: doc }, `/setlists/${SETLIST_ID}/edit`);
  await attendreEditeur(page, "Abba Père");
  return db;
}

const itemsEnBase = (db: FakeDb) => (db.doc(SETLIST_DOC)?.items ?? []) as SetlistItem[];
const etapes = (it: SetlistItem) => (it.structureOverride ?? []).map((u) => u.replace(/-\d+$/, ""));

test("grand écran : deux colonnes — setlist de 400 à 520 px, volet d'au moins 610 px, 12 tonalités sur une ligne", async ({ page }, testInfo) => {
  grandEcranSeulement(testInfo);
  await ouvrirT3(page);
  await expect(page.locator("[data-editeur-deux-colonnes]")).toBeVisible();
  const colonne = (await page.locator("[data-colonne-setlist]").boundingBox())!;
  const reglages = (await volet(page).boundingBox())!;
  expect(colonne.width).toBeGreaterThanOrEqual(399);
  expect(colonne.width).toBeLessThanOrEqual(521);
  expect(reglages.width).toBeGreaterThanOrEqual(610);
  expect(reglages.x).toBeGreaterThanOrEqual(colonne.x + colonne.width - 1);
  // Tablette couchée : la barre latérale réduite (68 px) ; ordinateur : dépliée (248 px).
  expect(Math.round(colonne.x)).toBe(testInfo.project.name === "tablette-paysage" ? 68 : 248);

  const tonalites = groupeTonalites(page, "Abba Père").getByRole("radio");
  await expect(tonalites).toHaveCount(12);
  const ys = await tonalites.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(ys).size, "une seule ligne").toBe(1);
  await page.screenshot({ path: testInfo.outputPath(`editeur-${testInfo.project.name}.png`) });
});

test("grand écran : la liste courte, le premier élément choisi à l'ouverture de « Modifier »", async ({ page }, testInfo) => {
  grandEcranSeulement(testInfo);
  await ouvrirT3(page);
  const liste = listeCourte(page);
  await expect(liste.getByRole("button", { name: "Abba Père", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
});

test("la liste courte : transition, note du chant, tonalité et « orig. », pastilles de structure", async ({ page }) => {
  await ouvrirT3(page);
  const liste = listeCourte(page);
  await expect(liste.getByRole("button", { name: "Transition", exact: true })).toBeVisible();
  await expect(liste).toContainText("Prière, piano doux");
  await expect(liste).toContainText("Piano seul sur le couplet 1.");
  // Tonalité choisie et « orig. » : 一生爱你 en F, gravé en E.
  const yisheng = liste.locator("[data-element]").filter({ hasText: "一生爱你" });
  await expect(yisheng.getByTestId("tonalite")).toHaveText("F");
  await expect(yisheng.getByTestId("tonalite-origine")).toHaveText("orig. E");
  // Pastilles de structure d'Abba Père : I C1 R Pm C2 P.
  await expect(liste.locator("[data-element]").first().locator("[data-pastille]")).toHaveText(["I", "C1", "R", "Pm", "C2", "P"]);
  // Ni « Sélectionner » ni recherche à côté de la liste : elle est courte.
  await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
  await expect(page.getByPlaceholder("Chercher un chant à ajouter…")).toHaveCount(0);
});

test("toucher un chant ouvre ses réglages ; tonalités écrites comme aujourd'hui (FR + 中文)", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page);
  await choisirTonalite(page, "Abba Père", "B");
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();
  await reglerElement(page, "一生爱你");
  await expect(volet(page).getByRole("heading", { name: "2 · 一生爱你" })).toBeVisible();
  if (deuxColonnesAttendues(testInfo)) {
    await expect(listeCourte(page).getByRole("button", { name: "一生爱你", exact: true })).toHaveAttribute("aria-current", "true");
  }
  // Retour à la tonalité d'origine : `keyOverride: null`.
  await choisirTonalite(page, "一生爱你", null);
  await expect.poll(() => itemsEnBase(db).map((i) => i.keyOverride), { timeout: 10_000 }).toEqual(["B", null, null, null]);
});

test("structure en pastilles — retirer, ajouter, Dernière phrase ; note de section ; note du chant", async ({ page }) => {
  const db = await ouvrirT3(page);
  await reglerElement(page, "Abba Père");
  await retirerSection(page, "Pont");
  await volet(page).getByRole("button", { name: "Refrain", exact: true }).click();
  await ligneSection(volet(page), "Refrain").first().getByTitle("Note").click();
  await page.keyboard.type("Tout doux");
  const note = await champNoteDuChant(page, "Abba Père");
  await note.fill("Piano seul.");

  await expect
    .poll(() => {
      const abba = itemsEnBase(db)[0];
      return abba ? { etapes: etapes(abba), notes: abba.notes, sections: Object.values(abba.sectionNotes ?? {}) } : null;
    }, { timeout: 10_000 })
    .toEqual({
      etapes: ["intro-1", "verse-2", "chorus-3", "intro-4", "verse-5", "chorus-3"],
      notes: "Piano seul.",
      sections: ["Tout doux"],
    });

  // La Dernière phrase s'ouvre par-dessus (feuille imbriquée sur petits écrans).
  await volet(page).getByRole("button", { name: "Dernière phrase", exact: true }).click();
  await page.getByRole("dialog", { name: "Dernière phrase (Dp)" }).getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(volet(page).getByText("Dernière phrase – R", { exact: true })).toBeVisible();
  await expect
    .poll(() => (itemsEnBase(db)[0]?.structureOverride ?? []).at(-1) ?? "", { timeout: 10_000 })
    .toMatch(/^Dp-/);
});

test("chant à scan, interrupteur Partition 简谱 / Paroles ; les accords retouchés restent", async ({ page }) => {
  const db = await ouvrirT3(page);
  await reglerElement(page, SCAN);
  const choix = volet(page).getByRole("radiogroup", { name: "Jouer sur" });
  await expect(choix.getByRole("radio", { name: "Partition 简谱" })).toBeChecked();
  await choix.getByRole("radio", { name: "Paroles" }).click();
  await expect.poll(() => itemsEnBase(db)[3]?.jianpuSheet ?? null, { timeout: 10_000 }).toBeFalsy();
  expect(itemsEnBase(db)[3].jianpuChords).toEqual(RETOUCHES);
  // Un chant sans scan n'a pas l'interrupteur.
  await reglerElement(page, "Abba Père");
  await expect(volet(page).getByRole("radiogroup", { name: "Jouer sur" })).toHaveCount(0);
});

test("une transition se règle dans le volet (texte, « Retirer ») ; « + Transition » en ajoute une, ouverte", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page);
  await reglerElement(page, "Transition");
  const texte = volet(page).getByLabel("Texte de la transition");
  await expect(texte).toHaveValue("Prière, piano doux");
  await texte.fill("Prière de la présidence");
  await expect.poll(() => itemsEnBase(db)[1]?.transitionText, { timeout: 10_000 }).toBe("Prière de la présidence");

  // « + Transition » en ajoute une à la fin, ses réglages ouverts.
  await fermerFeuille(page);
  await boutonPlusTransition(page).click();
  await expect(listeCourte(page).locator("[data-element]")).toHaveCount(5);
  await expect(volet(page).getByLabel("Texte de la transition")).toHaveValue("");
  if (deuxColonnesAttendues(testInfo)) {
    await expect(listeCourte(page).getByRole("button", { name: "Transition", exact: true }).last()).toHaveAttribute("aria-current", "true");
  }
  await volet(page).getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(listeCourte(page).locator("[data-element]")).toHaveCount(4);
});

test("« Retirer » un chant : grand écran, le suivant est choisi ; petits écrans, la feuille se ferme", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page);
  await retirerChant(page, "一生爱你");
  await expect.poll(() => itemsEnBase(db).map((i) => i.songSlug), { timeout: 10_000 }).toEqual(["abba-pere", "", SCAN]);
  if (deuxColonnesAttendues(testInfo)) {
    await expect(listeCourte(page).getByRole("button", { name: SCAN, exact: true })).toHaveAttribute("aria-current", "true");
  } else {
    await expect(volet(page)).toHaveCount(0);
    await expect(listeCourte(page).locator("[data-element]")).toHaveCount(3);
  }
});

test("« Voir la partition » ouvre le chant dans un nouvel onglet, dans la tonalité choisie", async ({ page }) => {
  await ouvrirT3(page);
  await reglerElement(page, "一生爱你");
  const lien = volet(page).getByRole("link", { name: /Voir la partition/ });
  await expect(lien).toHaveAttribute("target", "_blank");
  await expect(lien).toHaveAttribute("href", `/songs/${encodeURIComponent("一生爱你")}?key=%22F%22`);
});

test("en-tête compact — titre, catégorie, date, présidence, visibilité, notes écrits comme aujourd'hui", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page);
  await expect(page.getByLabel("Titre")).toHaveValue("Culte Francophone 18/10");
  await expect(page.getByLabel("Catégorie")).toHaveValue("Culte Francophone");
  await expect(page.getByLabel("Date de la présidence")).toHaveValue("2026-10-18");
  if (deuxColonnesAttendues(testInfo)) {
    const colonne = page.locator("[data-colonne-setlist]");
    await expect(colonne.getByRole("link", { name: "Setlists" })).toBeVisible();
    await expect(colonne.getByText("Modifier la setlist")).toBeVisible();
  } else {
    // « ‹ Modifier la setlist » : le retour, puis le nom de la page.
    await expect(page.getByRole("button", { name: "Retour" })).toBeVisible();
    await expect(page.getByText("Modifier la setlist", { exact: true })).toBeVisible();
  }
  await champNotes(page).fill("Thème : la grâce");
  await page.getByLabel("Visibilité").selectOption("privee");
  await expect
    .poll(() => ({ notes: db.doc(SETLIST_DOC)?.notes, prive: db.doc(SETLIST_DOC)?.isPrivate }), { timeout: 10_000 })
    .toEqual({ notes: "Thème : la grâce", prive: true });
  await expect(page.getByRole("button", { name: "Terminé" })).toBeVisible();
});

test("grand écran : création — bibliothèque ouverte d'office, « Publier » à la couleur du culte", async ({ page }, testInfo) => {
  grandEcranSeulement(testInfo);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, MUSICIENNE, {}, `/setlists/new?cat=${encodeURIComponent("Culte Francophone")}&date=2026-10-18`);
  await expect(volet(page).getByRole("heading", { name: "Ajouter des chants" })).toBeVisible();
  await expect(page.getByText("Nouvelle setlist").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Publier" })).toHaveCSS("background-color", "rgb(45, 90, 101)");
  await page.screenshot({ path: testInfo.outputPath(`editeur-creation-${testInfo.project.name}.png`) });
});

test("中文 : l'en-tête et les réglages du chant", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirT3(page);
  await reglerElement(page, "一生爱你");
  await expect(volet(page).getByRole("radiogroup", { name: "一生爱你 的调" })).toBeVisible();
  await expect(volet(page).getByRole("button", { name: "合并", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`editeur-zh-${testInfo.project.name}.png`) });
});

// ─── Tranche T4 : téléphone et tablette en portrait, les feuilles ────────────

test("petits écrans : la liste en grand, la barre du bas (repère, « Ajouter des chants », « Terminé ») ; pas de volet", async ({ page }, testInfo) => {
  petitsEcransSeulement(testInfo);
  await ouvrirT3(page);
  await expect(page.locator("[data-editeur-deux-colonnes]")).toHaveCount(0);
  await expect(volet(page)).toHaveCount(0);
  await expect(page.getByText("Toucher un chant ouvre ses réglages ; la poignée change l'ordre.")).toBeVisible();
  await expect(boutonPlusTransition(page)).toBeVisible();
  // La barre du bas tient dans l'écran, sous la liste.
  const barre = page.locator("[data-barre-editeur]");
  await expect(barre.getByRole("button", { name: "Ajouter des chants" })).toBeVisible();
  await expect(barre.getByRole("button", { name: "Terminé" })).toBeVisible();
  const vue = page.viewportSize()!;
  const b = (await barre.boundingBox())!;
  expect(Math.round(b.y + b.height)).toBe(vue.height);
  expect(Math.round(b.width)).toBe(vue.width);
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largeur, "pas de défilement horizontal").toBeLessThanOrEqual(vue.width);
  await page.screenshot({ path: testInfo.outputPath(`feuilles-liste-${testInfo.project.name}.png`) });
});

test("petits écrans : toucher un chant ouvre sa feuille titrée ; « OK » la ferme et rend le focus à la ligne ; Échap aussi", async ({ page }, testInfo) => {
  petitsEcransSeulement(testInfo);
  await ouvrirT3(page);
  const ligne = listeCourte(page).getByRole("button", { name: "Abba Père", exact: true });
  await ligne.click();
  const feuille = page.getByRole("dialog", { name: "1 · Abba Père" });
  await expect(feuille).toBeVisible();
  await expect(feuille).toHaveAttribute("data-volet");
  await expect(groupeTonalites(feuille, "Abba Père").getByRole("radio")).toHaveCount(12);
  await expect(feuille.getByRole("button", { name: "Fusionner", exact: true })).toBeVisible();
  // Le focus est dans la feuille.
  await expect.poll(() => feuille.evaluate((f) => f.contains(document.activeElement))).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath(`feuilles-reglages-${testInfo.project.name}.png`) });

  await feuille.getByRole("button", { name: "OK", exact: true }).click();
  await expect(volet(page)).toHaveCount(0);
  await expect(ligne).toBeFocused();

  await listeCourte(page).getByRole("button", { name: "一生爱你", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "2 · 一生爱你" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(volet(page)).toHaveCount(0);
  await expect(listeCourte(page).getByRole("button", { name: "一生爱你", exact: true })).toBeFocused();
});

test("petits écrans : création — rien d'ouvert d'office, « Publier » à la couleur du culte dans la barre du bas", async ({ page }, testInfo) => {
  petitsEcransSeulement(testInfo);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, MUSICIENNE, {}, `/setlists/new?cat=${encodeURIComponent("Culte Francophone")}&date=2026-10-18`);
  const barre = page.locator("[data-barre-editeur]");
  await expect(barre.getByRole("button", { name: "Publier" })).toHaveCSS("background-color", "rgb(45, 90, 101)");
  await expect(volet(page)).toHaveCount(0);
  await expect(page.getByText("Nouvelle setlist", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`feuilles-creation-${testInfo.project.name}.png`) });
});
