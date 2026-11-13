import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot ST, ST4 (docs/spec-jianpu-entete-statistiques.md) : la ligne de statistiques sous l'en-tête de la page
// d'un chant, et son détail (feuille du bas sur téléphone et tablette debout, panneau à droite dès la
// tablette couchée). Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN).
// Horloge au 30/10/2026 ; setlists simulées, noms fictifs.

const MEMBRE: FakeProfile = { uid: "uid-membre-st4", email: "membre-st4@example.com", firstName: "Maud", lastName: "B." };
const CAPTURES = "/tmp/claude-0/-home-user-GCC/2b3dc4d2-42d2-52cc-93a8-fc40dc07ed80/scratchpad/st-c";

const FR = "abba-pere";          // joué 3 fois, dernière fois à Groupe Fidélité
const ZH = "回家";
const JAMAIS = "jamais-marche-seul";
const AUTRE = "a-jamais-tu-es-saint";

const chant = (songSlug: string, keyOverride: string | null = null) => ({
  songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, category: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader: "Luc Fictif", language: "fr", notes: "", items, isDraft: false, isPrivate: false, ...extra,
});

const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/s1": setlist("2026-06-14", "Culte Francophone", [chant(FR, "G"), chant(ZH)]),
  "setlists/s2": setlist("2026-09-06", "Groupe Paix", [chant(FR, "G"), chant(AUTRE)]),
  "setlists/s3": setlist("2026-10-18", "Groupe Fidélité", [chant(FR, "A"), chant(ZH)]),
  // Deux services où le chant n'est jamais.
  "setlists/s4": setlist("2026-10-04", "Groupe Bonté", [chant(AUTRE)]),
  "setlists/s5": setlist("2026-10-11", "高班", [chant(AUTRE)]),
  // À venir : le brouillon (plus proche) est ignoré, la publiée du 08/11 est « prévue ».
  "setlists/brouillon": setlist("2026-11-01", "Culte Francophone", [chant(FR)], { isDraft: true }),
  "setlists/prevue": setlist("2026-11-08", "Groupe Paix", [chant(FR)]),
};

const telephoneOuTabletteDebout = () => ["telephone", "tablette"].includes(test.info().project.name);

async function ouvrir(page: Page, slug: string, { langue = "fr", sombre = false }: { langue?: "fr" | "zh-CN"; sombre?: boolean } = {}) {
  await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
  await page.addInitScript(([l, s]) => {
    localStorage.setItem("i18nextLng", l as string);
    localStorage.setItem("theme", s ? "dark" : "light");
    localStorage.setItem("jianpu-sheet-pref", "never");
  }, [langue, sombre] as const);
  await page.clock.setFixedTime(new Date("2026-10-30T10:00:00"));
  await signInAs(page, MEMBRE, SETLISTS, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom").getByRole("heading", { level: 1 })).toBeVisible();
}

const ligne = (page: Page) => page.getByTestId("statistiques-chant");

async function capture(page: Page, nom: string) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(CAPTURES, `${test.info().project.name}-${nom}.png`) });
}

test.use({ serviceWorkers: "block" });

test.describe("Statistiques sur la page du chant (ST4)", () => {
  test("chant FR joué 3 fois : la ligne dit le nombre, la dernière fois et la prochaine prévue", async ({ page }) => {
    await ouvrir(page, FR);
    await expect(ligne(page)).toHaveText("Joué 3 fois · dernière fois 18/10, Fidélité · prévu le 08/11, Paix");
    // La ligne vit dans l'en-tête de la page, sous le titre.
    const titre = await page.locator("main.song-zoom h1").boundingBox();
    const box = await ligne(page).boundingBox();
    expect(box!.y).toBeGreaterThan(titre!.y + titre!.height - 1);
    await capture(page, "chant-fr-ligne");
  });

  test("chant ZH 回家 : la ligne est là, en français puis en 中文", async ({ page }) => {
    await ouvrir(page, ZH);
    await expect(ligne(page)).toHaveText("Joué 2 fois · dernière fois 18/10, Fidélité");
  });

  test("chant ZH 回家 en 中文", async ({ page }) => {
    await ouvrir(page, ZH, { langue: "zh-CN" });
    await expect(ligne(page)).toHaveText("共唱 2 次 · 最近一次 18/10，信实团契");
    await capture(page, "chant-zh-ligne");
    await ligne(page).click();
    const detail = page.getByRole("dialog", { name: "诗歌统计" });
    await expect(detail).toBeVisible();
    await expect(detail.getByTestId("jamais-dans")).toHaveText("从未：和平团契, 恩慈团契, 高班");
    await expect(detail.getByRole("link", { name: "全部统计" })).toBeVisible();
    await expect(detail.getByText("已发布且已过去的歌单，自 2026年6月14日 起")).toBeVisible();
    await capture(page, "chant-zh-detail");
  });

  test("chant jamais joué : « Jamais joué à GCC »", async ({ page }) => {
    await ouvrir(page, JAMAIS);
    await expect(ligne(page)).toHaveText("Jamais joué à GCC");
  });

  test("le détail : feuille en bas (téléphone, tablette debout) ou panneau à droite (dès la tablette couchée)", async ({ page }) => {
    await ouvrir(page, FR);
    await ligne(page).click();
    const detail = page.getByRole("dialog", { name: "Statistiques du chant" });
    await expect(detail).toBeVisible();
    await page.waitForTimeout(600); // fin de l'animation
    const { width, height } = page.viewportSize()!;
    const box = (await detail.boundingBox())!;
    if (telephoneOuTabletteDebout()) {
      expect(box.y + box.height, "feuille posée en bas").toBeGreaterThan(height - 2);
      expect(box.width, "feuille sur la largeur").toBeGreaterThan(Math.min(width, 768) - 4);
      expect(box.y, "feuille, pas plein écran").toBeGreaterThan(height * 0.1);
    } else {
      expect(box.x + box.width, "panneau collé à droite").toBeGreaterThan(width - 2);
      expect(box.width, "panneau d'environ 380 px").toBeGreaterThan(370);
      expect(box.width).toBeLessThan(390);
      expect(box.height, "pleine hauteur").toBeGreaterThan(height - 70);
    }

    // Trois chiffres.
    await expect(detail.getByTestId("chiffre-setlists")).toContainText("Setlists");
    await expect(detail.getByTestId("chiffre-setlists")).toContainText("3");
    await expect(detail.getByTestId("chiffre-derniere")).toContainText("18/10");
    await expect(detail.getByTestId("chiffre-tonalite").locator("dd")).toHaveText("G");
    // Tableau, Fidélité en tête.
    const services = detail.getByTestId("ligne-service");
    await expect(services).toHaveCount(3);
    await expect(services.first().locator('[data-champ="service"]')).toHaveText("Fidélité");
    await expect(services.first().locator('[data-champ="fois"]')).toHaveText("1");
    await expect(services.first().locator('[data-champ="derniere"]')).toHaveText("18/10");
    await expect(services.first().locator("[aria-hidden]")).toHaveCount(1);
    // Jamais, prochaine, note, lien.
    await expect(detail.getByTestId("jamais-dans")).toHaveText("Jamais : Groupe Bonté, 高班");
    await expect(detail.getByTestId("prochaine")).toHaveText("Prévu le 08/11, Paix");
    await expect(detail.getByTestId("prochaine").getByRole("link")).toHaveAttribute("href", /\/setlists\/prevue\/?$/);
    await expect(detail.getByText("Setlists publiées et passées, depuis le 14 juin 2026")).toBeVisible();
    await capture(page, "chant-fr-detail");

    // Changer de période change le total (3 mois : sans le 14/06).
    await detail.getByRole("button", { name: "3 mois" }).click();
    await expect(detail.getByTestId("chiffre-setlists")).toContainText("2");
    await expect(detail.getByTestId("ligne-service")).toHaveCount(2);
    await detail.getByRole("button", { name: "Depuis le début" }).click();
    await expect(detail.getByTestId("chiffre-setlists")).toContainText("3");

    // Le lien mène à la page complète.
    await expect(detail.getByRole("link", { name: "Toutes les statistiques" })).toHaveAttribute("href", /\/songs\/statistiques\/?$/);
    // Échap ferme.
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();
  });

  test("le panneau se ferme par sa croix (ordinateur, tablette couchée)", async ({ page }) => {
    test.skip(telephoneOuTabletteDebout(), "panneau seulement dès la tablette couchée");
    await ouvrir(page, FR);
    await ligne(page).click();
    const detail = page.getByRole("dialog", { name: "Statistiques du chant" });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Fermer" }).click();
    await expect(detail).toBeHidden();
  });

  test("un chant jamais joué : le détail a ses chiffres à 0 / « — », pas de tableau, la phrase", async ({ page }) => {
    await ouvrir(page, JAMAIS);
    await ligne(page).click();
    const detail = page.getByRole("dialog", { name: "Statistiques du chant" });
    await expect(detail.getByTestId("chiffre-setlists")).toContainText("0");
    await expect(detail.getByTestId("chiffre-derniere")).toContainText("—");
    await expect(detail.getByTestId("chiffre-tonalite")).toContainText("—");
    await expect(detail.getByTestId("statistiques-chant-aucune")).toHaveText("Jamais joué sur cette période");
    await expect(detail.getByTestId("statistiques-chant-tableau")).toHaveCount(0);
  });

  test("ordinateur, thème sombre : la ligne et le détail", async ({ page }) => {
    test.skip(test.info().project.name !== "ordinateur", "capture sombre sur ordinateur");
    await ouvrir(page, FR, { sombre: true });
    await expect(ligne(page)).toBeVisible();
    await ligne(page).click();
    await expect(page.getByRole("dialog", { name: "Statistiques du chant" })).toBeVisible();
    await capture(page, "chant-fr-detail-sombre");
  });

  test("sans compte : la page du chant n'a aucune ligne de statistiques", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-30T10:00:00"));
    await page.goto(`/songs/${FR}`);
    await expect(page.locator("main.song-zoom").getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(ligne(page)).toHaveCount(0);
  });

  test("seule la page du chant la porte : ni mode Louange ni PDF ni autre usage de SongView", () => {
    const racine = path.resolve(__dirname, "..", "src");
    const fichiers: string[] = [];
    const parcourir = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) parcourir(p);
        else if (/\.tsx?$/.test(e.name)) fichiers.push(p);
      }
    };
    parcourir(racine);
    const usages = fichiers
      .filter((f) => /<StatistiquesDuChant\b/.test(fs.readFileSync(f, "utf8")) && !f.endsWith("StatistiquesDuChant.tsx"))
      .map((f) => path.relative(racine, f));
    expect(usages).toEqual([path.join("app", "songs", "[slug]", "SongDetailClient.tsx")]);
  });
});
