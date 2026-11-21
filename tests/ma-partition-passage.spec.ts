import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, basculerAnnoter, onStage } from "./helpers/louange";

// Ma partition, tranche UP-1 (docs/spec-ma-partition.md, « Un passage ou tous ») : un dessin tracé sur un passage d'une
// section répétée ne se montre qu'à ce passage ; un dessin sans `passage` (format d'avant) se montre à chaque passage.
// Ordre « Tout le chant » au mode louange, refrain joué deux fois. Base simulée, compte fictif. ZH : pas de cas ici
// (la répétition y demande une structure propre au chant), le champ ne dépend pas de la langue.

const IRIS: FakeProfile = {
  uid: "uid-iris", email: "iris.valmont@example.invalid", firstName: "Iris", lastName: "Valmont", planningName: "Iris V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const AST = parseChordPro(ABBA);
const COUPLET = AST.sections.find((s) => s.type === "verse")!.id;
const REFRAIN = AST.sections.find((s) => s.type === "chorus")!.id;

const item = (structureOverride: string[]) => ({ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride, sectionNotes: {}, notes: "" });
const setlist = (structureOverride: string[]) => ({
  title: "Culte du 4 octobre", leader: "Iris V.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
  ownerId: IRIS.uid, isPrivate: false, items: [item(structureOverride)],
});
const SL = "passage-sl";
/** Couplet, refrain, interlude, refrain : le refrain est joué deux fois, sans que les deux se suivent. */
const AVEC_REFRAIN_REPETE = ["verse-2-1", "chorus-3-2", "intro-4-3", "chorus-3-5"];
const SANS_REPETITION = ["verse-2-1", "chorus-3-2"];

const DOC = `partitions/${IRIS.uid}__abba-pere`;
const maPartition = (traits: unknown[]) => ({
  ownerUid: IRIS.uid, ownerName: IRIS.planningName, base: ABBA, content: ABBA, structure: null, key: null,
  traits, sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"),
});
/** Dessin d'avant la tranche : posé sur la première ligne du refrain, sans `passage`. */
const TRAIT_ANCIEN = { ancre: { section: REFRAIN, ligne: 0, car: 0 }, outil: "pen", couleur: "#dc2626", epaisseur: 0.12, points: [0, 0.6, 1, 0.6, 2, 0.6] };

const traitsEcrits = (db: FakeDb) => {
  const w = db.writes.filter((x) => decodeURIComponent(x.path).startsWith(DOC)).at(-1);
  return (w?.data.traits as { ancre: Record<string, unknown>; points: number[] }[] | undefined) ?? null;
};

async function ouvrir(page: Page, structure: string[], traits: unknown[]) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
  });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, IRIS, { [`setlists/${SL}`]: setlist(structure), [DOC]: maPartition(traits) }, `/setlists/${SL}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  return db;
}

/** Tourne les pages jusqu'à ce qu'une ligne du `passage`-ième passage du refrain (ou, sans rang, du couplet) soit affichée. */
async function allerA(page: Page, selecteur: string) {
  for (let i = 0; i < 14 && (await onStage(page, selecteur).count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(onStage(page, selecteur).first()).toBeVisible();
}
const ligneRefrain = (passage: number, ligne: number) => `[data-trait-section="${REFRAIN}"][data-trait-passage="${passage}"][data-trait-ligne="${ligne}"]`;

/** Boîte (px écran) du mot `mot` dans la ligne désignée par `selecteur`, mesurée sur les nœuds texte des paroles. */
const boiteMotDe = (page: Page, selecteur: string, mot: string) =>
  page.evaluate(([sel, m]) => {
    const ligne = Array.from(document.querySelectorAll<HTMLElement>(`[data-performance-mode] ${sel}`)).find((l) => !l.closest("[aria-hidden=true]"));
    if (!ligne) return null;
    const noeuds: Text[] = [];
    for (const el of ligne.querySelectorAll("[data-paroles], [data-car]")) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) noeuds.push(n as Text);
    }
    const i = noeuds.map((n) => n.data).join("").lastIndexOf(m);
    if (i < 0) return null;
    const place = (rang: number) => {
      let reste = rang;
      for (const n of noeuds) { if (reste < n.length) return [n, reste] as const; reste -= n.length; }
      return [noeuds[noeuds.length - 1], noeuds[noeuds.length - 1].length] as const;
    };
    const r = document.createRange();
    const [n0, o0] = place(i);
    const [n1, o1] = place(i + m.length - 1);
    r.setStart(n0, o0);
    r.setEnd(n1, o1 + 1);
    const b = r.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  }, [selecteur, mot] as const);

/** Nombre de traits dessinés dont le centre vertical tombe dans la ligne désignée (null : ligne non affichée). Indépendant du découpage en pages. */
const traitsSurLigne = (page: Page, selecteur: string) =>
  page.evaluate((sel) => {
    const racine = document.querySelector<HTMLElement>("[data-performance-mode]");
    const c = racine?.querySelector<HTMLElement>(":scope > canvas[data-strokes-boites]");
    const ligne = Array.from(document.querySelectorAll<HTMLElement>(`[data-performance-mode] ${sel}`)).find((l) => !l.closest("[aria-hidden=true]"));
    if (!ligne) return null;
    if (!c) return 0; // pas de canvas : aucun trait sur la page
    const dy = c.getBoundingClientRect().top;
    const r = ligne.getBoundingClientRect();
    const boites = JSON.parse(c.getAttribute("data-strokes-boites")!) as [number, number, number, number][];
    return boites.filter((b) => { const y = dy + (b[1] + b[3]) / 2; return y >= r.top && y <= r.bottom; }).length;
  }, selecteur);

async function tracerSur(page: Page, boite: { left: number; right: number; top: number; bottom: number }) {
  const y = (boite.top + boite.bottom) / 2;
  await page.mouse.move(boite.left + 2, y);
  await page.mouse.down();
  await page.mouse.move((boite.left + boite.right) / 2, y + 2, { steps: 5 });
  await page.mouse.move(boite.right - 2, y, { steps: 5 });
  await page.mouse.up();
}

test("(a) un trait tracé sur le 2e refrain s'écrit avec passage 1 et ne se dessine qu'à ce passage", async ({ page }) => {
  const db = await ouvrir(page, AVEC_REFRAIN_REPETE, []);
  await allerA(page, ligneRefrain(1, 1));
  const mot = (await boiteMotDe(page, ligneRefrain(1, 1), "Toi"))!;
  await basculerAnnoter(page);
  await tracerSur(page, mot);
  await expect.poll(() => traitsEcrits(db)?.length, { timeout: 10_000 }).toBe(1);
  expect(traitsEcrits(db)![0].ancre).toMatchObject({ section: REFRAIN, ligne: 1, passage: 1 });
  await basculerAnnoter(page);
  await expect.poll(() => traitsSurLigne(page, ligneRefrain(1, 1))).toBe(1);
  // Au 1er passage : rien sur la ligne du 1er refrain.
  for (let i = 0; i < 14 && (await onStage(page, ligneRefrain(0, 1)).count()) === 0; i++) {
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(150);
  }
  await expect(onStage(page, ligneRefrain(0, 1)).first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await traitsSurLigne(page, ligneRefrain(0, 1))).toBe(0);
});

test("(b) un trait ancien, sans passage, se dessine à chaque passage", async ({ page }) => {
  await ouvrir(page, AVEC_REFRAIN_REPETE, [TRAIT_ANCIEN]);
  for (const passage of [0, 1]) {
    await allerA(page, ligneRefrain(passage, 0));
    await expect.poll(() => traitsSurLigne(page, ligneRefrain(passage, 0))).toBe(1);
  }
});

test("(c) gommer le trait du 2e passage le retire et laisse l'ancien", async ({ page }) => {
  const db = await ouvrir(page, AVEC_REFRAIN_REPETE, [TRAIT_ANCIEN]);
  await allerA(page, ligneRefrain(1, 1));
  const mot = (await boiteMotDe(page, ligneRefrain(1, 1), "Toi"))!;
  await basculerAnnoter(page);
  await tracerSur(page, mot);
  await expect.poll(() => traitsEcrits(db)?.length, { timeout: 10_000 }).toBe(2);
  await page.getByRole("button", { name: /^Gomme/ }).click();
  await tracerSur(page, mot);
  await expect.poll(() => traitsEcrits(db)?.length, { timeout: 10_000 }).toBe(1);
  const reste = traitsEcrits(db)![0].ancre;
  expect(reste).toMatchObject({ section: REFRAIN, ligne: 0, car: 0 });
  expect(reste).not.toHaveProperty("passage");
});

test("(d) une section qui ne revient pas : pas de passage écrit", async ({ page }) => {
  const db = await ouvrir(page, SANS_REPETITION, []);
  await allerA(page, `[data-trait-section="${COUPLET}"]`);
  const mot = (await boiteMotDe(page, `[data-trait-section="${COUPLET}"][data-trait-ligne="0"]`, "créa"))!;
  expect(await onStage(page, "[data-trait-passage]").count(), "aucun repère de passage").toBe(0);
  await basculerAnnoter(page);
  await tracerSur(page, mot);
  await expect.poll(() => traitsEcrits(db)?.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(traitsEcrits(db)![0].ancre).not.toHaveProperty("passage");
});

for (const passage of [-1, "1", 1.5]) {
  test(`un passage invalide (${JSON.stringify(passage)}) n'est pas rejeté : le trait se dessine à chaque passage`, async ({ page }) => {
    await ouvrir(page, AVEC_REFRAIN_REPETE, [{ ...TRAIT_ANCIEN, ancre: { ...TRAIT_ANCIEN.ancre, passage } }]);
    for (const p of [0, 1]) {
      await allerA(page, ligneRefrain(p, 0));
      await expect.poll(() => traitsSurLigne(page, ligneRefrain(p, 0))).toBe(1);
    }
  });
}
