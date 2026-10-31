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

test("la page : « Sans gestionnaire » en tête, les lignes dans l'ordre, puis Comité Orga et Référents", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites");
  await expect(page.getByRole("heading", { level: 1, name: "Équipes" })).toBeVisible();
  // L'onglet « Responsabilités » est dans le rail, actif ici.
  await expect(page.getByRole("link", { name: "Responsabilités", exact: true }).first()).toBeVisible();

  const sans = page.getByTestId("sans-gestionnaire");
  await expect(sans).toContainText("Sans gestionnaire");
  await expect(sans).toContainText("Gestionnaire · Culte Franco");
  await expect(sans).not.toContainText("Paix");

  const titres = page.locator("section h2");
  await expect(titres).toHaveText(["Plannings", "Référents"]);
  await expect(page.locator('[data-testid^="resp-planning:"] h3')).toHaveText([
    "Gestionnaire · Culte Franco", "Gestionnaire · Intergroupe", "Gestionnaire · Interfranco", "Gestionnaire · Campus",
    "Gestionnaire · Table et petit déj", "Gestionnaire · EDD", "Gestionnaire · Paix", "Gestionnaire · Fidélité", "Gestionnaire · Bonté",
  ]);
  await expect(ligne(page, "planning:paix")).toContainText("Quitterie Dumaine");
  await expect(ligne(page, "planning:culte")).toContainText("Personne");
  await expect(ligne(page, "orga")).toHaveAttribute("aria-label", "Comité Orga");
  // Référents : une ligne par équipe et par sous-équipe de Louange.
  await expect(ligne(page, "ref:da")).toContainText("Ovide Lanquetot");
  await expect(ligne(page, "ref:louange")).toContainText("Quitterie Dumaine");
  await expect(ligne(page, "ref:louange:musiciens")).toContainText("Roch Valmont");
  await expect(ligne(page, "ref:louange:presidence")).toContainText("Personne");
  await expect(page.locator('[data-testid^="resp-"]')).toHaveCount(9 + 1 + 13 + 3);
  await capture(page, "responsabilites");
});

test("ajouter une gestionnaire du Culte l'écrit sur son profil (ce champ seul) ; « Sans gestionnaire » disparaît ; retirer l'efface", async ({ page }) => {
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/responsabilites", { ...SANS_CULTE, ...compte("u-sidoine", "Sidoine", "Brevant", { responsabilites: GERE_TOUT_SAUF_CULTE }) });
  await expect(page.getByTestId("sans-gestionnaire")).toBeVisible();
  await ajouterA(page, "planning:culte", "tanc", "Tancrède Moulinet");
  await expect(ligne(page, "planning:culte").getByRole("listitem")).toContainText("Tancrède Moulinet");
  expect((db.doc("users/u-tancrede")!.responsabilites as string[])).toEqual(["planning:culte"]);
  // Écriture du seul champ : les autres champs du profil sont intacts.
  const ecriture = db.writes.filter((w) => w.path === "users/u-tancrede").at(-1)!;
  expect(Object.keys(ecriture.data)).toEqual(["responsabilites"]);
  expect(db.doc("users/u-tancrede")).toMatchObject({ firstName: "Tancrède", lastName: "Moulinet" });
  // Plus aucun planning sans gestionnaire.
  await expect(page.getByTestId("sans-gestionnaire")).toHaveCount(0);

  await ligne(page, "planning:culte").getByRole("button", { name: "Retirer Tancrède Moulinet" }).click();
  await expect(ligne(page, "planning:culte")).toContainText("Personne");
  expect((db.doc("users/u-tancrede")!.responsabilites as string[])).toEqual([]);
  await expect(page.getByTestId("sans-gestionnaire")).toBeVisible();
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
  await expect(ligne(page, "ref:louange:choristes")).toContainText("Personne");
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
  const lien = page.getByRole("link", { name: "Gérer les responsabilités" });
  await expect(lien).toHaveAttribute("href", /\/back-office\/equipes\/responsabilites\/?$/);
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
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  const roch = page.getByTestId("membre-u-roch");
  await roch.getByRole("button", { name: /^Roch Valmont/ }).click();
  await expect(roch.getByRole("group", { name: "Référent de" })).toHaveCount(0);
  await expect(roch.getByRole("button", { name: /Référent/ })).toHaveCount(0);
  await expect(roch.getByTestId("mention-referent")).toContainText("Référent · Musiciens");
  await expect(roch.getByRole("link", { name: "Gérer les responsabilités" })).toBeVisible();
  // Les mentions « — Référent·e » des lignes de la carte restent.
  await page.getByRole("dialog", { name: "TEAM LOUANGE" }).getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByTestId("equipe-louange")).toContainText("Roch Valmont — Référent·e");
});

test("l'organigramme d'une équipe ordinaire : pas de case Référent, la mention seule", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS);
  await page.getByRole("button", { name: "Modifier TEAM DA" }).click();
  const panneau = page.getByRole("dialog", { name: "TEAM DA" });
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
  await expect(page.getByTestId("sans-gestionnaire")).toContainText("尚无负责人");
  await expect(page.getByTestId("sans-gestionnaire")).toContainText("负责人 · 法语崇拜");
  await expect(page.locator("section h2")).toHaveText(["排班", "负责人"]);
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
