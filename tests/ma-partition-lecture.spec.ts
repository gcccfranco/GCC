import { readFileSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { fusionner, resoudre } from "../src/lib/partition/fusion";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";

// Ma partition, tranche MP-2 (docs/spec-ma-partition.md, « Lecture » et « Signes ») : la fusion à trois sources (sans
// navigateur), puis le menu « Je lis », les signes et la tonalité dans la page, sur base simulée. Agencement : dans
// SPECS_GRAND_ECRAN. Noms fictifs.

test.describe("fusion à trois sources (sans page)", () => {
  const base = "a\nb\nc\nd\ne";

  test("ligne que j'ai retouchée : gardée", () => {
    const f = fusionner(base, base, "a\nB\nc\nd\ne");
    expect(f.source).toBe("a\nB\nc\nd\ne");
    expect(f.origines).toEqual(["origine", "moi", "origine", "origine", "origine"]);
    expect(f.conflits).toBe(0);
  });

  test("ligne que je n'ai pas touchée : suit la couche du dessous, marquée « culte » si le culte l'a retouchée", () => {
    const f = fusionner(base, "a\nb\nc\nD\ne", "a\nB\nc\nd\ne", base);
    expect(f.source).toBe("a\nB\nc\nD\ne");
    expect(f.origines).toEqual(["origine", "moi", "origine", "culte", "origine"]);
  });

  test("lignes voisines changées chacune d'un côté : pas de conflit", () => {
    const f = fusionner(base, "a\nb\nC\nd\ne", "a\nB\nc\nd\ne");
    expect(f.source).toBe("a\nB\nC\nd\ne");
    expect(f.conflits).toBe(0);
  });

  test("ligne changée des deux côtés : conflit, mes lignes puis celles du chant", () => {
    const f = fusionner(base, "a\nX\nc\nd\ne", "a\nB\nc\nd\ne");
    expect(f.source).toBe("a\nB\nX\nc\nd\ne");
    expect(f.origines).toEqual(["origine", "conflit-moi", "conflit-chant", "origine", "origine", "origine"]);
    expect(f.conflits).toBe(1);
    expect(f.details[1].conflit).toEqual({ index: 0, debut: true });
    // « Garder la mienne » : ma ligne, base = la couche du dessous ; la partition relue n'a plus de conflit.
    const r = resoudre(f, 0, "mienne");
    expect(r).toEqual({ base: "a\nX\nc\nd\ne", content: "a\nB\nc\nd\ne" });
    const apres = fusionner(r.base, "a\nX\nc\nd\ne", r.content);
    expect(apres.conflits).toBe(0);
    expect(apres.origines[1]).toBe("moi");
    // « Prendre celle du chant » : plus aucune retouche sur cette ligne.
    const chant = resoudre(f, 0, "chant");
    expect(chant.content).toBe("a\nX\nc\nd\ne");
    expect(fusionner(chant.base, "a\nX\nc\nd\ne", chant.content).origines).not.toContain("moi");
  });

  test("retouche d'accords ou de paroles", () => {
    const f = fusionner("[C]un\n[C]deux", "[C]un\n[C]deux", "[D]un\n[C]deux autre");
    expect(f.details.map((d) => d.retouche)).toEqual(["accords", "paroles"]);
  });

  test("même changement des deux côtés : pas de conflit", () => {
    const f = fusionner(base, "a\nB\nc\nd\ne", "a\nB\nc\nd\ne");
    expect(f.source).toBe("a\nB\nc\nd\ne");
    expect(f.conflits).toBe(0);
  });

  test("ligne que j'ai supprimée : reste supprimée ; ligne supprimée par le chant : suit", () => {
    expect(fusionner(base, base, "a\nb\nd\ne").source).toBe("a\nb\nd\ne");
    const f = fusionner(base, "a\nb\nc\ne", "a\nB\nc\nd\ne");
    expect(f.source).toBe("a\nB\nc\ne");
    expect(f.conflits).toBe(0);
  });

  test("content null : pas de retouche de texte, on lit la couche du dessous", () => {
    const f = fusionner(base, "a\nX\nc\nd\ne", null, base);
    expect(f.source).toBe("a\nX\nc\nd\ne");
    expect(f.origines).toEqual(["origine", "culte", "origine", "origine", "origine"]);
  });
});

const ELODIE: FakeProfile = {
  uid: "uid-elodie",
  email: "elodie.fabre@example.invalid",
  firstName: "Élodie",
  lastName: "Fabre",
  planningName: "Élodie F.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const MATHIS = { uid: "uid-mathis", name: "Mathis Rey" };

const SETLIST_ID = "setlist-lecture";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
  ...over,
});
const setlist = (items: Record<string, unknown>[]) => ({
  title: "Culte du 22 novembre", leader: "Jonas P.", category: "Culte Francophone", date: "2026-11-22", language: "mixed", notes: "",
  ownerId: ELODIE.uid, isPrivate: false, items,
});
const SETLIST = setlist([item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })]);

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const ZH = readFileSync("content/songs/一生爱你.cho", "utf8");
const MA_LIGNE = ABBA.replace("Saisi par l'i[A]mmensité", "Rempli par l'i[A]mmensité");
const MES_ACCORDS = ABBA.replace("Abba [Bm]Père, je suis émervei", "Abba [Em]Père, je suis émervei");
const CULTE = ABBA.replace("planait sur la", "glissait sur la");
const MON_CONFLIT = ABBA.replace("planait sur la", "flottait sur la");
const MON_ZH = ZH.replace("宝", "寶");

const docPartition = (slug: string, base: string | null, content: string | null, extra: Record<string, unknown> = {}, owner = { uid: ELODIE.uid, name: "Élodie F." }) => [
  `partitions/${owner.uid}__${slug}`,
  { ownerUid: owner.uid, ownerName: owner.name, base, content, structure: null, key: null, traits: [], sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"), ...extra },
] as const;

const song = (page: Page, position: number) => page.locator(`[data-outline-item="${position}"]`);
const marque = (page: Page, position: number, marque: string, texte: string) =>
  song(page, position).locator(`[data-marque="${marque}"]`, { hasText: texte });
const menu = (page: Page, position: number) => song(page, position).getByRole("button", { name: /^Je lis : / });
const enParoles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
const capture = (page: Page, info: TestInfo, nom: string) => page.screenshot({ path: info.outputPath(`${nom}.png`) });

async function ouvrir(page: Page, docs: Record<string, Record<string, unknown>> = {}, items = SETLIST) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await enParoles(page);
  const db = await signInAs(page, ELODIE, { [SETLIST_DOC]: items, ...docs }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

test.describe("Ma partition : lecture dans la setlist", () => {
  test("chant FR : « Je lis : Ma partition », ligne retouchée marquée, retour au chant d'origine écrit dans __choix", async ({ page }, info) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MA_LIGNE);
    const db = await ouvrir(page, { [chemin]: doc });
    await expect(menu(page, 1)).toHaveAccessibleName("Je lis : Ma partition");
    await expect(marque(page, 1, "moi", "Rempli par")).toHaveCount(1);
    await expect(song(page, 1).getByText("Saisi par")).toHaveCount(0);
    await expect(song(page, 1).locator("[data-ma-partition-ligne]")).toHaveText("Ma partition · retouchée le 2 nov.");
    await capture(page, info, "ma-partition-fr");

    await menu(page, 1).click();
    await page.getByRole("menuitemradio", { name: "Le chant d'origine", exact: true }).click();
    await expect(song(page, 1).getByText("Saisi par")).toHaveCount(1);
    await expect(song(page, 1).locator('[data-marque="moi"]')).toHaveCount(0);
    await expect(menu(page, 1)).toHaveAccessibleName("Je lis : Le chant d'origine");
    const ecrit = db.writes.filter((w) => w.path === `partitions/${ELODIE.uid}__choix`).pop()!;
    expect(ecrit.data.choices).toEqual({ "abba-pere": "origine" });
  });

  test("chant FR : un accord retouché porte data-retouche « accords »", async ({ page }) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MES_ACCORDS);
    await ouvrir(page, { [chemin]: doc });
    await expect(song(page, 1).locator('[data-marque="moi"][data-retouche="accords"]')).toHaveCount(1);
  });

  test("chant ZH : ma partition, ligne retouchée marquée", async ({ page }, info) => {
    const [chemin, doc] = docPartition("一生爱你", ZH, MON_ZH);
    await ouvrir(page, { [chemin]: doc });
    await expect(menu(page, 2)).toHaveAccessibleName("Je lis : Ma partition");
    await expect(marque(page, 2, "moi", "寶")).toHaveCount(1);
    await song(page, 2).scrollIntoViewIfNeeded();
    await capture(page, info, "ma-partition-zh");
  });

  test("retouches du culte : « Celle du culte », ligne marquée « culte » ; ma partition garde la sienne par-dessus", async ({ page }, info) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MA_LIGNE);
    await ouvrir(page, { [chemin]: doc }, setlist([item({ songSlug: "abba-pere", position: 1, contentOverride: CULTE })]));
    // Ma partition (défaut) : la ligne du culte, que je n'ai pas touchée, suit le culte ; la mienne reste la mienne.
    await expect(marque(page, 1, "culte", "glissait sur la")).toHaveCount(1);
    await expect(marque(page, 1, "moi", "Rempli par")).toHaveCount(1);
    await capture(page, info, "ma-partition-culte");
    await menu(page, 1).click();
    await page.getByRole("menuitemradio", { name: "Celle du culte", exact: true }).click();
    await expect(song(page, 1).getByText("Saisi par")).toHaveCount(1);
    await expect(marque(page, 1, "culte", "glissait sur la")).toHaveCount(1);
    await expect(song(page, 1).locator('[data-marque="moi"]')).toHaveCount(0);
  });

  test("conflit : deux versions sous « Le chant a changé ici » ; « Garder la mienne » réécrit la partition", async ({ page }, info) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MON_CONFLIT);
    const db = await ouvrir(page, { [chemin]: doc }, setlist([item({ songSlug: "abba-pere", position: 1, contentOverride: CULTE })]));
    await expect(song(page, 1).getByText("Le chant a changé ici")).toHaveCount(1);
    await expect(song(page, 1).locator('[data-marque="conflit"]', { hasText: "flottait sur la" })).toHaveCount(1);
    await expect(song(page, 1).locator('[data-marque="conflit"]', { hasText: "glissait sur la" })).toHaveCount(1);
    await capture(page, info, "ma-partition-conflit");
    await song(page, 1).getByRole("button", { name: "Garder la mienne" }).click();
    await expect(song(page, 1).getByText("Le chant a changé ici")).toHaveCount(0);
    await expect(marque(page, 1, "moi", "flottait sur la")).toHaveCount(1);
    await expect(song(page, 1).getByText("glissait sur la")).toHaveCount(0);
    const ecrit = db.writes.filter((w) => w.path === `partitions/${ELODIE.uid}__abba-pere`).pop()!;
    expect(ecrit.data.content).toContain("flottait sur la");
    expect(ecrit.data.content).not.toContain("glissait");
    expect(ecrit.data.base).toContain("glissait sur la");
  });

  test("une partition partagée avec moi s'ajoute au menu", async ({ page }) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MA_LIGNE, { sharedWith: [ELODIE.uid] }, { uid: MATHIS.uid, name: MATHIS.name });
    await ouvrir(page, { [chemin]: doc });
    await menu(page, 1).click();
    await page.getByRole("menuitemradio", { name: `Partition de ${MATHIS.name}`, exact: true }).click();
    await expect(song(page, 1).getByText("Rempli par")).toHaveCount(1);
  });

  test("sans partition ni retouche : pas de menu", async ({ page }) => {
    await ouvrir(page);
    await expect(menu(page, 1)).toHaveCount(0);
  });
});

test.describe("Ma partition : lecture sur la page d'un chant", () => {
  const ouvrirChant = async (page: Page, docs: Record<string, Record<string, unknown>>, url = "/songs/abba-pere") => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    return signInAs(page, ELODIE, docs, url);
  };

  test("menu « Je lis » et tonalité de ma partition par défaut ; changer la tonalité l'enregistre", async ({ page }, info) => {
    const [chemin, doc] = docPartition("abba-pere", ABBA, MA_LIGNE, { key: "G" });
    const db = await ouvrirChant(page, { [chemin]: doc });
    await expect(page.getByRole("button", { name: "Je lis : Ma partition" })).toBeVisible();
    await expect(page.locator('[data-marque="moi"]', { hasText: "Rempli par" })).toHaveCount(1);
    await expect(page.getByTestId("tonalite-lettre")).toHaveText("G");
    await capture(page, info, "ma-partition-page-chant");
    await page.getByTestId("pilule-tonalite").locator("select").selectOption("C");
    await expect.poll(() => db.writes.filter((w) => w.path === `partitions/${ELODIE.uid}__abba-pere`).pop()?.data.key).toBe("C");
    expect(db.doc(`partitions/${ELODIE.uid}__abba-pere`)?.content).toBe(MA_LIGNE);
  });

  test("sans partition : pas de menu, et changer la tonalité ne crée pas de partition", async ({ page }) => {
    const db = await ouvrirChant(page, {});
    await expect(page.getByTestId("tonalite-lettre")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Je lis : / })).toHaveCount(0);
    await page.getByTestId("pilule-tonalite").locator("select").selectOption("C");
    await expect(page.getByTestId("tonalite-lettre")).toHaveText("C");
    expect(db.writes.filter((w) => w.path.startsWith("partitions/"))).toEqual([]);
  });
});
