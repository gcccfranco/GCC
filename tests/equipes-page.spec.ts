import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, verifierSansDebordement } from "./helpers/agencement";

// Piste A du back-office (docs/spec-back-office-piste-a.md), tranche BO-D (BO4, BO7) : la page d'une équipe,
// `/equipes/<id>` dans l'app pour un simple membre, `/back-office/equipes/<id>` pour un responsable ;
// « Sans compte » dans Équipes › Personnes ; Moi › Mes équipes et l'organigramme qui y mènent. Base et
// Sheets simulés, noms fictifs. Horloge au vendredi 9 octobre 2026.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Simple membre de TEAM DA. */
const MIRA: FakeProfile = { uid: "u-mira", email: "mira@example.com", firstName: "Mira", lastName: "Quenot", dansEquipes: ["da"] };
/** Référent de TEAM DA. */
const OTTO: FakeProfile = { uid: "u-otto", email: "otto@example.com", firstName: "Otto", lastName: "Verdane", dansEquipes: ["da"], referentDe: ["da"] };
/** Membre d'une autre équipe : pas de TEAM DA. */
const PIA: FakeProfile = { uid: "u-pia", email: "pia@example.com", firstName: "Pia", lastName: "Sarrazin", dansEquipes: ["medias"] };

const tache = (over: Record<string, unknown> = {}) => ({
  equipe: "da", titre: "Affiche de Noël", responsableUid: "u-mira", responsableNom: "Mira Quenot",
  echeance: "2026-10-11", repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-otto",
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const reunion = (over: Record<string, unknown> = {}) => ({
  type: "loisir", date: "2026-10-16", heure: "19:30", heureFin: "", dateFin: "", lieu: "Salle 2", description: "", liens: [], images: [],
  placesMax: null, inscriptions: "fermees", inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  titre: "Point DA d'octobre", pour: "equipe:da", reunion: true, organisateurUid: "u-otto", organisateurNom: "Otto Verdane",
  epingle: false, expiresAt: null, inscrits: 0, createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z", ...over,
});
const M = (nom: string, referent = false) => ({ nom, uid: "", mention: "", referent, essai: false, groupe: "" });

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": { pole: "da", membres: [M("Zacharie Exemple"), M("Mira Quenot"), M("Otto Verdane", true)], updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
  "equipes/da/taches/affiche": tache(),
  "equipes/da/taches/retard": tache({ titre: "Rendre le visuel de rentrée", echeance: "2026-10-05" }),
  "evenements/prochaine": reunion(),
  "evenements/passee": reunion({
    titre: "Point DA de septembre", date: "2026-09-18",
    compteRendu: { url: "https://docs.google.com/document/d/sept", parUid: "u-otto", parNom: "Otto Verdane", le: "2026-09-19T10:00:00Z" },
  }),
};

async function ouvrir(page: Page, p: FakeProfile, vers: string, options: { zh?: boolean; sombre?: boolean } = {}) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  if (options.zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  if (options.sombre) await page.emulateMedia({ colorScheme: "dark" });
  return signInAs(page, p, DOCS, vers);
}
const section = (page: Page, nom: string) => page.getByRole("region", { name: nom });

test.describe("la page d'une équipe dans l'app (BO4)", () => {
  test("un simple membre de DA : trois sections, ses tâches, la prochaine réunion, la passée, les membres, sans action de responsable", async ({ page }) => {
    await ouvrir(page, MIRA, "/equipes/da");
    await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Tâches", "Réunions", "Membres"]);
    await expect(page.getByText("3 membres · référent : Otto Verdane")).toBeVisible();
    const taches = section(page, "Tâches");
    await expect(taches.getByText("Rendre le visuel de rentrée")).toBeVisible();
    await expect(taches.getByText("Affiche de Noël")).toBeVisible();
    await expect(taches.getByRole("heading", { name: "En retard" })).toBeVisible();
    const reunions = section(page, "Réunions");
    await expect(reunions.getByRole("link", { name: /Point DA d'octobre/ })).toContainText("Prochaine");
    await expect(reunions.getByRole("link", { name: /Point DA de septembre/ })).toContainText("Compte rendu écrit");
    const puces = section(page, "Membres").getByRole("listitem");
    await expect(puces).toHaveText(["Otto Verdane, référent", "Zacharie Exemple", "Mira Quenot"]);
    await expect(page.getByRole("link", { name: /Nouvelle tâche/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Nouvelle réunion/ })).toHaveCount(0);
  });

  test("toucher une tâche ouvre sa fiche dans l'app ; toucher une réunion ouvre sa fiche", async ({ page }) => {
    await ouvrir(page, MIRA, "/equipes/da");
    await section(page, "Tâches").getByText("Affiche de Noël").click();
    await expect(page).toHaveURL(/\/taches\/da\/affiche\/?$/, { timeout: 15_000 });
    await page.goto("/equipes/da");
    await section(page, "Réunions").getByRole("link", { name: /Point DA d'octobre/ }).click();
    await expect(page).toHaveURL(/\/evenements\/prochaine\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Point DA d'octobre" }).first()).toBeVisible();
  });

  test("le même membre sur /back-office/equipes/da est mené à /equipes/da", async ({ page }) => {
    await ouvrir(page, MIRA, "/back-office/equipes/da");
    await expect(page).toHaveURL(/\/equipes\/da\/?$/);
    await expect(page).not.toHaveURL(/back-office/);
    await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
    await page.goto("/back-office/taches/da");
    await expect(page).toHaveURL(/\/equipes\/da\/?$/);
  });

  test("un connecté qui n'est pas de l'équipe lit « Réservé aux membres de l'équipe »", async ({ page }) => {
    await ouvrir(page, PIA, "/equipes/da");
    await expect(page.getByText("Réservé aux membres de l'équipe")).toBeVisible();
    await expect(page.getByText("Affiche de Noël")).toHaveCount(0);
    await expect(page.getByText("Point DA d'octobre")).toHaveCount(0);
  });

  test("une équipe qui n'existe pas : la page « Page introuvable » du site", async ({ page }) => {
    await ouvrir(page, ADMIN, "/equipes/personnes");
    await expect(page.getByText("Page introuvable").first()).toBeVisible();
  });

  test("Moi › Mes équipes : la ligne de DA mène à /equipes/da", async ({ page }) => {
    await ouvrir(page, MIRA, "/moi");
    const ligne = page.getByTestId("equipe-ligne").first();
    await expect(ligne).toBeVisible();
    await expect(ligne).toHaveAttribute("href", /\/equipes\/da\/?$/);
    expect((await ligne.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await ligne.click();
    await expect(page).toHaveURL(/\/equipes\/da\/?$/);
  });
});

test.describe("la page d'une équipe au Back-Office (BO7)", () => {
  test("un référent de DA : « Nouvelle tâche » et « Nouvelle réunion » sont là, vers les bons formulaires", async ({ page }) => {
    await ouvrir(page, OTTO, "/back-office/equipes/da");
    await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouvelle tâche" })).toHaveAttribute("href", /\/back-office\/taches\/da\/nouvelle\/?$/);
    await expect(page.getByRole("link", { name: "Nouvelle réunion" })).toHaveAttribute("href", /\/back-office\/reunions\/nouvelle\/?$/);
    await expect(section(page, "Réunions").getByRole("link", { name: /Point DA d'octobre/ })).toHaveAttribute("href", /\/back-office\/reunions\/prochaine\/?$/);
    await section(page, "Tâches").getByText("Affiche de Noël").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/affiche\/?$/);
    // Le retour de la fiche (« ‹ DA » en grand, « ‹ Tâches » en un volet) ramène à la page de l'équipe.
    await page.locator("header[data-entete-page]").getByRole("link", { name: estGrandEcran(test.info()) ? "DA" : "Tâches", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
  });

  test("/back-office/taches/da redirige vers la page de l'équipe ; /back-office/taches vers Équipes", async ({ page }) => {
    await ouvrir(page, OTTO, "/back-office/taches/da");
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
    await page.goto("/back-office/taches");
    await expect(page).toHaveURL(/\/back-office\/equipes\/?$/);
  });

  test("/back-office/planning/sans-compte redirige vers la sous-page de Personnes « Noms du planning sans compte » (admin)", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/sans-compte");
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(page.getByRole("heading", { level: 2, name: "Noms du planning sans compte" })).toBeVisible();
  });

  test("Personnes : le lien « Noms du planning sans compte » de l'en-tête mène à la sous-page (admin)", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/personnes");
    await page.locator("header[data-entete-page]").getByRole("link", { name: "Noms du planning sans compte" }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(page.getByRole("heading", { level: 2, name: "Noms du planning sans compte" })).toBeVisible();
  });

  test("/back-office/equipes/nimporte et /equipes/nimporte répondent 404", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    for (const chemin of ["/back-office/equipes/nimporte", "/equipes/nimporte"]) {
      const reponse = await page.goto(chemin);
      expect(reponse?.status(), chemin).toBe(404);
    }
  });

  test("organigramme : le nom de la carte DA mène à la page de l'équipe", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    const lien = page.getByTestId("equipe-da").getByRole("link", { name: "TEAM DA" });
    await expect(lien).toHaveAttribute("href", /\/back-office\/equipes\/da\/?$/);
    await lien.click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
  });
});

test.describe("agencement et captures", () => {
  for (const zh of [false, true]) {
    for (const sombre of [false, true]) {
      const nom = `${zh ? "zh" : "fr"}-${sombre ? "sombre" : "clair"}`;
      test(`sans défilement horizontal, captures ${nom}`, async ({ page }, info) => {
        const dossier = "test-results/bo-d";
        mkdirSync(dossier, { recursive: true });
        await ouvrir(page, ADMIN, "/back-office/equipes/da", { zh, sombre });
        for (const [cle, adresse, attendu] of [
          ["equipe-bo", "/back-office/equipes/da", zh ? "任务" : "Tâches"],
          ["equipe-app", "/equipes/da", zh ? "任务" : "Tâches"],
          ["sans-compte", "/back-office/equipes/personnes/sans-compte", zh ? "排班表中尚无账号的名字" : "Noms du planning sans compte"],
        ] as const) {
          await page.goto(adresse);
          await expect(page.getByRole("heading", { name: attendu }).first()).toBeVisible();
          await page.waitForTimeout(400);
          await verifierSansDebordement(page);
          await page.screenshot({ path: `${dossier}/${info.project.name}-${cle}-${nom}.png`, fullPage: true });
        }
      });
    }
  }
});
