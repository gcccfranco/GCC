import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { cleDeTransition } from "../src/lib/deuxVolets";
import { adresseDuService, repetitionsDe, serviceDeLAdresse } from "../src/lib/planning/mesServices";
import { CULTE_ROLES, EDD_ROLES_COLS, FIDELITE_ROLES, GROUPE_ROLES, INTERFRANCO_ROLES, INTERGROUPE_ROLES, nomDuService } from "../src/lib/planning/names";
import { CLE_ROLE, libelleRole } from "../src/components/mesServices/PastilleRole";
import fr from "../src/locales/fr.json";
import zh from "../src/locales/zh-CN.json";

// Lot U4 bis, tranche B4 — Mes services (docs/spec-pages-en-grand.md, Q7 ; planches
// `mes-services-*`). En grand : la liste à gauche, le service à droite (rôles, répétition,
// setlist liée, équipe du service) ; sur l'adresse de la liste, le prochain service (Q3).
// Nouvelle adresse `/mes-services/[date]` (téléphone, liens). Tablette portrait : cartes sur
// deux colonnes. Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Noé T.", "Inès V.", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    culte("27/09", "Léa M.", "Ruth K."),
    culte("04/10", "Léa M.", "Ruth K."),
    culte("11/10", "Léa M.", "Yann B."),
    culte("18/10", "Hugo L.", "Ruth K."),
    culte("25/10", "Léa M.", "Ruth K."),
  ]),
  // Le même dimanche que le culte du 4 : deux services à la même date.
  Paix_T4: csv([["DATE", "Présidence", "Musiciens", "Orateur"], ["04/10", "Clara B.", "Ruth K.", "Orateur Z."]]),
};

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLIST = {
  title: "Culte du 4 octobre", leader: "Léa M.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [item("hosanna", 1), item("abba-pere", 2)],
};
const DOCS = { "setlists/sl-1": SETLIST };

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, RUTH, DOCS, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur, ordinateur-1440, tablette-paysage
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const ligne = (page: Page, nom: RegExp) => liste(page).getByRole("link", { name: nom });
const equipe = (page: Page) => page.getByRole("region", { name: "L'équipe de ce service" });
const laSetlist = (page: Page) => page.getByRole("region", { name: "La setlist de ce service" });
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("Mes services : la règle des adresses, sans navigateur", () => {
  const s = (date: string, service: string, over: Record<string, unknown> = {}) => ({ date, service, roles: ["Piano"], ...over });
  const tous = [s("2026-10-04", "Culte Franco"), s("2026-10-04", "Groupe Paix"), s("2026-10-18", "Culte Franco")];

  test("un service seul à sa date : la date suffit ; deux le même jour : le service s'ajoute", () => {
    expect(adresseDuService(tous[2], tous)).toBe("/mes-services/2026-10-18");
    expect(adresseDuService(tous[1], tous)).toBe("/mes-services/2026-10-04?service=Groupe%20Paix");
    expect(adresseDuService(tous[0], tous)).toBe("/mes-services/2026-10-04?service=Culte%20Franco");
  });

  test("l'adresse rend son service ; sans service nommé, le premier du jour ; date inconnue, rien", () => {
    expect(serviceDeLAdresse(tous, "2026-10-04", "Groupe Paix")).toBe(tous[1]);
    expect(serviceDeLAdresse(tous, "2026-10-04", null)).toBe(tous[0]);
    expect(serviceDeLAdresse(tous, "2026-10-04", "Inconnu")).toBe(tous[0]);
    expect(serviceDeLAdresse(tous, "2026-10-11", null)).toBeUndefined();
  });

  // Relecture du lot : deux services du même nom le même jour (les répétitions du Campus pour la
  // séance du matin et pour celle du soir) sont deux lignes ; chacune a son adresse et la rend.
  test("deux services du même nom le même jour : deux adresses, chacune rend le sien", () => {
    const matin = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "matin", time: "10:00" });
    const soir = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "soir", time: "17:00" });
    const culte = s("2026-10-17", "Culte Franco");
    const relire = (liste: typeof tous, adresse: string) => {
      const u = new URL(adresse, "https://gcc.example");
      const p = u.searchParams;
      return serviceDeLAdresse(liste, u.pathname.split("/").pop()!, p.get("service"), p.get("moment"), p.get("seance"));
    };
    for (const liste of [[matin, soir], [culte, matin, soir], [soir, culte, matin]]) {
      const adresses = liste.map((x) => adresseDuService(x, liste));
      expect(new Set(adresses).size, adresses.join(" · ")).toBe(liste.length);
      for (const x of liste) expect(relire(liste, adresseDuService(x, liste))).toBe(x);
    }
    expect(adresseDuService(culte, [culte, matin, soir]), "seul de son nom : le nom suffit").toBe("/mes-services/2026-10-17?service=Culte%20Franco");
    for (const x of tous) expect(relire(tous, adresseDuService(x, tous))).toBe(x);
  });

  test("la répétition d'une séance du Campus : même séance (date et moment), service différent", () => {
    const soir = s("2026-10-18", "Campus (soir)", { moment: "soir" });
    const repet = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "soir", time: "17:00" });
    const repetMatin = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "matin" });
    expect(repetitionsDe([soir, repet, repetMatin], soir)).toEqual([repet]);
    expect(repetitionsDe([soir, repet], repet), "une répétition n'a pas de répétition").toEqual([]);
  });

  test("la section reste montée d'un service à l'autre, et Mes tâches d'une tâche à l'autre", () => {
    expect(cleDeTransition("/mes-services/2026-10-18")).toBe("/mes-services");
    expect(cleDeTransition("/taches/da/t1")).toBe("/taches");
  });
});

test.describe("Mes services en grand", () => {
  test.beforeEach(({}, info) => { test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage"); });

  test("la liste à gauche, le prochain service à droite, l'adresse inchangée", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    // Agencement v18 (A11) : le titre dans l'en-tête, au-dessus des deux volets ; le service en h2.
    await expect(page.locator("header[data-entete-page]").getByRole("heading", { name: "Mes services", level: 1 })).toBeVisible();
    await expect(detail(page).getByRole("heading", { name: "Dimanche 4 octobre", level: 2 })).toBeVisible();
    await expect(ligne(page, /Culte Francophone.*4 oct/)).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).pathname).toMatch(/^\/mes-services\/?$/);
    // L'équipe d'après le planning, la personne en pastille d'encre ; la setlist liée.
    await expect(equipe(page).getByText("Léa M.")).toBeVisible();
    await expect(equipe(page).getByTestId("moi")).toHaveText("Ruth K.");
    await expect(laSetlist(page).getByText("Culte du 4 octobre")).toBeVisible();
    await expect(laSetlist(page).getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
    await expect(laSetlist(page).getByRole("link", { name: "Mode Louange" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?\?louange=1$/);
    // Côte à côte : la setlist à gauche, l'équipe à droite (planche `mes-services-ordinateur`).
    const [a, b] = [(await laSetlist(page).boundingBox())!, (await equipe(page).boundingBox())!];
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(await sansDefilementLateral(page)).toBe(true);
  });

  test("un lien direct vers un service : la liste à gauche, le service à droite ; retour arrière rend le précédent", async ({ page }) => {
    await ouvrir(page, "/mes-services/2026-10-18");
    await expect(detail(page).getByRole("heading", { name: "Dimanche 18 octobre", level: 2 })).toBeVisible();
    await expect(ligne(page, /Culte Francophone.*18 oct/)).toHaveAttribute("aria-current", "page");
    await expect(equipe(page).getByText("Hugo L.")).toBeVisible();
    await ligne(page, /Culte Francophone.*25 oct/).click();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-25\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Dimanche 25 octobre", level: 2 })).toBeVisible();
    await expect(ligne(page, /Culte Francophone.*18 oct/), "la liste reste montée").toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-18\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Dimanche 18 octobre", level: 2 })).toBeVisible();
  });

  test("deux services le même jour : chacun son adresse", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await ligne(page, /Groupe Paix.*4 oct/).click();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-04\/?\?service=Groupe(\+|%20)Paix$/);
    await expect(ligne(page, /Groupe Paix.*4 oct/)).toHaveAttribute("aria-current", "page");
    await expect(ligne(page, /Culte Francophone.*4 oct/)).not.toHaveAttribute("aria-current", "page");
    await expect(equipe(page).getByText("Clara B.")).toBeVisible();
  });

  test("Passés : à droite, le dernier service passé", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await liste(page).getByRole("tab", { name: "Passés" }).click();
    await expect(detail(page).getByRole("heading", { name: "Dimanche 27 septembre", level: 2 })).toBeVisible();
  });
});

test("tablette portrait : cartes sur deux colonnes ; le service seul sur son adresse", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await ouvrir(page, "/mes-services");
  const cartes = page.getByTestId("carte-service");
  await expect(cartes.first()).toBeVisible();
  const [b1, b2] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!];
  expect(b2.x, "deux colonnes").toBeGreaterThan(b1.x + b1.width - 1);
  expect(Math.abs(b2.y - b1.y)).toBeLessThan(2);
  await page.getByRole("link", { name: /Culte Francophone.*18 oct/ }).click();
  await expect(page).toHaveURL(/\/mes-services\/2026-10-18\/?$/);
  await expect(page.getByRole("heading", { name: "Dimanche 18 octobre", level: 1 })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mes services", exact: true })).toBeVisible();
  expect(await sansDefilementLateral(page)).toBe(true);
});

test("téléphone : la liste, puis le service en page (l'équipe avant la setlist)", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await ouvrir(page, "/mes-services");
  await expect(page.getByRole("heading", { name: "Mes services", level: 1 })).toBeVisible();
  // Le lien « Setlist » de la ligne mène toujours à la setlist.
  await expect(page.getByRole("link", { name: "Setlist" }).first()).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
  await page.getByRole("link", { name: /Culte Francophone.*4 oct/ }).click();
  await expect(page).toHaveURL(/\/mes-services\/2026-10-04\/?\?service=Culte(\+|%20)Franco$/);
  await expect(page.getByRole("heading", { name: "Dimanche 4 octobre", level: 1 })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  const retour = page.getByRole("link", { name: "Mes services", exact: true });
  await expect(retour).toBeVisible();
  const [eq, sl] = [(await equipe(page).boundingBox())!, (await laSetlist(page).boundingBox())!];
  expect(sl.y, "la setlist sous l'équipe").toBeGreaterThan(eq.y + eq.height - 1);
  expect(await sansDefilementLateral(page)).toBe(true);
  await retour.click();
  await expect(page).toHaveURL(/\/mes-services\/?$/);
});

// quotidien-7 : la bannière « Active les rappels » est un encadré gris sans filet ; la croix a une zone de 44 px au toucher.
test("bannière des rappels : encadré sans filet coloré, croix de 44 px au toucher", async ({ page }) => {
  await ouvrir(page, "/mes-services");
  const bandeau = page.getByText("Active les rappels de service").locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
  await expect(bandeau).toBeVisible();
  expect(await bandeau.evaluate((el) => getComputedStyle(el).borderTopWidth), "pas de filet").toBe("0px");
  const croix = await page.getByRole("button", { name: "Fermer", exact: true }).first().evaluate((el) => ({
    coarse: matchMedia("(pointer:coarse)").matches,
    zone: [parseFloat(getComputedStyle(el, "::after").width), parseFloat(getComputedStyle(el, "::after").height)],
  }));
  expect(croix.coarse, "pointeur grossier sur les appareils tactiles").toBe(!!test.info().project.use.hasTouch);
  if (croix.coarse) for (const c of croix.zone) expect(c, "zone de la croix").toBeGreaterThanOrEqual(44);
});

// quotidien-5 : la colonne seule part du bord du titre (plus de carte centrée).
test("liste seule : le bord gauche de la carte est celui du titre", async ({ page }, info) => {
  test.skip(disposition(info) !== "grand", "colonne seule : grand écran");
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, RUTH, {}, "/mes-services");
  const seule = page.locator("[data-colonne-seule]");
  await expect(seule).toBeVisible();
  const titre = (await page.locator("header[data-entete-page]").getByRole("heading", { name: "Mes services", level: 1 }).boundingBox())!;
  const carte = (await seule.locator(".raised").first().boundingBox())!;
  expect(Math.abs(carte.x - titre.x), "bord de la carte = bord du titre").toBeLessThan(2);
});

test("capture : Mes services", async ({ page }, info) => {
  await ouvrir(page, disposition(info) === "grand" ? "/mes-services/2026-10-18" : "/mes-services");
  await expect(page.getByText("Culte Francophone").first()).toBeVisible();
  await page.screenshot({ path: `test-results/pages-en-grand/mes-services-${info.project.name}.png`, animations: "disabled" });
  if (disposition(info) !== "grand") {
    await page.goto("/mes-services/2026-10-04?service=Culte%20Franco");
    await expect(equipe(page)).toBeVisible();
    await page.screenshot({ path: `test-results/pages-en-grand/mes-services-detail-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  }
});

// Lot CD, tranche T1 (services-1, -2, -6, -9).
test.describe("Mes services : pastille de rôle, noms traduits, titre du détail", () => {
  test("(pur) chaque libellé de rôle du planning a sa clé `planning.roles.*` (hors Chant et Régie)", () => {
    const libelles = new Set([...CULTE_ROLES, ...EDD_ROLES_COLS, ...INTERGROUPE_ROLES, ...INTERFRANCO_ROLES, ...GROUPE_ROLES, ...FIDELITE_ROLES].map(([, l]) => l as string));
    for (const l of libelles) {
      expect(CLE_ROLE[l], l).toBeTruthy();
      expect((zh.planning.roles as Record<string, string>)[CLE_ROLE[l]], l).toBeTruthy();
    }
  });

  test("(pur) nom du service et rôle : français brut ou « Culte Francophone », 中文 traduit", () => {
    const tr = (langue: typeof fr | typeof zh) => (cle: string, o?: { defaultValue: string }) =>
      cle.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], langue) as string ?? o?.defaultValue ?? cle;
    expect(nomDuService("Culte Franco", tr(fr))).toBe("Culte Francophone");
    expect(nomDuService("Culte Franco", tr(zh))).toBe("法语崇拜");
    expect(nomDuService("Campus (soir)", tr(zh))).toBe("Campus (soir)");
    expect(libelleRole("Choriste", "fr", tr(fr))).toBe("Choriste");
    expect(libelleRole("Piano", "zh-CN", tr(zh))).toBe("钢琴");
    expect(libelleRole("Régie", "zh-CN", tr(zh))).toBe("Régie");
  });

  test("sombre : la pastille de rôle de la liste se lit à 4,5:1, active ou non, et reprend la couleur de l'en-tête", async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
    await ouvrir(page, "/mes-services");
    const grand = disposition(info) === "grand";
    const zone = grand ? liste(page) : page.locator("main");
    const pastilles = zone.locator(".texte-service").filter({ hasText: "Piano" });
    await expect(pastilles.first()).toBeVisible();
    const mesure = (el: Element) => {
      const pixel = (css: string): [number, number, number, number] => {
        const c = document.createElement("canvas"); c.width = c.height = 1;
        const g = c.getContext("2d", { willReadFrequently: true })!; g.clearRect(0, 0, 1, 1); g.fillStyle = css; g.fillRect(0, 0, 1, 1);
        const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
      };
      const sur = (haut: [number, number, number, number], bas: [number, number, number, number]) =>
        [0, 1, 2].map((i) => haut[i] * haut[3] + bas[i] * (1 - haut[3])).concat(1) as [number, number, number, number];
      let fond: [number, number, number, number] = pixel(getComputedStyle(document.body).backgroundColor);
      const chaine: Element[] = []; for (let n: Element | null = el.parentElement; n; n = n.parentElement) chaine.unshift(n);
      for (const n of chaine) { const f = pixel(getComputedStyle(n).backgroundColor); if (f[3] > 0) fond = sur(f, fond); }
      const pastille = sur(pixel(getComputedStyle(el).backgroundColor), fond);
      const texte = sur(pixel(getComputedStyle(el).color), pastille);
      const lum = (c: number[]) => { const [r, g, b] = c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const [a, b] = [lum(texte), lum(pastille)];
      return { contraste: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), couleur: getComputedStyle(el).color };
    };
    const n = await pastilles.count();
    for (let i = 0; i < Math.min(n, 3); i++) {
      const m = await pastilles.nth(i).evaluate(mesure);
      expect(m.contraste, `pastille ${i}`).toBeGreaterThanOrEqual(4.5);
    }
    if (grand) {
      const liste2 = await pastilles.nth(1).evaluate((el) => getComputedStyle(el).color);
      const entete = await detail(page).locator("header .texte-service").filter({ hasText: "Piano" }).first().evaluate((el) => getComputedStyle(el).color);
      expect(liste2).toBe(entete);
    }
  });

  test("中文 : la liste, l'en-tête et la répétition disent 法语崇拜 et 钢琴", async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "/mes-services");
    const zone = disposition(info) === "grand" ? liste(page) : page.locator("main");
    const premiere = zone.locator("li").filter({ hasText: "法语崇拜" }).first();
    await expect(premiere).toContainText("钢琴");
    await expect(premiere).not.toContainText("Culte Franco");
    await expect(premiere).not.toContainText("Piano");
    if (disposition(info) === "grand") {
      await expect(detail(page).locator("header")).toContainText("法语崇拜");
      await expect(detail(page).locator("header")).toContainText("钢琴");
    }
  });

  test("la pastille du rôle est sur la ligne « dans N jours », à moins de 16 px du texte", async ({ page }) => {
    await ouvrir(page, "/mes-services/2026-10-04?service=Culte%20Franco");
    const entete = page.locator('[data-volet="detail"] header, main header').filter({ hasText: /dans 3/ }).last();
    await expect(entete).toBeVisible();
    const quand = (await entete.getByText(/dans 3/).boundingBox())!;
    const pastille = (await entete.locator(".texte-service").filter({ hasText: "Piano" }).boundingBox())!;
    expect(pastille.x - (quand.x + quand.width)).toBeLessThan(16);
    expect(Math.abs(pastille.y + pastille.height / 2 - (quand.y + quand.height / 2))).toBeLessThan(8);
  });

  test("le titre du détail : 22 px au téléphone et en deux volets, 30 px en tablette portrait, une ligne", async ({ page }, info) => {
    await ouvrir(page, "/mes-services/2026-10-04?service=Culte%20Franco");
    const titre = page.getByRole("heading", { name: "Dimanche 4 octobre" });
    await expect(titre).toBeVisible();
    const taille = await titre.evaluate((el) => getComputedStyle(el).fontSize);
    expect(taille).toBe(disposition(info) === "tablette" ? "30px" : "22px");
    if (disposition(info) === "telephone") expect((await titre.boundingBox())!.height).toBeLessThanOrEqual(34);
  });
});
