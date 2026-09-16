import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { parsePdfStyle, pdfFileName } from "../src/lib/pdfStylePref";
import { nuancePdfColors, sectionPdfPalette } from "../src/lib/pdf/colors";
import { compactPlan, compactTransitions, stripGroups } from "../src/lib/pdf/compact";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { resolveStructureOverride } from "../src/lib/chordpro/structure";
import { readFileSync } from "fs";

// Lot 5 « Export PDF » (docs/spec-export-pdf.md) : au téléchargement, choisir
// Classique · Couleurs par section (chant et setlist) · Compact (setlist).

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-pdf";

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

function setlist(over: Record<string, unknown> = {}) {
  return {
    title: "Culte du 21 septembre",
    leader: "Jonathan Z.",
    category: "Culte Francophone",
    date: "2026-09-21",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items: [
      item({
        songSlug: "abba-pere",
        position: 1,
        structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"],
        sectionNuances: { "chorus-3-1": { tags: ["f"] }, "chorus-3-2": { tags: ["f"] } },
      }),
    ],
    ...over,
  };
}

const openMenu = (page: Page) => page.getByRole("button", { name: "Plus d'actions" }).click();
const pdfEntry = (page: Page) => page.getByRole("menuitem", { name: "PDF" });

// ── Préférence et nom de fichier (fonctions pures) ──────────────────────────

test("préférence : valeur inconnue ou absente → classique ; compact n'existe pas pour un chant", () => {
  expect(parsePdfStyle(null, true)).toBe("classic");
  expect(parsePdfStyle("n'importe quoi", true)).toBe("classic");
  expect(parsePdfStyle("colors", false)).toBe("colors");
  expect(parsePdfStyle("compact", true)).toBe("compact");
  expect(parsePdfStyle("compact", false)).toBe("classic");
});

test("nom de fichier : le classique garde son nom, les autres prennent un suffixe", () => {
  expect(pdfFileName("abba-pere-A", "classic")).toBe("abba-pere-A.pdf");
  expect(pdfFileName("abba-pere-A", "colors")).toBe("abba-pere-A-couleurs.pdf");
  expect(pdfFileName("Culte", "classic", "partitions")).toBe("Culte-partitions.pdf");
  expect(pdfFileName("Culte", "colors", "partitions")).toBe("Culte-couleurs.pdf");
  expect(pdfFileName("Culte", "compact", "partitions")).toBe("Culte-compact.pdf");
});

test("nuancier gris du PDF : doux clair, moyen gris, fort foncé, indications en contour", () => {
  const pp = nuancePdfColors("pp");
  const mf = nuancePdfColors("mf");
  const ff = nuancePdfColors("ff");
  const acappella = nuancePdfColors("acappella");
  expect(pp).toEqual({ background: "#e7e5e4", color: "#44403c" });
  expect(mf).toEqual({ background: "#b9b5b1", color: "#0c0a09" });
  expect(ff).toEqual({ background: "#292524", color: "#ffffff" });
  expect(acappella).toEqual({ border: "#b9b5b1", color: "#44403c" });
  // Plus aucun violet.
  for (const c of [pp, mf, ff, acappella]) expect(JSON.stringify(c)).not.toContain("7C3AED");
});

test("couleurs par section : même palette que l'écran, le reste en gris « autre »", () => {
  expect(sectionPdfPalette("chorus")).toEqual({ color: "#e0560a", tint: "#fcece1" });
  // Post-refrain et final prennent la couleur du refrain, comme à l'écran.
  expect(sectionPdfPalette("postchorus").color).toBe("#e0560a");
  expect(sectionPdfPalette("final").color).toBe("#e0560a");
  expect(sectionPdfPalette("verse")).toEqual({ color: "#2c8a7d", tint: "#e8f3f0" });
  expect(sectionPdfPalette("intro").color).toBe("#5b7fa6");
  expect(sectionPdfPalette("prechorus").color).toBe("#c1871f");
  expect(sectionPdfPalette("bridge").color).toBe("#7a5bcb");
  expect(sectionPdfPalette("outro").color).toBe("#4f6477");
  expect(sectionPdfPalette("coda").color).toBe("#4f6477");
  // Types sans couleur propre à l'écran (CHART_TYPE_COLOR) : gris « autre ».
  expect(sectionPdfPalette("tag")).toEqual({ color: "#6b7280", tint: "#f1f3f6" });
  expect(sectionPdfPalette("instrumental").color).toBe("#6b7280");
  expect(sectionPdfPalette("other").color).toBe("#6b7280");
});

// ── Compact (fonctions pures) ────────────────────────────────────────────────

const abba = parseChordPro(readFileSync("content/songs/abba-pere.cho", "utf8"));

test("compact : un refrain joué trois fois s'imprime une fois, deux s'il est rejoué dans une autre tonalité", () => {
  const played = resolveStructureOverride(abba.sections, ["verse-2-0", "chorus-3-1", "chorus-3-2", "chorus-3-3"]);
  const { steps, prints } = compactPlan(played, {
    sectionNotes: {},
    sectionNuances: { "chorus-3-1": { tags: ["mf"] }, "chorus-3-2": { tags: ["mf"] } },
    sectionKeys: { "chorus-3-3": "B" },
  }, abba.metadata.key);
  expect(steps).toHaveLength(4);
  expect(prints.map((p) => p.step.section.id)).toEqual(["verse-2", "chorus-3", "chorus-3"]);
  expect(prints[2].step.targetKey).toBe("B");
});

test("bandeau : deux passages identiques se replient en ×2, une nuance différente les sépare", () => {
  const played = resolveStructureOverride(abba.sections, ["chorus-3-0", "chorus-3-1", "chorus-3-2"]);
  const { steps } = compactPlan(played, {
    sectionNotes: {},
    sectionNuances: { "chorus-3-0": { tags: ["mf"] }, "chorus-3-1": { tags: ["mf"] }, "chorus-3-2": { tags: ["ff"] } },
  }, abba.metadata.key);
  const groups = stripGroups(steps, (section) => section.name ?? "");
  expect(groups.map((g) => `${g.abbr}×${g.repeat}`)).toEqual(["R×2", "R×1"]);
});

test("compact : une transition rejoint la page du chant d'avant, sauf en tête de setlist", () => {
  const items = [
    { type: "transition" as const, transitionText: "Accueil" },
    { songSlug: "a" },
    { type: "transition" as const, transitionText: "Prière" },
    { songSlug: "b" },
    { type: "transition" as const, transitionText: "" },
  ];
  const { attached, standalone } = compactTransitions(items);
  expect(attached.get(1)).toBe("Prière");
  expect(standalone.has(0)).toBe(true);
  expect(standalone.has(2)).toBe(false);
  expect(attached.has(3)).toBe(false);
});

// ── Fenêtre « Quel PDF ? » ──────────────────────────────────────────────────

test("chant : deux choix, le choix part dans le nom du fichier et revient présélectionné", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await openMenu(page);
  await pdfEntry(page).click();

  const sheet = page.getByRole("dialog", { name: "Quel PDF ?" });
  await expect(sheet).toBeVisible();
  const radios = sheet.getByRole("radio");
  await expect(radios).toHaveCount(2);
  await expect(sheet.getByRole("radio", { name: /Classique/ })).toHaveAttribute("aria-checked", "true");

  await sheet.getByRole("radio", { name: /Couleurs par section/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    sheet.getByRole("button", { name: "Télécharger" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^abba-pere-.+-couleurs\.pdf$/);

  await page.reload();
  await openMenu(page);
  await pdfEntry(page).click();
  await expect(
    page.getByRole("dialog", { name: "Quel PDF ?" }).getByRole("radio", { name: /Couleurs par section/ }),
  ).toHaveAttribute("aria-checked", "true");
});

test("setlist en vue liste : le PDF liste part directement, sans fenêtre", async ({ page }) => {
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
  await openMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    pdfEntry(page).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Culte du 21 septembre-liste.pdf");
  await expect(page.getByRole("dialog", { name: "Quel PDF ?" })).toHaveCount(0);
});

test("setlist en vue partitions : trois choix, le classique garde son nom", async ({ page }) => {
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await openMenu(page);
  await pdfEntry(page).click();

  const sheet = page.getByRole("dialog", { name: "Quel PDF ?" });
  await expect(sheet.getByRole("radio")).toHaveCount(3);
  await expect(sheet.getByRole("radio", { name: /Compact/ })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    sheet.getByRole("button", { name: "Télécharger" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Culte du 21 septembre-partitions.pdf");
});

test("setlist en vue partitions : le compact se télécharge sous son nom", async ({ page }) => {
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await openMenu(page);
  await pdfEntry(page).click();
  const sheet = page.getByRole("dialog", { name: "Quel PDF ?" });
  await sheet.getByRole("radio", { name: /Compact/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    sheet.getByRole("button", { name: "Télécharger" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Culte du 21 septembre-compact.pdf");
});
