import { expect, test, type Page } from "@playwright/test";
import index from "../public/songs-index.json";

// Une ligne chinoise trop longue pour l'écran (téléphone surtout) passe à la
// ligne colonne par colonne (accord, caractère, pinyin). Relevé le 17/09/2026 :
// un accord de fin de ligne descendait seul sous les paroles, une virgule
// ouvrait la rangée suivante, et les accords d'une rangée coupée collaient
// aux pinyin du dessus.

/** 我能给你什么 : le plus d'accords orphelins et de virgules en tête de rangée
 *  sur téléphone ; 大手牵着小手 : l'accord final seul ; 爱的彰显 : rangées serrées.
 *  `PW_CHANTS_ZH=all` passe les 188 chants chinois (long : à lancer sur un seul
 *  appareil, `--project=telephone`). */
const CHANTS = process.env.PW_CHANTS_ZH === "all"
  ? index.songs.filter((s) => s.language === "zh").map((s) => s.slug)
  : ["我能给你什么", "大手牵着小手", "爱的彰显"];

type Mesure = { orphelins: string[]; ponctuations: string[]; ecartDansLigne: number | null; ecartEntreLignes: number | null };

/** Les rangées de chaque ligne chinoise telles que le navigateur les pose. */
function mesurer(page: Page): Promise<Mesure> {
  return page.evaluate(() => {
    // Une parole : caractère chinois, ou lettre latine (« Merry Christmas »).
    const PAROLE = /\p{L}/u;
    const PONCTUATION = /^[，。、；：！？」』）…,.;:!?)]$/; // la liste de ZhLine (SongView.tsx)
    // Boîte du texte lui-même (pas de la boîte CSS, que `line-height` rogne).
    const boiteTexte = (el: Element | undefined) => {
      if (!el?.firstChild) return null;
      const r = document.createRange();
      r.selectNodeContents(el);
      const b = r.getBoundingClientRect();
      return b.height ? b : null;
    };
    const out: Mesure = { orphelins: [], ponctuations: [], ecartDansLigne: null, ecartEntreLignes: null };
    const min = (a: number | null, b: number) => (a === null ? b : Math.min(a, b));
    // Ligne précédente de la même section seulement (chaque ligne a son propre
    // `div`, la section est au-dessus) : d'une section à l'autre, un titre s'intercale.
    let precedente: { section: Element | null | undefined; basPinyin: number } | null = null;

    for (const ligne of Array.from(document.querySelectorAll<HTMLElement>("[data-copy-line].flex-wrap"))) {
      const colonnes = Array.from(ligne.querySelectorAll<HTMLElement>("span[style*='column']")).map((c) => {
        const [accord, caractere, pinyin] = Array.from(c.children) as HTMLElement[];
        return {
          el: c,
          accord: accord && getComputedStyle(accord).visibility === "visible" ? accord : undefined,
          caractere: caractere?.textContent ?? "",
          pinyin,
        };
      });
      const rangees: (typeof colonnes)[] = [];
      let haut = -Infinity;
      for (const c of colonnes) {
        const t = c.el.getBoundingClientRect().top;
        if (Math.abs(t - haut) > 4) { rangees.push([c]); haut = t; } else rangees[rangees.length - 1].push(c);
      }
      const texte = (r: typeof colonnes) => r.map((c) => (c.accord ? `[${c.accord.textContent}]` : "") + c.caractere).join("");
      const hautAccords = (r: typeof colonnes) => Math.min(...r.flatMap((c) => (c.accord ? [boiteTexte(c.accord)?.top ?? Infinity] : [])));
      const basPinyin = (r: typeof colonnes) => Math.max(...r.map((c) => boiteTexte(c.pinyin)?.bottom ?? -Infinity));
      const aDesParoles = colonnes.some((c) => PAROLE.test(c.caractere));

      rangees.forEach((r, i) => {
        if (i > 0 && aDesParoles && !r.some((c) => PAROLE.test(c.caractere)) && r.some((c) => c.accord)) {
          out.orphelins.push(`${texte(rangees[i - 1])} ⏎ ${texte(r)}`);
        }
        if (i > 0 && PONCTUATION.test(r[0].caractere)) out.ponctuations.push(`${texte(rangees[i - 1])} ⏎ ${texte(r)}`);
        const accords = hautAccords(r);
        if (!Number.isFinite(accords)) return;
        if (i > 0) out.ecartDansLigne = min(out.ecartDansLigne, accords - basPinyin(rangees[i - 1]));
        else if (precedente && precedente.section === ligne.parentElement?.parentElement && Number.isFinite(precedente.basPinyin)) {
          out.ecartEntreLignes = min(out.ecartEntreLignes, accords - precedente.basPinyin);
        }
      });
      precedente = rangees.length ? { section: ligne.parentElement?.parentElement, basPinyin: basPinyin(rangees[rangees.length - 1]) } : null;
    }
    return out;
  });
}

async function ouvrir(page: Page, slug: string): Promise<Mesure> {
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await page.locator("[data-copy-line]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return mesurer(page);
}

for (const slug of CHANTS) {
  test(`${slug} — ligne coupée : aucun accord ne reste seul sous les paroles`, async ({ page }) => {
    expect((await ouvrir(page, slug)).orphelins).toEqual([]);
  });

  test(`${slug} — ligne coupée : aucune rangée ne commence par une ponctuation`, async ({ page }) => {
    expect((await ouvrir(page, slug)).ponctuations).toEqual([]);
  });

  test(`${slug} — ligne coupée : les accords gardent l'écart d'une ligne à l'autre`, async ({ page }) => {
    const m = await ouvrir(page, slug);
    test.skip(m.ecartDansLigne === null || m.ecartEntreLignes === null, "aucune ligne coupée à cette largeur");
    expect(m.ecartDansLigne!).toBeGreaterThanOrEqual(m.ecartEntreLignes! - 1);
  });
}
