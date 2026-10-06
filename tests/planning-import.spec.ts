import { expect, test } from "@playwright/test";
import { fusionnerChangements, phraseDuChangement } from "../src/lib/planning/historique";

// Lot 17, tranche G4 (docs/spec-planning-grille.md, décision T8) : l'import
// initial du Google Sheet vers la grille de l'app. Retiré le 06/10/2026 (« on va
// tout faire manuellement ») avec sa route, son bouton et leurs tests ; les
// entrées « import » déjà écrites dans l'historique des plannings restent lisibles.

test("historique : une entrée « import » a sa phrase, et ne se mélange pas aux cases", () => {
  const entree = { kind: "import" as const, count: 52 };
  expect(phraseDuChangement(entree)).toBe("importe");
  const changes = fusionnerChangements([entree], { kind: "case", date: "2026-10-04", colonne: "piano", from: "", to: "Eva C." });
  expect(changes).toHaveLength(2);
});
