import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, onStage, type Langue } from "./helpers/louange";

// Lot FS-D (docs/spec-mode-louange-forscore-2.md) : la feuille de route du batteur. Une ligne par section jouée,
// à la hauteur de l'écran ; plus de grands cadres vides. Comptes simulés, noms fictifs, aucune écriture Firestore.

const SETLIST_ID = "setlist-feuille-route";
const MARGAUX: FakeProfile = {
  uid: "uid-margaux",
  email: "margaux-delorme@example.com",
  firstName: "Margaux",
  lastName: "Delorme",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (songSlug: string, structureOverride: string[] | null) => ({
  songSlug, position: 1, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride, sectionNotes: {}, notes: "",
});
const setlist = (slug: string, structure: string[] | null) => ({
  title: "Culte d'essai de la feuille de route",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-09",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item(slug, structure)],
});

// Passages de Abba Père (uids lus dans louange-sections-uniques.spec.ts) : deux refrains identiques se replient en ×2.
const REPLI = ["verse-2-0", "chorus-3-1", "chorus-3-2"];
const CINQ = ["intro-1-0", "verse-2-1", "chorus-3-2", "bridge-6-6", "verse-5-4"];
const NEUF = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"];
// Chant chinois à sept sections distinctes (ordre du fichier) : « cinq » sans structure imposée ; « long » rejoue les refrains et les ponts.
const NEUF_ZH = ["intro-1-0", "verse-2-1", "chorus-4-3", "verse-3-2", "chorus-5-4", "bridge-6-5", "chorus-4-3", "bridge-7-6", "chorus-5-4"];
const LANGUES: { langue: Langue; repli: [string, string[] | null]; cinq: [string, string[] | null, number]; long: [string, string[] | null, number, string] }[] = [
  { langue: "fr", repli: ["abba-pere", REPLI], cinq: ["abba-pere", CINQ, 5], long: ["abba-pere", NEUF, 8, "1.5"] },
  { langue: "zh", repli: ["一生爱你", REPLI], cinq: ["耶稣的名", null, 6], long: ["我在这里敬拜", NEUF_ZH, 9, "1.5"] },
];

async function ouvrir(page: Page, slug: string, structure: string[] | null, opts: { langue: Langue; theme?: "light" | "dark"; echelle?: string; disposition?: "classique" | "sections" }) {
  const { langue, theme = "light", echelle, disposition = "classique" } = opts;
  await page.addInitScript(([zh, th, ech, disp]) => {
    try {
      localStorage.setItem("disposition", disp as string);
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        localStorage.setItem("perf-role-preset", "batteur");
        if (ech) localStorage.setItem("perf-font-scale", ech as string);
      }
    } catch { /* ignore */ }
  }, [langue === "zh", theme, echelle ?? "", disposition] as const);
  await signInAs(page, MARGAUX, { [`setlists/${SETLIST_ID}`]: setlist(slug, structure) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await expect(onStage(page, "[data-feuille-route-ligne]").first()).toBeVisible();
}

const boites = (page: Page) =>
  onStage(page, "[data-feuille-route-ligne]").evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, texte: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim() }; }),
  );

/** Zone libre de la page : du bas de l'en-tête du chant (à défaut, de la barre du haut) au haut de la rangée de points
 *  (à défaut, de la barre du bas). */
async function zoneLibre(page: Page) {
  return page.evaluate(() => {
    const racine = document.querySelector("[data-performance-mode]")!;
    const visible = (sel: string) => [...racine.querySelectorAll(sel)].find((e) => !e.closest("[aria-hidden=true]")) as HTMLElement | undefined;
    const entete = visible("[data-entete-chant]");
    const haut = (entete ?? racine.querySelector("[data-barre-haut]"))!.getBoundingClientRect().bottom;
    const bas = (visible("[data-curseur-page]") ?? racine.querySelector("[data-barre-bas]"))!.getBoundingClientRect().top;
    return { haut, bas };
  });
}

/** Hauteur naturelle de la ligne i de la page : son repère (h-14) plus son padding vertical, filet compris. */
const hauteurNaturelle = (page: Page, i: number) =>
  onStage(page, "[data-feuille-route-ligne]").nth(i).evaluate((e) => {
    const c = getComputedStyle(e);
    const repere = e.querySelector("[data-feuille-route-repere]")!.getBoundingClientRect().height;
    const nom = e.querySelector("[data-feuille-route-nom]")!.getBoundingClientRect().height;
    return Math.max(repere, nom) + parseFloat(c.paddingTop) + parseFloat(c.paddingBottom) + parseFloat(c.borderTopWidth);
  });

test.describe("feuille de route du batteur (FS-D)", () => {
  for (const { langue, repli, cinq, long } of LANGUES) {
    test(`une ligne par section jouée, repli ×2, sans paroles ni accords, nom en grand (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, repli[0], repli[1], { langue });
      const lignes = await boites(page);
      expect(lignes, "couplet + refrain ×2").toHaveLength(2);
      expect(lignes[1].texte).toMatch(/×2/);
      expect(lignes[0].texte).not.toMatch(/×/);
      await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);
      await expect(onStage(page, "[data-chord]")).toHaveCount(0);
      const corps = await onStage(page, "[data-feuille-route-nom]").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
      for (const c of corps) expect(c, "nom en 28 px").toBeGreaterThanOrEqual(26);
      // Pas de cadre : ni carte arrondie autour d'une ligne, un filet entre deux lignes seulement.
      const bords = await onStage(page, "[data-feuille-route-ligne]").evaluateAll((els) => els.map((e) => { const c = getComputedStyle(e); return [c.borderTopWidth, c.borderLeftWidth, c.borderRadius]; }));
      for (const [i, [haut, gauche, rayon]] of bords.entries()) {
        if (i > 0) expect(parseFloat(haut), "filet entre deux lignes").toBeGreaterThan(0);
        expect(parseFloat(gauche)).toBe(0);
        expect(parseFloat(rayon)).toBe(0);
      }
    });

    test(`sections du chant : empilées sans chevauchement, dans l'écran, elles remplissent la hauteur libre (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, cinq[0], cinq[1], { langue });
      const lignes = await boites(page);
      expect(lignes).toHaveLength(cinq[2]);
      for (let i = 1; i < lignes.length; i++) expect(lignes[i].top, `ligne ${i + 1} sous la précédente`).toBeGreaterThanOrEqual(lignes[i - 1].bottom - 0.5);
      const largeur = page.viewportSize()!.width;
      for (const l of lignes) expect(l.right, "rien ne déborde à droite").toBeLessThanOrEqual(largeur + 0.5);
      const { haut, bas } = await zoneLibre(page);
      expect(lignes[0].top, "la première ligne suit l'en-tête").toBeGreaterThanOrEqual(haut - 0.5);
      const dernier = lignes[lignes.length - 1].bottom;
      expect(dernier, "la dernière ligne reste au-dessus de la rangée de points").toBeLessThanOrEqual(bas + 0.5);
      // Les lignes s'étirent jusqu'à la place gardée sous elles à la pastille « Suivant » (NEXT_PILL_RESERVE, 40 px)
      // et au padding bas de la zone de lecture : le reste est le remplissage de la page, sans autre marge.
      const rempli = await onStage(page, "[data-feuille-route-ligne]").last().evaluate((e) => {
        let padding = 0;
        for (let n = e.parentElement; n && !n.hasAttribute("data-performance-mode"); n = n.parentElement) padding += parseFloat(getComputedStyle(n).paddingBottom);
        return padding;
      });
      expect(bas - dernier, "les lignes remplissent la hauteur libre, à la pastille près").toBeLessThanOrEqual(40 + rempli + 0.5);
      for (const [i, l] of lignes.entries()) expect(l.bottom - l.top, `ligne ${i + 1} : au plus 3 fois sa hauteur naturelle`).toBeLessThanOrEqual(3 * (await hauteurNaturelle(page, i)) + 0.5);
    });

    test(`peu de sections sur un grand écran : les lignes restent en haut, au plus 3 fois leur hauteur naturelle (${langue.toUpperCase()})`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 1400 });
      await ouvrir(page, repli[0], repli[1], { langue });
      const lignes = await boites(page);
      expect(lignes).toHaveLength(2);
      const { haut, bas } = await zoneLibre(page);
      for (const [i, l] of lignes.entries()) expect(l.bottom - l.top, `ligne ${i + 1} : au plus 3 fois sa hauteur naturelle`).toBeLessThanOrEqual(3 * (await hauteurNaturelle(page, i)) + 0.5);
      const dernier = lignes[lignes.length - 1].bottom;
      expect(lignes[0].top, "en haut de la page").toBeLessThanOrEqual(haut + 40);
      expect(dernier - haut, "les lignes ne remplissent pas la page").toBeLessThan((bas - haut) / 2);
    });

    test(`un chant long passe sur au moins deux pages sans couper une ligne (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, long[0], long[1], { langue, echelle: long[3] });
      const hauteur = page.viewportSize()!.height;
      const total = Number((await lireCompteur(page)).split(" / ")[1]);
      expect(total, "au moins deux pages").toBeGreaterThanOrEqual(2);
      const vues: string[] = [];
      for (let p = 0; p < total; p++) {
        await expect.poll(() => lireCompteur(page)).toBe(`${p + 1} / ${total}`);
        const lignes = await boites(page);
        expect(lignes.length, `page ${p + 1} : des lignes`).toBeGreaterThan(0);
        for (const l of lignes) {
          expect(l.top, `page ${p + 1} : ligne entière en haut`).toBeGreaterThanOrEqual(-0.5);
          expect(l.bottom, `page ${p + 1} : ligne entière en bas`).toBeLessThanOrEqual(hauteur + 0.5);
        }
        // L'en-tête du chant n'est que sur la page 1.
        await expect(onStage(page, "[data-entete-chant]")).toHaveCount(p === 0 ? 1 : 0);
        vues.push(...lignes.map((l) => l.texte));
        if (p < total - 1) await page.keyboard.press("ArrowRight");
      }
      expect(vues.length, "toutes les sections jouées se retrouvent sur les pages, une fois chacune").toBe(long[2]);
    });

    test(`pas de filet au-dessus de la première ligne d'une page, ni sous la dernière (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrir(page, cinq[0], cinq[1], { langue });
      const filets = await onStage(page, "[data-feuille-route-ligne]").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).borderTopWidth)));
      expect(filets[0], "rien au-dessus de la première ligne : l'en-tête a déjà son filet").toBe(0);
      for (const f of filets.slice(1)) expect(f, "un filet entre deux lignes").toBeGreaterThan(0);
      const bas = await onStage(page, "[data-feuille-route-ligne]").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).borderBottomWidth)));
      for (const f of bas) expect(f, "jamais de filet sous une ligne").toBe(0);
    });

    for (const [disposition, quoi] of [["classique", "couleur de la langue (accent de SectionView)"], ["sections", "couleur du type de section"]] as const) {
      test(`couleur du repère : ${quoi} (${langue.toUpperCase()}, ${disposition})`, async ({ page }) => {
        await ouvrir(page, repli[0], repli[1], { langue, disposition });
        // Couleur résolue d'une variable CSS, lue sur un élément témoin.
        const resolue = (v: string) => page.evaluate((c) => {
          const el = document.createElement("i");
          el.style.borderTop = `2px solid ${c}`;
          document.body.append(el);
          const r = getComputedStyle(el).borderTopColor;
          el.remove();
          return r;
        }, v);
        const reperes = await onStage(page, "[data-feuille-route-repere]").evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopColor));
        expect(reperes).toHaveLength(2);
        // Couplet puis refrain.
        const attendues = disposition === "classique"
          ? [await resolue(`var(--${langue}-accent)`), await resolue(`var(--${langue}-accent)`)]
          : [await resolue("var(--sec-verse)"), await resolue("var(--sec-chorus)")];
        expect(reperes).toEqual(attendues);
        if (disposition === "sections") expect(reperes[0], "couplet et refrain se distinguent").not.toBe(reperes[1]);
      });
    }

    for (const theme of ["light", "dark"] as const) {
      test(`captures ${theme === "light" ? "clair" : "sombre"} (${langue.toUpperCase()})`, async ({ page }, info) => {
        await ouvrir(page, cinq[0], cinq[1], { langue, theme });
        await page.screenshot({ path: `test-results/fs-d/${langue === "zh" ? "zh" : "fr"}-${theme}-${info.project.name}.png` });
      });
    }
  }
});
