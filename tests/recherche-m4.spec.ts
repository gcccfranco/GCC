import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SongIndexEntry } from "../src/types/song";

// Recherche M4 (flux B, B5a) : le pinyin collé et sans tons trouve comme le pinyin espacé, un artiste cité
// en fin de chaîne se trouve, un chant français se trouve toujours par son titre.

async function resultats(page: import("@playwright/test").Page, q: string): Promise<string[]> {
  await page.goto(`/songs?q=${encodeURIComponent(q)}`);
  await expect(page.getByRole("searchbox").first()).toHaveValue(q);
  await page.waitForTimeout(600);
  return page.locator("main a[href^='/songs/']").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
}

test("« yisheng » trouve au moins ce que « yi sheng » trouve, dont 一生爱你", async ({ page }) => {
  const colle = await resultats(page, "yisheng");
  const espace = await resultats(page, "yi sheng");
  expect(espace.length).toBeGreaterThan(0);
  // Chaque chant dont le pinyin contient « yi sheng » (sans tons) se trouve aussi par « yisheng ».
  const index = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
  const sansTons = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const attendus = index.filter((s) => sansTons(s.titlePinyin ?? "").includes("yi sheng"));
  expect(attendus.length).toBeGreaterThan(0);
  for (const s of attendus) expect(colle.some((h) => decodeURIComponent(h).includes(s.slug))).toBe(true);
  expect(colle.some((h) => decodeURIComponent(h).includes("一生爱你"))).toBe(true);
});

test("un artiste cherché par son nom seul est trouvé", async ({ page }) => {
  const hrefs = await resultats(page, "Gather");
  expect(hrefs.length).toBeGreaterThan(0);
});

test("un chant français se trouve toujours par son titre", async ({ page }) => {
  const hrefs = await resultats(page, "Abba Père");
  expect(hrefs.some((h) => h.includes("abba-pere"))).toBe(true);
});
