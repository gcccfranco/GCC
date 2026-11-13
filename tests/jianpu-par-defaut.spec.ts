import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirReglages } from "./helpers/louange";
import { fermerMenus, ouvrirAffichage, ouvrirPartitions as afficherPartitions } from "./helpers/setlist";
import { attendreEditeur, choisirTonalite, reglerElement, volet } from "./helpers/editeurSetlist";
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

test("règle : préférence × rôle « Je joue » (18 cas)", () => {
  const roles = [null, "pianiste", "guitariste", "batteur", "choriste", "presidence"];
  const paroles = ["choriste", "presidence"];
  for (const role of roles) {
    // Réglée : le choix de la personne prime sur son rôle (D4).
    expect(sheetEnabled("always", role), `always × ${role}`).toBe(true);
    expect(sheetEnabled("never", role), `never × ${role}`).toBe(false);
    // Non réglée : le scan, sauf choriste et présidence (paroles + pinyin).
    expect(sheetEnabled("auto", role), `auto × ${role}`).toBe(role === null || !paroles.includes(role));
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
  // Le segment « 简谱 · Paroles » sous l'en-tête (L3-T3) remplace le bouton 谱 de la barre.
  const bouton谱 = (page: Page) =>
    page.getByRole("radiogroup", { name: "简谱 · Paroles" }).getByRole("radio", { name: "简谱" });
  const boutonParoles = (page: Page) =>
    page.getByRole("radiogroup", { name: "简谱 · Paroles" }).getByRole("radio", { name: "Paroles" });

  test("un chant à scan s'ouvre sur son scan, sans action ; un chant FR reste en paroles", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);
    await expect(page.locator("[data-copy-line]"), "aucune ligne de paroles").toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-checked", "true");
    expect(await lirePref(page), "rien n'est écrit au chargement").toBeNull();

    await page.goto("/songs/abba-pere");
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveCount(0);
  });

  test("le segment « 简谱 · Paroles » règle la préférence de l'appareil : paroles, retenues au rechargement, puis scan", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);

    await boutonParoles(page).click();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-checked", "false");
    expect(await lirePref(page)).toBe("never");

    await page.reload();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(bouton谱(page)).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);

    await bouton谱(page).click();
    await scanCharge(page);
    await expect(bouton谱(page)).toHaveAttribute("aria-checked", "true");
    expect(await lirePref(page)).toBe("always");
  });

  test("téléphone : en fin de défilement, la fin de la feuille reste au-dessus de la barre d'onglets (K2)", async ({ page }) => {
    test.skip(test.info().project.name !== "telephone", "la barre d'onglets du téléphone");
    await page.goto(`/songs/${encodeURIComponent("为我而来")}`);
    // La page 2 est chargée en différé (`next/image`) : depuis que l'en-tête du site est
    // au-dessus du scan (L3-T3), elle est plus loin ; on va jusqu'à elle avant d'attendre.
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(2);
    await page.locator("[data-jianpu-page]").last().scrollIntoViewIfNeeded();
    await scanCharge(page);
    const barre = page.getByRole("navigation", { name: "Navigation principale" });
    // Depuis A6 (docs/spec-corrections-audit.md, commit a0160b48), la cale K2 n'est posée que si la barre
    // est rendue (`body:has([data-testid=barre-du-bas])`) ; la barre arrive avec la session : on l'attend
    // avant d'aller en bas, sinon la page s'allonge après le défilement.
    await expect(barre).toBeAttached();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // Un léger retour vers le haut fait revenir la barre, comme au doigt.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, -1));
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
  // Depuis SC1 (18/10/2026), seul le créateur adapte et modifie une setlist : la musicienne est la créatrice de la sienne.
  ownerId: "uid-musicien",
  isPrivate: false,
  items,
});

/** Trois chants à scan : choix du responsable absent, « 简谱 », « Paroles » (ancien champ, plus lu). */
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
  // Bascule « Partitions » sur G, partitions toujours à droite en deux volets.
  await afficherPartitions(page);
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

/** Le menu des réglages d'affichage : le bouton « Affichage » de la barre sur G, le sous-menu
 *  « Affichage » du ⋯ de l'en-tête en deux volets (tests/helpers/setlist.ts). */
const interrupteurMenu = async (page: Page) => {
  await ouvrirAffichage(page);
  return page.getByRole("menuitemcheckbox", { name: "Partition 简谱" });
};

test.describe("setlist, vue Partitions", () => {
  test("préférence non réglée : le scan, quel que soit le choix du responsable", async ({ page }) => {
    await ouvrirPartitions(page, TROIS);
    await rendus(page, [1, 2, 3]).toEqual(["scan", "scan", "scan"]);
  });

  for (const role of ["choriste", "presidence"]) {
    test(`préférence non réglée, rôle « ${role} » : paroles + pinyin ; réglée sur 简谱, le scan`, async ({ page }) => {
      await page.addInitScript((r) => localStorage.setItem(`perf-role-preset-${r.uid}`, r.role), { uid: MUSICIEN.uid, role });
      await ouvrirPartitions(page, TROIS);
      await rendus(page, [1, 2, 3]).toEqual(["paroles", "paroles", "paroles"]);
      await expect(page.locator('[data-outline-item="1"] [data-copy-pinyin]').first()).toBeAttached();
      await expect(await interrupteurMenu(page)).toHaveAttribute("aria-checked", "false");
    });

    test(`rôle « ${role} » + préférence « 简谱 » : le scan (le choix de la personne prime)`, async ({ page }) => {
      await page.addInitScript((r) => localStorage.setItem(`perf-role-preset-${r.uid}`, r.role), { uid: MUSICIEN.uid, role });
      await ouvrirPartitions(page, TROIS, "always");
      await rendus(page, [1, 2, 3]).toEqual(["scan", "scan", "scan"]);
    });
  }

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
    const interrupteur = await interrupteurMenu(page);
    await expect(interrupteur).toHaveAttribute("aria-checked", "true");
    for (const ancien of ["Choix du responsable", "Toujours", "Jamais"]) {
      await expect(page.getByRole("menuitemradio", { name: ancien })).toHaveCount(0);
    }
    await expect(page.getByText(/les paroles pour choriste et présidence/)).toBeVisible();

    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute("aria-checked", "false");
    expect(await lirePref(page)).toBe("never");
    await fermerMenus(page);
    await rendus(page, [1, 2]).toEqual(["paroles", "paroles"]);
  });

  for (const [stocke, coche] of [["auto", true], ["always", true], ["never", false]] as const) {
    test(`reprise : « ${stocke} » déjà stocké → interrupteur ${coche ? "coché" : "décoché"}`, async ({ page }) => {
      await ouvrirPartitions(page, TROIS, stocke);
      // L'ancien « Choix du responsable » est la préférence non réglée : le scan.
      await rendus(page, [1, 3]).toEqual(stocke === "never" ? ["paroles", "paroles"] : ["scan", "scan"]);
      await expect(await interrupteurMenu(page)).toHaveAttribute("aria-checked", String(coche));
      expect(await lirePref(page), "rien n'est réécrit au chargement").toBe(stocke);
    });
  }
});

test("mode louange : le scan par défaut ; le bouton des Options d'affichage est celui de la setlist", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await ouvrirPartitions(page, [item({ songSlug: "一生爱你", position: 1 })]);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();

  const reglages = await ouvrirReglages(page);
  const interrupteur = reglages.getByRole("button", { name: "Partition 简谱" });
  await expect(interrupteur).toHaveAttribute("aria-pressed", "true");
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute("aria-pressed", "false");
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
  await expect(await interrupteurMenu(page)).toHaveAttribute("aria-checked", "false");
});

test("PDF de setlist : le scan pour tous les items (préférence non réglée), les paroles pour « never »", () => {
  const source = readFileSync("content/songs/一生爱你.cho", "utf8");
  const pdf = (jianpuPref?: JianpuPref) =>
    SetlistFullPDF({
      setlist: setlist([
        item({ songSlug: "一生爱你", position: 1 }),
        // Ancien « Paroles » du responsable : plus lu.
        item({ songSlug: "一生爱你", position: 2, jianpuSheet: false }),
      ]) as never,
      contents: { "一生爱你": { slug: "一生爱你", ast: parseChordPro(source) } },
      showChords: true,
      ...(jianpuPref ? { jianpuPref } : {}),
      jianpuSheets: JSON.parse(readFileSync("public/jianpu/index.json", "utf8")),
      // Sans image ré-encodée, le PDF retombe sur les paroles.
      jianpuImages: { "一生爱你-p1.webp": "data:image/png;base64," },
    });
  const types = (doc: ReturnType<typeof pdf>) =>
    (doc.props as { children: { type: unknown }[] }).children.map((p) =>
      p.type === JianpuPDFPage ? "scan" : p.type === SongPDFPage ? "paroles" : "?");
  expect(types(pdf())).toEqual(["scan", "scan"]);
  expect(types(pdf("never"))).toEqual(["paroles", "paroles"]);
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
    keys: async () => [],
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
    // A3 : les écritures du cache passent par event.waitUntil.
    const attentes: Promise<unknown>[] = [];
    handlers.fetch({
      request: { method: "GET", url: origin + chemin, mode: "no-cors" },
      respondWith: (p: Promise<unknown>) => { reponse = p; },
      waitUntil: (p: Promise<unknown>) => { attentes.push(p); },
    });
    await reponse;
    await Promise.all(attentes);
    await new Promise((r) => setTimeout(r, 0));
  };
  // Forme réelle : images non optimisées, le navigateur demande le nom encodé.
  const scan = `/jianpu/${encodeURIComponent("一生爱你-p1.webp")}`;
  for (const chemin of ["/jianpu/index.json", "/jianpu/chords.json", scan]) {
    await charger(chemin);
  }
  // Hors /jianpu/ : jamais gardé ; /_next/image n'est plus une forme de scan.
  await charger(`/_next/image?url=${encodeURIComponent("/logo-externe.png")}&w=64&q=75`);
  await charger(`/_next/image?url=${encodeURIComponent("/jianpu/一生爱你-p1.webp")}&w=1080&q=75`);
  expect(misEnCache).toEqual([
    `${origin}/jianpu/index.json`,
    `${origin}/jianpu/chords.json`,
    `${origin}${scan}`,
  ]);
});

// ─── Éditeur : plus de « Jouer sur » ; l'ancien champ est toléré en lecture ──

test("éditeur, données : un item sans choix reste sans clé, l'ancien champ est conservé en lecture", () => {
  const index = JSON.parse(readFileSync("public/songs-index.json", "utf8")).songs as SongIndexEntry[];
  const songsMap = Object.fromEntries(index.map((s) => [s.slug, s]));
  const allerRetour = (over: Record<string, unknown>) =>
    buildSetlistItems(buildFormItems([item({ songSlug: "一生爱你", position: 1, ...over }) as SetlistItem], songsMap))[0];
  expect("jianpuSheet" in allerRetour({}), "pas de clé inventée").toBe(false);
  expect(allerRetour({ jianpuSheet: false }).jianpuSheet).toBe(false);
  expect(allerRetour({ jianpuSheet: true }).jianpuSheet).toBe(true);
});

test("éditeur : plus de « Jouer sur », aucune clé jianpuSheet écrite ; une ancienne setlist « Paroles » s'ouvre sans erreur", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const doc = `setlists/${SETLIST_ID}`;
  const db = await signInAs(
    page,
    MUSICIEN,
    { [doc]: setlist([item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2, jianpuSheet: false })]) },
    `/setlists/${SETLIST_ID}/edit`,
  );
  await attendreEditeur(page, "Abba Père");
  /** Les items du dernier enregistrement de la setlist ([] tant qu'il n'y en a pas). */
  const dernierEnregistrement = () =>
    (db.writes.filter((w) => w.path === doc).pop()?.data.items ?? []) as Record<string, unknown>[];

  await reglerElement(page, "一生爱你");
  await expect(volet(page).getByRole("radiogroup", { name: "Jouer sur" })).toHaveCount(0);
  await expect(volet(page).getByRole("radio", { name: "Paroles" })).toHaveCount(0);

  // Une retouche ailleurs : l'enregistrement automatique n'écrit aucune clé jianpuSheet neuve.
  await choisirTonalite(page, "Abba Père", "B");
  await expect.poll(() => dernierEnregistrement()[0]?.keyOverride, { timeout: 10_000 }).toBe("B");
  expect("jianpuSheet" in dernierEnregistrement().find((i) => i.songSlug === "abba-pere")!, "aucune clé jianpuSheet écrite").toBe(false);
  expect(erreurs).toEqual([]);
});
