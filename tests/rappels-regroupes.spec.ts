import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { reminderBody, reminderServicesFor, reminderTitle } from "../src/lib/push/reminderMessage";
import type { PlanningData } from "../src/lib/planning/names";

// Lot 1c (docs/spec-planning-petits-lots.md) : une seule notification par
// personne et par échéance, qui liste ses services du jour avec le rôle, en
// français ou en 中文 selon la langue mémorisée côté serveur.

const vide: PlanningData = {
  culte: [], dejeuner: [], paix: [], fidelite: [], fideliteMusic: [], bonte: [],
  edd: {}, campus: [], intergroupe: [], interfranco: [],
};

// Ruth : piano et Sainte cène au culte du 20/09, Prépa. Table le même jour,
// choriste au Campus du 20/09 (séance exclue des rappels) avec répétition le 22/09.
const planning: PlanningData = {
  ...vide,
  culte: [["2026-09-20", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "Ruth K."]],
  dejeuner: [["2026-09-20", "Ruth K., Charlie B."]],
  campus: [{ d: "20/9 Matin", pres: "Jonathan Z.", ch: "Ruth K.", mu: "", rg: "", ent: "2026-09-22", entTime: "17:00", entLieu: "Grande Salle", chants: [] }],
};

test("les services du jour d'une personne, rôles réunis, séance Campus exclue", () => {
  expect(reminderServicesFor(planning, "Ruth K.", "2026-09-20")).toEqual([
    { service: "Culte Franco", roles: ["Piano", "Sainte cène"] },
    { service: "Prépa. Table", roles: [] },
  ]);
  expect(reminderServicesFor(planning, "Ruth K.", "2026-09-22"), "la répétition Campus, avec heure et lieu").toEqual([
    { service: "Campus (répét.)", roles: [], time: "17:00", location: "Grande Salle" },
  ]);
  expect(reminderServicesFor(planning, "Charlie B.", "2026-09-20")).toEqual([{ service: "Prépa. Table", roles: [] }]);
  expect(reminderServicesFor(planning, "Personne", "2026-09-20")).toEqual([]);
});

test("un seul message en français : date, échéance, services avec le rôle", () => {
  const services = reminderServicesFor(planning, "Ruth K.", "2026-09-20");
  expect(reminderTitle("fr")).toBe("Rappel de service");
  expect(reminderBody("2026-09-20", "J3", services, "fr")).toBe(
    "Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano, Sainte cène) · Prépa. Table",
  );
  expect(reminderBody("2026-09-20", "J7", services, "fr")).toMatch(/^Dimanche 20 septembre \(dans 1 semaine\) :/);
  expect(reminderBody("2026-09-22", "J1", reminderServicesFor(planning, "Ruth K.", "2026-09-22"), "fr")).toBe(
    "Mardi 22 septembre (demain) : Campus (répét.) à 17:00, Grande Salle",
  );
});

test("le même message en 中文", () => {
  const services = reminderServicesFor(planning, "Ruth K.", "2026-09-20");
  expect(reminderTitle("zh-CN")).toBe("服务提醒");
  expect(reminderBody("2026-09-20", "J3", services, "zh-CN")).toBe("9月20日星期日（3天后）：法语崇拜（钢琴、圣餐） · 圣餐预备");
  expect(reminderBody("2026-09-22", "J1", reminderServicesFor(planning, "Ruth K.", "2026-09-22"), "zh-CN")).toBe(
    "9月22日星期二（明天）：夏令营排练 17:00，Grande Salle",
  );
});

test("la langue choisie est mémorisée côté serveur pour les rappels", async ({ page }) => {
  const ruth: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K." };
  const db = await signInAs(page, ruth, {}, "/songs");
  const langs = () => db.writes.filter((w) => w.path === "notifPrefs/uid-ruth").map((w) => w.data.lang);
  await expect.poll(langs, "la langue courante est écrite à la connexion").toEqual(["fr"]);
  await page.getByRole("button", { name: "切换为中文" }).first().click();
  await expect.poll(langs).toEqual(["fr", "zh-CN"]);
});
