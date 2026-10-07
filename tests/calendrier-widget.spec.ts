import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS, widgetsPermis } from "../src/lib/access";
import { dispositionParDefaut } from "../src/lib/tableauDeBord/disposition";
import { avecLeSheet } from "../src/lib/tableauDeBord/donnees";
import { choisirReglage, groupesDeReglages } from "../src/lib/tableauDeBord/reglages";
import {
  SOURCES_DU_WIDGET, fenetreDuWidget, jourDuWidget, joursRestants, lienDuJour, ligneDuJour, prochainsJours, semaineDe, sourcesDuWidget,
} from "../src/lib/calendrier/widget";
import type { EntreeCalendrier } from "../src/lib/calendrier/entrees";
import type { EntreeSheet } from "../src/lib/evenements/sheet";
import type { Evenement } from "../src/types/evenement";
import type { UserProfile } from "../src/types/user";

// Lot U8 (docs/spec-calendrier.md), tranche C8 — le widget Calendrier du tableau de bord
// (cadre de U6) : S les prochains jours, M la semaine, L le mois à points ; ses réglages
// (sources, « Seulement moi ») ; toucher un jour ouvre la page du calendrier sur ce jour.
// Et le widget 3 « Prochains évènements » de U6 reçoit les entrées du Sheet des évènements.
// Horloge au jeudi 1er octobre 2026 ; Firestore et Sheets simulés. Aucun nom réel.

const TODAY = "2026-10-01";

// ─── Purs ─────────────────────────────────────────────────────────────────────

const entree = (e: Partial<EntreeCalendrier> & Pick<EntreeCalendrier, "source" | "date" | "titre">): EntreeCalendrier => ({
  cle: `${e.source}:${e.titre}:${e.date}`, heure: "", heureFin: "", detail: "", couleur: "#000", duSheet: false, moi: false,
  deplacable: false, lien: "", ...e,
});
const parJour = (liste: EntreeCalendrier[]) => {
  const m = new Map<string, EntreeCalendrier[]>();
  for (const e of liste) m.set(e.date, [...(m.get(e.date) ?? []), e]);
  return m;
};
const OCTOBRE = parJour([
  entree({ source: "taches", date: "2026-10-02", titre: "Fond du culte" }),
  entree({ source: "reunions", date: "2026-10-03", titre: "Réunion DA", heure: "20:00" }),
  entree({ source: "services", date: "2026-10-04", titre: "Culte Franco", detail: "Présidence : Lou M." }),
  entree({ source: "scene", date: "2026-10-04", titre: "Scène · Sketch Jeunes", heure: "17:00" }),
  entree({ source: "petitDej", date: "2026-10-04", titre: "Petit déj", detail: "Libre", cle: "petitDej:libre:2026-10-04" }),
  entree({ source: "evenements", date: "2026-10-10", titre: "Foot au parc", heure: "20:00", duSheet: true }),
  entree({ source: "taches", date: "2026-10-20", titre: "Trop loin" }),
]);

test.describe("widget Calendrier (pur)", () => {
  test("sources du widget : celles de la page sans Setlists ; d'office toutes les permises, sinon celles du réglage", () => {
    expect(SOURCES_DU_WIDGET).toEqual(["services", "evenements", "reunions", "scene", "taches", "petitDej"]);
    const toutes = ["services", "evenements", "reunions", "scene", "taches", "petitDej", "setlists"] as const;
    expect(sourcesDuWidget({}, toutes)).toEqual(["services", "evenements", "reunions", "scene", "taches", "petitDej"]);
    expect(sourcesDuWidget({}, ["services", "evenements", "scene", "petitDej", "setlists"])).toEqual(["services", "evenements", "scene", "petitDej"]);
    expect(sourcesDuWidget({ sources: ["taches", "services", "inconnue", "setlists"] }, toutes)).toEqual(["services", "taches"]);
    // Une source du réglage qu'on n'a plus le droit de voir disparaît.
    expect(sourcesDuWidget({ sources: ["taches", "services"] }, ["services", "evenements"])).toEqual(["services"]);
  });

  test("fenêtre lue : S quatorze jours, M la semaine du lundi au dimanche, L les six semaines du mois", () => {
    expect(fenetreDuWidget("s", TODAY)).toEqual({ debut: "2026-10-01", fin: "2026-10-14" });
    expect(fenetreDuWidget("m", TODAY)).toEqual({ debut: "2026-09-28", fin: "2026-10-04" });
    expect(fenetreDuWidget("l", TODAY)).toEqual({ debut: "2026-09-28", fin: "2026-11-08" });
    expect(semaineDe(TODAY)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(semaineDe("2026-10-04")[0]).toBe("2026-09-28");
  });

  test("S : trois jours à venir au plus, sur quatorze, jours vides sautés", () => {
    expect(prochainsJours(OCTOBRE, TODAY)).toEqual(["2026-10-02", "2026-10-03", "2026-10-04"]);
    // Du 5, le 20 est hors des quatorze jours (5 → 18) ; du 8, il y est.
    expect(prochainsJours(OCTOBRE, "2026-10-05")).toEqual(["2026-10-10"]);
    expect(prochainsJours(OCTOBRE, "2026-10-08")).toEqual(["2026-10-10", "2026-10-20"]);
    expect(prochainsJours(OCTOBRE, "2026-10-21")).toEqual([]);
  });

  test("M : les lignes des jours qui restent dans la semaine, aujourd'hui compris", () => {
    expect(joursRestants(OCTOBRE, TODAY)).toEqual(["2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(joursRestants(OCTOBRE, "2026-10-03")).toEqual(["2026-10-03", "2026-10-04"]);
    expect(joursRestants(OCTOBRE, "2026-10-11")).toEqual([]);
  });

  test("une ligne par jour : les titres à la suite, l'heure de la première entrée qui en a une", () => {
    expect(ligneDuJour(OCTOBRE.get("2026-10-03")!, "fr")).toEqual({ titres: "Réunion DA", heure: "20:00" });
    expect(ligneDuJour(OCTOBRE.get("2026-10-04")!, "fr")).toEqual({ titres: "Culte Franco · Scène · Petit déj : libre", heure: "17:00" });
    expect(ligneDuJour(OCTOBRE.get("2026-10-02")!, "fr")).toEqual({ titres: "Fond du culte", heure: "" });
  });

  test("libellé du jour : « Aujourd'hui », « Sam. 3 » ; 中文 « 今天 », « 周六 3日 » ; lien vers la page sur ce jour", () => {
    expect(jourDuWidget(TODAY, TODAY, "fr")).toBe("Aujourd'hui");
    expect(jourDuWidget("2026-10-03", TODAY, "fr")).toBe("Sam. 3");
    expect(jourDuWidget("2026-10-04", TODAY, "fr")).toBe("Dim. 4");
    expect(jourDuWidget(TODAY, TODAY, "zh-CN")).toBe("今天");
    expect(jourDuWidget("2026-10-03", TODAY, "zh-CN")).toBe("周六 3日");
    expect(lienDuJour("2026-10-03")).toBe("/back-office/calendrier?jour=2026-10-03");
  });

  test("le widget est permis à tout responsable, et d'office au tableau de bord d'un admin (taille M)", () => {
    const admin = { uid: "u-admin", email: ADMIN_EMAILS[0] };
    expect(widgetsPermis(admin, null)).toContain("calendrier");
    const da = { uid: "u-da", email: "da@example.org" };
    const profilDa = { uid: "u-da", email: "da@example.org", poles: ["da"], serviceRoles: {}, annonces: [], notify: [] } as unknown as UserProfile;
    expect(widgetsPermis(da, profilDa)).toContain("calendrier");
    expect(dispositionParDefaut(admin, null).find((w) => w.id === "calendrier")).toEqual({ id: "calendrier", taille: "m", reglages: {} });
  });

  test("réglages : Sources (sans Setlists) et « Seulement moi » dans le même groupe ; le dernier ne s'éteint pas", () => {
    const admin = { uid: "u-admin", email: ADMIN_EMAILS[0] };
    const [sources] = groupesDeReglages("calendrier", {}, admin, null);
    expect([sources.cle, sources.plusieurs, sources.choix.map((c) => c.valeur), sources.actifs]).toEqual([
      "sources", true, ["services", "evenements", "taches", "reunions", "scene", "petitDej", "moi"],
      ["services", "evenements", "taches", "reunions", "scene", "petitDej"],
    ]);
    const sansTaches = choisirReglage({}, sources, "taches");
    expect(sansTaches).toEqual({ sources: ["services", "evenements", "reunions", "scene", "petitDej"] });
    const moi = choisirReglage(sansTaches, sources, "moi");
    expect(moi).toEqual({ ...sansTaches, seulementMoi: true });
    const [apres] = groupesDeReglages("calendrier", moi, admin, null);
    expect(apres.actifs).toEqual(["services", "evenements", "reunions", "scene", "petitDej", "moi"]);
    expect(choisirReglage(moi, apres, "moi")).toEqual(sansTaches);
    const [une] = groupesDeReglages("calendrier", { sources: ["services"], seulementMoi: true }, admin, null);
    expect(choisirReglage({ sources: ["services"], seulementMoi: true }, une, "services"), "la dernière source reste").toEqual({ sources: ["services"], seulementMoi: true });
  });

  test("réglages : sans pôle ni équipe, ni Tâches ni Réunions", () => {
    const sec = { uid: "u-sec", email: "sec@example.org" };
    const profilSec = { uid: "u-sec", email: "sec@example.org", annonces: ["Groupe Paix"], serviceRoles: {}, notify: [] } as unknown as UserProfile;
    const [sources] = groupesDeReglages("calendrier", {}, sec, profilSec);
    expect(sources.choix.map((c) => c.valeur)).toEqual(["services", "evenements", "scene", "petitDej", "moi"]);
  });
});

const evt = (e: Partial<Evenement> & Pick<Evenement, "id" | "titre" | "date">): Evenement =>
  ({ heure: "", pour: "eglise", ...e }) as Evenement;
const sheet = (date: string, titre: string, heure = ""): EntreeSheet => ({ date, titre, heure, heureFin: "", horaire: heure, lieu: "", responsable: "" });

test.describe("widget 3 « Prochains évènements » avec le Sheet (pur)", () => {
  test("entrées du Sheet à venir mêlées aux évènements de l'app, par date puis heure, 3 / 5 / 10", () => {
    const app = [evt({ id: "foot", titre: "Foot", date: "2026-10-10", heure: "19:00" }), evt({ id: "repas", titre: "Repas", date: "2026-10-17" })];
    const lu = [sheet("2026-09-30", "Passée"), sheet("2026-10-06", "Soirée louange", "19:00"), sheet("2026-10-10", "Veillée", "21:00"), sheet("2026-10-10", "Brunch", "10:00")];
    const r = avecLeSheet(app, lu, TODAY, {});
    expect(r.map((x) => (x.du === "app" ? x.evenement.titre : x.entree.titre))).toEqual(["Soirée louange", "Brunch", "Foot"]);
    expect(avecLeSheet(app, lu, TODAY, { nombre: 10 }).map((x) => (x.du === "app" ? x.evenement.titre : x.entree.titre)))
      .toEqual(["Soirée louange", "Brunch", "Foot", "Veillée", "Repas"]);
  });

  test("une section choisie : le Sheet (toute l'église) n'y est pas", () => {
    const app = [evt({ id: "paix", titre: "Sortie Paix", date: "2026-10-12", pour: "Groupe Paix" })];
    const r = avecLeSheet(app, [sheet("2026-10-06", "Soirée louange")], TODAY, { section: "Groupe Paix" });
    expect(r.map((x) => x.du)).toEqual(["app"]);
  });
});

// ─── Écrans ───────────────────────────────────────────────────────────────────

const FIXTURE_OCTOBRE = readFileSync(join(__dirname, "fixtures", "sheet-evenements-mois.csv"), "utf8");
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["04/10", "Lou M.", "", "", "", "", "", "", "", "", "", "", ""],
  ["11/10", "Sam T.", "", "", "", "", "", "", "", "", "", "", ""],
]);

const P_ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };
/** Pôle Événement : son tableau de bord d'office a « Prochains évènements ». */
const P_EVENEMENT: FakeProfile = { uid: "u-evt", email: "evt@example.org", firstName: "Alix", lastName: "P.", poles: ["evenement"] };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "pole:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-22", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, inscriptions: "ouvertes", organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/fond": {
    titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-02", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "petitDej/pd18": { dimanche: "2026-10-18", nom: "Famille Test", uid: "", auteurUid: "u-autre", creeLe: MAINTENANT, modifieLe: MAINTENANT },
};

/** Le Sheet des évènements (export par gid) et le planning (gviz) : jamais les vrais. */
async function sheets(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/export")) {
      const corps = url.searchParams.get("gid") === "439766955" ? FIXTURE_OCTOBRE : "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
    }
    const corps = url.searchParams.get("sheet") === "Franco_Louange" ? CULTE : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
  });
}

/** Le tableau de bord avec le seul widget Calendrier, à la taille et aux réglages donnés. */
async function ouvrir(page: Page, taille: "s" | "m" | "l", reglages: Record<string, unknown> = {}, qui: FakeProfile = P_ADMIN) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sheets(page);
  const db = await signInAs(page, qui, {
    ...DOCS,
    [`backOffice/${qui.uid}`]: { tableauDeBord: [{ id: "calendrier", taille, reglages }], majLe: "2026-10-01" },
  }, "/back-office");
  await expect(widgetCal(page)).toBeVisible();
  return db;
}
const widgetCal = (page: Page) => page.getByTestId("grille-widgets").getByRole("region", { name: "Calendrier", exact: true });
const lignes = (page: Page) => widgetCal(page).getByTestId("ligne-calendrier");
const estTelephone = (info: TestInfo) => info.project.name === "telephone";

test.describe("C8 : le widget Calendrier", () => {
  test("S : « Prochains jours », trois jours à venir, une ligne par jour", async ({ page }) => {
    await ouvrir(page, "s");
    await expect(widgetCal(page).getByRole("link", { name: "Prochains jours" })).toHaveAttribute("href", /^\/back-office\/calendrier\/?$/);
    await expect(lignes(page)).toHaveCount(3);
    await expect(lignes(page).nth(0)).toContainText("Ven. 2");
    await expect(lignes(page).nth(0)).toContainText("Fond du culte");
    await expect(lignes(page).nth(1)).toContainText(/Sam\. 3.*Réunion DA.*20:00/);
    await expect(lignes(page).nth(2)).toContainText(/Dim\. 4.*Culte Franco.*Repas partagé.*12:30/);
  });

  test("M : « Cette semaine », sept jours à points, puis les lignes des jours qui restent", async ({ page }) => {
    await ouvrir(page, "m");
    await expect(widgetCal(page).getByRole("link", { name: "Cette semaine" })).toBeVisible();
    const jours = widgetCal(page).getByTestId("semaine").locator("[data-jour]");
    await expect(jours).toHaveCount(7);
    await expect(jours.nth(0)).toHaveAttribute("data-jour", "2026-09-28");
    await expect(widgetCal(page).locator('[data-jour="2026-10-01"]')).toHaveAttribute("aria-current", "date");
    await expect(widgetCal(page).locator('[data-jour="2026-10-03"] [data-source="reunions"]')).toHaveCount(1);
    // Le 4 : culte, repas du Sheet, petit déj libre — quatre points au plus.
    const points4 = await widgetCal(page).locator('[data-jour="2026-10-04"] [data-source]').count();
    expect(points4).toBeGreaterThanOrEqual(3);
    expect(points4).toBeLessThanOrEqual(4);
    await expect(lignes(page)).toHaveCount(3);
    await expect(lignes(page).nth(1)).toContainText(/Sam\. 3.*Réunion DA/);
  });

  test("L : le mois à points (« Octobre »), et sa légende", async ({ page }) => {
    await ouvrir(page, "l");
    await expect(widgetCal(page).getByRole("link", { name: "Octobre" })).toBeVisible();
    await expect(widgetCal(page).getByTestId("grille-points").locator("[data-jour]")).toHaveCount(42);
    await expect(widgetCal(page).locator('[data-jour="2026-10-15"] [data-source="evenements"]')).toHaveCount(1);
    await expect(widgetCal(page).locator('[data-jour="2026-10-22"] [data-source="evenements"]')).toHaveCount(1);
    await expect(widgetCal(page).getByTestId("legende")).toContainText("Réunions");
    await expect(lignes(page)).toHaveCount(0);
  });

  test("une source éteinte dans les réglages disparaît du widget", async ({ page }) => {
    await ouvrir(page, "s", { sources: ["services", "evenements", "reunions", "scene", "petitDej"] });
    await expect(lignes(page)).toHaveCount(3);
    await expect(lignes(page).nth(0)).toContainText("Sam. 3");
    await expect(widgetCal(page)).not.toContainText("Fond du culte");
    await expect(lignes(page).nth(2)).toContainText(/Mar\. 6.*Soirée louange/);
  });

  test("« Seulement moi » dans les réglages : ne restent que mes entrées (mon service du 4)", async ({ page }) => {
    await ouvrir(page, "s", { seulementMoi: true });
    await expect(lignes(page)).toHaveCount(1);
    await expect(lignes(page).nth(0)).toContainText(/Dim\. 4.*Culte Franco/);
    await expect(widgetCal(page)).not.toContainText("Repas partagé");
  });

  test("les réglages du widget, en personnalisation : Sources et « Seulement moi » ; éteindre Tâches s'écrit", async ({ page }) => {
    const db = await ouvrir(page, "s");
    await expect(lignes(page).nth(0)).toContainText("Fond du culte");
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await widgetCal(page).getByRole("button", { name: "Réglages du widget" }).click();
    const groupe = widgetCal(page).getByRole("group", { name: "Sources" });
    await expect(groupe.getByRole("button")).toHaveText(["Services", "Évènements", "Tâches", "Réunions", "Scène", "Petit déj", "Seulement moi"]);
    await expect(groupe.getByRole("button", { name: "Seulement moi" })).toHaveAttribute("aria-pressed", "false");
    await groupe.getByRole("button", { name: "Tâches" }).click();
    await expect(widgetCal(page)).not.toContainText("Fond du culte");
    await expect.poll(() => (db.writes.filter((w) => w.path === "backOffice/u-admin").at(-1)?.data.tableauDeBord as { reglages: object }[] | undefined)?.[0]?.reglages)
      .toEqual({ sources: ["services", "evenements", "reunions", "scene", "petitDej"] });
  });

  test("toucher un jour (S) ouvre la page du calendrier sur ce jour", async ({ page }) => {
    await ouvrir(page, "s");
    await lignes(page).nth(1).click();
    await expect(page).toHaveURL(/\/back-office\/calendrier\/?\?jour=2026-10-03$/);
    await expect(page.getByRole("heading", { name: "Samedi 3 octobre" }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Réunion DA").filter({ visible: true }).first()).toBeVisible();
  });

  test("toucher un jour (M, L) ouvre la page sur ce jour", async ({ page }) => {
    await ouvrir(page, "m");
    await widgetCal(page).locator('[data-jour="2026-10-04"]').click();
    await expect(page).toHaveURL(/\/back-office\/calendrier\/?\?jour=2026-10-04$/);
    await expect(page.getByRole("heading", { name: "Dimanche 4 octobre" }).filter({ visible: true })).toBeVisible();
  });

  test("L : toucher un jour d'un autre mois ouvre ce mois-là", async ({ page }) => {
    await ouvrir(page, "l");
    await widgetCal(page).locator('[data-jour="2026-11-02"]').click();
    await expect(page).toHaveURL(/\/back-office\/calendrier\/?\?jour=2026-11-02$/);
    // Sur tablette debout, la feuille du jour, modale, cache l'en-tête aux lecteurs d'écran : il reste à l'écran.
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Novembre( 2026)?$/);
    await expect(page.getByRole("heading", { name: "Lundi 2 novembre" }).filter({ visible: true })).toBeVisible();
  });

  test("téléphone : la page ouverte sur un jour montre le Mois à points et la liste du jour", async ({ page }, info) => {
    test.skip(!estTelephone(info), "téléphone seulement : ailleurs, le panneau ou la feuille du jour");
    await ouvrir(page, "s");
    await lignes(page).nth(1).click();
    await expect(page.getByRole("tablist", { name: "Affichage" }).getByRole("tab", { name: "Mois" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("jour-choisi")).toContainText("Réunion DA");
  });

  test("un admin sans disposition enregistrée a le widget Calendrier, en M", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office");
    await expect(widgetCal(page)).toBeVisible();
    await expect(widgetCal(page).getByTestId("semaine")).toBeVisible();
  });

  test("中文 : 日历, 近几天, 今天", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, {
      ...DOCS,
      "backOffice/u-admin": { tableauDeBord: [{ id: "calendrier", taille: "s", reglages: {} }], majLe: "2026-10-01" },
    }, "/back-office");
    const w = page.getByTestId("grille-widgets").getByRole("region", { name: "日历", exact: true });
    await expect(w.getByRole("link", { name: "近几天" })).toBeVisible();
    await expect(w.getByTestId("ligne-calendrier").nth(1)).toContainText("周六 3日");
  });
});

test.describe("relecture du lot : le widget ne dépend ni du Sheet ni de l'histoire", () => {
  test("un Sheet qui ne répond pas ne bloque ni le widget Calendrier ni « Prochains évènements »", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    // Le planning répond ; l'export du Sheet des évènements reste pendu.
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/export")) return; // jamais de réponse
      const corps = url.searchParams.get("sheet") === "Franco_Louange" ? CULTE : "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
    });
    await signInAs(page, P_ADMIN, {
      ...DOCS,
      "backOffice/u-admin": {
        tableauDeBord: [{ id: "calendrier", taille: "s", reglages: {} }, { id: "evenements", taille: "m", reglages: { nombre: 5 } }],
        majLe: "2026-10-01",
      },
    }, "/back-office");
    await expect(lignes(page).nth(0)).toContainText("Fond du culte");
    await expect(lignes(page).nth(1)).toContainText(/Sam\. 3.*Réunion DA/);
    const evenements = page.getByTestId("grille-widgets").getByRole("region", { name: "Prochains évènements", exact: true });
    await expect(evenements.getByTestId("ligne-evenement")).toHaveText([/Tournoi de ping/]);
  });

  test("ni inscriptions sans « Seulement moi », ni fois d'une tâche hors de la période du widget", async ({ page }, info) => {
    const inscriptions: string[] = [];
    const fois: string[] = [];
    page.on("request", (r) => {
      const url = decodeURIComponent(r.url());
      const i = /\/evenements\/([^/]+)\/inscriptions\//.exec(url);
      if (i && r.method() === "GET") inscriptions.push(i[1]);
      const f = /\/taches\/([^/:]+):runQuery/.exec(url);
      if (f) fois.push(f[1]);
    });
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, {
      ...DOCS,
      "poles/da/taches/ancienne": {
        titre: "Affiche de 2024", responsableUid: null, responsableNom: "", echeance: "2024-10-15", repetition: null,
        lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
      },
      "backOffice/u-admin": { tableauDeBord: [{ id: "calendrier", taille: "s", reglages: {} }], majLe: "2026-10-01" },
    }, "/back-office");
    await expect(lignes(page).nth(0)).toContainText("Fond du culte");
    expect(inscriptions).toEqual([]);
    // Les fois : sur téléphone seulement, où la barre latérale (qui relit toutes les tâches pour
    // sa pastille, lot U6) n'est pas montée.
    if (estTelephone(info)) {
      expect(fois).toContain("fond");
      expect(fois).not.toContain("ancienne");
    }
  });
});

test.describe("C8 : « Prochains évènements » reçoit le Sheet", () => {
  test("les entrées du Sheet à venir s'y mêlent aux évènements de l'app ; elles ouvrent l'onglet du mois", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_EVENEMENT, {
      ...DOCS,
      "backOffice/u-evt": { tableauDeBord: [{ id: "evenements", taille: "m", reglages: { nombre: 10 } }], majLe: "2026-10-01" },
    }, "/back-office");
    const w = page.getByTestId("grille-widgets").getByRole("region", { name: "Prochains évènements", exact: true });
    const ls = w.getByTestId("ligne-evenement");
    await expect(ls).toHaveText([
      /Repas partagé.*dim\. 04\/10.*12:30.*Sheet/,
      /Soirée louange.*mar\. 06\/10.*19:00.*Sheet/,
      /Prière.*mar\. 06\/10.*19:30.*Sheet/,
      /Foot au parc.*sam\. 10\/10.*20:00.*Sheet/,
      /Chants de Noël.*jeu\. 15\/10.*Sheet/,
      /Tournoi de ping.*jeu\. 22\/10.*4 inscrits sur 10/,
      /Veillée.*sam\. 31\/10.*Sheet/,
    ]);
    const repas = ls.nth(0);
    await expect(repas).toHaveAttribute("href", /docs\.google\.com\/spreadsheets\/d\/.+\/edit#gid=439766955$/);
    await expect(repas).toHaveAttribute("target", "_blank");
    // Le téléphone du bloc « Inscriptions » n'apparaît jamais.
    await expect(w).not.toContainText("06 99");
  });
});

test.describe("C8 : captures à regarder", () => {
  // Comparées à la planche bo-tableau-de-bord (W_CAL : S, M, L) et bo-telephone-accueil.
  test("le widget en S, M et L, avec Prochains évènements et le Sheet", async ({ page }, info) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    for (const taille of ["s", "m", "l"] as const) {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await sheets(page);
      await signInAs(page, P_ADMIN, {
        ...DOCS,
        "backOffice/u-admin": {
          tableauDeBord: [{ id: "calendrier", taille, reglages: {} }, { id: "evenements", taille: "m", reglages: { nombre: 5 } }],
          majLe: "2026-10-01",
        },
      }, "/back-office");
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      const contenu = { s: widgetCal(page).getByTestId("ligne-calendrier").first(), m: widgetCal(page).getByTestId("semaine"), l: widgetCal(page).getByTestId("grille-points") };
      await expect(contenu[taille]).toBeVisible();
      await expect(page.getByTestId("grille-widgets").getByRole("region", { name: "Prochains évènements" }).getByTestId("ligne-evenement").first()).toBeVisible();
      await page.screenshot({ path: `test-results/calendrier-widget-captures/${info.project.name}-${taille}.png`, fullPage: true });
    }
  });
});
