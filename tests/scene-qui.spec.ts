import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";
import { ayantsDroitDuQui } from "../src/lib/fetes/droits";
import { libelleQui, normaliserQui } from "../src/lib/fetes/qui";
import { quiCategory } from "../src/lib/scene/rappels";
import { FAMILLES, famillesDe } from "../src/lib/scene/saison";
import { QUI, QUI_RETIRES } from "../src/types/programme";
import { creneauxEnReservations } from "./helpers/creneauxScene";

// Lot AQ, tranche SQ-A (docs/spec-scene-qui-autre-moment.md) : « Qui » élargi — Intergroupe, Interfranco, « Autre… ».

// ─── Logique pure ───────────────────────────────────────────────────────────

test("QUI : Intergroupe et Interfranco juste après Franco ; QUI_RETIRES ; FAMILLES.louange", () => {
  expect([...QUI]).toEqual([
    "Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "Franco", "Intergroupe", "Interfranco",
    "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
  ]);
  expect([...QUI_RETIRES]).toEqual(["敬拜团", "Jeunes", "Chorale"]);
  expect(FAMILLES.find((f) => f.cle === "louange")?.qui).toEqual(["Franco", "Intergroupe", "Interfranco"]);
});

test("libelleQui : Intergroupe et Interfranco, FR et 中文 ; une valeur libre telle quelle", () => {
  expect([libelleQui("Intergroupe"), libelleQui("Interfranco")]).toEqual(["Intergroupe", "Interfranco"]);
  expect([libelleQui("Intergroupe", "zh"), libelleQui("Interfranco", "zh")]).toEqual(["联合聚会", "法语联合聚会"]);
  expect(libelleQui("Répétition spéciale", "zh")).toBe("Répétition spéciale");
});

test("rappels : Intergroupe et Interfranco ont leur catégorie ; une valeur libre aucune", () => {
  expect(quiCategory("Intergroupe")).toBe("Intergroupe");
  expect(quiCategory("Interfranco")).toBe("Interfranco");
  expect(quiCategory("Répétition spéciale")).toBeNull();
});

test("ayants droit : Intergroupe et Interfranco comme Franco (équipe Louange) ; une valeur libre, personne", () => {
  const ctx = {
    jourJ: "2026-12-24", edd: {},
    profils: [
      { uid: "uid-a", dansEquipes: ["louange"], planningName: "", coordination: false },
      { uid: "uid-b", dansEquipes: ["edd"], planningName: "", coordination: false },
    ],
  } as unknown as Parameters<typeof ayantsDroitDuQui>[1];
  for (const q of ["Franco", "Intergroupe", "Interfranco"]) expect(ayantsDroitDuQui(q, ctx).map((a) => a.uid)).toEqual(["uid-a"]);
  expect(ayantsDroitDuQui("Répétition spéciale", ctx)).toEqual([]);
});

test("famillesDe : une saison d'avant (« Franco » seul) garde louange cochée", () => {
  expect(famillesDe(["Franco"])).toEqual(["louange"]);
  expect(famillesDe(["Interfranco", "Gp Paix"])).toEqual(["groupes", "louange"]);
  expect(famillesDe([])).toEqual([]);
});

test("texte libre : rogné, 40 caractères, et égal à une valeur de la liste ou à son libellé → cette valeur", () => {
  expect(normaliserQui("  gp joie ")).toBe("Gp Joie");
  expect(normaliserQui("Culte Francophone")).toBe("Franco");
  expect(normaliserQui("法语崇拜")).toBe("Franco");
  expect(normaliserQui("联合聚会")).toBe("Intergroupe");
  expect(normaliserQui("  Répétition spéciale  ")).toBe("Répétition spéciale");
  expect(normaliserQui("x".repeat(60))).toHaveLength(40);
  expect(normaliserQui("   ")).toBe("");
});

// ─── Feuille « Réserver » et ordre de passage ───────────────────────────────

const GROUPES_EDD = ["Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"];
const NOEL = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, ouvert: true,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  passages: [{ quoi: "Chant", qui: ["Gp Paix"], titre: "Ouverture" }],
  createdBy: "uid-ines", updatedAt: "2026-09-14T20:00:00Z",
};
const resa = (id: string, qui: string[]) => ({
  id, dimanche: "2026-10-11", debut: "16:00", fin: "17:00", quoi: "Sketch", qui, note: "",
  auteurUid: "uid-ines", auteurNom: "Inès V.", createdAt: "", updatedAt: "",
});
const MEMBRE: FakeProfile = { uid: "uid-sami", email: "sami@example.com", firstName: "Sami", lastName: "T." };
const COORD: FakeProfile = {
  uid: "uid-ines", email: "ines@example.com", firstName: "Inès", lastName: "V.",
  dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"], responsabilites: ["orga"],
};

async function ouvrir(page: Page, who: FakeProfile, docs: Record<string, Record<string, unknown>> = {}, chemin = "/evenements/scene/noel", zh = false) {
  interdireDialoguesNatifs(page);
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  return signInAs(page, who, creneauxEnReservations({ "programmes/x7Kq2": NOEL, ...docs }), chemin);
}
const ouvrirFeuille = async (page: Page, nom = "Réserver 17:00 – 19:00") => {
  await page.getByRole("region", { name: "Dimanche 11 octobre", exact: true }).getByRole("button", { name: nom }).click();
  return page.getByRole("dialog");
};

test("Réserver : Intergroupe et Interfranco proposés ; « Autre… » ouvre un champ, la valeur s'écrit telle quelle", async ({ page }) => {
  const db = await ouvrir(page, MEMBRE);
  const f = await ouvrirFeuille(page);
  await expect(f.getByRole("checkbox", { name: "Intergroupe" })).toBeVisible();
  await expect(f.getByRole("checkbox", { name: "Interfranco" })).toBeVisible();
  await expect(f.getByLabel("Qui ?")).toHaveCount(0);
  await f.getByRole("radio", { name: "Séance louange" }).check();
  await f.getByRole("checkbox", { name: "Autre…" }).check();
  const champ = f.getByLabel("Qui ?");
  await expect(champ).toBeVisible();
  await expect(champ).toHaveAttribute("maxlength", "40");
  await expect(f.getByRole("button", { name: "Choisis quoi et qui" })).toBeDisabled();
  await champ.fill("  Répétition des jeunes  ");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data)
    .toMatchObject({ quoi: "Séance louange", qui: ["Répétition des jeunes"] });
});

test("Réserver : un texte égal à « Culte Francophone » s'écrit « Franco »", async ({ page }) => {
  const db = await ouvrir(page, MEMBRE);
  const f = await ouvrirFeuille(page);
  await f.getByRole("radio", { name: "Chant" }).check();
  await f.getByRole("checkbox", { name: "Autre…" }).check();
  await f.getByLabel("Qui ?").fill("culte francophone");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect.poll(() => db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"))?.data)
    .toMatchObject({ qui: ["Franco"] });
});

test("Réserver : saison limitée — pas d'« Autre… » pour un membre, présent pour la coordination", async ({ page }) => {
  const limitee = { "programmes/x7Kq2": { ...NOEL, quiAutorises: GROUPES_EDD } };
  await ouvrir(page, MEMBRE, limitee);
  const f = await ouvrirFeuille(page);
  await expect(f.getByRole("checkbox")).toHaveCount(9);
  await expect(f.getByRole("checkbox", { name: "Autre…" })).toHaveCount(0);
});

test("Réserver : saison limitée — « Autre… » présent pour la coordination", async ({ page }) => {
  await ouvrir(page, COORD, { "programmes/x7Kq2": { ...NOEL, quiAutorises: GROUPES_EDD } });
  const f = await ouvrirFeuille(page);
  await expect(f.getByRole("checkbox", { name: "Autre…" })).toBeVisible();
});

test("Réouverture : une valeur libre → « Autre… » cochée, champ rempli ; une ancienne valeur reste « retiré »", async ({ page }) => {
  await ouvrir(page, COORD, {
    "programmes/x7Kq2/creneaux/l": resa("l", ["Répétition des jeunes"]),
    "programmes/x7Kq2/creneaux/r": { ...resa("r", ["Jeunes"]), debut: "17:00", fin: "18:00" },
  });
  const ligne = (texte: string) => page.getByRole("region", { name: "Dimanche 11 octobre", exact: true }).getByRole("listitem").filter({ hasText: texte });
  await ligne("Sketch · Répétition des jeunes").getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("checkbox", { name: "Autre…" })).toBeChecked();
  await expect(f.getByLabel("Qui ?")).toHaveValue("Répétition des jeunes");
  await expect(f.getByRole("checkbox", { name: /retiré/ })).toHaveCount(0);
  await f.getByRole("button", { name: "Annuler" }).click();
  await ligne("Sketch · Jeunes").getByRole("button", { name: /^Plus d'actions/ }).first().click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Jeunes · retiré" })).toBeChecked();
  await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Autre…" })).not.toBeChecked();
});

test("Ordre de passage : la liste « Qui » propose « Autre… » et son champ", async ({ page }) => {
  await ouvrir(page, COORD, {}, "/back-office/evenements/scene/noel?vue=ordre");
  await page.getByRole("button", { name: "Ajouter un passage" }).click();
  await expect(page.getByRole("checkbox", { name: "Intergroupe" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Autre…" }).check();
  await expect(page.getByLabel("Qui ?")).toBeVisible();
});

test("中文 : la feuille Réserver propose 其他… et le champ 谁？", async ({ page }) => {
  await ouvrir(page, MEMBRE, {}, "/evenements/scene/noel", true);
  await page.getByRole("region", { name: "10月11日星期日", exact: true }).getByRole("button").first().click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("checkbox", { name: "联合聚会", exact: true })).toBeVisible();
  await expect(f.getByRole("checkbox", { name: "法语联合聚会" })).toBeVisible();
  await f.getByRole("checkbox", { name: "其他…" }).check();
  await expect(f.getByLabel("谁？")).toBeVisible();
});
