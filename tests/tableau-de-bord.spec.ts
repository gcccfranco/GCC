import { expect, test, type BrowserContextOptions, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import {
  ajouterWidget, catalogue, changerReglages, changerTaille, deplacerWidget, dispositionAffichee, dispositionParDefaut, retirerWidget,
} from "../src/lib/tableauDeBord/disposition";
import { choisirReglage, groupesDeReglages } from "../src/lib/tableauDeBord/reglages";
import {
  aFaireDuTableau, ceDimanche, creneauxAVenir, etatInscriptions, evenementsAVenir, nomsSansCompte, nouveauxComptes,
  petitDejAVenir, polesAFaire, prochainsDimanches, raccourcisPermis, seancesDesServices, servicesDuDimanche, servicesSetlists,
} from "../src/lib/tableauDeBord/donnees";
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
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
/** Louange : un rôle de service et le droit de remplir le Culte. */
const LOUANGE: FakeProfile = {
  uid: "uid-louange", email: "louange@example.com", firstName: "Lou", lastName: "P.", planningName: "Pers. D",
  serviceRoles: { "Culte Francophone": ["musicien"] }, plannings: ["culte"],
};
const DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };
const LES_DEUX: FakeProfile = {
  uid: "uid-deux", email: "deux@example.com", poles: ["evenement"],
  serviceRoles: { "Culte Francophone": ["musicien"] }, plannings: ["culte"],
};
const ANNONCES: FakeProfile = { uid: "uid-an", email: "an@example.com", annonces: ["Culte Francophone"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], poles: p.poles ?? [],
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
  // Tâches : une en retard et une à venir au pôle Événement, une au pôle DA.
  "poles/evenement/taches/t1": { titre: "Affiche de Noël", responsableUid: null, responsableNom: "", echeance: "2026-09-28", repetition: null },
  "poles/evenement/taches/t2": { titre: "Réserver la salle", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null },
  "poles/da/taches/t3": { titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-02", repetition: null },
  // Évènements : cinq à venir, un passé, une réunion (jamais dans ce widget).
  "evenements/e1": { titre: "Foot au parc", type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", placesMax: 10, inscrits: 4, inscriptions: "ouvertes" },
  "evenements/e2": { titre: "Repas de section", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "12:00", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e3": { titre: "Sortie d'automne", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "", placesMax: null, inscrits: 2, inscriptions: "ouvertes" },
  "evenements/e4": { titre: "Pique-nique", type: "loisir", pour: "eglise", date: "2026-11-21", heure: "", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e5": { titre: "Culte de fête", type: "eglise", pour: "eglise", date: "2026-12-24", heure: "18:00", placesMax: null, inscrits: 0, inscriptions: "fermees" },
  "evenements/e6": { titre: "Brocante passée", type: "loisir", pour: "eglise", date: "2026-09-20", heure: "", placesMax: null, inscrits: 0, inscriptions: "ouvertes" },
  "evenements/e7": { titre: "Réunion du pôle", type: "eglise", pour: "pole:evenement", date: "2026-10-03", heure: "20:00", placesMax: null, inscrits: 0 },
  // Scène : le programme affiché et deux créneaux à venir, un passé.
  "programmes/p1": { nom: "Noël", jourJ: "2026-12-20", debut: "2026-09-27", visible: true, passages: [], createdBy: "uid-alice", updatedAt: "" },
  "programmes/p1/creneaux/c0": { dimanche: "2026-09-27", debut: "15:00", fin: "16:00", quoi: "Danse", qui: ["Gp Paix"], note: "" },
  "programmes/p1/creneaux/c1": { dimanche: "2026-10-04", debut: "17:00", fin: "18:00", quoi: "Chant", qui: ["EDD 中班"], note: "" },
  "programmes/p1/creneaux/c2": { dimanche: "2026-10-11", debut: "14:00", fin: "15:00", quoi: "Sketch", qui: ["Franco"], note: "" },
  // Un compte relié à « Pers. A » : les autres noms du planning sont sans compte.
  "users/uid-pers-a": { email: "a@example.com", firstName: "Pers", lastName: "A", planningName: "Pers. A", serviceRoles: {}, annonces: [], notify: [], poles: [] },
};

/** Le Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sansSheet(page);
  return signInAs(page, qui, { ...DOCS, ...docs }, "/back-office");
}

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

test.describe("Tableau de bord (B4) : disposition par défaut selon le rôle (Q11)", () => {
  test("admin : tous les widgets permis, dans l'ordre de la planche (Calendrier depuis U8 C8 ; Chants les plus joués : U7, S5)", () => {
    const d = dispositionParDefaut(user(ADMIN), null);
    expect(ids(d)).toEqual(["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "raccourcis", "scene", "comptes"]);
    expect(d.map((w) => w.taille)).toEqual(["m", "m", "m", "s", "s", "m", "m", "s", "s", "s", "s"]);
    expect(d.every((w) => Object.keys(w.reglages).length === 0)).toBe(true);
  });

  test("évènement (pôle Événement) : Ce dimanche, À faire, Prochains évènements, Scène", () => {
    expect(ids(dispositionParDefaut(user(ALICE), profil(ALICE)))).toEqual(["dimanche", "afaire", "evenements", "scene"]);
  });

  test("évènement par le droit d'annonces, sans pôle : À faire n'est pas permis", () => {
    expect(ids(dispositionParDefaut(user(ANNONCES), profil(ANNONCES)))).toEqual(["dimanche", "evenements", "scene"]);
  });

  test("louange (rôle de service, plannings) : Ce dimanche, À faire, Setlists, Cases vides", () => {
    const d = dispositionParDefaut(user(LOUANGE), profil(LOUANGE));
    expect(ids(d)).toEqual(["dimanche", "afaire", "setlists", "planning"]);
    expect(d.map((w) => w.taille)).toEqual(["m", "m", "s", "s"]);
  });

  test("les deux : l'union, dans l'ordre de la planche", () => {
    expect(ids(dispositionParDefaut(user(LES_DEUX), profil(LES_DEUX))))
      .toEqual(["dimanche", "afaire", "setlists", "planning", "evenements", "scene"]);
  });

  test("pôle DA seul : Ce dimanche et À faire ; un non-responsable : rien", () => {
    expect(ids(dispositionParDefaut(user(DA), profil(DA)))).toEqual(["dimanche", "afaire"]);
    const choriste: FakeProfile = { uid: "uid-ch", email: "ch@example.com", serviceRoles: { "Culte Francophone": ["chanteur"] } };
    expect(dispositionParDefaut(user(choriste), profil(choriste))).toEqual([]);
  });
});

test.describe("Tableau de bord (B4) : disposition enregistrée (backOffice/{uid}, Q5)", () => {
  test("absente : le défaut du rôle, recalculé", () => {
    expect(dispositionAffichee(null, user(DA), profil(DA))).toEqual(dispositionParDefaut(user(DA), profil(DA)));
    expect(dispositionAffichee({ majLe: "2026-10-01" }, user(DA), profil(DA))).toEqual(dispositionParDefaut(user(DA), profil(DA)));
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
      majLe: "2026-10-01",
    }, user(ALICE), profil(ALICE));
    expect(d).toEqual([
      { id: "evenements", taille: "l", reglages: { nombre: 5 } },
      { id: "dimanche", taille: "m", reglages: {} },
    ]);
  });

  test("tout retiré : un tableau vide reste vide (ce n'est pas l'absence)", () => {
    expect(dispositionAffichee({ tableauDeBord: [], majLe: "2026-10-01" }, user(ALICE), profil(ALICE))).toEqual([]);
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

  test("à faire : pôles (tous pour un admin), en retard d'abord, sept jours d'avance", () => {
    expect(polesAFaire({}, user(ADMIN), null)).toEqual(["da", "media", "orga", "louange", "evenement"]);
    expect(polesAFaire({}, user(LES_DEUX), profil(LES_DEUX))).toEqual(["evenement", "louange"]);
    expect(polesAFaire({ poles: ["louange", "da"] }, user(LES_DEUX), profil(LES_DEUX))).toEqual(["louange"]);
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
    const tous = [e("passe", "2026-09-20"), e("b", "2026-10-17"), e("a", "2026-10-10"), e("reunion", "2026-10-03", "pole:evenement"),
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
    expect(raccourcisPermis(user(LOUANGE), profil(LOUANGE), {}).map((r) => r.id)).toEqual(["tache", "evenement", "setlist"]);
    // Réglage : seulement ceux choisis, et jamais un raccourci non permis.
    expect(raccourcisPermis(user(ALICE), profil(ALICE), { raccourcis: ["evenement", "notifier"] }).map((r) => r.id)).toEqual(["evenement"]);
  });
});

// ─── Écrans ───────────────────────────────────────────────────────────────────
// Le site sert ses adresses avec une barre oblique finale (`trailingSlash`) : liens en motif.

test.describe("Tableau de bord (B4) : écrans", () => {
  test("admin sans disposition enregistrée : tous ses widgets, dans l'ordre du défaut", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Ce dimanche")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "raccourcis", "scene", "comptes"]);
  });

  test("Ce dimanche : le Culte du 4 octobre, setlist, présentation, case vide", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const w = widget(page, "Ce dimanche");
    await expect(w.getByRole("heading", { name: "Ce dimanche · 4 octobre" })).toBeVisible();
    await expect(w.getByText("Culte Franco", { exact: true })).toBeVisible();
    await expect(w.getByText("Setlist publiée")).toBeVisible();
    await expect(w.getByText("Présentation prête")).toBeVisible();
    await expect(w.getByText("1 case vide")).toBeVisible();
    await expect(w.getByTestId("ligne-dimanche").filter({ hasText: "Présidence" })).toContainText("Pers. A");
    await expect(w.getByTestId("ligne-dimanche").filter({ hasText: "Batterie" })).toContainText("Personne");
  });

  test("Ce dimanche : un réglage de services change le contenu", async ({ page }) => {
    await ouvrir(page, ADMIN, {
      "backOffice/uid-admin": { tableauDeBord: [{ id: "dimanche", taille: "m", reglages: { services: ["Groupe Bonté"] } }], majLe: "2026-10-01" },
    });
    const w = widget(page, "Ce dimanche");
    await expect(w.getByText("Rien au planning ce dimanche.")).toBeVisible();
    await expect(w.getByText("Culte Franco", { exact: true })).toHaveCount(0);
  });

  test("Alice (pôle Événement) : ses quatre widgets et leurs données", async ({ page }) => {
    await ouvrir(page, ALICE);
    await expect(widget(page, "Scène")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["dimanche", "afaire", "evenements", "scene"]);

    const aFaire = widget(page, "À faire");
    await expect(aFaire.getByText("1 en retard")).toBeVisible();
    await expect(aFaire.getByText("Affiche de Noël")).toBeVisible();
    await expect(aFaire.getByText("Réserver la salle")).toBeVisible();
    await expect(aFaire.getByText("Fond du culte")).toHaveCount(0);

    const evts = widget(page, "Prochains évènements");
    await expect(evts.getByTestId("ligne-evenement")).toHaveText([/Foot au parc.*4 inscrits sur 10/, /Repas de section.*sans limite/, /Sortie d'automne/]);
    await expect(evts.getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", /\/back-office\/evenements\/?$/);

    const scene = widget(page, "Scène");
    await expect(scene.getByRole("heading", { name: "Scène · Noël" })).toBeVisible();
    await expect(scene.getByTestId("ligne-creneau")).toHaveText([/4 oct\. 17:00.*Chant · EDD 中班/, /11 oct\. 14:00.*Sketch · Franco/]);
  });

  test("louange : setlists à préparer et cases vides du Culte", async ({ page }) => {
    await ouvrir(page, LOUANGE);
    const setlists = widget(page, "Setlists à préparer");
    await expect(setlists.getByTestId("ligne-setlist")).toHaveText([/Culte Franco · 11 oct\./, /Culte Franco · 18 oct\./, /Culte Franco · 25 oct\./]);
    await expect(setlists.getByRole("link", { name: /Culte Franco · 11 oct\./ }))
      .toHaveAttribute("href", /^\/setlists\/new\/?\?cat=Culte\+Francophone&date=2026-10-11$/);

    const vides = widget(page, "Cases vides du planning");
    await expect(vides.getByTestId("ligne-case-vide")).toHaveText([/4 oct\.\s*Batterie/, /11 oct\.\s*Guitare, Batterie/, /18 oct\.\s*PPT/]);
  });

  test("admin : petit déj, raccourcis, comptes", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Petit déj").getByTestId("ligne-petitdej"))
      .toHaveText([/4 oct\.\s*Libre/, /11 oct\.\s*Libre/, /18 oct\.\s*Famille Test/, /25 oct\.\s*Libre/]);

    const raccourcis = widget(page, "Raccourcis");
    await expect(raccourcis.getByRole("link", { name: "Tâche" })).toHaveAttribute("href", /^\/back-office\/taches\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Évènement" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Notifier" })).toHaveAttribute("href", /^\/back-office\/messages\/notifier\/?$/);
    await expect(raccourcis.getByRole("link", { name: "Setlist" })).toHaveAttribute("href", /^\/setlists\/new\/?$/);

    const comptes = widget(page, "Comptes");
    await expect(comptes.getByText("Noms du planning sans compte")).toBeVisible();
    await expect(comptes.getByText("Pers. A", { exact: true })).toHaveCount(0);
    await expect(comptes.getByRole("link", { name: "Voir la liste" })).toHaveAttribute("href", /^\/back-office\/planning\/sans-compte\/?$/);
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
        majLe: "2026-10-01T09:00:00Z",
      },
    });
    await expect(widget(page, "Prochains évènements").getByTestId("ligne-evenement")).toHaveCount(5);
    // « chants » (U7, S5) : permis à un admin, donc affiché.
    expect(await widgetsAffiches(page)).toEqual(["evenements", "planning", "dimanche", "chants"]);
    // Réglage « 2 dimanches » : le 4 et le 11 seulement.
    await expect(widget(page, "Cases vides du planning").getByTestId("ligne-case-vide")).toHaveCount(2);

    const n = colonnes(info);
    const L = await part(grille(page), widget(page, "Prochains évènements"));
    const S = await part(grille(page), widget(page, "Cases vides du planning"));
    const M = await part(grille(page), widget(page, "Ce dimanche"));
    expect(L).toBeCloseTo(1, 1);
    expect(M).toBeCloseTo(n === 4 ? 0.5 : n === 2 ? 0.5 : 1, 1);
    expect(S).toBeCloseTo(n === 4 ? 0.25 : n === 2 ? 0.5 : 1, 1);
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
        majLe: "2026-10-01",
      },
    });
    await expect(widget(page, "Ce dimanche").getByText("Setlist publiée")).toBeVisible();
    await expect(widget(page, "Setlists à préparer").getByTestId("ligne-setlist").first()).toBeVisible();
    expect(lectures).toEqual([expect.objectContaining({
      where: { fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: "2026-10-01" } } },
    })]);
  });

  test("setlists illisibles : « Lecture impossible » dans les deux widgets, jamais « Pas de setlist »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Ce dimanche").getByText("Setlist publiée")).toBeVisible();
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
    await expect(widget(page, "Ce dimanche").getByText("Pas de setlist")).toHaveCount(0);
    await expect(widget(page, "Setlists à préparer").getByTestId("ligne-setlist")).toHaveCount(0);
  });

  test("un widget réservé aux admins enregistré par Alice ne s'affiche pas", async ({ page }) => {
    await ouvrir(page, ALICE, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "comptes", taille: "s", reglages: {} }, { id: "scene", taille: "s", reglages: {} }], majLe: "2026-10-01" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["scene"]);
  });

  test("captures du tableau de bord (à regarder)", async ({ page }, info) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Comptes")).toBeVisible();
    await expect(widget(page, "Ce dimanche").getByText("Setlist publiée")).toBeVisible();
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-admin.png`, fullPage: true });
  });

  test("中文 : titres des widgets traduits", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE);
    await expect(grille(page).getByRole("region", { name: "本主日" })).toBeVisible();
    await expect(grille(page).getByRole("region", { name: "待办" })).toBeVisible();
  });
});

// ═══ B5 — Personnaliser ═══════════════════════════════════════════════════════
// Planche `bo-tableau-de-bord` (mode personnalisation) : « Personnaliser » devient
// « Terminé » avec « Disposition par défaut » ; bandeau « Ajouter un widget » ; par widget,
// poignée, Monter, Descendre, S, M, L, Réglages du widget, Retirer le widget. Chaque geste
// écrit `backOffice/{uid}` (Q12) ; « Disposition par défaut » demande confirmation et retire
// la disposition du document (absente = défaut du rôle, jamais recopié, Q5).

const ROOT = path.resolve(__dirname, "..");
const ALICE_DEFAUT = ["dimanche", "afaire", "evenements", "scene"];

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
    expect(catalogue(d, user(ALICE), profil(ALICE))).toEqual(["calendrier", "petitdej", "raccourcis"]);
    expect(catalogue([], user(ALICE), profil(ALICE))).toEqual(["dimanche", "calendrier", "afaire", "evenements", "petitdej", "raccourcis", "scene"]);
    expect(catalogue(dispositionParDefaut(user(ADMIN), null), user(ADMIN), null)).toEqual([]);
  });

  test("ajouter (à la fin, taille de la table), retirer, déplacer, taille, réglages", () => {
    const d = dispositionParDefaut(user(ALICE), profil(ALICE));
    const plus = ajouterWidget(d, "petitdej");
    expect(ids(plus)).toEqual([...ALICE_DEFAUT, "petitdej"]);
    expect(plus.at(-1)).toEqual({ id: "petitdej", taille: "s", reglages: {} });
    expect(ids(ajouterWidget(plus, "petitdej")), "jamais deux fois").toEqual(ids(plus));
    expect(ids(retirerWidget(d, "afaire"))).toEqual(["dimanche", "evenements", "scene"]);
    expect(ids(deplacerWidget(d, 3, 0))).toEqual(["scene", "dimanche", "afaire", "evenements"]);
    expect(ids(deplacerWidget(d, 0, 1))).toEqual(["afaire", "dimanche", "evenements", "scene"]);
    expect(ids(deplacerWidget(d, 0, -1)), "hors bornes : rien").toEqual(ALICE_DEFAUT);
    expect(changerTaille(d, "evenements", "l").find((w) => w.id === "evenements")!.taille).toBe("l");
    expect(changerReglages(d, "evenements", { nombre: 5 }).find((w) => w.id === "evenements")!.reglages).toEqual({ nombre: 5 });
    // Rien n'est modifié en place.
    expect(ids(d)).toEqual(ALICE_DEFAUT);
  });

  test("réglages de Prochains évènements : nombre 3 / 5 / 10, section (toutes)", () => {
    const [nombre, section] = groupesDeReglages("evenements", {}, user(ALICE), profil(ALICE));
    expect([nombre.cle, nombre.plusieurs, nombre.choix.map((c) => c.valeur), nombre.actifs]).toEqual(["nombre", false, ["3", "5", "10"], ["3"]]);
    expect([section.cle, section.choix.map((c) => c.valeur), section.actifs])
      .toEqual(["section", ["", "Culte Francophone", "Groupe Paix", "Groupe Fidélité", "Groupe Bonté"], [""]]);
    expect(choisirReglage({}, nombre, "5")).toEqual({ nombre: 5 });
    expect(choisirReglage({ section: "Groupe Paix", nombre: 5 }, section, "")).toEqual({ nombre: 5 });
  });

  test("réglages à plusieurs choix : cocher, décocher, jamais vide", () => {
    const [poles] = groupesDeReglages("afaire", {}, user(LES_DEUX), profil(LES_DEUX));
    expect([poles.cle, poles.plusieurs, poles.choix.map((c) => c.valeur), poles.actifs])
      .toEqual(["poles", true, ["evenement", "louange"], ["evenement", "louange"]]);
    const sansLouange = choisirReglage({}, poles, "louange");
    expect(sansLouange).toEqual({ poles: ["evenement"] });
    const [seul] = groupesDeReglages("afaire", sansLouange, user(LES_DEUX), profil(LES_DEUX));
    expect(seul.actifs).toEqual(["evenement"]);
    expect(choisirReglage(sansLouange, seul, "evenement"), "le dernier choix reste").toEqual(sansLouange);
  });

  test("réglages des autres widgets : services, plannings, horizons, programme, liste, raccourcis", () => {
    const g = (id: Parameters<typeof groupesDeReglages>[0], qui: FakeProfile | null, programmes?: { id: string; nom: string }[]) =>
      groupesDeReglages(id, {}, qui ? user(qui) : user(ADMIN), qui ? profil(qui) : null, programmes)
        .map((x) => [x.cle, x.choix.map((c) => c.valeur), x.actifs]);
    expect(g("dimanche", DA)[0][2]).toEqual(["Culte Francophone"]);
    expect(g("planning", null)).toEqual([
      ["plannings", expect.arrayContaining(["culte", "campusMatin"]), ["culte"]], ["horizon", ["2", "4", "8"], ["4"]],
    ]);
    expect(g("setlists", LOUANGE)).toEqual([["services", ["Culte Francophone"], ["Culte Francophone"]], ["horizon", ["2", "4"], ["4"]]]);
    expect(g("petitdej", ALICE)).toEqual([["horizon", ["4", "8"], ["4"]]]);
    expect(g("scene", ALICE, [{ id: "p1", nom: "Noël" }])).toEqual([["programme", ["", "p1"], [""]]]);
    expect(g("comptes", null)).toEqual([["liste", ["sansCompte", "nouveaux"], ["sansCompte"]]]);
    expect(g("raccourcis", ALICE)).toEqual([["raccourcis", ["tache", "evenement"], ["tache", "evenement"]]]);
  });

  test("règle backOffice/{uid} : lue et écrite par l'intéressé seul (firestore.rules)", () => {
    const rules = readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
    expect(rules).toMatch(/match \/backOffice\/\{uid\} \{\s*allow read, write: if signedIn\(\) && request\.auth\.uid == uid;\s*\}/);
  });
});

test.describe("Personnaliser (B5) : écrans", () => {
  test("Personnaliser : Terminé, Disposition par défaut, catalogue des widgets permis (pas Comptes)", async ({ page }) => {
    await ouvrir(page, ALICE);
    await expect(page.getByRole("button", { name: "Monter" })).toHaveCount(0);
    await personnaliser(page);
    await expect(page.getByRole("button", { name: "Disposition par défaut" })).toBeVisible();
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "Petit déj", "Raccourcis"]);
    // Les outils de chaque widget ; Monter grisé en tête, Descendre en queue.
    await expect(widget(page, "Ce dimanche").getByRole("button", { name: "Monter" })).toBeDisabled();
    await expect(widget(page, "Scène").getByRole("button", { name: "Descendre" })).toBeDisabled();
    await expect(widget(page, "Prochains évènements").getByRole("button", { name: "M", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Terminé" }).click();
    await expect(page.getByRole("button", { name: "Personnaliser" })).toBeVisible();
    await expect(catalogueDe(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Monter" })).toHaveCount(0);
  });

  test("ajouter puis retirer un widget : écrit à chaque geste", async ({ page }) => {
    const db = await ouvrir(page, ALICE);
    await personnaliser(page);
    await catalogueDe(page).getByRole("button", { name: "Petit déj" }).click();
    await expect(widget(page, "Petit déj").getByTestId("ligne-petitdej").first()).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual([...ALICE_DEFAUT, "petitdej"]);
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "Raccourcis"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual([...ALICE_DEFAUT, "petitdej"]);
    expect(ecrituresBO(db, "uid-alice").at(-1)!.data.majLe).toEqual(expect.stringMatching(/^2026-10-01T/));

    await widget(page, "À faire").getByRole("button", { name: "Retirer le widget" }).click();
    await expect(widget(page, "À faire")).toHaveCount(0);
    await expect(catalogueDe(page).getByRole("button")).toHaveText(["Calendrier", "À faire", "Raccourcis"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["dimanche", "evenements", "scene", "petitdej"]);
  });

  test("tous affichés : « Tous les widgets sont déjà affichés. »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(widget(page, "Comptes")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    await expect(catalogueDe(page).getByText("Tous les widgets sont déjà affichés.")).toBeVisible();
  });

  test("Monter et Descendre", async ({ page }) => {
    const db = await ouvrir(page, ALICE);
    await personnaliser(page);
    await widget(page, "Scène").getByRole("button", { name: "Monter" }).click();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["dimanche", "afaire", "scene", "evenements"]);
    await widget(page, "Ce dimanche").getByRole("button", { name: "Descendre" }).click();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["afaire", "dimanche", "scene", "evenements"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["afaire", "dimanche", "scene", "evenements"]);
  });

  test("glisser un widget par sa poignée", async ({ page }) => {
    const db = await ouvrir(page, ALICE);
    await personnaliser(page);
    const poignee = widget(page, "Scène").getByRole("button", { name: "Déplacer « Scène »" });
    const cible = widget(page, "Prochains évènements");
    await cible.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const from = (await poignee.boundingBox())!;
    const to = (await cible.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 12, { steps: 4 });
    await expect(poignee).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await expect(page.getByText("« Scène » en position 3 sur 4.")).toBeAttached();
    await page.mouse.up();
    await expect.poll(() => widgetsAffiches(page)).toEqual(["dimanche", "afaire", "scene", "evenements"]);
    await expect.poll(() => idsEcrits(db, "uid-alice")).toEqual(["dimanche", "afaire", "scene", "evenements"]);
  });

  test("tailles S / M / L : la place change selon l'appareil (Q10), et s'écrit", async ({ page }, info) => {
    const db = await ouvrir(page, ALICE);
    await personnaliser(page);
    const evts = widget(page, "Prochains évènements");
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
    const db = await ouvrir(page, ALICE);
    const evts = widget(page, "Prochains évènements");
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

  test("Réussite 2 : Alice ajoute Petit déj, monte Scène en tête, passe Prochains évènements en L ; relue sur un autre appareil, la même", async ({ page, browser }, info) => {
    const db = await ouvrir(page, ALICE);
    await personnaliser(page);
    await catalogueDe(page).getByRole("button", { name: "Petit déj" }).click();
    for (let i = 0; i < 3; i++) await widget(page, "Scène").getByRole("button", { name: "Monter" }).click();
    await widget(page, "Prochains évènements").getByRole("button", { name: "L", exact: true }).click();
    const voulu = ["scene", "dimanche", "afaire", "evenements", "petitdej"];
    await expect.poll(() => widgetsAffiches(page)).toEqual(voulu);
    await expect.poll(() => (db.doc("backOffice/uid-alice")?.tableauDeBord as { taille: string }[] | undefined)?.[3]?.taille).toBe("l");

    // Un autre appareil, une autre session : il ne lit que la base.
    const { defaultBrowserType: _ignore, ...use } = info.project.use as Record<string, unknown>;
    const autre = await browser.newContext({ ...(use as BrowserContextOptions), baseURL: new URL(page.url()).origin });
    try {
      const page2 = await autre.newPage();
      await ouvrir(page2, ALICE, { "backOffice/uid-alice": db.doc("backOffice/uid-alice")! });
      await expect(widget(page2, "Petit déj")).toBeVisible();
      expect(await widgetsAffiches(page2)).toEqual(voulu);
      expect(await part(grille(page2), widget(page2, "Prochains évènements"))).toBeCloseTo(1, 1);
    } finally {
      await autre.close();
    }
  });

  test("Disposition par défaut : confirmation, puis le défaut du rôle, retiré du document", async ({ page }) => {
    const db = await ouvrir(page, ALICE, {
      "backOffice/uid-alice": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(widget(page, "Scène")).toBeVisible();
    await page.getByRole("button", { name: "Personnaliser" }).click();
    // Refusée : rien ne change, rien ne s'écrit.
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Disposition par défaut" }).click();
    expect(await widgetsAffiches(page)).toEqual(["scene"]);
    expect(ecrituresBO(db, "uid-alice")).toHaveLength(0);
    // Acceptée : le défaut d'Alice, et plus de disposition enregistrée.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Disposition par défaut" }).click();
    await expect.poll(() => widgetsAffiches(page)).toEqual(ALICE_DEFAUT);
    await expect.poll(() => ecrituresBO(db, "uid-alice").length).toBe(1);
    expect(db.doc("backOffice/uid-alice")!.tableauDeBord).toBeUndefined();
    expect(db.doc("backOffice/uid-alice")!.majLe).toEqual(expect.stringMatching(/^2026-10-01T/));
  });

  test("écriture refusée : la disposition reste à l'écran et un message le dit", async ({ page }) => {
    await ouvrir(page, ALICE);
    await page.route(/firestore\.googleapis\.com.*backOffice/, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" })
        : route.fallback());
    await personnaliser(page);
    await widget(page, "À faire").getByRole("button", { name: "Retirer le widget" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Disposition non enregistrée" })).toBeVisible();
    expect(await widgetsAffiches(page)).toEqual(["dimanche", "evenements", "scene"]);
  });

  test("captures en personnalisation (à regarder)", async ({ page }, info) => {
    await ouvrir(page, ALICE);
    await personnaliser(page);
    await widget(page, "Prochains évènements").getByRole("button", { name: "Réglages du widget" }).click();
    await page.screenshot({ path: `test-results/tableau-de-bord-captures/${info.project.name}-personnaliser.png`, fullPage: true });
  });

  test("中文 : Personnaliser traduit", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE);
    await page.getByRole("button", { name: "自定义" }).click();
    await expect(page.getByRole("button", { name: "完成" })).toBeVisible();
    await expect(page.getByRole("region", { name: "添加小组件" })).toBeVisible();
  });
});
