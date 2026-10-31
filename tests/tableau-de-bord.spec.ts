import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { referentLouange, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
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
    // Sans l'entrée Évènements, plus le widget des évènements (TB2-corrections : Réunions ne le permet plus).
    expect(ids(dispositionParDefaut(user(LOUANGE), profil(LOUANGE)))).toEqual(["dimanche", "planning", "afaire", "reunions"]);
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
    // lot RS, RS-D : Sono, Sono Live et PPT ne sont plus attribuées à la Régie, elles suivent le cas général (Louange).
    expect(quiRelancer("culte", "ppt", tous)).toMatchObject({ uid: "u-lou", equipe: "louange" });
    expect(quiRelancer("eddDaban", "cours", tous)).toMatchObject({ uid: "u-edd", equipe: "edd" });
    expect(quiRelancer("culte", "orateur", tous)).toMatchObject({ uid: "u-lou" });
  });

  test("qui relancer : planning de groupe, aucun référent, deux référents", () => {
    expect(equipeDeLaColonne("paix", "presidence")).toBeNull();
    expect(quiRelancer("paix", "presidence", tous)).toBeNull();
    // lot RS, RS-D : sans colonne Régie, le référent Louange est relancé pour PPT ; un seul référent Régie ne l'est plus.
    expect(quiRelancer("culte", "ppt", [REFERENTS.louange])).toMatchObject({ uid: "u-lou" });
    expect(quiRelancer("culte", "ppt", [REFERENTS.regie])).toBeNull();
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

// ═══ Piste A, BO-B : les écrans du tableau de bord sont devenus À faire ═══════════════════════════════════════════
// Les widgets, « Personnaliser » et la grille ont disparu de /back-office (docs/spec-back-office-piste-a.md, BO6) ; les
// fonctions de données ci-dessus restent. Chaque test d'écran d'avant est repris ici par son équivalent sur À faire
// (Plannings → « Remplir » avec qui relancer, Tâches → ordre et retard, Évènements → « Voir les inscrits » et « Attribuer »,
// Réunions → « Écrire le compte rendu », Comptes → « Relier », Ce dimanche → la colonne de droite, Personnaliser → absent).
// Jeu d'essai : jeudi 1er octobre 2026 10:00 (`ouvrir`) → prochain dimanche = 4 octobre. Personnes inventées pour ces tests.

const lignes = (page: Page) => page.getByTestId("ligne-a-faire");
const ligne = (page: Page, texte: string | RegExp) => lignes(page).filter({ hasText: texte });
const verbe = (l: Locator, nom: string) => l.getByRole("link", { name: new RegExp(`^${nom}`) });
const barreMontree = (page: Page) => page.evaluate(() =>
  window.matchMedia("(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)").matches);
const WIDGETS_DISPARUS = ["Ce dimanche", "Plannings", "Tâches", "Évènements", "Réunions", "Comptes", "Scène", "Calendrier", "Setlists à préparer", "Petit déj", "Raccourcis"];
async function sansWidgets(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
  await expect(page.getByTestId("grille-widgets")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Personnaliser|Terminé/ })).toHaveCount(0);
  for (const nom of WIDGETS_DISPARUS) await expect(page.getByRole("region", { name: nom, exact: true })).toHaveCount(0);
}

test.describe("À faire (BO-B) : équivalents des écrans du tableau de bord (B4)", () => {
  test("admin sans disposition enregistrée : À faire, aucun widget (les six du défaut ont disparu)", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await sansWidgets(page);
  });

  test("Ce dimanche : le Culte du 4 octobre manque la batterie (ligne « Remplir »), les autres cases sont dans la colonne de droite (grand écran)", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(verbe(ligne(page, "Culte Franco : Batterie"), "Remplir")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    const colonne = page.getByTestId("colonne-droite");
    if (!(await barreMontree(page))) {
      await expect(colonne).toHaveCount(0);
      return;
    }
    await expect(colonne.getByRole("heading", { name: "Ce dimanche, 4 octobre" })).toBeVisible();
    const culte = colonne.getByTestId("service-dimanche").filter({ hasText: "Culte Franco" });
    await expect(culte).toContainText("10:30");
    await expect(culte).toContainText("Présidence Pers. A");
    await expect(culte).not.toContainText("Batterie");
  });

  test("Ce dimanche : sans réglage de services, le Culte Franco par défaut (le réglage de services n'existe plus)", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Réglages du widget/ })).toHaveCount(0);
    if (await barreMontree(page)) {
      await expect(page.getByTestId("colonne-droite").getByTestId("service-dimanche")).toHaveCount(1);
      await expect(page.getByTestId("colonne-droite").getByTestId("service-dimanche")).toContainText("Culte Franco");
    }
  });

  test("Alice (pôle Événement, référente EDD) : ses tâches (en retard d'abord), pas celles de DA ; pas de Comptes", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByTestId("groupe-enRetard").getByTestId("ligne-a-faire")).toHaveText([/Affiche de Noël/]);
    await expect(page.getByTestId("groupe-semaine").getByTestId("ligne-a-faire")).toHaveText([/Réserver la salle/]);
    // BO16 (c) (docs/spec-back-office-piste-a.md) : « Fait » mène à la tâche.
    await expect(verbe(ligne(page, "Affiche de Noël"), "Fait")).toHaveAttribute("href", /\/back-office\/taches\/evenementiel\/[^/]+\/?$/);
    await expect(page.getByText("Fond du culte")).toHaveCount(0);
    await expect(page.getByText("Noms du planning sans compte")).toHaveCount(0);
    await expect(page.getByText("Messages à lire")).toHaveCount(0);
  });

  test("louange : les cases vides du Culte en « Remplir » ; plus de Setlists à préparer", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA);
    const cette = ligne(page, "Dimanche 4 octobre");
    await expect(cette).toContainText("Culte Franco : Batterie");
    await expect(verbe(cette, "Remplir")).toBeVisible();
    // Les suivants (11, 18 octobre) : une ligne « plus tard ».
    await expect(page.getByTestId("groupe-plusTard").getByTestId("ligne-a-faire")).toContainText(/Guitare.*PPT|PPT.*Guitare/);
    await expect(page.getByRole("region", { name: "Setlists à préparer", exact: true })).toHaveCount(0);
    await expect(page.getByTestId("ligne-setlist")).toHaveCount(0);
  });

  test("admin : « Relier » pour les noms sans compte ; ni petit déj ni raccourcis", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const comptes = ligne(page, "Noms du planning sans compte");
    await expect(comptes).toContainText("noms à relier à un compte");
    await expect(verbe(comptes, "Relier")).toHaveAttribute("href", /\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(page.getByTestId("compte-sans-compte")).toHaveCount(0);
    await expect(page.getByTestId("compte-nouveaux")).toHaveCount(0);
    for (const nom of ["Petit déj", "Raccourcis"]) await expect(page.getByRole("region", { name: nom, exact: true })).toHaveCount(0);
  });

  test("une disposition enregistrée (ordre, tailles, réglages) n'a plus d'effet", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": {
        tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }, { id: "evenements", taille: "s", reglages: { nombre: 10 } }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z",
      },
    });
    await expect(lignes(page).first()).toBeVisible();
    await sansWidgets(page);
  });

  test("setlists illisibles : ni « Lecture impossible » ni « Pas de setlist » (À faire ne les lit pas) ; la liste est là", async ({ page }) => {
    await page.route(/documents\/setlists/, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) }));
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByText("Lecture impossible")).toHaveCount(0);
    await expect(page.getByText("Pas de setlist")).toHaveCount(0);
  });

  test("un widget réservé aux admins enregistré par Alice ne s'affiche pas, et ses lignes non plus", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "comptes", taille: "s", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Comptes", exact: true })).toHaveCount(0);
    await expect(page.getByText("Noms du planning sans compte")).toHaveCount(0);
  });

  test("captures d'À faire (à regarder)", async ({ page }, info) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-admin.png`, fullPage: true, animations: "disabled" });
  });

  test("中文 : les groupes et les verbes (à la place des titres de widgets)", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE_ORGA);
    await expect(page.getByRole("heading", { level: 2, name: "已逾期" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^完成/ }).first()).toBeVisible();
    for (const nom of ["本主日", "任务", "会议"]) await expect(page.getByRole("region", { name: nom, exact: true })).toHaveCount(0);
  });
});

test.describe("À faire (BO-B) : équivalents de Personnaliser (B5) : plus de personnalisation", () => {
  test("ni « Personnaliser », ni « Ajouter un widget », ni « Disposition par défaut », ni poignée, ni S / M / L ; rien n'est écrit", async ({ page }) => {
    const db = await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": { tableauDeBord: ALICE_ORGA_DEFAUT.map((id) => ({ id, taille: "m", reglages: {} })), versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Personnaliser" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Ajouter un widget" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disposition par défaut" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Monter|Descendre|Retirer le widget|Réglages du widget/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "L", exact: true })).toHaveCount(0);
    expect(ecrituresBO(db, "uid-alice")).toEqual([]);
  });

  test("le catalogue d'un admin n'offre plus Setlists, Petit déj, Scène, Calendrier, Chants, Raccourcis", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    for (const nom of ["Setlists à préparer", "Petit déj", "Scène", "Calendrier", "Chants les plus joués", "Raccourcis"]) {
      await expect(page.getByRole("button", { name: nom, exact: true })).toHaveCount(0);
    }
  });

  test("中文 : pas de « 自定义 » ni de catalogue", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /自定义|个性化/ })).toHaveCount(0);
  });
});

test.describe("À faire (BO-B) : équivalents de Tableau de bord v2 (TB2-b)", () => {
  const CORENTIN: Record<string, unknown> = {
    email: "corentin@example.com", firstName: "Corentin", lastName: "R.", planningName: "", serviceRoles: {}, annonces: [], notify: [],
    dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"],
  };
  const JEU: Record<string, Record<string, unknown>> = {
    "users/uid-corentin": CORENTIN,
    // Pers. B joue le 11 octobre et s'est déclarée absente ce jour-là : le motif ne se montre jamais.
    "users/uid-pers-b": { email: "b@example.com", firstName: "Pers", lastName: "B", planningName: "Pers. B", serviceRoles: {}, annonces: [], notify: [] },
    "users/uid-pers-b/absences/a1": { du: "2026-10-11", au: "2026-10-11", motif: "Motif secret" },
  };

  test("Plannings : la batterie du 4 octobre dit qui relancer, et « Remplir » mène au planning du Culte", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, JEU);
    const cette = ligne(page, "Dimanche 4 octobre");
    await expect(cette).toContainText("Culte Franco : Batterie");
    await expect(cette).toContainText("à relancer : Corentin");
    await expect(verbe(cette, "Remplir")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    // Une seule ligne pour le prochain dimanche : les autres cases sont « plus tard ».
    await expect(page.getByTestId("groupe-semaine").getByTestId("ligne-a-faire").filter({ hasText: "Culte Franco" })).toHaveCount(1);
  });

  test("Plannings : sans référent, « aucun référent à relancer »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(ligne(page, "Dimanche 4 octobre")).toContainText("aucun référent à relancer");
  });

  // BO13 (docs/spec-back-office-piste-a.md, 26/10/2026) : l'absence en conflit revient dans « À faire », une ligne
  // par poste tenu (Pers. B chante et traduit), « Remplacer » vers le planning ; le motif, jamais.
  test("Plannings : une absence déclarée fait une ligne « Remplacer » par poste, et le motif n'apparaît jamais", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA, JEU);
    await expect(lignes(page).first()).toBeVisible();
    const absences = lignes(page).filter({ hasText: "Pers. B est absent·e" });
    await expect(absences).toHaveCount(2);
    for (const l of await absences.all()) await expect(verbe(l, "Remplacer")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    await expect(page.getByText("Motif secret")).toHaveCount(0);
  });

  test("Plannings : « jusqu'au 1er novembre », les cases vides des quatre dimanches suivants en une ligne « plus tard »", async ({ page }) => {
    await ouvrir(page, LOUANGE_ORGA);
    const plus = page.getByTestId("groupe-plusTard").getByTestId("ligne-a-faire");
    await expect(plus).toHaveCount(1);
    await expect(plus).toContainText("Jusqu'au 1er novembre");
    await expect(verbe(plus, "Remplir")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
  });

  test("Plannings : tout est rempli, aucune ligne de cases (« Rien à faire »)", async ({ page }) => {
    const plein = { presidence: "Pers. A", choriste1: "Pers. B", choriste2: "Pers. C", piano: "Pers. D", guitare: "Pers. E", batterie: "Pers. F", sono: "Pers. G", ppt: "Pers. H", orateur: "Pers. I", traduction: "Pers. B" };
    await ouvrir(page, LOUANGE_ORGA, {
      "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", ...plein },
      "plannings/culte/dimanches/2026-10-11": { date: "2026-10-11", ...plein },
      "plannings/culte/dimanches/2026-10-18": { date: "2026-10-18", ...plein },
      "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...plein },
    });
    await expect(page.getByRole("status").filter({ hasText: "Rien à faire pour l'instant." })).toBeVisible();
    await expect(ligne(page, "Culte Franco")).toHaveCount(0);
  });

  test("Ce dimanche : le Culte plein et publié, sans manque (grand écran), sans setlist sur la colonne : plus de « manque »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    // Les manques de setlist ou de présentation ne sont plus comptés : À faire ne parle que de cases à remplir.
    await expect(page.getByText(/setlist manque|présentation manque/i)).toHaveCount(0);
  });

  test("Évènements : celui que j'organise donne « Voir les inscrits » (il ferme bientôt) et « Attribuer » (scène), avant un plus lointain", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      // Le sien : le 18 octobre, inscriptions automatiques qui finissent le 4 (dans 3 jours), un créneau de scène sans personne ce jour-là.
      "evenements/e8": {
        titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-10-18", heure: "15:00", placesMax: 12, inscrits: 5,
        inscriptions: "auto", inscriptionFin: "2026-10-04", organisateurUid: "uid-alice",
      },
      "programmes/p1/creneaux/c3": { dimanche: "2026-10-18", debut: "16:00", fin: "17:00", quoi: "Danse", qui: [], note: "" },
    });
    const inscrits = ligne(page, "Atelier cuisine : les inscriptions");
    await expect(inscrits).toContainText("5 inscrits sur 12 places");
    await expect(verbe(inscrits, "Voir les inscrits")).toHaveAttribute("href", /\/back-office\/evenements\/e8\/?$/);
    const scene = ligne(page, "Scène : Atelier cuisine");
    await expect(scene).toContainText("1 passage sans personne, dès le 18 octobre");
    await expect(verbe(scene, "Attribuer")).toHaveAttribute("href", /\/back-office\/evenements\/scene\/?$/);
    // Ceux des autres (Foot au parc, Repas de section) n'y sont plus : À faire ne liste que ce qui demande une action.
    await expect(page.getByText("Foot au parc")).toHaveCount(0);
    await expect(inscrits).toHaveAttribute("data-a-moi", "true");
  });

  test("Évènements : les passages de scène vides, quand les inscriptions ne ferment pas bientôt : « Attribuer » seul", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "evenements/e8": {
        titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-10-18", heure: "15:00", placesMax: null, inscrits: 3,
        inscriptions: "fermees", organisateurUid: "uid-alice",
      },
      "programmes/p1/creneaux/c3": { dimanche: "2026-10-18", debut: "16:00", fin: "17:00", quoi: "Danse", qui: [], note: "" },
    });
    await expect(ligne(page, "Scène : Atelier cuisine")).toBeVisible();
    await expect(ligne(page, "les inscriptions ferment bientôt")).toHaveCount(0);
  });

  test("Tâches : la mienne passe avant celle de l'équipe à la même échéance, le retard reste en tête", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      "equipes/evenementiel/taches/t4": { titre: "Brief des bénévoles", responsableUid: "uid-alice", responsableNom: "Alice", echeance: "2026-10-05", repetition: null },
    });
    await expect(lignes(page).filter({ hasText: /Affiche de Noël|Brief des bénévoles|Réserver la salle/ })).toHaveText([/Affiche de Noël/, /Brief des bénévoles/, /Réserver la salle/]);
    const retard = ligne(page, "Affiche de Noël");
    await expect(retard).toHaveAttribute("data-a-moi", "false");
    await expect(retard).toContainText("en retard depuis le 28/09");
    const brief = ligne(page, "Brief des bénévoles");
    await expect(brief).toHaveAttribute("data-a-moi", "true");
    await expect(brief).toContainText("À toi");
    await expect(brief).toContainText("pour le 05/10");
    await expect(ligne(page, "Réserver la salle")).toHaveAttribute("data-a-moi", "false");
    await expect(ligne(page, "Réserver la salle")).not.toContainText("À toi");
  });

  test("Comptes : « Relier » mène aux noms sans compte", async ({ page }) => {
    await ouvrir(page, ADMIN, JEU);
    const comptes = ligne(page, "Noms du planning sans compte");
    await expect(verbe(comptes, "Relier")).toHaveAttribute("href", /\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(comptes).toHaveAttribute("data-sorte", "comptes");
    // Piste A (BO7) : « Relier » arrive sur la sous-page « Noms du planning sans compte » de Équipes › Personnes.
    await verbe(comptes, "Relier").click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/sans-compte\/?$/);
    await expect(page.getByRole("heading", { level: 2, name: "Noms du planning sans compte" })).toBeVisible();
  });

  test("中文 : Plannings, Évènements, Tâches, Comptes : les verbes sont traduits", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ADMIN);
    await expect(page.getByRole("link", { name: /^填写/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^完成/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^关联/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "复制提醒" })).toHaveCount(0);
  });
});

test.describe("À faire (BO-B) : équivalents de Tableau de bord v2 (TB2-c)", () => {
  const reunion = (titre: string, pour: string, date: string, x: Record<string, unknown> = {}) => ({
    titre, type: "eglise", pour, reunion: true, date, heure: "20:00", placesMax: null, inscrits: 0, ...x,
  });
  /** Une réunion de l'équipe d'Alice, la précédente sans compte rendu, une réunion d'une autre équipe. */
  const REUNIONS: Record<string, Record<string, unknown>> = {
    "evenements/e7": reunion("Ancienne réunion", "equipe:evenementiel", "2026-09-10", { compteRendu: { url: "https://exemple.test/cr", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-09-11T10:00:00Z" } }),
    "evenements/r0": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-09-24"),
    "evenements/r1": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-10-08"),
    "evenements/r2": reunion("Réunion des Veilleurs", "equipe:louange", "2026-10-09"),
  };

  test("Réunions : la précédente sans lien de compte rendu donne « Écrire le compte rendu » (en retard), une autre équipe n'apparaît pas", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    const cr = ligne(page, "Compte rendu : Point des Bâtisseurs");
    await expect(cr).toHaveCount(1);
    await expect(cr).toContainText("Réunion du 24 septembre, sans lien de compte rendu");
    await expect(page.getByTestId("groupe-enRetard").getByTestId("ligne-a-faire").filter({ hasText: "Compte rendu" })).toHaveCount(1);
    await expect(verbe(cr, "Écrire le compte rendu")).toHaveAttribute("href", /\/back-office\/reunions\/r0\/?$/);
    await expect(page.getByText("Veilleurs")).toHaveCount(0);
  });

  test("Réunions : la prochaine est dans la colonne de droite (grand écran), liée à sa fiche", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    await expect(lignes(page).first()).toBeVisible();
    if (!(await barreMontree(page))) {
      await expect(page.getByText("Prochaine réunion")).toHaveCount(0);
      return;
    }
    const lien = page.getByTestId("colonne-droite").getByRole("link", { name: /Point des Bâtisseurs/ });
    await expect(lien).toContainText("Jeudi 8 octobre, 20:00");
    await expect(lien).toHaveAttribute("href", /\/back-office\/reunions\/r1\/?$/);
  });

  test("Réunions : le compte rendu de la précédente est lié, la ligne disparaît", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, {
      ...REUNIONS,
      "evenements/r0": reunion("Point des Bâtisseurs", "equipe:evenementiel", "2026-09-24", {
        compteRendu: { url: "https://exemple.test/cr0", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-09-25T10:00:00Z" },
      }),
    });
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByText("Compte rendu : Point des Bâtisseurs")).toHaveCount(0);
  });

  test("Réunions : des sujets illisibles ne changent rien (À faire ne les lit pas) : la ligne reste", async ({ page }) => {
    await page.route(/documents\/evenements\/r1:runQuery/, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) }));
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    await expect(ligne(page, "Compte rendu : Point des Bâtisseurs")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Une partie" })).toHaveCount(0);
  });

  test("Réunions : aucune réunion à venir ni sans compte rendu : aucune ligne, aucun bloc « Prochaine réunion »", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, { "evenements/e7": { ...REUNIONS["evenements/e7"] } });
    await expect(lignes(page).filter({ hasText: "Compte rendu" })).toHaveCount(0);
    await expect(page.getByText("Prochaine réunion")).toHaveCount(0);
  });

  test("T9 : le défaut d'Alice (référente EDD) est À faire, et ses lignes dans l'ordre : retard, semaine", async ({ page }) => {
    await ouvrir(page, ALICE_ORGA, REUNIONS);
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /^(En retard|Cette semaine|Plus tard|À lire ou à relier)$/ }).first()).toHaveText("En retard");
    await sansWidgets(page);
  });

  test("T10 : une ancienne disposition (sans version, avec barre du bas) est ignorée, et rien n'est écrit", async ({ page }) => {
    const masques: string[][] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH" && /\/backOffice\//.test(r.url())) masques.push(new URL(r.url()).searchParams.getAll("updateMask.fieldPaths"));
    });
    await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": {
        tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], barreDuBas: ["afaire", "calendrier"], majLe: "2026-09-30T10:00:00Z",
      },
    });
    await expect(lignes(page).first()).toBeVisible();
    await sansWidgets(page);
    expect(masques).toEqual([]);
  });

  test("T10 : une disposition de la version 2 est la sienne, mais n'est ni lue ni remplacée par À faire", async ({ page }) => {
    const db = await ouvrir(page, ALICE_ORGA, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(lignes(page).first()).toBeVisible();
    expect(ecrituresBO(db, "uid-alice")).toEqual([]);
    expect(db.doc("backOffice/uid-alice")!.tableauDeBord).toBeDefined();
  });
});
