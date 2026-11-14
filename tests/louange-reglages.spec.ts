import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirMenu, ouvrirMetronome, type Langue } from "./helpers/louange";

// Lot RU, RU-5 (docs/spec-reglages-unifies.md) : au mode louange, un seul bouton « Affichage » (la marge : Je joue, Ce que je lis,
// La page), l'armure dans la barre. Comptes simulés, noms fictifs ; quatre dispositions plus 1 440 px (projets de SPECS_GRAND_ECRAN).

const SETLIST_ID = "setlist-reglages-louange";
const CLARA: FakeProfile = {
  uid: "uid-clara",
  email: "clara-vasseur@example.com",
  firstName: "Clara",
  lastName: "Vasseur",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai des réglages", leader: "Présidence", category: "Culte Francophone", date: "2026-11-09",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});
const FR = ["avec-nous", "abba-pere"];
const ZH = ["谢谢你", "活着为要敬拜你"];

const marge = (page: Page) => page.locator('[data-testid="marge-affichage"][data-mode="louange"]');
const armure = (page: Page) => page.locator("[data-barre-haut]").getByTestId("armure");

async function ouvrirMode(page: Page, opts: { langue?: Langue; init?: Record<string, string>; slugs?: string[] } = {}) {
  const { langue = "fr", init = {}, slugs = langue === "zh" ? ZH : FR } = opts;
  await page.addInitScript(([zh, extra]) => {
    try {
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", "light");
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        for (const [k, v] of Object.entries(extra as Record<string, string>)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, [langue === "zh", init] as const);
  await signInAs(page, CLARA, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

test("deux touchers, barre montrée : armure puis une tonalité ; armure puis Chiffres", async ({ page }) => {
  await ouvrirMode(page, { init: { "perf-role-preset": "pianiste" } });
  await expect(armure(page)).toBeVisible();
  const avant = (await armure(page).textContent())!;
  await armure(page).click();
  await page.getByTestId("fenetre-armure").locator('[role="radio"][aria-checked="false"]').nth(3).click();
  await expect(armure(page)).not.toHaveText(avant);
  await expect(armure(page)).toHaveAttribute("data-armure", "moi");
  await page.keyboard.press("Escape");
  await armure(page).click();
  await page.getByTestId("fenetre-armure").locator('[data-notation="chiffres"]').click();
  await expect(page.getByTestId("fenetre-armure").locator('[data-notation="chiffres"]')).toHaveAttribute("aria-pressed", "true");
});

test("marge ouverte : la musique ne passe pas dessous (colonne à droite ou feuille en bas)", async ({ page }) => {
  await ouvrirMode(page, { init: { "perf-role-preset": "pianiste" } });
  await ouvrirMenu(page, "affichage");
  await expect(marge(page)).toHaveAttribute("data-ouvert", "true");
  await page.waitForTimeout(500); // nouvelle pagination à la zone réduite
  const m = (await marge(page).boundingBox())!;
  const colonne = (await marge(page).getAttribute("data-place")) === "colonne";
  const boites = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })));
  expect(boites.length).toBeGreaterThan(0);
  for (const b of boites) {
    if (colonne) expect(b.x + b.w, "la musique s'arrête à gauche de la colonne").toBeLessThanOrEqual(m.x + 1);
    else expect(b.y + b.h, "la musique s'arrête au-dessus de la feuille").toBeLessThanOrEqual(m.y + 1);
  }
});

test("marge et panneau Métronome ne s'ouvrent jamais ensemble", async ({ page }) => {
  await ouvrirMode(page, { init: { "perf-role-preset": "pianiste" } });
  await ouvrirMenu(page, "affichage");
  await expect(marge(page)).toHaveAttribute("data-ouvert", "true");
  await ouvrirMetronome(page);
  await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
  await expect(page.getByTestId("panneau-metronome")).toBeVisible();
  await ouvrirMenu(page, "affichage");
  await expect(marge(page)).toHaveAttribute("data-ouvert", "true");
  await expect(page.getByTestId("panneau-metronome")).toBeHidden();
});

test("choriste : ni Accords, ni Lettres | Chiffres, ni Couleur des accords dans la marge ; armure en lecture seule", async ({ page }) => {
  await ouvrirMode(page, { init: { "perf-role-preset": "choriste" } });
  await expect(armure(page)).toHaveAttribute("data-armure", "lecture");
  await ouvrirMenu(page, "affichage");
  await expect(marge(page).getByRole("switch", { name: "Accords" })).toHaveCount(0);
  await expect(marge(page).locator("[data-notation]")).toHaveCount(0);
  await expect(marge(page).getByText("Couleur des accords")).toHaveCount(0);
  await expect(marge(page).getByRole("switch", { name: "Paroles" })).toBeVisible();
});

for (const langue of ["fr", "zh"] as const) {
  test(`barre sur une ligne (${langue}) : le titre se tronque avant l'armure, l'armure n'est jamais coupée`, async ({ page }) => {
    await ouvrirMode(page, { langue, init: { "perf-role-preset": "pianiste" } });
    await expect(armure(page)).toBeVisible();
    const lignes = await page.locator("[data-barre-haut] button").evaluateAll((bs) => bs.filter((b) => b.getClientRects().length).map((b) => { const r = b.getBoundingClientRect(); return r.y + r.height / 2; }));
    expect(Math.max(...lignes) - Math.min(...lignes), "tous les boutons sur une ligne").toBeLessThanOrEqual(6);
    const a = (await armure(page).boundingBox())!;
    const ecran = page.viewportSize()!;
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x + a.width).toBeLessThanOrEqual(ecran.width);
    // Le texte (pas scrollWidth : la zone de toucher de 44 px, un pseudo-élément, déborde exprès) tient dans le bouton.
    expect(await armure(page).evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const t = r.getBoundingClientRect(), b = el.getBoundingClientRect();
      return t.left >= b.left - 1 && t.right <= b.right + 1;
    }), "texte de l'armure entier").toBe(true);
    const droite = (await page.locator('[data-barre-haut] [data-menu-declencheur="outils"]').boundingBox())!;
    expect(a.x + a.width, "l'armure ne recouvre pas les boutons de droite").toBeLessThanOrEqual(droite.x + 1);
  });
}
