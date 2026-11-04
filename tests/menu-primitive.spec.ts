import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot CD, T3a (docs/spec-corrections-design/partout.md, « Contrôles (jeu B) ») : la primitive `Menu`
// (src/components/ui/menu.tsx), montée dans le filtre de thème de la liste des chants (src/app/songs/SongListClient.tsx, premier
// usage, prévu en T3b), et le jeton `--pose` (segment actif, curseur du rail) en sombre. Trois appareils.

const ENCRE = "rgb(28, 28, 30)";
const POSE_SOMBRE = "rgb(58, 58, 60)";
const estOrdinateur = (nom: string) => nom.startsWith("ordinateur");

const declencheur = (page: Page) => page.locator("[data-menu]").first();

async function ouvrirListe(page: Page) {
  await page.goto("/songs");
  await expect(declencheur(page)).toBeVisible();
  // Liste prête (comme `listePrete` de agencement-v18-chants.spec.ts) : sans ça, les touches partent avant que le menu ait recensé ses lignes.
  await expect(page.locator('[id="song-li-abba-pere"] a')).toBeAttached({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const s = document.querySelector("[data-volet-liste] input[type=search]");
    return !!s && Object.keys(s).some((k) => k.startsWith("__reactProps"));
  });
}

const fond = (el: ReturnType<typeof declencheur>) => el.evaluate((e) => getComputedStyle(e).backgroundColor);

test.describe("Menu (jeu B)", () => {
  test.use({ serviceWorkers: "block" });

  test("déclencheur en pilule : 28 px au pointeur fin, 32 px au toucher, gris, chevron de 14 px", async ({ page }, info) => {
    await ouvrirListe(page);
    const d = declencheur(page);
    expect(Math.round((await d.boundingBox())!.height)).toBe(estOrdinateur(info.project.name) ? 28 : 32);
    await expect(d).toHaveAttribute("aria-haspopup", "menu");
    await expect(d).toHaveAttribute("aria-expanded", "false");
    await expect(d).not.toHaveAttribute("data-pose");
    expect(await fond(d)).not.toBe(ENCRE);
    expect(await d.locator("svg").evaluate((s) => Math.round(s.getBoundingClientRect().width))).toBe(14);
    expect(await d.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe("0px");
  });

  test("panneau : rayon 12, lignes de 36 px (44 au toucher), coche sur la valeur courante, 320 px au plus", async ({ page }, info) => {
    await ouvrirListe(page);
    await declencheur(page).click();
    await expect(declencheur(page)).toHaveAttribute("aria-expanded", "true");
    const panneau = page.getByRole("menu");
    await expect(panneau).toBeVisible();
    const css = await panneau.evaluate((e) => ({ rayon: getComputedStyle(e).borderTopLeftRadius, classe: e.className }));
    expect(css.rayon).toBe("12px");
    expect(css.classe).toContain("material-panel");
    const lignes = panneau.getByRole("menuitemradio");
    expect(await lignes.count()).toBeGreaterThan(3);
    const attendu = estOrdinateur(info.project.name) ? 36 : 44;
    for (const i of [0, 1, 2]) expect(Math.round((await lignes.nth(i).boundingBox())!.height)).toBe(attendu);
    expect((await panneau.boundingBox())!.height).toBeLessThanOrEqual(320.5);
    // La valeur courante (« Tous les thèmes ») porte la coche, à gauche du texte ; les autres lignes non.
    await expect(lignes.first()).toHaveAttribute("aria-checked", "true");
    await expect(lignes.first().locator("svg")).toBeVisible();
    await expect(lignes.nth(1).locator("svg")).toHaveCount(0);
    const [coche, texte] = [(await lignes.first().locator("svg").boundingBox())!, (await lignes.first().locator("span.truncate").boundingBox())!];
    expect(coche.x + coche.width).toBeLessThanOrEqual(texte.x);
    // Le panneau défile quand il y a plus de lignes que de place.
    expect(await panneau.evaluate((e) => e.scrollHeight >= e.clientHeight)).toBe(true);
  });

  test("clavier : Entrée ouvre, flèches déplacent, Entrée choisit (déclencheur en encre pleine), Échap ferme et rend le focus", async ({ page }) => {
    await ouvrirListe(page);
    const d = declencheur(page);
    await d.focus();
    await page.keyboard.press("Enter");
    await expect(d).toHaveAttribute("aria-expanded", "true");
    const lignes = page.getByRole("menu").getByRole("menuitemradio");
    await expect(lignes.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(lignes.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(lignes.nth(2)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(lignes.nth(1)).toBeFocused();
    const nom = (await lignes.nth(1).innerText()).trim();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toHaveCount(0);
    // Valeur posée : encre pleine, le nom du thème dans le déclencheur, la valeur dans le nom accessible.
    await expect(d).toHaveAttribute("data-pose", "");
    expect(await fond(d)).toBe(ENCRE);
    await expect(d).toContainText(nom);
    await expect(d).toHaveAttribute("aria-label", new RegExp(`: ${nom}$`));
    await expect(d).toBeFocused();
    // Rouvert : la coche est sur la ligne choisie ; Échap ferme sans rien changer.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu").getByRole("menuitemradio", { name: nom })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(d).toHaveAttribute("aria-expanded", "false");
    await expect(d).toBeFocused();
    await expect(d).toContainText(nom);
    // Revenir à la valeur par défaut remet le déclencheur gris.
    await page.keyboard.press("Enter");
    await page.getByRole("menu").getByRole("menuitemradio").first().click();
    await expect(d).not.toHaveAttribute("data-pose");
    expect(await fond(d)).not.toBe(ENCRE);
  });

  test("sombre : le panneau reste lisible, le déclencheur posé s'inverse en encre claire", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await ouvrirListe(page);
    await declencheur(page).click();
    await page.getByRole("menu").getByRole("menuitemradio").nth(1).click();
    await expect.poll(() => fond(declencheur(page))).toBe("rgb(242, 242, 247)");
  });
});

test.describe("--pose en sombre (back-office-3 et arbitrages 4 et 5)", () => {
  test("le curseur du rail est #3a3a3c en sombre, blanc en clair ; jamais noir", async ({ page }) => {
    await page.goto("/songs");
    const curseur = page.locator('[data-onglets="rail"] [role="tab"][aria-selected="true"]').first();
    await expect(curseur).toBeVisible();
    expect(await curseur.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => curseur.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(POSE_SOMBRE);
  });
});

test.describe("--pose en sombre : SelecteurEspace", () => {
  test.use({ serviceWorkers: "block" });

  test("le segment actif est #3a3a3c", async ({ page }) => {
    const admin: FakeProfile = { uid: "uid-admin-menu", email: ADMIN_EMAIL, firstName: "Alix", lastName: "T.", dansEquipes: ["da"] };
    await page.emulateMedia({ colorScheme: "dark" });
    await signInAs(page, admin, {}, "/songs");
    const segment = page.locator('[role="group"] a[aria-current="true"]').locator("visible=true").first();
    await expect(segment).toBeVisible();
    await expect.poll(() => segment.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(POSE_SOMBRE);
  });
});
