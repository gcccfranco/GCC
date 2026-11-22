import { expect, test, type Page } from "@playwright/test";
import type { ChordProSection } from "../src/types/chordPro";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { boucleChezNous, boucleDeSection, compterChezNous } from "../src/lib/harmonie/chezNous";

// Harmonie H9-2 (docs/spec-harmonie-accords.md, « Lot H9 ») : « Cette boucle, on la joue déjà ». D'abord le compte, sur
// de petits chants écrits ici ; puis l'écran, avec le vrai fichier du build (public/harmonie-chez-nous.json).

function section(name: string, ...lignes: string[][]): ChordProSection {
  return {
    type: "chorus", id: name, uid: name + "-0", name,
    lines: lignes.map((a) => ({ type: "line", tokens: a.map((value) => ({ type: "chord" as const, value })), pinyin: null, jianpu: null })),
  };
}
const chant = (slug: string, tonalite: string, ...sections: ChordProSection[]) => ({ slug, titre: "Titre " + slug, tonalite, sections });

test("boucle : quatre degrés distincts rejoués aussitôt ; sinon rien", () => {
  expect(boucleDeSection(section("R", ["C", "G", "Am", "F"], ["C", "G/B", "Am", "F"]), "C")).toEqual(["1", "5", "6m", "4"]);
  expect(boucleDeSection(section("R", ["C", "G", "Am", "F"], ["C", "G", "Am"]), "C")).toBeNull();
  expect(boucleDeSection(section("R", ["C", "G", "C", "F"], ["C", "G", "C", "F"]), "C")).toBeNull();
  expect(boucleDeSection(section("R", ["C", "G", "Am", "F"], ["C", "G", "Am", "F"], ["Dm", "G"]), "C")).toEqual(["1", "5", "6m", "4"]);
});

test("seuil des boucles : au moins 3 autres chants ; le chant lui-même ne compte pas", () => {
  const boucle = (slug: string, t: string, a: string[]) => chant(slug, t, section("Refrain", a, a));
  const quatre = [boucle("b1", "D", ["D", "A", "Bm", "G"]), boucle("b2", "E", ["E", "B", "C#m", "A"]), boucle("b3", "C", ["C", "G", "Am", "F"]), boucle("b4", "G", ["G", "D", "Em", "C"])];
  const c4 = compterChezNous(quatre);
  const r = boucleChezNous(c4, quatre[0].sections[0], "D", "b1");
  expect(r?.boucle).toBe("1 · 5 · 6m · 4");
  expect(r?.autres.map((x) => x.slug)).toEqual(["b2", "b3", "b4"]);
  // Trois chants en tout : 2 autres, rien (et la boucle n'est même pas gardée dans le fichier).
  const c3 = compterChezNous(quatre.slice(0, 3));
  expect(c3.boucles.majeur).toEqual({});
  expect(boucleChezNous(c3, quatre[0].sections[0], "D", "b1")).toBeNull();
});

// ─── À l'écran ───────────────────────────────────────────────────────────────

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne-h92", email: "musicienne-h92@example.com", firstName: "Maëlle", lastName: "Fontanel", planningName: "Maëlle F.",
  serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano", "guitare"),
};

const volet = (page: Page) => page.locator("[data-harmonie-colonne], [data-idees-harmonie]").first();

async function ouvrirVolet(page: Page, slug: string, zh: boolean) {
  await page.addInitScript((zh) => {
    localStorage.setItem("jianpu-sheet-pref", "never");
    localStorage.setItem("accords-aide-vue", "1");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
  }, zh);
  await signInAs(page, MUSICIENNE, {}, `/songs/${encodeURIComponent(slug)}`);
  const nom = page.locator("main.song-zoom [data-section-nom-bouton]").first();
  await expect(nom).toBeVisible();
  await nom.click();
  await expect(volet(page)).toBeVisible();
}

// Deux chants qui tournent sur 1 · 5 · 6m · 4 au refrain, comme plus de trois autres chants du répertoire.
for (const [slug, zh] of [["amour-sans-fin", false], ["是耶稣的名", true]] as const) {
  test(`H9-2 chant ${zh ? "ZH" : "FR"} : sous le refrain, la boucle et les chants qui la jouent, chacun ouvrant sa page`, async ({ page }) => {
    await ouvrirVolet(page, slug, zh);
    const nomDuBouton = zh ? /^循环 1 · 5 · 6m · 4——另有 \d+ 首歌也这样弹$/ : /^Boucle 1 · 5 · 6m · 4 — comme \d+ autres chants$/;
    const ligne = volet(page).locator("[data-boucle-chez-nous]").filter({ has: page.getByRole("button", { name: nomDuBouton }) }).first();
    const bouton = ligne.getByRole("button", { name: nomDuBouton });
    await expect(bouton).toBeVisible();
    await expect(bouton).toHaveAttribute("aria-expanded", "false");
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();
    const liste = ligne.getByRole("list", { name: zh ? "弹这个循环的歌" : "Les chants qui jouent cette boucle" });
    expect(await liste.locator("li").count()).toBeGreaterThanOrEqual(3);
    // Le chant ouvert n'est pas dans sa propre liste ; chaque autre est un lien vers sa page.
    await expect(liste.locator(`a[href="/songs/${encodeURIComponent(slug)}"]`)).toHaveCount(0);
    // Cinq d'abord, puis « Voir les N autres » montre le reste ; chaque ligne de chant est un lien.
    expect(await liste.locator('a[href^="/songs/"]').count()).toBe(5);
    await liste.getByRole("button", { name: zh ? /^查看其余 \d+ 首$/ : /^Voir les \d+ autres$/ }).click();
    expect(await liste.locator('a[href^="/songs/"]').count()).toBe(await liste.locator("li").count());
    await expect(liste.locator("li").first()).toContainText(/ · [A-G][#b]?m?$/);
  });
}
