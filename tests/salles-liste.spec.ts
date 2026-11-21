import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, interdireDialoguesNatifs, ongletsRail, verifierSansDebordement } from "./helpers/agencement";
import { creneauxEnReservations } from "./helpers/creneauxScene";

// Chantier AR (docs/spec-salles.md), lot 2, tranche T2b : l'onglet « Salles » (connectés seulement, SA14), la page
// `/evenements/salles` en vue Liste (SA2 : huit lignes groupées, l'état en mots), la bande de jours, la ligne de contexte
// et le repère d'heure (SA1, AR12), la journée d'une salle (page au téléphone et en tablette portrait, volet de la
// semaine en tablette paysage et à l'ordinateur, SA4), un créneau de scène lu comme occupation de la Grande salle
// (SA13). Firestore, planning et date simulés ; personnes fictives.

const MAINTENANT = "2026-11-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "programmes/noel": { nom: "Noël", jourJ: "2026-12-20", debut: "2026-10-04", visible: true, passages: [], createdBy: "uid-ysolde", updatedAt: MAINTENANT },
  // Dimanche 15 novembre, 17:00–18:00 : un créneau de scène (la Grande salle est prise avec elle, AR6).
  "programmes/noel/creneaux/c15": {
    dimanche: "2026-11-15", debut: "17:00", fin: "18:00", quoi: "Sketch", qui: ["Jeunes"], note: "",
    auteurUid: "uid-ysolde", auteurNom: "Ysolde", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

const MEMBRE: FakeProfile = { uid: "uid-benedict", email: "benedict@example.com", firstName: "Bénédict", lastName: "Fauvel", serviceRoles: { "Groupe Paix": ["chanteur"] } };

/** Dimanche 15 novembre 2026 (dimanche ordinaire : planning vide), à 14:00 de Paris. */
const DIMANCHE_14H = "2026-11-15T14:00:00+01:00";

async function ouvrir(page: Page, qui: FakeProfile | null, to: string, { heure = DIMANCHE_14H, zh = false } = {}) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(heure));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  // T2c : la Grille est la vue par défaut en grand (SA5) ; cette spec regarde la Liste.
  await page.addInitScript(() => { try { localStorage.setItem("gcc-salles-vue", "liste"); } catch {} });
  if (qui) return signInAs(page, qui, creneauxEnReservations(DOCS), to);
  await page.goto(to);
}

const liste = (page: Page) => page.getByRole("list", { name: /^(Salles|场地)$/ });
const ligne = (page: Page, nom: string) => liste(page).getByRole("listitem").filter({ has: page.getByText(nom, { exact: true }) });
const etat = (page: Page, nom: string) => ligne(page, nom).locator("[data-etat]");
const contexte = (page: Page) => page.locator("[data-contexte-salles]");
const repere = (page: Page) => page.getByRole("combobox", { name: /Heure|时间/ });

test.describe("AR, T2b : Salles en Liste", () => {
  test("connecté : le rail dit « Évènements · Salles », Salles mène à /evenements/salles", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Salles"]);
    await ongletsRail(page).getByRole("link", { name: "Salles" }).click();
    await expect(page).toHaveURL(/\/evenements\/salles\/?$/);
    await expect(ongletsRail(page).getByRole("link", { name: "Salles" })).toHaveAttribute("aria-current", "page");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Église" })).toBeVisible();
  });

  test("sans compte : ni onglet Salles, et /evenements/salles renvoie vers la connexion", async ({ page }) => {
    await ouvrir(page, null, "/evenements");
    await expect(page.getByRole("link", { name: "Salles" })).toHaveCount(0);
    await page.goto("/evenements/salles");
    await expect(page).toHaveURL(/\/login\/?\?from=%2Fevenements%2Fsalles/);
  });

  test("huit lignes groupées : Grande salle, Salles de groupe, Bureaux ; plus de Scène (AS14) ni de ligne en retrait ; l'autre nom à côté", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/salles");
    await expect(liste(page).locator("[data-salle]")).toHaveCount(8);
    const ordre = await liste(page).locator("[data-salle]").evaluateAll((els) => els.map((e) => e.getAttribute("data-salle")));
    expect(ordre).toEqual(["grande", "fidelite", "paix", "amour", "bonte", "zhongban", "imprimante", "reunion"]);
    await expect(liste(page).getByRole("heading")).toHaveText(["Grande salle", "Salles de groupe", "Bureaux"]);
    await expect(liste(page).getByText("Scène")).toHaveCount(0);
    await expect(liste(page).locator("[data-salle].pl-5")).toHaveCount(0);
    await expect(ligne(page, "Salle Fidélité")).toContainText("小班");
    await expect(ligne(page, "Salle Amour")).toContainText("大班");
    await verifierSansDebordement(page);
  });

  test("un dimanche ordinaire à 14:00 : l'état de chaque salle en mots, « maintenant »", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/salles");
    await expect(contexte(page)).toContainText("Dimanche ordinaire");
    await expect(repere(page)).toHaveValue("maintenant");
    await expect(etat(page, "Grande salle")).toHaveText("Groupe Joie jusqu'à 14:30");
    await expect(etat(page, "Salle Bonté")).toHaveText("Groupe Bonté jusqu'à 14:30");
    await expect(etat(page, "Salle 中班")).toHaveText("Libre jusqu'à 15:30");
    await expect(etat(page, "Salle de réunion")).toHaveText("Libre tout l'après-midi");
  });

  test("repère d'heure : il se change au quart d'heure ; un autre jour se lit « à 08:00 »", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/salles");
    await repere(page).selectOption("15:15");
    await expect(etat(page, "Grande salle")).toHaveText("Culte sinophone jusqu'à 17:00");
    await expect(etat(page, "Salle Fidélité")).toHaveText("Libre jusqu'à 15:30");
    // La bande de jours : mardi 17 novembre, sans emploi du temps fixe.
    await page.getByRole("button", { name: /mardi 17 novembre/i }).click();
    await expect(page.getByRole("button", { name: /mardi 17 novembre/i })).toHaveAttribute("aria-pressed", "true");
    await expect(repere(page)).toHaveValue("08:00");
    await expect(contexte(page)).not.toContainText("Dimanche ordinaire");
    await expect(etat(page, "Grande salle")).toHaveText("Libre toute la journée");
  });

  test("un ancien créneau « scene » se lit comme une occupation de la Grande salle ; il s'écrit sur sa ligne", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/salles", { heure: "2026-11-15T17:30:00+01:00" });
    await expect(etat(page, "Grande salle")).toHaveText("Sketch · Jeunes jusqu'à 18:00");
    await expect(ligne(page, "Grande salle")).toContainText("17:00 – 18:00 · Sketch · Jeunes · Ysolde");
  });

  test("toucher une salle ouvre sa journée : une page en un volet, la semaine dans le volet de droite en grand", async ({ page }, info) => {
    await ouvrir(page, MEMBRE, "/evenements/salles");
    await ligne(page, "Grande salle").getByRole("link").click();
    await expect(page).toHaveURL(/\/evenements\/salles\/grande\/?$/);
    const journee = page.locator("[data-journee-salle]");
    await expect(journee.getByRole("heading", { name: "Grande salle" })).toBeVisible();
    await expect(journee).toContainText("08:30 – 10:30 · Entraînement louange");
    await expect(journee).toContainText("13:00 – 14:30 · Groupe Joie");
    if (estGrandEcran(info)) {
      // Volet de droite : la liste reste, la semaine de la salle (dimanche 15 → samedi 21).
      await expect(liste(page)).toBeVisible();
      await expect(journee.getByRole("heading", { level: 3 })).toHaveCount(7);
      await expect(journee.getByRole("heading", { level: 3 }).first()).toHaveText(/dimanche 15 novembre/i);
      await expect(journee).toContainText(/samedi 21 novembre/i);
      await expect(journee).toContainText("17:00 – 18:00 · Sketch · Jeunes · Ysolde");
    } else {
      // Une page : la liste n'est plus là, un retour « Salles » y ramène.
      await expect(liste(page)).toHaveCount(0);
      await journee.getByRole("link", { name: /Salles/ }).click();
      await expect(page).toHaveURL(/\/evenements\/salles\/?$/);
      await expect(liste(page)).toBeVisible();
    }
    await verifierSansDebordement(page);
  });

  test("中文 : 场地, 小组教室, l'état en chinois", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/salles", { zh: true });
    await expect(ongletsRail(page).getByRole("link", { name: "场地" })).toHaveAttribute("aria-current", "page");
    await expect(liste(page).getByRole("heading")).toHaveText(["大厅", "小组教室", "办公室"]);
    await expect(contexte(page)).toContainText("普通主日");
    await expect(etat(page, "Grande salle")).toHaveText("喜乐团契，至 14:30");
  });
});
