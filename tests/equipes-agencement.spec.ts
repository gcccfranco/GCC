import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, ongletsRail, verifierAgencement } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-D :
// l'organigramme sans pôles (EQ27). Cinq projets (SPECS_GRAND_ECRAN). Base et Sheets simulés,
// noms fictifs. Captures : PW_CAPTURES=<dossier>, à regarder aux cinq tailles, FR et 中文.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const LEA: FakeProfile = { uid: "u-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
const JOEL: FakeProfile = { uid: "u-joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", dansEquipes: ["medias"] };

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

/** Des équipes dont le document porte encore l'ancien champ `pole` (base d'avant la migration). */
const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": {
    pole: "da",
    membres: [M("Hugo L.", { uid: "u-hugo", mention: "Référent", referent: true }), M("Nina B.")],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "equipes/evenementiel": {
    pole: "evenement",
    membres: [M("Iris D.", { uid: "u-iris", referent: true })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "equipes/medias": {
    pole: "media",
    membres: [M("Léa M.", { uid: "u-lea", referent: true }), M("Joël F.", { uid: "u-joel" })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "users/u-hugo": {
    email: "hugo@example.com", firstName: "Hugo", lastName: "L.", planningName: "Hugo L.",
    serviceRoles: {}, annonces: [], notify: [], equipes: false, plannings: [], dansEquipes: ["da"], referentDe: ["da"],
  },
};

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

const estOrdinateur = estGrandEcran;
const menu = (page: Page, info: TestInfo) => estOrdinateur(info)
  ? page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" })
  : page.getByTestId("barre-du-bas");

for (const [langue, sousTitre] of [
  ["fr", "Organigramme GCC Franco"],
  ["zh-CN", "GCC 法语堂"],
] as const) {
  test(`Organigramme « Église » en ${langue} : plus de pastille de pôle, des cartes sans débordement`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
    await ouvrir(page, ADMIN, "/back-office/equipes");
    await expect(page.getByTestId("equipe-da")).toBeVisible();
    await expect(enTete(page)).toContainText(sousTitre);
    await expect(enTete(page)).not.toContainText(/pôles|部门/);
    await expect(page.getByText(/Donne le pôle|归入.*部门/)).toHaveCount(0);
    const bandeau = page.getByTestId("bandeau-equipes");
    await verifierAgencement(page, { premierBloc: bandeau, contenu: bandeau, onglets: { rail: 1, pilules: 2 } });
    // Rien ne déborde d'une carte (le bandeau défile en lui-même, pas la page : verifierAgencement).
    for (const carte of await page.getByTestId(/^equipe-/).all()) {
      expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le contenu de la carte tient dedans").toBeLessThanOrEqual(1);
    }
    await capture(page, `organigramme-${langue}`);
  });
}

test("panneau d'édition : ni sélecteur de pôle ni liste de pôles", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await page.getByTestId("equipe-da").getByRole("button", { name: "Modifier TEAM DA" }).click();
  const panneau = page.getByRole("dialog", { name: "TEAM DA" });
  await expect(panneau.getByPlaceholder("Ajouter un membre")).toBeVisible();
  await expect(panneau.getByText("Pôle donné par cette équipe")).toHaveCount(0);
  await expect(panneau.getByRole("combobox")).toHaveCount(0);
  await expect(panneau.getByRole("option")).toHaveCount(0);
  await capture(page, "panneau-edition");
});

test("fiche de Personnes : « Ce que ça lui ouvre » à la place des droits cochés, plus de carte Pôles", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo");
  // Nouveau mode (lot AO-B) : plus de ligne « Coordination » ni de case ; les droits viennent de l'organigramme.
  const fiche = page.locator('[data-volet="detail"], article').first();
  await expect(fiche.getByTestId("ce-que-ca-ouvre")).toBeVisible();
  await expect(fiche).not.toContainText(/Coordination\s*(Oui|Non)/);
  await expect(fiche.getByRole("heading", { name: "Pôles" })).toHaveCount(0);
  await expect(page.getByText("Coché hors organigramme")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pôles" })).toHaveCount(0);
  await capture(page, "fiche-personne");
});

// Piste A (docs/spec-back-office-piste-a.md, BO1, BO4) : un simple membre n'a plus de Back-Office ;
// une référente a les entrées de la piste A que ses droits ouvrent.
test("Back-Office d'un simple membre (BO4) : « Réservé aux responsables », aucun lien vers le Back-Office", async ({ page }) => {
  await ouvrir(page, JOEL, "/back-office");
  await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
  await expect(page.locator('a[href^="/back-office"]').filter({ visible: true })).toHaveCount(0);
  await capture(page, "membre-back-office");
});

test("Back-Office d'une référente sans Planning : À faire, Calendrier, Équipes ; Messages en grand, App au doigt", async ({ page }, info) => {
  await ouvrir(page, LEA, "/back-office");
  const liens = menu(page, info).getByRole("link");
  if (estOrdinateur(info)) await expect(liens).toHaveText([/^À faire/, /^Calendrier/, /^Équipes/, /^Messages/]);
  else await expect(liens).toHaveText([/^À faire/, /^Calendrier/, /^Équipes/, /^App/]);
  await capture(page, "referente-back-office");
});

test("Tâches : le rail ne montre que les équipes qui ont une tâche", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/taches", {
    ...DOCS,
    "equipes/medias/taches/t1": { equipe: "medias", titre: "Photos du culte", responsableUid: "u-joel", responsableNom: "Joël F.", echeance: "2026-10-15", repetition: null },
  });
  await expect(ongletsRail(page).getByRole("link")).toHaveText([/^Médias/]);
  await capture(page, "taches-rail");
});
