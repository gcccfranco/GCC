import { expect, test, type Page } from "@playwright/test";
import { autreQuiCroise, chevauchement, conflictKey, conflictMessage, decalage, sallesLibres } from "../src/lib/salles/conflit";
import { occupationsDu } from "../src/lib/salles/occupations";
import type { Reservation } from "../src/lib/firebase/reservations";
import { personnesEcrivables } from "../src/lib/access";
import { orga, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { estTelephone, interdireDialoguesNatifs, repondreDansLeSite, verifierSansDebordement } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 3, tranche T3a : réserver une salle (SA6, SA7) depuis le bouton « Réserver une
// salle » ; la feuille commence par la date, « de » et « à », puis les salles (libres en tête, occupées grisées avec
// leur raison), pour qui (AR16), pour quoi ; les réservations lues dans la Liste et la Grille ; modifier et supprimer
// la sienne, pas celle d'un autre, sauf la coordination (SA10). T3b : le refus d'un chevauchement nommé, les salles
// libres au même moment, « Décaler » (SA8) ; le message de conflit aux deux auteurs (SA9, route simulée).
// Firestore, planning et date simulés ; personnes fictives.

const MAINTENANT = "2026-11-01T10:00:00Z";
const reservation = (r: Record<string, unknown>) => ({ pour: "", createdAt: MAINTENANT, updatedAt: MAINTENANT, ...r });
const DOCS: Record<string, Record<string, unknown>> = {
  // Dimanche 15 novembre : une réservation d'une autre (Salle Fidélité) et une de Léandre (Salle de réunion).
  "reservations/r-maelys": reservation({
    salle: "fidelite", date: "2026-11-15", debut: "18:30", fin: "19:30", pour: "Gp Fidélité", quoi: "Sketch",
    auteurUid: "uid-maelys", auteurNom: "Maëlys",
  }),
  "reservations/r-leandre": reservation({
    salle: "reunion", date: "2026-11-15", debut: "19:00", fin: "20:30", pour: "", quoi: "Préparation",
    auteurUid: "uid-leandre", auteurNom: "Léandre",
  }),
  // AS15 : un compte par personne (noms inventés), une ancienne valeur libre, une réservation « Des personnes… ».
  "users/uid-maelys": { email: "maelys@example.com", firstName: "Maëlys", lastName: "Brun", planningName: "" },
  "users/uid-gaspard": { email: "gaspard@example.com", firstName: "Gaspard", lastName: "Vidal", planningName: "" },
  "reservations/r-vieux": reservation({
    salle: "paix", date: "2026-11-15", debut: "20:00", fin: "21:00", pour: "Chorale des jeunes", quoi: "Partitions", auteurUid: "uid-leandre", auteurNom: "Léandre",
  }),
  "reservations/r-duo": reservation({
    salle: "amour", date: "2026-11-15", debut: "20:00", fin: "21:00", pour: "Maëlys B.", quoi: "Duo", auteurUid: "uid-leandre", auteurNom: "Léandre",
    personnes: [{ uid: "uid-maelys", nom: "Maëlys B." }],
  }),
  // Un autre jour : ne paraît pas le 15.
  "reservations/r-lundi": reservation({
    salle: "bonte", date: "2026-11-16", debut: "19:00", fin: "20:00", quoi: "Prière", auteurUid: "uid-maelys", auteurNom: "Maëlys",
  }),
};

const MEMBRE: FakeProfile = { uid: "uid-leandre", email: "leandre@example.com", firstName: "Léandre", lastName: "Mazurier", serviceRoles: { "Groupe Bonté": ["chanteur"] } };
const COORDINATION: FakeProfile = { uid: "uid-sidonie", email: "sidonie@example.com", firstName: "Sidonie", lastName: "Arnaud", ...orga() };

/** Dimanche 15 novembre 2026 (dimanche ordinaire : planning vide), à 14:00 de Paris. */
const DIMANCHE_14H = "2026-11-15T14:00:00+01:00";

async function ouvrir(page: Page, { vue = "liste", zh = false, qui = MEMBRE, to = "/evenements/salles" }: { vue?: "liste" | "grille"; zh?: boolean; qui?: FakeProfile; to?: string } = {}): Promise<FakeDb> {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(DIMANCHE_14H));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(({ v, z }) => {
    try {
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("gcc-salles-vue", v);
    } catch {}
  }, { v: vue, z: zh });
  return signInAs(page, qui, DOCS, to);
}

const feuille = (page: Page) => page.getByRole("dialog", { name: /^(Réserver une salle|Modifier la réservation|预订场地|修改预订)$/ });
const salles = (page: Page) => feuille(page).getByRole("radiogroup", { name: /^(Salle|场地)$/ });
const liste = (page: Page) => page.getByRole("list", { name: /^(Salles|场地)$/ });
const colonne = (page: Page, id: string) => page.locator(`[data-grille-salles] [data-colonne="${id}"]`);
const bloc = (page: Page, id: string, debut: string) => colonne(page, id).locator(`[data-bloc][data-debut="${debut}"]`);
const detail = (page: Page) => page.getByRole("dialog").filter({ has: page.getByText(/Inscrit par|登记/) });

async function ouvrirLaFeuille(page: Page) {
  await page.getByRole("button", { name: "Réserver une salle" }).click();
  await expect(feuille(page)).toBeVisible();
}

test.describe("AR, T3a : réserver une salle", () => {
  test("« Réserver une salle » : date, de, à d'abord, pré-remplis ; puis salles, pour qui, pour quoi", async ({ page }) => {
    await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await expect(f.getByLabel("Date")).toHaveValue("2026-11-15");
    await expect(f.getByLabel("De", { exact: true })).toHaveValue("14:00");
    await expect(f.getByLabel("À", { exact: true })).toHaveValue("15:00");
    // L'ordre de la feuille (SA6) : le moment, puis la salle, puis pour qui et pour quoi.
    const ordre = await f.evaluate((el) => {
      const pos = (sel: string) => {
        const n = el.querySelector(sel);
        return n ? [...el.querySelectorAll("*")].indexOf(n) : -1;
      };
      return [pos('[data-champ="date"]'), pos('[data-champ="de"]'), pos('[data-champ="a"]'), pos('[data-champ="salle"]'), pos('[data-champ="pour"]'), pos('[data-champ="quoi"]')];
    });
    expect(ordre.every((p) => p >= 0)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    await verifierSansDebordement(page);
  });

  test("salles libres en tête ; occupées grisées, non choisissables, avec leur raison", async ({ page }) => {
    await ouvrir(page);
    await ouvrirLaFeuille(page);
    // 14:00 – 15:00, dimanche ordinaire : la Salle Bonté a son groupe jusqu'à 14:30.
    const bonte = salles(page).getByRole("radio", { name: /Salle Bonté/ });
    await expect(bonte).toBeDisabled();
    await expect(salles(page).locator('[data-salle="bonte"]')).toContainText("Groupe Bonté jusqu'à 14:30");
    await expect(salles(page).getByRole("radio", { name: /Salle de réunion/ })).toBeEnabled();
    // Toutes les libres avant toutes les occupées.
    const etats = await salles(page).getByRole("radio").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).disabled));
    expect(etats.length).toBe(8);
    expect(etats.indexOf(true)).toBeGreaterThan(0);
    expect(etats.slice(etats.indexOf(true)).every(Boolean)).toBe(true);
    // Un autre moment change la liste : 16:00 – 17:00, la Salle Bonté est libre.
    await feuille(page).getByLabel("De", { exact: true }).fill("16:00");
    await feuille(page).getByLabel("À", { exact: true }).fill("17:00");
    await expect(bonte).toBeEnabled();
  });

  test("réserver une salle libre : écrite à son nom, lue dans la Liste puis la Grille", async ({ page }) => {
    const db = await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    // 16:00 – 17:30 : la Salle Bonté est libre (les classes d'EDD prennent les autres salles de groupe à 15:30).
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:30");
    await salles(page).getByRole("radio", { name: /Salle Bonté/ }).check();
    await f.getByLabel("Pour qui").selectOption("Gp Joie");
    await f.getByLabel("Pour quoi").fill("Répétition du sketch");
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(f).toBeHidden();
    const ecrit = db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"));
    expect(ecrit?.data).toMatchObject({
      salle: "bonte", date: "2026-11-15", debut: "16:00", fin: "17:30", pour: "Gp Joie", quoi: "Répétition du sketch",
      auteurUid: "uid-leandre", auteurNom: "Léandre",
    });
    await expect(liste(page).locator('[data-salle="bonte"]')).toContainText("16:00 – 17:30 · Répétition du sketch · Gp Joie · Léandre");
    await page.getByRole("tab", { name: "Grille" }).click();
    await expect(bloc(page, "bonte", "16:00")).toContainText("Répétition du sketch");
  });

  test("« Des personnes… » pour qui : chercher, cocher deux comptes, décocher une pastille, plus de texte libre (AS15)", async ({ page }) => {
    const db = await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:00");
    await salles(page).getByRole("radio", { name: /Salle imprimante/ }).check();
    await f.getByLabel("Pour quoi").fill("Partitions");
    await expect(f.getByLabel("Pour qui").locator("option", { hasText: "Autre…" })).toHaveCount(0);
    await f.getByLabel("Pour qui").selectOption({ label: "Des personnes…" });
    await expect(f.getByRole("textbox", { name: "Autre…" })).toHaveCount(0);
    const reserver = f.getByRole("button", { name: "Réserver", exact: true });
    await expect(reserver).toBeDisabled(); // au moins une personne
    const chercher = f.getByRole("searchbox", { name: "Chercher un nom" });
    await chercher.fill("mae");
    await f.getByRole("checkbox", { name: "Maëlys B." }).click();
    await chercher.fill("gas");
    await f.getByRole("checkbox", { name: "Gaspard V." }).click();
    await expect(reserver).toBeEnabled();
    // Les choisies sont des pastilles cochées ; un clic décoche et retire.
    await f.getByRole("checkbox", { name: "Gaspard V." }).click();
    await chercher.fill("");
    await expect(f.getByRole("checkbox", { name: "Gaspard V." })).toHaveCount(0);
    await chercher.fill("gas");
    // Entrée dans la recherche n'envoie pas la feuille (le bouton est pourtant actif).
    await chercher.press("Enter");
    await expect(f).toBeVisible();
    expect(db.writes.filter((w) => w.path.startsWith("reservations/"))).toHaveLength(0);
    await f.getByRole("checkbox", { name: "Gaspard V." }).click();
    await reserver.click();
    await expect(f).toBeHidden();
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data).toMatchObject({
      salle: "imprimante", pour: "Maëlys B., Gaspard V.", quoi: "Partitions",
      personnes: [{ uid: "uid-maelys", nom: "Maëlys B." }, { uid: "uid-gaspard", nom: "Gaspard V." }],
    });
  });

  test("une ancienne valeur libre se rouvre telle quelle, choisie, et se réécrit sans changement", async ({ page }) => {
    const db = await ouvrir(page, { vue: "grille" });
    await bloc(page, "paix", "20:00").click();
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const f = feuille(page);
    await expect(f.getByLabel("Pour qui")).toHaveValue("Chorale des jeunes");
    await expect(f.getByLabel("Pour qui").locator("option:checked")).toHaveText("Chorale des jeunes");
    await expect(f.getByRole("textbox", { name: "Autre…" })).toHaveCount(0);
    await f.getByLabel("Pour quoi").fill("Partitions du soir");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await expect(f).toBeHidden();
    const ecrit = db.writes.find((w) => w.method === "PATCH" && w.path === "reservations/r-vieux")?.data;
    expect(ecrit).toMatchObject({ pour: "Chorale des jeunes", quoi: "Partitions du soir" });
    expect(ecrit).not.toHaveProperty("personnes");
  });

  test("« Des personnes… » rouverte : pastilles, puis une autre valeur retire `personnes`", async ({ page }) => {
    const db = await ouvrir(page, { vue: "grille" });
    await bloc(page, "amour", "20:00").click();
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const f = feuille(page);
    await expect(f.getByLabel("Pour qui").locator("option:checked")).toHaveText("Des personnes…");
    await expect(f.getByRole("checkbox", { name: "Maëlys B." })).toBeChecked();
    await f.getByLabel("Pour qui").selectOption("Gp Joie");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await expect(f).toBeHidden();
    expect(db.doc("reservations/r-duo")).toMatchObject({ pour: "Gp Joie" });
    expect(db.doc("reservations/r-duo")).not.toHaveProperty("personnes");
  });

  test("en 中文 : « Des personnes… » devient 指定人员… et le champ 搜索姓名", async ({ page }) => {
    await ouvrir(page, { zh: true });
    await page.getByRole("button", { name: "预订场地" }).click();
    const f = feuille(page);
    await f.getByLabel("为谁", { exact: true }).selectOption({ label: "指定人员…" });
    await expect(f.getByRole("searchbox", { name: "搜索姓名" })).toBeVisible();
  });

  test("SA7 : la fin suit le début, pour quoi est obligatoire, pas de date passée", async ({ page }) => {
    const db = await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    const reserver = f.getByRole("button", { name: "Réserver", exact: true });
    await expect(f.getByLabel("Date")).toHaveAttribute("min", "2026-11-15");
    await salles(page).getByRole("radio", { name: /Salle de réunion/ }).check();
    await expect(reserver).toBeDisabled(); // pour quoi vide
    await f.getByLabel("Pour quoi").fill("Réunion");
    await expect(reserver).toBeEnabled();
    await f.getByLabel("À", { exact: true }).fill("13:30");
    await expect(f.getByText("La fin doit venir après le début.")).toBeVisible();
    await expect(reserver).toBeDisabled();
    await f.getByLabel("De", { exact: true }).fill("05:00");
    await f.getByLabel("À", { exact: true }).fill("06:30");
    await expect(f.getByText("Entre 6:00 et 23:59.")).toBeVisible();
    await expect(reserver).toBeDisabled();
    await f.getByLabel("Date").fill("2026-11-14");
    await f.getByLabel("De", { exact: true }).fill("18:00");
    await f.getByLabel("À", { exact: true }).fill("19:00");
    await expect(f.getByText("Une date d'aujourd'hui ou après.")).toBeVisible();
    await expect(reserver).toBeDisabled();
    expect(db.writes.filter((w) => w.path.startsWith("reservations"))).toHaveLength(0);
  });

  test("les réservations du jour se lisent dans la Liste et la Grille, pas celles d'un autre jour", async ({ page }) => {
    await ouvrir(page);
    await expect(liste(page).locator('[data-salle="fidelite"]')).toContainText("18:30 – 19:30 · Sketch · Gp Fidélité · Maëlys");
    await expect(liste(page).locator('[data-salle="reunion"]')).toContainText("19:00 – 20:30 · Préparation · Léandre");
    await expect(liste(page)).not.toContainText("Prière");
    await page.getByRole("tab", { name: "Grille" }).click();
    await expect(bloc(page, "fidelite", "18:30")).toContainText("Sketch");
    await expect(bloc(page, "reunion", "19:00")).toContainText("Préparation");
    await expect(colonne(page, "bonte").locator('[data-bloc][data-debut="19:00"]')).toHaveCount(0);
  });

  test("modifier la sienne : même feuille, pré-remplie, sa salle reste choisissable", async ({ page }) => {
    const db = await ouvrir(page, { vue: "grille" });
    await bloc(page, "reunion", "19:00").click();
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const f = feuille(page);
    await expect(f).toHaveAccessibleName("Modifier la réservation");
    await expect(f.getByLabel("De", { exact: true })).toHaveValue("19:00");
    await expect(f.getByLabel("À", { exact: true })).toHaveValue("20:30");
    await expect(f.getByLabel("Pour quoi")).toHaveValue("Préparation");
    await expect(salles(page).getByRole("radio", { name: /Salle de réunion/ })).toBeChecked();
    await expect(salles(page).getByRole("radio", { name: /Salle de réunion/ })).toBeEnabled();
    await f.getByLabel("À", { exact: true }).fill("21:00");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await expect(f).toBeHidden();
    expect(db.writes.find((w) => w.method === "PATCH" && w.path === "reservations/r-leandre")?.data).toMatchObject({ fin: "21:00", quoi: "Préparation" });
    expect(db.doc("reservations/r-leandre")).toMatchObject({ fin: "21:00", auteurUid: "uid-leandre", auteurNom: "Léandre" });
    await expect(bloc(page, "reunion", "19:00")).toHaveAttribute("data-fin", "21:00");
  });

  test("supprimer la sienne, après la fenêtre du site", async ({ page }) => {
    const db = await ouvrir(page, { vue: "grille" });
    await bloc(page, "reunion", "19:00").click();
    await detail(page).getByRole("button", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(bloc(page, "reunion", "19:00")).toHaveCount(0);
    expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("reservations/r-leandre");
  });

  test("celle d'une autre : ni Modifier ni Supprimer ; la coordination peut les deux", async ({ page }) => {
    await ouvrir(page, { vue: "grille" });
    await bloc(page, "fidelite", "18:30").click();
    await expect(detail(page)).toContainText("Inscrit par Maëlys");
    await expect(detail(page).getByRole("button", { name: "Modifier" })).toHaveCount(0);
    await expect(detail(page).getByRole("button", { name: "Supprimer" })).toHaveCount(0);
  });

  test("la coordination modifie toute réservation et annule celle d'un autre (AS16)", async ({ page }) => {
    await ouvrir(page, { vue: "grille", qui: COORDINATION });
    await bloc(page, "fidelite", "18:30").click();
    await expect(detail(page).getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(detail(page).getByRole("button", { name: "Annuler la réservation…", exact: true })).toBeVisible();
    await expect(detail(page).getByRole("button", { name: "Supprimer" })).toHaveCount(0);
  });

  test("téléphone : la journée d'une salle ouvre le détail de sa réservation", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone (la journée en page)");
    await ouvrir(page);
    await liste(page).locator('[data-salle="reunion"] a').click();
    await page.locator("[data-journee-salle]").getByRole("button", { name: /Préparation/ }).click();
    await expect(detail(page).getByRole("button", { name: "Modifier" })).toBeVisible();
  });

  test("en 中文 : le bouton et la feuille", async ({ page }) => {
    await ouvrir(page, { zh: true });
    await page.getByRole("button", { name: "预订场地" }).click();
    const f = feuille(page);
    await expect(f).toBeVisible();
    for (const l of ["日期", "从", "到", "为谁", "做什么"]) await expect(f.getByLabel(l, { exact: true })).toBeVisible();
    await expect(salles(page)).toBeVisible();
    await expect(salles(page).locator('[data-salle="bonte"]')).toContainText("恩慈团契，至 14:30");
    await verifierSansDebordement(page);
  });
});

// ─── T3b : refus du chevauchement (SA8), message de conflit (SA9) ───────────────────────────────────────────────────

const R = (r: Partial<Reservation> & Pick<Reservation, "id" | "salle" | "debut" | "fin">): Reservation => ({
  date: "2026-11-15", pour: "", quoi: "Essai", auteurUid: "uid-x", auteurNom: "Ysaline", createdAt: "", updatedAt: "", ...r,
});
const SOURCES = { services: [], scene: [] };

test("AS15 : personnesEcrivables, miroir des rules (2) : 20 au plus, uid non vide, nom de 1 à 60", () => {
  const p = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `uid-${i}`, nom: `Nom ${i}` }));
  expect(personnesEcrivables(p(20))).toBe(true);
  expect(personnesEcrivables(p(21))).toBe(false);
  expect(personnesEcrivables([{ uid: "", nom: "Lina" }])).toBe(false);
  expect(personnesEcrivables([{ uid: "uid-lina", nom: "" }])).toBe(false);
  expect(personnesEcrivables([{ uid: "uid-lina", nom: "x".repeat(61) }])).toBe(false);
  expect(personnesEcrivables("Lina")).toBe(false);
});

test.describe("AR, T3b : fonctions du chevauchement", () => {
  test("même salle (une ancienne « scene » est la Grande salle) ; bornes qui se touchent permises ; hors elle-même", () => {
    const occ = occupationsDu("2026-11-15", { ...SOURCES, reservations: [R({ id: "a", salle: "scene", debut: "18:30", fin: "19:30" })] });
    // Bonté : groupe 13:00 – 14:30 ; 14:30 – 15:30 la touche sans la croiser.
    expect(chevauchement(occ, "bonte", { debut: "14:00", fin: "15:00" })?.debut).toBe("13:00");
    expect(chevauchement(occ, "bonte", { debut: "14:30", fin: "15:30" })).toBeNull();
    // Ancienne « scene » réservée : la Grande salle est prise (AS14) ; pas la réservation qu'on modifie.
    expect(chevauchement(occ, "grande", { debut: "19:00", fin: "20:00" })?.id).toBe("a");
    expect(chevauchement(occ, "grande", { debut: "19:00", fin: "20:00" }, "a")).toBeNull();
    expect(sallesLibres(occ, { debut: "19:00", fin: "20:00" })).not.toContain("grande");
    expect(sallesLibres(occ, { debut: "19:00", fin: "20:00" })).toContain("bonte");
  });

  test("Décaler : même salle, même durée, après l'occupation (et celles qui suivent), avant 22:00", () => {
    const occ = occupationsDu("2026-11-15", { ...SOURCES, reservations: [
      R({ id: "a", salle: "reunion", debut: "18:00", fin: "19:00" }),
      R({ id: "b", salle: "reunion", debut: "19:30", fin: "20:00" }),
    ] });
    expect(decalage(occ, "bonte", { debut: "14:00", fin: "15:00" })).toEqual({ debut: "14:30", fin: "15:30" });
    // 18:30 – 19:30 : après 19:00, une heure ne tient pas avant 19:30 ; 20:00 – 21:00.
    expect(decalage(occ, "reunion", { debut: "18:30", fin: "19:30" })).toEqual({ debut: "20:00", fin: "21:00" });
    // Trois heures après 20:00 dépassent 22:00 : pas de « Décaler ».
    expect(decalage(occ, "reunion", { debut: "19:00", fin: "22:00" })).toBeNull();
    // Libre : rien à décaler.
    expect(decalage(occ, "imprimante", { debut: "18:00", fin: "19:00" })).toBeNull();
  });

  test("SA9 : une autre réservation qui croise ; clé stable ; message aux deux auteurs", () => {
    const moi = R({ id: "m", salle: "grande", debut: "18:00", fin: "19:00", quoi: "Chorale", auteurNom: "Ysaline" });
    const autre = R({ id: "o", salle: "scene", debut: "18:30", fin: "19:30", quoi: "Danse", pour: "Gp Joie", auteurNom: "Corentin" });
    expect(autreQuiCroise(moi, [moi, autre])?.id).toBe("o");
    expect(autreQuiCroise(moi, [moi, { ...autre, date: "2026-11-16" }])).toBeNull();
    expect(autreQuiCroise(moi, [moi, { ...autre, debut: "19:00" }])).toBeNull();
    expect(conflictKey(["o", "m"])).toBe(conflictKey(["m", "o"]));
    const fr = conflictMessage(moi, autre, "fr");
    expect(fr.title).toBe("Salles : chevauchement");
    expect(fr.body).toBe("Dimanche 15 novembre : Grande salle 18:00–19:00 (Chorale, Ysaline) et Grande salle 18:30–19:30 (Danse · Gp Joie, Corentin) se chevauchent. Mettez-vous d'accord.");
    expect(conflictMessage(moi, autre, "zh-CN").title).toBe("场地：时段重叠");
  });
});

const refus = (page: Page) => feuille(page).locator("[data-refus]");

test.describe("AR, T3b : refus du chevauchement dans la feuille", () => {
  test("le moment changé fait croiser la salle choisie : l'occupant et l'heure, « Décaler », salles libres", async ({ page }) => {
    const db = await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:00");
    await salles(page).getByRole("radio", { name: /Salle Bonté/ }).check();
    await f.getByLabel("Pour quoi").fill("Atelier");
    await f.getByLabel("De", { exact: true }).fill("14:00");
    await f.getByLabel("À", { exact: true }).fill("15:00");
    await expect(refus(page)).toContainText("Salle Bonté est prise : Groupe Bonté, 13:00 – 14:30.");
    await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
    await expect(refus(page).getByText("Libres au même moment")).toBeVisible();
    await expect(refus(page).locator('[data-libres] [data-salle="reunion"]')).toBeVisible();
    await expect(refus(page).locator('[data-libres] [data-salle="bonte"]')).toHaveCount(0);
    await refus(page).getByRole("button", { name: "Décaler à 14:30 – 15:30" }).click();
    await expect(f.getByLabel("De", { exact: true })).toHaveValue("14:30");
    await expect(f.getByLabel("À", { exact: true })).toHaveValue("15:30");
    await expect(refus(page)).toHaveCount(0);
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(f).toBeHidden();
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data).toMatchObject({ salle: "bonte", debut: "14:30", fin: "15:30" });
    await verifierSansDebordement(page);
  });

  test("une salle libre au même moment se choisit d'un geste", async ({ page }) => {
    await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await salles(page).getByRole("radio", { name: /Salle Bonté/ }).check();
    await f.getByLabel("De", { exact: true }).fill("14:00");
    await refus(page).locator('[data-libres] [data-salle="reunion"]').click();
    await expect(salles(page).getByRole("radio", { name: /Salle de réunion/ })).toBeChecked();
    await expect(refus(page)).toHaveCount(0);
  });

  test("la Grande salle est prise par le culte sinophone (plus de Scène, AS14)", async ({ page }) => {
    await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("18:00");
    await f.getByLabel("À", { exact: true }).fill("19:00");
    await salles(page).getByRole("radio", { name: /Grande salle/ }).check();
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:30");
    await expect(refus(page)).toContainText("Grande salle est prise : Culte sinophone, 15:00 – 17:00.");
    await expect(refus(page).getByRole("button", { name: "Décaler à 17:00 – 18:30" })).toBeVisible();
    await expect(refus(page).locator('[data-libres] [data-salle="grande"]')).toHaveCount(0);
  });

  test("à l'envoi, les réservations se relisent : une réservation faite entre-temps refuse l'écriture et se nomme", async ({ page }) => {
    const db = await ouvrir(page);
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("18:00");
    await f.getByLabel("À", { exact: true }).fill("19:00");
    await salles(page).getByRole("radio", { name: /Grande salle/ }).check();
    await f.getByLabel("Pour quoi").fill("Chorale");
    // Pendant ce temps, une autre réserve (ancien document « scene », lu Grande salle) de 18:30 à 19:30.
    db.set("reservations/r-ysaline", reservation({ salle: "scene", date: "2026-11-15", debut: "18:30", fin: "19:30", pour: "Gp Joie", quoi: "Danse", auteurUid: "uid-ysaline", auteurNom: "Ysaline" }));
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(refus(page)).toContainText("Grande salle est prise : Danse · Gp Joie, 18:30 – 19:30.");
    await expect(f).toBeVisible();
    expect(db.writes.filter((w) => w.method === "POST" && w.path.startsWith("reservations"))).toHaveLength(0);
    await refus(page).getByRole("button", { name: "Décaler à 19:30 – 20:30" }).click();
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(f).toBeHidden();
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data).toMatchObject({ salle: "grande", debut: "19:30", fin: "20:30" });
  });

  test("modifier la sienne vers un moment pris : refusé, hors elle-même", async ({ page }) => {
    const db = await ouvrir(page, { vue: "grille" });
    await bloc(page, "reunion", "19:00").click();
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const f = feuille(page);
    // Elle-même ne bloque pas : la fin repoussée passe.
    await expect(refus(page)).toHaveCount(0);
    db.set("reservations/r-autre", reservation({ salle: "reunion", date: "2026-11-15", debut: "20:30", fin: "21:30", quoi: "Comptes", auteurUid: "uid-corentin", auteurNom: "Corentin" }));
    await f.getByLabel("À", { exact: true }).fill("21:00");
    await f.getByRole("button", { name: "Enregistrer" }).click();
    await expect(refus(page)).toContainText("Salle de réunion est prise : Comptes, 20:30 – 21:30.");
    expect(db.writes.filter((w) => w.method === "PATCH" && w.path.startsWith("reservations"))).toHaveLength(0);
  });

  test("SA9 : une réservation écrite au même moment qui croise la sienne est signalée au serveur", async ({ page }) => {
    const db = await ouvrir(page);
    let envoye: { body: { reservationIds: string[] }; auth?: string } | null = null;
    await page.route("**/api/salles/conflit", (route) => {
      envoye = { body: route.request().postDataJSON(), auth: route.request().headers()["authorization"] };
      return route.fulfill({ json: { ok: true, notified: 2 } });
    });
    // Une autre écrit juste avant l'écriture de Léandre, après sa relecture.
    await page.route(/firestore\.googleapis\.com.*\/reservations(\?|$)/, async (route) => {
      if (route.request().method() === "POST") db.set("reservations/course", reservation({ salle: "imprimante", date: "2026-11-15", debut: "16:30", fin: "17:30", quoi: "Tri", auteurUid: "uid-ysaline", auteurNom: "Ysaline" }));
      await route.fallback();
    });
    await ouvrirLaFeuille(page);
    const f = feuille(page);
    await f.getByLabel("De", { exact: true }).fill("16:00");
    await f.getByLabel("À", { exact: true }).fill("17:00");
    await salles(page).getByRole("radio", { name: /Salle imprimante/ }).check();
    await f.getByLabel("Pour quoi").fill("Partitions");
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(f).toBeHidden();
    await expect.poll(() => envoye).not.toBeNull();
    expect(envoye!.auth).toMatch(/^Bearer /);
    expect(envoye!.body.reservationIds).toHaveLength(2);
    expect(envoye!.body.reservationIds).toContain("course");
  });

  test("route de conflit : refusée sans jeton", async ({ request }) => {
    const res = await request.post("/api/salles/conflit", { data: { reservationIds: ["a", "b"] } });
    expect(res.status()).toBe(401);
  });

  test("en 中文 : le refus et « Décaler »", async ({ page }) => {
    await ouvrir(page, { zh: true });
    await page.getByRole("button", { name: "预订场地" }).click();
    const f = feuille(page);
    await f.getByLabel("从", { exact: true }).fill("16:00");
    await salles(page).getByRole("radio", { name: /Salle Bonté/ }).check();
    await f.getByLabel("从", { exact: true }).fill("14:00");
    await expect(refus(page)).toContainText("Salle Bonté已被占用：恩慈团契，13:00–14:30。");
    await expect(refus(page).getByRole("button", { name: "改到 14:30–15:30" })).toBeVisible();
    await expect(refus(page).getByText("同一时段空闲")).toBeVisible();
    await verifierSansDebordement(page);
  });
});

// T7 (AS13, RS8) : la pastille de la salle (9 px) devant son nom, après le radio ; « Libre » en graisse 600, encre normale.
test.describe("AS, T7 : couleurs des salles dans la feuille Réserver", () => {
  test("pastille de 9 px de la couleur de la salle, après le radio ; « Libre » en 600", async ({ page }) => {
    await ouvrir(page);
    await ouvrirLaFeuille(page);
    const attendues: Record<string, string> = { grande: "rgb(45, 90, 101)", fidelite: "rgb(160, 48, 48)", zhongban: "rgb(59, 109, 17)", reunion: "rgb(100, 116, 139)" };
    for (const [id, couleur] of Object.entries(attendues)) {
      const rangee = salles(page).locator(`label[data-salle="${id}"]`);
      const pastille = rangee.locator("[data-couleur-salle]");
      await expect(pastille).toHaveCSS("width", "9px");
      await expect(pastille).toHaveCSS("height", "9px");
      await expect(pastille).toHaveCSS("background-color", couleur);
      // Après le radio, avant le nom.
      const [xr, xp, xn] = await Promise.all([
        rangee.locator("input[type=radio]").evaluate((e) => e.getBoundingClientRect().right),
        pastille.evaluate((e) => e.getBoundingClientRect().left),
        rangee.getByText(/^(Grande salle|Salle Fidélité|Salle 中班|Salle de réunion)$/).evaluate((e) => e.getBoundingClientRect().left),
      ]);
      expect(xp).toBeGreaterThanOrEqual(xr);
      expect(xp).toBeLessThan(xn);
    }
    const mot = salles(page).locator('label[data-salle="reunion"] [data-libre]');
    await expect(mot).toHaveText("Libre");
    await expect(mot).toHaveCSS("font-weight", "600");
    await expect(mot).toHaveCSS("color", await page.evaluate(() => getComputedStyle(document.body).color));
  });
});
