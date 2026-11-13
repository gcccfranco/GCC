import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
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
  // Page chinoise plus lourde au téléphone : un clic avant l'hydratation est perdu, on le refait.
  await expect(async () => {
    await accord.click();
    await expect(panneau(page)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
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

// H5-2 « Ici » : l'idée du passage de l'accord touché, une ligne sous Ensuite ; un appui ouvre la porte 2 au bloc du passage.
// Accords retenus (idées calculées, vues par un calcul hors page) : FR, G# (le 5) du refrain `chorus-4-3`, en C# (`?key`
// épingle la tonalité d'origine ; la recommandée est A) ; ZH, A (le 4) du couplet `verse-1-0`, « maj7 sur le 1 et le 4 ».
const AGNES: FakeProfile = { uid: "uid-agnes", email: "agnes@example.com", firstName: "Agnès", lastName: "T.", planningName: "Agnès T.", ...musicien("piano") };
const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "B." };
const ICI = [
  { slug: "a-jamais-tu-es-saint", zh: false, cle: "C#", passage: "chorus-4-3", accord: "G#" },
  { slug: "一切歌颂赞美", zh: true, cle: "E", passage: "verse-1-0", accord: "A" },
] as const;

async function toucherIci(page: Page, profil: FakeProfile, c: (typeof ICI)[number]) {
  await sansAide(page);
  if (c.zh) {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  }
  await signInAs(page, profil, {}, `/songs/${encodeURIComponent(c.slug)}?key=${encodeURIComponent(JSON.stringify(c.cle))}`);
  const accord = page.locator(`[data-section-uids~="${c.passage}"] [data-accord-touchable="${c.accord}"]`).first();
  await accord.scrollIntoViewIfNeeded();
  await accord.click();
  await expect(panneau(page)).toBeVisible();
}

for (const c of ICI) {
  test(`chant ${c.zh ? "ZH" : "FR"} : « Ici » ferme le panneau et ouvre la porte 2 au bloc du passage, mis en valeur`, async ({ page }) => {
    await toucherIci(page, AGNES, c);
    const ici = panneau(page).locator("[data-ici]");
    await expect(ici).toContainText(c.zh ? "这里：" : "Ici :");
    await expect(ici).toContainText("→");
    await page.screenshot({ path: test.info().outputPath("panneau-ici.png") });
    const nomIdee = (await ici.locator("span").last().innerText()).trim();
    await ici.click();
    await expect(panneau(page)).toHaveCount(0);
    const porte2 = page.locator("[data-idees-harmonie]");
    await expect(porte2).toBeVisible();
    const bloc = porte2.locator(`[data-passage="${c.passage}"]`);
    await expect(bloc).toHaveClass(/harmonie-surligne/);
    const zone = bloc.locator("xpath=ancestor::div[contains(@class,'overflow-y-auto')][1]");
    // La carte de l'idée nommée par « Ici » (dépliée si elle était sous « Voir plus ») est entière dans la zone qui
    // défile ; le bloc la contient. Un bloc plus haut que la zone ne peut pas montrer à la fois son haut et la carte.
    const carte = bloc.getByText(nomIdee).first();
    await expect.poll(async () => {
      const [b, z] = await Promise.all([carte.boundingBox(), zone.boundingBox()]);
      return !!b && !!z && b.y >= z.y - 1 && b.y + b.height <= z.y + z.height + 1;
    }).toBe(true);
    await page.screenshot({ path: test.info().outputPath("porte2-ici.png") });
  });

  test(`chant ${c.zh ? "ZH" : "FR"} : sans accès Harmonie, pas de ligne « Ici »`, async ({ page }) => {
    await toucherIci(page, LEA, c);
    await expect(panneau(page).getByRole("button", { name: c.zh ? /^接下来/ : /^Ensuite/ })).toBeVisible();
    await expect(panneau(page).locator("[data-ici]")).toHaveCount(0);
  });
}

test("page /accords : pas de ligne « Ici »", async ({ page }) => {
  await sansAide(page);
  await page.goto("/accords?accord=D");
  await expect(page.locator("[data-accord-nom]").first()).toBeVisible();
  await expect(page.locator("[data-ici]")).toHaveCount(0);
});
