import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { fenetreDuSite, repondreDansLeSite } from "./helpers/agencement";
import { lirePdf } from "./helpers/pdf";
import {
  GRILLES, GRILLES_EDD, GRILLE_BONTE, GRILLE_CAMPUS_MATIN, GRILLE_CULTE, GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS,
  GRILLE_INTERFRANCO, GRILLE_PAIX, GRILLE_TABLE, PREMIERE_ANNEE_APP, dimanchesDe, lignesDeLAnnee, marquerDimanchesSpeciaux,
} from "../src/lib/planning/grilles";
import {
  avecDimanchesSpeciaux, collectPlanningNames, deriveServiceRolesFromPlanning, findMyServices, sansBrouillon, servantsForDate,
  type PlanningData,
} from "../src/lib/planning/names";
import { reminderBody, reminderServicesFor } from "../src/lib/push/reminderMessage";
import { colonneDePersonnes, propositions, type CompteDuPlanning } from "../src/lib/planning/choisir";
import { ADMIN_EMAILS, PLANNINGS_DATES_CHOISIES, canRetirerDate } from "../src/lib/access";
import { fusionnerChangements, phraseDuChangement, type ChangementGrille } from "../src/lib/planning/historique";
import { planningReleaseMessage } from "../src/lib/push/messages";

// Lot U2 (docs/spec-planning-2027.md) : le planning 2027 se remplit dans
// l'app, sur des dimanches posés d'office ; chaque trimestre reste un
// brouillon jusqu'à sa publication. Noms fictifs seulement.

// ─── Pur ────────────────────────────────────────────────────────────────────

test("dimanchesDe(2027) : 52 dimanches, du 03/01 au 26/12, 13 par trimestre", () => {
  const d = dimanchesDe(2027);
  expect(d).toHaveLength(52);
  expect(d[0]).toBe("2027-01-03");
  expect(d[51]).toBe("2027-12-26");
  for (const [debut, fin] of [["01", "03"], ["04", "06"], ["07", "09"], ["10", "12"]]) {
    expect(d.filter((x) => x.slice(5, 7) >= debut && x.slice(5, 7) <= fin)).toHaveLength(13);
  }
  expect(new Set(d.map((x) => new Date(`${x}T12:00:00`).getDay()))).toEqual(new Set([0]));
});

test("dimanchesDe(2028) : 53 dimanches, dès le 02/01", () => {
  const d = dimanchesDe(2028);
  expect(d).toHaveLength(53);
  expect(d[0]).toBe("2028-01-02");
  expect(d[52]).toBe("2028-12-31");
});

test("lignesDeLAnnee : tous les dimanches pour un planning hebdomadaire, cases vides comprises", () => {
  expect(PREMIERE_ANNEE_APP).toBe(2027);
  const ecrit = ["2027-01-10", "Invité A.", "", "", "", ""];
  const lignes = lignesDeLAnnee(GRILLE_PAIX, 2027, [["2026-12-27", "Ancien B.", "", "", "", ""], ecrit]);
  expect(lignes).toHaveLength(52);
  // Date, puis présidence, musiciens, orateur, thème et percussion (P5).
  expect(lignes[0]).toEqual(["2027-01-03", "", "", "", "", ""]);
  expect(lignes[1]).toEqual(ecrit);
  expect(lignes.some((r) => r[0].startsWith("2026"))).toBe(false);
});

test("lignesDeLAnnee : seulement les dates posées pour Interfranco (dates choisies)", () => {
  const rows = [["2026-06-14", "x"], ["2027-01-17", ""]];
  expect(lignesDeLAnnee(GRILLE_INTERFRANCO, 2027, rows).map((r) => r[0])).toEqual(["2027-01-17"]);
  expect(lignesDeLAnnee(GRILLE_INTERFRANCO, 2026, rows).map((r) => r[0])).toEqual(["2026-06-14"]);
});

// ─── Groupes › Paix en 2027 ─────────────────────────────────────────────────

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const SHEETS: Record<string, string> = {
  Paix_T1: csv([
    ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME"],
    ["04/01", "Ancien B.", "Groupe C.", "Orateur D.", "Thème E."],
    ["11/01", "Ancien F.", "", "", ""],
  ]),
  // P5 : la colonne PERCUSSION du T4 de 2026 (index 5), comme dans le Sheet.
  Paix_T4: csv([
    ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME", "PERCUSSION"],
    ["15/11", "Ancien G.", "", "", "", ""],
    ["22/11", "Ancien G.", "", "", "", "Membre P."],
  ]),
  // P5 (relevé T0) : Bonté a aussi PERCUSSION au T4, puis MÉNAGES, jamais rempli.
  "Bonté_T4": csv([
    ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME", "PERCUSSION", "MÉNAGES"],
    ["22/11", "Ancien H.", "", "", "", "Batteur B.", "Ménage X."],
  ]),
  // P5 : COURS en colonne 6, la classe en colonne 7 ouvre son bloc.
  EDD: csv([
    ["DATE", "PRESIDENCE", "SUPPLÉANT", "PIANO", "CAJON", "GUITARE", "COURS", ""],
    ["22/11", "Ancien K.", "", "", "", "", "Membre P.", "中班"],
    ["29/11", "Ancien L.", "", "", "", "", "", ""],
  ]),
  // Le Campus de 2026, dans le Sheet : le sélecteur d'année le garde à part de 2027.
  Campus_Louange: csv([
    ["DATE", "MOMENT", "PRESIDENT"],
    ["27/07/2026", "Soir", "Président C."],
  ]),
};

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Membre M." };
const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", plannings: ["paix"] };

async function ouvrir(page: Page, qui: FakeProfile, vers: string, docs: Record<string, Record<string, unknown>> = {}, quand = "2026-11-15T10:00:00") {
  await page.clock.setFixedTime(new Date(quand));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
  });
  return signInAs(page, qui, docs, vers);
}

/** Les dimanches affichés : cellule de date (table) ou carte (téléphone). */
const datesAffichees = (page: Page) =>
  page.locator("[data-date-cell], [data-date-carte]").filter({ visible: true })
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-date-cell") ?? e.getAttribute("data-date-carte")));

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

/** P9 : « Choisir », puis « Écrire un nom sans compte… » ; le champ du menu porte le libellé de la colonne. */
async function ecrireSansCompte(page: Page, date: string, colonne: string, libelle: string, valeur: string) {
  await laCase(page, date, colonne).getByRole("button").click();
  await page.getByRole("button", { name: "Écrire un nom sans compte…" }).click();
  const champ = page.getByRole("textbox", { name: libelle, exact: true });
  await champ.fill(valeur);
  await champ.press("Enter");
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

test("Paix 2027 : l'écrivain choisit 2027, voit les 13 dimanches du T1 et aucun de 2026", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  const dates = await datesAffichees(page);
  expect(dates[0]).toBe("2027-01-03");
  expect(dates[12]).toBe("2027-03-28");
  expect(dates.every((d) => d?.startsWith("2027"))).toBe(true);
});

test("Paix 2027 : une case s'écrit seule (rien recopié) et tient au rechargement", async ({ page }) => {
  const db = await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await ecrireSansCompte(page, "2027-01-10", "presidence", "Présidence", "Invité A.");
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.presidence).toBe("Invité A.");
  const doc = db.doc("plannings/paix/dimanches/2027-01-10")!;
  expect(Object.keys(doc).sort()).toEqual(["date", "modifieLe", "modifiePar", "presidence"]);

  await page.reload();
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
});

// ─── Brouillon et publication (Q4) ──────────────────────────────────────────

const PUBLIEUR: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", notify: ["Groupe Paix"] };
const CASE_2027 = { "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Invité A." } };

test("Paix 2027 : un membre ne voit pas 2027 tant que rien n'est publié", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes", CASE_2027);
  await expect(page.getByRole("tab", { name: "Paix", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "2027", exact: true })).toHaveCount(0);
  await expect(page.getByText("Invité A.")).toHaveCount(0);
});

test("Paix 2027 : l'écrivain sans droit de publier voit le brouillon, marqué, et le bandeau", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes", CASE_2027);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  const bandeau = page.getByTestId("bandeau-annee");
  await expect(bandeau).toContainText("2027 · brouillon");
  await expect(bandeau).toContainText("les 52 dimanches de 2027 sont déjà posés");
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect(page.locator("[data-non-publie='2027-01-10']").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Publier le T1" }), "publier demande le droit notify").toHaveCount(0);
});

test("Paix 2027 : « Publier le T1 » appelle la route avec l'année, puis propose « Masquer le T1 »", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR, "/back-office/planning/groupes", CASE_2027);
  const corps: unknown[] = [];
  // Route simulée : jamais de vraie notification.
  await page.route("**/api/planning/release", async (route) => {
    const body = route.request().postDataJSON() as { tri: string; publish: boolean };
    corps.push(body);
    const published = body.publish ? [body.tri] : [];
    db.set("planningReleases/paix_2027", { published });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, published, notified: body.publish, sent: 0 }) });
  });
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "Publier le T1" }).click();
  await repondreDansLeSite(page, "Publier le T1");
  await expect(page.getByRole("button", { name: "Masquer le T1" })).toBeVisible();
  expect(corps).toEqual([{ key: "paix", tri: "T1", publish: true, year: 2027 }]);
  await expect(page.locator("[data-non-publie='2027-01-10']").filter({ visible: true })).toHaveCount(0);
});

test("Paix 2027 : T1 publié, le membre voit 2027 et son T1 le 15/11/2026, pas le T2", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes", {
    ...CASE_2027,
    "planningReleases/paix_2027": { published: ["T1"] },
  });
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect(page.getByTestId("bandeau-annee")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "T2", exact: true })).toHaveCount(0);
});

// ─── Les autres pages : Culte, Table, EDD ───────────────────────────────────

test("Culte 2027 : l'écrivain du Culte voit le T1 2027 (13 dimanches, sainte cène le 03/01) ; un membre, non", async ({ page, browser }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["culte"] }, "/back-office/planning/culte");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  await expect(page.getByTestId("bandeau-annee")).toContainText("2027 · brouillon");
  const premier = page.locator("[data-date-cell='2027-01-03'], [data-date-carte='2027-01-03']").filter({ visible: true });
  await expect(premier).toContainText("Sainte Cène");

  const autre = await browser.newPage();
  await ouvrir(autre, MEMBRE, "/planning/culte");
  await expect(autre.getByTestId("barre-grille")).toBeVisible();
  await expect(autre.getByRole("tab", { name: "2027", exact: true })).toHaveCount(0);
  await autre.close();
});

test("Table 2027 : l'écrivain voit les 13 dimanches du T1 ; le membre voit 2027 dès une case remplie", async ({ page, browser }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["table"] }, "/back-office/planning/table");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);

  const vide = await browser.newPage();
  // Lot U6, B2 : dans l'App, la Table est en cartes (Petit déj, Prépa. Table), sans grille.
  await ouvrir(vide, MEMBRE, "/planning/table");
  await expect(vide.getByRole("region", { name: "Prépa. Table du Seigneur" })).toBeVisible();
  await expect(vide.getByRole("tab", { name: "2027", exact: true })).toHaveCount(0);
  await vide.close();

  const rempli = await browser.newPage();
  await ouvrir(rempli, MEMBRE, "/planning/table", { "plannings/table/dimanches/2027-01-03": { date: "2027-01-03", equipe: "Équipe Z." } });
  await expect(rempli.getByRole("tab", { name: "2027", exact: true })).toBeVisible();
  await rempli.close();
});

test("EDD 2027 : la classe 中班 montre les 9 dimanches de janvier-février 2027", async ({ page }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["eddZhongban"] }, "/back-office/planning/edd");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: /Janv/ }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(9);
  const dates = await datesAffichees(page);
  expect(dates[0]).toBe("2027-01-03");
  expect(dates[8]).toBe("2027-02-28");
});

// ─── Interfranco et Intergroupe dans les groupes (P4, Q5) ───────────────────

test("marquerDimanchesSpeciaux : la présidence prend le nom du service, le reste de la ligne ne bouge pas", () => {
  const paix = [
    ["2027-01-10", "Ancien B.", "Groupe C.", "Orateur D.", "Thème E."],
    ["2027-01-17", "Ancien Z.", "", "Orateur O.", "Offrande"],
    ["2027-03-14", "", "", "", ""],
  ];
  const interfranco = [["2027-01-17", "Président I.", "", "", "", "", "", "", "", "", ""]];
  const intergroupe = [["2027-03-14", "Président J.", "", "", "", "", "", "", "", "", "", ""]];
  expect(marquerDimanchesSpeciaux(paix, interfranco, intergroupe)).toEqual([
    ["2027-01-10", "Ancien B.", "Groupe C.", "Orateur D.", "Thème E."],
    ["2027-01-17", "Interfranco", "", "Orateur O.", "Offrande"],
    ["2027-03-14", "Intergroupe", "", "", ""],
  ]);
  expect(paix[1][1], "jamais recopié : la ligne d'origine reste intacte").toBe("Ancien Z.");
  expect(marquerDimanchesSpeciaux(paix, [], []), "sans dimanche spécial, rien ne change").toEqual(paix);
  expect(
    marquerDimanchesSpeciaux([["2027-01-17", "", "", "", ""]], interfranco, [["2027-01-17"]])[0][1],
    "les deux le même jour (jamais en principe) : Interfranco, comme « Ce dimanche »",
  ).toBe("Interfranco");
  // Les quatre grilles de groupe ont leur présidence en tête (index 1).
  for (const g of [GRILLE_PAIX, GRILLE_BONTE, GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS]) {
    expect(g.colonnes.find((c) => c.cle === "presidence")?.index, g.key).toBe(1);
  }
});

test("loadPlanningData (avecDimanchesSpeciaux) : pas de président fantôme dans « Mes services » ni dans les rappels", () => {
  const vide: PlanningData = {
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
    edd: {}, campus: [], intergroupe: [], interfranco: [],
  };
  const planning = avecDimanchesSpeciaux({
    ...vide,
    paix: [["2027-01-17", "Membre M.", "", "Orateur O.", ""], ["2027-01-24", "Membre M.", "", "", ""]],
    fidelite: [["2027-03-14", "Membre M.", "", "", ""]],
    bonte: [["2027-01-17", "Membre M.", "", "", ""]],
    interfranco: [["2027-01-17", "Président I.", "", "", "", "", "", "", "", "", ""]],
    intergroupe: [["2027-03-14", "Président J.", "", "", "", "", "", "", "", "", "", ""]],
  });
  expect(findMyServices(planning, "Membre M.").map((e) => `${e.date} ${e.service} ${e.role}`)).toEqual([
    "2027-01-24 Groupe Paix Présidence",
  ]);
  expect(reminderServicesFor(planning, "Membre M.", "2027-01-17")).toEqual([]);
  expect(reminderServicesFor(planning, "Orateur O.", "2027-01-17"), "l'orateur reste libre").toEqual([
    { service: "Groupe Paix", roles: ["Orateur"] },
  ]);
  expect(reminderServicesFor(planning, "Président I.", "2027-01-17")).toEqual([
    { service: "Interfranco", roles: ["Présidence"] },
  ]);
});

const DIMANCHES_SPECIAUX = {
  "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
  "plannings/intergroupe/dimanches/2027-03-14": { date: "2027-03-14" },
  // Président posé avant que l'Interfranco ne prenne ce dimanche : il ne s'affiche plus.
  "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Ancien Z.", orateur: "Orateur O." },
};

test("Paix 2027 : un dimanche d'Interfranco ou d'Intergroupe, la présidence affiche le service, non modifiable", async ({ page }) => {
  const db = await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes", DIMANCHES_SPECIAUX);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-17", "presidence")).toHaveText("Interfranco");
  await expect(laCase(page, "2027-03-14", "presidence")).toHaveText("Intergroupe");
  await expect(laCase(page, "2027-01-17", "orateur")).toContainText("Orateur O.");
  await expect(page.getByText("Ancien Z.")).toHaveCount(0);

  await expect(laCase(page, "2027-01-17", "presidence").getByRole("button"), "non modifiable").toHaveCount(0);
  await expect(laCase(page, "2027-01-17", "presidence")).toHaveText("Interfranco");
  await expect(laCase(page, "2027-01-10", "presidence").getByRole("button"), "un dimanche ordinaire reste modifiable").toHaveCount(1);

  // L'orateur et le thème restent libres ; la marque n'est jamais recopiée dans le document du groupe.
  await laCase(page, "2027-03-14", "theme").getByRole("button").click();
  const champ = laCase(page, "2027-03-14", "theme").getByLabel("Thème", { exact: true });
  await champ.fill("Louange commune");
  await champ.press("Enter");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-03-14")?.theme).toBe("Louange commune");
  expect(Object.keys(db.doc("plannings/paix/dimanches/2027-03-14")!).sort()).toEqual(["date", "modifieLe", "modifiePar", "theme"]);
  expect(db.doc("plannings/paix/dimanches/2027-01-17")?.presidence).toBe("Ancien Z.");
  await capture(page, "paix-2027-interfranco");
});

test("Paix 2027 : l'export du trimestre porte « Interfranco » et « Intergroupe » à la présidence", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes", DIMANCHES_SPECIAUX);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-17", "presidence")).toHaveText("Interfranco");
  // P7 : l'export au modèle du Sheet a remplacé le CSV du lot 17 (question 6).
  await page.getByRole("button", { name: "Exporter (modèle du Sheet)" }).click();
  const fenetre = page.getByRole("dialog", { name: "Exporter" });
  await fenetre.getByRole("radio", { name: "T1 2027 · Groupe Paix" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    fenetre.getByRole("button", { name: "PDF", exact: true }).click(),
  ]);
  const lignes = lirePdf(readFileSync(await download.path())).pages[0].lignes;
  expect(lignes.slice(lignes.indexOf("17/01"), lignes.indexOf("17/01") + 3)).toEqual(["17/01", "Interfranco", "Orateur O."]);
  expect(lignes.slice(lignes.indexOf("14/03"), lignes.indexOf("14/03") + 2)).toEqual(["14/03", "Intergroupe"]);
  expect(lignes).not.toContain("Ancien Z.");
});

test("Mes services (loadPlanningData) : le président de Paix posé avant l'Interfranco n'y est plus", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/mes-services", {
    "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
    "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Membre M." },
    "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Membre M." },
    // Relecture : le brouillon de 2027 n'entre dans « Mes services » qu'une fois publié.
    "planningReleases/paix_2027": { published: ["T1"] },
  });
  await expect(page.getByText("Janvier 2027")).toBeVisible();
  // Une ligne par service (en grand, U4 bis B4, le service ouvert à droite redit son nom).
  await expect(page.getByRole("link", { name: /^Groupe Paix,/ }), "le 24/01 seulement").toHaveCount(1);
  await expect(page.getByText(/17 janv/i)).toHaveCount(0);
  await expect(page.getByText(/24 janv/i).first()).toBeVisible();
});

// Accueil A (lot U4 bis, B1, Q14) : « Ton prochain service » est devenu la carte du prochain
// service de « Pour moi » (la première `[data-carte]` de la région).
const prochainService = (page: Page) => page.getByRole("region", { name: "Pour moi" }).locator("[data-carte]").first();

test("Ce dimanche du 17/01/2027 montre l'Interfranco ; « Prochain service » saute le président fantôme", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning", {
    "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
    "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Membre M." },
    "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Membre M." },
  }, "2027-01-15T10:00:00");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Interfranco", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Président I.")).toBeVisible();
  const prochain = prochainService(page);
  await expect(prochain).toContainText("Groupe Paix · Présidence");
  await expect(prochain).toContainText("24 janvier");
  await expect(prochain).not.toContainText("17 janvier");
  await capture(page, "ce-dimanche-interfranco-2027");
});

// ─── Colonnes de 2026 manquantes (P5, question 4 et relevé T0) ──────────────
//
// Percussion (Paix, Bonté : index 5, seulement certains trimestres de 2026,
// d'où une colonne optionnelle) et Cours (EDD : index 6) deviennent des
// services : grilles, lecteurs du Sheet, « Mes services », rappels. Ménages
// (Bonté, jamais rempli) reste écarté.

test("P5 · les grilles portent Percussion (Paix, Bonté) et Cours (EDD), à l'index du Sheet ; pas Ménages", () => {
  for (const g of [GRILLE_PAIX, GRILLE_BONTE]) {
    const percussion = g.colonnes.find((c) => c.cle === "percussion");
    expect(percussion, g.key).toEqual({ cle: "percussion", i18n: "planning.roles.percussion", index: 5, optionnelle: true });
  }
  for (const g of GRILLES_EDD) {
    expect(g.colonnes.find((c) => c.cle === "cours"), g.key).toEqual({ cle: "cours", i18n: "planning.roles.cours", index: 6 });
  }
  expect(GRILLE_FIDELITE.colonnes.some((c) => c.cle === "percussion"), "Fidélité n'a pas de percussion").toBe(false);
  expect(GRILLES.flatMap((g) => g.colonnes).some((c) => c.cle === "menages")).toBe(false);
});

test("P5 · Percussion et Cours : « Mes services », rappels (FR et 中文), notifications et profil", () => {
  const vide: PlanningData = {
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
    edd: {}, campus: [], intergroupe: [], interfranco: [],
  };
  const planning: PlanningData = {
    ...vide,
    paix: [["2026-11-22", "Ancien G.", "", "", "", "Membre P."]],
    bonte: [["2026-11-29", "Ancien H.", "", "", "", "Membre P."]],
    edd: { P6_NovDec: { label: "P6_NovDec", classes: { "中班": [["2026-11-22", "Ancien K.", "", "", "", "", "Membre P."]], "大班": [], "高班": [] } } },
  };
  expect(findMyServices(planning, "Membre P.").map((e) => `${e.date} ${e.service} ${e.role}`)).toEqual([
    "2026-11-22 EDD 中班 Cours",
    "2026-11-22 Groupe Paix Percussion",
    "2026-11-29 Groupe Bonté Percussion",
  ]);
  const rappels = reminderServicesFor(planning, "Membre P.", "2026-11-22");
  expect(rappels).toEqual([
    { service: "EDD 中班", roles: ["Cours"] },
    { service: "Groupe Paix", roles: ["Percussion"] },
  ]);
  expect(reminderBody("2026-11-22", "J1", rappels, "fr")).toContain("EDD 中班 (Cours) · Groupe Paix (Percussion)");
  expect(reminderBody("2026-11-22", "J1", rappels, "zh-CN")).toContain("主日学 中班（授课） · 和平团契（打击乐）");

  // « Setlist prête » : la percussion joue (musicien) ; qui fait cours est présent sans rôle de setlist.
  const servants = servantsForDate(planning, "2026-11-22").filter((s) => s.name === "Membre P.");
  expect(servants).toEqual(expect.arrayContaining([
    expect.objectContaining({ category: "Groupe Paix", serviceRole: "musicien", leader: "Ancien G." }),
    expect.objectContaining({ category: "中班", serviceRole: null, leader: "Ancien K." }),
  ]));
  expect(deriveServiceRolesFromPlanning(planning, "Membre P.")).toEqual({
    "Groupe Paix": ["musicien"], "Groupe Bonté": ["musicien"], "中班": [],
  });
  expect(collectPlanningNames(planning)).toContain("Membre P.");
});

test("P5 · Groupes 2026 : la Percussion du Sheet s'affiche (Paix et Bonté au T4), Ménages non", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes");
  await expect(laCase(page, "2026-11-22", "presidence")).toContainText("Ancien G.");
  await expect(laCase(page, "2026-11-22", "percussion")).toContainText("Membre P.");
  await page.getByRole("tab", { name: "Bonté", exact: true }).click();
  await expect(laCase(page, "2026-11-22", "percussion")).toContainText("Batteur B.");
  await expect(page.getByText("Ménage X.")).toHaveCount(0);
  await expect(page.getByText("Ménages")).toHaveCount(0);
  await capture(page, "p5-bonte-t4-percussion");
});

// Lot U6, B2 : au Back-Office, la grille s'ouvre en modification ; la colonne optionnelle y
// est donc toujours là pour être remplie (la règle de lecture, masquée vide, ne change pas).
test("P5 · Paix 2027 : Percussion, colonne optionnelle, remplissable au Back-Office", async ({ page }) => {
  const db = await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  await expect(page.getByText("Percussion", { exact: true }).filter({ visible: true }).first(), "vide au T1, mais à remplir").toBeVisible();

  await ecrireSansCompte(page, "2027-01-10", "percussion", "Percussion", "Batteur B.");
  await expect(laCase(page, "2027-01-10", "percussion")).toContainText("Batteur B.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.percussion).toBe("Batteur B.");
  expect(Object.keys(db.doc("plannings/paix/dimanches/2027-01-10")!).sort()).toEqual(["date", "modifieLe", "modifiePar", "percussion"]);
  await capture(page, "p5-paix-2027-percussion");
});

test("P5 · EDD 2026 : la colonne Cours du Sheet s'affiche", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/edd");
  await expect(page.getByRole("tab", { name: "中班", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(laCase(page, "2026-11-22", "presidence")).toContainText("Ancien K.");
  await expect(laCase(page, "2026-11-22", "cours")).toContainText("Membre P.");
  await capture(page, "p5-edd-cours");
});

test("P5 · « Mes services » liste la Percussion et le Cours", async ({ page }) => {
  await ouvrir(page, { uid: "uid-perc", email: "perc@example.com", planningName: "Membre P." }, "/mes-services");
  // En grand (U4 bis, B4), le service ouvert à droite redit nom et rôles : la ligne d'abord.
  await expect(page.getByRole("link", { name: /^Groupe Paix,/ })).toBeVisible();
  await expect(page.getByText("Percussion", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^EDD 中班,/ })).toBeVisible();
  await expect(page.getByText("Cours", { exact: true }).first()).toBeVisible();
  await capture(page, "p5-mes-services");
});

// Accueil A (lot U4 bis, B1, Q14 ; fusion de U2) : une ligne par groupe, « Présidence · Musiciens » ;
// la percussion rejoint les musiciens de son groupe ; l'EDD n'y montre que la présidence de chaque
// classe, le Cours reste dans l'onglet EDD du planning (test « P5 · EDD 2026 »).
test("P5 · « Ce dimanche » montre la Percussion des groupes avec leurs musiciens", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning", {}, "2026-11-20T10:00:00");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  const groupe = (nom: string) => dimanche.getByTestId("ligne-groupe").filter({ hasText: nom });
  await expect(groupe("Paix")).toContainText("Membre P.");
  await expect(groupe("Bonté")).toContainText("Batteur B.");
  await expect(dimanche.getByText("Ménage X."), "Ménages reste écarté").toHaveCount(0);
  await expect(dimanche.getByTestId("ligne-edd").filter({ hasText: "中班" })).toContainText("Ancien K.");
});

// ─── P9 · « Choisir » une personne dans une case (question 5) ────────────────

const COMPTES_P9: CompteDuPlanning[] = [
  { nom: "Julien Z.", prenom: "Julien", nomDeFamille: "Zed", serviceRoles: { "Groupe Paix": ["presidence"] } },
  { nom: "Élise M.", prenom: "Élise", nomDeFamille: "Mercier", serviceRoles: { "Groupe Paix": ["musicien"] } },
  { nom: "Alice Q.", prenom: "Alice", nomDeFamille: "Quinet", serviceRoles: { "Groupe Paix": ["presidence"], "中班": ["musicien"] } },
  { nom: "Bruno R.", prenom: "Bruno", nomDeFamille: "Roux", serviceRoles: { "Culte Francophone": ["presidence", "chanteur"] } },
  // Sans nom de planning : « Mes services » ne la retrouverait pas, « Choisir » ne la propose pas.
  { nom: "", prenom: "Sans", nomDeFamille: "Nom", serviceRoles: { "Groupe Paix": ["presidence"] } },
];

test("P9 · propositions : d'abord les comptes qui ont le rôle de la colonne, puis les autres comptes et les noms de la grille", () => {
  const rows = [
    ["2027-01-03", "Invité A.", "Séance de louange", "Baptême", "Thème libre", ""],
    ["2027-01-10", "alice q", "Interfranco", "", "", ""],
  ];
  expect(propositions(GRILLE_PAIX, "presidence", COMPTES_P9, rows, "")).toEqual([
    { nom: "Alice Q.", duRole: true },
    { nom: "Julien Z.", duRole: true },
    { nom: "Bruno R.", duRole: false },
    { nom: "Élise M.", duRole: false },
    { nom: "Invité A.", duRole: false },
  ]);
  // Le rôle suit la colonne : musiciens → musicien du Groupe Paix.
  expect(propositions(GRILLE_PAIX, "musiciens", COMPTES_P9, rows, "")[0]).toEqual({ nom: "Élise M.", duRole: true });
  // … et la catégorie, le planning : la présidence du Culte n'est pas celle de Paix.
  expect(propositions(GRILLE_CULTE, "presidence", COMPTES_P9, [], "").filter((p) => p.duRole).map((p) => p.nom)).toEqual(["Bruno R."]);
  expect(propositions(GRILLE_CULTE, "choriste2", COMPTES_P9, [], "").filter((p) => p.duRole).map((p) => p.nom)).toEqual(["Bruno R."]);
  expect(propositions(GRILLES_EDD[0], "piano", COMPTES_P9, [], "").filter((p) => p.duRole).map((p) => p.nom)).toEqual(["Alice Q."]);
  // Sans rôle de setlist (orateur) ou sans catégorie (Table) : une seule liste, par ordre alphabétique.
  expect(propositions(GRILLE_PAIX, "orateur", COMPTES_P9, [], "").some((p) => p.duRole)).toBe(false);
  expect(propositions(GRILLE_TABLE, "equipe", COMPTES_P9, [], "").map((p) => p.nom)).toEqual(["Alice Q.", "Bruno R.", "Élise M.", "Julien Z."]);
});

test("P9 · recherche : sans accents ni casse, sur le nom de planning, le prénom ou le nom", () => {
  expect(propositions(GRILLE_PAIX, "presidence", COMPTES_P9, [], "elise").map((p) => p.nom)).toEqual(["Élise M."]);
  expect(propositions(GRILLE_PAIX, "presidence", COMPTES_P9, [], "QUINET").map((p) => p.nom)).toEqual(["Alice Q."]);
  expect(propositions(GRILLE_PAIX, "presidence", COMPTES_P9, [], "  ju ").map((p) => p.nom)).toEqual(["Julien Z."]);
  expect(propositions(GRILLE_PAIX, "presidence", COMPTES_P9, [], "personne")).toEqual([]);
});

test("P9 · colonnes de personnes : le thème, les chants et la répétition restent du texte libre", () => {
  expect(colonneDePersonnes("presidence")).toBe(true);
  expect(colonneDePersonnes("orateur")).toBe(true);
  expect(colonneDePersonnes("equipe")).toBe(true);
  for (const cle of ["theme", "chant1", "chant4", "repetition"]) expect(colonneDePersonnes(cle), cle).toBe(false);
  expect(GRILLE_CAMPUS_MATIN.colonnes.filter((c) => !colonneDePersonnes(c.cle)).map((c) => c.cle))
    .toEqual(["chant1", "chant2", "chant3", "chant4", "repetition"]);
});

/** Les comptes de P9 en documents `users/…` (la page les lit pour qui remplit). */
const DOCS_P9: Record<string, Record<string, unknown>> = {
  ...Object.fromEntries(COMPTES_P9.map((c, i) => [`users/uid-p9-${i}`, {
    email: `p9-${i}@example.com`, firstName: c.prenom, lastName: c.nomDeFamille, planningName: c.nom,
    serviceRoles: c.serviceRoles, annonces: [], notify: [], poles: [],
  }])),
  // Un nom sans compte déjà dans la grille ; « Baptême » et « Séance de louange » n'en sont pas (relevé T0).
  "plannings/paix/dimanches/2027-01-03": { date: "2027-01-03", presidence: "Invité A.", musiciens: "Séance de louange", orateur: "Baptême" },
};

/** Paix, T1 2027, en modification. */
async function paix2027EnModification(page: Page) {
  const db = await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes", DOCS_P9);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  return db;
}

test("P9 · « Choisir » : les comptes de la présidence de Paix d'abord, puis les autres ; un clic écrit le nom", async ({ page }) => {
  const db = await paix2027EnModification(page);
  const bouton = laCase(page, "2027-01-10", "presidence").getByRole("button", { name: "Choisir" });
  await expect(bouton).toBeVisible();
  await bouton.click();

  const menu = page.getByRole("dialog", { name: "Présidence · 10/1" });
  await expect(menu.getByPlaceholder("Chercher un nom")).toBeVisible();
  await expect(menu.getByRole("option")).toHaveText([/^Alice Q\./, /^Julien Z\./, /^Bruno R\./, /^Écrivain E\./, /^Élise M\./, /^Invité A\./]);
  await expect(menu.getByRole("option").nth(0)).toContainText("Présidence");
  await expect(menu.getByText("Avec ce rôle")).toBeVisible();
  await expect(menu.getByText("Autres noms")).toBeVisible();
  for (const pas of ["Baptême", "Séance de louange", "Sans N"]) await expect(menu.getByText(pas)).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Écrire un nom sans compte…" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Vider la case" }), "case vide : rien à vider").toHaveCount(0);
  await capture(page, "p9-choisir-menu");

  await menu.getByPlaceholder("Chercher un nom").fill("elise");
  await expect(menu.getByRole("option")).toHaveText([/^Élise M\./]);
  await menu.getByPlaceholder("Chercher un nom").fill("quinet");
  await menu.getByRole("option", { name: /Alice Q\./ }).click();

  await expect(menu).toHaveCount(0);
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Alice Q.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.presidence).toBe("Alice Q.");
  expect(Object.keys(db.doc("plannings/paix/dimanches/2027-01-10")!).sort()).toEqual(["date", "modifieLe", "modifiePar", "presidence"]);
});

test("P9 · « Choisir » au clavier : flèches et Entrée ; Échap ferme sans rien écrire", async ({ page }) => {
  const db = await paix2027EnModification(page);
  await laCase(page, "2027-01-24", "presidence").getByRole("button", { name: "Choisir" }).click();
  const recherche = page.getByRole("dialog").getByPlaceholder("Chercher un nom");
  // Ordinateur : la recherche a le focus. Feuille : on touche le champ (le clavier
  // du téléphone ne s'ouvre pas tout seul sur la liste).
  if (test.info().project.name === "ordinateur") await expect(recherche).toBeFocused();
  else await recherche.click();
  await recherche.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(db.doc("plannings/paix/dimanches/2027-01-24")).toBeUndefined();

  await laCase(page, "2027-01-24", "presidence").getByRole("button", { name: "Choisir" }).click();
  if (test.info().project.name !== "ordinateur") await recherche.click();
  await recherche.press("ArrowDown");
  await recherche.press("Enter");
  await expect(laCase(page, "2027-01-24", "presidence")).toContainText("Julien Z.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-24")?.presidence).toBe("Julien Z.");
});

test("P9 · « Écrire un nom sans compte… » reprend la recherche ; « Vider la case » efface", async ({ page }) => {
  const db = await paix2027EnModification(page);
  await laCase(page, "2027-01-10", "orateur").getByRole("button", { name: "Choisir" }).click();
  const menu = page.getByRole("dialog", { name: "Orateur · 10/1" });
  await menu.getByPlaceholder("Chercher un nom").fill("Pasteur Y.");
  await expect(menu.getByRole("option")).toHaveCount(0);
  await menu.getByRole("button", { name: "Écrire un nom sans compte…" }).click();
  const champ = menu.getByRole("textbox", { name: "Orateur", exact: true });
  await expect(champ).toHaveValue("Pasteur Y.");
  await champ.press("Enter");
  await expect(laCase(page, "2027-01-10", "orateur")).toContainText("Pasteur Y.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.orateur).toBe("Pasteur Y.");

  // Une case remplie : « Choisir » s'ouvre aussi dessus, avec « Vider la case ».
  await laCase(page, "2027-01-10", "orateur").getByRole("button").click();
  await page.getByRole("dialog").getByRole("button", { name: "Vider la case" }).click();
  await expect(laCase(page, "2027-01-10", "orateur").getByRole("button", { name: "Choisir" })).toBeVisible();
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.orateur).toBe("");
});

test("P9 · le thème n'a pas de « Choisir » : il s'écrit dans la case, comme au lot 17", async ({ page }) => {
  const db = await paix2027EnModification(page);
  await expect(laCase(page, "2027-01-10", "theme").getByRole("button", { name: "Choisir" })).toHaveCount(0);
  await laCase(page, "2027-01-10", "theme").getByRole("button").click();
  const champ = laCase(page, "2027-01-10", "theme").getByLabel("Thème", { exact: true });
  await champ.fill("Psaumes");
  await champ.press("Enter");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.theme).toBe("Psaumes");
});

test("P9 · ordinateur : le menu s'ouvre contre la case ; tablette et téléphone : en feuille, en bas de l'écran", async ({ page }) => {
  await paix2027EnModification(page);
  const bouton = laCase(page, "2027-01-10", "presidence").getByRole("button", { name: "Choisir" });
  // Mesurée avant : menu ouvert, le reste de la page sort de l'arbre d'accessibilité.
  const b = (await bouton.boundingBox())!;
  await bouton.click();
  const menu = page.getByRole("dialog", { name: "Présidence · 10/1" });
  await expect(menu.getByPlaceholder("Chercher un nom")).toBeVisible();
  // Laisse la feuille finir de monter.
  await page.waitForTimeout(600);
  const m = (await menu.boundingBox())!;
  const hauteur = page.viewportSize()!.height;
  if (test.info().project.name === "ordinateur") {
    // Sous la case, ou au-dessus quand la place manque en bas de l'écran.
    const contre = Math.min(Math.abs(m.y - (b.y + b.height)), Math.abs(m.y + m.height - b.y));
    expect(contre, "contre la case, au-dessous ou au-dessus").toBeLessThan(12);
    expect(Math.abs(m.x - b.x)).toBeLessThan(12);
    expect(m.width).toBeLessThan(320);
  } else {
    expect(Math.abs(m.y + m.height - hauteur), "collée en bas de l'écran").toBeLessThan(4);
  }
  await capture(page, "p9-choisir-place");
});

test("P9 · en 中文 : « Choisir », la recherche et le nom sans compte traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes", DOCS_P9);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await laCase(page, "2027-01-10", "presidence").getByRole("button", { name: "选择" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu.getByPlaceholder("搜索姓名")).toBeVisible();
  await expect(menu.getByRole("button", { name: "输入没有账号的名字…" })).toBeVisible();
  await capture(page, "p9-choisir-zh");
});

// ─── Relecture · fin de P2 : dates choisies (Q3), retrait (Q10) ─────────────
//
// Interfranco, Intergroupe et Campus n'ont pas de dimanches posés d'office :
// le responsable ajoute ses dates (un dimanche que l'autre service n'a pas
// pris ; pour le Campus, une séance un jour quelconque, matin ou soir) et peut
// retirer une date posée par erreur, là seulement (règle en double avec
// `canRetirerDate`). Poser ou retirer laisse une entrée dans l'historique.

test("Q10 · retirer une date : seulement les plannings à dates choisies, pour qui les remplit (contre-épreuve sur la clé)", () => {
  expect([...PLANNINGS_DATES_CHOISIES].sort()).toEqual(GRILLES.filter((g) => g.dates === "choisies").map((g) => g.key).sort());
  const ecrivain = { email: "ecrivain@example.com" };
  const admin = { email: ADMIN_EMAILS[0] };
  expect(canRetirerDate(ecrivain, { plannings: ["interfranco"] }, "interfranco")).toBe(true);
  expect(canRetirerDate(ecrivain, { plannings: ["campusSoir"] }, "campusSoir")).toBe(true);
  expect(canRetirerDate(ecrivain, { plannings: ["paix"] }, "paix"), "un dimanche de Paix ne se retire pas").toBe(false);
  expect(canRetirerDate(admin, null, "culte"), "pas même par un admin").toBe(false);
  expect(canRetirerDate(admin, null, "intergroupe")).toBe(true);
  expect(canRetirerDate(ecrivain, { plannings: ["paix"] }, "interfranco"), "sans le droit d'écrire ce planning").toBe(false);
  expect(canRetirerDate(null, null, "interfranco")).toBe(false);

  // Miroir serveur : la règle de suppression nomme exactement les mêmes clés.
  const rules = readFileSync("firestore.rules", "utf8");
  const bloc = rules.slice(rules.indexOf("match /dimanches/{date}"), rules.indexOf("match /history/{entryId}", rules.indexOf("match /dimanches/{date}")));
  const del = bloc.slice(bloc.indexOf("allow delete"));
  expect(del).toContain("peutEcrirePlanning(key)");
  const cles = [...(del.match(/key in \[([^\]]*)\]/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
  expect(cles.sort()).toEqual([...PLANNINGS_DATES_CHOISIES].sort());
});

test("historique : une date posée ou retirée est une entrée ; posée puis retirée dans le même passage, rien", () => {
  const pose: ChangementGrille = { kind: "dimanche", date: "2027-01-17", retire: false };
  const retire: ChangementGrille = { kind: "dimanche", date: "2027-01-17", retire: true };
  expect(phraseDuChangement(pose)).toBe("pose");
  expect(phraseDuChangement(retire)).toBe("retire");
  const caseEcrite: ChangementGrille = { kind: "case", date: "2027-01-17", colonne: "presidence", from: "", to: "Président I." };
  expect(fusionnerChangements([], pose)).toEqual([pose]);
  expect(fusionnerChangements([pose, caseEcrite], retire)).toEqual([caseEcrite]);
  expect(fusionnerChangements([pose], { kind: "dimanche", date: "2027-01-24", retire: false })).toHaveLength(2);
});

const INTERFRANCO: FakeProfile = { ...ECRIVAIN, plannings: ["interfranco", "paix"] };
const choixDeDate = (page: Page) => page.getByLabel("Dimanche à ajouter", { exact: true });
const optionsProposees = (page: Page) => choixDeDate(page).locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));

test("Interfranco 2027 : « Aucun dimanche posé », « Ajouter un dimanche » ; Paix affiche alors « Interfranco », non modifiable", async ({ page }) => {
  const db = await ouvrir(page, INTERFRANCO, "/back-office/planning/interfranco");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await expect(page.getByText("Aucun dimanche posé pour 2027.").filter({ visible: true })).toHaveCount(1);
  expect(await optionsProposees(page)).toEqual(dimanchesDe(2027));
  await choixDeDate(page).selectOption("2027-01-17");
  await page.getByRole("button", { name: "Ajouter un dimanche" }).click();

  await expect.poll(() => datesAffichees(page)).toEqual(["2027-01-17"]);
  expect(db.doc("plannings/interfranco/dimanches/2027-01-17")?.date).toBe("2027-01-17");
  expect(await optionsProposees(page), "un dimanche posé n'est plus proposé").not.toContain("2027-01-17");
  await expect.poll(() => db.list("plannings/interfranco/history").length).toBe(1);
  expect(db.doc(db.list("plannings/interfranco/history")[0])?.changes).toEqual([{ kind: "dimanche", date: "2027-01-17", retire: false }]);
  await page.getByRole("button", { name: "Historique des modifications" }).click();
  await expect(page.getByText("Écrivain E. a ajouté le 17 janvier")).toBeVisible();
  await capture(page, "interfranco-2027-ajoute");

  // Au Back-Office, la grille de Paix s'ouvre en modification (U6, B2).
  await page.goto("/back-office/planning/groupes");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-17", "presidence")).toHaveText("Interfranco");
  await expect(laCase(page, "2027-01-17", "presidence").getByRole("button"), "non modifiable").toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retirer ce dimanche" }), "un dimanche de Paix ne se retire pas").toHaveCount(0);
});

test("Intergroupe 2027 : un dimanche déjà pris par l'Interfranco n'est pas proposé", async ({ page }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["intergroupe"] }, "/back-office/planning/intergroupe", {
    "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17" },
  });
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  const proposes = await optionsProposees(page);
  expect(proposes).not.toContain("2027-01-17");
  expect(proposes).toContain("2027-01-24");
  expect(proposes).toHaveLength(51);
});

test("Interfranco : un membre voit 2027 dès qu'un dimanche est posé, sans « Ajouter » ; rien avant", async ({ page, browser }) => {
  await ouvrir(page, MEMBRE, "/planning/interfranco");
  await expect(page.getByTestId("barre-grille")).toBeVisible();
  await expect(page.getByRole("tab", { name: "2027", exact: true })).toHaveCount(0);

  const autre = await browser.newPage();
  await ouvrir(autre, MEMBRE, "/planning/interfranco", { "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." } });
  await autre.getByRole("tab", { name: "2027", exact: true }).click();
  await expect(laCase(autre, "2027-01-17", "presidence")).toContainText("Président I.");
  await expect(autre.getByRole("button", { name: "Ajouter un dimanche" })).toHaveCount(0);
  await autre.close();
});

test("Interfranco 2027 : « Retirer ce dimanche » demande confirmation, efface la date et le note", async ({ page, browser }) => {
  const DATE = { "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." } };
  // Dans l'App, la page se lit, même pour qui la remplit (U6, B2) : ni « Ajouter » ni « Retirer ».
  const app = await browser.newPage();
  await ouvrir(app, INTERFRANCO, "/planning/interfranco", DATE);
  await app.getByRole("tab", { name: "2027", exact: true }).click();
  await expect(laCase(app, "2027-01-17", "presidence")).toContainText("Président I.");
  await expect(app.getByRole("button", { name: "Retirer ce dimanche" }), "au Back-Office seulement").toHaveCount(0);
  await expect(app.getByRole("button", { name: "Ajouter un dimanche" })).toHaveCount(0);
  await app.close();

  const db = await ouvrir(page, INTERFRANCO, "/back-office/planning/interfranco", DATE);
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await expect(laCase(page, "2027-01-17", "presidence")).toContainText("Président I.");
  const retirer = page.getByRole("button", { name: "Retirer ce dimanche" }).filter({ visible: true });
  await expect(retirer).toHaveCount(1);
  await capture(page, "interfranco-2027-modifier");

  await retirer.click();
  await expect(fenetreDuSite(page)).toContainText("Ses cases s'effacent");
  await repondreDansLeSite(page, "Annuler");
  expect(db.doc("plannings/interfranco/dimanches/2027-01-17"), "refusé : rien ne bouge").toBeDefined();

  await retirer.click();
  await repondreDansLeSite(page, "Retirer");
  await expect.poll(() => db.doc("plannings/interfranco/dimanches/2027-01-17")).toBeUndefined();
  await expect(page.getByText("Aucun dimanche posé pour 2027.").filter({ visible: true })).toHaveCount(1);
  await expect.poll(() => db.list("plannings/interfranco/history").length).toBe(1);
  expect(db.doc(db.list("plannings/interfranco/history")[0])?.changes).toEqual([{ kind: "dimanche", date: "2027-01-17", retire: true }]);
  await capture(page, "interfranco-2027-retire");
});

test("Campus 2027 : « Ajouter une séance » (date et moment) ; les cartes ne mêlent pas 2026", async ({ page }) => {
  const db = await ouvrir(page, { ...ECRIVAIN, plannings: ["campusMatin"] }, "/back-office/planning/campus");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "Grille", exact: true }).click();
  await expect(page.getByText("Aucun dimanche posé pour 2027.").filter({ visible: true })).toHaveCount(2);
  const moment = page.getByLabel("Moment", { exact: true });
  await expect(moment.locator("option"), "le soir n'est pas à elle").toHaveText(["Matin"]);
  await page.getByLabel("Date de la séance", { exact: true }).fill("2027-07-26");
  await page.getByRole("button", { name: "Ajouter une séance" }).click();

  await expect.poll(() => db.doc("plannings/campusMatin/dimanches/2027-07-26")?.date).toBe("2027-07-26");
  await expect(page.locator('[data-grille="campusMatin"]').locator("[data-date-cell='2027-07-26'], [data-date-carte='2027-07-26']").filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('[data-grille="campusMatin"]').getByText("Aucun dimanche posé pour 2027.").filter({ visible: true })).toHaveCount(0);
  await capture(page, "campus-2027-seance");

  // Le volet « Louange » de la page, à côté de « Grille » (la barre de navigation a aussi une section « Louange »).
  await page.getByRole("tab", { name: "Grille", exact: true }).locator("..").getByRole("tab", { name: "Louange", exact: true }).click();
  await expect(page.getByText("26/7", { exact: true })).toBeVisible();
  await expect(page.getByText("27/7", { exact: true }), "les séances de 2026 restent dans 2026").toHaveCount(0);
  await page.getByRole("tab", { name: "2026", exact: true }).click();
  await expect(page.getByText("27/7", { exact: true })).toBeVisible();
});

// ─── Relecture · le brouillon de 2027 hors de « Mes services » (Q4) ─────────

test("Mes services : un service du brouillon 2027 n'apparaît qu'une fois son trimestre publié", async ({ page, browser }) => {
  const SERVICE_2027 = { "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Membre M." } };
  await ouvrir(page, MEMBRE, "/mes-services", SERVICE_2027);
  await expect(page.getByText("Aucun service à venir", { exact: false })).toBeVisible();
  await expect(page.getByText(/24 janv/i)).toHaveCount(0);
  await expect(page.getByText("Groupe Paix", { exact: true })).toHaveCount(0);

  const publie = await browser.newPage();
  await ouvrir(publie, MEMBRE, "/mes-services", { ...SERVICE_2027, "planningReleases/paix_2027": { published: ["T1"] } });
  await expect(publie.getByText(/24 janv/i).first()).toBeVisible();
  await publie.close();
});

test("sansBrouillon : un trimestre à venir non publié reste hors de « Mes services », cette année comme la suivante", () => {
  const vide: PlanningData = {
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
    edd: {}, campus: [], intergroupe: [], interfranco: [],
  };
  const data: PlanningData = {
    ...vide,
    culte: [["2026-12-27", "Membre M."], ["2027-01-10", "Membre M."], ["2027-04-11", "Membre M."], ["2027-07-11", "Membre M."], ["2028-01-09", "Membre M."]],
    paix: [["2027-04-11", "Membre M."]],
    fidelite: [["2027-04-11", "", "", "", "", "Membre M."]],
  };
  const dates = (d: PlanningData) => ({ culte: d.culte.map((r) => r[0]), paix: d.paix.map((r) => r[0]), fidelite: d.fidelite.map((r) => r[0]) });

  // Le 15/11/2026 (T4) : 2026 tel quel, de 2027 seul le T1 du Culte, publié.
  expect(dates(sansBrouillon(data, 2026, "T4", { 2026: {}, 2027: { culte: ["T1"] } }))).toEqual({
    culte: ["2026-12-27", "2027-01-10"], paix: [], fidelite: [],
  });
  // Le 14/02/2027 : le T1 en cours se lit toujours ; le T2 du Culte, brouillon, non ; celui de Paix et
  // de Fidélité (sa guitare comprise, lot F), publié, oui ; 2028 seulement s'il est publié.
  expect(dates(sansBrouillon(data, 2027, "T1", { 2027: { paix: ["T2"], fidelite: ["T2"] }, 2028: {} }))).toEqual({
    culte: ["2026-12-27", "2027-01-10"], paix: ["2027-04-11"], fidelite: ["2027-04-11"],
  });
  // L'année du Sheet (2026) ne change pas : son T4 se lit dès septembre, publié ou non, comme avant U2.
  expect(dates(sansBrouillon(data, 2026, "T3", {})).culte).toEqual(["2026-12-27"]);
  // Le 11/07/2027 : T1 à T3 passés ou en cours.
  expect(dates(sansBrouillon(data, 2027, "T3", {})).culte).toEqual(["2026-12-27", "2027-01-10", "2027-04-11", "2027-07-11"]);
});

test("Prochain service : le brouillon 2027 n'y entre qu'une fois son trimestre publié", async ({ page, browser }) => {
  const SERVICE_2027 = { "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Membre M." } };
  await ouvrir(page, MEMBRE, "/planning", SERVICE_2027);
  // Le Sheet et la grille de Paix sont lus : « Ce dimanche » (15/11/2026) montre sa présidence.
  await expect(page.getByRole("region", { name: /Ce dimanche/ }).getByText("Ancien G.")).toBeVisible();
  // Sans service à venir, « Pour moi » disparaît (Q14).
  await expect(page.getByRole("region", { name: "Pour moi" })).toHaveCount(0);

  const publie = await browser.newPage();
  await ouvrir(publie, MEMBRE, "/planning", { ...SERVICE_2027, "planningReleases/paix_2027": { published: ["T1"] } });
  await expect(prochainService(publie)).toContainText("Groupe Paix · Présidence");
  await expect(prochainService(publie)).toContainText("24 janvier");
  await publie.close();
});

// ─── Relecture · la notification de publication dit l'année (mineur) ───────

test("publication : « Planning T1 2027 en ligne » quand l'année n'est pas l'année en cours, FR et 中文", () => {
  expect(planningReleaseMessage({ label: "Groupe Paix", tri: "T1", annee: 2027 }, "fr")).toEqual({
    title: "Planning T1 2027 en ligne",
    body: "Le planning Groupe Paix du T1 2027 est disponible.",
  });
  expect(planningReleaseMessage({ label: "Groupe Paix", tri: "T1", annee: 2027 }, "zh-CN")).toEqual({
    title: "2027 年 T1 服事表已上线",
    body: "Groupe Paix 的 2027 年 T1 服事表已可查看。",
  });
  expect(planningReleaseMessage({ label: "Groupe Paix", tri: "T1" }, "fr").title, "sans année : le message d'aujourd'hui").toBe("Planning T1 en ligne");
});

// ─── Relecture · une case à plusieurs noms ne se remplace pas d'un clic (mineur)

test("P9 · une case qui porte plusieurs noms s'ouvre en texte, prérempli, sans « Choisir »", async ({ page }) => {
  const db = await ouvrir(page, { ...ECRIVAIN, plannings: ["table"] }, "/back-office/planning/table", {
    "plannings/table/dimanches/2027-01-03": { date: "2027-01-03", equipe: "Alice Q., Bruno R., Julien Z." },
  });
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  await page.getByRole("tab", { name: "T1", exact: true }).click();
  await laCase(page, "2027-01-03", "equipe").getByRole("button").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const champ = laCase(page, "2027-01-03", "equipe").getByLabel("Équipe", { exact: true });
  await expect(champ).toHaveValue("Alice Q., Bruno R., Julien Z.");
  await champ.fill("Alice Q., Bruno R., Cécile T.");
  await champ.press("Enter");
  await expect.poll(() => db.doc("plannings/table/dimanches/2027-01-03")?.equipe).toBe("Alice Q., Bruno R., Cécile T.");
});
