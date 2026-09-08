#!/usr/bin/env npx tsx
/**
 * Zoom sur une étiquette du calque : le gravé au-dessus, le rendu dessous,
 * à la même échelle et fortement grossis.
 *
 * La planche d'audit montre la page ; elle ne dit pas ce qu'une étiquette
 * *efface* en s'élargissant. C'est ce zoom qui a tranché (itération 38) :
 * sur 让爱走动 les « encre couverte » du balayage sont les **barres
 * verticales** de la ligne d'intro « G | Fadd2 | C/E | Cm/Eb », que les noms
 * transposés, plus longs, recouvrent une à une.
 *
 * Usage : npx tsx scripts/jianpu/zoom-browser.ts <slug> <accord gravé>
 * Sortie : scripts/jianpu/debug/_zoom-<slug>.png
 */

import fs from "node:fs";
import { chromium } from "@playwright/test";
import { BASE_URL } from "../../playwright.config";
import { auditKey, loadChords, openSheet } from "../../tests/helpers/jianpu";
import { ensureServer } from "./dev-server";

/** Zoom sur une étiquette : le gravé au-dessus, le rendu dessous, à la même
 *  échelle. Sert à trancher ce que « encre couverte » veut dire à l'œil. */
async function main() {
  const [slug, needle] = process.argv.slice(2);
  const chords = loadChords();
  const c = chords[slug];
  const key = auditKey(slug, c.printedKey);
  const server = await ensureServer();
  const browser = await chromium.launch();
  const shots: Record<string, string> = {};
  for (const k of [undefined, key]) {
    const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    const sheets = await openSheet(page, slug, { key: k });
    const buf = await sheets.nth(0).screenshot();
    shots[k ?? "gravé"] = `data:image/png;base64,${buf.toString("base64")}`;
    await ctx.close();
  }
  // Fenêtre autour de l'étiquette visée, en pixels image.
  const cible = c.labels.find((l) => l.c === needle)!;
  const win = { x: cible.x - 40, y: cible.y - 30, w: cible.w + 260, h: cible.h + 90 };
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const ech = 1100 / win.w; // grossissement
  await page.setContent(`
    <style>body{margin:0;background:#fff;font:13px ui-sans-serif,system-ui}
      .t{font-weight:700;padding:4px 0;color:#334155}.t.b{color:#b91c1c}
      .w{width:${Math.round(win.w * ech)}px;height:${Math.round(win.h * ech)}px;overflow:hidden;position:relative;border:1px solid #cbd5e1;margin-bottom:10px}
      .w img{position:absolute;width:${Math.round(c.w * ech)}px;left:${-Math.round(win.x * ech)}px;top:${-Math.round(win.y * ech)}px}</style>
    <div style="padding:14px">
      <div class="t">GRAVÉ — ${needle}</div><div class="w"><img src="${shots["gravé"]}"></div>
      <div class="t b">RENDU → ${key}</div><div class="w"><img src="${shots[key]}"></div>
    </div>`);
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
  fs.mkdirSync("scripts/jianpu/debug", { recursive: true });
  await page.screenshot({ path: `scripts/jianpu/debug/_zoom-${slug}.png`, fullPage: true });
  console.log(`scripts/jianpu/debug/_zoom-${slug}.png`);
  await browser.close();
  server?.kill();
}
main();
