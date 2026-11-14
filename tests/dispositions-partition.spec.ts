import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { marge, ouvrirMarge } from "./helpers/marge";
import { ouvrirAffichage, ouvrirPartitions } from "./helpers/setlist";
import { attendreCompteur, attendreMiseEnPage, fermerBarre, lireCompteur, onStage, ouvrirMenu, ouvrirOptions, type Langue } from "./helpers/louange";

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
/** Les cinq miniatures de disposition de la marge « Affichage » de la page chant (RU-3 : elles ne sont plus dans le menu ⋯). */
const choixDispo = (page: Page, titre: string | RegExp = "Disposition") => marge(page).getByRole("radiogroup", { name: titre }).getByRole("radio");
const NOMS: Record<string, string> = { classique: "Classique", sections: "Couleurs par section", reperes: "Marge", scene: "Scène", partition: "Partition" };
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
  test(`${langue} : marge Affichage du chant, choix retenu au rechargement, repris par le mode louange, rendu à la page du chant`, async ({ page }) => {
    await page.addInitScript(() => {
      // Posé une fois seulement : le script se rejoue à chaque navigation, rechargement compris.
      if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique");
      localStorage.setItem("perf-role-preset", "pianiste");
    });
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist([slug, ...LOUANGE_FR]) }, `/songs/${encodeURIComponent(slug)}`);
    const racine = page.locator("main [data-disposition]").first();
    await expect(racine).toHaveAttribute("data-disposition", "classique");

    await ouvrirMarge(page);
    await expect(marge(page).getByText("Disposition", { exact: true })).toBeVisible();
    await expect(choixDispo(page)).toHaveText([/Classique/, /Couleurs par section/, /Marge/, /Scène/, /Partition/]);
    await expect(choixDispo(page).filter({ hasText: "Classique" })).toHaveAttribute("aria-checked", "true");
    await expect(marge(page).getByText("Retenu sur cet appareil")).toHaveCount(2);
    // La marge tient dans l'écran.
    const boite = (await marge(page).boundingBox())!;
    expect(boite.x).toBeGreaterThanOrEqual(0);
    expect(boite.x + boite.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);

    await choixDispo(page).filter({ hasText: "Couleurs par section" }).click();
    await expect(racine).toHaveAttribute("data-disposition", "sections");
    await expect(marge(page)).toHaveAttribute("data-ouvert", "true"); // la marge reste ouverte
    await expect.poll(() => lire(page, "disposition")).toBe("sections");

    await page.reload();
    await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "sections");

    // Le mode louange reprend la disposition.
    await page.goto(`/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    const scene = page.locator("[data-performance-mode]");
    await expect(scene).toHaveAttribute("data-disposition", "sections");
    const options = await ouvrirMenu(page, "jejoue");
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
  const marge = await ouvrirAffichage(page);
  const disposition = marge.getByRole("radiogroup", { name: "Disposition" }).getByRole("radio");
  await expect(disposition.filter({ hasText: "Classique" })).toHaveAttribute("aria-checked", "true");
  await disposition.filter({ hasText: "Couleurs par section" }).click();
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
    const options = await ouvrirMenu(page, "jejoue");
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
      for (const d of ORDRE) {
        await ouvrirMarge(page);
        await choixDispo(page, langue === "zh" ? "排版" : "Disposition").nth(ORDRE.indexOf(d)).click();
        await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", d);
        // Marge ouverte, puis page seule.
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-menu-${d}-${langue}-${theme}.png` });
        await page.keyboard.press("Escape");
        // Attendre la FIN de la fermeture de la marge avant la capture de la page.
        await expect(marge(page)).toBeHidden();
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
        await page.screenshot({ path: `${dossier}/${info.project.name}-chant-${d}-${langue}-${theme}.png` });
      }
      await page.goto(`/setlists/${SETLIST_ID}`);
      await masquerNext();
      await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
      await attendreMiseEnPage(page);
      const l: Langue = langue;
      for (const d of ORDRE) {
        const options = await ouvrirMenu(page, "jejoue", l);
        await options.locator('[role=radiogroup][aria-labelledby="perf-disposition"]').getByRole("radio").nth(ORDRE.indexOf(d)).click();
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
    await expect(page.locator("main [data-section] > [data-copy-ignore] > span[aria-hidden] + span.text-xs"), "aucune rangée d'intitulé de SectionView").toHaveCount(0);
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
    await expect(page.locator("main [data-section] > [data-copy-ignore] > span[aria-hidden] + span.text-xs"), "aucune rangée d'intitulé de SectionView").toHaveCount(0);
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
    await expect(page.locator("main [data-section] > [data-copy-ignore] > span[aria-hidden] + span.text-xs"), "aucune rangée d'intitulé de SectionView").toHaveCount(0);

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
          nomRetrait: Math.round(nom.getBoundingClientRect().left) - Math.round(el.getBoundingClientRect().left),
        };
      });
    });
    for (const l of lignes) {
      expect(l.fond, "aucun fond de section").toBe("rgba(0, 0, 0, 0)");
      expect(l.bordure, "aucun cadre de section").toBe(0);
      expect(l.ombre).toBe("none");
      expect(l.dansPalette, `cadre du repère ${l.sigle} dans la palette`).toBe(true);
      if (l.attendu) expect(l.repereBord, `cadre du repère ${l.sigle}`).toBe(l.attendu);
      // Cotes de la planche (DP-G2) : trait de 2 px, carré de 30 px au téléphone, 32 px dès la tablette.
      expect(l.repereLarg, "cadre").toBe(2);
      expect(l.repereHaut, "hauteur du repère").toBeGreaterThanOrEqual(30);
      expect(l.repereHaut).toBeLessThanOrEqual(32);
      expect(l.encre, "lettre à l'encre").toBe(l.foreground);
      expect(l.titre.length, "nom complet en title").toBeGreaterThan(0);
      expect(l.nom.length).toBeGreaterThan(0);
      expect(l.casse, "casse normale").toBe("none");
      if (langue === "FR") expect(l.nom, "pas de capitales").not.toBe(l.nom.toUpperCase());
      expect(l.copie, "rangée hors copie").toBe(true);
      expect(Math.abs(l.retrait - l.nomRetrait), "corps et nom partent d'un même retrait").toBeLessThanOrEqual(1);
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


test("A : marge Affichage du chant, cinq colonnes égales, entrée choisie marquée (cadre 2 px, gras, bleu)", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
  await page.goto(`/songs/${CHANT_FR}`);
  await ouvrirMarge(page);
  const entrees = choixDispo(page);
  await expect(entrees).toHaveCount(5);
  const m = await entrees.evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    const mini = el.querySelector("svg.block") as SVGElement;
    const nom = el.lastElementChild as HTMLElement;
    return { x: r.left, y: Math.round(r.top), w: Math.round(r.width), svgW: Math.round(mini.getBoundingClientRect().width), nomH: Math.round(nom.getBoundingClientRect().height), poids: getComputedStyle(nom).fontWeight, couleur: getComputedStyle(nom).color, ombre: getComputedStyle(mini.parentElement!).boxShadow, coche: el.getAttribute("aria-checked") };
  }));
  expect(new Set(m.map((e) => e.y)).size, "une seule rangée de cinq").toBe(1);
  expect(Math.max(...m.map((e) => e.w)) - Math.min(...m.map((e) => e.w)), "colonnes égales").toBeLessThanOrEqual(1);
  expect(new Set(m.map((e) => e.nomH)).size, "noms à hauteur égale " + JSON.stringify(m.map((e) => e.nomH))).toBe(1);
  for (const e of m) expect(e.svgW, "miniature dans sa colonne " + JSON.stringify(m.map((x) => [x.w, x.svgW]))).toBeLessThanOrEqual(e.w);
  const boite = (await marge(page).boundingBox())!;
  expect(boite.x).toBeGreaterThanOrEqual(0);
  expect(boite.x + boite.width, "marge ≤ 100vw").toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
  const choisie = m.find((e) => e.coche === "true")!;
  const autre = m.find((e) => e.coche === "false")!;
  expect(choisie.poids).toBe("700");
  expect(autre.poids, "nom non choisi en encre medium").toBe("500");
  const accent = await page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--chord-color)"; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  expect(choisie.couleur, "nom choisi dans l'accent bleu").toBe(accent);
  expect(choisie.ombre, "cadre de 2 px").toContain(accent);
  expect(autre.ombre).not.toContain(accent);
});

for (const [langue, slug, variable] of [["FR", CHANT_FR, "--fr-accent"], ["ZH", CHANT_ZH, "--zh-accent"]] as const) {
  test(`A : ${langue}, dans la marge, la miniature Classique prend l'accent de la langue du chant (${variable}), couplet sans cadre, refrain en boîte`, async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    await ouvrirMarge(page);
    const mini = choixDispo(page, /Disposition|排版/).first().locator("svg.block");
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
  const options = await ouvrirMenu(page, "jejoue");
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

test("C1 : en Scène et en Partition les accords sont bleus en chinois comme en français, clair et sombre ; Repères garde la couleur de la langue", async ({ page }) => {
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
      for (const d of ["scene", "partition"]) {
        const c = await couleurAccord(slug, d, sombre);
        expect(c.accord, `accord de ${slug} en ${d} (${sombre ? "sombre" : "clair"})`).toBe(c.bleu);
      }
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

test("C5 / DP-G1 : Scène (mode louange, dès la tablette, deux colonnes à 1 024 px et 1 440 px compris), « Bien avant mes doutes » tient sur autant de rangées qu'en Classique", async ({ page }) => {
  // Au téléphone la gouttière de Scène (6 + 10 + 40 + 12 px, retrait droit de 22 px) laisse 330 px au texte à 412 px contre 384
  // en Classique, qui déborde dans ses marges : un vers de 340 à 380 px y est coupé en Scène par construction de la planche.
  test.skip(page.viewportSize()!.width < 768, "dès la tablette");
  const rangees = async (disposition: string) => {
    await page.addInitScript((d) => { localStorage.setItem("disposition", d); localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("perf-font-scale", "1"); localStorage.setItem("accords-aide-vue", "1"); }, disposition);
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["abba-pere"]) }, `/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    const vers = new Map<string, number>();
    const total = Number((await lireCompteur(page)).split("/")[1]);
    for (let p = 1; p <= total; p++) {
      await attendreCompteur(page, new RegExp(`^${p} /`));
      const lus = await onStage(page, "[data-copy-line]").evaluateAll((ls) => ls.map((l) => [l.textContent ?? "", l.querySelectorAll("[data-rangee]").length] as const));
      for (const [texte, n] of lus) if (texte.trim()) vers.set(texte, n);
      if (p < total) await page.keyboard.press("ArrowRight");
    }
    return vers;
  };
  const classique = await rangees("classique");
  expect([...classique.keys()].some((k) => /mes\s+doutes/.test(k)), "le vers « Bien avant mes doutes » est lu").toBe(true);
  await page.goto("about:blank");
  const sceneR = await rangees("scene");
  expect(sceneR.size, "mêmes vers lus").toBe(classique.size);
  expect([...sceneR.keys()].some((k) => /mes\s+doutes/.test(k)), "le vers « Bien avant mes doutes » est lu en Scène").toBe(true);
  for (const [vers, n] of sceneR) if (/mes\s+doutes/.test(vers)) expect(n, "rangées de « Bien avant mes doutes » en Scène").toBeLessThanOrEqual(classique.get(vers) ?? 99);
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

test("DP-F G2-17 : Partition, la feuille de route de tête a la cote des repères de section (32 px, 30 au téléphone), page du chant", async ({ page }) => {
  await partition(page);
  await page.goto(`/songs/${encodeURIComponent(CHANT_FR)}`);
  const repere = page.locator("main [data-repere-encadre]:not([data-section] *)").first();
  await expect(repere).toBeVisible();
  const h = (await repere.boundingBox())!.height;
  expect(Math.round(h), "hauteur d'un repère de tête").toBe(telephone(page) ? 30 : 32);
});

for (const [langue, slug] of [["FR", "abba-pere"], ["ZH", "谢谢你"]] as const) {
  test(`DP-F : Partition, l'en-tête du mode louange est compact (≤ Classique + 24 px), repères de tête ≤ 32 px — ${langue}`, async ({ page }) => {
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
    const options = await ouvrirMenu(page, "jejoue", l);
    await options.locator('[role=radiogroup][aria-labelledby="perf-disposition"]').getByRole("radio").nth(ORDRE.indexOf("partition")).click();
    await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-disposition", "partition");
    await page.keyboard.press("Escape");
    await expect(options).toBeHidden();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-entete-partition]").first()).toBeAttached();
    const gravee = await hauteur();
    expect(gravee, `en-tête Partition (${gravee}) contre Classique (${classique})`).toBeLessThanOrEqual(classique + 24);
    const repere = onStage(page, "[data-entete-partition] [data-repere-encadre]").first();
    await expect(repere).toBeAttached();
    expect((await repere.boundingBox())!.height, "repère de tête").toBeLessThanOrEqual(32);
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

// ─── (g) DP-G1 : seconde relecture (Échap, balayages, Scène étroite, tag, ellipse) ──────────────────────────────

/** Ouvre le mode louange sur la disposition donnée (compte et setlist simulés), barre fermée. */
async function louangeEn(page: Page, disposition: string, slugs: string[] = LOUANGE_FR) {
  await page.addInitScript((d) => {
    localStorage.setItem("disposition", d);
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", "never");
  }, disposition);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
  await fermerBarre(page);
}

for (const [d, bouton, seulementTelephone] of [["reperes", "[data-repere-pastille]", false], ["scene", "[data-scene-bouton]", true]] as const) {
  test(`G1-1 : ${d}, Échap ferme la bulle du nom sans quitter le mode louange, le second Échap le quitte`, async ({ page }) => {
    test.skip(seulementTelephone && !telephone(page), "la lettre n'est un bouton qu'au téléphone et en colonne étroite");
    await louangeEn(page, d);
    await onStage(page, bouton).nth(1).click();
    await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-repere-bulle]")).toHaveCount(0);
    await expect(page.locator("[data-performance-mode]")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  });
}

test("G1-4 : un balayage parti d'une pastille de Repères tourne la page, un toucher sur elle ne la tourne pas", async ({ page }) => {
  // L'astuce du rappel (bulle de la première fois, posée par-dessus le haut de la page) déjà vue : elle couvrirait la pastille.
  await page.addInitScript(() => {
    localStorage.setItem("perf-astuce-rappel-joue", "1");
    localStorage.setItem("perf-astuce-rappel-unique", "1");
  });
  await louangeEn(page, "reperes");
  await page.keyboard.press("ArrowRight");
  await attendreCompteur(page, /^2 \//);
  const pastille = onStage(page, "[data-repere-pastille]").first();
  await expect(pastille).toBeVisible();
  const b = (await pastille.boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  expect(await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest("[data-repere-pastille]"), [x, y]), "rien ne recouvre la pastille").toBe(true);
  // Toucher : la bulle s'ouvre (le toucher est traité), et la page n'a pas bougé.
  await page.mouse.click(x, y);
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
  expect(await lireCompteur(page), "page inchangée après le toucher").toMatch(/^2 \//);
  // Balayage vers la droite (page précédente) parti de la pastille.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150, y, { steps: 6 });
  await page.mouse.up();
  await attendreCompteur(page, /^1 \//);
});

test("G1-10b : un toucher sur la lettre de Scène (mode louange, téléphone) ouvre la bulle, laisse la page et la barre fermée", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await louangeEn(page, "scene");
  const avant = await lireCompteur(page);
  await onStage(page, "[data-scene-bouton]").nth(1).click();
  await expect(page.locator("[data-repere-bulle]")).toHaveCount(1);
  expect(await lireCompteur(page), "page inchangée").toBe(avant);
  await expect(page.locator("[data-barre-ouverte]")).toHaveCount(0);
});

test("G1-2 G1-8 : Scène, cotes larges ou compactes selon la place de la bande ; la lettre ne se focalise que si elle est un bouton", async ({ page }) => {
  await louangeEn(page, "scene");
  const deux = await page.locator("[data-performance-mode]").evaluate((el) => el.hasAttribute("data-deux-colonnes"));
  const bandes = await onStage(page, "[data-scene]").evaluateAll((els) => els.map((el) => {
    const col = el.querySelector("[data-scene-colonne]") as HTMLElement;
    const bouton = el.querySelector("[data-scene-bouton]") as HTMLButtonElement;
    const nom = el.querySelector("[data-scene-nom]");
    return { largeur: Math.round(el.getBoundingClientRect().width), col: col.offsetWidth, nom: nom ? getComputedStyle(nom).display !== "none" : null, inerte: bouton.disabled };
  }));
  expect(bandes.length).toBeGreaterThan(0);
  for (const b of bandes) {
    // Cotes larges dès la tablette (768 px), sauf dans les deux colonnes du mode louange quand la bande fait moins de 600 px.
    const large = page.viewportSize()!.width >= 768 && (!deux || b.largeur >= 600);
    expect(b.col, `colonne de lettre (bande de ${b.largeur} px)`).toBeCloseTo(large ? 64 : 40, 0);
    if (b.nom !== null) expect(b.nom, "nom visible = cotes larges").toBe(large);
    expect(b.inerte, "lettre inerte (hors tabulation) seulement en cotes larges").toBe(large);
  }
});

test("G1-8 : Scène sur la page du chant, dès la tablette la lettre est hors tabulation (nom affiché)", async ({ page }) => {
  test.skip(telephone(page), "dès la tablette");
  await scene(page);
  await page.goto(`/songs/${CHANT_FR}`);
  await expect(page.locator("main [data-scene-nom]").first()).toBeVisible();
  for (const b of await page.locator("main [data-scene-bouton]").all()) await expect(b).toBeDisabled();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.hasAttribute("data-scene-bouton")), "Tab ne s'arrête pas sur la lettre").toBe(false);
  }
});

test("G1-6 : Scène au téléphone, le texte garde au moins 14 px d'air avant le bord de l'écran", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await louangeEn(page, "scene");
  const airs = await onStage(page, "[data-section]").evaluateAll((els) => els.map((el) => {
    let droite = 0;
    for (const n of el.querySelectorAll("[data-copy-line] *")) if (n.children.length === 0 && (n.textContent ?? "").trim()) droite = Math.max(droite, n.getBoundingClientRect().right);
    return innerWidth - droite;
  }));
  expect(airs.length).toBeGreaterThan(0);
  for (const a of airs) expect(a, "air à droite du texte le plus long").toBeGreaterThanOrEqual(13.5);
});

test("G1-7 : Scène, le bas de la dernière bande de chaque page reste à 8 px au moins au-dessus de la barre du bas", async ({ page }) => {
  await louangeEn(page, "scene");
  const total = Number((await lireCompteur(page)).split("/")[1]);
  for (let p = 1; p <= total; p++) {
    await attendreCompteur(page, new RegExp(`^${p} /`));
    const m = await page.evaluate(() => {
      const bandes = [...document.querySelectorAll("[data-performance-mode] [data-scene]")].filter((b) => !b.closest("[aria-hidden=true]"));
      const c = document.querySelector("[data-performance-mode] [data-curseur-page]");
      return { bas: Math.max(...bandes.map((b) => b.getBoundingClientRect().bottom)), limite: c ? c.getBoundingClientRect().top : innerHeight };
    });
    expect(m.limite - m.bas, `page ${p} : air sous la dernière bande`).toBeGreaterThanOrEqual(8);
    if (p < total) await page.keyboard.press("ArrowRight");
  }
});

test("G1-5 : la bande Scène va de bord à bord dans le mode louange (une colonne) et dans la vue partitions de la setlist, au téléphone", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await louangeEn(page, "scene");
  const bords = (sel: string) => page.locator(sel).evaluateAll((els) => els.filter((e) => !e.closest("[aria-hidden=true]")).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(innerWidth - r.right)]; }));
  for (const [g, d] of await bords("[data-performance-mode] [data-scene]")) { expect(g, "bord gauche").toBe(0); expect(d, "bord droit").toBe(0); }
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  await ouvrirPartitions(page);
  await expect(page.locator("[data-scene]").first()).toBeVisible();
  const lus = await bords("[data-scene]");
  expect(lus.length).toBeGreaterThan(0);
  for (const [g, d] of lus) { expect(g, "bord gauche (vue partitions)").toBe(0); expect(d, "bord droit (vue partitions)").toBe(0); }
});

test("G1-3 : la section « Tag » prend --sec-tag en Repères, Scène et Couleurs par section", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  const rgbTag = async () => page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--sec-tag)"; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  const ouvrir = async (disposition: string) => {
    await page.evaluate((d) => localStorage.setItem("disposition", d), disposition).catch(() => {});
    await page.goto("/songs/grace-en-grace");
  };
  await page.goto("/songs/grace-en-grace");
  const tag = await rgbTag();
  await ouvrir("reperes");
  await expect(page.locator("main [data-repere]").first()).toBeVisible();
  const pastille = await page.locator("main [data-repere]", { has: page.locator("[data-repere-sigle]", { hasText: /^Tag$/ }) }).first().evaluate((el) => {
    const p = el.querySelector("[data-repere-pastille]")!, f = el.querySelector("[data-repere-filet]");
    return { pastille: getComputedStyle(p).backgroundColor, filet: f ? getComputedStyle(f).backgroundColor : null, encre: getComputedStyle(p).color };
  });
  expect(pastille.pastille, "pastille").toBe(tag);
  if (pastille.filet) expect(pastille.filet, "filet").toBe(tag);
  expect(pastille.encre, "encre blanche sur le rose du tag").toBe("rgb(255, 255, 255)");
  await ouvrir("scene");
  await expect(page.locator("main [data-scene]").first()).toBeVisible();
  const bande = await page.locator("main [data-scene]", { has: page.locator("[data-scene-lettre]", { hasText: /^Tag$/ }) }).first().evaluate((el) => getComputedStyle(el).borderLeftColor);
  expect(bande, "filet de la bande").toBe(tag);
  await ouvrir("sections");
  await expect(page.locator("main [data-section]").first()).toBeVisible();
  const cadre = await page.locator("main [data-section]", { has: page.locator("span.font-semibold", { hasText: /^Tag$/ }) }).first().evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(cadre, "cadre de Couleurs par section").toBe(tag);
});

test.describe("G1-9 G1-10a : sigle « autre » long, coupé par une ellipse dans la colonne ou la pastille", () => {
  test.use({ serviceWorkers: "block" });
  // Fixture : la dernière section (« Fin ») du chant devient une section « autre » nommée « Bénédiction » ; vue partitions
  // de la setlist simulée (la page du chant est rendue côté serveur : rien à substituer).
  const nomLong = async (page: Page, disposition: string) => {
    await page.addInitScript((d) => { localStorage.setItem("disposition", d); localStorage.setItem("jianpu-sheet-pref", "never"); }, disposition);
    await page.route("**/api/song/au-nom-de-jesus", async (route) => {
      const rep = await route.fetch();
      await route.fulfill({ response: rep, body: (await rep.text()).replace("{start_of_verse: Fin}", "{start_of_part: Bénédiction}") });
    });
    await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["au-nom-de-jesus"]) }, `/setlists/${SETLIST_ID}`);
    await ouvrirPartitions(page);
  };
  test("Scène : « Inst » et « Bénédiction » restent dans la colonne de lettre (rectangles), « Bénédiction » est coupé", async ({ page }) => {
    await nomLong(page, "scene");
    await expect(page.locator("[data-scene]").first()).toBeVisible();
    const l = await page.locator("[data-scene]").evaluateAll((els) => els.map((el) => {
      const c = (el.querySelector("[data-scene-colonne]") as HTMLElement).getBoundingClientRect();
      const t = el.querySelector("[data-scene-lettre]") as HTMLElement;
      const r = t.getBoundingClientRect();
      return { texte: t.textContent!, dedans: r.right <= c.right + 0.5 && r.left >= c.left - 0.5, coupe: t.scrollWidth > t.clientWidth };
    }));
    expect(l.some((x) => x.texte === "Inst"), "« Inst » présent").toBe(true);
    const benediction = l.find((x) => x.texte === "Bénédiction");
    expect(benediction, "« Bénédiction » présent").toBeTruthy();
    expect(benediction!.coupe, "« Bénédiction » est coupé par l'ellipse").toBe(true);
    for (const x of l) expect(x.dedans, `lettre ${x.texte} dans sa colonne`).toBe(true);
  });
  test("Repères : « Bénédiction » reste dans sa pastille (rectangles) et y est coupé", async ({ page }) => {
    await nomLong(page, "reperes");
    await expect(page.locator("[data-repere]").first()).toBeVisible();
    const l = await page.locator("[data-repere]").evaluateAll((els) => els.map((el) => {
      const p = (el.querySelector("[data-repere-pastille]") as HTMLElement).getBoundingClientRect();
      const t = el.querySelector("[data-repere-sigle]") as HTMLElement;
      const r = t.getBoundingClientRect();
      return { texte: t.textContent!, dedans: r.right <= p.right + 0.5 && r.left >= p.left - 0.5, coupe: t.scrollWidth > t.clientWidth };
    }));
    const benediction = l.find((x) => x.texte === "Bénédiction");
    expect(benediction, "« Bénédiction » présent").toBeTruthy();
    expect(benediction!.coupe, "« Bénédiction » est coupé par l'ellipse").toBe(true);
    for (const x of l) expect(x.dedans, `sigle ${x.texte} dans sa pastille`).toBe(true);
  });
});

// ─── (j) DP-G2 : seconde relecture (menu à flèches, chargement, Partition aux cotes de la planche, Marge) ─────────

test("G2-11 : marge du chant, ← et → passent à la miniature voisine (qui est choisie, comme dans le panneau du mode louange)", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("disposition")) localStorage.setItem("disposition", "classique"); });
  await page.goto(`/songs/${CHANT_FR}`);
  await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "classique");
  await ouvrirMarge(page);
  const classique = choixDispo(page).filter({ hasText: "Classique" });
  const sections = choixDispo(page).filter({ hasText: "Couleurs par section" });
  await classique.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sections).toBeFocused();
  await expect(sections).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(classique).toBeFocused();
  await expect(classique).toHaveAttribute("aria-checked", "true");
  await expect(sections).toHaveAttribute("aria-checked", "false");
  await expect(marge(page)).toHaveAttribute("data-ouvert", "true");
});

test("G2-12 : un appareil en Couleurs par section ne voit jamais la page du chant en Classique", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("disposition", "sections");
    const vues = new Set<string>();
    (window as unknown as { __vues: Set<string> }).__vues = vues;
    const lire = () => document.querySelectorAll("main [data-disposition]").forEach((e) => vues.add(e.getAttribute("data-disposition")!));
    new MutationObserver(lire).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-disposition"] });
    const boucle = () => { lire(); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  });
  await page.goto(`/songs/${CHANT_ZH}`);
  await expect(page.locator("main [data-disposition]").first()).toHaveAttribute("data-disposition", "sections");
  await page.waitForTimeout(500);
  const vues = await page.evaluate(() => [...(window as unknown as { __vues: Set<string> }).__vues]);
  expect(vues, "dispositions vues pendant le chargement").toEqual(["sections"]);
});

test("G2-13 : au téléphone, le menu ⋯ (PDF, Personnaliser, Signalement) garde au moins 8 px de chaque côté de l'écran", async ({ page }) => {
  test.skip(!telephone(page), "téléphone seulement");
  await page.addInitScript(() => localStorage.setItem("disposition", "classique"));
  await page.goto(`/songs/${CHANT_FR}`);
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  const menu = (await page.getByRole("menu").boundingBox())!;
  expect(menu.x, "bord gauche").toBeGreaterThanOrEqual(8);
  expect(menu.x + menu.width, "bord droit").toBeLessThanOrEqual(page.viewportSize()!.width - 8);
});

test("G2-21 : miniatures, Partition a des cadres de section et des accords bleus, Marge les accords de la langue", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("disposition", "classique"));
  await page.goto(`/songs/${encodeURIComponent(CHANT_ZH)}`);
  await ouvrirMarge(page);
  const entrees = choixDispo(page);
  const partition = entrees.nth(ORDRE.indexOf("partition")).locator("svg");
  await expect(partition.locator("text")).toHaveText(["C", "R"]);
  await expect(partition.locator('rect[stroke="var(--sec-verse)"]')).toHaveCount(1);
  await expect(partition.locator('rect[stroke="var(--sec-chorus)"]')).toHaveCount(1);
  await expect(partition.locator('rect[fill="var(--chord-color)"]').first()).toBeAttached();
  const reperes = entrees.nth(ORDRE.indexOf("reperes")).locator("svg");
  await expect(reperes.locator('rect[fill="var(--zh-accent)"]').first()).toBeAttached();
  await expect(reperes.locator('rect[fill="var(--chord-color)"]')).toHaveCount(0);
});

test("G2-23 : la disposition s'appelle Marge (fr) et 页边标记 (zh) dans la marge Affichage ; le bouton de la barre garde son nom", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.goto(`/songs/${CHANT_FR}`);
  await ouvrirMarge(page);
  await expect(choixDispo(page, "排版").nth(ORDRE.indexOf("reperes"))).toContainText("页边标记");
});

test("G2-23 : en mode louange, le panneau dit « Marge », le bouton de la barre garde « Repères »", async ({ page }) => {
  await louangeEn(page, "classique");
  await ouvrirMenu(page, "jejoue");
  await expect(page.getByRole("radio", { name: /Marge/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Repères/ })).toHaveCount(0);
  // Le bouton signet de la barre (menu des sections) n'a pas changé de nom.
  await expect(page.locator("[data-performance-mode]").getByRole("button", { name: "Repères", exact: true, includeHidden: true })).not.toHaveCount(0);
});

/** Partition sur la page du chant. */
async function partitionSurLaPage(page: Page, slug: string) {
  await partition(page);
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main [data-partition] [data-repere-encadre]").first()).toBeVisible();
}

test("G2-16 : Partition, repères à la cote de la planche (32 px, 30 au téléphone, trait de 2 px), même cadre pour « Int » et « Interlude », noms alignés, pas de débordement", async ({ page }) => {
  await partitionSurLaPage(page, "abba-pere");
  const cote = telephone(page) ? 30 : 32;
  const repères = await page.locator("main [data-partition]").evaluateAll((els) =>
    els.map((el) => {
      const m = el.querySelector("[data-repere-encadre]") as HTMLElement;
      const nom = el.querySelector("[data-partition-nom]") as HTMLElement;
      const r = m.getBoundingClientRect();
      return { l: r.left, w: r.width, h: r.height, bord: getComputedStyle(m).borderTopWidth, nomG: nom.getBoundingClientRect().left, texte: nom.textContent };
    }),
  );
  expect(repères.length).toBeGreaterThan(4);
  for (const r of repères) {
    expect(Math.round(r.w), `largeur du repère (${r.texte})`).toBe(cote);
    expect(Math.round(r.h), `hauteur du repère (${r.texte})`).toBe(cote);
    expect(r.bord).toBe("2px");
    expect(Math.abs(r.nomG - repères[0].nomG), `nom « ${r.texte} » aligné`).toBeLessThanOrEqual(1);
    expect(Math.abs(r.l - repères[0].l), "repères alignés").toBeLessThanOrEqual(1);
    // Suspendu dans la marge, mais jamais collé au bord de l'écran.
    expect(r.l, `air à gauche du repère (${r.texte})`).toBeGreaterThanOrEqual(8 - 0.5);
  }
  // Deux bords seulement : les repères (suspendus) et le texte ; la feuille de route de tête part du bord du texte (planche).
  const tete = (await page.locator("main [data-repere-encadre]:not([data-section] *)").first().boundingBox())!;
  expect(Math.abs(tete.x - repères[0].nomG), "feuille de route au bord du texte").toBeLessThanOrEqual(1);
  const defile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(defile, "débordement horizontal").toBeLessThanOrEqual(0);
});

test("G2-16 : mode louange en une colonne, Partition : repères suspendus avec de l'air avant le bord, et hors de l'encoche en paysage (--sal de 44 px)", async ({ page }) => {
  await louangeEn(page, "partition");
  test.skip(await page.locator("[data-performance-mode][data-deux-colonnes]").count() > 0, "une colonne seulement (en deux colonnes, rien ne se suspend)");
  const gauches = () => onStage(page, "[data-section][data-partition] [data-repere-encadre]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
  const defile = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const sans = await gauches();
  expect(sans.length).toBeGreaterThan(0);
  for (const g of sans) expect(g, "air avant le bord de l'écran").toBeGreaterThanOrEqual(7.5);
  expect(await defile(), "débordement horizontal").toBeLessThanOrEqual(0);
  // Encoche à gauche (paysage) : les repères restent dans la zone sûre, à 8 px de son bord.
  await page.locator("[data-performance-mode]").evaluate((el) => (el as HTMLElement).style.setProperty("--sal", "44px"));
  await expect.poll(async () => Math.min(...(await gauches())), { message: "repères hors de l'encoche" }).toBeGreaterThanOrEqual(44 + 7.5);
  expect(await defile(), "débordement horizontal").toBeLessThanOrEqual(0);
});

test("G2-17 G2-19 : mode louange en Partition, repère de tête et de section de même cote et même police, en-tête borné à une colonne", async ({ page }) => {
  await louangeEn(page, "partition");
  const tete = onStage(page, "[data-entete-partition] [data-repere-encadre]").first();
  const section = onStage(page, "[data-section][data-partition] [data-repere-encadre]").first();
  await expect(tete).toBeAttached();
  await expect(section).toBeAttached();
  const lire = (el: typeof tete) => el.evaluate((e) => ({ h: e.getBoundingClientRect().height, f: getComputedStyle(e).fontFamily, s: getComputedStyle((e.querySelector("abbr") ?? e.querySelector("span") ?? e) as Element).fontSize }));
  const a = await lire(tete), b = await lire(section);
  expect(Math.abs(a.h - b.h), `hauteurs ${a.h} / ${b.h}`).toBeLessThanOrEqual(1);
  expect(a.f, "police").toBe(b.f);
  expect(a.s, "corps").toBe(b.s);
  // En-tête borné à la largeur d'une colonne en deux colonnes.
  if (await page.locator("[data-performance-mode][data-deux-colonnes]").count()) {
    const entete = (await onStage(page, "[data-entete-partition]").first().boundingBox())!;
    const colonne = (await page.locator("[data-bord-coupure] > div").first().boundingBox())!;
    expect(entete.width, `en-tête ${entete.width} / colonne ${colonne.width}`).toBeLessThanOrEqual(colonne.width + 1);
  }
});

test("G2-18 G2-22 : la note du tempo est un SVG et le texte « ♩ = 94 » reste pour le lecteur d'écran", async ({ page }) => {
  await louangeEn(page, "partition", ["avec-nous"]);
  const tempo = onStage(page, "[data-entete-partition] [data-partition-tempo]").first();
  await expect(tempo).toBeAttached();
  await expect(tempo.locator("svg[aria-hidden=true]")).toHaveCount(1);
  await expect(tempo.locator(".sr-only")).toHaveText("♩ = 94");
  await expect(tempo).toHaveAttribute("data-testid", "ligne-tempo");
});

test("G2-20 : le compositeur FR est en vrai italique (Gelasio Italic chargée)", async ({ page }) => {
  await louangeEn(page, "partition", ["avec-nous"]);
  await expect(onStage(page, "[data-partition-compositeur]").first()).toBeAttached();
  await expect.poll(() => page.evaluate(() => [...document.fonts].some((f) => f.style === "italic" && f.status === "loaded" && /gelasio/i.test(f.family))), "Gelasio Italic chargée").toBe(true);
});
