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

const item = (songSlug: string, structureOverride: string[] | null, extras: Record<string, unknown> = {}) => ({
  songSlug, position: 1, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride, sectionNotes: {}, notes: "", ...extras,
});
const setlist = (slug: string, structure: string[] | null, extras: Record<string, unknown> = {}) => ({
  title: "Culte d'essai de la feuille de route",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-09",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item(slug, structure, extras)],
});

// Passages de Abba Père (uids lus dans louange-sections-uniques.spec.ts) : deux refrains identiques se replient en ×2.
const REPLI = ["verse-2-0", "chorus-3-1", "chorus-3-2"];
const CINQ = ["intro-1-0", "verse-2-1", "chorus-3-2", "bridge-6-6", "verse-5-4"];
const NEUF = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"];
// Chant chinois à sept sections distinctes (ordre du fichier) : « cinq » sans structure imposée ; « long » rejoue les refrains et les ponts.
const NEUF_ZH = ["intro-1-0", "verse-2-1", "chorus-4-3", "verse-3-2", "chorus-5-4", "bridge-6-5", "chorus-4-3", "bridge-7-6", "chorus-5-4"];
// Chant « riche » des captures : notes de section, nuance avec note, repli ×2, changement de tonalité, transitions.
// Cinq lignes : intro, couplet (note), refrain ×2, pont (nuance, transition), couplet (升调).
const RICHE: Record<Langue, { slug: string; structure: string[]; extras: Record<string, unknown>; tonalite: RegExp; tempo: string | null }> = {
  fr: {
    slug: "abba-pere",
    structure: ["intro-1-0", "verse-2-1", "chorus-3-1", "chorus-3-2", "bridge-6-5", "verse-5-4"],
    extras: {
      sectionNotes: { "verse-2-1": "baguettes, très doux" },
      sectionNuances: { "bridge-6-5": { tags: ["f", "cresc"], note: "tout le groupe" } },
      sectionKeys: { "verse-5-4": "B" },
      sectionTransitions: { "intro-1-0": "enchaîner sans pause", "bridge-6-5": "arrêt net, puis reprise" },
    },
    tonalite: /^Tonalité A$/,
    tempo: null,
  },
  zh: {
    slug: "我在这里敬拜",
    structure: ["intro-1-0", "verse-2-1", "chorus-4-3", "chorus-4-3", "bridge-6-5", "verse-3-2"],
    extras: {
      sectionNotes: { "verse-2-1": "轻柔，鼓刷" },
      sectionNuances: { "bridge-6-5": { tags: ["f", "cresc"], note: "全体加入" } },
      sectionKeys: { "verse-3-2": "E" },
      sectionTransitions: { "intro-1-0": "直接进入", "bridge-6-5": "停一拍再进" },
    },
    tonalite: /^调 D$/,
    tempo: "♩ = 76",
  },
};

const LANGUES: { langue: Langue; repli: [string, string[] | null]; cinq: [string, string[] | null, number]; long: [string, string[] | null, number, string] }[] = [
  { langue: "fr", repli: ["abba-pere", REPLI], cinq: ["abba-pere", CINQ, 5], long: ["abba-pere", NEUF, 8, "1.5"] },
  { langue: "zh", repli: ["一生爱你", REPLI], cinq: ["耶稣的名", null, 6], long: ["我在这里敬拜", NEUF_ZH, 9, "1.5"] },
];

async function ouvrir(page: Page, slug: string, structure: string[] | null, opts: { langue: Langue; theme?: "light" | "dark"; echelle?: string; disposition?: "classique" | "sections"; extras?: Record<string, unknown> }) {
  const { langue, theme = "light", echelle, disposition = "classique", extras = {} } = opts;
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
  await signInAs(page, MARGAUX, { [`setlists/${SETLIST_ID}`]: setlist(slug, structure, extras) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await expect(onStage(page, "[data-feuille-route-ligne]").first()).toBeVisible();
}

const boites = (page: Page) =>
  onStage(page, "[data-feuille-route-ligne]").evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, texte: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim() }; }),
  );

/** Referme la barre (toucher au centre) et attend la fin du fondu : sans quoi la capture saisit la barre à demi effacée. */
async function fermerLaBarre(page: Page) {
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width / 2, ecran.height / 2);
  await expect(page.locator("[data-barre-ouverte]")).toHaveCount(0);
  await expect(page.locator("[data-barre-haut]").locator("xpath=..")).toHaveCSS("opacity", "0");
}

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

/** Somme des hauteurs naturelles (échelle 1, ni étirées ni agrandies) des lignes d'un chant sur une seule page : celles de la
 *  copie de mesure invisible. */
const hauteurNaturelle = (page: Page) =>
  page.locator("[data-performance-mode] [aria-hidden=true] [data-feuille-route-ligne]").evaluateAll((els) => els.reduce((somme, e) => somme + e.getBoundingClientRect().height, 0));

const ouvrirRiche = (page: Page, langue: Langue, theme: "light" | "dark" = "light") => {
  const r = RICHE[langue];
  return ouvrir(page, r.slug, r.structure, { langue, theme, extras: r.extras });
};

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
      const total = lignes.reduce((n, l) => n + l.bottom - l.top, 0);
      expect(total, "au plus 3 fois la hauteur naturelle des lignes").toBeLessThanOrEqual(3 * (await hauteurNaturelle(page)) + 0.5);
      const noms = await onStage(page, "[data-feuille-route-nom]").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
      for (const c of noms) expect(c, "la page a de la place : le nom est au moins à 28 px").toBeGreaterThanOrEqual(28);
    });

    test(`peu de sections sur un grand écran : les lignes restent en haut, au plus 3 fois leur hauteur naturelle (${langue.toUpperCase()})`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 1400 });
      await ouvrir(page, repli[0], repli[1], { langue });
      const lignes = await boites(page);
      expect(lignes).toHaveLength(2);
      const { haut, bas } = await zoneLibre(page);
      const total = lignes.reduce((n, l) => n + l.bottom - l.top, 0);
      expect(total, "au plus 3 fois la hauteur naturelle des lignes").toBeLessThanOrEqual(3 * (await hauteurNaturelle(page)) + 0.5);
      expect(total, "étirées quand même : plus que leur hauteur naturelle").toBeGreaterThan(1.5 * (await hauteurNaturelle(page)));
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

    for (const [disposition, quoi] of [["classique", "couleur de la sorte de section"], ["sections", "couleur de la sorte de section"]] as const) {
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
        expect(reperes).toEqual([await resolue("var(--sec-verse)"), await resolue("var(--sec-chorus)")]);
        expect(reperes[0], "couplet et refrain se distinguent").not.toBe(reperes[1]);
      });
    }

    test(`chant riche : repli, note, nuance, tonalité, transition dans sa ligne, tempo et tonalité en tête (${langue.toUpperCase()})`, async ({ page }) => {
      const riche = RICHE[langue];
      await ouvrirRiche(page, langue);
      const lignes = await boites(page);
      expect(lignes, "intro, couplet, refrain ×2, pont, couplet").toHaveLength(5);
      expect(lignes[2].texte).toMatch(/×2/);
      expect(lignes[1].texte).toContain(langue === "fr" ? "baguettes, très doux" : "轻柔，鼓刷");
      expect(lignes[4].texte, "changement de tonalité").toMatch(langue === "fr" ? /[(（]B[)）]/ : /[(（]E[)）]/);
      // La transition est dans la ligne de sa section, sous le nom et la note, flèche en tête, 18 px.
      const trans = await onStage(page, "[data-feuille-route-transition]").evaluateAll((els) =>
        els.map((e) => {
          const ligne = e.closest("[data-feuille-route-ligne]");
          const nom = ligne?.querySelector("[data-feuille-route-nom]")?.getBoundingClientRect();
          const l = ligne?.getBoundingClientRect();
          const r = e.getBoundingClientRect();
          return {
            dansUneLigne: !!ligne, texte: (e.textContent ?? "").trim(), taille: parseFloat(getComputedStyle(e).fontSize),
            sousLeNom: !!nom && r.top >= nom.bottom - 0.5, dedans: !!l && r.top >= l.top - 0.5 && r.bottom <= l.bottom + 0.5,
            index: ligne ? [...ligne.parentElement!.children].indexOf(ligne) : -1,
          };
        }),
      );
      expect(trans.map((x) => x.index), "sur la ligne de l'intro et sur celle du pont").toEqual([0, 3]);
      for (const x of trans) {
        expect(x.dansUneLigne && x.dedans && x.sousLeNom, `transition « ${x.texte} » dans sa ligne, sous le nom`).toBe(true);
        expect(x.texte).toMatch(/^→ /);
        expect(x.taille).toBeGreaterThanOrEqual(18);
      }
      // Les blocs transition ne rendent plus de ligne sœur : seules les lignes sont des enfants de la colonne.
      await expect(onStage(page, "[data-feuille-route-ligne] ~ :not([data-feuille-route-ligne])")).toHaveCount(0);
      // Repère : carré de l'échelle 64 px au moins, lettre à l'encre, sans fond, bordure de 2,5 px.
      const reperes = await onStage(page, "[data-feuille-route-repere]").evaluateAll((els) =>
        els.map((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { fond: c.backgroundColor, bord: c.borderTopWidth, h: r.height, w: r.width, couleur: c.color }; }),
      );
      const encre = await onStage(page, "[data-feuille-route-nom]").first().evaluate((e) => getComputedStyle(e).color);
      for (const r of reperes) {
        expect(r.fond, "repère sans fond").toBe("rgba(0, 0, 0, 0)");
        expect(parseFloat(r.bord), "bordure de 2,5 px (arrondie au pixel de l'appareil)").toBeGreaterThanOrEqual(2);
        expect(r.h, "repère d'au moins 64 px").toBeGreaterThanOrEqual(63.5);
        expect(r.couleur, "lettre à l'encre").toBe(encre);
      }
      // Pastille de nuance : 22 px gras au moins ; sa note, 18 px au moins ; juste après le nom (pas collée au bord droit).
      const nuance = await onStage(page, "[data-feuille-route-nuance]").evaluate((e) => {
        const tag = e.querySelector("[data-nuance]")!;
        const note = e.querySelector("span > span:not([data-nuance])")!;
        const colonne = e.previousElementSibling!.getBoundingClientRect();
        const r = e.getBoundingClientRect();
        return { tag: parseFloat(getComputedStyle(tag).fontSize), poids: Number(getComputedStyle(tag).fontWeight), note: parseFloat(getComputedStyle(note).fontSize), ecart: r.left - colonne.right, largeurNom: colonne.width };
      });
      expect(nuance.tag).toBeGreaterThanOrEqual(22);
      expect(nuance.poids).toBeGreaterThanOrEqual(700);
      expect(nuance.note).toBeGreaterThanOrEqual(18);
      // Colonne du nom de 22 rem au plus, pastille juste après (un écart de gouttière), pas rejetée au bord droit.
      expect(nuance.largeurNom, "colonne du nom fixe").toBeLessThanOrEqual(22 * 16 + 0.5);
      expect(nuance.ecart, "la pastille suit le nom").toBeLessThanOrEqual(30);
      // Tempo et tonalité en grand en tête, sans titre ; l'en-tête a toujours un contenu visible.
      const tete = onStage(page, "[data-entete-tempo-tonalite]");
      await expect(tete).toBeVisible();
      const texte = ((await tete.innerText()) ?? "").replace(/\s+/g, " ").trim();
      if (riche.tempo) expect(texte.startsWith(`${riche.tempo} · `)).toBe(true);
      expect(texte.split(" · ").pop()!).toMatch(riche.tonalite);
      if (!riche.tempo) expect(texte, "tempo absent : la tonalité seule").not.toContain("♩");
      expect(await tete.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(22);
      expect(await tete.evaluate((e) => Number(getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(700);
      // Barre ouverte (l'état à l'ouverture) : l'en-tête garde son contenu (pas d'invisible, pas de bande vide).
      await expect(page.locator("[data-barre-ouverte]")).toHaveCount(1);
      expect(await tete.evaluate((e) => getComputedStyle(e.closest("[data-entete-chant]")!).visibility)).toBe("visible");
      expect(await tete.evaluate((e) => Number(getComputedStyle(e.closest("[data-entete-chant]")!).opacity))).toBe(1);
      // Barre refermée : même en-tête.
      await fermerLaBarre(page);
      await expect(tete).toBeVisible();
      // Rien ne passe sous la rangée de points (ou la barre du bas).
      const { bas } = await zoneLibre(page);
      const apres = await boites(page);
      expect(apres[apres.length - 1].bottom, "aucune ligne sous la rangée de points").toBeLessThanOrEqual(bas + 0.5);
    });

    test(`à 1 440 px la feuille fait au plus 880 px de large, centrée (${langue.toUpperCase()})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await ouvrirRiche(page, langue);
      const lignes = await boites(page);
      expect(lignes).toHaveLength(5);
      for (const l of lignes) {
        expect(l.right - l.left, "ligne ≤ 880 px").toBeLessThanOrEqual(880.5);
        expect((l.left + l.right) / 2, "centrée").toBeCloseTo(720, 0);
      }
      const { bas } = await zoneLibre(page);
      expect(lignes[lignes.length - 1].bottom, "aucune ligne sous la rangée de points").toBeLessThanOrEqual(bas + 0.5);
    });

    for (const theme of ["light", "dark"] as const) {
      test(`captures ${theme === "light" ? "clair" : "sombre"} (${langue.toUpperCase()})`, async ({ page }, info) => {
        await ouvrirRiche(page, langue, theme);
        await page.screenshot({ path: `test-results/fs-d/${langue === "zh" ? "zh" : "fr"}-${theme}-${info.project.name}.png` });
      });
    }

    test(`barre fermée : le titre du chant est visible en tête de feuille, au-dessus du tempo et de la tonalité (${langue.toUpperCase()})`, async ({ page }) => {
      await ouvrirRiche(page, langue);
      await fermerLaBarre(page);
      const titre = onStage(page, "[data-entete-titre]");
      await expect(titre).toBeVisible();
      await expect(titre).toContainText(langue === "zh" ? "我在这里敬拜" : /abba/i);
      const t = (await titre.boundingBox())!;
      const tt = (await onStage(page, "[data-entete-tempo-tonalite]").boundingBox())!;
      expect(t.y + t.height, "titre au-dessus du tempo et de la tonalité").toBeLessThanOrEqual(tt.y + 0.5);
    });

    for (const theme of ["light", "dark"] as const) {
      test(`captures FS-corr : feuille de route barre fermée, titre visible (${langue.toUpperCase()}, ${theme})`, async ({ page }, info) => {
        await ouvrirRiche(page, langue, theme);
        await fermerLaBarre(page);
        await expect(onStage(page, "[data-entete-titre]")).toBeVisible();
        await page.screenshot({ path: `test-results/fs-corr/${langue}-${theme}-barre-fermee-${info.project.name}.png` });
      });
    }

    test(`capture barre refermée (${langue.toUpperCase()})`, async ({ page }, info) => {
      await ouvrirRiche(page, langue);
      await fermerLaBarre(page);
      await page.screenshot({ path: `test-results/fs-d/${langue}-barre-fermee-${info.project.name}.png` });
    });

    for (const largeur of [375, 390]) {
      test(`à ${largeur} px, rien dans une ligne (pastille de nuance comprise) ne dépasse le bord droit du filet (${langue.toUpperCase()})`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 800 });
        await ouvrirRiche(page, langue);
        const exces = await onStage(page, "[data-feuille-route-ligne]").evaluateAll((lignes) =>
          lignes.flatMap((l) => {
            const bord = l.getBoundingClientRect().right;
            return [...l.querySelectorAll("*")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.right > bord + 0.5).map((r) => r.right - bord);
          }),
        );
        expect(exces, "aucun élément au-delà du bord droit").toEqual([]);
        // La nuance passe sous le nom, dans la largeur du contenu (à droite du repère).
        const place = await onStage(page, "[data-feuille-route-nuance]").evaluate((e) => {
          const ligne = e.closest("[data-feuille-route-ligne]")!;
          const nom = ligne.querySelector("[data-feuille-route-nom]")!.getBoundingClientRect();
          const repere = ligne.querySelector("[data-feuille-route-repere]")!.getBoundingClientRect();
          const r = e.getBoundingClientRect();
          return { sous: r.top >= nom.bottom - 0.5, gauche: r.left - repere.right };
        });
        expect(place.sous, "nuance sous le nom").toBe(true);
        expect(place.gauche, "dans la largeur du contenu, à droite du repère").toBeGreaterThanOrEqual(0);
      });
    }

    test(`« Modulation (B) » ne se coupe jamais à l'intérieur (${langue.toUpperCase()})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await ouvrirRiche(page, langue);
      const mod = onStage(page, "[data-feuille-route-nom] > span").last();
      expect(await mod.evaluate((e) => getComputedStyle(e).whiteSpace)).toBe("nowrap");
      expect(await mod.evaluate((e) => e.getClientRects().length), "un seul fragment : jamais coupé").toBe(1);
    });
  }
});

// FS-D, annotations : la vue Structure a sa propre marque de clé (« f2 ») ; des traits posés sous l'ancienne clé
// (avant la feuille de route) ne s'y chargent plus, le bandeau le dit, rien n'est supprimé.
test("traits posés sous l'ancienne clé de la vue Structure : bandeau « ancienne mise en page », aucune écriture", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        localStorage.setItem("perf-role-preset", "batteur");
      }
    } catch { /* ignore */ }
  });
  const db = await signInAs(page, MARGAUX, { [`setlists/${SETLIST_ID}`]: setlist("abba-pere", CINQ) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "[data-feuille-route-ligne]").first()).toBeVisible();
  const cle = (await page.locator("[data-performance-mode]").getAttribute("data-cle-page"))!;
  expect(cle, "la clé de la vue Structure porte « f2 »").toMatch(/f2$/);
  await expect(page.locator("[data-alerte-composition]"), "rien sous l'ancienne clé : pas de bandeau").toHaveCount(0);
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const trait = JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, h * 0.5], [w * 0.5, h * 0.5]] }] });
  db.set(`annotations/${MARGAUX.uid}__${SETLIST_ID}__${cle.replace(/f2$/, "")}`, { strokes: trait, updatedAt: new Date() });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  const bandeau = page.locator("[data-alerte-composition]");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toHaveText("Des annotations existent avec l'ancienne mise en page");
  await expect(page.locator("[data-performance-mode] > canvas"), "les anciens traits ne s'affichent pas").toHaveCount(0);
  expect(db.writes.filter((x) => x.path.startsWith("annotations/")), "aucune écriture").toEqual([]);
});
