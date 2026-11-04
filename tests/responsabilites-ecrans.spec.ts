import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { estTelephone, interdireDialoguesNatifs } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Lot RS, tranche RS-C (docs/spec-responsabilites.md, « Écrans ») : la page Équipes › Responsabilités (« Sans
// gestionnaire », Plannings, Comité Orga, Référents ; enregistrement immédiat), la ligne « Responsabilités » des
// fiches, Moi, et l'organigramme qui ne coche plus les référents. Cinq projets (SPECS_GRAND_ECRAN). Base simulée,
// noms fictifs. Captures de la page : test-results/captures-rs-c/<nom>-<projet>.png.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Gestionnaire du culte, non admin : pas la page. */
const GESTIONNAIRE: FakeProfile = {
  uid: "u-ysolde", email: "ysolde@example.com", firstName: "Ysolde", lastName: "Carrel", responsabilites: ["planning:culte"],
};

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const compte = (uid: string, prenom: string, nom: string, over: Record<string, unknown> = {}) => ({
  [`users/${uid}`]: {
    email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: "", serviceRoles: {}, annonces: [], notify: [],
    equipes: false, plannings: [], ...over,
  },
});

/** Tous les plannings ont un gestionnaire, sauf le Culte Franco. */
const GERE_TOUT_SAUF_CULTE = ["planning:intergroupe", "planning:interfranco", "planning:campus", "planning:table", "planning:edd", "planning:paix", "planning:fidelite", "planning:bonte"];

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": { membres: [M("Ovide Lanquetot", { uid: "u-ovide", referent: true }), M("Perrine Aubrac", { uid: "u-perrine" })], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
  "equipes/louange": {
    membres: [
      M("Quitterie Dumaine", { uid: "u-quitterie", referent: true }),
      M("Roch Valmont", { uid: "u-roch", sousEquipes: ["musiciens"], referentSous: ["musiciens"], joue: ["piano"] }),
    ],
    updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "",
  },
  ...compte("u-ovide", "Ovide", "Lanquetot", { dansEquipes: ["da"], referentDe: ["da"] }),
  ...compte("u-perrine", "Perrine", "Aubrac", { dansEquipes: ["da"] }),
  ...compte("u-quitterie", "Quitterie", "Dumaine", { dansEquipes: ["louange"], referentDe: ["louange"], responsabilites: ["planning:culte", "planning:paix"] }),
  ...compte("u-roch", "Roch", "Valmont", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"], joue: ["piano"] }),
  ...compte("u-sidoine", "Sidoine", "Brevant", { responsabilites: GERE_TOUT_SAUF_CULTE }),
  ...compte("u-tancrede", "Tancrède", "Moulinet"),
  ...compte("u-ysolde", "Ysolde", "Carrel", { responsabilites: ["planning:culte"] }),
};
/** Le culte n'a aucun gestionnaire (Quitterie le perd). */
const SANS_CULTE: Record<string, Record<string, unknown>> = {
  ...DOCS,
  ...compte("u-quitterie", "Quitterie", "Dumaine", { dansEquipes: ["louange"], referentDe: ["louange"], responsabilites: ["planning:paix"] }),
  ...compte("u-ysolde", "Ysolde", "Carrel"),
};

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs = SANS_CULTE, langue = "fr"): Promise<FakeDb> {
  interdireDialoguesNatifs(page);
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

/** Les envois à la recopie du serveur, jamais la vraie route. */
async function suivreRecopie(page: Page) {
  const envois: { uids?: string[]; equipe?: string }[] = [];
  await page.route("**/api/equipes/rattachement", (route) => {
    envois.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) });
  });
  return envois;
}

async function capture(page: Page, nom: string) {
  await page.screenshot({ path: `test-results/captures-rs-c/${nom}-${test.info().project.name}.png`, fullPage: true });
}

const ligne = (page: Page, cle: string) => page.getByTestId(`resp-${cle}`);

async function ajouterA(page: Page, cle: string, recherche: string, nom: string, bouton = "Ajouter") {
  const l = ligne(page, cle);
  await l.getByRole("button", { name: bouton, exact: true }).click();
  await l.getByRole("searchbox").fill(recherche);
  await l.getByRole("button", { name: nom }).click();
}

test("la page : l'encart « À pourvoir » en tête, les lignes dans l'ordre, puis Comité Orga et Référents", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites");
  await expect(page.getByRole("heading", { level: 1, name: "Équipes" })).toBeVisible();
  // L'onglet « Responsabilités » est dans le rail, actif ici.
  await expect(page.getByRole("link", { name: "Responsabilités", exact: true }).first()).toBeVisible();

  // bo-equipes-14 : un seul calcul des postes vacants ; le nombre de l'encart est celui des lignes « À pourvoir » (hors Comité Orga).
  const sans = page.getByTestId("sans-gestionnaire");
  await expect(ligne(page, "planning:culte")).toContainText("À pourvoir");
  const vacantes = page.locator('[data-testid^="resp-planning:"], [data-testid^="resp-ref:"]').filter({ has: page.getByText("À pourvoir", { exact: true }) });
  const nbVacantes = await vacantes.count();
  const plannings = await page.locator('[data-testid^="resp-planning:"]').filter({ has: page.getByText("À pourvoir", { exact: true }) }).count();
  expect(plannings).toBe(1);
  await expect(sans.getByRole("heading", { level: 2 })).toHaveText(`À pourvoir : 1 planning, ${nbVacantes - 1} équipes`);
  await expect(sans).toContainText("Sans gestionnaire, seuls les admins peuvent remplir et publier un planning.");
  await expect(sans.getByRole("link", { name: "Culte Franco" })).toBeVisible();
  await expect(sans.getByRole("link")).toHaveCount(nbVacantes);
  await expect(sans).not.toContainText("Paix");
  await expect(sans).not.toContainText("Gestionnaire ·");

  const titres = page.locator("section h2");
  await expect(titres).toHaveText([/^À pourvoir : /, "Gestionnaires des plannings", "Référents d'équipe"]);
  // Le rôle est dans le titre de section : chaque ligne ne porte plus que son objet.
  await expect(page.locator('[data-testid^="resp-planning:"] h3')).toHaveText([
    "Culte Franco", "Intergroupe", "Interfranco", "Campus", "Table et petit déj", "EDD", "Paix", "Fidélité", "Bonté",
  ]);
  await expect(page.locator('[data-testid^="resp-ref:"] h3').first()).toHaveText("Orga");
  await expect(ligne(page, "planning:paix")).toContainText("Quitterie Dumaine");
  await expect(ligne(page, "planning:culte")).toContainText("À pourvoir");
  await expect(ligne(page, "planning:culte")).not.toContainText("Personne");
  await expect(ligne(page, "orga")).toHaveAttribute("aria-label", "Comité Orga");
  // Référents : une ligne par équipe et par sous-équipe de Louange.
  await expect(ligne(page, "ref:da")).toContainText("Ovide Lanquetot");
  await expect(ligne(page, "ref:louange")).toContainText("Quitterie Dumaine");
  await expect(ligne(page, "ref:louange:musiciens")).toContainText("Roch Valmont");
  await expect(ligne(page, "ref:louange:presidence")).toContainText("À pourvoir");
  await expect(page.locator('[data-testid^="resp-"]')).toHaveCount(9 + 1 + 13 + 3);
  await capture(page, "responsabilites");
});

test("ajouter une gestionnaire du Culte l'écrit sur son profil (ce champ seul) ; « Sans gestionnaire » disparaît ; retirer l'efface", async ({ page }) => {
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", { ...SANS_CULTE, ...compte("u-sidoine", "Sidoine", "Brevant", { responsabilites: GERE_TOUT_SAUF_CULTE }) });
  await expect(page.getByTestId("sans-gestionnaire").getByRole("link", { name: "Culte Franco" })).toBeVisible();
  await ajouterA(page, "planning:culte", "tanc", "Tancrède Moulinet");
  await expect(ligne(page, "planning:culte").getByRole("listitem")).toContainText("Tancrède Moulinet");
  // bo-equipes-1 : « Enregistré » à côté de la ligne modifiée, puis il disparaît ; les autres lignes n'en disent rien.
  await expect(ligne(page, "planning:culte").getByRole("status")).toHaveText("Enregistré");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(ligne(page, "planning:culte").getByRole("status")).toBeHidden({ timeout: 6000 });
  expect((db.doc("users/u-tancrede")!.responsabilites as string[])).toEqual(["planning:culte"]);
  // Écriture du seul champ : les autres champs du profil sont intacts.
  const ecriture = db.writes.filter((w) => w.path === "users/u-tancrede").at(-1)!;
  expect(Object.keys(ecriture.data)).toEqual(["responsabilites"]);
  expect(db.doc("users/u-tancrede")).toMatchObject({ firstName: "Tancrède", lastName: "Moulinet" });
  // Plus aucun planning sans gestionnaire : l'encart ne garde que les équipes (les référents vacants).
  await expect(page.getByTestId("sans-gestionnaire").getByRole("link", { name: "Culte Franco" })).toHaveCount(0);
  await expect(page.getByTestId("sans-gestionnaire").getByRole("heading", { level: 2 })).not.toContainText("planning");

  await ligne(page, "planning:culte").getByRole("button", { name: "Retirer Tancrède Moulinet" }).click();
  await expect(ligne(page, "planning:culte")).toContainText("À pourvoir");
  expect((db.doc("users/u-tancrede")!.responsabilites as string[])).toEqual([]);
  await expect(page.getByTestId("sans-gestionnaire").getByRole("link", { name: "Culte Franco" })).toBeVisible();
});

test("la liste écrite suit l'ordre des clés, et ajouter au Comité Orga garde les responsabilités déjà là", async ({ page }) => {
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites");
  await ajouterA(page, "orga", "Quitt", "Quitterie Dumaine");
  await expect(ligne(page, "orga").getByRole("listitem")).toContainText("Quitterie Dumaine");
  expect(db.doc("users/u-quitterie")!.responsabilites).toEqual(["planning:paix", "orga"]);
  await ajouterA(page, "planning:culte", "Quitt", "Quitterie Dumaine");
  await expect(ligne(page, "planning:culte").getByRole("listitem")).toContainText("Quitterie Dumaine");
  expect(db.doc("users/u-quitterie")!.responsabilites).toEqual(["planning:culte", "planning:paix", "orga"]);
});

test("Référents : ajouter un membre de l'équipe lève son drapeau, ajouter un étranger l'ajoute comme membre, retirer ne fait que baisser le drapeau", async ({ page }) => {
  const envois = await suivreRecopie(page);
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites");
  // Perrine est déjà membre de DA : son drapeau se lève.
  await ajouterA(page, "ref:da", "perr", "Perrine Aubrac");
  await expect(ligne(page, "ref:da").getByRole("listitem")).toHaveCount(2);
  let membres = db.doc("equipes/da")!.membres as MembreEquipe[];
  expect(membres.find((m) => m.uid === "u-perrine")!.referent).toBe(true);
  expect(membres).toHaveLength(2);
  expect(envois.at(-1)).toMatchObject({ uids: ["u-perrine"], equipe: "da" });

  // Tancrède n'est pas de l'équipe : il entre comme membre référent.
  await ajouterA(page, "ref:da", "tanc", "Tancrède Moulinet");
  await expect(ligne(page, "ref:da").getByRole("listitem")).toHaveCount(3);
  membres = db.doc("equipes/da")!.membres as MembreEquipe[];
  expect(membres.find((m) => m.uid === "u-tancrede")).toMatchObject({ nom: "Tancrède Moulinet", referent: true });
  expect(membres).toHaveLength(3);

  // Retirer Ovide : il reste membre.
  await ligne(page, "ref:da").getByRole("button", { name: "Retirer Ovide Lanquetot" }).click();
  await expect(ligne(page, "ref:da").getByRole("listitem")).toHaveCount(2);
  membres = db.doc("equipes/da")!.membres as MembreEquipe[];
  expect(membres.find((m) => m.uid === "u-ovide")).toMatchObject({ referent: false });
  expect(membres).toHaveLength(3);
  expect(envois.at(-1)).toMatchObject({ uids: ["u-ovide"], equipe: "da" });
});

test("Référents d'une sous-équipe de Louange : le référent entre dans la sous-équipe, retirer garde la sous-équipe", async ({ page }) => {
  await suivreRecopie(page);
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites");
  await ajouterA(page, "ref:louange:choristes", "tanc", "Tancrède Moulinet");
  await expect(ligne(page, "ref:louange:choristes").getByRole("listitem")).toContainText("Tancrède Moulinet");
  let membres = db.doc("equipes/louange")!.membres as MembreEquipe[];
  expect(membres.find((m) => m.uid === "u-tancrede")).toMatchObject({ sousEquipes: ["choristes"], referentSous: ["choristes"], referent: false });
  await ligne(page, "ref:louange:choristes").getByRole("button", { name: "Retirer Tancrède Moulinet" }).click();
  await expect(ligne(page, "ref:louange:choristes")).toContainText("À pourvoir");
  membres = db.doc("equipes/louange")!.membres as MembreEquipe[];
  expect(membres.find((m) => m.uid === "u-tancrede")).toMatchObject({ sousEquipes: ["choristes"], referentSous: [] });
  // Roch, référent de Musiciens, n'a pas bougé.
  expect(membres.find((m) => m.uid === "u-roch")).toMatchObject({ referentSous: ["musiciens"] });
});

test("un gestionnaire non admin n'a ni la page ni l'onglet", async ({ page }) => {
  await ouvrir(page, GESTIONNAIRE, "/back-office/equipes/responsabilites", DOCS);
  await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
  await expect(page.getByTestId("sans-gestionnaire")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(0);
});

test("la fiche d'une personne : « Responsabilités » en lecture seule, et le lien pour l'admin", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-quitterie", DOCS);
  const fiche = page.getByTestId("fiche-responsabilites").first();
  await expect(fiche).toContainText("Responsabilités");
  await expect(fiche).toContainText("Gestionnaire · Culte Franco");
  await expect(fiche).toContainText("Gestionnaire · Paix");
  await expect(fiche).toContainText("Référent · Louange");
  // bo-equipes-7 : pour l'admin la ligne entière est le lien (44 px), son nom reste « Gérer les responsabilités ».
  const lien = page.getByRole("link", { name: "Gérer les responsabilités" });
  await expect(lien).toHaveAttribute("href", /\/back-office\/equipes\/responsabilites\/?$/);
  await expect(lien).toHaveAttribute("data-testid", "fiche-responsabilites");
  expect((await lien.boundingBox())!.height, "ligne-lien de 44 px au moins").toBeGreaterThanOrEqual(43.5);
  await expect(page.locator("article").locator("a.underline")).toHaveCount(0);
  await capture(page, "fiche-personne");
});

test("la fiche d'une personne sans responsabilité dit « Aucune »", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-tancrede", DOCS);
  await expect(page.getByTestId("fiche-responsabilites").first()).toContainText("Aucune");
});

test("Moi d'un gestionnaire : « Gestionnaire · Culte Franco » dans Ce que tu peux faire", async ({ page }) => {
  await ouvrir(page, GESTIONNAIRE, "/moi", DOCS);
  const faire = page.getByRole("region", { name: "Ce que tu peux faire", exact: true });
  await expect(faire).toContainText("Gestionnaire · Culte Franco");
});

test("l'organigramme : plus de pastille Référent cliquable, une mention et le lien pour l'admin", async ({ page }) => {
  await suivreRecopie(page);
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS);
  await page.getByRole("button", { name: "Modifier Louange" }).click();
  const roch = page.getByTestId("membre-u-roch");
  await roch.getByRole("button", { name: /^Roch Valmont/ }).click();
  await expect(roch.getByRole("group", { name: "Référent de" })).toHaveCount(0);
  await expect(roch.getByRole("button", { name: /Référent/ })).toHaveCount(0);
  await expect(roch.getByTestId("mention-referent")).toContainText("Référent · Musiciens");
  await expect(roch.getByRole("link", { name: "Gérer les responsabilités" })).toBeVisible();
  // Les mentions « — Référent·e » des lignes de la carte restent.
  await page.getByRole("dialog", { name: "Louange", exact: true }).getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByTestId("equipe-louange")).toContainText("Roch Valmont — Référent·e");
});

test("l'organigramme d'une équipe ordinaire : pas de case Référent, la mention seule", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS);
  await page.getByRole("button", { name: "Modifier DA" }).click();
  const panneau = page.getByRole("dialog", { name: "DA", exact: true });
  await expect(panneau.getByRole("checkbox", { name: "Référent" })).toHaveCount(0);
  await expect(panneau.getByTestId("membre-u-ovide").getByTestId("mention-referent")).toContainText("Référent");
});

test("la fiche de l'organigramme : « Responsabilités » et le lien pour l'admin", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS);
  await page.getByTestId("equipe-da").getByRole("button", { name: /Ovide Lanquetot/ }).first().click();
  const fiche = page.getByTestId("fiche");
  await expect(fiche.getByTestId("fiche-responsabilites")).toContainText("Référent · DA");
  await expect(fiche.getByRole("link", { name: "Gérer les responsabilités" })).toBeVisible();
});

test("en 中文 : la page, ses lignes et ses boutons sont traduits", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", SANS_CULTE, "zh-CN");
  await expect(page.getByTestId("sans-gestionnaire").getByRole("heading", { level: 2 })).toContainText("空缺：1 个排班，");
  await expect(page.getByTestId("sans-gestionnaire").getByRole("link", { name: "法语崇拜" })).toBeVisible();
  await expect(page.locator("section h2")).toHaveText([/^空缺：/, "排班负责人", "团队负责人"]);
  // bo-equipes-16 : le rôle est dans le titre de section, plus de « 负责人 · » en tête de ligne.
  await expect(page.locator('[data-testid^="resp-"] h3').filter({ hasText: /^负责人 · / })).toHaveCount(0);
  await expect(page.locator('[data-testid^="resp-planning:"] h3').first()).toHaveText("法语崇拜");
  await expect(ligne(page, "planning:culte")).toContainText("空缺");
  await expect(ligne(page, "orga")).toHaveAttribute("aria-label", "统筹委员会");
  await expect(ligne(page, "ref:louange:musiciens")).toContainText("敬拜 · ");
  await expect(ligne(page, "planning:culte").getByRole("button", { name: "添加" })).toBeVisible();
  await expect(ligne(page, "planning:paix").getByRole("button", { name: "移除 Quitterie Dumaine" })).toBeVisible();
  await expect(page.getByText("Sans gestionnaire")).toHaveCount(0);
  await capture(page, "responsabilites-zh");
  await ajouterA(page, "planning:culte", "tanc", "Tancrède Moulinet", "添加");
  await expect(ligne(page, "planning:culte").getByRole("listitem")).toContainText("Tancrède Moulinet");
});

test("agencement : une colonne sur téléphone, pas de débordement, « Retirer » au toucher d'au moins 44 px", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", SANS_CULTE);
  await expect(ligne(page, "planning:paix")).toContainText("Quitterie Dumaine");
  const debord = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(debord).toBeLessThanOrEqual(0);
  const retirer = await ligne(page, "planning:paix").getByRole("button", { name: "Retirer Quitterie Dumaine" }).boundingBox();
  expect(retirer!.height).toBeGreaterThanOrEqual(36);
  const puce = await ligne(page, "planning:paix").getByRole("listitem").filter({ hasText: "Quitterie" }).boundingBox();
  expect(puce!.height).toBeGreaterThanOrEqual(43.5);
  if (estTelephone(info)) {
    const carte = await ligne(page, "planning:paix").boundingBox();
    expect(carte!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await capture(page, "responsabilites-agencement");
});

test("bo-equipes-14 : une pastille de l'encart amène sa ligne et la surligne 1,2 s", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", SANS_CULTE);
  await page.getByTestId("sans-gestionnaire").getByRole("link", { name: "Culte Franco" }).click();
  await expect(ligne(page, "planning:culte")).toHaveAttribute("data-surlignee", "true");
  await expect(ligne(page, "planning:culte")).toBeInViewport();
  await expect(ligne(page, "planning:culte")).not.toHaveAttribute("data-surlignee", "true", { timeout: 4000 });
  // L'ordre des lignes ne bouge pas : la ligne amenée est toujours la première des plannings.
  await expect(page.locator('[data-testid^="resp-planning:"]').first()).toHaveAttribute("data-testid", "resp-planning:culte");
});

test("bo-equipes-14 : sous « réduire les animations », saut direct et la ligne reste surlignée, sans fondu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", SANS_CULTE);
  await page.getByTestId("sans-gestionnaire").getByRole("link", { name: "Culte Franco" }).click();
  await expect(ligne(page, "planning:culte")).toHaveAttribute("data-surlignee", "true");
  await expect(ligne(page, "planning:culte")).toBeInViewport();
  // Pas de fondu : la durée de transition est nulle (ou le 0,00001 s que la règle globale de `reduce` impose).
  expect(await ligne(page, "planning:culte").evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)), "pas de fondu").toBeLessThan(0.001);
  await page.waitForTimeout(1800);
  await expect(ligne(page, "planning:culte")).toHaveAttribute("data-surlignee", "true");
});

test("bo-equipes-14 : « + Ajouter » de 32 px (44 px au téléphone) avec une zone de 44 px au toucher, ligne vacante de 56 px dès 640 px", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", SANS_CULTE);
  const bouton = ligne(page, "planning:culte").getByRole("button", { name: "Ajouter", exact: true });
  await expect(bouton).toBeVisible();
  const largeur = page.viewportSize()!.width;
  const b = (await bouton.boundingBox())!;
  if (largeur >= 640) {
    expect(Math.round(b.height), "dessin de 32 px").toBe(32);
    const l = (await ligne(page, "planning:culte").boundingBox())!;
    expect(Math.round(l.height), "ligne de 56 px").toBe(56);
    // Objet à gauche, valeur à droite, « + Ajouter » après elle, sur une seule ligne.
    const valeur = (await ligne(page, "planning:culte").getByText("À pourvoir", { exact: true }).boundingBox())!;
    const objet = (await ligne(page, "planning:culte").getByRole("heading", { level: 3 }).boundingBox())!;
    expect(objet.x).toBeLessThan(valeur.x);
    expect(valeur.x + valeur.width).toBeLessThanOrEqual(b.x + 1);
    expect(Math.abs(valeur.y - objet.y)).toBeLessThan(12);
  } else {
    expect(Math.round(b.height), "deux lignes au téléphone, bouton de 44 px").toBeGreaterThanOrEqual(44);
    const valeur = (await ligne(page, "planning:culte").getByText("À pourvoir", { exact: true }).boundingBox())!;
    expect(valeur.y, "la valeur sous l'objet").toBeGreaterThan(b.y + b.height - 1);
  }
  if (await page.evaluate(() => matchMedia("(pointer: coarse)").matches)) {
    const zone = await bouton.evaluate((el) => { const s = getComputedStyle(el, "::after"); return { h: parseFloat(s.height), w: parseFloat(s.width) }; });
    expect(zone.h, "::after de 44 px de haut").toBeGreaterThanOrEqual(43.5);
    expect(zone.w, "::after de 44 px de large").toBeGreaterThanOrEqual(43.5);
  }
});
