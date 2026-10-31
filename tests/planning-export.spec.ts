import { expect, test } from "@playwright/test";
import { GRILLE_CULTE } from "../src/lib/planning/grilles";
import { colonnesExportees, depuisCSV } from "../src/lib/planning/csv";
import { parseCSV, parseDate } from "../src/lib/planning/sheets";

// Lot 17, tranche G4 (docs/spec-planning-grille.md, décision D5). L'export CSV
// et le PDF du lot 17 sont partis avec la question 6 du lot U2 (« Exporter
// (modèle du Sheet) », tests/planning-export-modele.spec.ts) ; reste la
// lecture d'un CSV au format de l'onglet.

// Les dates JJ/MM du Sheet se lisent dans son année (ANNEE_DU_SHEET, lot U2 P1).
const AN = 2026;

const LIGNES: string[][] = [
  [`${AN}-10-04`, "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "Guitariste É.", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", ""],
  [`${AN}-10-11`, "Président J.", "Choriste K.", "Choriste L.", "Pianiste M.", "Guitariste N.", "Batteur O.", "Sono P.", "Projection Q.", "Traducteur R., Traductrice S.", "", ""],
];

test("CSV (D5) : la colonne Sainte cène ne compte que si une case la porte", () => {
  expect(colonnesExportees(GRILLE_CULTE, LIGNES).map((c) => c.cle)).not.toContain("sainteCene");
  const avec = [[...LIGNES[0].slice(0, 11), "Ancien T."], LIGNES[1]];
  expect(colonnesExportees(GRILLE_CULTE, avec).map((c) => c.cle)).toContain("sainteCene");
});

test("CSV (D5) : un onglet relu redonne exactement les lignes de la grille", () => {
  const csv = [
    "Date,Présidence,Choriste 1,Choriste 2,Piano,Guitare,Batterie,Sono,PPT,Orateur,Traduction",
    "04/10,Président A.,Choriste B.,Choriste C.,Pianiste D.,Guitariste É.,Batteur F.,Sono G.,Projection H.,Orateur I.,",
    '11/10,Président J.,Choriste K.,Choriste L.,Pianiste M.,Guitariste N.,Batteur O.,Sono P.,Projection Q.,"Traducteur R., Traductrice S.",',
  ].join("\n");
  expect(depuisCSV(parseCSV(csv), GRILLE_CULTE, parseDate)).toEqual(LIGNES);
});

// ─── Depuis la grille ───────────────────────────────────────────────────────
// Lot U2, P7 (question 6 : oui) : « Exporter en CSV » et « Exporter en PDF »
// ont laissé la place à « Exporter (modèle du Sheet) », testé dans
// tests/planning-export-modele.spec.ts.
