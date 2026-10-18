import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";

// Barre de la page d'un chant, piste A « Une barre, tout dedans » (docs/spec-barre-chant.md).
// Un chant FR avec vidéo (Abba Père) et un chant ZH sur son scan 简谱 (一生爱你), sur les cinq
// projets : la rangée tient sur une ligne, chaque action est joignable là où la spec la met,
// +1 demi-ton change la tonalité.

// Admin : Idées d'harmonie s'ouvre sur ce seul statut (lot 9).
const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };

const CHANTS = [
  { slug: "abba-pere", titre: /Abba Père/i, tonalite: "A", plusUn: /^(A#|Bb)/, video: true, zh: false },
  { slug: "一生爱你", titre: "一生爱你", tonalite: "E", plusUn: /^F/, video: false, zh: true },
] as const;

const barre = (page: Page) => page.getByTestId("barre-outils");
const rangee = (page: Page) => page.locator(".rangee-chant");
/** Dès la tablette debout (768 × 500 px de fenêtre), les actions sortent du menu ⋯ (Q2, Q3). */
const actionsDansLaBarre = (page: Page) => {
  const { width, height } = page.viewportSize()!;
  return width >= 768 && height >= 500;
};

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrir(page: Page, slug: string) {
  await signInAs(page, ADMIN, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom").getByRole("heading", { level: 1 })).toBeVisible();
  // Le bouton Idées arrive avec le profil : la rangée est complète quand il est là.
  const idees = actionsDansLaBarre(page)
    ? barre(page).getByRole("button", { name: "Idées d'harmonie" })
    : barre(page).getByRole("button", { name: "Plus d'actions" });
  await expect(idees).toBeVisible();
}

async function uneSeuleLigne(page: Page) {
  const r = rangee(page);
  // Une ligne : la hauteur d'un bouton (36 px) et ses marges (2 × 8 px), pas deux.
  await expect.poll(async () => (await r.boundingBox())!.height).toBeLessThanOrEqual(56);
  expect(await r.evaluate((el) => el.scrollWidth - el.clientWidth), "rien ne déborde de la rangée").toBeLessThanOrEqual(1);
  // … ni dans sa marge intérieure, que `scrollWidth` ne compte pas.
  const depasse = await r.evaluate((el) => {
    const fin = el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
    return Math.max(...[...el.children].map((c) => c.getBoundingClientRect().right - fin));
  });
  expect(depasse, "rien ne mord sur la marge de droite").toBeLessThanOrEqual(0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

for (const chant of CHANTS) {
  test.describe(`barre du chant — ${chant.zh ? "ZH" : "FR"} ${chant.slug}`, () => {
    test("la rangée tient sur une ligne, chaque action est joignable", async ({ page }) => {
      await ouvrir(page, chant.slug);
      if (chant.zh) await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
      await uneSeuleLigne(page);
      const b = barre(page);
      await expect(b.getByRole("button", { name: "Accords", exact: true })).toBeVisible();
      await expect(b.getByRole("button", { name: "Pinyin" })).toHaveCount(chant.zh ? 1 : 0);

      if (actionsDansLaBarre(page)) {
        // Q2 : lire à gauche, faire à droite — Vidéo, PDF, Idées, puis ⋯ au bout.
        const noms = [...(chant.video ? ["Vidéo"] : []), "PDF", "Idées d'harmonie", "Plus d'actions"];
        const boites = await Promise.all(noms.map((n) => b.getByRole("button", { name: n, exact: true }).boundingBox()));
        const accords = (await b.getByRole("button", { name: "Accords", exact: true }).boundingBox())!;
        let x = accords.x;
        for (const [i, boite] of boites.entries()) {
          expect(boite, `${noms[i]} visible`).not.toBeNull();
          expect(boite!.x, `${noms[i]} après le précédent`).toBeGreaterThan(x);
          x = boite!.x;
        }
        // Q1 : la rangée a les bords de la partition.
        const main = (await page.locator("main.song-zoom").boundingBox())!;
        const premier = (await rangee(page).locator(":scope > :visible").first().boundingBox())!;
        const dernier = boites.at(-1)!;
        expect(Math.abs(premier.x - (main.x + 16)), "bord gauche de la partition").toBeLessThanOrEqual(2);
        expect(Math.abs(dernier.x + dernier.width - (main.x + main.width - 16)), "bord droit de la partition").toBeLessThanOrEqual(2);
        await capture(page, `barre-chant-${chant.zh ? "zh" : "fr"}`);
        // Q3 : le menu ⋯ ne garde que l'écoute, les couleurs, Personnaliser et Signaler.
        await b.getByRole("button", { name: "Plus d'actions" }).click();
        await expect(page.getByRole("menuitem", { name: "Personnaliser" })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Signalement" })).toBeVisible();
        await expect(page.getByRole("menuitemcheckbox")).toHaveCount(1);
        for (const n of ["Vidéo", "PDF", "Idées d'harmonie"]) await expect(page.getByRole("menuitem", { name: n })).toHaveCount(0);
        await page.keyboard.press("Escape");
        // Q6 : le bouton PDF ouvre la fenêtre « Quel PDF ? ».
        await b.getByRole("button", { name: "PDF", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        // Téléphone : PDF et Idées dans le menu ⋯ (T1 ne touche pas au téléphone).
        await capture(page, `barre-chant-${chant.zh ? "zh" : "fr"}`);
        await b.getByRole("button", { name: "Plus d'actions" }).click();
        await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Idées d'harmonie" })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Vidéo" })).toHaveCount(chant.video ? 1 : 0);
        await page.keyboard.press("Escape");
      }
    });

    test("+1 demi-ton change la tonalité", async ({ page }) => {
      await ouvrir(page, chant.slug);
      const courante = page.getByTestId("tonalite-courante");
      await expect(courante).toHaveText(new RegExp(`^${chant.tonalite}`));
      await barre(page).getByRole("button", { name: "+", exact: true }).click();
      await expect(courante).toHaveText(chant.plusUn);
      // Le ↺ apparu ne fait pas passer la rangée sur deux lignes.
      await uneSeuleLigne(page);
    });
  });
}

test("Vidéo : le bouton ouvre le lecteur sous la barre et se marque actif (Q7)", async ({ page }) => {
  test.skip(!actionsDansLaBarre(page), "tablettes et ordinateur ; le téléphone a T2");
  await ouvrir(page, "abba-pere");
  const video = barre(page).getByRole("button", { name: "Vidéo", exact: true });
  await expect(video).toHaveAttribute("aria-pressed", "false");
  await video.click();
  await expect(video).toHaveAttribute("aria-pressed", "true");
  const lecteur = page.locator(".video-chant iframe");
  await expect(lecteur).toBeVisible();
  const [bb, lb] = await Promise.all([barre(page).boundingBox(), lecteur.boundingBox()]);
  expect(lb!.y, "le lecteur est sous la barre").toBeGreaterThanOrEqual(bb!.y + bb!.height - 1);
  await uneSeuleLigne(page);
  await capture(page, "barre-chant-video");
  await video.click();
  await expect(video).toHaveAttribute("aria-pressed", "false");
  await expect(lecteur).toHaveCount(0);
});
