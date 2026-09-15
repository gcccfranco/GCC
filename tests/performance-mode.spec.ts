import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Chantier Mode louange (docs/spec-mode-louange.md). Setlist et compte
// simulés : aucune lecture ni écriture du Firestore de production.

const SETLIST_ID = "setlist-louange";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

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

function setlist(items: Record<string, unknown>[]) {
  return {
    title: "Culte du 14 septembre",
    leader: "Présidence",
    category: "Culte Francophone",
    date: "2026-09-14",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items,
  };
}

/** Ouvre la setlist et lance le mode louange, rôle déjà choisi sur l'appareil
 *  (`role: null` = appareil qui ouvre le mode louange pour la première fois). */
async function openPerformance(page: Page, items: Record<string, unknown>[], role: string | null = "pianiste") {
  if (role) await page.addInitScript((r) => localStorage.setItem("perf-role-preset", r), role);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(items) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
}

/** Page affichée du mode louange : sans la page setlist restée dessous, ni la
 *  copie invisible qui sert à mesurer les hauteurs. */
const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);

/** Badges de la page affichée — hors copie invisible qui sert à mesurer les hauteurs. */
const nuance = (page: Page, text: string | RegExp) =>
  page.locator("[data-nuance]:not([aria-hidden=true] *)", { hasText: text });

const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
const fg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color);
const fontSize = (l: Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

/** Luminance relative WCAG d'une couleur CSS `rgb(…)` / `rgba(…)` / `oklch(…)`. */
async function luminance(page: Page, color: string): Promise<number> {
  return page.evaluate((c) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, color);
}

/** Sections de la page affichée (hors copie de mesure), avec leur boîte à l'écran. */
async function visibleSections(page: Page) {
  const cards = onStage(page, "[data-section]");
  await expect(cards.first()).toBeVisible();
  const boxes = [];
  for (const card of await cards.all()) boxes.push({ text: (await card.innerText()).replace(/\s+/g, " "), box: (await card.boundingBox())! });
  return boxes;
}

test.describe("vue structure (batteur)", () => {
  const MF = { tags: ["mf"] };
  const STRUCTURE = ["verse-2-0", "chorus-3-1", "chorus-3-2"];

  for (const slug of ["abba-pere", "一生爱你"]) {
    test(`replie deux refrains identiques en ×2 sans déborder (${slug})`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await openPerformance(page, [
        item({ songSlug: slug, position: 1, structureOverride: STRUCTURE, sectionNuances: { "chorus-3-1": MF, "chorus-3-2": MF } }),
      ], "batteur");
      const sections = await visibleSections(page);
      expect(sections, "couplet + refrain ×2").toHaveLength(2);
      expect(sections[1].text).toMatch(/×2/);
      const bottom = Math.max(...sections.map((s) => s.box.y + s.box.height));
      expect(bottom, "rien ne déborde en bas").toBeLessThanOrEqual(768);
    });
  }

  test("un chant de trois sections occupe l'essentiel de la hauteur ; nuances différentes = une ligne chacune", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPerformance(page, [
      item({ songSlug: "abba-pere", position: 1, structureOverride: STRUCTURE, sectionNuances: { "chorus-3-1": MF, "chorus-3-2": { tags: ["ff"] } } }),
    ], "batteur");
    const sections = await visibleSections(page);
    expect(sections).toHaveLength(3);
    expect(sections.map((s) => s.text).join(" ")).not.toMatch(/×2/);
    const bottom = Math.max(...sections.map((s) => s.box.y + s.box.height));
    expect(bottom, "la structure occupe l'essentiel de la hauteur").toBeGreaterThan(768 * 0.6);
    expect(bottom, "rien ne déborde en bas").toBeLessThanOrEqual(768);
  });

  test("sur téléphone, les libellés agrandis tiennent sur une ligne, dans leur cadre", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPerformance(page, [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["intro-1-0", "verse-2-0", "chorus-3-1", "verse-5-0"] }),
    ], "batteur");
    await visibleSections(page);
    const rows = await onStage(page, "[data-section]").evaluateAll((cards) =>
      cards.map((card) => {
        const label = card.firstElementChild!.lastElementChild!;
        const range = document.createRange();
        range.selectNodeContents(label);
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top / 4)));
        return { text: label.textContent, lines: lines.size, overflow: label.getBoundingClientRect().right - card.getBoundingClientRect().right };
      }),
    );
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.lines, `« ${r.text} » sur une ligne`).toBe(1);
      expect(r.overflow, `« ${r.text} » dans son cadre`).toBeLessThanOrEqual(0);
    }
  });

  test("sur petit téléphone, six sections aux longues consignes ne débordent pas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Mesurées sur une ligne, ces sections en prennent trois ou quatre à
    // l'écran : seule la vérification du rendu réel les fait tenir.
    const long = { tags: ["mf", "cresc", "tutti"], note: "tout le monde reprend ensemble, puis on laisse la batterie seule" };
    const structure = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "bridge-6-5"];
    await openPerformance(page, [
      item({
        songSlug: "abba-pere",
        position: 1,
        structureOverride: structure,
        sectionNuances: Object.fromEntries(structure.map((uid) => [uid, long])),
      }),
    ], "batteur");
    const sections = await visibleSections(page);
    expect(sections).toHaveLength(6);
    for (const s of sections) {
      expect(s.box.x + s.box.width, "rien ne déborde à droite").toBeLessThanOrEqual(375);
      expect(s.box.y + s.box.height, "rien ne déborde en bas").toBeLessThanOrEqual(667);
    }
  });
});

test.describe("choix du rôle à la première ouverture", () => {
  const ITEMS = [item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0", "chorus-3-1"] })];
  const roleSheet = (page: Page) => page.getByRole("dialog", { name: "Quel est ton rôle ?" });
  /** Lignes de paroles de la page affichée (hors copie de mesure). */
  const lyricLines = (page: Page) => onStage(page, "[data-copy-line]");
  const reopen = async (page: Page) => {
    await page.getByRole("button", { name: "Quitter" }).click();
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
  };

  test("appareil vierge : la question apparaît, le rôle choisi s'applique et n'est plus redemandé", async ({ page }) => {
    await openPerformance(page, ITEMS, null);
    await expect(roleSheet(page)).toBeVisible();
    await roleSheet(page).getByRole("button", { name: /Batteur/ }).click();
    await expect(roleSheet(page)).toBeHidden();
    // Vue structure : plus de paroles à l'écran.
    await expect(lyricLines(page)).toHaveCount(0);

    await reopen(page);
    await expect(roleSheet(page)).toBeHidden();
  });

  test("« Aucun » : rien n'est imposé et la question n'est plus redemandée", async ({ page }) => {
    await openPerformance(page, ITEMS, null);
    await roleSheet(page).getByRole("button", { name: /Aucun/ }).click();
    await expect(roleSheet(page)).toBeHidden();
    await reopen(page);
    await expect(roleSheet(page)).toBeHidden();
  });

  test("un appareil qui a déjà un rôle n'est pas interrogé", async ({ page }) => {
    await openPerformance(page, ITEMS, "guitariste");
    await expect(lyricLines(page).first()).toBeVisible();
    await expect(roleSheet(page)).toBeHidden();
  });
});

test.describe("reprise des réglages", () => {
  const ZH = [item({ songSlug: "一生爱你", position: 1, structureOverride: ["verse-2-0"] })];
  const FR = [item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0"] })];
  /** Pinyin de 亲 (première syllabe du couplet), sur la page affichée. */
  const pinyin = (page: Page) => onStage(page, "span").filter({ hasText: /^qīn$/ });
  const lyricLines = (page: Page) => onStage(page, "[data-copy-line]");
  const launch = async (page: Page) => {
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
  };
  const settingsText = async (page: Page) => {
    await page.getByRole("button", { name: "Réglages" }).click();
    return page.getByRole("dialog", { name: "Réglages" });
  };

  test("pinyin masqué sur la page setlist → masqué en mode louange (ZH)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(ZH) }, `/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: "Partitions" }).click();
    await page.getByRole("button", { name: "Pinyin" }).click();
    await launch(page);
    await expect(lyricLines(page).first()).toBeVisible();
    await expect(pinyin(page)).toHaveCount(0);
  });

  test("texte agrandi sur la page du chant → agrandi en mode louange, et inversement", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await page.goto("/songs/abba-pere");
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(FR) }, `/setlists/${SETLIST_ID}`);
    await launch(page);
    const settings = await settingsText(page);
    await expect(settings.getByText("120%")).toBeVisible();

    await settings.getByRole("button", { name: "Réduire le texte" }).click();
    await expect(settings.getByText("110%")).toBeVisible();
    await page.goto("/songs/abba-pere");
    // La page du chant lit sa taille après hydratation : on attend qu'elle s'applique.
    await expect.poll(() => page.locator("main.song-zoom").evaluate((el) => el.style.transform)).toBe("scale(1.1)");
  });

  test("accords changés sur la page setlist juste avant → l'emportent sur le rôle (FR)", async ({ page }) => {
    await openPerformance(page, FR, "batteur");
    await expect(lyricLines(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Quitter" }).click();

    await page.getByRole("button", { name: "Partitions" }).click();
    await page.getByRole("button", { name: "Accords" }).click(); // masqués
    await page.getByRole("button", { name: "Accords" }).click(); // de nouveau affichés
    await launch(page);
    await expect(lyricLines(page).first()).toBeVisible();
    const settings = await settingsText(page);
    await expect(settings.getByRole("button", { name: "Batteur" })).not.toHaveClass(/bg-primary/);
  });

  test("sans changement sur la page setlist, le rôle décide", async ({ page }) => {
    await openPerformance(page, FR, "batteur");
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(lyricLines(page)).toHaveCount(0);
  });

  test("désélectionner son rôle dans Réglages ne fait pas revenir la question", async ({ page }) => {
    await openPerformance(page, FR, "pianiste");
    const settings = await settingsText(page);
    await settings.getByRole("button", { name: "Pianiste" }).click();
    await page.keyboard.press("Escape"); // ferme les réglages
    await expect(settings).toBeHidden();
    await page.keyboard.press("Escape"); // quitte le mode louange
    await launch(page);
    await expect(page.getByRole("dialog", { name: "Quel est ton rôle ?" })).toBeHidden();
  });
});

test.describe("tonalité choisie sur la page du chant", () => {
  const CASES = [
    { slug: "abba-pere", title: "Abba Père", setlistKey: "A", chosen: "B", before: "F#m", after: "G#m" },
    { slug: "一生爱你", title: "一生爱你", setlistKey: "E", chosen: "F", before: "C#m", after: "Dm" },
  ];

  for (const c of CASES) {
    test(`retenue pour ce chant dans cette setlist, repère visible et retour possible (${c.slug})`, async ({ page }) => {
      const writes: string[] = [];
      page.on("request", (r) => {
        // Seules les écritures de la setlist comptent (la navbar écrit la langue dans notifPrefs).
        if (/firestore\.googleapis\.com.*\/documents\/setlists\//.test(r.url()) && r.method() !== "GET" && !r.url().endsWith(":runQuery")) writes.push(`${r.method()} ${r.url()}`);
      });
      await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
      await signInAs(page, MUSICIEN, {
        [`setlists/${SETLIST_ID}`]: setlist([item({ songSlug: c.slug, position: 1, structureOverride: ["verse-2-0"] })]),
      }, `/setlists/${SETLIST_ID}`);

      // Vue liste → page du chant → autre tonalité → retour à la setlist.
      await page.getByRole("link", { name: c.title }).click();
      await page.waitForURL(/\/songs\//);
      await page.locator("select").first().selectOption(c.chosen);
      await page.goBack();
      await page.getByRole("button", { name: /Mode Louange/ }).click();
      await expect(page.getByText("Mise en page…")).toHaveCount(0);

      // Repère dans l'en-tête du chant (et dans la barre du haut).
      const mark = onStage(page, "*").getByText(`setlist : ${c.setlistKey}`, { exact: true });
      await expect(mark.first()).toBeVisible();
      await expect(onStage(page, "*").getByText(c.after, { exact: true }).first()).toBeVisible();

      // Retour à la tonalité de la setlist : dans les réglages du chant en cours.
      await page.getByRole("button", { name: "Réglages" }).click();
      const settings = page.getByRole("dialog", { name: "Réglages" });
      await settings.getByRole("button", { name: `Revenir à ${c.setlistKey}` }).click();
      await page.keyboard.press("Escape");
      await expect(settings).toBeHidden();
      await expect(mark).toHaveCount(0);
      await expect(onStage(page, "*").getByText(c.before, { exact: true }).first()).toBeVisible();

      expect(writes, "la setlist enregistrée ne change pas").toEqual([]);
    });
  }
});

test("tonalité choisie : une modulation suit le même écart (FR)", async ({ page }) => {
  // Setlist en A avec un refrain modulé en B ; tonalité choisie sur l'appareil : B (+2), le refrain passe en Db (= C#).
  await page.addInitScript((id) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-personal-keys", JSON.stringify({ [id]: { "abba-pere": "B" } }));
  }, SETLIST_ID);
  await signInAs(page, MUSICIEN, {
    [`setlists/${SETLIST_ID}`]: setlist([
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["chorus-3-0"], sectionKeys: { "chorus-3-0": "B" } }),
    ]),
  }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(onStage(page, "*").getByText("Modulation (Db)", { exact: true }).first()).toBeVisible();
});

test.describe("polices du chinois (ZH)", () => {
  /** Police déclarée pour la première syllabe « qīn » et le caractère « 亲 ». */
  const fonts = (page: Page, scope: string) =>
    page.evaluate((sel) => {
      const spans = [...document.querySelectorAll<HTMLElement>(`${sel} span`)].filter((e) => !e.closest("[aria-hidden=true]"));
      const family = (t: string) => {
        const el = spans.find((e) => e.textContent === t);
        return el ? getComputedStyle(el).fontFamily : null;
      };
      return { pinyin: family("qīn"), char: family("亲") };
    }, scope);

  test("pinyin en Andika, caractères en police chinoise : page du chant et mode louange", async ({ page }) => {
    await page.goto("/songs/一生爱你");
    await expect.poll(() => fonts(page, "main.song-zoom")).toMatchObject({ pinyin: expect.stringContaining("pinyin_font"), char: expect.stringContaining("zh_lyric_font") });
    // Titre en pinyin sous le titre chinois.
    await expect(page.getByText("Yī shēng ài nǐ", { exact: true })).toHaveCSS("font-family", /pinyin_font/);

    await openPerformance(page, [item({ songSlug: "一生爱你", position: 1, structureOverride: ["verse-2-0"] })]);
    await expect.poll(() => fonts(page, "[data-performance-mode]")).toMatchObject({ pinyin: expect.stringContaining("pinyin_font"), char: expect.stringContaining("zh_lyric_font") });
  });
});

test.describe("taille par défaut des paroles et accords", () => {
  /** Taille des lignes de paroles FR et ZH, et rapport pinyin / taille de base, sur la page du chant. */
  const sizes = (page: Page) =>
    page.evaluate(() => {
      const size = (el: Element | null | undefined) => (el ? parseFloat(getComputedStyle(el).fontSize) : NaN);
      const line = document.querySelector("main.song-zoom [data-copy-line]");
      const py = [...document.querySelectorAll<HTMLElement>("main.song-zoom span")].find((e) => e.textContent === "qīn");
      return { line: size(line), pinyinRatio: py ? size(py) / size(py.closest("[data-copy-line]")) : NaN };
    });
  const BASE = 0.88 * 16;

  for (const [device, width, factor] of [["téléphone", 390, 1.1], ["tablette", 1024, 1.2]] as const) {
    test(`${device} : paroles FR et ZH à ${Math.round((factor - 1) * 100)} % de plus, pinyin à 0,7`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/songs/abba-pere");
      await expect.poll(async () => (await sizes(page)).line).toBeCloseTo(BASE * factor, 1);
      await page.goto("/songs/一生爱你");
      await expect.poll(async () => (await sizes(page)).line).toBeCloseTo(BASE * factor, 1);
      expect((await sizes(page)).pinyinRatio).toBeCloseTo(0.7, 2);
    });
  }

  test("en mode louange aussi (tablette)", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPerformance(page, [item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0"] })]);
    const line = onStage(page, "[data-copy-line]").first();
    await expect.poll(() => line.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(BASE * 1.2, 1);
  });
});

test.describe("nuancier", () => {
  test.use({ viewport: { width: 1280, height: 1600 } });
  const NUANCES = {
    "verse-2-0": { tags: ["p"] },
    "chorus-3-1": { tags: ["mf", "cresc"] },
    "chorus-3-2": { tags: ["ff", "acappella"] },
  };

  for (const slug of ["abba-pere", "一生爱你"]) {
    test(`doux, moyen et fort se distinguent sans lire le texte (${slug})`, async ({ page }) => {
      await openPerformance(page, [
        item({ songSlug: slug, position: 1, structureOverride: Object.keys(NUANCES), sectionNuances: NUANCES }),
      ]);
      const badge = (label: string) => nuance(page, new RegExp(`^${label}$`));
      const [p, mf, ff] = [badge("p"), badge("mf"), badge("ff")];
      await expect(ff).toBeVisible();

      // Fond de plus en plus foncé du doux au fort.
      const [lp, lmf, lff] = [await luminance(page, await bg(p)), await luminance(page, await bg(mf)), await luminance(page, await bg(ff))];
      expect(lp).toBeGreaterThan(lmf);
      expect(lmf).toBeGreaterThan(lff);
      // Fort = fond plein, texte clair.
      expect(await luminance(page, await fg(ff))).toBeGreaterThan(0.8);

      // Crescendo : une flèche qui monte.
      await expect(nuance(page, "cresc.").locator("svg")).toHaveCount(1);
      // Indication : style neutre (pas violet) avec une icône.
      const cappella = nuance(page, "a cappella");
      await expect(cappella.locator("svg")).toHaveCount(1);
      const [r, , b] = (await bg(cappella)).match(/[\d.]+/g)!.map(Number);
      expect(Math.abs(r - b), "fond neutre, pas violet").toBeLessThan(12);
    });
  }

  test("badges plus grands en mode louange que sur la page du chant", async ({ page }) => {
    await page.goto(`/songs/abba-pere?sectionNuances=${encodeURIComponent(JSON.stringify(NUANCES))}`);
    // Le badge du corps (le bandeau de structure en porte un aussi, même taille).
    const onSong = await fontSize(page.locator("[data-section] [data-nuance]").filter({ hasText: /^ff$/ }));
    await page.goto("about:blank");
    await openPerformance(page, [
      item({ songSlug: "abba-pere", position: 1, structureOverride: Object.keys(NUANCES), sectionNuances: NUANCES }),
    ]);
    const onStage = await fontSize(nuance(page, /^ff$/));
    expect(onStage).toBeGreaterThanOrEqual(onSong * 1.25);
  });
});
