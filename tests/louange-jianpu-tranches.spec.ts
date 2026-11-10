import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, fermerBarre, lireCompteur, onStage, ouvrirMenu } from "./helpers/louange";
import { bornesX, tranchesScan } from "../src/lib/performance/tranchesScan";

// Lot JP-B, tranche 1 (docs/spec-mode-louange-forscore-2.md) : un scan 简谱 certifié (`systemes.json`) se coupe
// entre deux lignes, une page d'écran par tranche, en une seule feuille large ; un scan non certifié garde
// l'affichage d'aujourd'hui. Aucun accès Firestore réel : tout est simulé (`signInAs`).

type Ligne = { y0: number; y1: number; barres: number[]; masques?: number[][] };
type Systemes = { version: number; chants: Record<string, { pages: { file: string; w: number; h: number; lignes: Ligne[] }[] }> };
const SYSTEMES = JSON.parse(readFileSync("public/jianpu/systemes.json", "utf8")) as Systemes;

const UN = "一生爱你"; // un scan d'une page, gravé en E
const DEUX = "为我而来"; // un scan de deux pages
const MASQUES = "大手牵着小手"; // lignes imbriquées : masques
const FR = "abba-pere"; // chant sans scan

const MUSICIEN: FakeProfile = {
  uid: "uid-tranches",
  email: "tranches@example.com",
  firstName: "Naomi",
  lastName: "Testeur",
  planningName: "Naomi T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

// Captures à l'échelle 1 : on les regarde, elles n'ont pas à peser des mégaoctets.
test.use({ deviceScaleFactor: 1 });

async function ouvrirLouange(
  page: Page,
  opts: { cles?: Record<string, string>; sombre?: boolean; chants?: string[]; zh?: boolean; surcharge?: Record<string, Record<string, unknown>> } = {},
) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(
    ([role, sombre, zh]) => {
      localStorage.setItem("perf-role-preset", role as string);
      if (sombre) localStorage.setItem("theme", "dark");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    },
    ["pianiste", !!opts.sombre, !!opts.zh],
  );
  const item = { showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" };
  const chants = opts.chants ?? [UN, DEUX, MASQUES, FR];
  await signInAs(page, MUSICIEN, {
    "setlists/setlist-tranches": {
      title: "Culte du 21 septembre", leader: "Léa Exemple", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: chants.map((slug, i) => ({
        ...item, songSlug: slug, position: i + 1, keyOverride: opts.cles?.[slug] ?? null, jianpuSheet: slug !== FR,
        ...opts.surcharge?.[slug],
      })),
    },
  }, "/setlists/setlist-tranches");
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/, 30_000);
  await page.locator("[data-performance-mode]").waitFor();
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
}

/** Attend que la pagination en tranches soit faite et stable (systemes.json arrivé, nombre de pages inchangé). */
async function attendreTranches(page: Page) {
  await expect(onStage(page, "[data-jianpu-tranche]").first()).toBeAttached({ timeout: 30_000 });
  let dernier = "";
  await expect(async () => {
    const lu = (await lireCompteur(page)).split("/")[1];
    const stable = lu === dernier;
    dernier = lu;
    expect(stable).toBe(true);
  }).toPass({ timeout: 15_000, intervals: [400] });
}

type Ecran = {
  titre: string;
  tranche: string | null;
  masques: number;
  /** Masques dans le groupe filtré, en % de la hauteur de page (style top / height). */
  masquesFiltre: { top: number; height: number }[];
  fenetre: { x: number; y: number; width: number; height: number } | null;
  pageW: number;
  labels: { c: string; x: number; y: number; right: number; bottom: number }[];
};

/** Ce que montre l'écran courant : le scan affiché (pas la copie de mesure, cachée par aria-hidden). */
async function lireEcran(page: Page): Promise<Ecran> {
  // `next dev` recharge parfois la page au premier passage d'une route (compilation) : on relit.
  for (let essai = 0; ; essai++) {
    try {
      return await lireEcranUneFois(page);
    } catch (e) {
      if (essai >= 2 || !/context was destroyed/.test(String(e))) throw e;
      await page.waitForTimeout(500);
    }
  }
}

async function lireEcranUneFois(page: Page): Promise<Ecran> {
  return page.evaluate(() => {
    const f = Array.from(document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-jianpu-fenetre]")).find(
      (e) => !e.closest("[aria-hidden=true]"),
    );
    // Une tranche certifiée n'a plus d'en-tête d'une ligne (la tête de feuille ne répète pas le titre) : il est dans la barre de titre.
    const titre =
      document.querySelector("[data-performance-mode] [data-entete-scan]:not([aria-hidden=true] *) h2")?.textContent ??
      document.querySelector("[data-performance-mode] [data-barre-haut] p")?.textContent ??
      "";
    if (!f) return { titre, tranche: null, masques: 0, masquesFiltre: [], fenetre: null, pageW: 0, labels: [] };
    const r = f.getBoundingClientRect();
    const labels = Array.from(f.querySelectorAll<HTMLElement>("[data-jianpu-label]"))
      .filter((l) => (l.textContent ?? "").trim() !== "" && l.getAttribute("data-jianpu-opt") !== "hidden")
      .map((l) => {
        const b = l.getBoundingClientRect();
        return { c: l.textContent ?? "", x: b.x, y: b.y, right: b.right, bottom: b.bottom };
      });
    return {
      titre,
      tranche: f.getAttribute("data-jianpu-tranche"),
      masques: f.querySelectorAll("[data-jianpu-masque]").length,
      masquesFiltre: Array.from(f.querySelectorAll<HTMLElement>("[data-jianpu-filtre] [data-jianpu-masque]")).map((m) => ({
        top: parseFloat(m.style.top),
        height: parseFloat(m.style.height),
      })),
      fenetre: { x: r.x, y: r.y, width: r.width, height: r.height },
      pageW: f.querySelector<HTMLElement>("[data-jianpu-page]")!.getBoundingClientRect().width,
      labels,
    };
  });
}

/** Parcourt toutes les pages de la setlist (flèche droite) et rend ce que chacune montre. */
async function parcourir(page: Page, capture?: (n: number, e: Ecran) => Promise<void>): Promise<Ecran[]> {
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const out: Ecran[] = [];
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    // Le scan (image et fenêtre) est rendu dès le changement de page ; on laisse l'image se poser.
    await page.waitForTimeout(150);
    const e = await lireEcran(page);
    out.push(e);
    await capture?.(n, e);
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  return out;
}

const tranchesDe = (ecrans: Ecran[], titre: string) => ecrans.filter((e) => e.titre === titre && e.tranche).map((e) => e.tranche!);
const bornes = (t: string) => t.split("-").map(Number) as [number, number];

// ─── (a) tranchesScan, pur ──────────────────────────────────────────────────

test.describe("tranchesScan (pur)", () => {
  // Cinq lignes de 100 px image, 20 px d'écart, page de 700 px.
  const lignes = [0, 1, 2, 3, 4].map((k) => ({ y0: 20 + k * 120, y1: 119 + k * 120 }));

  test("empile des lignes entières et coupe entre deux lignes, jamais au milieu", () => {
    // Échelle 1 : 2 lignes + marges = 100 + 20 + 100 + 20 = 240 ; trois lignes = 360.
    const t = tranchesScan(lignes, 700, 1000, 1000, 300);
    expect(t.map((x) => [x.premiere, x.derniere])).toEqual([[0, 1], [2, 3], [4, 4]]);
    for (const x of t) {
      expect(x.y0).toBeLessThanOrEqual(lignes[x.premiere].y0);
      expect(x.y1).toBeGreaterThanOrEqual(lignes[x.derniere].y1);
      expect((x.y1 - x.y0) * 1).toBeLessThanOrEqual(300);
    }
    // Aucune ligne n'est coupée : une tranche ne recouvre aucune ligne voisine d'une autre tranche.
    for (let k = 1; k < t.length; k++) expect(t[k].y0).toBeGreaterThanOrEqual(lignes[t[k - 1].derniere].y1);
  });

  test("tout tient : une seule tranche ; l'échelle vient de la largeur, on ne rapetisse jamais", () => {
    expect(tranchesScan(lignes, 700, 1000, 1000, 10_000)).toHaveLength(1);
    // Feuille deux fois plus large que l'encre : l'échelle double, les tranches raccourcissent.
    const t = tranchesScan(lignes, 700, 500, 1000, 300);
    expect(t.map((x) => x.derniere - x.premiere + 1)).toEqual([1, 1, 1, 1, 1]);
  });

  test("une ligne plus haute que l'écran fait sa tranche seule", () => {
    const t = tranchesScan(lignes, 700, 1000, 1000, 50);
    expect(t).toHaveLength(5);
    expect(t.every((x) => x.premiere === x.derniere)).toBe(true);
  });

  test("marges : au plus 12 px, la moitié de l'écart, 0 quand les lignes se chevauchent", () => {
    const [seule] = tranchesScan([{ y0: 60, y1: 160 }], 700, 1000, 1000, 1000);
    expect(seule.y0).toBe(48); // 60 px au-dessus (bord de page) : plafonné à 12
    const proches = [{ y0: 100, y1: 200 }, { y0: 210, y1: 300 }]; // écart 10 : 5 px de chaque côté
    const [a, b] = tranchesScan(proches, 400, 1000, 1000, 120);
    expect(a.y1).toBe(205);
    expect(b.y0).toBe(205);
    const chevauchent = [{ y0: 100, y1: 200 }, { y0: 190, y1: 300 }];
    const [c, d] = tranchesScan(chevauchent, 400, 1000, 1000, 120);
    expect(c.y1).toBe(200);
    expect(d.y0).toBe(190);
  });

  test("la dernière tranche garde la place de « Ensuite »", () => {
    expect(tranchesScan(lignes, 700, 1000, 1000, 620)).toHaveLength(1);
    expect(tranchesScan(lignes, 700, 1000, 1000, 620, 100)).toHaveLength(2);
  });

  test("bornesX : l'encre plus 16 px d'air, dans la page", () => {
    expect(bornesX(1377, [30, 20])).toEqual({ x0: 14, x1: 1377 - 20 + 16 });
    expect(bornesX(1377, [5, 5])).toEqual({ x0: 0, x1: 1377 });
    expect(bornesX(1377, undefined)).toEqual({ x0: 0, x1: 1377 });
  });
});

// ─── (b) le scan occupe plusieurs écrans ────────────────────────────────────

test("un scan certifié se coupe entre deux lignes : un écran par tranche, contiguës, la suivante commence à la ligne suivante", async ({ page }, info) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page);
  await attendreTranches(page);
  await fermerBarre(page);
  const ecrans = await parcourir(page);
  const lignes = SYSTEMES.chants[UN].pages[0].lignes;
  const t = tranchesDe(ecrans, UN).map(bornes);
  if (page.viewportSize()!.width >= 700) expect(t.length, "ne tient pas sur un écran").toBeGreaterThan(1);
  expect(t.length).toBeGreaterThanOrEqual(1);
  // Lignes entières contenues dans chaque tranche : elles se suivent, sans trou ni doublon.
  let prochaine = 0;
  for (const [y0, y1] of t) {
    const dedans = lignes.map((l, k) => [k, l] as const).filter(([, l]) => l.y0 >= y0 && l.y1 <= y1).map(([k]) => k);
    expect(dedans.length, `tranche ${y0}-${y1} contient au moins une ligne`).toBeGreaterThan(0);
    expect(dedans[0], "la page suivante commence à la ligne suivante").toBe(prochaine);
    expect(dedans.at(-1)! - dedans[0] + 1, "lignes consécutives").toBe(dedans.length);
    prochaine = dedans.at(-1)! + 1;
    // Aucune ligne n'est coupée : celles qui touchent la tranche y sont entières.
    for (const l of lignes) if (l.y1 > y0 && l.y0 < y1 && !(l.y0 >= y0 && l.y1 <= y1)) {
      // Seule une ligne qui chevauche sa voisine (m = 0) peut dépasser, jamais de plus de son recouvrement.
      const voisine = lignes.find((v) => v !== l && v.y0 >= y0 && v.y1 <= y1 && v.y0 < l.y1 && l.y0 < v.y1);
      expect(voisine, `ligne ${l.y0}-${l.y1} coupée par ${y0}-${y1}`).toBeTruthy();
    }
  }
  expect(prochaine, "toutes les lignes sont montrées").toBe(lignes.length);
  expect(t.length).toBeGreaterThanOrEqual(1);
  // Le scan de deux pages : chaque page se coupe aussi.
  expect(tranchesDe(ecrans, DEUX).length).toBeGreaterThanOrEqual(2);
  // Le chant sans scan n'a aucune tranche.
  expect(ecrans.some((e) => e.titre !== UN && e.titre !== DEUX && e.titre !== MASQUES && e.tranche)).toBe(false);
  info.annotations.push({ type: "tranches", description: `${UN} : ${t.length}` });
});

// ─── (c) taille de lecture ──────────────────────────────────────────────────

test("taille de lecture (tablette portrait, tablette paysage, ordinateur) : un chiffre fait au moins 17 px à l'œil — au téléphone en portrait, pas d'exigence (JP-C)", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(page.viewportSize()!.width < 700, "téléphone en portrait : JP-C");
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendreTranches(page);
  const { w } = SYSTEMES.chants[UN].pages[0];
  const e = await lireEcran(page);
  const chiffre = 36 * (e.pageW / w);
  expect(chiffre, `chiffre de ${chiffre.toFixed(1)} px`).toBeGreaterThanOrEqual(17);
  // Une seule feuille : pas de colonne de structure à gauche, même en paysage.
  await expect(page.locator("[data-performance-mode] [data-colonne-scan]")).toHaveCount(0);
  // Pleine largeur de la zone de page, bornée à 1 040 px.
  const vw = page.viewportSize()!.width;
  expect(e.fenetre!.width).toBeLessThanOrEqual(1040 + 0.5);
  expect(e.fenetre!.width).toBeGreaterThanOrEqual(Math.min(1040, vw - 8) - 24);
});

// ─── (d) clés d'annotation ──────────────────────────────────────────────────

test("deux tranches d'un même scan ont deux clés j4-<y0> distinctes", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(page.viewportSize()!.width < 700, "téléphone : le scan peut tenir en une tranche");
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
    if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
  });
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendreTranches(page);
  await expect.poll(() => lues.at(-1) ?? "").toMatch(/j4-\d+$/);
  const premiere = lues.at(-1)!;
  const t0 = bornes((await lireEcran(page)).tranche!)[0];
  expect(premiere).toMatch(new RegExp(`j4-${t0}$`));
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lues.at(-1)).not.toBe(premiere);
  const seconde = lues.at(-1)!;
  const t1 = bornes((await lireEcran(page)).tranche!)[0];
  expect(t1).not.toBe(t0);
  expect(seconde).toMatch(new RegExp(`j4-${t1}$`));
});

// ─── (e) scan non certifié : l'affichage d'aujourd'hui ──────────────────────

for (const cas of [
  { nom: "systemes.json sans le chant", repondre: (route: import("@playwright/test").Route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"version":1,"chants":{}}' }) },
  { nom: "systemes.json en 404", repondre: (route: import("@playwright/test").Route) => route.fulfill({ status: 404, body: "" }) },
]) {
  test.describe(`non certifié (${cas.nom})`, () => {
    test.use({ serviceWorkers: "block" });
    test("une page de scan par page d'écran, sans tranche, clé j2 / j3", async ({ page }) => {
      test.setTimeout(90_000);
      const lues: string[] = [];
      page.on("request", (r) => {
        const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
        if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
      });
      await page.route("**/jianpu/systemes.json", cas.repondre);
      await ouvrirLouange(page, { chants: [UN] });
      await expect(onStage(page, "[data-jianpu-fenetre]")).toHaveCount(1, { timeout: 30_000 });
      await expect(onStage(page, "[data-jianpu-tranche]")).toHaveCount(0);
      // Le scan est une seule page d'écran.
      await expect.poll(() => lireCompteur(page)).toMatch(/\/ 1$/);
      const grand = await page.evaluate(() =>
        matchMedia("(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)").matches);
      await expect.poll(() => lues.at(-1) ?? "").toMatch(grand ? /j3$/ : /j2$/);
      // Paysage grand écran : la colonne de structure d'aujourd'hui.
      await expect(page.locator("[data-performance-mode] [data-colonne-scan]:not([aria-hidden=true] *)")).toHaveCount(grand ? 1 : 0);
    });
  });
}

// ─── (f) masques ────────────────────────────────────────────────────────────

const ROYAUME = "荣耀至高神"; // masques entre lignes voisines

/** Les masques d'une tranche, en y image : [y0, y1] (page de hauteur `h`). */
const masquesY = (e: Ecran, h: number) => e.masquesFiltre.map((m) => [(m.top / 100) * h, ((m.top + m.height) / 100) * h] as const);

test("masques (大手牵着小手, 荣耀至高神) : dans le groupe filtré, seulement pour une voisine hors tranche", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [MASQUES, ROYAUME, FR] });
  await attendreTranches(page);
  await fermerBarre(page);
  const page0 = (titre: string) => SYSTEMES.chants[titre].pages[0];
  const lignes = page0(MASQUES).lignes;
  expect(lignes[2].masques?.length).toBeGreaterThan(0);
  const ecrans = await parcourir(page);
  // Tous les masques rendus sont dans le groupe filtré (le filtre les rend transparents).
  for (const e of ecrans) expect(e.masquesFiltre.length, "masques dans [data-jianpu-filtre]").toBe(e.masques);
  // Deux lignes voisines qui se chevauchent (bande y commune) : dans une tranche qui a les deux, aucun masque dans
  // cette bande (il effacerait l'encre de l'une pour cacher celle de l'autre, qui est là) ; dans une tranche qui n'a
  // que l'une des deux, le masque cache le débord de l'autre.
  const verifierPaires = (titre: string, paires: number[][]) => {
    const { lignes: ls, h } = page0(titre);
    const ts = ecrans.filter((e) => e.titre === titre && e.tranche);
    const a = (e: Ecran, k: number) => {
      const [y0, y1] = bornes(e.tranche!);
      return ls[k].y0 >= y0 && ls[k].y1 <= y1;
    };
    let separees = 0;
    for (const [p, q] of paires) {
      const bande = [Math.max(ls[p].y0, ls[q].y0), Math.min(ls[p].y1, ls[q].y1)];
      for (const e of ts) {
        if (a(e, p) && a(e, q)) {
          for (const [b, d] of masquesY(e, h)) {
            expect(b >= bande[0] - 1 && d <= bande[1] + 1, `${titre} : masque ${Math.round(b)}-${Math.round(d)} dans la bande ${bande.join("-")} des lignes ${p} et ${q} réunies`).toBe(false);
          }
        } else if (a(e, p) || a(e, q)) {
          separees++;
          expect(e.masques, `${titre} : tranche ${e.tranche}, ligne ${a(e, p) ? p : q} sans sa voisine : elle porte un masque`).toBeGreaterThan(0);
        }
      }
    }
    return separees;
  };
  verifierPaires(MASQUES, [[1, 2], [3, 4], [4, 5]]);
  // 荣耀至高神 : paires (0, 1) et (3, 4).
  verifierPaires(ROYAUME, [[0, 1], [3, 4]]);
  // Un scan sans masque n'en porte pas.
  const sans = SYSTEMES.chants[UN].pages[0].lignes.every((l) => !l.masques);
  expect(sans).toBe(true);
});

// ─── (g) transposition : le calque reste dans la fenêtre ────────────────────

test("transposé (G) : les étiquettes visibles d'une tranche tiennent dans sa fenêtre", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(page.viewportSize()!.width < 700, "téléphone : couvert par les autres appareils, le scan y est trop petit pour mesurer");
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "G" } });
  await attendreTranches(page);
  await fermerBarre(page);
  const ecrans = await parcourir(page);
  let vues = 0;
  for (const e of ecrans.filter((x) => x.titre === UN && x.tranche)) {
    const f = e.fenetre!;
    for (const l of e.labels) {
      const cx = (l.x + l.right) / 2;
      const cy = (l.y + l.bottom) / 2;
      if (cx < f.x || cx > f.x + f.width || cy < f.y || cy > f.y + f.height) continue; // hors tranche : coupé par la fenêtre
      vues++;
      expect(l.x, `${l.c} : bord gauche`).toBeGreaterThanOrEqual(f.x - 1.5);
      expect(l.right, `${l.c} : bord droit`).toBeLessThanOrEqual(f.x + f.width + 1.5);
      expect(l.y, `${l.c} : haut`).toBeGreaterThanOrEqual(f.y - 1.5);
      expect(l.bottom, `${l.c} : bas`).toBeLessThanOrEqual(f.y + f.height + 1.5);
    }
  }
  expect(vues, "des accords transposés sont visibles").toBeGreaterThan(0);
});

// ─── Captures : un écran de scan par projet, clair et sombre ────────────────

for (const sombre of [false, true]) {
  test(`capture d'un écran de scan, ${sombre ? "sombre" : "clair"}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await ouvrirLouange(page, { sombre, chants: [UN, FR], cles: { [UN]: "G" } });
    await attendreTranches(page);
    await fermerBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/jp-b1-${info.project.name}-${sombre ? "sombre" : "clair"}.png` });
    // Seconde tranche, quand il y en a une.
    if ((await page.locator("[data-curseur-page] input[type=range]").count()) > 0) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/jp-b1-${info.project.name}-${sombre ? "sombre" : "clair"}-2.png` });
    }
  });
}

// Masques de 大手牵着小手 et 荣耀至高神 : l'encre de la ligne voisine ne déborde pas (à regarder).
test("capture des tranches à masques (大手牵着小手)", async ({ page }, info) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [MASQUES, FR] });
  await attendreTranches(page);
  await fermerBarre(page);
  await parcourir(page, async (n, e) => {
    if (e.titre === MASQUES && e.masques > 0) await page.screenshot({ path: `test-results/jp-b1-${info.project.name}-masques-${n}.png` });
  });
});


// ─── Tranche 2 : tête de feuille, feuille de route allumée, menu Repères ────

const SECTIONS = JSON.parse(readFileSync("public/jianpu/sections.json", "utf8")) as {
  chants: Record<string, { sections: { id: string; page: number; ligne: number; anacrouse: boolean }[] }>;
};
/** Une Dernière phrase et deux refrains de suite (« R ×2 ») ajoutés à 一生爱你 : de quoi voir « ×2 » et un Dp. */
const UN_CHO = readFileSync(`content/songs/${UN}.cho`, "utf8");
const UN_DP = {
  contentOverride: `${UN_CHO.trimEnd()}\n\n{start_of_Dp: Dernière phrase – R}\n[E]你的爱 [A]永远\n{end_of_Dp}\n`,
  structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "chorus-3-3", "Dp-4-4"],
};

type Tete = { present: boolean; hauteur: number; barre: number; barreBas: number; fenetreHaut: number; repereTexte: string[]; allumes: string[]; cle: string; grave: string };

/** Ce que montrent la tête de feuille, la barre de titre et la fenêtre du scan affichés. */
async function lireTete(page: Page): Promise<Tete> {
  return page.evaluate(() => {
    const sel = "[data-performance-mode] [data-tete-feuille]";
    const t = Array.from(document.querySelectorAll<HTMLElement>(sel)).find((e) => !e.closest("[aria-hidden=true]"));
    const b = document.querySelector<HTMLElement>("[data-performance-mode] [data-barre-haut]")!.getBoundingClientRect();
    const f = Array.from(document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-jianpu-fenetre]")).find((e) => !e.closest("[aria-hidden=true]"));
    const reperes = t ? Array.from(t.querySelectorAll<HTMLElement>("[data-repere-tete]")) : [];
    return {
      present: !!t,
      hauteur: t ? t.getBoundingClientRect().height : 0,
      barre: b.height,
      barreBas: b.bottom,
      fenetreHaut: f ? f.getBoundingClientRect().top : 0,
      repereTexte: reperes.map((r) => (r.textContent ?? "").trim()),
      allumes: reperes.filter((r) => r.hasAttribute("data-allume")).map((r) => r.getAttribute("title") ?? ""),
      cle: t?.querySelector("[data-cle-tete]")?.textContent ?? "",
      grave: t?.querySelector("[data-grave-en]")?.textContent ?? "",
    };
  });
}

/** Revient au premier écran (flèche gauche : « Home » ne tourne pas les pages). */
async function premierEcran(page: Page) {
  const [, total] = (await lireCompteur(page)).split(" / ").map(Number);
  for (let k = Number((await lireCompteur(page)).split(" / ")[0]); k > 1; k--) await page.keyboard.press("ArrowLeft");
  await attendreCompteur(page, `1 / ${total}`);
}

/** Rouvre la barre de titre (un toucher au centre la montre ou la cache). */
async function ouvrirBarre(page: Page) {
  if ((await page.locator("[data-barre-ouverte]").count()) === 0) {
    const ecran = page.viewportSize()!;
    await page.mouse.click(ecran.width / 2, ecran.height / 2);
    await expect(page.locator("[data-barre-ouverte]")).toHaveCount(1);
  }
}

test("tête de feuille : sur chaque écran certifié, de la hauteur de la barre ; ouverte, la barre ne recouvre pas la première ligne", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [UN, DEUX, FR] });
  await attendreTranches(page);
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    const e = await lireEcran(page);
    const t = await lireTete(page);
    if (e.tranche) {
      expect(t.present, `écran ${n} : tête de feuille`).toBe(true);
      expect(Math.abs(t.hauteur - t.barre), `écran ${n} : tête ${t.hauteur} px, barre ${t.barre} px`).toBeLessThanOrEqual(1);
      expect(t.fenetreHaut, `écran ${n} : le scan commence sous la tête`).toBeGreaterThanOrEqual(t.barre - 1);
    } else {
      expect(t.present, `écran ${n} : pas de tête sur un chant sans scan`).toBe(false);
    }
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  // Barre ouverte : son bas ne passe pas sur la fenêtre du scan, sur le premier écran comme sur un autre.
  for (const n of [1, total >= 3 ? 2 : 1]) {
    await premierEcran(page);
    if (n > 1) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await ouvrirBarre(page);
    const t = await lireTete(page);
    expect(t.barreBas, "bas de la barre ouverte ≤ haut de la fenêtre + 1 px").toBeLessThanOrEqual(t.fenetreHaut + 1);
    await fermerBarre(page);
  }
});

test("tête de feuille : « 1 = F » et « gravé en E » quand le scan est transposé, en français et en 中文", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" } });
  await attendreTranches(page);
  const t = await lireTete(page);
  expect(t.cle).toBe("1 = F");
  expect(t.grave).toBe("gravé en E");
});

test("tête de feuille, interface en 中文 : « 原谱 E 调 »", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" }, zh: true });
  await attendreTranches(page);
  const t = await lireTete(page);
  expect(t.cle).toBe("1 = F");
  expect(t.grave).toBe("原谱 E 调");
});

test("tête de feuille : pas de « gravé en » quand la tonalité est celle du scan ; « ×2 » dans le repère, Dp en tirets", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], surcharge: { [UN]: UN_DP } });
  await attendreTranches(page);
  const t = await lireTete(page);
  expect(t.cle).toBe("1 = E");
  expect(t.grave).toBe("");
  const tete = onStage(page, "[data-tete-feuille]");
  await expect(tete.locator("[data-repeat]")).toHaveText("×2");
  // « ×2 » est écrit dans le cadre du repère, à l'encre (couleur du texte, pas celle de la section).
  const repeat = tete.locator("[data-repere-tete]", { has: page.locator("[data-repeat]") });
  await expect(repeat).toHaveCount(1);
  expect(await repeat.evaluate((r) => getComputedStyle(r.querySelector("[data-repeat]")!).color === getComputedStyle(r).color)).toBe(true);
  const dp = tete.locator("[data-repere-tete][data-dp]");
  await expect(dp).toHaveCount(1);
  await expect(dp).toHaveCSS("border-top-style", "dashed");
  await expect(dp).toHaveText("Dp");
  // La rangée ne passe jamais à la ligne : la tête garde la hauteur de la barre.
  const h = await lireTete(page);
  expect(Math.abs(h.hauteur - h.barre)).toBeLessThanOrEqual(1);
});

/** Début (ligne 1-based) de chaque section de 一生爱你, anacrouse comprise : la règle de `sections.json`. */
const debuts = () => SECTIONS.chants[UN].sections.map((s) => ({ ...s, debut: s.anacrouse && s.ligne > 1 ? s.ligne - 1 : s.ligne }));

test("feuille de route allumée : les repères des sections présentes sur l'écran, d'après sections.json", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendreTranches(page);
  await fermerBarre(page);
  const lignes = SYSTEMES.chants[UN].pages[0].lignes;
  const sections = debuts();
  const ecrans: { tranche: [number, number]; allumes: string[] }[] = [];
  const total = Number((await lireCompteur(page)).split("/")[1]);
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    const e = await lireEcran(page);
    if (e.tranche) ecrans.push({ tranche: bornes(e.tranche), allumes: (await lireTete(page)).allumes });
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  expect(ecrans.length).toBeGreaterThanOrEqual(1);
  const motif = { intro: /Intro|前奏/, verse: /Couplet|主歌/, chorus: /Refrain|副歌/ };
  const allumeSur = (e: (typeof ecrans)[number], re: RegExp) => e.allumes.some((a) => re.test(a));
  for (const e of ecrans) {
    // Lignes (1-based) de la tranche, puis les sections dont l'intervalle [début, début suivant) les touche.
    const dans = lignes.flatMap((l, k) => (l.y0 >= e.tranche[0] && l.y1 <= e.tranche[1] ? [k + 1] : []));
    const [a, b] = [dans[0], dans.at(-1)!];
    for (const [id, re] of [["intro-1", motif.intro], ["verse-2", motif.verse], ["chorus-3", motif.chorus]] as const) {
      const k = sections.findIndex((s) => s.id === id);
      const fin = sections[k + 1]?.debut ?? Infinity;
      expect(allumeSur(e, re), `${id} sur la tranche des lignes ${a}-${b}`).toBe(sections[k].debut <= b && fin > a);
    }
  }
  // L'écran de la dernière ligne allume le refrain ; celui des premières lignes, l'intro.
  expect(allumeSur(ecrans.at(-1)!, motif.chorus)).toBe(true);
  expect(allumeSur(ecrans[0], motif.intro)).toBe(true);
});

test("menu Repères d'un scan certifié : toucher une section saute à l'écran qui contient sa ligne de début", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendreTranches(page);
  await fermerBarre(page);
  const lignes = SYSTEMES.chants[UN].pages[0].lignes;
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const tranches: [number, number][] = [];
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(100);
    const e = await lireEcran(page);
    if (e.tranche) tranches.push(bornes(e.tranche));
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  const refrain = debuts().find((s) => s.id === "chorus-3")!;
  const attendu = tranches.findIndex(([y0, y1]) => {
    const dans = lignes.flatMap((l, k) => (l.y0 >= y0 && l.y1 <= y1 ? [k + 1] : []));
    return dans[0] <= refrain.debut && refrain.debut <= dans.at(-1)!;
  });
  expect(attendu).toBeGreaterThanOrEqual(0);
  await premierEcran(page);
  const menu = await ouvrirMenu(page, "reperes");
  await menu.getByRole("button", { name: /Refrain|副歌/ }).click();
  await attendreCompteur(page, `${attendu + 1} / ${total}`);
  await expect.poll(async () => (await lireEcran(page)).tranche, { timeout: 10_000 }).toBe(tranches[attendu].join("-"));
});

// Captures de la tranche 2 (à regarder) : tête de feuille, barre fermée puis ouverte.
const VUES = [
  { nom: "clair", opts: {} },
  { nom: "sombre", opts: { sombre: true } },
  { nom: "zh", opts: { zh: true, cles: { [UN]: "F" } } },
  { nom: "transpose", opts: { cles: { [UN]: "F" }, surcharge: { [UN]: UN_DP } } },
];
for (const v of VUES) {
  test(`capture JP-B2 de la tête de feuille, ${v.nom}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await ouvrirLouange(page, { chants: [UN, FR], ...v.opts });
    await attendreTranches(page);
    await fermerBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/jp-b2-${info.project.name}-${v.nom}.png` });
    await ouvrirBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/jp-b2-${info.project.name}-${v.nom}-barre.png` });
  });
}
