#!/usr/bin/env npx tsx
/**
 * Balayage du calque **dans le navigateur**, sur tout le corpus certifié.
 * Ne remplace pas la planche : il dit seulement où la regarder.
 *
 * Trois défauts se mesurent sans rien lire :
 *   - **hors-page** : l'étiquette réécrite sort de l'image ;
 *   - **chevauchement** : deux fonds opaques se recouvrent — le second rogne
 *     le texte du premier (« A#7/F G#/A# » → « A#7/ G#/. », itération 36) ;
 *   - **encre couverte** : le fond opaque déborde de l'encre qu'il masque et
 *     recouvre ce qui est gravé à côté — une parole, un 【尾句】, un chiffre.
 *     Mesuré sur les pixels du scan, pas sur les boîtes : c'est le seul moyen
 *     de savoir s'il y avait vraiment quelque chose dessous.
 *
 * Qu'une étiquette soit plus large que le gravé n'est PAS un défaut : « C »
 * devient « Db ». Ce qui compte est ce qu'elle efface en s'élargissant.
 *
 * Usage : npx tsx scripts/jianpu/sweep-browser.ts [--all] [--json]
 */

import { chromium } from "@playwright/test";
import { BASE_URL } from "../../playwright.config";
import { auditKey, certifiedSlugs, loadChords, openSheet, overlayLabels } from "../../tests/helpers/jianpu";
import { ensureServer } from "./dev-server";

type Box = { left: number; top: number; width: number; height: number };
type Page = {
  slug: string;
  etiquettes?: number;
  horsPage?: string[];
  chevauchements?: string[];
  couvert?: string[];
  erreur?: string;
};

const inter = (a: Box, b: Box, tol: number) =>
  Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) > tol &&
  Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) > tol;

/** Encre du scan recouverte par un fond opaque, hors de l'encre que cette
 *  étiquette-là est censée masquer et hors des étiquettes voisines. Lue au
 *  pixel sur l'image d'origine, redessinée dans un canvas de la page. */
async function encreCouverte(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-jianpu-page="0"]')!;
    const img = host.querySelector("img") as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const box = img.getBoundingClientRect();
    const k = img.naturalWidth / box.width; // affichage → pixels image
    // Le cadre « 1=X » porte un fond opaque comme les étiquettes et peut
    // donc effacer le chiffrage voisin ; il lui manquait seulement un
    // marqueur pour entrer dans le balayage (itération 41).
    const spans = Array.from(
      host.querySelectorAll<HTMLElement>("[data-jianpu-label],[data-jianpu-keylabel]")
    );
    const rects = spans.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x0: Math.round((r.left - box.left) * k),
        y0: Math.round((r.top - box.top) * k),
        x1: Math.round((r.right - box.left) * k),
        y1: Math.round((r.bottom - box.top) * k),
        printed: el.dataset.jianpuLabel ?? "",
        shown: (el.textContent ?? "").trim(),
      };
    });

    return rects
      .map((r, n) => {
        // La partie du fond qui dépasse à droite de l'encre d'origine. Le
        // gravé occupe la largeur de la boîte du texte imprimé ; ce qui suit
        // n'appartient pas à cette étiquette.
        const propre = spans[n].style.minWidth; // en % de la largeur image
        const largeurPropre = (parseFloat(propre) / 100) * canvas.width;
        const debut = Math.round(r.x0 + largeurPropre);
        if (r.x1 - debut < 3) return null;
        let encre = 0;
        for (let y = Math.max(0, r.y0); y < Math.min(canvas.height, r.y1); y++) {
          for (let x = Math.max(0, debut); x < Math.min(canvas.width, r.x1); x++) {
            // L'encre des étiquettes voisines est traitée par le test de
            // chevauchement : ici on ne compte que le reste de la page.
            if (rects.some((o, m) => m !== n && x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1)) continue;
            const i = (y * canvas.width + x) * 4;
            if (px[i] + px[i + 1] + px[i + 2] < 3 * 150) encre++;
          }
        }
        return encre > 20 ? { printed: r.printed, shown: r.shown, largeur: r.x1 - debut, encre } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });
}

async function main() {
  const chords = loadChords();
  const slugs = process.argv.includes("--all") ? Object.keys(chords).sort() : certifiedSlugs();
  const server = await ensureServer();
  const browser = await chromium.launch();
  const rapport: Page[] = [];

  for (const slug of slugs) {
    const c = chords[slug];
    const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await openSheet(page, slug, { key: auditKey(slug, c.printedKey) });
      const { image, labels } = await overlayLabels(page);
      if (!image) throw new Error("pas d'image");

      const horsPage = labels
        .filter((l) => l.left < -2 || l.left + l.width > image.width + 2 || l.top < -2 || l.top + l.height > image.height + 2)
        .map((l) => `${l.printed} → ${l.shown} (+${Math.round(l.left + l.width - image.width)} px sur ${Math.round(image.width)})`);

      // Le cadre « 1=X » compte parmi ce qui peut se recouvrir : un accord
      // publié dessous se dessine par-dessus lui (itération 44).
      const { labels: avecCadre } = await overlayLabels(page, 0, { avecCadre: true });
      const chevauchements: string[] = [];
      for (let i = 0; i < avecCadre.length; i++)
        for (let j = i + 1; j < avecCadre.length; j++)
          if (inter(avecCadre[i], avecCadre[j], 1))
            chevauchements.push(`${avecCadre[i].shown || "∅"} ∩ ${avecCadre[j].shown || "∅"}`);

      const couvert = (await encreCouverte(page)).map(
        (e) => `${e.printed} → ${e.shown} · ${e.encre} px d'encre sur ${e.largeur} px de débord`
      );

      rapport.push({ slug, etiquettes: labels.length, horsPage, chevauchements, couvert });
    } catch (e) {
      rapport.push({ slug, erreur: String(e).split("\n")[0] });
    }
    await ctx.close();
  }
  await browser.close();
  server?.kill();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rapport, null, 1));
    return;
  }
  let sales = 0;
  for (const r of rapport) {
    if (r.erreur) { console.log(`✗ ${r.slug} — ${r.erreur}`); sales++; continue; }
    const pb = [
      ...(r.horsPage ?? []).map((s) => `hors-page      ${s}`),
      ...(r.chevauchements ?? []).map((s) => `chevauchement  ${s}`),
      ...(r.couvert ?? []).map((s) => `encre couverte ${s}`),
    ];
    if (!pb.length) continue;
    sales++;
    console.log(`\n● ${r.slug} (${r.etiquettes} étiquettes)`);
    for (const p of pb) console.log(`    ${p}`);
  }
  console.log(`\n${rapport.length - sales} / ${rapport.length} pages sans défaut mesurable`);
}

main().catch((e) => { console.error(e); process.exit(1); });
