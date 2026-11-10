import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, lireCompteur, onStage, ouvrirOptions } from "./helpers/louange";

// Lot CV, CV-3 (docs/spec-mode-louange-forscore-2.md, « Mesure » et « Annotations et coupure ») : le mode louange mesure
// et affiche avec le même calcul de coupure ; une page dont une ligne est coupée porte « v2 » dans sa clé ; des traits
// posés sous l'ancienne composition sont signalés par un bandeau, jamais supprimés. Noms fictifs seulement.

const SETLIST_ID = "setlist-coupure";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicienne-coupure",
  email: "musicienne.coupure@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Partial<SetlistItem> & { songSlug: string }): SetlistItem => ({
  position: 1,
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});
const FR = item({ songSlug: "a-jamais-tu-es-saint", keyOverride: "A" });
const ZH = item({ songSlug: "一生爱你" });
const CHANTS = [["À jamais Tu es saint", FR], ["一生爱你", ZH]] as const;
const AFFICHAGES = [["played", "Ordre joué"], ["unique", "Sections uniques"]] as const;

const totalPages = async (page: Page) => Number((await lireCompteur(page)).split("/")[1]);

async function ouvrirMode(page: Page, items: SetlistItem[], opts: { affichage?: string; echelle?: string; sombre?: boolean; langue?: string; disposition?: string; seed?: (db: FakeDb) => void } = {}): Promise<FakeDb> {
  await page.emulateMedia({ colorScheme: opts.sombre ? "dark" : "light" });
  await page.addInitScript((o) => {
    try {
      localStorage.setItem("perf-role-preset", "pianiste");
      // La taille de départ n'est posée qu'une fois par onglet : un rechargement garde celle qu'un test a changée.
      if (!sessionStorage.getItem("pw-echelle-posee")) {
        localStorage.setItem("perf-font-scale", o.echelle);
        sessionStorage.setItem("pw-echelle-posee", "1");
      }
      localStorage.setItem("jianpu-sheet-pref", "never"); // les paroles, pas le scan 简谱
      localStorage.setItem("accords-aide-vue", "1"); // pas de bulle d'aide sur les captures
      localStorage.setItem("theme", o.sombre ? "dark" : "light");
      if (o.affichage === "unique") localStorage.setItem("partition-layout", "unique");
      if (o.langue) localStorage.setItem("i18nextLng", o.langue);
      if (o.disposition) localStorage.setItem("disposition", o.disposition);
    } catch {}
  }, { affichage: opts.affichage ?? "played", echelle: opts.echelle ?? "1", sombre: !!opts.sombre, langue: opts.langue ?? "", disposition: opts.disposition ?? "" });
  const db = await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: {
        title: "Culte du 8 novembre",
        leader: "Présidence",
        category: "Culte Francophone",
        date: "2026-11-08",
        language: "mixed",
        notes: "",
        ownerId: "uid-owner",
        isPrivate: false,
        items,
      },
    },
    `/setlists/${SETLIST_ID}`,
  );
  opts.seed?.(db);
  await lancer(page);
  return db;
}

async function lancer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  await expect(page.getByText(/Mise en page…|排版中/)).toHaveCount(0, { timeout: 20_000 });
}

const cleDePage = (page: Page) => page.locator("[data-performance-mode]").getAttribute("data-cle-page");

/** Retour à la première page (la flèche gauche s'arrête au bord). */
const premierePage = (page: Page) =>
  expect(async () => {
    await page.keyboard.press("ArrowLeft");
    await attendreCompteur(page, /^1 \//, 400);
  }).toPass({ timeout: 15_000 });

/** Les états de coupure des lignes de la page affichée à l'écran. */
const etatsDePage = (page: Page) => onStage(page, "[data-coupe]").evaluateAll((ns) => ns.map((n) => n.getAttribute("data-coupe") ?? "une"));

/** Ouvre le mode louange et cherche une page portant une ligne coupée. Le texte est d'abord agrandi au maximum (A+ :
 *  1,5) ; sur un grand écran, le chant seul ne coupe rien (la mise en page se fait à largeur ÷ 1,5, une colonne) : on
 *  ajoute des chants aux lignes longues et, à défaut, on revient à 1,0, où les deux colonnes s'installent et la largeur de
 *  chaque ligne est divisée par deux. ÉCHOUE (pas de skip) si aucune page n'est coupée : les trois appareils exécutent
 *  ces tests pour de bon. Laisse la lecture sur la page coupée. */
async function ouvrirAvecCoupure(page: Page, langue?: string): Promise<FakeDb> {
  const items = [FR, item({ songSlug: "Ta-parole-écriture", position: 2 }), item({ songSlug: "le-dieu-fidele", position: 3 }), item({ songSlug: "爱赢了", position: 4 })];
  const db = await ouvrirMode(page, items, { echelle: "1.5", langue });
  for (const echelle of ["1.5", "1"]) {
    if (echelle !== "1.5") {
      await page.evaluate((v) => localStorage.setItem("perf-font-scale", v), echelle);
      await page.reload();
      await lancer(page);
    }
    await premierePage(page);
    const total = await totalPages(page);
    for (let p = 1; p <= total; p++) {
      await attendreCompteur(page, new RegExp(`^${p} /`));
      if ((await etatsDePage(page)).some((e) => !e.startsWith("une"))) return db;
      if (p < total) await page.keyboard.press("ArrowRight");
    }
  }
  throw new Error("aucune page à ligne coupée, ni à 1,5 (A+ au maximum) ni à 1,0 (deux colonnes)");
}

/** Pour chaque section de la page affichée : hauteur de mise en page et états de coupure, à l'écran et dans la copie
 *  de mesure de même largeur (une colonne ou la copie en colonne). */
function compare(page: Page) {
  return page.evaluate(() => {
    const scene = document.querySelector("[data-performance-mode]")!;
    const copies = Array.from(scene.querySelectorAll<HTMLElement>("[aria-hidden=true] [data-section]"));
    const ecran = Array.from(scene.querySelectorAll<HTMLElement>("[data-section]")).filter((el) => !el.closest("[aria-hidden=true]"));
    const coupes = (el: HTMLElement) => Array.from(el.querySelectorAll("[data-coupe]")).map((n) => n.getAttribute("data-coupe")).join("|");
    return ecran.map((el) => {
      const uids = el.getAttribute("data-section-uids");
      const copie = copies.find((c) => c.getAttribute("data-section-uids") === uids && c.offsetWidth === el.offsetWidth);
      return { uids, trouve: !!copie, hEcran: el.offsetHeight, hCopie: copie?.offsetHeight ?? -1, coupeEcran: coupes(el), coupeCopie: copie ? coupes(copie) : "" };
    });
  });
}

/** Parcourt les pages (au plus `max`) et exige l'égalité copie / écran ; renvoie le nombre de sections comparées. */
async function verifieEgalite(page: Page, max = 6) {
  let comparees = 0;
  // Retour à la première page (la flèche gauche s'arrête au bord) ; la pagination peut encore bouger : on insiste.
  await expect(async () => {
    await page.keyboard.press("ArrowLeft");
    await attendreCompteur(page, /^1 \//, 400);
  }).toPass({ timeout: 15_000 });
  // Nombre de pages stable (après une rotation, la pagination peut encore passer de 2 à 1).
  let total = await totalPages(page);
  await expect(async () => {
    const avant = total;
    await page.waitForTimeout(400);
    total = await totalPages(page);
    expect(total).toBe(avant);
  }).toPass({ timeout: 10_000 });
  for (let p = 1; p <= Math.min(total, max); p++) {
    await attendreCompteur(page, new RegExp(`^${p} /`));
    // Au moins une section retrouvée dans la copie (après une rotation, la remise en page peut être en cours), et aucun écart.
    await expect
      .poll(async () => {
        const s = await compare(page);
        const ecarts = s.filter((x) => x.trouve && (Math.abs(x.hEcran - x.hCopie) > 1 || x.coupeEcran !== x.coupeCopie)).length;
        return s.length === 0 || s.some((x) => x.trouve) ? ecarts : -1;
      }, { timeout: 10_000 })
      .toBe(0);
    comparees += (await compare(page)).filter((s) => s.trouve).length;
    if (p < Math.min(total, max)) await page.keyboard.press("ArrowRight");
  }
  return comparees;
}

test.describe("louange : la copie de mesure et l'écran coupent les vers pareil", () => {
  // Repères (DP-B), Scène (DP-C) : la gouttière réduit le corps de section, la copie et l'écran doivent poser les mêmes rangées.
  for (const [affichage, nomAffichage] of AFFICHAGES)
    for (const [nom, it] of CHANTS)
      for (const disposition of affichage === "played" ? [undefined, "reperes", "scene", "partition"] : [undefined]) {
      test(`${nom}, ${nomAffichage}${disposition ? `, ${disposition}` : ""} : mêmes hauteurs et mêmes coupures, puis après A+ et après une rotation`, async ({ page }, info) => {
        await ouvrirMode(page, [it], { affichage, echelle: "1", disposition });
        expect(await verifieEgalite(page), "des sections ont été comparées").toBeGreaterThan(0);

        // Taille du texte : A+ (110 %).
        const reglages = await ouvrirOptions(page);
        await reglages.getByRole("button", { name: "Agrandir le texte" }).click();
        await page.keyboard.press("Escape");
        await expect(reglages).toBeHidden();
        expect(await verifieEgalite(page), "après A+").toBeGreaterThan(0);

        // Rotation simulée : largeur et hauteur échangées.
        const { width, height } = page.viewportSize()!;
        // (`setViewportSize` est refusé par Chromium sur la fenêtre émulée d'un téléphone : on passe par le protocole.)
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: height,
          height: width,
          deviceScaleFactor: await page.evaluate(() => devicePixelRatio),
          mobile: !!info.project.use.isMobile,
        });
        await attendreCompteur(page, /^\d+ \/ \d+$/);
        expect(await verifieEgalite(page), "après la rotation").toBeGreaterThan(0);
      });
    }
});

test.describe("louange : texte réduit (A−, 80 %)", () => {
  // La copie de mesure est large de 100 % / échelle à l'échelle 1 : sa place jusqu'au bord de la page doit être celle de
  // l'écran (data-bord-coupure), sinon un vers qui dépasse de 0 à 8 px se coupe dans la copie et pas à l'écran.
  for (const [nom, it] of CHANTS)
    test(`${nom} à 80 % : mêmes hauteurs et mêmes coupures dans la copie et à l'écran`, async ({ page }) => {
      await ouvrirMode(page, [it], { echelle: "0.8" });
      let marge = 0;
      await premierePage(page);
      const total = await totalPages(page);
      for (let p = 1; p <= total; p++) {
        await attendreCompteur(page, new RegExp(`^${p} /`));
        marge += (await etatsDePage(page)).filter((e) => e.startsWith("marge")).length;
        if (p < total) await page.keyboard.press("ArrowRight");
      }
      test.info().annotations.push({ type: "lignes en marge", description: String(marge) });
      expect(await verifieEgalite(page, 12), "des sections ont été comparées").toBeGreaterThan(0);
    });
});

test.describe("louange : clé de page", () => {
  test("une page dont une ligne est coupée porte v2, une page sans ligne coupée garde sa clé d'avant (FR, écran de 1,5)", async ({ page }) => {
    await ouvrirAvecCoupure(page);
    await premierePage(page);
    const total = await totalPages(page);
    let avecCoupe = 0;
    let sansCoupe = 0;
    for (let p = 1; p <= total; p++) {
      await attendreCompteur(page, new RegExp(`^${p} /`));
      const etats = await etatsDePage(page);
      const cle = (await cleDePage(page)) ?? "";
      const coupee = etats.some((e) => !e.startsWith("une"));
      if (etats.length) {
        if (coupee) { avecCoupe++; expect(cle, `page ${p} coupée`).toMatch(/v2$/); }
        else { sansCoupe++; expect(cle, `page ${p} sans coupure`).not.toMatch(/v2$/); }
      }
      if (p < total) await page.keyboard.press("ArrowRight");
    }
    expect(avecCoupe, "une page au moins a une ligne coupée").toBeGreaterThan(0);
    expect(avecCoupe + sansCoupe).toBeGreaterThan(0);
  });
});

test.describe("louange : bandeau « ancienne mise en page »", () => {
  test.describe.configure({ timeout: 60_000 });
  const trait = (w: number, h: number) =>
    JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, h * 0.5], [w * 0.5, h * 0.5]] }] });
  const ecritesAnnot = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("annotations/"));

  /** Cherche la première page v2 ; renvoie son numéro et sa clé. */
  async function pageV2(page: Page) {
    const total = await totalPages(page);
    for (let p = 1; p <= total; p++) {
      await attendreCompteur(page, new RegExp(`^${p} /`));
      const cle = (await cleDePage(page)) ?? "";
      if (cle.endsWith("v2")) return { p, cle };
      if (p < total) await page.keyboard.press("ArrowRight");
    }
    return null;
  }
  const allerA = async (page: Page, n: number) => {
    for (let p = 1; p < n; p++) await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, new RegExp(`^${n} /`));
  };

  for (const [langue, libelle] of [["fr", "Des annotations existent avec l'ancienne mise en page"], ["zh-CN", "批注是在旧版排版下写的"]] as const) {
    test(`traits sous l'ancienne clé seulement : bandeau (${langue}), rien n'est écrit`, async ({ page }) => {
      const db = await ouvrirAvecCoupure(page, langue);
      await premierePage(page);
      const v2 = await pageV2(page);
      expect(v2, "une page v2 existe au texte agrandi au maximum").not.toBeNull();
      const ancienne = v2!.cle.replace(/v2$/, "");
      const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${ancienne}`, { strokes: trait(w, h), updatedAt: new Date() });
      await page.reload();
      await lancer(page);
      await allerA(page, v2!.p);
      const bandeau = page.locator("[data-alerte-composition]");
      await expect(bandeau).toBeVisible();
      await expect(bandeau).toHaveText(libelle);
      // Les anciens traits ne s'affichent pas sur la nouvelle page (calque de lecture absent).
      await expect(page.locator("[data-performance-mode] > canvas")).toHaveCount(0);
      expect(ecritesAnnot(db), "aucune écriture").toEqual([]);
    });
  }

  test("traits sous la nouvelle clé : pas de bandeau ; aucun trait nulle part : pas de bandeau", async ({ page }) => {
    const db = await ouvrirAvecCoupure(page);
    await premierePage(page);
    const v2 = await pageV2(page);
    expect(v2, "une page v2 existe au texte agrandi au maximum").not.toBeNull();
    await page.reload();
    await lancer(page);
    await allerA(page, v2!.p);
    await expect.poll(() => cleDePage(page)).toBe(v2!.cle);
    await page.waitForTimeout(600); // la lecture est temporisée (150 ms) : on laisse passer l'éventuel bandeau
    await expect(page.locator("[data-alerte-composition]")).toHaveCount(0);

    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${v2!.cle}`, { strokes: trait(w, h), updatedAt: new Date() });
    db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${v2!.cle.replace(/v2$/, "")}`, { strokes: trait(w, h), updatedAt: new Date() });
    await page.reload();
    await lancer(page);
    await allerA(page, v2!.p);
    await expect.poll(() => cleDePage(page)).toBe(v2!.cle);
    await page.waitForTimeout(600);
    await expect(page.locator("[data-alerte-composition]")).toHaveCount(0);
  });
});

test.describe("louange : tourner la page ne relance pas la pagination", () => {
  test("page suivante puis précédente : data-passes-pagination ne bouge pas", async ({ page }) => {
    await ouvrirMode(page, [FR], { echelle: "1.5" });
    const scene = page.locator("[data-performance-mode]");
    const passes = async () => Number(await scene.getAttribute("data-passes-pagination"));
    // On laisse la pagination se poser (les coupures sont signalées à l'image suivante), puis on compte.
    await page.waitForTimeout(800);
    const avant = await passes();
    expect(avant, "au moins une pagination publiée").toBeGreaterThan(0);
    const total = await totalPages(page);
    expect(total, "plusieurs pages pour tourner").toBeGreaterThan(1);
    for (let p = 1; p < total; p++) {
      await page.keyboard.press("ArrowRight");
      await attendreCompteur(page, new RegExp(`^${p + 1} /`));
    }
    for (let p = total; p > 1; p--) {
      await page.keyboard.press("ArrowLeft");
      await attendreCompteur(page, new RegExp(`^${p - 1} /`));
    }
    await page.waitForTimeout(800);
    expect(await passes(), "aucune pagination relancée en tournant").toBe(avant);
  });
});

test.describe("louange : exceptions de mots chinois", () => {
  // Lot CV : EXCEPTIONS_MOTS (src/lib/song/motsChinois.ts) joint 得着 dans « 大手牵着小手 » ; le mode louange passe le slug
  // du chant à la coupure, à l'écran comme dans la copie de mesure.
  const DEFAUT = item({ songSlug: "大手牵着小手" });
  const VERS = "受伤的心得着安抚";

  /** Pour chaque ligne coupée-ou-non qui contient 得着 (en ne lisant que les idéogrammes, le pinyin s'intercale dans le
   *  texte), l'état de coupure et si une même rangée porte les deux caractères. `copie` : la copie de mesure. */
  const lignes = (page: Page, copie: boolean) =>
    page.evaluate(({ copie, vers }) => {
      const han = (t: string) => (t.match(/\p{Script=Han}/gu) ?? []).join("");
      const scene = document.querySelector("[data-performance-mode]")!;
      const toutes = Array.from(scene.querySelectorAll<HTMLElement>("[data-coupe]")).filter((n) => !!n.closest("[aria-hidden=true]") === copie);
      return toutes
        .map((n) => ({ n, rangees: Array.from(n.querySelectorAll<HTMLElement>("[data-rangee]")).map((r) => han(r.textContent ?? "")) }))
        .filter(({ rangees }) => rangees.join("").includes("得着"))
        .map(({ n, rangees }) => ({
          coupe: n.getAttribute("data-coupe") ?? "une",
          vers: rangees.join("").includes(vers),
          ensemble: rangees.some((r) => r.includes("得着")),
          rangees,
        }));
    }, { copie, vers: VERS });

  test("mode louange, téléphone : les exceptions de mots du chant s'appliquent au pupitre", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "propre au téléphone");
    await ouvrirMode(page, [DEFAUT], { echelle: "1.5" });
    // Largeur d'origine, puis 336 px : sans l'exception, le segmenteur lit 心得 et 得着 ne se coupe nulle part, la ligne
    // « deborde » au lieu de passer en rangées ; avec elle, la coupure tombe entre 心 et 得着 (vérifié à l'essai).
    // (`setViewportSize` est refusé sur la fenêtre émulée d'un téléphone : protocole.)
    const cdp = await page.context().newCDPSession(page);
    for (const largeur of [null, 336]) {
      if (largeur) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width: largeur, height: 800, deviceScaleFactor: 2, mobile: true });
        await page.waitForTimeout(1500);
      }
      await premierePage(page);
      const total = await totalPages(page);
      let vue = 0;
      let coupees = 0;
      let copiees = 0;
      for (let p = 1; p <= total; p++) {
        await attendreCompteur(page, new RegExp(`^${p} /`));
        const ou = `${largeur ?? "largeur d'origine"}, page ${p}`;
        for (const l of await lignes(page, false)) {
          vue++;
          expect(l.ensemble, `écran, ${ou} : 得 et 着 sur la même rangée (${JSON.stringify(l.rangees)})`).toBe(true);
          if (l.vers) {
            expect(l.coupe, `écran, ${ou} : ${VERS} est coupée`).toMatch(/^rangees/);
            coupees++;
          }
        }
        // Copie de mesure : mêmes lignes, même règle.
        for (const l of await lignes(page, true)) {
          copiees++;
          expect(l.ensemble, `copie, ${ou} : 得 et 着 sur la même rangée (${JSON.stringify(l.rangees)})`).toBe(true);
          if (l.vers) expect(l.coupe, `copie, ${ou} : ${VERS} est coupée`).toMatch(/^rangees/);
        }
        if (p < total) await page.keyboard.press("ArrowRight");
      }
      const qui = largeur ?? "largeur d'origine";
      expect(vue, `${qui} : des lignes contenant 得着 vues à l'écran`).toBeGreaterThan(0);
      expect(coupees, `${qui} : la ligne « ${VERS} » vue coupée à l'écran`).toBeGreaterThan(0);
      expect(copiees, `${qui} : des lignes contenant 得着 dans la copie de mesure`).toBeGreaterThan(0);
    }
  });
});

test.describe("louange : captures de la coupure", () => {
  for (const [nom, it] of CHANTS)
    for (const sombre of [false, true]) {
      test(`${nom}, ${sombre ? "sombre" : "clair"} : capture du mode louange`, async ({ page }, info) => {
        await ouvrirMode(page, [it], { echelle: "1", sombre });
        await attendreCompteur(page, /^1 \//);
        await page.evaluate(() => getSelection()?.removeAllRanges());
        const projet = info.project.name;
        await page.screenshot({ path: `test-results/coupure/louange-${projet}-${nom === "一生爱你" ? "zh" : "fr"}-${sombre ? "sombre" : "clair"}.png` });
      });
    }
});
