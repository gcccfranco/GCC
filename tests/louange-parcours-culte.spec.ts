import { expect, test, type Locator, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, basculerAnnoter, fermerBarre, lireCompteur, onStage, ouvrirMenu, ouvrirMetronome, type Menu } from "./helpers/louange";

// Parcours du culte (docs/spec-corrections-interface.md § « Test « parcours du culte » ») : un culte de bout en bout au mode louange,
// rejoué après chaque tranche qui le touche. Session simulée, musicienne fictive (accès Harmonie) ; trois appareils plus
// tablette-paysage (SPECS_GRAND_ECRAN).

const SETLIST_ID = "setlist-parcours-culte";
const MAELLE: FakeProfile = { uid: "uid-maelle-parcours", email: "maelle.parcours@example.invalid", firstName: "Maëlle", lastName: "Sorbier", planningName: "Maëlle S.", ...musicien("piano") };
const SLUGS = ["abba-pere", "谢谢你", "一生爱你", "a-jamais-tu-es-saint"];
const SCAN = 2; // rang dans SLUGS
const SAINT = 3;
const setlist = {
  title: "Culte du parcours", leader: "Maëlle S.", category: "Culte Francophone", date: "2026-11-15", language: "mixed", notes: "",
  ownerId: MAELLE.uid, isPrivate: false,
  items: SLUGS.map((songSlug, i) => ({
    songSlug, position: i + 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, jianpuSheet: i === SCAN,
    structureOverride: null, sectionNotes: {}, notes: "",
  })),
};

const marge = (page: Page) => page.locator('[data-testid="marge-affichage"][data-mode="louange"]');
const panneauAccord = (page: Page) => page.locator("[data-accord-panneau]");
const traits = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll<HTMLElement>("[data-performance-mode] > canvas[data-strokes-boites]")]
    .flatMap((c) => JSON.parse(c.getAttribute("data-strokes-boites")!) as number[][]));
// Idées d'harmonie allumé : un accord touchable ne tourne pas la page ; on touche à la hauteur où il n'y en a pas.
const touchesA = async (page: Page, part: number) => {
  const x = page.viewportSize()!.width * part;
  const y = await page.evaluate((x) => {
    for (let y = innerHeight / 2; y < innerHeight - 100; y += 12) if (!document.elementFromPoint(x, y)?.closest("[data-accord-touchable]")) return y;
    return innerHeight / 2;
  }, x);
  await page.mouse.click(x, y);
};
async function glisser(page: Page, dx: number) {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.down();
  await page.mouse.move(width / 2 + dx / 2, height / 2, { steps: 3 });
  await page.mouse.move(width / 2 + dx, height / 2, { steps: 3 });
  await page.mouse.up();
}

/** Ouvre le mode louange depuis la page de la setlist. */
async function ouvrirMode(page: Page): Promise<FakeDb> {
  await page.addInitScript((uid) => {
    try {
      localStorage.setItem("perf-role-preset", "pianiste");
      localStorage.setItem("perf-theme", "light");
      localStorage.setItem("perf-astuce-rappel-joue", "2");
      localStorage.setItem("accords-aide-vue", "1");
      localStorage.setItem(`perf-idees-harmonie-${uid}`, "1");
      if (!localStorage.getItem("perf-font-scale")) localStorage.setItem("perf-font-scale", "1.5"); // plusieurs pages à tourner
    } catch { /* ignore */ }
  }, MAELLE.uid);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, MAELLE, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  return db;
}

/** Va au chant n° `rang` (0-based) par le menu Setlist ; rend la page quand le chant courant a changé. */
async function allerAuChant(page: Page, rang: number) {
  const menu = await ouvrirMenu(page, "setlist");
  await menu.locator("li button").nth(rang).click();
  await expect(menu).toBeHidden();
  await attendreMiseEnPage(page);
}

/** Un toucher hors du menu ouvert (à côté de lui, ou en haut de l'écran sous la feuille du téléphone). */
async function toucherDehors(page: Page, dialogue: Locator) {
  const { width, height } = page.viewportSize()!;
  if (width < 768) return page.mouse.click(width / 2, height * 0.02);
  const b = (await dialogue.boundingBox())!;
  const dedans = (x: number, y: number) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  const y = height * 0.88;
  await page.mouse.click(dedans(width * 0.5, y) ? (b.x > 40 ? b.x - 12 : b.x + b.width + 12) : width * 0.5, y);
}

const textesAccords = (page: Page) => onStage(page, "[data-section] [data-accord-touchable]").evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean));

test("parcours du culte : ouvrir, tourner, scan annoté, Chiffres, accord au bord, tous les menus, console propre", async ({ page }) => {
  test.setTimeout(240_000);
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });

  // 1. Ouvrir le mode louange : première page, titre et tonalité visibles.
  const db = await ouvrirMode(page);
  await attendreCompteur(page, /^1 \/ \d+$/);
  await expect(page.locator("[data-barre-haut] p").first()).toContainText("Abba");
  await expect(page.locator("[data-barre-haut]").getByTestId("armure")).toBeVisible();

  // 2. Tourner la page : bord, balayage, clavier ; le compteur avance d'un à chaque fois et revient.
  await fermerBarre(page);
  const total = Number((await lireCompteur(page)).split(" / ")[1]);
  expect(total).toBeGreaterThanOrEqual(2);
  const va = async (geste: () => Promise<unknown>, n: number) => { await geste(); await attendreCompteur(page, `${n} / ${total}`); };
  await va(() => touchesA(page, 0.85), 2);
  await va(() => touchesA(page, 0.15), 1);
  await va(() => glisser(page, -80), 2);
  await va(() => glisser(page, 80), 1);
  await va(() => page.keyboard.press("ArrowRight"), 2);
  await va(() => page.keyboard.press("ArrowLeft"), 1);

  // Taille 1 pour le scan : un trait ne se projette pas pareil à 1,5 (l'annotation se mémorise à sa taille).
  await page.evaluate(() => localStorage.setItem("perf-font-scale", "1"));
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);

  // 3. Le scan, par Setlist puis Repères ; Crayon, un trait, « Terminé » ; un seul tracé, là où il est dessiné ; il reste après rechargement.
  await allerAuChant(page, SCAN);
  await expect(onStage(page, "[data-jianpu-fenetre]").first()).toBeAttached({ timeout: 30_000 });
  const reperes = await ouvrirMenu(page, "reperes");
  // A2 : les sections du scan (sections.json) sont dans Repères ; le Refrain y mène.
  await reperes.getByRole("button", { name: /Refrain|副歌/ }).first().click();
  await expect(reperes).toBeHidden();
  const image = async () => {
    const r = await onStage(page, "[data-trait-scan]").first().boundingBox();
    expect(r, "l'image du scan est affichée").not.toBeNull();
    return r!;
  };
  await expect.poll(async () => (await image()).width).toBeGreaterThan(100);
  await basculerAnnoter(page);
  // Crayon éteint le rail « Ici » : l'image se décale. On la mesure donc en Crayon, une fois stable.
  let imPrec = await image();
  await expect.poll(async () => { const r = await image(); const stable = r.x === imPrec.x; imPrec = r; return stable; }).toBe(true);
  const im = await image();
  const dep = { x: im.x + im.width * 0.35, y: im.y + im.height * 0.4 };
  const arr = { x: im.x + im.width * 0.6, y: im.y + im.height * 0.45 };
  await page.mouse.move(dep.x, dep.y);
  await page.mouse.down();
  await page.mouse.move((dep.x + arr.x) / 2, (dep.y + arr.y) / 2 + 3, { steps: 6 });
  await page.mouse.move(arr.x, arr.y, { steps: 6 });
  await page.mouse.up();
  await basculerAnnoter(page); // « Terminé »
  await expect.poll(async () => (await traits(page)).length, { message: "un seul tracé" }).toBe(1);
  const [x0, y0, x1, y1] = (await traits(page))[0];
  const imL = await image(); // en lecture le rail peut être revenu : on relit l'image
  for (const p of [{ x: imL.x + imL.width * 0.35, y: imL.y + imL.height * 0.4 }, { x: imL.x + imL.width * 0.6, y: imL.y + imL.height * 0.45 }]) {
    expect(p.x).toBeGreaterThanOrEqual(x0 - 6); expect(p.x).toBeLessThanOrEqual(x1 + 6);
    expect(p.y).toBeGreaterThanOrEqual(y0 - 6); expect(p.y).toBeLessThanOrEqual(y1 + 6);
  }
  // Le trait est écrit dans la base (simulée) après « Terminé » : on attend l'écriture avant de recharger.
  await expect.poll(() => db.writes.filter((w) => w.path.includes("partitions/")).length, { timeout: 10_000 }).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await allerAuChant(page, SCAN);
  await expect.poll(async () => (await traits(page)).length, { message: "le tracé reste après rechargement", timeout: 15_000 }).toBe(1);

  // 4. Affichage, « Chiffres » : le calque du scan puis les accords du texte changent ; la pagination ne bouge pas (A1) ; fermer.
  const etiquettes = () => onStage(page, "[data-jianpu-label]").evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()).filter(Boolean));
  const compteur = await lireCompteur(page);
  let m = await ouvrirMenu(page, "affichage");
  await m.locator('[data-notation="chiffres"]').click();
  await expect.poll(async () => { const ts = await etiquettes(); return ts.length > 0 && !ts.some((t) => /^[A-G]/.test(t)); }).toBe(true);
  // En colonne (≥ 1 024 px) la musique se range à gauche des 320 px réservés : elle se repagine, c'est voulu (A1 ne vaut que sous 1 024 px).
  if ((await m.getAttribute("data-place")) !== "colonne") expect(await lireCompteur(page), "Affichage ne repagine pas").toBe(compteur);
  await m.getByRole("button", { name: "Fermer l'affichage" }).click();
  await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
  await allerAuChant(page, SAINT);
  m = await ouvrirMenu(page, "affichage");
  await expect.poll(async () => { const ts = await textesAccords(page); return ts.length > 0 && ts.every((t) => /^[b#]?[1-7]/.test(t)); }).toBe(true);
  await m.locator('[data-notation="lettres"]').click();
  await expect.poll(async () => { const ts = await textesAccords(page); return ts.length > 0 && ts.every((t) => /^[A-G]/.test(t)); }).toBe(true);
  await m.getByRole("button", { name: "Fermer l'affichage" }).click();
  await expect(marge(page)).toHaveAttribute("data-ouvert", "false");

  // 5. « Idées d'harmonie » allumé : un accord au bord gauche ouvre son panneau, la page ne tourne pas ; le fermer.
  const accords = onStage(page, "[data-accord-touchable]");
  await expect(accords.first()).toBeVisible({ timeout: 15_000 });
  const w = page.viewportSize()!.width;
  let n = -1;
  await expect.poll(async () => { // la marge qui se ferme remet la page en place : on attend que l'accord soit libre
    n = await accords.evaluateAll((els) => {
    const ok = els.map((el, i) => ({ i, r: el.getBoundingClientRect(), el })).filter(({ r, el }) => {
      const x = r.left + r.width / 2;
      return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && document.elementFromPoint(x, r.top + r.height / 2)?.closest("[data-accord-touchable]") === el;
    });
    return ok.length ? ok.reduce((a, b) => (b.r.left < a.r.left ? b : a)).i : -1;
  });
    return n;
  }, { timeout: 10_000 }).toBeGreaterThanOrEqual(0);
  expect(n, "un accord visible").toBeGreaterThanOrEqual(0);
  expect((await accords.nth(n).boundingBox())!.x, "au bord gauche").toBeLessThan(w * 0.34);
  const avant = await lireCompteur(page);
  await accords.nth(n).click();
  await expect(panneauAccord(page)).toBeVisible();
  expect(await lireCompteur(page), "la page ne tourne pas").toBe(avant);
  await page.keyboard.press("Escape");
  await expect(panneauAccord(page)).toHaveCount(0);
  expect(await lireCompteur(page)).toBe(avant);

  // 6. Chaque menu et feuille : sortie visible, puis Échap ou toucher dehors ; aucun dialogue ouvert, la page n'a pas changé.
  const rien = async (nom: string) => {
    await expect(page.getByRole("dialog"), `${nom} : aucun dialogue ouvert`).toHaveCount(0);
    await expect(marge(page), `${nom} : marge fermée`).not.toHaveAttribute("data-ouvert", "true");
    await expect(page.getByTestId("panneau-metronome")).toBeHidden();
    expect(await lireCompteur(page), `${nom} : la page n'a pas changé`).toBe(avant);
  };
  type Cas = { nom: string; ouvrir: () => Promise<Locator>; sortie?: (d: Locator) => Promise<unknown>; dehors?: boolean };
  const dialogue = (menu: Menu) => () => ouvrirMenu(page, menu);
  const cas: Cas[] = [
    { nom: "Setlist", ouvrir: dialogue("setlist"), dehors: true },
    { nom: "Repères", ouvrir: dialogue("reperes"), dehors: true },
    { nom: "Outils", ouvrir: dialogue("outils"), dehors: true },
    { nom: "Affichage", ouvrir: dialogue("affichage"), sortie: (d) => d.getByRole("button", { name: "Fermer l'affichage" }).click() },
    { nom: "Métronome", ouvrir: () => ouvrirMetronome(page), sortie: () => page.locator('[data-menu-louange="metronome"]').getByRole("button", { name: "Fermer le métronome" }).click() },
    {
      nom: "Idées",
      ouvrir: async () => { await onStage(page, "button[data-section-nom-bouton]").first().click(); const d = page.locator("[data-idees-harmonie]").first(); await expect(d).toBeVisible(); return d; },
      sortie: (d) => d.getByRole("button", { name: "Fermer", exact: true }).click(),
    },
  ];
  for (const c of cas) {
    let d = await c.ouvrir();
    if (c.sortie) { await c.sortie(d); await expect(d).toBeHidden(); await rien(`${c.nom} (sortie)`); d = await c.ouvrir(); }
    if (c.dehors) { await toucherDehors(page, d); await expect(d).toBeHidden(); await rien(`${c.nom} (dehors)`); d = await c.ouvrir(); }
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await rien(`${c.nom} (Échap)`);
  }
  // Crayon : sa sortie visible est « Terminé ».
  await basculerAnnoter(page);
  await expect(page.locator("[data-performance-mode] [data-crayon-barre]")).toBeVisible();
  await basculerAnnoter(page);
  await expect(page.locator("[data-performance-mode] [data-crayon-barre]")).toHaveCount(0);
  await rien("Crayon");

  // 7. Aucune erreur dans la console sur tout le parcours.
  expect(erreurs).toEqual([]);
});

// A7 (docs/spec-corrections-interface.md) : la barre du haut, ouverte, ne cache rien de la page. Page 1 : la première section
// (l'en-tête du chant porte sous la barre son titre, masqué barre ouverte) ; pages 2 et suivantes : le rappel ou la
// première section, dont la bordure du cadre et le titre étaient coupés. Un chant FR, un chant 中文.
test("A7 : barre ouverte, le haut des pages 1 et 2 commence sous la barre (abba-pere, 谢谢你)", async ({ page }) => {
  await ouvrirMode(page);
  const barreOuverte = page.locator("[data-barre-haut]").getByRole("button", { name: "Quitter" });
  const premier = () => page.evaluate(() => {
    const barre = document.querySelector("[data-barre-haut]")!.getBoundingClientRect().bottom;
    const tops = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-rappel], [data-performance-mode] [data-section]")]
      .filter((e) => !e.closest("[aria-hidden=true]") && e.getBoundingClientRect().height > 0)
      .map((e) => e.getBoundingClientRect().top);
    return { barre, haut: Math.min(...tops) };
  });
  for (const rang of [0, 1]) {
    if (rang > 0) await allerAuChant(page, rang);
    const total = Number((await lireCompteur(page)).split(" / ")[1]);
    const debut = Number((await lireCompteur(page)).split(" / ")[0]);
    for (const p of [debut, debut + 1]) {
      if (p > debut) {
        await page.keyboard.press("ArrowRight");
        await attendreCompteur(page, `${p} / ${total}`);
      }
      await expect(barreOuverte).toBeVisible();
      await expect.poll(async () => { const m = await premier(); return m.haut - m.barre; }, { message: `${SLUGS[rang]}, page ${p}` }).toBeGreaterThanOrEqual(0);
    }
  }
});
