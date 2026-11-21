import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import type { Evenement } from "../src/types/evenement";
import { epinglesEnGrand } from "../src/lib/evenements/agenda";

// Lot AS, T6 (docs/spec-reserver-unique-fetes.md, AS11, AS12, RS7) : l'évènement épinglé en grand
// en haut d'Évènements ; les trois premiers en grand, les suivants en petites lignes « À la une ».

const base: Omit<Evenement, "id" | "titre"> = {
  type: "loisir", pour: "eglise", date: "2026-12-12", heure: "18:30", heureFin: "", dateFin: "", lieu: "Salle des fêtes", description: "",
  liens: [], images: [], placesMax: null, inscriptions: "fermees", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-solenne", organisateurNom: "Solenne", epingle: true, expiresAt: null, inscrits: 0,
  createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z",
} as Omit<Evenement, "id" | "titre">;
const ev = (titre: string, d: Partial<Evenement> = {}) => ({ ...base, titre, ...d });
const PAYSAGE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="#3a7"/></svg>')}`;
const PORTRAIT = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="800"><rect width="300" height="800" fill="#37a"/></svg>')}`;
const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", serviceRoles: { "Groupe Paix": ["chanteur"] } };
const OPHELIA: FakeProfile = { uid: "uid-ophelia", email: "ophelia@example.com", firstName: "Ophélia", lastName: "V.", dansEquipes: ["da"], referentDe: ["da"] };
const NOEL = { nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", fin: "2026-12-20", ouvert: true, passages: [], createdBy: "uid-ophelia", updatedAt: "2026-09-14T20:00:00Z" };

async function ouvrir(page: Page, docs: Record<string, Record<string, unknown>>, lea = LEA, to = "/evenements") {
  await page.clock.setFixedTime(new Date("2026-11-21T10:00:00"));
  return signInAs(page, lea, docs, to);
}
const cartes = (page: Page) => page.getByTestId("carte-epingle");
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES ?? "test-results/evenements-epingle";
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}
const tablettePortrait = () => test.info().project.name.includes("tablette") && !test.info().project.name.includes("paysage");

test("epinglesEnGrand : épinglés datés, non finis, non expirés, triés", () => {
  const e = (id: string, d: Partial<Evenement>) => ({ id, ...ev(id, d) }) as Evenement;
  const r = epinglesEnGrand([
    e("b", { date: "2026-12-20" }), e("a", { date: "2026-12-01" }), e("passe", { date: "2026-11-01" }),
    e("enCours", { date: "2026-11-10", dateFin: "2026-11-25" }), e("expire", { expiresAt: "2026-11-20" }),
    e("info", { type: "info", date: "" }), e("non", { epingle: false }),
  ], "2026-11-21");
  expect(r.map((x) => x.id)).toEqual(["enCours", "a", "b"]);
});

test("(a) épinglé daté sans image : aplat encre, « dans N jours », « Voir » ; sa ligne du mois absente", async ({ page }) => {
  await ouvrir(page, { "evenements/gala": ev("Gala d'hiver") });
  const c = cartes(page);
  await expect(c).toHaveCount(1);
  await expect(c.getByRole("heading", { name: "Gala d'hiver" })).toBeVisible();
  await expect(c).toContainText("dans 21 jours");
  await expect(c).toHaveCSS("background-color", /rgb\((28, 28, 30|44, 44, 46)\)/);
  await expect(c.getByRole("link", { name: "Voir", exact: true })).toHaveAttribute("href", /\/evenements\/gala\/?$/);
  await expect(page.getByRole("link", { name: /Gala d'hiver/ })).toHaveCount(1); // le titre de la carte seulement
  await capture(page, "a-sans-image");
});

test("(b) images paysage et portrait : 16:9 en tête, texte dessous", async ({ page }) => {
  await ouvrir(page, { "evenements/p": ev("Concert paysage", { images: [PAYSAGE] }), "evenements/q": ev("Concert portrait", { images: [PORTRAIT], date: "2026-12-13" }) });
  for (const i of [0, 1]) {
    const c = cartes(page).nth(i);
    const img = await c.locator("img").boundingBox();
    const titre = await c.getByRole("heading").boundingBox();
    expect(img!.width / img!.height).toBeGreaterThan(1.75);
    expect(img!.width / img!.height).toBeLessThan(1.8);
    expect(titre!.y).toBeGreaterThanOrEqual(img!.y + img!.height - 1);
  }
  await capture(page, "b-images");
});

test("(c) fête en vue + un épinglé : la fête d'abord, côte à côte en tablette portrait seulement", async ({ page }) => {
  await ouvrir(page, { "evenements/gala": ev("Gala d'hiver"), "programmes/noel-2026": NOEL });
  const f = await page.getByTestId("carte-fete").boundingBox();
  const e = await cartes(page).boundingBox();
  if (tablettePortrait()) {
    expect(Math.abs(f!.y - e!.y)).toBeLessThan(2);
    expect(f!.x).toBeLessThan(e!.x);
  } else {
    expect(e!.y).toBeGreaterThanOrEqual(f!.y + f!.height + 16); // un vrai écart, pas des cartes collées
  }
  await capture(page, "c-fete");
});

test("(d) quatre épinglés : trois en grand dans une rangée qui défile, le quatrième en petite ligne « À la une »", async ({ page }) => {
  await ouvrir(page, {
    "evenements/e1": ev("Premier", { date: "2026-12-01" }), "evenements/e2": ev("Deuxième", { date: "2026-12-02" }),
    "evenements/e3": ev("Troisième", { date: "2026-12-03" }), "evenements/e4": ev("Quatrième", { date: "2026-12-04" }),
  });
  await expect(cartes(page)).toHaveCount(3);
  const rangee = page.getByTestId("rangee-epingles");
  await expect(rangee).toHaveAttribute("aria-label", "Évènements épinglés");
  const m = await rangee.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, contents: getComputedStyle(el).display === "contents", pw: el.parentElement!.scrollWidth, pc: el.parentElement!.clientWidth }));
  expect(m.contents ? m.pw > m.pc : m.sw > m.cw).toBe(true);
  const ligne = page.getByRole("region", { name: "À la une" }).getByText("Quatrième");
  await expect(ligne).toBeVisible();
  await expect(page.getByText("Quatrième")).toHaveCount(1);
  await capture(page, "d-rangee");
});

test("(d2) deux épinglés : côte à côte en tablette portrait, rangée qui défile ailleurs", async ({ page }) => {
  await ouvrir(page, { "evenements/e1": ev("Premier", { date: "2026-12-01" }), "evenements/e2": ev("Deuxième", { date: "2026-12-02" }) });
  await expect(cartes(page)).toHaveCount(2);
  const [a, b] = [await cartes(page).nth(0).boundingBox(), await cartes(page).nth(1).boundingBox()];
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  if (tablettePortrait()) {
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width); // les deux entières
  } else {
    const m = await page.getByTestId("rangee-epingles").evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(m.sw).toBeGreaterThan(m.cw); // la seconde dépasse
  }
  await capture(page, "d2-deux");
});

test("inscriptions ouvertes : « Je m'inscris » vers la fiche ; plusieurs jours : « du … au … »", async ({ page }) => {
  await ouvrir(page, { "evenements/camp": ev("Camp d'hiver", { inscriptions: "ouvertes", date: "2026-12-26", dateFin: "2026-12-29" }) });
  await expect(cartes(page).getByRole("link", { name: "Je m'inscris" })).toHaveAttribute("href", /\/evenements\/camp\/?$/);
  await expect(cartes(page)).toContainText(/du 26.décembre au 29.décembre/);
});

test("(e) épinglé fini ou expiré : pas en grand", async ({ page }) => {
  await ouvrir(page, {
    "evenements/vieux": ev("Vieux gala", { date: "2026-11-01" }), "evenements/long": ev("Semaine longue", { date: "2026-11-15", dateFin: "2026-11-19" }),
    "evenements/expire": ev("Expiré", { expiresAt: "2026-11-20" }), "evenements/ok": ev("Encore là", { date: "2026-12-05" }),
  });
  await expect(cartes(page)).toHaveCount(1);
  await expect(cartes(page)).toContainText("Encore là");
  for (const t of ["Vieux gala", "Semaine longue", "Expiré"]) await expect(page.getByText(t, { exact: true })).toHaveCount(0);
});

test("(f) lien externe : « Je m'inscris » vers le lien", async ({ page }) => {
  await ouvrir(page, { "evenements/ext": ev("Sortie ski", { lienExterne: "https://exemple.org/ski" }) });
  const a = cartes(page).getByRole("link", { name: "Je m'inscris" });
  await expect(a).toHaveAttribute("href", "https://exemple.org/ski");
  await expect(a).toHaveAttribute("target", "_blank");
});

test("(g) formulaire : « Épinglée » pour un évènement daté, enregistré epingle: true", async ({ page }) => {
  const db = await ouvrir(page, {}, OPHELIA, "/back-office/evenements/nouveau");
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByLabel("Public").selectOption({ label: "TEAM DA" }); // « Toute l'église » est refusé avant la bascule de 2027
  await page.getByLabel("Nom de l'évènement").fill("Soirée crêpes");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-05");
  await page.getByLabel("Épinglée").check();
  await expect(page.getByLabel("Visible jusqu'au")).toHaveCount(0);
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect.poll(() => db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"))?.data).toMatchObject({ titre: "Soirée crêpes", epingle: true });
});

test("zh-CN : « 查看 » sur la carte épinglée", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, { "evenements/gala": ev("冬季晚会") });
  await expect(cartes(page).getByRole("link", { name: "查看" })).toBeVisible();
  await capture(page, "zh-epingle");
});
