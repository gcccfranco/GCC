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
        // Sans le scan 简谱 : la disposition se voit en chinois (par défaut la page montre le scan de la partition).
        localStorage.setItem("jianpu-sheet-pref", "never");
        // DP-F : la bulle d'aide « Touche un accord… » est déjà vue (clé de AccordsProvider) : elle couvrait l'onglet actif.
        localStorage.setItem("accords-aide-vue", "1");
      }, [langue === "zh", theme === "sombre"] as const);
      // DP-F : l'indicateur de Next en développement recouvre des paroles sur les captures.
      const masquerNext = () => page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      const slugsLouange = langue === "zh" ? LOUANGE_ZH : LOUANGE_FR;
      await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugsLouange) }, `/songs/${encodeURIComponent(slug)}`);
      await expect(page.locator("main [data-disposition]").first()).toBeAttached();
      await masquerNext();
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
      await masquerNext();
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
      // DP-F : barre fermée, en Partition (dernière disposition de la boucle) : l'en-tête gravé se voit.
      if (await page.locator("[data-barre-ouverte]").count()) {
        const ecran = page.viewportSize()!;
        await page.mouse.click(ecran.width / 2, ecran.height / 2);
        await expect(page.locator("[data-barre-ouverte]")).toHaveCount(0);
        await expect(page.locator("[data-barre-haut]").locator("xpath=..")).toHaveCSS("opacity", "0");
      }
      await masquerNext();
      await page.screenshot({ path: `${dossier}/${info.project.name}-louange-ferme-partition-${langue}-${theme}.png` });
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
        // DP-E : mêmes cotes pour toutes les sections d'un chant, sigle dans la pastille, filet recentré, cible de 44 px.
        largeurPastille: Math.round(p.getBoundingClientRect().width),
        sigleLarg: (el.querySelector("[data-repere-sigle]") as HTMLElement).getBoundingClientRect().width,
        tailleSigle: parseFloat(getComputedStyle(el.querySelector("[data-repere-sigle]")!).fontSize),
        debutTexte: Math.round((g.nextElementSibling as HTMLElement).getBoundingClientRect().left),
        ecartFilet: f ? Math.round((g.nextElementSibling as HTMLElement).getBoundingClientRect().left - f.getBoundingClientRect().right) : null,
        decentre: f ? Math.abs(f.getBoundingClientRect().left + f.getBoundingClientRect().width / 2 - (p.getBoundingClientRect().left + p.getBoundingClientRect().width / 2)) : 0,
        cible: [getComputedStyle(p, "::before").width, getComputedStyle(p, "::before").height],
        expanded: p.hasAttribute("aria-expanded"),
      };
    }));
    for (const l of lignes) {
      expect(l.sigle.length, "sigle").toBeGreaterThan(0);
      expect(l.titre, "title = nom complet").toBe(l.lecteur);
      expect(l.titre.length, "nom complet plus long que le sigle ou égal").toBeGreaterThanOrEqual(l.sigle.length);
      expect(l.copie, "gouttière hors copie").toBe(true);
      expect(l.pastille, "hauteur de pastille").toBe(telephone(page) ? 24 : 38);
      expect(l.largeurPastille, "largeur de pastille, fixe").toBe(telephone(page) ? 24 : 44);
      // Dès la tablette un filet n'existe que s'il couvre 24 px au moins (jamais un bout isolé) ; au téléphone il longe la pastille.
      if (telephone(page)) expect(l.filetHaut, "filet visible").toBeGreaterThan(8);
      else expect(l.filetHaut === 0 || l.filetHaut >= 24, `filet de ${l.filetHaut} px`).toBe(true);
      expect(l.gouttiere, "gouttière fixe").toBe(telephone(page) ? 36 : 56);
      expect(l.sigleLarg, "sigle dans la pastille").toBeLessThanOrEqual(l.largeurPastille);
      if (l.sigle.length <= 2) expect(l.tailleSigle, "corps du sigle").toBe(telephone(page) ? 14 : 21);
      else expect(l.tailleSigle, "sigle long, corps réduit").toBe(telephone(page) ? 11 : 15);
      expect(l.cible, "cible de toucher de 44 × 44").toEqual(["44px", "44px"]);
      expect(l.expanded, "pas d'aria-expanded").toBe(false);
      if (telephone(page) && l.filet) expect(l.ecartFilet, "texte à 6 px du filet").toBe(6);
      if (!telephone(page) && l.filet) expect(l.decentre, "filet centré sous la pastille").toBeLessThanOrEqual(1);
    }
    expect(new Set(lignes.map((l) => l.debutTexte)).size, "même début de texte pour toutes les sections").toBe(1);
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
          lettreLarg: lettre.scrollWidth,
          colLarg: col.clientWidth,
          nomAffiche: (() => { const nom = el.querySelector("[data-scene-nom]"); return nom ? getComputedStyle(nom).display !== "none" : null; })(),
          separation: [cs.borderBottomWidth, cs.borderBottomStyle],
        };
      });
    });
    for (const l of lignes) {
      expect(l.teinte, "type reconnu").not.toBeNull();
      expect(l.fond, "fond = teinte de son type").toBe(l.teinte);
      expect(l.filetLarg, "filet").toBe(6);
      expect(l.lettre.length).toBeGreaterThan(0);
      expect(l.titre).toBe(l.lecteur);
      expect(l.copie, "colonne hors copie").toBe(true);
      expect(l.largeur, "colonne").toBe(telephone(page) ? 40 : 64);
      expect(l.lettreLarg, "lettre dans la colonne").toBeLessThanOrEqual(l.colLarg);
      expect(l.separation, "filet de 1 px entre deux bandes").toEqual(["1px", "solid"]);
      // Nom de section : caché sous la tablette, lisible au toucher de la lettre ; dès la tablette coupé aux espaces seulement.
      if (l.nomAffiche !== null) expect(l.nomAffiche, "nom de section").toBe(!telephone(page));
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

test("Scène : une bande remplit la page (de bord à bord, sans arrondi), lettre de 26 px au téléphone, 32 px dès la tablette", async ({ page }) => {
  await scene(page);
  await page.goto(`/songs/${CHANT_FR}`);
  const bande = page.locator("main [data-scene]").first();
  await expect(bande).toBeVisible();
  // Pleine largeur : la bande sort du remplissage de la page (px-4) et va d'un bord de la page à l'autre.
  const m = await bande.evaluate((el) => {
    const r = el.getBoundingClientRect(), p = el.closest("main")!.getBoundingClientRect();
    return { g: r.left - p.left, d: p.right - r.right, rayon: getComputedStyle(el).borderTopLeftRadius, boite: getComputedStyle(el).boxShadow };
  });
  expect(Math.abs(m.g), "bord gauche").toBeLessThanOrEqual(1);
  expect(Math.abs(m.d), "bord droit").toBeLessThanOrEqual(1);
  expect(m.rayon).toBe("0px");
  const lettre = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("main [data-scene-lettre]")!).fontSize));
  expect(lettre).toBe(telephone(page) ? 26 : 32);
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

// ─── (h) DP-E : corrections de relecture et finitions ────────────────────────────────────────────────────────────


test("A : menu ⋯ du chant, cinq colonnes égales, entrée choisie marquée (cadre 2 px, gras, bleu), pas de fond gris de focus", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
  await page.goto(`/songs/${CHANT_FR}`);
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  const entrees = page.getByRole("menuitemradio");
  await expect(entrees).toHaveCount(5);
  await page.waitForTimeout(400); // fin de l'animation d'ouverture du menu
  const m = await entrees.evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    const mini = el.querySelector("svg.block") as SVGElement;
    const nom = el.lastElementChild as HTMLElement;
    return { x: r.left, y: Math.round(r.top), w: Math.round(r.width), svgW: Math.round(mini.getBoundingClientRect().width), svgH: Math.round(mini.getBoundingClientRect().height), nomH: Math.round(nom.getBoundingClientRect().height), poids: getComputedStyle(nom).fontWeight, couleur: getComputedStyle(nom).color, ombre: getComputedStyle(mini.parentElement!).boxShadow, coche: el.getAttribute("aria-checked") };
  }));
  expect(new Set(m.map((e) => e.y)).size, "une seule rangée de cinq").toBe(1);
  expect(Math.max(...m.map((e) => e.w)) - Math.min(...m.map((e) => e.w)), "colonnes égales").toBeLessThanOrEqual(1);
  expect(new Set(m.map((e) => e.nomH)).size, "noms à hauteur égale " + JSON.stringify(m.map((e) => e.nomH))).toBe(1);
  for (const e of m) { expect(e.svgW, "miniature de 64 px " + JSON.stringify(m.map((x) => [x.w, x.svgW]))).toBe(64); expect(e.svgH).toBe(82); }
  const menu = (await page.getByRole("menu").boundingBox())!;
  expect(menu.x).toBeGreaterThanOrEqual(0);
  expect(menu.x + menu.width, "menu ≤ 100vw − 1 rem").toBeLessThanOrEqual(page.viewportSize()!.width - 8);
  const choisie = m.find((e) => e.coche === "true")!;
  const autre = m.find((e) => e.coche === "false")!;
  expect(choisie.poids).toBe("700");
  expect(autre.poids, "nom non choisi en encre medium").toBe("500");
  expect(choisie.ombre, "cadre de 2 px").toMatch(/0px 0px 0px 2px|2px/);
  expect(autre.ombre).toBe("none");
  const accent = await page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--chord-color)"; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  expect(choisie.couleur, "nom choisi dans l'accent bleu").toBe(accent);
  expect(choisie.ombre).toContain(accent);
  // Le survol et le focus ne posent aucun fond gris.
  await entrees.nth(2).hover();
  expect(await entrees.nth(2).evaluate((el) => getComputedStyle(el).backgroundColor), "pas de fond gris").toBe("rgba(0, 0, 0, 0)");
});

for (const [langue, slug, variable] of [["FR", CHANT_FR, "--fr-accent"], ["ZH", CHANT_ZH, "--zh-accent"]] as const) {
  test(`A : ${langue}, la miniature Classique prend l'accent de la langue du chant (${variable}), couplet sans cadre, refrain en boîte`, async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await page.getByRole("button", { name: /Plus d'actions|更多操作/ }).click();
    const mini = page.getByRole("menuitemradio").first().locator("svg.block");
    await expect(mini).toBeVisible();
    const fills = await mini.locator("rect").evaluateAll((els) => els.map((e) => e.getAttribute("fill")));
    expect(fills.some((f) => f === `var(${variable})`), `accent ${variable}`).toBe(true);
    const autre = variable === "--fr-accent" ? "--zh-accent" : "--fr-accent";
    expect(fills.some((f) => f === `var(${autre})`), "pas l'autre accent").toBe(false);
  });
}

test("A : Options du mode louange, cinq colonnes égales sur une rangée, miniatures qui remplissent leur colonne sans déborder, anneau de focus clavier", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("disposition", "classique"); });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(LOUANGE_FR) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const options = await ouvrirOptions(page);
  const radios = options.locator('[role=radiogroup][aria-labelledby="perf-disposition"]').getByRole("radio");
  await expect(radios).toHaveCount(5);
  const m = await radios.evaluateAll((els) => els.map((el) => ({ y: Math.round(el.getBoundingClientRect().top), w: Math.round(el.getBoundingClientRect().width), svg: Math.round(el.querySelector("svg.block")!.getBoundingClientRect().width), nomH: Math.round((el.lastElementChild as HTMLElement).getBoundingClientRect().height) })));
  expect(new Set(m.map((e) => e.y)).size, "une seule rangée").toBe(1);
  expect(Math.max(...m.map((e) => e.w)) - Math.min(...m.map((e) => e.w)), "colonnes égales").toBeLessThanOrEqual(1);
  expect(new Set(m.map((e) => e.nomH)).size, JSON.stringify(m)).toBe(1);
  // Miniature de 80 px au plus, réduite à la largeur de sa colonne (≈ 71 px dans le panneau d'environ 26 rem) : jamais de débordement sur la voisine.
  for (const e of m) {
    expect(e.svg, "miniature dans sa colonne").toBeLessThanOrEqual(e.w);
    expect(e.svg, "miniature lisible").toBeGreaterThanOrEqual(60);
    expect(e.svg, "miniature de 80 px au plus").toBeLessThanOrEqual(80);
  }
  // Focus clavier : les flèches choisissent l'entrée voisine et y posent l'anneau des ronds de la page.
  await radios.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  const focus = radios.nth(1);
  await expect(focus).toBeFocused();
  expect(await focus.evaluate((el) => getComputedStyle(el).boxShadow), "anneau focus-visible").not.toBe("none");
});

test("C1 : en Scène les accords sont bleus en chinois comme en français, clair et sombre ; Repères garde la couleur de la langue", async ({ page }) => {
  const couleurAccord = async (slug: string, disposition: string, sombre: boolean) => {
    await page.addInitScript((d) => { localStorage.setItem("disposition", d); localStorage.setItem("jianpu-sheet-pref", "never"); }, disposition);
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    // La page est rendue côté serveur en Classique : attendre la disposition lue après montage avant de lire la couleur.
    await expect(page.locator(`main [data-disposition="${disposition}"]`).first()).toBeAttached();
    await page.evaluate((s) => document.documentElement.classList.toggle("dark", s), sombre);
    const accord = page.locator("main [data-accord], main [data-section] .font-chord").first();
    await expect(accord).toBeVisible();
    return page.evaluate(() => {
      const el = document.querySelector("main [data-accord], main [data-section] .font-chord") as HTMLElement;
      const s = document.createElement("span"); s.style.color = "var(--chord-color)"; document.body.appendChild(s);
      const bleu = getComputedStyle(s).color; s.remove();
      return { accord: getComputedStyle(el).color, bleu };
    });
  };
  for (const sombre of [false, true]) {
    for (const slug of [CHANT_FR, CHANT_ZH]) {
      const c = await couleurAccord(slug, "scene", sombre);
      expect(c.accord, `accord de ${slug} en Scène (${sombre ? "sombre" : "clair"})`).toBe(c.bleu);
    }
  }
  const rouge = await couleurAccord(CHANT_ZH, "reperes", false);
  expect(rouge.accord, "Repères : accord chinois dans la couleur de la langue").not.toBe(rouge.bleu);
});

test("B2 : le changement de ton (升调) se voit en Repères, sur la section qui monte", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("disposition", "reperes"); localStorage.setItem("jianpu-sheet-pref", "never"); });
  const avecTon = { ...setlist([]), items: [{ ...item("一生爱你", 1), sectionKeys: { "chorus-3": "F#" } }] };
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: avecTon }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  const montee = page.locator("[data-repere]").filter({ hasText: /\(F#\)/ });
  await expect(montee.first()).toBeVisible();
  // Une seule fois par section (pas répété dans le nom).
  await expect(montee.first().locator("span.font-semibold", { hasText: /F#/ })).toHaveCount(1);
});

test("B3 B5 : Repères, Abba Père, même début de texte pour toutes les sections, sigles dans la pastille, section d'une rangée sans vide", async ({ page }) => {
  await reperes(page);
  await page.goto("/songs/abba-pere");
  const sections = page.locator("main [data-repere]");
  await expect(sections.first()).toBeVisible();
  const lignes = await sections.evaluateAll((els) => els.map((el) => {
    const g = el.querySelector("[data-repere-gouttiere]") as HTMLElement;
    const p = el.querySelector("[data-repere-pastille]") as HTMLElement;
    const corps = g.nextElementSibling as HTMLElement;
    return {
      sigle: el.querySelector("[data-repere-sigle]")!.textContent!,
      x: Math.round(corps.getBoundingClientRect().left),
      pastille: p.getBoundingClientRect().height + (el.querySelector("[data-repere-repeat]") ? 16 : 0),
      section: el.getBoundingClientRect().height,
      corps: corps.getBoundingClientRect().height,
      dans: (el.querySelector("[data-repere-sigle]") as HTMLElement).getBoundingClientRect().width <= p.getBoundingClientRect().width,
    };
  }));
  expect(lignes.map((l) => l.sigle).join(" ")).toMatch(/I.*C1.*R.*Int.*C2.*P/);
  expect(new Set(lignes.map((l) => l.x)).size, "même x de début de texte").toBe(1);
  for (const l of lignes) {
    expect(l.dans, `sigle ${l.sigle} dans sa pastille`).toBe(true);
    // Aucun vide de plus : la section fait la hauteur du plus haut de ses deux côtés, à 1 px près.
    expect(l.section, `section ${l.sigle}`).toBeLessThanOrEqual(Math.max(l.corps, l.pastille) + 1);
  }
});

test("C4 : Scène, sigles longs (Pr1, Pr2, Tag) dans la colonne de lettre, « ×2 » sous la lettre", async ({ page }) => {
  await scene(page);
  await page.goto("/songs/grace-en-grace");
  const bandes = page.locator("main [data-scene]");
  await expect(bandes.first()).toBeVisible();
  const lignes = await bandes.evaluateAll((els) => els.map((el) => {
    const col = el.querySelector("[data-scene-colonne]") as HTMLElement;
    const lettre = el.querySelector("[data-scene-lettre]") as HTMLElement;
    const rep = el.querySelector("[data-scene-repeat]") as HTMLElement | null;
    return { lettre: lettre.textContent!, dedans: lettre.scrollWidth <= col.clientWidth, taille: parseFloat(getComputedStyle(lettre).fontSize), sous: rep ? rep.getBoundingClientRect().top >= lettre.getBoundingClientRect().bottom - 1 : true };
  }));
  const longs = lignes.filter((l) => l.lettre.length > 2);
  expect(longs.length, "des sigles longs").toBeGreaterThan(0);
  for (const l of lignes) {
    expect(l.dedans, `lettre ${l.lettre} dans la colonne`).toBe(true);
    expect(l.sous, "×2 sous la lettre").toBe(true);
  }
  // DP-F : trois signes (Int, Tag, Pr1) gardent au moins 20 px au téléphone, 26 px dès la tablette ; toujours sous la taille d'un « C1 ».
  for (const l of longs) {
    expect(l.taille, `corps de ${l.lettre} réduit`).toBeLessThan(telephone(page) ? 26 : 32);
    if (l.lettre.length <= 3) expect(l.taille, `corps de ${l.lettre} d'au moins 20 / 26 px`).toBeGreaterThanOrEqual(telephone(page) ? 20 : 26);
    else expect(l.taille, `corps de ${l.lettre} jamais sous 16 px`).toBeGreaterThanOrEqual(16);
  }
  // Casse : le sigle de la bande n'est pas forcé en capitales (« Pr1 », pas « PR1 »).
  expect(lignes.some((l) => l.lettre !== l.lettre.toUpperCase()), "sigles en casse d'origine").toBe(true);
});

test("DP-F : Scène au téléphone, le bouton de la lettre offre une zone de toucher de 44 × 44 sans bouger la lettre", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await scene(page);
  await page.goto(`/songs/${CHANT_FR}`);
  const bouton = page.locator("main [data-scene-bouton]").first();
  await expect(bouton).toBeVisible();
  const zone = await bouton.evaluate((el) => {
    const c = getComputedStyle(el, "::before");
    return { l: parseFloat(c.width), h: parseFloat(c.height), pos: c.position };
  });
  expect(zone.pos).toBe("absolute");
  expect(zone.l, "largeur de la zone").toBeGreaterThanOrEqual(44);
  expect(zone.h, "hauteur de la zone").toBeGreaterThanOrEqual(44);
  // La zone déborde de la lettre sans la déplacer : un toucher à 8 px sous la lettre ouvre bien la bulle.
  const boite = (await bouton.boundingBox())!;
  await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height + 8);
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
});

test("C3 : Scène, le nom de section est caché sous la tablette et s'ouvre au toucher de la lettre", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await scene(page);
  await page.goto(`/songs/${CHANT_FR}`);
  const lettre = page.locator("main [data-scene-bouton]").first();
  await expect(lettre).toBeVisible();
  await expect(page.locator("main [data-scene-nom]").first()).toBeHidden();
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
  await lettre.click();
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
});

test("C5 : Scène au téléphone, les vers d'Abba Père tiennent sur autant de rangées qu'en Classique", async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 390, "téléphone 390 px");
  const rangees = async (disposition: string) => {
    await page.addInitScript((d) => { localStorage.setItem("disposition", d); localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("perf-font-scale", "1"); }, disposition);
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    return page.evaluate(() => {
      const vers = ["que Tu me formes", "les premiers", "mes doutes"];
      const lignes = [...document.querySelectorAll("[data-performance-mode] [data-copy-line]")].filter((l) => !l.closest("[aria-hidden=true]"));
      return vers.map((v) => {
        const l = lignes.find((x) => (x.textContent ?? "").includes(v));
        if (!l) return -1;
        return new Set([...l.querySelectorAll("span, div")].filter((e) => e.children.length === 0 && (e.textContent ?? "").trim()).map((e) => Math.round(e.getBoundingClientRect().top / 10))).size > 0 ? Math.round(l.getBoundingClientRect().height) : 0;
      });
    });
  };
  const classique = await rangees("classique");
  expect(classique.every((h) => h > 0), "les trois vers trouvés").toBe(true);
  await page.goto("about:blank");
  const sceneH = await rangees("scene");
  expect(sceneH.every((h) => h > 0)).toBe(true);
  sceneH.forEach((h, i) => expect(h, `vers ${i + 1} : même hauteur (même nombre de rangées) qu'en Classique`).toBeLessThanOrEqual(classique[i] + 1));
});

test("D1 : Partition, l'en-tête d'un chant fusionné est en serif centré (vue partitions)", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("disposition", "partition"); });
  const fusion = {
    type: "fusion", songSlug: "", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
    fusionSongs: [
      { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
      { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
    ],
    mixedStructure: [{ songSlug: "abba-pere", sectionId: "chorus-3" }, { songSlug: "一生爱你", sectionId: "chorus-3" }],
  };
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: { ...setlist([]), items: [fusion] } }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  const titres = page.locator('[data-outline-item="1"] [data-titre-partition]');
  await expect(titres).toHaveCount(2);
  const style = await titres.first().evaluate((el) => ({ f: getComputedStyle(el).fontFamily, a: getComputedStyle(el).textAlign }));
  expect(style.f).toMatch(/gelasio/i);
  expect(style.a).toBe("center");
});

test("D1 : Partition, l'en-tête d'un chant fusionné est en serif centré (mode louange)", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("disposition", "partition"); localStorage.setItem("perf-role-preset", "pianiste"); });
  const fusion = {
    type: "fusion", songSlug: "", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
    fusionSongs: [
      { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
      { songSlug: "avec-nous", keyOverride: null, structureOverride: null, sectionNotes: {} },
    ],
    mixedStructure: null,
  };
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: { ...setlist([]), items: [fusion] } }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const titre = onStage(page, "[data-entete-partition] [data-titre-partition]");
  await expect(titre.first()).toBeAttached();
  const style = await titre.first().evaluate((el) => ({ f: getComputedStyle(el).fontFamily, a: getComputedStyle(el).textAlign }));
  expect(style.f).toMatch(/gelasio/i);
  expect(style.a).toBe("center");
});

test("D2 D3 : Partition, compositeur chinois en police des paroles et sans italique ; les data-testid de l'en-tête classique", async ({ page }) => {
  await partition(page);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist([CHANT_ZH, "avec-nous"]) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  const zh = page.locator('[data-outline-item="1"] [data-partition-compositeur]');
  await expect(zh).toBeVisible();
  const st = await zh.evaluate((el) => ({ f: getComputedStyle(el).fontFamily, i: getComputedStyle(el).fontStyle }));
  expect(st.f, "pas KaiTi-titres").not.toMatch(/kaiti/i);
  expect(st.i, "pas d'italique en chinois").toBe("normal");
  const fr = page.locator('[data-outline-item="2"] [data-partition-compositeur]');
  expect(await fr.evaluate((el) => getComputedStyle(el).fontStyle), "italique en français").toBe("italic");
  await expect(zh).toHaveAttribute("data-testid", "auteur");
  await expect(page.locator('[data-outline-item="2"] [data-partition-tempo]')).toHaveAttribute("data-testid", "ligne-tempo");
});

// ─── (i) DP-F : finitions après la critique de design ────────────────────────────────────────────────────────────

test("DP-F : Partition, la feuille de route de tête a la taille des repères de section (≤ 30 px), page du chant", async ({ page }) => {
  await partition(page);
  await page.goto(`/songs/${encodeURIComponent(CHANT_FR)}`);
  const repere = page.locator("main [data-repere-encadre]:not([data-section] *)").first();
  await expect(repere).toBeVisible();
  const h = (await repere.boundingBox())!.height;
  expect(h, "hauteur d'un repère de tête").toBeLessThanOrEqual(30);
  expect(h, "pas plus petit que 26 px").toBeGreaterThanOrEqual(26);
});

for (const [langue, slug] of [["FR", "abba-pere"], ["ZH", "谢谢你"]] as const) {
  test(`DP-F : Partition, l'en-tête du mode louange est compact (≤ Classique + 24 px), repères de tête ≤ 30 px — ${langue}`, async ({ page }) => {
    await page.addInitScript((zh) => {
      localStorage.setItem("perf-role-preset", "pianiste");
      localStorage.setItem("perf-font-scale", "1");
      localStorage.setItem("disposition", "classique");
      localStorage.setItem("jianpu-sheet-pref", "never");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    }, langue === "ZH");
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist([slug]) }, `/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
    await attendreMiseEnPage(page);
    const l: Langue = langue === "ZH" ? "zh" : "fr";
    const hauteur = async () => (await onStage(page, "[data-entete-chant]").first().boundingBox())!.height;
    const classique = await hauteur();
    const options = await ouvrirOptions(page, l);
    await options.getByRole("radio").nth(ORDRE.indexOf("partition")).click();
    await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", "partition");
    await page.keyboard.press("Escape");
    await expect(options).toBeHidden();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-entete-partition]").first()).toBeAttached();
    const gravee = await hauteur();
    expect(gravee, `en-tête Partition (${gravee}) contre Classique (${classique})`).toBeLessThanOrEqual(classique + 24);
    const repere = onStage(page, "[data-entete-partition] [data-repere-encadre]").first();
    await expect(repere).toBeAttached();
    expect((await repere.boundingBox())!.height, "repère de tête").toBeLessThanOrEqual(30);
    // Une seule rangée sous le titre : tempo / tonalité à gauche, compositeur à droite.
    const rangee = await page.evaluate(() => {
      const t = document.querySelector("[data-performance-mode] [data-partition-tempo]:not([aria-hidden=true] *)")!.getBoundingClientRect();
      const c = document.querySelector("[data-performance-mode] [data-partition-compositeur]:not([aria-hidden=true] *)")!.getBoundingClientRect();
      return { dessous: Math.abs(t.top - c.top) < 12, gauche: t.left < c.left };
    });
    expect(rangee.dessous, "tempo et compositeur sur la même rangée").toBe(true);
    expect(rangee.gauche, "tempo à gauche du compositeur").toBe(true);
  });
}
