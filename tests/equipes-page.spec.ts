import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, margeAttendue, verifierSansDebordement, zoneDeContenu } from "./helpers/agencement";

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
    // back-office-11 : le rôle de l'équipe sur sa ligne, puis le nombre de membres (deux lignes, dans cet ordre).
    await expect(page.locator("header[data-entete-page] h1 + p > span")).toHaveText(["Direction artistique", "3 membres · référent : Otto Verdane"]);
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

  test("/equipes/da : « Moi » est allumé dans la barre, la marque dit « Équipes » (fr) / « 团队 » (zh), et « ‹ Moi » mène à /moi", async ({ page }, info) => {
    await ouvrir(page, MIRA, "/equipes");
    const nav = page.getByRole("navigation", { name: /Navigation principale|主导航/ });
    const moi = nav.getByRole("link", { name: /^(Moi|我)$/ }).filter({ visible: true }).first();
    const marque = estGrandEcran(info) ? page.getByTestId("label-section") : page.locator("header.barre-haut .brand-nom");
    await expect(moi, "allumé sur l'index").toHaveAttribute("aria-current", "page");
    await expect(marque).toContainText("Équipes");
    // Le retour de l'index : « ‹ Moi » au-dessus du titre, sur l'App seulement.
    const retour = page.locator("header[data-entete-page]").getByRole("link", { name: "Moi" });
    await expect(retour).toHaveAttribute("href", /\/moi\/?$/);
    await retour.click();
    await expect(page).toHaveURL(/\/moi\/?$/);
    await page.goto("/equipes/da/");
    await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
    await expect(moi, "allumé sur la page d'une équipe").toHaveAttribute("aria-current", "page");
    await expect(marque).toContainText("Équipes");
  });

  test("« ‹ Moi » : zone de toucher de 44 px sans changer le dessin, un toucher à 20 px au-dessus du centre mène à /moi (back-office-9)", async ({ page }) => {
    await ouvrir(page, MIRA, "/equipes/da");
    await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
    test.skip(!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const retour = page.locator("header[data-entete-page]").getByRole("link", { name: "Moi" });
    expect(parseFloat(await retour.evaluate((el) => getComputedStyle(el, "::after").height)), "hauteur du ::after").toBeGreaterThanOrEqual(44);
    const b = (await retour.boundingBox())!;
    expect(b.height, "le dessin ne grandit pas").toBeLessThan(44);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 - 20);
    await expect(page).toHaveURL(/\/moi\/?$/);
  });

  test("/equipes en 中文 : la marque dit « 团队 » et « ‹ 我 » est au-dessus du titre", async ({ page }, info) => {
    await ouvrir(page, MIRA, "/equipes", { zh: true });
    const marque = estGrandEcran(info) ? page.getByTestId("label-section") : page.locator("header.barre-haut .brand-nom");
    await expect(marque).toContainText("团队");
    await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "我" })).toHaveAttribute("href", /\/moi\/?$/);
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
    // BO16 (d) (docs/spec-back-office-piste-a.md) : le formulaire s'ouvre avec cette équipe choisie.
    await expect(page.getByRole("link", { name: "Nouvelle réunion" })).toHaveAttribute("href", /\/back-office\/reunions\/nouvelle\/?\?equipe=da$/);
    await expect(section(page, "Réunions").getByRole("link", { name: /Point DA d'octobre/ })).toHaveAttribute("href", /\/back-office\/reunions\/prochaine\/?$/);
    await section(page, "Tâches").getByText("Affiche de Noël").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/affiche\/?$/);
    // Le retour de la fiche (« ‹ Tâches de DA », en grand comme en un volet) ramène à la page de l'équipe.
    await page.locator("header[data-entete-page]").getByRole("link", { name: "Tâches de DA", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
  });

  test("titre court, rôle puis effectif : en 中文 le rôle « 美术设计 » est sur sa propre ligne ; une équipe sans rôle n'a que l'effectif (back-office-11)", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/da", { zh: true });
    const lignes = page.locator("header[data-entete-page] h1 + p > span");
    await expect(lignes).toHaveCount(2);
    await expect(lignes.first()).toHaveText("美术设计");
    await page.goto("/back-office/equipes/traduction", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header[data-entete-page] h1")).toBeVisible();
    await expect(page.locator("header[data-entete-page] h1 + p > span")).toHaveCount(0);
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
    await expect(page.getByRole("heading", { level: 2, name: /^Noms du planning sans compte \(\d+\)$/ })).toBeVisible();
  });

  test("Personnes : la rangée « Noms du planning sans compte » de la liste mène à la sous-page (admin), plus de bouton dans l'en-tête", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/personnes");
    await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "Noms du planning sans compte" })).toHaveCount(0);
    const rangee = page.getByTestId("rangee-sans-compte");
    await expect(rangee).toBeVisible();
    expect(Math.round((await rangee.boundingBox())!.height), "rangée de 52 px").toBe(52);
    await rangee.click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(page.getByRole("heading", { level: 2, name: /^Noms du planning sans compte \(\d+\)$/ })).toBeVisible();
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
    const lien = page.getByTestId("equipe-da").getByRole("link", { name: "DA", exact: true });
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

// BO-G, 2 : la page d'une équipe prend la largeur utile de la zone (la règle d'« À faire »), plus de plafond à 720 px.
test.describe("BO-G : largeur de la page d'une équipe, « sans compte »", () => {
  for (const [nom, adresse] of [["Back-Office", "/back-office/equipes/da"], ["app", "/equipes/da"]] as const) {
    test(`${nom} : les cartes prennent la largeur utile de la zone ; deux colonnes dès que la barre latérale est montrée (back-office-10)`, async ({ page }, info) => {
      await ouvrir(page, ADMIN, adresse);
      await expect(page.getByRole("heading", { name: "Tâches", level: 2 })).toBeVisible();
      const zone = await zoneDeContenu(page);
      const marge = await margeAttendue(page);
      const utile = Math.min(1440, zone.droite - zone.gauche) - 2 * marge;
      const deux = estGrandEcran(info);
      const attendu: Record<string, number> = deux
        ? { Tâches: utile - 332, Réunions: 300, Membres: 300 }
        : { Tâches: utile, Réunions: utile, Membres: utile };
      for (const titre of ["Tâches", "Réunions", "Membres"]) {
        const carte = section(page, titre).locator("div").first();
        const largeur = (await carte.boundingBox())!.width;
        expect(Math.round(largeur), `${titre} : ${attendu[titre]} px`).toBeGreaterThanOrEqual(Math.round(attendu[titre]) - 2);
        expect(Math.round(largeur), `${titre} : ${attendu[titre]} px`).toBeLessThanOrEqual(Math.round(attendu[titre]) + 2);
        expect(largeur, `${titre} : plus de plafond à 720 px`).toBeGreaterThan(attendu[titre] > 760 ? 720 : 0);
      }
      // back-office-10 : Réunions à droite de Tâches, hauts alignés ; une seule colonne sinon (Réunions sous Tâches).
      const t = (await section(page, "Tâches").boundingBox())!;
      const r = (await section(page, "Réunions").boundingBox())!;
      const m = (await section(page, "Membres").boundingBox())!;
      if (deux) {
        expect(r.x, "Réunions à droite de Tâches").toBeGreaterThanOrEqual(t.x + t.width);
        expect(Math.abs(r.y - t.y), "hauts alignés").toBeLessThanOrEqual(1);
        expect(m.y, "Membres sous Réunions").toBeGreaterThan(r.y + r.height - 1);
        expect(Math.abs(m.x - r.x), "même colonne").toBeLessThanOrEqual(1);
        if (nom === "Back-Office") {
          // Le bouton reste au bord droit de la colonne de gauche, avant la colonne de droite.
          const nouvelle = (await page.getByRole("link", { name: "Nouvelle tâche" }).boundingBox())!;
          expect(nouvelle.x + nouvelle.width, "« Nouvelle tâche » dans la colonne Tâches").toBeLessThanOrEqual(t.x + t.width + 1);
          expect(nouvelle.x + nouvelle.width, "…et avant Réunions").toBeLessThan(r.x);
        }
      } else {
        expect(r.y, "Réunions sous Tâches").toBeGreaterThan(t.y + t.height - 1);
        expect(Math.abs(r.x - t.x)).toBeLessThanOrEqual(1);
      }
    });
  }

  test("sans compte : « ‹ Toutes les personnes » sous le titre, un seul titre avec le compte, la carte comme les autres", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/personnes/sans-compte");
    const titre = page.getByRole("heading", { level: 2, name: /^Noms du planning sans compte \(\d+\)$/ });
    await expect(titre).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }), "un seul titre de section").toHaveCount(1);
    const h1 = (await page.getByRole("heading", { level: 1, name: "Équipes" }).boundingBox())!;
    const retour = page.locator("section[aria-labelledby=\"personnes-sans-compte\"]").getByRole("link", { name: "Toutes les personnes", exact: true });
    const r = (await retour.boundingBox())!;
    expect(r.y, "le retour est sous le titre « Équipes »").toBeGreaterThan(h1.y + h1.height);
    const rail = (await page.locator('[data-onglets="rail"]').boundingBox())!;
    expect(r.y, "…et sous le rail").toBeGreaterThan(rail.y + rail.height - 1);
    const carte = titre.locator("xpath=..");
    await expect(carte).toHaveClass(/carte-groupe/);
    expect(await carte.evaluate((el) => getComputedStyle(el).borderRadius), "coins des autres cartes").toBe("16px");
  });
});
