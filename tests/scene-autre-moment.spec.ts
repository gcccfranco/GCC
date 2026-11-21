import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";
import { versToutesLesReservations } from "./helpers/saisonScene";
import { fenetresLibres, horsGrille, saisonDe, semainesDe, lignesDuJour } from "../src/lib/scene/saison";
import { occupationsFixes } from "../src/lib/salles/emploi";
import { creneauxEnReservations } from "./helpers/creneauxScene";

// Lot AQ, tranche SQ-B (docs/spec-scene-qui-autre-moment.md) : « Réserver un autre moment ». Réécrite au lot 5 de
// Salles, T5b (docs/spec-salles.md, AR22) : plus de créneaux fixes ni de bouton « Un autre moment » ; chaque jour dit
// quand la scène est libre (plages moins l'emploi du temps fixe, Salles, évènements), « Réserver » ouvre la seule
// feuille « de / à », la fenêtre touchée pré-remplie ; un chevauchement est refusé avec le message de Salles (SA8).
// Lot AS, T3 (docs/spec-reserver-unique-fetes.md) : « Réserver » ouvre la feuille unique de Salles (Grande salle choisie, « Oui, pour
// Noël » coché d'avance, de / à en heures libres), plus l'ancienne feuille de la fête.
// Captures : test-results-captures/t5b/<projet>-<fr|zh>-<volet|feuille>.png (hors de test-results/, que Playwright vide).

const NOEL = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, ouvert: true,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  passages: [{ quoi: "Chant", qui: ["Gp Paix"], titre: "Ouverture" }],
  createdBy: "uid-ines", updatedAt: "2026-09-14T20:00:00Z",
};
const resa = (id: string, over: Record<string, unknown> = {}) => ({
  id, dimanche: "2026-10-14", debut: "19:00", fin: "20:00", quoi: "Sketch", qui: ["Gp Paix"], note: "", libre: true,
  auteurUid: "uid-ines", auteurNom: "Inès V.", createdAt: "", updatedAt: "", ...over,
});
const MEMBRE: FakeProfile = { uid: "uid-sami", email: "sami@example.com", firstName: "Sami", lastName: "T." };
const COORD: FakeProfile = {
  uid: "uid-ines", email: "ines@example.com", firstName: "Inès", lastName: "V.",
  dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"], responsabilites: ["orga"],
};
const SEMAINE = "/evenements/scene/noel?semaine=2026-10-12";
const AUTRE = /^(Réserver un autre moment|预约其他时间)$/;
const dimanche = (page: Page) => page.getByRole("region", { name: "Dimanche 18 octobre", exact: true });

async function ouvrir(page: Page, who: FakeProfile, docs: Record<string, Record<string, unknown>> = {}, chemin = "/evenements/scene/noel", zh = false) {
  interdireDialoguesNatifs(page);
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, who, creneauxEnReservations({ "programmes/x7Kq2": NOEL, ...docs }), chemin);
}
const mercredi = (page: Page) => page.getByRole("region", { name: "Mercredi 14 octobre", exact: true });
const ecritures = (db: Awaited<ReturnType<typeof ouvrir>>, methode: string) =>
  db.writes.find((w) => w.method === methode && w.path.startsWith("reservations/"))?.data;

async function remplir(f: ReturnType<Page["getByRole"]>, date: string, de: string, a: string) {
  await f.getByLabel("Date").fill(date);
  await f.getByLabel("De", { exact: true }).fill(de);
  await f.getByLabel("À", { exact: true }).fill(a);
  await f.getByRole("radio", { name: "Sketch", exact: true }).check();
  await f.getByRole("checkbox", { name: "Gp Paix" }).check();
}

// ─── Logique pure ───────────────────────────────────────────────────────────

const SAISON = saisonDe(NOEL as Parameters<typeof saisonDe>[0]);
const c = (dimanche: string, debut: string, fin: string, libre?: boolean) => ({ id: `${dimanche}${debut}`, dimanche, debut, fin, ...(libre && { libre }) });
const FIXES_18 = occupationsFixes("2026-10-18", "ordinaire").filter((o) => o.salle === "grande");

test("fenetresLibres : un dimanche ordinaire, 14:00–19:00 moins le groupe Joie et le culte sinophone", () => {
  expect(fenetresLibres(SAISON, "2026-10-18", FIXES_18)).toEqual([{ debut: "14:30", fin: "15:00" }, { debut: "17:00", fin: "19:00" }]);
  // une réservation de la fête coupe la fenêtre ; deux bornes qui se touchent ne se croisent pas
  expect(fenetresLibres(SAISON, "2026-10-18", [...FIXES_18, c("2026-10-18", "17:30", "18:00")]))
    .toEqual([{ debut: "14:30", fin: "15:00" }, { debut: "17:00", fin: "17:30" }, { debut: "18:00", fin: "19:00" }]);
  // aujourd'hui : le temps passé s'en va, au quart d'heure suivant ; hors période ou jour passé : rien
  expect(fenetresLibres(SAISON, "2026-10-17", [], { today: "2026-10-17", maintenant: "10:20" })).toEqual([{ debut: "10:30", fin: "12:00" }]);
  expect(fenetresLibres(SAISON, "2026-10-17", [], { today: "2026-10-18", maintenant: "08:00" })).toEqual([]);
  expect(fenetresLibres(SAISON, "2026-10-14", [])).toEqual([]);
});

test("lignesDuJour : fenêtres libres, réservations et autres occupations, par heure", () => {
  const autres = FIXES_18.map((o) => ({ debut: o.debut, fin: o.fin, libelle: "x" }));
  const l = lignesDuJour(SAISON, "2026-10-18", [c("2026-10-18", "17:00", "18:00")], autres);
  expect(l.map((x) => `${x.type} ${x.debut}-${x.fin}`)).toEqual([
    "occupe 13:00-14:30", "libre 14:30-15:00", "occupe 15:00-17:00", "reserve 17:00-18:00", "libre 18:00-19:00",
  ]);
});

test("horsGrille : un autre moment (`libre`) ou une réservation dans une plage ne l'est pas ; une réservation sortie des plages l'est", () => {
  expect(horsGrille(SAISON, [c("2026-10-14", "18:30", "20:00", true), c("2026-10-18", "17:15", "18:45")])).toEqual([]);
  const decale = c("2026-10-11", "13:30", "15:30");
  expect(horsGrille(SAISON, [decale]).map((x) => x.id)).toEqual([decale.id]);
});

test("semainesDe : une case par jour réservable (pleine = plus rien de libre) ; un mercredi réservé rejoint sa semaine", () => {
  const s = semainesDe(SAISON, "2026-12-24", [c("2026-10-14", "18:30", "20:00", true), c("2026-10-17", "10:00", "12:00")]);
  const sem = s.find((x) => x.lundi === "2026-10-12")!;
  expect(sem.jours).toEqual(["2026-10-14", "2026-10-17", "2026-10-18"]);
  expect(sem.cases).toEqual([true, false]);
  expect(sem.libres).toBe(1);
  expect(s).toHaveLength(12);
});

// ─── La page ────────────────────────────────────────────────────────────────

test("plus de bouton « Réserver un autre moment » ; chaque jour dit quand la scène est libre, l'emploi du temps fixe en gris", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, SEMAINE);
  await expect(dimanche(page).getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 17:00 – 19:00");
  await expect(page.getByRole("button", { name: AUTRE })).toHaveCount(0);
  await expect(dimanche(page).locator('[data-ligne="occupe"]').filter({ hasText: "Groupe Joie" })).toBeVisible();
  await expect(dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Samedi 17 octobre", exact: true }).getByTestId("libre-du-jour")).toHaveText("Libre 10:00 – 12:00");
});

test("une réservation de Salles sur la Grande salle prend la scène : la fenêtre se coupe", async ({ page }) => {
  await ouvrir(page, MEMBRE, {
    "reservations/s1": { salle: "grande", date: "2026-10-18", debut: "17:30", fin: "18:30", pour: "", quoi: "Répétition chorale", auteurUid: "uid-x", auteurNom: "Léonie R.", createdAt: "", updatedAt: "" },
  }, SEMAINE);
  await expect(dimanche(page).getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 17:00 – 17:30 · 18:30 – 19:00");
  await expect(dimanche(page).locator('[data-ligne="occupe"]').filter({ hasText: "Répétition chorale" })).toBeVisible();
});

// ─── La feuille ─────────────────────────────────────────────────────────────

test("« Réserver » sur une fenêtre : la feuille unique, pré-remplie, Grande salle et « Oui, pour Noël » d'avance ; rien de `libre` dans une plage", async ({ page }) => {
  const db = await ouvrir(page, COORD, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Réserver une salle" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-18");
  await expect(f.getByLabel("De", { exact: true })).toHaveValue("17:00");
  await expect(f.getByLabel("À", { exact: true })).toHaveValue("19:00");
  await expect(f.getByRole("radio", { name: /^Grande salle/ })).toBeChecked();
  await expect(f.getByRole("radio", { name: "Oui, pour Noël" })).toBeChecked();
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
  await f.getByLabel("À", { exact: true }).fill("18:15");
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Gp Paix" }).check();
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "POST")).toMatchObject({ salle: "grande", fete: "x7Kq2", date: "2026-10-18", debut: "17:00", fin: "18:15", quoi: "Sketch", qui: ["Gp Paix"], pour: "Gp Paix" });
  expect(ecritures(db, "POST")).not.toHaveProperty("libre");
  await expect(dimanche(page).getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 18:15 – 19:00");
});

test("`?reserver=1` (la carte de la fête) : la feuille s'ouvre sur la première fenêtre libre, « Oui » d'avance ; `reserver` quitte l'adresse", async ({ page }) => {
  await ouvrir(page, COORD, {}, "/evenements/scene/noel?reserver=1");
  const f = page.getByRole("dialog");
  // Aujourd'hui vendredi 9 octobre : la première fenêtre libre est le samedi 10, 10:00 – 12:00.
  await expect(f.getByRole("heading", { name: "Réserver une salle" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-10");
  await expect(f.getByLabel("De", { exact: true })).toHaveValue("10:00");
  await expect(f.getByLabel("À", { exact: true })).toHaveValue("12:00");
  await expect(f.getByRole("radio", { name: /^Grande salle/ })).toBeChecked();
  await expect(f.getByRole("radio", { name: "Oui, pour Noël" })).toBeChecked();
  await expect(page).not.toHaveURL(/reserver=/);
});

test("hors des plages (un mercredi soir) : permis, `libre: true` est écrit", async ({ page }) => {
  const db = await ouvrir(page, COORD, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  await remplir(page.getByRole("dialog"), "2026-10-14", "18:30", "20:00");
  await page.getByRole("dialog").getByRole("button", { name: "Réserver", exact: true }).click();
  await expect.poll(() => ecritures(db, "POST")).toMatchObject({ date: "2026-10-14", debut: "18:30", fin: "20:00", libre: true });
  await expect(mercredi(page).getByRole("listitem").filter({ hasText: "18:30" })).not.toContainText("Hors des plages");
});

test("une fin avant le début : message, bouton inactif", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = page.getByRole("dialog");
  await f.getByLabel("De", { exact: true }).fill("18:30");
  await f.getByLabel("À", { exact: true }).fill("18:00");
  await expect(f.getByRole("status")).toHaveText("La fin doit venir après le début.");
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
});

test("chevauchement avec l'emploi du temps fixe : le message de Salles (SA8) et « Décaler », rien d'écrit", async ({ page }) => {
  const db = await ouvrir(page, COORD, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 14:30 – 15:00" }).click();
  const f = page.getByRole("dialog");
  await remplir(f, "2026-10-18", "14:00", "15:00");
  // La feuille unique montre le refus dès que le moment croise une occupation : la Grande salle est grisée, l'envoi inactif.
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
  await expect(f.locator("[data-refus]")).toContainText("Grande salle est prise : Groupe Joie, 13:00 – 14:30.");
  await expect(f.getByRole("button", { name: /^Décaler à/ })).toBeVisible();
  expect(ecritures(db, "POST")).toBeUndefined();
  await f.getByRole("button", { name: /^Décaler à/ }).click();
  await expect(f.locator("[data-refus]")).toHaveCount(0);
});

test("chevauchement avec une autre réservation de la fête : refusé, avec son heure", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a") }, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = page.getByRole("dialog");
  await remplir(f, "2026-10-14", "18:30", "20:00");
  await expect(f.locator("[data-refus]")).toContainText("19:00 – 20:00");
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(ecritures(db, "POST")).toBeUndefined();
});

test("date hors saison : la question disparaît, la réservation est ordinaire (sans `fete`) ; une date passée est refusée", async ({ page }) => {
  const db = await ouvrir(page, MEMBRE, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("radio", { name: "Oui, pour Noël" })).toBeChecked();
  await f.getByLabel("Date").fill("2026-12-25");
  await f.getByLabel("De", { exact: true }).fill("18:30");
  await f.getByLabel("À", { exact: true }).fill("20:00");
  await expect(f.getByRole("radio", { name: "Oui, pour Noël" })).toHaveCount(0);
  await f.getByLabel("Pour quoi").fill("Sketch");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect.poll(() => ecritures(db, "POST")).toMatchObject({ salle: "grande", date: "2026-12-25", debut: "18:30", fin: "20:00", quoi: "Sketch" });
  expect(ecritures(db, "POST")).not.toHaveProperty("fete");
});

test("date passée : message, bouton inactif, rien d'écrit", async ({ page }) => {
  const db = await ouvrir(page, MEMBRE, {}, SEMAINE);
  await dimanche(page).getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = page.getByRole("dialog");
  await f.getByLabel("Date").fill("2026-10-08");
  await expect(f.getByRole("status")).toContainText("Une date d'aujourd'hui ou après.");
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeDisabled();
  expect(ecritures(db, "POST")).toBeUndefined();
});

test("Modifier : la même feuille, date et heures comprises ; l'heure change, `libre` reste hors des plages", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }) }, SEMAINE);
  await mercredi(page).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Modifier la réservation" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-14");
  await expect(f.getByLabel("De", { exact: true })).toHaveValue("18:30");
  await expect(f.getByLabel("À", { exact: true })).toHaveValue("20:00");
  await expect(f.getByText("Pour Noël 2026")).toBeVisible();
  await f.getByLabel("À", { exact: true }).fill("19:45");
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ debut: "18:30", fin: "19:45", libre: true });
});

test("Déplacer : la même feuille ; vers une plage, `libre` s'en va (le masque le nomme, le corps non)", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }) }, SEMAINE);
  const patches: string[] = [];
  page.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/reservations/a")) patches.push(`${decodeURIComponent(r.url())} ${r.postData()}`); });
  await mercredi(page).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Déplacer" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Modifier la réservation" })).toBeVisible();
  await f.getByLabel("Date").fill("2026-10-17");
  await f.getByLabel("De", { exact: true }).fill("10:00");
  await f.getByLabel("À", { exact: true }).fill("11:00");
  await f.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ date: "2026-10-17", debut: "10:00", fin: "11:00" });
  expect(ecritures(db, "PATCH")).not.toHaveProperty("libre");
  expect(patches[0]).toContain("updateMask.fieldPaths=libre");
  expect(patches[0]).not.toContain('"libre"');
  expect(db.doc("reservations/a")).not.toHaveProperty("libre");
});

test("Modifier une réservation dont le moment a commencé : la note s'enregistre, la date et l'heure d'origine sont gardées", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { dimanche: "2026-10-09", debut: "09:00", fin: "09:45" }) }, "/evenements/scene/noel?semaine=2026-10-05");
  await page.getByRole("region", { name: "Vendredi 9 octobre", exact: true }).getByRole("listitem").filter({ hasText: "09:00" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-09");
  await f.getByLabel(/^Note/).fill("Apporter le décor");
  await expect(f.getByRole("alert")).toHaveCount(0);
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ date: "2026-10-09", note: "Apporter le décor", libre: true });
});

test("un `qui` non permis (saison limitée à l'EDD, réservation d'un groupe modifiée) : le message du groupe refusé dans la feuille, pas l'échec générique", async ({ page }) => {
  const limitee = { "programmes/x7Kq2": { ...NOEL, quiAutorises: ["EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"] } };
  const db = await ouvrir(page, MEMBRE, {
    ...limitee, "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00", auteurUid: "uid-sami", auteurNom: "Sami T." }),
  }, SEMAINE);
  await mercredi(page).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await f.getByLabel("À", { exact: true }).fill("19:45");
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(f.getByRole("alert")).toHaveText("Ce groupe ne peut pas réserver : Gp Paix.");
  expect(ecritures(db, "PATCH")).toBeUndefined();
});

// ─── Back-Office ────────────────────────────────────────────────────────────

test("Back-Office : l'autre moment est dans « À venir », pas dans « Hors des plages » ; une réservation sortie des plages l'est", async ({ page }) => {
  await ouvrir(page, COORD, {
    "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }),
    "programmes/x7Kq2/creneaux/b": resa("b", { dimanche: "2026-10-11", debut: "13:30", fin: "15:30", libre: undefined, quoi: "Chant" }),
  }, "/back-office/evenements/scene/noel");
  await versToutesLesReservations(page);
  const filtres = page.getByRole("group", { name: "Filtrer les réservations" });
  await expect(filtres.getByRole("button", { name: "À venir 2" })).toBeVisible();
  await expect(filtres.getByRole("button", { name: "Hors des plages 1" })).toBeVisible();
  await filtres.getByRole("button", { name: "Hors des plages 1" }).click();
  const lignes = page.locator('[data-testid="reservations-tableau"] tbody tr, [data-testid="reservations-liste"] li').filter({ visible: true });
  await expect(lignes).toHaveCount(1);
  await expect(lignes).toContainText("13:30");
});

// ─── 中文 et captures ───────────────────────────────────────────────────────

test("中文 : le jour et la feuille unique, « 是，为圣诞节 » coché d'avance", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, SEMAINE, true);
  await expect(page.getByTestId("libre-du-jour").first()).toContainText("空闲");
  await page.getByRole("button", { name: /^预约 17:00/ }).first().click();
  const f = page.getByRole("dialog");
  await expect(f.getByLabel("日期")).toBeVisible();
  await expect(f.getByLabel("从", { exact: true })).toBeVisible();
  await expect(f.getByLabel("到", { exact: true })).toBeVisible();
  await expect(f.getByRole("radio", { name: "是，为圣诞节" })).toBeChecked();
  await f.getByLabel("日期").fill("2026-12-25");
  await expect(f.getByRole("radio", { name: "是，为圣诞节" })).toHaveCount(0);
});

for (const [langue, zh] of [["fr", false], ["zh", true]] as const) {
  test(`captures T5b, ${langue} (à regarder) : la semaine avec ses fenêtres libres, la feuille « de / à »`, async ({ page }, info) => {
    await ouvrir(page, MEMBRE, { "programmes/x7Kq2/creneaux/a": resa("a", { dimanche: "2026-10-18", debut: "17:30", fin: "18:30" }) }, SEMAINE, zh);
    const jour = page.locator("#scene-jour-2026-10-18");
    await expect(jour.getByTestId("libre-du-jour")).toBeVisible();
    await jour.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results-captures/t5b/${info.project.name}-${langue}-volet.png`, animations: "disabled" });
    await jour.locator('[data-ligne="libre"]').last().getByRole("button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results-captures/t5b/${info.project.name}-${langue}-feuille.png`, animations: "disabled" });
  });
}
