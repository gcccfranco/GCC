import { expect, test, type Page } from "@playwright/test";
import type { ChordProSection } from "../src/types/chordPro";
import { compterChezNous, suitesChezNous, suitesDuChant, type ChezNous } from "../src/lib/harmonie/chezNous";

// Harmonie H9-1 (docs/spec-harmonie-accords.md, « Lot H9 ») : « Après cet accord, chez nous ». D'abord le compte, sur de petits chants
// écrits ici ; puis l'écran, avec un fichier de comptes fictif servi à la place du vrai.

/** Une section : chaque ligne est une liste d'accords. */
function section(name: string, ...lignes: string[][]): ChordProSection {
  return {
    type: "verse", id: name, uid: name + "-0", name,
    lines: lignes.map((a) => ({ type: "line", tokens: a.map((value) => ({ type: "chord" as const, value })), pinyin: null, jianpu: null })),
  };
}
const chant = (slug: string, tonalite: string, ...sections: ChordProSection[]) => ({ slug, titre: "Titre " + slug, tonalite, sections });

test("compte : degrés en majeur, basse et couleur ôtées, une répétition immédiate n'est pas une suite", () => {
  const s = suitesDuChant([section("Couplet", ["D", "D/F#", "G", "Asus4", "A7", "Bm"])], "D");
  expect([...s].sort()).toEqual(["1>4", "4>5", "5>6m"]);
});

test("compte : mineur à part, degrés lus depuis la tonique mineure", () => {
  const c = compterChezNous([chant("m1", "Am", section("Couplet", ["Am", "Dm", "E", "Am"]))]);
  expect(c.suites.mineur["1m"].suites).toEqual([{ chiffre: "4m", chants: 1 }]);
  expect(c.suites.mineur["5"].suites).toEqual([{ chiffre: "1m", chants: 1 }]);
  expect(c.suites.majeur).toEqual({});
});

test("compte : un chant compte une fois par suite, même si la section revient ou se répète", () => {
  const couplet = section("Couplet", ["C", "G", "C", "G"]);
  const c = compterChezNous([chant("a", "C", couplet, couplet, section("Refrain", ["C", "G"])), chant("b", "C", section("Couplet", ["C", "F"]))]);
  expect(c.suites.majeur["1"]).toEqual({ chants: 2, suites: [{ chiffre: "4", chants: 1 }, { chiffre: "5", chants: 1 }] });
});

/** n chants en G dont 1 → 5 (et, pour `vers4` d'entre eux, 1 → 4). */
function repertoire(n: number, vers4: number) {
  return Array.from({ length: n }, (_, i) => chant("g" + i, "G", section("Couplet", ["G", "D", ...(i < vers4 ? ["G", "C"] : [])])));
}

test("seuil des suites : 8 chants pour un degré ; en dessous, null (le tableau reprend)", () => {
  expect(suitesChezNous(compterChezNous(repertoire(7, 2)), "G", "1")).toBeNull();
  // 8 chants : 1 → 5 dans 8, 1 → 4 dans 2 : parts 80 % et 20 %.
  expect(suitesChezNous(compterChezNous(repertoire(8, 2)), "G", "1")).toEqual([{ chiffre: "5", part: 80 }, { chiffre: "4", part: 20 }]);
  expect(suitesChezNous(null, "G", "1")).toBeNull();
  // La tonalité ne compte pas : en E, le 1 lit les mêmes chiffres.
  expect(suitesChezNous(compterChezNous(repertoire(8, 2)), "E", "1")?.[0].chiffre).toBe("5");
  // Un degré mineur ne lit pas les comptes du majeur.
  expect(suitesChezNous(compterChezNous(repertoire(8, 2)), "Em", "1")).toBeNull();
});

// ─── À l'écran ───────────────────────────────────────────────────────────────

test.use({ serviceWorkers: "block" });

/** Tous les degrés usuels à 10 chants, suites 6m (6), 2m (3), 3m (1) : parts 60, 30, 10. */
function fichierFictif(): ChezNous {
  const e = { chants: 10, suites: [{ chiffre: "6m", chants: 6 }, { chiffre: "2m", chants: 3 }, { chiffre: "3m", chants: 1 }] };
  const suites = Object.fromEntries(["1", "2m", "3m", "4", "5", "6m"].map((d) => [d, e]));
  return { suites: { majeur: suites, mineur: {} }, boucles: { majeur: {}, mineur: {} } };
}

const panneau = (page: Page) => page.locator("[data-accord-panneau]");

async function toucher(page: Page, slug: string, zh: boolean, fichier: ChezNous | null) {
  await page.route("**/harmonie-chez-nous.json", (r) => (fichier ? r.fulfill({ json: fichier }) : r.fulfill({ status: 404 })));
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  if (zh) {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  }
  await page.goto("/songs/" + encodeURIComponent(slug));
  const accord = page.locator("[data-section] [data-copy-line] [data-accord-touchable]").nth(2);
  await expect(accord).toBeVisible();
  await expect(async () => {
    await accord.click();
    await expect(panneau(page)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

for (const [slug, zh] of [["a-jamais-tu-es-saint", false], ["一切歌颂赞美", true]] as const) {
  test(`H9-1 chant ${zh ? "ZH" : "FR"} : « Après cet accord, chez nous » avec les parts comptées`, async ({ page }) => {
    await toucher(page, slug, zh, fichierFictif());
    const bouton = panneau(page).getByRole("button", { name: zh ? /^我们的歌里，这个和弦之后/ : /^Après cet accord, chez nous :/ });
    await expect(bouton).toBeVisible();
    // L'accord qui suit dans ce chant peut passer devant : au moins deux des trois parts restent.
    await expect(bouton.locator("[data-ensuite-ligne]")).toContainText(zh ? /(60|30|10)%/ : /(60|30|10) %/);
    const parts = (await bouton.locator("[data-ensuite-ligne] .text-xs").allTextContents()).map((x) => parseInt(x, 10));
    expect(parts.length).toBeGreaterThanOrEqual(2);
    // Classées : de la plus grande part à la plus petite.
    expect(parts).toEqual([...parts].sort((a, b) => b - a));
  });
}

test("H9-1 fichier absent : la ligne garde « Ensuite » et le tableau écrit à la main", async ({ page }) => {
  await toucher(page, "a-jamais-tu-es-saint", false, null);
  const bouton = panneau(page).getByRole("button", { name: /^Ensuite :/ });
  await expect(bouton).toBeVisible();
  await expect(bouton).not.toContainText("%");
});
