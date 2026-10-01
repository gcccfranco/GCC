import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// V7 ter (docs/spec-look.md, tranché par Timothée le 21/09/2026 sur la planche « choisir
// un planning ») : sur un téléphone, les huit plannings arrivent par une feuille qui monte
// du bas, en tuiles teintées — sans point de couleur, le fond de la tuile porte déjà le
// service. Dès que les huit tiennent sur une rangée, c'est la rangée qui reste.
const PLANNINGS = ["Accueil", "Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"];

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const ouvrir = async (page: Page, route: string) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MUSICIEN, {}, route);
  await page.getByRole("navigation").first().waitFor();
};
const bouton = (page: Page) => page.getByTestId("menu-plannings");
const feuille = (page: Page) => page.getByTestId("feuille-plannings");

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("plannings : la rangée dès que les huit y tiennent (tablette, ordinateur)", () => {
  test.skip(() => test.info().project.name === "telephone", "le téléphone a la feuille");

  test("pas de pastille : les huit onglets sont là, et le courant est marqué", async ({ page }) => {
    await ouvrir(page, "/planning/campus");
    await expect(bouton(page)).toBeHidden();
    const rangee = page.getByTestId("onglets-section");
    await expect(rangee).toBeVisible();
    await expect(rangee.getByRole("link")).toHaveText(PLANNINGS.map((n) => new RegExp(n.replace(".", "\\."))));
    await expect(rangee.getByRole("link", { name: "Campus" })).toHaveAttribute("aria-current", "page");
    await capture(page, "rangee-plannings");
  });

  // Si les huit débordent un peu (tablette en portrait), la rangée s'estompe du côté
  // où il en reste, au lieu d'en trancher un en deux.
  test("elle s'estompe du côté où il reste des onglets, elle ne les coupe pas", async ({ page }) => {
    await ouvrir(page, "/planning");
    const rangee = page.getByTestId("onglets-section");
    const deborde = await rangee.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    const fondu = await rangee.evaluate((el) => getComputedStyle(el).getPropertyValue("--fondu-droite").trim());
    expect(fondu).toBe(deborde ? "24px" : "0px");
  });
});

test.describe("plannings : une feuille en tuiles sur téléphone (V7 ter)", () => {
  test.skip(() => test.info().project.name !== "telephone", "la rangée reste dès que les huit y tiennent");

  test("la pastille ouvre une feuille qui monte du bas", async ({ page }) => {
    await ouvrir(page, "/planning/campus");
    await expect(feuille(page)).toHaveCount(0);
    await bouton(page).click();
    await expect(feuille(page)).toBeVisible();
    // Elle arrive par le bas : son haut est dans la moitié basse de l'écran.
    const ecran = page.viewportSize()!.height;
    const boite = (await feuille(page).boundingBox())!;
    expect(boite.y).toBeGreaterThan(ecran / 2);
    await capture(page, "feuille-plannings");
  });

  test("les huit plannings, en tuiles, sans point de couleur", async ({ page }) => {
    await ouvrir(page, "/planning/campus");
    await bouton(page).click();
    const tuiles = feuille(page).getByRole("link");
    await expect(tuiles).toHaveCount(8);
    await expect(tuiles).toHaveText(PLANNINGS.map((n) => new RegExp(n.replace(".", "\\."))));
    // Le fond de la tuile porte le service : plus de pastille de couleur à côté du nom.
    await expect(feuille(page).getByTestId("point-couleur")).toHaveCount(0);
    const campus = feuille(page).getByRole("link", { name: "Campus" });
    expect(await campus.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(campus).toHaveAttribute("aria-current", "page");
  });

  // Ce qui compte n'est pas la valeur de la couleur mais qu'on lise le libellé : à leur
  // valeur pleine, l'ocre de l'Intergroupe et l'orange de la Prépa. Table ne donnaient
  // que 3,3 et 2,9 sur leur propre fond, pour 4,5 exigés.
  test("chaque libellé se lit sur son fond, en clair comme en sombre", async ({ page }) => {
    for (const schema of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: schema });
      await ouvrir(page, "/planning");
      await bouton(page).click();
      const mesures = await feuille(page).getByRole("link").evaluateAll((els) => {
        // Chromium rend une couleur calculée par `color-mix` en `color(srgb …)`, sur 0–1 :
        // le canvas est le seul lecteur qui accepte tous les formats et rend des 0–255.
        const pot = document.createElement("canvas").getContext("2d")!;
        const rgb = (c: string) => {
          pot.clearRect(0, 0, 1, 1);
          pot.fillStyle = c;
          pot.fillRect(0, 0, 1, 1);
          return Array.from(pot.getImageData(0, 0, 1, 1).data) as [number, number, number, number];
        };
        const canal = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
        const lum = ([r, g, b]: number[]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
        const fondPage = rgb(getComputedStyle(document.body).backgroundColor);
        return els.map((el) => {
          const s = getComputedStyle(el);
          const [r, g, b, a] = rgb(s.backgroundColor);
          // Fond translucide : composé sur celui de la feuille, comme l'œil le voit.
          const fond = [0, 1, 2].map((i) => ([r, g, b][i] * a + fondPage[i] * (255 - a)) / 255);
          const [hi, lo] = [lum(rgb(s.color)), lum(fond)].sort((x, y) => y - x);
          return { nom: el.textContent?.trim(), ratio: (hi + 0.05) / (lo + 0.05) };
        });
      });
      for (const { nom, ratio } of mesures) {
        expect(ratio, `${nom} en ${schema}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("chaque tuile se touche confortablement, sur deux colonnes", async ({ page }) => {
    await ouvrir(page, "/planning");
    await bouton(page).click();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const boites = await feuille(page).getByRole("link").evaluateAll((els) =>
      els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), h: Math.round(r.height) }; })
    );
    for (const { h } of boites) expect(h).toBeGreaterThanOrEqual(44);
    expect(new Set(boites.map((b) => b.x)).size, "deux colonnes").toBe(2);
  });

  test("choisir un planning y mène et referme la feuille", async ({ page }) => {
    await ouvrir(page, "/planning");
    await bouton(page).click();
    await feuille(page).getByRole("link", { name: "Culte Franco" }).click();
    await expect(page).toHaveURL(/\/planning\/culte\/?$/);
    await expect(feuille(page)).toHaveCount(0);
    await expect(bouton(page)).toContainText("Culte Franco");
  });
});
