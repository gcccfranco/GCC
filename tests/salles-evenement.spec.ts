import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { chevauchement } from "../src/lib/salles/conflit";
import { occupationsDu } from "../src/lib/salles/occupations";
import type { Evenement } from "../src/types/evenement";
import { orga, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 4, tranche T4a : une réunion ou un évènement réserve sa salle (AR5, AR15,
// SA12 ; AS17). « Où ? » : « À l'église » (« Réserver une salle ? », les huit salles ou « Pas besoin de salle ») ou « Ailleurs » (lieu libre) dans le
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
  // Un concert dans la Grande salle (la Scène en est la même salle, AS14), 15:00 – 17:00.
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
  // T4b : le samedi 21, un atelier de la Salle Amour dont le lieu écrit est resté ancien : la fiche dit la salle.
  "evenements/atelier": { ...base, titre: "Atelier calligraphie", date: "2026-11-21", heure: "10:00", heureFin: "12:00", lieu: "Ancienne salle 3", salle: "amour" },
  // T4b : une réunion de l'équipe Orga, Salle Fidélité (小班), organisée par Perrine ; elle se déplace au calendrier.
  "evenements/reunion-orga": {
    ...base, titre: "Point Orga", pour: "equipe:orga", reunion: true, heure: "18:30", heureFin: "19:30",
    lieu: "Salle Fidélité", salle: "fidelite", organisateurUid: "uid-perrine", organisateurNom: "Perrine",
  },
  // T4b : le lundi 16, la Salle Fidélité est réservée 18:00 – 19:00 ; le mardi 17 est libre.
  "reservations/r-sixtine": {
    salle: "fidelite", date: "2026-11-16", debut: "18:00", fin: "19:00", pour: "", quoi: "Cours de chinois",
    auteurUid: "uid-sixtine", auteurNom: "Sixtine", createdAt: T, updatedAt: T,
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

const salle = (page: Page) => page.getByLabel("Réserver une salle ?");
const ailleurs = (page: Page) => page.getByRole("radio", { name: "Ailleurs" });
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
    const evenements = Object.entries(DOCS).filter(([k]) => ["evenements/concert", "evenements/reunion-da", "evenements/pique-nique"].includes(k)).map(([k, d]) => ({ ...(d as unknown as Evenement), id: k.split("/")[1] }));
    const o = occupationsDu(JOUR, { services: [], scene: [], evenements });
    expect(o.filter((x) => x.source === "evenement").map((x) => [x.salle, x.debut, x.fin, x.id])).toEqual([
      ["paix", "10:00", "11:00", "reunion-da"],
      ["grande", "15:00", "17:00", "concert"],
    ]);
    // Une ancienne « scene » se lit Grande salle (AS14) ; deux bornes qui se touchent ne se croisent pas.
    expect(chevauchement(o, "scene", { debut: "16:00", fin: "18:00" })?.id).toBe("concert");
    expect(chevauchement(o, "grande", { debut: "17:00", fin: "18:00" })).toBeNull();
    // Hors elle-même (modification, SA10).
    expect(chevauchement(o, "grande", { debut: "15:30", fin: "16:30" }, "concert")).toBeNull();
  });

  test("« Où ? » : par défaut à l'église sans salle, aucun Lieu ; une salle montre l'heure de fin et l'exige", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await expect(page.getByRole("radio", { name: "À l'église" })).toBeChecked();
    await expect(salle(page)).toHaveValue("");
    await expect(salle(page).locator("option:checked")).toHaveText("Pas besoin de salle");
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveCount(0);
    // Les huit salles, dans l'ordre de l'écran.
    await expect(salle(page).locator("option")).toHaveCount(9);
    await salle(page).selectOption("paix");
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Heure de fin", { exact: true })).toBeVisible();

    await nouvelEvenement(page, "Atelier vitrail");
    // T4b : une salle choisie, « Horaire » devient « Heure de début ».
    await expect(page.getByLabel("Horaire", { exact: true })).toHaveCount(0);
    await page.getByLabel("Heure de début", { exact: true }).fill("14:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByText("Une salle de l'église demande une heure de début et de fin.")).toBeVisible();
    expect(posts(db)).toHaveLength(0);

    await page.getByLabel("Heure de fin", { exact: true }).fill("16:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Atelier vitrail" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "paix", lieu: "Salle Paix", heure: "14:00", heureFin: "16:00" });
  });

  test("à l'église sans salle : le lieu écrit est « Église », pas de salle", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Veillée des lanternes");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Veillée des lanternes" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ lieu: "Église" });
    expect(posts(db)[0]?.data.salle ?? null).toBeNull();
  });

  test("« Ailleurs » : Lieu libre, aucun select de salle ; le lieu s'écrit sans salle", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Sortie au verger");
    await ailleurs(page).check({ force: true });
    await expect(salle(page)).toHaveCount(0);
    await page.getByLabel("Lieu", { exact: true }).fill("Verger des Lilas");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Sortie au verger" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ lieu: "Verger des Lilas" });
    expect(posts(db)[0]?.data.salle ?? null).toBeNull();
  });

  test("un évènement existant avec un lieu libre s'ouvre sur « Ailleurs »", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/back-office/evenements/pique-nique/modifier");
    await expect(ailleurs(page)).toBeChecked();
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveValue("Parc de Sceaux");
    await expect(salle(page)).toHaveCount(0);
  });

  test("chevauchement bloqué : le refus de SA8 nomme l'occupant ; « Décaler » puis l'enregistrement passe", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Soirée louange");
    await salle(page).selectOption("bonte");
    await page.getByLabel("Heure de début", { exact: true }).fill("19:00");
    await page.getByLabel("Heure de fin", { exact: true }).fill("20:30");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(refus(page)).toContainText("Salle Bonté est prise : Répétition chorale, 18:00 – 20:00.");
    expect(posts(db)).toHaveLength(0);
    // Libres au même moment : une pilule choisit la salle.
    await expect(refus(page).locator('[data-libres] [data-salle="paix"]')).toBeVisible();
    await refus(page).getByRole("button", { name: "Décaler à 20:00 – 21:30" }).click();
    await expect(page.getByLabel("Heure de début", { exact: true })).toHaveValue("20:00");
    await expect(page.getByLabel("Heure de fin", { exact: true })).toHaveValue("21:30");
    await expect(refus(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Soirée louange" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "bonte", lieu: "Salle Bonté", heure: "20:00", heureFin: "21:30" });
  });

  test("un autre évènement occupe aussi : la Grande salle est prise par le concert ; une pilule libre s'enregistre", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau");
    await nouvelEvenement(page, "Répétition théâtre");
    await salle(page).selectOption("grande");
    await page.getByLabel("Heure de début", { exact: true }).fill("16:00");
    await page.getByLabel("Heure de fin", { exact: true }).fill("18:00");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(refus(page)).toContainText("Grande salle est prise : Concert d'automne");
    await refus(page).locator('[data-libres] [data-salle="amour"]').click();
    await expect(salle(page)).toHaveValue("amour");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page.getByRole("heading", { name: "Répétition théâtre" })).toBeVisible();
    expect(posts(db)[0]?.data).toMatchObject({ salle: "amour", lieu: "Salle Amour" });
  });

  test("modifier un évènement qui a sa salle : il ne se gêne pas lui-même ; « Ailleurs » retire la salle", async ({ page }) => {
    const db = await ouvrir(page, COORDINATION, "/back-office/evenements/concert/modifier");
    await expect(salle(page)).toHaveValue("grande");
    await page.getByLabel("Heure de début", { exact: true }).fill("15:30");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => db.writes.filter((w) => w.method === "PATCH" && w.path === "evenements/concert").length).toBe(1);
    expect(db.doc("evenements/concert")).toMatchObject({ salle: "grande", heure: "15:30" });

    await page.goto("/back-office/evenements/concert/modifier");
    await ailleurs(page).check({ force: true });
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
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveCount(0);
    await ailleurs(page).check({ force: true });
    await expect(page.getByLabel("Lieu", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "À l'église" }).check({ force: true });
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
    await page.getByLabel("Heure de début", { exact: true }).fill("10:30");
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

  test("中文 : 地点？ 在教会 / 其他地点, 预约场地？ et 不需要场地", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/back-office/evenements/nouveau", { zh: true });
    await expect(page.getByRole("radiogroup", { name: "地点？" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "在教会" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "其他地点" })).toBeVisible();
    const champ = page.getByLabel("预约场地？");
    await expect(champ.locator("option:checked")).toHaveText("不需要场地");
    await champ.selectOption("fidelite");
    await expect(champ.locator("option:checked")).toHaveText("Salle Fidélité · 小班");
  });
});

const estTelephone = (info: TestInfo) => info.project.name === "telephone";

/** « Déplacer… » de la réunion « Point Orga » (C6) : panneau du jour en grand, feuille de l'entrée au téléphone. */
async function deplacerPointOrga(page: Page, info: TestInfo, vers: string) {
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  if (estTelephone(info)) {
    await page.getByTestId("agenda").getByRole("button", { name: /Point Orga/ }).first().click();
    await page.getByRole("dialog", { name: "Point Orga" }).getByRole("button", { name: "Déplacer…" }).click();
  } else {
    await page.getByTestId("grille-mois").locator(`[data-jour="${JOUR}"]`).click();
    // Le panneau suit l'heure : pique-nique (12:00), concert (15:00), puis « Point Orga » (18:30), le dernier.
    await page.getByRole("button", { name: "Déplacer…" }).filter({ visible: true }).last().click();
  }
  const dlg = page.getByRole("alertdialog", { name: "Déplacer « Point Orga »" });
  await dlg.getByLabel("Nouvelle date").fill(vers);
  return dlg;
}

test.describe("AR, T4b : la fiche dit la salle ; déplacer relance SA8", () => {
  test("fiche d'un évènement : la salle à la place du lieu écrit", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/atelier");
    await expect(page.getByRole("heading", { name: "Atelier calligraphie" })).toBeVisible();
    await expect(page.getByText("Salle Amour · 大班").first()).toBeVisible();
    await expect(page.getByText("Ancienne salle 3")).toHaveCount(0);
  });

  test("fiche d'une réunion : « Salle Fidélité · 小班 » dans la ligne d'en-tête", async ({ page }) => {
    await ouvrir(page, REFERENTE, "/evenements/reunion-orga");
    await expect(page.getByText(/Salle Fidélité · 小班/).first()).toBeVisible();
  });

  test("calendrier : déplacer une réunion sur un jour où sa salle est prise est refusé ; un jour libre passe", async ({ page }, info) => {
    const db = await ouvrir(page, REFERENTE, "/back-office/calendrier");
    const dlg = await deplacerPointOrga(page, info, "2026-11-16");
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg.locator("[data-refus-salle]")).toHaveText("Salle Fidélité est prise : Cours de chinois, 18:00 – 19:00.");
    await expect(dlg.getByRole("button", { name: "Déplacer", exact: true })).toBeDisabled();
    expect(db.writes.filter((w) => w.path === "evenements/reunion-orga")).toEqual([]);
    // Une autre date efface le refus ; le mardi 17, la salle est libre.
    await dlg.getByLabel("Nouvelle date").fill("2026-11-17");
    await expect(dlg.locator("[data-refus-salle]")).toHaveCount(0);
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    await expect.poll(() => db.doc("evenements/reunion-orga")?.date).toBe("2026-11-17");
    expect(db.doc("evenements/reunion-orga")).toMatchObject({ salle: "fidelite", heure: "18:30" });
  });

  test("中文 : la fiche garde le nom de la salle en français (AR9)", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/atelier", { zh: true });
    await expect(page.getByText("Salle Amour · 大班").first()).toBeVisible();
  });
});
