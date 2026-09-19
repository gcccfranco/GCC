import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { GRILLE_CULTE } from "../src/lib/planning/grilles";
import { BOM, colonnesExportees, dateJJMM, depuisCSV, nomFichier, versCSV } from "../src/lib/planning/csv";
import { parseCSV, parseDate } from "../src/lib/planning/sheets";

// Lot 17, tranche G4 (docs/spec-planning-grille.md, décision D5) : la grille
// s'exporte en CSV, recollable dans le Google Sheet, et en PDF (demande de
// Timothée du 19/09/2026 : « pouvoir les exporter en CSV ou en PDF »).

const AN = new Date().getFullYear();
const LIBELLES: Record<string, string> = {
  "planning.roles.presidence": "Présidence", "planning.roles.choriste1": "Choriste 1", "planning.roles.choriste2": "Choriste 2",
  "planning.roles.piano": "Piano", "planning.roles.guitare": "Guitare", "planning.roles.batterie": "Batterie",
  "planning.roles.sono": "Sono", "planning.roles.ppt": "PPT", "planning.roles.orateur": "Orateur",
  "planning.roles.trad": "Traduction", "planning.roles.sainteCene": "Sainte cène",
};
const libelle = (k: string) => LIBELLES[k] ?? k;

const LIGNES: string[][] = [
  [`${AN}-10-04`, "Paul W.", "Christelle Z.", "Alice Q.", "Eva C.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Hewei", "", ""],
  [`${AN}-10-11`, "Jonathan Z.", "Daniela W.", "Inès L.", "Jo M.", "Christelle C.", "Stéphane Z.", "Lorenzo S.", "Karémy X.", "Belka, Ruth", "", ""],
];

test("CSV (D5) : en-tête, dates JJ/MM, BOM, guillemets seulement autour d'une case à virgule", () => {
  const csv = versCSV(LIGNES, GRILLE_CULTE, libelle, "Date");
  expect(csv.startsWith(BOM)).toBe(true);
  const lignes = csv.slice(1).trimEnd().split("\n");
  expect(lignes[0]).toBe("Date,Présidence,Choriste 1,Choriste 2,Piano,Guitare,Batterie,Sono,PPT,Orateur,Traduction");
  expect(lignes[1]).toBe("04/10,Paul W.,Christelle Z.,Alice Q.,Eva C.,Éloïse M.,Yiyi C.,Anyi Y.,Denis F.,Hewei,");
  expect(lignes[2]).toContain('"Belka, Ruth"');
  expect(lignes[2].endsWith(",")).toBe(true);
  expect(dateJJMM("2026-01-05")).toBe("05/01");
});

test("CSV (D5) : la colonne Sainte cène n'apparaît que si une case la porte", () => {
  expect(colonnesExportees(GRILLE_CULTE, LIGNES).map((c) => c.cle)).not.toContain("sainteCene");
  const avec = [[...LIGNES[0].slice(0, 11), "Ruth K."], LIGNES[1]];
  expect(colonnesExportees(GRILLE_CULTE, avec).map((c) => c.cle)).toContain("sainteCene");
  expect(versCSV(avec, GRILLE_CULTE, libelle, "Date").split("\n")[0]).toContain(",Sainte cène");
});

test("CSV (D5) : l'aller-retour redonne exactement les lignes", () => {
  const csv = versCSV(LIGNES, GRILLE_CULTE, libelle, "Date");
  expect(depuisCSV(parseCSV(csv.slice(1)), GRILLE_CULTE, parseDate)).toEqual(LIGNES);
});

test("nom du fichier : le planning et la plage de dates", () => {
  expect(nomFichier("Culte Franco", LIGNES, "csv")).toBe(`Culte_Franco_${AN}-10-04_${AN}-10-11.csv`);
  expect(nomFichier("Groupe Paix", [], "pdf")).toBe("Groupe_Paix.pdf");
});

// ─── Depuis la grille ───────────────────────────────────────────────────────

const csvSheet = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csvSheet([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "", ""],
  ["27/09", "Jonathan Z.", "Daniela W.", "Alice Q.", "Eva C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", "", ""],
]);
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };

async function open(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  return signInAs(page, who, {}, to);
}

test("grille : « Exporter en CSV » télécharge le trimestre affiché, recollable dans le Sheet", async ({ page }) => {
  await open(page, MEMBRE, "/planning/culte");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Culte_Franco_2026-09-20_2026-09-27.csv");
  const texte = readFileSync(await download.path(), "utf8");
  expect(texte.startsWith(BOM)).toBe(true);
  expect(texte).toContain("Date,Présidence,");
  expect(texte).toContain("27/09,Jonathan Z.,Daniela W.,Alice Q.,Eva C.,Christelle C.");
});

test("grille : « Exporter en PDF » télécharge un PDF nommé comme le planning", async ({ page }) => {
  await open(page, MEMBRE, "/planning/culte");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Exporter en PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Culte_Franco_2026-09-20_2026-09-27.pdf");
  const octets = readFileSync(await download.path());
  expect(octets.subarray(0, 4).toString()).toBe("%PDF");
  expect(octets.length).toBeGreaterThan(1000);
});
