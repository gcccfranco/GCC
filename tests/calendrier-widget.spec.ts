import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS, widgetsPermis } from "../src/lib/access";
import { ajouterWidget, dispositionParDefaut } from "../src/lib/tableauDeBord/disposition";
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

  test("le widget est permis à tout responsable, au catalogue d'un admin (taille M)", () => {
    const admin = { uid: "u-admin", email: ADMIN_EMAILS[0] };
    expect(widgetsPermis(admin, null)).toContain("calendrier");
    const da = { uid: "u-da", email: "da@example.org" };
    // Référent de TEAM DA (lot 1 du chantier « équipes et groupes » : un pôle ne fait plus un responsable).
    const profilDa = { uid: "u-da", email: "da@example.org", dansEquipes: ["da"], referentDe: ["da"], serviceRoles: {}, annonces: [], notify: [] } as unknown as UserProfile;
    expect(widgetsPermis(da, profilDa)).toContain("calendrier");
    // Lot TB2-c (T9) : plus au défaut, il reste au catalogue (« Ajouter un widget »), à la taille M.
    expect(dispositionParDefaut(admin, null).find((w) => w.id === "calendrier")).toBeUndefined();
    expect(ajouterWidget([], "calendrier")).toEqual([{ id: "calendrier", taille: "m", reglages: {} }]);
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
/** Référent de TEAM ÉVÉNEMENTIEL, coordination cochée : son tableau de bord d'office a « Prochains évènements ». */
const P_EVENEMENT: FakeProfile = { uid: "u-evt", email: "evt@example.org", firstName: "Alix", lastName: "P.", dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], coordination: true };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "equipe:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-22", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, inscriptions: "ouvertes", organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "equipes/da/taches/fond": {
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

/** /back-office (À faire depuis la piste A, BO-B) avec, enregistrée, l'ancienne disposition d'un seul widget : elle n'a plus d'effet. */
async function ouvrir(page: Page, taille: "s" | "m" | "l", reglages: Record<string, unknown> = {}, qui: FakeProfile = P_ADMIN) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sheets(page);
  const db = await signInAs(page, qui, {
    ...DOCS,
    [`backOffice/${qui.uid}`]: { tableauDeBord: [{ id: "calendrier", taille, reglages }], versionTableau: 2, majLe: "2026-10-01" },
  }, "/back-office");
  await expect(page.getByRole("heading", { level: 1, name: /^(À faire|待办.*)$/ })).toBeVisible();
  return db;
}
const widgetCal = (page: Page) => page.getByRole("region", { name: /^(Calendrier|日历)$/ });

// Le widget Calendrier a disparu avec le tableau de bord (piste A, BO-B) : ce qui s'en vérifie à l'écran, c'est qu'À faire
// ne le montre plus, ni sur une ancienne disposition, ni en 中文, et qu'il garde la page Calendrier à une entrée de là.
test.describe("C8 : le widget Calendrier n'est plus sur /back-office", () => {
  for (const taille of ["s", "m", "l"] as const) {
    test(`${taille.toUpperCase()} enregistré : À faire ne montre ni le widget, ni ses lignes, ni « Personnaliser »`, async ({ page }) => {
      await ouvrir(page, taille);
      await expect(widgetCal(page)).toHaveCount(0);
      await expect(page.getByTestId("grille-widgets")).toHaveCount(0);
      await expect(page.getByTestId("ligne-calendrier")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Prochains jours" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Personnaliser" })).toHaveCount(0);
    });
  }

  test("un admin sans disposition : À faire, et le Calendrier reste une entrée du Back-Office", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office");
    await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
    await expect(widgetCal(page)).toHaveCount(0);
    const entree = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Calendrier" }).filter({ visible: true });
    await expect(entree).toHaveAttribute("href", /\/back-office\/calendrier\/?$/);
  });

  test("中文 : pas de 日历 sur la page, l'entrée du calendrier est traduite", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "s");
    await expect(widgetCal(page)).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: /./ }).getByRole("link", { name: "日历" }).filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("relecture du lot : À faire ne dépend ni du Sheet des évènements ni de l'histoire", () => {
  test("un Sheet qui ne répond pas ne bloque pas À faire", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    // Le planning répond ; l'export du Sheet des évènements reste pendu.
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/export")) return; // jamais de réponse
      const corps = url.searchParams.get("sheet") === "Franco_Louange" ? CULTE : "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
    });
    await signInAs(page, P_ADMIN, DOCS, "/back-office");
    await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
    await expect(page.getByTestId("ligne-a-faire").first().or(page.getByRole("status"))).toBeVisible();
    await expect(page.getByTestId("grille-widgets")).toHaveCount(0);
  });

  test("À faire ne lit aucune inscription, et jamais les fois d'une tâche très ancienne", async ({ page }) => {
    const inscriptions: string[] = [];
    page.on("request", (r) => {
      const i = /\/evenements\/([^/]+)\/inscriptions\//.exec(decodeURIComponent(r.url()));
      if (i && r.method() === "GET") inscriptions.push(i[1]);
    });
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, {
      ...DOCS,
      "equipes/da/taches/ancienne": {
        titre: "Affiche de 2024", responsableUid: null, responsableNom: "", echeance: "2024-10-15", repetition: null,
        lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
      },
    }, "/back-office");
    await expect(page.getByTestId("ligne-a-faire").filter({ hasText: "Fond du culte" })).toBeVisible();
    expect(inscriptions).toEqual([]);
    // Une tâche unique reste en retard tant qu'on ne la coche pas : celle de 2024 est la première de la liste.
    await expect(page.getByTestId("ligne-a-faire").first()).toContainText("Affiche de 2024");
  });
});

test.describe("C8 : le Sheet des évènements n'est plus lu par la page d'accueil du Back-Office", () => {
  test("les entrées du Sheet n'y sont pas : ni « Repas partagé », ni lien vers un onglet du Sheet", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_EVENEMENT, {
      ...DOCS,
      "backOffice/u-evt": { tableauDeBord: [{ id: "evenements", taille: "m", reglages: { nombre: 10 } }], versionTableau: 2, majLe: "2026-10-01" },
    }, "/back-office");
    await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Évènements", exact: true })).toHaveCount(0);
    await expect(page.getByText("Repas partagé")).toHaveCount(0);
    await expect(page.locator('a[href*="docs.google.com/spreadsheets"]')).toHaveCount(0);
    await expect(page.getByText("06 99")).toHaveCount(0);
  });
});

test.describe("C8 : captures à regarder", () => {
  test("À faire, à la place du tableau de bord et de son widget Calendrier", async ({ page }, info) => {
    await ouvrir(page, "m");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/calendrier-widget-captures/${info.project.name}-a-faire.png`, fullPage: true });
  });
});
