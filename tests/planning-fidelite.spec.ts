import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  GRILLES, GRILLE_FIDELITE, completerMusiciensFidelite, grilleDe,
} from "../src/lib/planning/grilles";
import { PLANNINGS_APP } from "../src/lib/planning/grille";
import { propositions, type CompteDuPlanning } from "../src/lib/planning/choisir";
import { GRILLES_DU_SERVICE, ceDimanche, seancesDesServices } from "../src/lib/tableauDeBord/donnees";

// Lot F (docs/spec-retouches-v18.md, D24 à D27) : Fidélité, un seul planning. Tranche F1-F2 :
// Guitariste et Batterie rejoignent le planning du groupe ; le planning des musiciens disparaît
// des pages, et ses noms sont repris à la lecture (grille de l'app, puis onglet `Fidélité_Musicien`).

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
    ["2026-10-04", "Ancien C.", "Autre Piano", "", ""],
  ];
  expect(completerMusiciensFidelite(fidelite, musiciens)).toEqual([
    // Un dimanche des seuls musiciens : sa ligne, avec leurs noms seulement (ni présidence, ni piano).
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
