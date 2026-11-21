import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { basculerMode, choisirDestination } from "./helpers/menuSetlist";
import { ouvrirPartitions } from "./helpers/setlist";

// Un passage ou tous, tranche UP-4 (docs/spec-ma-partition.md, « Un passage ou tous ») : avec l'ordre « Une fois
// chacune », la feuille du Crayon montre le plan en pastilles et demande pour quel passage ; le passage retouché seul
// s'affiche sous sa section d'origine avec sa note, et sa pastille de structure le marque. Base simulée ; noms fictifs.

const SOLENE: FakeProfile = {
  uid: "uid-solene",
  email: "solene.marchetti@example.invalid",
  firstName: "Solène",
  lastName: "Marchetti",
  planningName: "Solène M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const ZH = readFileSync("content/songs/一生爱你.cho", "utf8");
const STRUCT_ABBA = ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-5-3", "chorus-3-4"];
const STRUCT_ZH = ["intro-1-0", "verse-2-1", "chorus-3-2", "chorus-3-3"];
const SETLIST_ID = "setlist-passage-unique";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const STRUCT_SETLIST = ["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-3-3"];

const maPartition = (slug: string, base: string, structure: string[], extra: Record<string, unknown> = {}) => ({
  [`partitions/${SOLENE.uid}__${slug}`]: {
    slug, ownerUid: SOLENE.uid, ownerName: "Solène M.", base, content: null, structure, key: null,
    traits: [], sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"), ...extra,
  },
});
const setlist = (ownerId = "uid-autre") => ({
  title: "Culte du 5 décembre",
  leader: "Solène M.",
  category: "Culte Francophone",
  date: "2026-12-05",
  language: "mixed",
  notes: "",
  ownerId,
  isPrivate: false,
  items: [
    { songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: STRUCT_SETLIST, sectionNotes: {}, notes: "" },
  ],
});

const ordre = (page: Page, valeur: "played" | "unique" | "structure") =>
  page.addInitScript((v) => {
    localStorage.setItem("partition-layout", v);
    localStorage.setItem("partition-layout-uid-solene", v);
  }, valeur);
const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
const enParoles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
const feuille = (page: Page) => page.getByRole("dialog").first();
const section = (page: Page, uid: string) => page.locator(`[data-section-uids~="${uid}"]`).first();
const uidsAffiches = (page: Page) => page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section-uids")));
const sansGoogle = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function pagechant(page: Page, slug: string, docs: Record<string, Record<string, unknown>>) {
  await sansAide(page);
  await sansGoogle(page);
  const db = await signInAs(page, SOLENE, docs, `/songs/${encodeURIComponent(slug)}`);
  await page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first().click();
  return db;
}
async function pageSetlist(page: Page, ordreChoisi: "played" | "unique" | "structure" = "unique", ownerId = "uid-autre") {
  await ordre(page, ordreChoisi);
  await sansGoogle(page);
  const db = await signInAs(page, SOLENE, { [SETLIST_DOC]: setlist(ownerId) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  await basculerMode(page, "Crayon");
  return db;
}
const retoucherParoles = async (page: Page, ancien: string, nouveau: string) => {
  await page.getByRole("button", { name: "Modifier les paroles" }).click();
  const champ = feuille(page).locator("textarea");
  await champ.fill((await champ.inputValue()).replace(ancien, nouveau));
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
};
/** Touche la ligne, choisit le passage (rang dans la structure), change l'accord `de` en `vers`, valide la feuille. */
async function retoucherAccord(page: Page, bouton: Locator, passage: number, de: string, vers: string) {
  await bouton.click();
  await pastilles(page).nth(passage).click();
  await feuille(page).getByRole("button", { name: de, exact: true }).first().click();
  await feuille(page).getByRole("button", { name: vers, exact: true }).last().click();
  await feuille(page).getByRole("button", { name: "♮", exact: true }).click();
  await feuille(page).getByRole("button", { name: "maj", exact: true }).click();
  await feuille(page).getByRole("button", { name: "Valider l'accord" }).click();
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
}
const valider = (page: Page) => feuille(page).getByRole("button", { name: "Valider", exact: true });
const pastilles = (page: Page) => feuille(page).locator("[data-passage-pastille]");

test("page chant, « Une fois chacune » : la feuille montre le plan, rien n'est choisi, le 2e refrain devient une section à part", async ({ page }) => {
  await ordre(page, "unique");
  const db = await pagechant(page, "abba-pere", maPartition("abba-pere", ABBA, STRUCT_ABBA));
  await section(page, "chorus-3-4").getByRole("button").filter({ hasText: "Abba" }).first().click();

  await expect(feuille(page).locator("[data-passage-choix]")).toBeVisible();
  await expect(feuille(page).getByRole("button", { name: "Seulement ce passage" })).toHaveCount(0);
  await expect(pastilles(page)).toHaveCount(5);
  await expect(pastilles(page).nth(2)).toBeEnabled();
  await expect(pastilles(page).nth(4)).toBeEnabled();
  for (const i of [0, 1, 3]) await expect(pastilles(page).nth(i), "autre section : grisée").toBeDisabled();
  await expect(pastilles(page).nth(2)).toHaveAttribute("aria-pressed", "false");
  await expect(pastilles(page).nth(4)).toHaveAttribute("aria-pressed", "false");
  await expect(feuille(page).locator("[data-passage-toutes]")).toHaveAttribute("aria-pressed", "false");
  await expect(valider(page), "rien n'est choisi : pas d'enregistrement").toBeDisabled();
  await expect(feuille(page).locator("[data-passage-aide]")).toBeVisible();

  await pastilles(page).nth(4).click();
  await expect(valider(page)).toBeEnabled();
  await retoucherParoles(page, "Abba", "Papa");

  // La copie se place juste sous le refrain, avec sa note ; la section normale garde l'ancien texte.
  await expect(page.locator("[data-passage-note]")).toHaveText("Refrain · 2ᵉ fois");
  const uids = await uidsAffiches(page);
  expect(uids).toEqual(["intro-1-0", "verse-2-1", "chorus-3-2", expect.stringMatching(/^chorus-\d+-4$/), "verse-5-3"]);
  await expect(section(page, "chorus-3-2")).not.toContainText("Papa");
  await expect(page.locator("[data-copy-line]", { hasText: "Papa" })).toHaveCount(1);
  await expect(page.locator("[data-passage-retouche]")).toHaveCount(1);
  await expect(page.locator("[data-passage-retouche]")).toHaveAttribute("aria-label", "Refrain · 2ᵉ fois, retouché seul");
  // La pastille garde l'abréviation du refrain.
  await expect(page.getByRole("list", { name: "Structure" }).first().locator("li").nth(4).locator("abbr")).toHaveText("R");

  const ecrit = db.doc(`partitions/${SOLENE.uid}__abba-pere`)!;
  expect(ecrit.structure).toEqual(["intro-1-0", "verse-2-1", "chorus-3-2", "verse-5-3", expect.stringMatching(/^chorus-\d+-4$/)]);
  expect(Object.values(ecrit.sectionOrigins as Record<string, string>)).toEqual(["chorus-3"]);
});

test("page chant, « Une fois chacune » : « Toutes les répétitions » ne copie rien", async ({ page }) => {
  await ordre(page, "unique");
  const db = await pagechant(page, "abba-pere", maPartition("abba-pere", ABBA, STRUCT_ABBA));
  await section(page, "chorus-3-2").getByRole("button").filter({ hasText: "Abba" }).first().click();
  await feuille(page).locator("[data-passage-toutes]").click();
  await expect(valider(page)).toBeEnabled();
  await retoucherParoles(page, "Abba", "Papa");

  await expect(page.locator("[data-copy-line]", { hasText: "Papa" })).toHaveCount(1);
  await expect(page.locator("[data-passage-note]")).toHaveCount(0);
  await expect(page.locator("[data-passage-retouche]")).toHaveCount(0);
  const ecrit = db.doc(`partitions/${SOLENE.uid}__abba-pere`)!;
  expect(ecrit.structure).toEqual(STRUCT_ABBA);
  const source = String(ecrit.content);
  expect(source).toContain("Papa [D]Père");
  expect(source.split("Papa [D]Père").length - 1, "la ligne change une fois, dans le refrain commun aux deux passages").toBe(1);
  expect(source.split("{start_of_chorus").length, "aucune copie de section").toBe(ABBA.split("{start_of_chorus").length);
  expect(ecrit.sectionOrigins ?? {}).toEqual({});
});

test("page setlist (pour moi), « Une fois chacune » : le passage choisi devient une section à part sous le refrain", async ({ page }) => {
  const db = await pageSetlist(page);
  await page.locator('[data-outline-item="1"]').locator('[data-section-uids~="chorus-3-3"]').getByRole("button").filter({ hasText: "Abba" }).first().click();
  await expect(feuille(page).locator("[data-passage-choix]")).toBeVisible();
  await expect(pastilles(page)).toHaveCount(4);
  await expect(valider(page)).toBeDisabled();
  await pastilles(page).nth(3).click();
  await retoucherParoles(page, "Abba", "Papa");

  await expect(page.locator("[data-passage-note]")).toHaveText("Refrain · 2ᵉ fois");
  expect(await uidsAffiches(page)).toEqual(["verse-2-0", "chorus-3-1", expect.stringMatching(/^chorus-\d+-3$/), "verse-5-2"]);
  await expect(page.locator('[data-outline-item="1"] [data-passage-retouche]')).toHaveCount(1);
  await expect(page.locator("[data-copy-line]", { hasText: "Papa" })).toHaveCount(1);
  const ecrit = db.doc(`partitions/${SOLENE.uid}__abba-pere`)!;
  expect(ecrit.structure).toEqual(["verse-2-0", "chorus-3-1", "verse-5-2", expect.stringMatching(/^chorus-\d+-3$/)]);
  expect(Object.values(ecrit.sectionOrigins as Record<string, string>)).toEqual(["chorus-3"]);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC), "la setlist ne bouge pas").toHaveLength(0);
});

test("page setlist (pour moi), « Une fois chacune » : « Toutes les répétitions » ne copie rien", async ({ page }) => {
  const db = await pageSetlist(page);
  await page.locator('[data-outline-item="1"]').locator('[data-section-uids~="chorus-3-1"]').getByRole("button").filter({ hasText: "Abba" }).first().click();
  await feuille(page).locator("[data-passage-toutes]").click();
  await retoucherParoles(page, "Abba", "Papa");
  await expect(page.locator("[data-passage-note]")).toHaveCount(0);
  const ecrit = db.doc(`partitions/${SOLENE.uid}__abba-pere`)!;
  const source = String(ecrit.content);
  expect(source).toContain("Papa [D]Père");
  expect(source.split("Papa [D]Père").length - 1, "la ligne change une fois, dans le refrain commun aux deux passages").toBe(1);
  expect(source.split("{start_of_chorus").length, "aucune copie de section").toBe(ABBA.split("{start_of_chorus").length);
  expect(ecrit.structure ?? null).toBeNull();
});

test("page chant ZH (paroles), « Une fois chacune » : un passage retouché seul, sous le refrain, avec sa note", async ({ page }) => {
  await enParoles(page);
  await ordre(page, "unique");
  const db = await pagechant(page, "一生爱你", maPartition("一生爱你", ZH, STRUCT_ZH));
  await section(page, "chorus-3-3").getByRole("button").filter({ hasText: "敬" }).first().click();
  await expect(pastilles(page)).toHaveCount(4);
  await expect(valider(page)).toBeDisabled();
  await pastilles(page).nth(3).click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();

  await expect(page.locator("[data-passage-note]")).toContainText("· 2ᵉ fois");
  expect(await uidsAffiches(page)).toEqual(["intro-1-0", "verse-2-1", "chorus-3-2", expect.stringMatching(/^chorus-\d+-3$/)]);
  await expect(section(page, "chorus-3-2")).toContainText("敬");
  await expect(page.locator("[data-passage-retouche]")).toHaveCount(1);
  const ecrit = db.doc(`partitions/${SOLENE.uid}__一生爱你`)!;
  expect(Object.values(ecrit.sectionOrigins as Record<string, string>)).toEqual(["chorus-3"]);
});

test("ordre « Tout le chant » : la feuille garde « Seulement ce passage | Toutes » (page chant)", async ({ page }) => {
  await ordre(page, "played");
  await pagechant(page, "abba-pere", maPartition("abba-pere", ABBA, STRUCT_ABBA));
  await section(page, "chorus-3-4").getByRole("button").filter({ hasText: "Abba" }).first().click();
  await expect(feuille(page).locator("[data-passage-choix]")).toHaveCount(0);
  await expect(feuille(page).getByRole("button", { name: "Seulement ce passage" })).toHaveAttribute("aria-pressed", "true");
  await expect(feuille(page).getByRole("button", { name: "Toutes les répétitions" })).toHaveAttribute("aria-pressed", "false");
});

test("ordre « Tout le chant », page setlist : la feuille garde « Seulement ce passage | Toutes »", async ({ page }) => {
  await pageSetlist(page, "played");
  await page.locator('[data-outline-item="1"]').locator('[data-section-uids="chorus-3-3"]').getByRole("button").filter({ hasText: "Abba" }).first().click();
  await expect(feuille(page).locator("[data-passage-choix]")).toHaveCount(0);
  await expect(feuille(page).getByRole("button", { name: "Seulement ce passage" })).toHaveAttribute("aria-pressed", "true");
});

// Un passage retouché seul déjà écrit : la copie est en fin de source (`chorus-7`), l'origine est `chorus-3`.
// Son libellé propre (« Pont ») diffère de celui du refrain : la pastille doit garder l'abréviation de l'origine.
const ABBA_COPIE = `${ABBA}\n{start_of_chorus: Pont}\nAbba [D]Papa, je suis à To[A]i,\n{end_of_chorus}\n`;
const STRUCT_COPIE = ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-5-3", "chorus-7-4"];
for (const choix of ["played", "unique", "structure"] as const) {
  test(`page chant, ordre « ${choix} » : la pastille du passage retouché seul porte son repère, la copie garde l'abréviation de l'origine (R)`, async ({ page }) => {
    await ordre(page, choix);
    await pagechant(page, "abba-pere", maPartition("abba-pere", ABBA, STRUCT_COPIE, { content: ABBA_COPIE, sectionOrigins: { "chorus-7": "chorus-3" } }));
    const repere = page.locator("[data-passage-retouche]");
    await expect(repere).toHaveCount(1);
    await expect(repere).toHaveAttribute("aria-label", "Refrain · 2ᵉ fois, retouché seul");
    await expect(page.getByRole("list", { name: "Structure" }).first().locator("li").nth(4).locator("abbr")).toHaveText("R");
    if (choix === "structure") {
      // « Plan » : aucune ligne affichée, rien à toucher au Crayon.
      await expect(page.locator("[data-section]")).toHaveCount(0);
      await expect(page.locator("[data-copy-line]")).toHaveCount(0);
    }
    if (choix === "unique") {
      expect(await uidsAffiches(page)).toEqual(["intro-1-0", "verse-2-1", "chorus-3-2", "chorus-7-4", "verse-5-3"]);
      await expect(page.locator("[data-passage-note]")).toHaveText("Refrain · 2ᵉ fois");
    }
  });
}

test("page chant, « Une fois chacune » : un accord retouché au 2e passage du refrain va dans la copie, la section normale garde l'ancien", async ({ page }) => {
  await ordre(page, "unique");
  const db = await pagechant(page, "abba-pere", maPartition("abba-pere", ABBA, STRUCT_ABBA));
  await retoucherAccord(page, section(page, "chorus-3-2").getByRole("button").filter({ hasText: "je suis à To" }).first(), 4, "D", "G");

  await expect(page.locator("[data-passage-note]")).toHaveText("Refrain · 2ᵉ fois");
  const uids = await uidsAffiches(page);
  expect(uids).toEqual(["intro-1-0", "verse-2-1", "chorus-3-2", expect.stringMatching(/^chorus-\d+-4$/), "verse-5-3"]);
  const ecrit = db.doc(`partitions/${SOLENE.uid}__abba-pere`)!;
  const source = String(ecrit.content);
  expect(source.split("Abba [G]Père").length - 1, "un seul accord changé, dans la copie").toBe(1);
  expect(source.split("Abba [D]Père").length - 1, "le refrain d'origine garde son accord").toBeGreaterThanOrEqual(3);
  expect(source.indexOf("Abba [G]Père"), "la copie est en fin de source").toBeGreaterThan(source.indexOf("{end_of_chorus}"));
  expect(Object.values(ecrit.sectionOrigins as Record<string, string>)).toEqual(["chorus-3"]);
  await expect(page.locator("[data-passage-retouche]")).toHaveCount(1);
});

test("page setlist, « Une fois chacune », « Pour tout le culte » : le passage choisi est copié dans la setlist, pas dans ma partition", async ({ page }) => {
  const db = await pageSetlist(page, "unique", SOLENE.uid);
  const sectionRefrain = page.locator('[data-outline-item="1"]').locator('[data-section-uids~="chorus-3-1"]');
  await sectionRefrain.getByRole("button").filter({ hasText: "Abba" }).first().click();
  await pastilles(page).nth(3).click();
  await retoucherParoles(page, "Abba", "Papa");
  await choisirDestination(page, "culte");

  type Entree = { contentOverride?: string; structureOverride?: string[] };
  const items = () => (db.doc(SETLIST_DOC)!.items as Entree[]);
  await expect.poll(() => String(items()[0].contentOverride)).toContain("Papa");
  expect(items()[0].structureOverride).toHaveLength(4);
  expect(items()[0].structureOverride![3], "le 2e passage pointe vers la copie").not.toBe("chorus-3-3");
  expect(db.doc(`partitions/${SOLENE.uid}__abba-pere`), "ma partition ne bouge pas").toBeUndefined();
});
