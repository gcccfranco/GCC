import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";
import { creneauEnReservation } from "./helpers/creneauxScene";
import { canEditReservation, canReserverPour } from "../src/lib/access";

// Chantier AR (docs/spec-salles.md), lot 5, tranche T5a (AR19 à AR21) : un créneau de fête est une réservation
// (`reservations/{id}`, `fete`) ; AS14 : de la Grande salle (`salle: "grande"`), les anciens documents `salle: "scene"`
// se lisent comme elle. Réservé depuis la page de Noël, il paraît dans Salles sur la Grande salle ; « Qui peut réserver » tient (client et rules) ; les anciens `programmes/{id}/creneaux` ne
// sont plus lus ni touchés. Firestore et date simulés ; personnes fictives.

const NOEL = {
  nom: "Noël 2026", jourJ: "2026-12-24", debut: "2026-10-01", fin: "2026-12-20", visible: true, ouvert: true, passages: [],
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  quiAutorises: ["Gp Paix", "Gp Amour"],
  createdBy: "uid-ondine", updatedAt: "2026-09-14T20:00:00Z",
};
const MARIUS: FakeProfile = { uid: "uid-marius", email: "marius@example.com", firstName: "Marius", lastName: "Vellard" };

/** Un créneau de Noël (forme d'avant le lot 5), à l'auteur Ondine. */
const creneau = (x: Record<string, unknown> = {}) => ({
  dimanche: "2026-10-11", debut: "16:00", fin: "17:00", quoi: "Danse", qui: ["Gp Paix"], note: "",
  auteurUid: "uid-ondine", auteurNom: "Ondine C.", createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-01T09:00:00Z", ...x,
});

/** Lundi 5 octobre 2026 à 10:00, saison de Noël ouverte. */
async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>, to = "/evenements/scene/noel") {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00+02:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(() => { try { localStorage.setItem("gcc-salles-vue", "liste"); } catch {} });
  return signInAs(page, qui, { "programmes/noel": NOEL, ...docs }, to);
}

const bloc = (page: Page, jour: string) => page.getByRole("region", { name: jour, exact: true });
const feuille = (page: Page) => page.getByRole("dialog");
const liste = (page: Page) => page.getByRole("list", { name: /^(Salles|场地)$/ });
const ligne = (page: Page, nom: string) => liste(page).getByRole("listitem").filter({ has: page.getByText(nom, { exact: true }) });
const etat = (page: Page, nom: string) => ligne(page, nom).locator("[data-etat]");

test.describe("AR, T5a, AS14 : les créneaux de fête sont des réservations de la Grande salle", () => {
  test("réserver depuis la page de Noël écrit reservations/{id} (Grande salle, fête, date, qui, pour) ; Salles le montre sur la Grande salle", async ({ page }) => {
    const db = await ouvrir(page, MARIUS, {});
    await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 12:00" }).click();
    const f = feuille(page);
    await f.getByLabel("à", { exact: true }).selectOption("11:00");
    await f.getByRole("radio", { name: "Sketch" }).check();
    await f.getByRole("checkbox", { name: "Gp Amour" }).check();
    await f.getByLabel("Note").fill("Avec la sono");
    await f.getByRole("button", { name: "Réserver", exact: true }).click();
    await expect(feuille(page)).toHaveCount(0);
    await expect(bloc(page, "Samedi 10 octobre").getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" })).toContainText("à moi");

    const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"));
    expect(cree?.data).toMatchObject({
      salle: "grande", fete: "noel", date: "2026-10-10", debut: "10:00", fin: "11:00", quoi: "Sketch", qui: ["Gp Amour"],
      pour: "Gp Amour", note: "Avec la sono", auteurUid: "uid-marius", auteurNom: "Marius Vellard",
    });
    expect(cree?.data).not.toHaveProperty("dimanche");
    expect(db.writes.filter((w) => w.path.startsWith("programmes/"))).toHaveLength(0);

    // Le samedi 10 à 10:30 (aucun emploi fixe le samedi), dans Salles : la Grande salle est prise par la réservation.
    await page.clock.setFixedTime(new Date("2026-10-10T10:30:00+02:00"));
    await page.goto("/evenements/salles");
    await expect(etat(page, "Grande salle")).toHaveText("Sketch · Gp Amour jusqu'à 11:00");
    await expect(ligne(page, "Grande salle")).toContainText("10:00 – 11:00 · Sketch · Gp Amour · Marius Vellard");
  });

  test("une ancienne réservation « scene », avec ou sans fête, se lit sur la ligne Grande salle (AS14, RS9)", async ({ page }) => {
    await ouvrir(page, MARIUS, {
      "reservations/r1": creneauEnReservation("noel", creneau({ dimanche: "2026-10-10", debut: "10:00", fin: "11:00", quoi: "Sketch", qui: ["Gp Amour"] })),
      "reservations/r2": { salle: "scene", date: "2026-10-10", debut: "14:00", fin: "15:00", pour: "", quoi: "Répétition sono", auteurUid: "uid-ondine", auteurNom: "Ondine C.", createdAt: "", updatedAt: "" },
    }, "/evenements/salles");
    await page.clock.setFixedTime(new Date("2026-10-10T10:30:00+02:00"));
    await page.reload();
    await expect(ligne(page, "Scène")).toHaveCount(0);
    await expect(etat(page, "Grande salle")).toHaveText("Sketch · Gp Amour jusqu'à 11:00");
    await expect(ligne(page, "Grande salle")).toContainText("14:00 – 15:00 · Répétition sono");
  });

  test("la page de Noël lit les réservations de sa fête, pas les anciens créneaux (AR19) ; retirer supprime la réservation seule", async ({ page }) => {
    const db = await ouvrir(page, MARIUS, {
      "reservations/r1": creneauEnReservation("noel", creneau({ auteurUid: "uid-marius", auteurNom: "Marius V." })),
      // Une ancienne réservation « scene » sans fête (Salles) et une d'une autre édition : pas des créneaux de Noël.
      "reservations/r2": { salle: "scene", date: "2026-10-11", debut: "18:00", fin: "19:00", pour: "", quoi: "Répétition sono", auteurUid: "uid-ondine", auteurNom: "Ondine C.", createdAt: "", updatedAt: "" },
      "reservations/r3": creneauEnReservation("paques-2027", creneau({ debut: "14:00", fin: "15:00", quoi: "Chant" })),
      // Un ancien créneau, jamais relu ni retiré.
      "programmes/noel/creneaux/ancien": creneau({ debut: "17:00", fin: "18:00", quoi: "Sketch" }),
    });
    const dimanche = bloc(page, "Dimanche 11 octobre");
    await expect(dimanche.getByRole("listitem").filter({ hasText: "Danse · Gp Paix" })).toContainText("16:00");
    await expect(dimanche.getByRole("listitem").filter({ hasText: "Sketch" })).toHaveCount(0);
    await expect(dimanche.getByRole("listitem").filter({ hasText: "Chant" })).toHaveCount(0);
    await expect(dimanche.getByRole("button", { name: "Réserver 17:00 – 18:00" })).toHaveCount(1);

    await dimanche.getByRole("listitem").filter({ hasText: "Danse · Gp Paix" }).getByRole("button", { name: /^Plus d'actions/ }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Retirer", exact: true }).click();
    await expect.poll(() => db.writes.find((w) => w.method === "DELETE")?.path).toBe("reservations/r1");
    expect(db.doc("programmes/noel/creneaux/ancien")).toBeTruthy();
    expect(db.doc("reservations/r2")).toBeTruthy();
  });

  test("« Qui peut réserver » : le client garde canReserverPour ; canEditReservation laisse l'auteur et la coordination", () => {
    const membre = { uid: "uid-marius", email: "marius@example.com" };
    expect(canReserverPour(membre as never, null, NOEL, ["Gp Amour"])).toBe(true);
    expect(canReserverPour(membre as never, null, NOEL, ["Franco"])).toBe(false);
    expect(canReserverPour(membre as never, null, { ...NOEL, fermees: true }, ["Gp Amour"])).toBe(false);
    const r = creneauEnReservation("noel", creneau()) as { auteurUid: string };
    expect(canEditReservation(membre as never, null, r)).toBe(false);
    expect(canEditReservation({ ...membre, uid: "uid-ondine" } as never, null, r)).toBe(true);
  });

  test("règles : une réservation de fête passe par reservable(fete, qui), sauf coordination et gestionnaires de planning ; champs permis", () => {
    const rules = readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");
    const plat = (s: string) => s.replace(/\s+/g, " ");
    const bloc = plat(rules.slice(rules.indexOf("match /reservations/{id}"), rules.indexOf("}", rules.indexOf("allow delete", rules.indexOf("match /reservations/{id}")))));
    const create = bloc.slice(bloc.indexOf("allow create"), bloc.indexOf("allow update"));
    const update = bloc.slice(bloc.indexOf("allow update"), bloc.indexOf("allow delete"));
    expect(create).toContain("reservationValide()");
    expect(create).toContain("feteReservable()");
    expect(update).toContain("feteReservable()");
    expect(update).toContain("request.resource.data.get('fete', null) == resource.data.get('fete', null)");
    const fn = plat(rules.slice(rules.indexOf("function feteReservable()"), rules.indexOf("match /reservations/{id}")));
    expect(fn).toContain("!('fete' in request.resource.data) || isCoordination() || gereUnPlanning() || reservable(request.resource.data.fete, request.resource.data.qui)");
    const valide = plat(rules.slice(rules.indexOf("function reservationValide()"), rules.indexOf("function feteReservable()")));
    expect(valide).toContain("r.keys().hasOnly(['salle', 'date', 'debut', 'fin', 'pour', 'quoi', 'auteurUid', 'auteurNom', 'createdAt', 'updatedAt', 'fete', 'qui', 'note', 'libre'])");
    expect(valide).not.toContain("r.salle == 'scene' && r.fete");
    expect(valide).toContain("(request.method == 'update' && r.salle == 'scene' && resource.data.salle == 'scene')");
    expect(valide).toContain("(!('fete' in r) || (r.fete is string && r.qui is list && r.get('note', '') is string))");
    // reservable() sert aussi aux anciens créneaux, qui restent tels quels (AR19).
    expect(plat(rules)).toContain("reservable(id, request.resource.data.qui)");
  });
});

test.describe("AR, T5b, AS14 : dans Salles, la Grande salle se réserve en saison de fête (la feuille unique vient en T2)", () => {
  test("choisir la Grande salle pendant la saison de Noël : aucune Scène à choisir, aucun message, rien qui bloque", async ({ page }) => {
    await ouvrir(page, MARIUS, {}, "/evenements/salles");
    await page.getByRole("button", { name: "Réserver une salle" }).click();
    const f = page.getByRole("dialog", { name: "Réserver une salle" });
    await f.getByLabel("Date").fill("2026-10-07");
    await f.getByLabel("De", { exact: true }).fill("18:00");
    await f.getByLabel("À", { exact: true }).fill("19:00");
    await expect(f.locator('[data-salle="scene"]')).toHaveCount(0);
    await f.locator('[data-salle="grande"]').click();
    await f.getByLabel("Pour quoi").fill("Répétition du chœur");
    await expect(f.locator("[data-scene-fete]")).toHaveCount(0);
    await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeEnabled();
  });
});
