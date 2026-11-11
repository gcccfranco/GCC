import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";
import { contraste, garderContraste, FOND_CLAIR } from "../src/lib/performance/couleurIcones";

// Lot CA, tranche CA-A (docs/spec-mode-louange-forscore-2.md) : la couleur des accords au choix de chacun, retenue par
// compte sur l'appareil (`accords-couleurs-<uid>`), appliquée sur la page du chant, la vue partitions et le mode louange.
// Dans cette tranche les choix se posent par la clé de stockage (le réglage arrive en CA-B). Comptes simulés, noms fictifs.

const SETLIST_ID = "setlist-couleur-accords";
const profil = (uid: string, prenom: string, nom: string): FakeProfile => ({
  uid,
  // Sans accent : le navigateur refuse « é » avant le @ et le formulaire de connexion ne part pas.
  email: `${prenom}-${nom}@example.com`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  firstName: prenom,
  lastName: nom,
  serviceRoles: { "Culte Francophone": ["musicien"] },
});
const ELODIE = profil("uid-elodie", "Élodie", "Marchand");
const GASPARD = profil("uid-gaspard", "Gaspard", "Lenoir");

const CHANT = { fr: "a-jamais-tu-es-saint", zh: "一生爱你" } as const;
type Langue = keyof typeof CHANT;
type Surface = "chant" | "partitions" | "louange";
const SURFACES: Surface[] = ["chant", "partitions", "louange"];
const DISPOSITIONS = ["classique", "sections", "reperes", "scene", "partition"] as const;
type Disposition = (typeof DISPOSITIONS)[number];

const VIOLET = "#6d4bc3";
const VERT = "#1f7a5c";
const JAUNE = "#ffd60a";
// Fond le plus défavorable de la Scène claire (--sec-bridge-tint) : la garde se fait contre lui.
const FOND_SCENE_CLAIR = "#f0ecf9";

const cle = (p: FakeProfile | null) => (p ? `accords-couleurs-${p.uid}` : "accords-couleurs");
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slug: string) => ({
  title: "Culte d'essai des couleurs d'accords",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-10",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item(slug, 1)],
});

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const canaux = (css: string) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
const versHex = (css: string) => `#${canaux(css).map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

/** Réglages de départ posés une seule fois (le script d'initialisation rejoue à chaque chargement de page). */
async function preparer(page: Page, opts: { theme?: "light" | "dark"; disposition?: Disposition; init?: Record<string, string>; deuxColonnes?: boolean } = {}) {
  const { theme = "light", disposition = "classique", init = {}, deuxColonnes = false } = opts;
  await page.addInitScript(([th, d, extra, cols]) => {
    try {
      if (!localStorage.getItem("couleur-accords-init")) {
        localStorage.setItem("couleur-accords-init", "1");
        localStorage.setItem("theme", th as string);
        localStorage.setItem("perf-theme", th as string);
        localStorage.setItem("disposition", d as string);
        localStorage.setItem("perf-role-preset", "pianiste");
        // Le chant chinois a un scan 简谱 : sans « never », il s'affiche sur le scan et n'a pas de ligne d'accords.
        localStorage.setItem("jianpu-sheet-pref", "never");
        if (cols) localStorage.setItem("perf-two-columns", "1");
        for (const [k, v] of Object.entries(extra as Record<string, string>)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, [theme, disposition, init, deuxColonnes] as const);
}

async function ouvrir(page: Page, surface: Surface, slug: string, compte: FakeProfile | null) {
  // Slug chinois encodé : `signInAs` compare le chemin tel que le navigateur l'écrit (%E4…).
  const chemin = surface === "chant" ? `/songs/${encodeURIComponent(slug)}` : `/setlists/${SETLIST_ID}`;
  const db = compte
    ? await signInAs(page, compte, { [`setlists/${SETLIST_ID}`]: setlist(slug) }, chemin)
    : (await page.goto(chemin), null);
  if (surface === "partitions") await ouvrirPartitions(page);
  if (surface === "louange") {
    await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
    await attendreMiseEnPage(page);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  }
  return db;
}

/** Premier accord affiché de la langue, là où la surface le montre. */
function accord(page: Page, surface: Surface, langue: Langue): Locator {
  const sel = langue === "fr" ? ".font-chord[data-copy-ignore]" : "[data-accord]";
  const racine = surface === "chant" ? page.locator(`main ${sel}`)
    : surface === "partitions" ? page.locator(`[data-outline-item] ${sel}`)
    : onStage(page, sel);
  return racine.filter({ hasText: /\S/ }).first();
}
const couleurDe = async (l: Locator) => {
  await expect(l).toBeAttached({ timeout: 20_000 });
  return l.evaluate((el) => getComputedStyle(el).color);
};

/** Couleur d'origine d'avant le lot, par disposition (page claire). */
function origine(langue: Langue, d: Disposition): string {
  if (d === "sections") return rgb("#1c1c1e");
  if (langue === "zh" && (d === "classique" || d === "reperes")) return rgb("#b3261d");
  return rgb("#3f63cf");
}
const fond = (d: Disposition) => (d === "scene" ? FOND_SCENE_CLAIR : FOND_CLAIR);

/** Change de compte sur le même appareil : la session Firebase part, le localStorage de l'appareil reste. */
async function changerDeCompte(page: Page) {
  await page.evaluate(() => { indexedDB.deleteDatabase("firebaseLocalStorageDb"); });
  await page.goto("about:blank");
}

// ─── (a) et (b) : une couleur posée colore sa langue seulement ; sans choix, l'origine ────────────────────

for (const surface of SURFACES) {
  for (const d of DISPOSITIONS) {
    for (const langue of ["fr", "zh"] as const) {
      test(`${surface}, ${d} : accords ${langue} (l'autre langue est celle qui ne bouge pas : choix français violet seul)`, async ({ page }) => {
        await preparer(page, { disposition: d, init: { [cle(ELODIE)]: JSON.stringify({ fr: VIOLET, zh: null }) } });
        await ouvrir(page, surface, CHANT[langue], ELODIE);
        const attendue = langue === "fr" ? rgb(garderContraste(VIOLET, fond(d))) : origine("zh", d);
        await expect.poll(() => couleurDe(accord(page, surface, langue))).toBe(attendue);
      });
    }
  }
}

test("choix chinois seul : les accords chinois changent, les français gardent l'origine (page du chant, Classique)", async ({ page }) => {
  await preparer(page, { init: { [cle(ELODIE)]: JSON.stringify({ fr: null, zh: VERT }) } });
  await ouvrir(page, "chant", CHANT.zh, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "zh"))).toBe(rgb(garderContraste(VERT, FOND_CLAIR)));
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(origine("fr", "classique"));
});

test("sans choix, Classique : fonds de section d'avant le lot (±2 par canal)", async ({ page }) => {
  await preparer(page);
  await ouvrir(page, "chant", CHANT.fr, null);
  // Attendre le rendu de la partition : lire les sections trop tôt rendait une liste vide.
  await expect(accord(page, "chant", "fr")).toBeAttached({ timeout: 20_000 });
  // Sections pleines seulement (refrain…) ; relu jusqu'à ce qu'elles soient peintes (panneau de 1 440 px plus lent).
  const lireFonds = () => page.locator("main [data-section]").evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== "rgba(0, 0, 0, 0)"));
  await expect.poll(async () => (await lireFonds()).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const fonds = await lireFonds();
  for (const f of fonds) canaux(f).forEach((c, i) => expect(Math.abs(c - [226, 231, 247][i])).toBeLessThanOrEqual(2));
});

// ─── (c) comptes ─────────────────────────────────────────────────────────────────────────────────────

test("comptes : Élodie violet, Gaspard voit l'origine, Élodie retrouve violet", async ({ page }) => {
  await preparer(page, { init: { [cle(ELODIE)]: JSON.stringify({ fr: VIOLET, zh: null }) } });
  const violet = rgb(garderContraste(VIOLET, FOND_CLAIR));
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(violet);
  await changerDeCompte(page);
  await ouvrir(page, "chant", CHANT.fr, GASPARD);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(origine("fr", "classique"));
  await changerDeCompte(page);
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(violet);
});

test("sans compte : la clé d'appareil ; un compte ne la lit pas", async ({ page }) => {
  await preparer(page, { init: { "accords-couleurs": JSON.stringify({ fr: VIOLET, zh: null }) } });
  await ouvrir(page, "chant", CHANT.fr, null);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(rgb(garderContraste(VIOLET, FOND_CLAIR)));
  await ouvrir(page, "chant", CHANT.fr, GASPARD);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(origine("fr", "classique"));
});

test("couleur des icônes par compte : la clé d'appareil n'est reprise que par le premier compte", async ({ page }) => {
  await preparer(page, { init: { "perf-couleur-icones": "#c2185b" } });
  const icones = () => page.locator("[data-performance-mode]").evaluate((el) => el.style.getPropertyValue("--couleur-icones"));
  await ouvrir(page, "louange", CHANT.fr, ELODIE);
  await expect.poll(icones).toBe(garderContraste("#c2185b", FOND_CLAIR));
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), `perf-couleur-icones-${ELODIE.uid}`)).toBe("#c2185b");
  await changerDeCompte(page);
  await ouvrir(page, "louange", CHANT.fr, GASPARD);
  await expect.poll(icones).toBe(garderContraste("#3f63cf", FOND_CLAIR));
  expect(await page.evaluate((k) => localStorage.getItem(k), `perf-couleur-icones-${GASPARD.uid}`)).toBeNull();
});

// ─── (d) stockage qui lève, valeur illisible ─────────────────────────────────────────────────────────

test("stockage qui lève : aucune exception, couleur d'origine", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k: string) { if (k.startsWith("accords-couleurs")) throw new Error("stockage indisponible"); return get.call(this, k); };
    Storage.prototype.setItem = function (k: string, v: string) { if (k.startsWith("accords-couleurs")) throw new Error("stockage indisponible"); return set.call(this, k, v); };
  });
  await preparer(page);
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(origine("fr", "classique"));
  expect(erreurs).toEqual([]);
});

for (const illisible of ["{pas du json", JSON.stringify({ fr: "rouge", zh: 12 }), "null"]) {
  test(`valeur illisible (${illisible}) : couleur d'origine`, async ({ page }) => {
    await preparer(page, { init: { [cle(ELODIE)]: illisible } });
    await ouvrir(page, "chant", CHANT.fr, ELODIE);
    await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(origine("fr", "classique"));
  });
}

// ─── (e) garde de lisibilité ─────────────────────────────────────────────────────────────────────────

test("garde : #ffd60a assombri sur page claire (Classique) et en Scène claire (mode louange), tel quel en sombre", async ({ page }) => {
  await preparer(page, { init: { [cle(ELODIE)]: JSON.stringify({ fr: JAUNE, zh: null }) } });
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  const claire = versHex(await couleurDe(accord(page, "chant", "fr")));
  expect(claire).not.toBe(JAUNE);
  expect(contraste(claire, FOND_CLAIR)).toBeGreaterThanOrEqual(4.5);
});

test("garde : Scène claire, mode louange", async ({ page }) => {
  await preparer(page, { disposition: "scene", init: { [cle(ELODIE)]: JSON.stringify({ fr: JAUNE, zh: null }) } });
  await ouvrir(page, "louange", CHANT.fr, ELODIE);
  const c = versHex(await couleurDe(accord(page, "louange", "fr")));
  expect(c).not.toBe(JAUNE);
  expect(contraste(c, FOND_SCENE_CLAIR)).toBeGreaterThanOrEqual(4.5);
});

test("garde : thème sombre, le jaune reste tel quel", async ({ page }) => {
  await preparer(page, { theme: "dark", init: { [cle(ELODIE)]: JSON.stringify({ fr: JAUNE, zh: null }) } });
  await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(rgb(JAUNE));
});

// ─── (f) mode louange : copie de mesure et écran ─────────────────────────────────────────────────────

test("mode louange : mêmes couleurs dans la copie de mesure et à l'écran (deux colonnes si la place le permet)", async ({ page }) => {
  await preparer(page, { deuxColonnes: true, init: { [cle(ELODIE)]: JSON.stringify({ fr: VIOLET, zh: null }) } });
  await ouvrir(page, "louange", CHANT.fr, ELODIE);
  const attendue = rgb(garderContraste(VIOLET, FOND_CLAIR));
  await expect.poll(() => couleurDe(accord(page, "louange", "fr"))).toBe(attendue);
  const copie = page.locator("[data-performance-mode] [aria-hidden=true] .font-chord[data-copy-ignore]").first();
  await expect.poll(() => couleurDe(copie)).toBe(attendue);
});

// ─── (g) hors partition ──────────────────────────────────────────────────────────────────────────────

test("hors partition : variables globales intactes, badge de tonalité et Harmonie gardent leur couleur ; aucune écriture Firestore", async ({ page }) => {
  await preparer(page, { init: { [cle(ELODIE)]: JSON.stringify({ fr: VIOLET, zh: VERT }) } });
  const db = await ouvrir(page, "chant", CHANT.fr, ELODIE);
  await expect.poll(() => couleurDe(accord(page, "chant", "fr"))).toBe(rgb(garderContraste(VIOLET, FOND_CLAIR)));
  const racine = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return { fr: s.getPropertyValue("--accord-fr"), zh: s.getPropertyValue("--accord-zh"), chord: s.getPropertyValue("--chord-color").trim(), jianpu: s.getPropertyValue("--jianpu-color").trim() };
  });
  expect(racine).toEqual({ fr: "", zh: "", chord: "#3f63cf", jianpu: "#b3261d" });
  const badge = page.locator('main span[class*="border-[1.5px]"]').first();
  await expect(badge).toBeVisible();
  expect(await badge.evaluate((el) => getComputedStyle(el).color)).toBe(rgb("#3f63cf"));
  await page.goto("/harmonie");
  await page.waitForLoadState("networkidle");
  for (const c of await page.locator(".font-chord").evaluateAll((els) => els.map((e) => getComputedStyle(e).color))) {
    expect(c).not.toBe(rgb(garderContraste(VIOLET, FOND_CLAIR)));
  }
  expect(db!.writes.filter((w) => /accords/.test(w.path))).toEqual([]);
});
