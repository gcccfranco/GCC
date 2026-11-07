import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADMIN_EMAIL, signInAs } from "./helpers/fakeSession";
import { ouvrirAvecBarre } from "./helpers/agencement";

// Lot 4 « Nouveau look », tranche T1 : fondations (docs/spec-look.md), reprises
// par la direction 5C1 « Encre · Relief » (§ 20/09/2026, tranche V1).
const FOND_CLAIR = "rgb(255, 255, 255)";
const FOND_SOMBRE = "rgb(0, 0, 0)";
const ENCRE = "rgb(28, 28, 30)";
const ENCRE_SOMBRE = "rgb(242, 242, 247)";
const ROUGE_DU_LOGO = "rgb(207, 42, 32)";

const fondDe = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("fondations du nouveau look (T1)", () => {
  test("couleur système et fond : blanc en clair, noir pur en sombre", async ({ page }) => {
    await page.goto("/login");
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((ms) => ms.map((m) => [m.getAttribute("media"), m.getAttribute("content")]));
    expect(metas).toEqual(
      expect.arrayContaining([
        ["(prefers-color-scheme: light)", "#ffffff"],
        ["(prefers-color-scheme: dark)", "#000000"],
      ])
    );
    expect(await fondDe(page)).toBe(FOND_CLAIR);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => fondDe(page)).toBe(FOND_SOMBRE);
  });

  test("le bouton plein est en encre, s'inverse en sombre, et répond à l'appui", async ({ page }) => {
    await page.goto("/login");
    const bouton = page.locator('button[type="submit"]').first();
    await bouton.waitFor();
    expect(await bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ENCRE);
    expect(await bouton.evaluate((b) => getComputedStyle(b).color)).toBe("rgb(255, 255, 255)");
    expect(await bouton.evaluate((b) => getComputedStyle(b).transitionProperty)).toContain("transform");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bouton.evaluate((b) => getComputedStyle(b).backgroundColor)).toBe(ENCRE_SOMBRE);
    expect(await bouton.evaluate((b) => getComputedStyle(b).color)).toBe(ENCRE);
  });

  test("le rouge du logo ne reste que sur le label de la navbar", async ({ page }) => {
    await page.goto("/songs");
    // Lot U4 : sur ordinateur, le label est dans la barre latérale ; on prend celui qu'on voit.
    const label = page.locator('header a span span, [data-testid="label-section"]').filter({ visible: true }).first();
    await label.waitFor();
    expect(await label.evaluate((e) => getComputedStyle(e).color)).toBe(ROUGE_DU_LOGO);
  });

  test("l'interface est en police du système, plus en Inter", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const police = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(police).not.toMatch(/Inter/);
    expect(police).toMatch(/system-ui|-apple-system/);
  });

  for (const chemin of ["/songs", "/login"]) {
    test(`aucun texte sous 12 px sur ${chemin}`, async ({ page }) => {
      await page.goto(chemin);
      await page.locator("main").first().waitFor();
      const petits = await page.evaluate(() => {
        const trouves: string[] = [];
        const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let noeud: Node | null;
        while ((noeud = marcheur.nextNode())) {
          const texte = noeud.textContent?.trim();
          if (!texte) continue;
          const el = noeud.parentElement!;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const taille = parseFloat(style.fontSize);
          if (taille < 12) trouves.push(`${el.tagName.toLowerCase()} « ${texte.slice(0, 24)} » ${taille}px`);
        }
        return trouves;
      });
      expect(petits).toEqual([]);
    });
  }
});

// Lot CD, T1h (docs/spec-corrections-design/bo-reunions-taches.md, -7, -13, -16) : la zone de texte est de la famille des
// champs d'une ligne, les libellés des deux formulaires du Back-Office ont une seule recette, un bouton désactivé se lit
// « pas encore » (pas un blanc à moitié transparent). Compte simulé, personnes fictives.
test.describe("formulaires du Back-Office et bouton désactivé (CD, T1h)", () => {
  const MIREILLE = { uid: "uid-mireille", email: ADMIN_EMAIL, firstName: "Mireille", lastName: "V.", dansEquipes: ["da"], referentDe: ["da"] };
  const REUNION = {
    titre: "Réunion DA", type: "loisir", pour: "equipe:da", reunion: true, date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
    lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees", inscriptionDebut: "", inscriptionFin: "",
    sansCompte: false, lienExterne: "", contact: "", organisateurUid: "uid-mireille", organisateurNom: "Mireille V.", epingle: false,
    expiresAt: null, inscrits: 0, createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
  };
  const DOCS = { "evenements/reunion-da": REUNION };
  const ouvrir = async (page: Page, vers: string) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MIREILLE, DOCS, vers);
  };
  /** Les couleurs des jetons, lues sur des éléments témoins. */
  const jetons = (page: Page) => page.evaluate(() => {
    const lire = (classe: string, propriete: "color" | "backgroundColor") => {
      const el = document.createElement("span");
      el.className = classe;
      document.body.appendChild(el);
      const v = getComputedStyle(el)[propriete];
      el.remove();
      return v;
    };
    return { muted: lire("text-muted-foreground", "color"), secondary: lire("bg-secondary", "backgroundColor") };
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${theme} : la zone « Description » est un aplat gris sans filet, de 96 px au moins, et les libellés ont une recette`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await ouvrir(page, "/back-office/reunions/nouvelle");
      const description = page.getByLabel("Description");
      await expect(description).toBeVisible();
      const j = await jetons(page);
      const zone = await description.evaluate((e) => {
        const s = getComputedStyle(e);
        return { fond: s.backgroundColor, bordure: s.borderTopColor, largeurBordure: s.borderTopWidth, hauteur: e.getBoundingClientRect().height };
      });
      expect(zone.fond).toBe(j.secondary);
      expect(zone.bordure === "rgba(0, 0, 0, 0)" || zone.largeurBordure === "0px", "aucun filet visible").toBe(true);
      expect(zone.hauteur).toBeGreaterThanOrEqual(96);
      // Les libellés : 13 px semi-gras gris, champs de 44 px (nom, date, lieu).
      for (const nom of ["Nom de la réunion", "Date", "Lieu"]) {
        const libelle = page.locator("label", { hasText: new RegExp(`^${nom}$`) }).first();
        const s = await libelle.evaluate((e) => { const c = getComputedStyle(e); return { taille: c.fontSize, graisse: c.fontWeight, couleur: c.color }; });
        expect(s, `libellé « ${nom} »`).toEqual({ taille: "13px", graisse: "600", couleur: j.muted });
        const champ = page.getByLabel(nom, { exact: true });
        expect((await champ.boundingBox())!.height, `champ « ${nom} »`).toBeCloseTo(44, 0);
      }
    });

    test(`${theme} : « Nouvelle tâche » a les mêmes libellés et des champs de 44 px`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await ouvrir(page, "/back-office/taches/da/nouvelle");
      const j = await jetons(page);
      for (const nom of ["Titre", "Échéance", "Note"]) {
        const libelle = page.locator("label", { hasText: new RegExp(`^${nom}$`) }).first();
        await expect(libelle).toBeVisible();
        const s = await libelle.evaluate((e) => { const c = getComputedStyle(e); return { taille: c.fontSize, graisse: c.fontWeight, couleur: c.color }; });
        expect(s, `libellé « ${nom} »`).toEqual({ taille: "13px", graisse: "600", couleur: j.muted });
        expect((await page.getByLabel(nom, { exact: true }).boundingBox())!.height, `champ « ${nom} »`).toBeCloseTo(44, 0);
      }
    });

    test(`${theme} : le bouton « Enregistrer » du lien, champ vide, est lisible « pas encore » (opacité 1, texte gris, sans aplat)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await ouvrir(page, "/back-office/reunions/reunion-da");
      const bouton = page.getByTestId("compte-rendu-carte").getByRole("button", { name: "Enregistrer", exact: true });
      await expect(bouton).toBeDisabled();
      const j = await jetons(page);
      const s = await bouton.evaluate((e) => { const c = getComputedStyle(e); return { opacite: c.opacity, couleur: c.color, fond: c.backgroundColor }; });
      expect(s).toEqual({ opacite: "1", couleur: j.muted, fond: "rgba(0, 0, 0, 0)" });
    });
  }

  test("la règle des boutons désactivés est unique, dans button.tsx : fond --secondary, texte --muted-foreground, sans opacité", () => {
    const source = readFileSync(path.join(__dirname, "..", "src/components/ui/button.tsx"), "utf8");
    expect(source).toContain("disabled:bg-secondary");
    expect(source).toContain("disabled:text-muted-foreground");
    expect(source).not.toMatch(/disabled:opacity/);
  });
});

// Recette de surface (C, lot CD, T2a ; docs/spec-corrections-design/partout.md) : le fond de groupe #f2f2f7 sur les
// pages de liste et de gestion, le blanc sur les pages de lecture, le noir en sombre partout.
test.describe("fond de page : le gris des listes, le blanc de la lecture (recette de surface C)", () => {
  const GRIS = "rgb(242, 242, 247)";
  const MUSICIEN = { uid: "uid-surface", email: "surface@example.com", planningName: "Lia M.", serviceRoles: { "Culte Francophone": ["musicien"] } };
  const sansSheet = (page: Page) =>
    page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const PAGES = [
    { nom: "setlists", vers: "/setlists", clair: GRIS, attente: (page: Page) => page.getByRole("heading", { level: 1, name: "Setlists" }).waitFor() },
    { nom: "planning", vers: "/planning", clair: GRIS, attente: (page: Page) => page.getByRole("heading", { level: 1, name: "Planning" }).waitFor() },
    { nom: "un chant", vers: "/songs/tu-m-aimes", clair: FOND_CLAIR, attente: (page: Page) => page.getByTestId("barre-outils").waitFor() },
    { nom: "harmonie", vers: "/harmonie", clair: FOND_CLAIR, attente: (page: Page) => page.getByRole("heading", { level: 1 }).waitFor() },
  ];
  for (const { nom, vers, clair, attente } of PAGES) {
    test(`${nom} : ${clair === GRIS ? "#f2f2f7" : "blanc"} en clair, noir en sombre`, async ({ page }) => {
      await sansSheet(page);
      await signInAs(page, MUSICIEN, {}, vers);
      await attente(page);
      // Un chant en deux volets : le gris autour, la page du chant est un grand groupe blanc posé dessus.
      if (nom === "un chant" && await page.locator(".chants-liste").isVisible()) {
        await expect.poll(() => fondDe(page)).toBe(GRIS);
        expect(await page.locator(".chants-chant").evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(FOND_CLAIR);
      } else await expect.poll(() => fondDe(page)).toBe(clair);
      await page.emulateMedia({ colorScheme: "dark" });
      await expect.poll(() => fondDe(page)).toBe(FOND_SOMBRE);
    });
  }

  test("planning : les barres repeignent le gris (navbar et barre des onglets)", async ({ page }) => {
    test.skip(test.info().project.name.startsWith("ordinateur"), "ordinateur : pas de barre en haut (lot U4)");
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/planning");
    await page.getByRole("heading", { level: 1, name: "Planning" }).waitFor();
    const fonds = await page.locator(".material-chrome:not(.material-steady) > .barre-fond").evaluateAll((els) =>
      els.filter((el) => el.getClientRects().length > 0).map((el) => getComputedStyle(el).backgroundColor));
    expect(fonds.length).toBeGreaterThan(0);
    for (const fond of fonds) expect(fond).toBe(GRIS);
  });

  test("ordinateur 1100 px, barre dépliée : la page d'un chant seule reste blanche (pas deux volets)", async ({ page }) => {
    test.skip(test.info().project.name !== "ordinateur", "propre à l'ordinateur à 1100 px");
    await page.setViewportSize({ width: 1100, height: 800 });
    await ouvrirAvecBarre(page, "depliee");
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/songs/tu-m-aimes");
    await page.getByTestId("barre-outils").waitFor();
    await expect(page.locator(".chants-liste")).toBeHidden();
    await expect.poll(() => fondDe(page)).toBe(FOND_CLAIR);
  });

  test("un volet, clair, /songs : la liste finit avant l'index A–Z, et la recherche est en aplat sans ombre", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/songs");
    await page.locator(".chants-liste").waitFor();
    // Deux volets (ordinateur, tablette couchée) : l'index est dans la carte, autre règle.
    test.skip(await page.locator(".chants-chant").isVisible(), "propre à la disposition en un volet");
    const index = page.locator('nav[aria-label="Index alphabétique"]');
    await expect(index).toBeVisible();
    const liste = (await page.locator(".chants-liste").boundingBox())!;
    const indexBox = (await index.boundingBox())!;
    expect(liste.x + liste.width).toBeLessThanOrEqual(indexBox.x);
    const recherche = page.locator('.chants-liste input[type="search"]');
    expect(await recherche.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(242, 242, 244)");
    expect(await recherche.evaluate((e) => getComputedStyle(e).boxShadow)).toBe("none");
  });

  test("sombre, Setlists : la recherche et la cloche gardent leur fond d'avant la recette", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/setlists");
    await page.getByRole("heading", { level: 1, name: "Setlists" }).waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => fondDe(page)).toBe(FOND_SOMBRE);
    // Recherche : `raised` sombre (#1c1c1e) et son liseré ; cloche : `--secondary` sombre (#2c2c2e).
    const recherche = page.locator('input[type="search"]').first();
    await expect.poll(() => recherche.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(28, 28, 30)");
    expect(await recherche.evaluate((e) => getComputedStyle(e).boxShadow)).toContain("0px 0px 0px 1px");
    const fonds = await page.locator(".blanc-sur-gris").evaluateAll((els) =>
      els.filter((el) => el.getClientRects().length > 0).map((el) => getComputedStyle(el).backgroundColor));
    // Sur ordinateur la barre du haut n'existe pas (lot U4) : pas de cloche à mesurer.
    if (!test.info().project.name.startsWith("ordinateur") && test.info().project.name !== "tablette-paysage") expect(fonds.length).toBeGreaterThan(0);
    for (const fond of fonds) expect(fond).toBe("rgb(44, 44, 46)");
  });

  test("téléphone, /songs en clair : la liste est un groupe blanc de rayon 16", async ({ page }) => {
    test.skip(test.info().project.name !== "telephone", "propre au téléphone");
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/songs");
    const liste = page.locator(".chants-liste");
    await liste.waitFor();
    await expect.poll(() => fondDe(page)).toBe(GRIS);
    const style = await liste.evaluate((e) => { const c = getComputedStyle(e); return { fond: c.backgroundColor, rayon: c.borderTopLeftRadius }; });
    expect(style).toEqual({ fond: FOND_CLAIR, rayon: "16px" });
  });
});

test.describe("pages grises : ni bordure ni ombre ensemble, ombre réservée aux commandes et à ce qui flotte (recette de surface C, T2b)", () => {
  const ADMIN = { uid: "uid-surface-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.", dansEquipes: ["da"], referentDe: ["da"], serviceRoles: { "Culte Francophone": ["musicien"] } };
  const PAGES_GRISES = [
    { nom: "setlists", vers: "/setlists" },
    { nom: "planning", vers: "/planning" },
    { nom: "mes-services", vers: "/mes-services" },
    { nom: "moi", vers: "/moi" },
    { nom: "back-office", vers: "/back-office" },
    { nom: "evenements", vers: "/evenements" },
  ];
  for (const { nom, vers } of PAGES_GRISES) {
    test(`${nom} : aucun élément de main n'a bordure et ombre à la fois, aucun aplat blanc arrondi n'a d'ombre`, async ({ page }) => {
      await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
      await signInAs(page, ADMIN, {}, vers);
      await page.locator("main").first().waitFor();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
      await expect.poll(() => fondDe(page)).toBe("rgb(242, 242, 247)");
      const fautifs = await page.evaluate(() => {
        const decrit = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.getAttribute("class") ?? "").split(/\s+/).slice(0, 4).join(".")}`;
        // Le curseur du rail (jeu B) est une commande : sa pastille blanche garde son ombre.
        const flottant = (el: Element) => Boolean(el.closest('[data-onglets="rail"], .material-bar, .material-panel, .flottant, [role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], header, nav'));
        const vus: string[] = [];
        for (const el of document.querySelectorAll("main *")) {
          if (el.getClientRects().length === 0 || flottant(el)) continue;
          const c = getComputedStyle(el);
          if (c.visibility === "hidden" || c.display === "none") continue;
          const ombre = c.boxShadow !== "none";
          const bordure = ["Top", "Right", "Bottom", "Left"].some((cote) => {
            const k = c[`border${cote}Width` as "borderTopWidth"];
            return parseFloat(k) > 0 && c[`border${cote}Style` as "borderTopStyle"] !== "none" && !/rgba\(\d+, \d+, \d+, 0\)/.test(c[`border${cote}Color` as "borderTopColor"]) && c[`border${cote}Color` as "borderTopColor"] !== "transparent";
          });
          if (ombre && bordure) vus.push(`bordure+ombre ${decrit(el)}`);
          const arrondi = parseFloat(c.borderTopLeftRadius) > 0;
          if (ombre && arrondi && c.backgroundColor === "rgb(255, 255, 255)") vus.push(`blanc arrondi ombré ${decrit(el)}`);
        }
        return vus;
      });
      expect(fautifs).toEqual([]);
    });
  }
});

test.describe("jeton --pose (lot CD, T3a, back-office-3)", () => {
  const sonde = (page: Page) =>
    page.evaluate(() => {
      const el = document.createElement("span");
      el.className = "bg-pose";
      document.body.append(el);
      const fond = getComputedStyle(el).backgroundColor;
      el.remove();
      return { jeton: getComputedStyle(document.documentElement).getPropertyValue("--pose").trim(), fond };
    });

  test("blanc en clair (rien ne change), #3a3a3c en sombre ; la couleur Tailwind `pose` le suit", async ({ page }) => {
    await page.goto("/login");
    expect(await sonde(page)).toEqual({ jeton: "0 0% 100%", fond: FOND_CLAIR });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(async () => (await sonde(page)).fond).toBe("rgb(58, 58, 60)");
    expect((await sonde(page)).jeton).toBe("240 1.7% 23.1%");
  });
});

test("la variante `outline` de button.tsx est posée sur `--pose` (une seule modification), ni `bg-background` ni noir en sombre", () => {
  const source = readFileSync(path.join(process.cwd(), "src/components/ui/button.tsx"), "utf8");
  const outline = source.split("\n").find((l) => l.includes("border border-input")) ?? "";
  expect(outline).toContain("bg-pose");
  expect(outline).not.toContain("bg-background");
});

// Lot CD, T4a (docs/spec-corrections-design/partout.md, P12 et P13) : aucun texte sous 12 px, et à partir de 1 024 px
// de fenêtre le gris (`--muted-foreground`) ne descend pas sous 13 px. Compte simulé, noms inventés pour ce test.
// Exceptions par sélecteur explicite (partitions, 简谱, pastille de 16 px), jamais par taille.
test.describe("plancher de texte et gris à 13 px en grand (CD, T4a)", () => {
  const BASILE = { uid: "uid-basile", email: ADMIN_EMAIL, firstName: "Basile", lastName: "Q.", planningName: "Basile Q.", serviceRoles: { "Culte Francophone": ["musicien"] } };
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const ENTETE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
  const culte = (date: string) => [date, "Odile M.", "Noé T.", "Ysée V.", "Basile Q.", "Samuel K.", "Gaëtan D.", "Marc A.", "Rémi K.", "Clotilde W.", "Jun L.", "", ""];
  const FEUILLES: Record<string, string> = { Franco_Louange: csv([ENTETE, culte("08/11"), culte("14/11"), culte("22/11")]) };
  const DOCS = {
    "setlists/sl-t4a": {
      title: "Culte du 14 novembre", leader: "Odile M.", category: "Culte Francophone", date: "2026-11-14",
      language: "mixed", notes: "", ownerId: "uid-basile", isPrivate: false, items: [],
    },
  };
  const EXCEPTIONS = "[data-jianpu-filtre], [data-partition], [data-pastille-compteur]";

  async function ouvrir(page: Page, adresse: string) {
    await page.clock.setFixedTime(new Date("2026-11-07T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
    });
    await signInAs(page, BASILE, DOCS, adresse);
    await page.locator("main").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800); // laisse les listes se remplir (pas de `networkidle` : Mes services garde une requête ouverte)
  }

  for (const chemin of ["/planning", "/setlists", "/mes-services", "/songs/statistiques"]) {
    test(`P12/P13 : aucun texte sous 12 px, gris à 13 px en grand sur ${chemin}`, async ({ page }) => {
      await ouvrir(page, chemin);
      const trop = await page.evaluate((exceptions) => {
        const sonde = document.createElement("span");
        sonde.style.color = "hsl(var(--muted-foreground))";
        document.body.appendChild(sonde);
        const canaux = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).join(",");
        const gris = canaux(getComputedStyle(sonde).color);
        sonde.remove();
        const grand = window.innerWidth >= 1024;
        const fautes: string[] = [];
        const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let noeud: Node | null;
        while ((noeud = marcheur.nextNode())) {
          const texte = noeud.textContent?.trim();
          if (!texte) continue;
          const el = noeud.parentElement!;
          if (el.closest(exceptions) || el.closest("script, style, noscript")) continue;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || el.getClientRects().length === 0) continue;
          const taille = parseFloat(style.fontSize);
          const decrit = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} « ${texte.slice(0, 24)} » ${taille}px`;
          if (taille < 12) fautes.push(`< 12 : ${decrit}`);
          else if (grand && taille < 13 && canaux(style.color) === gris) fautes.push(`gris < 13 : ${decrit}`);
        }
        return fautes;
      }, EXCEPTIONS);
      expect(trop).toEqual([]);
    });

    test(`vignettes de date et badges sans débordement sur ${chemin}`, async ({ page }) => {
      await ouvrir(page, chemin);
      const debordent = await page.evaluate(() => {
        const sortie: string[] = [];
        const date = /^\d{1,2}\s\p{L}+\.?$/u;
        for (const el of document.querySelectorAll<HTMLElement>("main *, header *")) {
          const texte = el.textContent?.trim() ?? "";
          if (!texte || texte.length > 24 || el.children.length > 2) continue;
          if (!(date.test(texte) || /rounded/.test(String(el.className)))) continue;
          if (el.clientWidth === 0 || getComputedStyle(el).display === "inline") continue;
          if (el.scrollWidth <= el.clientWidth) continue;
          // Les pastilles tactiles portent une zone de toucher qui dépasse de 3 px (pseudo-élément) et gonfle
          // `scrollWidth` sans toucher au texte : on ne retient que le texte réellement hors de la boîte.
          const zone = document.createRange();
          zone.selectNodeContents(el);
          const [t, b] = [zone.getBoundingClientRect(), el.getBoundingClientRect()];
          if (t.right > b.right + 0.5 || t.left < b.left - 0.5) sortie.push(`${el.tagName.toLowerCase()} « ${texte} » ${el.scrollWidth} > ${el.clientWidth}`);
        }
        return sortie;
      });
      expect(debordent).toEqual([]);
    });
  }

  // La règle P13 elle-même (globals.css), sur des sondes : le gris relevé à 13 / 18 en grand, sans écraser une taille
  // plus grande posée par une variante ni un `leading-*` posé exprès ; l'encre et un gris au survol restent à 12.
  test("P13 : la règle relève le gris en grand sans écraser une variante ni un interligne", async ({ page }) => {
    await page.goto("/songs");
    await page.locator("main").first().waitFor();
    const mesures = await page.evaluate(() => {
      const sondes: Record<string, string> = {
        gris: "text-xs text-muted-foreground",
        grisOpacite: "text-xs text-muted-foreground/70",
        grisSerre: "text-xs text-muted-foreground leading-none",
        grisVariante: "text-xs text-muted-foreground md:text-base",
        encre: "text-xs text-foreground",
        survol: "text-xs text-foreground hover:text-muted-foreground",
      };
      const sortie: Record<string, [number, number]> = {};
      for (const [nom, classes] of Object.entries(sondes)) {
        const el = document.createElement("span");
        el.className = classes;
        el.style.display = "block";
        el.textContent = "Sonde";
        document.body.appendChild(el);
        const c = getComputedStyle(el);
        sortie[nom] = [parseFloat(c.fontSize), parseFloat(c.lineHeight)];
        el.remove();
      }
      return { grand: window.innerWidth >= 1024, largeur: window.innerWidth, sortie };
    });
    const { grand, largeur, sortie } = mesures;
    expect(sortie.gris).toEqual(grand ? [13, 18] : [12, 16]);
    expect(sortie.grisOpacite).toEqual(grand ? [13, 18] : [12, 16]);
    expect(sortie.grisSerre, "leading-none garde son interligne (1 × la taille)").toEqual(grand ? [13, 13] : [12, 12]);
    expect(sortie.grisVariante, "md:text-base l'emporte dès 768 px").toEqual(largeur >= 768 ? [15, 21] : [12, 16]);
    expect(sortie.encre).toEqual([12, 16]);
    expect(sortie.survol).toEqual([12, 16]);
  });
});
