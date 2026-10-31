import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { inflateSync } from "zlib";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { loadChords, openSheet } from "./helpers/jianpu";
import { enDeuxVolets, ouvrirPartitions } from "./helpers/setlist";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { SetlistFullPDF } from "../src/components/pdf/SetlistFullPDF";
import { JianpuPDFPage } from "../src/components/pdf/SongPDF";

// Chantier 简谱, lot 3 (docs/spec-jianpu-integration.md) : piste A, le scan fondu
// dans la page. Tests purs d'abord (données), le rendu ensuite.

const lire = <T,>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
type Manifeste = Record<string, { pages: { file: string; w: number; h: number }[] }>;
type Calques = Record<string, { keyLabel: { y: number }; labels: { y: number; c: string }[] }>;

// ─── L3-T1 : recadrage, donnée certifiée ─────────────────────────────────────

test.describe("recadrage (données)", () => {
  test("chords.json est intact : les calques certifiés ne bougent pas", () => {
    // 25/10/2026 : seul ajout depuis 1b488bdf, le calque de 仰望神儿子 ; aucun calque certifié modifié ni retiré.
    const empreinte = createHash("sha256").update(readFileSync("public/jianpu/chords.json")).digest("hex");
    expect(empreinte).toBe("a02eec72e78981342434a70b291ba46981f8cb077b640d82a16b24c913960550");
  });

  test("cadrage.json : une valeur par page, dans la page, au-dessus des accords ; pages suivantes à 0", () => {
    test.skip(!existsSync("public/jianpu/cadrage.json"), "aucune page certifiée");
    const cadrage = lire<Record<string, number[]>>("public/jianpu/cadrage.json");
    const index = lire<Manifeste>("public/jianpu/index.json");
    const calques = lire<Calques>("public/jianpu/chords.json");
    for (const [slug, tops] of Object.entries(cadrage)) {
      const pages = index[slug]?.pages;
      expect(pages, `${slug} a un scan`).toBeTruthy();
      expect(tops, `${slug} : une valeur par page`).toHaveLength(pages.length);
      tops.forEach((top, i) => {
        expect(Number.isInteger(top) && top >= 0 && top < pages[i].h, `${slug} p.${i + 1} : ${top}`).toBe(true);
        if (i > 0) expect(top, `${slug} p.${i + 1} : pas d'en-tête gravé`).toBe(0);
      });
      // Lot JE (JE2) : la coupe passe sous tout l'en-tête gravé, « 1=X » compris, mais au-dessus du
      // premier accord du calque, qu'aucune coupe ne cache (une étiquette vide est une gomme).
      const c = calques[slug];
      const haut = Math.min(...c.labels.filter((l) => l.c).map((l) => l.y));
      expect(tops[0], `${slug} : la coupe passe au-dessus des accords`).toBeLessThan(haut);
    }
  });
});

// ─── L3-T2a : le scan en encre — filtre, gommes et écritures ────────────────

const SLUG = "一生爱你";
const THEMES = [
  { nom: "clair", dark: false, encre: "rgb(28, 28, 30)", filtre: "jianpu-encre-clair" },
  { nom: "sombre", dark: true, encre: "rgb(228, 228, 231)", filtre: "jianpu-encre-sombre" },
] as const;

type Pt = { x: number; y: number };
type Rvb = [number, number, number];

/** La couleur des points (px CSS de la fenêtre) sur une capture de la page, lue dans le navigateur. */
async function couleurs(page: Page, pts: Pt[]): Promise<Rvb[]> {
  const png = (await page.screenshot({ animations: "disabled" })).toString("base64");
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const s = img.naturalWidth / innerWidth;
    return pts.map((p) => Array.from(ctx.getImageData(Math.round(p.x * s), Math.round(p.y * s), 1, 1).data.slice(0, 3)) as Rvb);
  }, { b64: png, pts });
}

/** Les mêmes points sur la référence : le groupe filtré (image + gommes) est caché,
 *  il ne reste que le fond du site et les écritures. */
async function couleursSansScan(page: Page, pts: Pt[]): Promise<Rvb[]> {
  const style = await page.addStyleTag({ content: "[data-jianpu-filtre]{visibility:hidden}" });
  const out = await couleurs(page, pts);
  await style.evaluate((el) => (el as HTMLElement).remove());
  return out;
}

const ecart = (a: Rvb, b: Rvb) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

for (const th of THEMES) {
  test.describe(`piste A, encre ${th.nom}`, () => {
    test.describe.configure({ timeout: 90_000 });
    test(`1 papier transparent (${th.nom}) : une zone sans encre a la couleur du fond du site`, async ({ page }) => {
      await openSheet(page, SLUG, { dark: th.dark });
      expect(await page.locator("[data-jianpu-filtre]").count(), "le scan est dans un groupe filtré").toBeGreaterThan(0);
      await page.locator('[data-jianpu-page="0"]').scrollIntoViewIfNeeded();
      // Les blocs de 12 × 12 px de l'image d'origine (blancs : papier pur, ≥ 250 ; encre : < 60), vus à l'écran et non masqués.
      const blocs = await page.evaluate(async () => {
        const host = document.querySelector<HTMLElement>('[data-jianpu-page="0"]')!;
        const img = host.querySelector("img")!;
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const r = img.getBoundingClientRect();
        const k = r.width / img.naturalWidth;
        const B = 12;
        const out: { x: number; y: number; ink: boolean; blanc: boolean }[] = [];
        for (let y = 0; y + B <= c.height; y += 48)
          for (let x = 0; x + B <= c.width; x += 48) {
            const d = ctx.getImageData(x, y, B, B).data;
            let min = 255;
            for (let i = 0; i < d.length; i += 4) min = Math.min(min, 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
            const cx = r.left + (x + B / 2) * k;
            const cy = r.top + (y + B / 2) * k;
            if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
            if (!host.contains(document.elementFromPoint(cx, cy))) continue;
            out.push({ x: cx, y: cy, ink: min < 60, blanc: min >= 250 });
          }
        return out;
      });
      const avec = await couleurs(page, blocs);
      const sans = await couleursSansScan(page, blocs);
      const blancs = blocs.map((b, k) => ({ ...b, k })).filter((b) => b.blanc);
      const encre = blocs.map((b, k) => ({ ...b, k })).filter((b) => b.ink);
      expect(blancs.length, "des zones blanches visibles").toBeGreaterThan(5);
      expect(encre.length, "de l'encre visible").toBeGreaterThan(0);
      const faux = blancs.filter((b) => ecart(avec[b.k], sans[b.k]) > 3);
      expect(faux.length, `${faux.length} / ${blancs.length} zones blanches ne sont pas transparentes : ${JSON.stringify(faux.slice(0, 3).map((b) => [b.x, b.y, avec[b.k], sans[b.k]]))}`).toBe(0);
      // Et l'encre, elle, est bien là : la référence sans scan n'a pas la même couleur.
      expect(encre.some((b) => ecart(avec[b.k], sans[b.k]) > 100), "l'encre se voit").toBe(true);
    });

    test(`2 plus d'inversion (${th.nom}) : l'image n'est plus retournée, le groupe porte le filtre ${th.nom}`, async ({ page }) => {
      await openSheet(page, SLUG, { dark: th.dark });
      const { img, groupe, nb } = await page.evaluate(() => {
        const g = document.querySelector<HTMLElement>("[data-jianpu-filtre]");
        return {
          img: getComputedStyle(document.querySelector('[data-jianpu-page="0"] img')!).filter,
          groupe: g ? getComputedStyle(g).filter : "",
          nb: document.querySelectorAll("[data-jianpu-filtre] img").length,
        };
      });
      expect(img).not.toContain("invert");
      expect(groupe).toContain("url(");
      expect(groupe).toContain(th.filtre);
      expect(nb, "l'image est dans le groupe filtré").toBeGreaterThan(0);
    });

    test(`3 gomme invisible (${th.nom}) : au coin d'une gomme, le pixel est celui du fond`, async ({ page }) => {
      // L'info-bulle des accords touchables flotte en bas de l'écran : hors sujet pour les pixels mesurés.
      await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
      await openSheet(page, SLUG, { key: "D", dark: th.dark });
      await page.locator('[data-jianpu-page="0"]').scrollIntoViewIfNeeded();
      const coins = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>('[data-jianpu-page="0"]')!;
        const out: { x: number; y: number }[] = [];
        for (const g of host.querySelectorAll<HTMLElement>("[data-jianpu-gomme]")) {
          const r = g.getBoundingClientRect();
          // Deux coins du haut, un demi-pixel et demi à l'intérieur : au-dessus du texte.
          for (const [x, y] of [[r.left + 1.5, r.top + 1.5], [r.right - 1.5, r.top + 1.5]]) {
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
            if (!host.contains(document.elementFromPoint(x, y))) continue;
            out.push({ x, y });
          }
        }
        return out;
      });
      expect(coins.length, "des coins de gomme visibles").toBeGreaterThan(5);
      const avec = await couleurs(page, coins);
      const sans = await couleursSansScan(page, coins);
      const faux = coins.filter((_, k) => ecart(avec[k], sans[k]) > 3);
      expect(faux.length, `${faux.length} / ${coins.length} coins de gomme ne sont pas transparents`).toBe(0);
    });

    test(`4 écriture à l'encre (${th.nom}) : ${th.encre}`, async ({ page }) => {
      await openSheet(page, SLUG, { key: "D", dark: th.dark });
      const couleurs = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>("[data-jianpu-label],[data-jianpu-keylabel]"),
          (el) => getComputedStyle(el).color,
        ),
      );
      expect(couleurs.length).toBeGreaterThan(10);
      expect([...new Set(couleurs)]).toEqual([th.encre]);
      // Le fond de l'écriture est transparent : c'est la gomme qui efface.
      const fonds = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("[data-jianpu-label]"), (el) => getComputedStyle(el).backgroundColor),
      );
      expect([...new Set(fonds)]).toEqual(["rgba(0, 0, 0, 0)"]);
    });
  });
}

test("jeton --jianpu-encre : #1c1c1e en clair, #e4e4e7 en sombre", async ({ page }) => {
  const lire = () =>
    page.evaluate(() => {
      const el = document.createElement("i");
      el.style.color = "hsl(var(--jianpu-encre))";
      document.body.append(el);
      const c = getComputedStyle(el).color;
      el.remove();
      return c;
    });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  expect(await lire()).toBe("rgb(28, 28, 30)");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(await lire()).toBe("rgb(228, 228, 231)");
});

test("6 calque inchangé : chaque écriture à (x − 3) / w, et sa gomme au même endroit", async ({ page }) => {
  const c = loadChords()[SLUG];
  await openSheet(page, SLUG, { key: "D" });
  const mesure = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('[data-jianpu-page="0"]')!;
    const img = host.querySelector("img")!.getBoundingClientRect();
    const boite = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: (r.left - img.left) / img.width, top: (r.top - img.top) / img.height, w: r.width, h: r.height };
    };
    return {
      etiquettes: Array.from(host.querySelectorAll("[data-jianpu-label]"), boite),
      cadre: Array.from(host.querySelectorAll("[data-jianpu-keylabel]"), boite),
      gommes: Array.from(host.querySelectorAll("[data-jianpu-gomme]"), boite),
      gommesEtiquetees: host.querySelectorAll("[data-jianpu-gomme][data-jianpu-label]").length,
      cachees: Array.from(host.querySelectorAll("[data-jianpu-gomme]")).filter((g) => g.getAttribute("aria-hidden") !== "true").length,
    };
  });
  expect(mesure.etiquettes).toHaveLength(c.labels.length);
  mesure.etiquettes.forEach((m, i) => expect(Math.abs(m.left - (c.labels[i].x - 3) / c.w), `étiquette ${i}`).toBeLessThan(0.002));
  expect(mesure.cadre).toHaveLength(1);
  expect(Math.abs(mesure.cadre[0].left - (c.keyLabel!.x - 3) / c.w)).toBeLessThan(0.002);
  // Deux couches, mêmes coordonnées : une gomme par écriture, dans l'ordre du document.
  expect(mesure.gommes).toHaveLength(c.labels.length + 1);
  expect(mesure.gommesEtiquetees, "les gommes ne portent pas data-jianpu-label").toBe(0);
  expect(mesure.cachees, "les gommes sont aria-hidden").toBe(0);
  const ecritures = [...mesure.cadre, ...mesure.etiquettes];
  for (const g of mesure.gommes) {
    const e = ecritures.find((m) => Math.abs(m.left - g.left) < 1e-6 && Math.abs(m.top - g.top) < 1e-6);
    expect(e, `une écriture à (${g.left}, ${g.top})`).toBeTruthy();
    expect(Math.abs(e!.w - g.w) + Math.abs(e!.h - g.h), "même boîte").toBeLessThan(0.5);
  }
});

// ─── 11 : Adapter, toucher une écriture ──────────────────────────────────────

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const ADAPTER_SLUG = "到各山岭去传扬";
const ADAPTER_DOC = "setlists/setlist-jianpu";

test("11 Adapter : toucher une écriture ouvre le pavé sur la bonne étiquette, gommée à la même place", async ({ page }) => {
  const item = (over: Record<string, unknown>) => ({
    keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "", ...over,
  });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  // Depuis SC1 (18/10/2026), seul le créateur adapte une setlist : la musicienne est la créatrice de la sienne.
  const db = await signInAs(page, MUSICIEN, {
    [ADAPTER_DOC]: {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-musicien", isPrivate: false,
      items: [item({ songSlug: ADAPTER_SLUG, position: 1, jianpuSheet: true })],
    },
  }, "/setlists/setlist-jianpu");
  await ouvrirPartitions(page);
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
  await page.getByRole("button", { name: "Adapter" }).click();

  // L'étiquette 1 (« G7 », x 638, y 344) : on touche au centre de l'écriture qui l'a retouchée.
  const c = loadChords()[ADAPTER_SLUG];
  const zone = (await page.locator("[data-jianpu-retouche-zone]").boundingBox())!;
  await page.locator("[data-jianpu-retouche-zone]").click({
    position: { x: ((c.labels[1].x + c.labels[1].w / 2) / c.w) * zone.width, y: ((c.labels[1].y + c.labels[1].h / 2) / c.h) * zone.height },
  });
  const feuille = page.getByRole("dialog");
  await feuille.getByRole("button", { name: "A", exact: true }).click();
  await feuille.getByRole("button", { name: "Valider l'accord" }).click();

  const retouche = page.locator('[data-jianpu-retouche="1"]');
  await expect(retouche).toHaveText("A7");
  const last = db.writes.filter((w) => w.path === ADAPTER_DOC).at(-1);
  expect((last!.data.items as { jianpuChords?: unknown }[])[0].jianpuChords).toEqual({ changed: { "1": "A7" } });
  // L'écriture retouchée a sa gomme, au même endroit (elle efface le G7 gravé).
  await expect(page.locator("[data-jianpu-gomme]")).toHaveCount(1);
  const [e, g] = await page.evaluate(() => {
    const r = (el: Element) => el.getBoundingClientRect().toJSON();
    return [r(document.querySelector("[data-jianpu-retouche]")!), r(document.querySelector("[data-jianpu-gomme]")!)];
  });
  expect(Math.abs(e.left - g.left) + Math.abs(e.top - g.top)).toBeLessThan(0.5);
});

// ─── L3-T2b : la fenêtre — l'en-tête gravé coupé, le bord de l'encre sur celui de la colonne ──

const CADRAGE = lire<Record<string, number[]>>("public/jianpu/cadrage.json");
const INDEX = lire<Manifeste>("public/jianpu/index.json");

/** Les fenêtres affichées et ce qu'elles montrent, en px CSS. `colonne` : la boîte du
 *  premier ancêtre qui en a une (le conteneur du scan, `display: contents` sauté). */
async function fenetres(page: Page, racine = "") {
  return page.evaluate((racine) => {
    const boite = (el: Element) => el.getBoundingClientRect().toJSON() as DOMRect;
    return Array.from(document.querySelectorAll<HTMLElement>(`${racine} [data-jianpu-fenetre]`))
      .filter((f) => !f.closest("[aria-hidden=true]"))
      .map((f) => {
        let p = f.parentElement!;
        while (getComputedStyle(p).display === "contents") p = p.parentElement!;
        const img = f.querySelector("img")!;
        return {
          fenetre: boite(f),
          colonne: boite(p),
          img: boite(img),
          naturel: img.naturalWidth,
          cadre: Array.from(f.querySelectorAll("[data-jianpu-keylabel]"), boite),
          debordement: getComputedStyle(f).overflow,
        };
      });
  }, racine);
}

const ratio = (r: { width: number; height: number }) => r.width / r.height;

test("5 fenêtre (page chant) : ratio w / (h − top), « 1=D » et titre gravé dehors, encre au bord de la colonne", async ({ page }) => {
  await openSheet(page, SLUG, { key: "D" });
  const { w, h } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  expect(top, "一生爱你 est recadré").toBeGreaterThan(100);
  await expect.poll(async () => (await fenetres(page)).length).toBe(1);
  await expect.poll(async () => ratio((await fenetres(page))[0].fenetre) / (w / (h - top))).toBeCloseTo(1, 2);
  const [f] = await fenetres(page);
  expect(f.debordement).toBe("hidden");
  const k = f.img.width / f.naturel;
  // L'image remonte de `top` : son haut (titre, album, versets) est au-dessus du bord de la fenêtre.
  expect(Math.abs(f.img.top - (f.fenetre.top - top * k)), "image remontée de top × échelle").toBeLessThan(1);
  expect(Math.abs(f.img.bottom - f.fenetre.bottom), "le pied reste").toBeLessThan(1);
  // Lot JE (JE2) : « 1=D » tombe dans la partie coupée, au-dessus du bord de la fenêtre.
  expect(f.cadre).toHaveLength(1);
  expect(f.cadre[0].bottom).toBeLessThanOrEqual(f.fenetre.top + 0.5);
  // Compensation (P5) : la marge blanche de 14 px rognée à la source déborde de la
  // colonne, le bord de l'encre tombe sur celui des paroles.
  expect(Math.abs(f.fenetre.left + 14 * k - f.colonne.left), "bord gauche de l'encre").toBeLessThan(1);
  expect(Math.abs(f.fenetre.right - 14 * k - f.colonne.right), "bord droit de l'encre").toBeLessThan(1);
  // `<main>` défile en largeur (`overflow-x-auto`) : c'est lui qui déborderait, pas le document.
  expect(await page.evaluate(() => [...document.querySelectorAll("main")].every((m) => m.scrollWidth <= m.clientWidth)), "pas de défilement horizontal").toBe(true);
});

test("5 fenêtre (page chant, deux pages) : 为我而来 p. 1 recadrée, p. 2 entière", async ({ page }) => {
  const slug = "为我而来";
  await openSheet(page, slug, { key: "D" });
  const pages = INDEX[slug].pages;
  const tops = CADRAGE[slug];
  expect(tops[0]).toBeGreaterThan(0);
  expect(tops[1]).toBe(0);
  await expect.poll(async () => (await fenetres(page)).length).toBe(2);
  await expect.poll(async () => ratio((await fenetres(page))[0].fenetre) / (pages[0].w / (pages[0].h - tops[0]))).toBeCloseTo(1, 2);
  const [, p2] = await fenetres(page);
  expect(ratio(p2.fenetre) / (pages[1].w / pages[1].h)).toBeCloseTo(1, 2);
  expect(Math.abs(p2.img.top - p2.fenetre.top), "page 2 : rien de coupé").toBeLessThan(1);
});

test("5 fenêtre (mode louange, fit) : ratio w / (h − top), la page tient à l'écran, centrée sans compensation", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, {
    "setlists/setlist-fenetre": {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [{ songSlug: SLUG, position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
        structureOverride: null, sectionNotes: {}, notes: "", jianpuSheet: true }],
    },
  }, "/setlists/setlist-fenetre");
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  // Serveur froid ou chargé : la mise en page (polices chinoises) prend plusieurs secondes.
  await expect(page.locator("[data-performance-mode] span.tabular-nums").last()).toHaveText(/^\d+ \/ \d+$/, { timeout: 30_000 });
  const { w, h } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  await expect.poll(async () => (await fenetres(page, "[data-performance-mode]")).length).toBe(1);
  await expect.poll(async () => ratio((await fenetres(page, "[data-performance-mode]"))[0].fenetre) / (w / (h - top))).toBeCloseTo(1, 2);
  const [f] = await fenetres(page, "[data-performance-mode]");
  const ecran = page.viewportSize()!;
  expect(f.fenetre.top).toBeGreaterThanOrEqual(0);
  expect(f.fenetre.bottom).toBeLessThanOrEqual(ecran.height + 0.5);
  expect(f.fenetre.left).toBeGreaterThanOrEqual(f.colonne.left - 0.5);
  expect(f.fenetre.right).toBeLessThanOrEqual(f.colonne.right + 0.5);
});

// ─── L3-T2c : les messages en jetons du site (P7), et K4 ─────────────────────

/** Sert un `chords.json` retouché : aucun scan n'est aujourd'hui sans calque ni à calque
 *  partiel, mais les deux messages existent et doivent prendre le style du site. */
async function calquesModifies(page: Page, modifier: (c: Record<string, Record<string, unknown>>) => void) {
  const c = JSON.parse(readFileSync("public/jianpu/chords.json", "utf8"));
  modifier(c);
  await page.route("**/jianpu/chords.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(c) }));
}

/** Fond, texte, rayon et bordure d'un message, et la couleur de --secondary. */
async function styleMessage(page: Page, texte: RegExp) {
  const el = page.getByText(texte).locator("xpath=ancestor-or-self::div[1]");
  await expect(el).toBeVisible();
  return el.evaluate((d) => {
    const s = getComputedStyle(d);
    const ref = document.createElement("i");
    ref.style.color = "hsl(var(--secondary))";
    document.body.append(ref);
    const secondaire = getComputedStyle(ref).color;
    ref.remove();
    return { fond: s.backgroundColor, texte: s.color, rayon: s.borderRadius, bordure: s.borderTopWidth, secondaire };
  });
}

for (const th of THEMES) {
  test(`P7 messages (${th.nom}) : « jouer en » sans calque — surface --secondary, texte à l'encre, rayon 12 px`, async ({ page }) => {
    await calquesModifies(page, (c) => delete c[SLUG]);
    // Pas d'`openSheet` : il attend les étiquettes du calque, retiré ici.
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
    if (th.dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(`/songs/${encodeURIComponent(SLUG)}?key=${encodeURIComponent(JSON.stringify("D"))}`);
    await page.locator('[data-jianpu-page="0"] img').waitFor();
    const s = await styleMessage(page, /ne suivent pas la transposition/);
    expect(s.fond).toBe(s.secondaire);
    expect(s.texte).toBe(th.encre);
    expect(s.rayon).toBe("12px");
    expect(s.bordure).toBe("0px");
  });

  test(`P7 messages (${th.nom}) : calque partiel — même style, accords en bleu gardés`, async ({ page }) => {
    await calquesModifies(page, (c) => (c[SLUG].complete = false));
    await openSheet(page, SLUG, { key: "D", dark: th.dark });
    const s = await styleMessage(page, /ont été transposés/);
    expect(s.fond).toBe(s.secondaire);
    expect(s.texte).toBe(th.encre);
    expect(s.rayon).toBe("12px");
    const bleus = await page.evaluate(() => [...new Set(Array.from(document.querySelectorAll<HTMLElement>("[data-jianpu-label]"), (e) => getComputedStyle(e).color))]);
    expect(bleus).toHaveLength(1);
    expect(bleus[0]).not.toBe(th.encre);
  });
}

test("P7 sélecteur « D seul | D et F » : le segmenté du site (radiogroup, piste --secondary)", async ({ page }) => {
  await openSheet(page, "无价至宝", { key: "D" });
  const groupe = page.getByRole("radiogroup", { name: "Accords" });
  await expect(groupe).toBeVisible();
  const choix = groupe.getByRole("radio");
  await expect(choix).toHaveCount(2);
  await expect(choix.first()).toHaveAttribute("aria-checked", "true");
  const piste = await groupe.evaluate((g) => {
    const ref = document.createElement("i");
    ref.style.color = "hsl(var(--secondary))";
    document.body.append(ref);
    const secondaire = getComputedStyle(ref).color;
    ref.remove();
    return { fond: getComputedStyle(g).backgroundColor, secondaire };
  });
  expect(piste.fond).toBe(piste.secondaire);
  await page.locator('[data-jianpu-altkey="on"]').click();
  await expect(choix.last()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('[data-jianpu-opt="shown"]').first()).toBeAttached();
});

const K4 = /Page 2 : les accords imprimés sont ceux d'origine \(C\)/;

test("9 K4 : 为我而来 en D — l'avertissement est au-dessus de la page 2, pas de la page 1", async ({ page }) => {
  await openSheet(page, "为我而来", { key: "D" });
  const avertissement = page.getByText(K4);
  await expect(avertissement).toHaveCount(1);
  await expect(avertissement).toBeVisible();
  const [a, p1, p2] = await Promise.all([
    avertissement.boundingBox(),
    page.locator('[data-jianpu-page="0"]').boundingBox(),
    page.locator('[data-jianpu-page="1"]').boundingBox(),
  ]);
  expect(a!.y + a!.height, "au-dessus de la page 2").toBeLessThanOrEqual(p2!.y + 0.5);
  expect(a!.y, "sous la page 1").toBeGreaterThanOrEqual(p1!.y + p1!.height - 0.5);
});

test("9 K4 : 为我而来 en C (tonalité gravée) — pas d'avertissement", async ({ page }) => {
  await openSheet(page, "为我而来");
  await expect(page.locator('[data-jianpu-page="1"]')).toBeAttached();
  await expect(page.getByText(/les accords imprimés sont ceux d'origine/)).toHaveCount(0);
});

// ─── L3-T3 : la page chant — en-tête du site au-dessus du scan, segment « 简谱 · Paroles » ──

test("7 page chant : en-tête du site au-dessus du scan, segment « 简谱 · Paroles » à droite des pastilles, plus de bouton 谱", async ({ page }) => {
  await page.goto(`/songs/${encodeURIComponent(SLUG)}`);
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  const titre = page.getByRole("heading", { level: 1, name: SLUG });
  await expect(titre).toBeVisible();
  const segment = page.getByRole("radiogroup", { name: "简谱 · Paroles" });
  await expect(segment).toBeVisible();
  await expect(segment.getByRole("radio", { name: "简谱" })).toHaveAttribute("aria-checked", "true");
  await expect(segment.getByRole("radio", { name: "Paroles" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("barre-outils").getByRole("button", { name: "简谱" })).toHaveCount(0);

  // Ordre : titre, pastilles et segment, puis le scan ; le segment est sur la rangée des pastilles ou dessous, calé à droite.
  const [h1, seg, pastilles, fenetre] = await Promise.all([
    titre.boundingBox(),
    segment.boundingBox(),
    page.getByRole("list", { name: "Structure" }).boundingBox(),
    page.locator("[data-jianpu-fenetre]").first().boundingBox(),
  ]);
  expect(h1!.y + h1!.height).toBeLessThanOrEqual(pastilles!.y);
  expect(seg!.y).toBeGreaterThanOrEqual(pastilles!.y - 1);
  expect(seg!.y + seg!.height).toBeLessThanOrEqual(fenetre!.y);
  expect(Math.round(seg!.height), "32 px").toBe(32);
  const bordDroit = await titre.evaluate((h) => h.closest(".max-w-2xl")!.getBoundingClientRect().right);
  expect(Math.abs(seg!.x + seg!.width - bordDroit), "calé à droite").toBeLessThan(1);
  // Piste --secondary, segment actif à l'encre.
  const couleurs = await segment.evaluate((g) => {
    const ref = (v: string) => {
      const i = document.createElement("i");
      i.style.color = v;
      document.body.append(i);
      const c = getComputedStyle(i).color;
      i.remove();
      return c;
    };
    const actif = g.querySelector('[aria-checked="true"]')!;
    return { piste: getComputedStyle(g).backgroundColor, actif: getComputedStyle(actif).backgroundColor, secondaire: ref("hsl(var(--secondary))"), encre: ref("hsl(var(--jianpu-encre))") };
  });
  expect(couleurs.piste).toBe(couleurs.secondaire);
  expect(couleurs.actif).toBe(couleurs.encre);
});

test("7 page chant : « Paroles » garde l'en-tête et règle la préférence de l'appareil, « 简谱 » ramène le scan", async ({ page }) => {
  await page.goto(`/songs/${encodeURIComponent(SLUG)}`);
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  const segment = page.getByRole("radiogroup", { name: "简谱 · Paroles" });
  await segment.getByRole("radio", { name: "Paroles" }).click();
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: SLUG })).toBeVisible();
  await expect(segment.getByRole("radio", { name: "Paroles" })).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => localStorage.getItem("jianpu-sheet-pref"))).toBe("never");
  await page.reload();
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await segment.getByRole("radio", { name: "简谱" }).click();
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  expect(await page.evaluate(() => localStorage.getItem("jianpu-sheet-pref"))).toBe("always");
});

test("7 page chant : un chant sans scan n'a pas de segment", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  await expect(page.locator("[data-copy-line]").first()).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "简谱 · Paroles" })).toHaveCount(0);
});

test("7 page chant : sur le scan, les notes venues de la setlist passent dans le bandeau", async ({ page }) => {
  const notes = encodeURIComponent(JSON.stringify({ "chorus-3": "Ralentir la dernière ligne" }));
  await page.goto(`/songs/${encodeURIComponent(SLUG)}?sectionNotes=${notes}`);
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  await expect(page.getByText("Ralentir la dernière ligne")).toBeVisible();
});

// ─── L3-T4 : setlist, vue Partitions — un chant sur scan a l'en-tête d'un chant en paroles ──

const T4_DOC = "setlists/setlist-t4";
/** 一生爱你 sur scan (en D, une note, un 升调) entre deux chants en paroles. */
const T4_SETLIST = {
  title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [
    { songSlug: "abba-pere", position: 1 },
    { songSlug: SLUG, position: 2, jianpuSheet: true, keyOverride: "D", notes: "Plus calme", sectionKeys: { "chorus-3": "E" } },
    { songSlug: "a-la-croix", position: 3 },
  ].map((over) => ({
    keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "", ...over,
  })),
};

async function ouvrirSetlistT4(page: Page, { dark = false, layout }: { dark?: boolean; layout?: string } = {}) {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  if (dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  if (layout) await page.addInitScript((l) => localStorage.setItem("partition-layout", l), layout);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MUSICIEN, { [T4_DOC]: T4_SETLIST }, "/setlists/setlist-t4");
  await ouvrirPartitions(page);
  await page.locator('[data-outline-item="3"]').waitFor();
}

/** L'en-tête d'un chant de la vue Partitions, mesuré depuis le haut de son bloc. */
async function enTete(page: Page, position: number, titre: string) {
  const bloc = page.locator(`[data-outline-item="${position}"]`);
  const h1 = bloc.getByRole("heading", { level: 1, name: titre });
  await expect(h1).toBeVisible();
  await expect(h1.getByRole("link")).toHaveAttribute("href", /\/songs\//);
  const [b, h, rond, bandeau] = await Promise.all([
    bloc.boundingBox(),
    h1.boundingBox(),
    bloc.getByText(String(position), { exact: true }).first().boundingBox(),
    bloc.getByRole("list", { name: "Structure" }).boundingBox(),
  ]);
  return { dx: h!.x - b!.x, dy: h!.y - b!.y, x: h!.x, bas: h!.y + h!.height, rondY: rond!.y - b!.y, bandeau: bandeau!, bloc: b! };
}

test("L3-T4 vue Partitions : un chant sur scan a le même en-tête qu'un chant en paroles (n°, titre lié, auteurs, ♩, pastille, bandeau)", async ({ page }) => {
  await ouvrirSetlistT4(page);
  await page.locator('[data-outline-item="2"] [data-jianpu-page="0"] img').waitFor();
  const paroles = await enTete(page, 1, "Abba Père");
  const scan = await enTete(page, 2, SLUG);
  // Même place du n° et du titre dans le bloc, même bord gauche.
  expect(Math.abs(scan.dx - paroles.dx), "titre au même retrait").toBeLessThan(1);
  expect(Math.abs(scan.dy - paroles.dy), "titre à la même hauteur").toBeLessThan(1);
  expect(Math.abs(scan.rondY - paroles.rondY), "n° à la même hauteur").toBeLessThan(1);
  const bloc = page.locator('[data-outline-item="2"]');
  await expect(bloc.getByText("曾祥怡词 / 游智婷曲")).toBeVisible();
  await expect(bloc.getByText("♩")).toBeVisible();
  await expect(bloc.getByText("D", { exact: true }).first()).toBeVisible();
  await expect(bloc.getByText("Plus calme")).toBeVisible();
  // Titre, puis bandeau, puis le scan.
  const fenetre = (await bloc.locator("[data-jianpu-fenetre]").first().boundingBox())!;
  expect(scan.bas).toBeLessThanOrEqual(scan.bandeau.y);
  expect(scan.bandeau.y + scan.bandeau.height).toBeLessThanOrEqual(fenetre.y);
});

test("L3-T4 vue Partitions : le chant suivant commence au même écart après un scan qu'après des paroles", async ({ page }) => {
  await ouvrirSetlistT4(page);
  await page.locator('[data-outline-item="2"] [data-jianpu-page="0"] img').waitFor();
  // L'écart qui se voit : de la fin de l'encre (dernière section, dernière fenêtre) au n° du
  // chant suivant ; mesuré d'un coup, et attendu stable (la fenêtre se coupe après l'image).
  const ecarts = () => page.evaluate(() => {
    const bloc = (i: number) => document.querySelector(`[data-outline-item="${i}"]`)!;
    const bas = (els: NodeListOf<Element>) => els[els.length - 1].getBoundingClientRect().bottom;
    const rond = (i: number) => Array.from(bloc(i).querySelectorAll("span")).find((s) => s.textContent === String(i))!.getBoundingClientRect();
    return {
      apresParoles: rond(2).top - bas(bloc(1).querySelectorAll("[data-section]")),
      apresScan: rond(3).top - bas(bloc(2).querySelectorAll("[data-jianpu-fenetre]")),
      bords: [rond(2).left, rond(3).left],
    };
  });
  await expect.poll(async () => { const e = await ecarts(); return Math.abs(e.apresScan - e.apresParoles); }, { message: "même écart visible" }).toBeLessThan(1);
  const { bords } = await ecarts();
  expect(Math.abs(bords[0] - bords[1]), "même bord gauche").toBeLessThan(1);
});

test("L3-T4 vue Partitions, Structure seule : le chant sur scan garde l'en-tête complet, sans scan", async ({ page }) => {
  await ouvrirSetlistT4(page, { layout: "structure" });
  const paroles = await enTete(page, 1, "Abba Père");
  const scan = await enTete(page, 2, SLUG);
  expect(Math.abs(scan.dx - paroles.dx)).toBeLessThan(1);
  expect(Math.abs(scan.dy - paroles.dy)).toBeLessThan(1);
  await expect(page.locator('[data-outline-item="2"] [data-jianpu-fenetre]')).toHaveCount(0);
  await expect(page.locator('[data-outline-item="2"]').getByText("Plus calme")).toBeVisible();
});

for (const th of THEMES) {
  test(`L3-T4 vue Partitions (${th.nom}) : le bandeau « 升调 » en jetons du site, sous l'en-tête, au-dessus du scan`, async ({ page }) => {
    await ouvrirSetlistT4(page, { dark: th.dark });
    const bandeau = page.locator('[data-outline-item="2"] [data-bandeau-modulation]');
    await expect(bandeau).toContainText("on monte en E");
    const s = await bandeau.evaluate((d) => {
      const c = getComputedStyle(d);
      const ref = document.createElement("i");
      ref.style.color = "hsl(var(--secondary))";
      document.body.append(ref);
      const secondaire = getComputedStyle(ref).color;
      ref.remove();
      return { fond: c.backgroundColor, texte: c.color, rayon: c.borderRadius, secondaire };
    });
    expect(s.fond).toBe(s.secondaire);
    expect(s.texte).toBe(th.encre);
    expect(s.rayon).toBe("12px");
    const scan = await enTete(page, 2, SLUG);
    const b = (await bandeau.boundingBox())!;
    const fenetre = (await page.locator('[data-outline-item="2"] [data-jianpu-fenetre]').first().boundingBox())!;
    expect(scan.bandeau.y + scan.bandeau.height).toBeLessThanOrEqual(b.y);
    expect(b.y + b.height).toBeLessThanOrEqual(fenetre.y);
  });
}

// ─── L3-T5a : mode louange — K1 (le scan entre les barres) et l'en-tête d'une ligne ─

async function ouvrirLouangeT5(page: Page, role = "pianiste") {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript((r) => localStorage.setItem("perf-role-preset", r), role);
  await signInAs(page, MUSICIEN, {
    "setlists/setlist-t5": {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [{ songSlug: SLUG, position: 1, keyOverride: "D", showChords: true, showPinyin: true, useJianpu: false,
        structureOverride: null, sectionNotes: {}, notes: "", jianpuSheet: true }],
    },
  }, "/setlists/setlist-t5");
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.locator("[data-performance-mode] span.tabular-nums").last()).toHaveText(/^\d+ \/ \d+$/, { timeout: 30_000 });
  await expect.poll(async () => (await fenetres(page, "[data-performance-mode]")).length, { timeout: 30_000 }).toBe(1);
  // Recadrage arrivé (cadrage.json) : la fenêtre ne bouge plus.
  const { w, h } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  await expect.poll(async () => ratio((await fenetres(page, "[data-performance-mode]"))[0].fenetre) / (w / (h - top))).toBeCloseTo(1, 2);
}

/** Bas de la barre du haut, haut de la barre du bas (elles restent en place, escamotées). */
async function barres(page: Page) {
  const haut = (await page.locator("[data-performance-mode] .material-chrome:has(span.tabular-nums)").boundingBox())!;
  const bas = (await page.locator("[data-performance-mode] .material-chrome:has(button[aria-label='Quitter'])").boundingBox())!;
  return { hautBas: haut.y + haut.height, basHaut: bas.y };
}

test("8 K1 (mode louange) : le scan et son en-tête tiennent entre les deux barres, affichées puis escamotées", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouangeT5(page);
  const chrome = page.locator("[data-performance-mode] .material-chrome:has(span.tabular-nums)").locator("xpath=..");
  // Barres affichées (elles s'escamotent après 3 s : un toucher au centre les rappelle).
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  if ((await chrome.evaluate((el) => getComputedStyle(el).opacity)) !== "1") await page.mouse.click(w / 2, h / 2);
  await expect(chrome).toHaveCSS("opacity", "1");
  const b = await barres(page);
  const [affichee] = await fenetres(page, "[data-performance-mode]");
  expect(affichee.fenetre.top, "scan sous la barre du haut").toBeGreaterThanOrEqual(b.hautBas - 0.5);
  expect(affichee.fenetre.bottom, "scan au-dessus de la barre du bas").toBeLessThanOrEqual(b.basHaut + 0.5);
  const entete = page.locator("[data-performance-mode] [data-entete-scan]:not([aria-hidden=true] *)");
  expect((await entete.boundingBox())!.y, "en-tête sous la barre du haut").toBeGreaterThanOrEqual(b.hautBas - 0.5);
  // Barres escamotées (un toucher au centre) : le scan ne bouge pas.
  await page.mouse.click(w / 2, h / 2);
  await expect(chrome).toHaveCSS("opacity", "0");
  const [escamotee] = await fenetres(page, "[data-performance-mode]");
  expect(await barres(page)).toEqual(b);
  for (const k of ["top", "bottom", "left", "right"] as const) expect(escamotee.fenetre[k]).toBeCloseTo(affichee.fenetre[k], 0);
});

test("L3-T5a en-tête d'une ligne (mode louange) : n°, titre, ♩, pastille de tonalité, puis le bandeau, puis le scan", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouangeT5(page);
  // En paysage sur grand écran, l'en-tête et le bandeau sont dans la colonne de gauche (L3-T5b).
  test.skip(await grandEcran(page), "téléphone et tablette en portrait");
  const entete = page.locator("[data-performance-mode] [data-entete-scan]:not([aria-hidden=true] *)");
  await expect(entete).toBeVisible();
  const [rond, titre, tempo, pastille] = await Promise.all([
    entete.getByText("1", { exact: true }).boundingBox(),
    entete.getByRole("heading", { name: SLUG }).boundingBox(),
    entete.getByText(/♩\s*65/).boundingBox(),
    entete.getByText("D", { exact: true }).boundingBox(),
  ]);
  const milieu = (r: { y: number; height: number }) => r.y + r.height / 2;
  for (const r of [rond!, tempo!, pastille!]) expect(Math.abs(milieu(r) - milieu(titre!)), "sur la ligne du titre").toBeLessThan(6);
  expect(rond!.x + rond!.width).toBeLessThanOrEqual(titre!.x);
  expect(titre!.x + titre!.width).toBeLessThanOrEqual(tempo!.x);
  expect(tempo!.x + tempo!.width).toBeLessThanOrEqual(pastille!.x);
  const e = (await entete.boundingBox())!;
  expect(e.height, "une seule ligne").toBeLessThan(48);
  const bandeau = page.locator("[data-performance-mode]").getByRole("list", { name: "Structure" });
  const s = (await bandeau.boundingBox())!;
  const [f] = await fenetres(page, "[data-performance-mode]");
  expect(e.y + e.height, "en-tête au-dessus du bandeau").toBeLessThanOrEqual(s.y + 0.5);
  expect(s.y + s.height, "bandeau au-dessus du scan").toBeLessThanOrEqual(f.fenetre.top + 0.5);
});

test("L3-T5a en-tête d'une ligne (mode louange), A+ 150 %, capo et tonalité de l'appareil : le titre reste lisible, rien ne sort de l'écran", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript((slug) => {
    localStorage.setItem("perf-font-scale", "1.5");
    localStorage.setItem("perf-capos", JSON.stringify({ [slug]: 2 }));
    localStorage.setItem("perf-personal-keys", JSON.stringify({ "setlist-t5": { [slug]: "E" } }));
  }, SLUG);
  // Le capo ne s'affiche qu'au guitariste.
  await ouvrirLouangeT5(page, "guitariste");
  const entete = page.locator("[data-performance-mode] [data-entete-scan]:not([aria-hidden=true] *)");
  await expect(entete.getByText(/Capo/)).toBeVisible();
  const titre = (await entete.getByRole("heading", { name: SLUG }).boundingBox())!;
  expect(titre.width, "titre lisible (au moins deux caractères)").toBeGreaterThanOrEqual(40);
  const e = (await entete.boundingBox())!;
  expect(e.x + e.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
});

test("L3-T5a annotations : une page de scan a sa propre clé (« j2 ») — les traits posés avant que le scan ne bouge ne s'y chargent plus", async ({ page }) => {
  test.setTimeout(90_000);
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
    if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
  });
  await ouvrirLouangeT5(page);
  // En paysage sur grand écran, la colonne (L3-T5b) a encore déplacé le scan : « j3 ».
  await expect.poll(() => lues.at(-1) ?? "").toMatch((await grandEcran(page)) ? /j3$/ : /j2$/);
});

// ─── L3-T5b : mode louange — en paysage sur grand écran, la structure en colonne ─

const grandEcran = (page: Page) =>
  page.evaluate(() => matchMedia("(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)").matches);

/** 一生爱你 en D puis Abba Père : la page du scan est la dernière du chant, « Suivant » y est. */
async function ouvrirLouangeT5b(page: Page, over: Record<string, unknown> = {}, role = "pianiste") {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript((r) => localStorage.setItem("perf-role-preset", r), role);
  const item = { showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, notes: "" };
  await signInAs(page, MUSICIEN, {
    "setlists/setlist-t5b": {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [
        { ...item, songSlug: SLUG, position: 1, keyOverride: "D", jianpuSheet: true,
          sectionNotes: { "chorus-3": "Ralentir la dernière ligne" }, ...over },
        { ...item, songSlug: "abba-pere", position: 2, keyOverride: null, sectionNotes: {} },
      ],
    },
  }, "/setlists/setlist-t5b");
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.locator("[data-performance-mode] span.tabular-nums").last()).toHaveText(/^\d+ \/ \d+$/, { timeout: 30_000 });
  const { w, h } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  await expect.poll(async () => (await fenetres(page, "[data-performance-mode]")).length, { timeout: 30_000 }).toBe(1);
  await expect.poll(async () => ratio((await fenetres(page, "[data-performance-mode]"))[0].fenetre) / (w / (h - top))).toBeCloseTo(1, 2);
}

test("8 K1, paysage grand écran (mode louange) : la structure en colonne à gauche, « Suivant » en bas de la colonne, le scan sur toute la hauteur", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouangeT5b(page);
  test.skip(!(await grandEcran(page)), "paysage sur grand écran seulement");
  const b = await barres(page);
  const colonne = page.locator("[data-performance-mode] [data-colonne-scan]:not([aria-hidden=true] *)");
  await expect(colonne).toBeVisible();
  const c = (await colonne.boundingBox())!;
  const [f] = await fenetres(page, "[data-performance-mode]");
  expect(c.x + c.width, "colonne à gauche du scan").toBeLessThanOrEqual(f.fenetre.left + 0.5);
  expect(c.width, "≈ 200 px (à la taille du texte)").toBeLessThanOrEqual(240);
  expect(c.y, "colonne sous la barre du haut").toBeGreaterThanOrEqual(b.hautBas - 0.5);
  expect(c.y + c.height, "colonne au-dessus de la barre du bas").toBeLessThanOrEqual(b.basHaut + 0.5);
  // L'en-tête du chant, le bandeau (pastilles avec leur nom, note numérotée), puis « Suivant ».
  await expect(colonne.locator("[data-entete-scan]").getByRole("heading", { name: SLUG })).toBeVisible();
  const bandeau = colonne.getByRole("list", { name: "Structure" });
  await expect(bandeau).toBeVisible();
  await expect(bandeau.getByText("Refrain", { exact: true }).first()).toBeVisible();
  await expect(colonne.getByText("Ralentir la dernière ligne")).toBeVisible();
  const suivant = colonne.locator("[data-suivant]");
  await expect(suivant).toContainText("Abba Père");
  const s = (await suivant.boundingBox())!;
  const l = (await bandeau.boundingBox())!;
  expect(s.y, "« Suivant » sous le bandeau").toBeGreaterThan(l.y + l.height);
  expect(s.y + s.height, "« Suivant » en bas de la colonne").toBeGreaterThan(c.y + c.height - 60);
  // Une seule pastille « Suivant » : celle du bas de l'écran ne s'ajoute pas.
  await expect(page.locator("[data-performance-mode] [data-suivant]")).toHaveCount(1);
  // Le scan, sans rien au-dessus de lui, prend la hauteur entre les barres (bornée par la largeur sinon).
  const libre = b.basHaut - b.hautBas;
  expect(f.fenetre.height, "scan sur toute la hauteur").toBeGreaterThanOrEqual(libre - 12);
});

test("L3-T5b colonne : structure de 12 étapes, nuances et modulation — « Suivant » reste à l'écran, rien ne déborde à droite", async ({ page }) => {
  test.setTimeout(90_000);
  const ids = ["intro-1", "verse-2", "chorus-3"];
  const ordre = [0, 1, 2, 1, 2, 0, 1, 2, 1, 2, 0, 1].map((n, i) => `${ids[n]}-${i}`);
  await ouvrirLouangeT5b(page, {
    structureOverride: ordre,
    sectionNuances: { [ordre[1]]: { tags: ["acappella", "instrumental", "ff"] }, [ordre[2]]: { tags: ["cresc", "tutti"] } },
    sectionKeys: { "chorus-3": "E" },
  });
  test.skip(!(await grandEcran(page)), "paysage sur grand écran seulement");
  const b = await barres(page);
  const colonne = page.locator("[data-performance-mode] [data-colonne-scan]:not([aria-hidden=true] *)");
  await expect(colonne.getByRole("list", { name: "Structure" }).locator("> li")).toHaveCount(12);
  const suivant = colonne.locator("[data-suivant]");
  await expect(suivant).toBeInViewport({ ratio: 1 });
  const s = (await suivant.boundingBox())!;
  expect(s.y + s.height, "« Suivant » au-dessus de la barre du bas").toBeLessThanOrEqual(b.basHaut + 0.5);
  const debord = await colonne.evaluate((c) => {
    const droite = c.getBoundingClientRect().right;
    return {
      largeur: c.scrollWidth - c.clientWidth,
      dehors: Array.from(c.querySelectorAll("li *"), (e) => e.getBoundingClientRect().right - droite).filter((d) => d > 0.5),
    };
  });
  expect(debord.largeur, "pas de défilement horizontal").toBeLessThanOrEqual(0);
  expect(debord.dehors, "rien à droite de la colonne").toEqual([]);
});

test("L3-T5b colonne, A+ 150 %, capo et tonalité de l'appareil : « setlist : X » se lit en entier", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript((slug) => {
    localStorage.setItem("perf-font-scale", "1.5");
    localStorage.setItem("perf-capos", JSON.stringify({ [slug]: 2 }));
    localStorage.setItem("perf-personal-keys", JSON.stringify({ "setlist-t5b": { [slug]: "E" } }));
  }, SLUG);
  await ouvrirLouangeT5b(page, {}, "guitariste");
  test.skip(!(await grandEcran(page)), "paysage sur grand écran seulement");
  const entete = page.locator("[data-performance-mode] [data-colonne-scan] [data-entete-scan]:not([aria-hidden=true] *)");
  await expect(entete.getByText(/Capo/)).toBeVisible();
  const tronques = await entete.evaluate((e) => Array.from(e.querySelectorAll("span, h2"), (x) => x.scrollWidth - x.clientWidth).filter((d) => d > 0));
  expect(tronques, "aucun texte tronqué").toEqual([]);
});

test("L3-T5b hors paysage grand écran (mode louange) : pas de colonne, le bandeau au-dessus du scan", async ({ page }) => {
  test.setTimeout(90_000);
  await ouvrirLouangeT5b(page);
  test.skip(await grandEcran(page), "téléphone et tablette en portrait");
  await expect(page.locator("[data-performance-mode] [data-colonne-scan]")).toHaveCount(0);
  await expect(page.locator("[data-performance-mode]").getByText(/Ensuite/).first()).toBeVisible();
});

// ─── L3-T6 : PDF de setlist — le scan coupé sous l'en-tête gravé, le calque décalé de −top ─

type ElementPdf = { type: unknown; props: Record<string, unknown> & { children?: unknown; style?: Record<string, number> } };

/** Les éléments react-pdf d'une page, composants maison dépliés (ils n'ont pas de hooks). */
function deplier(n: unknown): ElementPdf[] {
  if (Array.isArray(n)) return n.flatMap(deplier);
  if (!n || typeof n !== "object" || !("props" in n)) return [];
  const el = n as ElementPdf;
  if (typeof el.type === "function") return deplier((el.type as (p: unknown) => unknown)(el.props));
  return [el, ...deplier(el.props.children)];
}
const texte = (el: ElementPdf) => [el.props.children].flat().filter((c) => typeof c === "string").join("");

/** Les pages 简谱 d'un PDF de setlist : un chant, sa tonalité. */
function pagesPdf(slug: string, keyOverride: string | null) {
  const doc = SetlistFullPDF({
    setlist: {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [{ songSlug: slug, position: 1, keyOverride, showChords: true, showPinyin: true, useJianpu: false,
        structureOverride: null, sectionNotes: {}, notes: "" }],
    } as never,
    contents: { [slug]: { slug, ast: parseChordPro(readFileSync(`content/songs/${slug}.cho`, "utf8")) } },
    showChords: true,
    jianpuSheets: INDEX as never,
    jianpuChords: lire("public/jianpu/chords.json"),
    jianpuCadrage: CADRAGE,
    jianpuImages: Object.fromEntries(INDEX[slug].pages.map((p) => [p.file, "data:image/png;base64,"])),
  });
  const pages = (doc.props as { children: ElementPdf[] }).children.flat().filter((p) => p.type === JianpuPDFPage);
  expect(pages).toHaveLength(INDEX[slug].pages.length);
  return pages.map((p) => ({ props: p.props, elements: deplier((JianpuPDFPage as (x: unknown) => unknown)(p.props)) }));
}

test("10 PDF : 一生爱你 en D — l'image a la hauteur h − top à l'échelle, « 1=D » décalé de −top, hors de l'image coupée", () => {
  const [p] = pagesPdf(SLUG, "D");
  const { w, h } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  expect(p.props.top).toBe(top);
  const image = p.elements.find((e) => e.type === "IMAGE")!;
  const { width: imgW, height: imgH } = image.props.style!;
  expect(imgH / imgW, "image coupée : ratio (h − top) / w").toBeCloseTo((h - top) / w, 3);
  // « 1=D » : la position du calque d'aujourd'hui, remontée de top à l'échelle de l'image.
  const c = lire<Record<string, { w: number; labelH: number; keyLabel: { x: number; y: number; w: number; h: number } }>>("public/jianpu/chords.json")[SLUG];
  const k = imgW / w;
  const ck = imgW / c.w;
  const cadreTop = (c.keyLabel.y - 6) * ck - top * k;
  const cle = p.elements.find((e) => e.type === "TEXT" && texte(e) === "1=D")!;
  expect(cle, "« 1=D » réécrit").toBeTruthy();
  expect(cle.props.style!.top).toBeCloseTo(cadreTop + (c.keyLabel.h + 8) * ck - c.labelH * ck, 3);
  // Lot JE (JE2) : la coupe passe sous « 1=D » ; le cadre de l'image (`overflow: hidden`) le cache.
  expect(cle.props.style!.top, "au-dessus de l'image").toBeLessThan(0);
});

test("10 PDF : l'image prend toute la largeur du cadre (échelle calculée sur h − top)", () => {
  const [p] = pagesPdf(SLUG, "D");
  // A4 moins les marges de page (SHEET_BOX_W, SongPDF.tsx) : 一生爱你 coupé est borné par la largeur.
  expect(p.elements.find((e) => e.type === "IMAGE")!.props.style!.width).toBeCloseTo(595.28 - 2 * 50, 1);
});

test("10 PDF : « （X调） » du titre gravé — pas réécrit quand il est coupé, réécrit à sa place sinon", () => {
  // 亲眼看见你 : « （D调） » gravé au-dessus de la coupe (y 10 < top 147).
  const [coupe] = pagesPdf("亲眼看见你", "E");
  expect(coupe.elements.filter((e) => e.type === "TEXT" && /调）$/.test(texte(e)))).toEqual([]);
  // 陪我走过春夏秋冬 : coupe à 12 px (lot JE : aucune coupe propre sous l'en-tête), « （C调） » gravé
  // dessous, réécrit dans la tonalité du .cho (D).
  const [garde] = pagesPdf("陪我走过春夏秋冬", null);
  const titre = garde.elements.find((e) => e.type === "TEXT" && texte(e) === "（D调）");
  expect(titre, "« （D调） » réécrit").toBeTruthy();
  expect(titre!.props.style!.top, "dans l'image").toBeGreaterThan(-2);
});

test("10 PDF : 为我而来, deux pages — la p. 1 coupée, la p. 2 entière", () => {
  const pages = pagesPdf("为我而来", null);
  expect(pages.map((p) => p.props.top ?? 0)).toEqual(CADRAGE["为我而来"]);
  pages.forEach((p, i) => {
    const { w, h } = INDEX["为我而来"].pages[i];
    const s = p.elements.find((e) => e.type === "IMAGE")!.props.style!;
    expect(s.height / s.width).toBeCloseTo((h - CADRAGE["为我而来"][i]) / w, 3);
  });
});

const K4_PDF = /^Page 2 : les accords imprimés sont ceux d'origine \(C\) et ne suivent pas la transposition ; les chiffres, eux, restent justes\.$/;

test("O11 K4 au PDF : 为我而来 en D — la ligne est en tête de la page 2, au-dessus du scan, absente de la page 1", () => {
  const [p1, p2] = pagesPdf("为我而来", "D");
  expect(p1.elements.some((e) => e.type === "TEXT" && /accords imprimés/.test(texte(e)))).toBe(false);
  const i = p2.elements.findIndex((e) => e.type === "TEXT" && K4_PDF.test(texte(e)));
  expect(i, "avertissement sur la page 2").toBeGreaterThanOrEqual(0);
  expect(i, "au-dessus du scan").toBeLessThan(p2.elements.findIndex((e) => e.type === "IMAGE"));
  // Plus l'ancien « Jouer en D — … ceux d'origine » sous la page 2.
  expect(p2.elements.some((e) => e.type === "TEXT" && /^Jouer en/.test(texte(e)))).toBe(false);
});

test("O11 K4 au PDF : 为我而来 en C (tonalité gravée) — aucun avertissement", () => {
  for (const p of pagesPdf("为我而来", null)) {
    expect(p.elements.some((e) => e.type === "TEXT" && /accords imprimés|^Jouer en/.test(texte(e)))).toBe(false);
  }
});

test("10 PDF téléchargé : 一生爱你 en D — le scan ré-encodé fait w × (h − top) pixels", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MUSICIEN, {
    "setlists/setlist-t6": {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [{ songSlug: SLUG, position: 1, keyOverride: "D", showChords: true, showPinyin: true, useJianpu: false,
        structureOverride: null, sectionNotes: {}, notes: "", jianpuSheet: true }],
    },
  }, "/setlists/setlist-t6");
  await ouvrirPartitions(page);
  if (await enDeuxVolets(page)) {
    await page.locator("[data-en-tete]").getByRole("button", { name: "PDF", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "PDF" }).click();
  }
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 90_000 }),
    page.getByRole("dialog", { name: "Quel PDF ?" }).getByRole("button", { name: "Télécharger" }).click(),
  ]);
  const pdf = readFileSync((await download.path())!).toString("latin1");
  // Les images du PDF (et leur masque alpha) : /Subtype /Image … /Width … /Height …
  const tailles = [...pdf.matchAll(/<<[^>]*\/Subtype \/Image[^>]*>>/g)].map((m) => [
    Number(/\/Width (\d+)/.exec(m[0])?.[1]), Number(/\/Height (\d+)/.exec(m[0])?.[1]),
  ]);
  const { w, h, file } = INDEX[SLUG].pages[0];
  const top = CADRAGE[SLUG][0];
  expect(tailles.length).toBeGreaterThan(0);
  expect(tailles).toContainEqual([w, h - top]);
  expect(tailles).not.toContainEqual([w, h]);
  // C'est bien le haut qui est coupé : rangée par rangée, l'encre de l'image du PDF (RVB brut,
  // FlateDecode) est celle du scan à partir de la rangée top, décodé par le navigateur.
  const dico = new RegExp(`<<[^>]*/Width ${w}\\s+/Height ${h - top}\\s[^>]*/ColorSpace /DeviceRGB[^>]*/Length (\\d+)\\s*>>\\s*stream\\r?\\n`).exec(pdf)!;
  expect(dico, "image RVB du scan").toBeTruthy();
  const brut = inflateSync(Buffer.from(pdf.slice(dico.index + dico[0].length, dico.index + dico[0].length + Number(dico[1])), "latin1"));
  const encrePdf = Array.from({ length: h - top }, (_, r) => {
    let n = 0;
    for (let x = 0; x < w; x++) if (brut[(r * w + x) * 3] < 128) n++;
    return n;
  });
  const encreScan = await page.evaluate(async ({ file, top }) => {
    const bitmap = await createImageBitmap(await (await fetch(`/jianpu/${encodeURIComponent(file)}`)).blob());
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, top, c.width, c.height - top);
    return Array.from({ length: c.height - top }, (_, r) => {
      let n = 0;
      for (let x = 0; x < c.width; x++) if (data[(r * c.width + x) * 4] < 128) n++;
      return n;
    });
  }, { file, top });
  expect(encrePdf).toEqual(encreScan);
});
