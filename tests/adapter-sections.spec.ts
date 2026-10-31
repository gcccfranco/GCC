import { readdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { materializeSectionCopy } from "../src/lib/chordpro/editSource";
import { buildDefaultStructure, resolveStructureOverride } from "../src/lib/chordpro/structure";
import { repairCopyIds } from "../src/lib/setlist/sectionOrigins";

// Mode Adapter : modifier une ligne d'une section qui passe deux fois copie la
// section en fin de source et fait pointer cette occurrence vers la copie. Du
// 11 au 25/10/2026, la copie gardait le `{section_id: …}` de son original et le
// passage modifié disparaissait. Setlists et comptes simulés, noms fictifs.

const AUTRICE: FakeProfile = {
  uid: "uid-autrice",
  email: "autrice@example.com",
  firstName: "Maëlys",
  lastName: "Brunot",
  planningName: "Maëlys B.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-adapter";
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

const setlist = (items: Record<string, unknown>[]) => ({
  title: "Culte du 25 octobre",
  leader: "Anselme P.",
  category: "Culte Francophone",
  date: "2026-10-25",
  language: "mixed",
  notes: "",
  ownerId: AUTRICE.uid,
  isPrivate: false,
  items,
});

const MAISON = ["intro-1-0", "verse-2-1", "verse-3-2", "chorus-4-3", "verse-5-4", "verse-6-5", "chorus-4-6", "verse-3-7", "chorus-4-8"];

const song = (page: Page) => page.locator('[data-outline-item="1"]');
const sections = (page: Page) => song(page).locator("[data-section]");

async function ouvrir(page: Page, doc: Record<string, unknown>, extra: Record<string, Record<string, unknown>> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  const db = await signInAs(page, AUTRICE, { [SETLIST_DOC]: doc, ...extra }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(sections(page).first()).toBeVisible();
  return db;
}

/** Touche la n-ième ligne (1, 2…) qui contient `texte`, change l'accord `de`
 *  en `vers` (fondamentale, ♮, maj) et valide. */
async function changerAccord(page: Page, texte: string, n: number, de: string, vers: string, portee?: string) {
  await song(page).getByRole("button").filter({ hasText: texte }).nth(n - 1).click();
  const feuille = page.getByRole("dialog");
  if (portee) await feuille.getByRole("button", { name: portee }).click();
  await feuille.getByRole("button", { name: de, exact: true }).first().click();
  await feuille.getByRole("button", { name: vers, exact: true }).last().click();
  await feuille.getByRole("button", { name: "♮", exact: true }).click();
  await feuille.getByRole("button", { name: "maj", exact: true }).click();
  await feuille.getByRole("button", { name: "Valider l'accord" }).click();
  await feuille.getByRole("button", { name: "Valider", exact: true }).click();
  await expect(feuille).toHaveCount(0);
}

const contentOverride = (db: { doc(p: string): Record<string, unknown> | undefined }) =>
  ((db.doc(SETLIST_DOC)?.items as Record<string, unknown>[])[0].contentOverride ?? "") as string;

const CAS = [
  { slug: "moi-et-ma-maison", structure: MAISON, texte: "Dans chaque lie", de: "A", vers: "C", attendu: "[C]" },
  { slug: "只需要你", structure: ["intro-1-0", "verse-2-1", "verse-3-2", "chorus-4-3", "verse-2-4", "verse-3-5", "chorus-4-6"], texte: "孤", de: "C", vers: "D", attendu: "[D]" },
  { slug: "avec-nous", structure: ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-4-3", "chorus-3-4", "bridge-5-5", "chorus-3-6"], texte: "est avec", de: "A", vers: "G", attendu: "[G]" },
  { slug: "abba-pere", structure: ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-5-3", "chorus-3-4", "bridge-6-5", "chorus-3-6"], texte: "je suis à To", de: "D", vers: "G", attendu: "[G]" },
  { slug: "一生爱你", structure: ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-2-3", "chorus-3-4", "chorus-3-5"], texte: "奉", de: "C#m", vers: "D", attendu: "[D]" },
];

for (const c of CAS) {
  test(`Adapter, ${c.slug} : la 2e occurrence modifiée reste, avec son accord`, async ({ page }) => {
    test.slow(); // deux chargements de la page
    const db = await ouvrir(page, setlist([item({ songSlug: c.slug, position: 1, structureOverride: c.structure })]));
    await expect(sections(page)).toHaveCount(c.structure.length);
    await page.getByRole("button", { name: "Adapter", exact: true }).click();
    await changerAccord(page, c.texte, 2, c.de, c.vers);

    await expect(sections(page), "aucune section perdue en mode Adapter").toHaveCount(c.structure.length);
    await expect.poll(() => contentOverride(db)).toContain(c.attendu);
    const ecrit = (db.doc(SETLIST_DOC)!.items as { structureOverride: string[] }[])[0];
    const ast = parseChordPro(contentOverride(db));
    expect(resolveStructureOverride(ast.sections, ecrit.structureOverride), "structure enregistrée résolue en entier").toHaveLength(c.structure.length);

    await page.reload();
    await ouvrirPartitions(page);
    await expect(sections(page), "aucune section perdue après rechargement").toHaveCount(c.structure.length);
  });
}

test("setlist déjà cassée (copie à l'id de son original) : le passage réapparaît avec la modification", async ({ page }) => {
  const source = readFileSync("content/songs/moi-et-ma-maison.cho", "utf8");
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.startsWith("{start_of_prechorus"));
  const end = lines.findIndex((l, i) => i > start && l.startsWith("{end_of_"));
  // La copie telle qu'enregistrée avant le correctif : `{section_id: verse-3}` gardé.
  const copie = lines.slice(start, end + 1).map((l) => l.replace("Dans chaque lie[A]u", "Dans chaque lie[C]u"));
  const casse = [...lines, "", ...copie].join("\n");
  const total = lines.filter((l) => l.startsWith("{start_of_")).length;
  const copieId = `prechorus-${total + 1}`;
  const structure = MAISON.map((ov, i) => (i === 7 ? `${copieId}-7` : ov));
  await ouvrir(
    page,
    setlist([item({ songSlug: "moi-et-ma-maison", position: 1, structureOverride: structure, contentOverride: casse, sectionOrigins: { [copieId]: "verse-3" } })]),
  );
  await expect(sections(page)).toHaveCount(MAISON.length);
  await expect(song(page).locator("[data-copy-line]", { hasText: "Dans chaque lie" })).toHaveCount(2);
  await expect(sections(page).nth(7).locator(".font-chord", { hasText: /^C$/ })).toHaveCount(1);
});

test("Ma version › Seulement ce passage, moi-et-ma-maison : le passage modifié reste", async ({ page }) => {
  test.slow(); // deux chargements de la page
  const db = await ouvrir(page, setlist([item({ songSlug: "moi-et-ma-maison", position: 1, structureOverride: MAISON })]));
  await page.getByRole("button", { name: "Ma version", exact: true }).click();
  await changerAccord(page, "Dans chaque lie", 2, "A", "C", "Seulement ce passage");
  await expect(sections(page)).toHaveCount(MAISON.length);
  const doc = `${SETLIST_DOC}/versions/${AUTRICE.uid}`;
  await expect.poll(() => (db.doc(doc)?.items as Record<string, { content: string }> | undefined)?.["moi-et-ma-maison"]?.content ?? "").toContain("[C]");
  const mien = (db.doc(doc)!.items as Record<string, { content: string; structure: string[]; sectionOrigins?: Record<string, string> }>)["moi-et-ma-maison"];
  expect(Object.keys(mien.sectionOrigins ?? {}), "une copie de ce seul passage").toHaveLength(1);
  expect(resolveStructureOverride(parseChordPro(mien.content).sections, mien.structure)).toHaveLength(MAISON.length);
  await page.reload();
  await ouvrirPartitions(page);
  await expect(sections(page)).toHaveCount(MAISON.length);
});

test("corpus (sans navigateur) : une copie d'Adapter ne perd aucune section, sur tous les chants", async () => {
  let essais = 0;
  const perdus: string[] = [];
  for (const file of readdirSync("content/songs").filter((f) => f.endsWith(".cho"))) {
    const source = readFileSync(`content/songs/${file}`, "utf8");
    const base = buildDefaultStructure(parseChordPro(source).sections).map((s) => s.uid);
    const ids = [...new Set(base.map((uid) => uid.replace(/-\d+$/, "")))];
    for (const id of ids) {
      essais++;
      const at = base.length;
      const mat = materializeSectionCopy(source, id);
      if (!mat) {
        perdus.push(`${file} ${id} : pas de copie`);
        continue;
      }
      // Un accord de la copie change (la copie est la dernière section du source).
      const lines = mat.source.split("\n");
      const debut = lines.findLastIndex((l) => /^\{start_of_/.test(l.trim()));
      const k = lines.findIndex((l, i) => i >= debut && /\[[A-G][^\]]*\]/.test(l));
      if (k !== -1) lines[k] = lines[k].replace(/\[[A-G][^\]]*\]/, (m) => (m === "[C]" ? "[D]" : "[C]"));
      const structure = [...base, `${mat.newSectionId}-${at}`];
      const resolved = resolveStructureOverride(parseChordPro(lines.join("\n")).sections, structure);
      if (resolved.length !== structure.length) perdus.push(`${file} ${id} : ${structure.length - resolved.length} perdue(s)`);
    }
  }
  expect(essais).toBeGreaterThan(1000);
  expect(perdus, `${perdus.length} sur ${essais} essais`).toEqual([]);
});

test("repairCopyIds (sans navigateur) : copie d'une copie, et rien ne bouge sans copie à réparer", async () => {
  const src = [
    "{start_of_verse: A}", "{section_id: verse-9}", "la [A]", "{end_of_verse}",
    "", "{start_of_verse: A}", "{section_id: verse-9}", "la [B]", "{end_of_verse}",
    "", "{start_of_verse: A}", "{section_id: verse-9}", "la [C]", "{end_of_verse}",
  ].join("\n");
  const origins = { "verse-2": "verse-9", "verse-3": "verse-2" };
  const ids = parseChordPro(repairCopyIds(src, origins)).sections.map((s) => s.id);
  expect(ids).toEqual(["verse-9", "verse-2", "verse-3"]);
  expect(repairCopyIds(src, {})).toBe(src);
});
