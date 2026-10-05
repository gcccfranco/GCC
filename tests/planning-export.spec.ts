import { expect, test } from "@playwright/test";
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
// Lot U2, P7 (question 6 : oui) : « Exporter en CSV » et « Exporter en PDF »
// ont laissé la place à « Exporter (modèle du Sheet) », testé dans
// tests/planning-export-modele.spec.ts. Le module csv.ts reste (fonctions pures ci-dessus).
