import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ANNEE_DU_SHEET, parseDate, seanceCampus } from "../src/lib/planning/sheets";

// Correctif P1 du lot U2 (docs/spec-planning-2027.md) : le Google Sheet du
// planning est celui de 2026 et le reste (le planning 2027 se fait dans
// l'app). Ses dates JJ/MM se lisent donc en 2026, quel que soit le jour.
// Avant, l'année était devinée d'après la date du jour : dès le 01/11/2026,
// les dimanches de janvier-février du Sheet passaient en 2027 et « Mes
// services » montrait des services qui n'existent pas ; en 2027, une séance
// du Campus de 2026 redevenait « à venir ».

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/01", "Ruth K.", "", "", "", "", "", "", "", "", "", ""],
  ["22/11", "Ruth K.", "", "", "", "", "", "", "", "", "", ""],
]);

const CAMPUS = csv([
  ["DATE", "MOMENT", "PRESIDENT", "CHORISTE 1", "CHORISTE 2", "PIANO", "GUITARE", "BATTERIE", "SONO", "PPT", "CHANT 1", "CHANT 2", "CHANT 3", "CHANT 4", "REPETITION"],
  ["27/07/2026", "Matin", "Ruth K.", "", "", "", "", "", "", "", "", "", "", "", ""],
]);

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K." };

async function mesServices(page: Page, jour: string) {
  await page.clock.setFixedTime(new Date(`${jour}T10:00:00`));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    const body = sheet === "Franco_Louange" ? CULTE : sheet === "Campus_Louange" ? CAMPUS : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body });
  });
  await signInAs(page, RUTH, {}, "/mes-services");
}

test("une date JJ/MM du Sheet se lit dans l'année du Sheet, 2026", () => {
  expect(ANNEE_DU_SHEET).toBe(2026);
  expect(parseDate("04/01")).toBe("2026-01-04");
  expect(parseDate("27/12")).toBe("2026-12-27");
  expect(parseDate("27/07/2026"), "une date complète garde son année").toBe("2026-07-27");
});

test("une séance du Campus garde sa date complète", () => {
  const seance = seanceCampus(["2026-07-27", "Ruth K.", "", "", "", "", "", "", "", "", "", "", "", ""], "Matin");
  expect(seance.date).toBe("2026-07-27");
  expect(seance.d).toBe("27/7 Matin");
});

test("Mes services, le 13/11/2026 : le dimanche 04/01 du Sheet est passé, pas un service de janvier 2027", async ({ page }) => {
  await mesServices(page, "2026-11-13");
  await expect(page.getByText("Novembre 2026")).toBeVisible();
  await expect(page.getByText("Janvier 2027")).toHaveCount(0);
});

test("Mes services, le 20/07/2027 : ni la séance du Campus du 27/07/2026 ni le dimanche 22/11 du Sheet ne sont à venir", async ({ page }) => {
  await mesServices(page, "2027-07-20");
  // Le message n'apparaît qu'une fois le planning lu : les absences qui suivent comptent.
  await expect(page.getByText(/Aucun service à venir/)).toBeVisible();
  await expect(page.getByText(/Campus/)).toHaveCount(0);
  await expect(page.getByText("Novembre 2027")).toHaveCount(0);
});
