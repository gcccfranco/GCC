import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";
import { versToutesLesReservations } from "./helpers/saisonScene";
import { horsGrille, saisonDe, semainesDe, lignesDuJour } from "../src/lib/scene/saison";

// Lot AQ, tranche SQ-B (docs/spec-scene-qui-autre-moment.md) : « Réserver un autre moment ».
// Captures : test-results-captures/sq-b/<projet>-<fr|zh>-<volet|feuille>.png (hors de test-results/, que Playwright vide).

const NOEL = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, ouvert: true,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
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

async function ouvrir(page: Page, who: FakeProfile, docs: Record<string, Record<string, unknown>> = {}, chemin = "/evenements/scene/noel", zh = false) {
  interdireDialoguesNatifs(page);
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  return signInAs(page, who, { "programmes/x7Kq2": NOEL, ...docs }, chemin);
}
const mercredi = (page: Page) => page.getByRole("region", { name: "Mercredi 14 octobre", exact: true });
const ecritures = (db: Awaited<ReturnType<typeof ouvrir>>, methode: string) =>
  db.writes.find((w) => w.method === methode && w.path.startsWith("programmes/x7Kq2/creneaux/"))?.data;

async function remplir(f: ReturnType<Page["getByRole"]>, date: string, de: string, a: string) {
  await f.getByLabel("Date").fill(date);
  await f.getByLabel("de", { exact: true }).selectOption(de);
  await f.getByLabel("à", { exact: true }).selectOption(a);
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Gp Paix" }).check();
}

// ─── Logique pure ───────────────────────────────────────────────────────────

const SAISON = saisonDe(NOEL as Parameters<typeof saisonDe>[0]);
const c = (dimanche: string, debut: string, fin: string, libre?: boolean) => ({ id: `${dimanche}${debut}`, dimanche, debut, fin, ...(libre && { libre }) });

test("horsGrille ignore un créneau libre ; une réservation hors grille sans libre reste signalée", () => {
  const libre = c("2026-10-14", "18:30", "20:00", true);
  const decale = c("2026-10-11", "14:30", "15:30");
  expect(horsGrille(SAISON, [libre, decale]).map((x) => x.id)).toEqual([decale.id]);
  expect(horsGrille(SAISON, [c("2026-10-11", "14:30", "15:30", true)])).toEqual([]);
});

test("lignesDuJour : un autre moment n'est pas « hors grille »", () => {
  const l = lignesDuJour(SAISON, "2026-10-14", [c("2026-10-14", "18:30", "20:00", true)]);
  expect(l).toMatchObject([{ type: "reserve", horsGrille: false, couvre: 0 }]);
});

test("semainesDe : un mercredi réservé rejoint sa semaine, sans case ; la semaine de la saison est inchangée", () => {
  const s = semainesDe(SAISON, "2026-12-24", [c("2026-10-14", "18:30", "20:00", true)]);
  const sem = s.find((x) => x.lundi === "2026-10-12")!;
  expect(sem.jours).toEqual(["2026-10-14", "2026-10-17", "2026-10-18"]);
  expect(sem.cases).toHaveLength(7);
  expect(s).toHaveLength(12);
  // une semaine sans jour de la saison naît de la réservation
  const hors = semainesDe(SAISON, "2026-12-24", [c("2026-12-22", "18:00", "19:00", true)]);
  expect(hors.at(-1)).toEqual({ lundi: "2026-12-21", jours: ["2026-12-22"], cases: [], libres: 0 });
});

// ─── Le bouton ──────────────────────────────────────────────────────────────

test("bouton : visible pour un membre quand les réservations sont ouvertes", async ({ page }) => {
  await ouvrir(page, MEMBRE);
  await expect(page.getByRole("button", { name: AUTRE })).toBeVisible();
});

test("bouton : absent quand les réservations sont fermées à la main", async ({ page }) => {
  await ouvrir(page, MEMBRE, { "programmes/x7Kq2": { ...NOEL, fermees: true } });
  await expect(page.getByText("Les réservations sont fermées.")).toBeVisible();
  await expect(page.getByRole("button", { name: AUTRE })).toHaveCount(0);
});

test("bouton : absent pour un membre que « Qui peut réserver » exclut (canReserverPour faux)", async ({ page }) => {
  await ouvrir(page, MEMBRE, { "programmes/x7Kq2": { ...NOEL, ouvert: false } });
  await expect(page.getByRole("button", { name: AUTRE })).toHaveCount(0);
});

test("bouton : posé en bas du volet Entraînements, dans la marge de page", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, SEMAINE);
  const bouton = page.getByRole("button", { name: AUTRE })
  await expect(bouton).toBeVisible();
  const liste = page.locator("section[aria-labelledby='scene-entrainements']");
  const l = (await liste.boundingBox())!, b = (await bouton.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(l.x - 0.5);
  expect(b.y).toBeGreaterThanOrEqual(l.y + l.height - 0.5);
  const deuxVolets = await page.evaluate(() => matchMedia("(pointer: fine) and (min-width: 1148px)").matches);
  if (deuxVolets) expect(b.x + b.width).toBeLessThanOrEqual(l.x + l.width + 0.5);
});

// ─── La feuille ─────────────────────────────────────────────────────────────

test("un mercredi 18:30–20:00 : la ligne apparaît dans sa semaine sans « Hors grille », `libre: true` est écrit", async ({ page }) => {
  const db = await ouvrir(page, COORD, {}, SEMAINE);
  await page.getByRole("button", { name: AUTRE }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Un autre moment" })).toBeVisible();
  await expect(f.getByRole("button", { name: "Choisis quoi et qui" })).toBeDisabled();
  await remplir(f, "2026-10-14", "18:30", "20:00");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "POST")).toMatchObject({
    dimanche: "2026-10-14", debut: "18:30", fin: "20:00", quoi: "Sketch", qui: ["Gp Paix"], libre: true,
  });
  const ligne = mercredi(page).getByRole("listitem").filter({ hasText: "18:30" });
  await expect(ligne).toBeVisible();
  await expect(ligne).not.toContainText("Hors grille");
});

test("« à » ne propose que des heures après « de », au pas de 15 minutes", async ({ page }) => {
  await ouvrir(page, MEMBRE);
  await page.getByRole("button", { name: AUTRE }).click();
  const f = page.getByRole("dialog");
  await f.getByLabel("de", { exact: true }).selectOption("18:30");
  const fins = await f.getByLabel("à", { exact: true }).locator("option").allTextContents();
  expect(fins[0]).toBe("18:45");
  expect(fins.at(-1)).toBe("23:45");
  expect(fins).not.toContain("18:30");
  await f.getByLabel("de", { exact: true }).selectOption("23:30");
  await expect(f.getByLabel("à", { exact: true })).toHaveValue("23:45");
});

test("chevauchement : refusé dans la feuille, avec l'heure prise", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a") }, SEMAINE);
  await page.getByRole("button", { name: AUTRE }).click();
  const f = page.getByRole("dialog");
  await remplir(f, "2026-10-14", "18:30", "20:00");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(f.getByRole("alert")).toContainText("19:00 – 20:00");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(ecritures(db, "POST")).toBeUndefined();
});

test("date hors période : message, bouton inactif, rien d'écrit", async ({ page }) => {
  const db = await ouvrir(page, MEMBRE);
  await page.getByRole("button", { name: AUTRE }).click();
  const f = page.getByRole("dialog");
  await remplir(f, "2026-12-25", "18:30", "20:00");
  await expect(f.getByRole("alert")).toContainText("Choisis une date entre le");
  await expect(f.getByRole("button", { name: "Choisis quoi et qui" })).toBeDisabled();
  expect(ecritures(db, "POST")).toBeUndefined();
  await f.getByLabel("Date").fill("2026-10-08");
  await expect(f.getByRole("alert")).toContainText("Choisis une date entre le");
});

test("Modifier un autre moment : la feuille se rouvre date et heures comprises, l'heure change, `libre` reste", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }) }, SEMAINE);
  await mercredi(page).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Un autre moment" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-14");
  await expect(f.getByLabel("de", { exact: true })).toHaveValue("18:30");
  await expect(f.getByLabel("à", { exact: true })).toHaveValue("20:00");
  await f.getByLabel("à", { exact: true }).selectOption("19:45");
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ debut: "18:30", fin: "19:45", libre: true });
});

test("Déplacer un autre moment vers la grille retire `libre`", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }) }, SEMAINE);
  await mercredi(page).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Déplacer" }).click();
  await page.getByRole("dialog").getByRole("group", { name: "Samedi 17 octobre" }).getByRole("radio", { name: "10:00 – 11:00" }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Déplacer" }).click();
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ dimanche: "2026-10-17", debut: "10:00", fin: "11:00" });
  expect(ecritures(db, "PATCH")?.libre).toBeFalsy();
});

test("Modifier un autre moment déjà passé : la note s'enregistre, la date d'origine est gardée", async ({ page }) => {
  const db = await ouvrir(page, COORD, { "programmes/x7Kq2/creneaux/a": resa("a", { dimanche: "2026-10-07", debut: "18:30", fin: "20:00" }) }, "/evenements/scene/noel?semaine=2026-10-05");
  await page.getByRole("region", { name: "Mercredi 7 octobre", exact: true }).getByRole("listitem").filter({ hasText: "18:30" }).getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-07");
  await f.getByLabel(/^Note/).fill("Apporter le décor");
  await expect(f.getByRole("alert")).toHaveCount(0);
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => ecritures(db, "PATCH")).toMatchObject({ dimanche: "2026-10-07", note: "Apporter le décor", libre: true });
});

// ─── Back-Office ────────────────────────────────────────────────────────────

test("Back-Office : l'autre moment est dans « À venir », pas dans « Hors grille » ; une réservation laissée hors grille l'est", async ({ page }) => {
  await ouvrir(page, COORD, {
    "programmes/x7Kq2/creneaux/a": resa("a", { debut: "18:30", fin: "20:00" }),
    "programmes/x7Kq2/creneaux/b": resa("b", { dimanche: "2026-10-11", debut: "14:30", fin: "15:30", libre: undefined, quoi: "Chant" }),
  }, "/back-office/evenements/scene/noel");
  await versToutesLesReservations(page);
  const filtres = page.getByRole("group", { name: "Filtrer les réservations" });
  await expect(filtres.getByRole("button", { name: "À venir 2" })).toBeVisible();
  await expect(filtres.getByRole("button", { name: "Hors grille 1" })).toBeVisible();
  await filtres.getByRole("button", { name: "Hors grille 1" }).click();
  const lignes = page.locator('[data-testid="reservations-tableau"] tbody tr, [data-testid="reservations-liste"] li').filter({ visible: true });
  await expect(lignes).toHaveCount(1);
  await expect(lignes).toContainText("14:30");
});

// ─── 中文 et captures ───────────────────────────────────────────────────────

test("中文 : le bouton et la feuille", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, SEMAINE, true);
  await page.getByRole("button", { name: AUTRE }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "其他时间" })).toBeVisible();
  await expect(f.getByLabel("日期")).toBeVisible();
  await expect(f.getByLabel("从", { exact: true })).toBeVisible();
  await expect(f.getByLabel("到", { exact: true })).toBeVisible();
  await f.getByLabel("日期").fill("2026-12-25");
  await expect(f.getByRole("alert")).toContainText("请选择");
  await expect(f.getByRole("alert")).toContainText("之间的日期");
});

for (const [langue, zh] of [["fr", false], ["zh", true]] as const) {
  test(`captures SQ-B, ${langue} (à regarder) : le volet avec le bouton, la feuille « Un autre moment »`, async ({ page }, info) => {
    await ouvrir(page, MEMBRE, {}, "/evenements/scene/noel", zh);
    const bouton = page.getByRole("button", { name: AUTRE });
    await expect(bouton).toBeVisible();
    await bouton.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results-captures/sq-b/${info.project.name}-${langue}-volet.png`, animations: "disabled" });
    await bouton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results-captures/sq-b/${info.project.name}-${langue}-feuille.png`, animations: "disabled" });
  });
}
