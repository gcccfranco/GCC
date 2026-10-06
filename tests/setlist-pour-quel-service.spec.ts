import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { boutonAjouter, boutonTonalite, champPresidence, enDeuxColonnes, groupeTonalites } from "./helpers/editeurSetlist";
import { lienPreparer, lirePreremplissage, prochainsServicesSansSetlist } from "../src/lib/setlist/prochainsServices";
import type { SetlistSeance } from "../src/lib/planning/names";

// Lot U5 bis (docs/spec-editeur-setlist.md), entrée « Pour quel service ? » :
// les prochains services sans setlist, d'après le planning (question Q3).
// Tranche T1 : la logique pure (tests « (pur) »). Tranche T2 : la page
// (tests « (page) »), l'éditeur prérempli, « Autre setlist », les setlists
// passées, le brouillon au premier changement (Q4).

const CULTE = "Culte Francophone";

const seance = (category: string, date: string, leader = "", moment?: "matin" | "soir"): SetlistSeance => ({
  category,
  date,
  leader,
  ...(moment ? { moment } : {}),
  label: date,
});

const dates = (seances: SetlistSeance[]) => seances.map((s) => `${s.category} ${s.date}${s.moment ? " " + s.moment : ""}`);

test("(pur) quatre semaines, aujourd'hui compris : du jour même à J+27", () => {
  const seances = [
    seance(CULTE, "2026-10-07"), // hier
    seance(CULTE, "2026-10-08"), // aujourd'hui
    seance(CULTE, "2026-11-04"), // J+27
    seance(CULTE, "2026-11-05"), // J+28
  ];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-08`,
    `${CULTE} 2026-11-04`,
  ]);
});

test("(pur) l'horizon se règle : 7 jours, aujourd'hui compris", () => {
  const seances = [seance(CULTE, "2026-10-08"), seance(CULTE, "2026-10-14"), seance(CULTE, "2026-10-15")];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE], "2026-10-08", 7))).toEqual([
    `${CULTE} 2026-10-08`,
    `${CULTE} 2026-10-14`,
  ]);
});

test("(pur) le parcours de la spec : le 08/10, Culte Franco des 18/10, 25/10 et 01/11, le 11/10 a sa setlist", () => {
  const seances = [
    seance(CULTE, "2026-10-04", "Présidence A"),
    seance(CULTE, "2026-10-11", "Présidence B"),
    seance(CULTE, "2026-10-18", "Présidence C"),
    seance(CULTE, "2026-10-25", "Présidence A"),
    seance(CULTE, "2026-11-01", "Présidence B"),
    seance(CULTE, "2026-11-08", "Présidence C"),
  ];
  const setlists = [{ category: CULTE, date: "2026-10-11", leader: "Présidence B" }];
  const out = prochainsServicesSansSetlist(seances, setlists, [CULTE], "2026-10-08");
  expect(out.map((s) => s.date)).toEqual(["2026-10-18", "2026-10-25", "2026-11-01"]);
  // La séance est rendue telle quelle : la présidence lue au planning y est.
  expect(out[0]).toEqual(seances[2]);
});

test("(pur) seules les catégories données (celles où la personne peut créer)", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance("Groupe Paix", "2026-10-11"), seance("中班", "2026-10-11")];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE, "中班"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
    "中班 2026-10-11",
  ]);
  expect(prochainsServicesSansSetlist(seances, [], [], "2026-10-08")).toEqual([]);
});

test("(pur) une setlist partagée publiée retire son service ; un brouillon ou une privée, non", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance(CULTE, "2026-10-18"), seance(CULTE, "2026-10-25")];
  const setlists = [
    { category: CULTE, date: "2026-10-11", leader: "" },
    { category: CULTE, date: "2026-10-18", leader: "", isDraft: true },
    { category: CULTE, date: "2026-10-25", leader: "", isPrivate: true },
  ];
  expect(prochainsServicesSansSetlist(seances, setlists, [CULTE], "2026-10-08").map((s) => s.date)).toEqual([
    "2026-10-18",
    "2026-10-25",
  ]);
});

test("(pur) une setlist d'une autre catégorie ou d'un autre jour ne retire rien", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance("Groupe Paix", "2026-10-11")];
  const setlists = [
    { category: "Groupe Paix", date: "2026-10-11", leader: "" },
    { category: CULTE, date: "2026-10-12", leader: "" },
  ];
  expect(dates(prochainsServicesSansSetlist(seances, setlists, [CULTE, "Groupe Paix"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
  ]);
});

test("(pur) Campus : la setlist du soir ne retire que le soir", () => {
  const seances = [
    seance("Campus", "2026-10-10", "Présidence A", "matin"),
    seance("Campus", "2026-10-10", "Présidence B", "soir"),
  ];
  const setlists = [{ category: "Campus", date: "2026-10-10", leader: "Présidence A", moment: "soir" as const }];
  // Même présidence que le matin, mais le moment départage : le matin reste.
  expect(dates(prochainsServicesSansSetlist(seances, setlists, ["Campus"], "2026-10-08"))).toEqual([
    "Campus 2026-10-10 matin",
  ]);
});

test("(pur) Campus : une ancienne setlist sans moment se reconnaît à sa présidence", () => {
  const seances = [
    seance("Campus", "2026-10-10", "Présidence A", "matin"),
    seance("Campus", "2026-10-10", "Présidence B", "soir"),
  ];
  // Graphie différente, même personne (normalizeName) : le matin est pris.
  const prise = [{ category: "Campus", date: "2026-10-10", leader: "présidence a" }];
  expect(dates(prochainsServicesSansSetlist(seances, prise, ["Campus"], "2026-10-08"))).toEqual([
    "Campus 2026-10-10 soir",
  ]);
  // Ni moment ni présidence reconnue : ambigu, les deux restent proposés.
  const ambigue = [{ category: "Campus", date: "2026-10-10", leader: "Présidence C" }];
  expect(prochainsServicesSansSetlist(seances, ambigue, ["Campus"], "2026-10-08")).toHaveLength(2);
});

test("(pur) tri par date, puis dans l'ordre du planning", () => {
  const seances = [
    seance("Groupe Paix", "2026-10-18"),
    seance(CULTE, "2026-10-11"),
    seance(CULTE, "2026-10-18"),
    seance("Campus", "2026-10-11", "", "matin"),
    seance("Campus", "2026-10-11", "", "soir"),
  ];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE, "Groupe Paix", "Campus"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
    "Campus 2026-10-11 matin",
    "Campus 2026-10-11 soir",
    "Groupe Paix 2026-10-18",
    `${CULTE} 2026-10-18`,
  ]);
});

test("(pur) planning vide : aucun service", () => {
  expect(prochainsServicesSansSetlist([], [], [CULTE], "2026-10-08")).toEqual([]);
});

test("(pur) « Préparer » : le lien de la séance se relit en préremplissage", () => {
  const lien = lienPreparer({ category: "Campus", date: "2026-10-10", moment: "soir" });
  expect(lien.startsWith("/setlists/new?")).toBe(true);
  const params = new URL(lien, "http://x").searchParams;
  expect(lirePreremplissage(params, ["Campus"])).toEqual({ category: "Campus", date: "2026-10-10", moment: "soir" });
  expect(lienPreparer({ category: CULTE, date: "2026-10-18" })).not.toContain("moment");
});

test("(pur) préremplissage : paramètre invalide ou catégorie non permise ignorés, un par un", () => {
  const lire = (q: string, permises = [CULTE, "Campus"]) => lirePreremplissage(new URLSearchParams(q), permises);
  expect(lire(`cat=${encodeURIComponent(CULTE)}&date=2026-10-18`)).toEqual({ category: CULTE, date: "2026-10-18" });
  expect(lire("cat=Groupe+Paix&date=2026-10-18")).toEqual({ date: "2026-10-18" });
  expect(lire(`cat=${encodeURIComponent(CULTE)}&date=18-10-2026`)).toEqual({ category: CULTE });
  expect(lire(`cat=${encodeURIComponent(CULTE)}&date=2026-02-31`)).toEqual({ category: CULTE });
  expect(lire(`cat=${encodeURIComponent(CULTE)}&date=2026-13-01`)).toEqual({ category: CULTE });
  // Le moment ne vaut qu'au Campus, et seulement matin ou soir.
  expect(lire(`cat=${encodeURIComponent(CULTE)}&date=2026-10-18&moment=soir`)).toEqual({ category: CULTE, date: "2026-10-18" });
  expect(lire("cat=Campus&date=2026-10-10&moment=nuit")).toEqual({ category: "Campus", date: "2026-10-10" });
  expect(lire("autre=1")).toEqual({});
});

// ─── Tranche T2 : la page ─────────────────────────────────────────────────────
// Horloge fixée au jeudi 08/10/2026 (le parcours de la spec), planning simulé
// en CSV, Firestore simulé. Noms de présidence fictifs.

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Musicienne",
  lastName: "Test",
  planningName: "Musicienne T.",
  serviceRoles: { [CULTE]: ["musicien"] },
};

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Onglet Franco_Louange : date JJ/MM, présidence. Le 25/10 n'a pas encore de présidence. */
const FRANCO = csv([
  ["DATE", "PRESIDENCE"],
  ["04/10", "Présidence A"],
  ["11/10", "Présidence B"],
  ["18/10", "Présidence C"],
  ["25/10", ""],
  ["01/11", "Présidence B"],
  ["08/11", "Présidence C"],
]);

/** Onglet Campus_Louange : date, moment, présidence (comme planning-campus.spec.ts). */
const CAMPUS = csv([
  ["DATE", "MOMENT", "PRESIDENT"],
  ["10/10/2026", "Matin", "Présidence A"],
  ["10/10/2026", "Soir", "Présidence B"],
]);

/** Le 11/10 a sa setlist, partagée et publiée. */
const SETLIST_DU_11 = {
  title: "Culte Francophone 11/10",
  leader: "Présidence B",
  category: CULTE,
  date: "2026-10-11",
  language: "fr",
  notes: "",
  ownerId: "uid-autre",
  isPrivate: false,
  isDraft: false,
  items: [],
};

async function ouvrir(
  page: Page,
  to: string,
  { profil = MUSICIENNE, docs = { "setlists/sl-1110": SETLIST_DU_11 } as Record<string, Record<string, unknown>>, planning = true } = {},
): Promise<FakeDb> {
  await page.clock.setFixedTime(new Date("2026-10-08T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    const body = !planning ? "" : sheet === "Franco_Louange" ? FRANCO : sheet === "Campus_Louange" ? CAMPUS : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body });
  });
  return signInAs(page, profil, docs, to);
}

const services = (page: Page) => page.getByRole("list", { name: "Pour quel service ?" }).getByRole("listitem");
const carte = (page: Page, jour: string) => services(page).filter({ hasText: jour });
const ecrituresSetlist = (db: FakeDb) =>
  db.writes.filter((w) => /^setlists\/[^/]+$/.test(w.path) && w.method !== "DELETE");

test("(page) « Nouvelle » mène à « Pour quel service ? » : au 08/10, le Culte Franco des 18/10, 25/10 et 01/11", async ({ page }) => {
  await ouvrir(page, "/setlists");
  await page.getByRole("link", { name: "Nouvelle" }).first().click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === "/setlists/new");

  await expect(page.getByRole("heading", { name: "Nouvelle setlist" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pour quel service ?" })).toBeVisible();
  await expect(services(page)).toHaveCount(3);
  await expect(services(page).nth(0)).toContainText("Dimanche 18 octobre");
  await expect(services(page).nth(1)).toContainText("Dimanche 25 octobre");
  await expect(services(page).nth(2)).toContainText("Dimanche 1 novembre");
  await expect(carte(page, "18 octobre")).toContainText("Culte Franco");
  await expect(carte(page, "18 octobre")).toContainText("Présidence : Présidence C");
  await expect(carte(page, "25 octobre")).toContainText("Présidence : à définir");
  await expect(carte(page, "18 octobre").getByRole("link", { name: /^Préparer/ })).toBeVisible();
  // Les deux autres entrées.
  await expect(page.getByRole("link", { name: /Autre setlist/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Repartir d'une setlist passée/ })).toBeVisible();
});

test("(page) « Préparer » remplit l'éditeur ; rien n'est écrit avant le premier changement ; « Publier » retire le service", async ({ page }) => {
  const db = await ouvrir(page, "/setlists/new");
  await carte(page, "18 octobre").getByRole("link", { name: /^Préparer/ }).click();
  await page.waitForURL(/[?&]cat=Culte(%20|\+)Francophone&date=2026-10-18/);

  await expect(page.getByLabel("Titre")).toHaveValue("Culte Francophone 18/10");
  await expect(page.getByLabel("Catégorie")).toHaveValue(CULTE);
  await expect(page.getByLabel("Date de la présidence")).toHaveValue("2026-10-18");
  await expect(champPresidence(page)).toHaveValue("Présidence C");

  // Préremplir n'est pas un changement : aucun brouillon ne part.
  await page.waitForTimeout(3_500);
  expect(ecrituresSetlist(db)).toHaveLength(0);

  // Premier changement : un chant. Le brouillon part, prérempli.
  await page.getByPlaceholder("Chercher un chant à ajouter…").fill("Abba Père");
  await boutonAjouter(page, "Abba Père").click();
  await expect.poll(() => ecrituresSetlist(db).length, { timeout: 10_000 }).toBeGreaterThan(0);
  const brouillon = ecrituresSetlist(db).at(-1)!;
  expect(brouillon.data).toMatchObject({
    isDraft: true,
    category: CULTE,
    date: "2026-10-18",
    leader: "Présidence C",
    title: "Culte Francophone 18/10",
  });
  expect(brouillon.data.items).toHaveLength(1);

  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/${brouillon.path}`);
  expect(db.doc(brouillon.path)?.isDraft).toBe(false);

  await page.goto("/setlists/new");
  await expect(services(page)).toHaveCount(2);
  await expect(carte(page, "18 octobre")).toHaveCount(0);
});

test("(page) l'URL préremplit ; une catégorie où l'on ne peut pas créer est ignorée", async ({ page }) => {
  await ouvrir(page, `/setlists/new?cat=${encodeURIComponent(CULTE)}&date=2026-10-25`);
  await expect(page.getByLabel("Titre")).toHaveValue("Culte Francophone 25/10");
  await expect(page.getByLabel("Catégorie")).toHaveValue(CULTE);
  await expect(page.getByLabel("Date de la présidence")).toHaveValue("2026-10-25");
  // Pas de présidence au planning ce jour-là : à choisir.
  await expect(champPresidence(page)).toHaveValue("");

  await page.goto(`/setlists/new?cat=${encodeURIComponent("Groupe Paix")}&date=2026-10-18`);
  await expect(page.getByLabel("Catégorie")).toHaveValue("");
  await expect(page.getByLabel("Titre")).toHaveValue("");
});

test("(page) Campus : la carte dit le moment, « Préparer » remplit le soir et son titre", async ({ page }) => {
  const campus: FakeProfile = { ...MUSICIENNE, serviceRoles: { Campus: ["musicien"] } };
  await ouvrir(page, "/setlists/new", { profil: campus, docs: {} });
  await expect(services(page)).toHaveCount(2);
  await expect(services(page).nth(0)).toContainText("Samedi 10 octobre · Matin");
  await expect(services(page).nth(1)).toContainText("Samedi 10 octobre · Soir");
  await services(page).nth(1).getByRole("link", { name: /^Préparer/ }).click();
  await page.waitForURL(/moment=soir/);
  await expect(page.getByLabel("Titre")).toHaveValue("Campus 10/10 Soir");
  await expect(champPresidence(page)).toHaveValue("Présidence B");
  await expect(page.getByLabel("Moment")).toHaveValue("soir");
});

test("(page) « Autre setlist » ouvre l'éditeur vide", async ({ page }) => {
  await ouvrir(page, "/setlists/new");
  await page.getByRole("link", { name: /Autre setlist/ }).click();
  await page.waitForURL(/[?&]autre=1/);
  await expect(page.getByLabel("Titre")).toHaveValue("");
  await expect(page.getByLabel("Catégorie")).toHaveValue("");
  await expect(page.getByPlaceholder("Chercher un chant à ajouter…")).toBeVisible();
});

test("(page) « Repartir d'une setlist passée » : la plus récente d'abord, « Reprendre » ouvre une copie privée dans « Modifier »", async ({ page }, testInfo) => {
  const passee = (title: string, date: string, over: Record<string, unknown> = {}) => ({
    ...SETLIST_DU_11,
    title,
    date,
    items: [{ songSlug: "abba-pere", position: 1, keyOverride: "B", showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
    ...over,
  });
  const db = await ouvrir(page, "/setlists/new", {
    docs: {
      "setlists/sl-0920": passee("Culte du 20/09", "2026-09-20"),
      "setlists/sl-0927": passee("Culte du 27/09", "2026-09-27"),
      "setlists/sl-1011": passee("Culte à venir", "2026-10-11"),
      "setlists/sl-paix": passee("Groupe Paix du 27/09", "2026-09-27", { category: "Groupe Paix" }),
      "setlists/sl-brouillon": passee("Brouillon du 13/09", "2026-09-13", { isDraft: true }),
    },
  });
  await page.getByRole("link", { name: /Repartir d'une setlist passée/ }).click();
  await page.waitForURL(/[?&]depuis=passee/);

  const lignes = page.getByRole("list", { name: "Repartir d'une setlist passée" }).getByRole("listitem");
  await expect(lignes).toHaveCount(2);
  await expect(lignes.nth(0)).toContainText("Culte du 27/09");
  await expect(lignes.nth(1)).toContainText("Culte du 20/09");
  await page.screenshot({ path: testInfo.outputPath(`setlists-passees-${testInfo.project.name}.png`), fullPage: true });

  await page.getByRole("searchbox").fill("20/09");
  await expect(lignes).toHaveCount(1);
  await page.getByRole("searchbox").fill("");
  await expect(lignes).toHaveCount(2);

  await lignes.nth(0).getByRole("button", { name: /^Reprendre/ }).click();
  await page.waitForURL(/\/setlists\/fake-\d+\/edit/);
  const id = new URL(page.url()).pathname.split("/")[2];
  expect(db.doc(`setlists/${id}`)).toMatchObject({
    title: "Culte du 27/09 (copie)",
    isPrivate: true,
    date: "2026-09-27",
    category: CULTE,
    ownerId: MUSICIENNE.uid,
  });
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  if (await enDeuxColonnes(page)) await expect(boutonTonalite(groupeTonalites(page, "Abba Père"), "B")).toBeChecked();
  else await expect(page.getByLabel("Tonalité de Abba Père")).toHaveValue("B");
});

test("(page) planning vide : le message, et les deux autres entrées restent", async ({ page }) => {
  await ouvrir(page, "/setlists/new", { planning: false });
  await expect(page.getByText("Aucun service à venir sans setlist dans tes catégories.")).toBeVisible();
  await expect(services(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Autre setlist/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Repartir d'une setlist passée/ })).toBeVisible();
});

test("(page) 中文 : l'entrée et ses cartes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, "/setlists/new");
  await expect(page.getByRole("heading", { name: "为哪场聚会准备？" })).toBeVisible();
  const cartes = page.getByRole("list", { name: "为哪场聚会准备？" }).getByRole("listitem");
  await expect(cartes).toHaveCount(3);
  await expect(cartes.nth(0)).toContainText("10月18日星期日");
  await expect(cartes.nth(0)).toContainText("法语崇拜");
  await expect(cartes.nth(0)).toContainText("主席：Présidence C");
  await expect(cartes.nth(1)).toContainText("主席：待定");
  await expect(cartes.nth(0).getByRole("link", { name: /^准备/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /其他歌单/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /从以往的歌单开始/ })).toBeVisible();
});

test("(page) disposition : une colonne sur téléphone, deux sur tablette, trois sur ordinateur", async ({ page }, testInfo) => {
  await ouvrir(page, "/setlists/new");
  await expect(services(page)).toHaveCount(3);
  const y = async (i: number) => Math.round((await services(page).nth(i).boundingBox())!.y);
  const [a, b, c] = [await y(0), await y(1), await y(2)];
  const colonnes = { telephone: 1, tablette: 2, ordinateur: 3 }[testInfo.project.name] ?? 3;
  if (colonnes === 1) expect(a < b && b < c).toBe(true);
  if (colonnes === 2) expect(a === b && c > a).toBe(true);
  if (colonnes === 3) expect(a === b && b === c).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`pour-quel-service-${testInfo.project.name}.png`), fullPage: true });
});
