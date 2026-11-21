import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { verifierSansDebordement } from "./helpers/agencement";
import { dateFermeture, feteEnVue, fetesPassees, type Edition } from "../src/lib/scene/fetes";
import type { Programme } from "../src/types/programme";

// Lot AS, T5 (docs/spec-reserver-unique-fetes.md, AS10, RS5, RS6) : la carte de la fête en haut
// d'Évènements, deux mois avant le jour J jusqu'au soir du jour J ; puis la fête passe dans « Passés ».

const base = { passages: [], createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z" };
const NOEL = { ...base, nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", fin: "2026-12-20", ouvert: true };
const PAQUES = { ...base, nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-01-10", ouvert: true };

const prog = (id: string, d: Record<string, unknown>) => ({ id, ...d }) as unknown as Programme;
const edition = (p: Programme): Edition => ({ fete: p.fete!, annee: p.annee!, programme: p });
const ENOEL = edition(prog("noel-2026", NOEL));
const EPAQUES = edition(prog("paques-2027", PAQUES));

const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", serviceRoles: { "Groupe Paix": ["chanteur"] } };

test("feteEnVue : Noël dès le 24/10, jusqu'au soir du 24/12 ; Pâques 2027 dès le 28/01", () => {
  expect(feteEnVue([ENOEL], "2026-10-23")).toBeNull();
  expect(feteEnVue([ENOEL], "2026-10-24")?.annee).toBe(2026);
  expect(feteEnVue([ENOEL], "2026-12-24")?.fete).toBe("noel");
  expect(feteEnVue([ENOEL], "2026-12-25")).toBeNull();
  expect(feteEnVue([EPAQUES], "2027-01-27")).toBeNull();
  expect(feteEnVue([EPAQUES], "2027-01-28")?.fete).toBe("paques");
  expect(feteEnVue([ENOEL, EPAQUES], "2026-11-01")?.fete).toBe("noel");
  expect(feteEnVue([edition(prog("noel-2026", { ...NOEL, ouvert: false }))], "2026-12-01")).toBeNull();
  expect(dateFermeture(prog("noel-2026", NOEL))).toBe("2026-12-20");
  expect(dateFermeture(prog("noel-2026", { ...NOEL, fin: undefined }))).toBe("2026-12-20");
});

test("fetesPassees : Noël 2026 le 25/12, plus rien 92 jours après, jamais un brouillon", () => {
  const noel = prog("noel-2026", NOEL);
  expect(fetesPassees([noel], "2026-12-24")).toEqual([]);
  expect(fetesPassees([noel], "2026-12-25").map((e) => `${e.fete} ${e.annee}`)).toEqual(["noel 2026"]);
  expect(fetesPassees([noel], "2027-03-26")).toHaveLength(1);
  expect(fetesPassees([noel], "2027-03-27")).toEqual([]);
  expect(fetesPassees([prog("noel-2026", { ...NOEL, ouvert: false })], "2026-12-25")).toEqual([]);
});

async function ouvrir(page: Page, jour: string, programme: Record<string, unknown> | null = NOEL, avecCompte = true) {
  await page.clock.setFixedTime(new Date(`${jour}T10:00:00`));
  const docs: Record<string, Record<string, unknown>> = programme ? { "programmes/noel-2026": programme } : {};
  // Connecté : on attend la réponse de la lecture des programmes (`runQuery`), sinon un test négatif
  // compterait la carte avant qu'elle ait pu paraître.
  const programmesLus = page.waitForResponse((r) => r.url().includes(":runQuery") && (r.request().postData() ?? "").includes('"programmes"'));
  if (avecCompte) { await signInAs(page, LEA, docs, "/evenements"); await programmesLus; }
  else { programmesLus.catch(() => {}); await fakeFirestore(page, docs); await page.goto("/evenements"); }
}
const carte = (page: Page) => page.getByTestId("carte-fete");
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

test("23/10 : aucune carte", async ({ page }) => {
  await ouvrir(page, "2026-10-23");
  await expect(page.getByText("Aucun évènement à venir.")).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
});

test("24/10 : la carte « Noël 2026 », dans 61 jours", async ({ page }) => {
  await ouvrir(page, "2026-10-24");
  await expect(carte(page)).toBeVisible();
  await expect(page.getByRole("region", { name: "Noël 2026" })).toBeVisible();
  await expect(carte(page)).toContainText("jeudi 24 décembre");
  await expect(carte(page)).toContainText("dans 61 jours");
});

test("réservations ouvertes : date de fermeture, « Réserver la Grande salle » vers ?reserver=1, « Voir la fête »", async ({ page }) => {
  await ouvrir(page, "2026-12-01");
  await expect(carte(page)).toContainText("Grande salle ouverte aux réservations jusqu'au 20 décembre");
  await expect(carte(page)).toContainText("dans 23 jours");
  const reserver = carte(page).getByRole("link", { name: "Réserver la Grande salle" });
  await expect(reserver).toHaveAttribute("href", /^\/evenements\/scene\/noel\/?\?reserver=1$/);
  await expect(carte(page).getByRole("link", { name: "Voir la fête" })).toHaveAttribute("href", /^\/evenements\/scene\/noel\/?$/);
  expect((await reserver.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await verifierSansDebordement(page);
  const b = (await carte(page).boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await capture(page, "fete-ouvertes");
});

test("pas encore ouvertes : « dès le », pas de bouton Réserver", async ({ page }) => {
  await ouvrir(page, "2026-10-26", { ...NOEL, debut: "2026-11-02" });
  await expect(carte(page)).toContainText("Réservations de la Grande salle dès le 2 novembre");
  await expect(carte(page).getByRole("link", { name: "Réserver la Grande salle" })).toHaveCount(0);
  await expect(carte(page).getByRole("link", { name: "Voir la fête" })).toBeVisible();
});

test("fermées : le texte d'état et « Voir la fête » seul", async ({ page }) => {
  await ouvrir(page, "2026-12-01", { ...NOEL, fermees: true });
  await expect(carte(page)).toContainText("Réservations de la Grande salle fermées");
  await expect(carte(page).getByRole("link", { name: "Réserver la Grande salle" })).toHaveCount(0);
  await expect(carte(page).getByRole("link", { name: "Voir la fête" })).toBeVisible();
});

test("jour J : « Aujourd'hui »", async ({ page }) => {
  await ouvrir(page, "2026-12-24");
  await expect(carte(page)).toContainText("Aujourd'hui");
});

test("le lendemain : plus de carte, la fête est dans « Passés »", async ({ page }) => {
  await ouvrir(page, "2026-12-25");
  await expect(page.getByRole("button", { name: /^Évènements passés \(1\)/ })).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
  await page.getByRole("button", { name: /^Évènements passés/ }).click();
  const ligne = page.getByTestId("fete-passee");
  await expect(ligne).toContainText("Noël 2026");
  await expect(ligne).toHaveAttribute("href", /^\/evenements\/scene\/noel\/?$/);
  await capture(page, "fete-passee");
});

test("sans compte : ni carte (01/12) ni fête passée (25/12), aucune lecture des programmes", async ({ page }) => {
  const lectures: string[] = [];
  page.on("request", (r) => { if ((r.postData() ?? "").includes('"programmes"')) lectures.push(r.url()); });
  await ouvrir(page, "2026-12-01", NOEL, false);
  await expect(page.getByRole("main").getByRole("link", { name: "Connexion" })).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date("2026-12-25T10:00:00"));
  await page.reload();
  await expect(page.getByRole("main").getByRole("link", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("button", { name: /passés/ })).toHaveCount(0);
  expect(lectures).toEqual([]);
});

test("brouillon : ni carte (01/12) ni fête passée (25/12)", async ({ page }) => {
  await ouvrir(page, "2026-12-01", { ...NOEL, ouvert: false });
  await expect(page.getByText("Aucun évènement à venir.")).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
});

test("brouillon le 25/12 : pas de « Passés »", async ({ page }) => {
  await ouvrir(page, "2026-12-25", { ...NOEL, ouvert: false });
  await expect(page.getByText("Aucun évènement à venir.")).toBeVisible();
  await expect(page.getByRole("button", { name: /passés/ })).toHaveCount(0);
});

test("中文 : « 圣诞节 2026 », « 预约大厅 », date en toutes lettres", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, "2026-12-01");
  await expect(page.getByRole("region", { name: "圣诞节 2026" })).toBeVisible();
  await expect(carte(page)).toContainText("12月24日 星期四");
  await expect(carte(page)).toContainText("23 天后");
  await expect(carte(page).getByRole("link", { name: "预约大厅" })).toBeVisible();
  await expect(carte(page).getByRole("link", { name: "查看节日" })).toBeVisible();
  await capture(page, "fete-zh");
});

test("thème sombre : la carte reste lisible", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.emulateMedia({ colorScheme: "dark" });
  await ouvrir(page, "2026-12-01");
  await expect(carte(page)).toBeVisible();
  await capture(page, "fete-sombre");
});
