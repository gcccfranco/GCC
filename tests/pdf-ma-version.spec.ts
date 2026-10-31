import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enDeuxVolets, ouvrirPartitions } from "./helpers/setlist";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { SetlistFullPDF } from "../src/components/pdf/SetlistFullPDF";
import { JianpuPDFPage } from "../src/components/pdf/SongPDF";

// « Quel PDF ? » d'une setlist : imprimer sa version des chants plutôt que celle
// de la présidence (docs/spec-version-perso.md, docs/spec-export-pdf.md).

const BERNARD: FakeProfile = {
  uid: "uid-bernard",
  email: "bernard@example.com",
  firstName: "Bernard",
  lastName: "Lemaitre",
  planningName: "Bernard L.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const OLIVIA: FakeProfile = {
  uid: "uid-olivia",
  email: "olivia@example.com",
  firstName: "Olivia",
  lastName: "Marchand",
  planningName: "Olivia M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-pdf-version";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_BERNARD = `${SETLIST_DOC}/versions/${BERNARD.uid}`;
const VERSION_OLIVIA = `${SETLIST_DOC}/versions/${OLIVIA.uid}`;

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
  title: "Veillée du 12 décembre",
  leader: "Gaëlle P.",
  category: "Culte Francophone",
  date: "2026-12-12",
  language: "mixed",
  notes: "",
  ownerId: BERNARD.uid,
  isPrivate: false,
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })],
};

/** Ma structure d'Abba Père : C1 R P, une fois chacune. */
const MY_STRUCTURE = ["verse-2", "chorus-3", "bridge-6"];
/** Mes accords de 一生爱你 : la première ligne du couplet (et son pinyin) retirée. */
const MY_ZH = readFileSync("content/songs/一生爱你.cho", "utf8")
  .split("\n")
  .filter((l) => !l.replace(/\[[^\]]*\]/g, "").includes("宝贵") && !l.startsWith("qīn ài de bǎo guì"))
  .join("\n");
const MY_ABBA = readFileSync("content/songs/abba-pere.cho", "utf8").replace("planait sur la", "flottait sur la");

const doc = (authorUid: string, authorName: string, items: Record<string, unknown>, choices: Record<string, string> = {}) => ({
  authorUid,
  authorName,
  items,
  choices,
});
const DOC_PERSO = doc(BERNARD.uid, "Bernard L.", {
  "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false },
  "一生爱你": { content: MY_ZH, structure: null, shared: false },
});

async function ouvrir(page: Page, who: FakeProfile, extra: Record<string, Record<string, unknown>> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  // Les paroles du chant chinois, pas son scan.
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await signInAs(page, who, { [SETLIST_DOC]: SETLIST, ...extra }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
}

async function quelPdf(page: Page) {
  if (await enDeuxVolets(page)) {
    await page.locator("[data-en-tete]").getByRole("button", { name: "PDF", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "PDF" }).click();
  }
  const sheet = page.getByRole("dialog", { name: "Quel PDF ?" });
  await expect(sheet).toBeVisible();
  return sheet;
}

async function telecharger(page: Page, sheet: ReturnType<Page["getByRole"]>) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 90_000 }),
    sheet.getByRole("button", { name: "Télécharger" }).click(),
  ]);
  const path = await download.path();
  return readFileSync(path);
}

test("sans version différente : la fenêtre n'a pas le groupe « Version »", async ({ page }) => {
  await ouvrir(page, BERNARD);
  const sheet = await quelPdf(page);
  await expect(sheet.getByRole("radiogroup")).toHaveCount(1);
  await expect(sheet.getByRole("radiogroup", { name: "Version" })).toHaveCount(0);
  await expect(sheet.getByRole("radio")).toHaveCount((await enDeuxVolets(page)) ? 4 : 3);
});

test("avec ma version : le groupe « Version » apparaît, « Ma version » coché, masqué sur « Liste »", async ({ page }) => {
  await ouvrir(page, BERNARD, { [VERSION_BERNARD]: DOC_PERSO });
  const sheet = await quelPdf(page);
  const groupe = sheet.getByRole("radiogroup", { name: "Version" });
  await expect(groupe).toBeVisible();
  await expect(groupe.getByRole("radio")).toHaveCount(2);
  await expect(groupe.getByRole("radio", { name: /Ma version/ })).toHaveAttribute("aria-checked", "true");
  await expect(groupe.getByRole("radio", { name: /Version de la présidence/ })).toHaveAttribute("aria-checked", "false");
  if (await enDeuxVolets(page)) {
    await sheet.getByRole("radio", { name: /^Liste/ }).click();
    await expect(groupe).toHaveCount(0);
    await sheet.getByRole("radio", { name: /^Classique/ }).click();
    await expect(groupe).toBeVisible();
  }
});

test("le choix de version n'est pas mémorisé : « Ma version » revient présélectionnée", async ({ page }) => {
  await ouvrir(page, BERNARD, { [VERSION_BERNARD]: DOC_PERSO });
  let sheet = await quelPdf(page);
  await sheet.getByRole("radio", { name: /Version de la présidence/ }).click();
  await telecharger(page, sheet);
  await expect(sheet).toHaveCount(0);
  sheet = await quelPdf(page);
  await expect(sheet.getByRole("radio", { name: /Ma version/ })).toHaveAttribute("aria-checked", "true");
});

test("le PDF « Ma version » diffère de celui de la présidence", async ({ page }) => {
  await ouvrir(page, BERNARD, { [VERSION_BERNARD]: DOC_PERSO });
  let sheet = await quelPdf(page);
  const mien = await telecharger(page, sheet);
  await expect(sheet).toHaveCount(0);
  sheet = await quelPdf(page);
  await sheet.getByRole("radio", { name: /Version de la présidence/ }).click();
  const presidence = await telecharger(page, sheet);
  expect(mien.length).toBeGreaterThan(1000);
  expect(presidence.length).toBeGreaterThan(1000);
  expect(mien.equals(presidence), "deux versions, deux fichiers").toBe(false);
  // Ma structure est plus courte (trois sections au lieu de la structure complète).
  expect(mien.length).not.toBe(presidence.length);
});

test("une version partagée par un autre et choisie suffit à proposer le choix", async ({ page }) => {
  await ouvrir(page, OLIVIA, {
    [VERSION_BERNARD]: doc(BERNARD.uid, "Bernard L.", { "abba-pere": { content: MY_ABBA, structure: null, shared: true } }),
    [VERSION_OLIVIA]: doc(OLIVIA.uid, "Olivia M.", {}, { "abba-pere": BERNARD.uid }),
  });
  const sheet = await quelPdf(page);
  await expect(sheet.getByRole("radiogroup", { name: "Version" })).toBeVisible();
});

test("une version partagée non choisie ne change rien : pas de groupe « Version »", async ({ page }) => {
  await ouvrir(page, OLIVIA, {
    [VERSION_BERNARD]: doc(BERNARD.uid, "Bernard L.", { "abba-pere": { content: MY_ABBA, structure: null, shared: true } }),
  });
  const sheet = await quelPdf(page);
  await expect(sheet.getByRole("radiogroup", { name: "Version" })).toHaveCount(0);
});

// ── SetlistFullPDF et la page 简谱 (Node) ──────────────────────────────────

type PageProps = { structureOverride?: string[] | null; ast?: unknown };
const pagesDe = (el: ReturnType<typeof SetlistFullPDF>) =>
  (el.props as { children: { props: PageProps }[] }).children.map((p) => p.props);

const abbaCho = readFileSync("content/songs/abba-pere.cho", "utf8");
const contents = { "abba-pere": { slug: "abba-pere", ast: parseChordPro(abbaCho) } };

test("PDF : un item avec structure perso imprime cette structure", () => {
  const el = SetlistFullPDF({
    setlist: { ...SETLIST, items: [item({ songSlug: "abba-pere", position: 1, structureOverride: MY_STRUCTURE })] } as never,
    contents,
    showChords: true,
  });
  expect(pagesDe(el).map((p) => p.structureOverride)).toEqual([MY_STRUCTURE]);
});

test("PDF : un item avec contentOverride perso imprime ces accords", () => {
  const el = SetlistFullPDF({
    setlist: { ...SETLIST, items: [item({ songSlug: "abba-pere", position: 1, contentOverride: MY_ABBA })] } as never,
    contents,
    showChords: true,
  });
  const ast = JSON.stringify(pagesDe(el)[0].ast);
  expect(ast).toContain("flottait");
  expect(ast).not.toContain("planait");
});

// Le rendu d'une page PDF sans l'exécuter : on déplie les composants purs et on
// relève les textes. Une étiquette de calque = un `Text` positionné.
type Noeud = { type?: unknown; props?: { children?: unknown } } | string | number | null | undefined | false | Noeud[];
function textes(n: Noeud, out: string[] = []): string[] {
  if (n == null || n === false) return out;
  if (typeof n === "string" || typeof n === "number") {
    out.push(String(n));
    return out;
  }
  if (Array.isArray(n)) {
    n.forEach((c) => textes(c, out));
    return out;
  }
  const el = n as { type?: unknown; props?: { children?: unknown } };
  if (typeof el.type === "function") {
    return textes((el.type as (p: unknown) => Noeud)(el.props), out);
  }
  return textes(el.props?.children as Noeud, out);
}

const PAGE = { file: "x.png", w: 1000, h: 1400 };
const CALQUE = {
  printedKey: "G",
  w: 1000,
  h: 1400,
  labelH: 20,
  labels: [
    { x: 100, y: 100, w: 40, h: 20, c: "G" },
    { x: 300, y: 100, w: 40, h: 20, c: "C" },
  ],
};
const page = (extra: Record<string, unknown>) =>
  textes(
    JianpuPDFPage({ src: "data:image/png;base64,AA==", page: PAGE, chords: CALQUE, title: "Essai", originalKey: "G", ...extra } as never) as Noeud,
  );

test("PDF 简谱 : sans retouche et sans transposition, le calque reste éteint", () => {
  const t = page({});
  expect(t).not.toContain("G");
  expect(t).not.toContain("C");
});

test("PDF 简谱 : une retouche remplace le gravé, calque éteint ; l'accord ajouté se dessine", () => {
  const t = page({ retouches: { changed: { 0: "Em" }, added: [{ page: 0, x: 500, y: 100, c: "D" }] } });
  expect(t).toContain("Em");
  expect(t).toContain("D");
  expect(t, "l'accord gravé non retouché n'est pas redessiné").not.toContain("C");
});

test("PDF 简谱 : calque allumé (tonalité jouée), retouches et ajouts transposés comme à l'écran", () => {
  const t = page({ playedKey: "A", retouches: { changed: { 0: "Em", 1: "" }, added: [{ page: 0, x: 500, y: 100, c: "D" }] } });
  // G → A : +2 demi-tons.
  expect(t).toContain("F#m");
  expect(t).toContain("E");
  expect(t).not.toContain("Em");
  expect(t).not.toContain("D");
});

test("PDF 简谱 : les retouches ne se dessinent que sur la première page du scan", () => {
  const t = page({ pageIndex: 1, chords: null, retouches: { changed: { 0: "Em" }, added: [{ page: 0, x: 500, y: 100, c: "D" }] } });
  expect(t).not.toContain("Em");
});
