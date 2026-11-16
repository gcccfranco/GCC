import { expect, test, type Page } from "@playwright/test";
import { chevauchement } from "../src/lib/salles/conflit";
import { occupationsDu } from "../src/lib/salles/occupations";
import type { Evenement } from "../src/types/evenement";
import { orga, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 4, tranche T4a : une réunion ou un évènement réserve sa salle (AR5, AR15,
// SA12). Champ « Salle de l'église » (les neuf, plus « Ailleurs » qui fait paraître le lieu en texte libre) dans le
// formulaire d'un évènement et celui d'une réunion ; une salle choisie exige une heure de début et de fin ; un
// chevauchement bloque l'enregistrement avec le refus de SA8 ; le lieu écrit devient le nom de la salle ; Salles lit
// l'évènement comme une occupation. Firestore, planning et date simulés ; personnes fictives.

/** Samedi 14 novembre 2026 : pas d'emploi du temps fixe (seul le dimanche en a). */
const JOUR = "2026-11-14";
const MATIN = "2026-11-14T09:00:00+01:00";
const T = "2026-11-01T10:00:00Z";

const base: Omit<Evenement, "id" | "titre"> = {
  type: "musique", pour: "eglise", date: JOUR, heure: "15:00", heureFin: "17:00", dateFin: "", lieu: "Grande salle",
  description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees", sansCompte: false, lienExterne: "",
  contact: "", organisateurUid: "uid-ombeline", organisateurNom: "Ombeline", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: T, updatedAt: T,
};
const DOCS: Record<string, Record<string, unknown>> = {
  // Un concert dans la Grande salle (donc aussi sur la Scène, AR6), 15:00 – 17:00.
  "evenements/concert": { ...base, titre: "Concert d'automne", salle: "grande" },
  // Une réunion d'une équipe dont la personne n'est pas : son nom ne se lit pas dans Salles.
  "evenements/reunion-da": { ...base, titre: "Réunion secrète DA", pour: "equipe:da", reunion: true, heure: "10:00", heureFin: "11:00", lieu: "Salle Paix", salle: "paix", organisateurUid: "uid-tancrede", organisateurNom: "Tancrède" },
  // Un évènement ailleurs : ne compte pas.
  "evenements/pique-nique": { ...base, titre: "Pique-nique", heure: "12:00", heureFin: "14:00", lieu: "Parc de Sceaux" },
  // Une réservation de la Salle Bonté, 18:00 – 20:00.
  "reservations/r-clervie": {
    salle: "bonte", date: JOUR, debut: "18:00", fin: "20:00", pour: "", quoi: "Répétition chorale",
    auteurUid: "uid-clervie", auteurNom: "Clervie", createdAt: T, updatedAt: T,
  },
};

const COORDINATION: FakeProfile = { uid: "uid-anatole", email: "anatole@example.com", firstName: "Anatole", lastName: "Vernier", ...orga() };
const REFERENTE: FakeProfile = { uid: "uid-perrine", email: "perrine@example.com", firstName: "Perrine", lastName: "Galland", dansEquipes: ["orga"], referentDe: ["orga"] };

async function ouvrir(page: Page, qui: FakeProfile, to: string, { zh = false, vue = "liste" }: { zh?: boolean; vue?: "liste" | "grille" } = {}): Promise<FakeDb> {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(MATIN));
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.addInitScript(({ z, v }) => {
    try {
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("gcc-salles-vue", v);
    } catch {}
  }, { z: zh, v: vue });
  return signInAs(page, qui, DOCS, to);
}

const salle = (page: Page) => page.getByLabel("Salle de l'église");
const refus = (page: Page) => page.locator("[data-refus]");
const posts = (db: FakeDb) => db.writes.filter((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path));

/** Un évènement d'une section : ceux de toute l'église s'écrivent dans le Sheet jusqu'au 31/12/2026 (U9). */
async function nouvelEvenement(page: Page, titre: string) {
  await page.getByLabel("Nom de l'évènement").fill(titre);
  await page.getByLabel("Public").selectOption({ index: 1 });
  await page.getByLabel("Date", { exact: true }).fill(JOUR);
}

test.describe("AR, T4a : un évènement ou une réunion réserve sa salle", () => {
  test("fonctions : un évènement qui porte une salle est une occupation ; ailleurs, non", () => {
    const evenements = Object.entries(DOCS).filter(([k]) => k.startsWith("evenements/")).map(([k, d]) => ({ ...(d as unknown as Evenement), id: k.split("/")[1] }));
    const o = occupationsDu(JOUR, { services: [], scene: [], evenements });
    expect(o.filter((x) => x.source === "evenement").map((x) => [x.salle, x.debut, x.fin, x.id])).toEqual([
      ["paix", "10:00", "11:00", "reunion-da"],
      ["grande", "15:00", "17:00", "concert"],
    ]);
    // La Scène est dans la Grande salle (AR6) ; deux bornes qui se touchent ne se croisent pas.
    expect(chevauchement(o, "scene", { debut: "16:00", fin: "18:00" })?.id).toBe("concert");
    expect(chevauchement(o, "grande", { debut: "17:00", fin: "18:00" })).toBeNull();
    // Hors elle-même (modification, SA10).
    expect(chevauchement(o, "grande", { debut: "15:30", fin: "16:30" }, "concert")).toBeNull();
  });

  test("champ « Salle de l'église » : « Ailleurs » montre le lieu ; une salle montre l'heure de fin et l'exige", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await expect(salle(page)).toHaveValue("");
    await expect(salle(page).locator("option:checked")).toHaveText("Ailleurs");
    await expect(page.getByLabel("Lieu", { exact: true })).toBeVisible();
    // Les neuf salles, dans l'ordre de l'écran.
    await expect(salle(page).locator("option")).toHaveCount(10);
    await salle(page).selectOption("paix");
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Heure de fin", { exact: true })).toBeVisible();

    await nouvelEvenement(page, "Atelier vitrail");
    await page.getByLabel("Horaire", { exact: true }).fill("14:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByText("Une salle de l'église demande une heure de début et de fin.")).toBeVisible();
    expect(posts(db)).toHaveLength(0);

    await page.getByLabel("Heure de fin", { exact: true }).fill("16:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Atelier vitrail" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "paix", lieu: "Salle Paix", heure: "14:00", heureFin: "16:00" });
  });

  test("chevauchement bloqué : le refus de SA8 nomme l'occupant ; « Décaler » puis l'enregistrement passe", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Soirée louange");
    await salle(page).selectOption("bonte");
    await page.getByLabel("Horaire", { exact: true }).fill("19:00");
    await page.getByLabel("Heure de fin", { exact: true }).fill("20:30");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(refus(page)).toContainText("Salle Bonté est prise : Répétition chorale, 18:00 – 20:00.");
    expect(posts(db)).toHaveLength(0);
    // Libres au même moment : une pilule choisit la salle.
    await expect(refus(page).locator('[data-libres] [data-salle="paix"]')).toBeVisible();
    await refus(page).getByRole("button", { name: "Décaler à 20:00 – 21:30" }).click();
    await expect(page.getByLabel("Horaire", { exact: true })).toHaveValue("20:00");
    await expect(page.getByLabel("Heure de fin", { exact: true })).toHaveValue("21:30");
    await expect(refus(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Soirée louange" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "bonte", lieu: "Salle Bonté", heure: "20:00", heureFin: "21:30" });
  });

  test("un autre évènement occupe aussi : la Scène est prise par le concert de la Grande salle ; une pilule libre s'enregistre", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Répétition théâtre");
    await salle(page).selectOption("scene");
    await page.getByLabel("Horaire", { exact: true }).fill("16:00");
    await page.getByLabel("Heure de fin", { exact: true }).fill("18:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(refus(page)).toContainText("Scène est prise : Concert d'automne");
    await refus(page).locator('[data-libres] [data-salle="amour"]').click();
    await expect(salle(page)).toHaveValue("amour");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Répétition théâtre" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "amour", lieu: "Salle Amour" });
  });

  test("modifier un évènement qui a sa salle : il ne se gêne pas lui-même ; « Ailleurs » retire la salle", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/concert/modifier");
    await expect(salle(page)).toHaveValue("grande");
    await page.getByLabel("Horaire", { exact: true }).fill("15:30");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => db.writes.filter((w) => w.method === "PATCH" && w.path === "evenements/concert").length).toBe(1);
    expect(db.doc("evenements/concert")).toMatchObject({ salle: "grande", heure: "15:30" });

    await page.goto("/back-office/evenements/concert/modifier");
    await salle(page).selectOption("");
    await page.getByLabel("Lieu", { exact: true }).fill("Théâtre municipal");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => db.doc("evenements/concert")?.lieu).toBe("Théâtre municipal");
    expect(db.doc("evenements/concert")?.salle ?? null).toBeNull();
  });

  test("réunion : le même champ ; la salle s'écrit avec l'heure de fin", async ({ page }) => {
    const db = await ouvrir(page, REFERENTE, "/back-office/reunions/nouvelle");
    await page.getByLabel("Nom de la réunion").fill("Bilan du trimestre");
    await page.getByLabel("Date", { exact: true }).fill(JOUR);
    await page.getByLabel("Horaire", { exact: true }).fill("10:30");
    await expect(page.getByLabel("Lieu", { exact: true })).toBeVisible();
    await salle(page).selectOption("reunion");
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveCount(0);
    await page.getByLabel("Heure de fin", { exact: true }).fill("12:00");
    await page.getByRole("button", { name: "Créer la réunion" }).click();
    await expect.poll(() => posts(db).length).toBe(1);
    expect(posts(db)[0].data).toMatchObject({ salle: "reunion", lieu: "Salle de réunion", heure: "10:30", heureFin: "12:00", reunion: true });
  });

  test("réunion : la Salle Paix prise par une autre réunion est refusée", async ({ page }) => {
    const db = await ouvrir(page, REFERENTE, "/back-office/reunions/nouvelle");
    await page.getByLabel("Nom de la réunion").fill("Point rapide");
    await page.getByLabel("Date", { exact: true }).fill(JOUR);
    await salle(page).selectOption("paix");
    await page.getByLabel("Horaire", { exact: true }).fill("10:30");
    await page.getByLabel("Heure de fin", { exact: true }).fill("11:30");
    await page.getByRole("button", { name: "Créer la réunion" }).click();
    // Une réunion d'une autre équipe : nommée sans son titre.
    await expect(refus(page)).toContainText("Salle Paix est prise : Réunion d'équipe, 10:00 – 11:00.");
    await expect(refus(page)).not.toContainText("secrète");
    expect(posts(db)).toHaveLength(0);
  });

  test("Salles lit les évènements qui portent une salle : ligne de la Liste, bloc de la Grille, détail vers la fiche", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/salles");
    const liste = page.getByRole("list", { name: "Salles" });
    await expect(liste.getByText("15:00 – 17:00 · Concert d'automne · Ombeline")).toBeVisible();
    // La réunion d'une équipe dont on n'est pas : « Réunion d'équipe », pas son titre.
    await expect(liste.getByText("10:00 – 11:00 · Réunion d'équipe · Tancrède")).toBeVisible();
    await expect(page.getByText("Réunion secrète DA")).toHaveCount(0);
    await expect(page.getByText("Pique-nique")).toHaveCount(0);
  });

  test("Salles, Grille : le bloc d'un évènement ; son détail mène à sa fiche", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/salles", { vue: "grille" });
    const bloc = page.locator('[data-grille-salles] [data-colonne="grande"] [data-bloc][data-debut="15:00"]');
    await bloc.click();
    const detail = page.getByRole("dialog", { name: "Concert d'automne" });
    await expect(detail).toBeVisible();
    await detail.getByRole("link", { name: "Voir l'évènement" }).click();
    await expect(page).toHaveURL(/\/evenements\/concert\/?$/);
  });

  test("Salles : la feuille « Réserver » refuse la Grande salle prise par le concert", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/salles");
    await page.getByRole("button", { name: "Réserver une salle" }).first().click();
    const f = page.getByRole("dialog", { name: "Réserver une salle" });
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:00");
    const grande = f.getByRole("radio", { name: /^Grande salle/ });
    await expect(grande).toBeDisabled();
    await expect(grande).toHaveAccessibleName(/Concert d'automne/);
  });

  test("中文 : 教会场地 et 其他地点", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau", { zh: true });
    const champ = page.getByLabel("教会场地");
    await expect(champ.locator("option:checked")).toHaveText("其他地点");
    await champ.selectOption("fidelite");
    await expect(champ.locator("option:checked")).toHaveText("Salle Fidélité · 小班");
  });
});
