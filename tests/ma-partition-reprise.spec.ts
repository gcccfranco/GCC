import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirJeJoue } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";

// Ma partition, tranche MP-6 (docs/spec-ma-partition.md, « Questions ouvertes ») : reprise de l'existant. Les anciennes
// « Ma version » restent lisibles dans leur setlist (leur structure suit la lecture) ; celles des autres ne sont plus
// proposées ; les anciennes annotations se recopient dans ma partition. Base simulée, comptes fictifs.

const LISE: FakeProfile = {
  uid: "uid-lise", email: "lise.fontaine@example.invalid", firstName: "Lise", lastName: "Fontaine", planningName: "Lise F.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const NOEL: FakeProfile = {
  uid: "uid-noel", email: "noel.bertin@example.invalid", firstName: "Noël", lastName: "Bertin", planningName: "Noël B.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SL = "reprise-sl";
const SOURCES = { "abba-pere": readFileSync("content/songs/abba-pere.cho", "utf8"), "一生爱你": readFileSync("content/songs/一生爱你.cho", "utf8") };
const item = (songSlug: string, position: number) => ({ songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const setlist = (slugs: string[]) => ({
  title: "Culte du 8 novembre", leader: "Lise F.", category: "Culte Francophone", date: "2026-11-08", language: "mixed", notes: "",
  ownerId: LISE.uid, isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});
const partition = (slug: keyof typeof SOURCES, traits: unknown[] = [], content: string | null = null) => ({
  ownerUid: LISE.uid, ownerName: LISE.planningName, base: SOURCES[slug], content, structure: null, key: null,
  traits, sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"),
});
const ancienne = (auteur: FakeProfile, items: Record<string, unknown>) => ({ authorUid: auteur.uid, authorName: auteur.planningName, items, choices: {} });

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>, slugs = ["abba-pere"], zh = false) {
  await page.addInitScript((z) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    if (z) localStorage.setItem("jianpu-sheet-pref", "never");
  }, zh);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, { [`setlists/${SL}`]: setlist(slugs), ...docs }, `/setlists/${SL}`);
}

const song = (page: Page, position: number) => page.locator(`[data-outline-item="${position}"]`);
const menuJeLis = (page: Page) => song(page, 1).getByRole("button", { name: /^Je lis : / });

test("une ancienne « Ma version » avec structure, à côté d'une partition neuve : la choisir montre sa structure", async ({ page }) => {
  await ouvrir(page, LISE, {
    [`partitions/${LISE.uid}__abba-pere`]: partition("abba-pere"),
    [`setlists/${SL}/versions/${LISE.uid}`]: ancienne(LISE, {
      "abba-pere": { content: SOURCES["abba-pere"].replace("je [E]suis à To[F#m]i", "je [E]reste à To[F#m]i"), structure: ["chorus-3"], shared: false },
    }),
  });
  await ouvrirPartitions(page);
  const sections = song(page, 1).locator("[data-section]");
  await expect(menuJeLis(page)).toHaveAccessibleName("Je lis : Ma partition");
  await expect.poll(() => sections.count(), { message: "ma partition neuve : toutes les sections" }).toBeGreaterThan(1);
  await menuJeLis(page).click();
  await page.getByRole("menuitemradio", { name: "Ma version", exact: true }).click();
  await expect(sections).toHaveCount(1);
  await expect(sections.first()).toContainText("Refrain");
  await expect(song(page, 1).locator("[data-copy-line]", { hasText: "reste" })).toHaveCount(1);
});

test("l'ancienne version partagée d'un autre compte n'est plus proposée", async ({ page }) => {
  await ouvrir(page, NOEL, {
    [`setlists/${SL}/versions/${LISE.uid}`]: ancienne(LISE, {
      "abba-pere": { content: SOURCES["abba-pere"].replace("planait", "nageait"), structure: null, shared: true },
    }),
  });
  await ouvrirPartitions(page);
  await expect(song(page, 1).getByRole("heading", { name: "Abba Père" })).toBeVisible();
  await expect(menuJeLis(page), "aucune alternative à l'origine").toHaveCount(0);
  await expect(song(page, 1).getByText(/Version de/)).toHaveCount(0);
});

/** Boîtes (px écran) des tracés de tous les calques du mode louange. */
const boitesTraits = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-performance-mode] > canvas[data-strokes-boites]")]
      .flatMap((c) => JSON.parse(c.getAttribute("data-strokes-boites")!) as [number, number, number, number][]));

for (const [slug, zh] of [["abba-pere", false], ["一生爱你", true]] as const) {
  test(`mode louange : « Recopier » pose les anciennes annotations dans ma partition (${zh ? "ZH" : "FR"})`, async ({ page }) => {
    test.setTimeout(60_000);
    const section = parseChordPro(SOURCES[slug]).sections[0].id;
    const ancre = { section, ligne: 0, car: 0 };
    const tampon = { ancre, outil: "stamp", genre: "f", points: [0, -1], taille: 1, couleur: "#111827" };
    const inconnu = { ancre, outil: "hologramme", reglage: 7 };
    const doc = `partitions/${LISE.uid}__${slug}`;
    const db: FakeDb = await ouvrir(page, LISE, { [doc]: partition(slug, [tampon, inconnu]) }, [slug], zh);
    const entrer = async () => {
      await page.getByRole("button", { name: /Mode Louange/ }).click();
      await attendreMiseEnPage(page);
    };
    await entrer();
    const cle = (await page.locator("[data-performance-mode]").getAttribute("data-cle-page"))!;
    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    const strokes = [
      { tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.3, h * 0.4], [w * 0.45, h * 0.42], [w * 0.6, h * 0.4]] },
      { tool: "text", texte: "Vite", size: 18, color: "#2563eb", points: [[w * 0.3, h * 0.5]] },
    ];
    const ancien = `annotations/${LISE.uid}__${SL}__${cle}`;
    db.set(ancien, { strokes: JSON.stringify({ w, h, strokes }), updatedAt: new Date() });
    await page.reload();
    await entrer();
    await expect.poll(async () => (await boitesTraits(page)).length, { message: "calque ancien et tampon dessinés" }).toBeGreaterThanOrEqual(3);
    const avant = await boitesTraits(page);

    const menu = await ouvrirJeJoue(page);
    await menu.getByRole("button", { name: "Recopier mes anciennes annotations dans ma partition" }).click();

    await expect.poll(() => db.writes.filter((x) => decodeURIComponent(x.path) === doc).at(-1)?.data.traits, { timeout: 10_000 }).toHaveLength(4);
    const ecrits = db.writes.filter((x) => decodeURIComponent(x.path) === doc).at(-1)!.data.traits as Record<string, unknown>[];
    expect(ecrits[0]).toMatchObject({ outil: "stamp", genre: "f" });
    expect(ecrits[1]).toMatchObject({ outil: "hologramme", reglage: 7 });
    expect(ecrits.slice(2).map((e) => e.outil)).toEqual(["pen", "text"]);
    expect(ecrits[3].texte).toBe("Vite");
    const [stylo, texte] = ecrits.slice(2).map((e) => e.ancre);
    expect(stylo).toEqual(texte);
    expect(stylo).toMatchObject({ car: 0 });
    await expect.poll(() => db.doc(ancien), { message: "l'ancien document est supprimé" }).toBeUndefined();
    expect(db.writes.some((x) => x.method === "DELETE" && decodeURIComponent(x.path) === ancien)).toBe(true);

    await page.keyboard.press("Escape");
    // Le calque se dessine toujours, au même endroit : le stylo et le texte sont des traits accrochés maintenant.
    await expect.poll(async () => (await boitesTraits(page)).length).toBeGreaterThanOrEqual(3);
    const apres = await boitesTraits(page);
    for (const [x0, y0, x1, y1] of avant) {
      expect(apres.some(([a, b, c, d]) => Math.abs(a - x0) <= 4 && Math.abs(b - y0) <= 4 && Math.abs(c - x1) <= 4 && Math.abs(d - y1) <= 4), `trait ${x0},${y0} resté en place`).toBe(true);
    }
  });
}

test("mode louange : si l'écriture de ma partition est refusée, l'ancien document reste et l'ancien calque aussi", async ({ page }) => {
  test.setTimeout(60_000);
  const doc = `partitions/${LISE.uid}__abba-pere`;
  const db: FakeDb = await ouvrir(page, LISE, { [doc]: partition("abba-pere") });
  const entrer = async () => {
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
  };
  await entrer();
  const cle = (await page.locator("[data-performance-mode]").getAttribute("data-cle-page"))!;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const ancien = `annotations/${LISE.uid}__${SL}__${cle}`;
  const strokes = [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.3, h * 0.4], [w * 0.6, h * 0.4]] }];
  db.set(ancien, { strokes: JSON.stringify({ w, h, strokes }), updatedAt: new Date() });
  await page.reload();
  await entrer();
  await expect.poll(async () => (await boitesTraits(page)).length).toBeGreaterThanOrEqual(1);
  // Ma partition refuse l'écriture.
  await page.route(/firestore\.googleapis\.com/, (route) => {
    const chemin = decodeURIComponent(new URL(route.request().url()).pathname);
    return route.request().method() !== "GET" && chemin.includes(doc) ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" }) : route.fallback();
  });
  const menu = await ouvrirJeJoue(page);
  await menu.getByRole("button", { name: "Recopier mes anciennes annotations dans ma partition" }).click();
  await page.waitForTimeout(2_000);
  expect(db.doc(ancien), "l'ancien document existe toujours").toBeDefined();
  expect(db.writes.some((x) => x.method === "DELETE")).toBe(false);
  await expect(menu.getByRole("button", { name: "Recopier mes anciennes annotations dans ma partition" }), "l'ancien calque reste").toBeVisible();
});
