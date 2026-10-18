import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canSaisirAbsence, canVoirAbsencesDeTous, canVoirMotifAbsence, faitDesPlannings } from "../src/lib/access";
import { absenceLe, periodeAbsence, rangerParAbsence } from "../src/lib/planning/choisir";
import type { Absence } from "../src/types/absence";

// SC3 (docs/spec-createur-corbeille-absences.md) : congés et absences. « Mes absences » dans Mon profil
// (en ligne), « Choisir » du planning en grille qui range les absents en dernier (Back-Office), la marque
// « absent » dans la case, les droits en double (access.ts et firestore.rules). Personnes inventées.

const absence = (du: string, au: string, id = "a"): Absence => ({ id, uid: "u", du, au });

// ─── Purs ────────────────────────────────────────────────────────────────────

test.describe("SC3 · fonctions pures", () => {
  test("absenceLe : bornes comprises, hors période → null", () => {
    const l = [absence("2026-10-12", "2026-10-26", "x"), absence("2026-11-02", "2026-11-02", "y")];
    expect(absenceLe(l, "2026-10-12")?.id).toBe("x");
    expect(absenceLe(l, "2026-10-26")?.id).toBe("x");
    expect(absenceLe(l, "2026-10-19")?.id).toBe("x");
    expect(absenceLe(l, "2026-10-11")).toBeNull();
    expect(absenceLe(l, "2026-10-27")).toBeNull();
    expect(absenceLe(l, "2026-11-02")?.id).toBe("y");
    expect(absenceLe([], "2026-10-12")).toBeNull();
  });

  test("rangerParAbsence : deux groupes, l'ordre d'entrée gardé dans chacun", () => {
    const abs = new Map([["Bea", absence("2026-10-12", "2026-10-12")], ["Dan", absence("2026-10-01", "2026-10-30")]]);
    const r = rangerParAbsence([{ nom: "Ana" }, { nom: "Dan" }, { nom: "Bea" }, { nom: "Cyr" }], (n) => abs.get(n) ?? null);
    expect(r.disponibles.map((x) => x.nom)).toEqual(["Ana", "Cyr"]);
    expect(r.absents.map((x) => x.nom)).toEqual(["Dan", "Bea"]);
    expect(r.absents[0].absence.au).toBe("2026-10-30");
  });

  test("periodeAbsence : français et 中文, un jour ou une période", () => {
    expect(periodeAbsence(absence("2026-10-12", "2026-10-26"), "fr")).toBe("absent du 12/10 au 26/10");
    expect(periodeAbsence(absence("2026-10-12", "2026-10-12"), "fr")).toBe("absent le 12/10");
    expect(periodeAbsence(absence("2026-10-12", "2026-10-26"), "zh")).toBe("10月12日至10月26日请假");
    expect(periodeAbsence(absence("2026-10-12", "2026-10-12"), "zh")).toBe("10月12日请假");
  });
});

// ─── Droits et règles ────────────────────────────────────────────────────────

test.describe("SC3 · droits (access.ts) et règles (firestore.rules)", () => {
  const admin = { uid: "uid-admin", email: "tc328829@gmail.com" };
  const membre = { uid: "uid-m", email: "m@example.com" };

  test("faitDesPlannings : membre sans plannings → non ; plannings non vide → oui ; admin → oui", () => {
    expect(faitDesPlannings(membre, { plannings: [] })).toBe(false);
    expect(faitDesPlannings(membre, null)).toBe(false);
    expect(faitDesPlannings(membre, { plannings: ["culte"] })).toBe(true);
    expect(faitDesPlannings(admin, null)).toBe(true);
    expect(faitDesPlannings(null, { plannings: ["culte"] })).toBe(false);
  });

  test("saisir, voir tout le monde, voir le motif", () => {
    expect(canSaisirAbsence(membre, null, "uid-m")).toBe(true);
    expect(canSaisirAbsence(membre, null, "uid-autre")).toBe(false);
    expect(canSaisirAbsence(membre, { plannings: ["culte"] }, "uid-autre")).toBe(true);
    expect(canVoirAbsencesDeTous(membre, null)).toBe(false);
    expect(canVoirAbsencesDeTous(membre, { plannings: ["culte"] })).toBe(true);
    expect(canVoirMotifAbsence(membre, "uid-m")).toBe(true);
    expect(canVoirMotifAbsence(membre, "uid-autre")).toBe(false);
    expect(canVoirMotifAbsence(admin, "uid-autre")).toBe(true);
  });

  test("firestore.rules : absences d'un profil et collection group, par faitDesPlannings()", () => {
    const regles = readFileSync("firestore.rules", "utf8");
    expect(regles).toContain("match /users/{uid}/absences/{id}");
    expect(regles).toContain("match /{chemin=**}/absences/{id}");
    expect(regles).toMatch(/function faitDesPlannings\(\)[^}]*plannings/);
    expect(regles).toMatch(/function absenceValide\(\)/);
    const bloc = regles.slice(regles.indexOf("match /users/{uid}/absences/{id}"));
    expect(bloc.slice(0, 500)).toContain("faitDesPlannings()");
    expect(regles.slice(regles.indexOf("match /{chemin=**}/absences/{id}"))).toContain("allow read: if signedIn() && faitDesPlannings()");
  });
});

// ─── Mon profil › Mes absences ───────────────────────────────────────────────

test.describe("SC3 · Mes absences (Mon profil)", () => {
  const MEMBRE: FakeProfile = { uid: "uid-mia", email: "mia@example.com", firstName: "Mia", lastName: "Z.", planningName: "Mia Z." };
  const RESPONSABLE: FakeProfile = { uid: "uid-resp", email: "resp@example.com", firstName: "Rémi", lastName: "Y.", planningName: "Rémi Y.", plannings: ["culte"] };
  const section = (page: Page) => page.getByRole("region", { name: /Mes absences|我的请假/ });

  async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = {}) {
    await page.clock.setFixedTime(new Date("2026-10-18T10:00:00"));
    return signInAs(page, qui, docs, "/profil");
  }

  test("membre : pas de « Pour qui ? » ; ajouter, annuler si au < du, supprimer ; une absence passée n'est pas listée", async ({ page }) => {
    const db = await ouvrir(page, MEMBRE, {
      "users/uid-mia/absences/passee": { du: "2026-10-01", au: "2026-10-05" },
      "users/uid-mia/absences/futur": { du: "2026-11-02", au: "2026-11-02", motif: "Mariage" },
    });
    const s = section(page);
    await expect(s.getByText("Le 02/11/2026")).toBeVisible();
    await expect(s.getByText("Mariage")).toBeVisible();
    await expect(s.getByText("01/10/2026")).toHaveCount(0);
    await expect(s.getByLabel("Pour qui ?")).toHaveCount(0);

    await s.getByRole("button", { name: "Ajouter une absence" }).click();
    const enregistrer = s.getByRole("button", { name: "Enregistrer", exact: true });
    await expect(enregistrer).toBeDisabled();
    await s.getByLabel("Du", { exact: true }).fill("2026-12-20");
    await expect(s.getByLabel("Au", { exact: true })).toHaveValue("2026-12-20");
    await s.getByLabel("Au", { exact: true }).fill("2026-12-10");
    await expect(enregistrer).toBeDisabled();
    await s.getByLabel("Au", { exact: true }).fill("2026-12-27");
    await s.getByLabel("Motif (facultatif)").fill("Vacances");
    await expect(enregistrer).toBeEnabled();
    await enregistrer.click();

    await expect(s.getByText("Du 20/12/2026 au 27/12/2026")).toBeVisible();
    await expect(s.getByLabel("Du", { exact: true })).toHaveCount(0);
    const ecriture = db.writes.find((w) => w.method === "POST" && w.path.startsWith("users/uid-mia/absences"));
    expect(ecriture?.data).toEqual({ du: "2026-12-20", au: "2026-12-27", motif: "Vacances" });

    await s.getByRole("button", { name: "Supprimer l'absence : Le 02/11/2026" }).click();
    await expect(s.getByText("Le 02/11/2026")).toHaveCount(0);
    expect(db.writes.some((w) => w.method === "DELETE" && w.path === "users/uid-mia/absences/futur")).toBe(true);
  });

  test("responsable de planning : « Pour qui ? », l'absence d'un autre sans motif, une saisie pour lui sans champ motif", async ({ page }) => {
    const db = await ouvrir(page, RESPONSABLE, {
      "users/uid-leo": { email: "leo@example.com", firstName: "Léonie", lastName: "B.", planningName: "Léonie B.", serviceRoles: {}, plannings: [] },
      "users/uid-leo/absences/x": { du: "2026-11-10", au: "2026-11-12", motif: "Chirurgie" },
    });
    const s = section(page);
    await expect(s.getByLabel("Pour qui ?")).toBeVisible();
    await s.getByLabel("Pour qui ?").selectOption({ label: "Léonie B." });
    await expect(s.getByText("Du 10/11/2026 au 12/11/2026")).toBeVisible();
    await expect(s.getByText("Chirurgie")).toHaveCount(0);

    await s.getByRole("button", { name: "Ajouter une absence" }).click();
    await expect(s.getByLabel("Motif (facultatif)")).toHaveCount(0);
    await s.getByLabel("Du", { exact: true }).fill("2026-12-01");
    await s.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(s.getByText("Le 01/12/2026")).toBeVisible();
    const ecriture = db.writes.find((w) => w.method === "POST" && w.path.startsWith("users/uid-leo/absences"));
    expect(ecriture?.data).toEqual({ du: "2026-12-01", au: "2026-12-01" });
  });

  test("中文 : le titre « 我的请假 »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, MEMBRE, { "users/uid-mia/absences/f": { du: "2026-11-02", au: "2026-11-04" } });
    const s = section(page);
    await expect(s.getByRole("heading", { name: "我的请假" })).toBeVisible();
    await expect(s.getByText("2026年11月2日至11月4日")).toBeVisible();
    await expect(s.getByRole("button", { name: "添加请假" })).toBeVisible();
  });
});

// ─── Planning en grille › Choisir ────────────────────────────────────────────

test.describe("SC3 · « Choisir » du planning en grille (Back-Office)", () => {
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const CULTE = csv([
    ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
    ["20/09", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
    ["27/09", "Président J.", "Choriste K.", "Alice Q.", "Pianiste M.", "Guitariste N.", "Batteur O.", "Sono P.", "Projection Q.", "Orateur R.", "", "", ""],
  ]);
  const PLANIFICATEUR: FakeProfile = { uid: "uid-plan", email: "plan@example.com", firstName: "Sara", lastName: "W.", planningName: "Sara W.", plannings: ["culte"] };
  const compte = (prenom: string, roles: string[]) =>
    ({ email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: "T.", planningName: `${prenom} T.`, serviceRoles: roles.length ? { "Culte Francophone": roles } : {}, plannings: [] });
  const DOCS = {
    "users/uid-omar": compte("Omar", ["musicien"]),
    "users/uid-nina": compte("Nina", ["musicien"]),
    "users/uid-paul": compte("Paul", []),
    "users/uid-nina/absences/a": { du: "2026-09-20", au: "2026-09-27", motif: "Voyage" },
  };
  const laCase = (page: Page, date: string, colonne: string) => page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

  async function ouvrir(page: Page) {
    await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
      route.fulfill({ status: 200, contentType: "text/csv", body: new URL(route.request().url()).searchParams.get("sheet") === "Franco_Louange" ? CULTE : "" }));
    return signInAs(page, PLANIFICATEUR, DOCS, "/back-office/planning/culte");
  }

  test("l'absent n'est pas « Avec ce rôle » mais dans « Absent », en dernier, avec sa période ; le choisir écrit son nom et marque la case", async ({ page }) => {
    const db = await ouvrir(page);
    await laCase(page, "2026-09-20", "guitare").getByRole("button").first().click();
    const liste = page.getByRole("listbox");
    const options = liste.getByRole("option");
    // Les noms déjà écrits dans la grille s'y ajoutent : on regarde la tête (le rôle) et la queue (l'absent).
    await expect(options.first()).toHaveText(/^Omar T\./);
    await expect(options.filter({ hasText: "Paul T." })).toHaveCount(1);
    await expect(options.last()).toHaveText(/^Nina T\.\s*absent du 20\/09 au 27\/09$/);
    await expect(options.last()).toHaveAccessibleName("Nina T., absent ce jour-là");
    await expect(options.filter({ hasText: "Nina T." })).toHaveCount(1);
    // « Absent » vient après « Autres noms », qui vient après « Avec ce rôle ».
    const entetes = (await liste.getByRole("presentation").allTextContents()).map((x) => x.trim());
    expect(entetes).toEqual(["Avec ce rôle", "Autres noms", "Absent"]);

    await options.last().click();
    await expect.poll(() => db.writes.some((w) => w.path === "plannings/culte/dimanches/2026-09-20" && w.data.guitare === "Nina T.")).toBe(true);
    await expect(laCase(page, "2026-09-20", "guitare")).toContainText("Nina T.");
    await expect(laCase(page, "2026-09-20", "guitare").getByText("absent", { exact: true })).toHaveAttribute("title", "absent du 20/09 au 27/09");
    // Une autre date, hors période : pas de marque.
    await expect(laCase(page, "2026-09-27", "guitare").getByText("absent", { exact: true })).toHaveCount(0);
  });

  test("中文 : la section « 请假 » de « Choisir »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page);
    await laCase(page, "2026-09-20", "guitare").getByRole("button").first().click();
    const dernier = page.getByRole("option").last();
    await expect(dernier).toHaveAccessibleName("Nina T.，当天请假");
    await expect(dernier).toContainText("9月20日至9月27日请假");
    await expect(page.getByText("请假", { exact: true })).toBeVisible();
  });
});
