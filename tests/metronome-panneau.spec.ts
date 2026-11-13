import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirMenu, ouvrirMetronome } from "./helpers/louange";

// Métronome MT-2 (docs/spec-metronome.md) : le panneau Métronome, sans son ni entraînement. Setlist et compte simulés.
// Chants : avec-nous (FR, {tempo} 94, 4/4), abba-pere (FR), 为我而来 (ZH, scan 简谱, 6/8).

const SETLIST_ID = "setlist-metronome-panneau";
const MUSICIEN: FakeProfile = { uid: "uid-lecteur", email: "lecteur@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai", leader: "Présidence", category: "Culte Francophone", date: "2026-09-14", language: "mixed",
  notes: "", ownerId: "uid-owner", isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});

async function ouvrir(page: Page, slugs: string[], opts: { clock?: boolean; zh?: boolean; init?: Record<string, string> } = {}) {
  if (opts.clock) await page.clock.install();
  await page.addInitScript(({ zh, init }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-metronome", "1");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    // Réglages de départ : posés une fois (un rechargement ne les remet pas).
    if (!sessionStorage.getItem("init-metro")) {
      for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
      sessionStorage.setItem("init-metro", "1");
    }
  }, { zh: !!opts.zh, init: opts.init ?? {} });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

async function rouvrir(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

const bande = (page: Page) => page.locator("[data-bande-temps]");
const pastillesBande = (page: Page) => bande(page).locator("[data-temps]");
const actif = (page: Page) => bande(page).locator("[data-actif]");
const panneau = (page: Page) => page.getByTestId("panneau-metronome");
const largeur = (page: Page) => page.viewportSize()!.width;

/** Ouvre le panneau en touchant la bande (le geste le plus court, sur les trois appareils). */
async function ouvrirParLaBande(page: Page) {
  await bande(page).locator("[data-bande-ouvrir]").click();
  await expect(panneau(page)).toBeVisible();
  return panneau(page);
}
const tempoBande = async (page: Page) => Number(/♩\s*(\d+)/.exec((await bande(page).locator("[data-bande-ouvrir]").getAttribute("aria-label")) ?? "")?.[1]);
const attendreTempo = (page: Page, n: number) => expect(bande(page).locator("[data-bande-ouvrir]")).toHaveAttribute("aria-label", new RegExp(`♩ ${n},`));

test("s'ouvre par la bande, par ♩ de la barre (grand écran) ou par Outils (téléphone) ; × et Échap le ferment", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  await expect(p.getByRole("heading", { name: "Métronome" })).toBeVisible();
  await p.getByRole("button", { name: "Fermer le métronome" }).click();
  await expect(p).toBeHidden();
  // Barre (♩) ou Outils : le panneau remplace l'ancienne feuille Tempo.
  await ouvrirMetronome(page);
  await expect(p).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(p).toBeHidden();
  await expect(page.locator("[data-performance-mode]")).toBeVisible();
});

test("− / + (un clic = 1, appui long = 5), réglette, pavé numérique : la bande suit", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  await attendreTempo(page, 94);
  await p.locator("[data-tempo-plus]").click();
  await attendreTempo(page, 95);
  await p.locator("[data-tempo-moins]").click();
  await p.locator("[data-tempo-moins]").click();
  await attendreTempo(page, 93);
  await expect(p.locator("[data-tempo-valeur]")).toHaveText("93");
  // Appui long : par 5, jamais de pas isolé de 1 en plus.
  await p.locator("[data-tempo-plus]").hover();
  await page.mouse.down();
  await page.waitForTimeout(1_100);
  await page.mouse.up();
  const apres = await tempoBande(page);
  expect(apres - 93).toBeGreaterThanOrEqual(5);
  expect((apres - 93) % 5).toBe(0);
  // Réglette.
  await p.getByRole("slider", { name: "Tempo" }).fill("120");
  await attendreTempo(page, 120);
  // Pavé : toucher le chiffre, saisir, Entrée ; hors bornes ramené aux bornes.
  await p.locator("[data-tempo-valeur]").click();
  const champ = p.locator("[data-panneau-tempo-saisie]");
  await expect(champ).toBeFocused();
  await expect(champ).toHaveAttribute("inputmode", "numeric");
  await champ.fill("150");
  await champ.press("Enter");
  await attendreTempo(page, 150);
  await p.locator("[data-tempo-valeur]").click();
  await p.locator("[data-panneau-tempo-saisie]").fill("999");
  await p.locator("[data-panneau-tempo-saisie]").press("Enter");
  await attendreTempo(page, 240);
  await p.locator("[data-tempo-valeur]").click();
  await p.locator("[data-panneau-tempo-saisie]").fill("10");
  await p.locator("[data-panneau-tempo-saisie]").blur();
  await attendreTempo(page, 30);
  await expect(p.getByRole("button", { name: "Ralentir de 1" })).toBeDisabled();
});

test("Taper : cinq appuis à 500 ms donnent 120 ; remise à zéro après 2 s", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { clock: true });
  const p = await ouvrirParLaBande(page);
  await page.clock.pauseAt(new Date(Date.now() + 5_000)); // le temps ne passe plus que par runFor : les appuis sont à 500 ms exactement
  const taper = p.locator("[data-panneau-taper]");
  await taper.click();
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(500);
    await taper.click();
  }
  await attendreTempo(page, 120);
  // Plus de 2 s depuis le dernier appui : un seul appui de la nouvelle série ne change rien.
  await page.clock.runFor(2_500);
  await taper.click();
  await page.clock.runFor(10);
  await attendreTempo(page, 120);
  await page.clock.runFor(1_000);
  await taper.click(); // deuxième appui de la série, 1,01 s après le premier : 60 000 / 1 010 ≈ 59
  await expect.poll(() => tempoBande(page)).toBeLessThan(61);
});

test("mesure : 3/4 donne 3 pastilles ; Autre 5/8 en donne 5 ; les accents reviennent aux défauts", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-metro-accents-avec-nous": "fmaa" } });
  const p = await ouvrirParLaBande(page);
  await expect(pastillesBande(page)).toHaveCount(4);
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "moyen");
  await p.getByRole("radio", { name: "3/4", exact: true }).click();
  await expect(pastillesBande(page)).toHaveCount(3);
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "faible"); // changer la mesure remet les défauts
  await p.getByRole("radio", { name: "Autre", exact: true }).click();
  await expect(p.locator("[data-panneau-autre]")).toBeVisible();
  await p.getByRole("button", { name: "Un temps de plus" }).click();
  await p.getByRole("button", { name: "Un temps de plus" }).click(); // 5 temps
  await p.getByRole("radio", { name: "Croche", exact: true }).click();
  await expect(pastillesBande(page)).toHaveCount(5);
  await expect(bande(page).locator("[data-bande-ouvrir]")).toHaveAttribute("aria-label", /5\/8/);
  expect(await page.evaluate(() => localStorage.getItem("perf-metro-mesure-avec-nous"))).toBe("5/8");
  await rouvrir(page);
  await expect(pastillesBande(page)).toHaveCount(5);
});

test("temps : fort → moyen → faible → muet ; aria-pressed et nom « Temps 1, fort » ; la bande suit ; tout survit au rechargement", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  const t1 = p.getByRole("button", { name: "Temps 1, fort" });
  await expect(t1).toHaveAttribute("aria-pressed", "true");
  await expect(p.getByText("Touchez un temps pour changer : fort, moyen, faible, muet")).toBeVisible();
  const t2 = p.locator('[data-panneau-temps] [data-temps="2"]');
  await expect(t2).toHaveAttribute("aria-label", "Temps 2, faible");
  await t2.click();
  await expect(t2).toHaveAttribute("aria-label", "Temps 2, muet");
  await expect(t2).toHaveAttribute("aria-pressed", "false");
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "muet");
  await expect(bande(page).locator('[data-temps="2"]')).toHaveCSS("border-top-style", "dashed");
  await t2.click();
  await expect(t2).toHaveAttribute("aria-label", "Temps 2, fort");
  await t2.click();
  await expect(t2).toHaveAttribute("aria-label", "Temps 2, moyen");
  await t2.click();
  await t2.click();
  await expect(t2).toHaveAttribute("aria-label", "Temps 2, muet");
  // Tout survit : tempo, mesure (autre chant testé plus bas), accents, subdivision, décompte.
  await p.locator("[data-tempo-plus]").click();
  await p.getByRole("radio", { name: "Croches", exact: true }).click();
  await p.getByRole("radio", { name: "2 mesures", exact: true }).click();
  await rouvrir(page);
  await attendreTempo(page, 95);
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "muet");
  const p2 = await ouvrirParLaBande(page);
  await expect(p2.getByRole("radio", { name: "Croches", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(p2.getByRole("radio", { name: "2 mesures", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(p2.locator('[data-panneau-temps] [data-temps="2"]')).toHaveAttribute("aria-pressed", "false");
});

test("temps muet en cours : la trame se voit (contour plein, ::before) ; au repos, contour en tirets", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // trame fixe, sans fondu : lisible sans course avec l'animation
  await ouvrir(page, ["avec-nous"], { clock: true, init: { "perf-tempo-avec-nous": "120", "perf-metro-accents-avec-nous": "fsaa" } });
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "muet");
  await expect(bande(page).locator('[data-temps="2"]')).toHaveCSS("border-top-style", "dashed");
  await ouvrirParLaBande(page);
  await panneau(page).locator("[data-panneau-marche]").click();
  await expect(actif(page)).toHaveCount(1);
  // React rend le temps suivant après l'image (horloge simulée) : on attend l'attribut au lieu de le lire aussitôt.
  for (let i = 0; i < 4; i++) {
    const courant = Number(await actif(page).getAttribute("data-temps"));
    if (courant === 2) break;
    await page.clock.runFor(500);
    await expect(actif(page)).toHaveAttribute("data-temps", String((courant % 4) + 1));
  }
  const muet = actif(page);
  await expect(muet).toHaveAttribute("data-temps", "2");
  await expect(muet).toHaveCSS("border-top-style", "solid");
  const trame = await muet.evaluate((el) => {
    const c = getComputedStyle(el, "::before");
    return { contenu: c.content, opacite: c.opacity, fond: c.backgroundImage };
  });
  expect(trame.contenu).not.toBe("none");
  expect(Number(trame.opacite)).toBe(1);
  expect(trame.fond).toContain("repeating-linear-gradient");
});

test("un autre chant garde les siens ; dans la setlist le chant suivant arrive avec son tempo, sa mesure et ses accents", async ({ page }) => {
  await ouvrir(page, ["avec-nous", "abba-pere"], {
    init: { "perf-tempo-abba-pere": "100", "perf-metro-mesure-abba-pere": "6/8", "perf-metro-accents-abba-pere": "fsaaaa", "perf-metro-accents-avec-nous": "fm" /* invalide : 2 lettres pour 4 temps */ },
  });
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "faible"); // accents invalides : défauts
  const p = await ouvrirParLaBande(page);
  await p.locator("[data-tempo-plus]").click();
  await p.getByRole("radio", { name: "3/4", exact: true }).click();
  await attendreTempo(page, 95);
  await expect(pastillesBande(page)).toHaveCount(3);
  await p.getByRole("button", { name: "Fermer le métronome" }).click();
  const suivant = onStage(page, "[data-suivant]");
  for (let i = 0; i < 20 && (await suivant.count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(suivant).toHaveCount(1);
  await suivant.dispatchEvent("click");
  await attendreTempo(page, 100);
  await expect(pastillesBande(page)).toHaveCount(6);
  await expect(bande(page).locator('[data-temps="2"]')).toHaveAttribute("data-accent", "muet");
  // Le premier chant n'a pas bougé dans le stockage de l'autre.
  expect(await page.evaluate(() => [localStorage.getItem("perf-tempo-avec-nous"), localStorage.getItem("perf-metro-mesure-abba-pere")])).toEqual(["95", "6/8"]);
});

test("6/8 (为我而来) : ♩. / min, deux groupes de trois, triolets d'office ; « Revenir au tempo du chant » n'efface que le tempo", async ({ page }) => {
  await ouvrir(page, ["为我而来"]);
  const p = await ouvrirParLaBande(page);
  await expect(p.locator("[data-panneau-unite] svg circle")).toHaveCount(1); // la noire pointée porte son point
  await expect(p.locator("[data-panneau-temps] > div")).toHaveCount(2);
  await expect(p.getByRole("radio", { name: "Triolets", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(p.getByRole("radio", { name: "Ternaire", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(p.locator("[data-tempo-fichier]")).toHaveCount(0);
  await p.locator("[data-tempo-plus]").click();
  await p.locator('[data-panneau-temps] [data-temps="3"]').click();
  await expect(p.locator("[data-tempo-fichier]")).toHaveCount(1);
  await p.locator("[data-tempo-fichier]").click();
  await expect(p.locator("[data-tempo-fichier]")).toHaveCount(0);
  // Seul le tempo est effacé : la mesure et les accents du chant restent retenus.
  expect(await page.evaluate(() => [localStorage.getItem("perf-tempo-为我而来"), localStorage.getItem("perf-metro-accents-为我而来")])).toEqual([null, expect.any(String)]);
  await p.getByRole("radio", { name: "Binaire", exact: true }).click();
  await expect(p.getByRole("radio", { name: "Croches", exact: true })).toBeVisible();
  await p.getByRole("radio", { name: "Doubles croches", exact: true }).click();
  await expect(p.locator("[data-subdivision] svg")).toHaveCount(4);
});

test("état annoncé (role=status) ; Marche / Arrêt et interrupteur « Métronome visuel »", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  await expect(p.getByRole("status")).toHaveText("Métronome à l'arrêt, 94, 4/4");
  await p.locator("[data-panneau-marche]").click();
  await expect(p.getByRole("status")).toHaveText("Métronome en marche, 94, 4/4");
  await expect(p.locator("[data-panneau-marche]")).toHaveAttribute("aria-pressed", "true");
  await expect(actif(page)).toHaveCount(1);
  const visuel = p.getByRole("button", { name: "Métronome visuel" });
  await expect(visuel).toHaveAttribute("aria-pressed", "true");
  await visuel.click();
  await expect(visuel).toHaveAttribute("aria-pressed", "false");
  await expect(bande(page)).toHaveCount(0);
  await visuel.click();
  await expect(bande(page)).toHaveCount(1);
});

test("toutes les cibles du panneau font 44 px au moins (Autre ouvert, 6/8, zh)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ouvrir(page, ["为我而来"], { zh: true });
  const p = await ouvrirParLaBande(page);
  await p.getByRole("radio", { name: "其他", exact: true }).click();
  await p.locator("[data-panneau-poignee]").click(); // grand cran : le plus de contenu à l'écran
  const petites = await p.locator("button:visible, input:visible, [role=radio]:visible").evaluateAll((els) =>
    els.map((e) => ({ nom: e.getAttribute("aria-label") ?? e.textContent?.trim() ?? e.tagName, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
      .map(({ nom, r }) => `${nom} ${Math.round(r.width)}×${Math.round(r.height)}`));
  expect(petites).toEqual([]);
});

test("zh à 390 px : aucun libellé coupé", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ouvrir(page, ["为我而来"], { zh: true });
  const p = await ouvrirParLaBande(page);
  await expect(p.getByRole("heading", { name: "节拍器" })).toBeVisible();
  await expect(p.getByRole("button", { name: "第 1 拍，重" })).toBeVisible();
  await p.locator("[data-panneau-poignee]").click();
  const coupes = await p.locator("h2, h3, button, [role=radio], p:not(.sr-only)").evaluateAll((els) =>
    els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.getAttribute("aria-label") ?? e.textContent?.trim()} ${e.scrollWidth}>${e.clientWidth}`));
  expect(coupes).toEqual([]);
  for (const nom of ["节拍器", "拍号", "拍", "细分", "二分", "三分", "预备拍", "打拍", "开始", "其他", "本设备为此歌保存"]) {
    await expect(p.getByText(nom, { exact: true }).first()).toBeAttached();
  }
});

test("le panneau et les autres menus ne sont jamais ouverts ensemble", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  const options = await ouvrirMenu(page, "options");
  await expect(options).toBeVisible();
  await expect(p).toBeHidden();
  await ouvrirMetronome(page);
  await expect(p).toBeVisible();
  await expect(options).toBeHidden();
  const setlistMenu = await ouvrirMenu(page, "setlist");
  await expect(setlistMenu).toBeVisible();
  await expect(p).toBeHidden();
});

test("feuille (sous 1 024 px) : deux crans, poignée de 44 px ; tempo et Marche visibles sans défiler au cran moyen", async ({ page }) => {
  test.skip(largeur(page) >= 1024, "colonne dès 1 024 px");
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  const h = page.viewportSize()!.height;
  await expect(p).toHaveAttribute("data-cran", "moyen");
  const poignee = p.locator("[data-panneau-poignee]");
  await expect(poignee).toHaveAttribute("aria-expanded", "false");
  await expect(poignee).toHaveAttribute("aria-label", "Agrandir le panneau");
  expect((await poignee.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const moyen = (await p.boundingBox())!;
  expect(Math.abs(moyen.height - h * 0.6)).toBeLessThanOrEqual(2);
  expect(Math.abs(moyen.y + moyen.height - h)).toBeLessThanOrEqual(1); // posée en bas
  for (const sel of ["[data-tempo-valeur]", "[data-panneau-marche]", "[data-panneau-taper]"]) {
    const b = (await p.locator(sel).boundingBox())!;
    expect(b.y + b.height, sel).toBeLessThanOrEqual(moyen.y + moyen.height + 0.5);
  }
  expect(Math.round(moyen.width)).toBe(largeur(page)); // pleine largeur, tablette portrait comprise (comme le volet de JV-5b)
  await poignee.click();
  await expect(p).toHaveAttribute("data-cran", "grand");
  await expect(poignee).toHaveAttribute("aria-expanded", "true");
  await expect(poignee).toHaveAttribute("aria-label", "Réduire le panneau");
  const grand = (await p.boundingBox())!;
  // Le grand cran s'arrête sous la bande des temps : elle reste visible pendant qu'on règle les accents.
  const b = (await page.locator("[data-bande-temps]").boundingBox())!;
  expect(grand.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  expect(grand.y).toBeLessThanOrEqual(b.y + b.height + 2);
  await poignee.click();
  await expect(p).toHaveAttribute("data-cran", "moyen");
});

test("colonne (dès 1 024 px) : elle repousse la musique, rien de la musique sous le panneau ; une colonne de texte", async ({ page }) => {
  test.skip(largeur(page) < 1024, "feuille sous 1 024 px");
  for (const slug of ["avec-nous", "为我而来"]) {
    await ouvrir(page, [slug]);
    const p = await ouvrirParLaBande(page);
    const b = (await p.boundingBox())!;
    expect(Math.round(b.width)).toBe(320);
    expect(Math.round(b.x + b.width)).toBe(largeur(page));
    const bord = b.x + 0.5;
    const depasse = await page.evaluate((limite) => {
      const racine = document.querySelector("[data-performance-mode]")!;
      const fautifs: string[] = [];
      for (const el of racine.querySelectorAll("[data-section], [data-jianpu-page], [data-bande-temps], [data-entete-chant]")) {
        if (el.closest("[aria-hidden=true]") || el.closest("[data-panneau-metronome]")) continue;
        // Un scan 简谱 : la boîte qui rogne (le parent), car la feuille peut déborder de ce qu'on voit.
        const r = (el.hasAttribute("data-jianpu-page") ? el.parentElement! : el).getBoundingClientRect();
        if (r.width > 0 && r.right > limite) fautifs.push(`${el.tagName}.${el.getAttribute("data-section") ?? ""} ${Math.round(r.right)}`);
      }
      return fautifs;
    }, bord);
    expect(depasse).toEqual([]);
    if (largeur(page) - 320 < 960) await expect(page.locator("[data-performance-mode]")).not.toHaveAttribute("data-deux-colonnes", /.*/);
    await p.getByRole("button", { name: "Fermer le métronome" }).click();
    await expect(p).toBeHidden();
    expect(Math.round((await bande(page).boundingBox())!.width)).toBe(largeur(page));
    await page.goto("about:blank");
  }
});

test("bande : temps fort au repos à 2 px (comme le moyen), chiffres plus grands dès 1 024 px", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-metro-accents-avec-nous": "fmaa" } });
  const fort = bande(page).locator('[data-temps="1"]');
  const moyen = bande(page).locator('[data-temps="2"]');
  await expect(fort).toHaveCSS("border-top-width", "2px");
  await expect(moyen).toHaveCSS("border-top-width", "2px");
  expect((await fort.boundingBox())!.height).toBeCloseTo(28, 0);
  expect((await moyen.boundingBox())!.height).toBeCloseTo(24, 0);
  if (largeur(page) >= 1024) {
    await expect(fort).toHaveCSS("font-size", "17px");
    await expect(moyen).toHaveCSS("font-size", "15px");
    await expect(bande(page).locator('[data-temps="3"]')).toHaveCSS("font-size", "15px");
  }
});

test("contraste du contour des temps du panneau au repos >= 3:1, en clair et en sombre", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  const p = await ouvrirParLaBande(page);
  for (const sombre of [false, true]) {
    await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
    const [contour, fond] = await p.evaluate((el) => [
      getComputedStyle(el.querySelector('[data-panneau-temps] [data-temps="2"] > span')!).borderTopColor,
      getComputedStyle(el).backgroundColor,
    ]);
    const rgba = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const [fr, fg, fb] = rgba(fond);
    const [r, g, b, a = 1] = rgba(contour);
    const mix = [r, g, b].map((v, i) => v * a + [fr, fg, fb][i] * (1 - a));
    const lum = (c: number[]) => c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
    const l1 = lum(mix), l2 = lum([fr, fg, fb]);
    expect((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toBeGreaterThanOrEqual(3);
  }
});
