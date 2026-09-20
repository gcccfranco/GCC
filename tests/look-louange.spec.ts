import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

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
    await expect(page.locator("select").first()).toHaveValue("adoration");
    await expect(page.getByText(/résultats? sur 370/)).toBeVisible();
    await expect(page.locator("select").first().locator("option")).toContainText(["Adoration", "Foi"]);
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
    test(`barre d'outils sous la navbar, en pilule groupée (${nom})`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      const barre = page.getByTestId("barre-outils");
      await barre.waitFor();
      // Pendant l'animation d'entrée de la page, un ancêtre transformé fait
      // office de repère pour la barre fixée : mesurer une fois l'animation finie.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const [b, h] = await Promise.all([barre.boundingBox(), page.locator("header").boundingBox()]);
      expect(Math.round(b!.y), "la barre reste collée sous la navbar").toBe(Math.round(h!.y + h!.height));
      const pilule = page.getByTestId("pilule-tonalite");
      // 5C1 : ce qui se touche est en relief — surface blanche et ombre, plus un aplat gris.
      expect(await pilule.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
      expect(await pilule.evaluate((el) => getComputedStyle(el).boxShadow), "la pilule porte une ombre").not.toBe("none");
      expect(await pilule.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("9999px");
      // Les boutons dans la pilule n'ont ni bordure ni fond propre.
      const moins = pilule.getByRole("button").first();
      expect(await moins.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
    });
  }
});

test.describe("louange (T3) : barre d'outils du chant, téléphone et tablette", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "ordinateur", "cibles tactiles : téléphone et tablette seulement");
  });

  // Cibles tactiles (16/09/2026) : les boutons faisaient 32 px sur téléphone
  // et 28 px sur tablette, contre 36 px avant le lot 4.
  for (const [slug, nom] of [["abba-pere", "FR"], ["爱的约定", "ZH"]] as const) {
    test(`chaque commande de la barre d'outils fait au moins 36 px (${nom})`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      const barre = page.getByTestId("barre-outils");
      await barre.waitFor();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
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
    test.skip(info.project.name === "ordinateur", "largeur tactile seulement");
  });

  // 16/09/2026 : sur un chant 中文 avec partition 简谱 (six commandes), le
  // sélecteur natif rognait la tonalité (« E ( »). Fermé, il n'affiche plus
  // que la tonalité ; la liste ouverte garde « (orig.) » et « (reco.) ».
  test("la tonalité reste lisible dans le sélecteur fermé, la liste garde ses libellés, changer de tonalité fonctionne", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    const barre = page.getByTestId("barre-outils");
    await barre.waitFor();
    await expect(barre.getByRole("button", { name: "简谱" }), "chant à six commandes").toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const tonalite = page.getByTestId("tonalite-courante");
    // innerText : le suffixe « (orig.) » existe dans le DOM mais n'est affiché que sur ordinateur.
    await expect(tonalite).toHaveText("E", { useInnerText: true });
    expect(await tonalite.evaluate((el) => el.scrollWidth <= el.clientWidth), "la tonalité n'est pas rognée").toBe(true);
    const [t, pilule] = await Promise.all([tonalite.boundingBox(), page.getByTestId("pilule-tonalite").boundingBox()]);
    expect(t!.x).toBeGreaterThanOrEqual(pilule!.x);
    expect(t!.x + t!.width).toBeLessThanOrEqual(pilule!.x + pilule!.width);
    const select = page.getByTestId("pilule-tonalite").getByRole("combobox");
    await expect(select).toHaveValue("E");
    await expect(select.locator("option[value=E]")).toHaveText(/\(orig\.\)/);
    await select.selectOption("F");
    await expect(tonalite).toHaveText("F", { useInnerText: true });
    await expect(select).toHaveValue("F");
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
  test("la liste est en filets, et en sombre la vignette de date reste lisible", async ({ page }) => {
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
    expect(await liste.evaluate((el) => getComputedStyle(el).backgroundColor), "pas de boîte autour de la liste").toBe("rgba(0, 0, 0, 0)");
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
