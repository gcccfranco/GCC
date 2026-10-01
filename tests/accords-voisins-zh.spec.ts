import { expect, test, type Page } from "@playwright/test";

// Sur une ligne chinoise, deux accords posés sur deux caractères voisins
// doivent se lire comme deux mots. Relevé le 26/09/2026 sur 向主欢呼 :
// « 的[Am7/E]大[Dsus4]爱[D7] » s'affichait « Am7/EDsus4 », et « 赞美[G/D]你[Em] »
// « G/DEm ». Mesuré dans Chromium : les étiquettes ne se recouvrent pas, elles
// se touchent (0 px, ou 2 px) — la colonne s'élargit bien à l'accord (ZhLine,
// SongView.tsx), mais l'étiquette n'a aucune marge, contrairement à celle du
// français (ChordLine, `paddingRight: 0.5em`).

/** Écart minimal entre les textes de deux accords voisins : à 2 px, « G/D Em »
 *  se lit encore « G/DEm » sur la capture téléphone du 26/09/2026. */
const ECART_MIN_PX = 4;

/** Les accords visibles de chaque rangée posée par le navigateur, de gauche à
 *  droite ; renvoie chaque paire dont les boîtes de texte sont à moins de
 *  `ECART_MIN_PX` l'une de l'autre (négatif : elles se recouvrent). */
function tropProches(page: Page, ecartMin: number): Promise<string[]> {
  return page.evaluate((ecartMin) => {
    // Boîte du texte lui-même (pas de la boîte CSS, que `line-height` rogne).
    const boiteTexte = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect();
    };
    const out: string[] = [];
    for (const ligne of Array.from(document.querySelectorAll<HTMLElement>("[data-copy-line].flex-wrap"))) {
      const colonnes = Array.from(ligne.querySelectorAll<HTMLElement>("span[style*='column']")).map((c) => {
        const accord = c.children[0] as HTMLElement | undefined;
        return { el: c, accord: accord && getComputedStyle(accord).visibility === "visible" ? accord : undefined };
      });
      const rangees: (typeof colonnes)[] = [];
      let haut = -Infinity;
      for (const c of colonnes) {
        const t = c.el.getBoundingClientRect().top;
        if (Math.abs(t - haut) > 4) { rangees.push([c]); haut = t; } else rangees[rangees.length - 1].push(c);
      }
      for (const r of rangees) {
        const accords = r.flatMap((c) => (c.accord ? [{ nom: c.accord.textContent ?? "", boite: boiteTexte(c.accord) }] : []));
        for (let i = 1; i < accords.length; i++) {
          const a = accords[i - 1], b = accords[i];
          const ecart = b.boite.left - a.boite.right;
          if (ecart < ecartMin) out.push(`« ${a.nom} » et « ${b.nom} » : ${ecart.toFixed(1)} px d'écart`);
        }
      }
    }
    return out;
  }, ecartMin);
}

async function ouvrir(page: Page, slug: string): Promise<string[]> {
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await page.locator("[data-copy-line]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return tropProches(page, ECART_MIN_PX);
}

// 向主欢呼 : accords longs (Am7/E, Dsus4, G/D, Cmaj7) sur des caractères voisins.
test("向主欢呼 — deux accords voisins ne se touchent pas", async ({ page }) => {
  expect(await ouvrir(page, "向主欢呼")).toEqual([]);
});
