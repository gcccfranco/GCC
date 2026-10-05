import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { lirePdf } from "./helpers/pdf";
import {
  GRILLES, GRILLES_EDD, GRILLE_BONTE, GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS, GRILLE_INTERFRANCO, GRILLE_PAIX,
  PREMIERE_ANNEE_APP, dimanchesDe, lignesDeLAnnee, marquerDimanchesSpeciaux,
} from "../src/lib/planning/grilles";
import {
  avecDimanchesSpeciaux, collectPlanningNames, deriveServiceRolesFromPlanning, findMyServices, servantsForDate,
  type PlanningData,
} from "../src/lib/planning/names";
import { reminderBody, reminderServicesFor } from "../src/lib/push/reminderMessage";

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

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

test("Paix 2027 : l'écrivain choisit 2027, voit les 13 dimanches du T1 et aucun de 2026", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/planning/groupes");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  const dates = await datesAffichees(page);
  expect(dates[0]).toBe("2027-01-03");
  expect(dates[12]).toBe("2027-03-28");
  expect(dates.every((d) => d?.startsWith("2027"))).toBe(true);
});

test("Paix 2027 : une case s'écrit seule (rien recopié) et tient au rechargement", async ({ page }) => {
  const db = await ouvrir(page, ECRIVAIN, "/planning/groupes");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2027-01-10", "presidence").getByRole("button").click();
  const champ = laCase(page, "2027-01-10", "presidence").getByLabel("Présidence", { exact: true });
  await champ.fill("Invité A.");
  await champ.press("Enter");
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.presidence).toBe("Invité A.");
  const doc = db.doc("plannings/paix/dimanches/2027-01-10")!;
  expect(Object.keys(doc).sort()).toEqual(["date", "modifieLe", "modifiePar", "presidence"]);

  await page.reload();
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
});

// ─── Brouillon et publication (Q4) ──────────────────────────────────────────

const PUBLIEUR: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", notify: ["Groupe Paix"] };
const CASE_2027 = { "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Invité A." } };

test("Paix 2027 : un membre ne voit pas 2027 tant que rien n'est publié", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes", CASE_2027);
  await expect(page.getByTestId("grille-bandeau")).toContainText("Paix");
  await expect(page.getByRole("button", { name: "2027", exact: true })).toHaveCount(0);
  await expect(page.getByText("Invité A.")).toHaveCount(0);
});

test("Paix 2027 : l'écrivain sans droit de publier voit le brouillon, marqué, et le bandeau", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/planning/groupes", CASE_2027);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  const bandeau = page.getByTestId("bandeau-annee");
  await expect(bandeau).toContainText("2027 · brouillon");
  await expect(bandeau).toContainText("les 52 dimanches de 2027 sont déjà posés");
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect(page.locator("[data-non-publie='2027-01-10']").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Publier le T1" }), "publier demande le droit notify").toHaveCount(0);
});

test("Paix 2027 : « Publier le T1 » appelle la route avec l'année, puis propose « Masquer le T1 »", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR, "/planning/groupes", CASE_2027);
  const corps: unknown[] = [];
  // Route simulée : jamais de vraie notification.
  await page.route("**/api/planning/release", async (route) => {
    const body = route.request().postDataJSON() as { tri: string; publish: boolean };
    corps.push(body);
    const published = body.publish ? [body.tri] : [];
    db.set("planningReleases/paix_2027", { published });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, published, notified: body.publish, sent: 0 }) });
  });
  page.on("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "Publier le T1" }).click();
  await expect(page.getByRole("button", { name: "Masquer le T1" })).toBeVisible();
  expect(corps).toEqual([{ key: "paix", tri: "T1", publish: true, year: 2027 }]);
  await expect(page.locator("[data-non-publie='2027-01-10']").filter({ visible: true })).toHaveCount(0);
});

test("Paix 2027 : T1 publié, le membre voit 2027 et son T1 le 15/11/2026, pas le T2", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes", {
    ...CASE_2027,
    "planningReleases/paix_2027": { published: ["T1"] },
  });
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await expect(laCase(page, "2027-01-10", "presidence")).toContainText("Invité A.");
  await expect(page.getByTestId("bandeau-annee")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "T2", exact: true })).toHaveCount(0);
});

// ─── Les autres pages : Culte, Table, EDD ───────────────────────────────────

test("Culte 2027 : l'écrivain du Culte voit le T1 2027 (13 dimanches, sainte cène le 03/01) ; un membre, non", async ({ page, browser }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["culte"] }, "/planning/culte");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  await expect(page.getByTestId("bandeau-annee")).toContainText("2027 · brouillon");
  const premier = page.locator("[data-date-cell='2027-01-03'], [data-date-carte='2027-01-03']").filter({ visible: true });
  await expect(premier).toContainText("Sainte Cène");

  const autre = await browser.newPage();
  await ouvrir(autre, MEMBRE, "/planning/culte");
  await expect(autre.getByTestId("grille-bandeau")).toBeVisible();
  await expect(autre.getByRole("button", { name: "2027", exact: true })).toHaveCount(0);
  await autre.close();
});

test("Table 2027 : l'écrivain voit les 13 dimanches du T1 ; le membre voit 2027 dès une case remplie", async ({ page, browser }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["table"] }, "/planning/table");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);

  const vide = await browser.newPage();
  await ouvrir(vide, MEMBRE, "/planning/table");
  await expect(vide.getByTestId("grille-bandeau")).toBeVisible();
  await expect(vide.getByRole("button", { name: "2027", exact: true })).toHaveCount(0);
  await vide.close();

  const rempli = await browser.newPage();
  await ouvrir(rempli, MEMBRE, "/planning/table", { "plannings/table/dimanches/2027-01-03": { date: "2027-01-03", equipe: "Équipe Z." } });
  await rempli.getByRole("button", { name: "2027", exact: true }).click();
  await rempli.getByRole("button", { name: "T1", exact: true }).click();
  await expect(laCase(rempli, "2027-01-03", "equipe")).toContainText("Équipe Z.");
  await rempli.close();
});

test("EDD 2027 : la classe 中班 montre les 9 dimanches de janvier-février 2027", async ({ page }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["eddZhongban"] }, "/planning/edd");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: /Janv/ }).click();
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
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], fideliteMusic: [], bonte: [],
    edd: {}, campus: [], intergroupe: [], interfranco: [],
  };
  const planning = avecDimanchesSpeciaux({
    ...vide,
    paix: [["2027-01-17", "Membre M.", "", "Orateur O.", ""], ["2027-01-24", "Membre M.", "", "", ""]],
    fidelite: [["2027-03-14", "Membre M.", "", "", ""]],
    fideliteMusic: [["2027-03-14", "Membre M.", "", "", ""]],
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
  const db = await ouvrir(page, ECRIVAIN, "/planning/groupes", DIMANCHES_SPECIAUX);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await expect(laCase(page, "2027-01-17", "presidence")).toHaveText("Interfranco");
  await expect(laCase(page, "2027-03-14", "presidence")).toHaveText("Intergroupe");
  await expect(laCase(page, "2027-01-17", "orateur")).toContainText("Orateur O.");
  await expect(page.getByText("Ancien Z.")).toHaveCount(0);

  await page.getByRole("button", { name: "Modifier" }).click();
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
  await ouvrir(page, ECRIVAIN, "/planning/groupes", DIMANCHES_SPECIAUX);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
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
  });
  await expect(page.getByText("Janvier 2027")).toBeVisible();
  await expect(page.getByText("Groupe Paix", { exact: true }), "le 24/01 seulement").toHaveCount(1);
  await expect(page.getByText(/17 janv/i)).toHaveCount(0);
  await expect(page.getByText(/24 janv/i)).toBeVisible();
});

test("Ce dimanche du 17/01/2027 montre l'Interfranco ; « Prochain service » saute le président fantôme", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning", {
    "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
    "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Membre M." },
    "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Membre M." },
  }, "2027-01-15T10:00:00");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Interfranco", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Président I.")).toBeVisible();
  const prochain = page.getByRole("link", { name: /Groupe Paix \(Présidence\)/ });
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
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], fideliteMusic: [], bonte: [],
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
  await page.getByRole("button", { name: "Bonté", exact: true }).click();
  await expect(laCase(page, "2026-11-22", "percussion")).toContainText("Batteur B.");
  await expect(page.getByText("Ménage X.")).toHaveCount(0);
  await expect(page.getByText("Ménages")).toHaveCount(0);
  await capture(page, "p5-bonte-t4-percussion");
});

test("P5 · Paix 2027 : Percussion masquée en lecture tant qu'elle est vide, remplissable en modification", async ({ page }) => {
  const db = await ouvrir(page, ECRIVAIN, "/planning/groupes");
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await page.getByRole("button", { name: "T1", exact: true }).click();
  await expect.poll(() => datesAffichees(page)).toHaveLength(13);
  await expect(page.getByText("Percussion", { exact: true }).filter({ visible: true }), "colonne optionnelle, vide au T1").toHaveCount(0);

  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2027-01-10", "percussion").getByRole("button").click();
  const champ = laCase(page, "2027-01-10", "percussion").getByLabel("Percussion", { exact: true });
  await champ.fill("Batteur B.");
  await champ.press("Enter");
  await expect(laCase(page, "2027-01-10", "percussion")).toContainText("Batteur B.");
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-10")?.percussion).toBe("Batteur B.");
  expect(Object.keys(db.doc("plannings/paix/dimanches/2027-01-10")!).sort()).toEqual(["date", "modifieLe", "modifiePar", "percussion"]);
  await capture(page, "p5-paix-2027-percussion");
});

test("P5 · EDD 2026 : la colonne Cours du Sheet s'affiche", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/edd");
  await expect(page.getByTestId("grille-bandeau")).toContainText("中班");
  await expect(laCase(page, "2026-11-22", "presidence")).toContainText("Ancien K.");
  await expect(laCase(page, "2026-11-22", "cours")).toContainText("Membre P.");
  await capture(page, "p5-edd-cours");
});

test("P5 · « Mes services » liste la Percussion et le Cours", async ({ page }) => {
  await ouvrir(page, { uid: "uid-perc", email: "perc@example.com", planningName: "Membre P." }, "/mes-services");
  await expect(page.getByText("Groupe Paix", { exact: true })).toBeVisible();
  await expect(page.getByText("Percussion", { exact: true })).toBeVisible();
  await expect(page.getByText("EDD 中班", { exact: true })).toBeVisible();
  await expect(page.getByText("Cours", { exact: true })).toBeVisible();
  await capture(page, "p5-mes-services");
});

test("P5 · « Ce dimanche » montre la Percussion des groupes et le Cours de l'EDD", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning", {}, "2026-11-20T10:00:00");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Batteur B.")).toBeVisible();
  await expect(dimanche.getByText("Percussion", { exact: true })).toHaveCount(2);
  await expect(dimanche.getByText("Cours", { exact: true })).toHaveCount(1);
  await expect(dimanche.getByText("Membre P.")).toHaveCount(2);
});
