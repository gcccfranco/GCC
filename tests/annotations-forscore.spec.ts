import { readFileSync } from "node:fs";
import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, basculerAnnoter, onStage } from "./helpers/louange";
import { APPUI_ANNEAU_MS, APPUI_CRAYON_MS, classerAppui } from "../src/lib/performance/gestes";
import { FOND_CLAIR, FOND_SOMBRE, contraste, garderContraste } from "../src/lib/performance/couleurIcones";
import { boiteSigne, strokeHitTest, styleTrait } from "../src/lib/annotations/strokes";
import { ancrerSigne, decouper, estSigne, estTrait, projeterSigne, traitsAplatis, traitsValides } from "../src/lib/annotations/ancres";
import { cercle, fleche, glyphesTampon, pointOrgue, polylignes, respiration, soufflet, texteTampon, SIGNES, CODES_MUSIQUE } from "../src/lib/annotations/tampons";
import { INDICES_TELEPHONE, PREREGLAGES_DEFAUT, lirePrereglages } from "../src/lib/annotations/prereglages";
import { annuler, historiqueVide, MAX_ETATS, noter, peutAnnuler, peutRetablir, retablir } from "../src/lib/annotations/historique";
import type { Trait } from "../src/types/partition";
import { accrocheSuivante, lirePosition, normaliser, placerBarre, poserBarre, type Zone } from "../src/lib/performance/barreAnnotation";

// Annotations façon forScore, tranche AN-3a (docs/spec-mode-louange-forscore-2.md, « AN ») : la barre d'annotation
// attachée (à la place de la barre de titre, ou en haut et en bas au téléphone), Annuler / Rétablir par chant,
// Tout effacer confirmé, indicateur d'état, repères de section au-dessus de l'encre. Base simulée, compte fictif.
// Agencement : dans SPECS_GRAND_ECRAN.

const ODILE: FakeProfile = {
  uid: "uid-odile", email: "odile.perrin@example.invalid", firstName: "Odile", lastName: "Perrin", planningName: "Odile P.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const SL = "annotations-sl";
const PARTITION = `partitions/${ODILE.uid}__abba-pere`;
const COUPURE = (route: { abort(): Promise<void> }) => route.abort();
const PARTITIONS = /firestore\.googleapis\.com.*partitions/;

const item = { songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" };
const DOCS = {
  [`setlists/${SL}`]: {
    title: "Culte du 4 octobre", leader: "Odile P.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
    ownerId: ODILE.uid, isPrivate: false, items: [item],
  },
};

async function ouvrirLouange(page: Page, couleur?: string, echelle?: string) {
  await page.addInitScript(([c, cle, ech]) => {
    if (ech && !sessionStorage.getItem("pw-echelle")) { localStorage.setItem("perf-font-scale", ech); sessionStorage.setItem("pw-echelle", "1"); }
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("perf-theme", "light");
    if (c && !localStorage.getItem(cle)) localStorage.setItem(cle, c);
  }, [couleur ?? "", `perf-couleur-icones-${ODILE.uid}`, echelle ?? ""]);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, ODILE, DOCS, `/setlists/${SL}`);
  await ouvrirMode(page);
  return db;
}
async function ouvrirMode(page: Page) {
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

const telephone = (page: Page) => page.viewportSize()!.width < 768;
const barre = (page: Page) => page.locator('[data-crayon-barre="haut"]');
const dansBarres = (page: Page) => page.locator('[data-performance-mode] [data-crayon-barre="haut"], [data-performance-mode] [data-crayon-barre-bas]');
const bouton = (page: Page, nom: string) => dansBarres(page).getByRole("button", { name: nom, exact: true });

const traitsEcrits = (db: FakeDb) => (db.doc(PARTITION)?.traits as unknown[] | undefined) ?? [];

/** Un trait sur la première ligne de paroles de la page (au milieu, loin des repères de section). */
async function tracer(page: Page) {
  const ligne = (await onStage(page, "[data-trait-section]").first().boundingBox())!;
  const y = ligne.y + ligne.height / 2;
  await page.mouse.move(ligne.x + ligne.width * 0.3, y);
  await page.mouse.down();
  await page.mouse.move(ligne.x + ligne.width * 0.45, y + 2, { steps: 5 });
  await page.mouse.move(ligne.x + ligne.width * 0.6, y, { steps: 5 });
  await page.mouse.up();
}

const unTrait = (n: number): Trait => ({ ancre: { section: "s", ligne: 0, car: 0 }, outil: "pen", couleur: "#dc2626", epaisseur: 0.1, points: [[0, 0], [n, 0]] });

test.describe("historique des traits : fonctions pures (sans page)", () => {
  const [a, b, c] = [[unTrait(1)], [unTrait(1), unTrait(2)], [unTrait(1), unTrait(2), unTrait(3)]];

  test("noter, annuler, rétablir ; une nouvelle action vide Rétablir", () => {
    let h = historiqueVide();
    expect(peutAnnuler(h, "x")).toBe(false);
    expect(annuler(h, "x", {})).toBeNull();
    h = noter(h, { x: [] });
    h = noter(h, { x: a });
    const r1 = annuler(h, "x", { x: b })!;
    expect(r1.rendus).toEqual({ x: a });
    expect(peutRetablir(r1.h, "x")).toBe(true);
    const r2 = retablir(r1.h, "x", { x: a })!;
    expect(r2.rendus).toEqual({ x: b });
    expect(peutRetablir(r2.h, "x")).toBe(false);
    const r3 = annuler(r2.h, "x", { x: b })!;
    expect(noter(r3.h, { x: c }).retablir).toEqual({});
  });

  test(`${MAX_ETATS} états au plus par chant : le plus ancien tombe`, () => {
    let h = historiqueVide();
    for (let i = 0; i < MAX_ETATS + 5; i++) h = noter(h, { x: [unTrait(i)] });
    expect(h.annuler.x).toHaveLength(MAX_ETATS);
    expect(h.annuler.x[0].etats).toEqual([unTrait(5)]);
  });

  test("une action sur deux chants se défait et se rétablit d'un bloc ; un autre chant reste à lui", () => {
    let h = historiqueVide();
    h = noter(h, { y: [unTrait(9)] });
    h = noter(h, { x: a, y: b });
    const r = annuler(h, "x", { x: [], y: [] })!;
    expect(r.rendus).toEqual({ x: a, y: b });
    expect(peutAnnuler(r.h, "y")).toBe(true); // son action seule, d'avant
    expect(annuler(r.h, "y", { y: b })!.rendus).toEqual({ y: [unTrait(9)] });
    const rr = retablir(r.h, "y", { x: a, y: b })!;
    expect(rr.rendus).toEqual({ x: [], y: [] });
  });
});

test("(a) le Crayon prend la place de la barre de titre (tablette, ordinateur) ; deux barres au téléphone", async ({ page }) => {
  await ouvrirLouange(page);
  const titre = (await page.locator("[data-barre-haut]").boundingBox())!;
  await basculerAnnoter(page);
  await expect(barre(page)).toBeVisible();
  await expect(page.locator("[data-barre-haut]")).toHaveCount(0);
  const haut = (await barre(page).boundingBox())!;
  expect(haut.y).toBeCloseTo(titre.y, 0);
  expect(haut.height).toBeCloseTo(titre.height, 0);
  if (telephone(page)) {
    await expect(page.locator("[data-crayon-barre-bas]")).toBeVisible();
    await expect(page.locator("[data-barre-bas]")).toHaveCount(0);
    await expect(page.locator("[data-page-courte]")).toContainText("p. 1/");
  } else {
    await expect(page.locator("[data-barre-bas]")).toBeVisible();
    await expect(page.locator("[data-crayon-barre-bas]")).toHaveCount(0);
  }
  await bouton(page, "Terminé").click();
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
});

test("(b) aucun débordement horizontal de la barre", async ({ page }) => {
  await ouvrirLouange(page);
  await basculerAnnoter(page);
  await expect(barre(page)).toBeVisible();
  const mesures = await dansBarres(page).evaluateAll((els) => els.map((el) => [el.scrollWidth, el.clientWidth]));
  expect(mesures.length).toBe(telephone(page) ? 2 : 1);
  for (const [sw, cw] of mesures) expect(sw).toBeLessThanOrEqual(cw);
});

test("(c) Annuler retire le trait de ma partition, Rétablir le rend ; au clavier aussi", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  await expect(bouton(page, "Annuler")).toBeDisabled();
  await tracer(page);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  await expect(bouton(page, "Annuler")).toBeEnabled();
  await bouton(page, "Annuler").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(0);
  await expect(bouton(page, "Rétablir")).toBeEnabled();
  await bouton(page, "Rétablir").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  for (const [touches, attendu] of [["Control+z", 0], ["Control+y", 1], ["Meta+z", 0], ["Meta+Shift+z", 1]] as const) {
    await page.keyboard.press(touches);
    await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000, message: touches }).toBe(attendu);
  }
});

test("(d) Tout effacer demande confirmation ; refus : traits gardés ; accord : traits vides ; Annuler les rend", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  await tracer(page);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  const ecritures = db.writes.length;
  await bouton(page, "Plus").click();
  await page.getByRole("button", { name: /^Tout effacer/ }).click();
  const dialogue = page.getByRole("alertdialog", { name: "Effacer mes traits de cette page ?" });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(dialogue).toBeHidden();
  await page.waitForTimeout(1_200); // plus que le délai de regroupement des écritures (800 ms)
  expect(db.writes.length).toBe(ecritures);
  expect(traitsEcrits(db)).toHaveLength(1);

  await bouton(page, "Plus").click();
  await page.getByRole("button", { name: /^Tout effacer/ }).click();
  await dialogue.getByRole("button", { name: "Tout effacer", exact: true }).click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(0);
  await bouton(page, "Annuler").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
});

test("(e) écriture qui échoue : « En attente » ; réseau rendu : « Enregistré » et le trait est écrit", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  const etat = page.locator("[data-etat-traits]");
  await expect(etat).toHaveAttribute("data-etat-traits", "enregistre");
  await page.route(PARTITIONS, COUPURE);
  await tracer(page);
  await expect(etat).toHaveAttribute("data-etat-traits", "en-attente", { timeout: 15_000 });
  await expect(etat).toHaveText("En attente");
  await page.unroute(PARTITIONS, COUPURE);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(etat).toHaveAttribute("data-etat-traits", "enregistre", { timeout: 15_000 });
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
});

test("(f) en Crayon, les repères de section passent au-dessus de l'encre et ne répondent plus au toucher", async ({ page }) => {
  // Les pastilles n'existent qu'en disposition « Repères » ; les indices de rappel (une fois par appareil) sont déjà vus.
  await page.addInitScript(() => {
    localStorage.setItem("disposition", "reperes");
    localStorage.setItem("perf-astuce-rappel-joue", "2");
    localStorage.setItem("perf-astuce-rappel-unique", "2");
  });
  await ouvrirLouange(page);
  const pastille = onStage(page, "[data-repere-pastille]").first();
  await expect(pastille).toBeVisible();
  await expect(pastille).toHaveCSS("pointer-events", "auto");
  await basculerAnnoter(page);
  await expect(page.locator("[data-performance-mode] canvas[data-reperes-dessus]")).toBeAttached();
  await expect(pastille).toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(pastille).toHaveCSS("pointer-events", "auto");
});

test("(g) la couleur des icônes choisie colore Terminé (corrigée pour le contraste)", async ({ page }) => {
  await ouvrirLouange(page, "#c2185b");
  await basculerAnnoter(page);
  const n = parseInt(garderContraste("#c2185b", FOND_CLAIR).slice(1), 16);
  await expect(page.getByRole("button", { name: "Terminé", exact: true })).toHaveCSS("color", `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`);
});

// ─── AN-2 : entrer, sortir, tourner la page ──────────────────────────────────

test.describe("classerAppui : fonction pure (sans page)", () => {
  test("rien avant 200 ms, anneau jusqu'à 500 ms, Crayon ensuite ; plus de 10 px annule", () => {
    expect(classerAppui(0, 0)).toBe("rien");
    expect(classerAppui(0, APPUI_ANNEAU_MS - 1)).toBe("rien");
    expect(classerAppui(0, APPUI_ANNEAU_MS)).toBe("anneau");
    expect(classerAppui(10, APPUI_CRAYON_MS - 1)).toBe("anneau");
    expect(classerAppui(10, APPUI_CRAYON_MS)).toBe("crayon");
    expect(classerAppui(11, 0)).toBe("annule");
    expect(classerAppui(30, 700)).toBe("annule");
  });
});

// Le mode écrit seul sa préférence de langue (notifPrefs) à l'ouverture ; `:commit` est le lot d'écriture de la partition.
const ailleursQuePartitions = (db: FakeDb) => db.writes.filter((w) => !/^(partitions\/|:commit|notifPrefs\/)/.test(w.path));
const racine = (page: Page) => page.locator("[data-performance-mode]");
const clePage = (page: Page) => racine(page).getAttribute("data-cle-page");

/** Un évènement de stylet, envoyé à l'élément sous le point (la page, puis le canvas une fois le Crayon ouvert). */
const stylet = (page: Page, type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number) =>
  page.evaluate(([t, px, py]) => {
    document.elementFromPoint(px as number, py as number)?.dispatchEvent(new PointerEvent(t as string, {
      pointerType: "pen", pointerId: 7, isPrimary: true, button: 0, buttons: t === "pointerup" ? 0 : 1, clientX: px as number, clientY: py as number, bubbles: true, cancelable: true,
    }));
  }, [type, x, y]);

/** Un trait au stylet sur la première ligne de paroles, du contact au lever. */
async function traitStylet(page: Page) {
  const ligne = (await onStage(page, "[data-trait-section]").first().boundingBox())!;
  const y = ligne.y + ligne.height / 2;
  const x0 = ligne.x + ligne.width * 0.3;
  await stylet(page, "pointerdown", x0, y);
  for (let i = 1; i <= 8; i++) await stylet(page, "pointermove", x0 + i * 12, y + (i % 2));
  await stylet(page, "pointerup", x0 + 96, y);
}

/** Note, dans `window.__anneau`, que l'anneau de l'appui long est apparu (il ne vit que 300 ms). */
const guetterAnneau = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __anneau: boolean };
  w.__anneau = false;
  new MutationObserver(() => { if (document.querySelector("[data-anneau-appui]")) w.__anneau = true; }).observe(document.body, { childList: true, subtree: true });
});
const anneauVu = (page: Page) => page.evaluate(() => (window as unknown as { __anneau: boolean }).__anneau);

test("(h) l'appui long de 600 ms entre en Crayon, l'anneau se voit entre-temps ; un toucher rapide ou un appui qui glisse non", async ({ page }) => {
  await ouvrirLouange(page);
  await guetterAnneau(page);
  const ligne = (await onStage(page, "[data-trait-section]").first().boundingBox())!;
  const x = ligne.x + ligne.width / 2;
  const y = ligne.y + ligne.height / 2;
  // Toucher rapide : ni anneau ni Crayon.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(APPUI_CRAYON_MS + 200);
  expect(await anneauVu(page)).toBe(false);
  await expect(barre(page)).toHaveCount(0);
  // Appui qui glisse de 30 px avant 200 ms : annulé, rien ne se montre.
  await page.mouse.down();
  await page.mouse.move(x + 30, y, { steps: 3 });
  await page.waitForTimeout(APPUI_CRAYON_MS + 200);
  await page.mouse.up();
  expect(await anneauVu(page)).toBe(false);
  await expect(barre(page)).toHaveCount(0);
  // Appui long : l'anneau apparaît, puis le Crayon s'ouvre ; le lever qui suit ne bascule pas la barre. (Réessayé : le Crayon n'est offert qu'une fois ma partition lue.)
  await expect(async () => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(APPUI_CRAYON_MS + 100);
    await page.mouse.up();
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  expect(await anneauVu(page)).toBe(true);
  await page.waitForTimeout(300);
  await expect(barre(page)).toBeVisible();
  await expect(page.locator("[data-anneau-appui]")).toHaveCount(0);
});

test("(h bis) au doigt, l'appui long de 600 ms entre en Crayon et le lever qui suit ne tourne pas la page", async ({ page }) => {
  await ouvrirLouange(page, undefined, "1.5");
  const bord = { x: page.viewportSize()!.width - 6, y: page.viewportSize()!.height / 2 };
  const doigt = (type: "pointerdown" | "pointerup") => page.evaluate(([t, px, py]) => {
    const w = window as unknown as { __cible?: Element | null };
    if (t === "pointerdown") w.__cible = document.elementFromPoint(px as number, py as number);
    w.__cible?.dispatchEvent(new PointerEvent(t as string, {
      pointerType: "touch", pointerId: 9, isPrimary: true, button: 0, buttons: t === "pointerup" ? 0 : 1, clientX: px as number, clientY: py as number, bubbles: true, cancelable: true,
    }));
  }, [type, bord.x, bord.y]);
  const cle = await clePage(page);
  await expect(async () => {
    await doigt("pointerdown");
    await page.waitForTimeout(APPUI_CRAYON_MS + 100);
    await doigt("pointerup");
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.waitForTimeout(300);
  expect(await clePage(page)).toBe(cle);
  await expect(barre(page)).toBeVisible();
});

test("(i) un stylet entre en Crayon et dessine dès le contact ; il ne tourne jamais la page", async ({ page }) => {
  const db = await ouvrirLouange(page, undefined, "1.5");
  await expect(async () => { expect((await clePage(page))).toBeTruthy(); }).toPass();
  const bord = { x: page.viewportSize()!.width - 6, y: page.viewportSize()!.height / 2 };
  // En Crayon : un stylet sur le bord droit ne tourne pas la page (plus loin, le trait du stylet).
  await expect(async () => {
    await traitStylet(page);
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  const cle = await clePage(page);
  await bouton(page, "Terminé").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  expect(ailleursQuePartitions(db)).toEqual([]);
  // Hors Crayon : un stylet sur le bord droit ouvre le Crayon, il ne tourne pas la page.
  await stylet(page, "pointerdown", bord.x, bord.y);
  await stylet(page, "pointerup", bord.x, bord.y);
  await expect(barre(page)).toBeVisible();
  expect(await clePage(page)).toBe(cle);
  // En Crayon : sur le bord droit le stylet dessine (un point), il ne tourne pas la page non plus.
  await stylet(page, "pointerdown", bord.x, bord.y);
  await stylet(page, "pointerup", bord.x, bord.y);
  await page.waitForTimeout(300);
  expect(await clePage(page)).toBe(cle);
});

test("(j) « le doigt ne dessine pas » s'allume au premier trait au stylet, avis une seule fois, retenu ; l'interrupteur de ⋯ l'éteint", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await expect(async () => {
    await traitStylet(page);
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("annot-doigt-libre"))).toBe("1");
  const avis = page.locator("[data-avis-doigt]");
  await expect(avis).toHaveAttribute("role", "status");
  await expect(avis).toHaveText("Le doigt tourne et zoome, le stylet dessine");
  await expect(avis).toHaveText("", { timeout: 8_000 });
  await bouton(page, "Terminé").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  // Retenu après rechargement : pas d'onglets de page, pas de second avis.
  await page.reload();
  await ouvrirMode(page);
  await basculerAnnoter(page);
  await expect(page.locator("[data-onglet-page]")).toHaveCount(0);
  await traitStylet(page);
  await page.waitForTimeout(500);
  await expect(avis).toHaveText("");
  // L'interrupteur de ⋯ l'éteint : le doigt dessine, les onglets reviennent.
  await bouton(page, "Plus").click();
  const interrupteur = page.getByRole("switch", { name: "Le doigt ne dessine pas" });
  await expect(interrupteur).toHaveAttribute("aria-checked", "true");
  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("annot-doigt-libre"))).toBe("0");
  await expect(page.locator("[data-onglet-page]")).toHaveCount(2);
  // Valeur « 0 » posée à la main : un trait au stylet ne rallume rien et ne montre pas d'avis.
  await page.keyboard.press("Escape");
  await traitStylet(page);
  await page.waitForTimeout(500);
  await expect(avis).toHaveText("");
  expect(await page.evaluate(() => localStorage.getItem("annot-doigt-libre"))).toBe("0");
  expect(ailleursQuePartitions(db)).toEqual([]);
});

test("(k) en Crayon, tourner la page (onglet, flèche) puis revenir garde les traits des deux pages", async ({ page }) => {
  const db = await ouvrirLouange(page, undefined, "1.5");
  await basculerAnnoter(page);
  const onglet = page.locator('[data-onglet-page="suiv"]');
  await expect(onglet).toHaveAttribute("aria-label", "Page suivante");
  await expect(page.locator('[data-onglet-page="prec"]')).toHaveAttribute("aria-label", "Page précédente");
  const box = (await onglet.boundingBox())!;
  expect(box.width).toBeCloseTo(44, 0);
  const cle1 = await clePage(page);
  await tracer(page);
  await onglet.click();
  await expect.poll(() => clePage(page)).not.toBe(cle1);
  const cle2 = await clePage(page);
  await tracer(page);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => clePage(page)).toBe(cle1);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => clePage(page)).toBe(cle2);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(2);
  expect(ailleursQuePartitions(db)).toEqual([]);
});

test("(l) Échap en Crayon ferme d'abord le menu ⋯, puis sort du Crayon sans quitter le mode louange", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  await tracer(page);
  await bouton(page, "Plus").click();
  await expect(page.getByRole("switch", { name: "Le doigt ne dessine pas" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("switch", { name: "Le doigt ne dessine pas" })).toHaveCount(0);
  await expect(barre(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(barre(page)).toHaveCount(0);
  await expect(racine(page)).toBeVisible();
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  expect(ailleursQuePartitions(db)).toEqual([]);
});

test("(m) sortie à 8 s sans toucher après une entrée au stylet seulement", async ({ page }) => {
  test.setTimeout(60_000);
  const db = await ouvrirLouange(page);
  // Entrée par le bouton (ou la feuille Options) : aucune sortie automatique.
  await basculerAnnoter(page);
  await tracer(page);
  await page.waitForTimeout(9_000);
  await expect(barre(page)).toBeVisible();
  await bouton(page, "Terminé").click();
  // Entrée au stylet : elle part après 8 s, trait écrit comme par Terminé.
  await expect(async () => {
    await traitStylet(page);
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.waitForTimeout(5_000);
  await expect(barre(page)).toBeVisible();
  await expect(barre(page)).toHaveCount(0, { timeout: 8_000 });
  await expect(racine(page)).toBeVisible();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(2);
  expect(ailleursQuePartitions(db)).toEqual([]);
});

// AN-3b : la barre détachable. La barre qui se détache est celle d'en haut (tablette, ordinateur) ou du bas (téléphone).
test.describe("point d'accroche de la barre : fonctions pures (sans page)", () => {
  const zone: Zone = { left: 8, top: 8, right: 1016, bottom: 760 };
  const rect = (left: number, top: number, width = 400, height = 52) => ({ left, top, width, height });
  const repos = { x: 0, y: 0 };

  test("à moins de 48 px d'un bord, l'aimant l'accroche (le plus proche des deux)", () => {
    expect(poserBarre(rect(30, 300), zone, repos).accroche).toBe("gauche");
    expect(poserBarre(rect(300, 40), zone, repos).accroche).toBe("haut");
    expect(poserBarre(rect(20, 30), zone, repos).accroche).toBe("gauche"); // 12 px du bord gauche, 22 px du haut
    expect(poserBarre(rect(60, 300), zone, repos).accroche).toBe("libre"); // 52 px : hors de l'aimant
  });

  test("lancée vite vers le bas, elle s'accroche en bas ; lâchée lentement au milieu, elle reste libre en fractions", () => {
    expect(poserBarre(rect(300, 300), zone, { x: 0, y: 1 }).accroche).toBe("bas");
    const libre = poserBarre(rect(308, 300), zone, { x: 0.1, y: 0.1 });
    expect(libre.accroche).toBe("libre");
    expect(libre.x).toBeCloseTo((308 - 8) / (1008 - 400), 3);
    expect(libre.y).toBeCloseTo((300 - 8) / (752 - 52), 2);
  });

  test("placerBarre reste dans la zone : libre à (1,1), zone réduite par une rotation, colonne contre un bord", () => {
    const taille = { largeur: 400, hauteur: 52 };
    const etroite = { largeur: 200, hauteur: 52 };
    const coin = placerBarre({ accroche: "libre", x: 1, y: 1 }, taille, zone);
    expect(coin).toEqual({ left: 1016 - 400, top: 760 - 52, colonne: false });
    const petite: Zone = { left: 8, top: 8, right: 300, bottom: 200 };
    const p = placerBarre({ accroche: "libre", x: 1, y: 1 }, etroite, petite);
    expect(p.left).toBeGreaterThanOrEqual(petite.left);
    expect(p.left + etroite.largeur).toBeLessThanOrEqual(petite.right);
    expect(p.top + etroite.hauteur).toBeLessThanOrEqual(petite.bottom);
    const col = placerBarre({ accroche: "gauche" }, { largeur: 52, hauteur: 500 }, zone);
    expect(col).toEqual({ left: 8, top: 8 + (752 - 500) / 2, colonne: true });
  });

  test("« attachée » est l'origine partout ; haut/bas ne sont que des capsules ; le cycle clavier boucle", () => {
    expect(lirePosition(null)).toEqual({ accroche: "attachee" });
    expect(lirePosition("pas du json")).toEqual({ accroche: "attachee" });
    expect(lirePosition('{"accroche":"libre","x":"a"}')).toEqual({ accroche: "attachee" });
    expect(lirePosition('{"accroche":"gauche"}')).toEqual({ accroche: "gauche" });
    expect(normaliser({ accroche: "haut" }, false)).toEqual({ accroche: "attachee" });
    expect(normaliser({ accroche: "haut" }, true)).toEqual({ accroche: "haut" });
    expect(normaliser({ accroche: "bas" }, true)).toEqual({ accroche: "attachee" });
    const tour = (tel: boolean) => { const r = []; let a = accrocheSuivante("attachee", tel); for (let i = 0; i < 4; i++, a = accrocheSuivante(a, tel)) r.push(a); return r; };
    expect(tour(false)).toEqual(["droite", "bas", "gauche", "attachee"]);
    expect(tour(true)).toEqual(["droite", "haut", "gauche", "attachee"]);
  });

  test("au téléphone la zone commence sous la barre du haut : une barre posée « haut » ne la recouvre pas", () => {
    const barreHaut = 64;
    const sousBarre: Zone = { left: 8, top: barreHaut + 8, right: 382, bottom: 836 };
    const p = placerBarre({ accroche: "haut" }, { largeur: 280, hauteur: 52 }, sousBarre);
    expect(p.top).toBeGreaterThanOrEqual(barreHaut);
    expect(poserBarre(rect(50, 0, 280), sousBarre, repos).accroche).toBe("haut");
  });
});

/** Le badge « N » de `next dev` recouvre un coin de l'écran et intercepte la souris : on le masque. */
const sansBadgeDev = (page: Page) => page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
const detachable = (page: Page) => (telephone(page) ? page.locator("[data-performance-mode] [data-crayon-barre-bas]") : barre(page));
const poignee = (page: Page) => detachable(page).getByRole("button", { name: "Déplacer la barre", exact: true });

/** Glisse la poignée au pointeur (en plusieurs pas) ; la pause avant le lâcher garde la vitesse nulle. */
async function glisserPoignee(page: Page, x: number, y: number, pause = 150) {
  const b = (await poignee(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.waitForTimeout(pause);
  await page.mouse.up();
}

test("(n) glisser la poignée vers le bord gauche pose la barre en colonne, et elle marche encore", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "attachee");
  const vh = page.viewportSize()!.height;
  await glisserPoignee(page, 20, vh / 2);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
  await expect(detachable(page)).toHaveAttribute("data-colonne", "");
  const b = (await detachable(page).boundingBox())!;
  expect(b.height).toBeGreaterThan(b.width);
  expect(b.x).toBeLessThanOrEqual(12);
  await tracer(page);
  await expect(bouton(page, "Annuler")).toBeEnabled();
  await bouton(page, "Annuler").click();
  await expect(bouton(page, "Annuler")).toBeDisabled();
  await bouton(page, "Terminé").click();
  expect(ailleursQuePartitions(db)).toEqual([]);
});

test("(o) la position est retenue après rechargement", async ({ page }) => {
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  await glisserPoignee(page, 20, page.viewportSize()!.height / 2);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("annot-barre-position"))).toBe('{"accroche":"gauche"}');
  await page.reload();
  await ouvrirMode(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
});

test("(p) la barre libre reste dans l'écran après une rotation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("annot-barre-position", JSON.stringify({ accroche: "libre", x: 1, y: 1 })));
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  const libre = page.locator('[data-performance-mode] [data-accroche="libre"]');
  await expect(libre).toBeVisible();
  const dedans = async () => {
    const b = (await libre.boundingBox())!;
    const v = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    return b.x >= 0 && b.y >= 0 && b.x + b.width <= v.width && b.y + b.height <= v.height;
  };
  expect(await dedans()).toBe(true);
  // Le mode louange est plein écran : `setViewportSize` échoue (fenêtre plein écran), on émule la rotation par CDP.
  const { width, height } = page.viewportSize()!;
  const cdp = await page.context().newCDPSession(page);
  const tourner = (w: number, h: number) => cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: telephone(page) });
  await tourner(height, width);
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(height);
  await expect.poll(dedans).toBe(true);
  await tourner(width, height);
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
  await expect.poll(dedans).toBe(true);
});

test("(q) (téléphone) la barre du bas détachée et lâchée tout en haut ne recouvre pas ‹ ›", async ({ page }) => {
  test.skip(!telephone(page), "propre au téléphone");
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  // Capsule centrée : un bord latéral à égalité avec le haut (capsule aussi large que la zone) donnerait « droite ».
  const h = (await poignee(page).boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, h.y - 30, { steps: 5 });
  const largeur = (await detachable(page).boundingBox())!.width;
  await page.mouse.move(page.viewportSize()!.width / 2 - largeur / 2 + 26, 5, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(detachable(page)).toHaveAttribute("data-accroche", "haut");
  const b = (await detachable(page).boundingBox())!;
  for (const nom of ["Page précédente", "Page suivante"]) {
    const c = (await bouton(page, nom).boundingBox())!;
    const separes = b.y >= c.y + c.height || c.y >= b.y + b.height || b.x >= c.x + c.width || c.x >= b.x + b.width;
    expect(separes, nom).toBe(true);
  }
});

test("(r) Entrée sur la poignée fait tourner les accroches : gauche, attachée, droite", async ({ page }) => {
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  await glisserPoignee(page, 20, page.viewportSize()!.height / 2);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
  await poignee(page).focus();
  await page.keyboard.press("Enter");
  await expect(detachable(page)).toHaveAttribute("data-accroche", "attachee");
  await expect(detachable(page)).not.toHaveAttribute("data-colonne", "");
  await poignee(page).focus();
  await page.keyboard.press("Enter");
  await expect(detachable(page)).toHaveAttribute("data-accroche", "droite");
});

test("(s) détacher puis rattacher ne déplace pas le contenu de la page", async ({ page }) => {
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  const ligne = () => onStage(page, "[data-trait-section]").first().boundingBox().then((b) => b!.y);
  const avant = await ligne();
  await glisserPoignee(page, 20, page.viewportSize()!.height / 2);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
  expect(Math.abs((await ligne()) - avant)).toBeLessThanOrEqual(1);
  await poignee(page).click();
  await expect(detachable(page)).toHaveAttribute("data-accroche", "attachee");
  expect(Math.abs((await ligne()) - avant)).toBeLessThanOrEqual(1);
});

test("(t) un toucher simple sur la poignée d'une barre détachée la rattache", async ({ page }) => {
  await ouvrirLouange(page);
  await sansBadgeDev(page);
  await basculerAnnoter(page);
  await glisserPoignee(page, 20, page.viewportSize()!.height / 2);
  await expect(detachable(page)).toHaveAttribute("data-accroche", "gauche");
  const b = (await poignee(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(detachable(page)).toHaveAttribute("data-accroche", "attachee");
});

// ─── AN-4 : préréglages et couleurs ──────────────────────────────────────────

// Id de section réel : un trait ancré à une section absente de la page ne se dessine pas.
const COUPLET = parseChordPro(readFileSync("content/songs/abba-pere.cho", "utf8")).sections.find((s) => s.type === "verse")!.id;
const TAMPON = { type: "stamp", nom: "ff", x: 3, y: 4 };
const TRAIT_AN4 = { ancre: { section: "s", ligne: 0, car: 0 }, outil: "pen", couleur: "#dc2626", epaisseur: 0.1, alpha: 0.6, nouveauChamp: "x", points: [[0, 0], [1, 1]] };

test.describe("AN-4 : fonctions pures (sans page)", () => {
  test("traitsValides garde un élément inconnu et le champ inconnu d'un trait ; aller-retour traitsAplatis → traitsValides", () => {
    const lus = traitsValides([TAMPON, TRAIT_AN4, "x", null]);
    expect(lus).toHaveLength(2);
    expect(lus[0]).toEqual(TAMPON);
    expect(lus[1]).toEqual(TRAIT_AN4);
    expect(estTrait(lus[0])).toBe(false);
    expect(estTrait(lus[1])).toBe(true);
    const ecrits = traitsAplatis(lus) as Record<string, unknown>[];
    expect(ecrits[0]).toEqual(TAMPON);
    expect(ecrits[1]).toMatchObject({ alpha: 0.6, nouveauChamp: "x", points: [0, 0, 1, 1] });
    expect(traitsValides(ecrits)).toEqual(lus);
  });

  test("garderContraste avec seuil 3 : l'ancre à 4,5 par défaut ne bouge pas, un trait sombre sur noir est éclairci à 3:1 sans plus", () => {
    expect(garderContraste("#1a1a1a", FOND_SOMBRE, 3)).not.toBe("#1a1a1a");
    expect(contraste(garderContraste("#1a1a1a", FOND_SOMBRE, 3), FOND_SOMBRE)).toBeGreaterThanOrEqual(3);
    expect(contraste(garderContraste("#1a1a1a", FOND_SOMBRE, 3), FOND_SOMBRE)).toBeLessThan(4.5);
    expect(contraste(garderContraste("#1a1a1a", FOND_SOMBRE), FOND_SOMBRE)).toBeGreaterThanOrEqual(4.5);
    expect(garderContraste("#2563eb", FOND_CLAIR, 3)).toBe("#2563eb");
  });

  test("styleTrait : sans alpha, stylo 1 et surligneur 0,35 en clair ; en sombre le surligneur 0,35 devient 0,45 en screen", () => {
    const trait = (tool: "pen" | "highlighter", alpha?: number) => ({ tool, size: 3, color: "#2563eb", alpha, points: [] as [number, number][] });
    expect(styleTrait(trait("pen"), FOND_CLAIR)).toMatchObject({ alpha: 1, composite: "source-over" });
    expect(styleTrait(trait("highlighter"), FOND_CLAIR)).toMatchObject({ alpha: 0.35, composite: "source-over" });
    const sombre = styleTrait(trait("highlighter"), FOND_SOMBRE);
    expect(sombre.alpha).toBeCloseTo(0.45, 10);
    expect(sombre.composite).toBe("screen");
    expect(styleTrait(trait("highlighter", 0.35), FOND_SOMBRE).alpha).toBeCloseTo(0.45, 10);
    expect(styleTrait(trait("highlighter", 0.7), FOND_SOMBRE).alpha).toBeCloseTo(0.9, 10);
    expect(styleTrait(trait("highlighter", 1), FOND_SOMBRE).alpha).toBe(1);
  });

  test("lirePrereglages : sans compte les défauts ; lecture tolérante élément par élément", () => {
    expect(PREREGLAGES_DEFAUT).toHaveLength(5);
    expect(INDICES_TELEPHONE.map((i) => PREREGLAGES_DEFAUT[i].couleur)).toEqual(["#2b2b2e", "#b8188c", "#ffd60a"]);
    const mauvais = [{ outil: "pen", couleur: "#123456", taille: 4, alpha: 0.5 }, { outil: "pinceau", couleur: "#123456", taille: 4, alpha: 0.5 }, { outil: "pen", couleur: "rouge", taille: 4, alpha: 1 }, { outil: "highlighter", couleur: "#ffd60a", taille: 99, alpha: 1 }, null];
    const stock = new Map<string, string>([["annot-prereglages-odile", JSON.stringify(mauvais)], ["annot-prereglages-brut", "pas du json"], ["annot-prereglages-objet", "{}"]]);
    Object.defineProperty(globalThis, "localStorage", { value: { getItem: (k: string) => stock.get(k) ?? null, setItem: () => {} }, configurable: true });
    try {
      expect(lirePrereglages(null)).toEqual(PREREGLAGES_DEFAUT);
      expect(lirePrereglages("brut")).toEqual(PREREGLAGES_DEFAUT);
      expect(lirePrereglages("objet")).toEqual(PREREGLAGES_DEFAUT);
      expect(lirePrereglages("inconnu")).toEqual(PREREGLAGES_DEFAUT);
      const l = lirePrereglages("odile");
      expect(l[0]).toEqual(mauvais[0]);
      expect(l.slice(1)).toEqual(PREREGLAGES_DEFAUT.slice(1));
    } finally {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});

const PRESETS = (page: Page) => dansBarres(page).locator("[data-prereglage]");
/** Rang de la place d'un préréglage dans la barre : au téléphone, seuls les indices 0, 1 et 3 sont montrés. */
const place = (page: Page, i: number) => PRESETS(page).nth(telephone(page) ? INDICES_TELEPHONE.indexOf(i) : i);
const couleursDessinees = async (page: Page) => JSON.parse((await onStage(page, "canvas[data-strokes-couleurs]").first().getAttribute("data-strokes-couleurs")) ?? "[]") as string[];

test("(u) cinq préréglages (trois au téléphone) en traits témoins de 44 px ; un toucher prend, un second ouvre le réglage ; plus de menu Outils", async ({ page }) => {
  await ouvrirLouange(page);
  await basculerAnnoter(page);
  await expect(PRESETS(page)).toHaveCount(telephone(page) ? 3 : 5);
  await expect(bouton(page, "Outils")).toHaveCount(0);
  for (const b of await PRESETS(page).all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(PRESETS(page).first()).toHaveAttribute("aria-pressed", "true");
  await expect(place(page, 1)).toHaveAttribute("aria-label", "Préréglage 2 : Stylo");
  await expect(place(page, 3)).toHaveAttribute("aria-label", "Préréglage 4 : Surligneur");
  await place(page, 1).click();
  await expect(place(page, 1)).toHaveAttribute("aria-pressed", "true");
  await expect(PRESETS(page).first()).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("group", { name: "Réglage du préréglage 2" })).toHaveCount(0);
  await place(page, 1).click();
  await expect(page.getByRole("group", { name: "Réglage du préréglage 2" })).toBeVisible();
});

const BASTIEN: FakeProfile = {
  uid: "uid-bastien", email: "bastien.leroux@example.invalid", firstName: "Bastien", lastName: "Leroux", planningName: "Bastien L.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

test("(v) un préréglage modifié (couleur, transparence) est retenu après rechargement pour le compte A ; le compte B, sur le même appareil, a les défauts", async ({ page, browser }, testInfo) => {
  await ouvrirLouange(page);
  await basculerAnnoter(page);
  await place(page, 1).click();
  await place(page, 1).click();
  const reglage = (p: Page) => p.getByRole("group", { name: "Réglage du préréglage 2" });
  await reglage(page).getByRole("button", { name: "#2563eb", exact: true }).click();
  await reglage(page).getByLabel("Transparence").fill("0.5");
  const cle = `annot-prereglages-${ODILE.uid}`;
  await expect.poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "[]")[1], cle)).toMatchObject({ outil: "pen", couleur: "#2563eb", alpha: 0.5 });
  // Compte B : même appareil (le stockage local de A est repris), autre connexion simulée.
  const ctxB = await browser.newContext({ ...(testInfo.project.use as BrowserContextOptions), storageState: await page.context().storageState() });
  try {
    const pageB = await ctxB.newPage();
    await pageB.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    // Le drapeau « barre déjà vue » vient de l'appareil de A : B voit la barre comme à une première ouverture.
    await pageB.addInitScript(() => localStorage.removeItem("perf-barre-vue"));
    await signInAs(pageB, BASTIEN, DOCS, `/setlists/${SL}`);
    // Le clic peut partir avant l'hydratation : on le refait tant que le mode n'est pas ouvert.
    await expect(async () => {
      if (!(await pageB.locator("[data-performance-mode]").count())) await pageB.getByRole("button", { name: /Mode Louange/ }).click();
      await expect(pageB.locator("[data-performance-mode]")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });
    await attendreMiseEnPage(pageB);
    // Compte sans rôle retenu : la feuille « Je joue » s'ouvre d'elle-même à la première entrée ; on la ferme.
    const jeJoue = pageB.getByRole("dialog", { name: "Je joue", exact: true });
    if (await jeJoue.waitFor({ timeout: 3000 }).then(() => true, () => false)) {
      await pageB.keyboard.press("Escape");
      await expect(jeJoue).toBeHidden();
    }
    await basculerAnnoter(pageB);
    await place(pageB, 1).click();
    await place(pageB, 1).click();
    await expect(reglage(pageB).getByRole("button", { name: "#b8188c", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(reglage(pageB).getByLabel("Transparence")).toHaveValue("1");
    expect(await pageB.evaluate((k) => localStorage.getItem(k), `annot-prereglages-${BASTIEN.uid}`)).toBeNull();
  } finally {
    await ctxB.close();
  }
  // A retrouve ses réglages après rechargement.
  await page.reload();
  await ouvrirMode(page);
  await basculerAnnoter(page);
  await place(page, 1).click();
  await place(page, 1).click();
  await expect(reglage(page).getByRole("button", { name: "#2563eb", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(reglage(page).getByLabel("Transparence")).toHaveValue("0.5");
});

test("(w) un trait tracé avec un préréglage garde couleur et alpha dans l'écriture de ma partition", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  await place(page, 3).click();
  await tracer(page);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  expect(traitsEcrits(db)[0]).toMatchObject({ outil: "highlighter", couleur: "#ffd60a", alpha: 0.35 });
});

test("(x) en sombre, un trait #1a1a1a est dessiné éclairci à 3:1 au moins ; en clair il ne change pas ; sans alpha il se dessine comme avant", async ({ page }) => {
  const ancien = { ancre: { section: COUPLET, ligne: 0, car: 0 }, outil: "pen", couleur: "#1a1a1a", epaisseur: 0.1, points: [0, 0.5, 2, 0.5] };
  const docs = { ...DOCS, [PARTITION]: { ownerUid: ODILE.uid, ownerName: "Odile P.", base: null, content: null, structure: null, key: null, traits: [ancien], sharedWith: [], sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z") } };
  await page.addInitScript(() => { localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("accords-aide-vue", "1"); localStorage.setItem("perf-theme", sessionStorage.getItem("pw-theme") ?? "light"); });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ODILE, docs, `/setlists/${SL}`);
  await ouvrirMode(page);
  await expect.poll(async () => (await couleursDessinees(page)).length).toBe(1);
  expect(await couleursDessinees(page)).toEqual(["#1a1a1a"]);
  await page.evaluate(() => sessionStorage.setItem("pw-theme", "dark"));
  await page.reload();
  await ouvrirMode(page);
  await expect.poll(async () => (await couleursDessinees(page)).length).toBe(1);
  const [c] = await couleursDessinees(page);
  expect(c).not.toBe("#1a1a1a");
  expect(contraste(c, FOND_SOMBRE)).toBeGreaterThanOrEqual(3);
});

// ─── AN-5 : texte, tampons et formes ────────────────────────────────────────────

const TEXTE_AN5 = { ancre: { section: "s", ligne: 1, car: 2 }, outil: "text", texte: "Doucement", points: [[0.5, 0.4]], taille: 1.06, couleur: "#dc2626" };
const TAMPON_AN5 = { ancre: { scan: true, image: 0 }, outil: "stamp", genre: "ff", points: [[0.25, 0.5]], taille: 0.02, couleur: "#2563eb", futur: { a: 1 } };

test.describe("AN-5 : fonctions pures (sans page)", () => {
  test("styleTrait : un texte graphite sur fond noir sort à 4,5:1 au moins", () => {
    const { color } = styleTrait({ tool: "text", size: 16, color: "#2b2b2e", points: [[0.5, 0.5]], texte: "Sol" }, "#000000");
    expect(contraste(color, "#000000")).toBeGreaterThanOrEqual(4.5);
  });
  test("traitsValides et traitsAplatis : texte et tampon font l'aller-retour (points à plat ou en paires), champ inconnu gardé, genre inconnu opaque", () => {
    const inconnu = { ...TAMPON_AN5, genre: "tres-forte" };
    const lus = traitsValides([TEXTE_AN5, TAMPON_AN5, inconnu, { ...TEXTE_AN5, points: [0.5, 0.4] }, { ...TEXTE_AN5, texte: 3 }]);
    expect(lus).toHaveLength(5);
    expect(lus.map((e) => estSigne(e))).toEqual([true, true, false, true, false]);
    expect(lus.map((e) => estTrait(e))).toEqual([false, false, false, false, false]);
    expect(lus[0]).toEqual(TEXTE_AN5);
    expect(lus[1]).toEqual(TAMPON_AN5);
    expect(lus[3]).toEqual(TEXTE_AN5);
    const ecrits = traitsAplatis(lus) as Record<string, unknown>[];
    expect(ecrits[0]).toMatchObject({ points: [0.5, 0.4] });
    expect(ecrits[1]).toMatchObject({ points: [0.25, 0.5], futur: { a: 1 }, genre: "ff" });
    expect(ecrits[2]).toEqual(inconnu);
    expect(traitsValides(ecrits)).toEqual(lus);
  });

  test("(f) un ancien client : un tampon relu puis réécrit garde tous ses champs, même ceux qu'il ne connaît pas", () => {
    const venu = { ...TAMPON_AN5, ancre: { section: "s", ligne: 0, car: 0 }, points: [1, 2], aussi: "nouveau", imbrique: { x: [1, 2] } };
    const [lu] = traitsValides([venu]);
    const [reecrit] = traitsAplatis([lu]) as Record<string, unknown>[];
    expect(reecrit).toEqual(venu);
  });

  test("ancrerSigne et projeterSigne : texte (em, 2 décimales) et scan (fraction de largeur) font l'aller-retour ; un point loin du texte va à la ligne la plus proche", () => {
    const texte = { tool: "text" as const, texte: "Doucement", size: 17, color: "#dc2626", points: [[132, 216]] as [number, number][] };
    const t = ancrerSigne(texte, { section: "s", ligne: 0, car: 3 }, { x: 100, y: 200, unite: 16 });
    expect(t).toEqual({ ancre: { section: "s", ligne: 0, car: 3 }, outil: "text", texte: "Doucement", couleur: "#dc2626", taille: 1.06, points: [[2, 1]] });
    expect(projeterSigne(t as Parameters<typeof projeterSigne>[0], { x: 100, y: 200, unite: 16 })).toMatchObject({ tool: "text", texte: "Doucement", points: [[132, 216]] });
    const tampon = { tool: "stamp" as const, genre: "ff" as const, size: 25.6, color: "#2563eb", points: [[300, 150]] as [number, number][] };
    const s = ancrerSigne(tampon, { scan: true, image: 1 }, { x: 100, y: 100, unite: 800 });
    expect(s).toMatchObject({ outil: "stamp", genre: "ff", taille: 0.032, points: [[0.25, 0.0625]] });
    // Accroche sans limite : `decouper` envoie un point très loin de toute ligne à la plus proche.
    expect(decouper([[50, 900]], [{ left: 0, top: 0, right: 300, bottom: 20 }, { left: 0, top: 30, right: 300, bottom: 50 }]).map((m) => m.ligne)).toEqual([1]);
  });

  test("tampons.ts : le menu dans l'ordre de la spec, polylignes des soufflets, respiration, point d'orgue, flèche, cercle ; seul et tutti suivent la langue", () => {
    expect(SIGNES.map((e) => e.cle)).toEqual(["texte", "p", "mf", "f", "ff", "crescendo", "decrescendo", "respiration", "orgue", "x2", "seul", "tutti", "fleche", "cercle", "trait"]);
    expect(SIGNES.filter((e) => e.glisser).map((e) => e.cle)).toEqual(["fleche", "cercle", "trait"]);
    const [cre] = soufflet("<", [100, 50], 10);
    expect(cre).toHaveLength(3);
    expect(cre[1]).toEqual([85, 50]); // la pointe à gauche, 3 em de long
    expect(cre[0][0]).toBe(115);
    expect(cre[0][1]).toBeLessThan(50);
    expect(cre[2][1]).toBeGreaterThan(50);
    const [dec] = soufflet(">", [100, 50], 10);
    expect(dec[1]).toEqual([115, 50]);
    expect(respiration([0, 0], 10)).toHaveLength(1);
    const [arc, point] = pointOrgue([100, 50], 10);
    expect(arc[0][0]).toBeCloseTo(90);
    expect(arc[arc.length - 1][0]).toBeCloseTo(110);
    expect(Math.min(...arc.map((p) => p[1]))).toBeLessThan(arc[0][1]);
    expect(point).toHaveLength(1);
    const [tige, pointe] = fleche([0, 0], [100, 0]);
    expect(tige).toEqual([[0, 0], [100, 0]]);
    expect(pointe).toHaveLength(3);
    expect(pointe[1]).toEqual([100, 0]);
    expect(pointe[0][0]).toBeLessThan(100);
    expect(pointe[0][1] * pointe[2][1]).toBeLessThan(0);
    const [ell] = cercle([10, 20], [110, 60]);
    expect(ell[0][0]).toBeCloseTo(ell[ell.length - 1][0]);
    expect(ell[0][1]).toBeCloseTo(ell[ell.length - 1][1]);
    expect(Math.min(...ell.map((p) => p[0]))).toBeCloseTo(10);
    expect(Math.max(...ell.map((p) => p[0]))).toBeCloseTo(110);
    expect(Math.min(...ell.map((p) => p[1]))).toBeCloseTo(20);
    expect(Math.max(...ell.map((p) => p[1]))).toBeCloseTo(60);
    expect(polylignes("trait", [1, 2], [3, 4], 0)).toEqual([[[1, 2], [3, 4]]]);
    expect(texteTampon("seul", "fr")).toBe("seul");
    expect(texteTampon("seul", "zh-CN")).toBe("独");
    expect(texteTampon("tutti", "zh-CN")).toBe("齐");
    expect(texteTampon("x2", "zh-CN")).toBe("×2");
    expect(texteTampon("ff", "fr")).toBe("\u{1D191}\u{1D191}");
    expect(texteTampon("mf", "fr")).toBe("\u{1D190}\u{1D191}");
    expect(["p", "mf", "f", "ff", "x2"].map((g) => glyphesTampon(g as "p"))).toEqual([true, true, true, true, false]);
    expect(CODES_MUSIQUE).toHaveLength(7);
  });

  test("gomme : un texte et un tampon se touchent sur leur boîte englobante", () => {
    const texte = { tool: "text" as const, texte: "Doucement", size: 17, color: "#000", points: [[100, 100]] as [number, number][] };
    expect(boiteSigne(texte).left).toBe(100);
    expect(strokeHitTest(texte, 110, 100, 4)).toBe(true);
    expect(strokeHitTest(texte, 100 + 9 * 0.6 * 17 + 10, 100, 4)).toBe(false);
    expect(strokeHitTest(texte, 110, 140, 4)).toBe(false);
    const tampon = { tool: "stamp" as const, genre: "ff" as const, size: 25, color: "#000", points: [[200, 200]] as [number, number][] };
    expect(strokeHitTest(tampon, 200, 205, 4)).toBe(true);
    expect(strokeHitTest(tampon, 260, 200, 4)).toBe(false);
  });
});

/** Boîte (px écran) d'un mot de la première page, mesurée sur les nœuds texte des paroles. */
const boiteMotAN5 = (page: Page, mot: string) =>
  page.evaluate((m) => {
    for (const ligne of document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-trait-section]")) {
      if (ligne.closest("[aria-hidden=true]")) continue;
      const noeuds: Text[] = [];
      for (const el of ligne.querySelectorAll("[data-paroles], [data-car]")) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) noeuds.push(n as Text);
      }
      const i = noeuds.map((n) => n.data).join("").indexOf(m);
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
const centre = (b: { left: number; right: number; top: number; bottom: number }) => [(b.left + b.right) / 2, (b.top + b.bottom) / 2] as const;
const NOM_MENU_SIGNES = { fr: "Texte, tampons et formes", zh: "文字、记号与形状" };
/** Ouvre « Texte, tampons et formes » et prend un signe par sa clé (`data-signe`). */
async function prendreSigne(page: Page, cle: string, langue: "fr" | "zh" = "fr") {
  await dansBarres(page).getByRole("button", { name: NOM_MENU_SIGNES[langue], exact: true }).click();
  await page.locator(`[data-menu-annotation] [data-signe="${cle}"]`).click();
}
/** Les textes affichés par les calques de signes de la page (celui du Crayon, celui de lecture). */
const signesAffiches = (page: Page) =>
  page.locator("[data-performance-mode] canvas[data-strokes-signes]").evaluateAll((cs) => cs.flatMap((c) => JSON.parse(c.getAttribute("data-strokes-signes") ?? "[]") as string[]));
const boitesLecture = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLElement>("[data-performance-mode] > canvas[data-strokes-boites]");
    return c ? (JSON.parse(c.getAttribute("data-strokes-boites")!) as [number, number, number, number][]) : [];
  });
const surLeMotAN5 = (b: [number, number, number, number], mot: { left: number; right: number; top: number; bottom: number }) => {
  const [cx, cy] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  expect(Math.max(mot.left - cx, cx - mot.right, mot.top - cy, cy - mot.bottom, 0)).toBeLessThanOrEqual(6);
};

test("(y) un « ff » et un texte posés à l'écran s'écrivent dans ma partition seulement, et restent sur leur mot après rechargement à une autre taille de fenêtre", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  const [creation, univers] = [(await boiteMotAN5(page, "créa"))!, (await boiteMotAN5(page, "univers"))!];
  await prendreSigne(page, "ff");
  await page.mouse.click(...centre(creation));
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  expect(traitsEcrits(db)[0]).toMatchObject({ outil: "stamp", genre: "ff", couleur: PREREGLAGES_DEFAUT[0].couleur });
  await prendreSigne(page, "texte");
  await page.mouse.click(univers.left + 4, (univers.top + univers.bottom) / 2);
  const champ = page.getByLabel("Texte à poser");
  await champ.fill("Doucement");
  await champ.press("Enter");
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(2);
  expect(traitsEcrits(db)[1]).toMatchObject({ outil: "text", texte: "Doucement" });
  expect(ailleursQuePartitions(db)).toEqual([]);
  await bouton(page, "Terminé").click();
  expect(await signesAffiches(page)).toEqual(expect.arrayContaining(["\u{1D191}\u{1D191}", "Doucement"]));
  // Autre taille de fenêtre, rechargement : les deux signes sont relus et suivent leur mot.
  const [largeur, hauteur] = telephone(page) ? [820, 1180] : [390, 844];
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined));
  await page.setViewportSize({ width: largeur, height: hauteur });
  await page.reload();
  await ouvrirMode(page);
  await expect.poll(async () => (await boitesLecture(page)).length, { timeout: 10_000 }).toBe(2);
  const [m1, m2] = [(await boiteMotAN5(page, "créa"))!, (await boiteMotAN5(page, "univers"))!];
  const [b1, b2] = await boitesLecture(page);
  surLeMotAN5(b1, m1);
  surLeMotAN5(b2, m2);
  expect(await signesAffiches(page)).toEqual(expect.arrayContaining(["\u{1D191}\u{1D191}", "Doucement"]));
});

test("(z) un « ff » posé loin du texte (à plus de 2 em sous la dernière ligne) s'accroche quand même à la ligne la plus proche", async ({ page }) => {
  const db = await ouvrirLouange(page, undefined, "1.6"); // texte grand : la dernière page est entamée à peine, même à 1 440 px
  await basculerAnnoter(page);
  while (await bouton(page, "Page suivante").isEnabled()) await bouton(page, "Page suivante").click();
  // Sous la dernière ligne de la page : plus loin qu'un trait ne s'accroche (2 em). Les bords de l'écran sont des onglets de page.
  const { x, y, em } = await onStage(page, "[data-trait-section]").evaluateAll((ls) => ({
    x: ls[0].getBoundingClientRect().left + 60,
    y: Math.max(...ls.map((l) => l.getBoundingClientRect().bottom)),
    em: parseFloat(getComputedStyle(ls[0]).fontSize),
  }));
  const cible = y + 3 * em;
  // À 1 440 px le chant tient sur une page en deux colonnes qui descend jusqu'à la barre du bas : aucun vide de plus de 2 em.
  test.skip(cible >= page.viewportSize()!.height - 70, "pas de place sous le texte à cette taille d'écran");
  await prendreSigne(page, "ff");
  await page.mouse.click(x, cible);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  const [ff] = traitsEcrits(db) as { outil: string; genre: string; points: number[] }[];
  expect(ff).toMatchObject({ outil: "stamp", genre: "ff" });
  expect(ff.points[1], "plus de 2 em sous le haut du caractère d'ancre").toBeGreaterThan(2);
});

test("(aa) la gomme efface un texte posé ; Annuler le rend", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  const mot = (await boiteMotAN5(page, "univers"))!;
  const [x, y] = [mot.left + 4, (mot.top + mot.bottom) / 2];
  await prendreSigne(page, "texte");
  await page.mouse.click(x, y);
  await page.getByLabel("Texte à poser").fill("Doucement");
  await page.getByLabel("Texte à poser").press("Enter");
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  await page.getByRole("button", { name: /^Gomme/ }).click();
  await page.mouse.click(x + 6, y);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(0);
  await bouton(page, "Annuler").click();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  expect(traitsEcrits(db)[0]).toMatchObject({ outil: "text", texte: "Doucement" });
});

test("(ab) en Crayon avec l'outil texte, un texte touché se rouvre ; vide, il disparaît ; Échap annule la saisie ; un texte vide n'écrit rien", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  const mot = (await boiteMotAN5(page, "univers"))!;
  const [x, y] = [mot.left + 4, (mot.top + mot.bottom) / 2];
  await prendreSigne(page, "texte");
  await page.mouse.click(x, y);
  await page.getByLabel("Texte à poser").press("Escape");
  await expect(page.getByLabel("Texte à poser")).toHaveCount(0);
  await page.mouse.click(x, y);
  await page.getByLabel("Texte à poser").press("Enter"); // vide : rien
  await expect(page.getByLabel("Texte à poser")).toHaveCount(0);
  await page.waitForTimeout(1200);
  expect(traitsEcrits(db)).toHaveLength(0);
  await page.mouse.click(x, y);
  await page.getByLabel("Texte à poser").fill("Doucement");
  await page.getByLabel("Texte à poser").press("Enter");
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(1);
  await page.mouse.click(x + 3, y); // le texte touché se rouvre
  await expect(page.getByLabel("Texte à poser")).toHaveValue("Doucement");
  await page.getByLabel("Texte à poser").fill("Plus fort");
  await page.getByLabel("Texte à poser").press("Enter");
  await expect.poll(() => (traitsEcrits(db)[0] as { texte?: string } | undefined)?.texte, { timeout: 10_000 }).toBe("Plus fort");
  expect(traitsEcrits(db)).toHaveLength(1);
  await page.mouse.click(x + 3, y);
  await page.getByLabel("Texte à poser").fill("");
  await page.getByLabel("Texte à poser").press("Enter");
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(0);
});

test("(ac) formes et soufflets : une flèche se trace du début à la fin du glisser, un crescendo se pose d'un toucher ; ce sont des traits pen", async ({ page }) => {
  const db = await ouvrirLouange(page);
  await basculerAnnoter(page);
  const mot = (await boiteMotAN5(page, "créa"))!;
  const [x, y] = centre(mot);
  await prendreSigne(page, "fleche");
  await page.mouse.move(x - 20, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y + 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(2); // tige et pointe
  await prendreSigne(page, "crescendo");
  await page.mouse.click(x, y + 4);
  await expect.poll(() => traitsEcrits(db).length, { timeout: 10_000 }).toBe(3);
  expect(traitsEcrits(db).map((t) => (t as { outil: string }).outil)).toEqual(["pen", "pen", "pen"]);
  expect(ailleursQuePartitions(db)).toEqual([]);
});

test("(ad) prendre un préréglage ou la gomme quitte le signe ; le bouton montre le signe pris", async ({ page }) => {
  await ouvrirLouange(page);
  await basculerAnnoter(page);
  const menu = dansBarres(page).getByRole("button", { name: NOM_MENU_SIGNES.fr, exact: true });
  await expect(menu).toBeVisible();
  await prendreSigne(page, "mf");
  await expect(menu).toContainText("\u{1D190}\u{1D191}");
  await place(page, 1).click();
  await expect(menu).not.toContainText("\u{1D190}\u{1D191}");
  await prendreSigne(page, "x2");
  await expect(menu).toContainText("×2");
  await page.getByRole("button", { name: /^Gomme/ }).click();
  await expect(menu).not.toContainText("×2");
});

test("(ae) une partition partagée avec « Inclure mes traits » montre le tampon et le texte au destinataire, en lecture seule", async ({ page }) => {
  const stamp = { ancre: { section: COUPLET, ligne: 0, car: 0 }, outil: "stamp", genre: "ff", points: [1.5, 0.5], taille: 1.6, couleur: "#2563eb" };
  const texte = { ancre: { section: COUPLET, ligne: 0, car: 5 }, outil: "text", texte: "Reprise douce", points: [0, 0.5], taille: 1.06, couleur: "#dc2626" };
  const profil = (p: FakeProfile) => ({ email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles ?? {} });
  const docs = {
    ...DOCS,
    [`users/${ODILE.uid}`]: profil(ODILE),
    [PARTITION]: { ownerUid: ODILE.uid, ownerName: ODILE.planningName, base: null, content: null, structure: null, key: null, traits: [stamp, texte], sharedWith: [BASTIEN.uid], sharedTraits: true, updatedAt: new Date("2026-11-02T10:00:00Z") },
    [`partitions/${BASTIEN.uid}__choix`]: { choices: { "abba-pere": ODILE.uid }, partageTout: [] },
  };
  await page.addInitScript(() => { localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("accords-aide-vue", "1"); localStorage.setItem("perf-theme", "light"); });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, BASTIEN, docs, `/setlists/${SL}`);
  await ouvrirMode(page);
  await expect.poll(() => signesAffiches(page), { timeout: 10_000 }).toEqual(["\u{1D191}\u{1D191}", "Reprise douce"]);
  expect(await couleursDessinees(page)).toEqual(["#2563eb", "#dc2626"]);
  await page.waitForTimeout(500);
  expect(db.writes.filter((w) => decodeURIComponent(w.path).startsWith("partitions/"))).toEqual([]);
});

test("(af) en 中文, seul et tutti se disent 独 et 齐 dans le menu (sens 单独, 全体) et au rendu ; on enregistre le genre", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "zh-CN");
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("perf-theme", "light");
  });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, ODILE, DOCS, `/setlists/${SL}`);
  await page.getByRole("button", { name: /敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  // Le Crayon s'ouvre au stylet (indépendant de la langue), puis la barre en 中文.
  await expect(async () => {
    await traitStylet(page);
    await expect(barre(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  const [creation, univers] = [(await boiteMotAN5(page, "créa"))!, (await boiteMotAN5(page, "univers"))!];
  await dansBarres(page).getByRole("button", { name: NOM_MENU_SIGNES.zh, exact: true }).click();
  const seul = page.locator('[data-menu-annotation] [data-signe="seul"]');
  const tutti = page.locator('[data-menu-annotation] [data-signe="tutti"]');
  await expect(seul).toContainText("独");
  await expect(seul).toContainText("单独");
  await expect(tutti).toContainText("齐");
  await expect(tutti).toContainText("全体");
  await seul.click();
  await page.mouse.click(...centre(creation));
  await prendreSigne(page, "tutti", "zh");
  await page.mouse.click(univers.left + 4, (univers.top + univers.bottom) / 2);
  await expect.poll(() => (traitsEcrits(db) as { outil: string; genre?: string }[]).filter((t) => t.outil === "stamp").map((t) => t.genre), { timeout: 10_000 }).toEqual(["seul", "tutti"]);
  await expect.poll(() => signesAffiches(page)).toEqual(expect.arrayContaining(["独", "齐"]));
  expect(ailleursQuePartitions(db)).toEqual([]);
});
