import "./helpers/cleFirebase";
import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";
import { ecartsSetlistsFete } from "../src/lib/fetes/suiviSetlists";

// R3 du parcours à l'œil du 14/11/2026 (docs/parcours-oeil-2026-11-14.md) : la page d'un chant disait « prévu le
// 24/12 » pour Noël, le 25. Cause : une setlist de fête gardait la date du jour J de sa création, et celle d'un
// passage retiré restait publiée. Désormais, après une écriture du jour J ou de l'ordre de passage, la gestion de la
// fête recale les dates de ses setlists et met à la corbeille celles des passages qui n'existent plus.

const fete = (passage: string) => ({ programme: "noel-2026", passage, qui: "Gp Paix" });

test.describe("ecartsSetlistsFete", () => {
  const edition = { jourJ: "2026-12-25", passages: [{ id: "a1" }, { id: "b2" }, {}] };

  test("date différente du jour J : à recaler ; passage absent : à la corbeille ; à jour : rien", () => {
    expect(ecartsSetlistsFete(edition, [
      { id: "noel-2026-a1", date: "2026-12-24", fete: fete("a1") },
      { id: "noel-2026-b2", date: "2026-12-25", fete: fete("b2") },
      { id: "noel-2026-zz", date: "2026-12-24", fete: fete("zz") },
    ])).toEqual({ recaler: ["noel-2026-a1"], corbeille: ["noel-2026-zz"] });
  });

  test("une setlist sans fête n'est jamais touchée ; jour J vide : aucune date recalée", () => {
    expect(ecartsSetlistsFete({ jourJ: "", passages: [{ id: "a1" }] }, [
      { id: "x", date: "2026-12-24" },
      { id: "noel-2026-a1", date: "2026-12-24", fete: fete("a1") },
    ])).toEqual({ recaler: [], corbeille: [] });
  });
});

const BO = "/back-office/evenements/scene";
const PASSAGES = [
  { id: "aaaa1111", quoi: "Chant", qui: ["Gp Paix"], titre: "Groupe Paix" },
  { id: "bbbb2222", quoi: "Chant", qui: ["Gp Bonté"], titre: "Groupe Bonté" },
];
const NOEL_2026 = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-25", debut: "2026-10-01", ouvert: true,
  passages: PASSAGES, plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  createdBy: "uid-lea", updatedAt: "2026-10-01T10:00:00Z",
};
const setlist = (passage: string, date: string, qui: string) => ({
  title: `Noël 2026 · ${qui}`, leader: "Léa M.", category: "Noël", date, language: "fr", notes: "", items: [],
  isDraft: false, isPrivate: false, ownerId: null, editeurs: [], fete: { programme: "noel-2026", passage, qui },
});
const LEA: FakeProfile = {
  uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.",
  dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], responsabilites: ["orga"],
};

test("retirer un passage : sa setlist va à la corbeille, l'orpheline aussi, la date d'une autre suit le jour J", async ({ page }) => {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  const db = await signInAs(page, LEA, {
    "programmes/noel-2026": NOEL_2026,
    // Créée quand le jour J était le 24 : date restée en arrière.
    "setlists/noel-2026-aaaa1111": setlist("aaaa1111", "2026-12-24", "Gp Paix"),
    "setlists/noel-2026-bbbb2222": setlist("bbbb2222", "2026-12-25", "Gp Bonté"),
    // Passage retiré avant ce correctif : la setlist « prévu le 24/12 » du parcours.
    "setlists/noel-2026-orphe000": setlist("orphe000", "2026-12-24", "Gp Fidélité"),
    "setlists/culte-ordinaire": { title: "Culte", category: "Culte", date: "2026-12-24", isDraft: false, isPrivate: false, ownerId: "uid-lea", items: [] },
  }, `${BO}/noel?vue=ordre`);
  const liste = page.getByRole("list", { name: /Ordre de Passage jour J/ });
  await expect(liste.getByRole("listitem")).toHaveCount(2);

  await liste.getByRole("listitem").nth(1).getByRole("button", { name: "Retirer" }).click();
  await repondreDansLeSite(page, "Retirer");
  await expect(liste.getByRole("listitem")).toHaveCount(1);

  await expect.poll(() => db.doc("setlists/noel-2026-bbbb2222")?.supprimeeLe).toBeTruthy();
  await expect.poll(() => db.doc("setlists/noel-2026-orphe000")?.supprimeeLe).toBeTruthy();
  await expect.poll(() => db.doc("setlists/noel-2026-aaaa1111")?.date).toBe("2026-12-25");
  expect(db.doc("setlists/noel-2026-aaaa1111")?.supprimeeLe).toBeUndefined();
  expect(db.doc("setlists/noel-2026-bbbb2222")?.supprimeePar).toBe("uid-lea");
  // Une setlist hors fête n'est jamais écrite.
  expect(db.writes.filter((w) => w.path === "setlists/culte-ordinaire")).toEqual([]);
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toHaveCount(0);
});
