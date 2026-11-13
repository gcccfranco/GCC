import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 1 du rapport d'usage, tranche T2 (docs/spec-retouches-usage.md) : zones de toucher de 44 px, sans changer
// le dessin, pour les équipes, les tâches et les réunions. Au toucher seulement : `::after` ≥ 44 px, dessin < 44 px,
// et un point à 20 px du centre atteint bien le bouton (modèle : tests/equipes-page.spec.ts). Toutes les commandes
// sont atteintes avec les données simulées : aucune lecture des classes du source. Noms fictifs.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };

const tache = (over: Record<string, unknown> = {}) => ({
  equipe: "da", titre: "Affiche de Pâques", responsableUid: "u-saul", responsableNom: "Saül Ferrand",
  echeance: "2026-10-11", repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-saul",
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const REUNION = {
  titre: "Point DA d'automne", type: "loisir", pour: "equipe:da", date: "2026-10-03", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [{ label: "Ordre du jour", url: "https://example.com/odj" }], images: [], placesMax: null,
  inscriptions: "fermees", inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "u-saul", organisateurNom: "Saül Ferrand", epingle: false, expiresAt: null, inscrits: 0, reunion: true,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
const sujet = (texte: string, ordre: number) => ({
  texte, auteurUid: "u-saul", auteurNom: "Saül Ferrand", creeLe: "2026-09-28T09:00:00Z", ordre, traite: false, reprisDans: null, repriseDe: null,
});
const t = (nom: string, uid = "") => ({ nom, uid });
const PAIX = {
  president: t("Gaëlle Ormeau", "gaelle"), vp: [t("Lazare Piquet", "lazare")], maxVp: 2, roles: [],
  updatedAt: "", parUid: "", parNom: "",
};
const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": { pole: "da", membres: [], updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
  "equipes/da/taches/affiche": tache(),
  "evenements/reunion-da": REUNION,
  "evenements/reunion-da/sujets/s1": sujet("Valider le visuel de Pâques", 0),
  "evenements/reunion-da/sujets/s2": sujet("Budget des impressions", 1),
  "groupes/paix": PAIX,
};

async function ouvrir(page: Page, vers: string) {
  await page.clock.setFixedTime(new Date("2026-10-02T10:00:00+02:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
  await signInAs(page, ADMIN, DOCS, vers);
}
const estTactile = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
const SKIP = "la zone de 44 px est celle du doigt : appareils tactiles";

/** `::after` ≥ 44 px, dessin (boîte) < 44 px ; `dy` : un point à 20 px du centre atteint encore l'élément. */
async function zone44(el: Locator, nom: string, dy = 20) {
  await expect(el, nom).toBeVisible();
  await el.evaluate((n) => n.scrollIntoView({ block: "center" })); // le point sondé doit rester dans la fenêtre
  const apres = await el.evaluate((n) => parseFloat(getComputedStyle(n, "::after").height));
  expect(apres, `${nom} : hauteur du ::after`).toBeGreaterThanOrEqual(44);
  const b = (await el.boundingBox())!;
  expect(b.height, `${nom} : le dessin ne grandit pas`).toBeLessThan(44);
  const atteint = await el.evaluate((n, [x, y]) => n.contains(document.elementFromPoint(x, y)), [b.x + b.width / 2, b.y + b.height / 2 + dy]);
  expect(atteint, `${nom} : un point à ${dy} px du centre atteint l'élément`).toBe(true);
}

test.describe("zones de 44 px (T2)", () => {
  test("nom de l'équipe sur /equipes : zone de 44 px, un toucher à 20 px au-dessus du centre mène à /equipes/da (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/equipes");
    const lien = page.getByTestId("equipe-da").getByRole("heading").getByRole("link");
    await expect(lien).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(lien, "nom de l'équipe", -20);
    const b = (await lien.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 - 20);
    await expect(page).toHaveURL(/\/equipes\/da\/?\?depuis=equipes$/);
  });

  test("ligne de tâche : le bouton d'ouverture prend toute la hauteur de la ligne, toucher le bas de la ligne ouvre la tâche", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/da");
    const ligne = page.locator(".group-row").filter({ hasText: "Affiche de Pâques" }).first();
    const ouvrirTache = ligne.getByRole("button", { name: /Affiche de Pâques/ }).last();
    await expect(ouvrirTache).toBeVisible();
    const [l, o] = [(await ligne.boundingBox())!, (await ouvrirTache.boundingBox())!];
    expect(o.height, "le bouton remplit la hauteur de la ligne").toBeGreaterThanOrEqual(l.height - 1);
    expect(l.height, "la ligne garde sa hauteur d'avant").toBeLessThan(80);
    await page.mouse.click(o.x + o.width / 2, o.y + o.height - 2);
    await expect(page).toHaveURL(/\/taches\/da\/affiche\/?$/);
  });

  test("segments d'état d'une tâche : zone de 44 px, un toucher à 20 px sous le centre choisit « En cours » (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/taches/da/affiche");
    const groupe = page.getByRole("radiogroup", { name: "État" });
    await expect(groupe).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    for (const nom of ["À faire", "En cours", "Terminée"]) await zone44(groupe.getByRole("radio", { name: nom }), `segment ${nom}`);
    const encours = groupe.getByRole("radio", { name: "En cours" });
    const b = (await encours.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 20);
    await expect(encours).toHaveAttribute("aria-checked", "true");
  });

  test("« Nouvelle tâche » et « Nouvelle réunion » de la page d'une équipe : zone de 44 px (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/da");
    const tacheNouvelle = page.getByRole("link", { name: "Nouvelle tâche" });
    await expect(tacheNouvelle).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(tacheNouvelle, "Nouvelle tâche");
    await zone44(page.getByRole("link", { name: "Nouvelle réunion" }), "Nouvelle réunion");
    const b = (await tacheNouvelle.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 20);
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/nouvelle\/?$/);
  });

  test("fiche d'une réunion : Modifier et Dupliquer ont 44 px, un toucher à 20 px du centre de Modifier ouvre le formulaire (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/back-office/reunions/reunion-da");
    const modifier = page.getByRole("link", { name: "Modifier" }).first();
    await expect(modifier).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(page.getByRole("link", { name: "Dupliquer pour la prochaine" }), "Dupliquer");
    await zone44(modifier, "Modifier");
    const b = (await modifier.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 20);
    await expect(page).toHaveURL(/\/reunions\/reunion-da\/modifier\/?$/);
  });

  test("formulaire d'une réunion : corbeille d'un lien et « Ajouter un lien » ont 44 px sans se recouvrir (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/back-office/reunions/reunion-da/modifier");
    const corbeille = page.getByRole("button", { name: "Retirer le lien" });
    const ajouter = page.getByRole("button", { name: "Ajouter un lien" });
    await expect(ajouter).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(corbeille, "corbeille", 20);
    await zone44(ajouter, "Ajouter un lien", -20);
    const b = (await corbeille.boundingBox())!;
    const a = (await ajouter.boundingBox())!;
    expect(a.y, "la corbeille est au-dessus").toBeGreaterThan(b.y);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 - 20);
    await expect(corbeille).toHaveCount(0);
  });

  test("sujets à aborder : la poignée de déplacement a 44 px de haut sans mordre sur la case voisine (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/evenements/reunion-da");
    const poignee = page.getByRole("button", { name: /^Déplacer « Valider le visuel/ });
    await expect(poignee).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(poignee, "poignée", 20);
    // Le point juste à droite de la poignée (dans l'écart de 4 px) n'appartient pas à la zone : la case voisine reste la sienne.
    const b = (await poignee.boundingBox())!;
    const voisine = page.getByRole("checkbox", { name: /Valider le visuel/ });
    const v = (await voisine.boundingBox())!;
    expect(await voisine.evaluate((n, [x, y]) => n.contains(document.elementFromPoint(x, y)), [v.x + 2, b.y + b.height / 2]), "la case voisine garde ses 2 premiers px").toBe(true);
  });

  test("organigramme d'un groupe : « Nommer » a 44 px, un toucher à 20 px du centre ouvre le dialogue (appareils tactiles)", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes?groupe=paix");
    const nommer = page.getByRole("button", { name: "Nommer", exact: true });
    await expect(nommer).toBeVisible();
    test.skip(!(await estTactile(page)), SKIP);
    await zone44(nommer, "Nommer");
    const b = (await nommer.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 20);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
