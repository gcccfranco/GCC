import { expect, test, type Page } from "@playwright/test";
import { annulationKey, annulationMessage, destinatairesAnnulation } from "../src/lib/salles/annulation";
import type { Reservation } from "../src/lib/firebase/reservations";
import { coordination, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";
import { creneauEnReservation } from "./helpers/creneauxScene";
import { simulerAnnulation } from "./helpers/annulation";

// Lot AS, T9 (docs/spec-reserver-unique-fetes.md, AS16, RS11) : la coordination qui supprime la réservation d'un autre
// l'annule avec un motif (route /api/salles/annulation, simulée ici) ; l'auteur qui supprime la sienne : sans motif ;
// un membre : aucun bouton. Firestore et date simulés ; personnes fictives.

const MAINTENANT = "2026-11-01T10:00:00Z";
const reservation = (r: Record<string, unknown>) => ({ pour: "", createdAt: MAINTENANT, updatedAt: MAINTENANT, ...r });
const DOCS: Record<string, Record<string, unknown>> = {
  "reservations/r-oriane": reservation({ salle: "fidelite", date: "2026-11-15", debut: "18:30", fin: "19:30", pour: "Gp Fidélité", quoi: "Sketch", auteurUid: "uid-oriane", auteurNom: "Oriane" }),
  "reservations/r-sidonie": reservation({ salle: "reunion", date: "2026-11-15", debut: "19:00", fin: "20:30", quoi: "Préparation", auteurUid: "uid-sidonie", auteurNom: "Sidonie" }),
};
const MEMBRE: FakeProfile = { uid: "uid-leandre", email: "leandre@example.com", firstName: "Léandre", lastName: "Mazurier" };
const COORD: FakeProfile = { uid: "uid-sidonie", email: "sidonie@example.com", firstName: "Sidonie", lastName: "Arnaud", ...coordination() };
const DIMANCHE_14H = "2026-11-15T14:00:00+01:00";

async function ouvrirSalles(page: Page, qui: FakeProfile, zh = false): Promise<FakeDb> {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(DIMANCHE_14H));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript((z) => {
    try {
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("gcc-salles-vue", "grille");
    } catch {}
  }, zh);
  return signInAs(page, qui, DOCS, "/evenements/salles");
}

const bloc = (page: Page, id: string, debut: string) => page.locator(`[data-grille-salles] [data-colonne="${id}"] [data-bloc][data-debut="${debut}"]`);
const detail = (page: Page) => page.getByRole("dialog").filter({ has: page.getByText(/Inscrit par|登记/) });
const feuille = (page: Page) => page.getByRole("alertdialog");

test.describe("AS16 : Salles", () => {
  test("la coordination sur la réservation d'un autre : motif obligatoire, route appelée, réservation retirée", async ({ page }) => {
    await ouvrirSalles(page, COORD);
    const envois = await simulerAnnulation(page);
    await bloc(page, "fidelite", "18:30").click();
    await detail(page).getByRole("button", { name: "Annuler la réservation…", exact: true }).click();
    const f = feuille(page);
    await expect(f).toContainText("Annuler la réservation…");
    const envoyer = f.getByRole("button", { name: "Annuler la réservation", exact: true });
    await expect(envoyer).toBeDisabled();
    await f.getByLabel("Motif (envoyé à l'auteur)").fill("   ");
    await expect(envoyer).toBeDisabled();
    await f.getByLabel("Motif (envoyé à l'auteur)").fill("x".repeat(250));
    await expect(f.getByLabel("Motif (envoyé à l'auteur)")).toHaveValue("x".repeat(200));
    await f.getByLabel("Motif (envoyé à l'auteur)").fill("Salle fermée pour travaux");
    await expect(envoyer).toBeEnabled();
    await envoyer.click();
    await expect(bloc(page, "fidelite", "18:30")).toHaveCount(0);
    expect(envois).toHaveLength(1);
    expect(envois[0].body).toEqual({ reservationId: "r-oriane", motif: "Salle fermée pour travaux" });
    expect(envois[0].auth).toMatch(/^Bearer /);
  });

  test("l'auteur (même coordination) qui supprime la sienne : confirmation, suppression directe, sans motif ni route", async ({ page }) => {
    const db = await ouvrirSalles(page, COORD);
    const envois = await simulerAnnulation(page);
    await bloc(page, "reunion", "19:00").click();
    await detail(page).getByRole("button", { name: "Supprimer", exact: true }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(bloc(page, "reunion", "19:00")).toHaveCount(0);
    expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("reservations/r-sidonie");
    expect(envois).toHaveLength(0);
  });

  test("un membre sur la réservation d'un autre : aucun bouton", async ({ page }) => {
    await ouvrirSalles(page, MEMBRE);
    await bloc(page, "fidelite", "18:30").click();
    await expect(detail(page)).toContainText("Oriane");
    await expect(detail(page).getByRole("button", { name: /^(Annuler la réservation…|Supprimer)$/ })).toHaveCount(0);
  });

  test("中文 : le bouton dit 取消预约…", async ({ page }) => {
    await ouvrirSalles(page, COORD, true);
    await bloc(page, "fidelite", "18:30").click();
    await expect(detail(page).getByRole("button", { name: "取消预约…", exact: true })).toBeVisible();
  });
});

test.describe("AS16 : page d'une fête", () => {
  const NOEL = { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-odile", updatedAt: "2026-09-14T20:00:00Z" };
  const C_BASILE = {
    dimanche: "2026-10-04", debut: "17:00", fin: "18:30", quoi: "Chant", qui: ["EDD 中班"], note: "",
    auteurUid: "uid-basile", auteurNom: "Basile T.", createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
  };
  const ODILE: FakeProfile = { uid: "uid-odile", email: "odile@example.com", firstName: "Odile", lastName: "V.", ...coordination() };

  test("la coordination annule la réservation d'un autre depuis « ⋯ » : motif, route, réservation retirée", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ODILE, { "programmes/noel": NOEL, "reservations/c1": creneauEnReservation("noel", C_BASILE) }, "/evenements/scene/noel");
    const envois = await simulerAnnulation(page);
    const jour = page.getByRole("region", { name: "Dimanche 4 octobre" });
    await jour.getByRole("button", { name: /^Plus d'actions/ }).click();
    await page.getByRole("menuitem", { name: "Annuler la réservation…" }).click();
    const f = feuille(page);
    const envoyer = f.getByRole("button", { name: "Annuler la réservation", exact: true });
    await expect(envoyer).toBeDisabled();
    await f.getByLabel("Motif (envoyé à l'auteur)").fill("Répétition déplacée");
    await envoyer.click();
    // La feuille se ferme une fois la route répondue : le test ne finit pas pendant que la route simulée tourne.
    await expect(f).toHaveCount(0);
    await expect.poll(() => envois.map((e) => e.body)).toEqual([{ reservationId: "c1", motif: "Répétition déplacée" }]);
    await expect(jour.getByText("Chant · EDD 中班")).toHaveCount(0);
  });
});

test("la route d'annulation sans jeton répond 401", async ({ request }) => {
  expect((await request.post("/api/salles/annulation", { data: { reservationId: "a", motif: "x" } })).status()).toBe(401);
});

// ─── Message et destinataires (fonctions pures) ─────────────────────────────

const R: Reservation = {
  id: "r1", salle: "scene", date: "2026-12-08", debut: "19:00", fin: "20:00", pour: "Lina, Maé", quoi: "Répétition",
  auteurUid: "uid-auteur", auteurNom: "Basile", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  personnes: [{ uid: "uid-lina", nom: "Lina" }, { uid: "uid-mae", nom: "Maé" }, { uid: "uid-auteur", nom: "Basile" }, { uid: "uid-appelant", nom: "Odile" }],
};

test("message d'annulation : FR et 中文, une ancienne « scene » lue comme la Grande salle", () => {
  const fr = annulationMessage(R, "Salle fermée", "fr");
  expect(fr.title).toBe("Salles : réservation annulée");
  expect(fr.body).toBe("Ta réservation de la Grande salle du mar. 8 déc., 19:00 – 20:00, a été annulée : Salle fermée");
  const zh = annulationMessage(R, "场地维修", "zh-CN");
  expect(zh.title).toBe("场地：预约已取消");
  expect(zh.body).toContain("19:00–20:00");
  expect(zh.body).toContain("Grande salle");
  expect(zh.body).toMatch(/已被取消：场地维修$/);
  expect(annulationKey("r1")).toBe("annulation-r1");
});

test("destinataires : l'auteur et les personnes cochées, sans doublon ni l'appelant", () => {
  expect(destinatairesAnnulation(R, "uid-appelant")).toEqual(["uid-auteur", "uid-lina", "uid-mae"]);
  expect(destinatairesAnnulation({ auteurUid: "uid-auteur" }, "uid-appelant")).toEqual(["uid-auteur"]);
});
