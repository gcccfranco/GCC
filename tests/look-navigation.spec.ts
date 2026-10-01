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
  // 5C1 : la barre flotte, en verre ; l'onglet courant est une pastille d'encre, libellé blanc.
  test("connecté : barre du bas Chants · Setlists · Planning · Évènements · Moi, flottante, l'onglet courant en pastille d'encre", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    const chants = barreDuBas(page).getByRole("link", { name: "Chants" });
    await expect(chants).toHaveAttribute("aria-current", "page");
    // Couleurs lues une fois la transition finie : pastille d'encre, libellé blanc.
    await expect.poll(() => chants.evaluate((a) => getComputedStyle(a).backgroundColor), { message: "onglet actif en pastille d'encre" }).toBe(ENCRE);
    expect(await chants.evaluate((a) => getComputedStyle(a).color)).toBe("rgb(255, 255, 255)");
    const autre = barreDuBas(page).getByRole("link", { name: "Planning" });
    expect(await autre.evaluate((a) => getComputedStyle(a).backgroundColor), "les autres onglets n'ont pas de fond").toBe("rgba(0, 0, 0, 0)");
    const barre = await barreDuBas(page).boundingBox();
    expect(barre!.x, "la barre ne touche pas le bord : elle flotte").toBeGreaterThan(4);
    expect(parseFloat(await barreDuBas(page).evaluate((n) => getComputedStyle(n).borderTopLeftRadius))).toBeGreaterThanOrEqual(28);
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

  // Retour de Timothée du 20/09/2026 : sur iPhone la barre flottait à 48 px du
  // bas (marge de 14 px ET zone sûre de 34 px empilées), avec une bande de
  // contenu visible dessous. Chromium n'a pas de zone sûre : on la simule par
  // `--sab`, que le CSS lit à la place de `env(safe-area-inset-bottom)`.
  test("iPhone (zone sûre de 34 px) : la barre se pose à 21 px du bas, juste au-dessus de l'indicateur d'accueil", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const sousLaBarre = () => barreDuBas(page).evaluate((n) => window.innerHeight - n.getBoundingClientRect().bottom);
    const cale = () => barreDuBas(page).locator("xpath=preceding-sibling::div[1]").evaluate((n) => n.getBoundingClientRect().height);
    expect(await sousLaBarre(), "sans zone sûre : 14 px, inchangé").toBeCloseTo(14, 0);
    expect(await cale(), "cale = barre (64) + respiration (14) + écart du bas (14)").toBeCloseTo(92, 0);

    await page.evaluate(() => document.documentElement.style.setProperty("--sab", "34px"));
    await expect.poll(sousLaBarre, { message: "8 px au-dessus de l'indicateur d'accueil, qui finit à 13 px du bord" }).toBeCloseTo(21, 0);
    expect(await cale(), "la cale suit : 64 + 14 + 21").toBeCloseTo(99, 0);

    // iPad : zone sûre de 20 px, la barre s'y pose telle quelle.
    await page.evaluate(() => document.documentElement.style.setProperty("--sab", "20px"));
    await expect.poll(sousLaBarre).toBeCloseTo(20, 0);
  });
});

test.describe("navigation par sections (T2), onglets de section", () => {
  // Cible tactile (16/09/2026) : les pilules faisaient 30 px de haut. Depuis V7
  // (21/09/2026), sous 1024 px c'est la pastille du menu qui se touche.
  test("une pilule de section fait au moins 40 px de haut, sur chaque appareil", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MEMBRE, {}, "/planning");
    // Le téléphone a la pastille qui ouvre la feuille ; dès la tablette, les huit
    // onglets tiennent sur la rangée (V7 ter).
    const pilule = test.info().project.name === "telephone"
      ? page.getByTestId("menu-plannings")
      : page.getByTestId("onglets-section").getByRole("link", { name: "Culte Franco" });
    await pilule.waitFor();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const box = await pilule.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe("navigation par sections (T2), 320 px", () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  // « Évènements » est le libellé le plus long : dans une barre flottante, plus étroite, il doit encore tenir.
  test("les cinq libellés de la barre du bas tiennent sans être rognés", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const onglets = barreDuBas(page).getByRole("link");
    await expect(onglets).toHaveCount(5);
    const mesures = await onglets.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { nom: el.textContent?.trim(), rogne: el.scrollWidth > el.clientWidth, gauche: r.left, droite: r.right };
    }));
    for (const m of mesures) {
      expect.soft(m.rogne, `${m.nom} est rogné`).toBe(false);
      expect.soft(m.gauche, `${m.nom} déborde à gauche`).toBeGreaterThanOrEqual(0);
      expect.soft(m.droite, `${m.nom} déborde à droite`).toBeLessThanOrEqual(320);
    }
  });

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
