import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/fakeSession";
import { parseCSV } from "../src/lib/planning/sheets";
import type { PlanningData } from "../src/lib/planning/names";
import { EQUIPES, parseOrganigramme, polesDesEquipes, rattacherNoms } from "../src/lib/equipes/organigramme";
import { COLONNES_MUSICIENS, matriceMusiciens, type ProfilMusicien } from "../src/lib/equipes/musiciens";
import { canEditerEquipes, canVoirEquipes } from "../src/lib/access";
import type { MembreEquipe } from "../src/types/equipe";

// Lot 16 « Organigramme, source des pôles » (docs/spec-organigramme.md).
// Le parseur et la matrice sont des fonctions pures : on les mesure sur une
// copie figée de l'onglet ORGANIGRAMME (tests/fixtures/organigramme.csv),
// jamais sur le réseau.

const LIGNES = parseCSV(
  readFileSync(path.join(process.cwd(), "tests/fixtures/organigramme.csv"), "utf8"),
);

const parse = () => parseOrganigramme(LIGNES);

/** Membres d'une équipe du résultat de parse (tableau vide si absente). */
function membres(id: string): MembreEquipe[] {
  return parse().equipes.find((e) => e.id === id)?.membres ?? [];
}

const nomsDe = (id: string) => membres(id).map((m) => m.nom);

// ── Parseur ─────────────────────────────────────────────────────────────────

test("parseur : les 13 équipes du Sheet, dans l'ordre, avec leur sous-titre", () => {
  const { equipes } = parse();
  expect(equipes.map((e) => e.id)).toEqual([
    "orga", "comite-franco", "da", "medias", "developpement", "regie", "traduction",
    "theologie", "evenementiel", "decoration", "accueil-j1", "louange", "edd",
  ]);
  expect(EQUIPES.map((e) => e.id)).toEqual(equipes.map((e) => e.id));
  expect(EQUIPES.find((e) => e.id === "da")?.soustitre).toBe("Direction Artistique");
  expect(EQUIPES.find((e) => e.id === "edd")?.soustitre).toBe("École du Dimanche");
  // Un bloc n'empiète pas sur son voisin de droite.
  expect(nomsDe("da")).toEqual(["Charlie L.", "Christelle C.", "Justine C."]);
  expect(nomsDe("medias")).toEqual(["Daniela W.", "Wendy C.", "Yawin C.", "Esther C."]);
});

test("parseur : TEAM MUSICIENS n'est pas une équipe et ne laisse aucun membre", () => {
  const { equipes, inconnues } = parse();
  expect(equipes.map((e) => e.id)).not.toContain("musiciens");
  expect(inconnues).toEqual([]);
  // La matrice est saisie à la main dans le Sheet : aucun de ses noms ne doit
  // atterrir dans une équipe.
  const tous = equipes.flatMap((e) => e.membres.map((m) => m.nom));
  expect(tous).not.toContain("Hewei");
  expect(tous).not.toContain("Enzo L.");
  expect(tous).not.toContain("Nom");
});

test("parseur : « (en essai) » devient un booléen, pas un bout de nom", () => {
  const justine = membres("da").find((m) => m.nom === "Justine C.");
  expect(justine).toBeTruthy();
  expect(justine!.essai).toBe(true);
  expect(justine!.mention).toBe("");
  // Deux espaces avant « (en essai) » dans le Sheet.
  const maelice = membres("louange").find((m) => m.nom === "Maëlice D.");
  expect(maelice?.essai).toBe(true);
  expect(membres("da").find((m) => m.nom === "Charlie L.")?.essai).toBe(false);
});

test("parseur : la mention après le tiret, et « Réf… » qui fait le référent", () => {
  const charlie = membres("da").find((m) => m.nom === "Charlie L.");
  expect(charlie?.mention).toBe("Référente");
  expect(charlie?.referent).toBe(true);
  const christelle = membres("theologie").find((m) => m.nom === "Christelle C.");
  expect(christelle?.mention).toBe("Orga/Inscriptions");
  expect(christelle?.referent).toBe(false);
  expect(membres("orga").find((m) => m.nom === "Stéphane Z.")?.mention).toBe("Prés. Paix");
});

test("parseur : le référent collé à l'en-tête de TEAM LOUANGE et de TEAM EDD", () => {
  const jonathan = membres("louange")[0];
  expect(jonathan.nom).toBe("Jonathan Z.");
  expect(jonathan.referent).toBe(true);
  expect(membres("edd")[0]).toMatchObject({ nom: "Alice Q.", referent: true });
  // Le nom de l'équipe ne reste pas collé au référent.
  expect(nomsDe("louange")).not.toContain("TEAM LOUANGE (FRANCO / INTER)");
});

test("parseur : les sous-colonnes de LOUANGE et EDD, et leurs intertitres jamais pris pour des noms", () => {
  const louange = membres("louange");
  expect(louange.find((m) => m.nom === "Christelle C.")?.groupe).toBe("Guitaristes");
  expect(louange.find((m) => m.nom === "Éloïse L.")?.groupe).toBe("Guitaristes");
  expect(louange.find((m) => m.nom === "Chloé W.")?.groupe).toBe("Batteu(r/se)");
  expect(louange.find((m) => m.nom === "Daniela W.")?.groupe).toBe("Choristes");
  expect(louange.map((m) => m.nom)).not.toContain("Pianistes");
  const edd = membres("edd");
  expect(edd.find((m) => m.nom === "Daniel Y.")?.groupe).toBe("Professeurs louange");
  expect(edd.find((m) => m.nom === "Yiyi C.")?.groupe).toBe("Cajon");
  expect(edd.map((m) => m.nom)).not.toContain("Professeurs cours");
  // Une équipe sans sous-colonnes n'invente pas de groupe.
  expect(membres("da").every((m) => m.groupe === "")).toBe(true);
});

test("parseur : une équipe inconnue est signalée, jamais créée", () => {
  const inventees = [
    ["TEAM XYZ — Ce qu'on n'a pas prévu", "", ""],
    ["Untel B.", "", ""],
  ];
  const { equipes, inconnues } = parseOrganigramme(inventees);
  expect(equipes).toEqual([]);
  expect(inconnues).toEqual(["TEAM XYZ — Ce qu'on n'a pas prévu"]);
});

test("parseur : deux passages du même CSV donnent le même résultat", () => {
  expect(parseOrganigramme(LIGNES)).toEqual(parseOrganigramme(LIGNES));
});

// ── Rattachement d'un nom du Sheet à un compte ──────────────────────────────

const PROFILS = [
  { uid: "u-charlie", planningName: "Charlie L.", firstName: "Charlie", lastName: "L." },
  { uid: "u-stephane", planningName: "Stéphane Z.", firstName: "Stéphane", lastName: "Z." },
  { uid: "u-ketty", planningName: "Ketty S.", firstName: "Ketty", lastName: "S." },
];

test("rattachement : le nom de planning, puis le prénom seul quand il ne désigne qu'un compte", () => {
  const trouve = rattacherNoms(["Charlie L.", "Stéphane", "Kitty S."], PROFILS);
  expect(trouve["Charlie L."]).toBe("u-charlie");
  // « Stéphane — Référent » de TEAM ÉVÉNEMENTIEL : prénom seul, un seul compte.
  expect(trouve["Stéphane"]).toBe("u-stephane");
  // Faute d'orthographe du Sheet (« Kitty » contre « Ketty ») : rien n'est deviné.
  expect(trouve["Kitty S."]).toBeUndefined();
});

test("rattachement : un prénom porté par deux comptes ne rattache rien", () => {
  const deux = [...PROFILS, { uid: "u-stephane2", planningName: "Stéphane M.", firstName: "Stéphane", lastName: "M." }];
  expect(rattacherNoms(["Stéphane"], deux)["Stéphane"]).toBeUndefined();
  // Le nom complet reste sans ambiguïté.
  expect(rattacherNoms(["Stéphane Z."], deux)["Stéphane Z."]).toBe("u-stephane");
});

// ── Pôles donnés par les équipes ────────────────────────────────────────────

const membre = (uid: string): MembreEquipe =>
  ({ nom: "X", uid, mention: "", referent: false, essai: false, groupe: "" });

test("pôles : l'appartenance à une équipe donne son pôle, en sortir le retire", () => {
  const equipes = [
    { id: "da", pole: "da" as const, membres: [membre("u1")] },
    { id: "medias", pole: "media" as const, membres: [membre("u2")] },
    { id: "decoration", pole: "da" as const, membres: [membre("u1")] },
  ];
  expect(polesDesEquipes("u1", equipes)).toEqual(["da"]);
  expect(polesDesEquipes("u2", equipes)).toEqual(["media"]);
  expect(polesDesEquipes("u3", equipes)).toEqual([]);
  expect(polesDesEquipes("", equipes)).toEqual([]);
});

test("pôles : LOUANGE, RÉGIE et EDD n'écrivent rien — « louange » reste dérivé des rôles de service", () => {
  for (const id of ["louange", "regie", "edd"]) {
    expect(EQUIPES.find((e) => e.id === id)?.pole).toBeNull();
  }
  const equipes = [{ id: "louange", pole: null, membres: [membre("u1")] }];
  expect(polesDesEquipes("u1", equipes)).toEqual([]);
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
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], fideliteMusic: [],
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
    serviceRoles: {}, annonces: [], notify: [], poles: ["da"], equipes: false,
  },
  "users/u-ruth": {
    email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.",
    serviceRoles: {}, annonces: [], notify: [], poles: [], equipes: false,
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

test("page Équipes : le droit « Équipes » ajoute un membre et fait recalculer les pôles", async ({ page }) => {
  await simulerSheets(page);
  let appels = 0;
  let envoye: { uids?: string[] } = {};
  await page.route("**/api/equipes/poles", (route) => {
    appels++;
    envoye = route.request().postDataJSON() as { uids?: string[] };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) });
  });
  const db = await signInAs(
    page,
    { uid: "u-ref", email: "referent@example.com", firstName: "Lydia", lastName: "H.", equipes: true },
    DOCS,
    "/equipes",
  );
  const carte = page.getByTestId("equipe-da");
  await carte.getByRole("button", { name: "Modifier" }).click();
  await carte.getByPlaceholder("Ajouter un membre").fill("Ruth");
  await carte.getByRole("button", { name: /Ruth K\./ }).click();
  await carte.getByRole("button", { name: "Enregistrer" }).click();
  // Un signe à l'écran d'abord : l'édition se referme et le nom apparaît.
  await expect(carte.getByRole("button", { name: /Ruth K\./ })).toBeVisible();
  await expect(carte.getByRole("button", { name: "Modifier" })).toBeVisible();
  const ecrit = db.doc("equipes/da") as { membres: MembreEquipe[] } | undefined;
  expect(ecrit?.membres.filter((m) => m.uid === "u-ruth")).toHaveLength(1);
  // Les anciens membres restent, et le pôle de l'équipe ne bouge pas.
  expect(ecrit?.membres.map((m) => m.nom)).toEqual(["Charlie L.", "Justine C.", "Ruth K."]);
  expect(appels).toBe(1);
  expect(envoye.uids).toEqual(expect.arrayContaining(["u-charlie", "u-ruth"]));
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
  await simulerSheets(page, {
    Franco_Louange: '"12/10","","","","Ruth K.","","","","","","",""',
  });
  await signInAs(
    page,
    {
      uid: "u1", email: "membre@example.com", firstName: "Ruth", lastName: "K.",
      planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] },
    },
    DOCS,
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

test("admin : le bouton d'import rend compte de ce qu'il n'a pas su rattacher", async ({ page }) => {
  await simulerSheets(page);
  await page.route("**/api/equipes/importer", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true, equipes: 13, membres: 96, rattaches: 81,
        nonRattaches: ["Kitty S."], inconnues: [], polesHorsOrganigramme: [{ uid: "u-x", nom: "Untel B.", poles: ["orga"] }],
      }),
    }),
  );
  page.on("dialog", (d) => d.accept());
  await signInAs(page, { uid: "admin1", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C." }, DOCS, "/admin");
  await page.getByRole("button", { name: /Équipes/ }).click();
  await page.getByRole("button", { name: "Importer l'organigramme du Sheet" }).click();
  await expect(page.getByText(/13 équipes/)).toBeVisible();
  await expect(page.getByText("Kitty S.")).toBeVisible();
  await expect(page.getByText("Untel B.")).toBeVisible();
});
