import { expect, test, type Page } from "@playwright/test";

// Le libellé d'une section suit le nom écrit par l'auteur quand il désigne une
// autre sorte de section que la directive : {start_of_intro: Interlude} se lit
// « Interlude », pas « Intro ». Le type (ids, couleurs, setlists) ne change pas.

/** Libellés des sections affichées sur la page du chant, dans l'ordre. */
const sectionLabels = (page: Page) =>
  page.locator("main.song-zoom [data-section] > div:first-child > span:last-child").allInnerTexts();

test("FR : « Interlude » écrit sous une directive intro s'affiche Interlude (Abba Père)", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await expect.poll(() => sectionLabels(page)).toEqual(["INTRO", "COUPLET 1", "REFRAIN", "INTERLUDE", "COUPLET 2", "PONT"]);
});

test("ZH : « 预备副歌/Pre-Refrain » sous une directive verse s'affiche Pré-refrain, en FR comme en 中文 (我神我王)", async ({ page }) => {
  await page.goto("/songs/我神我王");
  await expect.poll(() => sectionLabels(page)).toEqual(["INTRO", "COUPLET", "PRÉ-REFRAIN", "REFRAIN", "PONT"]);

  await page.evaluate(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.reload();
  await expect.poll(() => sectionLabels(page)).toEqual(["前奏", "主歌", "副歌前奏", "副歌", "桥段"]);
});
