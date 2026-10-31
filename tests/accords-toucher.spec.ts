import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";
import { openSheet } from "./helpers/jianpu";
import { transposeLabel } from "../src/lib/transpose";

// Lot DA / DA-3 (docs/spec-dictionnaire-accords.md, Q13, Q15, Q16) : toucher un accord ouvre son panneau, en
// lecture seulement — page chant, partition d'une setlist hors édition, calque des accords sur la 简谱 —,
// jamais en édition (« Ma version », « Adapter »), ni en mode louange. Setlists et comptes simulés, noms
// fictifs. Les captures à regarder sont dans accords-toucher-agencement.spec.ts.

const SETLIST_ID = "setlist-accords";
const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Perrine",
  lastName: "Lamarque",
  planningName: "Perrine L.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const setlist = {
  title: "Culte du 4 octobre",
  leader: "Gaspard T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId: MUSICIENNE.uid, // la créatrice : « Adapter » lui est offert
  isPrivate: false,
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一切歌颂赞美", position: 2, jianpuSheet: false })],
};

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
/** Le planning du jour : la musicienne y est pianiste, ce qui ouvre les idées d'harmonie. */
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Clémence R.", "", "", "Ambroise V.", "", "", "", "", "", "", ""],
]);

const touchables = (page: Page) => page.locator("[data-accord-touchable]");
const panneau = (page: Page) => page.locator("[data-accord-panneau]");
const nom = (page: Page) => page.locator("[data-accord-nom]");
const aide = (page: Page) => page.locator("[data-accords-aide]");

/** L'aide de la première fois déjà vue : elle ne recouvre pas les lignes d'un test qui n'en parle pas. */
const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
const paroles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));

const csvVide = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrirLaSetlist(page: Page) {
  await csvVide(page);
  await sansAide(page);
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIENNE, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(touchables(page).first()).toBeVisible();
}

/** Le panneau est une bulle sous l'accord sur ordinateur, une feuille du bas ailleurs. */
const attendu = (projet: string) => (projet === "ordinateur" || projet === "ordinateur-1440" ? "bulle" : "feuille");

test.describe("page chant", () => {
  test("FR : toucher le premier accord ouvre son panneau, rien de visible de plus au repos", async ({ page }, info) => {
    await sansAide(page);
    await page.goto("/songs/abba-pere");
    const premier = touchables(page).first();
    await expect(premier).toBeVisible();
    const texte = (await premier.textContent())!;
    expect(texte).toBe("F#m");
    // Même texte, même place : l'accord reste dans sa ligne d'accords, qui n'est pas copiée.
    await expect(premier.locator("xpath=ancestor::*[@data-copy-ignore][1]")).toHaveText(texte);
    expect(await premier.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("none");
    await expect(premier).toHaveAttribute("role", "button");
    await expect(premier).toHaveAccessibleName("Voir comment jouer F#m");

    await premier.click();
    await expect(panneau(page)).toHaveAttribute("data-accord-panneau", attendu(info.project.name));
    await expect(nom(page)).toHaveText("F#m");
  });

  test("FR : avec +1 demi-ton (?key=Bb) le même accord s'ouvre transposé", async ({ page }) => {
    await sansAide(page);
    await page.goto(`/songs/abba-pere?key=${encodeURIComponent(JSON.stringify("Bb"))}`);
    const premier = touchables(page).first();
    await expect(premier).toBeVisible();
    const transpose = transposeLabel("F#m", 1, "Bb");
    expect(transpose).not.toBe("F#m");
    await expect(premier).toHaveText(transpose);
    await premier.click();
    await expect(nom(page)).toHaveText(transpose);
  });

  test("ZH : toucher le premier accord ouvre son panneau, transposé avec ?key=F", async ({ page }) => {
    await sansAide(page);
    await paroles(page);
    await page.goto("/songs/" + encodeURIComponent("一切歌颂赞美"));
    const premier = touchables(page).first();
    await expect(premier).toBeVisible();
    await expect(premier).toHaveText("E");
    await premier.click();
    await expect(nom(page)).toHaveText("E");
    await page.keyboard.press("Escape");
    await expect(panneau(page)).toHaveCount(0);

    await page.goto(`/songs/${encodeURIComponent("一切歌颂赞美")}?key=${encodeURIComponent(JSON.stringify("F"))}`);
    await expect(touchables(page).first()).toHaveText("F");
    await touchables(page).first().click();
    await expect(nom(page)).toHaveText("F");
  });

  test("calque 简谱 en lecture : un accord du calque s'ouvre tel qu'il est affiché (transposé)", async ({ page }) => {
    await sansAide(page);
    await openSheet(page, "一生爱你", { key: "F" });
    const accords = page.locator("[data-jianpu-page] [data-accord-touchable]");
    await expect(accords.first()).toBeVisible();
    const affiche = (await accords.first().textContent())!;
    expect(affiche).toBe("F"); // le premier accord gravé est un E, joué un demi-ton plus haut
    await accords.first().click();
    await expect(nom(page)).toHaveText(affiche);
    // L'accord touché est un bouton, pas la page entière : la zone de retouche n'existe pas en lecture.
    await expect(page.locator("[data-jianpu-retouche-zone]")).toHaveCount(0);
  });

  test("clavier : Entrée sur un accord ouvre le panneau, Échap le ferme et rend le focus", async ({ page }) => {
    await sansAide(page);
    await page.goto("/songs/abba-pere");
    const premier = touchables(page).first();
    await expect(premier).toBeVisible();
    await premier.focus();
    await page.keyboard.press("Enter");
    await expect(nom(page)).toHaveText("F#m");
    await page.keyboard.press("Escape");
    await expect(panneau(page)).toHaveCount(0);
    await expect(premier).toBeFocused();
    // Espace ouvre aussi.
    await page.keyboard.press("Space");
    await expect(nom(page)).toHaveText("F#m");
  });

  test("« Voir tout le dictionnaire » mène à /accords?accord=…", async ({ page }) => {
    await sansAide(page);
    await page.goto("/songs/abba-pere");
    await touchables(page).first().click();
    await page.getByRole("link", { name: /Voir tout le dictionnaire/ }).click();
    await expect(page).toHaveURL(/\/accords\/?\?accord=F%23m/);
    await expect(page.locator("[data-carte-accord] [data-accord-nom]")).toHaveText("F#m");
  });
});

test.describe("setlist", () => {
  test("hors édition : un accord de la partition s'ouvre, FR et ZH", async ({ page }) => {
    await ouvrirLaSetlist(page);
    await page.locator('[data-outline-item="1"] [data-accord-touchable]').first().click();
    await expect(nom(page)).toHaveText("F#m");
    await page.keyboard.press("Escape");
    await expect(panneau(page)).toHaveCount(0);
    const zh = page.locator('[data-outline-item="2"] [data-accord-touchable]').first();
    await zh.scrollIntoViewIfNeeded();
    await zh.click();
    await expect(nom(page)).toHaveText("E");
  });

  for (const mode of ["Ma version", "Adapter"]) {
    test(`en « ${mode} » : aucun accord touchable, la ligne s'édite comme avant`, async ({ page }) => {
      await ouvrirLaSetlist(page);
      await page.getByRole("button", { name: mode, exact: true }).click();
      await expect(page.locator('[data-outline-item="1"] [role="button"]').first()).toBeVisible();
      await expect(touchables(page), "aucun accord n'a le rôle de bouton").toHaveCount(0);
      const accord = page.locator('[data-outline-item="1"] [data-copy-line]', { hasText: "planait" }).locator(".font-chord").first();
      await accord.click();
      await expect(panneau(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Modifier les paroles" }), "la feuille d'édition de la ligne s'ouvre").toBeVisible();
    });
  }

  test("mode louange : aucun accord touchable, toucher un accord n'ouvre rien", async ({ page }) => {
    await ouvrirLaSetlist(page);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-performance-mode] [data-accord-touchable]")).toHaveCount(0);
    await expect(page.locator("[data-performance-mode] [role=button][aria-label^='Voir comment jouer']")).toHaveCount(0);
    const accord = onStage(page, ".font-chord").first();
    await accord.click({ force: true });
    await expect(panneau(page)).toHaveCount(0);
    await expect(aide(page)).toHaveCount(0);
  });
});

test.describe("bulle d'aide", () => {
  test("visible la première fois, OK la ferme, absente après rechargement", async ({ page }, info) => {
    await page.goto("/songs/abba-pere");
    await expect(touchables(page).first()).toBeVisible();
    await expect(aide(page)).toBeVisible();
    await expect(aide(page)).toHaveAttribute("role", "status");
    const ordinateur = info.project.name === "ordinateur";
    await expect(aide(page)).toContainText(ordinateur ? "Clique sur un accord" : "Touche un accord pour voir comment le jouer");
    await aide(page).getByRole("button", { name: "OK" }).click();
    await expect(aide(page)).toHaveCount(0);
    await page.reload();
    await expect(touchables(page).first()).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(aide(page)).toHaveCount(0);
  });

  test("en bas de l'écran, centrée sur la colonne de lecture, sans recouvrir la première ligne de paroles (C9)", async ({ page }) => {
    await page.goto("/songs/abba-pere");
    await expect(aide(page)).toBeVisible();
    const vue = page.viewportSize()!;
    const bulle = (await aide(page).boundingBox())!;
    expect(bulle.width).toBeLessThanOrEqual(280.5);
    // Centrée sur la colonne des paroles (en deux volets, la fenêtre entière déborderait sur la liste).
    const colonne = (await page.locator("[data-copy-line]").first().evaluate((el) => {
      const r = el.parentElement!.getBoundingClientRect();
      return r.left + r.width / 2;
    }));
    expect(Math.abs(bulle.x + bulle.width / 2 - colonne)).toBeLessThan(2);
    expect(bulle.y + bulle.height).toBeGreaterThan(vue.height / 2);
    expect(bulle.y + bulle.height).toBeLessThanOrEqual(vue.height);
    const ligne = (await page.locator("[data-copy-line]").first().boundingBox())!;
    expect(ligne.y + ligne.height).toBeLessThanOrEqual(bulle.y);
  });

  test("toucher un accord la ferme et la mémorise ; Échap aussi", async ({ page }) => {
    await page.goto("/songs/abba-pere");
    await expect(aide(page)).toBeVisible();
    await touchables(page).first().click();
    await expect(aide(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("accords-aide-vue"))).not.toBeNull();

    await page.evaluate(() => localStorage.removeItem("accords-aide-vue"));
    await page.reload();
    await expect(aide(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(aide(page)).toHaveCount(0);
    await page.reload();
    await expect(touchables(page).first()).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(aide(page)).toHaveCount(0);
  });

  test("jamais en édition ni en mode louange", async ({ page }) => {
    await csvVide(page);
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await signInAs(page, MUSICIENNE, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
    await ouvrirPartitions(page);
    await page.getByRole("button", { name: "Adapter", exact: true }).click();
    await expect(page.locator('[data-outline-item="1"] [data-section] .font-chord').first()).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(aide(page)).toHaveCount(0);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await page.waitForTimeout(1000);
    await expect(aide(page)).toHaveCount(0);
  });
});

test.describe("idées d'harmonie", () => {
  const AMBROISE: FakeProfile = {
    uid: "uid-ambroise",
    email: "ambroise@example.com",
    firstName: "Ambroise",
    lastName: "Velin",
    planningName: "Ambroise V.",
    serviceRoles: { "Culte Francophone": ["musicien"] },
    ...musicien("piano"),
  };

  async function ouvrirLaFeuille(page: Page) {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet");
      return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
    });
    await sansAide(page);
    await signInAs(page, AMBROISE, {}, "/songs/au-nom-de-jesus");
    await page.getByTestId("barre-outils").getByRole("button", { name: "Idées d'harmonie" }).click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    // Le premier accord proposé de la feuille (aperçu d'une carte).
    const accord = page.locator("[data-idees-harmonie] [data-accord-touchable]").first();
    await expect(accord).toBeVisible();
    return accord;
  }

  test("un accord proposé dans une carte est un bouton visible qui ouvre son panneau, sans fermer la feuille", async ({ page }, info) => {
    const accord = await ouvrirLaFeuille(page);
    const texte = (await accord.textContent())!;
    // Visible au repos : un fond (couleur d'accord à ~12 %), pas un simple texte.
    expect(await accord.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await accord.click();
    await expect(panneau(page)).toHaveAttribute("data-accord-panneau", attendu(info.project.name));
    await expect(nom(page)).toHaveText(texte);
    // Échap ferme le panneau d'accord, pas la feuille d'idées dessous.
    await page.keyboard.press("Escape");
    await expect(panneau(page)).toHaveCount(0);
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    // Et le panneau se rouvre : la feuille d'idées n'est pas restée bloquée.
    await accord.click();
    await expect(nom(page)).toHaveText(texte);
  });

  test("toucher dans le panneau ne ferme pas la feuille d'idées (instrument, position)", async ({ page }) => {
    const accord = await ouvrirLaFeuille(page);
    await accord.click();
    await expect(nom(page)).toBeVisible();
    await panneau(page).getByRole("radio", { name: "Piano" }).click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    await expect(nom(page)).toBeVisible();
  });
});
