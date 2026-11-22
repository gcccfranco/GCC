import { test, expect, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, musicien, type FakeProfile } from "./helpers/fakeSession";

// P1 (docs/audit-performance-2026-11-21.md, § 7) : ChordLine et ZhLine sont mémoïsées. Une ligne qui ne se
// re-rend plus doit quand même suivre chaque changement : on fait le changement sur place, on relève les lignes
// (coupure, resserrage, textes, place des accords dans la ligne), puis on recharge la page dans le même état :
// les deux relevés doivent être identiques. Une ligne restée figée garderait l'état d'avant le changement.

const ID = "setlist-lignes-a-jour";
const PROFIL: FakeProfile = { uid: "uid-ysolde", email: "ysolde@example.com", firstName: "Ysolde", lastName: "Marivaux", planningName: "Ysolde M.", serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano") };
const item = (songSlug: string, position: number): SetlistItem => ({ songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" } as SetlistItem);
const SETLIST = { title: "Culte des lignes à jour", leader: "Présidence", category: "Culte Francophone", date: "2026-11-29", language: "mixed", notes: "", ownerId: PROFIL.uid, isPrivate: false,
  items: [item("abba-pere", 1), item("为我而来", 2)] };

type Releve = { lignes: string[]; pinyin: number; chiffres: number; lettres: number };

/** Lignes visibles : coupure, resserrage et, par morceau de texte, sa place dans la ligne (px, arrondis au demi). */
async function releve(page: Page): Promise<Releve> {
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]));
  let avant = "";
  // Attendre que la mesure groupée (viderMesures) soit retombée : deux relevés de suite identiques.
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const demi = (v: number) => Math.round(v * 2) / 2;
      const lignes = [...document.querySelectorAll<HTMLElement>("main [data-coupe]")].filter((l) => l.offsetParent !== null);
      return JSON.stringify(lignes.map((l) => {
        const b = l.getBoundingClientRect();
        const morceaux = [...l.querySelectorAll("span")].filter((e) => !e.children.length && (e.textContent ?? "").trim() && (e as HTMLElement).offsetParent !== null)
          .map((e) => { const x = e.getBoundingClientRect(); return `${e.textContent}@${demi(x.left - b.left)},${demi(x.top - b.top)},${demi(x.width)}`; });
        return `${l.dataset.coupe}|${l.style.letterSpacing}|${morceaux.join(" ")}`;
      }));
    });
    if (r === avant) break;
    avant = r;
  }
  const lignes = JSON.parse(avant) as string[];
  const accords = await page.locator("main [data-coupe] [data-accord-touchable]").allTextContents();
  return {
    lignes,
    pinyin: await page.locator("main [data-coupe] [data-pinyin], main [data-copy-pinyin] span").evaluateAll((els) => els.filter((e) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(e.textContent ?? "") && (e as HTMLElement).offsetParent !== null && getComputedStyle(e).visibility !== "hidden").length),
    chiffres: accords.filter((t) => /^[b#♭♯]?[1-7]|^[IV]/.test(t.trim())).length,
    lettres: accords.filter((t) => /^[A-G]/.test(t.trim())).length,
  };
}

async function ouvrirSetlist(page: Page) {
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).first().waitFor({ timeout: 60_000 });
  const part = page.getByRole("button", { name: /^(Partitions|歌谱预览)$/ });
  if (await part.isVisible().catch(() => false)) await part.click();
  await page.locator("[data-outline-item] [data-coupe]").first().waitFor({ timeout: 60_000 });
}

async function marge(page: Page) {
  const corps = page.locator('[data-testid="marge-affichage"][data-ouvert="true"] [data-testid="marge-corps"]').first();
  if (!(await corps.isVisible().catch(() => false))) {
    await page.getByTestId("barre-outils").or(page.locator("[data-en-tete]")).getByRole("button", { name: /^Affichage$/ }).first().click();
  }
  await expect(corps).toBeVisible();
  return corps;
}

async function fermerMarge(page: Page) {
  const f = page.getByRole("button", { name: /^Fermer l'affichage$/ }).first();
  if (await f.isVisible().catch(() => false)) await f.click();
}

/** Le changement fait sur place donne les mêmes lignes qu'un rechargement dans le même état. */
async function commeRecharge(page: Page, change: (page: Page) => Promise<unknown>, apres?: (avant: Releve, sur: Releve) => void) {
  const avant = await releve(page);
  await change(page);
  await fermerMarge(page);
  const surPlace = await releve(page);
  apres?.(avant, surPlace);
  await page.reload();
  await ouvrirSetlist(page);
  const recharge = await releve(page);
  expect(surPlace.lignes.length).toBeGreaterThan(0);
  expect(surPlace.lignes).toEqual(recharge.lignes);
}

test.describe("P1 : une ligne d'accords mémoïsée suit chaque changement (page setlist, FR et ZH)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await signInAs(page, PROFIL, { [`setlists/${ID}`]: SETLIST }, `/setlists/${ID}`);
    await ouvrirSetlist(page);
  });

  test("taille du texte (A+ trois fois) : coupures et accords comme après un rechargement", async ({ page }) => {
    await commeRecharge(page, async () => {
      const m = await marge(page);
      for (let i = 0; i < 3; i++) await m.getByRole("button", { name: "Agrandir le texte" }).click();
    });
  });

  test("notation (Chiffres) : les accords passent en chiffres, comme après un rechargement", async ({ page }) => {
    await commeRecharge(page, async () => { const m = await marge(page); await m.getByRole("radio", { name: "Chiffres" }).or(m.getByRole("button", { name: "Chiffres" })).first().click(); }, (avant, sur) => {
      expect(avant.lettres).toBeGreaterThan(0);
      expect(sur.lettres).toBe(0);
      expect(sur.chiffres).toBeGreaterThan(0);
    });
  });

  test("pinyin masqué : il disparaît des lignes chinoises, comme après un rechargement", async ({ page }) => {
    await commeRecharge(page, async () => (await marge(page)).getByRole("switch", { name: "Pinyin" }).click(), (avant, sur) => {
      expect(avant.pinyin).toBeGreaterThan(0);
      expect(sur.pinyin).toBe(0);
    });
  });

  for (const disposition of ["Scène", "Partition"]) {
    test(`disposition ${disposition} : lignes comme après un rechargement`, async ({ page }) => {
      await commeRecharge(page, async () => (await marge(page)).getByRole("radio").filter({ hasText: disposition }).first().click());
    });
  }

  test("Crayon activé puis quitté : lignes comme après une remesure complète (fenêtre élargie puis rétablie)", async ({ page }) => {
    const remesure = async () => {
      const v = page.viewportSize()!;
      await page.setViewportSize({ width: v.width + 40, height: v.height });
      await page.waitForTimeout(500);
      await page.setViewportSize(v);
      return releve(page);
    };
    const plus = page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first();
    await plus.waitFor();
    const crayon = page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first();
    if (await crayon.isVisible()) await crayon.click();
    else {
      await plus.click();
      await page.getByRole("menuitemcheckbox", { name: "Crayon" }).click();
    }
    await page.locator("[data-barre-crayon]").waitFor();
    const enCrayon = await releve(page);
    expect(enCrayon.lignes.length).toBeGreaterThan(0);
    expect(enCrayon.lignes).toEqual((await remesure()).lignes);
    await page.locator("[data-barre-crayon]").getByRole("button", { name: "Terminé" }).click();
    await page.locator("[data-barre-crayon]").waitFor({ state: "detached" });
    const apres = await releve(page);
    expect(apres.lignes).toEqual((await remesure()).lignes);
  });

  test("thème sombre : lignes comme après un rechargement", async ({ page }) => {
    await commeRecharge(page, async () => {
      const b = page.getByRole("button", { name: "Mode sombre" }).filter({ visible: true }).first();
      if (await b.count()) await b.click();
      else await page.evaluate(() => { localStorage.setItem("theme", "dark"); document.documentElement.classList.add("dark"); });
    });
  });

  test("langue (chinois) : lignes comme après un rechargement", async ({ page }) => {
    const b = page.getByRole("button", { name: "切换为中文" }).filter({ visible: true }).first();
    test.skip(!(await b.count()), "bouton de langue hors de l'écran à cette taille (dans le menu Moi)");
    await commeRecharge(page, () => b.click());
  });
});
