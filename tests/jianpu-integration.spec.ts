import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { loadChords, openSheet } from "./helpers/jianpu";
import { ouvrirPartitions } from "./helpers/setlist";

// Chantier 简谱, lot 3 (docs/spec-jianpu-integration.md) : piste A, le scan fondu
// dans la page. Tests purs d'abord (données), le rendu ensuite.

const lire = <T,>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
type Manifeste = Record<string, { pages: { file: string; w: number; h: number }[] }>;
type Calques = Record<string, { keyLabel: { y: number }; labels: { y: number }[] }>;

// ─── L3-T1 : recadrage, donnée certifiée ─────────────────────────────────────

test.describe("recadrage (données)", () => {
  test("chords.json est intact : les calques certifiés ne bougent pas", () => {
    const empreinte = createHash("sha256").update(readFileSync("public/jianpu/chords.json")).digest("hex");
    expect(empreinte).toBe("ecf3ea0d5c91baf7ae82890c2d77f2fc1766ea722474ade20271e89267b85fbb");
  });

  test("cadrage.json : une valeur par page, dans la page, au-dessus de « 1=X » et des accords ; pages suivantes à 0", () => {
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
      // Le min du calcul garde « 1=X » et tout accord placé au-dessus dans la fenêtre.
      const c = calques[slug];
      const haut = Math.min(c.keyLabel.y, ...c.labels.map((l) => l.y));
      expect(tops[0], `${slug} : la coupe passe au-dessus de « 1=X » et des accords`).toBeLessThan(haut);
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
  const db = await signInAs(page, MUSICIEN, {
    [ADAPTER_DOC]: {
      title: "Culte du 21 septembre", leader: "Jonathan Z.", category: "Culte Francophone", date: "2026-09-21",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
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

test("5 fenêtre (page chant) : ratio w / (h − top), « 1=D » dedans, titre gravé dehors, encre au bord de la colonne", async ({ page }) => {
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
  // « 1=D » entièrement dans la fenêtre.
  expect(f.cadre).toHaveLength(1);
  expect(f.cadre[0].top).toBeGreaterThanOrEqual(f.fenetre.top - 0.5);
  expect(f.cadre[0].bottom).toBeLessThanOrEqual(f.fenetre.bottom + 0.5);
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
  expect(tops).toEqual([131, 0]);
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
