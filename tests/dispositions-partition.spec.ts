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
const NOMS: Record<string, string> = { classique: "Classique", sections: "Couleurs par section", reperes: "Repères", scene: "Scène", partition: "Partition" };
// Ordre du menu (les libellés changent avec la langue : la capture vise par rang).
const ORDRE = ["classique", "sections", "reperes", "scene", "partition"];

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
    await expect(page.getByRole("menuitemradio")).toHaveText([/Classique/, /Couleurs par section/, /Repères/, /Scène/, /Partition/]);
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
  for (const d of ["partition", "scene", "reperes", "sections", "classique"]) {
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
      test.slow(); // cinq dispositions, deux pages
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
      for (const d of ORDRE) {
        await page.getByRole("button", { name: nomMenu }).click();
        await page.getByRole("menuitemradio").nth(ORDRE.indexOf(d)).click();
        await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", d);
        // Menu ouvert, puis page seule.
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-menu-${d}-${langue}-${theme}.png` });
        await page.keyboard.press("Escape");
        // Attendre la FIN de la fermeture du menu avant la capture de la page.
        await expect(page.getByRole("menu")).toBeHidden();
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-${d}-${langue}-${theme}.png` });
      }
      await page.goto(`/setlists/${SETLIST_ID}`);
      await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
      await attendreMiseEnPage(page);
      const l: Langue = langue;
      for (const d of ORDRE) {
        const options = await ouvrirOptions(page, l);
        await options.getByRole("radio").nth(ORDRE.indexOf(d)).click();
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

// ─── (f) Repères (DP-B) : pastille, filet, gouttière, contraste, structure seule ─────────────────────────────────

const telephone = (page: Page) => page.viewportSize()!.width < 768;
const reperes = (page: Page) => page.addInitScript(() => {
  if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "reperes");
  localStorage.setItem("jianpu-sheet-pref", "never"); // les paroles, pas le scan 简谱
});

for (const [langue, slug] of [["FR", CHANT_FR], ["ZH", CHANT_ZH]] as const) {
  test(`${langue} : Repères sur la page du chant, pas d'intitulé, une pastille par section, filets, gouttière`, async ({ page }) => {
    await reperes(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const sections = page.locator("main [data-section]");
    await expect(sections.first()).toBeVisible();
    const n = await sections.count();
    expect(n).toBeGreaterThan(1);
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "reperes");
    // Aucune section hors Repères, aucune rangée d'intitulé « — COUPLET 1 ».
    await expect(page.locator("main [data-section]:not([data-repere])")).toHaveCount(0);
    await expect(page.locator("main [data-section] .uppercase")).toHaveCount(0);
    await expect(page.locator("main [data-repere-pastille]")).toHaveCount(n);

    const lignes = await sections.evaluateAll((els) => els.map((el) => {
      const p = el.querySelector("[data-repere-pastille]") as HTMLElement;
      const g = el.querySelector("[data-repere-gouttiere]") as HTMLElement;
      const f = el.querySelector("[data-repere-filet]") as HTMLElement | null;
      return {
        sigle: el.querySelector("[data-repere-sigle]")!.textContent!,
        titre: p.getAttribute("title")!,
        lecteur: p.querySelector(".sr-only")!.textContent!,
        pastille: Math.round(p.getBoundingClientRect().height),
        gouttiere: Math.round(g.getBoundingClientRect().width),
        filet: f ? Math.round(f.getBoundingClientRect().width) : 0,
        filetHaut: f ? f.getBoundingClientRect().height : 0,
        copie: g.hasAttribute("data-copy-ignore"),
      };
    }));
    for (const l of lignes) {
      expect(l.sigle.length, "sigle").toBeGreaterThan(0);
      expect(l.titre, "title = nom complet").toBe(l.lecteur);
      expect(l.titre.length, "nom complet plus long que le sigle ou égal").toBeGreaterThanOrEqual(l.sigle.length);
      expect(l.copie, "gouttière hors copie").toBe(true);
      expect(l.pastille, "hauteur de pastille").toBe(telephone(page) ? 24 : 32);
      expect(l.filetHaut, "filet visible").toBeGreaterThan(8);
      if (l.sigle.length <= 2) expect(l.gouttiere, "gouttière").toBe(telephone(page) ? 36 : 44);
    }
    // Refrain (R, R1, R2…) : filet de 5 px ; couplet (C…) et intro : 3 px.
    const refrains = lignes.filter((l) => /^R\d*$/.test(l.sigle));
    const couplets = lignes.filter((l) => /^C\d*$/.test(l.sigle));
    expect(refrains.length, "un refrain").toBeGreaterThan(0);
    expect(couplets.length, "un couplet").toBeGreaterThan(0);
    for (const l of refrains) expect(l.filet, "filet du refrain").toBe(5);
    for (const l of couplets) expect(l.filet, "filet du couplet").toBe(3);
    expect(Math.max(...refrains.map((l) => l.filet))).toBeGreaterThan(Math.max(...couplets.map((l) => l.filet)));

    // Aucun débordement horizontal de la page.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
  });

  test(`${langue} : Repères, contraste du sigle sur la pastille, clair et sombre (AA)`, async ({ page }) => {
    await reperes(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await expect(page.locator("main [data-repere-pastille]").first()).toBeVisible();
    for (const sombre of [false, true]) {
      await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
      const ratios = await page.locator("main [data-repere-pastille]").evaluateAll((els) => {
        const lum = (css: string) => {
          const c = document.createElement("canvas").getContext("2d")!;
          c.fillStyle = "#000"; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
          const [r, g, b] = Array.from(c.getImageData(0, 0, 1, 1).data).slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        return els.map((el) => {
          const cs = getComputedStyle(el);
          const a = lum(cs.backgroundColor), b = lum(cs.color);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
      for (const r of ratios) expect(r, `contraste ${sombre ? "sombre" : "clair"}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test("Repères : la pastille ouvre une bulle avec le nom complet, fermée par Échap ou un toucher ailleurs", async ({ page }) => {
  await reperes(page);
  await page.goto(`/songs/${CHANT_FR}`);
  const pastille = page.locator("main [data-repere-pastille]").first();
  await expect(pastille).toBeVisible();
  const nom = (await pastille.getAttribute("title"))!;
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
  await pastille.click();
  await expect(page.locator("[data-repere-bulle]")).toHaveText(nom);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
  await pastille.click();
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
  await page.mouse.click(1, 1);
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
});

test("Repères : le mode louange garde ses deux colonnes sur grand écran (data-disposition = reperes)", async ({ page }) => {
  const grand = await page.evaluate(
    (q) => matchMedia(q).matches,
    "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
  );
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1");
    localStorage.setItem("disposition", "reperes");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", "reperes");
  await expect(onStage(page, "[data-repere]").first()).toBeVisible();
  await expect(onStage(page, "[data-section]:not([data-repere])")).toHaveCount(0);
  if (!grand) return;
  const gauches = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(gauches.map((x) => Math.round(x / 8))).size, "deux colonnes").toBe(2);
});

test("Repères : Structure seule (batteur, mode louange) reste la feuille de route, repère et nom côte à côte", async ({ page }) => {
  // Pour le batteur, la structure est la feuille de route (FS-D) quelle que soit la disposition : pas de pastille Repères.
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "batteur");
    localStorage.setItem("disposition", "reperes");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(LOUANGE_FR) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "[data-repere]")).toHaveCount(0);
  const repere = onStage(page, "[data-feuille-route-repere]").first();
  await expect(repere).toBeVisible();
  const texte = onStage(page, "[data-feuille-route-nom]").first();
  await expect(texte).toBeVisible();
  await expect(texte).not.toHaveText("");
  const [p, t] = await Promise.all([repere.boundingBox(), texte.boundingBox()]);
  expect(t!.x, "le nom à droite du repère").toBeGreaterThanOrEqual(p!.x + p!.width);
  expect(Math.abs(t!.y + t!.height / 2 - (p!.y + p!.height / 2)), "sur la même ligne").toBeLessThanOrEqual(p!.height);
});

// ─── (g) Scène (DP-C) : bande teintée, grande lettre, nom dessous, contraste, pleine largeur ─────────────────────

const scene = (page: Page) => page.addInitScript(() => {
  if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "scene");
  localStorage.setItem("jianpu-sheet-pref", "never");
});

for (const [langue, slug] of [["FR", CHANT_FR], ["ZH", CHANT_ZH]] as const) {
  test(`${langue} : Scène sur la page du chant, une bande par section, fond = teinte du type, lettre = abréviation, pas d'intitulé`, async ({ page }) => {
    await scene(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const bandes = page.locator("main [data-section]");
    await expect(bandes.first()).toBeVisible();
    const n = await bandes.count();
    expect(n).toBeGreaterThan(1);
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "scene");
    await expect(page.locator("main [data-section]:not([data-scene])")).toHaveCount(0);
    await expect(page.locator("main [data-section] .uppercase")).toHaveCount(0);
    await expect(page.locator("main [data-scene-lettre]")).toHaveCount(n);

    const lignes = await bandes.evaluateAll((els) => {
      // Couleur calculée d'une variable de la palette (le canevas ne résout pas var()).
      const rgb = (el: Element, css: string) => {
        const sonde = document.createElement("span");
        sonde.style.color = css;
        el.appendChild(sonde);
        const c = getComputedStyle(sonde).color;
        sonde.remove();
        return c;
      };
      return els.map((el) => {
        const cs = getComputedStyle(el);
        const col = el.querySelector("[data-scene-colonne]") as HTMLElement;
        const lettre = el.querySelector("[data-scene-lettre]") as HTMLElement;
        const filet = cs.borderLeftColor;
        const palette = ["intro", "verse", "prechorus", "chorus", "bridge", "outro", "coda", "other"].map((t) => ({
          t,
          couleur: rgb(el, `var(--sec-${t})`),
          teinte: rgb(el, `var(--sec-${t}-tint)`),
        }));
        const type = palette.find((p) => p.couleur === filet);
        return {
          fond: cs.backgroundColor,
          teinte: type?.teinte ?? null,
          filetLarg: parseFloat(cs.borderLeftWidth),
          lettre: lettre.textContent!,
          titre: col.getAttribute("title")!,
          lecteur: col.querySelector(".sr-only")!.textContent!,
          copie: col.hasAttribute("data-copy-ignore"),
          largeur: Math.round(col.getBoundingClientRect().width),
          tailleLettre: parseFloat(getComputedStyle(lettre).fontSize),
        };
      });
    });
    for (const l of lignes) {
      expect(l.teinte, "type reconnu").not.toBeNull();
      expect(l.fond, "fond = teinte de son type").toBe(l.teinte);
      expect(l.filetLarg, "filet").toBe(4);
      expect(l.lettre.length).toBeGreaterThan(0);
      expect(l.lettre, "capitales").toBe(l.lettre.toUpperCase());
      expect(l.titre).toBe(l.lecteur);
      expect(l.copie, "colonne hors copie").toBe(true);
      expect(l.largeur, "colonne").toBe(telephone(page) ? 44 : 56);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
  });

  test(`${langue} : Scène, contraste de la lettre et du nom sur la teinte, clair et sombre (AA)`, async ({ page }) => {
    await scene(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await expect(page.locator("main [data-scene-lettre]").first()).toBeVisible();
    for (const sombre of [false, true]) {
      await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
      const ratios = await page.locator("main [data-scene]").evaluateAll((els) => {
        const lum = (css: string) => {
          const c = document.createElement("canvas").getContext("2d")!;
          c.fillStyle = "#000"; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
          const [r, g, b] = Array.from(c.getImageData(0, 0, 1, 1).data).slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const rapport = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        return els.flatMap((el) => {
          const fond = lum(getComputedStyle(el).backgroundColor);
          const out: { quoi: string; r: number }[] = [];
          for (const [sel, quoi] of [["[data-scene-lettre]", "lettre"], ["[data-scene-nom]", "nom"]] as const) {
            const e = el.querySelector(sel);
            if (e) out.push({ quoi, r: rapport(lum(getComputedStyle(e).color), fond) });
          }
          return out;
        });
      });
      expect(ratios.some((x) => x.quoi === "nom"), "des noms mesurés").toBe(true);
      for (const x of ratios) expect(x.r, `contraste ${x.quoi} ${sombre ? "sombre" : "clair"}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test("Scène : une bande remplit son conteneur (de bord à bord, sans arrondi), lettre ≈ 1,6 fois le texte", async ({ page }) => {
  await scene(page);
  await page.goto(`/songs/${CHANT_FR}`);
  const bande = page.locator("main [data-scene]").first();
  await expect(bande).toBeVisible();
  const m = await bande.evaluate((el) => {
    const r = el.getBoundingClientRect(), p = el.parentElement!.getBoundingClientRect();
    return { g: r.left - p.left, d: p.right - r.right, rayon: getComputedStyle(el).borderTopLeftRadius, boite: getComputedStyle(el).boxShadow };
  });
  expect(Math.abs(m.g), "bord gauche").toBeLessThanOrEqual(1);
  expect(Math.abs(m.d), "bord droit").toBeLessThanOrEqual(1);
  expect(m.rayon).toBe("0px");
  const tailles = await page.evaluate(() => ({
    lettre: parseFloat(getComputedStyle(document.querySelector("main [data-scene-lettre]")!).fontSize),
    texte: (() => {
      const sonde = document.createElement("span");
      sonde.style.fontSize = "var(--lyric-size)";
      document.body.appendChild(sonde);
      const t = parseFloat(getComputedStyle(sonde).fontSize);
      sonde.remove();
      return t;
    })(),
  }));
  expect(tailles.lettre / tailles.texte).toBeGreaterThan(1.5);
  expect(tailles.lettre / tailles.texte).toBeLessThan(1.7);
});

test("Scène : le mode louange garde ses deux colonnes sur grand écran (data-disposition = scene), bandes pleine colonne", async ({ page }) => {
  const grand = await page.evaluate(
    (q) => matchMedia(q).matches,
    "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
  );
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1");
    localStorage.setItem("disposition", "scene");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", "scene");
  await expect(onStage(page, "[data-scene]").first()).toBeVisible();
  await expect(onStage(page, "[data-section]:not([data-scene])")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
  if (!grand) return;
  const gauches = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(gauches.map((x) => Math.round(x / 8))).size, "deux colonnes").toBe(2);
});

// ─── (h) Partition (DP-D) : page gravée, repères encadrés, en-tête en serif ──────────────────────────────────────

const partition = (page: Page) => page.addInitScript(() => {
  if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "partition");
  localStorage.setItem("jianpu-sheet-pref", "never");
});
const GRAND_ECRAN = "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";

for (const [langue, slug] of [["FR", CHANT_FR], ["ZH", CHANT_ZH]] as const) {
  test(`${langue} : Partition sur la page du chant, sans fond ni cadre, repère encadré de la couleur du type, nom en casse normale, en-tête du site inchangé`, async ({ page }) => {
    await partition(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const sections = page.locator("main [data-section]");
    await expect(sections.first()).toBeVisible();
    const n = await sections.count();
    expect(n).toBeGreaterThan(1);
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "partition");
    await expect(page.locator("main [data-section]:not([data-partition])")).toHaveCount(0);
    await expect(page.locator("main [data-section] .uppercase")).toHaveCount(0);

    // Les couleurs attendues viennent de la palette du document, pas de l'élément mesuré.
    const lignes = await sections.evaluateAll((els) => {
      const rgb = (css: string) => {
        const sonde = document.createElement("span");
        sonde.style.color = css;
        document.body.appendChild(sonde);
        const c = getComputedStyle(sonde).color;
        sonde.remove();
        return c;
      };
      const racine = getComputedStyle(document.documentElement);
      const type = (t: string) => rgb(racine.getPropertyValue(`--sec-${t}`).trim());
      const palette = ["intro", "verse", "prechorus", "chorus", "bridge", "outro", "coda", "other"].map(type);
      return els.map((el) => {
        const cs = getComputedStyle(el);
        const r = el.querySelector("[data-repere-encadre]") as HTMLElement;
        const rs = getComputedStyle(r);
        const nom = el.querySelector("[data-partition-nom]") as HTMLElement;
        const sigle = r.textContent!.trim();
        const attendu = /^C\d*$/.test(sigle) ? type("verse") : /^R\d*$/.test(sigle) ? type("chorus") : /^PR\d*$/.test(sigle) ? type("prechorus") : /^I\d*$/.test(sigle) ? type("intro") : null;
        return {
          sigle,
          fond: cs.backgroundColor,
          bordure: ["Top", "Right", "Bottom", "Left"].map((c) => parseFloat(cs.getPropertyValue(`border-${c.toLowerCase()}-width`))).reduce((a, b) => a + b, 0),
          ombre: cs.boxShadow,
          repereBord: rs.borderTopColor,
          repereLarg: parseFloat(rs.borderTopWidth),
          repereHaut: Math.round(r.getBoundingClientRect().height),
          encre: rs.color,
          foreground: rgb("hsl(var(--foreground))"),
          dansPalette: palette.includes(rs.borderTopColor),
          attendu,
          titre: r.getAttribute("title")!,
          nom: nom.textContent!.trim(),
          casse: getComputedStyle(nom).textTransform,
          copie: !!el.querySelector("[data-partition-rangee][data-copy-ignore]"),
          retrait: Math.round((el.querySelector("[data-partition-rangee] + div") as HTMLElement | null)?.getBoundingClientRect().left ?? el.getBoundingClientRect().left) - Math.round(el.getBoundingClientRect().left),
        };
      });
    });
    for (const l of lignes) {
      expect(l.fond, "aucun fond de section").toBe("rgba(0, 0, 0, 0)");
      expect(l.bordure, "aucun cadre de section").toBe(0);
      expect(l.ombre).toBe("none");
      expect(l.dansPalette, `cadre du repère ${l.sigle} dans la palette`).toBe(true);
      if (l.attendu) expect(l.repereBord, `cadre du repère ${l.sigle}`).toBe(l.attendu);
      // 1,5 px à l'écran des téléphones ; Chromium l'arrondit à 1 px en pixel physique entier.
      expect(l.repereLarg, "cadre fin").toBeGreaterThanOrEqual(1);
      expect(l.repereLarg).toBeLessThanOrEqual(1.5);
      expect(l.repereHaut, "hauteur du repère").toBeGreaterThanOrEqual(22);
      expect(l.repereHaut).toBeLessThanOrEqual(26);
      expect(l.encre, "lettre à l'encre").toBe(l.foreground);
      expect(l.titre.length, "nom complet en title").toBeGreaterThan(0);
      expect(l.nom.length).toBeGreaterThan(0);
      expect(l.casse, "casse normale").toBe("none");
      if (langue === "FR") expect(l.nom, "pas de capitales").not.toBe(l.nom.toUpperCase());
      expect(l.copie, "rangée hors copie").toBe(true);
      expect(l.retrait, "corps sans retrait").toBe(0);
    }
    // Le bandeau de structure porte des repères encadrés, plus de pastilles rondes.
    const bandeau = page.locator("main ol [data-repere-encadre]");
    await expect(bandeau.first()).toBeVisible();
    expect(await bandeau.first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toMatch(/^(9999|\d{3,})/);

    // L'en-tête du site reste tel quel : titre H1, pas d'en-tête Partition, pas de Gelasio.
    await expect(page.locator("main [data-entete-partition]")).toHaveCount(0);
    const h1 = page.locator("main h1:visible").first();
    await expect(h1).toBeVisible();
    expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/gelasio/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
  });

  test(`${langue} : Partition, contraste du nom de section sur la page, clair et sombre (AA)`, async ({ page }) => {
    await partition(page);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await expect(page.locator("main [data-partition-nom]").first()).toBeVisible();
    for (const sombre of [false, true]) {
      await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
      const ratios = await page.locator("main [data-partition-nom]").evaluateAll((els) => {
        const rgb = (css: string) => {
          const sonde = document.createElement("span");
          sonde.style.color = css;
          document.body.appendChild(sonde);
          const c = getComputedStyle(sonde).color;
          sonde.remove();
          return c;
        };
        const lum = (css: string) => {
          const [r, g, b] = (rgb(css).match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => { const x = Number(v) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const fond = lum("hsl(var(--background))");
        return els.map((el) => { const a = lum(getComputedStyle(el).color); return (Math.max(a, fond) + 0.05) / (Math.min(a, fond) + 0.05); });
      });
      for (const r of ratios) expect(r, `contraste du nom ${sombre ? "sombre" : "clair"}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test("Partition : la vue partitions de la setlist, titre du chant en Gelasio centré, repères encadrés en tête, sans débordement", async ({ page }) => {
  await partition(page);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(LOUANGE_FR) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.locator("[data-disposition]").first()).toHaveAttribute("data-disposition", "partition");
  const entete = page.locator("[data-entete-partition]").first();
  await expect(entete).toBeVisible();
  const titre = entete.locator("[data-titre-partition]");
  const style = await titre.evaluate((el) => ({ f: getComputedStyle(el).fontFamily, a: getComputedStyle(el).textAlign, w: getComputedStyle(el).fontWeight }));
  expect(style.f).toMatch(/gelasio/i);
  expect(style.a).toBe("center");
  expect(Number(style.w)).toBeGreaterThanOrEqual(700);
  await expect(entete.locator("[data-partition-compositeur]")).toBeVisible();
  await expect(entete.locator("[data-partition-tempo]")).toBeVisible();
  // La feuille de route (repères encadrés) suit l'en-tête, avant les sections.
  await expect(page.locator("[data-repere-encadre]:not([data-section] *)").first()).toBeVisible();
  await expect(page.locator("[data-section]:not([data-partition])")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
});

test("Partition : le mode louange (data-disposition = partition), en-tête en serif centré, repères encadrés, deux colonnes sur grand écran", async ({ page }) => {
  const grand = await page.evaluate((q) => matchMedia(q).matches, GRAND_ECRAN);
  await page.addInitScript(() => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1");
    localStorage.setItem("disposition", "partition");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", "partition");
  await expect(onStage(page, "[data-partition]").first()).toBeVisible();
  await expect(onStage(page, "[data-section]:not([data-partition])")).toHaveCount(0);
  // Barre de titre ouverte : le titre est masqué sans changer de place ; on mesure sa mise en forme, présente dans le DOM.
  const titre = onStage(page, "[data-entete-partition] [data-titre-partition]").first();
  await expect(titre).toBeAttached();
  const style = await titre.evaluate((el) => ({ f: getComputedStyle(el).fontFamily, a: getComputedStyle(el).textAlign }));
  expect(style.f).toMatch(/gelasio/i);
  expect(style.a).toBe("center");
  await expect(onStage(page, "[data-entete-partition] [data-repere-encadre]").first()).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "débordement horizontal").toBeLessThanOrEqual(0);
  if (!grand) return;
  const gauches = await onStage(page, "[data-section]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(gauches.map((x) => Math.round(x / 8))).size, "deux colonnes").toBe(2);
});
