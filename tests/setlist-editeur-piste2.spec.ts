import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import {
  champNoteDuChant,
  champNotes,
  choisirTonalite,
  deuxColonnesAttendues,
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
// La mise en page en deux colonnes et les feuilles viennent en T3 et T4.

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
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
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

// ─── Tranche T3 : piste 2 sur ordinateur et tablette en paysage ──────────────
// En-tête compact, liste courte à gauche, réglages de l'élément choisi à droite
// (chant, transition, fusion). Téléphone et tablette en portrait gardent la page
// d'aujourd'hui jusqu'à T4 : ces tests ne valent que pour les grands écrans.

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

async function ouvrirT3(page: Page, testInfo: TestInfo, doc: Record<string, unknown> = SETLIST_T3) {
  test.skip(!deuxColonnesAttendues(testInfo), "grand écran seulement : la page d'aujourd'hui reste jusqu'à T4");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: doc }, `/setlists/${SETLIST_ID}/edit`);
  await expect(page.locator("[data-editeur-deux-colonnes]")).toBeVisible();
  return db;
}

const itemsEnBase = (db: FakeDb) => (db.doc(SETLIST_DOC)?.items ?? []) as SetlistItem[];
const etapes = (it: SetlistItem) => (it.structureOverride ?? []).map((u) => u.replace(/-\d+$/, ""));

test("grand écran : deux colonnes — setlist de 400 à 520 px, volet d'au moins 610 px, 12 tonalités sur une ligne", async ({ page }, testInfo) => {
  await ouvrirT3(page, testInfo);
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
  await ouvrirT3(page, testInfo);
  const liste = listeCourte(page);
  await expect(liste.getByRole("button", { name: "Abba Père", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(liste.getByRole("button", { name: "Transition", exact: true })).toBeVisible();
  await expect(liste).toContainText("Prière, piano doux");
  await expect(liste).toContainText("Piano seul sur le couplet 1.");
  // Tonalité choisie et « orig. » : 一生爱你 en F, gravé en E.
  const yisheng = liste.locator("[data-element]").filter({ hasText: "一生爱你" });
  await expect(yisheng.getByTestId("tonalite")).toHaveText("F");
  await expect(yisheng.getByTestId("tonalite-origine")).toHaveText("orig. E");
  // Pastilles de structure d'Abba Père : I C1 R Pm C2 P.
  await expect(liste.locator("[data-element]").first().locator("[data-pastille]")).toHaveText(["I", "C1", "R", "Pm", "C2", "P"]);
  await expect(volet(page).getByRole("heading", { name: "1 · Abba Père" })).toBeVisible();
  // Ni « Sélectionner » ni recherche dans la colonne : la liste est courte.
  await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
});

test("grand écran : toucher un chant ouvre ses réglages ; tonalités écrites comme aujourd'hui (FR + 中文)", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
  await choisirTonalite(page, "Abba Père", "B");
  await expect(listeCourte(page).getByRole("button", { name: "Abba Père", exact: true })).toHaveAttribute("aria-current", "true");
  await reglerElement(page, "一生爱你");
  await expect(listeCourte(page).getByRole("button", { name: "一生爱你", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(volet(page).getByRole("heading", { name: "2 · 一生爱你" })).toBeVisible();
  // Retour à la tonalité d'origine : `keyOverride: null`.
  await choisirTonalite(page, "一生爱你", null);
  await expect.poll(() => itemsEnBase(db).map((i) => i.keyOverride), { timeout: 10_000 }).toEqual(["B", null, null, null]);
});

test("grand écran : structure en pastilles — retirer, ajouter, Dernière phrase ; note de section ; note du chant", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
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

  await volet(page).getByRole("button", { name: "Dernière phrase", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(volet(page).getByText("Dernière phrase – R", { exact: true })).toBeVisible();
  await expect
    .poll(() => (itemsEnBase(db)[0]?.structureOverride ?? []).at(-1) ?? "", { timeout: 10_000 })
    .toMatch(/^Dp-/);
});

test("grand écran : chant à scan, interrupteur Partition 简谱 / Paroles ; les accords retouchés restent", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
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

test("grand écran : une transition se règle dans le volet (texte, « Retirer »)", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
  await reglerElement(page, "Transition");
  const texte = volet(page).getByLabel("Texte de la transition");
  await expect(texte).toHaveValue("Prière, piano doux");
  await texte.fill("Prière de la présidence");
  await expect.poll(() => itemsEnBase(db)[1]?.transitionText, { timeout: 10_000 }).toBe("Prière de la présidence");

  // « + Transition » en ajoute une à la fin, choisie.
  await page.locator("[data-colonne-setlist]").getByRole("button", { name: "Transition", exact: true }).last().click();
  await expect(listeCourte(page).getByRole("button", { name: "Transition", exact: true })).toHaveCount(2);
  await expect(listeCourte(page).getByRole("button", { name: "Transition", exact: true }).last()).toHaveAttribute("aria-current", "true");
  await volet(page).getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(listeCourte(page).getByRole("button", { name: "Transition", exact: true })).toHaveCount(1);
});

test("grand écran : « Retirer » un chant ; le suivant est choisi", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
  await retirerChant(page, "一生爱你");
  await expect.poll(() => itemsEnBase(db).map((i) => i.songSlug), { timeout: 10_000 }).toEqual(["abba-pere", "", SCAN]);
  await expect(listeCourte(page).getByRole("button", { name: SCAN, exact: true })).toHaveAttribute("aria-current", "true");
});

test("grand écran : « Voir la partition » ouvre le chant dans un nouvel onglet, dans la tonalité choisie", async ({ page }, testInfo) => {
  await ouvrirT3(page, testInfo);
  await reglerElement(page, "一生爱你");
  const lien = volet(page).getByRole("link", { name: /Voir la partition/ });
  await expect(lien).toHaveAttribute("target", "_blank");
  await expect(lien).toHaveAttribute("href", `/songs/${encodeURIComponent("一生爱你")}?key=%22F%22`);
});

test("grand écran : en-tête compact — titre, catégorie, date, présidence, visibilité, notes écrits comme aujourd'hui", async ({ page }, testInfo) => {
  const db = await ouvrirT3(page, testInfo);
  await expect(page.getByLabel("Titre")).toHaveValue("Culte Francophone 18/10");
  await expect(page.getByLabel("Catégorie")).toHaveValue("Culte Francophone");
  await expect(page.getByLabel("Date de la présidence")).toHaveValue("2026-10-18");
  const colonne = page.locator("[data-colonne-setlist]");
  await expect(colonne.getByRole("link", { name: "Setlists" })).toBeVisible();
  await expect(colonne.getByText("Modifier la setlist")).toBeVisible();
  await champNotes(page).fill("Thème : la grâce");
  await page.getByLabel("Visibilité").selectOption("privee");
  await expect
    .poll(() => ({ notes: db.doc(SETLIST_DOC)?.notes, prive: db.doc(SETLIST_DOC)?.isPrivate }), { timeout: 10_000 })
    .toEqual({ notes: "Thème : la grâce", prive: true });
  await expect(page.getByRole("button", { name: "Terminé" })).toBeVisible();
});

test("grand écran : création — bibliothèque ouverte d'office, « Publier » à la couleur du culte", async ({ page }, testInfo) => {
  test.skip(!deuxColonnesAttendues(testInfo), "grand écran seulement : la page d'aujourd'hui reste jusqu'à T4");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, MUSICIENNE, {}, `/setlists/new?cat=${encodeURIComponent("Culte Francophone")}&date=2026-10-18`);
  await expect(volet(page).getByRole("heading", { name: "Ajouter des chants" })).toBeVisible();
  await expect(page.getByText("Nouvelle setlist").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Publier" })).toHaveCSS("background-color", "rgb(45, 90, 101)");
  await page.screenshot({ path: testInfo.outputPath(`editeur-creation-${testInfo.project.name}.png`) });
});

test("grand écran, 中文 : l'en-tête et les réglages du chant", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirT3(page, testInfo);
  await reglerElement(page, "一生爱你");
  await expect(volet(page).getByRole("radiogroup", { name: "一生爱你 的调" })).toBeVisible();
  await expect(volet(page).getByRole("button", { name: "合并", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`editeur-zh-${testInfo.project.name}.png`) });
});
