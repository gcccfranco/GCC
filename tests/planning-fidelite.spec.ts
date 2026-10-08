import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estTelephone, verifierAgencement } from "./helpers/agencement";
import {
  GRILLES, GRILLE_FIDELITE, completerMusiciensFidelite, grilleDe, pianistesQuiDifferent,
} from "../src/lib/planning/grilles";
import {
  collectPlanningNames, deriveServiceRolesFromPlanning, findMyServices, servantsForDate, type PlanningData,
} from "../src/lib/planning/names";
import { reminderServicesFor } from "../src/lib/push/reminderMessage";
import { equipeDuService } from "../src/lib/setlist/equipeDuService";
import { MODELES, modeleDe, pagesExport } from "../src/lib/planning/modeles";
import { PLANNINGS_APP } from "../src/lib/planning/grille";
import { propositions, type CompteDuPlanning } from "../src/lib/planning/choisir";
import { GRILLES_DU_SERVICE, ceDimanche, seancesDesServices } from "../src/lib/tableauDeBord/donnees";

// Lot F (docs/spec-retouches-v18.md, D24 à D27) : Fidélité, un seul planning. Tranche F1-F2 :
// Guitariste et Batterie rejoignent le planning du groupe ; le planning des musiciens disparaît
// des pages, et ses noms sont repris à la lecture (grille de l'app, puis onglet `Fidélité_Musicien`).
// Tranche F3-F5 : le pianiste du groupe seul (D26) et le relevé des dimanches qui diffèrent ;
// Mes services, rappels et recherche par nom lisent le planning Fidélité ; le modèle d'export.

// ─── F1 · les colonnes, et plus de planning des musiciens ────────────────────

test("F1 · Fidélité : Date · Présidence · Orateur · Thème · Pianiste · Guitariste · Batterie", () => {
  expect(GRILLE_FIDELITE.colonnes.map((c) => [c.cle, c.index])).toEqual([
    ["presidence", 1], ["orateur", 2], ["theme", 3], ["pianiste", 4], ["guitariste", 5], ["batterie", 6],
  ]);
  expect(GRILLE_FIDELITE.colonnes.find((c) => c.cle === "batterie")?.optionnelle, "Batterie facultative, comme la percussion").toBe(true);
  expect(GRILLE_FIDELITE.colonnes.find((c) => c.cle === "guitariste")?.i18n).toBe("planning.roles.guitariste");
});

test("F1 · le planning des musiciens n'est plus une grille du planning (pages, droits, tableau de bord)", () => {
  expect(GRILLES.map((g) => g.key)).not.toContain("fideliteMusiciens");
  expect(PLANNINGS_APP, "plus de droit d'écriture « musiciens » à cocher").not.toContain("fideliteMusiciens");
  expect(GRILLES.map((g) => g.label)).not.toContain("Groupe Fidélité musiciens");
  expect(GRILLES_DU_SERVICE["Groupe Fidélité"].map((g) => g.key)).toEqual(["fidelite"]);
  // Encore lisible, pour la reprise des noms (F2) : sa définition reste connue.
  expect(grilleDe("fideliteMusiciens")?.colonnes.map((c) => c.cle)).toEqual(["presidence", "piano", "guitare", "batterie"]);
});

test("F1 · tableau de bord : un seul bloc Fidélité, Guitariste et Batterie compris", () => {
  const rows = {
    fidelite: [["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "Guitare G.", "Batteur B."]],
    fideliteMusiciens: [["2026-09-20", "Ancien A.", "Autre Piano", "Guitare G.", "Batteur B."]],
  };
  const blocs = ceDimanche(rows, [], ["Groupe Fidélité"], "2026-09-20");
  expect(blocs).toHaveLength(1);
  expect(blocs[0].lignes.map((l) => [l.cle, l.valeur])).toEqual([
    ["presidence", "Ancien A."], ["orateur", "Orateur O."], ["theme", "Actes"], ["pianiste", "Pianiste P."],
    ["guitariste", "Guitare G."], ["batterie", "Batteur B."],
  ]);
  expect(seancesDesServices(rows, ["Groupe Fidélité"]).map((s) => s.date)).toEqual(["2026-09-20"]);
});

test("F1 · « Choisir » : un musicien du Groupe Fidélité est proposé d'abord en Guitariste et en Batterie", () => {
  const comptes: CompteDuPlanning[] = [
    { nom: "Ancien A.", prenom: "Ancien", nomDeFamille: "A", serviceRoles: { "Groupe Fidélité": ["presidence"] } },
    { nom: "Guitare G.", prenom: "Guitare", nomDeFamille: "G", serviceRoles: { "Groupe Fidélité": ["musicien"] } },
  ];
  for (const colonne of ["guitariste", "batterie"]) {
    expect(propositions(GRILLE_FIDELITE, colonne, comptes, [], "")[0], colonne).toEqual({ nom: "Guitare G.", duRole: true });
  }
});

// ─── F2 · reprise des noms à la lecture (pur) ────────────────────────────────

test("F2 · Guitariste et Batterie : ceux du planning Fidélité, sinon ceux du planning des musiciens", () => {
  const fidelite = [
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P."],
    ["2026-09-27", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q.", "Guitare J.", ""],
  ];
  const musiciens = [
    ["2026-09-13", "", "", "Guitare K.", "Batteur C."],
    ["2026-09-20", "Ancien A.", "Autre Piano", "Guitare L.", "Batteur B."],
    ["2026-09-27", "Ancien B.", "", "Guitare H.", "Batteur D."],
    ["2026-10-04", "", "Autre Piano", "", ""],
  ];
  expect(completerMusiciensFidelite(fidelite, musiciens)).toEqual([
    // Un dimanche des seuls musiciens : sa ligne, avec leurs noms seulement (jamais le piano).
    ["2026-09-13", "", "", "", "", "Guitare K.", "Batteur C."],
    // Le pianiste reste celui du groupe (D26).
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "Guitare L.", "Batteur B."],
    // Une case remplie dans le planning Fidélité l'emporte ; une vide est reprise.
    ["2026-09-27", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q.", "Guitare J.", "Batteur D."],
  ]);
  expect(fidelite[0], "la ligne d'origine reste intacte").toHaveLength(5);
  expect(completerMusiciensFidelite(fidelite, []), "sans musiciens : la grille, aux sept cases").toEqual([
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "", ""],
    ["2026-09-27", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q.", "Guitare J.", ""],
  ]);
});

test("F2 · une case vidée dans l'app reste vide : seule une case jamais écrite est reprise", () => {
  // Les lignes telles que l'app les lit : un champ absent du document et un champ écrit à "" donnent
  // tous deux "" ; `ecrites` (date|clé) dit lesquels sont dans le document.
  const fidelite = [
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "", ""],
    ["2026-09-27", "", "Orateur R.", "Romains", "Pianiste Q.", "", ""],
  ];
  const musiciens = [
    ["2026-09-20", "Ancien A.", "", "Guitare L.", "Batteur B."],
    ["2026-09-27", "Ancien B.", "", "Guitare H.", "Batteur D."],
  ];
  const ecrites = new Set(["2026-09-20|guitariste", "2026-09-27|presidence", "2026-09-27|batterie"]);
  expect(completerMusiciensFidelite(fidelite, musiciens, ecrites)).toEqual([
    // 20/09 : la guitare a été vidée, elle ne revient pas ; la batterie, jamais écrite, est reprise.
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "", "Batteur B."],
    // 27/09 : présidence et batterie vidées ; la guitare, jamais écrite, est reprise.
    ["2026-09-27", "", "Orateur R.", "Romains", "Pianiste Q.", "Guitare H.", ""],
  ]);
});

test("F2 · la présidence du planning des musiciens est reprise quand celle du groupe est vide", () => {
  const fidelite = [
    ["2026-09-20", "", "Orateur O.", "Actes", "Pianiste P."],
    ["2026-09-27", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q."],
  ];
  const musiciens = [
    ["2026-09-13", "Ancien C.", "Autre Piano", "Guitare K.", ""],
    ["2026-09-20", "Ancien A.", "", "", ""],
    ["2026-09-27", "Ancien D.", "", "", ""],
    ["2026-10-04", "Ancien E.", "Autre Piano", "", ""],
  ];
  const lignes = completerMusiciensFidelite(fidelite, musiciens);
  expect(lignes).toEqual([
    // Un dimanche des seuls musiciens garde sa présidence (jamais le piano).
    ["2026-09-13", "Ancien C.", "", "", "", "Guitare K.", ""],
    ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "", ""],
    // Celle du groupe l'emporte.
    ["2026-09-27", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q.", "", ""],
    ["2026-10-04", "Ancien E.", "", "", "", "", ""],
  ]);
  // Comme avant le lot : l'équipe de la setlist, Mes services et les rappels ont la présidence.
  const data = { ...VIDE, fidelite: lignes };
  expect(equipeDuService(data, { category: "Groupe Fidélité", date: "2026-09-13" })[0]).toEqual(["planning.roles.presidence", "Ancien C."]);
  expect(findMyServices(data, "Ancien E.").map((e) => `${e.date} ${e.service}`)).toEqual(["2026-10-04 Groupe Fidélité"]);
  expect(servantsForDate(data, "2026-09-20").map((s) => s.name)).toContain("Ancien A.");
});

// ─── F1-F2 · la page des groupes (Back-Office ouvert) ────────────────────────

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

const SHEETS: Record<string, string> = {
  "Fidélité_T3": csv([
    ["DATE", "Présidence", "Orateur", "Thème", "Pianiste"],
    ["20/09", "Ancien A.", "Orateur O.", "Actes", "Pianiste P."],
    ["27/09", "Ancien B.", "Orateur R.", "Romains", "Pianiste Q."],
  ]),
  "Fidélité_Musicien": csv([
    ["", "DATE", "Présidence", "Piano", "Guitare", "Batterie"],
    ["", "20/09", "Ancien A.", "Autre Piano", "Guitare G.", "Batteur B."],
    ["", "27/09", "Ancien B.", "", "Guitare H.", ""],
  ]),
};

// La grille de l'app : le 27/09 a sa guitare dans le planning Fidélité ; le planning des
// musiciens de l'app porte le 13/09 (absent du Sheet) et passe devant le Sheet le 20/09.
const DOCS = {
  "plannings/fidelite/dimanches/2026-09-27": {
    date: "2026-09-27", presidence: "Ancien B.", orateur: "Orateur R.", theme: "Romains", pianiste: "Pianiste Q.", guitariste: "Guitare J.",
  },
  "plannings/fideliteMusiciens/dimanches/2026-09-13": { date: "2026-09-13", presidence: "", piano: "", guitare: "Guitare K.", batterie: "Batteur C." },
  "plannings/fideliteMusiciens/dimanches/2026-09-20": { date: "2026-09-20", presidence: "Ancien A.", piano: "Autre Piano", guitare: "Guitare L.", batterie: "Batteur B." },
};

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Membre M." };
const RESPONSABLE: FakeProfile = {
  uid: "uid-resp", email: "resp@example.com", firstName: "Responsable", lastName: "F.", planningName: "Responsable F.", plannings: ["fidelite"],
};

async function ouvrir(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
  });
  const db = await signInAs(page, who, DOCS, to);
  await page.getByRole("tab", { name: "Fidélité", exact: true }).click();
  await expect(page.locator('[data-grille="fidelite"]')).toBeVisible();
  return db;
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });
const colonnesDe = (page: Page, date: string) =>
  page.locator(`[data-case^="${date}|"]`).filter({ visible: true }).evaluateAll((els) => els.map((e) => e.getAttribute("data-case")!.split("|")[1]));

test("F1-F2 · Fidélité : un seul planning, sept colonnes, les noms des musiciens repris", async ({ page }) => {
  await ouvrir(page, MEMBRE, "/planning/groupes");
  await expect(page.getByRole("button", { name: /Planning (groupe|musiciens)/ }), "plus de pilules Groupe · Musiciens").toHaveCount(0);
  await expect(page.locator('[data-grille="fideliteMusiciens"]')).toHaveCount(0);

  await expect(laCase(page, "2026-09-20", "guitariste")).toContainText("Guitare L.");
  expect(await colonnesDe(page, "2026-09-20")).toEqual(["presidence", "orateur", "theme", "pianiste", "guitariste", "batterie"]);
  // 20/09 : le pianiste du groupe ; la guitare de la grille des musiciens de l'app, devant le Sheet.
  await expect(laCase(page, "2026-09-20", "pianiste")).toHaveText("Pianiste P.");
  await expect(laCase(page, "2026-09-20", "batterie")).toHaveText("Batteur B.");
  await expect(page.getByText("Autre Piano"), "le piano du planning des musiciens n'est pas affiché").toHaveCount(0);
  // 27/09 : la guitare écrite dans le planning Fidélité l'emporte ; la batterie vide le reste.
  await expect(laCase(page, "2026-09-27", "guitariste")).toHaveText("Guitare J.");
  // (Une case vide s'écrit « — » ; sur téléphone, elle n'est pas affichée en lecture.)
  await expect(laCase(page, "2026-09-27", "batterie").filter({ hasText: /\p{L}/u })).toHaveCount(0);
  // 13/09 : un dimanche que seule la grille des musiciens portait.
  await expect(laCase(page, "2026-09-13", "guitariste")).toHaveText("Guitare K.");
  await expect(laCase(page, "2026-09-13", "batterie")).toHaveText("Batteur C.");
});

/** La rangée de la grille (`BarreDeGrille`) et le défilement horizontal de la grille en grand. */
const barre = (page: Page) => page.getByTestId("barre-grille").filter({ visible: true });
const debordementDeLaGrille = (page: Page) =>
  page.getByTestId("grille-defilement").filter({ visible: true }).evaluateAll((els) => els.map((e) => e.scrollWidth - e.clientWidth));

for (const [ou, qui, vers] of [
  ["App", MEMBRE, "/planning/groupes"],
  ["Back-Office, en modification", RESPONSABLE, "/back-office/planning/groupes"],
] as const) {
  test(`F1 · ${ou} : Fidélité à sept colonnes tient dans l'agencement commun (capture)`, async ({ page }, info) => {
    await ouvrir(page, qui, vers);
    await expect(laCase(page, "2026-09-20", "guitariste")).toContainText("Guitare L.");
    await verifierAgencement(page, { premierBloc: barre(page), contenu: page.locator('[data-grille="fidelite"]').filter({ visible: true }) });
    // En grand (table), les six colonnes de noms tiennent sans défilement ; sur téléphone, une carte par dimanche.
    if (!estTelephone(info)) expect(await debordementDeLaGrille(page), "la table de Fidélité ne défile pas en largeur").toEqual([0]);
    await page.screenshot({ path: info.outputPath(`fidelite-${vers.startsWith("/back-office") ? "bo" : "app"}.png`), fullPage: true, animations: "disabled" });
  });
}

test("F2 · une modification écrit dans le planning Fidélité, jamais dans celui des musiciens", async ({ page }) => {
  const db = await ouvrir(page, RESPONSABLE, "/back-office/planning/groupes");
  await laCase(page, "2026-09-20", "guitariste").getByRole("button").click();
  await page.getByRole("button", { name: "Écrire un nom sans compte…" }).click();
  const champ = page.getByRole("textbox", { name: "Guitariste", exact: true });
  await champ.fill("Guitare M.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-20", "guitariste")).toContainText("Guitare M.");

  const doc = db.doc("plannings/fidelite/dimanches/2026-09-20")!;
  expect(doc.guitariste).toBe("Guitare M.");
  expect(doc.pianiste, "les autres cases sont recopiées, le pianiste du groupe").toBe("Pianiste P.");
  expect(doc.batterie, "la batterie reprise est recopiée avec la ligne").toBe("Batteur B.");
  expect(db.writes.filter((w) => w.path.startsWith("plannings/fideliteMusiciens")), "aucune migration écrite").toEqual([]);
});

test("F2 · vider une guitare reprise du planning des musiciens : elle ne revient pas à la relecture", async ({ page }) => {
  const db = await ouvrir(page, RESPONSABLE, "/back-office/planning/groupes");
  await expect(laCase(page, "2026-09-20", "guitariste")).toContainText("Guitare L.");
  await laCase(page, "2026-09-20", "guitariste").getByRole("button").click();
  await page.getByRole("button", { name: "Vider la case" }).click();
  await expect.poll(() => db.doc("plannings/fidelite/dimanches/2026-09-20")?.guitariste, "la case vidée est écrite").toBe("");

  await page.reload();
  await page.getByRole("tab", { name: "Fidélité", exact: true }).click();
  // La grille relue (le Sheet simulé, pas les données de secours) : le pianiste du groupe est là.
  await expect(laCase(page, "2026-09-20", "pianiste")).toContainText("Pianiste P.");
  await expect(laCase(page, "2026-09-20", "batterie"), "la batterie reprise, recopiée avec la ligne, reste").toContainText("Batteur B.");
  await expect(laCase(page, "2026-09-20", "guitariste")).not.toContainText("Guitare L.");
});

// ─── F3 · le pianiste du groupe fait foi (D26) ───────────────────────────────

test("F3 · relevé : les dimanches où le pianiste du groupe et celui des musiciens diffèrent", () => {
  const groupe = [
    ["2026-09-06", "Ancien A.", "", "", "Pianiste P."],
    ["2026-09-13", "Ancien A.", "", "", "Pianiste P."],
    ["2026-09-20", "Ancien B.", "", "", ""],
    ["2026-09-27", "Ancien B.", "", "", "pianiste p"],
    ["2026-10-18", "Ancien B.", "", "", "Pianiste Éloé"],
  ];
  const musiciens = [
    ["2026-09-06", "", "Pianiste P.", "", ""],
    ["2026-09-13", "", "Autre Piano", "Guitare G.", ""],
    ["2026-09-20", "", "Autre Piano", "", ""],
    ["2026-09-27", "", "Pianiste P.", "", ""],
    ["2026-10-04", "", "Autre Piano", "", ""],
    ["2026-10-11", "", "", "Guitare G.", ""],
    // Aux accents près : le même pianiste (la classe des accents est écrite en échappements).
    ["2026-10-18", "", "pianiste eloe", "", ""],
  ];
  expect(pianistesQuiDifferent(groupe, musiciens)).toEqual([
    { date: "2026-09-13", groupe: "Pianiste P.", musiciens: "Autre Piano" },
    // Le groupe sans pianiste : celui des musiciens ne sera plus affiché.
    { date: "2026-09-20", groupe: "", musiciens: "Autre Piano" },
    { date: "2026-10-04", groupe: "", musiciens: "Autre Piano" },
  ]);
});

const VIDE: PlanningData = {
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
  edd: {} as PlanningData["edd"], campus: [], intergroupe: [], interfranco: [],
};

test("F3 · l'équipe d'une setlist de Fidélité : présidence, pianiste, guitare, batterie et orateur du planning Fidélité", () => {
  const data = { ...VIDE, fidelite: [["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "Guitare G.", "Batteur B."]] };
  expect(equipeDuService(data, { category: "Groupe Fidélité", date: "2026-09-20" })).toEqual([
    ["planning.roles.presidence", "Ancien A."],
    ["planning.roles.piano", "Pianiste P."],
    ["planning.roles.guitare", "Guitare G."],
    ["planning.roles.batterie", "Batteur B."],
    ["planning.roles.orateur", "Orateur O."],
  ]);
  expect(equipeDuService(data, { category: "Groupe Fidélité", date: "2026-09-27" })).toEqual([]);
});

test("F3 · « Ce dimanche » : les musiciens de Fidélité sont le pianiste du groupe, la guitare et la batterie", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
  });
  await signInAs(page, MEMBRE, DOCS, "/planning");
  const fidelite = page.getByTestId("ligne-groupe").filter({ hasText: "Fidélité" }).filter({ visible: true }).first();
  await expect(fidelite).toContainText("Pianiste P.");
  await expect(fidelite).toContainText("Guitare L.");
  await expect(fidelite).toContainText("Batteur B.");
  await expect(fidelite, "le piano du planning des musiciens n'est plus affiché").not.toContainText("Autre Piano");
  await page.getByTestId("ligne-groupe").first().locator("..").screenshot({ path: test.info().outputPath("ce-dimanche-groupes.png") });
});

// ─── F4 · Mes services, rappels, recherche par nom ───────────────────────────

test("F4 · guitaristes et batteurs de Fidélité : Mes services, rappels, noms du planning, rôles du profil", () => {
  const data = {
    ...VIDE,
    fidelite: [
      ["2026-09-20", "Ancien A.", "Orateur O.", "Actes", "Pianiste P.", "Guitare G.", "Batteur B."],
      ["2026-09-27", "Ancien B.", "", "", "", "Guitare G.", ""],
    ],
  };
  expect(findMyServices(data, "Guitare G.").map((e) => `${e.date} ${e.service} ${e.role} ${e.leader}`)).toEqual([
    "2026-09-20 Groupe Fidélité Guitare Ancien A.",
    "2026-09-27 Groupe Fidélité Guitare Ancien B.",
  ]);
  expect(findMyServices(data, "Batteur B.").map((e) => `${e.date} ${e.role}`)).toEqual(["2026-09-20 Batterie"]);
  expect(findMyServices(data, "Pianiste P.").map((e) => `${e.date} ${e.role}`)).toEqual(["2026-09-20 Piano"]);
  expect(reminderServicesFor(data, "Batteur B.", "2026-09-20")).toEqual([{ service: "Groupe Fidélité", roles: ["Batterie"] }]);
  expect(servantsForDate(data, "2026-09-20").filter((s) => s.serviceRole === "musicien").map((s) => s.name)).toEqual([
    "Pianiste P.", "Guitare G.", "Batteur B.",
  ]);
  expect(collectPlanningNames(data)).toEqual(expect.arrayContaining(["Guitare G.", "Batteur B."]));
  expect(deriveServiceRolesFromPlanning(data, "Batteur B.")).toEqual({ "Groupe Fidélité": ["musicien"] });
});

async function mesServicesDe(page: Page, who: FakeProfile) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
  });
  await signInAs(page, who, DOCS, "/mes-services");
}

test("F4 · Mes services d'un guitariste écrit dans le planning Fidélité de l'app", async ({ page }) => {
  await mesServicesDe(page, { uid: "uid-guitare", email: "guitare@example.com", planningName: "Guitare J." });
  await expect(page.getByText("Groupe Fidélité").filter({ visible: true }).first()).toBeVisible();
});

test("F4 · le pianiste du seul planning des musiciens n'a plus de service de Fidélité (D26)", async ({ page }) => {
  await mesServicesDe(page, { uid: "uid-piano", email: "piano@example.com", planningName: "Autre Piano" });
  await expect(page.getByText(/Aucun service à venir/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Groupe Fidélité")).toHaveCount(0);
});

// ─── F5 · le modèle d'export ─────────────────────────────────────────────────

test("F5 · export : le modèle Fidélité à sept colonnes, Batterie facultative ; plus de modèle Fidélité_Musicien", () => {
  expect(MODELES.map((m) => m.onglet)).not.toContain("Fidélité_Musicien");
  expect(modeleDe("fideliteMusiciens")).toBeUndefined();
  const m = modeleDe("fidelite")!;
  expect(m.colonnes.map((c) => c.entete)).toEqual(["DATE", "PRÉSIDENCE", "ORATEUR", "THÈME", "PIANISTE", "GUITARISTE", "BATTERIE"]);
  expect(m.colonnes.find((c) => c.cle === "batterie")?.optionnelle).toBe(true);
  expect(m.orientation).toBe("portrait");
  // Tient en portrait comme Paix avec sa percussion : pas plus large que lui.
  const large = (cles: string) => modeleDe(cles)!.colonnes.reduce((s, c) => s + c.largeur, 0);
  expect(large("fidelite")).toBeLessThanOrEqual(large("paix"));

  const lignes = {
    fidelite: [
      ["2027-01-10", "Ancien A.", "Orateur O.", "", "Pianiste P.", "Guitare G.", ""],
      ["2027-04-11", "Ancien B.", "", "", "", "Guitare G.", "Batteur B."],
    ],
  };
  const page = (rang: number) => pagesExport({ portee: "affiche", annee: 2027, key: "fidelite", rang, lignes })[0];
  const t1 = page(1);
  expect(t1.colonnes.map((c) => c.entete), "sans batterie ce trimestre : pas de colonne").toEqual(["DATE", "PRÉSIDENCE", "ORATEUR", "THÈME", "PIANISTE", "GUITARISTE"]);
  expect(t1.blocs[0].lignes[1].cellules).toEqual(["10/01", "Ancien A.", "Orateur O.", "", "Pianiste P.", "Guitare G."]);
  const t2 = page(2);
  expect(t2.colonnes.map((c) => c.entete).at(-1)).toBe("BATTERIE");
  expect(t2.blocs[0].lignes.find((l) => l.cellules[0] === "11/04")?.cellules.slice(-2)).toEqual(["Guitare G.", "Batteur B."]);
});
