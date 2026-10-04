import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  GRILLE_INTERFRANCO, GRILLE_PAIX, PREMIERE_ANNEE_APP, dimanchesDe, lignesDeLAnnee,
} from "../src/lib/planning/grilles";

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
  const ecrit = ["2027-01-10", "Invité A.", "", "", ""];
  const lignes = lignesDeLAnnee(GRILLE_PAIX, 2027, [["2026-12-27", "Ancien B.", "", "", ""], ecrit]);
  expect(lignes).toHaveLength(52);
  expect(lignes[0]).toEqual(["2027-01-03", "", "", "", ""]);
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
  Paix_T4: csv([
    ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME"],
    ["15/11", "Ancien G.", "", "", ""],
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
