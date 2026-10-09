import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { onStage } from "./helpers/louange";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { SetlistFullPDF } from "../src/components/pdf/SetlistFullPDF";
import { JianpuPDFPage, SongPDFPage } from "../src/components/pdf/SongPDF";
import { buildFormItems } from "../src/lib/setlist/formItems";
import { buildSetlistItems } from "../src/lib/setlist/buildSetlistItems";
import type { SongIndexEntry } from "../src/types/song";
import type { SetlistItem } from "../src/types/setList";
import {
  interrupteurAllume,
  prefDepuisInterrupteur,
  sheetEnabled,
  type JianpuPref,
} from "../src/lib/jianpu/preference";

// Chantier 简谱, lot 1 « 简谱 par défaut » (docs/spec-jianpu-integration.md) :
// un chant qui a un scan s'ouvre sur son scan, partout, sans action de
// personne ; « Partition 简谱 » devient un interrupteur allumé par défaut ; le
// choix de la personne prime sur le « Paroles » du responsable (D4, O1).
// Setlists et comptes simulés, noms fictifs.

test("règle : préférence × choix du responsable (9 cas)", () => {
  const cas: [JianpuPref, boolean | undefined, boolean][] = [
    // Non réglée (absente, ou l'ancien « Choix du responsable ») : le scan,
    // sauf « Paroles » choisi par le responsable.
    ["auto", undefined, true],
    ["auto", true, true],
    ["auto", false, false],
    // Réglée sur 简谱 : le scan, même si le responsable a choisi « Paroles ».
    ["always", undefined, true],
    ["always", true, true],
    ["always", false, true],
    // Réglée sur Paroles : jamais le scan.
    ["never", undefined, false],
    ["never", true, false],
    ["never", false, false],
  ];
  for (const [pref, item, attendu] of cas) {
    expect(sheetEnabled(pref, item), `${pref} × ${item}`).toBe(attendu);
  }
});

test("règle : l'interrupteur montre et écrit la préférence (reprise D3)", () => {
  expect(interrupteurAllume("auto"), "Choix du responsable → allumé").toBe(true);
  expect(interrupteurAllume("always"), "Toujours → allumé").toBe(true);
  expect(interrupteurAllume("never"), "Jamais → éteint").toBe(false);
  expect(prefDepuisInterrupteur(true)).toBe("always");
  expect(prefDepuisInterrupteur(false)).toBe("never");
});

const PREF = "jianpu-sheet-pref";
const lirePref = (page: Page) => page.evaluate((k) => localStorage.getItem(k), PREF);

/** Toutes les pages de scan affichées, images chargées (1 à 2 Mo chacune). */
async function scanCharge(page: Page) {
  await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
}

test.describe("page chant", () => {
  const bouton谱 = (page: Page) => page.getByRole("button", { name: "简谱", exact: true });

  test("un chant à scan s'ouvre sur son scan, sans action ; un chant FR reste en paroles", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);
    await expect(page.locator("[data-copy-line]"), "aucune ligne de paroles").toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "true");
    expect(await lirePref(page), "rien n'est écrit au chargement").toBeNull();

    await page.goto("/songs/abba-pere");
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveCount(0);
  });

  test("le bouton 谱 règle la préférence de l'appareil : paroles, retenues au rechargement, puis scan", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);

    await bouton谱(page).click();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "false");
    expect(await lirePref(page)).toBe("never");

    await page.reload();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);

    await bouton谱(page).click();
    await scanCharge(page);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "true");
    expect(await lirePref(page)).toBe("always");
  });

  test("téléphone : en fin de défilement, la fin de la feuille reste au-dessus de la barre d'onglets (K2)", async ({ page }) => {
    test.skip(test.info().project.name !== "telephone", "la barre d'onglets du téléphone");
    await page.goto(`/songs/${encodeURIComponent("为我而来")}`);
    await scanCharge(page);
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(2);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // Un léger retour vers le haut fait revenir la barre, comme au doigt.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, -1));
    const barre = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(barre).toBeInViewport();
    await page.waitForTimeout(400); // fin de la transition de la barre
    const basDeLaFeuille = await page.locator("[data-jianpu-page]").last().evaluate((el) => el.getBoundingClientRect().bottom);
    const hautDeLaBarre = await barre.evaluate((el) => el.getBoundingClientRect().top);
    expect(basDeLaFeuille).toBeLessThanOrEqual(hautDeLaBarre);
  });
});

// ─── Setlist, mode louange, PDF ───────────────────────────────────────────────

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Léa",
  lastName: "Martin",
  planningName: "Léa M.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-jianpu-defaut";

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const setlist = (items: Record<string, unknown>[]) => ({
  title: "Culte du 11 octobre",
  leader: "Noé T.",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items,
});

/** Trois chants à scan : choix du responsable absent, « 简谱 », « Paroles ». */
const TROIS = [
  item({ songSlug: "一生爱你", position: 1 }),
  item({ songSlug: "为我而来", position: 2, jianpuSheet: true }),
  item({ songSlug: "我神我王", position: 3, jianpuSheet: false }),
];

async function ouvrirPartitions(page: Page, items: Record<string, unknown>[], pref?: string) {
  if (pref) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [PREF, pref]);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(items) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
  return db;
}

/** Ce que montre maintenant l'item n° `position` de la vue Partitions. */
async function etat(page: Page, position: number): Promise<"scan" | "paroles" | "vide"> {
  const bloc = page.locator(`[data-outline-item="${position}"]`);
  if ((await bloc.locator("[data-jianpu-page]").count()) > 0) return "scan";
  return (await bloc.locator("[data-copy-line]").count()) > 0 ? "paroles" : "vide";
}

/** Rendu des items donnés, attendu tel quel : le manifeste des scans arrive
 *  après les paroles, la bascule se fait donc en cours de route. */
const rendus = (page: Page, positions: number[]) =>
  expect.poll(() => Promise.all(positions.map((n) => etat(page, n))), { timeout: 20_000 });

const menu = async (page: Page) => {
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  return page.getByRole("menu");
};

test.describe("setlist, vue Partitions", () => {
  test("préférence non réglée : le scan, sauf « Paroles » du responsable", async ({ page }) => {
    await ouvrirPartitions(page, TROIS);
    await rendus(page, [1, 2, 3]).toEqual(["scan", "scan", "paroles"]);
  });

  test("préférence réglée sur 简谱 : le choix de la personne prime (D4)", async ({ page }) => {
    await ouvrirPartitions(page, TROIS, "always");
    await rendus(page, [1, 2, 3]).toEqual(["scan", "scan", "scan"]);
  });

  test("préférence réglée sur Paroles : jamais le scan", async ({ page }) => {
    await ouvrirPartitions(page, TROIS, "never");
    await rendus(page, [1, 2, 3]).toEqual(["paroles", "paroles", "paroles"]);
  });

  test("menu : « Partition 简谱 » est un interrupteur coché, plus de choix à trois", async ({ page }) => {
    await ouvrirPartitions(page, TROIS);
    await rendus(page, [1]).toEqual(["scan"]);
    const m = await menu(page);
    const interrupteur = m.getByRole("menuitemcheckbox", { name: "Partition 简谱" });
    await expect(interrupteur).toHaveAttribute("aria-checked", "true");
    for (const ancien of ["Choix du responsable", "Toujours", "Jamais"]) {
      await expect(m.getByRole("menuitemradio", { name: ancien })).toHaveCount(0);
    }
    await expect(m.getByText(/reste en paroles tant que tu n'as pas choisi toi-même/)).toBeVisible();

    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute("aria-checked", "false");
    expect(await lirePref(page)).toBe("never");
    await page.keyboard.press("Escape");
    await rendus(page, [1, 2]).toEqual(["paroles", "paroles"]);
  });

  for (const [stocke, coche] of [["auto", true], ["always", true], ["never", false]] as const) {
    test(`reprise : « ${stocke} » déjà stocké → interrupteur ${coche ? "coché" : "décoché"}`, async ({ page }) => {
      await ouvrirPartitions(page, TROIS, stocke);
      // L'ancien « Choix du responsable » suit encore le « Paroles » de l'item (O2).
      await rendus(page, [1, 3]).toEqual(stocke === "never" ? ["paroles", "paroles"] : stocke === "auto" ? ["scan", "paroles"] : ["scan", "scan"]);
      const m = await menu(page);
      await expect(m.getByRole("menuitemcheckbox", { name: "Partition 简谱" })).toHaveAttribute(
        "aria-checked",
        String(coche),
      );
      expect(await lirePref(page), "rien n'est réécrit au chargement").toBe(stocke);
    });
  }
});

test("mode louange : le scan par défaut ; l'interrupteur des Réglages est celui de la setlist", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await ouvrirPartitions(page, [item({ songSlug: "一生爱你", position: 1 })]);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.getByText("Mise en page…")).toHaveCount(0);
  await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();

  await page.getByRole("button", { name: "Réglages" }).click();
  const reglages = page.getByRole("dialog", { name: "Réglages" });
  const interrupteur = reglages.getByRole("switch", { name: "Partition 简谱" });
  await expect(interrupteur).toBeChecked();
  await interrupteur.click();
  await expect(interrupteur).not.toBeChecked();
  expect(await lirePref(page)).toBe("never");
  await page.keyboard.press("Escape");
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
  await expect(onStage(page, "[data-jianpu-page]")).toHaveCount(0);

  // En sortant, le menu de la setlist est déjà à jour (un seul état), sans recharger.
  const y = await page.evaluate(() => window.scrollY);
  const quitter = page.getByRole("button", { name: "Quitter" });
  // La barre s'escamote après 3 s : un toucher au centre la rappelle.
  if (!(await quitter.isVisible())) {
    const ecran = page.viewportSize()!;
    await page.mouse.click(ecran.width / 2, ecran.height / 2);
  }
  await quitter.click();
  await page.evaluate((to) => window.scrollTo(0, to), y);
  const m = await menu(page);
  await expect(m.getByRole("menuitemcheckbox", { name: "Partition 简谱" })).toHaveAttribute("aria-checked", "false");
});

test("PDF de setlist : le scan pour l'item sans choix, les paroles pour « Paroles »", () => {
  const source = readFileSync("content/songs/一生爱你.cho", "utf8");
  const doc = SetlistFullPDF({
    setlist: setlist([
      item({ songSlug: "一生爱你", position: 1 }),
      item({ songSlug: "一生爱你", position: 2, jianpuSheet: false }),
    ]) as never,
    contents: { "一生爱你": { slug: "一生爱你", ast: parseChordPro(source) } },
    showChords: true,
    jianpuSheets: JSON.parse(readFileSync("public/jianpu/index.json", "utf8")),
    // Sans image ré-encodée, le PDF retombe sur les paroles.
    jianpuImages: { "一生爱你-p1.webp": "data:image/png;base64," },
  });
  const pages = (doc.props as { children: { type: unknown }[] }).children;
  expect(pages.map((p) => (p.type === JianpuPDFPage ? "scan" : p.type === SongPDFPage ? "paroles" : "?"))).toEqual([
    "scan",
    "paroles",
  ]);
});

test("service worker : les scans et leurs manifestes sont gardés pour le hors-ligne (O15)", async () => {
  // Le service worker ne met rien en cache sur un serveur local : on l'exécute
  // ici comme en ligne, avec un cache et un réseau simulés.
  const handlers: Record<string, (e: unknown) => void> = {};
  const misEnCache: string[] = [];
  const cache = {
    match: async () => undefined,
    put: async (req: { url: string }) => { misEnCache.push(req.url); },
    addAll: async () => {},
  };
  const origin = "https://louange.example.org";
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { hostname: "louange.example.org", origin },
      addEventListener: (type: string, fn: (e: unknown) => void) => { handlers[type] = fn; },
      skipWaiting: () => {},
    },
    caches: { open: async () => cache, match: async () => undefined, keys: async () => [] },
    fetch: async () => ({ ok: true, clone() { return this; } }),
    URL,
  });
  const charger = async (chemin: string) => {
    let reponse: Promise<unknown> | undefined;
    handlers.fetch({
      request: { method: "GET", url: origin + chemin, mode: "no-cors" },
      respondWith: (p: Promise<unknown>) => { reponse = p; },
    });
    await reponse;
    await new Promise((r) => setTimeout(r, 0));
  };
  const scan = `/_next/image?url=${encodeURIComponent("/jianpu/一生爱你-p1.webp")}&w=1080&q=75`;
  for (const chemin of ["/jianpu/index.json", "/jianpu/chords.json", "/jianpu/一生爱你-p1.webp", scan]) {
    await charger(chemin);
  }
  await charger(`/_next/image?url=${encodeURIComponent("/logo-externe.png")}&w=64&q=75`);
  expect(misEnCache).toEqual([
    `${origin}/jianpu/index.json`,
    `${origin}/jianpu/chords.json`,
    `${origin}/jianpu/一生爱你-p1.webp`,
    `${origin}${scan}`,
  ]);
});

// ─── Éditeur : le « Paroles » du responsable s'écrit false, sans en inventer ──

test("éditeur, données : un item sans choix reste sans clé, « Paroles » reste false", () => {
  const index = JSON.parse(readFileSync("public/songs-index.json", "utf8")).songs as SongIndexEntry[];
  const songsMap = Object.fromEntries(index.map((s) => [s.slug, s]));
  const allerRetour = (over: Record<string, unknown>) =>
    buildSetlistItems(buildFormItems([item({ songSlug: "一生爱你", position: 1, ...over }) as SetlistItem], songsMap))[0];
  // Sinon le premier enregistrement automatique passerait toute la setlist en « Paroles ».
  expect("jianpuSheet" in allerRetour({}), "pas de clé inventée").toBe(false);
  expect(allerRetour({ jianpuSheet: false }).jianpuSheet).toBe(false);
  expect(allerRetour({ jianpuSheet: true }).jianpuSheet).toBe(true);
});

test("éditeur : « 谱 简谱 » actif d'office ; le désactiver écrit « Paroles » et l'historique le dit", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const doc = `setlists/${SETLIST_ID}`;
  const db = await signInAs(
    page,
    MUSICIEN,
    { [doc]: setlist([item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })]) },
    `/setlists/${SETLIST_ID}/edit`,
  );
  const dernierEnregistrement = async () => {
    await expect.poll(() => db.writes.filter((w) => w.path === doc).length).toBeGreaterThan(0);
    return db.writes.filter((w) => w.path === doc).pop()!.data.items as Record<string, unknown>[];
  };
  const bouton = page.getByRole("button", { name: /谱\s*简谱/ });
  await expect(bouton).toHaveAttribute("aria-pressed", "true");

  // Une retouche ailleurs : l'enregistrement automatique n'écrit pas « Paroles ».
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  let items = await dernierEnregistrement();
  expect(items.every((i) => !("jianpuSheet" in i)), "aucune clé jianpuSheet écrite").toBe(true);

  const avant = db.writes.length;
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => db.writes.slice(avant).some((w) => w.path === doc)).toBe(true);
  items = await dernierEnregistrement();
  expect(items.find((i) => i.songSlug === "一生爱你")!.jianpuSheet).toBe(false);
  expect("jianpuSheet" in items.find((i) => i.songSlug === "abba-pere")!).toBe(false);

  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Modifiée par Léa M\./ }).click();
  const historique = page.getByRole("dialog", { name: "Historique des modifications" });
  await expect(historique.getByText("一生爱你 joué sur les paroles")).toBeVisible();
});
