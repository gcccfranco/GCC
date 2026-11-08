import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirReglages } from "./helpers/louange";
import {
  COULEUR_DEFAUT, FOND_CLAIR, FOND_SOMBRE, TEINTES, contraste, garderContraste, hexVersHsl, hslVersHex,
} from "../src/lib/performance/couleurIcones";

// Lot FS-A (docs/spec-mode-louange-forscore-2.md) : barre de titre, rangée de points, couleur des icônes.
// Setlist et compte simulés : aucun accès au Firestore réel. Noms fictifs.

const SETLIST_ID = "setlist-barre-titre";
const MUSICIEN: FakeProfile = {
  uid: "uid-barre-titre",
  email: "musicien-barre@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});

const setlist = (slugs: string[]) => ({
  title: "Culte d'essai de la barre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-08",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: slugs.map((s, i) => item(s, i + 1)),
});

const FR = ["avec-nous", "abba-pere", "a-l-agneau"];
const ZH = ["一生爱你", "为我而来", "abba-pere"];

async function ouvrir(
  page: Page,
  opts: { slugs?: string[]; zh?: boolean; theme?: "light" | "dark"; couleur?: string } = {},
) {
  const { slugs = FR, zh = false, theme = "light", couleur } = opts;
  await page.addInitScript(([z, th, c]) => {
    try {
      if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (c && !localStorage.getItem("perf-couleur-icones")) localStorage.setItem("perf-couleur-icones", c as string);
    } catch { /* ignore */ }
  }, [zh, theme, couleur ?? ""]);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  // La pastille de développement de Next recouvre le coin bas gauche : hors champ, comme dans guide-captures.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

async function toucherCentre(page: Page) {
  const ecran = page.viewportSize()!;
  await page.mouse.click(ecran.width / 2, ecran.height / 2);
}

const telephone = (page: Page) => page.viewportSize()!.width < 768;

/** Les boutons visibles de la barre de titre, de gauche à droite. */
async function boutonsHaut(page: Page) {
  return page.locator("[data-barre-haut] button").evaluateAll((els) =>
    els
      .filter((e) => e.getClientRects().length > 0)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { nom: e.getAttribute("aria-label")!, x: r.x, centre: r.x + r.width / 2, w: r.width, h: r.height };
      })
      .sort((a, b) => a.x - b.x),
  );
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** Contraste WCAG entre deux couleurs « rgb(r, g, b) » lues à l'écran, calculé sans le code testé. */
const contrasteEcran = (a: string, b: string) => {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/\d+/g) ?? []).slice(0, 3).map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const couleurIcone = (page: Page) => page.locator("[data-barre-haut] button").last().evaluate((el) => getComputedStyle(el).color);
const fondBarre = (page: Page) => page.locator("[data-barre-haut]").evaluate((el) => getComputedStyle(el).backgroundColor);

// ─── La barre de titre ────────────────────────────────────────────────────────

test("barre de titre : Setlist et Je joue à gauche, titre au centre, ♩ Annoter Outils Options ✕ à droite (téléphone : Setlist, Je joue | titre | Options, ✕)", async ({ page }) => {
  await ouvrir(page);
  const boutons = await boutonsHaut(page);
  const noms = boutons.map((b) => b.nom);
  if (telephone(page)) {
    expect(noms).toEqual(["Setlist", "Je joue", "Options d'affichage", "Quitter"]);
  } else {
    expect(noms).toEqual(["Setlist", "Je joue", "Tempo", "Annoter", "Outils", "Options d'affichage", "Quitter"]);
  }
  for (const b of boutons) {
    expect(b.h, `${b.nom} : cible haute d'au moins 44 px`).toBeGreaterThanOrEqual(43.5);
    expect(b.w, `${b.nom} : cible large d'au moins 44 px`).toBeGreaterThanOrEqual(43.5);
  }
  // Le titre est entre le groupe de gauche et celui de droite.
  const titre = (await page.locator("[data-barre-haut] p").first().boundingBox())!;
  const jeJoue = boutons.find((b) => b.nom === "Je joue")!;
  const options = boutons.find((b) => b.nom === "Options d'affichage")!;
  expect(titre.x).toBeGreaterThanOrEqual(jeJoue.centre);
  expect(titre.x + titre.width).toBeLessThanOrEqual(options.centre);
  await expect(page.locator("[data-barre-haut] p").first()).toHaveText("Avec nous (Emmanuel)");
  // Le tempo (♩ 94) reste dans la barre, sur l'élément repéré.
  await expect(page.locator("[data-tempo-barre]")).toHaveText(/♩\s*94/);
  // Plus de « Deux colonnes » dans la barre.
  await expect(page.locator("[data-barre-haut]").getByRole("button", { name: /2 colonnes/ })).toHaveCount(0);
  const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(debord).toBeLessThanOrEqual(0);
});

test("barre de titre en 中文 : mêmes boutons, noms chinois", async ({ page }) => {
  await ouvrir(page, { slugs: ZH, zh: true });
  const noms = (await boutonsHaut(page)).map((b) => b.nom);
  if (telephone(page)) expect(noms).toEqual(["歌单", "我演奏", "显示选项", "退出"]);
  else expect(noms.filter((n) => n !== "节拍" && n !== "批注")).toEqual(["歌单", "我演奏", "工具", "显示选项", "退出"]);
});

test("Setlist ouvre le sommaire, Je joue la feuille du rôle, Options le tiroir « Réglages »", async ({ page }) => {
  await ouvrir(page);
  await page.getByRole("button", { name: "Setlist" }).click();
  const sommaire = page.locator("[data-performance-mode]").getByText("Culte d'essai de la barre");
  await expect(sommaire).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sommaire).toHaveCount(0);
  await expect(page.locator("[data-performance-mode]")).toBeVisible();
  const reglages = await ouvrirReglages(page);
  // Deux colonnes et Annoter (téléphone) sont dans le tiroir, plus dans la barre.
  if (telephone(page)) await expect(reglages.getByRole("button", { name: "Annoter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  await page.getByRole("button", { name: "Je joue" }).click();
  await expect(page.getByRole("dialog", { name: /rôle/i })).toBeVisible();
});

// ─── La rangée de points ──────────────────────────────────────────────────────

test("en bas : seulement le curseur de page (aucun bouton hors repères de chant), ni « page n / N » ni titre", async ({ page }) => {
  await ouvrir(page);
  const bas = page.locator("[data-barre-bas]");
  await expect(bas.locator("input[type=range]")).toHaveCount(1);
  await expect(bas.locator("button:not([data-repere-chant])")).toHaveCount(0);
  await expect(bas.locator("[data-repere-chant]")).toHaveCount(3);
  await expect(bas.locator("[data-curseur-etiquette]")).toHaveCount(0);
  expect(((await bas.innerText()) ?? "").trim()).toBe("");
});

test("le curseur : un point par page, poignée ronde, vignette du chant visé pendant le glissé", async ({ page }) => {
  await ouvrir(page);
  const curseur = page.locator("[data-barre-bas] [data-curseur-page]");
  const total = Number(await page.locator("[data-barre-bas] input[type=range]").getAttribute("max")) + 1;
  expect(total).toBeGreaterThanOrEqual(3);
  await expect(page.locator("[data-poignee-curseur]")).toBeVisible();
  const poignee = (await page.locator("[data-poignee-curseur]").boundingBox())!;
  expect(Math.abs(poignee.width - poignee.height)).toBeLessThan(1);
  const b = (await curseur.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + b.height / 2 + 4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2 + 4, { steps: 8 });
  const bulle = page.locator("[data-bulle-curseur]");
  await expect(bulle).toBeVisible();
  await expect(bulle.locator("[data-bulle-titre]")).not.toHaveText("");
  await expect(bulle.locator("[data-bulle-page]")).toHaveText(/^page \d+$/);
  await page.mouse.up();
  await expect(bulle).toHaveCount(0);
  expect(Number(await page.locator("[data-barre-bas] input[type=range]").inputValue())).toBeGreaterThan(0);
});

test("barre masquée : sous inert / aria-hidden, aucun élément focalisable, sans perdre ses mesures", async ({ page }) => {
  await ouvrir(page);
  await toucherCentre(page);
  await expect(page.locator("[data-barre-haut]")).toHaveCSS("pointer-events", "none");
  const chrome = page.locator("[data-performance-mode] [inert]");
  await expect(chrome).toHaveCount(1);
  await expect(chrome).toHaveAttribute("aria-hidden", "true");
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    const dedans = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && [...document.querySelectorAll("[data-barre-haut], [data-barre-bas]")].some((b) => b.contains(el));
    });
    expect(dedans).toBe(false);
  }
  // Les barres gardent leur hauteur (le liseré et l'annotation s'y calent).
  expect((await page.locator("[data-barre-haut]").boundingBox())!.height).toBeGreaterThan(40);
  expect((await page.locator("[data-barre-bas]").boundingBox())!.height).toBeGreaterThan(40);
});

// ─── La couleur des icônes ────────────────────────────────────────────────────

test("couleur des icônes : bleu par défaut ; framboise choisie, retenue après rechargement (couleur corrigée mesurée)", async ({ page }) => {
  await ouvrir(page);
  expect(await couleurIcone(page)).toBe(rgb(garderContraste(COULEUR_DEFAUT, FOND_CLAIR)));
  let reglages = await ouvrirReglages(page);
  const palette = reglages.getByRole("radiogroup", { name: "Couleur des icônes" });
  await expect(palette.getByRole("radio")).toHaveCount(7);
  for (const c of TEINTES) {
    const r = palette.locator(`[data-teinte="${c.id}"]`);
    const m = (await r.boundingBox())!;
    expect(m.width).toBeGreaterThanOrEqual(43.5);
    expect(m.height).toBeGreaterThanOrEqual(43.5);
  }
  await expect(palette.getByRole("radio", { name: "Bleu" })).toHaveAttribute("aria-checked", "true");
  await palette.getByRole("radio", { name: "Framboise" }).click();
  await expect(palette.getByRole("radio", { name: "Framboise" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  const attendue = rgb(garderContraste("#c2185b", FOND_CLAIR));
  await expect.poll(() => couleurIcone(page)).toBe(attendue);
  expect(await page.evaluate(() => localStorage.getItem("perf-couleur-icones"))).toBe("#c2185b");

  // La page n'est pas teintée : les accords gardent leur couleur.
  const accord = page.locator("[data-performance-mode] [data-chord], [data-performance-mode] .chord").first();
  if (await accord.count()) expect(await accord.evaluate((el) => getComputedStyle(el).color)).not.toBe(attendue);

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  await expect.poll(() => couleurIcone(page)).toBe(attendue);
  reglages = await ouvrirReglages(page);
  await expect(reglages.getByRole("radiogroup", { name: "Couleur des icônes" }).getByRole("radio", { name: "Framboise" })).toHaveAttribute("aria-checked", "true");
});

test("cercle chromatique : flèche droite sur la teinte change la couleur, retenue après rechargement", async ({ page }) => {
  await ouvrir(page);
  const reglages = await ouvrirReglages(page);
  await reglages.getByRole("radio", { name: "Autre couleur" }).click();
  const teinte = reglages.getByRole("slider", { name: "Teinte" });
  await expect(teinte).toBeVisible();
  await expect(reglages.getByRole("slider", { name: "Luminosité" })).toBeVisible();
  await expect(reglages.locator("[data-apercu-fond]")).toHaveCount(2);
  const avant = Number(await teinte.getAttribute("aria-valuenow"));
  const couleurAvant = await page.evaluate(() => localStorage.getItem("perf-couleur-icones"));
  await teinte.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Number(await teinte.getAttribute("aria-valuenow"))).not.toBe(avant);
  await page.keyboard.press("Shift+ArrowRight");
  const apres = await page.evaluate(() => localStorage.getItem("perf-couleur-icones"));
  expect(apres).toMatch(/^#[0-9a-f]{6}$/);
  expect(apres).not.toBe(couleurAvant);
  await page.keyboard.press("Escape");
  await expect(reglages).toBeHidden();
  await expect.poll(() => couleurIcone(page)).toBe(rgb(garderContraste(apres!, FOND_CLAIR)));

  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("perf-couleur-icones"))).toBe(apres);
});

test("cercle chromatique : un toucher sur l'anneau choisit la teinte (pointer events)", async ({ page }) => {
  await ouvrir(page);
  const reglages = await ouvrirReglages(page);
  await reglages.getByRole("radio", { name: "Autre couleur" }).click();
  const anneau = reglages.getByRole("slider", { name: "Teinte" });
  await anneau.scrollIntoViewIfNeeded();
  const b = (await anneau.boundingBox())!;
  // À droite de l'anneau (3 h) : teinte vers 90°, et la page n'a pas tourné.
  await page.mouse.click(b.x + b.width - 14, b.y + b.height / 2);
  const h = Number(await anneau.getAttribute("aria-valuenow"));
  expect(Math.abs(h - 90)).toBeLessThanOrEqual(4);
});

for (const theme of ["light", "dark"] as const) {
  for (const couleur of ["#1c1c1e", "#ffff00", "#3f63cf", "#ffffff", "#000000"]) {
    test(`contraste des icônes ≥ 3:1 contre le fond de la barre, mesuré à l'écran (${theme}, ${couleur})`, async ({ page }) => {
      await ouvrir(page, { theme, couleur });
      const icone = await couleurIcone(page);
      const fond = await fondBarre(page);
      expect(contrasteEcran(icone, fond), `${icone} sur ${fond}`).toBeGreaterThanOrEqual(3);
      // Le point courant et la poignée suivent la même couleur corrigée.
      const poignee = await page.locator("[data-poignee-curseur]").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(contrasteEcran(poignee, fond)).toBeGreaterThanOrEqual(3);
    });
  }
}

// ─── Fonctions pures ──────────────────────────────────────────────────────────

test("garderContraste : chaque teinte prête et les couleurs limites sortent à ≥ 3:1 contre blanc et noir", async () => {
  const entrees = [...TEINTES.map((c) => c.hex), "#ffff00", "#ffffff", "#000000", "#808080", "#00ffff", "#ff00ff"];
  for (const hex of entrees) {
    for (const fond of [FOND_CLAIR, FOND_SOMBRE]) {
      const sortie = garderContraste(hex, fond);
      expect(contraste(sortie, fond), `${hex} sur ${fond} → ${sortie}`).toBeGreaterThanOrEqual(3);
    }
  }
});

test("garderContraste : ne touche pas une couleur déjà assez contrastée ; l'encre devient claire en sombre ; sens de la correction", async () => {
  expect(garderContraste("#3f63cf", FOND_CLAIR)).toBe("#3f63cf");
  expect(garderContraste("#1c1c1e", FOND_CLAIR)).toBe("#1c1c1e");
  const encreSombre = garderContraste("#1c1c1e", FOND_SOMBRE);
  expect(encreSombre).not.toBe("#1c1c1e");
  expect(hexVersHsl(encreSombre)[2]).toBeGreaterThan(hexVersHsl("#1c1c1e")[2]);
  const jauneClair = garderContraste("#ffff00", FOND_CLAIR);
  expect(hexVersHsl(jauneClair)[2]).toBeLessThan(hexVersHsl("#ffff00")[2]);
  // La teinte est gardée (au degré près) quand la couleur n'est pas grise.
  expect(Math.abs(hexVersHsl(jauneClair)[0] - 60)).toBeLessThanOrEqual(2);
  expect(garderContraste("pas une couleur", FOND_CLAIR)).toBe(COULEUR_DEFAUT);
});

test("hexVersHsl / hslVersHex : aller-retour à un cran près", async () => {
  for (const hex of TEINTES.map((c) => c.hex)) {
    const [h, s, l] = hexVersHsl(hex);
    const retour = hslVersHex(h, s, l);
    const ecart = [1, 3, 5].map((i) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(retour.slice(i, i + 2), 16)));
    expect(Math.max(...ecart), `${hex} → ${retour}`).toBeLessThanOrEqual(3);
  }
});

// ─── Captures à regarder (test-results/fs-a/) ─────────────────────────────────

const SORTIE = "test-results/fs-a";
for (const [langue, zh] of [["fr", false], ["zh", true]] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures FS-A : barre ouverte, ${langue}, ${theme}`, async ({ page }, testInfo) => {
      await ouvrir(page, { slugs: zh ? ZH : FR, zh, theme });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SORTIE}/barre-${langue}-${theme}-${testInfo.project.name}.png` });
    });
  }
}

test("captures FS-A : tiroir avec la palette, puis le cercle ouvert", async ({ page }, testInfo) => {
  await ouvrir(page, { theme: "dark" });
  const reglages = await ouvrirReglages(page);
  const palette = reglages.getByRole("radiogroup", { name: "Couleur des icônes" });
  await palette.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SORTIE}/tiroir-palette-${testInfo.project.name}.png` });
  await reglages.getByRole("radio", { name: "Autre couleur" }).click();
  await reglages.getByRole("slider", { name: "Teinte" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SORTIE}/cercle-${testInfo.project.name}.png` });
});
