import { expect, test, type BrowserContextOptions, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { referentLouange, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { repondreDansLeSite } from "./helpers/agencement";
import {
  ajouterWidget, catalogue, changerReglages, changerTaille, deplacerWidget, dispositionAffichee, dispositionParDefaut, retirerWidget, VERSION_TABLEAU,
} from "../src/lib/tableauDeBord/disposition";
import { choisirReglage, groupesDeReglages } from "../src/lib/tableauDeBord/reglages";
import { EQUIPES } from "../src/lib/equipes/table";
import { COMITES } from "../src/lib/groupes/table";
import {
  aFaireDuTableau, ceDimanche, creneauxAVenir, etatInscriptions, evenementsAVenir, nomsSansCompte, nouveauxComptes,
  petitDejAVenir, equipesAFaire, prochainsDimanches, raccourcisPermis, seancesDesServices, servicesDuDimanche, servicesSetlists,
  absencesEnConflit, creneauxVides, equipeDeLaColonne, etatsDuDimanche, evenementsDuTableau, fermeBientot, planningsDuTableau,
  prochainDimanche, quiRelancer, reunionsDuTableau, estSienEvenement, sujetsOuverts, tachesDuTableau, texteDuRappel,
} from "../src/lib/tableauDeBord/donnees";
import { widgetsPermis } from "../src/lib/access";
import { casesVides } from "../src/lib/planning/casesVides";
import { GRILLE_CULTE, GRILLE_INTERFRANCO } from "../src/lib/planning/grilles";
import type { Evenement } from "../src/types/evenement";
import type { Creneau } from "../src/types/programme";
import type { Tache } from "../src/types/tache";
import type { UserProfile } from "../src/types/user";

// Lot U6 (docs/spec-back-office.md), tranche B4 — le tableau de bord : les widgets
// 1-6 et 8-10 (Chants les plus joués est de U7 S5 ; le Calendrier, widget 11, de U8 C8), la
// disposition par défaut selon le rôle (Q11), la grille selon l'appareil (Q10) et la
// lecture de `backOffice/{uid}` (Q5). Tranche B5 (en fin de fichier) : Personnaliser —
// catalogue, retirer, Monter / Descendre, glisser, S / M / L, réglages, « Disposition par
// défaut », écriture à chaque geste et règle `backOffice/{uid}`. La barre du bas (B6) suit.
// Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN, Q16 de U4).
// Aucun nom réel : personnes « Pers. A » à « Pers. I ».

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Pôle Événement (Réussite 2). */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], coordination: true };
/** Louange : un rôle de service et le droit de remplir le Culte. */
const LOUANGE: FakeProfile = {
  uid: "uid-louange", email: "louange@example.com", firstName: "Lou", lastName: "P.", planningName: "Pers. D",
  serviceRoles: { "Culte Francophone": ["musicien"] }, plannings: ["culte"],
};
const DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Bruno", lastName: "M.", dansEquipes: ["da"], referentDe: ["da"] };
const LES_DEUX: FakeProfile = {
  uid: "uid-deux", email: "deux@example.com", dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], coordination: true,
  serviceRoles: { "Culte Francophone": ["musicien"] }, plannings: ["culte"],
};
// Lot AO : pour les tests d'écran (interrupteur ouvert), la Coordination et le droit de remplir le Culte viennent de places
// d'organigramme, plus de cases : Alice est aussi référente EDD, Lou référente Louange. Les tests purs ci-dessous (ancien
// mode, `profil(p)`) gardent ALICE et LOUANGE.
const ALICE_ORGA: FakeProfile = { ...ALICE, dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"] };
const LOUANGE_ORGA: FakeProfile = { ...LOUANGE, ...referentLouange() };
const ANNONCES: FakeProfile = { uid: "uid-an", email: "an@example.com", annonces: ["Culte Francophone"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], coordination: p.coordination,
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile;
const ids = (w: { id: string }[]) => w.map((x) => x.id);

// ─── Jeu d'essai : jeudi 1er octobre 2026, dimanche courant = 4 octobre ──────────
const CULTE_PLEIN = {
  presidence: "Pers. A", choriste1: "Pers. B", choriste2: "Pers. C", piano: "Pers. D", guitare: "Pers. E",
  batterie: "Pers. F", sono: "Pers. G", ppt: "Pers. H", orateur: "Pers. I", traduction: "Pers. B",
};
const DOCS: Record<string, Record<string, unknown>> = {
  // Culte : 4 oct. sans batterie ; 11 oct. sans guitare ni batterie ; 18 oct. sans PPT ; 25 oct. complet.
  "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", ...CULTE_PLEIN, batterie: "" },
  "plannings/culte/dimanches/2026-10-11": { date: "2026-10-11", ...CULTE_PLEIN, guitare: "", batterie: "" },
  "plannings/culte/dimanches/2026-10-18": { date: "2026-10-18", ...CULTE_PLEIN, ppt: "" },
  "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...CULTE_PLEIN },
  // Petit déj (lot U3 : une ligne par inscription, petitDej/{id}) : seul le 18 a une équipe.
  "petitDej/l1": { dimanche: "2026-10-18", nom: "Famille Test", uid: "", auteurUid: "uid-admin", creeLe: "2026-09-01T10:00:00Z", modifieLe: "2026-09-01T10:00:00Z" },
  // Setlist publiée du 4 oct., avec sa présentation.
  "setlists/s-04": {
    title: "Culte du 4", category: "Culte Francophone", date: "2026-10-04", leader: "Pers. A", language: "fr", notes: "",
    items: [], isDraft: false, isPrivate: false, presentationUrl: "https://example.com/ppt", createdAt: "2026-09-30T10:00:00Z",
  },
  // Tâches : une en retard et une à venir à TEAM ÉVÉNEMENTIEL, une à TEAM DA.
  "equipes/evenementiel/taches/t1": { titre: "Affiche de Noël", responsableUid: null, responsableNom: "", echeance: "2026-09-28", repetition: null },
  "equipes/evenementiel/taches/t2": { titre: "Réserver la salle", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null },
  "equipes/da/taches/t3": { titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-02", repetition: null },
  // Évènements : cinq à venir, un passé, une réunion (jamais dans ce widget).
  "evenements/e1": { titre: "Foot au parc", type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", placesMax: 10, inscrits: 4, inscriptions: "ouvertes" },
  "evenements/e2": { titre: "Repas de section", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "12:00", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e3": { titre: "Sortie d'automne", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "", placesMax: null, inscrits: 2, inscriptions: "ouvertes" },
  "evenements/e4": { titre: "Pique-nique", type: "loisir", pour: "eglise", date: "2026-11-21", heure: "", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e5": { titre: "Culte de fête", type: "eglise", pour: "eglise", date: "2026-12-24", heure: "18:00", placesMax: null, inscrits: 0, inscriptions: "fermees" },
  "evenements/e6": { titre: "Brocante passée", type: "loisir", pour: "eglise", date: "2026-09-20", heure: "", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e7": { titre: "Réunion du pôle", type: "eglise", pour: "equipe:evenementiel", date: "2026-10-03", heure: "20:00", placesMax: null, inscrits: 0 },
  // Scène : le programme affiché et deux créneaux à venir, un passé.
  "programmes/p1": { nom: "Noël", jourJ: "2026-12-20", debut: "2026-09-27", visible: true, passages: [], createdBy: "uid-alice", updatedAt: "" },
  "programmes/p1/creneaux/c0": { dimanche: "2026-09-27", debut: "15:00", fin: "16:00", quoi: "Danse", qui: ["Gp Paix"], note: "" },
  "programmes/p1/creneaux/c1": { dimanche: "2026-10-04", debut: "17:00", fin: "18:00", quoi: "Chant", qui: ["EDD 中班"], note: "" },
  "programmes/p1/creneaux/c2": { dimanche: "2026-10-11", debut: "14:00", fin: "15:00", quoi: "Sketch", qui: ["Franco"], note: "" },
  // Un compte relié à « Pers. A » : les autres noms du planning sont sans compte.
  "users/uid-pers-a": { email: "a@example.com", firstName: "Pers", lastName: "A", planningName: "Pers. A", serviceRoles: {}, annonces: [], notify: [] },
};

/** Le Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sansSheet(page);
  return signInAs(page, qui, { ...DOCS, ...docs }, "/back-office");
}

/** Les tailles d'avant le lot TB2-c (T9) : les tests d'écran qui supposent l'ancienne disposition l'enregistrent (version 2). */
const TAILLES_ANCIENNES: Record<string, string> = {
  dimanche: "m", calendrier: "m", afaire: "m", setlists: "s", planning: "s", evenements: "m", chants: "m",
  petitdej: "s", scene: "s", comptes: "s", raccourcis: "s", reunions: "s",
};
/** Le document `backOffice/{uid}` d'une disposition enregistrée par la version 2 du tableau (T10). */
const dispositionEnregistree = (...widgets: string[]) => ({
  tableauDeBord: widgets.map((id) => ({ id, taille: TAILLES_ANCIENNES[id], reglages: {} })),
  versionTableau: 2,
  majLe: "2026-09-30T10:00:00Z",
});
/** Ouvre le tableau de bord avec ces widgets enregistrés (ce que le défaut d'avant TB2-c affichait). */
const ouvrirAvec = (page: Page, qui: FakeProfile, widgets: string[], docs: Record<string, Record<string, unknown>> = {}) =>
  ouvrir(page, qui, { [`backOffice/${qui.uid}`]: dispositionEnregistree(...widgets), ...docs });

const grille = (page: Page) => page.getByTestId("grille-widgets");
const widget = (page: Page, nom: string) => grille(page).getByRole("region", { name: nom, exact: true });
const widgetsAffiches = (page: Page) =>
  grille(page).locator("[data-widget]").evaluateAll((els) => els.map((e) => e.getAttribute("data-widget")));

/** Colonnes de la grille selon l'appareil (Q10) : 4 sur ordinateur et tablette en paysage,
 *  2 sur tablette en portrait, 1 sur téléphone. */
function colonnes(info: TestInfo): 1 | 2 | 4 {
  if (info.project.name === "telephone") return 1;
  if (info.project.name === "tablette") return 2;
  return 4;
}

/** Part de la largeur de la grille qu'occupe un widget (1 = toute la ligne). */
async function part(cadre: Locator, w: Locator): Promise<number> {
  const g = (await cadre.boundingBox())!;
  const b = (await w.boundingBox())!;
  return b.width / g.width;
}

// ─── Règles pures ─────────────────────────────────────────────────────────────

// Lot TB2, T9 : le même défaut pour tout le monde (admin compris), filtré par les droits de chaque widget.
const DEFAUT_T9 = ["dimanche", "planning", "evenements", "afaire", "reunions", "comptes"];
const TAILLES_T9: Record<string, string> = { dimanche: "s", planning: "l", evenements: "m", afaire: "m", reunions: "s", comptes: "s" };

test.describe("Tableau de bord (TB2-c) : disposition par défaut (T9)", () => {
  test("admin : les six, dans l'ordre de T9, aux tailles de T9, sans réglage", () => {
    const d = dispositionParDefaut(user(ADMIN), null);
    expect(ids(d)).toEqual(DEFAUT_T9);
    expect(d.map((w) => w.taille)).toEqual(["s", "l", "m", "m", "s", "s"]);
    expect(d.every((w) => Object.keys(w.reglages).length === 0)).toBe(true);
  });

  test("le défaut de chacun : les six filtrés par ses droits (widgetsPermis), dans le même ordre", () => {
    for (const qui of [ALICE, LOUANGE, LES_DEUX, DA, ANNONCES]) {
      const permis = widgetsPermis(user(qui), profil(qui));
      const d = dispositionParDefaut(user(qui), profil(qui));
      expect(ids(d), qui.uid).toEqual(DEFAUT_T9.filter((id) => permis.includes(id as never)));
      expect(d.map((w) => w.taille), qui.uid).toEqual(ids(d).map((id) => TAILLES_T9[id]));
    }
  });

  test("pôle Événement (Alice) : Ce dimanche, Évènements, Tâches, Réunions ; pas de Comptes", () => {
    expect(ids(dispositionParDefaut(user(ALICE), profil(ALICE)))).toEqual(["dimanche", "evenements", "afaire", "reunions"]);
  });

  test("louange (rôle de service, plannings) : s'y ajoute Plannings, en deuxième", () => {
    expect(ids(dispositionParDefaut(user(LOUANGE), profil(LOUANGE)))).toEqual(["dimanche", "planning", "evenements", "afaire", "reunions"]);
  });

  test("droit d'annonces seul : Ce dimanche et Évènements ; pôle DA seul : sans Plannings ; un non-responsable : rien", () => {
    expect(ids(dispositionParDefaut(user(ANNONCES), profil(ANNONCES)))).toEqual(["dimanche", "evenements"]);
    expect(ids(dispositionParDefaut(user(DA), profil(DA)))).toEqual(["dimanche", "evenements", "afaire", "reunions"]);
    const choriste: FakeProfile = { uid: "uid-ch", email: "ch@example.com", serviceRoles: { "Culte Francophone": ["chanteur"] } };
    expect(dispositionParDefaut(user(choriste), profil(choriste))).toEqual([]);
  });

  test("Setlists, Petit déj, Scène, Calendrier, Chants, Raccourcis ne sont plus au défaut : ils restent au catalogue", () => {
    const d = dispositionParDefaut(user(ADMIN), null);
    expect(catalogue(d, user(ADMIN), null)).toEqual(["calendrier", "setlists", "chants", "petitdej", "raccourcis", "scene"]);
  });
});

test.describe("Tableau de bord (B4) : disposition enregistrée (backOffice/{uid}, Q5)", () => {
  test("absente : le défaut du rôle, recalculé", () => {
    expect(dispositionAffichee(null, user(DA), profil(DA))).toEqual(dispositionParDefaut(user(DA), profil(DA)));
    expect(dispositionAffichee({ majLe: "2026-10-01" }, user(DA), profil(DA))).toEqual(dispositionParDefaut(user(DA), profil(DA)));
  });

  test("T10 : une disposition sans versionTableau, ou de la version 1, est ignorée : le défaut s'affiche", () => {
    const sienne = [{ id: "calendrier" as const, taille: "l" as const, reglages: {} }];
    const defaut = dispositionParDefaut(user(DA), profil(DA));
    expect(dispositionAffichee({ tableauDeBord: sienne, majLe: "2026-10-01" }, user(DA), profil(DA))).toEqual(defaut);
    expect(dispositionAffichee({ tableauDeBord: sienne, versionTableau: 1, majLe: "2026-10-01" }, user(DA), profil(DA))).toEqual(defaut);
    expect(dispositionAffichee({ tableauDeBord: sienne, versionTableau: VERSION_TABLEAU, majLe: "2026-10-01" }, user(DA), profil(DA))).toEqual(sienne);
    expect(VERSION_TABLEAU).toBe(2);
  });

  test("présente : son ordre, ses tailles, ses réglages ; sans widget non permis, inconnu, à venir ni doublon", () => {
    const d = dispositionAffichee({
      tableauDeBord: [
        { id: "evenements", taille: "l", reglages: { nombre: 5 } },
        { id: "comptes", taille: "s", reglages: {} },          // admins seuls
        { id: "chants", taille: "m", reglages: {} },           // U7
        { id: "inconnu" as never, taille: "s", reglages: {} },
        { id: "dimanche", taille: "x" as never, reglages: {} }, // taille illisible : celle du catalogue
        { id: "evenements", taille: "s", reglages: {} },        // doublon
      ],
      versionTableau: 2,
      majLe: "2026-10-01",
    }, user(ALICE), profil(ALICE));
    expect(d).toEqual([
      { id: "evenements", taille: "l", reglages: { nombre: 5 } },
      { id: "dimanche", taille: "s", reglages: {} },
    ]);
  });

  test("tout retiré : un tableau vide reste vide (ce n'est pas l'absence)", () => {
    expect(dispositionAffichee({ tableauDeBord: [], versionTableau: 2, majLe: "2026-10-01" }, user(ALICE), profil(ALICE))).toEqual([]);
  });
});

test.describe("Tableau de bord (B4) : données des widgets, règles pures", () => {
  test("prochains dimanches : à partir du dimanche courant", () => {
    expect(prochainsDimanches("2026-10-01", 4)).toEqual(["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"]);
    expect(prochainsDimanches("2026-10-04", 2)).toEqual(["2026-10-04", "2026-10-11"]);
    expect(prochainsDimanches("2026-12-30", 2)).toEqual(["2027-01-03", "2027-01-10"]);
  });

  test("cases vides : colonnes non optionnelles vides, dates demandées seulement", () => {
    const plein = ["Pers. A", "Pers. B", "Pers. C", "Pers. D", "Pers. E", "Pers. F", "Pers. G", "Pers. H", "Pers. I", "Pers. B", ""];
    const rows = [
      ["2026-10-04", ...plein.slice(0, 5), "", ...plein.slice(6)],
      ["2026-10-11", ...plein],
      ["2026-11-01", "", ...plein.slice(1)],
    ];
    const r = casesVides(GRILLE_CULTE, rows, ["2026-10-04", "2026-10-11", "2026-10-18"]);
    // La Sainte cène (optionnelle) vide ne compte pas ; le 18 n'a pas de ligne en 2026 (Sheet) : rien.
    expect(r.map((c) => [c.date, c.colonnes.map((x) => x.cle)])).toEqual([["2026-10-04", ["batterie"]]]);
  });

  test("cases vides dès 2027 : un dimanche sans document est entièrement vide", () => {
    const r = casesVides(GRILLE_CULTE, [], ["2027-01-03"]);
    expect(r).toHaveLength(1);
    expect(r[0].colonnes.map((c) => c.cle)).toEqual(
      ["presidence", "choriste1", "choriste2", "piano", "guitare", "batterie", "sono", "ppt", "orateur", "traduction"]);
  });

  test("cases vides d'un planning à dates choisies : seulement ses dates posées", () => {
    const r = casesVides(GRILLE_INTERFRANCO, [["2027-01-10", "Pers. A", "", "", "", "", "", "", "", "", ""]], ["2027-01-03", "2027-01-10"]);
    expect(r.map((c) => c.date)).toEqual(["2027-01-10"]);
  });

  test("inscriptions : places, sans limite, fermées, lien externe", () => {
    const e = (x: Partial<Evenement>) => ({
      type: "loisir", date: "2026-10-10", heure: "19:00", lienExterne: "", inscriptions: "ouvertes",
      inscriptionDebut: "", inscriptionFin: "", placesMax: null, inscrits: 0, ...x,
    }) as Evenement;
    const maintenant = "2026-10-01T10:00";
    expect(etatInscriptions(e({ placesMax: 10, inscrits: 4 }), maintenant)).toEqual({ cas: "places", inscrits: 4, max: 10 });
    expect(etatInscriptions(e({ placesMax: 10, inscrits: 10 }), maintenant)).toEqual({ cas: "places", inscrits: 10, max: 10 });
    expect(etatInscriptions(e({ inscrits: 3 }), maintenant)).toEqual({ cas: "sansLimite", inscrits: 3 });
    expect(etatInscriptions(e({ inscriptions: "fermees" }), maintenant)).toEqual({ cas: "fermees" });
    // Période finie en automatique ; « Ouvertes » forcées l'ignorent (refusInscription).
    expect(etatInscriptions(e({ inscriptions: "auto", inscriptionFin: "2026-09-30" }), maintenant)).toEqual({ cas: "fermees" });
    expect(etatInscriptions(e({ inscriptionFin: "2026-09-30" }), maintenant)).toEqual({ cas: "sansLimite", inscrits: 0 });
    expect(etatInscriptions(e({ lienExterne: "https://example.com/form" }), maintenant)).toEqual({ cas: "externe" });
  });

  test("scène : créneaux à venir, par date et heure, bornés", () => {
    const c = (dimanche: string, debut: string) => ({ id: dimanche + debut, dimanche, debut }) as Creneau;
    const r = creneauxAVenir([c("2026-10-11", "14:00"), c("2026-09-27", "15:00"), c("2026-10-04", "17:00"), c("2026-10-04", "10:00"), c("2026-10-18", "10:00")], "2026-10-01", 3);
    expect(r.map((x) => x.id)).toEqual(["2026-10-0410:00", "2026-10-0417:00", "2026-10-1114:00"]);
  });

  test("comptes : noms du planning sans compte (casse et espaces ignorés), nouveaux comptes de la semaine", () => {
    expect(nomsSansCompte(["Pers. A", "Pers. B", "pers. c "], [{ planningName: "pers. a" }, { planningName: "Pers. C" }, { planningName: "" }]))
      .toEqual(["Pers. B"]);
    const p = (id: string, createdAt?: Date) => ({ uid: id, createdAt });
    expect(nouveauxComptes([p("ancien", new Date("2026-09-20T10:00:00")), p("neuf", new Date("2026-09-28T10:00:00")), p("sans")], "2026-10-01")
      .map((x) => x.uid)).toEqual(["neuf"]);
  });

  test("Ce dimanche : services par défaut (ceux où l'on sert, sinon Culte Franco), réglage", () => {
    expect(servicesDuDimanche({}, user(ADMIN), null)).toEqual(["Culte Francophone"]);
    expect(servicesDuDimanche({}, user(DA), profil(DA))).toEqual(["Culte Francophone"]);
    const groupe: FakeProfile = { ...DA, serviceRoles: { "Groupe Paix": ["musicien"], "中班": ["presidence"] } };
    expect(servicesDuDimanche({}, user(groupe), profil(groupe))).toEqual(["Groupe Paix", "中班"]);
    expect(servicesDuDimanche({ services: ["Campus", "Inconnu"] }, user(DA), profil(DA))).toEqual(["Campus"]);
  });

  test("Ce dimanche : lignes, cases vides (Sainte cène optionnelle), setlist publiée et présentation", () => {
    const plein = ["Pers. A", "Pers. B", "Pers. C", "Pers. D", "Pers. E", "", "Pers. G", "Pers. H", "Pers. I", "Pers. B", ""];
    const setlist = { category: "Culte Francophone", date: "2026-10-04", leader: "Pers. A", presentationUrl: "https://example.com" };
    const [culte] = ceDimanche({ culte: [["2026-10-04", ...plein]] }, [setlist], ["Culte Francophone"], "2026-10-04");
    expect(culte.libelle).toBe("Culte Franco");
    expect(culte.vides).toBe(1);
    expect(culte.setlist).toBe(true);
    expect(culte.presentation).toBe(true);
    expect(culte.lignes.map((l) => l.cle)).not.toContain("sainteCene");
    expect(culte.lignes.find((l) => l.cle === "batterie")!.valeur).toBe("");
    // Brouillon ou privée : pas publiée.
    const [brouillon] = ceDimanche({ culte: [["2026-10-04", ...plein]] }, [{ ...setlist, isDraft: true }], ["Culte Francophone"], "2026-10-04");
    expect(brouillon.setlist).toBe(false);
    // Sans ligne ce dimanche-là (Sheet de 2026) : rien ; dès 2027, un dimanche vide est montré vide.
    expect(ceDimanche({ culte: [] }, [], ["Culte Francophone"], "2026-10-04")).toEqual([]);
    expect(ceDimanche({ culte: [] }, [], ["Culte Francophone"], "2027-01-03")[0].vides).toBe(10);
  });

  test("setlists à préparer : séances des services, sans setlist publiée, sur l'horizon", () => {
    const rows = { culte: [["2026-10-04", "Pers. A"], ["2026-10-11", "Pers. B"], ["2026-11-01", "Pers. C"]] };
    const seances = seancesDesServices(rows, ["Culte Francophone"]);
    expect(seances.map((s) => [s.category, s.date, s.leader])).toEqual([
      ["Culte Francophone", "2026-10-04", "Pers. A"], ["Culte Francophone", "2026-10-11", "Pers. B"], ["Culte Francophone", "2026-11-01", "Pers. C"],
    ]);
    expect(servicesSetlists({}, user(LOUANGE), profil(LOUANGE))).toEqual(["Culte Francophone"]);
    expect(servicesSetlists({}, user(ADMIN), null)).toEqual(["Culte Francophone"]);
    expect(servicesSetlists({ services: ["Groupe Paix"] }, user(LOUANGE), profil(LOUANGE))).toEqual([]);
  });

  test("à faire : équipes (toutes pour un admin), en retard d'abord, sept jours d'avance", () => {
    expect(equipesAFaire({}, user(ADMIN), null)).toEqual([...EQUIPES.map((e) => e.id), ...COMITES]);
    expect(equipesAFaire({}, user(LES_DEUX), profil(LES_DEUX))).toEqual(["evenementiel", "louange"]);
    expect(equipesAFaire({ equipes: ["louange", "da"] }, user(LES_DEUX), profil(LES_DEUX))).toEqual(["louange"]);
    const t = (id: string, echeance: string) => ({ tache: { id, echeance } as Tache, date: echeance, fois: null });
    const r = aFaireDuTableau([t("b", "2026-10-05"), t("a", "2026-09-28"), t("c", "2026-10-30"), t("d", "2026-10-08")], "2026-10-01");
    expect(r.enRetard).toBe(1);
    expect(r.lignes.map((l) => l.tache.id)).toEqual(["a", "b", "d"]);
  });

  test("petit déj : par dimanche, libre ou les équipes inscrites", () => {
    const l = (dimanche: string, nom: string) => ({ id: nom, dimanche, nom, uid: "", auteurUid: "", creeLe: "", modifieLe: "" });
    expect(petitDejAVenir([l("2026-10-11", "Famille A"), l("2026-10-11", "Famille B")], ["2026-10-04", "2026-10-11"]))
      .toEqual([{ date: "2026-10-04", noms: "" }, { date: "2026-10-11", noms: "Famille A, Famille B" }]);
  });

  test("prochains évènements : visibles, à venir, sans réunions, bornés, section choisie", () => {
    const e = (id: string, date: string, pour = "eglise") => ({ id, titre: id, type: "loisir", pour, date, heure: "", dateFin: "", expiresAt: null, organisateurUid: "x" }) as Evenement;
    const tous = [e("passe", "2026-09-20"), e("b", "2026-10-17"), e("a", "2026-10-10"), e("reunion", "2026-10-03", "equipe:evenementiel"),
      e("section", "2026-10-12", "Culte Francophone"), e("c", "2026-11-07"), e("d", "2026-11-21")];
    expect(evenementsAVenir(tous, user(ALICE), profil(ALICE), "2026-10-01", {}).map((x) => x.id)).toEqual(["a", "section", "b"]);
    expect(evenementsAVenir(tous, user(DA), profil(DA), "2026-10-01", { nombre: 5 }).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(evenementsAVenir(tous, user(ALICE), profil(ALICE), "2026-10-01", { section: "Culte Francophone" }).map((x) => x.id)).toEqual(["section"]);
  });

  test("raccourcis : ceux que les droits permettent, aux adresses de la spec", () => {
    expect(raccourcisPermis(user(ADMIN), null, {})).toEqual([
      { id: "tache", href: "/back-office/taches" },
      { id: "evenement", href: "/back-office/evenements/nouveau" },
      { id: "notifier", href: "/back-office/messages/notifier" },
      { id: "setlist", href: "/setlists/new" },
    ]);
    expect(raccourcisPermis(user(ALICE), profil(ALICE), {}).map((r) => r.id)).toEqual(["tache", "evenement"]);
    // Agencement v18 (B15) : le pôle Louange donne Réunions, pas Évènements, donc pas « Nouvel évènement ».
    expect(raccourcisPermis(user(LOUANGE), profil(LOUANGE), {}).map((r) => r.id)).toEqual(["tache", "setlist"]);
    // Réglage : seulement ceux choisis, et jamais un raccourci non permis.
    expect(raccourcisPermis(user(ALICE), profil(ALICE), { raccourcis: ["evenement", "notifier"] }).map((r) => r.id)).toEqual(["evenement"]);
  });
});

// ─── Écrans ───────────────────────────────────────────────────────────────────
// Le site sert ses adresses avec une barre oblique finale (`trailingSlash`) : liens en motif.

test.describe("Tableau de bord (B4) : écrans", () => {
  test("admin sans disposition enregistrée : les six du défaut (T9), dans l'ordre", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Ce dimanche")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(DEFAUT_T9);
  });

  test("Ce dimanche : le Culte du 4 octobre manque une case (Batterie), setlist et présentation sont là", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const w = widget(page, "Ce dimanche");
    await expect(w.getByRole("heading", { name: "Ce dimanche · 4 octobre" })).toBeVisible();
    await expect(w).toContainText("coup d'œil");
    const culte = w.getByTestId("ligne-dimanche").filter({ hasText: "Culte Franco" });
    await expect(culte).toHaveCount(1);
    await expect(culte).toContainText("1");
    await expect(culte).toContainText("Batterie");
    await expect(culte).not.toContainText("setlist");
    await expect(culte).not.toContainText("présentation");
    // Plus aucun nom de personne.
    await expect(w.getByText("Pers. A")).toHaveCount(0);
    await expect(w.getByRole("link", { name: "Voir" })).toHaveAttribute("href", /^\/back-office\/planning\/culte\/?$/);
  });

  test("Ce dimanche : un réglage de services change le contenu", async ({ page }) => {
    await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": { tableauDeBord: [{ id: "dimanche", taille: "m", reglages: { services: ["Groupe Bonté"] } }], versionTableau: 2, majLe: "2026-10-01" },
    });
    const w = widget(page, "Ce dimanche");
    await expect(w.getByText("Rien au planning ce dimanche.")).toBeVisible();
    await expect(w.getByText("Culte Franco", { exact: true })).toHaveCount(0);
  });

  test("Alice (pôle Événement, référente EDD) : ses six widgets et leurs données", async ({ page }) => {
    await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await expect(widget(page, "Scène")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(ALICE_ORGA_DEFAUT);

    const aFaire = widget(page, "Tâches");
    await expect(aFaire.getByText("1 en retard")).toBeVisible();
    await expect(aFaire.getByText("Affiche de Noël")).toBeVisible();
    await expect(aFaire.getByText("Réserver la salle")).toBeVisible();
    await expect(aFaire.getByText("Fond du culte")).toHaveCount(0);

    const evts = widget(page, "Évènements");
    await expect(evts.getByTestId("ligne-evenement")).toHaveText([/Foot au parc.*4 inscrits sur 10/, /Repas de section.*sans limite/, /Sortie d'automne/]);
    await expect(evts.getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", /\/back-office\/evenements\/?$/);

    const scene = widget(page, "Scène");
    await expect(scene.getByRole("heading", { name: "Scène · Noël 2026" })).toBeVisible();
    await expect(scene.getByTestId("ligne-creneau")).toHaveText([/4 oct\. 17:00.*Chant · EDD 中班/, /11 oct\. 14:00.*Sketch · Culte Francophone/]);
  });

  test("louange : setlists à préparer et cases vides du Culte", async ({ page }) => {
    await ouvrirAvec(page, LOUANGE_ORGA, ["dimanche", "afaire", "setlists", "planning"]);
    const setlists = widget(page, "Setlists à préparer");
    await expect(setlists.getByTestId("ligne-setlist")).toHaveText([/Culte Franco · 11 oct\./, /Culte Franco · 18 oct\./, /Culte Franco · 25 oct\./]);
    await expect(setlists.getByRole("link", { name: /Culte Franco · 11 oct\./ }))
      .toHaveAttribute("href", /^\/setlists\/new\/?\?cat=Culte\+Francophone&date=2026-10-11$/);

    // TB2-b : la case vide du 4 octobre seule, puis une ligne pour les dimanches suivants (11 : guitare + batterie ; 18 : PPT).
    const vides = widget(page, "Plannings");
    await expect(vides.getByTestId("ligne-case-vide")).toHaveText([/Culte Franco · 4 oct\. · Batterie/]);
    await expect(vides.getByTestId("ligne-plus-tard")).toContainText("Cases vides d'ici le 1 nov.");
  });

  test("admin : petit déj, raccourcis, comptes", async ({ page }) => {
    await ouvrirAvec(page, ADMIN, ["petitdej", "raccourcis", "comptes"]);
    await expect(widget(page, "Petit déj").getByTestId("ligne-petitdej"))
      .toHaveText([/4 oct\.\s*Libre/, /11 oct\.\s*Libre/, /18 oct\.\s*Famille Test/, /25 oct\.\s*Libre/]);

    const raccourcis = widget(page, "Raccourcis");
    await expect(raccourcis.getByRole("link", { name: "Tâche" })).toHaveAttribute("href", /^\/back-office\/taches\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Évènement" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Notifier" })).toHaveAttribute("href", /^\/back-office\/messages\/notifier\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Setlist" })).toHaveAttribute("href", /^\/setlists\/new\/?$/);

    // TB2-b : deux nombres (les huit autres noms du planning n'ont pas de compte), plus de liste de noms.
    const comptes = widget(page, "Comptes");
    await expect(comptes.getByTestId("compte-sans-compte")).toContainText("noms sans compte");
    await expect(comptes.getByTestId("compte-nouveaux")).toContainText("nouveaux cette semaine");
    await expect(comptes.getByText("Pers. A", { exact: true })).toHaveCount(0);
    await expect(comptes.getByRole("link", { name: "Voir" })).toHaveAttribute("href", /^\/back-office\/planning\/sans-compte\/?$/);
  });

  test("disposition enregistrée : son ordre, ses tailles selon l'appareil (Q10), ses réglages", async ({ page }, info) => {
    await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": {
        tableauDeBord: [
          { id: "evenements", taille: "l", reglages: { nombre: 5 } },
          { id: "planning", taille: "s", reglages: { horizon: 2 } },
          { id: "dimanche", taille: "m", reglages: {} },
          { id: "chants", taille: "m", reglages: {} },
        ],
        versionTableau: 2,
        majLe: "2026-10-01T09:00:00Z",
      },
    });
    await expect(widget(page, "Évènements").getByTestId("ligne-evenement")).toHaveCount(5);
    // « chants » (U7, S5) : permis à un admin, donc affiché.
    expect(await widgetsAffiches(page)).toEqual(["evenements", "planning", "dimanche", "chants"]);
    // Réglage « 2 dimanches » (les suivants, TB2-b) : la ligne « plus tard » va jusqu'au 18 octobre (11 et 18).
    await expect(widget(page, "Plannings").getByTestId("ligne-case-vide")).toHaveCount(1);
    await expect(widget(page, "Plannings").getByTestId("ligne-plus-tard")).toContainText("Cases vides d'ici le 18 oct.");

    const n = colonnes(info);
    if (n === 4) {
      // Agencement v18 (B14) : en grand, hors personnalisation, des colonnes (deux ici : barre dépliée,
      // ou tablette couchée). Le « Grand » (L) prend la colonne large ; le premier des autres (S) va
      // dans l'étroite, vide jusque-là. Un widget prend la largeur de sa colonne : L ≈ 1,55 × S ;
      // M (« Ce dimanche »), celle de la colonne où le place sa hauteur.
      await expect(grille(page)).toHaveAttribute("data-disposition", "colonnes");
      const L = widget(page, "Évènements");
      const S = widget(page, "Plannings");
      const M = widget(page, "Ce dimanche");
      await expect(L).toHaveAttribute("data-colonne", "0");
      await expect(S).toHaveAttribute("data-colonne", "1");
      const large = (await L.boundingBox())!.width;
      const etroite = (await S.boundingBox())!.width;
      expect(large / etroite, "la colonne large").toBeCloseTo(1.55, 1);
      const m = (await M.boundingBox())!.width;
      expect(Math.min(Math.abs(m - large), Math.abs(m - etroite)), "M a la largeur d'une des deux colonnes").toBeLessThanOrEqual(1);
      return;
    }
    const L = await part(grille(page), widget(page, "Évènements"));
    const S = await part(grille(page), widget(page, "Plannings"));
    const M = await part(grille(page), widget(page, "Ce dimanche"));
    expect(L).toBeCloseTo(1, 1);
    expect(M).toBeCloseTo(n === 2 ? 0.5 : 1, 1);
    expect(S).toBeCloseTo(n === 2 ? 0.5 : 1, 1);
  });

  // Relecture du lot U6 : les deux widgets partagent une lecture des setlists, bornée aux
  // setlists à venir ; une lecture en échec n'est jamais « pas de setlist » (U3 Q10).
  test("Ce dimanche et Setlists à préparer : une seule lecture des setlists, celles d'aujourd'hui et après", async ({ page }) => {
    const lectures: { where?: unknown; limit?: number }[] = [];
    page.on("request", (r) => {
      if (!r.url().includes(":runQuery")) return;
      const q = (r.postDataJSON() as { structuredQuery: { from: { collectionId: string }[]; where?: unknown; limit?: number } }).structuredQuery;
      // La cloche lit les setlists récentes à part (`limit`) : pas les widgets.
      if (q.from[0].collectionId === "setlists" && !q.limit) lectures.push(q);
    });
    // Ces deux widgets seuls : « Chants les plus joués » (U7) lit toutes les setlists, à part et sans
    // cache (`getSetlists()`, comme la page Statistiques) : coût accepté par Q1 de spec-statistiques.md
    // (une visite de l'onglet Setlists, ~150 lectures sur un quota de 50 000 par jour).
    await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": {
        tableauDeBord: [{ id: "dimanche", taille: "m", reglages: {} }, { id: "setlists", taille: "s", reglages: {} }],
        versionTableau: 2,
        majLe: "2026-10-01",
      },
    });
    await expect(widget(page, "Ce dimanche").getByTestId("ligne-dimanche")).toHaveCount(1);
    await expect(widget(page, "Setlists à préparer").getByTestId("ligne-setlist").first()).toBeVisible();
    expect(lectures).toEqual([expect.objectContaining({
      where: { fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: "2026-10-01" } } },
    })]);
  });

  test("setlists illisibles : « Lecture impossible » dans les deux widgets, jamais « Pas de setlist »", async ({ page }) => {
    await ouvrirAvec(page, ADMIN, ["dimanche", "setlists"]);
    await expect(widget(page, "Ce dimanche").getByTestId("ligne-dimanche")).toHaveCount(1);
    // Posée après la base simulée, cette route passe avant elle ; le rechargement relit tout.
    await page.route(/documents:runQuery/, (route) => {
      const q = (route.request().postDataJSON() as { structuredQuery?: { from?: { collectionId: string }[]; limit?: number } }).structuredQuery;
      if (q?.from?.[0]?.collectionId === "setlists" && !q.limit) {
        return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) });
      }
      return route.fallback();
    });
    await page.reload();
    await expect(widget(page, "Ce dimanche").getByText("Lecture impossible pour l'instant.")).toBeVisible();
    await expect(widget(page, "Setlists à préparer").getByText("Lecture impossible pour l'instant.")).toBeVisible();
    // Une lecture en échec n'est jamais « prêt » ni « setlist » manquante : aucune rangée.
    await expect(widget(page, "Ce dimanche").getByTestId("ligne-dimanche")).toHaveCount(0);
    await expect(widget(page, "Setlists à préparer").getByTestId("ligne-setlist")).toHaveCount(0);
  });

  test("un widget réservé aux admins enregistré par Alice ne s'affiche pas", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "comptes", taille: "s", reglages: {} }, { id: "scene", taille: "s", reglages: {} }], versionTableau: 2, majLe: "2026-10-01" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["scene"]);
  });

  test("captures du tableau de bord (à regarder)", async ({ page }, info) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Comptes")).toBeVisible();
    await expect(widget(page, "Ce dimanche").getByTestId("ligne-dimanche")).toHaveCount(1);
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-admin.png`, fullPage: true });
  });

  test("中文 : titres des widgets traduits", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE_ORGA);
    await expect(grille(page).getByRole("region", { name: "本主日" })).toBeVisible();
    await expect(grille(page).getByRole("region", { name: "任务" })).toBeVisible();
    await expect(grille(page).getByRole("region", { name: "会议" })).toBeVisible();
  });
});

// ═══ B5 — Personnaliser ═══════════════════════════════════════════════════════
// Planche `bo-tableau-de-bord` (mode personnalisation) : « Personnaliser » devient
// « Terminé » avec « Disposition par défaut » ; bandeau « Ajouter un widget » ; par widget,
// poignée, Monter, Descendre, S, M, L, Réglages du widget, Retirer le widget. Chaque geste
// écrit `backOffice/{uid}` (Q12) ; « Disposition par défaut » demande confirmation et retire
// la disposition du document (absente = défaut du rôle, jamais recopié, Q5).

const ROOT = path.resolve(__dirname, "..");
/** Le défaut d'Alice (T9) ; la disposition d'avant TB2-c (Ce dimanche, À faire, Évènements, Scène) sert aux tests de personnalisation. */
const ALICE_DEFAUT = ["dimanche", "evenements", "afaire", "reunions"];
/** Lot AO : la disposition d'avant TB2-c d'Alice quand elle est référente EDD (`ALICE_ORGA`), enregistrée (version 2) par les tests d'écran de personnalisation. */
const ALICE_ORGA_DEFAUT = ["dimanche", "afaire", "setlists", "planning", "evenements", "scene"];

/** La dernière écriture de `backOffice/{uid}`. */
const ecrituresBO = (db: FakeDb, uid: string) => db.writes.filter((w) => w.path === `backOffice/${uid}`);
const idsEcrits = (db: FakeDb, uid: string) =>
  ((ecrituresBO(db, uid).at(-1)?.data.tableauDeBord ?? null) as { id: string }[] | null)?.map((w) => w.id) ?? null;

async function personnaliser(page: Page) {
  await expect(widget(page, "Scène")).toBeVisible();
  await page.getByRole("button", { name: "Personnaliser" }).click();
  await expect(page.getByRole("button", { name: "Terminé" })).toBeVisible();
}
const catalogueDe = (page: Page) => page.getByRole("region", { name: "Ajouter un widget" });

test.describe("Personnaliser (B5) : règles pures", () => {
  test("catalogue : les widgets permis non affichés, dans l'ordre de la planche ; jamais un widget non permis", () => {
    const d = dispositionParDefaut(user(ALICE), profil(ALICE));
    expect(catalogue(d, user(ALICE), profil(ALICE))).toEqual(["calendrier", "petitdej", "raccourcis", "scene"]);
    expect(catalogue([], user(ALICE), profil(ALICE))).toEqual(["dimanche", "calendrier", "afaire", "evenements", "reunions", "petitdej", "raccourcis", "scene"]);
    expect(catalogue(dispositionParDefaut(user(ADMIN), null), user(ADMIN), null)).toEqual(["calendrier", "setlists", "chants", "petitdej", "raccourcis", "scene"]);
    expect(catalogue(ajouterWidget(ajouterWidget(dispositionParDefaut(user(ADMIN), null), "calendrier"), "setlists"), user(ADMIN), null)).toEqual(["chants", "petitdej", "raccourcis", "scene"]);
  });

  test("ajouter (à la fin, taille de la table), retirer, déplacer, taille, réglages", () => {
    const d = dispositionParDefaut(user(ALICE), profil(ALICE));
    const plus = ajouterWidget(d, "petitdej");
    expect(ids(plus)).toEqual([...ALICE_DEFAUT, "petitdej"]);
    expect(plus.at(-1)).toEqual({ id: "petitdej", taille: "s", reglages: {} });
    expect(ids(ajouterWidget(plus, "petitdej")), "jamais deux fois").toEqual(ids(plus));
    expect(ids(retirerWidget(d, "afaire"))).toEqual(["dimanche", "evenements", "reunions"]);
    expect(ids(deplacerWidget(d, 3, 0))).toEqual(["reunions", "dimanche", "evenements", "afaire"]);
    expect(ids(deplacerWidget(d, 0, 1))).toEqual(["evenements", "dimanche", "afaire", "reunions"]);
    expect(ids(deplacerWidget(d, 0, -1)), "hors bornes : rien").toEqual(ALICE_DEFAUT);
    expect(changerTaille(d, "evenements", "l").find((w) => w.id === "evenements")!.taille).toBe("l");
    expect(changerReglages(d, "evenements", { nombre: 5 }).find((w) => w.id === "evenements")!.reglages).toEqual({ nombre: 5 });
    // Rien n'est modifié en place.
    expect(ids(d)).toEqual(ALICE_DEFAUT);
  });

  test("réglages d'Évènements : nombre 3 / 5 / 10, section (toutes)", () => {
    const [nombre, section] = groupesDeReglages("evenements", {}, user(ALICE), profil(ALICE));
    expect([nombre.cle, nombre.plusieurs, nombre.choix.map((c) => c.valeur), nombre.actifs]).toEqual(["nombre", false, ["3", "5", "10"], ["3"]]);
    expect([section.cle, section.choix.map((c) => c.valeur), section.actifs])
      .toEqual(["section", ["", "Culte Francophone", "Groupe Paix", "Groupe Fidélité", "Groupe Bonté"], [""]]);
    expect(choisirReglage({}, nombre, "5")).toEqual({ nombre: 5 });
    expect(choisirReglage({ section: "Groupe Paix", nombre: 5 }, section, "")).toEqual({ nombre: 5 });
  });

  test("réglages à plusieurs choix : cocher, décocher, jamais vide", () => {
    const [equipes] = groupesDeReglages("afaire", {}, user(LES_DEUX), profil(LES_DEUX));
    expect([equipes.cle, equipes.plusieurs, equipes.choix.map((c) => c.valeur), equipes.actifs])
      .toEqual(["equipes", true, ["evenementiel", "louange"], ["evenementiel", "louange"]]);
    const sansLouange = choisirReglage({}, equipes, "louange");
    expect(sansLouange).toEqual({ equipes: ["evenementiel"] });
    const [seul] = groupesDeReglages("afaire", sansLouange, user(LES_DEUX), profil(LES_DEUX));
    expect(seul.actifs).toEqual(["evenementiel"]);
    expect(choisirReglage(sansLouange, seul, "evenementiel"), "le dernier choix reste").toEqual(sansLouange);
  });

  test("réglages des autres widgets : services, plannings, horizons, programme, liste, raccourcis", () => {
    const g = (id: Parameters<typeof groupesDeReglages>[0], qui: FakeProfile | null, programmes?: { id: string; nom: string }[]) =>
      groupesDeReglages(id, {}, qui ? user(qui) : user(ADMIN), qui ? profil(qui) : null, programmes)
        .map((x) => [x.cle, x.choix.map((c) => c.valeur), x.actifs]);
    expect(g("dimanche", DA)[0][2]).toEqual(["Culte Francophone"]);
    expect(g("planning", null)).toEqual([
      ["plannings", expect.arrayContaining(["culte", "campusMatin"]), ["culte"]], ["horizon", ["2", "4", "8"], ["4"]],  // dimanches suivants (TB2-b)
    ]);
    expect(g("setlists", LOUANGE)).toEqual([["services", ["Culte Francophone"], ["Culte Francophone"]], ["horizon", ["2", "4"], ["4"]]]);
    expect(g("petitdej", ALICE)).toEqual([["horizon", ["4", "8"], ["4"]]]);
    expect(g("scene", ALICE, [{ id: "p1", nom: "Noël" }])).toEqual([["programme", ["", "p1"], [""]]]);
    // Lot TB2-b : Comptes montre deux nombres, plus de liste : aucun réglage.
    expect(g("comptes", null)).toEqual([]);
    expect(g("raccourcis", ALICE)).toEqual([["raccourcis", ["tache", "evenement"], ["tache", "evenement"]]]);
  });

  test("règle backOffice/{uid} : lue et écrite par l'intéressé seul (firestore.rules)", () => {
    const rules = readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
    expect(rules).toMatch(/match \/backOffice\/\{uid\} \{\s*allow read, write: if signedIn\(\) && request\.auth\.uid == uid;\s*\}/);
  });
});

test.describe("Personnaliser (B5) : écrans", () => {
  test("Personnaliser : Terminé, Disposition par défaut, catalogue des widgets permis (pas Comptes)", async ({ page }) => {
    await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await expect(page.getByRole("button", { name: "Monter" })).toHaveCount(0);
    await personnaliser(page);
    await expect(page.getByRole("button", { name: "Disposition par défaut" })).toBeVisible();
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "Réunions", "Petit déj", "Raccourcis"]);
    // Les outils de chaque widget ; Monter grisé en tête, Descendre en queue.
    await expect(widget(page, "Ce dimanche").getByRole("button", { name: "Monter" })).toBeDisabled();
    await expect(widget(page, "Scène").getByRole("button", { name: "Descendre" })).toBeDisabled();
    await expect(widget(page, "Évènements").getByRole("button", { name: "M", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Terminé" }).click();
    await expect(page.getByRole("button", { name: "Personnaliser" })).toBeVisible();
    await expect(catalogueDe(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Monter" })).toHaveCount(0);
  });

  test("ajouter puis retirer un widget : écrit à chaque geste", async ({ page }) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    await catalogueDe(page).getByRole("button", { name: "Petit déj" }).click();
    await expect(widget(page, "Petit déj").getByTestId("ligne-petitdej").first()).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual([...ALICE_ORGA_DEFAUT, "petitdej"]);
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "Réunions", "Raccourcis"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual([...ALICE_ORGA_DEFAUT, "petitdej"]);
    expect(ecrituresBO(db, "uid-alice").at(-1)!.data.majLe).toEqual(expect.stringMatching(/^2026-10-01T/));

    await widget(page, "Tâches").getByRole("button", { name: "Retirer le widget" }).click();
    await expect(widget(page, "Tâches")).toHaveCount(0);
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "Tâches", "Réunions", "Raccourcis"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["dimanche", "setlists", "planning", "evenements", "scene", "petitdej"]);
  });

  test("tous affichés : « Tous les widgets sont déjà affichés. »", async ({ page }) => {
    await ouvrirAvec(page, ADMIN, ["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "reunions", "chants", "petitdej", "raccourcis", "scene", "comptes"]);
    await expect(widget(page, "Comptes")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await expect(catalogueDe(page).getByText("Tous les widgets sont déjà affichés.")).toBeVisible();
  });

  test("Monter et Descendre", async ({ page }) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    await widget(page, "Scène").getByRole("button", { name: "Monter" }).click();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["dimanche", "afaire", "setlists", "planning", "scene", "evenements"]);
    await widget(page, "Ce dimanche").getByRole("button", { name: "Descendre" }).click();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["afaire", "dimanche", "setlists", "planning", "scene", "evenements"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["afaire", "dimanche", "setlists", "planning", "scene", "evenements"]);
  });

  test("glisser un widget par sa poignée", async ({ page }) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    const poignee = widget(page, "Scène").getByRole("button", { name: "Déplacer « Scène »" });
    const cible = widget(page, "Évènements");
    await cible.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const from = (await poignee.boundingBox())!;
    const to = (await cible.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 12, { steps: 4 });
    await expect(poignee).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await expect(page.getByText("« Scène » en position 5 sur 6.")).toBeAttached();
    await page.mouse.up();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["dimanche", "afaire", "setlists", "planning", "scene", "evenements"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["dimanche", "afaire", "setlists", "planning", "scene", "evenements"]);
  });

  test("tailles S / M / L : la place change selon l'appareil (Q10), et s'écrit", async ({ page }, info) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    const evts = widget(page, "Évènements");
    await evts.getByRole("button", { name: "L", exact: true }).click();
    await expect(evts.getByRole("button", { name: "L", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => part(grille(page), evts)).toBeCloseTo(1, 1);
    await evts.getByRole("button", { name: "S", exact: true }).click();
    const n = colonnes(info);
    await expect.poll(() => part(grille(page), evts)).toBeCloseTo(n === 4 ? 0.25 : n === 2 ? 0.5 : 1, 1);
    await expect.poll(() => (ecrituresBO(db, "uid-alice").at(-1)?.data.tableauDeBord as { id: string; taille: string }[] | undefined)
      ?.find((w) => w.id === "evenements")?.taille).toBe("s");
  });

  test("un réglage change le contenu et s'écrit", async ({ page }) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    const evts = widget(page, "Évènements");
    await expect(evts.getByTestId("ligne-evenement")).toHaveCount(3);
    await personnaliser(page);
    const reglages = evts.getByRole("button", { name: "Réglages du widget" });
    await reglages.click();
    await expect(reglages).toHaveAttribute("aria-expanded", "true");
    const afficher = evts.getByRole("group", { name: "Afficher" });
    await expect(afficher.getByRole("button", { name: "3", exact: true })).toHaveAttribute("aria-pressed", "true");
    await afficher.getByRole("button", { name: "5", exact: true }).click();
    await expect(evts.getByTestId("ligne-evenement")).toHaveCount(5);
    await expect.poll(() => (ecrituresBO(db, "uid-alice").at(-1)?.data.tableauDeBord as { id: string; reglages: object }[] | undefined)
      ?.find((w) => w.id === "evenements")?.reglages).toEqual({ nombre: 5 });
  });

  test("Réussite 2 : Alice ajoute Petit déj, monte Scène en tête, passe Évènements en L ; relue sur un autre appareil, la même", async ({ page, browser }, info) => {
    const db = await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    await catalogueDe(page).getByRole("button", { name: "Petit déj" }).click();
    for (let i = 0; i < 5; i++) await widget(page, "Scène").getByRole("button", { name: "Monter" }).click();
    await widget(page, "Évènements").getByRole("button", { name: "L", exact: true }).click();
    const voulu = ["scene", "dimanche", "afaire", "setlists", "planning", "evenements", "petitdej"];
    await expect.poll(() => widgetsAffiches(page)).toEqual(voulu);
    await expect.poll(() => (db.doc("backOffice/uid-alice")?.tableauDeBord as { taille: string }[] | undefined)?.[5]?.taille).toBe("l");

    // Un autre appareil, une autre session : il ne lit que la base.
    const { defaultBrowserType: _ignore, ...use } = info.project.use as Record<string, unknown>;
    const autre = await browser.newContext({ ...(use as BrowserContextOptions), baseURL: new URL(page.url()).origin });
    try {
      const page2 = await autre.newPage();
      await ouvrir(page2, ALICE_ORGA, { "backOffice/uid-alice": db.doc("backOffice/uid-alice")! });
      await expect(widget(page2, "Petit déj")).toBeVisible();
      expect(await widgetsAffiches(page2)).toEqual(voulu);
      // Agencement v18 (B14) : en grand, hors personnalisation, le « Grand » va dans la colonne large.
      if (colonnes(info) === 4) await expect(widget(page2, "Évènements")).toHaveAttribute("data-colonne", "0");
      else expect(await part(grille(page2), widget(page2, "Évènements"))).toBeCloseTo(1, 1);
    } finally {
      await autre.close();
    }
  });

  test("Disposition par défaut : confirmation, puis le défaut (T9), sans disposition mais avec la version 2", async ({ page }) => {
    const db = await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    // Refusée : rien ne change, rien ne s'écrit.
    await page.getByRole("button", { name: "Disposition par défaut" }).click();
    await repondreDansLeSite(page, "Annuler");
    expect(await widgetsAffiches(page)).toEqual(["scene"]);
    expect(ecrituresBO(db, "uid-alice")).toHaveLength(0);
    // Acceptée : le défaut d'Alice, et plus de disposition enregistrée (la version, elle, reste écrite).
    await page.getByRole("button", { name: "Disposition par défaut" }).click();
    await repondreDansLeSite(page, "Remettre par défaut");
    await expect.poll(() => widgetsAffiches(page)).toEqual(["dimanche", "planning", "evenements", "afaire", "reunions"]);
    await expect.poll(() => ecrituresBO(db, "uid-alice").length).toBe(1);
    expect(db.doc("backOffice/uid-alice")!.tableauDeBord).toBeUndefined();
    expect(db.doc("backOffice/uid-alice")!.versionTableau).toBe(2);
    expect(db.doc("backOffice/uid-alice")!.majLe).toEqual(expect.stringMatching(/^2026-10-01T/));
  });

  test("écriture refusée : la disposition reste à l'écran et un message le dit", async ({ page }) => {
    await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await page.route(/firestore\.googleapis\.com.*backOffice/, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" })
        : route.fallback());
    await personnaliser(page);
    await widget(page, "Tâches").getByRole("button", { name: "Retirer le widget" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Disposition non enregistrée" })).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["dimanche", "setlists", "planning", "evenements", "scene"]);
  });

  test("captures en personnalisation (à regarder)", async ({ page }, info) => {
    await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await personnaliser(page);
    await widget(page, "Évènements").getByRole("button", { name: "Réglages du widget" }).click();
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-personnaliser.png`, fullPage: true });
  });

  test("中文 : Personnaliser traduit", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrirAvec(page, ALICE_ORGA, ALICE_ORGA_DEFAUT);
    await page.getByRole("button", { name: "自定义" }).click();
    await expect(page.getByRole("button", { name: "完成" })).toBeVisible();
    await expect(page.getByRole("region", { name: "添加小组件" })).toBeVisible();
  });
});

// ─── Lot TB2, tranche TB2-a : les règles pures du tableau de bord v2 ──────────
// Aucun nom réel : « Ysaline », « Corentin », « Maëlys »… inventés pour ces tests.

test.describe("Tableau de bord v2 (TB2-a) : règles pures", () => {
  const PLEIN = ["Pers. A", "Pers. B", "Pers. C", "Pers. D", "Pers. E", "Pers. F", "Pers. G", "Pers. H", "Pers. I", "Pers. B", ""];
  const ligneCulte = (date: string, trous: Record<number, string> = {}) =>
    [date, ...PLEIN.map((v, i) => trous[i] ?? v)];
  const setlist = (x: Record<string, unknown> = {}) =>
    ({ category: "Culte Francophone", date: "2026-10-25", leader: "Pers. A", presentationUrl: "https://exemple.test/ppt", ...x });
  const nos = (m: { cle: string }[]) => m.map((x) => x.cle);
  const i18nCulte = (cle: string) => GRILLE_CULTE.colonnes.find((c) => c.cle === cle)!.i18n;

  test("prochain dimanche : jeudi, dimanche avant midi, dimanche à midi", () => {
    expect(prochainDimanche("2026-10-22T10:00")).toBe("2026-10-25");
    expect(prochainDimanche("2026-10-25T09:30")).toBe("2026-10-25");
    expect(prochainDimanche("2026-10-25T12:00")).toBe("2026-11-01");
    expect(prochainDimanche("2026-10-26T08:00")).toBe("2026-11-01");
  });

  test("Ce dimanche : batterie vide et pas de setlist, puis présentation, puis prêt", () => {
    const rows = { culte: [ligneCulte("2026-10-25", { 5: "" })] };
    const [vide] = etatsDuDimanche(rows, [], ["Culte Francophone"], "2026-10-25", null);
    expect(vide).toMatchObject({ categorie: "Culte Francophone", planning: "culte", libelle: "Culte Franco" });
    expect(nos(vide.manques)).toEqual(["batterie", "setlist"]);
    expect(vide.manques[1].i18n).toBe("tableauDeBord.dimanche.manque.setlist");
    const plein = { culte: [ligneCulte("2026-10-25")] };
    const [sansPpt] = etatsDuDimanche(plein, [setlist({ presentationUrl: "" })], ["Culte Francophone"], "2026-10-25", null);
    expect(sansPpt.manques).toEqual([{ cle: "presentation", i18n: "tableauDeBord.dimanche.manque.presentation" }]);
    const [pret] = etatsDuDimanche(plein, [setlist()], ["Culte Francophone"], "2026-10-25", null);
    expect(pret.manques).toEqual([]);
  });

  test("Ce dimanche : Sainte cène vide non comptée ; brouillon ou privée ne sont pas publiées ; autre date ignorée", () => {
    const plein = { culte: [ligneCulte("2026-10-25")] };
    const manques = (s: Record<string, unknown>) => nos(etatsDuDimanche(plein, [setlist(s)], ["Culte Francophone"], "2026-10-25", null)[0].manques);
    expect(manques({})).toEqual([]);
    expect(manques({ isDraft: true })).toEqual(["setlist"]);
    expect(manques({ isPrivate: true })).toEqual(["setlist"]);
    expect(manques({ date: "2026-10-18" })).toEqual(["setlist"]);
  });

  test("Ce dimanche : un planning de groupe n'a ni setlist ni présentation à compter", () => {
    const rows = { paix: [["2026-10-25", "Pers. A", "Pers. B", "Pers. C", "Pers. D", ""]] };
    const [paix] = etatsDuDimanche(rows, [], ["Groupe Paix"], "2026-10-25", null);
    expect(paix.planning).toBe("paix");
    expect(nos(paix.manques)).not.toContain("setlist");
  });

  test("Ce dimanche : la Table ajoute le petit déj seulement s'il est lu", () => {
    const rows = { culte: [ligneCulte("2026-10-25")], table: [["2026-10-25", "Pers. A", ""]] };
    const avec = etatsDuDimanche(rows, [setlist()], ["Culte Francophone"], "2026-10-25", []);
    expect(avec.map((e) => e.planning)).toEqual(["culte", "table"]);
    expect(avec[1]).toMatchObject({ categorie: "table", libelle: "Prépa. Table" });
    expect(avec[1].manques).toEqual([{ cle: "petitDej", i18n: "tableauDeBord.dimanche.manque.petitDej" }]);
    const l = { id: "x", dimanche: "2026-10-25", nom: "Famille Test", uid: "", auteurUid: "", creeLe: "", modifieLe: "" };
    expect(etatsDuDimanche(rows, [setlist()], ["Culte Francophone"], "2026-10-25", [l])[1].manques).toEqual([]);
    expect(etatsDuDimanche(rows, [setlist()], ["Culte Francophone"], "2026-10-25", null).map((e) => e.planning)).toEqual(["culte"]);
  });

  const REFERENTS = {
    musiciens: { uid: "u-mus", firstName: "Ysaline", lastName: "V.", referentSous: ["musiciens"] },
    louange: { uid: "u-lou", firstName: "Corentin", lastName: "R.", referentDe: ["louange"] },
    regie: { uid: "u-reg", firstName: "Maëlys", lastName: "T.", referentDe: ["regie"] },
    edd: { uid: "u-edd", firstName: "Anselme", lastName: "K.", referentDe: ["edd"] },
  };
  const tous = Object.values(REFERENTS);

  test("qui relancer : la sous-équipe d'abord, sinon Louange, la Régie, l'EDD", () => {
    expect(quiRelancer("culte", "batterie", tous)).toEqual({ uid: "u-mus", prenom: "Ysaline", nom: "Ysaline V.", equipe: "louange", sous: "musiciens" });
    // Pas de référent Présidence : repli sur le référent Louange, sans sous-équipe.
    expect(quiRelancer("culte", "presidence", tous)).toEqual({ uid: "u-lou", prenom: "Corentin", nom: "Corentin R.", equipe: "louange" });
    expect(quiRelancer("culte", "ppt", tous)).toMatchObject({ uid: "u-reg", equipe: "regie" });
    expect(quiRelancer("eddDaban", "cours", tous)).toMatchObject({ uid: "u-edd", equipe: "edd" });
    expect(quiRelancer("culte", "orateur", tous)).toMatchObject({ uid: "u-lou" });
  });

  test("qui relancer : planning de groupe, aucun référent, deux référents", () => {
    expect(equipeDeLaColonne("paix", "presidence")).toBeNull();
    expect(quiRelancer("paix", "presidence", tous)).toBeNull();
    expect(quiRelancer("culte", "ppt", [REFERENTS.louange])).toBeNull();
    const deux = [
      { uid: "u2", firstName: "Zélie", lastName: "A.", referentSous: ["musiciens"] },
      { uid: "u1", firstName: "Étienne", lastName: "Z.", referentSous: ["musiciens"] },
    ];
    expect(quiRelancer("culte", "piano", deux)!.uid).toBe("u1");
    expect(equipeDeLaColonne("culte", "choriste2")).toEqual({ equipe: "louange", sous: "choristes" });
    expect(equipeDeLaColonne("table", "equipe")).toEqual({ equipe: "orga" });
  });

  const profilsAbs = [{ uid: "u-ysa", planningName: "Ysaline V." }, { uid: "u-vide", planningName: "" }];
  const abs = (uid: string, du: string, au: string) => ({ id: uid + du, uid, du, au, motif: "Voyage privé" });

  test("absences en conflit : une entrée sans motif, hors date rien, casse et accents ignorés, sans profil rien", () => {
    const rows = [ligneCulte("2026-10-25", { 5: "Ysaline V." })];
    const r = absencesEnConflit(GRILLE_CULTE, rows, ["2026-10-25"], profilsAbs, [abs("u-ysa", "2026-10-20", "2026-10-27")]);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ planning: "culte", date: "2026-10-25", nom: "Ysaline V.", colonne: { cle: "batterie", i18n: i18nCulte("batterie") } });
    expect(Object.keys(r[0]).sort()).toEqual(["colonne", "date", "nom", "planning"]);
    expect(JSON.stringify(r)).not.toContain("Voyage");
    expect(absencesEnConflit(GRILLE_CULTE, rows, ["2026-10-25"], profilsAbs, [abs("u-ysa", "2026-11-01", "2026-11-02")])).toEqual([]);
    const accents = [ligneCulte("2026-10-25", { 5: "YSALINE v" })];
    expect(absencesEnConflit(GRILLE_CULTE, accents, ["2026-10-25"], profilsAbs, [abs("u-ysa", "2026-10-25", "2026-10-25")])).toHaveLength(1);
    // Nom sans profil, et profil à planningName vide : rien.
    expect(absencesEnConflit(GRILLE_CULTE, rows, ["2026-10-25"], [{ uid: "u-vide", planningName: "" }], [abs("u-vide", "2026-10-25", "2026-10-25")])).toEqual([]);
  });

  test("plannings du tableau : vides du prochain dimanche avec qui relancer, conflits sur 5 dimanches, plus tard", () => {
    const rows = {
      culte: [
        ligneCulte("2026-10-25", { 5: "" }),
        ligneCulte("2026-11-01", { 5: "Ysaline V." }),
        ligneCulte("2026-11-08", { 5: "", 7: "" }),
        ligneCulte("2026-11-15", { 5: "" }),
        ligneCulte("2026-11-22"),
      ],
    };
    const suivants = ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22"];
    const profils = [...tous.map((p) => ({ ...p, planningName: "" })), { uid: "u-ysa", firstName: "Ysaline", lastName: "V.", planningName: "Ysaline V.", referentSous: ["musiciens"] }];
    const r = planningsDuTableau(rows, ["culte", "inconnu"], "2026-10-25", suivants, profils, [abs("u-ysa", "2026-11-01", "2026-11-01")]);
    expect(r.vides).toHaveLength(1);
    expect(r.vides[0]).toMatchObject({ planning: "culte", date: "2026-10-25", colonne: { cle: "batterie" }, relancer: { uid: "u-mus" } });
    expect(r.conflits.map((c) => [c.date, c.nom])).toEqual([["2026-11-01", "Ysaline V."]]);
    expect(r.plusTard.jusquau).toBe("2026-11-22");
    expect(r.plusTard.nombre).toBe(3);
    expect(r.plusTard.parPlanning).toEqual([{ planning: "culte", colonnes: [{ cle: "batterie", i18n: i18nCulte("batterie"), n: 2 }, { cle: "ppt", i18n: i18nCulte("ppt"), n: 1 }] }]);
    expect(planningsDuTableau({}, [], "2026-10-25", [], [], []).plusTard).toEqual({ jusquau: "", nombre: 0, parPlanning: [] });
  });

  test("texte du rappel : l'exemple, 1er novembre, colonne inconnue, Table, EDD", () => {
    const lien = "https://exemple.test/back-office/planning/culte";
    expect(texteDuRappel({ prenom: "Corentin", planning: "culte", colonne: "batterie", date: "2026-10-25", lien }))
      .toBe("Salut Corentin, pour le culte de dimanche 25 octobre, il manque encore quelqu'un à la batterie. Tu peux t'en occuper d'ici samedi ? Merci ! " + lien);
    expect(texteDuRappel({ prenom: "Maëlys", planning: "intergroupe", colonne: "sonoLive", date: "2026-11-01", lien }))
      .toContain("pour le culte Intergroupe de dimanche 1er novembre, il manque encore quelqu'un à la sono live.");
    expect(texteDuRappel({ prenom: "Maëlys", planning: "culte", colonne: "lumiere", date: "2026-11-01", lien })).toContain("au poste « lumiere »");
    expect(texteDuRappel({ prenom: "Maëlys", planning: "table", colonne: "equipe", date: "2026-11-01", lien }))
      .toContain("pour la Table du Seigneur de dimanche 1er novembre, il manque encore quelqu'un pour l'équipe.");
    expect(texteDuRappel({ prenom: "Maëlys", planning: "eddDaban", colonne: "cours", date: "2026-11-01", lien })).toMatch(/pour le cours de l'EDD \(.+\) de dimanche/);
  });

  const evt = (x: Partial<Evenement>) => ({
    id: "e", titre: "E", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "", heureFin: "", dateFin: "", lienExterne: "",
    inscriptions: "ouvertes", inscriptionDebut: "", inscriptionFin: "", placesMax: null, inscrits: 0, expiresAt: null, organisateurUid: "autre", ...x,
  }) as Evenement;

  test("évènements : le sien (organisé, porté par mon équipe) et les autres", () => {
    expect(estSienEvenement({ organisateurUid: "moi", pour: "eglise" }, "moi", [])).toBe(true);
    expect(estSienEvenement({ organisateurUid: "x", pour: "equipe:da" }, "moi", ["da"])).toBe(true);
    expect(estSienEvenement({ organisateurUid: "x", pour: "equipe:da" }, "moi", ["louange"])).toBe(false);
    expect(estSienEvenement({ organisateurUid: "x", pour: "eglise" }, "moi", ["da"])).toBe(false);
  });

  test("évènements : ferme bientôt", () => {
    const maintenant = "2026-10-22T10:00";
    expect(fermeBientot(evt({ inscriptions: "auto", inscriptionFin: "2026-10-25" }), maintenant)).toBe(true);
    expect(fermeBientot(evt({ inscriptions: "auto", inscriptionFin: "2026-11-01" }), maintenant)).toBe(false);
    expect(fermeBientot(evt({ inscriptions: "fermees", date: "2026-10-23" }), maintenant)).toBe(false);
    expect(fermeBientot(evt({ lienExterne: "https://exemple.test/form", date: "2026-10-23" }), maintenant)).toBe(false);
    // « Ouvertes » forcées : la fin est le début de l'évènement.
    expect(fermeBientot(evt({ date: "2026-10-26", heure: "19:00" }), maintenant)).toBe(true);
    expect(fermeBientot(evt({ date: "2026-11-07" }), maintenant)).toBe(false);
    // Déjà terminée : plus d'inscription possible.
    expect(fermeBientot(evt({ inscriptions: "auto", inscriptionFin: "2026-10-20" }), maintenant)).toBe(false);
  });

  test("évènements : créneaux vides par date", () => {
    const c = (id: string, dimanche: string, qui: string[]) => ({ id, dimanche, qui }) as Creneau;
    const cr = [c("a", "2026-11-01", []), c("b", "2026-11-01", ["  "]), c("c", "2026-11-01", ["Gp Paix"]), c("d", "2026-11-08", []), c("e", "2026-10-25", [])];
    expect(creneauxVides({ date: "2026-11-01", dateFin: "" }, cr).map((x) => x.id)).toEqual(["a", "b"]);
    expect(creneauxVides({ date: "2026-11-01", dateFin: "2026-11-08" }, cr).map((x) => x.id)).toEqual(["a", "b", "d"]);
  });

  test("évènements du tableau : les siens d'abord, puis les autres, bornés, réunions exclues", () => {
    const moi = { uid: "uid-moi", email: "moi@example.com" };
    const p = { uid: "uid-moi", firstName: "Moi", lastName: "X", dansEquipes: ["da"] } as unknown as UserProfile;
    const tousEv = [
      evt({ id: "autre1", date: "2026-10-26" }),
      evt({ id: "sien", date: "2026-10-30", organisateurUid: "uid-moi" }),
      evt({ id: "equipe", date: "2026-11-02", pour: "equipe:da", reunion: false }),
      evt({ id: "reunion", date: "2026-10-27", pour: "equipe:da" }),
      evt({ id: "autre2", date: "2026-11-03" }),
    ];
    const r = evenementsDuTableau(tousEv, [], moi, p, "2026-10-22", {});
    expect(r.siens.map((x) => x.id)).toEqual(["sien", "equipe"]);
    expect(r.autres.map((x) => x.date)).toEqual(["2026-10-26"]);
    const grand = evenementsDuTableau(tousEv, [], moi, p, "2026-10-22", { nombre: 5 });
    expect(grand.siens).toHaveLength(2);
    expect(grand.autres).toHaveLength(2);
    expect(evenementsDuTableau(tousEv, [], moi, p, "2026-10-22", { nombre: 1 })).toMatchObject({ siens: [{ id: "sien" }], autres: [] });
  });

  test("tâches : en retard d'abord, puis les miennes, puis la date ; J+8 exclu ; retard compté en entier", () => {
    const t = (id: string, echeance: string, resp: string | null) =>
      ({ tache: { id, echeance, responsableUid: resp } as Tache, date: echeance, fois: null });
    const lignes = [
      t("futurAutre", "2026-10-23", "x"), t("futurMoi", "2026-10-25", "moi"), t("retardAutre", "2026-10-15", "x"),
      t("retardMoi", "2026-10-18", "moi"), t("futurMoiTot", "2026-10-22", "moi"), t("loin", "2026-10-30", "moi"),
    ];
    const r = tachesDuTableau(lignes, "moi", "2026-10-22");
    expect(r.lignes.map((l) => l.tache.id)).toEqual(["retardMoi", "retardAutre", "futurMoiTot", "futurMoi", "futurAutre"]);
    expect(r.lignes.map((l) => l.aMoi)).toEqual([true, false, true, true, false]);
    expect(r.enRetard).toBe(2);
    const bornes = tachesDuTableau(lignes, "moi", "2026-10-22", 2);
    expect(bornes.lignes).toHaveLength(2);
    expect(bornes.enRetard).toBe(2);
  });

  test("réunions : celles dont on est, à venir, triées, bornées ; précédente sans compte rendu", () => {
    const moi = { uid: "uid-moi", email: "moi@example.com" };
    const p = { uid: "uid-moi", firstName: "Moi", lastName: "X", dansEquipes: ["da"] } as unknown as UserProfile;
    const cr = { url: "https://exemple.test/cr", parUid: "x", parNom: "X", le: "2026-10-01T10:00:00Z" };
    const re = (id: string, date: string, pour: Evenement["pour"], x: Partial<Evenement> = {}) => evt({ id, date, pour, reunion: true, ...x });
    const tousEv = [
      re("passeSans", "2026-10-15", "equipe:da"),
      re("passeAvec", "2026-10-08", "equipe:evenementiel", { compteRendu: cr }),
      re("b", "2026-11-05", "equipe:da", { heure: "20:00" }),
      re("a", "2026-10-29", "equipe:da"),
      re("pasLaMienne", "2026-10-30", "equipe:louange"),
      re("evenementOrdinaire", "2026-10-31", "eglise"),
      re("c", "2026-11-12", "equipe:da"),
      re("d", "2026-11-19", "equipe:da"),
    ];
    const r = reunionsDuTableau(tousEv, moi, p, "2026-10-22T10:00");
    expect(r.map((x) => x.reunion.id)).toEqual(["a", "b", "c"]);
    expect(r[0].precedenteSansCompteRendu?.id).toBe("passeSans");
    expect(reunionsDuTableau(tousEv, moi, p, "2026-10-22T10:00", 1)).toHaveLength(1);
    const avec = [re("passeAvec2", "2026-10-15", "equipe:da", { compteRendu: cr }), re("a", "2026-10-29", "equipe:da")];
    expect(reunionsDuTableau(avec, moi, p, "2026-10-22T10:00")[0].precedenteSansCompteRendu).toBeNull();
    expect(sujetsOuverts([{ traite: false }, { traite: true }, { traite: false }])).toBe(2);
  });
});

// ─── Lot TB2, tranche TB2-b : les écrans (Ce dimanche, Plannings, Évènements, Tâches, Comptes) ─────────────────
// Jeu d'essai : jeudi 1er octobre 2026 10:00 (`ouvrir`) → prochain dimanche = 4 octobre. Personnes inventées pour ces tests.

test.describe("Tableau de bord v2 (TB2-b) : écrans", () => {
  const CORENTIN: Record<string, unknown> = {
    email: "corentin@example.com", firstName: "Corentin", lastName: "R.", planningName: "", serviceRoles: {}, annonces: [], notify: [],
    dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"],
  };
  const JEU: Record<string, Record<string, unknown>> = {
    "users/uid-corentin": CORENTIN,
    // Pers. B joue le 11 octobre (choriste 1 et traduction) et s'est déclarée absente ce jour-là.
    "users/uid-pers-b": { email: "b@example.com", firstName: "Pers", lastName: "B", planningName: "Pers. B", serviceRoles: {}, annonces: [], notify: [] },
    "users/uid-pers-b/absences/a1": { du: "2026-10-11", au: "2026-10-11", motif: "Motif secret" },
  };
  const RAPPEL = (origin: string) =>
    "Salut Corentin, pour le culte de dimanche 4 octobre, il manque encore quelqu'un à la batterie. "
    + `Tu peux t'en occuper d'ici samedi ? Merci ! ${origin}/back-office/planning/culte`;
  const caseBatterie = (page: Page) => widget(page, "Plannings").getByTestId("ligne-case-vide").filter({ hasText: "Batterie" });

  test("Plannings : la batterie du 4 octobre dit qui relancer, et le texte du rappel part dans le presse-papier", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await ouvrir(page, LOUANGE_ORGA, JEU);
    const ligne = caseBatterie(page);
    await expect(ligne).toContainText("Culte Franco · 4 oct. · Batterie");
    await expect(ligne).toContainText("à relancer : Corentin, référent Musiciens");
    // Les cases vides d'autres colonnes (ici aucune) n'ont pas de bouton sans référent : le PPT du 18 est « plus tard ».
    await expect(widget(page, "Plannings").getByTestId("ligne-case-vide")).toHaveCount(1);
    await ligne.getByRole("button", { name: "Copier le rappel" }).click();
    await expect(ligne.getByRole("button", { name: "Copié" })).toBeVisible();
    const origine = new URL(page.url()).origin;
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(RAPPEL(origine));
  });

  test("Plannings : sans accès au presse-papier, le texte s'affiche sélectionné", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("refusé")) } });
    });
    await ouvrir(page, LOUANGE_ORGA, JEU);
    const ligne = caseBatterie(page);
    await ligne.getByRole("button", { name: "Copier le rappel" }).click();
    await expect(ligne.getByText("Copie le texte ci-dessous.")).toBeVisible();
    const zone = ligne.getByRole("textbox");
    await expect(zone).toHaveValue(RAPPEL(new URL(page.url()).origin));
    await expect(zone).toBeFocused();
    expect(await zone.evaluate((z: HTMLTextAreaElement) => [z.selectionStart, z.selectionEnd, z.value.length])).toEqual([0, RAPPEL(new URL(page.url()).origin).length, RAPPEL(new URL(page.url()).origin).length]);
    await expect(ligne.getByRole("button", { name: "Copié" })).toHaveCount(0);
  });

  test("Plannings : sans référent, « aucun référent à relancer » et pas de bouton", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, {
      "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", ...CULTE_PLEIN, batterie: "", ppt: "" },
    });
    const w = widget(page, "Plannings");
    await expect(w.getByTestId("ligne-case-vide")).toHaveCount(2);
    const ppt = w.getByTestId("ligne-case-vide").filter({ hasText: "PPT" });
    await expect(ppt).toContainText("aucun référent à relancer");
    await expect(ppt.getByRole("button")).toHaveCount(0);
  });

  test("Plannings : une absence en conflit se remplace, sans jamais montrer le motif", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, JEU);
    const absences = widget(page, "Plannings").getByTestId("ligne-absence");
    // Pers. B tient deux postes ce jour-là (choriste 1 et traduction) : une rangée par poste.
    await expect(absences).toHaveCount(2);
    await expect(absences.first()).toContainText("Culte Franco · 11 oct. · Pers. B");
    await expect(absences.first()).toContainText("absence déclarée · prévu au poste");
    await expect(absences.first().getByRole("link", { name: "Remplacer" })).toHaveAttribute("href", /^\/back-office\/planning\/culte\/?$/);
    await expect(page.getByText("Motif secret")).toHaveCount(0);
    expect(await page.content()).not.toContain("Motif secret");
  });

  test("Plannings : « d'ici le 1er novembre », les cases vides des quatre dimanches suivants", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, JEU);
    const plusTard = widget(page, "Plannings").getByTestId("ligne-plus-tard");
    await expect(plusTard).toContainText("Cases vides d'ici le 1 nov.");
    await expect(plusTard).toContainText(/^3/);
    await expect(plusTard).toContainText(/Culte Franco : .*Guitare.*Batterie.*PPT/);
    await expect(plusTard.getByRole("link", { name: "Planning" })).toHaveAttribute("href", /^\/back-office\/planning\/culte\/?$/);
  });

  test("Plannings : tout est rempli, une ligne verte le dit", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, {
      "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", ...CULTE_PLEIN },
      "plannings/culte/dimanches/2026-10-11": { date: "2026-10-11", ...CULTE_PLEIN },
      "plannings/culte/dimanches/2026-10-18": { date: "2026-10-18", ...CULTE_PLEIN },
    });
    const w = widget(page, "Plannings");
    await expect(w.getByTestId("ligne-plus-tard")).toContainText("Rien à remplir d'ici le 1 nov.");
    await expect(w.getByTestId("ligne-case-vide")).toHaveCount(0);
    await expect(w.getByTestId("ligne-absence")).toHaveCount(0);
  });

  test("Ce dimanche : le Culte plein et publié est prêt (✓), un manque se compte", async ({ page }) => {
    await ouvrir(page, ADMIN, { "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", ...CULTE_PLEIN } });
    const culte = widget(page, "Ce dimanche").getByTestId("ligne-dimanche").filter({ hasText: "Culte Franco" });
    await expect(culte).toContainText("prêt");
    await expect(culte).not.toContainText("Batterie");
  });

  test("Ce dimanche : sans setlist publiée, « setlist » manque", async ({ page }) => {
    await ouvrir(page, ADMIN, { "setlists/s-04": { ...DOCS["setlists/s-04"], isDraft: true } });
    const culte = widget(page, "Ce dimanche").getByTestId("ligne-dimanche").filter({ hasText: "Culte Franco" });
    await expect(culte).toContainText("Batterie · setlist");
    await expect(culte).toContainText("2");
  });

  test("Évènements : celui que j'organise passe avant un plus proche, et dit qu'il ferme bientôt", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      // Le sien : le 18 octobre, inscriptions automatiques qui finissent le 4 (dans 3 jours), un créneau de scène sans personne ce jour-là.
      "evenements/e8": {
        titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-10-18", heure: "15:00", placesMax: 12, inscrits: 5,
        inscriptions: "auto", inscriptionFin: "2026-10-04", organisateurUid: "uid-alice",
      },
      "programmes/p1/creneaux/c3": { dimanche: "2026-10-18", debut: "16:00", fin: "17:00", quoi: "Danse", qui: [], note: "" },
    });
    const lignes = widget(page, "Évènements").getByTestId("ligne-evenement");
    await expect(lignes).toHaveText([/Atelier cuisine · dim\. 18\/10/, /Foot au parc/, /Repas de section/]);
    await expect(lignes.first()).toHaveAttribute("data-sien", "true");
    await expect(lignes.nth(1)).not.toHaveAttribute("data-sien", "true");
    await expect(lignes.first()).toContainText("les inscriptions ferment bientôt");
    await expect(lignes.first()).toContainText("5 / 12");
    await expect(lignes.first()).toContainText("scène");
    // Sans « ferme bientôt », les créneaux vides prennent la place du petit texte.
    await expect(lignes.nth(1)).toContainText("4 inscrits sur 10");
  });

  test("Évènements : les créneaux de scène vides, quand les inscriptions ne ferment pas bientôt", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "evenements/e8": {
        titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-10-18", heure: "15:00", placesMax: null, inscrits: 3,
        inscriptions: "ouvertes", organisateurUid: "uid-alice",
      },
      "programmes/p1/creneaux/c3": { dimanche: "2026-10-18", debut: "16:00", fin: "17:00", quoi: "Danse", qui: [], note: "" },
    });
    const sien = widget(page, "Évènements").getByTestId("ligne-evenement").first();
    await expect(sien).toContainText("Atelier cuisine");
    await expect(sien).toContainText("1 créneau de scène vide");
    await expect(sien).toContainText("3 inscrits");
    await expect(sien).toContainText("scène");
  });

  test("Tâches : la mienne passe avant celle de l'équipe à la même échéance, le retard reste en tête", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "equipes/evenementiel/taches/t4": { titre: "Brief des bénévoles", responsableUid: "uid-alice", responsableNom: "Alice", echeance: "2026-10-05", repetition: null },
    });
    const lignes = widget(page, "Tâches").getByTestId("ligne-tache");
    await expect(lignes).toHaveText([/Affiche de Noël/, /Brief des bénévoles/, /Réserver la salle/]);
    await expect(lignes.nth(0)).toHaveAttribute("data-a-moi", "false");
    await expect(lignes.nth(0)).toContainText("en retard depuis le 28/09");
    await expect(lignes.nth(1)).toHaveAttribute("data-a-moi", "true");
    await expect(lignes.nth(1)).toContainText("à toi");
    await expect(lignes.nth(1)).toContainText("pour le 05/10");
    await expect(lignes.nth(2)).toHaveAttribute("data-a-moi", "false");
    await expect(lignes.nth(2)).not.toContainText("à toi");
    await expect(widget(page, "Tâches").getByText("1 en retard")).toBeVisible();
  });

  test("Comptes : deux nombres côte à côte, et « Voir » mène aux noms sans compte", async ({ page }) => {
    await ouvrir(page, ADMIN, JEU);
    const comptes = widget(page, "Comptes");
    // Les noms du planning (grilles simulées et données statiques) sans compte : un nombre ; les comptes de la base simulée
    // datent de janvier : aucun nouveau cette semaine.
    await expect(comptes.getByTestId("compte-sans-compte")).toHaveText(/^[1-9]\d*\s*noms sans compte$/);
    await expect(comptes.getByTestId("compte-nouveaux")).toHaveText(/^0\s*nouveaux cette semaine$/);
    const a = (await comptes.getByTestId("compte-sans-compte").boundingBox())!;
    const b = (await comptes.getByTestId("compte-nouveaux").boundingBox())!;
    expect(Math.abs(a.y - b.y), "côte à côte").toBeLessThan(2);
    await expect(comptes.getByTestId("ligne-compte")).toHaveCount(0);
    await expect(comptes.getByRole("link", { name: "Voir" })).toHaveAttribute("href", /^\/back-office\/planning\/sans-compte\/?$/);
  });

  test("中文 : Plannings, Évènements, Tâches, « 复制提醒 », Ce dimanche", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ADMIN, JEU);
    for (const nom of ["排班表", "活动", "任务", "本主日"]) await expect(grille(page).getByRole("region", { name: nom, exact: true })).toBeVisible();
    const plannings = grille(page).getByRole("region", { name: "排班表", exact: true });
    await expect(plannings.getByRole("button", { name: "复制提醒" })).toBeVisible();
    await expect(plannings).toContainText("你负责的");
    await expect(plannings.getByTestId("ligne-absence").first().getByRole("link", { name: "替换" })).toBeVisible();
    await expect(plannings.getByTestId("ligne-plus-tard")).toContainText("截至");
    const dimanche = grille(page).getByRole("region", { name: "本主日", exact: true });
    await expect(dimanche).toContainText("一览");
    await expect(dimanche.getByRole("link", { name: "查看" }).first()).toBeVisible();
  });

  test("captures de la version 2 (à regarder)", async ({ page }, info) => {
    await ouvrir(page, ADMIN, {
      ...JEU,
      "equipes/evenementiel/taches/t4": { titre: "Brief des bénévoles", responsableUid: "uid-admin", responsableNom: "Admin", echeance: "2026-10-05", repetition: null },
      "evenements/e8": {
        titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-10-18", heure: "15:00", placesMax: 12, inscrits: 5,
        inscriptions: "auto", inscriptionFin: "2026-10-04", organisateurUid: "uid-admin",
      },
    });
    await expect(widget(page, "Plannings").getByTestId("ligne-plus-tard")).toBeVisible();
    await expect(widget(page, "Tâches").getByTestId("ligne-tache").first()).toBeVisible();
    await expect(widget(page, "Évènements").getByTestId("ligne-evenement").first()).toBeVisible();
    await expect(widget(page, "Comptes").getByTestId("compte-nouveaux")).toBeVisible();
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-v2.png`, fullPage: true });
  });
});

// ─── Lot TB2, tranche TB2-c : Réunions, disposition par défaut (T9), version du tableau (T10) ─────────────────
// Jeu d'essai : jeudi 1er octobre 2026 10:00 (`ouvrir`). Équipes et titres inventés pour ces tests.

test.describe("Tableau de bord v2 (TB2-c) : écrans", () => {
  const sujet = (texte: string, ordre: number, traite: boolean) => ({
    texte, auteurUid: "uid-alice", auteurNom: "Alice Q.", creeLe: "2026-09-25T10:00:00Z", ordre, traite, reprisDans: null, repriseDe: null,
  });
  const reunion = (titre: string, pour: string, date: string, x: Record<string, unknown> = {}) => ({
    titre, type: "eglise", pour, reunion: true, date, heure: "20:00", placesMax: null, inscrits: 0, ...x,
  });
  /** Une réunion de l'équipe d'Alice (2 sujets, 1 traité), la précédente sans compte rendu, une réunion d'une autre équipe. */
  const REUNIONS: Record<string, Record<string, unknown>> = {
    "evenements/e7": reunion("Ancienne réunion", "equipe:evenementiel", "2026-09-10", { compteRendu: { url: "https://exemple.test/cr", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-09-11T10:00:00Z" } }),
    "evenements/r0": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-09-24"),
    "evenements/r1": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-10-08"),
    "evenements/r1/sujets/s1": sujet("Affiche de la kermesse", 0, true),
    "evenements/r1/sujets/s2": sujet("Budget des tables", 1, false),
    "evenements/r2": reunion("Réunion des Veilleurs", "equipe:louange", "2026-10-09"),
  };

  test("Réunions : « 1 sujet », la précédente sans lien de compte rendu le dit, une autre équipe n'apparaît pas", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    const w = widget(page, "Réunions");
    const lignes = w.getByTestId("ligne-reunion");
    await expect(lignes).toHaveCount(1);
    await expect(lignes).toContainText("Point des Bâtisseurs");
    await expect(lignes).toContainText("1 sujet");
    await expect(lignes).not.toContainText("1 sujets");
    await expect(lignes).toContainText("compte rendu de la dernière : pas de lien");
    await expect(w.getByText("Veilleurs")).toHaveCount(0);
    await expect(lignes.first()).toHaveAttribute("href", /\/back-office\/reunions\/r1\/?$/);
    await expect(w.getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", /\/back-office\/reunions\/?$/);
  });

  test("Réunions : le compte rendu de la précédente est lié, la mention disparaît ; plusieurs sujets ouverts au pluriel", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      ...REUNIONS,
      "evenements/r0": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-09-24", {
        compteRendu: { url: "https://exemple.test/cr0", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-09-25T10:00:00Z" },
      }),
      "evenements/r1/sujets/s3": sujet("Salle de Noël", 2, false),
    });
    const ligne = widget(page, "Réunions").getByTestId("ligne-reunion");
    await expect(ligne).toContainText("2 sujets");
    await expect(ligne).not.toContainText("pas de lien");
  });

  test("Réunions : sujets illisibles, la réunion reste là sans nombre", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    await expect(widget(page, "Réunions").getByTestId("ligne-reunion")).toContainText("1 sujet");
    // Posée après la base simulée, cette route passe avant elle ; le rechargement relit tout.
    await page.route(/documents\/evenements\/r1:runQuery/, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) }));
    await page.reload();
    const ligne = widget(page, "Réunions").getByTestId("ligne-reunion");
    await expect(ligne).toContainText("Point des Bâtisseurs");
    await expect(ligne).not.toContainText("sujet");
    await expect(ligne).toContainText("pas de lien");
  });

  test("Réunions : aucune réunion à venir : message", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, { "evenements/e7": { ...REUNIONS["evenements/e7"] } });
    await expect(widget(page, "Réunions").getByText("Aucune réunion à venir.")).toBeVisible();
  });

  test("T9 : le défaut d'Alice (référente EDD) à l'écran, dans l'ordre, et le widget Réunions en S", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    await expect(widget(page, "Réunions")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["dimanche", "planning", "evenements", "afaire", "reunions"]);
  });

  test("T10 : une ancienne disposition (sans version, avec barre du bas) s'affiche au défaut ; le premier geste écrit la version 2 sans toucher à la barre", async ({ page }) => {
    const masques: string[][] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH" && /\/backOffice\//.test(r.url())) masques.push(new URL(r.url()).searchParams.getAll("updateMask.fieldPaths"));
    });
    const db = await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": {
        tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }, { id: "chants", taille: "m", reglages: {} }],
        barreDuBas: ["tableau", "calendrier", "taches", "reunions"],
        majLe: "2026-09-30T10:00:00Z",
      },
    });
    await expect(widget(page, "Ce dimanche")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(DEFAUT_T9);
    expect(db.writes.filter((w) => w.path === "backOffice/uid-admin"), "rien n'est écrit tant qu'on ne touche à rien").toHaveLength(0);

    await page.getByRole("button", { name: "Personnaliser" }).click();
    await widget(page, "Comptes").getByRole("button", { name: "Retirer le widget" }).click();
    await expect(widget(page, "Comptes")).toHaveCount(0);
    await expect.poll(() => idsEcrits(db, "uid-admin")).toEqual(["dimanche", "planning", "evenements", "afaire", "reunions"]);
    expect(ecrituresBO(db, "uid-admin").at(-1)!.data.versionTableau).toBe(2);
    expect(masques.at(-1)).toEqual(["tableauDeBord", "versionTableau", "majLe"]);
    expect(masques.flat()).not.toContain("barreDuBas");
    expect(db.doc("backOffice/uid-admin")!.barreDuBas).toEqual(["tableau", "calendrier", "taches", "reunions"]);
  });

  test("T10 : une disposition de la version 2 est la sienne, et ne sera plus remplacée", async ({ page }) => {
    await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }, { id: "chants", taille: "m", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["scene", "chants"]);
  });

  test("T10 : « Disposition par défaut » écrit aussi la version 2 (sans la disposition)", async ({ page }) => {
    const db = await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], versionTableau: 2, barreDuBas: ["tableau", "calendrier", "taches", "reunions"], majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await page.getByRole("button", { name: "Disposition par défaut" }).click();
    await repondreDansLeSite(page, "Remettre par défaut");
    await expect.poll(() => widgetsAffiches(page)).toEqual(DEFAUT_T9);
    await expect.poll(() => ecrituresBO(db, "uid-admin").length).toBe(1);
    expect(db.doc("backOffice/uid-admin")!.tableauDeBord).toBeUndefined();
    expect(db.doc("backOffice/uid-admin")!.versionTableau).toBe(2);
    expect(db.doc("backOffice/uid-admin")!.barreDuBas).toEqual(["tableau", "calendrier", "taches", "reunions"]);
  });

  test("Personnaliser : le catalogue de l'admin offre Setlists, Petit déj, Scène, Calendrier, Chants, Raccourcis", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Comptes")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await expect(catalogueDe(page).getByRole("button")).toHaveText([
      "Calendrier", "Setlists à préparer", "Chants les plus joués", "Petit déj", "Raccourcis", "Scène",
    ]);
  });

  test("中文 : Réunions « 会议 », « 上次会议：未附纪要链接 » et « 个议题 »", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    const w = grille(page).getByRole("region", { name: "会议" });
    await expect(w.getByTestId("ligne-reunion")).toContainText("1 个议题");
    await expect(w.getByTestId("ligne-reunion")).toContainText("上次会议：未附纪要链接");
  });
});
