import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, lireCompteur } from "./helpers/louange";

// Un passage ou tous, tranche UP-7 (docs/spec-ma-partition.md) : en mode louange, un passage retouché seul au Crayon
// (section copiée, `sectionOrigins`) porte « Refrain · 2ᵉ fois » en « Une fois chacune », se place sous son origine, et sa
// pastille de la rangée de structure porte le badge « retouché seul » dans les trois ordres. Base simulée ; noms fictifs.

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
const ABBA_COPIE = `${ABBA}\n{start_of_chorus: Pont}\nAbba [D]Papa, je suis à To[A]i,\n{end_of_chorus}\n`;
const ZH_COPIE = `${ZH}\n{start_of_chorus: Pont}\n[D]我 愿 一 生 爱 你\n{end_of_chorus}\n`;
const SETLIST_ID = "setlist-louange-passage-unique";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

const maPartition = (slug: string, base: string, structure: string[], extra: Record<string, unknown> = {}) => ({
  [`partitions/${SOLENE.uid}__${slug}`]: {
    slug, ownerUid: SOLENE.uid, ownerName: "Solène M.", base, content: null, structure, key: null,
    traits: [], sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"), ...extra,
  },
});
const setlist = (slug: string, structureOverride: string[]) => ({
  title: "Culte du 5 décembre",
  leader: "Solène M.",
  category: "Culte Francophone",
  date: "2026-12-05",
  language: "mixed",
  notes: "",
  ownerId: "uid-autre",
  isPrivate: false,
  items: [
    { songSlug: slug, position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride, sectionNotes: {}, notes: "" },
  ],
});

const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);
const bandeau = (page: Page) => onStage(page, "[data-entete-chant]").getByRole("list", { name: "Structure" }).first();

async function ouvrir(
  page: Page,
  slug: string,
  affichage: "played" | "unique" | "structure",
  structSetlist: string[],
  partition: Record<string, Record<string, unknown>> | null,
) {
  await page.addInitScript((a) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("partition-layout", a);
    localStorage.setItem("partition-layout-uid-solene", a);
    localStorage.setItem("jianpu-sheet-pref", "never");
    localStorage.setItem("accords-aide-vue", "1");
  }, affichage);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, SOLENE, { [SETLIST_DOC]: setlist(slug, structSetlist), ...(partition ?? {}) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/);
}

/** Lit `lecture` sur chaque page affichée, de la première à la dernière. */
async function surToutesLesPages<T>(page: Page, lecture: () => Promise<T[]>): Promise<T[]> {
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const out: T[] = [];
  // Les lectures s'enchaînent : retour à la première page avant de parcourir.
  for (let i = 1; i < total; i++) await page.keyboard.press("ArrowLeft");
  for (let p = 1; p <= total; p++) {
    await attendreCompteur(page, `${p} / ${total}`);
    out.push(...(await lecture()));
    await page.keyboard.press("ArrowRight");
  }
  return out;
}

const STRUCT_SETLIST = ["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-3-3"];
const STRUCT_MIENNE = ["verse-2-0", "chorus-3-1", "verse-5-2", "chorus-7-3"];
const avecCopie = maPartition("abba-pere", ABBA, STRUCT_MIENNE, { content: ABBA_COPIE, sectionOrigins: { "chorus-7": "chorus-3" } });

test("« Une fois chacune » : la copie porte « Refrain · 2ᵉ fois », sous son refrain, et le bandeau la marque (FR)", async ({ page }) => {
  await ouvrir(page, "abba-pere", "unique", STRUCT_SETLIST, avecCopie);
  await expect(bandeau(page).locator("[data-passage-retouche]")).toHaveCount(1);
  await expect(bandeau(page).locator("li").nth(3).locator("[data-passage-retouche]")).toHaveCount(1);
  await expect(bandeau(page).locator("li").nth(3).locator("abbr")).toHaveText("R");
  const uids = await surToutesLesPages(page, () => onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section-uids"))));
  expect(uids).toEqual(["verse-2-0", "chorus-3-1", expect.stringMatching(/^chorus-7/), "verse-5-2"]);
  const notes = await surToutesLesPages(page, () => onStage(page, "[data-passage-note]").allTextContents());
  expect(notes).toEqual(["Refrain · 2ᵉ fois"]);
  // Aucun nom de carte ne replie la copie avec son refrain (« Refrain ×2 », SongView).
  const noms = await surToutesLesPages(page, () => onStage(page, "[data-section]").allTextContents());
  expect(noms.join(" ")).not.toContain("×2");
});

test("ordre joué : aucune note sur la carte, mais la pastille de la copie porte le badge (FR)", async ({ page }) => {
  await ouvrir(page, "abba-pere", "played", STRUCT_SETLIST, avecCopie);
  await expect(bandeau(page).locator("[data-passage-retouche]")).toHaveCount(1);
  await expect(bandeau(page).locator("li").nth(3).locator("[data-passage-retouche]")).toHaveCount(1);
  expect(await surToutesLesPages(page, () => onStage(page, "[data-passage-note]").allTextContents())).toEqual([]);
});

test("« Structure seule » : pas de rangée de structure (feuille de route), donc ni badge ni note (FR)", async ({ page }) => {
  await ouvrir(page, "abba-pere", "structure", STRUCT_SETLIST, avecCopie);
  await expect(onStage(page, "[data-entete-chant]").getByRole("list", { name: "Structure" })).toHaveCount(0);
  await expect(onStage(page, "[data-passage-retouche]")).toHaveCount(0);
  await expect(onStage(page, "[data-passage-note]")).toHaveCount(0);
});

for (const choix of ["unique", "played"] as const) {
  test(`rappel de structure de la page 2 (${choix}) : la pastille de la copie porte le badge (FR)`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
    await ouvrir(page, "abba-pere", choix, STRUCT_SETLIST, avecCopie);
    expect(Number((await lireCompteur(page)).split("/")[1]), "le chant tient sur plusieurs pages").toBeGreaterThan(1);
    await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, /^2 \//);
    const rappel = onStage(page, "[data-rappel]");
    await expect(rappel).toBeVisible();
    await expect(rappel.locator("[data-passage-retouche]")).toHaveCount(1);
    await expect(rappel.locator("li").nth(3).locator("[data-passage-retouche]")).toHaveCount(1);
  });
}

for (const choix of ["played", "unique"] as const) {
  test(`sans copie (${choix}) : aucun badge, aucune note (FR)`, async ({ page }) => {
    await ouvrir(page, "abba-pere", choix, STRUCT_SETLIST, null);
    await expect(onStage(page, "[data-passage-retouche]")).toHaveCount(0);
    expect(await surToutesLesPages(page, () => onStage(page, "[data-passage-note]").allTextContents())).toEqual([]);
  });
}

test("ZH, « Une fois chacune » : la copie du 2ᵉ refrain porte sa note et son badge", async ({ page }) => {
  const part = maPartition("一生爱你", ZH, ["intro-1-0", "verse-2-1", "chorus-3-2", "chorus-4-3"], { content: ZH_COPIE, sectionOrigins: { "chorus-4": "chorus-3" } });
  await ouvrir(page, "一生爱你", "unique", ["intro-1-0", "verse-2-1", "chorus-3-2", "chorus-3-3"], part);
  await expect(bandeau(page).locator("[data-passage-retouche]")).toHaveCount(1);
  await expect(bandeau(page).locator("li").nth(3).locator("[data-passage-retouche]")).toHaveCount(1);
  const notes = await surToutesLesPages(page, () => onStage(page, "[data-passage-note]").allTextContents());
  expect(notes).toEqual(["Refrain · 2ᵉ fois"]);
});
