import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, lireCompteur, onStage, ouvrirOptions, type Langue } from "./helpers/louange";

// Lot Harmonie H8-1 (docs/spec-harmonie-accords.md) : dans le mode louange, un point dans la marge des sections qui ont
// une idée d'harmonie ; le toucher ouvre une bande au-dessus du corps de la section « chiffres → chiffres · lettres → lettres ».
// Réglage « Idées d'harmonie » éteint par défaut, par compte, absent sans accès harmonie. Noms fictifs.

const SETLIST_ID = "setlist-louange-harmonie";
const SANS_ACCES: FakeProfile = { uid: "uid-camille", email: "camille@example.com", firstName: "Camille", lastName: "V.", planningName: "Camille V." };
const AVEC_ACCES: FakeProfile = { uid: "uid-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "R.", planningName: "Sacha R.", ...musicien("piano") };

const CHANTS = [
  { slug: "a-jamais-tu-es-saint", langue: "fr" as Langue, cle: "C#", autre: "D" },
  { slug: "一切歌颂赞美", langue: "zh" as Langue, cle: "E", autre: "F" },
];

const setlist = (slug: string, cle: string) => ({
  title: "Culte du 11 octobre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [{
    songSlug: slug, position: 1, keyOverride: cle, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "",
  } satisfies SetlistItem],
});

async function ouvrirMode(page: Page, profil: FakeProfile, c: (typeof CHANTS)[number], { cle = c.cle, allume = true } = {}) {
  await page.addInitScript(({ u, zh, on }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", "never");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (on) localStorage.setItem(`perf-idees-harmonie-${u}`, "1");
  }, { u: profil.uid, zh: c.langue === "zh", on: allume });
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: setlist(c.slug, cle) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: c.langue === "zh" ? /演奏模式|崇拜模式|Mode Louange/ : /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
}

const points = (page: Page) => onStage(page, "button[data-idee-harmonie]");
const bande = (page: Page) => onStage(page, "[data-idee-harmonie-bande]");

for (const c of CHANTS) {
  test(`chant ${c.langue.toUpperCase()} : réglage éteint par défaut, aucun point`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: false });
    await expect(points(page)).toHaveCount(0);
    const feuille = await ouvrirOptions(page, c.langue);
    const reglage = feuille.getByRole("button", { name: c.langue === "zh" ? "和声提示" : "Idées d'harmonie" });
    await expect(reglage).toBeVisible();
    await reglage.click();
    await expect(points(page).first()).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate((u) => localStorage.getItem(`perf-idees-harmonie-${u}`), AVEC_ACCES.uid)).toBe("1");
  });

  test(`chant ${c.langue.toUpperCase()} : sans accès harmonie, ni réglage ni point, même si la clé dit oui`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    await expect(points(page)).toHaveCount(0);
    const feuille = await ouvrirOptions(page, c.langue);
    await expect(feuille.getByRole("button", { name: c.langue === "zh" ? "和声提示" : "Idées d'harmonie" })).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : un point par section à idée, bande ouverte puis refermée, page non tournée`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c);
    const premier = points(page).first();
    await expect(premier).toBeVisible({ timeout: 15_000 });
    await expect(premier).toHaveAttribute("aria-label", c.langue === "zh" ? /^和声提示：/ : /^Idée d'harmonie : /);
    await expect(premier).toHaveAttribute("aria-expanded", "false");
    const noms = await points(page).evaluateAll((l) => l.map((b) => b.getAttribute("aria-label")));
    expect(new Set(noms).size, "au plus un point par section").toBe(noms.length);

    const avant = await lireCompteur(page);
    await expect(bande(page)).toHaveCount(0);
    await premier.click();
    await expect(premier).toHaveAttribute("aria-expanded", "true");
    await expect(bande(page)).toHaveCount(1);
    await expect(bande(page)).toHaveText(/→.* · .*→/);
    expect(await lireCompteur(page), "le toucher ne tourne pas la page").toBe(avant);

    await premier.click();
    await expect(premier).toHaveAttribute("aria-expanded", "false");
    await expect(bande(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : transposé, la bande montre les lettres affichées et les mêmes chiffres`, async ({ page, browser }) => {
    await ouvrirMode(page, AVEC_ACCES, c);
    await points(page).first().click();
    const [chiffres, lettres] = (await bande(page).innerText()).split(" · ");

    const page2 = await (await browser.newContext(test.info().project.use)).newPage();
    await ouvrirMode(page2, AVEC_ACCES, c, { cle: c.autre });
    await points(page2).first().click();
    const [chiffres2, lettres2] = (await bande(page2).innerText()).split(" · ");
    expect(chiffres2).toBe(chiffres);
    expect(lettres2).not.toBe(lettres);
    await page2.context().close();
  });
}
