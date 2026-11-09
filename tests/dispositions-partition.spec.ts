import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirAffichage, ouvrirPartitions } from "./helpers/setlist";
import { attendreMiseEnPage, onStage, ouvrirOptions, type Langue } from "./helpers/louange";

// Lot DP, tranche DP-A (docs/spec-mode-louange-forscore-2.md) : la disposition de la partition, retenue par appareil,
// partagée entre la page du chant, la vue partitions de la setlist et le mode louange ; sa reprise de l'ancien réglage
// « Couleurs par section » (une seule fois) ; les menus à miniatures. Compte et setlist simulés, noms fictifs.

const SETLIST_ID = "setlist-dispositions";
const MUSICIEN: FakeProfile = {
  uid: "uid-dispositions",
  email: "musicien-dispositions@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai des dispositions",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-08",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: slugs.map((s, i) => item(s, i + 1)),
});

const CHANT_FR = "a-jamais-tu-es-saint";
const CHANT_ZH = "一生爱你";
const LOUANGE_FR = ["abba-pere", "avec-nous"];
const LOUANGE_ZH = ["谢谢你", "活着为要敬拜你"];
const NOMS: Record<string, string> = { classique: "Classique", sections: "Couleurs par section" };

const lire = (page: Page, cle: string) => page.evaluate((k) => localStorage.getItem(k), cle);

// ─── (a) Reprise de l'ancien réglage, une seule fois ─────────────────────────

test.describe("migration de la disposition (stockage simulé)", () => {
  async function ouvrirAvec(page: Page, cles: Record<string, string>) {
    await page.addInitScript((c) => {
      for (const [k, v] of Object.entries(c)) localStorage.setItem(k, v);
    }, cles);
    await page.goto(`/songs/${CHANT_FR}`);
    await expect(page.locator("main [data-disposition]").first()).toBeAttached();
  }
  const disposition = (page: Page) => page.locator("main [data-disposition]").first().getAttribute("data-disposition");

  for (const [cle, valeur, attendue] of [
    ["chart-style", "1", "sections"],
    ["chart-style", "0", "classique"],
    ["perf-chart-style", "1", "sections"],
    ["perf-chart-style", "0", "classique"],
  ] as const) {
    test(`${cle} = ${valeur} → ${attendue}`, async ({ page }) => {
      await ouvrirAvec(page, { [cle]: valeur });
      await expect.poll(() => lire(page, "disposition")).toBe(attendue);
      await expect.poll(() => lire(page, "disposition-migree")).toBe("1");
      await expect.poll(() => disposition(page)).toBe(attendue);
      // L'ancienne clé reste en place, intacte.
      expect(await lire(page, cle)).toBe(valeur);
    });
  }

  test("chart-style l'emporte sur perf-chart-style", async ({ page }) => {
    await ouvrirAvec(page, { "chart-style": "0", "perf-chart-style": "1" });
    await expect.poll(() => lire(page, "disposition")).toBe("classique");
  });

  test("aucune ancienne clé mais une autre clé du site (recentSongs) : appareil utilisé → sections", async ({ page }) => {
    await ouvrirAvec(page, { recentSongs: "[]" });
    await expect.poll(() => lire(page, "disposition")).toBe("sections");
    await expect.poll(() => disposition(page)).toBe("sections");
  });

  test("appareil vierge → classique ; poser une autre clé puis recharger ne change plus rien", async ({ page }) => {
    await page.goto(`/songs/${CHANT_FR}`);
    await expect(page.locator("main [data-disposition]").first()).toBeAttached();
    // Les clés écrites sans geste à la première visite (recentSongs, i18nextLng) ne le font pas passer pour utilisé.
    await expect.poll(() => lire(page, "disposition")).toBe("classique");
    await expect.poll(() => disposition(page)).toBe("classique");
    await page.evaluate(() => localStorage.setItem("gcc.showPinyin", "0"));
    await page.reload();
    await expect(page.locator("main [data-disposition]").first()).toBeAttached();
    await expect.poll(() => lire(page, "disposition")).toBe("classique");
    await expect.poll(() => disposition(page)).toBe("classique");
  });

  test("une fois migré, changer chart-style ne change plus rien", async ({ page }) => {
    await ouvrirAvec(page, { "chart-style": "0" });
    await expect.poll(() => lire(page, "disposition")).toBe("classique");
    await page.evaluate(() => localStorage.setItem("chart-style", "1"));
    await page.reload();
    await expect(page.locator("main [data-disposition]").first()).toBeAttached();
    await expect.poll(() => lire(page, "disposition")).toBe("classique");
    await expect.poll(() => disposition(page)).toBe("classique");
  });

  test("valeur inconnue lue → classique", async ({ page }) => {
    await ouvrirAvec(page, { disposition: "n-importe-quoi" });
    await expect.poll(() => disposition(page)).toBe("classique");
  });
});

// ─── (b) Page du chant → mode louange ────────────────────────────────────────

for (const [langue, slug] of [["FR", CHANT_FR], ["ZH", CHANT_ZH]] as const) {
  test(`${langue} : menu ⋯ du chant, choix retenu au rechargement, repris par le mode louange, rendu à la page du chant`, async ({ page }) => {
    await page.addInitScript(() => {
      // Posé une fois seulement : le script se rejoue à chaque navigation, rechargement compris.
      if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique");
      localStorage.setItem("perf-role-preset", "pianiste");
    });
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist([slug, ...LOUANGE_FR]) }, `/songs/${encodeURIComponent(slug)}`);
    const racine = page.locator("main [data-disposition]").first();
    await expect(racine).toHaveAttribute("data-disposition", "classique");

    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(page.getByText("Disposition", { exact: true })).toBeVisible();
    await expect(page.getByRole("menuitemradio")).toHaveText([/Classique/, /Couleurs par section/]);
    await expect(page.getByRole("menuitemradio", { name: "Classique" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Retenue sur cet appareil")).toBeVisible();
    // Le menu tient dans l'écran.
    const menu = (await page.getByRole("menu").boundingBox())!;
    expect(menu.x).toBeGreaterThanOrEqual(0);
    expect(menu.x + menu.width).toBeLessThanOrEqual(page.viewportSize()!.width);

    await page.getByRole("menuitemradio", { name: "Couleurs par section" }).click();
    await expect(racine).toHaveAttribute("data-disposition", "sections");
    await expect(page.getByRole("menu")).toBeVisible(); // le menu reste ouvert
    await expect.poll(() => lire(page, "disposition")).toBe("sections");

    await page.reload();
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "sections");

    // Le mode louange reprend la disposition.
    await page.goto(`/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    const scene = page.locator("[data-performance-mode]");
    await expect(scene).toHaveAttribute("data-disposition", "sections");
    const options = await ouvrirOptions(page);
    await expect(options.getByRole("radio", { name: "Couleurs par section" })).toHaveAttribute("aria-checked", "true");
    await expect(options.getByRole("radio", { name: "Classique" })).toHaveAttribute("aria-checked", "false");
    await options.getByRole("radio", { name: "Classique" }).click();
    await expect(scene).toHaveAttribute("data-disposition", "classique");
    await expect.poll(() => lire(page, "disposition")).toBe("classique");

    // Retour à la page du chant : Classique.
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "classique");
  });
}

// ─── (c) Vue partitions de la setlist ────────────────────────────────────────

test("vue partitions de la setlist : le même choix, à miniatures", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(LOUANGE_FR) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  const partitions = page.locator("[data-disposition]");
  await expect(partitions.first()).toHaveAttribute("data-disposition", "classique");
  await ouvrirAffichage(page);
  await expect(page.getByRole("menuitemradio", { name: "Classique" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "Couleurs par section" }).click();
  await expect(partitions.first()).toHaveAttribute("data-disposition", "sections");
  await expect.poll(() => lire(page, "disposition")).toBe("sections");
  await page.reload();
  await ouvrirPartitions(page);
  await expect(page.locator("[data-disposition]").first()).toHaveAttribute("data-disposition", "sections");
});

// ─── (d) Mode louange : deux colonnes sur grand écran, quelle que soit la disposition ────────────────

test("mode louange : le texte garde ses deux colonnes sur grand écran, dans chaque disposition du menu", async ({ page }) => {
  const grand = await page.evaluate(
    (q) => matchMedia(q).matches,
    "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
  );
  test.skip(!grand, "deux colonnes : tablette paysage et ordinateur seulement");
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const colonnes = async () => {
    // Le cadre Classique déborde de 2 px à gauche (marginLeft -2px) : les bords à moins de 8 px sont une même colonne.
    const gauches = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    return new Set(gauches.map((x) => Math.round(x / 8))).size;
  };
  const avant = await colonnes();
  expect(avant, "deux colonnes au départ").toBe(2);
  for (const d of ["sections", "classique"]) {
    const options = await ouvrirOptions(page);
    await options.getByRole("radio", { name: NOMS[d] }).click();
    await page.keyboard.press("Escape");
    await expect(options).toBeHidden();
    await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", d);
    await attendreMiseEnPage(page);
    await expect.poll(colonnes, { message: `deux colonnes en ${d}` }).toBe(2);
  }
});

// ─── (e) Captures à regarder : test-results/dispositions/<projet>-<page>-<disposition>-<langue>-<theme>.png ──

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["clair", "sombre"] as const) {
    test(`captures — ${langue}, ${theme} : page du chant et mode louange, chaque disposition du menu`, async ({ page }, info) => {
      const dossier = "test-results/dispositions";
      const slug = langue === "zh" ? CHANT_ZH : CHANT_FR;
      await page.emulateMedia({ colorScheme: theme === "sombre" ? "dark" : "light" });
      await page.addInitScript(([zh, sombre]) => {
        if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique");
        localStorage.setItem("perf-role-preset", "pianiste");
        localStorage.setItem("perf-theme", sombre ? "dark" : "light");
        if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      }, [langue === "zh", theme === "sombre"] as const);
      const slugsLouange = langue === "zh" ? LOUANGE_ZH : LOUANGE_FR;
      await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugsLouange) }, `/songs/${encodeURIComponent(slug)}`);
      await expect(page.locator("main [data-disposition]").first()).toBeAttached();
      const nomMenu = langue === "zh" ? "更多操作" : "Plus d'actions";
      for (const d of ["classique", "sections"]) {
        await page.getByRole("button", { name: nomMenu }).click();
        await page.getByRole("menuitemradio").nth(d === "classique" ? 0 : 1).click();
        await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", d);
        // Menu ouvert, puis page seule.
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-menu-${d}-${langue}-${theme}.png` });
        await page.keyboard.press("Escape");
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-${d}-${langue}-${theme}.png` });
      }
      await page.goto(`/setlists/${SETLIST_ID}`);
      await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
      await attendreMiseEnPage(page);
      const l: Langue = langue;
      for (const d of ["classique", "sections"]) {
        const options = await ouvrirOptions(page, l);
        await options.getByRole("radio").nth(d === "classique" ? 0 : 1).click();
        await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", d);
        await page.screenshot({ path: `${dossier}/${info.project.name}-louange-options-${d}-${langue}-${theme}.png` });
        await page.keyboard.press("Escape");
        await expect(options).toBeHidden();
        await attendreMiseEnPage(page);
        await page.screenshot({ path: `${dossier}/${info.project.name}-louange-${d}-${langue}-${theme}.png` });
      }
    });
  }
}
