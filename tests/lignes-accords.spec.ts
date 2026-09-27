import { expect, test, type Page } from "@playwright/test";

// Lignes « accords au-dessus des paroles » (ChordLine, chants français).
// Retours de Timothée du 27/09/2026, captures iPhone, tous deux causés par
// dda9a9a (retrait des « - » quand les accords sont masqués) :
//  - un accord de fin de ligne (« pou[A]ssière,[E] ») tombait au niveau des
//    paroles : l'espace posé sous lui n'était plus en `white-space: pre`, il
//    s'effaçait et sa colonne n'avait plus de hauteur ;
//  - texte agrandi, la page glissait à gauche et à droite : un segment
//    n'était plus coupé en mots, tout ce qui suit un accord devenait un bloc
//    insécable, plus large que l'écran (« Tu m'aimes » : 148 px de trop).
// La fonction de dda9a9a est gardée : sans accords, « infi - nie » se lit « infinie ».

/** Accords dont le centre n'est pas au-dessus du haut des paroles de leur rangée. */
function accordsAuNiveauDesParoles(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const boite = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect();
    };
    const out: string[] = [];
    for (const ligne of Array.from(document.querySelectorAll<HTMLElement>("[data-copy-line]"))) {
      // ZhLine : colonnes alignées en haut ; ChordLine : alignées en bas.
      const zh = ligne.classList.contains("items-start");
      const colonnes = Array.from(zh ? ligne.querySelectorAll<HTMLElement>("span[style*='column']") : ligne.children) as HTMLElement[];
      const cases = colonnes.map((c) => {
        const enfants = Array.from(c.children) as HTMLElement[];
        const accord = zh
          ? enfants[0] && getComputedStyle(enfants[0]).visibility === "visible" ? enfants[0] : undefined
          : enfants.find((e) => e.classList.contains("font-chord"));
        const parole = enfants[enfants.length - 1];
        return { c, accord, parole: parole !== accord && (parole?.textContent ?? "").trim() ? parole : undefined };
      });
      const rangees = new Map<number, typeof cases>();
      for (const k of cases) {
        const r = k.c.getBoundingClientRect();
        const cle = Math.round((zh ? r.top : r.bottom) / 6);
        rangees.set(cle, [...(rangees.get(cle) ?? []), k]);
      }
      for (const rangee of rangees.values()) {
        const hautParoles = Math.min(...rangee.filter((k) => k.parole).map((k) => boite(k.parole!).top));
        if (!Number.isFinite(hautParoles)) continue;
        for (const k of rangee) {
          if (!k.accord) continue;
          const b = boite(k.accord);
          const centre = (b.top + b.bottom) / 2;
          if (centre > hautParoles) out.push(`« ${k.accord.textContent} » ${(centre - hautParoles).toFixed(1)} px sous le haut des paroles — ${ligne.textContent?.slice(0, 50)}`);
        }
      }
    }
    return out;
  });
}

async function ouvrir(page: Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await page.locator("[data-copy-line]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

// abba-pere : « pou[A]ssière,[E] » ; grace-infinie : « pl[B/D#]uie,[ ][C#] ».
// Les deux chinois (ZhLine, non touché) servent de témoins.
for (const slug of ["abba-pere", "grace-infinie", "一切歌颂赞美", "一切都更新"]) {
  test(`${slug} — un accord de fin de ligne reste au-dessus des paroles`, async ({ page }) => {
    await ouvrir(page, slug);
    expect(await accordsAuNiveauDesParoles(page)).toEqual([]);
  });
}

// Couleurs par section coupées, comme sur l'iPhone de Timothée : les couplets
// n'ont alors pas de cadre pour rogner ce qui dépasse, et le contenu glisse.
for (const slug of ["tu-m-aimes", "abrite-moi", "abba-pere"]) {
  test(`${slug} — texte agrandi au maximum, rien ne dépasse sur les côtés`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("chart-style", "0"));
    await ouvrir(page, slug);
    const plus = page.getByRole("button", { name: "Agrandir le texte" }).first();
    while (await plus.isEnabled()) await plus.click();
    await page.waitForTimeout(300);
    const mesure = await page.evaluate(() => {
      const doc = document.documentElement;
      const zoom = document.querySelector<HTMLElement>(".song-zoom")!;
      const lignes = Array.from(document.querySelectorAll<HTMLElement>("[data-copy-line]"))
        .filter((l) => l.scrollWidth > l.clientWidth + 1)
        .map((l) => `${l.textContent?.slice(0, 40)} (${l.scrollWidth - l.clientWidth} px)`);
      return { page: doc.scrollWidth - doc.clientWidth, contenu: zoom.scrollWidth - zoom.clientWidth, lignes: lignes.slice(0, 5) };
    });
    expect(mesure).toEqual({ page: 0, contenu: 0, lignes: [] });
  });
}

test("grace-infinie — accords masqués, les syllabes se recollent", async ({ page }) => {
  await ouvrir(page, "grace-infinie");
  await page.locator("[data-testid='barre-outils'] button[aria-label='Accords']").click();
  // textContent et non innerText : innerText sépare chaque colonne flex (« sau vé »).
  const lignes = await page.locator("[data-copy-line]").evaluateAll((ls) => ls.map((l) => (l.textContent ?? "").replace(/\s+/g, " ").trim()));
  expect(lignes).toContain("Grâce infinie qui m'a sauvé,");
  expect(lignes.join("\n")).not.toMatch(/\s-\s/);
});
