import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";
import { marge, ouvrirMarge } from "./helpers/marge";

// La page chant, tranche RU-3 (docs/spec-reglages-unifies.md) : barre sur une ligne (←, Harmonie, Vidéo, Crayon, Accords, Pinyin en ZH, Affichage, ⋯),
// armure jamais tronquée, marge « Affichage » montée (colonne qui pousse la musique dès 1 024 px, feuille dessous), réglages
// retenus au rechargement, plus de « 1=… » sous le titre, menu ⋯ réduit. Un chant FR et un chant ZH sur son scan 简谱.

const ADMIN: FakeProfile = { uid: "uid-admin-reglages", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };
const CHANTS = [
  { slug: "abba-pere", zh: false },
  { slug: "一生爱你", zh: true },
] as const;

const barre = (page: Page) => page.getByTestId("barre-outils");
const armure = (page: Page) => page.getByTestId("armure");
const musique = (page: Page) => page.locator("main.song-zoom");
const boutonAffichage = (page: Page) => barre(page).getByRole("button", { name: /^(Affichage|显示)$/ });

async function ouvrir(page: Page, slug: string, zh: boolean) {
  if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* ignore */ } });
  await signInAs(page, ADMIN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(musique(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(armure(page)).toBeVisible();
  // Le bouton Harmonie arrive avec le profil : la rangée est complète quand il est là.
  await expect(barre(page).getByRole("button", { name: /^(Harmonie|和声)$/ })).toBeAttached();
}

for (const chant of CHANTS) {
  test.describe(`page chant — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("412 px : la barre tient sur une ligne, aucun bouton ne déborde ; l'armure n'est jamais tronquée", async ({ page }) => {
      await page.setViewportSize({ width: 412, height: 800 });
      await ouvrir(page, chant.slug, chant.zh);
      const rangee = (await barre(page).locator(".rangee-chant").boundingBox())!;
      const boites = await barre(page).locator(".retour-chant, .actions-chant button").evaluateAll((els) =>
        els.filter((e) => e.getClientRects().length > 0).map((e) => { const r = e.getBoundingClientRect(); return { centre: r.top + r.height / 2, haut: r.top, bas: r.bottom, droite: r.right }; }));
      // Retour, Harmonie, (Vidéo), Crayon, Accords, (Pinyin), Affichage, ⋯ : au moins six boutons.
      expect(boites.length).toBeGreaterThanOrEqual(6);
      await expect(barre(page).getByRole("button", { name: chant.zh ? "和弦" : "Accords", exact: true })).toBeVisible();
      if (chant.zh) await expect(barre(page).getByRole("button", { name: "拼音", exact: true })).toBeVisible();
      for (const b of boites) {
        expect(Math.abs(b.centre - boites[0].centre), "même ligne").toBeLessThanOrEqual(2);
        expect(b.haut, "dans la barre").toBeGreaterThanOrEqual(rangee.y - 0.5);
        expect(b.bas, "dans la barre").toBeLessThanOrEqual(rangee.y + rangee.height + 0.5);
        expect(b.droite, "dans l'écran").toBeLessThanOrEqual(412 + 0.5);
      }
      await expect(barre(page).locator(".actions-tel")).toHaveCount(0);
      // Armure : texte entier (rien de coupé) et rectangle entièrement visible.
      // (scrollWidth ne convient pas : au toucher, le ::after de 44 px de TOUCHER_44 le dépasse) : le texte tient dans le bouton.
      const a = await armure(page).evaluate((el) => {
        const t = document.createRange(); t.selectNodeContents(el);
        const tr = t.getBoundingClientRect(); const r = el.getBoundingClientRect();
        return { dedans: tr.left >= r.left - 0.5 && tr.right <= r.right + 0.5, r: r.toJSON() };
      });
      expect(a.dedans, "texte de l'armure entier dans le bouton").toBe(true);
      expect(a.r.x).toBeGreaterThanOrEqual(0);
      expect(a.r.x + a.r.width).toBeLessThanOrEqual(412 + 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });

    test("Affichage ouvre la marge, rien de la musique n'est dessous ; Échap la ferme et rend le focus au bouton", async ({ page }) => {
      await ouvrir(page, chant.slug, chant.zh);
      await expect(boutonAffichage(page)).toHaveAttribute("aria-expanded", "false");
      await ouvrirMarge(page);
      await expect(boutonAffichage(page)).toHaveAttribute("aria-expanded", "true");
      await expect(boutonAffichage(page)).toHaveAttribute("aria-controls", "marge-affichage");
      const m = (await marge(page).boundingBox())!;
      if ((await marge(page).getAttribute("data-place")) === "colonne") {
        // Colonne (seulement si la musique garde 340 px) : la musique (le texte et le scan) finit avant elle, à 16 px au moins.
        const main = (await musique(page).boundingBox())!;
        expect(main.width).toBeGreaterThanOrEqual(340);
        expect(main.x + main.width).toBeLessThanOrEqual(m.x + 0.5);
        const ab = (await armure(page).boundingBox())!;
        expect(m.x - (ab.x + ab.width), "écart armure / colonne").toBeGreaterThanOrEqual(16);
        const scan = page.locator("[data-jianpu-page] img").first();
        if (chant.zh && (await scan.count()) > 0) {
          const s = (await scan.boundingBox())!;
          // Le scan déborde de 1 à 2 px de la colonne (sa marge blanche) mais `main` le rogne : on mesure la part visible.
          expect(Math.min(s.x + s.width, main.x + main.width)).toBeLessThanOrEqual(m.x + 0.5);
        }
      } else {
        // Feuille large : entièrement dans le volet du chant (ou la fenêtre), pas centrée sur la fenêtre au-dessus de la liste.
        if ((await marge(page).getAttribute("data-place")) === "feuille-large") {
          const volet = await page.evaluate(() => {
            const v = document.querySelector(".chants-chant")?.getBoundingClientRect();
            return v ? { x: v.left, d: v.right } : { x: 0, d: window.innerWidth };
          });
          expect(m.x).toBeGreaterThanOrEqual(volet.x - 1);
          expect(m.x + m.width).toBeLessThanOrEqual(volet.d + 1);
        }
        // Feuille : le bas de la musique remonte au-dessus d'elle.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(200);
        const fin = await musique(page).evaluate((el) => (el.lastElementChild ?? el).getBoundingClientRect().bottom);
        expect(fin).toBeLessThanOrEqual(m.y + 0.5);
      }
      await page.keyboard.press("Escape");
      await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
      await expect(boutonAffichage(page)).toBeFocused();
      await expect(boutonAffichage(page)).toHaveAttribute("aria-expanded", "false");
    });

    test("menu ⋯ : PDF, Personnaliser, Signalement, rien d'autre", async ({ page }) => {
      await ouvrir(page, chant.slug, chant.zh);
      await barre(page).getByRole("button", { name: /^(Plus d'actions|更多操作)$/ }).click();
      await expect(page.getByRole("menuitem")).toHaveCount(3);
      await expect(page.getByRole("menuitemradio")).toHaveCount(0);
      await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
      if (!chant.zh) await expect(page.getByRole("menuitem")).toHaveText([/PDF/, /Personnaliser/, /Signalement/]);
    });
  });
}

test("FR : accords éteints dans la marge, ordre « Une fois chacune » et disposition retenus au rechargement", async ({ page }) => {
  await ouvrir(page, "abba-pere", false);
  const accords = page.locator("main [data-accord-touchable]");
  await expect(accords.first()).toBeVisible();
  const avant = await page.locator("main [data-section]").count();
  await ouvrirMarge(page);
  await marge(page).getByRole("switch", { name: "Accords" }).click();
  await expect(accords).toHaveCount(0);
  await marge(page).getByRole("switch", { name: "Accords" }).click();
  await expect(accords.first()).toBeVisible();
  await marge(page).getByRole("radio", { name: "Une fois chacune" }).click();
  await expect.poll(() => page.locator("main [data-section]").count()).toBeLessThanOrEqual(avant);
  await marge(page).getByRole("radiogroup", { name: "Disposition" }).getByRole("radio").filter({ hasText: "Couleurs par section" }).click();
  await page.reload();
  await expect(musique(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "sections");
  await ouvrirMarge(page);
  await expect(marge(page).getByRole("radio", { name: "Une fois chacune" })).toHaveAttribute("aria-checked", "true");
  await expect(marge(page).getByRole("radiogroup", { name: "Disposition" }).getByRole("radio").filter({ hasText: "Couleurs par section" })).toHaveAttribute("aria-checked", "true");
});

test("ZH : pinyin éteint et 简谱 | Paroles retenus au rechargement ; la bascule de l'en-tête écrit le même réglage", async ({ page }) => {
  await ouvrir(page, "一生爱你", true);
  await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
  await ouvrirMarge(page);
  await marge(page).getByRole("radio", { name: "歌词" }).click();
  await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
  await expect(page.locator('[data-ligne="pinyin"]').first()).toBeVisible();
  await marge(page).getByRole("switch", { name: "拼音" }).click();
  await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
  await page.reload();
  await expect(musique(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
  await expect(page.locator('[data-ligne="pinyin"]')).toHaveCount(0);
  await ouvrirMarge(page);
  await expect(marge(page).getByRole("radio", { name: "歌词" })).toHaveAttribute("aria-checked", "true");
  await expect(marge(page).getByRole("switch", { name: "拼音" })).not.toBeChecked();
  // Un toucher dans l'en-tête (la bascule 简谱 · 歌词) remet le scan, et la marge le dit.
  await page.keyboard.press("Escape");
  await page.getByRole("radiogroup", { name: "简谱 · 歌词" }).getByRole("radio", { name: "简谱" }).click();
  await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
  await ouvrirMarge(page);
  await expect(marge(page).getByRole("radio", { name: "简谱" })).toHaveAttribute("aria-checked", "true");
});

test("ZH : plus de « 1=… » sous le titre hors de l'armure et du scan", async ({ page }) => {
  await ouvrir(page, "一生爱你", true);
  await expect(armure(page)).toHaveText(/^1=/);
  await expect(page.getByTestId("ligne-tempo")).not.toContainText("1=");
  const ailleurs = await musique(page).evaluate((main) =>
    [...main.querySelectorAll("*")].filter((el) => el.children.length === 0 && /1\s*=/.test(el.textContent ?? "") && !el.closest('[data-testid="armure"], [data-jianpu-page]')).length);
  expect(ailleurs).toBe(0);
});

test("une seule colonne à droite : Affichage ferme Harmonie, Harmonie ferme Affichage (ordinateur, grande fenêtre)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "la colonne Harmonie n'existe qu'en grande fenêtre de l'ordinateur");
  await page.setViewportSize({ width: 1800, height: 900 });
  await ouvrir(page, "abba-pere", false);
  const harmonie = barre(page).getByRole("button", { name: "Harmonie", exact: true });
  await harmonie.click();
  await expect(page.locator("[data-harmonie-colonne]")).toBeVisible();
  await ouvrirMarge(page);
  await expect(page.locator("[data-harmonie-colonne]")).toHaveCount(0);
  await harmonie.click();
  await expect(page.locator("[data-harmonie-colonne]")).toBeVisible();
  await expect(marge(page)).toHaveAttribute("data-ouvert", "false");
});
