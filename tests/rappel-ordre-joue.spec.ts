import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { groupSteps } from "../src/lib/setlist/dp";
import { materializeLastPhrase } from "../src/lib/setlist/lastPhrase";
import { buildPerformanceBlocks, computePageKey, type PerformanceBlock, type SectionBlock } from "../src/lib/performance/blocks";
import { deserializeAnnotations, recaler, serializeAnnotations } from "../src/lib/annotations/strokes";
import type { SectionNuance, SetlistItem } from "../src/types/setList";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, basculerAnnoter, lireCompteur, onStage } from "./helpers/louange";

// Lot RS, tranche RS-C (docs/spec-rappel-structure-louange.md) : rappel en Ordre joué
// (points / pleines / claires), réserve mesurée, Dp imprimé une fois dans le corps,
// annotations qui restent sur leur section malgré le rappel plus haut.

// ─── Données ─────────────────────────────────────────────────────────────────

const lire = (slug: string) => readFileSync(`content/songs/${slug}.cho`, "utf8");
const contenu = (slug: string) => ({ slug, ast: parseChordPro(lire(slug)), source: lire(slug) });
const CONTENTS = Object.fromEntries(["abba-pere", "prince-de-paix", "圣诞节耶稣为你而来"].map((s) => [s, contenu(s)]));
const PRINCE = lire("prince-de-paix");

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

/** Abba Père : I · C1 · R · Int · C2 · R · P · R · R (nuances inventées). */
const ORDRE_ABBA = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"];
const ABBA = item({
  songSlug: "abba-pere",
  structureOverride: ORDRE_ABBA,
  sectionNuances: { "verse-2-1": { tags: ["mp"] }, "chorus-3-2": { tags: ["mf"] }, "chorus-3-5": { tags: ["f"] }, "bridge-6-6": { tags: ["p"] } },
});
// Passages répétés (uids distincts) pour que le chant tienne sur plus de trois pages, même sur ordinateur.
const ORDRE_ZH = ["intro-1", "verse-2", "chorus-5", "verse-3", "prechorus-4", "chorus-5", "bridge-6", "chorus-5", "verse-2", "chorus-5", "verse-3", "prechorus-4", "chorus-5", "bridge-6", "chorus-5"].map((id, i) => `${id}-${i}`);
const ZH = item({
  songSlug: "圣诞节耶稣为你而来",
  structureOverride: ORDRE_ZH,
  sectionNuances: { [ORDRE_ZH[1]]: { tags: ["mp"] }, [ORDRE_ZH[2]]: { tags: ["f"] }, [ORDRE_ZH[4]]: { tags: ["mf"] }, [ORDRE_ZH[6]]: { tags: ["p"] } },
});

/** Prince de paix avec un Dp « – R », joué deux fois de suite après l'intro. */
function princeAvecDp(transition = false) {
  const r = materializeLastPhrase(PRINCE, "chorus-3", 1, "R")!;
  const dp = r.sectionId;
  const ordre = ["intro-1", dp, dp, "verse-2", "chorus-3", "verse-4", "chorus-3", "bridge-5", "chorus-3"].map((id, i) => `${id}-${i}`);
  const MP: SectionNuance = { tags: ["mp"] };
  return {
    dp,
    ordre,
    item: item({
      songSlug: "prince-de-paix",
      contentOverride: r.source,
      structureOverride: ordre,
      sectionNuances: { [ordre[1]]: MP, [ordre[2]]: { tags: ["mf"] } },
      sectionTransitions: transition ? { [ordre[1]]: "Silence" } : undefined,
    }),
  };
}
const contenuPrince = (source: string) => ({ "prince-de-paix": { slug: "prince-de-paix", ast: parseChordPro(source), source } });
const sections = (blocks: PerformanceBlock[]) => blocks.filter((b): b is SectionBlock => b.kind === "section");

// ─── 1. Pur : le Dp joué de suite est imprimé une fois ────────────────────────

test.describe("Ordre joué : Dp imprimé une fois (pur)", () => {
  test("deux passages de suite = un bloc « ×2 » qui porte les deux uids, nuance du 1er", () => {
    const { item: it, ordre, dp } = princeAvecDp();
    const blocs = buildPerformanceBlocks([it], contenuPrince(it.contentOverride!), true, undefined, undefined, "auto", undefined, { affichage: "played" });
    const s = sections(blocs);
    expect(s).toHaveLength(8);
    const bloc = s[1];
    expect(bloc.section.id).toBe(dp);
    expect(bloc.repeat).toBe(2);
    expect(bloc.occurrenceUids).toEqual([ordre[1], ordre[2]]);
    expect(bloc.nuance).toEqual({ tags: ["mp"] });
    // Les uids du bandeau (en-tête) sont ceux des blocs : le rappel retrouve le bloc.
    const entete = blocs[0] as Extract<PerformanceBlock, { kind: "song-header" }>;
    expect(entete.steps!.map((st) => st.section.uid)).toEqual(ordre);
    expect(s.flatMap((b) => b.occurrenceUids!)).toEqual(ordre);
    // Les autres blocs ne portent pas de « ×n ».
    expect(s.filter((b) => b.repeat)).toHaveLength(1);
    // Sections uniques et Structure seule : inchangés (déjà repliés ailleurs).
    for (const affichage of ["unique", "structure"] as const) {
      const autre = buildPerformanceBlocks([it], contenuPrince(it.contentOverride!), true, undefined, undefined, "auto", undefined, { affichage });
      expect(sections(autre).some((b) => b.repeat)).toBe(false);
    }
  });

  test("une transition sur le passage intermédiaire coupe la suite", () => {
    const { item: it } = princeAvecDp(true);
    const blocs = buildPerformanceBlocks([it], contenuPrince(it.contentOverride!), true, undefined, undefined, "auto", undefined, { affichage: "played" });
    expect(sections(blocs)).toHaveLength(9);
    expect(sections(blocs).some((b) => b.repeat)).toBe(false);
  });

  test("fusion en structure mixte : même repli, uids d'occurrence du bandeau", () => {
    const r = materializeLastPhrase(PRINCE, "chorus-3", 1, "R")!;
    const fusion = item({
      type: "fusion",
      songSlug: "",
      fusionSongs: [{ songSlug: "prince-de-paix", keyOverride: null, structureOverride: null, sectionNotes: {}, contentOverride: r.source }],
      mixedStructure: [
        { songSlug: "prince-de-paix", sectionId: "intro-1" },
        { songSlug: "prince-de-paix", sectionId: r.sectionId },
        { songSlug: "prince-de-paix", sectionId: r.sectionId },
        { songSlug: "prince-de-paix", sectionId: "verse-2" },
      ],
    });
    const blocs = buildPerformanceBlocks([fusion], contenuPrince(r.source), true, undefined, undefined, "auto", undefined, { affichage: "played" });
    const entete = blocs[0] as Extract<PerformanceBlock, { kind: "song-header" }>;
    const s = sections(blocs);
    expect(s).toHaveLength(3);
    expect(s[1].repeat).toBe(2);
    expect(s[1].occurrenceUids).toEqual([entete.steps![1].section.uid, entete.steps![2].section.uid]);
  });

  test("sans Dp rejoué, les blocs et les clés de page ne changent pas", () => {
    const blocs = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "played" });
    const s = sections(blocs);
    expect(s.map((b) => b.occurrenceUids)).toEqual(ORDRE_ABBA.map((u) => [u]));
    expect(s.some((b) => b.repeat)).toBe(false);
    // Clé d'une page = hachage des section.uid de ses blocs : celle d'un bloc ne dépend que de lui.
    const indices = blocs.flatMap((b, i) => (b.kind === "section" ? [i] : []));
    expect(computePageKey(blocs, indices.slice(2, 5), "c1")).toBe(computePageKey(blocs, indices.slice(2, 5), "c1"));
    expect(computePageKey(blocs, indices.slice(2, 5), "c1")).not.toBe(computePageKey(blocs, indices.slice(3, 6), "c1"));
  });
});

test.describe("annotations : décalage du rappel (pur)", () => {
  const base = { w: 400, h: 800, strokes: [{ tool: "pen" as const, size: 3, color: "#000", points: [[10, 100], [20, 110]] as [number, number][] }] };

  test("recaler : sans champ, ancienne hauteur ; avec champ, celle du tracé ; l'écart se convertit en espace d'origine", () => {
    // Rappel de 50 px d'écran aujourd'hui, 32 à l'ancien rendu : le contenu a descendu de 18 px.
    const r = recaler(base, 50, 32, 800);
    expect(r.rappel).toBe(50);
    expect(r.strokes[0].points[0][1]).toBeCloseTo(118, 5);
    // Viewport d'enregistrement plus petit (h = 400, écran 800) : tout est rapporté à l'espace de data.h.
    // Rappel d'écran 50 -> 25 stocké, ancien 32 -> 16 : décalage de 9 ; la valeur réécrite est dans l'espace de data.h.
    const petit = recaler({ ...base, h: 400 }, 50, 32, 800);
    expect(petit.strokes[0].points[0][1]).toBeCloseTo(100 + 9, 5);
    expect(petit.rappel).toBeCloseTo(25, 5);
    // Avec le champ (espace de data.h) : 25 = 50 px d'écran, rien ne bouge ; 30 : le contenu a monté de 5.
    expect(recaler({ ...base, h: 400, rappel: 25 }, 50, 32, 800).strokes[0].points[0][1]).toBe(100);
    expect(recaler({ ...base, h: 400, rappel: 30 }, 50, 32, 800).strokes[0].points[0][1]).toBeCloseTo(95, 5);
    // Avec le champ : l'ancienne valeur par défaut est ignorée.
    expect(recaler({ ...base, rappel: 50 }, 50, 32, 800).strokes[0].points[0][1]).toBe(100);
    expect(recaler({ ...base, rappel: 60 }, 50, 32, 800).strokes[0].points[0][1]).toBeCloseTo(90, 5);
    // Page sans rappel (ancienne = 0) : rien ne bouge.
    expect(recaler(base, 0, 0, 800).strokes).toEqual(base.strokes);
  });

  test("le champ rappel traverse la sérialisation ; une annotation d'avant n'en a pas", () => {
    const aller = deserializeAnnotations(serializeAnnotations({ ...base, rappel: 50.04 }))!;
    expect(aller.rappel).toBe(50);
    expect(deserializeAnnotations(serializeAnnotations(base))!.rappel).toBeUndefined();
    expect(deserializeAnnotations(JSON.stringify({ ...base, rappel: "x" }))!.rappel).toBeUndefined();
  });
});

// ─── 2. À l'écran ────────────────────────────────────────────────────────────

const SETLIST_ID = "setlist-rappel-joue";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};


async function ouvrirMode(page: Page, items: SetlistItem[], affichage: string | null = null, echelle = "1.5"): Promise<FakeDb> {
  await page.addInitScript(({ a, e }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", e);
    if (a) localStorage.setItem("partition-layout", a);
  }, { a: affichage, e: echelle });
  const db = await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: {
        title: "Culte du 25 octobre",
        leader: "Présidence",
        category: "Culte Francophone",
        date: "2026-10-25",
        language: "mixed",
        notes: "",
        ownerId: "uid-owner",
        isPrivate: false,
        items,
      },
    },
    `/setlists/${SETLIST_ID}`,
  );
  await lancer(page);
  return db;
}

async function lancer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
}

const totalPages = async (page: Page) => Number((await lireCompteur(page)).split("/")[1]);
async function allerPage(page: Page, n: number) {
  expect(await totalPages(page), `au moins ${n} pages`).toBeGreaterThanOrEqual(n);
  for (let p = 1; p < n; p++) {
    await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, new RegExp(`^${p + 1} /`));
  }
}
const telephone = (page: Page) => page.viewportSize()!.width < 640;

/** Les étapes du rappel de la page affichée : état, visibilité, nuances, taille du point. */
const lireRappel = (page: Page) =>
  onStage(page, "[data-rappel] li").evaluateAll((lis) =>
    lis.map((li) => {
      const point = li.querySelector<HTMLElement>("[data-point]");
      const pastille = li.querySelector<HTMLElement>(":scope > span[data-pleine], :scope > span:not([data-point])");
      const cible = point ?? pastille!;
      const r = cible.getBoundingClientRect();
      return {
        etat: point ? "point" : li.querySelector("[data-pleine]") ? "pleine" : "claire",
        visible: r.width > 0 && r.height > 0,
        nuances: li.querySelectorAll("[data-nuance]").length,
        lettre: !point && !!li.querySelector("abbr")?.textContent,
        largeur: cible.offsetWidth,
        hauteur: cible.offsetHeight,
        opacite: getComputedStyle(cible).opacity,
        fond: getComputedStyle(cible).backgroundColor,
        haut: pastille ? pastille.offsetHeight : 0,
      };
    }),
  );

/** Uids des occurrences imprimées sur la page affichée. */
const imprimees = (page: Page) =>
  onStage(page, "[data-section]").evaluateAll((els) => els.flatMap((e) => e.getAttribute("data-section-uids")!.split(" ")));

/** Etat attendu de chaque groupe d'étapes (`groupes` : uids de chaque groupe, dans l'ordre). */
function attendu(ordre: string[], groupes: string[][], sur: string[]) {
  const rang = (u: string) => ordre.indexOf(u);
  const debut = Math.min(...sur.map(rang));
  return groupes.map((g) => (g.some((u) => sur.includes(u)) ? "pleine" : Math.max(...g.map(rang)) < debut ? "point" : "claire"));
}

/** Groupes du bandeau d'un chant (uids de chaque pastille) et ordre joué, tels que l'en-tête les porte. */
function groupesDe(it: SetlistItem) {
  const [entete] = buildPerformanceBlocks([it], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "played" }) as [Extract<PerformanceBlock, { kind: "song-header" }>];
  return { ordre: entete.steps!.map((s) => s.section.uid), groupes: groupSteps(entete.steps!, (s) => s.name ?? s.type).map((g) => g.uids) };
}

test.describe("rappel en Ordre joué", () => {
  test("page 3 : points avant, pleines sur la page avec leur nuance, claires après ; rien sur la 1re page (FR)", async ({ page }) => {
    await ouvrirMode(page, [ABBA]);
    await expect(onStage(page, "[data-rappel]"), "page 1 : le bandeau, pas de rappel").toHaveCount(0);
    await allerPage(page, 3);
    const rappel = onStage(page, "[data-rappel]");
    await expect(rappel).toBeVisible();
    const etapes = await lireRappel(page);
    const { ordre, groupes } = groupesDe(ABBA);
    expect(etapes).toHaveLength(groupes.length);
    const sur = await imprimees(page);
    expect(etapes.map((e) => e.etat)).toEqual(attendu(ordre, groupes, sur));
    expect(etapes.some((e) => e.etat === "point")).toBe(true);
    expect(etapes.some((e) => e.etat === "pleine")).toBe(true);

    for (const e of etapes) {
      // Au téléphone aussi : points, pleines et claires, tout reste.
      expect(e.visible, `${e.etat} visible`).toBe(true);
      if (e.etat === "point") {
        expect(Math.abs(e.largeur - 8)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(e.hauteur - 8)).toBeLessThanOrEqual(0.5);
        expect(e.opacite).toBe("0.45");
        expect(e.lettre, "un point n'a pas de lettre").toBe(false);
        expect(e.nuances).toBe(0);
      } else {
        expect(Math.abs(e.haut - (telephone(page) ? 26 : 30))).toBeLessThanOrEqual(1);
        if (e.etat === "claire") expect(e.nuances).toBe(0);
      }
    }
    // Nuance sous les pleines qui en ont (R, P, C1 portent une nuance).
    expect(etapes.some((e) => e.etat === "pleine" && e.nuances > 0)).toBe(true);
    await expect(onStage(page, "[data-rappel] [data-cerclee]")).toHaveCount(0);

    const titre = rappel.locator("span.uppercase");
    if (telephone(page)) await expect(titre).toBeHidden();
    else {
      await expect(titre).toHaveText("Abba Père");
      expect(await titre.evaluate((el) => getComputedStyle(el).fontSize)).toBe("13px");
    }
    const basRappel = await rappel.evaluate((el) => el.getBoundingClientRect().bottom);
    const hautSections = await onStage(page, "[data-section]").evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().top)));
    expect(basRappel).toBeLessThanOrEqual(hautSections);
  });

  test("chant chinois : points, pleines et claires, titre chinois sur tablette et ordinateur (ZH)", async ({ page }) => {
    await ouvrirMode(page, [ZH], null, "1.5");
    await expect(onStage(page, "[data-rappel]")).toHaveCount(0);
    await allerPage(page, 3);
    const rappel = onStage(page, "[data-rappel]");
    await expect(rappel).toBeVisible();
    const etapes = await lireRappel(page);
    const { ordre, groupes } = groupesDe(ZH);
    const sur = await imprimees(page);
    expect(etapes).toHaveLength(groupes.length);
    expect(etapes.map((e) => e.etat)).toEqual(attendu(ordre, groupes, sur));
    expect(etapes.some((e) => e.etat === "point")).toBe(true);
    expect(etapes.some((e) => e.etat === "pleine")).toBe(true);
    expect(etapes.every((e) => e.visible)).toBe(true);
    const titre = rappel.locator("span.uppercase");
    if (telephone(page)) await expect(titre).toBeHidden();
    else await expect(titre).toHaveText("圣诞节耶稣为你而来");
  });

  for (const [nom, items, echelle] of [["FR", [ABBA], "1.5"], ["ZH", [ZH], "1.5"]] as const) {
    test(`le rappel est dans la réserve : rien ne déborde, de la page 2 à la dernière (${nom})`, async ({ page }) => {
      await ouvrirMode(page, [...items], null, echelle);
      const total = await totalPages(page);
      expect(total).toBeGreaterThan(2);
      const f = Number(echelle);
      for (let p = 1; p <= total; p++) {
        await attendreCompteur(page, `${p} / ${total}`);
        if (p > 1) {
          const { depasse, bas, hauteur } = await page.evaluate((k) => {
            const visible = (sel: string) => [...document.querySelectorAll<HTMLElement>(`[data-performance-mode] ${sel}`)].filter((e) => !e.closest("[aria-hidden=true]"));
            const [r] = visible("[data-rappel]");
            const bas = Math.max(...visible("[data-section]").map((e) => e.getBoundingClientRect().bottom));
            const budget = innerHeight / k - 16 - 16 - 24;
            return { depasse: (bas - r.getBoundingClientRect().top) / k - budget, bas, hauteur: innerHeight };
          }, f);
          expect(depasse, `page ${p} : le rappel et les sections dépassent le budget de ${depasse.toFixed(1)} px`).toBeLessThanOrEqual(1);
          expect(bas, `page ${p} : le bas de la dernière section est visible`).toBeLessThanOrEqual(hauteur);
        }
        if (p < total) await page.keyboard.press("ArrowRight");
      }
    });
  }

  test("le Dp joué deux fois de suite n'est imprimé qu'une fois, avec « ×2 », et porte les deux uids (FR)", async ({ page }) => {
    const { item: it, ordre } = princeAvecDp();
    await ouvrirMode(page, [it], null, "1");
    const dps = onStage(page, "[data-section]").filter({ hasText: /Derni[eè]re phrase/ });
    await expect(dps).toHaveCount(1);
    await expect(dps.first()).toContainText("×2");
    expect(await dps.first().getAttribute("data-section-uids")).toBe(`${ordre[1]} ${ordre[2]}`);
    // Le bandeau garde les deux nuances, dans l'ordre.
    const bandeau = onStage(page, "[data-entete-chant]").getByRole("list", { name: "Structure" });
    await expect(bandeau.locator("li").filter({ hasText: "Dp" }).locator("[data-nuance]")).toHaveCount(2);
  });
});

// ─── 3. Annotations ──────────────────────────────────────────────────────────

const calque = (page: Page) => page.locator("[data-performance-mode] > canvas");
const ecritesAnnot = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("annotations/"));
// MP-5 : le Crayon écrit des traits accrochés au texte dans ma partition ; les annotations par page sont en lecture seule.
const ecritesTraits = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("partitions/"));
/** Clé de la page affichée : où se range une ancienne annotation par page. */
const clePage = (page: Page) => page.locator("[data-performance-mode]").getAttribute("data-cle-page");

/** Boîte (px d'écran) des pixels dessinés du calque de lecture. */
const boite = (page: Page) =>
  calque(page).evaluate((c: HTMLCanvasElement) => {
    const { width, height } = c;
    const d = c.getContext("2d")!.getImageData(0, 0, width, height).data;
    let x0 = width, y0 = height, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (d[(y * width + x) * 4 + 3] > 0) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const k = c.getBoundingClientRect().width / width;
    return n < 20 ? null : [x0 * k, y0 * k, x1 * k, y1 * k];
  });

async function montrerChrome(page: Page) {
  if (await page.getByRole("button", { name: "Quitter" }).isVisible()) return;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(w / 2, h / 2);
  await expect(page.getByRole("button", { name: "Quitter" })).toBeVisible();
}

/** `calques` : le canvas du Crayon, plus le calque des anciennes annotations de la page quand il y en a une. */
async function tracer(page: Page, db: FakeDb, calques = 1) {
  await montrerChrome(page);
  await basculerAnnoter(page);
  await expect(calque(page)).toHaveCount(calques);
  const ecran = page.viewportSize()!;
  // Sur une ligne de texte (le trait s'accroche au texte : un tracé à plus de 2 em de toute ligne est ignoré), la plus proche de 55 % de la hauteur.
  const y = await page.evaluate((cible) => {
    const lignes = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-trait-section]")].filter((e) => !e.closest("[aria-hidden=true]")).map((e) => e.getBoundingClientRect());
    lignes.sort((p, q) => Math.abs((p.top + p.bottom) / 2 - cible) - Math.abs((q.top + q.bottom) / 2 - cible));
    return (lignes[0].top + lignes[0].bottom) / 2;
  }, ecran.height * 0.55);
  const x = ecran.width * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 5, { steps: 4 });
  await page.mouse.move(x + 90, y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => ecritesTraits(db).length).toBeGreaterThan(0);
  await basculerAnnoter(page);
  return y;
}

/** Hauteur actuelle du rappel (marge comprise), en px d'écran, et haut de la 1re section. */
const mesures = (page: Page, echelle: number) =>
  page.evaluate((k) => {
    const el = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-rappel]")].find((e) => !e.closest("[aria-hidden=true]"))!;
    const sec = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-section]")].filter((e) => !e.closest("[aria-hidden=true]"));
    return {
      rappel: (el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom)) * k,
      haut: Math.min(...sec.map((e) => e.getBoundingClientRect().top)),
    };
  }, echelle);

test.describe("annotations avec le rappel", () => {
  test("un trait dessiné sur la page 2 revient au même endroit après rechargement (Ordre joué) (FR)", async ({ page }) => {
    const db = await ouvrirMode(page, [ABBA]);
    await allerPage(page, 2);
    await expect(onStage(page, "[data-rappel]")).toBeVisible();
    await tracer(page, db);
    await expect.poll(() => boite(page)).not.toBeNull();
    const avant = (await boite(page))!;
    expect((ecritesTraits(db).at(-1)!.data.traits as unknown[]).length, "le trait est enregistré dans ma partition, accroché au texte").toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    await page.reload();
    await lancer(page);
    await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, /^2 \//);
    await expect.poll(() => boite(page)).not.toBeNull();
    const apres = (await boite(page))!;
    avant.forEach((v, i) => expect(Math.abs(v - apres[i]), `bord ${i}`).toBeLessThanOrEqual(2));
    await page.keyboard.press("ArrowLeft");
    await expect(calque(page), "aucun trait sur la page 1").toHaveCount(0);
  });

  // Annotation « d'avant le lot » : pas de champ `rappel`, trait posé là où l'ancien rendu aurait mis le haut
  // de la section (haut actuel − (rappel actuel − ancienne hauteur)).
  for (const [affichage, nom] of [["unique", "Chaque section une fois"], ["played", "Tout le chant"]] as const) {
    test(`annotation d'avant le lot : le trait est sur le haut de sa section, ${nom} (FR)`, async ({ page }) => {
      const echelle = 1.5;
      const db = await ouvrirMode(page, [ABBA], affichage === "unique" ? "unique" : null, String(echelle));
      await allerPage(page, 2);
      await expect(onStage(page, "[data-rappel]")).toBeVisible();
      // Une annotation d'avant (par page, lecture seule) posée sous la clé de la page.
      const cle = await clePage(page);
      const { rappel, haut } = await mesures(page, echelle);
      const ancien = affichage === "unique" ? 32 * echelle : 0;
      const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const y = haut - (rappel - ancien);
      const sansChamp = JSON.stringify({
        w, h,
        strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, y], [w * 0.5, y]] }],
      });
      db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${cle}`, { strokes: sansChamp, updatedAt: new Date() });
      await page.reload();
      await lancer(page);
      await page.keyboard.press("ArrowRight");
      await attendreCompteur(page, /^2 \//);
      await expect.poll(() => boite(page)).not.toBeNull();
      const [, y0, , y1] = (await boite(page))!;
      expect(Math.abs((y0 + y1) / 2 - haut), `trait à ${((y0 + y1) / 2).toFixed(1)} px, haut de la section à ${haut.toFixed(1)} px`).toBeLessThanOrEqual(3);
    });
  }

  // Une page dont la composition change (fin de page déplacée par le rappel) change de clé : l'annotation posée
  // sous l'ancienne clé, sur l'ancienne page qui commence par la même section, s'y retrouve.
  // Les pages qui changent de composition dépendent de l'appareil, du chant et de la taille du texte : trois
  // candidats, chacun recomposé sur au moins un appareil (les autres sautent).
  const CANDIDATS = [["quand-tu-parles", 1.5], ["la-pour-toi", 1.5], ["la-pour-toi", 1]] as const;
  for (const [affichage, nom] of [["unique", "Chaque section une fois"], ["played", "Tout le chant"]] as const)
  for (const [slug, echelle] of CANDIDATS) {
    test(`annotation sous l'ancienne clé d'une page recomposée : lue sur la nouvelle page, enregistrée sous la nouvelle clé, ${nom}, ${slug} à ${echelle * 100} % (FR)`, async ({ page }) => {
      const db = await ouvrirMode(page, [item({ songSlug: slug })], affichage === "unique" ? "unique" : null, String(echelle));
      const total = await totalPages(page);
      const scene = page.locator("[data-performance-mode]");
      let numero = 0;
      let ancienne: string | null = null;
      for (let p = 2; p <= total && !ancienne; p++) {
        await page.keyboard.press("ArrowRight");
        await attendreCompteur(page, `${p} / ${total}`);
        ancienne = await scene.getAttribute("data-cle-ancienne");
        numero = p;
      }
      test.skip(!ancienne, "aucune page de cet appareil ne change de composition à cette taille");
      await expect(onStage(page, "[data-rappel]")).toBeVisible();
      const { rappel, haut } = await mesures(page, echelle);
      const ancien = affichage === "unique" ? 32 * echelle : 0;
      const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const y = haut - (rappel - ancien);
      const sansChamp = JSON.stringify({
        w, h,
        strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, y], [w * 0.5, y]] }],
      });
      const chemin = `annotations/${MUSICIEN.uid}__${SETLIST_ID}__${ancienne}`;
      db.set(chemin, { strokes: sansChamp, updatedAt: new Date() });
      await page.reload();
      await lancer(page);
      for (let p = 2; p <= numero; p++) await page.keyboard.press("ArrowRight");
      await attendreCompteur(page, new RegExp(`^${numero} /`));
      await expect.poll(() => boite(page)).not.toBeNull();
      const [, y0, , y1] = (await boite(page))!;
      expect(Math.abs((y0 + y1) / 2 - haut), `trait à ${((y0 + y1) / 2).toFixed(1)} px, haut de la section à ${haut.toFixed(1)} px`).toBeLessThanOrEqual(3);

      // Un trait de plus : il s'enregistre dans ma partition ; l'ancienne annotation reste en lecture seule, intacte.
      const yTrace = await tracer(page, db, 2);
      expect(ecritesAnnot(db), "plus rien ne s'écrit dans les annotations par page").toEqual([]);
      // Le trait s'ancre au bon endroit sur la page à rappel : il est relu là où il a été tracé (x 40 %, sur la ligne tracée).
      const { w: largeur } = await page.evaluate(() => ({ w: innerWidth }));
      await expect.poll(async () => {
        const boites = await page.evaluate(() => [...document.querySelectorAll("[data-performance-mode] > canvas[data-strokes-boites]")].flatMap((c) => JSON.parse(c.getAttribute("data-strokes-boites")!) as number[][]));
        return boites.some((b) => Math.abs(b[0] - largeur * 0.4) <= 8 && b[1] >= yTrace - 12 && b[3] <= yTrace + 12);
      }, { message: "le trait neuf est sur la page, là où il a été tracé" }).toBe(true);
      expect(db.doc(chemin)!.strokes).toBe(sansChamp);
    });
  }
});
