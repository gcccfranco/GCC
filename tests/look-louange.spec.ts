import { expect, test, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, fermerBarre, onStage } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";

// Lot 4 « Nouveau look », tranche T3 : louange (docs/spec-look.md).
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const phone = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const ENCRE = "rgb(28, 28, 30)";
const BLEU_FR = "rgb(63, 99, 207)"; // --fr-accent
const ROUGE_ZH = "rgb(179, 38, 29)"; // --zh-accent
const CULTE = "rgb(45, 90, 101)"; // PLANNING_COLORS.culte
/** Le répertoire grandit : le total se lit dans l'index, il ne se fige pas ici. */
const TOTAL = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "songs-index.json"), "utf8")).songs.length;

const ligne = (page: Page, titre: string) => page.locator('li[id^="song-li-"]').filter({ hasText: titre }).first();
const couleur = (l: ReturnType<Page["locator"]>) => l.evaluate((el) => getComputedStyle(el).color);

test.describe("louange (T3) : liste des chants", () => {
  test.use(phone);

  // 5C1, retour de Christelle (vue A) : la tonalité est une pastille rectangulaire
  // à coins arrondis, à droite, bleue pour un chant français, rouge pour un 中文.
  test("une ligne : titre, artiste, puis la tonalité en pastille rectangulaire à droite, teintée par la langue", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    const abba = ligne(page, "Abba Père");
    const pastille = abba.getByTestId("tonalite");
    await expect(pastille).toHaveText("A");
    expect(await couleur(pastille)).toBe(BLEU_FR);
    await expect(abba.getByTestId("tuile")).toHaveCount(0);
    const [p, titre] = await Promise.all([pastille.boundingBox(), abba.getByText("Abba Père", { exact: true }).boundingBox()]);
    expect(p!.x, "la pastille est à droite du titre").toBeGreaterThan(titre!.x + titre!.width - 1);
    expect(p!.width, "rectangulaire").toBeGreaterThan(p!.height);
    expect(await pastille.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("7px");
    await expect(abba).toContainText("Samuel Olivier");
    await expect(abba).not.toContainText("Adoration");
    const zh = ligne(page, "爱的约定");
    expect(await couleur(zh.getByTestId("tonalite"))).toBe(ROUGE_ZH);
    await expect(zh).toContainText("Ài de yuē dìng");
  });

  test("les thèmes restent dans le filtre", async ({ page }) => {
    await page.goto("/songs?theme=adoration");
    await page.getByRole("searchbox").waitFor();
    const menu = page.locator("[data-menu]").first();
    await expect(menu).toHaveAttribute("data-pose", "");
    await expect(menu).toContainText("Adoration");
    await expect(menu).toHaveAttribute("aria-label", /: Adoration$/);
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).backgroundColor), "déclencheur en encre").toBe(ENCRE);
    await expect(page.getByText(new RegExp(`résultats? sur ${TOTAL}`))).toBeVisible();
    await menu.click();
    const lignes = page.getByRole("menu").getByRole("menuitemradio");
    await expect(lignes.filter({ hasText: "Adoration" }).first()).toHaveAttribute("aria-checked", "true");
    await expect(lignes.filter({ hasText: "Foi" }).first()).toBeVisible();
  });

  test("connecté : « Proposer un nouveau chant » est en encre, pas en rouge", async ({ page }) => {
    await signInAs(page, MUSICIEN, {}, "/songs");
    const proposer = page.getByRole("button", { name: /Proposer/ });
    await expect(proposer).toBeVisible();
    expect(await couleur(proposer)).toBe(ENCRE);
  });
});

test.describe("louange (T3) : page du chant", () => {
  test.use(phone);

  for (const [slug, nom] of [["abba-pere", "FR"], ["爱的约定", "ZH"]] as const) {
    test(`barre d'outils sous la navbar, armure au contour (${nom})`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      const barre = page.getByTestId("barre-outils");
      await barre.waitFor();
      // Pendant l'animation d'entrée de la page, un ancêtre transformé fait
      // office de repère pour la barre fixée : mesurer une fois l'animation finie.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      // La navbar : l'en-tête commun « Chants » (`EnTetePage`, agencement v18 R1 et A5) est aussi un <header>,
      // monté sur la page d'un chant (masqué en un volet).
      const [b, h] = await Promise.all([barre.boundingBox(), page.locator("header.barre-haut").boundingBox()]);
      expect(Math.round(b!.y), "la barre reste collée sous la navbar").toBe(Math.round(h!.y + h!.height));
      // L'armure (RU-3) a remplacé la pilule : au contour (ombre intérieure), coins de 9 px.
      const armure = page.getByTestId("armure");
      await expect(armure).toBeVisible();
      expect(await armure.evaluate((el) => getComputedStyle(el).boxShadow), "l'armure porte son contour").not.toBe("none");
      expect(await armure.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("9px");
    });
  }
});

// partout-q1 : casse normale sur la page chant, capitales gardées sur la scène du mode louange.
test.describe("louange : casse des titres de chants (partout-q1)", () => {
  test("le titre est en casse normale sur la page chant, en capitales sur la scène", async ({ page }) => {
    await page.goto("/songs/abba-pere");
    const titre = page.getByRole("heading", { level: 1, name: /abba/i }).last();
    await expect(titre).toBeVisible();
    expect(await titre.evaluate((el) => getComputedStyle(el).textTransform)).toBe("none");
    expect(await titre.evaluate((el) => getComputedStyle(el).letterSpacing)).not.toBe("normal");

    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    const setlist = {
      title: "Culte du 14 septembre", leader: "Présidence", category: "Culte Francophone", date: "2026-09-14", language: "mixed",
      notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [{
        keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
        songSlug: "abba-pere", position: 1,
      }],
    };
    await signInAs(page, MUSICIEN, { "setlists/setlist-louange": setlist }, "/setlists/setlist-louange");
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await fermerBarre(page); // barre ouverte à la première ouverture : l'en-tête du chant est alors invisible
    const titreScene = onStage(page, "[data-entete-chant] h2").first();
    await expect(titreScene).toBeVisible();
    expect(await titreScene.evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase");
  });
});

// Retour de Timothée du 20/09/2026 : en vue partitions, la barre d'outils de la
// setlist passait sur deux lignes sur son iPhone (402 pt) — 374 pt de commandes
// pour 370 pt de large. Une seule ligne à toute largeur de téléphone ; sous
// 431 pt (lot CD, T4a : libellés de 12 px et pastilles à 8 px de marge, la barre ne tient plus
// sur un 430 pt), « Crayon » (qui remplace Adapter et Ma version, MP-3) vit dans le menu « ⋯ ». Même défaut sur
// tablette, l'appareil du pupitre : les libellés texte arrivaient dès 640 px et ne
// ne tiennent pas (iPad en portrait : 768 à 834 px). En paysage aussi (demande du
// soir même) : un téléphone reste en icônes dans les deux sens, jusqu'à 956 px de
// large ; les libellés n'arrivent qu'à 1024 px, l'iPad en paysage.
test.describe("louange : barre d'outils de la setlist, une seule ligne sur téléphone et tablette", () => {
  test.use(phone);

  const SETLIST_ID = "setlist-barre";
  const item = (over: Record<string, unknown>) => ({
    keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "", ...over,
  });
  // Le pire cas : on peut modifier et retoucher au Crayon (Pinyin est passé dans « Affichage »). Depuis SC1
  // (18/10/2026), seul le créateur modifie une setlist : la musicienne est la créatrice de la sienne.
  const setlist = {
    title: "高班", leader: "David C.", category: "Culte Francophone", date: "2026-09-20",
    language: "mixed", notes: "", ownerId: "uid-musicien", isPrivate: false,
    items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "爱的约定", position: 2 })],
  };
  const AIDE_CRAYON = "Crayon : touche un accord ou un mot pour le retoucher.";

  /** Deux volets (docs/spec-deux-volets.md, T4, Q7) : plus de barre d'outils, l'en-tête
   *  pleine largeur porte Crayon · Modifier · PDF · ⋯ · Mode louange (pas de
   *  Présentation sans lien), libellés compris ; la rangée tient sur une ligne, à droite du
   *  titre ou dessous, jamais par-dessus, ni sous la barre latérale (`bord`), ni hors de l'écran. */
  async function enTeteSurUneLigne(page: Page, largeur: number, bord: number) {
    const enTete = page.locator("[data-en-tete]");
    await expect(enTete.getByRole("button", { name: "Mode Louange" })).toBeVisible();
    await expect(page.getByTestId("barre-outils")).toHaveCount(0);
    const boites = await enTete.locator("a, button").evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { nom: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "", milieu: r.top + r.height / 2, haut: r.top, gauche: r.left, droite: r.right };
        }),
    );
    const nomTitre = "高班, Afficher les détails de la setlist";
    expect(boites.map((b) => b.nom)).toEqual([nomTitre, "Crayon", "Modifier", "PDF", "Affichage", "Plus d'actions", "Mode Louange"]);
    const milieux = boites.map((b) => b.milieu);
    expect(Math.max(...milieux) - Math.min(...milieux), `une seule ligne : ${JSON.stringify(boites.map((b) => [b.nom, Math.round(b.milieu)]))}`).toBeLessThan(4);
    const titre = (await enTete.getByRole("button", { name: nomTitre }).boundingBox())!;
    for (const b of boites.filter((b) => b.nom !== nomTitre)) {
      expect.soft(b.gauche, `${b.nom} ne passe pas sous la barre latérale`).toBeGreaterThanOrEqual(bord);
      expect.soft(b.droite, `${b.nom} ne sort pas à droite`).toBeLessThanOrEqual(largeur);
      expect.soft(b.gauche >= titre.x + titre.width || b.haut >= titre.y + titre.height, `${b.nom} ne passe pas sur le titre`).toBe(true);
    }
    expect(await enTete.evaluate((el) => el.scrollWidth <= el.clientWidth), "l'en-tête ne déborde pas").toBe(true);
    await expect(enTete.getByText("Mode Louange", { exact: true }), "libellés compris").toBeVisible();
    await enTete.getByRole("button", { name: "Crayon" }).click();
    await expect(page.getByText(AIDE_CRAYON)).toBeVisible();
  }

  const ECRANS: [number, number, string][] = [
    [320, 568, "portrait"], [360, 740, "portrait"], [375, 667, "portrait"], [390, 844, "portrait"], [402, 874, "portrait"], [430, 932, "portrait"],
    [768, 1024, "iPad portrait"], [820, 1180, "iPad portrait"],
    [568, 320, "paysage"], [667, 375, "paysage"], [844, 390, "paysage"], [874, 402, "paysage"], [932, 430, "paysage"], [956, 440, "paysage"],
    [1024, 768, "iPad paysage"], [1180, 820, "iPad paysage"], [1366, 1024, "iPad paysage"],
  ];
  for (const [largeur, hauteur, sens] of ECRANS) {
    test(`${largeur} × ${hauteur} (${sens}) : toutes les commandes sur une ligne, rien ne dépasse`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: hauteur });
      await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
      await ouvrirPartitions(page);
      // iPad couché : deux volets, l'en-tête du grand écran (barre latérale de 68 px).
      if (sens === "iPad paysage") return enTeteSurUneLigne(page, largeur, 68);
      const barre = page.getByTestId("barre-outils");
      // Setlist G (docs/spec-deux-volets.md, Q3 et Q11) : « Affichage » remplace
      // Pinyin dans la barre ; la bascule Liste | Partitions est sous l'en-tête.
      // Affichage reste dans la barre à toutes les largeurs (RU-4).
      await expect(barre.getByRole("button", { name: "Affichage" })).toBeVisible();
      // La barre glisse (transition-transform) quand la page défile : la mesurer à l'arrêt, sinon un
      // décalage fractionnaire donne 31,999996 px au lieu de 32 sous charge.
      await expect.poll(() => barre.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);

      const boites = await barre.locator("a, button").evaluateAll((els) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { nom: el.getAttribute("aria-label") ?? "", milieu: r.top + r.height / 2, gauche: r.left, droite: r.right, h: r.height, l: r.width };
          }),
      );
      // Vue Partitions, un volet (T2 du lot exemples d'usage) : retour, bloc titre, bascule (Liste, Partitions), mode louange, ⋯ ;
      // affichage et accords restent dans la barre à toutes les largeurs (RU-4) ; dès 640 px s'y ajoute le crayon (MP-3, à la place d'Adapter et de Ma version), qui sous 640 px vit dans le menu « ⋯ ».
      const pleine = largeur >= 640;
      expect(boites.length, "retour, titre, (affichage, crayon, accords), Liste, Partitions, mode louange, ⋯").toBe(pleine ? 9 : 8);
      const milieux = boites.map((b) => b.milieu);
      expect(Math.max(...milieux) - Math.min(...milieux), `une seule ligne : ${JSON.stringify(boites.map((b) => [b.nom, Math.round(b.milieu)]))}`).toBeLessThan(4);
      for (const b of boites) {
        // iPad couché : la barre latérale réduite (68 px, lot U4, N4) est à gauche.
        expect.soft(b.gauche, `${b.nom} ne sort pas à gauche`).toBeGreaterThanOrEqual(sens === "iPad paysage" ? 68 : 0);
        expect.soft(b.droite, `${b.nom} ne sort pas à droite`).toBeLessThanOrEqual(largeur);
        // Les segments de la bascule (h-7 dans une bascule de 32 px) ont leur zone de toucher de 44 px au doigt.
        if (!/^(Liste|Partitions)$/.test(b.nom)) expect.soft(Math.min(b.h, b.l), `${b.nom} : pas plus petit qu'avant (32 px)`).toBeGreaterThanOrEqual(32);
      }
      // Icônes seules sur téléphone (dans les deux sens) et iPad en portrait ; libellés à partir de 1024 px.
      await expect(barre.getByText("Mode Louange", { exact: true })).toBeVisible({ visible: largeur >= 1024 });
      // La barre seule : à 320 px une longue ligne d'accords du corps (« Dm7(b5)/G ») dépasse de 4 px, c'est une autre histoire.
      expect(await barre.evaluate((el) => el.scrollWidth <= el.clientWidth), "la barre ne déborde pas").toBe(true);

      if (pleine) {
        // Assez de place : le Crayon reste dans la barre, comme Adapter avant lui.
        await barre.getByRole("button", { name: "Crayon" }).click();
        await expect(page.getByText(AIDE_CRAYON)).toBeVisible();
      } else {
        // Sous 640 px en vue Partitions : il passe dans le menu « ⋯ », et y marche pareil.
        await expect(barre.getByRole("button", { name: "Crayon" })).toBeHidden();
        await barre.getByRole("button", { name: "Plus d'actions" }).click();
        await page.getByRole("menuitemcheckbox", { name: "Crayon" }).click();
        await expect(page.getByText(AIDE_CRAYON)).toBeVisible();
        await barre.getByRole("button", { name: "Plus d'actions" }).click();
        await expect(page.getByRole("menuitemcheckbox", { name: "Crayon" })).toHaveAttribute("aria-checked", "true");
      }
    });
  }

  // Lot U4, N2 : sur ordinateur, la barre d'outils commence au bord de la barre latérale
  // dépliée (248 px). Les libellés n'arrivent que s'ils tiennent dans ce qui reste : ce test
  // « une seule ligne » mesure le seuil (des libellés trop tôt feraient passer la barre sur
  // deux lignes, `flex-wrap` étant le filet). N3 : de même à côté de la barre réduite (68 px).
  test.describe("ordinateur, à côté de la barre latérale dépliée (U4)", () => {
    test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    test.beforeEach(({}, info) => {
      test.skip(!info.project.name.startsWith("ordinateur"), "pointeur fin : projets ordinateur seulement");
    });
    for (const largeur of [1024, 1180, 1280, 1366, 1440, 1920]) {
      test(`ordinateur ${largeur} × 900 : une ligne, rien sous la barre latérale ni hors de l'écran`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 900 });
        await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
        await ouvrirPartitions(page);
        // Deux volets dès 900 px utiles, soit 1 148 px de fenêtre (docs/spec-deux-volets.md, Q1).
        if (largeur >= 1148) return enTeteSurUneLigne(page, largeur, 248);
        const barre = page.getByTestId("barre-outils");
        await expect(barre.getByRole("button", { name: "Affichage" })).toBeVisible();
        const boites = await barre.locator("a, button").evaluateAll((els) =>
          els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { nom: el.getAttribute("aria-label") ?? "", milieu: r.top + r.height / 2, gauche: r.left, droite: r.right };
            }),
        );
        expect(boites.length, "retour, titre, affichage, crayon, accords, Liste, Partitions, mode louange, ⋯").toBe(9);
        const milieux = boites.map((b) => b.milieu);
        expect(Math.max(...milieux) - Math.min(...milieux), `une seule ligne : ${JSON.stringify(boites.map((b) => [b.nom, Math.round(b.milieu)]))}`).toBeLessThan(4);
        for (const b of boites) {
          expect.soft(b.gauche, `${b.nom} ne passe pas sous la barre latérale`).toBeGreaterThanOrEqual(248);
          expect.soft(b.droite, `${b.nom} ne sort pas à droite`).toBeLessThanOrEqual(largeur);
        }
        expect(await barre.evaluate((el) => el.scrollWidth <= el.clientWidth), "la barre ne déborde pas").toBe(true);
        // 1 024 px : 776 px à côté de la barre, les libellés ne tiennent pas.
        await expect(barre.getByText("Mode Louange", { exact: true })).toBeHidden();
      });
    }
  });

  test.describe("ordinateur, à côté de la barre latérale réduite (U4, N3)", () => {
    test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    test.beforeEach(async ({ page }, info) => {
      test.skip(!info.project.name.startsWith("ordinateur"), "pointeur fin : projets ordinateur seulement");
      await page.addInitScript(() => localStorage.setItem("barre-laterale", "reduite"));
    });
    // Barre réduite : 956 px utiles dès 1 024 px, deux volets toujours (docs/spec-deux-volets.md, Q1).
    for (const largeur of [1024, 1180, 1280, 1440]) {
      test(`ordinateur ${largeur} × 900, barre réduite : une ligne, rien sous la barre latérale ni hors de l'écran`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 900 });
        await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
        await ouvrirPartitions(page);
        await enTeteSurUneLigne(page, largeur, 68);
      });
    }
  });
});

test.describe("louange (T3) : barre d'outils du chant, téléphone et tablette", () => {
  test.beforeEach(({}, info) => {
    // Dès 1024 px (`lg`), la barre du chant passe à 32 px quel que soit le pointeur : l'iPad
    // couché (projet tablette-paysage, lot U4) y est donc comme l'ordinateur — inchangé par U4.
    test.skip((info.project.use.viewport?.width ?? 0) >= 1024, "cibles tactiles : téléphone et tablette en portrait seulement");
  });

  // Cibles tactiles (16/09/2026) : les boutons faisaient 32 px sur téléphone
  // et 28 px sur tablette, contre 36 px avant le lot 4.
  for (const [slug, nom] of [["abba-pere", "FR"], ["爱的约定", "ZH"]] as const) {
    test(`chaque commande de la barre d'outils fait au moins 36 px (${nom})`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      const barre = page.getByTestId("barre-outils");
      await barre.waitFor();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const commandes = barre.locator("button, select");
      const n = await commandes.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const c = commandes.nth(i);
        if (!(await c.isVisible())) continue;
        const box = (await c.boundingBox())!;
        const nomCommande = (await c.getAttribute("aria-label")) ?? (await c.textContent())?.trim();
        expect.soft(Math.min(box.width, box.height), `${nomCommande}`).toBeGreaterThanOrEqual(36);
      }
    });
  }
});

test.describe("louange (T3) : sélecteur de tonalité, téléphone et tablette", () => {
  test.beforeEach(({}, info) => {
    test.skip((info.project.use.viewport?.width ?? 0) >= 1024, "largeur tactile seulement (sous 1024 px)");
  });

  // 16/09/2026 : sur un chant 中文 avec partition 简谱 (six commandes alors ; cinq depuis
  // que le bouton 谱 a quitté la barre pour le segment « 简谱 · Paroles », L3-T3), le
  // sélecteur natif rognait la tonalité (« E ( »). Fermé, il n'affiche plus
  // que la tonalité ; la liste ouverte garde « (orig.) » et « (reco.) ».
  test("la tonalité reste lisible dans le sélecteur fermé, la liste garde ses libellés, changer de tonalité fonctionne", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    const barre = page.getByTestId("barre-outils");
    await barre.waitFor();
    await expect(barre.getByRole("button", { name: "简谱" }), "chant à cinq commandes : 谱 a quitté la barre").toHaveCount(0);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    // Chant 中文 : « 1=E » entier dans le bouton de l'armure, sans rognage.
    const armure = page.getByTestId("armure");
    await expect(armure).toHaveText("1=E");
    expect(await armure.evaluate((el) => el.scrollWidth <= el.clientWidth), "la tonalité n'est pas rognée").toBe(true);
    await expect(async () => {
      if (!(await page.getByTestId("fenetre-armure").isVisible())) await armure.click({ timeout: 1000 });
      await expect(page.getByTestId("fenetre-armure")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    const radios = page.getByTestId("fenetre-armure").getByRole("radio");
    await expect(radios.filter({ hasText: /^E(?![#♯♭b])/ })).toContainText("orig.");
    await radios.filter({ hasText: /^F(?![#♯♭b])/ }).click();
    await expect(armure).toHaveText("1=F");
  });
});

test.describe("louange (T3) : setlists", () => {
  test.use(phone);

  test("une setlist : vignette de date dans la couleur de sa catégorie, titre, date, chants, présidence", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(
      page,
      MUSICIEN,
      { "setlists/s1": { title: "Culte Franco 27/09", leader: "Élise R.", category: "Culte Francophone", date: "2026-09-27", language: "fr", notes: "", isPrivate: false, items: [] } },
      "/setlists",
    );
    // Le filtre « Mes services » (dates où l'on sert, lues dans le Sheet) est
    // actif par défaut ; le Sheet est vide ici : on l'enlève.
    const filtreMesServices = page.getByRole("button", { name: /Mes services/ });
    if ((await filtreMesServices.getAttribute("aria-pressed")) === "true") await filtreMesServices.click();
    const ligneSetlist = page.getByRole("link", { name: /Culte Franco 27\/09/ });
    await expect(ligneSetlist).toBeVisible();
    const tuile = ligneSetlist.getByTestId("tuile");
    await expect(tuile).toContainText("27");
    await expect(tuile).toContainText("sept");
    expect(await couleur(tuile)).toBe(CULTE);
    await expect(ligneSetlist).toContainText("Élise R.");
    await expect(ligneSetlist).toContainText("0 chant");
  });

  // 5C1 : les listes sont des filets, plus des boîtes ; et en sombre une couleur de
  // service (serviceColors.ts n'a pas de variante sombre) est éclaircie pour rester lisible.
  test("la liste est un groupe à filets, et en sombre la vignette de date reste lisible", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await page.emulateMedia({ colorScheme: "dark" });
    await signInAs(
      page,
      MUSICIEN,
      { "setlists/s1": { title: "Culte Franco 27/09", leader: "Élise R.", category: "Culte Francophone", date: "2026-09-27", language: "fr", notes: "", isPrivate: false, items: [] } },
      "/setlists",
    );
    const filtreMesServices = page.getByRole("button", { name: /Mes services/ });
    if ((await filtreMesServices.getAttribute("aria-pressed")) === "true") await filtreMesServices.click();
    const ligneSetlist = page.getByRole("link", { name: /Culte Franco 27\/09/ });
    await expect(ligneSetlist).toBeVisible();
    const liste = ligneSetlist.locator("xpath=ancestor::ul[1]");
    // Recette de surface (C) : au téléphone la liste est un groupe `--card` (#1c1c1e en sombre, avec son liseré), plus des filets nus.
    expect(await liste.evaluate((el) => getComputedStyle(el).backgroundColor), "la liste est un groupe").toBe("rgb(28, 28, 30)");
    // Contraste du texte de la vignette sur le noir du fond : au moins 4,5.
    const contraste = await ligneSetlist.getByTestId("tuile").evaluate((el) => {
      const c = document.createElement("canvas").getContext("2d")!;
      c.fillStyle = getComputedStyle(el).color;
      c.fillRect(0, 0, 1, 1);
      const [r, g, b] = [...c.getImageData(0, 0, 1, 1).data].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
      return (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) / 0.05;
    });
    expect(contraste, "la date de la vignette se lit sur le noir").toBeGreaterThanOrEqual(4.5);
  });

  // 16/09/2026 : la ligne avait perdu la catégorie et tronquait la présidence.
  test("une setlist : la catégorie est écrite et la présidence n'est pas tronquée", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(
      page,
      MUSICIEN,
      { "setlists/s1": { title: "Culte du 27 septembre", leader: "Jonathan Zimmermann", category: "Culte Francophone", date: "2026-09-27", language: "fr", notes: "", isPrivate: false, items: [] } },
      "/setlists",
    );
    const filtreMesServices = page.getByRole("button", { name: /Mes services/ });
    if ((await filtreMesServices.getAttribute("aria-pressed")) === "true") await filtreMesServices.click();
    const ligneSetlist = page.getByRole("link", { name: /Culte du 27 septembre/ });
    await expect(ligneSetlist).toContainText("Culte Francophone");
    const presidence = ligneSetlist.locator("span", { hasText: "Jonathan Zimmermann" }).last();
    await expect(presidence).toBeVisible();
    // Le nom tient en entier dans la ligne : rien ne le coupe, rien ne le pousse hors du cadre.
    expect(await presidence.evaluate((el) => el.scrollWidth <= el.clientWidth), "la présidence n'est pas coupée").toBe(true);
    const [nom, ligne] = await Promise.all([presidence.boundingBox(), ligneSetlist.boundingBox()]);
    expect(nom!.width).toBeGreaterThan(0);
    expect(nom!.x + nom!.width, "la présidence reste dans la ligne").toBeLessThanOrEqual(ligne!.x + ligne!.width);
  });
});

// 5C1 (docs/spec-look.md § 20/09/2026) : la fiche d'une setlist.
test.describe("louange (5C1) : fiche d'une setlist", () => {
  test.use(phone);

  const chant = (over: Record<string, unknown>) => ({
    keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...over,
  });
  const fiche = (category: string) => ({
    title: `${category} 27/09`, leader: "Élise R.", category, date: "2026-09-27", language: "mixed", notes: "",
    ownerId: "uid-owner", isPrivate: false, isDraft: false,
    items: [chant({ songSlug: "beni-soit-ton-nom", position: 1, keyOverride: "G" }), chant({ songSlug: "abba-pere", position: 2 })],
  });
  const ouvrir = async (page: Page, id: string) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    // Un rôle dans chaque culte : la visibilité d'une setlist suit les services de la personne.
    const profil = { ...MUSICIEN, serviceRoles: { "Culte Francophone": ["musicien"], Intergroupe: ["musicien"] } };
    await signInAs(page, profil, { "setlists/culte": fiche("Culte Francophone"), "setlists/inter": fiche("Intergroupe") }, `/setlists/${id}`);
    await page.getByRole("button", { name: "Mode louange" }).waitFor();
  };
  const fond = (l: ReturnType<Page["locator"]>) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

  test("le bouton « Mode louange » prend la couleur du culte de la setlist", async ({ page }) => {
    await ouvrir(page, "culte");
    const bouton = page.getByRole("button", { name: "Mode louange" });
    expect(await fond(bouton)).toBe(CULTE);
    expect(await couleur(bouton)).toBe("rgb(255, 255, 255)");
  });

  test("Intergroupe : le fond du bouton est foncé d'un cran, pour que le libellé blanc se lise", async ({ page }) => {
    await ouvrir(page, "inter");
    expect(await fond(page.getByRole("button", { name: "Mode louange" }))).toBe("rgb(150, 109, 13)"); // #966d0d, pas l'ocre #a87b0f
  });

  test("la liste : structure en abrégé, tonalité en pastille, « orig. » quand elle est transposée", async ({ page }) => {
    await ouvrir(page, "culte");
    const beni = page.getByRole("listitem").filter({ hasText: "Béni soit Ton Nom" }).first();
    await expect(beni).toContainText("C1");
    await expect(beni).not.toContainText("Couplet");
    await expect(beni.getByTestId("tonalite")).toHaveText("G");
    await expect(beni.getByTestId("tonalite-origine")).toHaveText("orig. A");
    const abba = page.getByRole("listitem").filter({ hasText: "Abba Père" }).first();
    await expect(abba.getByTestId("tonalite")).toHaveText("A");
    await expect(abba.getByTestId("tonalite-origine")).toHaveCount(0);
  });
});

// 5C1 : le bandeau de structure reste en pastilles rondes ; c'est la taille qui
// suit l'écran (32 px sous 640 px, 44 px au-delà). Non cliquable : pas de plancher tactile.
test.describe("louange (5C1) : bandeau de structure", () => {
  test("pastilles rondes, 32 px sur téléphone et 44 px à partir de la tablette", async ({ page }) => {
    await page.goto("/songs/beni-soit-ton-nom");
    const pastille = page.locator('ol[aria-label="Structure"] li > span').first();
    await pastille.waitFor();
    const attendu = page.viewportSize()!.width < 640 ? 32 : 44;
    const boite = await pastille.boundingBox();
    expect(Math.round(boite!.height)).toBe(attendu);
    expect(await pastille.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("9999px");
  });

  test("sur téléphone, neuf étapes tiennent sur une rangée", async ({ page }) => {
    test.skip(page.viewportSize()!.width >= 640, "propre au téléphone");
    await page.goto("/songs/beni-soit-ton-nom");
    const pastilles = page.locator('ol[aria-label="Structure"] li > span');
    await pastilles.first().waitFor();
    const n = await pastilles.count();
    const hauts = await pastilles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    const parRangee = hauts.filter((y) => y === hauts[0]).length;
    expect(parRangee, `${n} étapes, ${parRangee} sur la première rangée`).toBeGreaterThanOrEqual(Math.min(n, 9));
  });
});
