import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { buildPerformanceBlocks, computePageKey, type PerformanceBlock, type SectionBlock } from "../src/lib/performance/blocks";
import type { JianpuManifest } from "../src/lib/jianpu/images";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { fermerMenus, ouvrirAffichage, ouvrirPartitions } from "./helpers/setlist";

// Lot 2 du chantier 简谱 (docs/spec-jianpu-integration.md) : « Sections uniques » et
// structure dans le mode louange. Setlist « Culte du 11 octobre » (fictive) :
// 1 为我而来 (C), 2 一生爱你 (D, gravé en E), 3 Abba Père (A, I · C1 · R · Pm · C2 · R · P · R ×2,
// transition après C2, note sur le 2e R).

// ─── Données ─────────────────────────────────────────────────────────────────

const contenu = (slug: string) => {
  const source = readFileSync(`content/songs/${slug}.cho`, "utf8");
  return { slug, ast: parseChordPro(source), source };
};
const CONTENTS = Object.fromEntries(["abba-pere", "一生爱你", "为我而来"].map((s) => [s, contenu(s)]));
const MANIFESTE = JSON.parse(readFileSync("public/jianpu/index.json", "utf8")) as JianpuManifest;

const item = (over: Partial<SetlistItem> & { songSlug: string; position: number }): SetlistItem => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

/** Abba Père : I · C1 · R · Pm · C2 · R · P · R · R ; transition après C2, note sur le 2e R. */
const ABBA = item({
  songSlug: "abba-pere",
  position: 3,
  structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"],
  sectionTransitions: { "verse-5-4": "Montée de la batterie" },
  sectionNotes: { "chorus-3-5": "Piano seul, voix douces" },
});
const YISHENG = item({ songSlug: "一生爱你", position: 2, keyOverride: "D", jianpuSheet: true });

const sections = (blocks: PerformanceBlock[]) => blocks.filter((b): b is SectionBlock => b.kind === "section");
const noms = (blocks: PerformanceBlock[]) => sections(blocks).map((b) => b.section.name);

// ─── 1. Blocs, sans navigateur ───────────────────────────────────────────────

test.describe("buildPerformanceBlocks : affichage (pur)", () => {
  test("Sections uniques : chaque section une fois, sans note ni transition ; Ordre joué inchangé", () => {
    const unique = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(noms(unique)).toEqual(["Intro", "Couplet 1", "Refrain", "Interlude", "Couplet 2", "Pont"]);
    expect(sections(unique).every((b) => !b.note && !b.nuance), "aucune note portée par les sections").toBe(true);
    expect(unique.filter((b) => b.kind === "transition-intra")).toHaveLength(0);
    // Chaque impression dit quelles occurrences elle représente : le refrain, les quatre.
    expect(sections(unique).find((b) => b.section.name === "Refrain")!.occurrenceUids).toEqual([
      "chorus-3-2", "chorus-3-5", "chorus-3-7", "chorus-3-8",
    ]);

    const joue = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "played" });
    expect(sections(joue)).toHaveLength(9);
    expect(sections(joue).map((b) => b.note).filter(Boolean)).toEqual(["Piano seul, voix douces"]);
    expect(joue.filter((b) => b.kind === "transition-intra").map((b) => (b as { text: string }).text)).toEqual(["Montée de la batterie"]);
    expect(sections(joue).map((b) => b.occurrenceUids)).toEqual(ABBA.structureOverride!.map((u) => [u]));
    // Sans options : l'ordre joué d'aujourd'hui.
    const defaut = buildPerformanceBlocks([ABBA], CONTENTS, true);
    expect(defaut.map((b) => b.kind)).toEqual(joue.map((b) => b.kind));
  });

  test("l'en-tête porte le déroulé joué (bandeau), modulation vers la tonalité jouée neutralisée", () => {
    const avecMod = { ...ABBA, keyOverride: "B", sectionKeys: { "bridge-6-6": "B", "chorus-3-8": "C" } };
    const [entete] = buildPerformanceBlocks([avecMod], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(entete.kind).toBe("song-header");
    const steps = (entete as Extract<PerformanceBlock, { kind: "song-header" }>).steps!;
    expect(steps.map((s) => s.section.uid)).toEqual(ABBA.structureOverride);
    expect(steps.map((s) => s.targetKey ?? "")).toEqual(["", "", "", "", "", "", "", "", "C"]);
    expect(steps[4].transition).toBe("Montée de la batterie");
    expect(steps[5].note).toBe("Piano seul, voix douces");
    // 升调 : le refrain rejoué en C est réimprimé, sa tonalité à part.
    const unique = buildPerformanceBlocks([avecMod], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(sections(unique).map((b) => `${b.section.name}${b.keyChange ? `→${b.keyChange}` : ""}`)).toEqual([
      "Intro", "Couplet 1", "Refrain", "Interlude", "Couplet 2", "Pont", "Refrain→C",
    ]);
  });

  test("Structure seule : un chant à scan donne ses sections, pas de bloc jianpu-sheet (D13)", () => {
    const blocs = (affichage: "played" | "unique" | "structure") =>
      buildPerformanceBlocks([YISHENG, ABBA], CONTENTS, true, undefined, MANIFESTE, "auto", undefined, { affichage });
    expect(blocs("played").filter((b) => b.kind === "jianpu-sheet"), "en ordre joué, le scan").toHaveLength(1);
    expect(blocs("unique").filter((b) => b.kind === "jianpu-sheet"), "en sections uniques, le scan inchangé").toHaveLength(1);

    const structure = blocs("structure");
    expect(structure.filter((b) => b.kind === "jianpu-sheet")).toHaveLength(0);
    const zh = sections(structure).filter((b) => b.songTitle === "一生爱你");
    expect(zh.map((b) => b.section.type)).toEqual(["intro", "verse", "chorus"]);
    // Le reste suit l'ordre joué : Abba Père garde ses neuf passages, note et transition.
    expect(sections(structure).filter((b) => b.songTitle === "Abba Père")).toHaveLength(9);
    expect(structure.filter((b) => b.kind === "transition-intra")).toHaveLength(1);
  });

  test("changer d'affichage reconstruit les blocs sous la mise en page : la clé d'une page aux indices périmés se calcule", () => {
    // Sections uniques donne moins de blocs que l'ordre joué ; la page lue porte
    // encore, le temps d'un rendu, les indices de l'ancienne mise en page.
    const unique = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    const joue = buildPerformanceBlocks([ABBA], CONTENTS, true);
    const perimes = [joue.length - 2, joue.length - 1];
    expect(perimes.every((i) => i >= unique.length)).toBe(true);
    expect(() => computePageKey(unique, perimes)).not.toThrow();
  });

  test("fusion en structure mixte : même filtre que la vue Partitions, bandeau des deux chants", () => {
    const fusion = item({
      type: "fusion",
      songSlug: "",
      position: 4,
      fusionSongs: [
        { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
        { songSlug: "为我而来", keyOverride: null, structureOverride: null, sectionNotes: {} },
      ],
      mixedStructure: [
        { songSlug: "abba-pere", sectionId: "chorus-3" },
        { songSlug: "为我而来", sectionId: "chorus-3", note: "Tous ensemble" },
        { songSlug: "abba-pere", sectionId: "chorus-3", transition: "On ralentit" },
        { songSlug: "为我而来", sectionId: "chorus-3", keyChange: "D" },
      ],
    });
    const unique = buildPerformanceBlocks([fusion], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(sections(unique).map((b) => `${b.songTitle}:${b.section.id}${b.keyChange ? `→${b.keyChange}` : ""}`)).toEqual([
      "Abba Père:chorus-3", "为我而来:chorus-3", "为我而来:chorus-3→D",
    ]);
    expect(unique.filter((b) => b.kind === "transition-intra")).toHaveLength(0);
    const entete = unique[0] as Extract<PerformanceBlock, { kind: "song-header" }>;
    expect(entete.steps!.map((s) => [s.note, s.transition])).toEqual([["", ""], ["Tous ensemble", ""], ["", "On ralentit"], ["", ""]]);
  });
});

// ─── À l'écran ───────────────────────────────────────────────────────────────

const SETLIST_ID = "setlist-sections-uniques";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const setlist = (items: SetlistItem[]) => ({
  title: "Culte du 11 octobre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items,
});

/** Page affichée du mode louange, sans la page setlist dessous ni les copies de mesure. */
const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);
const compteur = (page: Page) => page.locator("[data-performance-mode] span.tabular-nums").last();

/** Ouvre la setlist et lance le mode louange (rôle déjà choisi, `null` = aucun). */
async function ouvrirMode(page: Page, items: SetlistItem[], { role = "pianiste" as string | null, affichage = null as string | null } = {}) {
  await page.addInitScript(({ r, a }) => {
    if (r) localStorage.setItem("perf-role-preset", r);
    else localStorage.setItem("perf-role-asked", "1");
    if (a) localStorage.setItem("partition-layout", a);
  }, { r: role, a: affichage });
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(items) }, `/setlists/${SETLIST_ID}`);
  await lancer(page);
  return db;
}

async function lancer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(compteur(page)).toHaveText(/^\d+ \/ \d+$/);
}

/** Les barres s'effacent après 3 s : un toucher au centre les rappelle. */
async function montrerChrome(page: Page) {
  if (await page.getByRole("button", { name: "Quitter" }).isVisible()) return;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(w / 2, h / 2);
  await expect(page.getByRole("button", { name: "Quitter" })).toBeVisible();
}

async function reglages(page: Page) {
  await montrerChrome(page);
  await page.getByRole("button", { name: "Réglages" }).click();
  const feuille = page.getByRole("dialog", { name: "Réglages" });
  await expect(feuille).toBeVisible();
  return feuille;
}

/** Quitte le mode louange en rendant la page setlist où elle était (voir performance-mode.spec.ts). */
async function quitter(page: Page) {
  const y = await page.evaluate(() => window.scrollY);
  // Un seul Échap pour la feuille : un second, pendant qu'elle se referme,
  // quitterait le mode louange.
  if (await page.getByRole("dialog").isVisible()) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await montrerChrome(page);
  await page.getByRole("button", { name: "Quitter" }).click();
  await page.evaluate((to) => window.scrollTo(0, to), y);
}

test.describe("Réglages : Rôle et Affichage", () => {
  test("« Vue » devient « Rôle » ; Affichage à trois choix, partagé avec la setlist sans recharger (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    const feuille = await reglages(page);
    await expect(feuille.getByText("Rôle", { exact: true })).toBeVisible();
    await expect(feuille.getByText("Vue", { exact: true })).toHaveCount(0);
    const affichage = feuille.getByRole("radiogroup", { name: "Affichage" });
    await expect(affichage.getByRole("radio")).toHaveText(["Ordre joué", "Sections uniques", "Structure seule"]);
    await expect(affichage.getByRole("radio", { name: "Ordre joué" })).toHaveAttribute("aria-checked", "true");

    await affichage.getByRole("radio", { name: "Sections uniques" }).click();
    await expect(affichage.getByRole("radio", { name: "Sections uniques" })).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate(() => localStorage.getItem("partition-layout"))).toBe("unique");
    // Toucher Affichage désélectionne le rôle, comme « Accords ».
    await expect(feuille.getByRole("button", { name: "Pianiste" })).toHaveAttribute("aria-pressed", "false");

    await quitter(page);
    await ouvrirPartitions(page);
    await ouvrirAffichage(page);
    await expect(page.getByRole("menuitemradio", { name: "Sections uniques" })).toHaveAttribute("aria-checked", "true");
    // Et dans l'autre sens : la setlist choisit, le mode louange le montre.
    await page.getByRole("menuitemradio", { name: "Structure seule" }).click();
    await fermerMenus(page);
    await lancer(page);
    const retour = await reglages(page);
    await expect(retour.getByRole("radio", { name: "Structure seule" })).toHaveAttribute("aria-checked", "true");
  });

  test("Batteur → Structure seule écrite ; « Ordre joué » ensuite : plus de rôle, les paroles reviennent (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    const feuille = await reglages(page);
    await feuille.getByRole("button", { name: "Batteur" }).click();
    await expect(feuille.getByRole("button", { name: "Batteur" })).toHaveAttribute("aria-pressed", "true");
    const affichage = feuille.getByRole("radiogroup", { name: "Affichage" });
    await expect(affichage.getByRole("radio", { name: "Structure seule" })).toHaveAttribute("aria-checked", "true");
    expect(await page.evaluate(() => localStorage.getItem("partition-layout"))).toBe("structure");
    await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);

    await affichage.getByRole("radio", { name: "Ordre joué" }).click();
    await expect(affichage.getByRole("radio", { name: "Ordre joué" })).toHaveAttribute("aria-checked", "true");
    await expect(feuille.locator("button[aria-pressed=true]")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("partition-layout"))).toBe("played");
    await page.keyboard.press("Escape");
    await expect(onStage(page, "[data-section] [data-copy-line]").first()).toBeVisible();
  });

  test("Structure seule choisie dans Affichage : la structure en grand, sans rôle (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { role: null });
    const feuille = await reglages(page);
    await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Structure seule" }).click();
    await page.keyboard.press("Escape");
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);
    // Un rôle autre que Batteur ramène l'ordre joué (O5).
    const encore = await reglages(page);
    await encore.getByRole("button", { name: "Pianiste" }).click();
    await expect(encore.getByRole("radio", { name: "Ordre joué" })).toHaveAttribute("aria-checked", "true");
  });

  test("paroles masquées et accords coupés, sans rôle : Affichage montre Structure seule (O7) (FR)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-hide-lyrics", "1"));
    await ouvrirMode(page, [ABBA], { role: null });
    const feuille = await reglages(page);
    await feuille.getByRole("switch", { name: "Accords" }).click();
    const affichage = feuille.getByRole("radiogroup", { name: "Affichage" });
    await expect(affichage.getByRole("radio", { name: "Structure seule" })).toHaveAttribute("aria-checked", "true");
    // Sections uniques depuis la vue structure : paroles et accords reviennent.
    await affichage.getByRole("radio", { name: "Sections uniques" }).click();
    await expect(feuille.getByRole("switch", { name: "Accords" })).toBeChecked();
    await expect(feuille.getByRole("switch", { name: "Masquer les paroles" })).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem("perf-hide-lyrics"))).toBe("0");
  });
});

// ─── Bandeau en tête du chant (L2-T3) ────────────────────────────────────────

/** Bandeau de structure de l'en-tête de chant affiché. */
const bandeauEntete = (page: Page) => onStage(page, "[data-entete-chant]").getByRole("list", { name: "Structure" });
const totalPages = async (page: Page) => Number((await compteur(page).innerText()).split("/")[1]);

/** Compte `selector` sur chaque page affichée, de la première à la dernière. */
async function surToutesLesPages(page: Page, selector: string): Promise<number> {
  const total = await totalPages(page);
  let n = 0;
  for (let p = 1; p <= total; p++) {
    await expect(compteur(page)).toHaveText(`${p} / ${total}`);
    n += await onStage(page, selector).count();
    await page.keyboard.press("ArrowRight");
  }
  return n;
}

test.describe("bandeau de pastilles en tête du chant", () => {
  test("Ordre joué : huit étapes sans détails, la note reste sur sa section (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    await expect(bandeauEntete(page).getByRole("listitem")).toHaveCount(8);
    await expect(bandeauEntete(page).getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "R", "P", "R×2"]);
    await expect(onStage(page, "[data-entete-chant]").getByText("Piano seul, voix douces")).toHaveCount(0);
    expect(await surToutesLesPages(page, "[data-section]"), "neuf passages joués").toBe(9);
  });

  test("Sections uniques : notes et transitions numérotées sous le bandeau, chaque section une fois (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { affichage: "unique" });
    const entete = onStage(page, "[data-entete-chant]");
    await expect(entete.getByText("→ Montée de la batterie")).toBeVisible();
    await expect(entete.getByText("Piano seul, voix douces")).toBeVisible();
    expect(await surToutesLesPages(page, "[data-section]"), "six sections, une fois chacune").toBe(6);
  });

  test("pastilles du mode louange : 32 px sur téléphone, 44 px à partir de la tablette (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    const pastille = bandeauEntete(page).locator("li > span").first();
    await expect(pastille).toBeVisible();
    const attendu = page.viewportSize()!.width < 640 ? 32 : 44;
    // Hauteur de mise en page : le mode louange agrandit le texte par transform.
    expect(await pastille.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(attendu);
  });

  test("chant sur scan : Sections uniques garde le scan et le bandeau détaillé ; Structure seule l'efface (ZH)", async ({ page }) => {
    const zh = item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, sectionNotes: { "chorus-3": "Ralentir la dernière ligne" } });
    await ouvrirMode(page, [zh], { affichage: "unique" });
    await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();
    const bandeauScan = onStage(page, "ol[aria-label=Structure]");
    await expect(bandeauScan).toHaveCount(1);
    await expect(onStage(page, "li").filter({ hasText: "Ralentir la dernière ligne" })).toBeVisible();

    const feuille = await reglages(page);
    await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Structure seule" }).click();
    await page.keyboard.press("Escape");
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(onStage(page, "[data-jianpu-page]")).toHaveCount(0);
    await expect(onStage(page, "h2").first()).toHaveText("一生爱你");
    await expect(bandeauEntete(page)).toHaveCount(0);
  });
});

