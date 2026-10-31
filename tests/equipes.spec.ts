import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/fakeSession";
import type { PlanningData } from "../src/lib/planning/names";
import { EQUIPES } from "../src/lib/equipes/organigramme";
import { COLONNES_MUSICIENS, matriceMusiciens, type ProfilMusicien } from "../src/lib/equipes/musiciens";
import { canEditerEquipes, canVoirEquipes } from "../src/lib/access";
import type { MembreEquipe } from "../src/types/equipe";

// Lot 16 « Organigramme, source des pôles » (docs/spec-organigramme.md).
// La matrice est une fonction pure. Le parseur de l'onglet ORGANIGRAMME et le
// rattachement des noms du Sheet sont partis avec l'import, le 06/10/2026
// (« on va tout faire manuellement ») : leurs tests aussi.

// ── Plus de pôles (lot 1 du chantier « équipes et groupes », EQ-D, EQ27) ────

test("la table des équipes ne donne plus de pôle ; l'organigramme n'a plus la fonction qui les calculait", async () => {
  for (const e of EQUIPES) expect(e, e.id).not.toHaveProperty("pole");
  const organigramme = await import("../src/lib/equipes/organigramme");
  expect(organigramme).not.toHaveProperty("polesDesEquipes");
});

test("droits : tout connecté voit l'organigramme, les admins et le droit « Équipes » le modifient", () => {
  const membreOrdinaire = { uid: "u1", email: "membre@example.com" };
  expect(canVoirEquipes(membreOrdinaire)).toBe(true);
  expect(canVoirEquipes(null)).toBe(false);
  expect(canEditerEquipes(membreOrdinaire, { equipes: false })).toBe(false);
  expect(canEditerEquipes(membreOrdinaire, null)).toBe(false);
  expect(canEditerEquipes(membreOrdinaire, { equipes: true })).toBe(true);
  expect(canEditerEquipes({ uid: "a", email: "tc328829@gmail.com" }, null)).toBe(true);
  expect(canEditerEquipes(null, { equipes: true })).toBe(false);
});

// ── Matrice des musiciens ───────────────────────────────────────────────────

const PLANNING_VIDE: PlanningData = {
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [],
  bonte: [], edd: {} as PlanningData["edd"], campus: [], intergroupe: [], interfranco: [],
};

test("matrice : le planning nomme l'instrument, sinon « Musicien »", () => {
  const profils: ProfilMusicien[] = [
    {
      uid: "u1", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.",
      serviceRoles: { "Culte Francophone": ["musicien"], Campus: ["musicien"] },
    },
    { uid: "u2", firstName: "Nina", lastName: "P.", planningName: "Nina P.", serviceRoles: {} },
  ];
  const data: PlanningData = {
    ...PLANNING_VIDE,
    culte: [["2026-10-12", "", "", "", "Ruth K.", "", "", "", "", "", "", ""]],
  };
  // La matrice rend des clés de libellé (`equipes.role.*`) : le français et le
  // 中文 sortent du même calcul. Le mot affiché est vérifié à l'écran plus bas.
  const lignes = matriceMusiciens(profils, data);
  expect(lignes.map((l) => l.uid)).toEqual(["u1"]);
  expect(lignes[0].cases.franco).toEqual(["piano"]);
  // Sert au Campus mais le planning n'y nomme pas d'instrument.
  expect(lignes[0].cases.campus).toEqual(["musicien"]);
  expect(lignes[0].cases.paix).toEqual([]);
  expect(COLONNES_MUSICIENS).toEqual([
    "paix", "bonte", "fidelite", "campus", "edd", "franco", "intergroupe", "interfranco",
  ]);
});

// Retours du 06/10/2026 : « Musiciens montre tout le monde ». La vue ne garde que
// les musiciens — rôle « musicien » du profil ou instrument nommé par le planning ;
// présidence, choristes et régie n'y ont plus de ligne ni de case.
test("matrice : seuls les musiciens — ni présidence, ni choristes, ni régie", () => {
  const profils: ProfilMusicien[] = [
    { uid: "u-pres", firstName: "Paul", lastName: "W.", planningName: "Paul W.", serviceRoles: { "Culte Francophone": ["presidence"] } },
    { uid: "u-chor", firstName: "Daniela", lastName: "W.", planningName: "Daniela W.", serviceRoles: { "Culte Francophone": ["chanteur"] } },
    { uid: "u-regie", firstName: "Régis", lastName: "S.", planningName: "Régis S.", serviceRoles: { "Culte Francophone": ["regie"] } },
    // Musicienne qui préside aussi : sa case ne garde que l'instrument.
    { uid: "u-eva", firstName: "Eva", lastName: "C.", planningName: "Eva C.", serviceRoles: { "Culte Francophone": ["musicien", "presidence"] } },
    // Choriste au Franco, musicienne au Campus : une ligne, la case Franco vide.
    { uid: "u-lydia", firstName: "Lydia", lastName: "H.", planningName: "Lydia H.", serviceRoles: { "Culte Francophone": ["chanteur"], Campus: ["musicien"] } },
  ];
  const data: PlanningData = {
    ...PLANNING_VIDE,
    culte: [
      ["2026-10-04", "Eva C.", "Daniela W.", "Lydia H.", "", "", "", "Régis S.", "", "", "", ""],
      ["2026-10-11", "Paul W.", "", "", "Eva C.", "", "", "", "", "", "", ""],
    ],
  };
  const lignes = matriceMusiciens(profils, data);
  expect(lignes.map((l) => l.uid).sort()).toEqual(["u-eva", "u-lydia"]);
  const eva = lignes.find((l) => l.uid === "u-eva")!;
  expect(eva.cases.franco, "la présidence n'est pas un instrument").toEqual(["piano"]);
  const lydia = lignes.find((l) => l.uid === "u-lydia")!;
  expect(lydia.cases.franco, "choriste au Franco : pas de case").toEqual([]);
  expect(lydia.cases.campus).toEqual(["musicien"]);
});

// ── Écrans ──────────────────────────────────────────────────────────────────

/** Feuilles Google simulées : rien ne sort sur le réseau pendant un test. */
async function simulerSheets(page: Page, feuilles: Record<string, string> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const nom = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    route.fulfill({ status: 200, contentType: "text/csv", body: feuilles[decodeURIComponent(nom)] ?? "" });
  });
}

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const DOCS = {
  "equipes/da": {
    pole: "da",
    membres: [
      M("Charlie L.", { uid: "u-charlie", mention: "Référente", referent: true }),
      M("Justine C.", { essai: true }),
    ],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "equipes/theologie": {
    pole: "orga",
    membres: [M("Christelle C.", { uid: "", mention: "Orga/Inscriptions" })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "users/u-charlie": {
    email: "charlie@example.com", firstName: "Charlie", lastName: "L.", planningName: "Charlie L.",
    serviceRoles: {}, annonces: [], notify: [], dansEquipes: ["da"], referentDe: ["da"], equipes: false,
  },
  "users/u-ruth": {
    email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.",
    serviceRoles: {}, annonces: [], notify: [], equipes: false,
  },
};

test("page Équipes : un membre ordinaire voit les 13 équipes, sans commande d'édition", async ({ page }) => {
  await simulerSheets(page);
  await signInAs(page, { uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K." }, DOCS, "/equipes");
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  await expect(page.getByTestId(/^equipe-/)).toHaveCount(13);
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Importer/ })).toHaveCount(0);
});

test("page Équipes : « en essai », un nom rattaché ouvre la fiche, un nom libre non", async ({ page }) => {
  await simulerSheets(page);
  await signInAs(page, { uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K." }, DOCS, "/equipes");
  const carte = page.getByTestId("equipe-da");
  // Le référent est nommé une fois, pas deux (« Référente Référent »).
  await expect(carte).toContainText("Charlie L. — Référente");
  await expect(carte).not.toContainText("Référente Référent");
  await expect(carte).toContainText("en essai");
  await expect(carte.getByRole("button", { name: /Justine C\./ })).toHaveCount(0);
  await carte.getByRole("button", { name: /Charlie L\./ }).click();
  await expect(page.getByTestId("fiche")).toContainText("Charlie L.");
});

// Lot U6, B2 (question 4) : l'organigramme se modifie au Back-Office, Équipes › Organigramme.
test("Équipes › Organigramme : le droit « Équipes » ajoute un membre et fait recalculer le rattachement", async ({ page }) => {
  await simulerSheets(page);
  let appels = 0;
  let envoye: { uids?: string[]; equipe?: string } = {};
  await page.route("**/api/equipes/rattachement", (route) => {
    appels++;
    envoye = route.request().postDataJSON() as { uids?: string[]; equipe?: string };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) });
  });
  const db = await signInAs(
    page,
    // Nouveau mode (lot AO) : plus de case « Équipes » — la référente de TEAM DA tient son équipe.
    { uid: "u-ref", email: "referent@example.com", firstName: "Lydia", lastName: "H.", dansEquipes: ["da"], referentDe: ["da"] },
    DOCS,
    "/back-office/equipes",
  );
  const carte = page.getByTestId("equipe-da");
  // EQ27 : plus de pastille « Donne le pôle … » sur les cartes.
  await expect(page.getByText(/Donne le pôle/)).toHaveCount(0);
  // Agencement v18 (B8) : le crayon de la carte ouvre le panneau d'édition.
  await carte.getByRole("button", { name: "Modifier TEAM DA" }).click();
  const panneau = page.getByRole("dialog", { name: "TEAM DA" });
  // EQ27 : ni sélecteur « Pôle donné par cette équipe », ni liste de pôles.
  await expect(panneau.getByText("Pôle donné par cette équipe")).toHaveCount(0);
  await expect(panneau.getByRole("combobox")).toHaveCount(0);
  await panneau.getByPlaceholder("Ajouter un membre").fill("Ruth");
  await panneau.getByRole("button", { name: /Ruth K\./ }).click();
  await panneau.getByRole("button", { name: "Enregistrer" }).click();
  // Un signe à l'écran d'abord : le panneau se referme et le nom apparaît dans la carte.
  await expect(panneau).toBeHidden();
  await expect(carte.getByRole("button", { name: /Ruth K\./ })).toBeVisible();
  await expect(carte.getByRole("button", { name: "Modifier TEAM DA" })).toBeVisible();
  const ecrit = db.doc("equipes/da") as { membres: MembreEquipe[] } | undefined;
  expect(ecrit?.membres.filter((m) => m.uid === "u-ruth")).toHaveLength(1);
  // Le corps n'écrit plus `pole` (masque : membres et signature) ; le champ stocké, que le relevé
  // de la migration lira (EQ-E), reste tel quel.
  const patch = db.writes.find((w) => w.path === "equipes/da");
  expect(patch?.data).not.toHaveProperty("pole");
  expect((ecrit as { pole?: string } | undefined)?.pole).toBe("da");
  // Les anciens membres restent.
  expect(ecrit?.membres.map((m) => m.nom)).toEqual(["Charlie L.", "Justine C.", "Ruth K."]);
  expect(appels).toBe(1);
  // Seules les lignes changées pendant l'édition (ici une ajoutée) partent au rattachement.
  expect(envoye.uids).toEqual(["u-ruth"]);
  // L'équipe éditée part avec les comptes : seuls ses référents peuvent changer.
  expect(envoye.equipe).toBe("da");
});

test("Équipes › Organigramme : la recopie échoue après l'écriture — « Réessayer » renvoie les mêmes comptes", async ({ page }) => {
  await simulerSheets(page);
  const corps: { uids?: string[]; equipe?: string }[] = [];
  await page.route("**/api/equipes/rattachement", (route) => {
    corps.push(route.request().postDataJSON() as { uids?: string[]; equipe?: string });
    return corps.length === 1
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "panne" }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) });
  });
  const db = await signInAs(
    page,
    { uid: "u-ref", email: "referent@example.com", firstName: "Lydia", lastName: "H.", dansEquipes: ["da"], referentDe: ["da"] },
    DOCS,
    "/back-office/equipes",
  );
  const carte = page.getByTestId("equipe-da");
  await carte.getByRole("button", { name: "Modifier TEAM DA" }).click();
  const panneau = page.getByRole("dialog", { name: "TEAM DA" });
  await panneau.getByPlaceholder("Ajouter un membre").fill("Ruth");
  await panneau.getByRole("button", { name: /Ruth K\./ }).click();
  await panneau.getByRole("button", { name: "Enregistrer" }).click();
  // Le document est écrit, le panneau reste ouvert avec le message et « Réessayer ».
  await expect(panneau.getByRole("alert")).toContainText("Les droits n'ont pas été recopiés");
  await expect(panneau.getByRole("button", { name: "Réessayer" })).toBeVisible();
  expect((db.doc("equipes/da") as { membres: MembreEquipe[] }).membres.map((m) => m.uid)).toContain("u-ruth");
  await panneau.getByRole("button", { name: "Réessayer" }).click();
  await expect(panneau).toBeHidden();
  await expect(carte.getByRole("button", { name: /Ruth K\./ })).toBeVisible();
  expect(corps).toEqual([{ uids: ["u-ruth"], equipe: "da" }, { uids: ["u-ruth"], equipe: "da" }]);
});

test("Moi : une ligne « Équipes » mène à l'organigramme", async ({ page }) => {
  await simulerSheets(page);
  await signInAs(page, { uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K." }, {}, "/moi");
  const ligne = page.getByRole("link", { name: "Équipes" });
  await expect(ligne).toBeVisible();
  // Le site sert ses pages avec une barre oblique finale.
  await expect(ligne).toHaveAttribute("href", "/equipes/");
});

test("matrice : tableau sur grand écran, cartes sur téléphone, sans défilement horizontal", async ({ page }, info) => {
  // Nouveau mode (lot AO-B) : la matrice vient de la sous-équipe Musiciens de l'organigramme, plus du planning.
  await simulerSheets(page);
  await signInAs(
    page,
    { uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K." },
    { ...DOCS, "equipes/louange": { membres: [
        { nom: "Ruth K.", uid: "u1", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["musiciens"], joue: ["piano"], lieux: ["Culte Francophone"] },
      ], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" }, },
    "/equipes",
  );
  await page.getByRole("button", { name: "Musiciens" }).click();
  const telephone = info.project.name === "telephone";
  await expect(page.getByTestId(telephone ? "matrice-cartes" : "matrice-table")).toBeVisible();
  await expect(page.getByTestId(telephone ? "matrice-table" : "matrice-cartes")).toBeHidden();
  await expect(page.getByTestId(telephone ? "matrice-cartes" : "matrice-table")).toContainText("Piano");
  const { corps, ecran } = await page.evaluate(() => ({
    corps: document.body.scrollWidth,
    ecran: document.documentElement.clientWidth,
  }));
  expect(corps).toBeLessThanOrEqual(ecran + 1);
});

test("onglet Musiciens : un président ou une choriste n'y figure pas (retours du 06/10/2026)", async ({ page }, info) => {
  await simulerSheets(page);
  await signInAs(
    page,
    { uid: "u-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K." },
    {
      ...DOCS,
      "equipes/louange": { membres: [
        { nom: "Ruth K.", uid: "u-ruth", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["musiciens"], joue: ["piano"], lieux: ["Culte Francophone"] },
        { nom: "Paul W.", uid: "u-paul", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["presidence"] },
        { nom: "Daniela W.", uid: "u-daniela", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["choristes"] },
      ], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
      "users/u-ruth": { ...DOCS["users/u-ruth"], serviceRoles: { "Culte Francophone": ["musicien"] } },
      "users/u-paul": {
        email: "paul@example.com", firstName: "Paul", lastName: "W.", planningName: "Paul W.",
        serviceRoles: { "Culte Francophone": ["presidence"] }, annonces: [], notify: [], equipes: false,
      },
      "users/u-daniela": {
        email: "daniela@example.com", firstName: "Daniela", lastName: "W.", planningName: "Daniela W.",
        serviceRoles: { "Culte Francophone": ["chanteur"] }, annonces: [], notify: [], equipes: false,
      },
    },
    "/equipes",
  );
  await page.getByRole("button", { name: "Musiciens" }).click();
  const vue = page.getByTestId(info.project.name === "telephone" ? "matrice-cartes" : "matrice-table");
  await expect(vue).toContainText("Ruth K.");
  await expect(vue).toContainText("Piano");
  await expect(vue).not.toContainText("Paul W.");
  await expect(vue).not.toContainText("Daniela W.");
  await expect(vue).not.toContainText(/Présidence|Choriste/);
});

test("中文 : les noms d'équipe sont traduits, les noms de personnes ne le sont pas", async ({ page }) => {
  await simulerSheets(page);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, { uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K." }, DOCS, "/equipes");
  const carte = page.getByTestId("equipe-da");
  await expect(carte).toContainText("美工组");
  await expect(carte).not.toContainText("TEAM DA");
  // Une seule graphie pour les personnes et pour la mention libre.
  await expect(carte).toContainText("Charlie L.");
  await expect(page.getByTestId("equipe-theologie")).toContainText("Orga/Inscriptions");
});

// Retours du 06/10/2026 : l'onglet Import est retiré ; le bouton reste, au bas de l'Organigramme.
test("admin : « Recalculer depuis l'organigramme » repose équipes et référents des profils existants (lot U6, R4)", async ({ page }) => {
  await simulerSheets(page);
  const envois: unknown[] = [];
  await page.route("**/api/equipes/rattachement", (route) => {
    envois.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 12 }) });
  });
  await signInAs(page, { uid: "admin1", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C." }, DOCS, "/back-office/equipes");
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  // Agencement v18 (B8) : dans l'en-tête ; son aide dans l'infobulle du bouton et, relecture de
  // T5, dans la fenêtre du site qui le confirme (au toucher, l'infobulle n'existe pas).
  const bouton = page.getByRole("button", { name: "Recalculer depuis l'organigramme" });
  await expect(bouton).toHaveAttribute("title", /réunions et les tâches de leur équipe/);
  await bouton.click();
  const fenetre = page.getByRole("alertdialog");
  await expect(fenetre).toContainText(/réunions et les tâches de leur équipe/);
  await fenetre.getByRole("button", { name: "Recalculer", exact: true }).click();
  await expect(page.getByText("12 profils mis à jour.")).toBeVisible();
  expect(envois).toEqual([{ tous: true }]);
});

// « Décocher » un pôle hors organigramme (D10) est parti avec la carte « Pôles » de Personnes (lot 1 du
// chantier « équipes et groupes », EQ26, EQ29) : voir tests/equipes-coordination.spec.ts.
