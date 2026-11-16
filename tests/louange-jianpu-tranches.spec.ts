import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, fermerBarre, lireCompteur, onStage, ouvrirMenu } from "./helpers/louange";

// Lot CL, CL-1 (docs/spec-corrections-louange.md) : une page de partition 简谱 tient entière sur une page d'écran
// (rendu `fit`, sans tranche), à toutes les tailles ; l'interrupteur « 2 colonnes » ne vaut que pour les chants en texte.
// (Ex-lot JP-B : la découpe en tranches est retirée.) Aucun accès Firestore réel : tout est simulé (`signInAs`).

type Ligne = { y0: number; y1: number; barres: number[]; masques?: number[][] };
type Systemes = { version: number; chants: Record<string, { pages: { file: string; w: number; h: number; lignes: Ligne[] }[] }> };
const SYSTEMES = JSON.parse(readFileSync("public/jianpu/systemes.json", "utf8")) as Systemes;

const UN = "一生爱你"; // un scan d'une page, gravé en E
const UNE = "恒久恒久以前"; // un scan d'une page
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
  const db = await signInAs(page, MUSICIEN, {
    "setlists/setlist-tranches": {
      title: "Culte du 21 septembre", leader: "Léa Exemple", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: chants.map((slug, i) => ({
        ...item, songSlug: slug, position: i + 1, keyOverride: opts.cles?.[slug] ?? null, jianpuSheet: slug !== FR,
        ...opts.surcharge?.[slug],
      })),
    },
  }, "/setlists/setlist-tranches");
  await lancerLouange(page);
  return db;
}

async function lancerLouange(page: Page) {
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/, 30_000);
  await page.locator("[data-performance-mode]").waitFor();
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
}

/** Attend que la pagination soit faite et stable (systemes.json arrivé, nombre de pages inchangé). */
async function attendrePages(page: Page) {
  await expect(onStage(page, "[data-jianpu-fenetre]").first()).toBeAttached({ timeout: 30_000 });
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
    const titre =
      document.querySelector("[data-performance-mode] [data-entete-scan]:not([aria-hidden=true] *) h2")?.textContent ??
      document.querySelector("[data-performance-mode] [data-barre-haut] p")?.textContent ??
      "";
    if (!f) return { titre, masques: 0, masquesFiltre: [], fenetre: null, pageW: 0, labels: [] };
    const r = f.getBoundingClientRect();
    const labels = Array.from(f.querySelectorAll<HTMLElement>("[data-jianpu-label]"))
      .filter((l) => (l.textContent ?? "").trim() !== "" && l.getAttribute("data-jianpu-opt") !== "hidden")
      .map((l) => {
        const b = l.getBoundingClientRect();
        return { c: l.textContent ?? "", x: b.x, y: b.y, right: b.right, bottom: b.bottom };
      });
    return {
      titre,
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


const SECTIONS = JSON.parse(readFileSync("public/jianpu/sections.json", "utf8")) as {
  chants: Record<string, { sections: { id: string; page: number; ligne: number; anacrouse: boolean }[] }>;
};

// ─── Géométrie de la page entière ───────────────────────────────────────────

type R = { x: number; y: number; right: number; bottom: number };
type Geo = {
  page: number;
  nbFenetres: number;
  tranche: string | null;
  cle: string;
  fen: R;
  pageR: R;
  filtre: R;
  calque: R | null;
  barreBas: number;
  suivants: R[];
  innerH: number;
  innerW: number;
};

/** Ce que mesure l'écran courant : fenêtre, page, groupe filtré, calque, barre du haut, pastilles « Ensuite ». `null` : pas de scan. */
async function lireGeo(page: Page): Promise<Geo | null> {
  return page.evaluate(() => {
    const vu = (e: Element) => !e.closest("[aria-hidden=true]");
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
    const fs = Array.from(document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-jianpu-fenetre]")).filter(vu);
    if (fs.length === 0) return null;
    const f = fs[0];
    const pg = f.querySelector<HTMLElement>("[data-jianpu-page]")!;
    return {
      page: Number(pg.getAttribute("data-jianpu-page")),
      nbFenetres: fs.length,
      tranche: f.getAttribute("data-jianpu-tranche"),
      cle: document.querySelector("[data-performance-mode]")!.getAttribute("data-cle-page") ?? "",
      fen: rect(f),
      pageR: rect(pg),
      filtre: rect(f.querySelector("[data-jianpu-filtre]")!),
      calque: ((c) => (c ? rect(c) : null))(f.querySelector("[data-jianpu-calque]")),
      barreBas: document.querySelector("[data-performance-mode] [data-barre-haut]")!.getBoundingClientRect().bottom,
      suivants: Array.from(document.querySelectorAll("[data-performance-mode] [data-suivant]")).filter(vu).map(rect),
      innerH: innerHeight,
      innerW: innerWidth,
    };
  });
}

/** Parcourt toutes les pages d'écran et rend la géométrie de chacune (`null` : sans scan). */
async function parcourirGeo(page: Page): Promise<(Geo | null)[]> {
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const out: (Geo | null)[] = [];
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(200);
    out.push(await lireGeo(page));
    if (n < total) await page.keyboard.press("ArrowRight");
  }
  return out;
}

const chevauche = (a: R, b: R) => a.x < b.right - 1 && b.x < a.right - 1 && a.y < b.bottom - 1 && b.y < a.bottom - 1;

// ─── La page entière ────────────────────────────────────────────────────────

test("la page entière tient dans l'écran : 恒久恒久以前 (une page) et 为我而来 (deux pages), sans tranche, aucune ligne coupée, calque calé sur l'image", async ({ page }) => {
  test.setTimeout(150_000);
  await ouvrirLouange(page, { chants: [UNE, DEUX, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const geos = (await parcourirGeo(page)).filter((g): g is Geo => !!g);
  expect(geos.length, "une page d'écran par page de partition : 1 + 2").toBe(1 + SYSTEMES.chants[DEUX].pages.length);
  const pages = [...SYSTEMES.chants[UNE].pages, ...SYSTEMES.chants[DEUX].pages];
  geos.forEach((g, n) => {
    expect(g.nbFenetres, `écran ${n + 1} : une seule fenêtre`).toBe(1);
    expect(g.tranche, `écran ${n + 1} : sans tranche`).toBeNull();
    expect(g.cle, `écran ${n + 1} : clé de la page entière`).toMatch(/j[23]$/);
    // Entier dans le viewport.
    expect(g.fen.x).toBeGreaterThanOrEqual(-0.5);
    expect(g.fen.y).toBeGreaterThanOrEqual(-0.5);
    expect(g.fen.right).toBeLessThanOrEqual(g.innerW + 0.5);
    expect(g.fen.bottom, `écran ${n + 1} : au-dessus du bas de l'écran`).toBeLessThanOrEqual(g.innerH + 0.5);
    // Sous la barre du haut, au-dessus de la pastille « Ensuite ».
    expect(g.fen.y, `écran ${n + 1} : sous la barre du haut`).toBeGreaterThanOrEqual(Math.min(g.barreBas, g.fen.bottom) - 1);
    for (const s of g.suivants) expect(chevauche(g.fen, s), `écran ${n + 1} : la pastille ne recouvre pas le scan`).toBe(false);
    // Calque calé sur l'image (à 1,5 px près).
    // Le calque n'est rendu que sur un chant transposé (première page) : ici, calé s'il est là ; le test « transposé (G) » le vérifie.
    if (g.calque) for (const k of ["x", "y", "right", "bottom"] as const) expect(Math.abs(g.calque[k] - g.filtre[k]), `écran ${n + 1} : calque ${k}`).toBeLessThanOrEqual(1.5);
    // Aucune ligne coupée : chaque ligne de systemes.json est dans la fenêtre.
    const p = pages[n];
    const echelle = (g.pageR.bottom - g.pageR.y) / p.h;
    for (const [k, l] of p.lignes.entries()) {
      expect(g.pageR.y + l.y0 * echelle, `écran ${n + 1}, ligne ${k + 1} : haut`).toBeGreaterThanOrEqual(g.fen.y - 1.5);
      expect(g.pageR.y + l.y1 * echelle, `écran ${n + 1}, ligne ${k + 1} : bas`).toBeLessThanOrEqual(g.fen.bottom + 1.5);
    }
  });
});

// ─── Clés d'annotation ──────────────────────────────────────────────────────

test("chaque page de scan a sa clé de page entière j2 / j3, jamais une clé de tranche", async ({ page }) => {
  test.setTimeout(90_000);
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
    if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
  });
  await ouvrirLouange(page, { chants: [UN, DEUX, FR] });
  await attendrePages(page);
  const geos = (await parcourirGeo(page)).filter((g): g is Geo => !!g);
  expect(geos.length).toBeGreaterThanOrEqual(3);
  for (const g of geos) expect(g.cle).toMatch(/j[23]$/);
  expect(new Set(geos.map((g) => g.cle)).size, "deux pages de 为我而来 : deux clés distinctes").toBe(geos.length);
  expect(lues.some((c) => /j[456]-\d+$/.test(c)), "aucune clé de tranche lue").toBe(false);
});

// ─── Scan non certifié : l'affichage d'aujourd'hui ──────────────────────────

for (const cas of [
  { nom: "systemes.json sans le chant", repondre: (route: import("@playwright/test").Route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"version":1,"chants":{}}' }) },
  { nom: "systemes.json en 404", repondre: (route: import("@playwright/test").Route) => route.fulfill({ status: 404, body: "" }) },
  // Hors ligne sans copie : la requête échoue (réseau coupé).
  { nom: "systemes.json en échec réseau", repondre: (route: import("@playwright/test").Route) => route.abort("failed") },
  // Données d'une ancienne version : la largeur d'une page ne correspond plus à index.json, le chant est traité comme non certifié.
  {
    nom: "w/h différents de index.json",
    repondre: async (route: import("@playwright/test").Route) => {
      const rep = await route.fetch();
      const d = (await rep.json()) as Systemes;
      d.chants[UN].pages[0].w += 1;
      await route.fulfill({ response: rep, json: d });
    },
  },
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

// ─── Masques ────────────────────────────────────────────────────────────────

const ROYAUME = "荣耀至高神"; // masques entre lignes voisines

/** Les masques d'une page, en y image : [y0, y1] (page de hauteur `h`). */
const masquesY = (e: Ecran, h: number) => e.masquesFiltre.map((m) => [(m.top / 100) * h, ((m.top + m.height) / 100) * h] as const);

test("masques (大手牵着小手, 荣耀至高神) : dans le groupe filtré, aucun dans la bande de deux lignes voisines réunies sur la page entière", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [MASQUES, ROYAUME, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  expect(SYSTEMES.chants[MASQUES].pages[0].lignes[2].masques?.length).toBeGreaterThan(0);
  const ecrans = await parcourir(page);
  // Tous les masques rendus sont dans le groupe filtré (le filtre les rend transparents).
  for (const e of ecrans) expect(e.masquesFiltre.length, "masques dans [data-jianpu-filtre]").toBe(e.masques);
  // Deux lignes voisines qui se chevauchent (bande y commune) sont toutes deux sur la page : aucun masque dans cette
  // bande (il effacerait l'encre de l'une pour cacher celle de l'autre, qui est là).
  const verifier = (titre: string, paires: number[][]) => {
    const { lignes: ls, h } = SYSTEMES.chants[titre].pages[0];
    const e = ecrans.find((x) => x.titre === titre && x.fenetre)!;
    expect(e, `${titre} : un écran de scan`).toBeTruthy();
    for (const [p, q] of paires) {
      const bande = [Math.max(ls[p].y0, ls[q].y0), Math.min(ls[p].y1, ls[q].y1)];
      for (const [b, d] of masquesY(e, h)) {
        expect(b >= bande[0] - 1 && d <= bande[1] + 1, `${titre} : masque ${Math.round(b)}-${Math.round(d)} dans la bande ${bande.join("-")} des lignes ${p} et ${q}`).toBe(false);
      }
    }
  };
  verifier(MASQUES, [[1, 2], [3, 4], [4, 5]]);
  verifier(ROYAUME, [[0, 1], [3, 4]]);
  // Un scan sans masque n'en porte pas.
  expect(SYSTEMES.chants[UN].pages[0].lignes.every((l) => !l.masques)).toBe(true);
});

// ─── Transposition : le calque reste dans la fenêtre ────────────────────────

test("transposé (G) : les étiquettes visibles de la page entière tiennent dans sa fenêtre", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(page.viewportSize()!.width < 700, "téléphone : le scan y est trop petit pour mesurer");
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "G" } });
  await attendrePages(page);
  await fermerBarre(page);
  // Calque calé sur l'image de la page entière (à 1,5 px près).
  await expect.poll(async () => !!(await lireGeo(page))?.calque, { timeout: 15_000 }).toBe(true);
  const g = (await lireGeo(page))!;
  for (const k of ["x", "y", "right", "bottom"] as const) expect(Math.abs(g.calque![k] - g.filtre[k]), `calque ${k}`).toBeLessThanOrEqual(1.5);
  const ecrans = await parcourir(page);
  let vues = 0;
  for (const e of ecrans.filter((x) => x.titre === UN && x.fenetre)) {
    const f = e.fenetre!;
    for (const l of e.labels) {
      const cx = (l.x + l.right) / 2;
      const cy = (l.y + l.bottom) / 2;
      if (cx < f.x || cx > f.x + f.width || cy < f.y || cy > f.y + f.height) continue; // hors fenêtre : rogné
      vues++;
      expect(l.x, `${l.c} : bord gauche`).toBeGreaterThanOrEqual(f.x - 1.5);
      expect(l.right, `${l.c} : bord droit`).toBeLessThanOrEqual(f.x + f.width + 1.5);
      expect(l.y, `${l.c} : haut`).toBeGreaterThanOrEqual(f.y - 1.5);
      expect(l.bottom, `${l.c} : bas`).toBeLessThanOrEqual(f.y + f.height + 1.5);
    }
  }
  expect(vues, "des accords transposés sont visibles").toBeGreaterThan(0);
});

// ─── Captures ───────────────────────────────────────────────────────────────

for (const sombre of [false, true]) {
  test(`capture de la page entière d'un scan, ${sombre ? "sombre" : "clair"}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await ouvrirLouange(page, { sombre, chants: [UNE, FR] });
    await attendrePages(page);
    await fermerBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/cl1-pleine-${info.project.name}-${sombre ? "sombre" : "clair"}.png` });
  });
}

// ─── En-tête, repères, barre ────────────────────────────────────────────────

/** Revient au premier écran (flèche gauche : « Home » ne tourne pas les pages). */
async function premierEcran(page: Page) {
  const [, total] = (await lireCompteur(page)).split(" / ").map(Number);
  for (let k = Number((await lireCompteur(page)).split(" / ")[0]); k > 1; k--) await page.keyboard.press("ArrowLeft");
  await attendreCompteur(page, `1 / ${total}`);
}

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
      allumes: reperes.filter((r) => r.hasAttribute("data-allume")).map((r) => r.getAttribute("aria-label") ?? ""),
      cle: t?.querySelector("[data-cle-tete]")?.textContent ?? "",
      grave: t?.querySelector("[data-grave-en]")?.textContent ?? "",
    };
  });
}

/** Rouvre la barre de titre (un toucher au centre la montre ou la cache). */
async function ouvrirBarre(page: Page) {
  if ((await page.locator("[data-barre-ouverte]").count()) === 0) {
    const ecran = page.viewportSize()!;
    await page.mouse.click(ecran.width / 2, ecran.height / 2);
    await expect(page.locator("[data-barre-ouverte]")).toHaveCount(1);
  }
}

test("tête de feuille : sur chaque page d'écran de scan, de la hauteur de la barre, au-dessus de la page entière ; la pastille « Ensuite » ne la recouvre pas ; ouverte, la barre ne recouvre pas la première ligne", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [UN, DEUX, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  for (let n = 1; n <= total; n++) {
    await attendreCompteur(page, `${n} / ${total}`);
    await page.waitForTimeout(150);
    const g = await lireGeo(page);
    const t = await lireTete(page);
    if (g) {
      expect(t.present, `écran ${n} : tête de feuille`).toBe(true);
      // A12, CI-22 : le titre au-dessus des ronds fait grandir la tête au-delà de la barre ; la partition descend d'autant.
      expect(t.hauteur, `écran ${n} : tête ${t.hauteur} px, barre ${t.barre} px`).toBeGreaterThanOrEqual(t.barre - 1);
      expect(t.fenetreHaut, `écran ${n} : le scan commence sous la tête`).toBeGreaterThanOrEqual(t.hauteur - 1);
      expect(g.fen.bottom, `écran ${n} : la page entière, tête comprise, tient dans l'écran`).toBeLessThanOrEqual(g.innerH + 1);
      for (const s of g.suivants) expect(chevauche(s, g.fen), `écran ${n} : « Ensuite » ne recouvre pas le scan`).toBe(false);
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

test("tête de feuille : « 1=F » et « gravé en E » quand le scan est transposé, en français et en 中文", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" } });
  await attendrePages(page);
  const t = await lireTete(page);
  expect(t.cle).toBe("1=F");
  expect(t.grave).toBe("gravé en E");
});

test("tête de feuille, interface en 中文 : « 原谱 E 调 »", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" }, zh: true });
  await attendrePages(page);
  const t = await lireTete(page);
  expect(t.cle).toBe("1=F");
  expect(t.grave).toBe("原谱 E 调");
});

test("tête de feuille : le carré de tonalité mais pas de « gravé en » quand la tonalité est celle du scan ; « ×2 » dans le repère, Dp en tirets", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], surcharge: { [UN]: UN_DP } });
  await attendrePages(page);
  const t = await lireTete(page);
  // A12, CI-22 (Timothée, 16/11 : « mets le carré avec la gamme sur la partition aussi ») : le carré sur toute partition.
  expect(t.cle, "scan non transposé : le carré de sa tonalité").toContain("E");
  expect(await onStage(page, "[data-tete-feuille] [data-cle-tete]").count()).toBe(1);
  expect(t.grave).toBe("");
  const tete = onStage(page, "[data-tete-feuille]");
  await expect(tete.locator("[data-repeat]")).toHaveText("×2");
  // « ×2 » est écrit dans le cadre du repère, à l'encre (couleur du texte, pas celle de la section).
  const repeat = tete.locator("[data-repere-tete]", { has: page.locator("[data-repeat]") });
  await expect(repeat).toHaveCount(1);
  expect(await repeat.evaluate((r) => getComputedStyle(r.querySelector("[data-repeat]")!).color === getComputedStyle(r).color)).toBe(true);
  const dp = tete.locator("[data-repere-tete][data-dp]");
  await expect(dp).toHaveCount(1);
  await expect(dp).toHaveText("Dp");
  // La tête grandit si besoin (ronds de 32 / 44 px) : jamais moins haute que la barre.
  const h = await lireTete(page);
  expect(h.hauteur).toBeGreaterThanOrEqual(h.barre - 1);
});

// ─── Menu Repères ───────────────────────────────────────────────────────────

test("menu Repères d'un scan : un repère mène à la page d'écran du scan qui porte sa section (为我而来 : le pont à la page 2)", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [DEUX, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const pont = SECTIONS.chants[DEUX].sections.find((s) => s.id === "bridge-4")!;
  expect(pont.page).toBe(2);
  // Section de la page 1 : écran 1.
  let menu = await ouvrirMenu(page, "reperes");
  await menu.getByRole("button", { name: /Refrain|副歌/ }).click();
  await expect(menu).toBeHidden();
  await attendreCompteur(page, `1 / ${total}`);
  // Section de la page 2 : écran 2.
  menu = await ouvrirMenu(page, "reperes");
  await menu.getByRole("button", { name: /Pont|桥段/ }).click();
  await expect(menu).toBeHidden();
  await attendreCompteur(page, `2 / ${total}`);
  // Au téléphone, la feuille du menu masque la page (aria-hidden) le temps de se fermer : on attend la page visible.
  await expect.poll(async () => (await lireGeo(page))?.page, { message: "la page 2 du scan", timeout: 10_000 }).toBe(1);
});

/** Sections présentes sur la page `pg` (1-based, `nl` lignes) d'un chant : l'intervalle [début, début suivant) touche la page (règle de `sections.json`). */
function presentesSurPage(chant: string, pg: number, nl: number): string[] {
  const ss = SECTIONS.chants[chant].sections.map((x) => ({ id: x.id, d: [x.page, x.anacrouse && x.ligne > 1 ? x.ligne - 1 : x.ligne] as [number, number] }));
  const av = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  return ss.filter((x) => {
    const suiv = ss.filter((y) => av(x.d, y.d)).reduce<[number, number] | null>((m, y) => (m === null || av(y.d, m) ? y.d : m), null);
    return !av([pg, nl], x.d) && (suiv === null || av([pg, 1], suiv));
  }).map((x) => x.id);
}

test("feuille de route allumée : les repères des sections présentes sur la page du scan, d'après sections.json (为我而来 : couplets et refrain page 1, refrain et pont page 2)", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirLouange(page, { chants: [DEUX, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const motif: Record<string, RegExp> = { "verse-1": /Couplet|主歌/, "verse-2": /Couplet|主歌/, "chorus-3": /Refrain|副歌/, "bridge-4": /Pont|桥段/ };
  const total = Number((await lireCompteur(page)).split("/")[1]);
  for (const pg of [1, 2]) {
    await premierEcran(page);
    if (pg === 2) await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, `${pg} / ${total}`);
    await page.waitForTimeout(200);
    expect((await lireGeo(page))!.page, `écran ${pg} : la page ${pg} du scan`).toBe(pg - 1);
    const allumes = (await lireTete(page)).allumes;
    const attendues = presentesSurPage(DEUX, pg, SYSTEMES.chants[DEUX].pages[pg - 1].lignes.length);
    for (const id of ["chorus-3", "bridge-4"]) {
      expect(allumes.some((a) => motif[id].test(a)), `page ${pg} : ${id}`).toBe(attendues.includes(id));
    }
    expect(allumes.some((a) => motif["verse-1"].test(a)), `page ${pg} : couplets`).toBe(attendues.includes("verse-1"));
  }
});

// Captures de la tranche 2 (à regarder) : tête de feuille, barre fermée puis ouverte.
const VUES = [
  { nom: "clair", opts: {} },
  { nom: "sombre", opts: { sombre: true } },
  { nom: "zh", opts: { zh: true, cles: { [UN]: "F" } } },
  { nom: "transpose", opts: { cles: { [UN]: "F" }, surcharge: { [UN]: UN_DP } } },
];
for (const v of VUES) {
  test(`capture JP-B3 de la tête de feuille (page entière), ${v.nom}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await ouvrirLouange(page, { chants: [UN, FR], ...v.opts });
    await attendrePages(page);
    await fermerBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/jp-b3-${info.project.name}-${v.nom}.png` });
    await ouvrirBarre(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/jp-b3-${info.project.name}-${v.nom}-barre.png` });
  });
}

test("tête de feuille : posée sur la feuille (ordinateur, tablette paysage), repères et tonalité au bord de l'encre ; repères inertes au défilement", async ({ page }, info) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" } });
  await attendrePages(page);
  await fermerBarre(page);
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const vu = (e: Element) => !e.closest("[aria-hidden=true]");
    const rect = (e: Element | null | undefined) => (e ? e.getBoundingClientRect() : null);
    const t = Array.from(document.querySelectorAll("[data-performance-mode] [data-tete-feuille]")).find(vu)!;
    // La feuille a la largeur de la plus large des fenêtres visibles (téléphone en portrait : moitiés de lignes, JP-C).
    const fr = Array.from(document.querySelectorAll("[data-performance-mode] [data-jianpu-fenetre]")).filter(vu).map((e) => e.getBoundingClientRect()).reduce((m, r) => (r.width > m.width ? r : m));
    const premier = rect(t.querySelector("[data-repere-tete]"))!;
    const cle = rect(t.querySelector("[data-cle-tete]"))!;
    const ol = t.querySelector("ol")!;
    const repere = t.querySelector<HTMLElement>("[data-repere-tete]")!;
    const cs = getComputedStyle(t.querySelector("[data-cle-tete]")!);
    const tempo = t.querySelector("[data-tempo-tete]");
    const note = tempo?.querySelector("svg")?.getBoundingClientRect();
    return {
      fenetre: { x: fr.x, droite: fr.right, largeur: fr.width },
      premierX: premier.x, cleDroite: cle.right,
      zone: window.innerWidth,
      overflow: getComputedStyle(ol).overflowX,
      aria: repere.getAttribute("aria-label"), title: repere.getAttribute("title"),
      largeurMin: repere.getBoundingClientRect().width,
      cleTaille: cs.fontSize, cleNums: cs.fontVariantNumeric,
      noteH: note ? Math.round(note.height * 10) / 10 : null,
      hauteurTete: t.getBoundingClientRect().height,
      hauteurContenu: Math.max(...Array.from(t.querySelectorAll("[data-repere-tete], [data-cle-tete], [data-grave-en]"), (e) => e.getBoundingClientRect().bottom)) - t.getBoundingClientRect().top,
    };
  });
  const surFeuille = m.fenetre.largeur < m.zone - 16;
  if (surFeuille) {
    // Ordinateur et tablette paysage : la tête est sur la feuille, du bord gauche au bord droit de la fenêtre de scan.
    expect(Math.abs(m.premierX - m.fenetre.x), "premier repère au bord gauche de la feuille").toBeLessThanOrEqual(2);
    expect(Math.abs(m.cleDroite - m.fenetre.droite), "tonalité au bord droit de la feuille").toBeLessThanOrEqual(2);
  } else {
    // Tablette portrait, téléphone : le retrait habituel (la fenêtre occupe toute la largeur), rien ne change.
    expect(m.premierX).toBeGreaterThanOrEqual(m.fenetre.x);
  }
  expect(m.overflow).toBe("hidden");
  expect(m.aria, "nom complet de la section").toBeTruthy();
  expect(m.title, "plus de title").toBeNull();
  expect(m.largeurMin).toBeGreaterThanOrEqual(26);
  expect(m.cleTaille, "clé en petit carré de tonalité (24 px, comme les repères)").toBe("13px");
  expect(m.cleNums).toContain("tabular-nums");
  expect(m.noteH, "note noire à 15 px").toBe(15);
  expect(m.hauteurContenu, "le tout tient dans la hauteur de la tête").toBeLessThanOrEqual(m.hauteurTete + 0.5);
  info.annotations.push({ type: "surFeuille", description: String(surFeuille) });
});

test("tête de feuille : « gravé en E » en #6c6c72 en clair, 13 px ; repère allumé plein, éteint teinté, ronds", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR], cles: { [UN]: "F" } });
  await attendrePages(page);
  const r = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll("[data-performance-mode] [data-tete-feuille]")).find((e) => !e.closest("[aria-hidden=true]"))!;
    const g = getComputedStyle(t.querySelector("[data-grave-en]")!);
    const on = t.querySelector<HTMLElement>("[data-repere-tete][data-allume]");
    const off = t.querySelector<HTMLElement>("[data-repere-tete]:not([data-allume])");
    // Couleur « fond de page » résolue, pour le texte d'un rond plein.
    const sonde = document.createElement("span");
    sonde.style.color = "hsl(var(--background))";
    t.appendChild(sonde);
    const fondPage = getComputedStyle(sonde).color;
    sonde.remove();
    return { couleur: g.color, taille: g.fontSize, fondPage, fondOn: on ? getComputedStyle(on).backgroundColor : null, texteOn: on ? getComputedStyle(on).color : null, fondOff: off ? getComputedStyle(off).backgroundColor : null, texteOff: off ? getComputedStyle(off).color : null,
      rayon: on ? parseFloat(getComputedStyle(on).borderTopLeftRadius) >= on.getBoundingClientRect().height / 2 : null, ombre: on ? getComputedStyle(on).boxShadow : "none" };
  });
  expect(r.couleur).toBe("rgb(108, 108, 114)");
  expect(r.taille).toBe("13px");
  expect(r.fondOn, "un repère allumé").not.toBeNull();
  // Allumé = plein : texte à la couleur du fond de page, sur la couleur de section. Éteint = teinté : texte à la
  // couleur de section, sur sa teinte (jamais le texte du rond plein).
  expect(r.texteOn).toBe(r.fondPage);
  expect(r.fondOn).not.toBe(r.fondPage);
  // Un scan d'une page porte souvent toutes ses sections (aucun éteint) : la vérification ne vaut que s'il y en a un.
  if (r.fondOff !== null) {
    expect(r.texteOff).not.toBe(r.fondPage);
    expect(r.fondOff).not.toBe(r.texteOff);
  }
  expect(r.rayon, "rond").toBe(true);
  expect(r.ombre).toBe("none");
});

test("tête de feuille : mêmes ronds que la page chant, 32 px au téléphone, 44 px sinon (FR page chant, 中文 scan)", async ({ page }) => {
  test.setTimeout(90_000);
  const attendu = page.viewportSize()!.width < 640 ? 32 : 44;
  await page.goto("/songs/abba-pere");
  const rondFr = page.locator("ol[aria-label=Structure] li > span").first();
  await expect(rondFr).toBeVisible();
  expect(await rondFr.evaluate((e) => (e as HTMLElement).offsetHeight), "rond du bandeau de la page chant").toBe(attendu);
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const tete = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll("[data-performance-mode] [data-tete-feuille]")).find((e) => !e.closest("[aria-hidden=true]"))!;
    return (t.querySelector("[data-repere-tete]") as HTMLElement).offsetHeight;
  });
  expect(tete, "rond de la tête de feuille").toBe(attendu);
});


// ─── Pastille « Tourne le téléphone » (scan sans systemes.json) ─────────────

test.describe("pastille « Tourne le téléphone » (scan sans systemes.json)", () => {
  test.use({ serviceWorkers: "block" });
  const sansSystemes = (page: Page) =>
    page.route("**/jianpu/systemes.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"version":1,"chants":{}}' }));

  test("téléphone en portrait : une pastille de 44 px sous le scan entier, qui ne le recouvre pas", async ({ page }, info) => {
    test.setTimeout(90_000);
    test.skip(info.project.name !== "telephone", "téléphone en portrait seulement");
    await sansSystemes(page);
    await ouvrirLouange(page, { chants: [UN] });
    await expect(onStage(page, "[data-jianpu-fenetre]")).toHaveCount(1, { timeout: 30_000 });
    const pastille = onStage(page, "[data-pastille-tourne]");
    await expect(pastille).toHaveCount(1);
    await expect(pastille).toHaveText(/Tourne le téléphone pour lire le 简谱 en grand/);
    const p = (await pastille.boundingBox())!;
    const f = (await onStage(page, "[data-jianpu-fenetre]").boundingBox())!;
    expect(Math.abs(p.height - 44)).toBeLessThanOrEqual(1);
    expect(p.y, "sous le scan").toBeGreaterThanOrEqual(f.y + f.height - 1);
    // Inerte : un texte, ni bouton ni lien.
    await expect(pastille.locator("button, a")).toHaveCount(0);
  });

  test("téléphone en paysage, tablette, ordinateur : pas de pastille", async ({ page }, info) => {
    test.setTimeout(90_000);
    if (info.project.name === "telephone") await page.setViewportSize({ width: 844, height: 390 });
    await sansSystemes(page);
    await ouvrirLouange(page, { chants: [UN] });
    await expect(onStage(page, "[data-jianpu-fenetre]")).toHaveCount(1, { timeout: 30_000 });
    await expect(onStage(page, "[data-pastille-tourne]")).toHaveCount(0);
  });
});

test("un scan certifié n'a pas de pastille « Tourne le téléphone » : la page entière tient à toutes les tailles", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UN, FR] });
  await attendrePages(page);
  await expect(onStage(page, "[data-pastille-tourne]")).toHaveCount(0);
  await expect(onStage(page, "[data-jianpu-moitie]")).toHaveCount(0);
});

test("un chant français sans scan est inchangé : ni fenêtre, ni moitié, ni pastille", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [FR] });
  await expect(onStage(page, "[data-jianpu-fenetre]")).toHaveCount(0);
  await expect(onStage(page, "[data-jianpu-moitie]")).toHaveCount(0);
  await expect(onStage(page, "[data-pastille-tourne]")).toHaveCount(0);
});

// A12, CI-22 (docs/spec-corrections-interface.md) : barre escamotée, la tête de feuille d'un scan certifié porte le titre
// du chant (chinois, casse normale) en une ligne au-dessus des ronds de structure ; la partition commence dessous.
test("A12 : tête de feuille, titre du chant en une ligne au-dessus des ronds (恒久恒久以前)", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouange(page, { chants: [UNE, FR] });
  await attendrePages(page);
  await fermerBarre(page);
  const tete = onStage(page, "[data-tete-feuille]");
  const titre = tete.locator("[data-titre-tete]");
  await expect(titre).toBeVisible();
  await expect(titre).toHaveText(UNE);
  const m = await titre.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const tete = e.closest("[data-tete-feuille]")!;
    const rond = tete.querySelector("[data-repere-tete]")!.getBoundingClientRect();
    const f = Array.from(document.querySelectorAll("[data-performance-mode] [data-jianpu-fenetre]")).find((x) => !x.closest("[aria-hidden=true]"))!;
    return { bas: r.bottom, lignes: r.height / parseFloat(getComputedStyle(e).lineHeight), rond: rond.top, scan: f.getBoundingClientRect().top, transforme: getComputedStyle(e).textTransform };
  });
  expect(m.lignes, "une ligne").toBeLessThan(1.5);
  expect(m.bas, "au-dessus des ronds").toBeLessThanOrEqual(m.rond + 0.5);
  expect(m.scan, "la partition sous le titre").toBeGreaterThanOrEqual(m.bas);
  expect(m.transforme).toBe("none");
});
