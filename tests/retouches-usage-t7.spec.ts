import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 1 du rapport d'usage, tranche T7 (docs/spec-retouches-usage.md) : mentions en double et messages de refus.
// Chaque mention apparaît une fois ; À faire et Personnes comptent les noms à relier avec le même nombre ;
// « Suivant » refusé amène la première question manquante dans la fenêtre ; « Choisis un culte. » en fr et en zh-CN.
// Noms inventés ; pages connectées par fakeSession ; mesures prises dans la page.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", dansEquipes: ["da"], referentDe: ["da"] };

const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const enZh = (page: Page) => page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
const compte = (texte: string) => Number(texte.match(/\d+/)![0]);

const tache = (over: Record<string, unknown> = {}) => ({
  equipe: "da", titre: "Affiche de Pâques", responsableUid: "u-saul", responsableNom: "Saül Ferrand",
  echeance: "2026-10-11", repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-saul",
  createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const fois = (parUid: string, parNom: string) => ({
  parUid, parNom, etat: "encours", le: "2026-10-02T08:00:00Z", debutLe: "2026-10-02T08:00:00Z", equipe: "da",
});
const M = (nom: string, over: Record<string, unknown> = {}) => ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

test.describe("T7 : mentions en double", () => {
  test("Louange : le référent est nommé une fois, même quand sa mention dit déjà « Référent »", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-02T10:00:00+02:00"));
    await sansSheet(page);
    await signInAs(page, ADMIN, {
      "equipes/louange": {
        membres: [M("Ludovic Maret", { uid: "u-ludo", referent: true, mention: "Référent Louange" })],
        updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "",
      },
    }, "/back-office/equipes");
    const zone = page.getByTestId("louange-referents");
    await expect(zone).toContainText("Ludovic Maret");
    const texte = (await zone.textContent()) ?? "";
    expect(texte.match(/Référent/g)?.length, texte).toBe(1);
  });

  const DOCS_TACHES: Record<string, Record<string, unknown>> = {
    "equipes/da": { pole: "da", membres: [M("Saül Ferrand", { uid: "u-saul" })], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
    "equipes/da/taches/affiche": tache(),
    "equipes/da/taches/affiche/fois/2026-10-11": fois("u-saul", "Saül Ferrand"),
    "equipes/da/taches/flyer": tache({ titre: "Flyer du camp", responsableUid: "u-saul", responsableNom: "Saül Ferrand" }),
    "equipes/da/taches/flyer/fois/2026-10-11": fois("u-lise", "Lise Mauve"),
  };

  test("une ligne de tâche en cours : « Commencée par » seulement si ce n'est pas le responsable déjà nommé", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-02T10:00:00+02:00"));
    await sansSheet(page);
    await signInAs(page, ADMIN, DOCS_TACHES, "/equipes/da");
    const main = page.locator("main");
    const affiche = main.getByRole("button", { name: /Affiche de Pâques/ });
    const flyer = main.getByRole("button", { name: /Flyer du camp/ });
    await expect(affiche).toBeVisible();
    await expect(flyer).toContainText("Commencée par Lise Mauve");
    await expect(affiche).not.toContainText("Commencée par");
    expect(((await affiche.textContent()) ?? "").match(/Saül Ferrand/g)?.length).toBe(1);
  });

  test("la fiche d'une tâche en cours : « commencée par » une fois, dans le sous-titre, pas dans l'historique", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-02T10:00:00+02:00"));
    await sansSheet(page);
    await signInAs(page, ADMIN, DOCS_TACHES, "/taches/da/affiche");
    await expect(page.getByRole("heading", { name: "Affiche de Pâques" }).first()).toBeVisible();
    await expect(page.locator("main").getByText(/Commencée par Saül Ferrand/)).toHaveCount(1);
  });
});

test.describe("T7 : un seul nombre de noms à relier", () => {
  // Neuf noms au planning, dont un aussi écrit (sans compte) dans un organigramme : il reste dans « Titulaires sans compte ».
  const NOMS = { presidence: "Pers. A", choriste1: "Pers. B", choriste2: "Pers. C", piano: "Pers. D", guitare: "Pers. E", batterie: "Pers. F", sono: "Pers. G", ppt: "Pers. H", orateur: "Pers. I" };
  const DOCS: Record<string, Record<string, unknown>> = {
    "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...NOMS },
    "groupes/paix": {
      president: { nom: "Pers. A", uid: "" }, vp: [], maxVp: 2, roles: [], updatedAt: "", parUid: "", parNom: "",
    },
  };

  test("À faire et Personnes disent le même nombre", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-24T10:00:00"));
    await sansSheet(page);
    await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
    await signInAs(page, ADMIN, DOCS, "/back-office");
    const ligne = page.getByTestId("ligne-a-faire").filter({ hasText: "Noms du planning sans compte" });
    await expect(ligne).toContainText("noms à relier à un compte");
    const aFaire = compte((await ligne.textContent()) ?? "");

    await page.goto("/back-office/equipes/personnes");
    const rangee = page.getByTestId("rangee-sans-compte");
    await expect(rangee).toContainText("à relier");
    const personnes = compte((await rangee.textContent()) ?? "");
    expect(aFaire).toBe(personnes);

    // Le titulaire écrit dans l'organigramme reste dans « Titulaires sans compte » : sans organigramme, le même nom compterait en plus.
    const autre = await page.context().newPage();
    await sansSheet(autre);
    await autre.clock.setFixedTime(new Date("2026-10-24T10:00:00"));
    await signInAs(autre, ADMIN, { "plannings/culte/dimanches/2026-10-25": DOCS["plannings/culte/dimanches/2026-10-25"] }, "/back-office/equipes/personnes");
    const rangeeSans = autre.getByTestId("rangee-sans-compte");
    await expect(rangeeSans).toContainText("à relier");
    expect(compte((await rangeeSans.textContent()) ?? "")).toBe(personnes + 1);
  });
});

test.describe("T7 : questionnaire, « Suivant » refusé", () => {
  test("depuis le bas de l'étape, « Suivant » fait voir la première question obligatoire sans réponse", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sansSheet(page);
    await signInAs(page, ADMIN, {}, "/questionnaire");
    const suivant = page.getByRole("button", { name: "Suivant" });
    await expect(suivant).toBeVisible();
    await suivant.evaluate((n) => n.scrollIntoView({ block: "end" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await suivant.click();

    const attendue = page.getByText("Réponse attendue");
    await expect(attendue.first()).toBeVisible();
    // Mesure réelle : la première question manquante est dans la fenêtre après le clic (le défilement est doux).
    await expect.poll(async () => {
      const b = await attendue.first().boundingBox();
      const h = page.viewportSize()!.height;
      return !!b && b.y >= 0 && b.y + b.height <= h;
    }).toBe(true);
    // Le message se répète : en haut de l'étape et au-dessus du bouton, chaque fois une seule phrase.
    const message = page.getByText("Merci de répondre aux questions marquées d'une étoile.");
    await expect(message).toHaveCount(2);
    const mb = await message.last().boundingBox();
    const sb = await suivant.boundingBox();
    expect(mb!.y + mb!.height).toBeLessThanOrEqual(sb!.y + 1);
  });
});

test.describe("T7 : Notifier, famille « Cultes » sans culte", () => {
  for (const [langue, famille, attendu, ancien] of [
    ["fr", "Cultes", "Choisis un culte.", "Choisis à qui écrire."],
    ["zh-CN", "崇拜", "请选择一场崇拜。", "请选择发给谁。"],
  ] as const) {
    test(`${langue} : « ${attendu} »`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-02T10:00:00+02:00"));
      await sansSheet(page);
      if (langue === "zh-CN") await enZh(page);
      await signInAs(page, ADMIN, {}, "/back-office/messages/notifier");
      const main = page.locator("main");
      await main.getByRole("radio", { name: famille, exact: true }).or(main.getByRole("button", { name: famille, exact: true })).first().click();
      await expect(main.getByText(attendu)).toBeVisible();
      await expect(main.getByText(ancien)).toHaveCount(0);
    });
  }
});
