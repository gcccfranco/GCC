import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, onStage, type Langue } from "./helpers/louange";

// R4 (docs/spec-retouches-2026-11-21.md) : dans le mode louange, dès 768 px, la fenêtre Harmonie s'ouvre à côté du TEXTE de la
// section touchée (à droite, sinon à gauche, sinon calée au bord droit de l'écran), haut aligné sur le nom ; on la tire par son
// en-tête (souris, doigt, stylet), la flèche disparaît, le × ferme, la réouverture la replace. Téléphone : feuille du bas inchangée.
// Spec d'agencement : cinq projets (SPECS_GRAND_ECRAN). Captures : test-results/r4-captures/<projet>-<langue>.png. Noms fictifs.

const SETLIST_ID = "setlist-fenetre-placement";
const PROFIL: FakeProfile = { uid: "uid-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "R.", planningName: "Sacha R.", ...musicien("piano") };

const CHANTS = [
  { slug: "a-jamais-tu-es-saint", langue: "fr" as Langue, cle: "C#" },
  { slug: "一切歌颂赞美", langue: "zh" as Langue, cle: "E" },
];

const setlist = (slug: string, cle: string) => ({
  title: "Culte du 11 octobre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [{
    songSlug: slug, position: 1, keyOverride: cle, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "",
  } satisfies SetlistItem],
});

async function ouvrirMode(page: Page, c: (typeof CHANTS)[number], scan = false) {
  await page.addInitScript(({ u, zh, sc }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    if (!sc) localStorage.setItem("jianpu-sheet-pref", "never");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    localStorage.setItem(`perf-idees-harmonie-${u}`, "1");
  }, { u: PROFIL.uid, zh: c.langue === "zh", sc: scan });
  const doc: ReturnType<typeof setlist> = setlist(c.slug, c.cle);
  if (scan) doc.items[0] = { ...doc.items[0], jianpuSheet: true } as (typeof doc.items)[number];
  await signInAs(page, PROFIL, { [`setlists/${SETLIST_ID}`]: doc }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: c.langue === "zh" ? /敬拜模式/ : /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
}

const noms = (page: Page) => onStage(page, "button[data-section-nom-bouton]");
const fenetre = (page: Page) => page.locator("[data-harmonie-fenetre]");
const grandEcran = (page: Page) => (page.viewportSize()?.width ?? 0) >= 768;

/** La boîte du texte de la section du nom touché (nœuds de texte seulement : la section entière rendrait la pleine largeur). */
const boiteTexte = (page: Page, index: number) => noms(page).nth(index).evaluate((el) => {
  const section = el.closest("[data-section]")!;
  let [g, h, d, b] = [Infinity, Infinity, -Infinity, -Infinity];
  const marche = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    if (!n.textContent?.trim()) continue;
    r.selectNodeContents(n);
    const x = r.getBoundingClientRect();
    if (!x.width) continue;
    [g, h, d, b] = [Math.min(g, x.left), Math.min(h, x.top), Math.max(d, x.right), Math.max(b, x.bottom)];
  }
  return { x: g, y: h, width: d - g, height: b - h };
});

type Boite = { x: number; y: number; width: number; height: number };
const recouvre = (a: Boite, b: Boite) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;

async function ouvrir(page: Page, index: number) {
  const nom = noms(page).nth(index);
  await nom.scrollIntoViewIfNeeded();
  await nom.click();
  await expect(fenetre(page)).toBeVisible();
  return posee(page);
}

/** Posée : le contenu charge puis la fenêtre se repose ; trois lectures égales de suite, à 100 ms d'intervalle. */
async function posee(page: Page) {
  let [b, egales] = [await fenetre(page).boundingBox(), 0];
  await expect(async () => {
    const prec = b;
    b = await fenetre(page).boundingBox();
    egales = b!.x === prec!.x && b!.y === prec!.y && b!.width === prec!.width && b!.height === prec!.height ? egales + 1 : 0;
    expect(egales, "fenêtre posée").toBeGreaterThanOrEqual(3);
  }).toPass({ timeout: 8_000, intervals: [100] });
  return b!;
}

for (const c of CHANTS) {
  test(`chant ${c.langue.toUpperCase()} : la fenêtre s'ouvre à côté du texte de la section touchée, le nom reste visible`, async ({ page }, info) => {
    test.skip(!grandEcran(page), "feuille du bas au téléphone");
    await ouvrirMode(page, c);
    await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
    const ecran = page.viewportSize()!;
    const n = Math.min(await noms(page).count(), 3);
    const cas_vus = new Set<string>();
    for (let i = 0; i < n; i++) {
      const b = await ouvrir(page, i);
      const nom = (await noms(page).nth(i).boundingBox())!;
      const texte = await boiteTexte(page, i);
      expect(b.x + b.width, "fenêtre entière à l'écran").toBeLessThanOrEqual(ecran.width);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(recouvre(b, nom), "le nom touché reste visible").toBe(false);
      if (ecran.height - nom.y - 16 >= ecran.height / 2) expect(Math.abs(b.y - nom.y), `section ${i} : haut de la fenêtre aligné sur le nom`).toBeLessThanOrEqual(12);
      const calee = Math.abs(b.x + b.width - (ecran.width - 8)) <= 2;
      const cas = calee ? "calée au bord droit" : b.x >= texte.x + texte.width - 1 ? "à droite du texte" : b.x + b.width <= texte.x + 1 ? "à gauche du texte" : "sur le texte";
      cas_vus.add(cas);
      if (!calee) expect(recouvre(b, texte), `section ${i} : la fenêtre ne recouvre pas son texte`).toBe(false);
      await page.keyboard.press("Escape");
      await expect(fenetre(page)).toHaveCount(0);
    }
    // Cas atteint(s) par ce projet et ce chant (écrits dans le message d'attente) : la droite doit être exercée au moins quelque part ;
    // la gauche et la cale ne le sont que si la largeur manque (voir le test « étroit » plus bas).
    test.info().annotations.push({ type: "cas", description: [...cas_vus].join(" ; ") });
    expect(cas_vus.has("sur le texte"), `cas atteints : ${[...cas_vus].join(" ; ")}`).toBe(false);
    // À 1 440 px la place à droite existe pour les premières sections : c'est le cas « à droite » qu'on exige ici.
    if (info.project.name === "ordinateur-1440") expect(cas_vus.has("à droite du texte"), `ordinateur-1440 doit exercer la droite ; cas atteints : ${[...cas_vus].join(" ; ")}`).toBe(true);
  });

  test(`chant ${c.langue.toUpperCase()} : sections trop à droite pour la fenêtre, elle passe à gauche du texte ou se cale au bord`, async ({ page }) => {
    test.skip(!grandEcran(page), "feuille du bas au téléphone");
    await ouvrirMode(page, c);
    await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
    const ecran = page.viewportSize()!;
    const total = await noms(page).count();
    const cas: string[] = [];
    for (let i = 0; i < total; i++) {
      const texte = await boiteTexte(page, i);
      if (texte.x + texte.width + 15 + 8 + Math.min(416, ecran.width - 16) <= ecran.width) continue; // la droite suffit : vue ci-dessus
      const b = await ouvrir(page, i);
      const nom = (await noms(page).nth(i).boundingBox())!;
      expect(recouvre(b, nom), "le nom touché reste visible").toBe(false);
      const calee = Math.abs(b.x + b.width - (ecran.width - 8)) <= 2;
      cas.push(calee ? "calée" : b.x + b.width <= texte.x + 1 ? "gauche" : "?");
      if (!calee) expect(b.x + b.width, `section ${i} : à gauche du texte`).toBeLessThanOrEqual(texte.x + 1);
      await page.keyboard.press("Escape");
      await expect(fenetre(page)).toHaveCount(0);
    }
    test.info().annotations.push({ type: "cas", description: cas.join(" ; ") || "aucune section sans place à droite sur ce projet" });
  });

  test(`chant ${c.langue.toUpperCase()} : tirer l'en-tête déplace la fenêtre, la flèche disparaît, le × ferme, la réouverture la replace`, async ({ page }) => {
    test.skip(!grandEcran(page), "feuille du bas au téléphone");
    await ouvrirMode(page, c);
    await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
    const ecran = page.viewportSize()!;
    const premiere = await ouvrir(page, 0);
    const fleche = fenetre(page).locator("svg.stroke-border");
    await expect(fleche).toHaveCount(1);

    // Lectures prises ensemble, juste avant de tirer : une mise en page tardive de la page ne fausse pas le delta.
    const avant = (await fenetre(page).boundingBox())!;
    const entete = (await fenetre(page).locator("[data-harmonie-entete]").boundingBox())!;
    const [dx, dy] = [avant.x + avant.width / 2 > ecran.width / 2 ? -70 : 70, 40];
    const [x0, y0] = [entete.x + 24, entete.y + entete.height / 2];
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 + dx / 2, y0 + dy / 2, { steps: 4 });
    await page.mouse.move(x0 + dx, y0 + dy, { steps: 4 });
    await page.mouse.up();
    await expect(fenetre(page)).toBeVisible(); // tirer ne ferme pas
    await expect.poll(async () => (await fenetre(page).boundingBox())!.x - avant.x).toBeCloseTo(dx, 0);
    const apres = (await fenetre(page).boundingBox())!;
    expect(apres.y - avant.y).toBeCloseTo(dy, 0);
    await expect(fleche).toHaveCount(0);

    // Très loin : l'en-tête ne sort jamais de l'écran.
    for (const [cx, cy] of [[ecran.width + 800, ecran.height + 800], [-800, -800]]) {
      const e2 = (await fenetre(page).locator("[data-harmonie-entete]").boundingBox())!;
      await page.mouse.move(e2.x + 24, e2.y + e2.height / 2);
      await page.mouse.down();
      await page.mouse.move(cx, cy, { steps: 6 });
      await page.mouse.up();
      const h = (await fenetre(page).locator("[data-harmonie-entete]").boundingBox())!;
      expect(h.x, "en-tête : bord gauche").toBeGreaterThanOrEqual(-1);
      expect(h.x + h.width, "en-tête : bord droit").toBeLessThanOrEqual(ecran.width + 1);
      expect(h.y, "en-tête : haut").toBeGreaterThanOrEqual(-1);
      expect(h.y + h.height, "en-tête : bas").toBeLessThanOrEqual(ecran.height + 1);
      await expect(fenetre(page)).toBeVisible();
    }

    // Le × ferme (il ne démarre pas de déplacement).
    await fenetre(page).locator("[data-harmonie-entete] button").click();
    await expect(fenetre(page)).toHaveCount(0);

    // Réouverture : décalage remis à zéro, à côté de la section.
    const nouveau = await ouvrir(page, 0);
    expect(Math.abs(nouveau.x - premiere.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(nouveau.y - premiere.y)).toBeLessThanOrEqual(1);
    await expect(fenetre(page).locator("svg.stroke-border")).toHaveCount(1);
  });
}

test("téléphone : la feuille du bas, inchangée (pas de fenêtre)", async ({ page }) => {
  test.skip(grandEcran(page), "fenêtre dès 768 px");
  await ouvrirMode(page, CHANTS[0]);
  await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
  await noms(page).first().click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
  await expect(fenetre(page)).toHaveCount(0);
  await expect(page.locator("[data-harmonie-entete]")).toHaveCount(0);
});

test("téléphone : un nom en moitié basse de l'écran ouvre la fenêtre au-dessus ou au-dessous du nom, comme avant, sans déplacement", async ({ page }) => {
  test.skip(grandEcran(page), "fenêtre dès 768 px");
  await ouvrirMode(page, CHANTS[0]);
  await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
  const ecran = page.viewportSize()!;
  const total = await noms(page).count();
  let bas = -1;
  for (let i = 0; i < total && bas < 0; i++) {
    const n = (await noms(page).nth(i).boundingBox())!;
    if (n.y + n.height + 8 > ecran.height / 2 && n.y + n.height < ecran.height) bas = i;
  }
  expect(bas, "un nom visible en moitié basse de l'écran").toBeGreaterThanOrEqual(0);
  await noms(page).nth(bas).click();
  await expect(fenetre(page)).toBeVisible();
  const b = await posee(page);
  const nom = (await noms(page).nth(bas).boundingBox())!;
  expect(recouvre(b, nom), "la fenêtre ne recouvre pas le nom touché").toBe(false);
  expect(b.y >= nom.y + nom.height - 1 || b.y + b.height <= nom.y + 1, "au-dessus ou au-dessous du nom, pas à côté").toBe(true);
  const entete = fenetre(page).locator("[data-harmonie-entete]");
  await expect(entete).toHaveCSS("touch-action", "auto");
  await expect(entete).not.toHaveClass(/cursor-grab/);
});

test("étiquette d'un scan 简谱 (≥ 768 px) : la fenêtre s'ouvre sous ou au-dessus de l'étiquette, comme avant", async ({ page }) => {
  test.skip(!grandEcran(page), "fenêtre dès 768 px");
  await ouvrirMode(page, { slug: "为我而来", langue: "zh", cle: "C" }, true);
  const etiquettes = onStage(page, "[data-jianpu-etiquette]");
  await expect(etiquettes.first()).toBeVisible({ timeout: 20_000 });
  await etiquettes.first().click();
  await expect(fenetre(page)).toBeVisible();
  const b = await posee(page);
  const e = (await etiquettes.first().boundingBox())!;
  expect(recouvre(b, e), "la fenêtre ne recouvre pas l'étiquette").toBe(false);
  expect(b.y >= e.y + e.height - 1 || b.y + b.height <= e.y + 1, "sous ou au-dessus de l'étiquette, pas à côté").toBe(true);
  await expect(fenetre(page).locator("[data-harmonie-entete]")).toHaveCSS("touch-action", "none"); // déplaçable dès 768 px
});

// ─── Captures : la fenêtre ouverte à côté de sa section ─────────────────────
for (const c of CHANTS) {
  test(`captures R4, ${c.langue === "zh" ? "中文" : "FR"}`, async ({ page }, info) => {
    test.skip(!["tablette", "tablette-paysage", "ordinateur", "ordinateur-1440"].includes(info.project.name), "captures sur grand écran");
    await ouvrirMode(page, c);
    await expect(noms(page).first()).toBeVisible({ timeout: 15_000 });
    await ouvrir(page, 0);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/r4-captures/${info.project.name}-${c.langue}.png` });
  });
}
