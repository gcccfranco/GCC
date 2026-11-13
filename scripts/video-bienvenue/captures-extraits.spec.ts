import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "../../tests/helpers/fakeSession";
// Captures en plus pour les extraits des cartes de la visite (docs/spec-video-bienvenue.md, extraits) :
// recherche d'un chant, liste des tâches d'une équipe cochée deux fois, bouton « − » de la tonalité.
// Écrit dans shots/<projet>/ et complète boxes.json. Noms et équipe inventés (comme tests/equipes-taches.spec.ts).
const NINA: FakeProfile = { uid: "uid-video", email: "nina.dubreuil@example.com", firstName: "Nina", lastName: "Dubreuil",
  planningName: "Nina", serviceRoles: { "Culte Francophone": ["musicien"] } };
const LEA: FakeProfile = { uid: "u-lea", email: "lea.video@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
const JOEL = { email: "joel.video@example.com", firstName: "Joël", lastName: "F.", planningName: "", serviceRoles: {}, annonces: [], notify: [], dansEquipes: ["medias"], referentDe: [] };
const tache = (o: Record<string, unknown>) => ({ equipe: "medias", titre: "", responsableUid: "u-joel", responsableNom: "Joël F.",
  echeance: "2026-10-11", repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-lea",
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...o });
const DOCS = {
  "users/u-joel": JOEL,
  "equipes/medias/taches/photos": tache({ titre: "Photos du culte", responsableUid: "u-lea", responsableNom: "Léa M." }),
  "equipes/medias/taches/regie": tache({ titre: "Ranger la régie", responsableUid: null, responsableNom: "", echeance: "2026-10-10" }),
  "equipes/medias/taches/montage": tache({ titre: "Montage vidéo", echeance: "2026-10-16" }),
};

test("captures des extraits", async ({ page }, info) => {
  const OUT = `shots/${info.project.name}`;
  mkdirSync(OUT, { recursive: true });
  const fichier = `${OUT}/boxes.json`;
  const boxes: Record<string, unknown> = existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : {};
  const box = async (name: string, loc: Locator) => { boxes[name] = await loc.first().boundingBox(); };
  async function shot(name: string) {
    await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}" });
    const v = page.viewportSize()!;
    await page.mouse.move(v.width - 1, v.height - 1);
    await page.waitForTimeout(600);
    await expect(page.locator("body")).not.toContainText(ADMIN_EMAIL);
    await page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" });
  }
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.context().route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/taches/**", (r) => r.fulfill({ json: { ok: true, notified: 1 } }));

  // Tâches de TEAM MÉDIAS, vues par la référente : une case cochée deux fois (en cours, puis faite).
  await signInAs(page, LEA, DOCS, "/equipes/medias");
  const liste = page.getByRole("region", { name: "Tâches", exact: true });
  await liste.getByText("Ranger la régie").waitFor({ timeout: 90_000 });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await shot("08-taches-a");
  await box("taches", liste);
  const caseTache = liste.getByRole("checkbox", { name: /Photos du culte/ });
  await box("caseTache", caseTache);
  await caseTache.click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await shot("08-taches-b");
  await caseTache.click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await shot("08-taches-c");

  // Recherche d'un chant (session de Nina).
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.databases?.().then((l) => l.forEach((d) => d.name && indexedDB.deleteDatabase(d.name))); });
  await signInAs(page, NINA, {}, "/songs");
  await page.getByText("Gloire à Son Nom").first().waitFor({ timeout: 90_000 });
  const champ = page.locator("input[type=search]").first();
  await box("recherche", champ);
  await shot("07-recherche-a");
  await champ.fill("gloire");
  await page.waitForTimeout(800);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await shot("07-recherche-b");
  await box("resultat", page.getByText("Gloire à Son Nom", { exact: true }));

  // Le « − » de la tonalité.
  await page.goto("/songs/gloire-a-son-nom");
  const pil = page.getByTestId("pilule-tonalite");
  await pil.waitFor({ timeout: 90_000 });
  await box("moins", pil.locator("button").first());
  writeFileSync(fichier, JSON.stringify(boxes, null, 1));
});
