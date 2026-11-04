import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estTelephone } from "./helpers/agencement";

// Lot CD, T1h (docs/spec-corrections-design/bo-reunions-taches.md, -1) : aucune page du Back-Office ne déborde de
// l'écran ni ne colle ses cartes au bord droit. La cause (le sélecteur d'espace trop large au téléphone) est réparée
// par back-office-1 ; ce test vérifie qu'il ne reste rien. Au téléphone, trois largeurs ; ailleurs, la fenêtre du projet.
// Firestore et date simulés, personnes fictives.

const MIREILLE: FakeProfile = { uid: "uid-mireille", email: ADMIN_EMAIL, firstName: "Mireille", lastName: "V.", dansEquipes: ["da"], referentDe: ["da"] };

const DOCS = {
  "evenements/reunion-da": {
    titre: "Réunion DA", type: "loisir", pour: "equipe:da", reunion: true, date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
    lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees", inscriptionDebut: "", inscriptionFin: "",
    sansCompte: false, lienExterne: "", contact: "", organisateurUid: "uid-mireille", organisateurNom: "Mireille V.", epingle: false,
    expiresAt: null, inscrits: 0, createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
  },
  "equipes/da/taches/t1": {
    equipe: "da", titre: "Affiche de la fête", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null, lien: "",
    note: "Format A3", prevenir: null, evenement: null, auteurUid: "uid-mireille", createdAt: "2026-09-21T10:00:00Z", updatedAt: "2026-09-21T10:00:00Z",
  },
};

const PAGES: [string, string][] = [
  ["À faire", "/back-office"],
  ["Calendrier", "/back-office/calendrier"],
  ["fiche réunion", "/back-office/reunions/reunion-da"],
  ["fiche tâche", "/back-office/taches/da/t1"],
  ["Nouvelle tâche", "/back-office/taches/da/nouvelle"],
];

async function mesurer(page: Page, vers: string, largeur?: number) {
  // À 360 px en français, la barre du haut du Back-Office (« Back-Office » + l'icône Messages) laisse la cloche à 7 px du bord :
  // c'est la barre de back-office-1 (T1a), pas une page ; la marge de la cloche ne se mesure donc qu'à 375 px et plus.
  const cloche16 = !largeur || largeur >= 375
  if (largeur) await page.setViewportSize({ width: largeur, height: 800 });
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MIREILLE, DOCS, vers);
  await expect(page.locator("main, [data-entete-page]").first()).toBeVisible();
  await page.waitForTimeout(600);
  const largeurFenetre = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "pas de défilement horizontal").toBe(true);
  // La cloche (barre du haut : téléphone et tablette portrait) reste entière, à 16 px du bord ou plus.
  const cloche = page.locator("header.barre-haut").getByRole("button", { name: "Notifications" });
  if (cloche16 && await cloche.isVisible()) {
    const b = (await cloche.boundingBox())!;
    expect(largeurFenetre - (b.x + b.width), "cloche à 16 px du bord").toBeGreaterThanOrEqual(15.5);
  }
}

for (const [nom, adresse] of PAGES) {
  test(`${nom} : aucun débordement horizontal`, async ({ page }) => {
    await mesurer(page, adresse);
  });
  for (const largeur of [393, 375, 360]) {
    test(`téléphone ${largeur} px, ${nom} : aucun débordement${largeur >= 375 ? ", cloche à 16 px du bord" : ""}`, async ({ page }, info) => {
      test.skip(!estTelephone(info), "propre au téléphone");
      await mesurer(page, adresse, largeur);
    });
  }
}

for (const largeur of [393, 375, 360]) {
  test(`téléphone ${largeur} px : les trois cartes de la fiche réunion ont 16 px de marge de chaque côté`, async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone");
    await mesurer(page, "/back-office/reunions/reunion-da", largeur);
    for (const carte of ["sujets-carte", "compte-rendu-carte", "taches-carte"]) {
      const zone = page.getByTestId(carte);
      await expect(zone).toBeVisible();
      const b = (await zone.boundingBox())!;
      expect(b.x, `${carte} : marge gauche`).toBeGreaterThanOrEqual(15.5);
      expect(largeur - (b.x + b.width), `${carte} : marge droite`).toBeGreaterThanOrEqual(15.5);
    }
  });
}
