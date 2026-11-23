import { expect, test, type Locator, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, lireCompteur, onStage, ouvrirMenu, type Langue } from "./helpers/louange";

// Parcours à l'œil du 14/11/2026 (docs/parcours-oeil-2026-11-14.md), trois défauts du mode louange :
// R1 (une note de nuance longue éclatait la rangée des ronds), G (pas de Métronome à partir de 768 px pour un
// chant sans tempo), F (la légende « Points : déjà joué… » cachait le titre de la 1re section de la page 2).
// Setlist fictive « Veillée des Tilleuls », chants sans tempo : Abba Père (FR), 十字架 (中文).

const SETLIST_ID = "setlist-trois-defauts";
const MUSICIENNE: FakeProfile = {
  uid: "uid-trois-defauts",
  email: "ondine.verlac@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const NOTE = {
  fr: "boum avec la batterie, puis elle revient plus fort au deuxième passage jusqu'au pont",
  zh: "鼓先停一下，然后第二遍更强地回来，一直到桥段为止，全体一起加入",
};

const CHANTS: Record<Langue, { item: SetlistItem; bouton: RegExp; structure: string }> = {
  fr: {
    bouton: /Mode Louange/,
    structure: "Structure",
    item: {
      songSlug: "abba-pere",
      position: 1,
      keyOverride: null,
      showChords: true,
      showPinyin: true,
      useJianpu: false,
      structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"],
      sectionNotes: {},
      sectionNuances: { "chorus-3-2": { tags: ["f"], note: NOTE.fr } },
      notes: "",
    },
  },
  zh: {
    bouton: /敬拜模式/,
    structure: "结构",
    item: {
      songSlug: "十字架",
      position: 1,
      keyOverride: null,
      showChords: true,
      showPinyin: true,
      useJianpu: false,
      structureOverride: ["verse-1-0", "chorus-5-1", "verse-2-2", "chorus-5-3", "verse-3-4", "chorus-5-5", "verse-4-6", "chorus-5-7", "chorus-5-8"],
      sectionNotes: {},
      sectionNuances: { "chorus-5-1": { tags: ["f"], note: NOTE.zh } },
      notes: "",
    },
  },
};

async function ouvrir(page: Page, langue: Langue, opts: { unique?: boolean } = {}) {
  await page.addInitScript(([l, u]) => {
    if (sessionStorage.getItem("test-init")) return;
    sessionStorage.setItem("test-init", "1");
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1.5");
    if (u) localStorage.setItem("partition-layout", "unique");
    // 十字架 a un scan 简谱 : on lit ses paroles (la rangée des ronds et le rappel sont ceux des pages de texte).
    if (l === "zh") { localStorage.setItem("i18nextLng", "zh-CN"); localStorage.setItem("jianpu-sheet-pref", "never"); }
  }, [langue, !!opts.unique] as const);
  const setlist = {
    title: "Veillée des Tilleuls",
    leader: "Présidence",
    category: "Culte Francophone",
    date: "2026-11-22",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items: [CHANTS[langue].item],
  };
  await signInAs(page, MUSICIENNE, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: CHANTS[langue].bouton }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  // Sections uniques au téléphone : la page 1 ne porte que l'en-tête et sa liste.
  await expect(onStage(page, "[data-section], [data-entete-chant]").first()).toBeVisible();
}

const boite = async (l: Locator) => {
  const b = await l.boundingBox();
  expect(b, "élément affiché").not.toBeNull();
  return b!;
};
const chevauche = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

for (const langue of ["fr", "zh"] as const) {
  test.describe(`mode louange, défauts du 14/11 (${langue.toUpperCase()})`, () => {
    test(`R1 : une note de nuance longue reste hors de la rangée des ronds, qui garde son pas (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, langue);
      const rangee = onStage(page, `[data-entete-chant] ol[aria-label="${CHANTS[langue].structure}"]`).first();
      await expect(rangee).toBeVisible();
      await expect(rangee).not.toContainText(NOTE[langue].slice(0, 12));
      const colonnes = await rangee.locator(":scope > li").evaluateAll((lis) =>
        lis.map((li) => {
          const r = li.getBoundingClientRect();
          const p = (li.firstElementChild as HTMLElement).getBoundingClientRect();
          return { haut: Math.round(r.top), gauche: r.left, droite: r.right, largeur: r.width, pastille: p.width };
        }),
      );
      expect(colonnes.length).toBeGreaterThanOrEqual(5);
      for (const c of colonnes) expect(c.largeur, "colonne de la largeur de sa pastille").toBeLessThanOrEqual(c.pastille * 1.6);
      // Même écart entre deux ronds voisins d'une même ligne (la note éclatée en ouvrait un grand autour du sien).
      const ecarts = colonnes.slice(1).flatMap((c, i) => (c.haut === colonnes[i].haut ? [c.gauche - colonnes[i].droite] : []));
      expect(ecarts.length).toBeGreaterThan(0);
      expect(Math.max(...ecarts) - Math.min(...ecarts), `écarts : ${ecarts.map(Math.round).join(", ")}`).toBeLessThanOrEqual(4);
    });

    test(`R1 : en Sections uniques, la note de nuance passe dans la liste sous la rangée (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, langue, { unique: true });
      const rangee = onStage(page, `[data-entete-chant] ol[aria-label="${CHANTS[langue].structure}"]`).first();
      await expect(rangee).not.toContainText(NOTE[langue].slice(0, 12));
      const liste = onStage(page, "[data-entete-chant] ol:not([aria-label])").filter({ hasText: NOTE[langue].slice(0, 8) }).first();
      await expect(liste).toBeVisible();
      expect((await boite(liste)).y).toBeGreaterThan((await boite(rangee)).y);
    });

    test(`G : Outils ouvre le Métronome à toutes les tailles, même sans tempo (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, langue);
      await expect(page.locator("[data-tempo-barre]")).toHaveCount(0);
      const outils = await ouvrirMenu(page, "outils", langue);
      const ligne = outils.locator("[data-metronome-ouvrir]");
      await expect(ligne).toBeVisible();
      await ligne.click();
      const panneau = page.locator("[data-panneau-metronome]");
      await expect(panneau).toBeVisible();
      await page.waitForTimeout(400);
      const b = await boite(panneau);
      const vue = page.viewportSize()!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vue.width + 1);
      expect(b.y).toBeGreaterThanOrEqual(0);
    });

    test(`G : à toutes les tailles, ♩ seul dans la barre ouvre le Métronome d'un chant sans tempo (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, langue);
      const note = page.locator('[data-performance-mode] [data-menu-declencheur="metronome"]');
      // La barre est ouverte à la 1re ouverture du mode sur l'appareil.
      await expect(page.locator("[data-performance-mode][data-barre-ouverte]")).toHaveCount(1);
      await expect(note).toBeVisible();
      await note.click();
      const panneau = page.getByTestId("panneau-metronome");
      await expect(panneau).toBeVisible();
      await expect(note).toHaveText("♩");
      // Le panneau est sous ♩ : il ne déborde pas de l'écran.
      const b = await boite(panneau);
      expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    });

    test(`F : la légende du rappel ne cache ni la 1re section de la page ni la barre du bas (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, langue);
      // La mise en page se refait une fois les polices chinoises chargées : on attend le compte final.
      await expect.poll(async () => Number((await lireCompteur(page)).split("/")[1]), { message: "plusieurs pages" }).toBeGreaterThan(1);
      await page.keyboard.press("ArrowRight");
      await attendreCompteur(page, /^2 \//);
      const bulle = page.locator("[data-performance-mode] [data-indice-rappel]");
      await expect(bulle).toBeVisible();
      await page.waitForTimeout(400);
      const b = await boite(bulle);
      const section = await boite(onStage(page, "[data-section]").first());
      const titre = { ...section, height: Math.min(section.height, 60) };
      expect(chevauche(b, titre), "bulle sur le titre de la 1re section").toBe(false);
      const vue = page.viewportSize()!;
      // Posée en bas, au-dessus du curseur de pages ; la barre du bas est ouverte à cette ouverture du mode.
      expect(b.y, "bulle en bas de l'écran").toBeGreaterThan(vue.height * 0.6);
      await expect(page.locator("[data-performance-mode][data-barre-ouverte]")).toHaveCount(1);
      expect(chevauche(b, await boite(page.locator("[data-barre-bas]"))), "bulle sur la barre du bas").toBe(false);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vue.width + 1);
    });
  });
}
