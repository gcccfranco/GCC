import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, basculerAnnoter, onStage } from "./helpers/louange";
import { APPUI_ANNEAU_MS, APPUI_CRAYON_MS, classerAppui } from "../src/lib/performance/gestes";
import { FOND_CLAIR, garderContraste } from "../src/lib/performance/couleurIcones";
import { annuler, historiqueVide, MAX_ETATS, noter, peutAnnuler, peutRetablir, retablir } from "../src/lib/annotations/historique";
import type { Trait } from "../src/types/partition";

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
    localStorage.setItem("perf-astuce-rappel-joue", "1");
    localStorage.setItem("perf-astuce-rappel-unique", "1");
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
