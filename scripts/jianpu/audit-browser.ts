#!/usr/bin/env npx tsx
/**
 * Audit visuel d'une partition 简谱 **dans le navigateur** (Playwright).
 *
 * `audit-page.py` rend la page avec PIL, à côté du vrai composant : il ne
 * voit donc ni le masque opaque qui rogne l'étiquette voisine, ni le
 * débordement d'une ligne d'intro, ni le thème sombre — trois défauts que
 * seule la capture navigateur avait attrapés (itérations 13 et 36). Ce
 * script rend ce que l'utilisateur voit vraiment : le composant
 * `JianpuSheet`, servi par `next dev`, capturé par Chromium.
 *
 * Il produit la même planche que l'audit Python : la page découpée en
 * tranches qui se recouvrent, **original au-dessus, rendu transposé
 * dessous**. Deux erreurs se lisent d'un coup d'œil :
 *
 *   - un accord **sans cadre rouge** n'est pas couvert par le calque, et un
 *     cadre **orange** dit que le calque publie sans avoir réécrit : sur
 *     la page transposée il reste dans l'ancienne tonalité (mode D) ;
 *   - un accord dont le bas ne correspond pas au transposé du haut est une
 *     mauvaise lecture (mode C). Aucune connaissance musicale nécessaire :
 *     au demi-ton au-dessus, *aucun* accord ne garde son nom.
 *
 * Usage (depuis la racine du dépôt) :
 *   npx tsx scripts/jianpu/audit-browser.ts 认识你真好
 *   npx tsx scripts/jianpu/audit-browser.ts 认识你真好 F --dark
 *   npx tsx scripts/jianpu/audit-browser.ts 认识你真好 --page=1 --slice=500
 *   npx tsx scripts/jianpu/audit-browser.ts 一生爱你 --cadrage [--dark]
 *
 * `--cadrage` (chantier 简谱, L3-T1, docs/spec-jianpu-integration.md) : le haut
 * de la page entière tel que le navigateur le rend, avec la **ligne de coupe**
 * `top` (certifiée dans public/jianpu/cadrage.json, sinon proposée par
 * scripts/jianpu/cadrage.py) et la partie coupée voilée de rouge. Page refusée
 * si la ligne tranche des crédits ou le haut d'un « 4/4 », ou si un titre, un
 * album, des versets ou « （C调） » restent sous elle quand une coupe propre existe.
 *
 * Depuis L3-T2b, le site montre le scan dans une **fenêtre** qui coupe l'en-tête gravé.
 * La planche, elle, montre toujours la **page entière** (fenêtre ouverte) avec la ligne
 * de coupe en pointillé rouge : ce qui est au-dessus n'est pas affiché sur le site.
 *
 * Sortie : scripts/jianpu/debug/_pw-<slug>-<n>.png ; _pw-<slug>-cadrage-p<n>.png
 */

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { BASE_URL } from "../../playwright.config";
import { auditKey, loadChords, openSheet } from "../../tests/helpers/jianpu";
import { ensureServer } from "./dev-server";

const OUT_DIR = path.resolve(__dirname, "debug");

function flag(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const slug = args[0];
if (!slug) {
  console.error("usage : npx tsx scripts/jianpu/audit-browser.ts <slug> [tonalité] [--page=0] [--slice=380] [--width=1400] [--dark] [--no-frames] [--alt]");
  process.exit(1);
}
const dark = process.argv.includes("--dark");
const frames = !process.argv.includes("--no-frames");
// `--alt` ouvre le **sélecteur de tonalité** avant la capture : sans lui, une
// page à deux jeux d'accords n'est auditée que sur son défaut, où la rangée
// alternative n'est qu'un masque vide — ce qu'elle écrit une fois demandée
// n'était vu par aucune planche (itération 59).
const alt = process.argv.includes("--alt");
const cadrage = process.argv.includes("--cadrage");
const pageIndex = flag("page", 0);
const sliceH = flag("slice", 380);
const overlap = flag("overlap", 60);
const width = flag("width", 1400);

const chords = loadChords();

/** `top` de la page : certifié, sinon proposé, sinon absent. */
function topDeCoupe(): { top: number; certifie: boolean } | undefined {
  const lire = (fichier: string) =>
    fs.existsSync(fichier) ? (JSON.parse(fs.readFileSync(fichier, "utf8")) as Record<string, number[]>)[slug]?.[pageIndex] : undefined;
  const certifie = lire(path.resolve(__dirname, "..", "..", "public", "jianpu", "cadrage.json"));
  if (certifie !== undefined) return { top: certifie, certifie: true };
  const propose = lire(path.join(OUT_DIR, "cadrage-propose.json"));
  return propose !== undefined ? { top: propose, certifie: false } : undefined;
}
const printedKey = chords[slug]?.printedKey;

/** Ouvre la fenêtre du site (piste A, L3-T2b) : la page entière, non remontée. */
const PAGE_ENTIERE =
  "[data-jianpu-fenetre]{overflow:visible!important;aspect-ratio:auto!important}" +
  "[data-jianpu-page]{transform:none!important}";
const target = args[1] ?? (printedKey ? auditKey(slug, printedKey) : "F#");

/** Capture la page `pageIndex` du scan, telle que le navigateur la rend. */
async function shoot(browser: Browser, key?: string): Promise<Buffer> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: width + 200, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: dark ? "dark" : "light",
  });
  const page: Page = await context.newPage();
  const sheets = await openSheet(page, slug, { key, dark, gravure: !key });
  await page.addStyleTag({ content: PAGE_ENTIERE });
  const coupe = topDeCoupe();
  if (coupe?.top) {
    await sheets.nth(pageIndex).evaluate((host, top) => {
      const img = host.querySelector("img")!;
      const k = img.getBoundingClientRect().height / img.naturalHeight;
      const ligne = document.createElement("div");
      ligne.style.cssText = `position:absolute;left:0;right:0;top:${top * k}px;border-top:2px dashed rgb(220,38,38);z-index:50;pointer-events:none`;
      host.appendChild(ligne);
    }, coupe.top);
  }
  if (alt && key) await page.locator('[data-jianpu-altkey="on"]').click();
  if (frames && key) {
    // « Un accord sans cadre n'est pas converti » — le cadre de contrôle de
    // l'audit Python, posé ici par le navigateur lui-même.
    //
    // Le cadre rouge dit seulement que le calque **publie** ici. Il ne dit pas
    // que le texte a changé : `transposeLabel` peut rendre un jeton verbatim et
    // l'étiquette est encadrée quand même — c'est ainsi que `[Gm]` est resté en
    // fa sur 一粒麦子 sous un cadre rouge (itération 43). Une étiquette dont le
    // rendu est identique au gravé se marque donc en **orange**, à un demi-ton
    // où aucun nom d'accord ne se conserve.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-jianpu-label]")) {
        if ((el.textContent ?? "").trim() === (el.dataset.jianpuLabel ?? "").trim()) {
          el.dataset.jianpuVerbatim = "1";
        }
      }
    });
    await page.addStyleTag({
      content:
        "[data-jianpu-label],[data-jianpu-keylabel]{outline:1.5px solid rgba(220,38,38,.85);outline-offset:0}" +
        "[data-jianpu-verbatim]{outline:3px solid rgba(217,119,6,1)!important}",
    });
  }
  const sheet = sheets.nth(pageIndex);
  await sheet.waitFor();
  const buf = await sheet.screenshot();
  await context.close();
  return buf;
}

/** Empile les deux captures en tranches qui se recouvrent, et rend une PNG
 *  par tranche. La composition se fait dans le navigateur : pas de
 *  bibliothèque d'images à installer. */
async function planche(browser: Browser, before: Buffer, after: Buffer) {
  const context = await browser.newContext({
    viewport: { width: width + 40, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const uri = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;

  await page.setContent(`
    <style>
      :root { color-scheme: light }
      body { margin:0; background:#fff; font:12px/1.4 ui-sans-serif, system-ui, sans-serif; width:${width + 40}px }
      .slice { padding:8px 20px 16px; border-bottom:2px solid #94a3b8 }
      .tag { font-weight:700; color:#334155; padding:3px 0 }
      .tag.after { color:#b91c1c }
      .win { width:${width}px; overflow:hidden; position:relative; border:1px solid #cbd5e1 }
      .win img { width:${width}px; display:block; position:absolute; left:0 }
    </style>
    <img id="before" src="${uri(before)}">
    <img id="after" src="${uri(after)}">
    <div id="out"></div>
  `);
  await page.waitForFunction(() =>
    Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0)
  );

  const count = await page.evaluate(
    ({ width, sliceH, overlap, slug, printedKey, target }) => {
      const before = document.getElementById("before") as HTMLImageElement;
      const after = document.getElementById("after") as HTMLImageElement;
      const H = Math.round((before.naturalHeight / before.naturalWidth) * width);
      before.style.display = after.style.display = "none";
      const step = sliceH - overlap;
      const n = Math.max(1, Math.ceil((H - overlap) / step));
      const out = document.getElementById("out")!;
      for (let i = 0; i < n; i++) {
        const top = Math.min(i * step, Math.max(0, H - sliceH));
        const h = Math.min(sliceH, H - top);
        out.insertAdjacentHTML(
          "beforeend",
          `<section class="slice">
             <div class="tag">${slug} — tranche ${i + 1}/${n} — GRAVÉ (${printedKey})</div>
             <div class="win" style="height:${h}px"><img src="${before.src}" style="top:${-top}px"></div>
             <div class="tag after">RENDU transposé → ${target} · sans cadre rouge = pas converti · cadre orange = publié mais non réécrit</div>
             <div class="win" style="height:${h}px"><img src="${after.src}" style="top:${-top}px"></div>
           </section>`
        );
      }
      return n;
    },
    { width, sliceH, overlap, slug, printedKey: printedKey ?? "?", target }
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slices = page.locator(".slice");
  for (let i = 0; i < count; i++) {
    const file = path.join(OUT_DIR, `_pw-${slug}${alt ? "-alt" : ""}-${i + 1}.png`);
    await slices.nth(i).screenshot({ path: file });
    console.log(file);
  }
  await context.close();
}

/** Le haut de la page, page entière, avec la ligne de coupe. */
async function planchecadrage(browser: Browser) {
  const coupe = topDeCoupe();
  if (!coupe) throw new Error(`${slug} : aucun top — python3 scripts/jianpu/cadrage.py propose ${slug}`);
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1000, height: 1000 },
    deviceScaleFactor: 1.5,
    colorScheme: dark ? "dark" : "light",
  });
  const page = await context.newPage();
  const sheets = await openSheet(page, slug, { dark, gravure: true });
  await page.addStyleTag({ content: PAGE_ENTIERE });
  const sheet = sheets.nth(pageIndex);
  await sheet.waitFor();
  const clip = await sheet.evaluate((host, top) => {
    const img = host.querySelector("img")!;
    const k = img.getBoundingClientRect().height / img.naturalHeight;
    const voile = document.createElement("div");
    voile.style.cssText = `position:absolute;left:0;right:0;top:0;height:${top * k}px;background:rgba(220,38,38,.16);border-bottom:2px solid rgb(220,38,38);z-index:50;pointer-events:none`;
    host.appendChild(voile);
    const r = host.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: Math.min(r.height, top * k + 260) };
  }, coupe.top);
  const file = path.join(OUT_DIR, `_pw-${slug}-cadrage-p${pageIndex + 1}${dark ? "-sombre" : ""}.png`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: file, clip, fullPage: true });
  await context.close();
  console.log(file);
  console.log(`\n${slug} p.${pageIndex + 1} : coupe à ${coupe.top} px (${coupe.certifie ? "certifiée" : "proposée"})`);
}

async function main() {
  const server = await ensureServer();
  const browser = await chromium.launch();
  try {
    if (cadrage) {
      await planchecadrage(browser);
      return;
    }
    const before = await shoot(browser);
    const after = await shoot(browser, target);
    await planche(browser, before, after);
    console.log(`\n${slug} : ${printedKey ?? "?"} → ${target}${dark ? " (thème sombre)" : ""}`);
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
