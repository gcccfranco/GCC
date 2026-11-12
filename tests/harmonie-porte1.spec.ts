import { expect, test, type Page } from "@playwright/test";
import { accordDuChiffre, ensuite, notesGardeesEtMouvantes, suitesUsuelles, tonaliteDesEtiquettes } from "../src/lib/harmonie/suites";

// Harmonie H5-1 (docs/spec-harmonie-accords.md) : porte 1, le panneau d'un accord touché dans la partition d'un chant
// montre son chiffre, Écouter et « Ensuite » ; jamais sur /accords. Les fonctions pures de suites.ts d'abord.

test("suitesUsuelles : 1 → 4, 5, 6m ; 7dim → 1 ; un degré inconnu → 1, 5", () => {
  expect(suitesUsuelles("1")).toEqual(["4", "5", "6m"]);
  expect(suitesUsuelles("7dim")).toEqual(["1"]);
  expect(suitesUsuelles("b7")).toEqual(["1", "5"]);
});

test("accordDuChiffre : lettres dans D, orthographe de la tonalité", () => {
  expect(accordDuChiffre("1", "D")).toBe("D");
  expect(accordDuChiffre("6m", "D")).toBe("Bm");
  expect(accordDuChiffre("4", "D")).toBe("G");
  expect(accordDuChiffre("b7", "D")).toBe("C");
  expect(accordDuChiffre("4", "F")).toBe("Bb");
  expect(accordDuChiffre("x", "D")).toBeNull();
});

test("notesGardeesEtMouvantes : G → Bm garde B D, G → F# ; D → G tout bouge ou presque", () => {
  expect(notesGardeesEtMouvantes("G", "Bm")).toEqual({ gardees: ["B", "D"], bougent: [{ de: "G", vers: "F#" }] });
  expect(notesGardeesEtMouvantes("C", "F#")!.gardees).toEqual([]);
  expect(notesGardeesEtMouvantes("xyz", "G")).toBeNull();
});

test("ensuite : au plus trois, l'accord réel d'abord, sans doublon", () => {
  expect(ensuite("1", "D").map((l) => l.chiffre)).toEqual(["4", "5", "6m"]);
  const avecReel = ensuite("1", "D", { accord: "A", chiffre: "5" });
  expect(avecReel.map((l) => l.chiffre)).toEqual(["5", "4", "6m"]);
  expect(avecReel[0].dansCeChant).toBe(true);
  expect(avecReel.filter((l) => l.dansCeChant)).toHaveLength(1);
});

test("ensuite : une basse ne double pas le degré (D puis G/B), le même degré n'est pas une suite (D puis Dsus4)", () => {
  expect(ensuite("1", "D", { accord: "G/B", chiffre: "4/6" }).map((l) => l.chiffre)).toEqual(["4/6", "5", "6m"]);
  expect(ensuite("1", "D", { accord: "Dsus4", chiffre: "1" }).map((l) => l.chiffre)).toEqual(["4", "5", "6m"]);
  expect(ensuite("1", "D", { accord: "D/F#", chiffre: "1/3" }).some((l) => l.dansCeChant)).toBe(false);
});

test("tonaliteDesEtiquettes : D capo 2 → C ; sans capo, la tonalité", () => {
  expect(tonaliteDesEtiquettes("D", 2)).toBe("C");
  expect(tonaliteDesEtiquettes("D")).toBe("D");
  expect(tonaliteDesEtiquettes(undefined, 2)).toBeUndefined();
});

test("suitesUsuelles : 1m → 4m, 5, b6", () => {
  expect(suitesUsuelles("1m")).toEqual(["4m", "5", "b6"]);
});

const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
const panneau = (page: Page) => page.locator("[data-accord-panneau]");

async function toucher(page: Page, slug: string, zh: boolean) {
  await sansAide(page);
  if (zh) {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  }
  await page.goto("/songs/" + encodeURIComponent(slug));
  const accord = page.locator("[data-section] [data-copy-line] [data-accord-touchable]").nth(2);
  await expect(accord).toBeVisible();
  await accord.click();
  await expect(panneau(page)).toBeVisible();
}

for (const [slug, zh] of [["a-jamais-tu-es-saint", false], ["一切歌颂赞美", true]] as const) {
  test(`chant ${zh ? "ZH" : "FR"} : le panneau d'un accord montre le chiffre, Écouter et Ensuite`, async ({ page }) => {
    await toucher(page, slug, zh);
    await expect(panneau(page).locator("[data-accord-chiffre]")).toHaveText(zh ? /^[A-G][#b]?m? 调的 \S+$/ : /^\S+ dans [A-G][#b]?m?$/);
    await expect(panneau(page).getByRole("button", { name: zh ? "试听" : "Écouter" })).toBeVisible();
    const ensuiteBtn = panneau(page).getByRole("button", { name: zh ? /^接下来/ : /^Ensuite/ });
    await expect(ensuiteBtn).toHaveAttribute("aria-expanded", "false");
    await ensuiteBtn.click();
    await expect(ensuiteBtn).toHaveAttribute("aria-expanded", "true");
    expect(await panneau(page).locator("[data-ensuite] li").count()).toBeGreaterThanOrEqual(1);
    await expect(panneau(page).locator("[data-ensuite] li").first()).toContainText(zh ? /保留|全部移动/ : /garde|tout bouge/);
  });
}

test("page /accords : pas de chiffre, pas d'Ensuite", async ({ page }) => {
  await sansAide(page);
  await page.goto("/accords?accord=D");
  await expect(page.locator("[data-accord-nom]").first()).toBeVisible();
  await expect(page.locator("[data-accord-chiffre]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Ensuite/ })).toHaveCount(0);
});
