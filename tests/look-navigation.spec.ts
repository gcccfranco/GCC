import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/fakeSession";

// Lot 4 « Nouveau look », tranche T2 : navigation par sections (docs/spec-look.md).
const MEMBRE = { uid: "u-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K." };
const ENCRE = "rgb(28, 28, 30)";

const phone = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const barreDuBas = (page: Page) => page.getByRole("navigation", { name: "Navigation principale" });
const header = (page: Page) => page.locator("header");

test.describe("navigation par sections (T2), téléphone", () => {
  test.use(phone);

  test("sans compte : barre du bas Chants · Évènements, Connexion dans la navbar, plus de menu burger", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["Chants", "Évènements"]);
    await expect(header(page).getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(page.getByRole("button", { name: /menu/i })).toHaveCount(0);
  });

  // Cinq onglets depuis le 16/09/2026 : « Louange » cachait les setlists, qui
  // n'étaient plus joignables sur tactile (audit avant/après du lot 4).
  test("connecté : barre du bas Chants · Setlists · Planning · Évènements · Moi, l'onglet courant en encre", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    const chants = barreDuBas(page).getByRole("link", { name: "Chants" });
    await expect(chants).toHaveAttribute("aria-current", "page");
    // Couleur lue une fois la transition finie : encre, pas rouge.
    await expect.poll(() => chants.evaluate((a) => getComputedStyle(a).color), { message: "onglet actif en encre, pas en rouge" }).toBe(ENCRE);
  });

  test("« Moi » regroupe mes services, le profil, le guide, le questionnaire, le signalement, les réglages et la déconnexion", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/moi");
    await expect(page.getByRole("heading", { level: 1, name: "Moi" })).toBeVisible();
    for (const nom of ["Mes services", "Mon profil", "Guide d'utilisation", "Ton avis sur le site"]) {
      await expect(page.getByRole("link", { name: nom })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Signaler un problème" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sombre" })).toBeVisible();
    await expect(page.getByRole("button", { name: "中文", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
    // En sombre, une ligne-bouton est aussi lisible qu'une ligne-lien.
    await page.emulateMedia({ colorScheme: "dark" });
    const couleur = (nom: string, role: "button" | "link") =>
      page.getByRole(role, { name: nom }).evaluate((el) => getComputedStyle(el).color);
    await expect.poll(() => couleur("Signaler un problème", "button")).toBe("rgb(242, 242, 247)");
    expect(await couleur("Guide d'utilisation", "link")).toBe("rgb(242, 242, 247)");
    await expect(barreDuBas(page).getByRole("link", { name: "Moi" })).toHaveAttribute("aria-current", "page");
  });

  test("la liste des chants porte un grand titre « Chants »", async ({ page }) => {
    await page.goto("/songs");
    await expect(page.getByRole("heading", { level: 1, name: "Chants" })).toBeVisible();
  });
});

test.describe("navigation par sections (T2), barre du bas sur téléphone et tablette", () => {
  // La barre du bas est masquée sur un poste desktop (`.hide-on-desktop`).
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "ordinateur", "téléphone et tablette seulement");
  });

  test("les setlists sont à un tap depuis n'importe quelle page", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MEMBRE, {}, "/planning");
    await barreDuBas(page).getByRole("link", { name: "Setlists" }).click();
    await expect(page).toHaveURL(/\/setlists\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Setlists" })).toBeVisible();
    await expect(barreDuBas(page).getByRole("link", { name: "Setlists" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("navigation par sections (T2), onglets de section", () => {
  // Cible tactile (16/09/2026) : les pilules faisaient 30 px de haut.
  test("une pilule de section fait au moins 40 px de haut, sur chaque appareil", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MEMBRE, {}, "/planning");
    const pilule = page.getByRole("link", { name: "Culte Franco" });
    await pilule.waitFor();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const box = await pilule.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe("navigation par sections (T2), 320 px", () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  for (const lang of ["fr", "zh-CN"]) {
    test(`toutes les commandes de la navbar restent dans l'écran (${lang})`, async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
      await page.goto("/songs");
      await page.getByRole("searchbox").waitFor();
      const boxes = await page.locator("header a, header button").evaluateAll((els) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null && getComputedStyle(el).visibility !== "hidden")
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { label: el.getAttribute("aria-label") ?? el.textContent?.trim(), left: r.left, right: r.right };
          })
      );
      expect(boxes.length).toBeGreaterThan(0);
      for (const b of boxes) {
        expect.soft(b.left, `${b.label} déborde à gauche`).toBeGreaterThanOrEqual(0);
        expect.soft(b.right, `${b.label} déborde à droite`).toBeLessThanOrEqual(320);
      }
    });
  }
});

test.describe("navigation par sections (T2), ordinateur", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  // La barre du bas est masquée par `.hide-on-desktop` (pointeur fin + grand
  // écran) : une tablette en paysage la garde, c'est voulu.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "ordinateur", "poste desktop seulement");
  });

  test("connecté : les sections dans la navbar, le reste dans un menu compte", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    for (const nom of ["Planning", "Évènements", "Mes services"]) {
      await expect(header(page).getByRole("link", { name: nom })).toBeVisible();
    }
    await expect(header(page).getByRole("button", { name: "Louange" })).toBeVisible();
    await expect(header(page).getByRole("button", { name: "Déconnexion" })).toHaveCount(0);
    await header(page).getByRole("button", { name: "Compte" }).click();
    const menu = page.getByRole("menu");
    for (const nom of ["Mon profil", "Guide d'utilisation", "Ton avis sur le site", "Signaler un problème", "Déconnexion"]) {
      await expect(menu.getByRole("menuitem", { name: nom })).toBeVisible();
    }
    await expect(menu.getByRole("menuitem", { name: "Admin" })).toHaveCount(0);
  });

  test("sans compte : Chants · Évènements et Connexion, pas de barre du bas", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(header(page).getByRole("link", { name: "Chants" })).toBeVisible();
    await expect(header(page).getByRole("link", { name: "Évènements" })).toBeVisible();
    await expect(header(page).getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(barreDuBas(page)).toBeHidden();
  });
});
