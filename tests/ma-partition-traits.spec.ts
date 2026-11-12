import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { ancrer, decouper, projeter, traitsValides } from "../src/lib/annotations/ancres";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, basculerAnnoter, ouvrirJeJoue, onStage } from "./helpers/louange";

// Ma partition, tranche MP-5 (docs/spec-ma-partition.md, « Traits accrochés au texte ») : les traits du Crayon au mode
// louange s'accrochent au texte (section, ligne, caractère), suivent le mot quand la page se recompose, s'écrivent dans
// ma partition, se retrouvent dans une autre setlist ; la rubrique « Partition » de « Je joue ». Base simulée, comptes
// fictifs. Agencement : dans SPECS_GRAND_ECRAN.

const IRIS: FakeProfile = {
  uid: "uid-iris", email: "iris.valmont@example.invalid", firstName: "Iris", lastName: "Valmont", planningName: "Iris V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const THEO: FakeProfile = {
  uid: "uid-theo", email: "theo.marchand@example.invalid", firstName: "Théo", lastName: "Marchand", planningName: "Théo M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const profilDoc = (p: FakeProfile) => ({ email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles ?? {} });

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const MON_ABBA = ABBA.replace("planait", "flottait");
const COUPLET = parseChordPro(ABBA).sections.find((s) => s.type === "verse")!.id;
/** Première ligne du premier couplet : le mot « créa » y est, sur la première page quel que soit l'appareil. */
const MOT = "créa";
const CAR_MOT = "Bien avant le chant qui créa l'univers,".indexOf(MOT);

const item = (songSlug: string, position = 1) => ({ songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const setlist = (titre: string, slugs: string[]) => ({
  title: titre, leader: "Iris V.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
  ownerId: IRIS.uid, isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});
const SL = "traits-sl";
const SL_AUTRE = "traits-autre-sl";
const DOCS = { [`setlists/${SL}`]: setlist("Culte du 4 octobre", ["abba-pere"]), [`setlists/${SL_AUTRE}`]: setlist("Culte du 11 octobre", ["abba-pere"]) };

const ecritesPartitions = (db: FakeDb) => db.writes.filter((w) => decodeURIComponent(w.path).startsWith(`partitions/${IRIS.uid}__abba-pere`));
const traitsEcrits = (db: FakeDb) => (ecritesPartitions(db).at(-1)?.data.traits as { ancre: Record<string, unknown>; points: number[] }[] | undefined) ?? [];

async function ouvrirLouange(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>, setlistId = SL, zh = false) {
  await page.addInitScript((z) => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    if (z) localStorage.setItem("jianpu-sheet-pref", "never");
  }, zh);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, qui, { ...DOCS, ...docs }, `/setlists/${setlistId}`);
  await entrer(page);
  return db;
}
async function entrer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

/** Boîte (px écran) d'un mot de la page affichée, mesurée sur les nœuds texte des paroles (accords et pinyin exclus). */
const boiteMot = (page: Page, mot: string) =>
  page.evaluate((m) => {
    for (const ligne of document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-trait-section]")) {
      if (ligne.closest("[aria-hidden=true]")) continue;
      const noeuds: Text[] = [];
      for (const el of ligne.querySelectorAll("[data-paroles], [data-car]")) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) noeuds.push(n as Text);
      }
      const texte = noeuds.map((n) => n.data).join("");
      const i = texte.indexOf(m);
      if (i < 0) continue;
      const place = (rang: number) => {
        let reste = rang;
        for (const n of noeuds) { if (reste < n.length) return [n, reste] as const; reste -= n.length; }
        return [noeuds[noeuds.length - 1], noeuds[noeuds.length - 1].length] as const;
      };
      const r = document.createRange();
      const [n0, o0] = place(i);
      const [n1, o1] = place(i + m.length - 1);
      r.setStart(n0, o0);
      r.setEnd(n1, o1 + 1);
      const b = r.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    }
    return null;
  }, mot);

/** Boîtes englobantes (px écran) des tracés du calque de lecture ; vide s'il n'y a pas de calque. */
const boitesTraits = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLElement>("[data-performance-mode] > canvas[data-strokes-boites]");
    return c ? (JSON.parse(c.getAttribute("data-strokes-boites")!) as [number, number, number, number][]) : [];
  });

async function tracerSurLeMot(page: Page, boite: { left: number; right: number; top: number; bottom: number }) {
  const y = (boite.top + boite.bottom) / 2;
  await page.mouse.move(boite.left + 2, y);
  await page.mouse.down();
  await page.mouse.move((boite.left + boite.right) / 2, y + 2, { steps: 5 });
  await page.mouse.move(boite.right - 2, y, { steps: 5 });
  await page.mouse.up();
}

/** Distance (px) du centre du trait à la boîte du mot : 0 quand il est dedans. */
function ecart(trait: [number, number, number, number], mot: { left: number; right: number; top: number; bottom: number }) {
  const cx = (trait[0] + trait[2]) / 2;
  const cy = (trait[1] + trait[3]) / 2;
  return Math.max(mot.left - cx, cx - mot.right, mot.top - cy, cy - mot.bottom, 0);
}
/** Le trait tient sur le mot, à quelques pixels près. */
const surLeMot = (trait: [number, number, number, number], mot: { left: number; right: number; top: number; bottom: number }) =>
  expect(ecart(trait, mot), "le trait est sur le mot").toBeLessThanOrEqual(6);
const lu = (page: Page, mot: string) => onStage(page, "[data-paroles]").filter({ hasText: mot });

test("(a) ancres : un tracé sur deux lignes est découpé ligne par ligne ; écran ↔ ancré fait l'aller-retour", () => {
  const lignes = [{ left: 0, top: 0, right: 300, bottom: 20 }, { left: 0, top: 30, right: 300, bottom: 50 }];
  const morceaux = decouper([[10, 5], [50, 15], [60, 24], [70, 40], [90, 45]], lignes);
  expect(morceaux.map((m) => m.ligne)).toEqual([0, 1]);
  // (60, 24) est dans l'interligne : plus proche de la ligne 0. Le point de jonction est repris des deux côtés.
  expect(morceaux[0].points).toEqual([[10, 5], [50, 15], [60, 24], [70, 40]]);
  expect(morceaux[1].points).toEqual([[70, 40], [90, 45]]);
  expect(decouper([[5, 5]], [])).toEqual([]);

  const trace = { tool: "pen" as const, size: 3.5, color: "#dc2626", points: [[100, 200], [132, 216]] as [number, number][] };
  const trait = ancrer(trace, { section: "verse-2", ligne: 0, car: 3 }, { x: 100, y: 200, unite: 16 });
  expect(trait.points).toEqual([[0, 0], [2, 1]]);
  expect(trait.epaisseur).toBe(0.22); // 2 décimales
  // Le même trait sur une page recomposée (autre position, autre em) : il suit.
  const ailleurs = projeter(trait, { x: 50, y: 80, unite: 32 });
  expect(ailleurs.points).toEqual([[50, 80], [114, 112]]);
  expect(ailleurs.size).toBeCloseTo(0.22 * 32, 5);
  expect(ailleurs.tool).toBe("pen");
  // Scan : fraction de la largeur de l'image, 4 décimales.
  const scan = ancrer(trace, { scan: true, image: 1 }, { x: 50, y: 100, unite: 400 });
  expect(scan.points).toEqual([[0.125, 0.25], [0.205, 0.29]]);
  // Anciens documents : `traits` absent ou de forme inconnue → ignoré ; points à plat (Firestore) relus en paires.
  expect(traitsValides(undefined)).toEqual([]);
  expect(traitsValides("x")).toEqual([]);
  expect(traitsValides([{ foo: 1 }, trait, { ...trait, points: [0, 0, 2, 1] }])).toEqual([trait, trait]);
});

test("(b) un trait tracé sur un mot s'écrit dans ma partition, ancré au texte, et reste sur le mot quand la fenêtre change de taille", async ({ page }) => {
  const db = await ouvrirLouange(page, IRIS, {});
  const mot = (await boiteMot(page, MOT))!;
  expect(mot, "le mot est sur la première page").not.toBeNull();
  await basculerAnnoter(page);
  await tracerSurLeMot(page, mot);

  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const ancre = traitsEcrits(db)[0].ancre;
  expect(ancre.section).toBe(COUPLET);
  expect(ancre.ligne).toBe(0);
  expect(Math.abs((ancre.car as number) - CAR_MOT), "caractère le plus proche du début du trait").toBeLessThanOrEqual(1);
  expect(ecritesPartitions(db).at(-1)!.data.content, "texte inchangé").toBeNull();

  await basculerAnnoter(page);
  await expect.poll(async () => (await boitesTraits(page)).length).toBe(1);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, MOT))!);

  // La page se recompose : taille tablette depuis le téléphone, taille téléphone depuis les autres.
  const [largeur, hauteur] = page.viewportSize()!.width < 768 ? [820, 1180] : [390, 844];
  // Le mode louange demande le plein écran : la fenêtre ne se redimensionne pas tant qu'il dure.
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined));
  await page.setViewportSize({ width: largeur, height: hauteur });
  await attendreMiseEnPage(page);
  await expect.poll(async () => {
    const m = await boiteMot(page, MOT);
    const t = (await boitesTraits(page))[0];
    return m && t ? ecart(t, m) : Infinity;
  }, { message: "le trait suit le mot" }).toBeLessThanOrEqual(6);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, MOT))!);
});

test("(c) le même trait se retrouve dans une autre setlist qui contient le chant", async ({ page }) => {
  test.setTimeout(60_000); // deux ouvertures du mode louange
  const db = await ouvrirLouange(page, IRIS, {});
  await basculerAnnoter(page);
  await tracerSurLeMot(page, (await boiteMot(page, MOT))!);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBeGreaterThan(0);

  await page.goto(`/setlists/${SL_AUTRE}`);
  await entrer(page);
  await expect.poll(async () => (await boitesTraits(page)).length).toBe(1);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, MOT))!);
});

test("(d) un chant chinois : le trait est ancré au texte", async ({ page }) => {
  const db = await ouvrirLouange(page, IRIS, { [`setlists/${SL}`]: setlist("Culte du 4 octobre", ["一生爱你"]) }, SL, true);
  const mot = (await boiteMot(page, "宝"))!;
  expect(mot, "le caractère est sur la première page").not.toBeNull();
  await basculerAnnoter(page);
  await tracerSurLeMot(page, mot);
  await expect.poll(() => db.writes.filter((w) => decodeURIComponent(w.path) === `partitions/${IRIS.uid}__一生爱你`).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const traits = db.writes.filter((w) => decodeURIComponent(w.path) === `partitions/${IRIS.uid}__一生爱你`).at(-1)!.data.traits as { ancre: Record<string, unknown> }[];
  expect(traits[0].ancre).toMatchObject({ section: expect.any(String), ligne: 0, car: expect.any(Number) });
  await basculerAnnoter(page);
  await expect.poll(async () => (await boitesTraits(page)).length).toBe(1);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, "宝"))!);
});

test("(e) la gomme efface le trait : il disparaît de ma partition", async ({ page }) => {
  const db = await ouvrirLouange(page, IRIS, {});
  const mot = (await boiteMot(page, MOT))!;
  await basculerAnnoter(page);
  await tracerSurLeMot(page, mot);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  await page.getByRole("button", { name: /^Gomme/ }).click();
  await tracerSurLeMot(page, mot);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(0);
  await basculerAnnoter(page);
  expect(await boitesTraits(page)).toEqual([]);
});

test.describe("(f) partition partagée", () => {
  const TRAIT = { ancre: { section: COUPLET, ligne: 0, car: CAR_MOT }, outil: "pen", couleur: "#dc2626", epaisseur: 0.12, points: [0, 0.6, 1, 0.6, 2, 0.6] };
  const docs = (sharedTraits: boolean) => ({
    [`users/${IRIS.uid}`]: profilDoc(IRIS),
    [`partitions/${IRIS.uid}__abba-pere`]: {
      ownerUid: IRIS.uid, ownerName: IRIS.planningName, base: ABBA, content: MON_ABBA, structure: null, key: null,
      traits: [TRAIT], sharedWith: [THEO.uid], sharedTraits, updatedAt: new Date("2026-11-02T10:00:00Z"),
    },
    [`partitions/${THEO.uid}__choix`]: { choices: { "abba-pere": IRIS.uid }, partageTout: [] },
  });
  for (const [partage, attendu] of [[false, 0], [true, 1]] as const) {
    test(`un destinataire ${partage ? "voit" : "ne voit pas"} les traits (sharedTraits ${partage})`, async ({ page }) => {
      await ouvrirLouange(page, THEO, docs(partage));
      await expect(onStage(page, "[data-section]").first()).toBeVisible();
      await expect(lu(page, "flottait").first(), "il lit bien la partition partagée").toBeVisible();
      await page.waitForTimeout(500);
      expect((await boitesTraits(page)).length).toBe(attendu);
    });
  }
});

test("(g) « Partition » dans « Je joue » change la partition lue", async ({ page }) => {
  const db = await ouvrirLouange(page, IRIS, {
    [`partitions/${IRIS.uid}__abba-pere`]: {
      ownerUid: IRIS.uid, ownerName: IRIS.planningName, base: ABBA, content: MON_ABBA, structure: null, key: null,
      traits: [], sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"),
    },
  });
  await expect(lu(page, "flottait").first(), "ma partition par défaut").toBeVisible();
  const menu = await ouvrirJeJoue(page);
  const groupe = menu.getByRole("radiogroup", { name: "Partition" });
  await expect(groupe.getByRole("radio", { name: "Ma partition" })).toHaveAttribute("aria-checked", "true");
  await groupe.getByRole("radio", { name: "Le chant d'origine" }).click();
  await expect.poll(() => db.doc(`partitions/${IRIS.uid}__choix`)).toMatchObject({ choices: { "abba-pere": "origine" } });
  await page.keyboard.press("Escape");
  await expect(lu(page, "planait").first()).toBeVisible();
  await expect(lu(page, "flottait")).toHaveCount(0);
});

test("(h) aucune animation à l'entrée du Crayon", async ({ page }) => {
  await ouvrirLouange(page, IRIS, {});
  await basculerAnnoter(page);
  const barre = page.locator("[data-crayon-barre]");
  await expect(barre).toBeVisible();
  const anime = await barre.evaluate((el) => {
    const c = getComputedStyle(el);
    return { transition: c.transitionDuration, animation: c.animationName, enfants: el.getAnimations({ subtree: true }).length };
  });
  expect(anime.transition).toBe("0s");
  expect(anime.animation).toBe("none");
  expect(anime.enfants, "aucune animation en cours").toBe(0);
});

const TRAIT_SEME = { ancre: { section: COUPLET, ligne: 0, car: CAR_MOT }, outil: "pen", couleur: "#dc2626", epaisseur: 0.12, points: [0, 0.6, 1, 0.6, 2, 0.6] };
const MA_PARTITION = (traits: unknown[] = []) => ({
  ownerUid: IRIS.uid, ownerName: IRIS.planningName, base: ABBA, content: MON_ABBA, structure: null, key: null,
  traits, sharedWith: [THEO.uid], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z"),
});

test("accords affichés ou masqués : le trait reste sur le même mot", async ({ page }) => {
  const docs = { [`partitions/${IRIS.uid}__abba-pere`]: MA_PARTITION([TRAIT_SEME]) };
  await ouvrirLouange(page, IRIS, docs);
  await expect.poll(async () => (await boitesTraits(page)).length).toBe(1);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, MOT))!);
  // Rôle sans accords (Présidence) : mêmes paroles, le caractère n° CAR_MOT est le même.
  await page.evaluate(() => localStorage.setItem("perf-role-preset", "presidence"));
  await page.reload();
  await entrer(page);
  await expect.poll(async () => (await boitesTraits(page)).length).toBe(1);
  surLeMot((await boitesTraits(page))[0], (await boiteMot(page, MOT))!);
});

test("lecture de ma partition lente : pas de Crayon pendant la lecture, puis le texte et le partage sont conservés", async ({ page }) => {
  const doc = `partitions/${IRIS.uid}__abba-pere`;
  const db = await ouvrirLouange(page, IRIS, { [doc]: MA_PARTITION() });
  // La lecture reste suspendue jusqu'à ce que le test la libère : pas de course avec la lenteur de la machine.
  // Posée après la session simulée (ses routes passent devant les précédentes), puis on recharge.
  let liberer!: () => void;
  const suspendue = new Promise<void>((r) => { liberer = r; });
  await page.route(/firestore\.googleapis\.com/, async (route) => {
    const tail = decodeURIComponent(new URL(route.request().url()).pathname.split("/documents")[1] ?? "").replace(/^\//, "");
    if (route.request().method() === "GET" && tail === doc) await suspendue;
    await route.fallback();
  });
  await page.reload();
  await entrer(page);
  const barre = page.locator("[data-performance-mode] [data-barre-haut]");
  if (page.viewportSize()!.width >= 768) {
    if (!(await barre.isVisible())) await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
    await expect(barre.getByRole("button", { name: "Crayon", exact: true }), "pas de Crayon tant que ma partition n'est pas lue").toHaveCount(0);
  }
  liberer();
  await expect(lu(page, "flottait").first(), "ma partition arrive").toBeVisible({ timeout: 15_000 });
  await basculerAnnoter(page);
  await tracerSurLeMot(page, (await boiteMot(page, MOT))!);
  await expect.poll(() => ecritesPartitions(db).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const ecrit = ecritesPartitions(db).at(-1)!.data;
  expect(ecrit.content, "texte retouché conservé").toBe(MON_ABBA);
  expect(ecrit.sharedWith, "partage conservé").toEqual([THEO.uid]);
  expect((ecrit.traits as unknown[]).length).toBe(1);
});
