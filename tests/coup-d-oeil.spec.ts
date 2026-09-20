import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { abbreviateSection } from "../src/lib/chordpro/abbreviations";
import { uniqueSections } from "../src/lib/setlist/uniqueSections";
import { isLastPhraseOnly, materializeLastPhrase } from "../src/lib/setlist/lastPhrase";
import type { SectionOccurrence } from "../src/lib/setlist/sectionSteps";
import type { ChordProSection } from "../src/types/chordPro";

// Lot 3 « Structure coup d'œil » (docs/spec-coup-d-oeil.md) : un bandeau abrégé
// avec les nuances sous chaque étape remplace la ligne ORDRE ; par défaut chaque
// section n'est imprimée qu'une fois.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-coup-d-oeil";

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
      // FR : couplet 1 puis refrain repris deux fois, forte les deux fois → « R ×2 ».
      item({
        songSlug: "abba-pere",
        position: 1,
        structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"],
        sectionNuances: { "chorus-3-1": { tags: ["f"] }, "chorus-3-2": { tags: ["f"] } },
      }),
      // ZH sur son scan 简谱 : le bandeau porte la note de section (le scan ne peut pas).
      item({
        songSlug: "一生爱你",
        position: 2,
        jianpuSheet: true,
        structureOverride: ["verse-2-0", "chorus-3-1"],
        sectionNotes: { "chorus-3-1": "plus doux" },
      }),
    ],
    ...over,
  };
}

async function openPartitions(page: Page, data = setlist()) {
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: data }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  return db;
}

// ── Abréviations (fonction pure) ────────────────────────────────────────────

test("abréviations : une lettre par sorte de section, le numéro des couplets, Dp et Pm", () => {
  const s = (type: string, name?: string, number?: string) => ({ type, name, number });
  expect(abbreviateSection(s("intro", "Intro"))).toBe("I");
  expect(abbreviateSection(s("verse", "Couplet 1", "1"))).toBe("C1");
  expect(abbreviateSection(s("verse", "主歌/Couplet"))).toBe("C");
  expect(abbreviateSection(s("prechorus", "Pré-refrain"))).toBe("Pr");
  expect(abbreviateSection(s("chorus", "Refrain"))).toBe("R");
  expect(abbreviateSection(s("chorus", "Refrain 2", "2"))).toBe("R2");
  expect(abbreviateSection(s("postchorus", "Post-refrain"))).toBe("Po");
  expect(abbreviateSection(s("bridge", "Pont"))).toBe("P");
  // Le nom écrit l'emporte sur le type, comme pour le libellé complet.
  expect(abbreviateSection(s("intro", "Interlude"))).toBe("Pm");
  expect(abbreviateSection(s("other", "Instrumental"))).toBe("Pm");
  expect(abbreviateSection(s("other", "间奏"))).toBe("Pm");
  expect(abbreviateSection(s("outro", "Outro"))).toBe("F");
  expect(abbreviateSection(s("other", "Coda"))).toBe("F");
  expect(abbreviateSection(s("other", "Tag"))).toBe("Tag");
  expect(abbreviateSection(s("other", "Dernière phrase (Refrain)"))).toBe("Dp");
  // Une section « autre » sans sorte connue garde son nom écrit.
  expect(abbreviateSection(s("other", "Bénédiction"))).toBe("Bénédiction");
});

// ── Bandeau à la place de la ligne ORDRE ────────────────────────────────────

test("vue partitions : le bandeau abrégé remplace ORDRE, reprises en ×2, nuance sous l'étape (FR)", async ({ page }) => {
  await openPartitions(page);
  await expect(page.getByText("ORDRE", { exact: true })).toHaveCount(0);

  const strip = page.getByRole("list", { name: "Structure" }).first();
  await expect(strip).toBeVisible();
  const steps = strip.getByRole("listitem");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toContainText("C1");
  await expect(steps.nth(1)).toContainText("R");
  await expect(steps.nth(1)).toContainText("×2");
  await expect(steps.nth(1).locator("[data-nuance]")).toHaveText("f");
  await expect(steps.nth(0).locator("[data-nuance]")).toHaveCount(0);
});

test("vue partitions : sur un scan 简谱, le bandeau porte l'abréviation et la note de section (ZH)", async ({ page }) => {
  await openPartitions(page);
  const strip = page.getByRole("list", { name: "Structure" }).nth(1);
  await expect(strip).toBeVisible();
  const steps = strip.getByRole("listitem");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toHaveText("C");
  await expect(steps.nth(1)).toContainText("R");
  // La note vit sous le bandeau, préfixée par l'abréviation de son étape.
  await expect(page.getByText("plus doux")).toBeVisible();
});

test("page du chant : même bandeau, sans nuances, plus de ligne ORDRE", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await expect(page.getByText("ORDRE", { exact: true })).toHaveCount(0);
  const strip = page.getByRole("list", { name: "Structure" });
  await expect(strip.getByRole("listitem")).toHaveText(["I", "C1", "R", "Pm", "C2", "P"]);
  // L'abréviation garde son nom complet pour les lecteurs d'écran.
  await expect(strip.getByRole("listitem").nth(3).locator("abbr")).toHaveAttribute("title", "Interlude");
});

// ── S2 : sections uniques, modes d'affichage, sommaire ──────────────────────

test("sections uniques : une fois par section et par tonalité, occurrences représentées gardées", () => {
  const sec = (id: string, uid: string, type: ChordProSection["type"]): ChordProSection => ({ id, uid, type, name: "", lines: [] });
  const step = (section: ChordProSection, over: Partial<SectionOccurrence> = {}): SectionOccurrence => ({ section, note: "", transition: "", ...over });
  const steps = [
    step(sec("verse-2", "verse-2-0", "verse")),
    step(sec("chorus-3", "chorus-3-1", "chorus"), { nuance: { tags: ["f"] } }),
    step(sec("chorus-3", "chorus-3-2", "chorus"), { note: "plus fort" }),
    step(sec("chorus-3", "chorus-3-3", "chorus"), { targetKey: "A" }),
    // Modulation vers la tonalité jouée : ce n'en est pas une.
    step(sec("chorus-3", "chorus-3-4", "chorus"), { targetKey: "G" }),
  ];
  expect(uniqueSections(steps, "G").map((u) => [u.step.section.uid, u.uids])).toEqual([
    ["verse-2-0", ["verse-2-0"]],
    ["chorus-3-1", ["chorus-3-1", "chorus-3-2", "chorus-3-4"]],
    ["chorus-3-3", ["chorus-3-3"]],
  ]);
});

test.describe("modes d'affichage de la vue partitions", () => {
  async function choose(page: Page, name: string) {
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitemradio", { name }).click();
    // Le menu reste ouvert après un choix (Radix cache alors le reste de la page).
    await page.keyboard.press("Escape");
  }
  const song1Sections = (page: Page) => page.locator('[data-outline-item="1"] [data-section]');

  // Défaut « Ordre joué » depuis le 20/09/2026 (Timothée, après la mise en
  // ligne) : les paroles suivent la structure de la présidence, reprises
  // comprises. « Sections uniques » reste un choix du menu.
  test("par défaut, l'ordre joué : le refrain repris est réimprimé, sa nuance sur chaque reprise", async ({ page }) => {
    await openPartitions(page);
    await expect(song1Sections(page)).toHaveCount(3);
    await expect(song1Sections(page).nth(1)).toHaveAttribute("data-section-uids", "chorus-3-1");
    await expect(song1Sections(page).nth(2)).toHaveAttribute("data-section-uids", "chorus-3-2");
    await expect(page.locator('[data-outline-item="1"] [data-section] [data-nuance]')).toHaveText(["f", "f"]);
    expect(await page.evaluate(() => localStorage.getItem("partition-layout")), "le défaut n'est pas un choix : rien n'est retenu").toBeNull();
  });

  test("« Sections uniques » : le refrain repris n'est imprimé qu'une fois, sa nuance dans le bandeau ; le choix est retenu sur l'appareil", async ({ page }) => {
    await openPartitions(page);
    await choose(page, "Sections uniques");
    await expect(song1Sections(page)).toHaveCount(2);
    await expect(song1Sections(page).nth(1)).toHaveAttribute("data-section-uids", "chorus-3-1 chorus-3-2");
    await expect(page.locator('[data-outline-item="1"] [data-section] [data-nuance]')).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Structure" }).first().locator("[data-nuance]")).toHaveText("f");
    expect(await page.evaluate(() => localStorage.getItem("partition-layout"))).toBe("unique");
  });

  test("le choix retenu s'applique à l'ouverture", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("partition-layout", "unique"));
    await openPartitions(page);
    await expect(song1Sections(page)).toHaveCount(2);
  });

  test("« Structure seule » : bandeau sans paroles ; sur un scan 简谱, pas de scan", async ({ page }) => {
    await openPartitions(page);
    await expect(page.locator('[data-outline-item="2"] img')).toHaveCount(1);
    await choose(page, "Structure seule");
    await expect(page.locator("[data-section]")).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Structure" })).toHaveCount(2);
    await expect(page.locator('[data-outline-item="2"] img')).toHaveCount(0);
  });

  test("rôle Batteur mémorisé (mode louange) : la vue s'ouvre en « Structure seule »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "batteur"));
    await openPartitions(page);
    await expect(page.getByRole("list", { name: "Structure" }).first()).toBeVisible();
    await expect(page.locator("[data-section]")).toHaveCount(0);
  });

  test("mode Adapter : ordre joué forcé, le bandeau reste", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("partition-layout", "unique"));
    await openPartitions(page);
    await expect(song1Sections(page)).toHaveCount(2);
    await page.getByRole("button", { name: "Adapter" }).click();
    await expect(song1Sections(page)).toHaveCount(3);
    await expect(page.getByRole("list", { name: "Structure" }).first()).toBeVisible();
  });

  test.describe("sommaire (ordinateur)", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test("en sections uniques, « Refrain ×2 » mène à l'unique refrain imprimé et le marque", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("partition-layout", "unique"));
      await openPartitions(page);
      const outline = page.getByRole("navigation", { name: "Déroulé" });
      await outline.getByRole("button", { name: "Refrain ×2" }).click();
      const refrain = page.locator('[data-outline-item="1"] [data-section-uids~="chorus-3-2"]');
      await expect.poll(async () => (await refrain.boundingBox())!.y).toBeLessThan(250);
      await expect(outline.getByRole("button", { name: "Refrain ×2" })).toHaveClass(/font-semibold/);
    });
  });
});

// ── S3 : « Dernière phrase » (Dp) ───────────────────────────────────────────

const SOURCE = `{title: Test}
{key: G}

{start_of_verse: Couplet 1}
Pre[G]mière ligne
Deu[C]xième ligne
{end_of_verse}

{start_of_chorus: Refrain}
Un [G]refrain
Qui fi[D]nit [G]là
{end_of_chorus}
`;

test("Dernière phrase : les N dernières lignes de la section, accords compris, en section « autre » à la fin", () => {
  const one = materializeLastPhrase(SOURCE, "chorus-2", 1, "R")!;
  expect(one.sectionId).toBe("other-3");
  expect(one.source).toBe(`${SOURCE.trimEnd()}\n\n{start_of_other: Dernière phrase – R}\nQui fi[D]nit [G]là\n{end_of_other}\n`);
  expect(materializeLastPhrase(SOURCE, "chorus-2", 2, "R")!.source).toContain(
    "{start_of_other: Dernière phrase – R}\nUn [G]refrain\nQui fi[D]nit [G]là\n{end_of_other}",
  );
  expect(materializeLastPhrase(SOURCE, "chorus-2", 5, "R")!.source, "au plus toute la section").toContain(
    "\nUn [G]refrain\nQui fi[D]nit [G]là\n{end_of_other}",
  );
  expect(materializeLastPhrase(SOURCE, "bridge-9", 1, "P")).toBeNull();
  expect(materializeLastPhrase(one.source, "verse-1", 1, "C")!.sectionId, "un second Dp").toBe("other-4");
});

test("Dernière phrase (中文) : la ligne {jianpu:} et le pinyin suivent leur ligne", () => {
  const zh = "{title: 测试}\n{key: C}\n{language: zh}\n\n{start_of_chorus: 副歌}\n{jianpu: 1 2 3}\n[C]一生爱你   yī shēng ài nǐ\n{jianpu: 5 6 5}\n[G]一生敬拜你   yī shēng jìng bài nǐ\n{end_of_chorus}\n";
  expect(materializeLastPhrase(zh, "chorus-1", 1, "R")!.source).toContain(
    "{start_of_other: Dernière phrase – R}\n{jianpu: 5 6 5}\n[G]一生敬拜你   yī shēng jìng bài nǐ\n{end_of_other}",
  );
});

test("badge « Version modifiée » : rien à dire quand seul un Dp a été ajouté", () => {
  const withDp = materializeLastPhrase(SOURCE, "chorus-2", 1, "R")!.source;
  expect(isLastPhraseOnly(SOURCE, withDp)).toBe(true);
  expect(isLastPhraseOnly(SOURCE, materializeLastPhrase(withDp, "verse-1", 1, "C")!.source)).toBe(true);
  expect(isLastPhraseOnly(SOURCE, withDp.replace("Un [G]refrain", "Un [Em]refrain")), "un accord adapté").toBe(false);
  expect(isLastPhraseOnly(SOURCE, `${SOURCE}\n{start_of_chorus: Refrain}\nUn [G]refrain\n{end_of_chorus}\n`), "copie du mode Adapter").toBe(false);
  expect(isLastPhraseOnly(SOURCE, SOURCE)).toBe(true);
});

test("éditeur : la Dernière phrase du refrain s'enregistre, puis s'affiche « Dp » avec ses accords, sans badge", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}/edit`);
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  await page.getByRole("button", { name: /^Structure/ }).first().click();
  await page.getByRole("button", { name: "Dernière phrase", exact: true }).click();

  const sheet = page.getByRole("dialog");
  // La dernière étape jouée (le refrain) est proposée d'office.
  await expect(sheet.getByLabel("Section")).toHaveValue("chorus-3");
  await expect(sheet.locator("[data-copy-line]")).toHaveCount(1);
  // Les accords s'intercalent dans le texte rendu : on vérifie mots et accord.
  await expect(sheet.locator("[data-copy-line]")).toContainText(/Abba .*Père.*Toi\./);
  await expect(sheet.locator("[data-copy-line]")).toContainText("F#m");
  await sheet.getByRole("button", { name: "2 lignes" }).click();
  await expect(sheet.locator("[data-copy-line]")).toHaveCount(2);
  await sheet.getByRole("button", { name: "1 ligne" }).click();
  await sheet.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(page.getByText("Dernière phrase – R", { exact: true })).toBeVisible();
  await expect
    .poll(() => {
      const items = db.doc(`setlists/${SETLIST_ID}`)?.items as { contentOverride?: string; structureOverride?: string[] }[] | undefined;
      const first = items?.[0];
      return !!first?.contentOverride?.includes("{start_of_other: Dernière phrase – R}") && (first.structureOverride?.at(-1) ?? "").startsWith("other-7");
    }, { timeout: 10_000 })
    .toBe(true);

  await page.goto(`/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  await expect(page.getByRole("list", { name: "Structure" }).first().getByRole("listitem").last()).toHaveText("Dp");
  const dp = page.locator('[data-outline-item="1"] [data-section]').last();
  await expect(dp).toContainText(/Abba .*Père.*Toi\./);
  await expect(dp).toContainText("F#m");
  await expect(page.getByText("Version modifiée")).toHaveCount(0);
});
