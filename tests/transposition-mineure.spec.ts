import * as fs from "fs";
import * as path from "path";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { slugifyTheme } from "../src/lib/content/loadSongs";
import { ALL_KEYS, getTransposedKey, keyOptions, semitonesTo, transposeLabel } from "../src/lib/transpose";
import { transposeAST } from "../src/lib/transposeAST";

/** Tranche A5 : tonalités mineures, décalage nul, b7 en Do, thèmes, URL tordues
 *  (docs/spec-corrections-audit.md). Les attendus sont écrits à la main, pas
 *  calculés avec le code testé. */

// « À l'agneau » ({key: Am}) : Am F G, soit vi · IV · V du relatif majeur, écrits
// dans la famille (bémols ou dièses) de ce relatif. Décalage → tonalité, 3 accords.
const AGNEAU: Record<number, [string, string[]]> = {
  [-6]: ["Ebm", ["Ebm", "B", "Db"]],
  [-5]: ["Em", ["Em", "C", "D"]],
  [-4]: ["Fm", ["Fm", "Db", "Eb"]],
  [-3]: ["F#m", ["F#m", "D", "E"]],
  [-2]: ["Gm", ["Gm", "Eb", "F"]],
  [-1]: ["G#m", ["G#m", "E", "F#"]],
  [0]: ["Am", ["Am", "F", "G"]],
  [1]: ["Bbm", ["Bbm", "Gb", "Ab"]],
  [2]: ["Bm", ["Bm", "G", "A"]],
  [3]: ["Cm", ["Cm", "Ab", "Bb"]],
  [4]: ["C#m", ["C#m", "A", "B"]],
  [5]: ["Dm", ["Dm", "Bb", "C"]],
  [6]: ["Ebm", ["Ebm", "B", "Db"]],
};
const MINEURES = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

test.describe("fonctions", () => {
  for (let s = -6; s <= 6; s++) {
    test(`Am ${s >= 0 ? "+" : ""}${s} demi-tons`, () => {
      const [tonalite, accords] = AGNEAU[s];
      const cle = getTransposedKey("Am", s);
      expect(cle).toBe(tonalite);
      expect(["Am", "F", "G"].map((c) => transposeLabel(c, s, cle))).toEqual(accords);
    });
  }

  test("un majeur sur un chant mineur se lit comme son relatif mineur", () => {
    expect(semitonesTo("Am", "C")).toBe(0);
    expect(semitonesTo("Am", "D")).toBe(2); // D se lit Bm : Am → Bm = +2 (et non A → D = 5)
    expect(semitonesTo("Am", "Bm")).toBe(2);
    expect(semitonesTo("C", "Am")).toBe(0);
  });

  test("le sélecteur d'un chant mineur propose les douze mineures et elles seules", () => {
    expect(keyOptions("Am", "Am")).toEqual(MINEURES);
    expect(keyOptions("C", "Am")).toEqual(["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "C", "Am", "Bbm", "Bm"]);
    expect(keyOptions("G#", "A")).toContain("G#");
  });

  test("décalage nul : la tonalité telle qu'écrite", () => {
    expect(getTransposedKey("G#", 0)).toBe("G#");
    expect(getTransposedKey("G#", 12)).toBe("G#");
    expect(getTransposedKey("G#", 1)).toBe("A");
  });

  test("slugifyTheme : diacritiques et alias", () => {
    expect(slugifyTheme("Noël")).toBe("noel");
    expect(slugifyTheme("Action de grâce")).toBe("action-de-grace");
    expect(slugifyTheme("Groupe fidélité")).toBe("noel_fidelite");
  });

  test("19 chants Noël dans l'index", () => {
    const index = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "songs-index.json"), "utf-8"));
    const chants = (Array.isArray(index) ? index : index.songs) as { themes: string[] }[];
    expect(chants.filter((c) => c.themes.includes("noel"))).toHaveLength(19);
    const themes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "themes.json"), "utf-8")).themes as { slug: string }[];
    const connus = new Set(themes.map((t) => t.slug));
    expect(chants.flatMap((c) => c.themes).filter((t) => !connus.has(t))).toEqual([]);
  });

  test("corpus transposé vers Do : aucun A#, sinon la tierce majeure d'un F#", () => {
    const dir = path.join(process.cwd(), "content", "songs");
    const restes: string[] = [];
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".cho") && !n.startsWith("_"))) {
      const ast = parseChordPro(fs.readFileSync(path.join(dir, f), "utf-8"));
      const cle = ast.metadata.key;
      if (/m$/.test(cle)) continue;
      const semi = semitonesTo(cle, "C");
      for (const sec of ast.sections) {
        for (const l of sec.lines) {
          for (const t of l.tokens) {
            if (t.type !== "chord") continue;
            const out = transposeLabel(t.value, semi, "C");
            if (out.includes("A#")) restes.push(`${f} ${t.value} → ${out}`);
          }
        }
      }
    }
    // B/D# est un accord de si dont D# est la tierce : transposé, F#/A# garde son A#.
    expect(restes.filter((r) => !/→ F#\/A#$/.test(r))).toEqual([]);
    // Les autres tonalités ne changent pas : Mi → Ré, La → Sol restent en notes blanches.
    expect(transposeLabel("E", -2, "D")).toBe("D");
    expect(transposeLabel("A", -2, "G")).toBe("G");
    expect(ALL_KEYS).toHaveLength(12);
  });
});

async function ouvrir(page: Page, slug: string, query = "") {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.goto(`/songs/${encodeURIComponent(slug)}${query}`, { waitUntil: "domcontentloaded" });
  const select = page.getByTestId("barre-outils").locator("select").first();
  await select.waitFor();
  return { select, erreurs };
}

const json = (v: unknown) => encodeURIComponent(JSON.stringify(v));

/** Les accords affichés, dans l'ordre (les colonnes sans accord portent un « x » masqué). */
async function accords(page: Page, n: number): Promise<string[]> {
  const lus = await page.locator("span[data-copy-ignore]").allInnerTexts();
  return lus.map((t) => t.trim()).filter((t) => /^[A-G]/.test(t)).slice(0, n);
}

const pilule = (page: Page) => page.getByTestId("tonalite-courante");

test.describe("page du chant", () => {
  test("À l'agneau : choisir Bm transpose les accords et la pilule", async ({ page }) => {
    const { select } = await ouvrir(page, "a-l-agneau");
    await expect(select).toHaveValue("Am");
    expect(await select.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).toEqual(MINEURES);
    await expect(async () => {
      await select.selectOption("Bm");
      await expect(pilule(page)).toHaveText(/^Bm/, { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect.poll(() => accords(page, 3)).toEqual(["Bm", "G", "A"]);
  });

  test("À l'agneau : − et + gardent une pilule mineure", async ({ page }) => {
    const { select } = await ouvrir(page, "a-l-agneau");
    const plus = page.getByRole("button", { name: "+", exact: true });
    const moins = page.getByRole("button", { name: "−", exact: true });
    await expect(async () => {
      await plus.click();
      await expect(pilule(page)).toHaveText(/^Bbm/, { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect.poll(() => accords(page, 3)).toEqual(["Bbm", "Gb", "Ab"]);
    await plus.click();
    await expect(pilule(page)).toHaveText(/^Bm/);
    await expect(select).toHaveValue("Bm");
    await moins.click();
    await moins.click();
    await expect(pilule(page)).toHaveText(/^Am/);
    await expect(pilule(page)).toContainText("orig.");
    await moins.click();
    await expect(pilule(page)).toHaveText(/^G#m/);
    await expect.poll(() => accords(page, 3)).toEqual(["G#m", "E", "F#"]);
  });

  test("Dieu Sauveur (G#) : +1 puis −1 revient à G#, pilule et accords cohérents", async ({ page }) => {
    const { select } = await ouvrir(page, "dieu-sauveur", `?key=${json("G#")}`);
    await expect(select).toHaveValue("G#");
    const plus = page.getByRole("button", { name: "+", exact: true });
    const moins = page.getByRole("button", { name: "−", exact: true });
    await expect.poll(() => accords(page, 3)).toEqual(["G#", "Fm", "C#"]);
    await expect(async () => {
      await plus.click();
      await expect(pilule(page)).toHaveText(/^A/, { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect(pilule(page)).not.toHaveText(/^G#/);
    await moins.click();
    await expect(pilule(page)).toHaveText(/^G#/);
    await expect(pilule(page)).toContainText("orig.");
    await expect.poll(() => accords(page, 3)).toEqual(["G#", "Fm", "C#"]);
  });

  test("Dieu Sauveur : choisir Ab ré-épelle les accords à hauteur égale", async ({ page }) => {
    const { select } = await ouvrir(page, "dieu-sauveur", `?key=${json("G#")}`);
    await expect(async () => {
      await select.selectOption("Ab");
      await expect(pilule(page)).toHaveText(/^Ab/, { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect.poll(() => accords(page, 3)).toEqual(["Ab", "Fm", "Db"]);
  });

  for (const [slug, parametre, valeur] of [
    ["a-l-agneau", "structure", null],
    ["a-l-agneau", "structure", 5],
    ["a-l-agneau", "key", 5],
    ["a-l-agneau", "key", {}],
    ["a-l-agneau", "sectionNotes", null],
    ["一生爱你", "structure", null],
    ["一生爱你", "key", {}],
    ["一生爱你", "sectionKeys", 5],
    ["一生爱你", "sectionNuances", null],
  ] as const) {
    test(`URL tordue ${parametre}=${JSON.stringify(valeur)} sur ${slug}`, async ({ page }) => {
      const { select, erreurs } = await ouvrir(page, slug, `?${parametre}=${json(valeur)}`);
      await expect(select).toBeVisible();
      await expect(page.locator("span[data-copy-ignore]").first()).toBeAttached();
      expect(erreurs).toEqual([]);
    });
  }
});

// Relecture d'A5 : un keyOverride majeur d'une setlist sur un chant mineur s'affiche en mineur partout (transposeAST).
test("transposeAST : une tonalité majeure demandée pour un chant mineur s'écrit en mineur", () => {
  const ast = { metadata: { key: "Am" }, sections: [] } as unknown as Parameters<typeof transposeAST>[0];
  expect(transposeAST(ast, semitonesTo("Am", "D"), "D").metadata.key).toBe("Bm");
  expect(transposeAST(ast, semitonesTo("Am", "C"), "C").metadata.key).toBe("Am");
});
