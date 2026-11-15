import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";
import { openSheet } from "./helpers/jianpu";
import { transposeLabel } from "../src/lib/transpose";
import { basculerMode } from "./helpers/menuSetlist";

// Lot DA / DA-3 (docs/spec-dictionnaire-accords.md, Q13, Q15, Q16) : toucher un accord ouvre son panneau, en
// lecture seulement — page chant, partition d'une setlist hors édition, calque des accords sur la 简谱 —,
// jamais en édition (« Crayon »), ni en mode louange. Setlists et comptes simulés, noms
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
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一切歌颂赞美", position: 2 })],
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
  await paroles(page);
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

  test("ZH téléphone, processeur ralenti ×4 : un toucher avant la fin de l'hydratation ouvre quand même le panneau (DP-G2, point 24)", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement");
    await sansAide(page);
    await paroles(page);
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    // Le rendu serveur doit déjà être dans la disposition de l'appareil (Couleurs par section) : sinon l'hydratation
    // recompose la page, recrée les boutons d'accord, et le toucher commencé sur l'ancien bouton n'ouvre rien.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("/songs/" + encodeURIComponent("一切歌颂赞美"));
    await touchables(page).first().click();
    await expect(panneau(page)).toBeVisible({ timeout: 15_000 });
  });

  test("FR : Piano, la flèche suivante passe au 1er renversement et la main droite change", async ({ page }) => {
    await sansAide(page);
    await page.goto("/songs/abba-pere");
    await touchables(page).first().click();
    await panneau(page).getByRole("radio", { name: "Piano" }).click();
    await expect(panneau(page).getByText("État fondamental · 1 sur 3")).toBeVisible();
    const avant = await panneau(page).getByText(/Main droite/).textContent();
    await panneau(page).getByRole("button", { name: "Renversement suivant" }).click();
    await expect(panneau(page).getByText(/^1er renversement/)).toBeVisible();
    await expect(panneau(page).getByText(/Main droite/)).not.toHaveText(avant!);
  });

  test("ZH : Piano, la flèche suivante passe au 第一转位 et la main droite change", async ({ page }) => {
    await sansAide(page);
    await paroles(page);
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.goto("/songs/" + encodeURIComponent("一切歌颂赞美"));
    await touchables(page).first().click();
    await panneau(page).getByRole("radio", { name: "钢琴" }).click();
    await expect(panneau(page).getByText("原位 · 第 1 种，共 3 种")).toBeVisible();
    const avant = await panneau(page).getByText(/右手：/).textContent();
    await panneau(page).getByRole("button", { name: "下一个转位" }).click();
    await expect(panneau(page).getByText(/^第一转位/)).toBeVisible();
    await expect(panneau(page).getByText(/右手：/)).not.toHaveText(avant!);
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

  for (const mode of ["Crayon"] as const) {
    test(`en « ${mode} » : aucun accord touchable, la ligne s'édite comme avant`, async ({ page }) => {
      await ouvrirLaSetlist(page);
      await basculerMode(page, mode);
      await expect(page.locator('[data-outline-item="1"] [role="button"]').first()).toBeVisible();
      await expect(touchables(page), "aucun accord n'a le rôle de bouton").toHaveCount(0);
      const accord = page.locator('[data-outline-item="1"] [data-copy-line]', { hasText: "planait" }).locator(".font-chord").first();
      await accord.click();
      await expect(panneau(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Modifier les paroles" }), "la feuille d'édition de la ligne s'ouvre").toBeVisible();
    });
  }

  test("mode louange : sans accès Harmonie, les accords sont inertes même réglage « Idées d'harmonie » posé (CL-4), sans bulle d'aide", async ({ page }) => {
    // Le panneau d'accord en louange (réglage allumé, accès Harmonie) est couvert par louange-accords.spec.ts.
    await page.addInitScript((u) => localStorage.setItem(`perf-idees-harmonie-${u}`, "1"), MUSICIENNE.uid);
    await ouvrirLaSetlist(page);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-copy-line] .font-chord, [data-copy-line] [data-accord]").first()).toBeVisible();
    await expect(page.locator("[data-performance-mode] [data-accord-touchable]")).toHaveCount(0);
    await expect(aide(page)).toHaveCount(0);
  });
});

test.describe("bandeau d'aide", () => {
  test("visible la première fois, × (« OK ») le ferme, absent après rechargement", async ({ page }, info) => {
    await page.goto("/songs/aucun-autre-nom");
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

  test("bandeau gris au-dessus du chant, dans la colonne de lecture, × à droite, sans recouvrir de ligne (C9)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
    for (const slug of ["aucun-autre-nom", "一切歌颂赞美"]) {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await expect(aide(page)).toBeVisible();
      const bandeau = (await aide(page).boundingBox())!;
      await expect(page.locator("[data-copy-line]:visible").first()).toBeVisible();
      const ligne = (await page.locator("[data-copy-line]:visible").first().boundingBox())!;
      expect(bandeau.y + bandeau.height).toBeLessThanOrEqual(ligne.y);
      // La colonne de lecture (`main`) ; le bandeau s'aligne sur les pastilles de structure, comme dans la setlist.
      const colonne = await page.locator("main.song-zoom").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, droite: r.right };
      });
      expect(bandeau.x).toBeGreaterThanOrEqual(colonne.x - 1);
      expect(bandeau.x + bandeau.width).toBeLessThanOrEqual(colonne.droite + 1);
      const croix = (await aide(page).getByRole("button", { name: "OK" }).boundingBox())!;
      expect(croix.x + croix.width).toBeLessThanOrEqual(bandeau.x + bandeau.width + 0.5);
      expect(bandeau.x + bandeau.width - (croix.x + croix.width)).toBeLessThan(8);
      for (const l of await page.locator("[data-copy-line]").all()) {
        const b = await l.boundingBox();
        if (b) expect(b.y >= bandeau.y + bandeau.height - 0.5 || b.y + b.height <= bandeau.y + 0.5).toBe(true);
      }
    }
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
    await basculerMode(page);
    await expect(page.locator('[data-outline-item="1"] [data-section] .font-chord').first()).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(aide(page)).toHaveCount(0);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await page.waitForTimeout(1000);
    await expect(aide(page)).toHaveCount(0);
  });
});

test.describe("panneau à côté de l'accord (B4 bis)", () => {
  for (const slug of ["aucun-autre-nom", "一切歌颂赞美"]) {
    test(`ordinateur seulement : fenêtre basse, le panneau ne couvre pas l'accord et se pose à sa droite (${slug})`, async ({ page }, info) => {
      test.skip(info.project.name !== "ordinateur", "ordinateur seulement");
      await sansAide(page);
      await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
      await page.setViewportSize({ width: 1366, height: 600 });
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await expect(touchables(page).first()).toBeVisible();
      // L'accord le plus à gauche du chant (moitié gauche de la fenêtre), ramené au milieu de l'écran : ni dessous ni dessus ne tient.
      const n = await touchables(page).evaluateAll((els) => els.reduce((m, el, i) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (m < 0 || r.left < els[m].getBoundingClientRect().left) ? i : m;
      }, -1));
      const accord = touchables(page).nth(n);
      await accord.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await accord.click();
      await expect(panneau(page)).toHaveAttribute("data-accord-panneau", "bulle");
      const ensuite = panneau(page).getByRole("button", { name: /Ensuite/ });
      if (await ensuite.count()) await ensuite.first().click();
      const a = (await accord.boundingBox())!;
      const b = (await panneau(page).boundingBox())!;
      const croise = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(croise, "le panneau ne couvre pas l'accord").toBe(false);
      // Règle B4 bis : côté opposé à la moitié de la fenêtre où se trouve l'accord (la colonne de lecture peut être dans la moitié droite).
      if (a.x + a.width / 2 < 1366 / 2) expect(b.x, "à droite de l'accord").toBeGreaterThanOrEqual(a.x + a.width);
      else expect(b.x + b.width, "à gauche de l'accord").toBeLessThanOrEqual(a.x);
    });
  }
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
    await page.getByTestId("barre-outils").getByRole("button", { name: "Harmonie", exact: true }).click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    // Le premier accord d'une carte d'idée (les lettres de la grille sont sans pastille, H4-1).
    const accord = page.locator("[data-idees-harmonie] [data-suggestion] [data-accord-touchable]").first();
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
