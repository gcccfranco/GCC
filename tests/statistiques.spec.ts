import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canVoirStatistiques, entreesBackOffice, widgetsPermis } from "../src/lib/access";
import { dispositionParDefaut } from "../src/lib/tableauDeBord/disposition";
import { choisirReglage, groupesDeReglages } from "../src/lib/tableauDeBord/reglages";
import type { UserProfile } from "../src/types/user";

// Lot U7 (docs/spec-statistiques.md) — la page « Statistiques » du Back-Office.
// S2 : le droit (Q2, `canVoirStatistiques` = admin), l'adresse `/back-office/statistiques`
// (question 7) et l'entrée du menu ; la page elle-même (filtres, tableau) vient avec S3 et S4.
// Interrupteur coupé : 404 (tests/back-office-coupe.spec.ts).
// Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN) : l'entrée vit
// dans la barre latérale.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Un responsable non admin : il remplit un planning (Spec, « Tests »). */
const RESPONSABLE: FakeProfile = { uid: "uid-pl", email: "pl@example.com", firstName: "Paul", lastName: "L.", plannings: ["culte"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: "",
    serviceRoles: {}, annonces: [], notify: [], poles: [], equipes: false, plannings: p.plannings ?? [],
  }) as unknown as UserProfile;

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";

/** Sur la tablette en paysage, la barre est réduite : on la déplie pour atteindre le menu. */
async function deplierSiTablettePaysage(page: Page, info: TestInfo) {
  if (!estTablettePaysage(info)) return;
  await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale|展开侧边栏/ }).tap();
  await expect(page.getByTestId("barre-par-dessus")).toBeVisible();
}

/** Le menu du Back-Office : la barre latérale sur grand écran ; sur téléphone et tablette en
 *  portrait, la barre du bas (U6, B6 : 4 onglets + « Plus »). */
function menu(page: Page, info: TestInfo) {
  if (estOrdinateur(info)) return page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" });
  if (estTablettePaysage(info)) return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: "Navigation principale" });
  return page.getByTestId("barre-du-bas");
}

/** Sur téléphone et tablette en portrait, Statistiques n'est pas dans la barre par défaut :
 *  on l'atteint par « Plus » (planche bo-telephone-plus). */
async function ouvrirPlusSiPetitEcran(page: Page, info: TestInfo) {
  if (estOrdinateur(info) || estTablettePaysage(info)) return;
  await menu(page, info).getByRole("link", { name: "Plus" }).click();
  await expect(page.getByRole("heading", { name: "Plus", level: 1 })).toBeVisible();
}

test.describe("Statistiques (S2) : le droit (Q2)", () => {
  test("canVoirStatistiques : un admin oui ; un responsable non admin, un membre, un visiteur non", () => {
    expect(canVoirStatistiques(user(ADMIN))).toBe(true);
    expect(canVoirStatistiques(user(RESPONSABLE))).toBe(false);
    expect(canVoirStatistiques({ email: "membre@example.com" })).toBe(false);
    expect(canVoirStatistiques(null)).toBe(false);
  });

  test("l'entrée « statistiques » est la 8e du menu d'un admin, absente de celui d'un responsable", () => {
    const admin = entreesBackOffice(user(ADMIN), profil(ADMIN));
    expect(admin.at(-1)).toBe("statistiques");
    expect(entreesBackOffice(user(RESPONSABLE), profil(RESPONSABLE))).not.toContain("statistiques");
  });
});

test.describe("Statistiques (S2) : l'entrée et l'adresse", () => {
  test("un admin ouvre Back-Office › Statistiques depuis le menu", async ({ page }, info) => {
    await signInAs(page, ADMIN, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await ouvrirPlusSiPetitEcran(page, info);
    const entree = estOrdinateur(info) || estTablettePaysage(info)
      ? menu(page, info).getByRole("link", { name: "Statistiques" })
      : page.getByTestId("plus-entree").filter({ hasText: "Statistiques" });
    await expect(entree).toHaveAttribute("href", /^\/back-office\/statistiques\/?$/);
    await entree.click();
    await expect(page).toHaveURL(/\/back-office\/statistiques\/?$/);
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toBeVisible();
    await expect(page.getByText("Visible par les admins seulement")).toBeVisible();
    if (estOrdinateur(info) || estTablettePaysage(info)) {
      await deplierSiTablettePaysage(page, info);
      await expect(menu(page, info).getByRole("link", { name: "Statistiques" })).toHaveAttribute("aria-current", "page");
    } else {
      // Une page hors de la barre marque « Plus » (B6).
      await expect(menu(page, info).getByRole("link", { name: "Plus" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("un responsable non admin : aucune entrée, l'adresse répond « Page réservée aux administrateurs. »", async ({ page }, info) => {
    await signInAs(page, RESPONSABLE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(menu(page, info).getByRole("link", { name: "Planning" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Statistiques" })).toHaveCount(0);
    await ouvrirPlusSiPetitEcran(page, info);
    await expect(page.getByRole("link", { name: "Statistiques" })).toHaveCount(0);
    await page.goto("/back-office/statistiques");
    await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toHaveCount(0);
  });

  test("sans compte : la connexion, qui ramène à la page", async ({ page }) => {
    await page.goto("/back-office/statistiques");
    await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href", /^\/login\/?\?from=%2Fback-office%2Fstatistiques$/,
    );
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toHaveCount(0);
  });
});

test.describe("Statistiques (S2) : captures à regarder", () => {
  // Comparées à la planche bo-statistiques (titre, sous-titre, entrée courante du menu).
  test("la page d'un admin, dans chaque disposition", async ({ page }, info) => {
    await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
    await signInAs(page, ADMIN, {}, "/back-office/statistiques");
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    // Le fondu d'arrivée de la page : capturer une fois fini.
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s2.png` });
  });
});

// ─── S3 : « Les plus joués » ──────────────────────────────────────────────────
// Horloge au 04/10/2026. Recueil simulé (vrais slugs, pour que le titre ouvre une vraie page de
// chant) et setlists simulées : six publiées passées, dont une avec un même chant seul et en
// fusion (s5), une avec une transition (s4), trois d'avant juillet (s1 à s3) ; un brouillon, une
// privée, une du jour et une du 11/10, toutes avec « Abrite-moi » : aucune ne doit compter.

const RECUEIL = [
  { slug: "abba-pere", title: "Abba Père", language: "fr", artist: "Auteur Un", originalKey: "A" },
  { slug: "abrite-moi", title: "Abrite-moi", language: "fr", artist: "Auteur Deux", originalKey: "C" },
  { slug: "a-jamais-tu-es-saint", title: "À jamais Tu es saint", language: "fr", artist: "Auteur Trois", originalKey: "C#" },
  { slug: "爱的约定", title: "爱的约定", language: "zh", artist: "作者四", originalKey: "C" },
  { slug: "a-la-croix", title: "À la croix", language: "fr", artist: "Auteur Cinq", originalKey: "E" },
];

const chant = (songSlug: string, keyOverride: string | null = null) => ({
  songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const fusion = (...chants: [string, string | null][]) => ({
  ...chant(""), type: "fusion",
  fusionSongs: chants.map(([songSlug, keyOverride]) => ({ songSlug, keyOverride, structureOverride: null, sectionNotes: {} })),
});
const transition = () => ({ ...chant(""), type: "transition", transitionText: "Prière" });
const setlist = (date: string, category: string, leader: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader, language: "fr", notes: "", items, isDraft: false, isPrivate: false, ...extra,
});

const CULTE = "Culte Francophone";
const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/s1": setlist("2026-05-31", CULTE, "Marc L.", [chant("abba-pere", "G"), chant("a-jamais-tu-es-saint")]),
  "setlists/s2": setlist("2026-06-14", CULTE, "Marc L.", [chant("abba-pere", "G"), chant("abrite-moi")]),
  "setlists/s3": setlist("2026-06-28", "Groupe Paix", "Luc R.", [chant("abba-pere", "A"), chant("爱的约定")]),
  "setlists/s4": setlist("2026-08-16", CULTE, "marc l", [chant("a-jamais-tu-es-saint"), transition(), chant("爱的约定", "D")]),
  "setlists/s5": setlist("2026-09-06", "Groupe Paix", "Luc R.", [
    chant("a-jamais-tu-es-saint", "Db"), fusion(["a-jamais-tu-es-saint", "E"], ["爱的约定", "D"]),
  ]),
  "setlists/s6": setlist("2026-09-20", CULTE, "Marc L.", [chant("a-jamais-tu-es-saint", "D"), chant("ancien-chant", "E")]),
  "setlists/brouillon": setlist("2026-09-13", CULTE, "Marc L.", [chant("abrite-moi")], { isDraft: true }),
  "setlists/privee": setlist("2026-09-13", CULTE, "Marc L.", [chant("abrite-moi")], { isPrivate: true }),
  "setlists/du-jour": setlist("2026-10-04", CULTE, "Marc L.", [chant("abrite-moi")]),
  "setlists/a-venir": setlist("2026-10-11", CULTE, "Marc L.", [chant("abrite-moi")]),
};

/** Les lignes attendues sur 12 mois (le défaut) : 6 setlists comptées. */
const PLUS_JOUES_12_MOIS = [
  { rang: "1", titre: "À jamais Tu es saint", setlists: "4", part: "67 %", derniere: "20/09", tonalite: "C#", tendance: "+2" },
  { rang: "2", titre: "爱的约定", setlists: "3", part: "50 %", derniere: "06/09", tonalite: "D", tendance: "+1" },
  { rang: "3", titre: "Abba Père", setlists: "3", part: "50 %", derniere: "28/06", tonalite: "G", tendance: "−3" },
  { rang: "4", titre: "ancien-chant", setlists: "1", part: "17 %", derniere: "20/09", tonalite: "E", tendance: "+1" },
  { rang: "5", titre: "Abrite-moi", setlists: "1", part: "17 %", derniere: "14/06", tonalite: "C", tendance: "−1" },
];

const estTelephone = (info: TestInfo) => info.project.name === "telephone";

/** Ouvre la page d'un admin, horloge au 04/10/2026, recueil et setlists simulés. */
async function ouvrirStatistiques(page: Page, chemin = "/back-office/statistiques") {
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  const db = await signInAs(page, ADMIN, SETLISTS, chemin);
  // Tableau (tablette, ordinateur) ou liste (téléphone) : seul l'un des deux se voit.
  if (!chemin.includes("vue=")) await expect(page.locator('[data-testid="ligne-chant"]:visible').first()).toBeVisible();
  // Autres vues (S4) : la carte « Setlists comptées », ou le message d'une période vide.
  else await expect(page.getByTestId("setlists-comptees").or(page.getByText("Aucune setlist publiée sur cette période."))).toBeVisible();
  return db;
}

/** Les lignes visibles (tableau, ou liste sur téléphone), lues champ par champ. */
async function lignes(page: Page) {
  return page.locator('[data-testid="ligne-chant"]:visible').evaluateAll((els) =>
    els.map((el) => Object.fromEntries(
      [...el.querySelectorAll("[data-champ]")].map((c) => [c.getAttribute("data-champ"), (c.textContent ?? "").trim()]),
    )));
}
const colonne = async (page: Page, champ: string) => (await lignes(page)).map((l) => l[champ]);

async function setlistsComptees(page: Page) {
  return (await page.getByTestId("setlists-comptees").getByTestId("nombre").textContent())?.trim();
}

/** Trier : un en-tête cliquable (tableau) ou le menu « Trier par » (téléphone). */
async function trierPar(page: Page, info: TestInfo, colonneNom: "Chant" | "Setlists" | "Dernière fois" | "Tendance") {
  if (estTelephone(info)) await page.getByRole("combobox", { name: "Trier par" }).selectOption({ label: colonneNom });
  else await page.getByRole("columnheader", { name: colonneNom, exact: true }).getByRole("button").click();
}

test.describe("Statistiques (S3) : les plus joués", () => {
  // Le service worker ne doit pas servir le recueil à la place de la simulation.
  test.use({ serviceWorkers: "block" });

  test("un admin voit les nombres du jeu d'essai : setlists comptées, rangs, %, tonalités, tendances", async ({ page }) => {
    await ouvrirStatistiques(page);
    await expect(page.getByRole("button", { name: "12 mois" })).toHaveAttribute("aria-pressed", "true");
    expect(await setlistsComptees(page)).toBe("6");
    await expect(page.getByTestId("setlists-comptees")).toContainText("publiées, du 31/05 au 20/09");
    expect(await lignes(page)).toEqual(PLUS_JOUES_12_MOIS);
  });

  test("un chant absent du recueil : son slug, « absent du recueil », sans lien ni étiquette", async ({ page }) => {
    await ouvrirStatistiques(page);
    const ligne = page.locator('[data-testid="ligne-chant"]:visible').filter({ hasText: "ancien-chant" });
    await expect(ligne).toContainText("absent du recueil");
    await expect(ligne.getByRole("link")).toHaveCount(0);
    await expect(ligne.getByTestId("langue")).toHaveCount(0);
    const premiere = page.locator('[data-testid="ligne-chant"]:visible').first();
    await expect(premiere.getByTestId("langue")).toHaveText("FR");
    await expect(page.locator('[data-testid="ligne-chant"]:visible').nth(1).getByTestId("langue")).toHaveText("中文");
  });

  test("« Les 10 premiers » : un chant par ligne, son nombre et sa part, barres décoratives", async ({ page }) => {
    await ouvrirStatistiques(page);
    const carte = page.getByTestId("dix-premiers");
    await expect(carte.getByRole("heading", { name: "Les 10 premiers" })).toBeVisible();
    await expect(carte.getByTestId("barre-chant")).toHaveCount(5);
    await expect(carte.getByTestId("barre-chant").first()).toContainText("À jamais Tu es saint");
    await expect(carte.getByTestId("barre-chant").first()).toContainText("4 · 67 %");
    await expect(carte.locator("[data-barre]").first()).toHaveAttribute("aria-hidden", "true");
  });

  test("période : 3 mois, depuis le début, dates libres", async ({ page }) => {
    await ouvrirStatistiques(page);
    await page.getByRole("button", { name: "3 mois" }).click();
    await expect(page.getByRole("button", { name: "3 mois" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => setlistsComptees(page)).toBe("3");
    await expect(page.getByTestId("setlists-comptees")).toContainText("du 16/08 au 20/09");
    expect(await colonne(page, "titre")).toEqual(["À jamais Tu es saint", "爱的约定", "ancien-chant"]);

    await page.getByRole("button", { name: "Depuis le début" }).click();
    await expect.poll(() => setlistsComptees(page)).toBe("6");

    await page.getByRole("button", { name: "Dates libres" }).click();
    await page.getByLabel("Du", { exact: true }).fill("2026-06-01");
    await page.getByLabel("Au", { exact: true }).fill("2026-06-30");
    await expect.poll(() => setlistsComptees(page)).toBe("2");
    expect(await colonne(page, "titre")).toEqual(["Abba Père", "爱的约定", "Abrite-moi"]);
    expect(await colonne(page, "part")).toEqual(["100 %", "50 %", "50 %"]);
  });

  test("service : « Groupe Paix » réduit les setlists comptées", async ({ page }) => {
    await ouvrirStatistiques(page);
    await page.getByRole("combobox", { name: "Service" }).selectOption("Groupe Paix");
    await expect.poll(() => setlistsComptees(page)).toBe("2");
    expect(await lignes(page)).toEqual([
      { rang: "1", titre: "爱的约定", setlists: "2", part: "100 %", derniere: "06/09", tonalite: "D / C", tendance: "=" },
      { rang: "2", titre: "À jamais Tu es saint", setlists: "1", part: "50 %", derniere: "06/09", tonalite: "Db", tendance: "+1" },
      { rang: "3", titre: "Abba Père", setlists: "1", part: "50 %", derniere: "28/06", tonalite: "A", tendance: "−1" },
    ]);
  });

  test("présidence : les graphies d'un même nom se regroupent, sous la plus fréquente", async ({ page }) => {
    await ouvrirStatistiques(page);
    const choix = page.getByRole("combobox", { name: "Présidence" });
    await expect(choix.locator("option")).toHaveText(["Toutes les présidences", "Luc R.", "Marc L."]);
    await choix.selectOption("Marc L.");
    await expect.poll(() => setlistsComptees(page)).toBe("4");
    expect(await colonne(page, "titre")).toEqual(["À jamais Tu es saint", "Abba Père", "ancien-chant", "爱的约定", "Abrite-moi"]);
  });

  test("langue : « 中文 » retire les lignes FR sans changer le %", async ({ page }) => {
    await ouvrirStatistiques(page);
    await page.getByRole("combobox", { name: "Langue" }).selectOption({ label: "中文" });
    await expect.poll(() => colonne(page, "titre")).toEqual(["爱的约定"]);
    expect(await setlistsComptees(page)).toBe("6");
    expect(await lignes(page)).toEqual([{ ...PLUS_JOUES_12_MOIS[1], rang: "1" }]);
  });

  test("trier par « Dernière fois », « Tendance » ou « Chant » laisse les rangs", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    await trierPar(page, info, "Dernière fois");
    await expect.poll(() => colonne(page, "titre")).toEqual(["À jamais Tu es saint", "ancien-chant", "爱的约定", "Abba Père", "Abrite-moi"]);
    expect(await colonne(page, "rang")).toEqual(["1", "4", "2", "3", "5"]);
    if (!estTelephone(info)) await expect(page.getByRole("columnheader", { name: "Dernière fois", exact: true })).toHaveAttribute("aria-sort", "descending");

    await trierPar(page, info, "Tendance");
    await expect.poll(() => colonne(page, "tendance")).toEqual(["+2", "+1", "+1", "−1", "−3"]);
    expect(await colonne(page, "rang")).toEqual(["1", "2", "4", "5", "3"]);

    await trierPar(page, info, "Chant");
    await expect.poll(() => colonne(page, "titre")).toEqual(["À jamais Tu es saint", "Abba Père", "Abrite-moi", "ancien-chant", "爱的约定"]);
    expect(await colonne(page, "rang")).toEqual(["1", "3", "5", "4", "2"]);
  });

  test("un en-tête retouché inverse l'ordre", async ({ page }, info) => {
    test.skip(estTelephone(info), "le téléphone trie par un menu, sans en-têtes");
    await ouvrirStatistiques(page);
    await expect(page.getByRole("columnheader", { name: "Setlists", exact: true })).toHaveAttribute("aria-sort", "descending");
    await trierPar(page, info, "Setlists");
    await expect(page.getByRole("columnheader", { name: "Setlists", exact: true })).toHaveAttribute("aria-sort", "ascending");
    await expect.poll(() => colonne(page, "rang")).toEqual(["5", "4", "3", "2", "1"]);
  });

  test("un titre ouvre la page du chant ; le retour retrouve période, filtres et tri", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    await page.getByRole("button", { name: "3 mois" }).click();
    await page.getByRole("combobox", { name: "Service" }).selectOption("Groupe Paix");
    await trierPar(page, info, "Chant");
    await expect.poll(() => colonne(page, "titre")).toEqual(["À jamais Tu es saint", "爱的约定"]);
    await expect(page).toHaveURL(/periode=3/);

    await page.locator('[data-testid="ligne-chant"]:visible').getByRole("link", { name: "À jamais Tu es saint" }).click();
    await expect(page).toHaveURL(/\/songs\/a-jamais-tu-es-saint\/?$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/back-office\/statistiques\/?\?/);
    await expect(page.getByRole("button", { name: "3 mois" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "Service" })).toHaveValue("Groupe Paix");
    await expect.poll(() => colonne(page, "titre")).toEqual(["À jamais Tu es saint", "爱的约定"]);
    expect(await setlistsComptees(page)).toBe("1");
  });

  test("une adresse avec ses filtres ouvre l'écran tel quel", async ({ page }) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?periode=libre&du=2026-06-01&au=2026-06-30&langue=zh");
    await expect(page.getByRole("button", { name: "Dates libres" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Du", { exact: true })).toHaveValue("2026-06-01");
    await expect.poll(() => colonne(page, "titre")).toEqual(["爱的约定"]);
    expect(await setlistsComptees(page)).toBe("2");
  });

  test("période vide : « Aucune setlist publiée sur cette période. »", async ({ page }) => {
    await ouvrirStatistiques(page);
    await page.getByRole("button", { name: "Dates libres" }).click();
    await page.getByLabel("Du", { exact: true }).fill("2026-07-01");
    await page.getByLabel("Au", { exact: true }).fill("2026-07-31");
    await expect(page.getByText("Aucune setlist publiée sur cette période.")).toBeVisible();
    await expect(page.locator('[data-testid="ligne-chant"]:visible')).toHaveCount(0);
    await expect(page.getByTestId("dix-premiers")).toHaveCount(0);
  });

  test("lecture refusée : « Impossible de lire les setlists. », puis « Réessayer »", async ({ page }) => {
    await ouvrirStatistiques(page);
    let refuser = true;
    await page.route(/firestore\.googleapis\.com.*:runQuery/, (route) =>
      refuser ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" }) : route.fallback());
    await page.reload();
    await expect(page.getByText("Impossible de lire les setlists.")).toBeVisible();
    await expect(page.getByTestId("ligne-chant")).toHaveCount(0);
    refuser = false;
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect.poll(() => setlistsComptees(page)).toBe("6");
  });

  test("rien n'est écrit dans la base", async ({ page }) => {
    const db = await ouvrirStatistiques(page);
    await page.getByRole("button", { name: "3 mois" }).click();
    await expect.poll(() => setlistsComptees(page)).toBe("3");
    // La connexion écrit la langue dans `notifPrefs/{uid}` (la barre de navigation) : hors de la page.
    expect(db.writes.filter((w) => !w.path.startsWith("notifPrefs/"))).toEqual([]);
  });
});

test.describe("Statistiques (S3) : captures à regarder", () => {
  test.use({ serviceWorkers: "block" });
  // Comparées à la planche bo-statistiques (ordinateur) et bo-statistiques-telephone.
  test("« Les plus joués » d'un admin, page entière, dans chaque disposition", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s3.png`, fullPage: true });
  });
});

// ─── S4 : « Jamais joués » et « À redécouvrir » ───────────────────────────────
// Même jeu d'essai. Sur 3 mois (du 04/07 à hier), Abba Père a été joué trois fois avant (s1 à s3)
// et aucune pendant : le seul chant « à redécouvrir ». Sur 12 mois, rien n'existe avant le
// 04/10/2025 : l'historique commence à la première setlist simulée, le 31/05/2026.

/** Les lignes visibles d'une vue (tableau, ou liste sur téléphone), lues champ par champ. */
async function lignesDe(page: Page, testid: "ligne-jamais" | "ligne-redecouvrir") {
  return page.locator(`[data-testid="${testid}"]:visible`).evaluateAll((els) =>
    els.map((el) => Object.fromEntries(
      [...el.querySelectorAll("[data-champ]")].map((c) => [c.getAttribute("data-champ"), (c.textContent ?? "").trim()]),
    )));
}

const vue = (page: Page, nom: "Les plus joués" | "Jamais joués" | "À redécouvrir") =>
  page.getByRole("group", { name: "Vue" }).getByRole("button", { name: nom, exact: true });

test.describe("Statistiques (S4) : jamais joués et à redécouvrir", () => {
  test.use({ serviceWorkers: "block" });

  test("le sélecteur de vues : « Les plus joués » par défaut, les deux autres gardent filtres et « Setlists comptées »", async ({ page }) => {
    await ouvrirStatistiques(page);
    await expect(vue(page, "Les plus joués")).toHaveAttribute("aria-pressed", "true");
    await expect(vue(page, "Jamais joués")).toHaveAttribute("aria-pressed", "false");

    await vue(page, "Jamais joués").click();
    await expect(vue(page, "Jamais joués")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/vue=jamais-joues/);
    await expect(page.getByTestId("dix-premiers")).toHaveCount(0);
    await expect(page.locator('[data-testid="ligne-chant"]:visible')).toHaveCount(0);
    expect(await setlistsComptees(page)).toBe("6");
    await expect(page.getByRole("button", { name: "12 mois" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "Service" })).toBeVisible();

    await vue(page, "À redécouvrir").click();
    await expect(page).toHaveURL(/vue=a-redecouvrir/);
    await expect(page.getByTestId("dix-premiers")).toHaveCount(0);
    expect(await setlistsComptees(page)).toBe("6");

    await vue(page, "Les plus joués").click();
    await expect(page).not.toHaveURL(/vue=/);
    await expect(page.getByTestId("dix-premiers")).toBeVisible();
  });

  test("« Jamais joués » : les chants du recueil absents des setlists comptées, A→Z, avec artiste et dernière fois", async ({ page }) => {
    await ouvrirStatistiques(page);
    await vue(page, "Jamais joués").click();
    await expect(page.getByText("1 chant sur 5", { exact: true })).toBeVisible();
    expect(await lignesDe(page, "ligne-jamais")).toEqual([{ titre: "À la croix", artiste: "Auteur Cinq", derniere: "jamais" }]);

    await page.getByRole("button", { name: "3 mois" }).click();
    await expect(page.getByText("3 chants sur 5", { exact: true })).toBeVisible();
    // Dernière fois toutes dates confondues ; l'absent du recueil (« ancien-chant ») n'y est jamais.
    expect(await lignesDe(page, "ligne-jamais")).toEqual([
      { titre: "Abba Père", artiste: "Auteur Un", derniere: "28/06" },
      { titre: "Abrite-moi", artiste: "Auteur Deux", derniere: "14/06" },
      { titre: "À la croix", artiste: "Auteur Cinq", derniere: "jamais" },
    ]);
    const ligne = page.locator('[data-testid="ligne-jamais"]:visible').first();
    await expect(ligne.getByRole("link", { name: "Abba Père" })).toHaveAttribute("href", /^\/songs\/abba-pere\/?$/);
    await expect(ligne.getByTestId("langue")).toHaveText("FR");

    // La langue retire des chants, et du total.
    await page.getByRole("combobox", { name: "Langue" }).selectOption({ label: "FR" });
    await expect(page.getByText("3 chants sur 4", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Langue" }).selectOption({ label: "中文" });
    await expect(page.getByText("Tous les chants ont été joués sur cette période.")).toBeVisible();
    await expect(page.locator('[data-testid="ligne-jamais"]:visible')).toHaveCount(0);
  });

  test("« À redécouvrir » sur 3 mois : le chant joué trois fois avant juillet, aucune depuis", async ({ page }) => {
    await ouvrirStatistiques(page);
    await vue(page, "À redécouvrir").click();
    await page.getByRole("button", { name: "3 mois" }).click();
    await expect.poll(() => lignesDe(page, "ligne-redecouvrir")).toEqual([
      { rang: "1", titre: "Abba Père", avant: "3", derniere: "28/06", tonalite: "G" },
    ]);
    await expect(page.locator('[data-testid="ligne-redecouvrir"]:visible').getByRole("link", { name: "Abba Père" }))
      .toHaveAttribute("href", /^\/songs\/abba-pere\/?$/);
    expect(await setlistsComptees(page)).toBe("3");

    // Avec un historique, mais aucun chant qui le mérite.
    await page.getByRole("combobox", { name: "Service" }).selectOption("Groupe Paix");
    await expect(page.getByText("Aucun chant à redécouvrir sur cette période.")).toBeVisible();
    await expect(page.locator('[data-testid="ligne-redecouvrir"]:visible')).toHaveCount(0);
  });

  test("« À redécouvrir » sans historique avant la période : le message le dit (12 mois, depuis le début)", async ({ page }) => {
    await ouvrirStatistiques(page);
    await vue(page, "À redécouvrir").click();
    const message = page.getByText("L'historique commence le 31/05/2026 : choisis une période plus courte.");
    await expect(message).toBeVisible();
    await expect(page.locator('[data-testid="ligne-redecouvrir"]:visible')).toHaveCount(0);
    await page.getByRole("button", { name: "Depuis le début" }).click();
    await expect(message).toBeVisible();
    await page.getByRole("button", { name: "3 mois" }).click();
    await expect(message).toHaveCount(0);
  });

  test("période vide : le même message dans les deux vues", async ({ page }) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues&periode=libre&du=2026-07-01&au=2026-07-31");
    await expect(page.getByText("Aucune setlist publiée sur cette période.")).toBeVisible();
    await expect(page.locator('[data-testid="ligne-jamais"]:visible')).toHaveCount(0);
    await vue(page, "À redécouvrir").click();
    await expect(page.getByText("Aucune setlist publiée sur cette période.")).toBeVisible();
  });

  test("un titre ouvre la page du chant ; le retour retrouve la vue et les filtres", async ({ page }) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=a-redecouvrir&periode=3");
    await expect(vue(page, "À redécouvrir")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => lignesDe(page, "ligne-redecouvrir")).toHaveLength(1);

    await vue(page, "Jamais joués").click();
    await page.locator('[data-testid="ligne-jamais"]:visible').getByRole("link", { name: "Abrite-moi" }).click();
    await expect(page).toHaveURL(/\/songs\/abrite-moi\/?$/);
    await page.goBack();
    await expect(page).toHaveURL(/vue=jamais-joues/);
    await expect(vue(page, "Jamais joués")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "3 mois" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("3 chants sur 5", { exact: true })).toBeVisible();
  });
});

test.describe("Statistiques (S4) : captures à regarder", () => {
  test.use({ serviceWorkers: "block" });
  // Vues déduites de la planche bo-statistiques (spec, « Écrans ») : à regarder aux trois tailles.
  test("« Jamais joués » et « À redécouvrir » d'un admin, page entière, dans chaque disposition", async ({ page }, info) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues&periode=3");
    await expect(page.locator('[data-testid="ligne-jamais"]:visible').first()).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s4-jamais.png`, fullPage: true });
    await vue(page, "À redécouvrir").click();
    await expect(page.locator('[data-testid="ligne-redecouvrir"]:visible').first()).toBeVisible();
    await page.waitForTimeout(300); // la pastille du sélecteur finit sa transition
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s4-redecouvrir.png`, fullPage: true });
  });
});

// ─── S5 : le widget « Chants les plus joués » du tableau de bord ──────────────
// Spec, « Modèle » et question 4 ; table des widgets de U6 (n° 7) : admins seulement, taille M,
// réglage Période 3 / 6 / 12 mois / Depuis le début (12 par défaut). Planche `bo-tableau-de-bord`
// (build.py, W_CHANTS) : « N setlists » en tête, cinq premiers en barres, le nombre au bout.
// Même jeu d'essai que S3, plus une setlist du 27/09 avec « À la croix » : six chants joués,
// le sixième (« Abrite-moi ») sort des cinq premiers.

const SETLISTS_WIDGET: Record<string, Record<string, unknown>> = {
  ...SETLISTS,
  "setlists/s7": setlist("2026-09-27", CULTE, "Marc L.", [chant("a-la-croix")]),
};
const SEUL_LE_WIDGET = (reglages: Record<string, unknown> = {}) => ({
  "backOffice/uid-admin": { tableauDeBord: [{ id: "chants", taille: "m", reglages }], majLe: "2026-10-01T09:00:00Z" },
});

async function ouvrirTableauDeBord(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>) {
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  const db = await signInAs(page, qui, docs, "/back-office");
  await expect(page.getByTestId("grille-widgets")).toBeVisible();
  return db;
}
const widgetChants = (page: Page) =>
  page.getByTestId("grille-widgets").getByRole("region", { name: "Chants les plus joués", exact: true });
const lignesWidget = (page: Page) =>
  widgetChants(page).getByTestId("ligne-plus-joue").evaluateAll((els) => els.map((el) =>
    [el.querySelector("[data-champ=titre]")?.textContent?.trim(), el.querySelector("[data-champ=setlists]")?.textContent?.trim()]));

test.describe("Statistiques (S5) : le widget, règles pures", () => {
  test("permis aux admins seuls ; dans le défaut d'un admin, après Prochains évènements, en M", () => {
    expect(widgetsPermis(user(ADMIN), profil(ADMIN))).toContain("chants");
    expect(widgetsPermis(user(RESPONSABLE), profil(RESPONSABLE))).not.toContain("chants");
    const d = dispositionParDefaut(user(ADMIN), null);
    expect(d.map((w) => w.id)).toEqual(["dimanche", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "raccourcis", "scene", "comptes"]);
    expect(d.find((w) => w.id === "chants")).toEqual({ id: "chants", taille: "m", reglages: {} });
    expect(dispositionParDefaut(user(RESPONSABLE), profil(RESPONSABLE)).map((w) => w.id)).not.toContain("chants");
  });

  test("réglage Période : 3 / 6 / 12 mois / Depuis le début, 12 mois par défaut", () => {
    const groupes = groupesDeReglages("chants", {}, user(ADMIN), null);
    expect(groupes.map((g) => [g.cle, g.plusieurs, g.choix.map((c) => c.valeur), g.actifs]))
      .toEqual([["periode", false, ["3m", "6m", "12m", "tout"], ["12m"]]]);
    expect(choisirReglage({}, groupes[0], "3m")).toEqual({ periode: "3m" });
    expect(groupesDeReglages("chants", { periode: "tout" }, user(ADMIN), null)[0].actifs).toEqual(["tout"]);
  });
});

test.describe("Statistiques (S5) : le widget, écrans", () => {
  test.use({ serviceWorkers: "block" });

  test("un admin : « 7 setlists » et les cinq premiers sur 12 mois, barres décoratives, liens", async ({ page }) => {
    await ouvrirTableauDeBord(page, ADMIN, { ...SETLISTS_WIDGET, ...SEUL_LE_WIDGET() });
    const w = widgetChants(page);
    await expect(w.getByRole("link", { name: "7 setlists" })).toHaveAttribute("href", /^\/back-office\/statistiques\/?$/);
    await expect(w.getByTestId("ligne-plus-joue")).toHaveCount(5);
    expect(await lignesWidget(page)).toEqual([
      ["À jamais Tu es saint", "4"], ["爱的约定", "3"], ["Abba Père", "3"], ["À la croix", "1"], ["ancien-chant", "1"],
    ]);
    await expect(w.getByRole("link", { name: "À jamais Tu es saint" })).toHaveAttribute("href", /^\/songs\/a-jamais-tu-es-saint\/?$/);
    // Un chant absent du recueil : son slug, sans lien.
    await expect(w.getByRole("link", { name: "ancien-chant" })).toHaveCount(0);
    // Les barres : décoratives, la plus longue pour le premier.
    const barres = w.locator("[data-barre]");
    await expect(barres).toHaveCount(5);
    await expect(barres.first()).toHaveAttribute("aria-hidden", "true");
    const largeurs = await barres.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(largeurs[0]).toBeGreaterThan(largeurs[1]);
    expect(largeurs[1]).toBeCloseTo(largeurs[2], 0);
    expect(largeurs[3]).toBeLessThan(largeurs[2]);
  });

  test("réglage « 3 mois » : le contenu change, le lien suit, le réglage s'écrit", async ({ page }) => {
    const db = await ouvrirTableauDeBord(page, ADMIN, { ...SETLISTS_WIDGET, ...SEUL_LE_WIDGET() });
    const w = widgetChants(page);
    await expect(w.getByTestId("ligne-plus-joue")).toHaveCount(5);
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await w.getByRole("button", { name: "Réglages du widget" }).click();
    const periode = w.getByRole("group", { name: "Période" });
    await expect(periode.getByRole("button")).toHaveText(["3 mois", "6 mois", "12 mois", "Depuis le début"]);
    await expect(periode.getByRole("button", { name: "12 mois" })).toHaveAttribute("aria-pressed", "true");
    await periode.getByRole("button", { name: "3 mois" }).click();
    await expect(w.getByRole("link", { name: "4 setlists" })).toHaveAttribute("href", /^\/back-office\/statistiques\/?\?periode=3$/);
    expect(await lignesWidget(page)).toEqual([["À jamais Tu es saint", "3"], ["爱的约定", "2"], ["À la croix", "1"], ["ancien-chant", "1"]]);
    await expect.poll(() => (db.writes.filter((x) => x.path === "backOffice/uid-admin").at(-1)?.data.tableauDeBord as
      { id: string; reglages: object }[] | undefined)?.find((x) => x.id === "chants")?.reglages).toEqual({ periode: "3m" });
  });

  test("« Depuis le début » enregistré : le lien ouvre la page sur la même période", async ({ page }) => {
    await ouvrirTableauDeBord(page, ADMIN, { ...SETLISTS_WIDGET, ...SEUL_LE_WIDGET({ periode: "tout" }) });
    const lien = widgetChants(page).getByRole("link", { name: "7 setlists" });
    await expect(lien).toHaveAttribute("href", /^\/back-office\/statistiques\/?\?periode=debut$/);
    await lien.click();
    await expect(page.getByRole("button", { name: "Depuis le début" })).toHaveAttribute("aria-pressed", "true");
    expect(await setlistsComptees(page)).toBe("7");
  });

  test("période vide et lecture impossible : un message, jamais des zéros", async ({ page }) => {
    // Une seule setlist, à venir : rien de compté sur la période.
    await ouvrirTableauDeBord(page, ADMIN, { "setlists/a-venir": SETLISTS["setlists/a-venir"], ...SEUL_LE_WIDGET() });
    await expect(widgetChants(page).getByText("Aucune setlist publiée sur cette période.")).toBeVisible();
    await expect(widgetChants(page).getByTestId("ligne-plus-joue")).toHaveCount(0);
  });

  test("aucune setlist lue : « Lecture impossible pour l'instant. »", async ({ page }) => {
    await ouvrirTableauDeBord(page, ADMIN, SEUL_LE_WIDGET());
    await expect(widgetChants(page).getByText("Lecture impossible pour l'instant.")).toBeVisible();
  });

  test("un responsable non admin : absent du catalogue, ignoré s'il est enregistré", async ({ page }) => {
    await ouvrirTableauDeBord(page, RESPONSABLE, {
      ...SETLISTS_WIDGET,
      "backOffice/uid-pl": { tableauDeBord: [{ id: "chants", taille: "m", reglages: {} }, { id: "dimanche", taille: "m", reglages: {} }], majLe: "2026-10-01" },
    });
    await expect(page.getByTestId("grille-widgets").getByRole("region", { name: "Ce dimanche" })).toBeVisible();
    await expect(widgetChants(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await expect(page.getByRole("region", { name: "Ajouter un widget" }).getByRole("button", { name: "Chants les plus joués" })).toHaveCount(0);
  });

  test("中文 : titre et nombre de setlists traduits", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrirTableauDeBord(page, ADMIN, { ...SETLISTS_WIDGET, ...SEUL_LE_WIDGET() });
    const w = page.getByTestId("grille-widgets").getByRole("region", { name: "最常唱的诗歌" });
    await expect(w.getByRole("link", { name: "7 份歌单" })).toBeVisible();
    await expect(w.getByTestId("ligne-plus-joue")).toHaveCount(5);
  });

  test("captures du widget (à regarder), dans chaque disposition", async ({ page }, info) => {
    await ouvrirTableauDeBord(page, ADMIN, { ...SETLISTS_WIDGET, ...SEUL_LE_WIDGET() });
    await expect(widgetChants(page).getByTestId("ligne-plus-joue")).toHaveCount(5);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s5-widget.png` });
  });
});
