import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { buildPerformanceBlocks, computePageKey, signatureAffichage, type PerformanceBlock, type SectionBlock } from "../src/lib/performance/blocks";
import type { JianpuManifest } from "../src/lib/jianpu/images";
import { paginateColumns, pagesUneColonne } from "../src/lib/performance/columns";
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
const CONTENTS = Object.fromEntries(["abba-pere", "一生爱你", "为我而来", "beni-soit-ton-nom"].map((s) => [s, contenu(s)]));
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
/** Un second chant FR, pour lire ailleurs que sur le premier chant. */
const BENI = item({ songSlug: "beni-soit-ton-nom", position: 4 });
const YISHENG = item({ songSlug: "一生爱你", position: 2, keyOverride: "D", jianpuSheet: true });

const sections = (blocks: PerformanceBlock[]) => blocks.filter((b): b is SectionBlock => b.kind === "section");

// ─── 1. Blocs, sans navigateur ───────────────────────────────────────────────

test.describe("buildPerformanceBlocks : affichage (pur)", () => {
  test("Sections uniques : chaque section une fois, sans note ni transition ; Ordre joué inchangé", () => {
    const unique = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(sections(unique).map((b) => b.section.id)).toEqual(["intro-1", "verse-2", "chorus-3", "intro-4", "verse-5", "bridge-6"]);
    expect(sections(unique).every((b) => !b.note && !b.nuance), "aucune note portée par les sections").toBe(true);
    expect(unique.filter((b) => b.kind === "transition-intra")).toHaveLength(0);
    // Chaque impression dit quelles occurrences elle représente : le refrain, les quatre.
    expect(sections(unique).find((b) => b.section.id === "chorus-3")!.occurrenceUids).toEqual([
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
    expect(sections(unique).map((b) => `${b.section.id}${b.keyChange ? `→${b.keyChange}` : ""}`)).toEqual([
      "intro-1", "verse-2", "chorus-3", "intro-4", "verse-5", "bridge-6", "chorus-3→C",
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

  test("fusion en structure mixte : deux chants au même uid de section, chaque passage a son identifiant (C5)", () => {
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
        { songSlug: "为我而来", sectionId: "chorus-3" },
        { songSlug: "abba-pere", sectionId: "chorus-3" },
        { songSlug: "为我而来", sectionId: "chorus-3", keyChange: "D" },
      ],
    });
    // Le défaut qui rendait les cercles faux : le même uid dans les deux chants.
    const uidAbba = CONTENTS["abba-pere"].ast.sections.find((s) => s.id === "chorus-3")!.uid;
    const uidZh = CONTENTS["为我而来"].ast.sections.find((s) => s.id === "chorus-3")!.uid;
    expect(uidAbba).toBe(uidZh);

    const ids = ["abba-pere:0", "为我而来:1", "abba-pere:2", "为我而来:3"];
    const unique = buildPerformanceBlocks([fusion], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    const entete = unique[0] as Extract<PerformanceBlock, { kind: "song-header" }>;
    expect(entete.steps!.map((s) => s.section.uid), "un identifiant par passage").toEqual(ids);
    // Le bloc garde sa section et son uid (clé des annotations, computePageKey).
    expect(sections(unique).every((b) => b.section.uid === uidAbba)).toBe(true);
    expect(sections(unique).map((b) => b.occurrenceUids)).toEqual([
      ["abba-pere:0", "abba-pere:2"], ["为我而来:1"], ["为我而来:3"],
    ]);

    const joue = buildPerformanceBlocks([fusion], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "played" });
    expect(sections(joue).map((b) => b.occurrenceUids)).toEqual(ids.map((id) => [id]));
    expect(sections(joue).every((b) => b.section.uid === uidAbba)).toBe(true);
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

/** Titre du chant lu, dans la barre du haut (elle s'escamote, mais reste dans la page). */
const titreBarre = (page: Page) => page.locator("[data-performance-mode] p.truncate.font-semibold.leading-tight").first();

/** Tourne les pages jusqu'à l'en-tête de ce chant. */
async function allerAuChant(page: Page, titre: string) {
  const total = Number((await compteur(page).innerText()).split("/")[1]);
  for (let p = 1; p <= total; p++) {
    if ((await onStage(page, "h2").filter({ hasText: titre }).count()) > 0) return;
    await page.keyboard.press("ArrowRight");
    await expect(compteur(page)).toHaveText(`${p + 1} / ${total}`);
  }
  throw new Error(`en-tête de « ${titre} » introuvable sur ${total} pages`);
}

/** Choisit un Affichage dans les Réglages ouverts, puis attend la nouvelle mise en page. */
async function choisirAffichage(feuille: ReturnType<Page["getByRole"]>, page: Page, nom: string) {
  await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: nom }).click();
  await page.locator("[data-performance-mode]").waitFor();
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
  // La mise en page se refait après le rendu : laisser l'ancre jouer avant de lire.
  await page.waitForTimeout(400);
}

test.describe("Réglages : Rôle et Affichage", () => {
  test("« Vue » devient « Rôle » ; Affichage à trois choix, partagé avec la setlist sans recharger (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    const feuille = await reglages(page);
    await expect(feuille.getByText("Rôle", { exact: true })).toBeVisible();
    await expect(feuille.getByText("Vue", { exact: true })).toHaveCount(0);
    await expect(feuille.getByText("Le même réglage que le menu Affichage de la setlist.")).toBeVisible();
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

test.describe("Réglages : corrections de la relecture", () => {
  test("changer d'Affichage pendant la lecture reste sur le chant lu, à chaque sens (C1) (FR)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
    await ouvrirMode(page, [ABBA, BENI], { affichage: "unique" });
    // L'indicateur de problèmes de `next dev` (404 de ressources, avertissements) recouvre le bouton Réglages.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await allerAuChant(page, "Béni soit Ton Nom");
    await expect(titreBarre(page)).toHaveText("Béni soit Ton Nom");

    const feuille = await reglages(page);
    for (const nom of ["Ordre joué", "Sections uniques", "Structure seule", "Ordre joué", "Sections uniques"]) {
      await choisirAffichage(feuille, page, nom);
      await expect(titreBarre(page), `Affichage « ${nom} » : toujours le 2e chant`).toHaveText("Béni soit Ton Nom");
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(onStage(page, "h2").first()).toHaveText("Béni soit Ton Nom");

    // Sur la 2e page du chant (si elle existe) : l'ancre est la section lue.
    await page.keyboard.press("ArrowRight");
    if ((await onStage(page, "h2").count()) === 0 && (await titreBarre(page).innerText()) === "Béni soit Ton Nom") {
      const encore = await reglages(page);
      await choisirAffichage(encore, page, "Ordre joué");
      await expect(titreBarre(page), "page 2 du chant lu, Sections uniques → Ordre joué").toHaveText("Béni soit Ton Nom");
    }
  });

  test("rôle Batteur mémorisé, Sections uniques choisies dans la setlist : le mode s'ouvre en Sections uniques, sans rôle (C2) (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { role: "batteur", affichage: "unique" });
    await expect(onStage(page, "[data-copy-line]").first()).toBeVisible();
    const feuille = await reglages(page);
    await expect(feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Sections uniques" })).toHaveAttribute("aria-checked", "true");
    await expect(feuille.getByRole("button", { name: "Batteur" })).toHaveAttribute("aria-pressed", "false");
    // Rien n'est écrit à l'ouverture : le rôle mémorisé reste celui de l'appareil.
    expect(await page.evaluate(() => localStorage.getItem("perf-role-preset"))).toBe("batteur");
  });

  test("rôle Pianiste mémorisé, Structure seule choisie dans la setlist : le mode s'ouvre en Structure seule, sans rôle (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { role: "pianiste", affichage: "structure" });
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);
    const feuille = await reglages(page);
    await expect(feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Structure seule" })).toHaveAttribute("aria-checked", "true");
    await expect(feuille.getByRole("button", { name: "Pianiste" }), "le rôle cède à l'Affichage, comme le Batteur (C2)").toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => localStorage.getItem("perf-role-preset"))).toBe("pianiste");
  });

  test("rôle Batteur mémorisé sans choix d'Affichage : toujours Structure seule (C2) (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { role: "batteur" });
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);
    const feuille = await reglages(page);
    await expect(feuille.getByRole("button", { name: "Batteur" })).toHaveAttribute("aria-pressed", "true");
  });

  test("Structure seule venue d'Affichage : « Accords » décoché et « Masquer les paroles » coché, comme l'écran (C4) (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { role: null });
    const feuille = await reglages(page);
    await expect(feuille.getByRole("switch", { name: "Accords" })).toBeChecked();
    await expect(feuille.getByRole("switch", { name: "Masquer les paroles" })).not.toBeChecked();
    await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Structure seule" }).click();
    await expect(feuille.getByRole("switch", { name: "Accords" })).not.toBeChecked();
    await expect(feuille.getByRole("switch", { name: "Masquer les paroles" })).toBeChecked();
  });

  test("« Transitions » coupé retire aussi les transitions du bandeau, la note reste (C6) (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA], { affichage: "unique" });
    const entete = onStage(page, "[data-entete-chant]");
    await expect(entete.getByText("→ Montée de la batterie")).toBeVisible();
    const feuille = await reglages(page);
    await feuille.getByText("Transitions", { exact: true }).locator("xpath=..").getByRole("switch").click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(entete.getByText("Piano seul, voix douces")).toBeVisible();
    await expect(entete.getByText("→ Montée de la batterie")).toHaveCount(0);
  });

  test("« Partition 简谱 » n'est proposé qu'hors Structure seule (C8) (ZH)", async ({ page }) => {
    await ouvrirMode(page, [YISHENG], { role: null });
    const feuille = await reglages(page);
    const interrupteur = feuille.getByRole("switch", { name: "Partition 简谱" });
    await expect(interrupteur, "Ordre joué : le réglage est là").toBeVisible();
    await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Structure seule" }).click();
    await expect(interrupteur, "Structure seule : sans effet, donc absent").toHaveCount(0);
    await feuille.getByRole("radiogroup", { name: "Affichage" }).getByRole("radio", { name: "Ordre joué" }).click();
    await expect(interrupteur).toBeVisible();
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

  test("Ordre joué, deux chants : l'en-tête de chacun porte sa liste « Structure » (C9) (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA, BENI]);
    await expect(onStage(page, "h2").first()).toHaveText("Abba Père");
    await expect(bandeauEntete(page).getByRole("listitem")).toHaveCount(8);
    await allerAuChant(page, "Béni soit Ton Nom");
    await expect(onStage(page, "[data-entete-chant]")).toHaveCount(1);
    await expect(bandeauEntete(page)).toBeVisible();
    expect(await bandeauEntete(page).getByRole("listitem").count(), "Béni soit Ton Nom a ses étapes").toBeGreaterThan(0);
  });

  test("neuf étapes non repliées tiennent sur une rangée du bandeau, au téléphone (C9) (FR)", async ({ page }) => {
    test.skip(page.viewportSize()!.width >= 640, "propre au téléphone");
    // I · C1 · R · Pm · C2 · R · P · Pm · R : aucune reprise consécutive, donc neuf pastilles.
    const neuf = { ...ABBA, structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "intro-4-7", "chorus-3-8"] };
    await ouvrirMode(page, [neuf]);
    const pastilles = bandeauEntete(page).locator("li > span");
    await expect(pastilles).toHaveCount(9);
    const hauts = await pastilles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(hauts.filter((y) => y === hauts[0]).length, `neuf étapes, rangées à ${[...new Set(hauts)]}`).toBe(9);
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

// ─── Rappel des pages suivantes (L2-T4) ──────────────────────────────────────

test.describe("pagination : place du rappel (pur)", () => {
  test("une colonne : un chant de trois pages a ses pages 2 et 3 plus courtes de 32 px", () => {
    // En-tête 0 (50 px), neuf sections de 100 px, page de 400 px.
    const heights = [50, ...Array(9).fill(100)];
    const flow = heights.map((_, i) => i);
    const sansRappel = pagesUneColonne(flow, heights, 400, new Set([0]));
    expect(sansRappel.map((p) => p.cols[0])).toEqual([[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]]);
    const avecRappel = pagesUneColonne(flow, heights, 400, new Set([0]), 32);
    expect(avecRappel.map((p) => p.cols[0])).toEqual([[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    for (const [n, p] of avecRappel.entries()) {
      const room = n === 0 ? 400 : 368;
      expect(p.cols[0].reduce((s, i) => s + heights[i], 0)).toBeLessThanOrEqual(room);
    }
    // Un chant suivant repart d'une page entière.
    const deuxChants = pagesUneColonne([0, 1, 2, 3, 4, 5], [50, 100, 100, 100, 50, 100], 300, new Set([0, 4]), 32);
    expect(deuxChants.map((p) => p.cols[0])).toEqual([[0, 1, 2], [3], [4, 5]]);
  });

  test("deux colonnes : les pages suivantes gardent la place du rappel", () => {
    const heightsFull = [50, ...Array(12).fill(90)];
    const heightsColumn = [50, ...Array(12).fill(100)];
    const flow = Array.from({ length: 12 }, (_, i) => i + 1);
    const pages = paginateColumns({ flow, header: 0, heightsFull, heightsColumn, pageHeight: 400, reserveSuite: 32 });
    // Page 1 : 350 px sous l'en-tête, trois blocs par colonne ; page 2 : 368 px, trois aussi.
    expect(pages[0].cols).toEqual([[1, 2, 3], [4, 5, 6]]);
    for (const p of pages.slice(1)) for (const col of p.cols) expect(col.length * 100).toBeLessThanOrEqual(368);
    expect(pages.flatMap((p) => p.cols.flat())).toEqual(flow);
  });
});

test.describe("rappel de structure (Sections uniques)", () => {
  /** Groupes du bandeau d'Abba Père : la 1re occurrence de chaque étape. */
  const ETAPES = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7"];

  async function pageSuivante(page: Page) {
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    expect(await totalPages(page), "Abba Père en Sections uniques tient sur plusieurs pages").toBeGreaterThan(1);
    await page.keyboard.press("ArrowRight");
    await expect(compteur(page)).toHaveText(/^2 \//);
  }

  /** Abba Père avec trois nuances (inventées pour le test) : sur les refrains et le pont. */
  const ABBA_NUANCES = item({
    ...ABBA,
    sectionNuances: { "verse-2-1": { tags: ["mp"] }, "chorus-3-2": { tags: ["mf"] }, "chorus-3-5": { tags: ["f"] }, "bridge-6-6": { tags: ["p"] } },
  });

  const telephone = (page: Page) => page.viewportSize()!.width < 640;

  /** Les pastilles du rappel de la page affichée : indice du groupe, pleine ou non, visible ou non. */
  const lirePastilles = (page: Page) =>
    onStage(page, "[data-rappel] li").evaluateAll((lis) =>
      lis.map((li) => {
        const pastille = li.querySelector<HTMLElement>(":scope > span")!;
        const r = pastille.getBoundingClientRect();
        return {
          pleine: pastille.hasAttribute("data-pleine"),
          visible: r.width > 0 && r.height > 0,
          hauteur: pastille.offsetHeight,
          nuances: li.querySelectorAll("[data-nuance]").length,
          lettre: getComputedStyle(pastille).color,
          fond: getComputedStyle(pastille).backgroundColor,
          taille: parseFloat(getComputedStyle(pastille.querySelector("abbr")!.parentElement!).fontSize),
        };
      }),
    );

  test("page 2 : pastilles pleines = tous les passages des sections de la page, nuance dessous, 30 px (26 px au téléphone), titre selon la largeur (FR)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
    await ouvrirMode(page, [ABBA_NUANCES], { affichage: "unique" });
    await expect(onStage(page, "[data-rappel]"), "page 1 : le bandeau, pas de rappel").toHaveCount(0);
    await pageSuivante(page);
    const rappel = onStage(page, "[data-rappel]");
    await expect(rappel).toBeVisible();
    const pastilles = await lirePastilles(page);
    expect(pastilles).toHaveLength(8);
    await expect(onStage(page, "[data-rappel] [data-cerclee]")).toHaveCount(0);

    // Toute section imprimée sur la page rend pleins tous ses passages (pas le seul premier).
    const imprimees = await onStage(page, "[data-section]").evaluateAll((els) => els.flatMap((e) => e.getAttribute("data-section-uids")!.split(" ")));
    const attendues = ETAPES.flatMap((uid, i) => (imprimees.includes(uid) ? [i] : []));
    // Les passages d'une section unique : tous ses uids (refrain : 2, 5, 7 et 8).
    const refrain = ["chorus-3-2", "chorus-3-5", "chorus-3-7"];
    if (imprimees.includes("chorus-3-2")) for (const uid of refrain) expect(imprimees, "le bloc refrain porte tous ses passages").toContain(uid);
    expect(pastilles.flatMap((p, i) => (p.pleine ? [i] : []))).toEqual(attendues);
    expect(attendues.length).toBeGreaterThan(0);

    for (const p of pastilles) {
      if (p.pleine) {
        expect(p.lettre, "lettre = couleur du fond de page").toBe("rgb(255, 255, 255)");
        expect(p.fond).not.toBe(p.lettre);
      } else {
        expect(p.nuances, "une claire n'a pas de nuance").toBe(0);
      }
      if (!p.visible) continue;
      expect(Math.abs(p.hauteur - (telephone(page) ? 26 : 30))).toBeLessThanOrEqual(1);
      expect(p.taille).toBe(telephone(page) ? 13 : 14);
    }
    // Une nuance sous chaque pleine qui en a une, aucune ailleurs.
    const avecNuance = ETAPES.map((uid) => ({ "verse-2-1": 1, "chorus-3-2": 1, "chorus-3-5": 1, "bridge-6-6": 1 }[uid] ?? 0));
    pastilles.forEach((p, i) => expect(p.nuances, `pastille ${i}`).toBe(p.pleine ? avecNuance[i] : 0));
    expect(pastilles.some((p) => p.pleine && p.nuances > 0)).toBe(true);

    // Téléphone : seulement les pleines. Sinon toutes les pastilles et le titre du chant.
    const titre = rappel.locator("span.uppercase");
    if (telephone(page)) {
      expect(pastilles.filter((p) => p.visible).every((p) => p.pleine)).toBe(true);
      await expect(titre).toBeHidden();
    } else {
      expect(pastilles.every((p) => p.visible)).toBe(true);
      await expect(titre).toBeVisible();
      await expect(titre).toHaveText("Abba Père");
      expect(await titre.evaluate((el) => getComputedStyle(el).fontSize)).toBe("13px");
    }
    // Au-dessus de toutes les sections de la page.
    const basRappel = await rappel.evaluate((el) => el.getBoundingClientRect().bottom);
    const hautSections = await onStage(page, "[data-section]").evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().top)));
    expect(basRappel).toBeLessThanOrEqual(hautSections);

    // Barres escamotées (la barre ne s'efface plus seule : toucher au centre) : le rappel est dans la page, il reste.
    const ecran = page.viewportSize()!;
    await page.mouse.click(ecran.width / 2, ecran.height / 2);
    await expect(page.getByRole("button", { name: "Quitter" })).toBeHidden({ timeout: 6000 });
    await expect(rappel).toBeVisible();
  });

  test("chant chinois : page 2, pleines = passages des sections de la page, titre chinois sur tablette et ordinateur (ZH)", async ({ page }) => {
    const zh = item({
      songSlug: "圣诞节耶稣为你而来",
      position: 1,
      structureOverride: ["intro-1-0", "verse-2-1", "chorus-5-2", "verse-3-3", "prechorus-4-4", "chorus-5-5", "bridge-6-6", "chorus-5-7"],
      sectionNuances: {
        "verse-2-1": { tags: ["mp"] }, "chorus-5-2": { tags: ["f"] }, "verse-3-3": { tags: ["mp"] }, "prechorus-4-4": { tags: ["mf"] },
        "chorus-5-5": { tags: ["f"] }, "bridge-6-6": { tags: ["p"] }, "chorus-5-7": { tags: ["f"] },
      },
    });
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "2"));
    await ouvrirMode(page, [zh], { affichage: "unique" });
    await expect(compteur(page)).toHaveText(/^1 \/ [2-9]/);
    await page.keyboard.press("ArrowRight");
    await expect(compteur(page)).toHaveText(/^2 \//);
    const rappel = onStage(page, "[data-rappel]");
    await expect(rappel).toBeVisible();
    const pastilles = await lirePastilles(page);
    const imprimees = await onStage(page, "[data-section]").evaluateAll((els) => els.flatMap((e) => e.getAttribute("data-section-uids")!.split(" ")));
    // Le refrain est imprimé une fois, avec ses trois passages : les trois pastilles R sont pleines.
    if (imprimees.includes("chorus-5-2")) {
      for (const u of ["chorus-5-2", "chorus-5-5", "chorus-5-7"]) expect(imprimees, "le bloc refrain porte tous ses passages").toContain(u);
      expect(pastilles.filter((p) => p.pleine).length).toBeGreaterThanOrEqual(3);
    }
    expect(pastilles.filter((p) => p.pleine).length).toBeGreaterThan(0);
    expect(pastilles.filter((p) => p.pleine && p.nuances > 0).length).toBeGreaterThan(0);
    for (const p of pastilles.filter((q) => q.visible)) expect(Math.abs(p.hauteur - (telephone(page) ? 26 : 30))).toBeLessThanOrEqual(1);
    await expect(onStage(page, "[data-rappel] [data-cerclee]")).toHaveCount(0);
    const titre = rappel.locator("span.uppercase");
    if (telephone(page)) await expect(titre).toBeHidden();
    else await expect(titre).toHaveText("圣诞节耶稣为你而来");
  });

  // Deux chants dont une page de Sections uniques est presque pleine : un rappel
  // sur deux rangées (62 px) déborde alors de la réserve fixe de 32 px.
  for (const slug of ["quand-tu-parles", "la-pour-toi"]) {
    test(`texte à 150 % : le rappel passe à la ligne, la réserve le suit et rien ne déborde, ${slug} (C3) (FR)`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
      await ouvrirMode(page, [item({ songSlug: slug, position: 1 })], { affichage: "unique" });
      await expect(compteur(page)).toHaveText(/^1 \/ [2-9]/);
      await page.keyboard.press("ArrowRight");
      await expect(compteur(page)).toHaveText(/^2 \//);
      const rappel = onStage(page, "[data-rappel]");
      const une = await rappel.locator("li > span").first().evaluate((el) => (el as HTMLElement).offsetHeight);
      test.skip((await rappel.evaluate((el) => (el as HTMLElement).offsetHeight)) < 2 * une, "le rappel tient sur une rangée : la réserve fixe suffit");
      const total = await totalPages(page);
      for (let p = 2; p <= total; p++) {
        await expect(compteur(page)).toHaveText(`${p} / ${total}`);
        // Rappel (marge comprise) et sections tiennent dans le budget de la page :
        // hauteur visible − marges de page (16 + 16) − sécurité (24), en px de mise en page.
        const { depasse, bas, hauteur } = await page.evaluate(() => {
          const visible = (sel: string) => [...document.querySelectorAll<HTMLElement>(`[data-performance-mode] ${sel}`)].filter((e) => !e.closest("[aria-hidden=true]"));
          const [r] = visible("[data-rappel]");
          const bas = Math.max(...visible("[data-section]").map((e) => e.getBoundingClientRect().bottom));
          const budget = innerHeight / 1.5 - 16 - 16 - 24;
          return { depasse: (bas - r.getBoundingClientRect().top) / 1.5 - budget, bas, hauteur: innerHeight };
        });
        expect(depasse, `page ${p} : le rappel et les sections dépassent le budget de la page de ${depasse.toFixed(1)} px`).toBeLessThanOrEqual(1);
        expect(bas, `page ${p} : le bas de la dernière section est dans la zone visible`).toBeLessThanOrEqual(hauteur);
        if (p < total) await page.keyboard.press("ArrowRight");
      }
    });
  }

  test("thème de scène : la lettre d'une pastille pleine est à l'encre du fond, contrastée avec la couleur de la section (FR)", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("perf-font-scale", "1.5");
      localStorage.setItem("perf-theme", "dark");
    });
    await ouvrirMode(page, [ABBA_NUANCES], { affichage: "unique" });
    await pageSuivante(page);
    const pleines = onStage(page, "[data-rappel] [data-pleine]");
    await expect(pleines.first()).toBeVisible();
    const couleurs = await pleines.evaluateAll((els) => els.map((e) => ({ lettre: getComputedStyle(e).color, fond: getComputedStyle(e).backgroundColor })));
    const lum = (rgb: string) => {
      const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const { lettre, fond } of couleurs) {
      expect(lettre, "fond de page sombre = noir").toBe("rgb(0, 0, 0)");
      const [l1, l2] = [lum(lettre), lum(fond)].sort((x, y) => y - x);
      expect((l1 + 0.05) / (l2 + 0.05), `contraste ${lettre} sur ${fond}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("un trait dessiné sur la page 2 reste sur sa section après rechargement (FR)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
    await ouvrirMode(page, [ABBA_NUANCES], { affichage: "unique" });
    await pageSuivante(page);
    await expect(onStage(page, "[data-rappel]")).toBeVisible();
    const calque = page.locator("[data-performance-mode] > canvas");
    /** Boîte (px d'écran) des pixels dessinés du calque de lecture. */
    const boite = () =>
      calque.evaluate((c: HTMLCanvasElement) => {
        const { width, height } = c;
        const d = c.getContext("2d")!.getImageData(0, 0, width, height).data;
        let x0 = width, y0 = height, x1 = -1, y1 = -1, n = 0;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (d[(y * width + x) * 4 + 3] > 0) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const k = c.getBoundingClientRect().width / width;
        return n < 20 ? null : [x0 * k, y0 * k, x1 * k, y1 * k];
      });
    await montrerChrome(page);
    await page.getByRole("button", { name: "Annoter" }).click();
    await expect(calque).toHaveCount(1);
    const ecran = page.viewportSize()!;
    const x = ecran.width * 0.4;
    const y = ecran.height * 0.55;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y + 15, { steps: 4 });
    await page.mouse.move(x + 90, y + 30, { steps: 4 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Annoter" }).click();
    await expect.poll(boite, { message: "le trait est lu sur la page 2" }).not.toBeNull();
    const avant = (await boite())!;
    // Le trait est sous le rappel, dans la page : il est sur les sections, pas sur la rangée.
    const basRappel = await onStage(page, "[data-rappel]").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(avant[1]).toBeGreaterThan(basRappel);
    // Laisser l'enregistrement partir avant de recharger.
    await page.waitForTimeout(1500);

    await page.reload();
    await lancer(page);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(compteur(page)).toHaveText(/^2 \//);
    await expect.poll(boite, { message: "le trait revient sur la page 2" }).not.toBeNull();
    const apres = (await boite())!;
    avant.forEach((v, i) => expect(Math.abs(v - apres[i]), `bord ${i} du trait`).toBeLessThanOrEqual(2));
    // Pas sur la page 1.
    await page.keyboard.press("ArrowLeft");
    await expect(compteur(page)).toHaveText(/^1 \//);
    await expect(calque, "aucun trait sur la page 1").toHaveCount(0);
  });

  test("Ordre joué : rien sur la 1re page, le rappel (points, pleines, claires) dès la 2e (FR) — détail dans rappel-ordre-joue.spec.ts", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-font-scale", "1.5"));
    await ouvrirMode(page, [ABBA]);
    await expect(onStage(page, "[data-rappel]")).toHaveCount(0);
    await pageSuivante(page);
    await expect(onStage(page, "[data-rappel]")).toBeVisible();
    await expect(onStage(page, "[data-rappel] [data-point]").first()).toBeVisible();
  });

  test("grand écran, deux colonnes : en-tête et bandeau en pleine largeur au-dessus des colonnes (FR)", async ({ page }) => {
    const grand = await page.evaluate(
      (q) => matchMedia(q).matches,
      "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
    );
    test.skip(!grand, "deux colonnes : tablette paysage et ordinateur seulement");
    await ouvrirMode(page, [ABBA], { affichage: "unique" });
    const sections = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
    const gauches = new Set(sections.map((s) => Math.round(s.left)));
    expect(gauches.size, "deux colonnes").toBe(2);
    // Le bandeau entier (pastilles, et filet des détails), pas la seule liste qui épouse ses pastilles.
    const bandeau = (await bandeauEntete(page).locator("xpath=../..").boundingBox())!;
    const largeur = Math.max(...sections.map((s) => s.right)) - Math.min(...sections.map((s) => s.left));
    expect(bandeau.width).toBeGreaterThanOrEqual(0.9 * largeur);
    expect(bandeau.y + bandeau.height).toBeLessThanOrEqual(Math.min(...sections.map((s) => s.top)));
  });
});

// ─── Annotations (L2-T5) ─────────────────────────────────────────────────────

test.describe("signatureAffichage (pur)", () => {
  const reglages = { showChords: true, showTransitions: true, hideLyrics: false, chartStyle: false, fontScale: 1 };

  test("Ordre joué : la chaîne d'avant le lot ; Sections uniques et Structure seule : une autre", () => {
    // La signature construite dans PerformanceMode avant le lot 2.
    const avant = (o: { showChords: boolean; showTransitions: boolean; hideLyrics: boolean; chartStyle: boolean; capo?: number; personalKey?: string; fontScale: number }) =>
      `c${o.showChords ? 1 : 0}t${o.showTransitions ? 1 : 0}l${o.hideLyrics ? 1 : 0}${o.chartStyle ? "s1" : ""}${o.capo ? `k${o.capo}` : ""}${o.personalKey ? `p${o.personalKey}` : ""}z${Math.round(o.fontScale * 100)}`;
    for (const o of [reglages, { ...reglages, chartStyle: true, capo: 3, personalKey: "B", fontScale: 1.2 }, { ...reglages, showChords: false, hideLyrics: true }]) {
      expect(signatureAffichage({ ...o, affichage: "played" })).toBe(avant(o));
      expect(signatureAffichage(o)).toBe(avant(o));
    }
    expect(signatureAffichage({ ...reglages, affichage: "unique" })).not.toBe(avant(reglages));
    expect(signatureAffichage({ ...reglages, affichage: "structure" })).not.toBe(avant(reglages));
    // Structure seule rend la vue ossature du batteur : même clé que ses traits d'avant.
    const batteur = { ...reglages, showChords: false, hideLyrics: true };
    expect(signatureAffichage({ ...reglages, affichage: "structure" })).toBe(avant(batteur));
  });

  test("la même page a deux clés en Ordre joué et en Sections uniques", () => {
    const blocs = buildPerformanceBlocks([ABBA], CONTENTS, true);
    const page = [0, 1, 2];
    expect(computePageKey(blocs, page, signatureAffichage({ ...reglages, affichage: "played" }))).not.toBe(
      computePageKey(blocs, page, signatureAffichage({ ...reglages, affichage: "unique" })),
    );
  });
});
