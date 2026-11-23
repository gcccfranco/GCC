import { expect, test, type Page } from "@playwright/test";

// Le libellé d'une section suit le nom écrit par l'auteur quand il désigne une
// autre sorte de section que la directive : {start_of_intro: Interlude} se lit
// « Interlude », pas « Intro ». Le type (ids, couleurs, setlists) ne change pas.
// Noms en casse normale depuis la disposition Partition (DP-D, docs/spec-mode-louange-forscore-2.md).

/** Libellés des sections affichées sur la page du chant, dans l'ordre. */
const sectionLabels = (page: Page) =>
  page.locator("main.song-zoom [data-section] > div:first-child > span:last-child").allInnerTexts();

test("FR : « Interlude » écrit sous une directive intro s'affiche Interlude (Abba Père)", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await expect.poll(() => sectionLabels(page)).toEqual(["Intro (x2)", "Couplet 1", "Refrain", "Interlude", "Couplet 2", "Pont"]);
});

// 我神我王 servait d'exemple (pré-refrain écrit sous `start_of_verse`) jusqu'au
// 11/10/2026 : sa directive est maintenant `start_of_prechorus`. Reste en 中文
// l'interlude écrit sous une directive intro.
test("ZH : « 间奏/Interlude » sous une directive intro s'affiche Interlude, en FR comme en 中文 (圣诞节耶稣为你而来)", async ({ page }) => {
  await page.goto(`/songs/${encodeURIComponent("圣诞节耶稣为你而来")}`);
  await expect.poll(() => sectionLabels(page)).toEqual(["Intro", "Couplet 1", "Couplet 2", "Pré-refrain", "Refrain", "Pont", "Interlude"]);

  await page.evaluate(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.reload();
  await expect.poll(() => sectionLabels(page)).toEqual(["前奏", "主歌 1", "主歌 2", "副歌前奏", "副歌", "桥段", "间奏"]);
});

// « Final » écrit sous une directive outro se lit « Final », pas « Outro »
// (décision de Timothée du 26/09/2026, chantier docs/spec-guidelines-cho.md) ;
// le type reste outro (ids, couleurs, setlists).
test("FR : « Final » écrit sous une directive outro s'affiche Final, en FR comme en 中文 (Christ est la lumière)", async ({ page }) => {
  await page.goto("/songs/christ-est-la-lumiere");
  await expect.poll(() => sectionLabels(page)).toEqual(["Couplet 1", "Refrain", "Couplet 2", "Pont", "Final"]);

  await page.evaluate(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.reload();
  await expect.poll(() => sectionLabels(page)).toEqual(["主歌 1", "副歌", "主歌 2", "桥段", "结尾"]);
});
