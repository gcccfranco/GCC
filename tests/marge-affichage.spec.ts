import { expect, test, type Locator, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { marge, ouvrirMarge } from "./helpers/marge";
import { attendreMiseEnPage, ouvrirMenu } from "./helpers/louange";

// La marge « Affichage » (docs/spec-reglages-unifies.md, RU-2), montée sur la page chant (RU-3) : colonne de
// 320 px qui pousse la musique dès 1 024 px, feuille basse opaque de 40 %, pleine largeur de la zone de la musique, sans voile en dessous (deux formes, B5),
// deux groupes (plus de « Je joue » sur la page chant) et une mention de portée chacun, réglages retenus sous les clés existantes, mouvement.

const MUSICIEN: FakeProfile = { uid: "uid-banc", email: "banc@example.com", firstName: "Camille", lastName: "B." };
const CHANTS = [
  { slug: "abba-pere", zh: false },
  { slug: "一生爱你", zh: true },
] as const;

// La musique : la zone de lecture de la page chant, à gauche de la colonne.
const musique = (page: Page) => page.locator("main.song-zoom");

async function ouvrir(page: Page, slug: string, opts: { zh?: boolean } = {}) {
  if (opts.zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  await signInAs(page, MUSICIEN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(musique(page)).toBeVisible();
  await ouvrirMarge(page);
}

for (const chant of CHANTS) {
  test.describe(`marge Affichage — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("disposition selon la largeur ; captures ; deux groupes et deux mentions de portée", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const vp = page.viewportSize()!;
      const m = (await marge(page).boundingBox())!;
      const zone = (await musique(page).boundingBox())!;
      // Colonne seulement si la musique garde 340 px (RU-3) : sinon feuille de 560 px, même dès 1 024 px.
      const place = await marge(page).getAttribute("data-place");
      expect(["colonne", "feuille"]).toContain(place);
      if (vp.width < 1024) expect(place).toBe("feuille");
      if (place === "colonne") {
        expect(m.width).toBeCloseTo(320, 0);
        expect(zone.width).toBeGreaterThanOrEqual(340);
        const armure = page.getByTestId("armure");
        const droite = (await armure.count()) ? (await armure.boundingBox())!.x + (await armure.boundingBox())!.width : zone.x + zone.width;
        expect(m.x - droite, "écart musique / filet de la colonne").toBeGreaterThanOrEqual(16);
        expect(zone.x + zone.width).toBeLessThanOrEqual(m.x + 0.5);
        // Aux grandes largeurs la page chant est dans la carte « chants » : la colonne en suit le bord intérieur (marge de page + 24 px de remplissage).
        const carte = page.locator(".chants-chant");
        const bord = (await carte.count()) ? await carte.evaluate((el) => el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight)) : vp.width;
        expect(m.x + m.width).toBeCloseTo(bord, 0);
      } else {
        // Pleine largeur de la zone de la musique : la fenêtre, ou le volet du chant (son enveloppe) en deux volets.
        const deuxVolets = (await page.locator(".chants-chant").count()) > 0;
        const zoneMusique = deuxVolets ? (await marge(page).locator("xpath=..").boundingBox())! : { x: 0, width: vp.width };
        expect(m.x).toBeCloseTo(zoneMusique.x, 0);
        expect(m.width).toBeCloseTo(zoneMusique.width, 0);
        expect(m.height).toBeCloseTo(0.4 * vp.height, 0);
        expect(m.y + m.height).toBeLessThanOrEqual(vp.height + 0.5);
        const fond = await marge(page).evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(fond).not.toMatch(/rgba\(.*,\s*0(\.\d+)?\)$/);
        expect(fond).not.toBe("transparent");
      }
      await expect(page.locator("[data-groupe]")).toHaveCount(2);
      await expect(marge(page).getByText(chant.zh ? "保存在本设备" : "Retenu sur cet appareil", { exact: true })).toHaveCount(2);
      await expect(marge(page).getByRole("heading", { level: 2 })).toHaveText(chant.zh ? "显示" : "Affichage");
      await expect(marge(page).getByRole("button", { name: chant.zh ? "关闭显示" : "Fermer l'affichage" })).toBeVisible();
      await expect(marge(page).getByRole("radio", { name: chant.zh ? "钢琴手" : "Pianiste" })).toHaveCount(0);
      if (chant.zh) await expect(marge(page).getByText("每段一次")).toBeVisible();
      await page.screenshot({ path: `test-results/marge-affichage-captures/${test.info().project.name}-${chant.zh ? "zh" : "fr"}.png` });
    });

    test("pas de groupe « Je joue » sur la page chant : tout est montré", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      await expect(marge(page).getByText(chant.zh ? "我演奏" : "Je joue")).toHaveCount(0);
      await expect(marge(page).getByRole("radiogroup", { name: chant.zh ? "我演奏" : "Je joue" })).toHaveCount(0);
      await expect(marge(page).getByText(chant.zh ? "和弦颜色" : "Couleur des accords")).toBeVisible();
      // Page : le bouton « Accords » de la barre double l'interrupteur, qui quitte la marge (B6).
      await expect(marge(page).getByRole("switch", { name: chant.zh ? "和弦" : "Accords" })).toHaveCount(0);
      await expect(marge(page).locator("[data-notation]").first()).toBeVisible();
    });

    test("le bouton Accords de la barre bascule le réglage", async ({ page }) => {
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const bouton = page.getByTestId("barre-outils").getByRole("button", { name: chant.zh ? "和弦" : "Accords", exact: true });
      await expect(bouton).toHaveAttribute("aria-pressed", "true");
      await bouton.click();
      await expect(bouton).toHaveAttribute("aria-pressed", "false");
      await bouton.click();
      await expect(bouton).toHaveAttribute("aria-pressed", "true");
    });
  });
}

// B6 : une forme par disposition, quelle que soit la langue du chant : ronds à icône seule sous 768 px, pastilles étiquetées dès 768 px.
for (const chant of [{ slug: "abba-pere", zh: false }, { slug: "谢谢你", zh: true }] as const) {
  test(`boutons de lecture — ${chant.zh ? "ZH" : "FR"} ${chant.slug} : ronds sous 768 px, pastilles étiquetées dès 768 px`, async ({ page }) => {
    await ouvrir(page, chant.slug, { zh: chant.zh });
    const large = page.viewportSize()!.width >= 768;
    const noms = chant.zh ? ["和弦", "拼音", "显示"] : ["Accords", "Affichage"];
    for (const nom of noms) {
      const b = page.getByTestId("barre-outils").getByRole("button", { name: nom, exact: true });
      await expect(b).toHaveAttribute("aria-label", nom);
      // Le 拼 du bouton Pinyin est son icône, pas un mot.
      const texte = (await b.innerText()).trim();
      expect(nom === "拼音" ? texte.replace(/^拼\s*/, "") : texte).toBe(large ? nom : "");
      expect((await b.boundingBox())!.height).toBeCloseTo(large ? 32 : 36, 0);
    }
  });
}

test.describe("marge Affichage — mesures", () => {
  test("412 × 700 : feuille opaque de 40 %, sans voile, dernier réglage atteignable et entièrement visible", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "一生爱你", { zh: true });
    const m = (await marge(page).boundingBox())!;
    expect(m.height).toBeCloseTo(280, 0);
    expect(m.y + m.height).toBeLessThanOrEqual(700.5);
    const dernier = marge(page).locator("[data-groupe]").last().locator("p").last();
    await dernier.scrollIntoViewIfNeeded();
    const b = (await dernier.boundingBox())!;
    const corps = (await page.getByTestId("marge-corps").boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(corps.y - 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(Math.min(corps.y + corps.height, 700) + 0.5);
    // Rien ne couvre le dernier réglage (barre d'onglets, bouton flottant) : le point visé appartient à la marge.
    const couvert = await dernier.evaluate((el) => {
      const r = el.getBoundingClientRect();
      // Centre du réglage : la pastille de Next en développement (nextjs-portal, coin bas gauche) n'existe pas en ligne.
      const haut = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(haut && el.closest("[data-testid=marge-affichage]")!.contains(haut));
    });
    expect(couvert).toBe(false);
    // Aucun voile : aucun élément fixe, presque plein écran, semi-transparent.
    const voiles = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const a = s.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(",").map(Number);
      const alpha = a ? (a.length > 3 ? a[3] : 1) : 0;
      return s.position === "fixed" && r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && alpha > 0 && alpha < 1;
    }).length);
    expect(voiles).toBe(0);
  });

  test("ordinateur 1 920 × 1 080 : colonne de 320 px, musique d'au moins 340 px, 16 px d'écart avec l'armure", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "viewport forcé : un seul appareil");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await ouvrir(page, "一生爱你", { zh: true });
    await expect(marge(page)).toHaveAttribute("data-place", "colonne");
    const m = (await marge(page).boundingBox())!;
    expect((await musique(page).boundingBox())!.width).toBeGreaterThanOrEqual(340);
    const a = (await page.getByTestId("armure").boundingBox())!;
    expect(m.x - (a.x + a.width)).toBeGreaterThanOrEqual(16);
  });

  test("412 × 700 : le bas de la musique remonte au-dessus de la feuille", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 700 });
    await ouvrir(page, "abba-pere");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const fin = (await musique(page).evaluate((el) => {
      const k = el.lastElementChild ?? el; const r = k.getBoundingClientRect(); return r.bottom;
    }));
    const m = (await marge(page).boundingBox())!;
    expect(fin).toBeLessThanOrEqual(m.y + 0.5);
  });

  test("un réglage choisi garde le focus (pas de retour au bouton fermer)", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    const chiffres = marge(page).getByRole("radio", { name: "Plan", exact: true });
    await chiffres.focus();
    await chiffres.press("Enter");
    await page.waitForTimeout(200);
    await expect(chiffres).toBeFocused();
  });

  test("tablette portrait : feuille du bas pleine largeur (B5)", async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    await ouvrir(page, "abba-pere");
    const m = (await marge(page).boundingBox())!;
    expect(await marge(page).getAttribute("data-place")).toBe("feuille");
    expect(m.x).toBeCloseTo(0, 0);
    expect(m.width).toBeCloseTo(810, 0);
    expect(m.height).toBeCloseTo(432, 0);
  });

  test("Échap ferme la marge et rend le focus au bouton", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await page.keyboard.press("Escape");
    await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
    await expect(page.getByTestId("barre-outils").getByRole("button", { name: "Affichage" })).toBeFocused();
  });

  test("mode page : ressort de 300 ms ; mouvement réduit : fondu de 150 ms (le mode louange : RU-5)", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await expect(marge(page)).toHaveAttribute("data-mode", "page");
    const d = await marge(page).evaluate((el) => ({ p: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration }));
    expect(d.p).toContain("transform");
    expect(d.d.startsWith("0.3s")).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const r = await marge(page).evaluate((el) => ({ p: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration }));
    expect(r.p.startsWith("opacity")).toBe(true);
    expect(r.p).not.toContain("transform");
    expect(r.d.startsWith("0.15s")).toBe(true);
  });

  test("pinyin et ordre des sections : clés existantes écrites, valeurs retrouvées au rechargement", async ({ page }) => {
    await ouvrir(page, "一生爱你", { zh: true });
    // Le scan 简谱 remplace les paroles : on passe en paroles pour voir les lignes de pinyin.
    await marge(page).getByRole("radio", { name: "歌词" }).click();
    const pinyin = marge(page).getByRole("switch", { name: "拼音" });
    await expect(pinyin).toBeChecked();
    await expect(page.locator('[data-ligne="pinyin"]').first()).toBeVisible();
    await pinyin.click();
    await marge(page).getByRole("radio", { name: "只看结构" }).click();
    await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
    const cles = await page.evaluate(() => ({
      pinyin: localStorage.getItem("gcc.showPinyin"),
      ordre: Object.keys(localStorage).filter((k) => k.startsWith("partition-layout")).map((k) => localStorage.getItem(k)),
    }));
    expect(cles.pinyin).toBe("0");
    expect(cles.ordre).toContain("structure");
    await page.reload();
    await expect(musique(page)).toBeVisible();
    await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
    await ouvrirMarge(page);
    await expect(marge(page).getByRole("switch", { name: "拼音" })).not.toBeChecked();
    await expect(marge(page).getByRole("radio", { name: "只看结构" })).toHaveAttribute("aria-checked", "true");
  });

  test("taille du texte : pas de 10 %", async ({ page }) => {
    await ouvrir(page, "abba-pere");
    await expect(page.getByTestId("marge-taille")).toHaveText("100 %");
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
    await expect(page.getByTestId("marge-taille")).toHaveText("110 %");
  });
});

const VIGNETTES = '[role="radiogroup"][aria-labelledby$="-disp"] > [role="radio"]';

// A5 : un seul code (grille souple) pour la colonne de 320 px et la feuille ; les vignettes passent à la ligne.
test("les cinq libellés de disposition sont espacés de 8 px (sur une même ligne) et tiennent sur deux lignes", async ({ page }) => {
  await ouvrir(page, "abba-pere");
  const noms = marge(page).locator(`${VIGNETTES} > span:last-child`);
  await expect(noms).toHaveCount(5);
  const boites = await noms.evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, lh: parseFloat(getComputedStyle(e).lineHeight) };
  }));
  for (const [i, b] of boites.entries()) {
    expect(b.h, `libellé ${i}`).toBeLessThanOrEqual(2 * b.lh + 1);
    if (i > 0 && Math.abs(b.y - boites[i - 1].y) < 2) expect(b.x - (boites[i - 1].x + boites[i - 1].w), `écart ${i - 1}-${i}`).toBeGreaterThanOrEqual(7.5);
  }
});

// A5 (reste) : colonne de 320 px à 1 920 px (à 1 366 px la page chant en deux volets laisse moins de 340 px à la musique : feuille), feuille au téléphone ; libellés jamais coupés, en FR et en 中文.
for (const chant of CHANTS) {
  test(`disposition — ${chant.zh ? "ZH" : "FR"} : libellés entiers, deux lignes au plus, dans leur vignette (colonne de 320 px à 1 920 px, feuille à 1 366 px et au téléphone)`, async ({ page }, info) => {
    const ordi = info.project.name === "ordinateur";
    for (const largeur of ordi ? [1366, 1920] : [0]) {
      if (largeur) await page.setViewportSize({ width: largeur, height: 800 });
      await ouvrir(page, chant.slug, { zh: chant.zh });
      const lieu = await marge(page).getAttribute("data-place");
      if (largeur === 1920) expect(lieu).toBe("colonne");
      if (largeur === 1366) expect(lieu).toBe("feuille");
      const vignettes = marge(page).locator(VIGNETTES);
      await expect(vignettes).toHaveCount(5);
      const mesures = await vignettes.evaluateAll((els) => els.map((v) => {
        const n = v.querySelector<HTMLElement>(":scope > span:last-child")!;
        const rv = v.getBoundingClientRect(), rn = n.getBoundingClientRect();
        return { texte: n.textContent, tronque: n.scrollWidth > n.clientWidth + 0.5, h: rn.height, lh: parseFloat(getComputedStyle(n).lineHeight), deborde: rn.left < rv.left - 0.5 || rn.right > rv.right + 0.5 || rn.bottom > rv.bottom + 0.5 };
      }));
      for (const m of mesures) {
        expect(m.tronque, `« ${m.texte} » coupé (${largeur})`).toBe(false);
        expect(m.h, `« ${m.texte} » sur deux lignes au plus`).toBeLessThanOrEqual(2 * m.lh + 1);
        expect(m.deborde, `« ${m.texte} » dans sa vignette`).toBe(false);
      }
      if (lieu === "colonne") expect((await marge(page).boundingBox())!.width).toBeCloseTo(320, 0);
    }
  });
}

// B11 : un réglage a un seul état actif (`Bascule`, fond noir). « Je joue » est la même Bascule mais n'existe que dans le mode louange ;
// ici : l'ordre des sections (Bascule) et Lettres/Chiffres (ChoixNotation) sur la page chant.
test("réglages de la marge : Bascule et Lettres/Chiffres ont la même couleur active", async ({ page }) => {
  await ouvrir(page, "abba-pere");
  const fond = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  const bascule = marge(page).locator('[role="radiogroup"][aria-label] > [role="radio"][aria-checked="true"]').first();
  const lettres = marge(page).locator('button[data-notation][aria-pressed="true"]').first();
  await expect(bascule).toBeVisible();
  await expect(lettres).toBeVisible();
  expect(await fond(bascule)).toBe(await fond(lettres));
});

// Reste d'A5 (CI-4) : le panneau « Affichage » du mode louange. Dans la colonne de 320 px (dès 1 024 px), la grille souple
// de la marge (3 + 2) ; ailleurs cinq de front. Libellés entiers, deux lignes au plus, 8 px d'écart sur une même ligne.
test("disposition — mode louange : libellés entiers, deux lignes au plus, espacés de 8 px", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("perf-role-preset", "pianiste"); } catch {} });
  const setlist = {
    title: "Culte des vignettes", leader: "Présidence", category: "Culte Francophone", date: "2026-11-15", language: "mixed", notes: "",
    ownerId: MUSICIEN.uid, isPrivate: false,
    items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
  };
  await signInAs(page, MUSICIEN, { "setlists/setlist-vignettes": setlist }, "/setlists/setlist-vignettes");
  await page.getByRole("button", { name: /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  const panneau = await ouvrirMenu(page, "affichage");
  const vignettes = panneau.locator('[role="radiogroup"][aria-labelledby="perf-disposition"] > [role="radio"]');
  await expect(vignettes).toHaveCount(5);
  await vignettes.first().scrollIntoViewIfNeeded();
  const mesures = await vignettes.evaluateAll((els) => els.map((v) => {
    const n = v.querySelector<HTMLElement>(":scope > span:last-child")!;
    const rv = v.getBoundingClientRect(), rn = n.getBoundingClientRect();
    return { texte: n.textContent, x: rn.x, y: rn.y, w: rn.width, h: rn.height, lh: parseFloat(getComputedStyle(n).lineHeight), tronque: n.scrollWidth > n.clientWidth + 0.5, deborde: rn.left < rv.left - 0.5 || rn.right > rv.right + 0.5 };
  }));
  for (const [i, m] of mesures.entries()) {
    expect(m.tronque, `« ${m.texte} » coupé`).toBe(false);
    expect(m.h, `« ${m.texte} » sur deux lignes au plus`).toBeLessThanOrEqual(2 * m.lh + 1);
    expect(m.deborde, `« ${m.texte} » dans sa vignette`).toBe(false);
    const p = mesures[i - 1];
    if (p && Math.abs(m.y - p.y) < 2) expect(m.x - (p.x + p.w), `écart ${p.texte} / ${m.texte}`).toBeGreaterThanOrEqual(7.5);
  }
});

// Poignée de la feuille (Timothée, 21/11/2026) : 40 % à l'ouverture, 85 % en la touchant ou en la tirant ; la feuille garde ses gestes.
const vh = (page: Page) => page.viewportSize()!.height;
const hauteurMarge = async (page: Page) => (await marge(page).boundingBox())!.height;

async function ouvrirFeuille(page: Page, slug = "abba-pere") {
  await ouvrir(page, slug);
  test.skip((await marge(page).getAttribute("data-place")) !== "feuille", "feuille seulement (colonne dès 1 024 px)");
}

test.describe("marge Affichage — poignée de la feuille", () => {
  test("feuille : un clic sur la poignée porte la fenêtre à 85 %, un second la ramène à 40 %", async ({ page }) => {
    await ouvrirFeuille(page);
    const poignee = page.getByTestId("marge-poignee");
    await expect(poignee).toHaveAttribute("aria-expanded", "false");
    await poignee.click();
    await expect.poll(() => hauteurMarge(page)).toBeCloseTo(0.85 * vh(page), -1);
    await expect(poignee).toHaveAttribute("aria-expanded", "true");
    await poignee.click();
    await expect.poll(() => hauteurMarge(page)).toBeCloseTo(0.4 * vh(page), -1);
  });

  test("feuille : tirer la zone de prise vers le haut agrandit, vers le bas jusqu'en bas ferme", async ({ page }) => {
    await ouvrirFeuille(page);
    const tirer = async (de: number, a: number) => {
      const b = (await page.getByTestId("marge-prise").boundingBox())!;
      const x = b.x + b.width / 3;
      await page.mouse.move(x, de);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) { await page.mouse.move(x, de + ((a - de) * i) / 20); await page.waitForTimeout(40); }
      await page.waitForTimeout(200); // doigt immobile : la décision se prend sur la position
      await page.mouse.up();
    };
    const haut = (await page.getByTestId("marge-prise").boundingBox())!.y + 4;
    await tirer(haut, haut - 300);
    await expect.poll(() => hauteurMarge(page)).toBeCloseTo(0.85 * vh(page), -1);
    // Déjà haute, tirée encore un peu : elle garde 85 % (elle perdait sa hauteur et débordait par le haut de l'écran).
    const haut85 = (await page.getByTestId("marge-prise").boundingBox())!.y + 4;
    await tirer(haut85, haut85 - 40);
    await page.waitForTimeout(400);
    expect(await hauteurMarge(page)).toBeCloseTo(0.85 * vh(page), -1);
    expect((await marge(page).boundingBox())!.y).toBeGreaterThan(0);
    // Revenue à 40 % par la poignée, puis tirée jusqu'en bas.
    await page.getByTestId("marge-poignee").click();
    await expect.poll(() => hauteurMarge(page)).toBeCloseTo(0.4 * vh(page), -1);
    const haut40 = (await page.getByTestId("marge-prise").boundingBox())!.y + 4;
    await tirer(haut40, vh(page) - 2);
    await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
  });

  test("feuille, page d'un chant long : la molette au bout du corps ne fait pas défiler la page", async ({ page }) => {
    await ouvrirFeuille(page, "一生爱你");
    const corps = page.getByTestId("marge-corps");
    await corps.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const b = (await corps.boundingBox())!;
    const avant = await page.evaluate(() => window.scrollY);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(avant);
  });
});

const SETLIST_MARGE = {
  title: "Culte du 4 octobre", leader: "Présidence T.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
  ownerId: "uid-banc", isPrivate: false,
  items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
};

test("feuille, setlist en vue Liste : un glissement au doigt parti de la fenêtre n'emmène pas la vue", async ({ page }, info) => {
  test.skip(["ordinateur", "tablette-paysage", "ordinateur-1440"].includes(info.project.name), "glissement Liste ↔ Partitions : téléphone et tablette portrait (deux volets ailleurs)");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MUSICIEN, { "setlists/setlist-marge": SETLIST_MARGE }, "/setlists/setlist-marge");
  await expect(page.locator("[data-vue=liste]")).toBeVisible();
  await ouvrirMarge(page);
  await expect(marge(page)).toHaveAttribute("data-place", "feuille");
  const b = (await page.locator("#marge-affichage").boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const toucher = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const y = b.y + b.height * 0.6;
  const x0 = b.x + b.width * 0.8;
  await toucher("touchStart", x0, y);
  for (let i = 1; i <= 8; i++) await toucher("touchMove", x0 - 25 * i, y);
  await toucher("touchEnd");
  await page.waitForTimeout(500);
  const decalage = await page.locator("[data-vue]").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    return t === "none" ? 0 : Math.round(new DOMMatrixReadOnly(t).m41);
  });
  expect(decalage).toBe(0);
  await expect(page.locator("[data-vue=liste]")).toBeVisible();
});

test("page chant : l'étiquette d'une section passe sous la barre d'outils (z-index inférieur)", async ({ page }) => {
  // shortcut: style calculé plutôt que elementFromPoint (monter le défilement sous la barre dépend de la mise en page), à reprendre si un helper de défilement apparaît.
  // Le nom n'est un bouton qu'avec l'accès Harmonie ouvert (profil de harmonie-volet-section.spec.ts).
  const HARMONIE: FakeProfile = { uid: "uid-banc-harmonie", email: "banc-harmonie@example.com", firstName: "Noémie", lastName: "Vasseur", planningName: "Noémie V.", serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano", "guitare") };
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await signInAs(page, HARMONIE, {}, `/songs/${encodeURIComponent("一切歌颂赞美")}`);
  const nom = page.locator("main.song-zoom [data-section-nom-bouton]").first();
  await expect(nom).toBeVisible();
  const z = async (l: Locator) => Number.parseInt(await l.evaluate((el) => getComputedStyle(el).zIndex), 10);
  expect(await z(nom)).toBeLessThan(await z(page.getByTestId("barre-outils")));
});
