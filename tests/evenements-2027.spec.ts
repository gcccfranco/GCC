import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS } from "../src/lib/access";
import { BASCULE_EVENEMENTS, annonceBascule, avantBascule, jourDeParis } from "../src/lib/evenements/bascule";
import { agendaPublic } from "../src/lib/evenements/agenda";
import type { EntreeSheet } from "../src/lib/evenements/sheet";
import { planDeplacement } from "../src/lib/calendrier/deplacer";
import type { EntreeCalendrier } from "../src/lib/calendrier/entrees";
import type { Evenement } from "../src/types/evenement";

// Lot U9 (docs/spec-evenements-2027.md) : les évènements sur le site à partir de janvier 2027.
// B1 : la bascule (`bascule.ts`), le refus du formulaire avant la bascule pour « Toute
// l'église », la pastille du calendrier. B2 : l'agenda public mêle les entrées du Sheet
// (avant la bascule) aux évènements de l'app, sans nom ni lien sans compte. B3 : la ligne
// d'annonce du Back-Office (jusqu'au 31/01/2027) et le paragraphe du guide. Sheet, Firestore
// et horloge simulés ; titres et noms inventés.

const SHEET = "https://docs.google.com/spreadsheets/d/12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8";
const GID_DECEMBRE = "484545153";
// L'onglet d'octobre de U8, rebaptisé décembre : mêmes numéros de jour, donc le 6 porte
// « Soirée louange » (responsable et téléphones inventés).
const FIXTURE_DECEMBRE = readFileSync(join(__dirname, "fixtures", "sheet-evenements-mois.csv"), "utf8")
  .replace("OCTOBRE 2026", "DÉCEMBRE 2026");

const REFUS = "Jusqu'au 31/12/2026, les évènements de toute l'église s'écrivent dans le Sheet des évènements.";

/** Coordination (pôle Évènement) : « Toute l'église », les sections, la réunion du pôle. */
const COORD: FakeProfile = { uid: "uid-coord", email: "coord@example.org", firstName: "Lison", lastName: "R.", poles: ["evenement"] };
const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "14:00", heureFin: "", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: null, inscriptions: "auto",
  sansCompte: false, lienExterne: "", contact: "", organisateurUid: "uid-coord", organisateurNom: "Lison R.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/kermesse": { ...EV, titre: "Kermesse", date: "2026-11-07" },
  "evenements/galette": { ...EV, titre: "Galette", date: "2027-01-16" },
  "evenements/paix": { ...EV, titre: "Sortie du groupe", pour: "Groupe Paix", date: "2026-12-12" },
};

/** Le Sheet des évènements (export par gid) et le planning (gviz) : jamais les vrais. Compte les
 *  lectures du Sheet des évènements. */
async function sheets(page: Page) {
  const lus: string[] = [];
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/export")) {
      const gid = url.searchParams.get("gid") ?? "";
      lus.push(gid);
      return route.fulfill({ status: 200, contentType: "text/csv", body: gid === GID_DECEMBRE ? FIXTURE_DECEMBRE : "" });
    }
    return route.fulfill({ status: 200, contentType: "text/csv", body: "" });
  });
  return lus;
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, maintenant: string) {
  await page.clock.setFixedTime(new Date(maintenant));
  const lus = await sheets(page);
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  const db = await signInAs(page, qui, DOCS, "/moi");
  await page.goto(to);
  return { db, lus };
}

const creer = (page: Page) => page.getByRole("button", { name: "Créer l'évènement" }).click();
const ecrit = (db: Awaited<ReturnType<typeof signInAs>>) =>
  db.writes.find((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path));

test.describe("B1 : la bascule (pur)", () => {
  test("la date de l'évènement décide : 31/12/2026 avant, 01/01/2027 après", () => {
    expect(BASCULE_EVENEMENTS).toBe("2027-01-01");
    expect(avantBascule("2026-08-01")).toBe(true);
    expect(avantBascule("2026-12-31")).toBe(true);
    expect(avantBascule("2026-12-31T23:59")).toBe(true);
    expect(avantBascule("2027-01-01")).toBe(false);
    expect(avantBascule("2027-01-01T00:00")).toBe(false);
    expect(avantBascule("2027-01-10")).toBe(false);
  });
});

test.describe("B1 : le formulaire refuse « Toute l'église » avant la bascule", () => {
  test("le 20/12/2026 refusé avec le lien du Sheet ; le 10/01/2027 créé, inscriptions dans l'app", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
    await expect(page.getByLabel("Public")).toHaveValue("eglise");
    await page.getByLabel("Nom de l'évènement").fill("Concert de Noël");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toBeVisible();
    const lien = page.getByRole("link", { name: "Ouvrir le Sheet des évènements" });
    await expect(lien).toHaveAttribute("href", `${SHEET}/edit#gid=${GID_DECEMBRE}`);
    await expect(lien).toHaveAttribute("target", "_blank");
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?$/);
    await page.waitForTimeout(300);
    expect(ecrit(db)).toBeUndefined();

    await page.getByLabel("Date", { exact: true }).fill("2027-01-10");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ titre: "Concert de Noël", pour: "eglise", date: "2027-01-10", inscriptions: "auto" });
  });

  test("une section le 20/12/2026 passe", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
    await page.getByLabel("Nom de l'évènement").fill("Sortie raquettes");
    await page.getByLabel("Public").selectOption("Groupe Paix");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ pour: "Groupe Paix", date: "2026-12-20" });
  });

  test("une réunion de pôle le 20/12/2026 passe", async ({ page }) => {
    // Retouches v18, lot E : une réunion se crée par « + Nouvelle réunion ».
    const { db } = await ouvrir(page, COORD, "/back-office/reunions/nouvelle", "2026-12-15T10:00:00");
    await page.getByLabel("Nom de l'évènement").fill("Réunion de fin d'année");
    await page.getByLabel("Public").selectOption("pole:evenement");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    // Agencement v18 (B15) : une réunion se gère sous Réunions.
    await expect(page).toHaveURL(/\/back-office\/reunions\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ pour: "pole:evenement", date: "2026-12-20" });
  });

  test("modifier : un évènement déjà là se corrige ; le reculer en 2026 ou le passer à « Toute l'église » est refusé", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/kermesse/modifier", "2026-12-15T10:00:00");
    // Déjà dans l'app (créé avant la bascule) : le corriger ne fait pas de doublon.
    await page.getByLabel("Nom de l'évènement").fill("Kermesse d'automne");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/kermesse\/?$/);
    expect(db.doc("evenements/kermesse")).toMatchObject({ titre: "Kermesse d'automne" });

    // Un évènement de janvier 2027 reculé au 20/12/2026 : refusé.
    await page.goto("/back-office/evenements/galette/modifier");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/galette\/modifier\/?$/);
    expect(db.doc("evenements/galette")).toMatchObject({ date: "2027-01-16" });

    // Une sortie de section de décembre passée à « Toute l'église » : refusée.
    await page.goto("/back-office/evenements/paix/modifier");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByLabel("Public").selectOption("eglise");
    await expect(page.getByText(REFUS)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(300);
    expect(db.doc("evenements/paix")).toMatchObject({ pour: "Groupe Paix" });
  });
});

test("B1, en chinois : le refus compte le 31/12/2026（含）", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
  await page.locator("#ev-date").fill("2026-12-31");
  await expect(page.getByText("31/12/2026（含）之前，全教会的活动请写在活动表（Sheet）中。")).toBeVisible();
  await expect(page.getByRole("link", { name: "打开活动表" })).toHaveAttribute("href", `${SHEET}/edit#gid=${GID_DECEMBRE}`);
});

/** Les pastilles des sources : en rangée, ou dans la feuille « Sources » sur téléphone. */
async function pastilles(page: Page, info: TestInfo) {
  if (info.project.name === "telephone") {
    await page.getByRole("button", { name: "Sources", exact: true }).click();
    return page.getByRole("dialog", { name: "Sources" }).getByRole("group", { name: "Sources affichées" });
  }
  return page.getByRole("group", { name: "Sources affichées" });
}
async function fermer(page: Page, info: TestInfo) {
  if (info.project.name !== "telephone") return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Sources" })).toHaveCount(0);
}
async function enMois(page: Page) {
  const bouton = page.getByRole("tablist", { name: "Affichage" }).getByRole("tab", { name: "Mois" });
  if ((await bouton.getAttribute("aria-selected")) !== "true") await bouton.click();
  await expect(bouton).toHaveAttribute("aria-selected", "true");
}
const pret = (page: Page) => expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");

test.describe("B1 : la pastille du calendrier selon l'horloge", () => {
  test("le 15/12/2026 : « Évènements (Sheet) », et décembre lit le Sheet", async ({ page }, info) => {
    const { lus } = await ouvrir(page, ADMIN, "/back-office/calendrier", "2026-12-15T10:00:00");
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Décembre( 2026)?$/);
    await enMois(page);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toBeVisible();
    await fermer(page, info);
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
  });

  test("le 15/12/2026, janvier affiché : la pastille suit l'horloge, elle dit encore « Évènements (Sheet) »", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/back-office/calendrier", "2026-12-15T10:00:00");
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Décembre( 2026)?$/);
    await enMois(page);
    await page.getByRole("button", { name: "Mois suivant" }).click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Janvier( 2027)?$/);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toBeVisible();
    await fermer(page, info);
  });

  test("le 02/01/2027 : « Évènements », janvier sans requête au Sheet, décembre le lit encore", async ({ page }, info) => {
    const { lus } = await ouvrir(page, ADMIN, "/back-office/calendrier", "2027-01-02T10:00:00");
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Janvier( 2027)?$/);
    await pret(page);
    await enMois(page);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements", exact: true })).toBeVisible();
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toHaveCount(0);
    await fermer(page, info);
    // La grille de janvier commence le lundi 28/12/2026 : pas même ces jours-là.
    await page.waitForTimeout(300);
    expect(lus).toEqual([]);

    await page.getByRole("button", { name: "Mois précédent" }).click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Décembre( 2026)?$/);
    await pret(page);
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
    if (info.project.name !== "telephone") {
      await expect(page.locator('[data-jour="2026-12-06"] [data-source="evenements"]').first()).toContainText("Soirée louange");
    }
  });
});

test("captures B1 : le refus sous la date, la pastille de janvier", async ({ page }, info) => {
  const dossier = join(process.cwd(), "test-results", "evenements-2027-captures", info.project.name);
  await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
  await page.getByLabel("Nom de l'évènement").fill("Concert de Noël");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
  await expect(page.getByText(REFUS)).toBeVisible();
  await page.getByText(REFUS).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dossier}-refus.png`, animations: "disabled" });
});


// ─── B2 : l'agenda public ─────────────────────────────────────────────────────

/** Le jour de la fixture qui porte un responsable et dont les inscrits ont un téléphone. */
const TELEPHONES = ["06 99 99 99 99", "07 11 22 33 44"];
const LIEN_DECEMBRE = `${SHEET}/edit#gid=${GID_DECEMBRE}`;

const entree = (date: string, titre: string, responsable = ""): EntreeSheet =>
  ({ date, titre, heure: "20:00", heureFin: "", horaire: "20h", lieu: "Eglise", responsable });
const appEv = (id: string, date: string, titre: string) => ({ ...EV, id, titre, date }) as Evenement;

test.describe("B2 : agendaPublic (pur)", () => {
  const sheet = [entree("2026-12-31", "Veillée", "Sacha Fictif"), entree("2027-01-01", "Égarée en 2027"), entree("2026-12-04", "Repas", "Noé Fictif")];
  const app = [appEv("galette", "2027-01-16", "Galette"), appEv("concert", "2026-12-20", "Concert")];

  test("garde le Sheet jusqu'au 31/12/2026, jamais le 01/01/2027 ; mêle et trie par mois", () => {
    const { aVenir } = agendaPublic(app, sheet, true, "2026-12-15", "fr");
    expect(aVenir.map((g) => g.label)).toEqual(["Décembre 2026", "Janvier 2027"]);
    const titres = (i: number) => aVenir[i].elements.map((x) => (x.source === "app" ? x.evenement.titre : x.entree.titre));
    expect(titres(0)).toEqual(["Concert", "Veillée"]);
    expect(titres(1)).toEqual(["Galette"]);
  });

  test("connecté : responsable et lien de l'onglet du mois ; sans compte : ni l'un ni l'autre", () => {
    const veillee = (connecte: boolean) => {
      const x = agendaPublic([], sheet, connecte, "2026-12-15", "fr").aVenir[0].elements[0];
      if (x.source !== "sheet") throw new Error("entrée du Sheet attendue");
      return x.entree;
    };
    expect(veillee(true)).toMatchObject({ titre: "Veillée", responsable: "Sacha Fictif", lien: LIEN_DECEMBRE });
    expect(veillee(false)).toMatchObject({ titre: "Veillée", responsable: "", lien: "" });
  });

  test("connecté, une entrée sans responsable n'a pas de lien : le Sheet n'a de bloc d'inscription que sous un responsable", () => {
    const x = agendaPublic([], [entree("2026-12-24", "Crèche vivante")], true, "2026-12-15", "fr").aVenir[0].elements[0];
    expect(x).toMatchObject({ source: "sheet", entree: { titre: "Crèche vivante", responsable: "", lien: "" } });
  });

  test("passés derrière le lien, plus récents d'abord ; une entrée passée du Sheet n'a ni nom ni lien", () => {
    const { aVenir, passes } = agendaPublic(app, sheet, true, "2026-12-15", "fr");
    expect(aVenir.flatMap((g) => g.elements).some((x) => x.source === "sheet" && x.entree.titre === "Repas")).toBe(false);
    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({ source: "sheet", entree: { titre: "Repas", responsable: "", lien: "" } });
  });
});

/** Un visiteur sans compte, Sheet et Firestore simulés. */
async function visiteur(page: Page, maintenant: string) {
  await page.clock.setFixedTime(new Date(maintenant));
  const lus = await sheets(page);
  await fakeFirestore(page, DOCS);
  await page.goto("/evenements");
  return lus;
}
const sansTelephone = async (page: Page) => {
  for (const tel of TELEPHONES) await expect(page.getByText(tel)).toHaveCount(0);
};

test.describe("B2 : l'agenda public montre le Sheet jusqu'au 31/12/2026", () => {
  test("15/12/2026, sans compte : entrées de décembre du Sheet, sans responsable ni lien, mêlées à l'app", async ({ page }) => {
    const lus = await visiteur(page, "2026-12-15T10:00:00");
    const decembre = page.getByRole("heading", { name: "Décembre 2026" });
    await expect(decembre).toBeVisible();
    await expect(page.getByText("Chants de Noël")).toBeVisible();
    await expect(page.getByText("Veillée")).toBeVisible();
    await expect(page.getByText("Tableau des évènements").first()).toBeVisible();
    // L'évènement de l'app de janvier, après décembre.
    await expect(page.getByRole("heading", { name: "Janvier 2027" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Galette/ })).toBeVisible();
    // Pas de fiche, pas de nom, pas de lien vers la feuille.
    await expect(page.getByRole("link", { name: /Chants de Noël/ })).toHaveCount(0);
    await expect(page.getByText("Sacha Fictif")).toHaveCount(0);
    await expect(page.getByText("Camille Exemple")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "S'inscrire sur le tableau" })).toHaveCount(0);
    expect(lus).toContain(GID_DECEMBRE);
    // Les passés (le 6, le 10) derrière le lien, sans nom non plus.
    await page.getByRole("button", { name: /Évènements passés/ }).click();
    await expect(page.getByText("Soirée louange")).toBeVisible();
    await expect(page.getByText("Camille Exemple")).toHaveCount(0);
    await sansTelephone(page);
  });

  test("15/12/2026, connecté : « Pour plus d'infos » et « S'inscrire sur le tableau » (onglet du mois, nouvel onglet)", async ({ page }) => {
    await ouvrir(page, COORD, "/evenements", "2026-12-15T10:00:00");
    await expect(page.getByText("Pour plus d'infos : Sacha Fictif")).toBeVisible();
    // « Chants de Noël » (responsable) a le lien ; « Veillée » (sans responsable) ne l'a pas.
    const liens = page.getByRole("link", { name: "S'inscrire sur le tableau" });
    await expect(liens).toHaveCount(1);
    await expect(liens.first()).toHaveAttribute("href", LIEN_DECEMBRE);
    await expect(liens.first()).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("link", { name: /Chants de Noël/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Évènements passés/ }).click();
    await expect(page.getByText("Soirée louange")).toBeVisible();
    await sansTelephone(page);
  });

  test("15/12/2026, en chinois : « 活动表 » et « 在活动表上报名 »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, COORD, "/evenements", "2026-12-15T10:00:00");
    await expect(page.getByText("Chants de Noël")).toBeVisible();
    await expect(page.getByText("活动表", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "在活动表上报名" }).first()).toHaveAttribute("href", LIEN_DECEMBRE);
    await expect(page.getByText("详情联系：Sacha Fictif")).toBeVisible();
  });

  test("02/01/2027 : l'agenda ne lit plus le Sheet", async ({ page }) => {
    const lus = await visiteur(page, "2027-01-02T10:00:00");
    await expect(page.getByRole("link", { name: /Galette/ })).toBeVisible();
    await page.waitForTimeout(300);
    expect(lus).toEqual([]);
    await expect(page.getByText("Tableau des évènements")).toHaveCount(0);
  });
});

test.describe("B2 : l'agenda ne dit pas « rien » tant que le Sheet n'a pas répondu", () => {
  const AUCUN = "Aucun évènement à venir.";
  const INJOIGNABLE = "Le tableau des évènements n'a pas pu être lu. Réessaie plus tard.";
  const charge = (page: Page) => expect(page.getByText("Membre de l'église ? Connecte-toi", { exact: false })).toBeVisible();

  test("15/12/2026, rien dans l'app : pendant la lecture, pas de « Aucun évènement à venir. »", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-12-15T10:00:00"));
    let repondre!: () => void;
    const reponse = new Promise<void>((r) => { repondre = r; });
    await page.route(/docs\.google\.com\/spreadsheets/, async (route) => {
      await reponse;
      const gid = new URL(route.request().url()).searchParams.get("gid");
      return route.fulfill({ status: 200, contentType: "text/csv", body: gid === GID_DECEMBRE ? FIXTURE_DECEMBRE : "" });
    });
    await fakeFirestore(page, {});
    await page.goto("/evenements");
    await charge(page);
    await page.waitForTimeout(300);
    await expect(page.getByText(AUCUN)).toHaveCount(0);
    repondre();
    // En grand (U4 bis, Q3), la première entrée est aussi à droite, faute d'évènement de l'app.
    await expect(page.getByText("Chants de Noël").first()).toBeVisible();
    await expect(page.getByText(AUCUN)).toHaveCount(0);
  });

  test("15/12/2026, rien dans l'app, Sheet injoignable : il le dit au lieu de « Aucun évènement à venir. »", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-12-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 500, body: "" }));
    await fakeFirestore(page, {});
    await page.goto("/evenements");
    await charge(page);
    // En grand (U4 bis, Q3), le volet de droite d'un agenda vide dit la même chose : la première suffit.
    await expect(page.getByText(INJOIGNABLE).first()).toBeVisible();
    await expect(page.getByText(AUCUN)).toHaveCount(0);
  });

  test("en chinois, Sheet injoignable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-12-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 500, body: "" }));
    await fakeFirestore(page, {});
    await page.goto("/evenements");
    await expect(page.getByText("暂时无法读取活动表，请稍后再试。").first()).toBeVisible();
    await expect(page.getByText("暂无即将举行的活动。")).toHaveCount(0);
  });

  test("en grand (U4 bis), rien dans l'app : à droite, la première entrée du Sheet, faute de fiche (ordinateur et tablette couchée)", async ({ page }, info) => {
    test.skip(info.project.name === "telephone" || info.project.name === "tablette", "deux volets : ordinateur et tablette couchée");
    await page.clock.setFixedTime(new Date("2026-12-15T10:00:00"));
    await sheets(page);
    await fakeFirestore(page, {});
    await page.goto("/evenements");
    await expect(page.locator('[data-volet="liste"] [data-source="sheet"]').first()).toBeVisible();
    const droite = page.locator('[data-volet="detail"]');
    await expect(droite.locator('[data-source="sheet"]')).toHaveCount(1);
    await expect(droite.getByText("Tableau des évènements")).toBeVisible();
    await expect(page.getByText(AUCUN)).toHaveCount(0);
  });

  test("02/01/2027, rien dans l'app : « Aucun évènement à venir. » tout de suite (le Sheet n'est plus lu)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2027-01-02T10:00:00"));
    const lus = await sheets(page);
    await fakeFirestore(page, {});
    await page.goto("/evenements");
    await expect(page.getByText(AUCUN).first()).toBeVisible();
    expect(lus).toEqual([]);
  });
});

test("captures B2 : l'agenda de décembre, sans compte et connecté", async ({ page }, info) => {
  const dossier = join(process.cwd(), "test-results", "evenements-2027-captures", info.project.name);
  await ouvrir(page, COORD, "/evenements", "2026-12-15T10:00:00");
  await expect(page.getByText("Pour plus d'infos : Sacha Fictif")).toBeVisible();
  await page.getByText("Chants de Noël").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dossier}-agenda-connecte.png`, animations: "disabled", fullPage: true });
});

test("captures B2 : sans compte", async ({ page }, info) => {
  const dossier = join(process.cwd(), "test-results", "evenements-2027-captures", info.project.name);
  await visiteur(page, "2026-12-15T10:00:00");
  await expect(page.getByText("Chants de Noël")).toBeVisible();
  await page.screenshot({ path: `${dossier}-agenda-visiteur.png`, animations: "disabled", fullPage: true });
});


// ─── B3 : l'annonce ───────────────────────────────────────────────────────────

const ANNONCE_AVANT = "Les évènements de 2026 restent dans le Sheet ; ceux de 2027 se créent ici.";
const ANNONCE_APRES = "Les évènements se créent ici ; le Sheet n'est plus lu.";
const annonce = (page: Page) => page.getByRole("note", { name: "Annonce" });

test.describe("B3 : annonceBascule (pur)", () => {
  test("« avant » jusqu'au 31/12/2026, « après » du 01/01 au 31/01/2027, plus rien ensuite", () => {
    expect(annonceBascule("2026-10-05")).toBe("avant");
    expect(annonceBascule("2026-12-31")).toBe("avant");
    expect(annonceBascule("2027-01-01")).toBe("apres");
    expect(annonceBascule("2027-01-31")).toBe("apres");
    expect(annonceBascule("2027-02-01")).toBeNull();
  });
});

test.describe("B3 : la ligne d'annonce en tête du Back-Office", () => {
  test("calendrier : le texte d'avant le 15/12/2026", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/calendrier", "2026-12-15T10:00:00");
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Décembre( 2026)?$/);
    await expect(annonce(page)).toHaveText(ANNONCE_AVANT);
    await expect(page.getByText(ANNONCE_APRES)).toHaveCount(0);
  });

  test("calendrier : le texte d'après le 02/01/2027, encore le 31/01/2027, disparu le 01/02/2027", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/calendrier", "2027-01-02T10:00:00");
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Janvier( 2027)?$/);
    await expect(annonce(page)).toHaveText(ANNONCE_APRES);
    await expect(page.getByText(ANNONCE_AVANT)).toHaveCount(0);

    await page.clock.setFixedTime(new Date("2027-01-31T20:00:00"));
    await page.reload();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Janvier( 2027)?$/);
    await expect(annonce(page)).toHaveText(ANNONCE_APRES);

    await page.clock.setFixedTime(new Date("2027-02-01T08:00:00"));
    await page.reload();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Février( 2027)?$/);
    await expect(annonce(page)).toHaveCount(0);
    await expect(page.getByText(ANNONCE_APRES)).toHaveCount(0);
  });

  test("gestion des évènements : avant, après, puis disparue", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements", "2026-12-15T10:00:00");
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toBeVisible();
    await expect(annonce(page)).toHaveText(ANNONCE_AVANT);

    await page.clock.setFixedTime(new Date("2027-01-02T10:00:00"));
    await page.reload();
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toBeVisible();
    await expect(annonce(page)).toHaveText(ANNONCE_APRES);

    await page.clock.setFixedTime(new Date("2027-02-01T08:00:00"));
    await page.reload();
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toBeVisible();
    await expect(annonce(page)).toHaveCount(0);
  });

  test("les réunions de pôle n'ont pas la ligne (elles ne passent jamais par le Sheet)", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/reunions", "2026-12-15T10:00:00");
    await expect(page.getByRole("link", { name: /Nouvelle réunion/ })).toBeVisible();
    await expect(annonce(page)).toHaveCount(0);
  });

  test("en chinois, sur les deux pages", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, COORD, "/back-office/evenements", "2026-12-15T10:00:00");
    await expect(page.getByRole("note", { name: "公告" })).toHaveText("2026 年的活动仍记在活动表（Sheet）中；2027 年的活动请在这里创建。");
    await page.clock.setFixedTime(new Date("2027-01-02T10:00:00"));
    await page.goto("/back-office/calendrier");
    await expect(page.getByRole("note", { name: "公告" })).toHaveText("活动请在这里创建；系统不再读取活动表（Sheet）。");
  });
});

test.describe("B3 : le guide dit où créer un évènement", () => {
  test("en français : le Sheet jusqu'au 31/12/2026, le Back-Office ensuite", async ({ page }) => {
    await ouvrir(page, COORD, "/guide", "2026-12-15T10:00:00");
    const section = page.locator("section#evenements");
    await expect(section).toContainText(
      "Où créer un évènement : ceux de toute l'église datés jusqu'au 31/12/2026 s'écrivent dans le Sheet des évènements ; à partir de 2027, ils se créent dans le Back-Office › Évènements › « Nouvel évènement », comme les sorties de section. Les réunions de pôle se créent dans Back-Office › Réunions › « Nouvelle réunion ».",
    );
  });

  test("en chinois", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, COORD, "/guide", "2026-12-15T10:00:00");
    await expect(page.locator("section#evenements")).toContainText(
      "在哪里创建活动：日期在 31/12/2026 之前（含）的全教会活动写在活动表（Sheet）中；从 2027 年起，请在 后台 › 活动 ›「新建活动」中创建，小组外出也一样。部门会议请在 后台 › 会议 ›「新建会议」中创建。",
    );
  });
});

test("captures B3 : la ligne d'annonce, calendrier et gestion", async ({ page }, info) => {
  const dossier = join(process.cwd(), "test-results", "evenements-2027-captures", info.project.name);
  await ouvrir(page, ADMIN, "/back-office/calendrier", "2026-12-15T10:00:00");
  await expect(annonce(page)).toBeVisible();
  await pret(page);
  await page.screenshot({ path: `${dossier}-annonce-calendrier.png`, animations: "disabled" });
  await page.clock.setFixedTime(new Date("2027-01-02T10:00:00"));
  await page.goto("/back-office/evenements");
  await expect(annonce(page)).toHaveText(ANNONCE_APRES);
  await page.screenshot({ path: `${dossier}-annonce-evenements.png`, animations: "disabled" });
});


// ─── Fusion de U8 : le widget Calendrier du tableau de bord suit Q6 ─────────────

test.describe("Q6 : le widget Calendrier (U8, C8) suit la bascule", () => {
  const widgetCal = (page: Page) => page.getByTestId("grille-widgets").getByRole("region", { name: "Calendrier", exact: true });
  async function tableauDeBord(page: Page, taille: "m" | "l", maintenant: string) {
    await page.clock.setFixedTime(new Date(maintenant));
    const lus = await sheets(page);
    await signInAs(page, ADMIN, {
      ...DOCS,
      "backOffice/u-admin": { tableauDeBord: [{ id: "calendrier", taille, reglages: {} }], majLe: "2026-12-01" },
    }, "/back-office");
    await expect(widgetCal(page)).toBeVisible();
    return lus;
  }

  for (const taille of ["m", "l"] as const) {
    test(`02/01/2027, ${taille.toUpperCase()} : la période commence le 28/12/2026, aucune requête au Sheet`, async ({ page }) => {
      const lus = await tableauDeBord(page, taille, "2027-01-02T10:00:00");
      await expect(widgetCal(page).locator('[data-jour="2026-12-28"]')).toBeVisible();
      await page.waitForTimeout(300);
      expect(lus).toEqual([]);
    });
  }

  test("15/12/2026, L : décembre lit encore le Sheet", async ({ page }) => {
    const lus = await tableauDeBord(page, "l", "2026-12-15T10:00:00");
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
    await expect(widgetCal(page).locator('[data-jour="2026-12-06"] [data-source="evenements"]').first()).toBeVisible();
  });
});


// ─── Relecture : Q3 dans « Déplacer… » et le glisser-déposer du calendrier (U8, C6) ───

test.describe("Q3 : déplacer un évènement de toute l'église de 2027 en 2026 est refusé", () => {
  const horloge = { today: "2026-12-15", maintenant: "10:00" };
  const ev = (e: Partial<Evenement> & Pick<Evenement, "id" | "date">) => ({ ...EV, titre: "Titre", ...e }) as Evenement;
  const de = (source: EntreeCalendrier["source"], id: string, date: string): EntreeCalendrier => ({
    source, cle: `${source}:${id}:${date}`, date, heure: "", heureFin: "", titre: "Titre", detail: "", couleur: "#000",
    duSheet: false, moi: false, deplacable: true, lien: "",
  });
  const donnees = (evenements: Evenement[]) => ({ evenements, taches: [], scene: [] });

  test("« Toute l'église » du 16/01/2027 déposé le 19/12/2026 : refus « sheet » ; le 31/12 aussi, le 01/01/2027 passe", () => {
    const galette = ev({ id: "galette", date: "2027-01-16" });
    const d = donnees([galette]);
    expect(planDeplacement(de("evenements", "galette", "2027-01-16"), "2026-12-19", d, horloge)).toEqual({ type: "refus", refus: "sheet" });
    expect(planDeplacement(de("evenements", "galette", "2027-01-16"), "2026-12-31", d, horloge)).toEqual({ type: "refus", refus: "sheet" });
    expect(planDeplacement(de("evenements", "galette", "2027-01-16"), "2027-01-01", d, horloge)).toMatchObject({ type: "evenement", champs: { date: "2027-01-01" } });
  });

  test("déjà dans l'app en 2026, une section, une réunion : libres (comme le formulaire en modification)", () => {
    const kermesse = ev({ id: "kermesse", date: "2026-12-18" });
    expect(planDeplacement(de("evenements", "kermesse", "2026-12-18"), "2026-12-19", donnees([kermesse]), horloge))
      .toMatchObject({ type: "evenement", champs: { date: "2026-12-19" } });
    const section = ev({ id: "paix", date: "2027-01-16", pour: "Groupe Paix" });
    expect(planDeplacement(de("evenements", "paix", "2027-01-16"), "2026-12-19", donnees([section]), horloge))
      .toMatchObject({ type: "evenement", champs: { date: "2026-12-19" } });
    const reunion = ev({ id: "reu", date: "2027-01-16", pour: "pole:evenement" });
    expect(planDeplacement(de("reunions", "reu", "2027-01-16"), "2026-12-19", donnees([reunion]), horloge))
      .toMatchObject({ type: "evenement", champs: { date: "2026-12-19" } });
  });

  test("« Déplacer… » le dit en une phrase, sans bouton « Déplacer », et n'écrit rien", async ({ page }, info) => {
    // Ouvert sur le 16/01/2027 : le jour dans le panneau (ordinateur, tablette couchée) ou sa feuille (tablette debout).
    const { db } = await ouvrir(page, ADMIN, "/back-office/calendrier?jour=2027-01-16", "2026-12-15T10:00:00");
    await pret(page);
    if (info.project.name === "telephone") {
      await page.locator('[data-jour="2027-01-16"]').first().click();
      await page.getByRole("button", { name: /Galette/ }).filter({ visible: true }).first().click();
    }
    await page.getByRole("button", { name: "Déplacer…" }).filter({ visible: true }).first().click();
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Galette »" });
    await dlg.getByLabel("Nouvelle date").fill("2026-12-19");
    await expect(dlg).toContainText(REFUS);
    await expect(dlg.getByRole("button", { name: "Déplacer", exact: true })).toHaveCount(0);
    await dlg.getByRole("button", { name: "Annuler" }).click();
    expect(db.writes.filter((w) => /^evenements\//.test(w.path))).toEqual([]);
  });
});


// ─── Relecture : la bascule tombe à minuit de Paris, quel que soit le fuseau de l'appareil ───

test.describe("La bascule à l'heure de Paris", () => {
  test("jourDeParis : le 31/12/2026 à 23:00 UTC, c'est minuit à Paris, donc le 01/01/2027 ; à 22:59 et 17:30 UTC, encore le 31", () => {
    expect(jourDeParis(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
    expect(jourDeParis(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
    expect(jourDeParis(new Date("2026-12-31T17:30:00Z"))).toBe("2026-12-31");
  });
});

test.describe("Un appareil à Shanghai, le 31/12/2026 à 18:30 de Paris (01:30 le 01/01/2027 sur place)", () => {
  test.use({ timezoneId: "Asia/Shanghai" });
  const INSTANT = "2026-12-31T18:30:00+01:00";

  test("l'agenda public lit encore le Sheet : la « Veillée » du 31/12 est à venir", async ({ page }) => {
    const lus = await visiteur(page, INSTANT);
    await expect(page.getByRole("heading", { name: "Décembre 2026" })).toBeVisible();
    await expect(page.getByText("Veillée")).toBeVisible();
    expect(lus).toContain(GID_DECEMBRE);
  });

  test("le calendrier du Back-Office : « Évènements (Sheet) » et l'annonce d'avant la bascule", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/back-office/calendrier", INSTANT);
    await expect(annonce(page)).toHaveText(ANNONCE_AVANT);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toBeVisible();
    await fermer(page, info);
  });

  test("la gestion des évènements : l'annonce d'avant la bascule", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements", INSTANT);
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toBeVisible();
    await expect(annonce(page)).toHaveText(ANNONCE_AVANT);
  });

  test("le widget Calendrier (L) lit encore décembre", async ({ page }) => {
    await page.clock.setFixedTime(new Date(INSTANT));
    const lus = await sheets(page);
    await signInAs(page, ADMIN, {
      ...DOCS,
      "backOffice/u-admin": { tableauDeBord: [{ id: "calendrier", taille: "l", reglages: {} }], majLe: "2026-12-01" },
    }, "/back-office");
    await expect(page.getByTestId("grille-widgets").getByRole("region", { name: "Calendrier", exact: true })).toBeVisible();
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
  });
});
