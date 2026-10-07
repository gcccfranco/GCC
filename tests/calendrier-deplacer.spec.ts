import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS } from "../src/lib/access";
import type { DonneesCalendrier, EntreeCalendrier } from "../src/lib/calendrier/entrees";
import { champsDecales, decaler, ecartJours, planDeplacement, questionDeplacement } from "../src/lib/calendrier/deplacer";
import { cleDeplacement, cleVeille, deplacementsAPrevenir, destinatairesDeplacement, ligneDeplacement } from "../src/lib/calendrier/prevenir";
import { notificationsDuMatin } from "../src/lib/reunions/rappels";
import type { Evenement } from "../src/types/evenement";
import type { Creneau, Programme } from "../src/types/programme";
import type { Fois, Tache } from "../src/types/tache";

// Lot U8, tranches C6 et C7 (docs/spec-calendrier.md, Q5 à Q8) : déplacer une entrée,
// puis prévenir par une ligne du rappel du lendemain matin (C7, tests purs).
// Glisser en vue Mois (ordinateur, tablettes) ; « Déplacer… » partout, seul moyen
// sur téléphone ; une confirmation à chaque fois ; les écritures attendues ; les
// refus nommés. Horloge au jeudi 1er octobre 2026 ; noms et titres inventés.

const TODAY = "2026-10-01";
const MAINTENANT = "2026-09-01T10:00:00Z";

// ─── Purs ────────────────────────────────────────────────────────────────────

const evenement = (e: Partial<Evenement> & Pick<Evenement, "id" | "titre">): Evenement => ({
  type: "loisir",
  pour: "eglise",
  date: "2026-10-22",
  heure: "19:00",
  heureFin: "",
  dateFin: "",
  lieu: "",
  description: "",
  liens: [],
  images: [],
  placesMax: null,
  sansCompte: false,
  lienExterne: "",
  contact: "",
  organisateurUid: "u-orga",
  organisateurNom: "Orga",
  epingle: false,
  expiresAt: null,
  inscrits: 0,
  createdAt: MAINTENANT,
  updatedAt: MAINTENANT,
  ...e,
});

const tache = (t: Partial<Tache> & Pick<Tache, "id" | "titre">): Tache => ({
  pole: "da",
  responsableUid: null,
  responsableNom: "",
  echeance: "2026-10-15",
  repetition: null,
  lien: "",
  note: "",
  prevenir: null,
  evenement: null,
  auteurUid: "u-autre",
  createdAt: MAINTENANT,
  updatedAt: MAINTENANT,
  ...t,
});

const programme = (p: Partial<Programme> = {}): Programme => ({
  id: "noel",
  nom: "Noël",
  jourJ: "2026-12-20",
  debut: "2026-09-27",
  passages: [],
  createdBy: "u-orga",
  updatedAt: MAINTENANT,
  ...p,
});

const creneau = (c: Partial<Creneau> & Pick<Creneau, "id">): Creneau => ({
  dimanche: "2026-10-25",
  debut: "17:00",
  fin: "18:00",
  quoi: "Sketch",
  qui: ["Jeunes"],
  note: "",
  auteurUid: "u-autre",
  auteurNom: "Autre",
  createdAt: MAINTENANT,
  updatedAt: MAINTENANT,
  ...c,
});

/** L'entrée telle que la grille la donne (seuls `source`, `cle`, `date` et `titre` servent ici). */
const entree = (source: EntreeCalendrier["source"], id: string, date: string, titre = "Titre"): EntreeCalendrier => ({
  source,
  cle: `${source}:${id}:${date}`,
  date,
  heure: "",
  heureFin: "",
  titre,
  detail: "",
  couleur: "#000",
  duSheet: false,
  moi: false,
  deplacable: true,
  lien: "",
});

const donnees = (d: Partial<Pick<DonneesCalendrier, "evenements" | "taches" | "scene">> = {}) => ({
  evenements: [],
  taches: [],
  scene: [],
  ...d,
});

const horloge = { today: TODAY, maintenant: "10:00" };

test.describe("déplacer (pur)", () => {
  test("écart en jours et décalage d'une date, d'une borne datée à l'heure ; vide reste vide", () => {
    expect(ecartJours("2026-10-15", "2026-10-14")).toBe(-1);
    expect(ecartJours("2026-10-30", "2026-11-02")).toBe(3);
    expect(decaler("2026-10-31", 1)).toBe("2026-11-01");
    expect(decaler("2026-10-21T20:00", 2)).toBe("2026-10-23T20:00");
    expect(decaler("", 3)).toBe("");
  });

  test("évènement : date, fin, ouverture et fin des inscriptions décalées du même nombre de jours ; l'heure ne bouge pas", () => {
    const e = evenement({
      id: "camp", titre: "Camp", date: "2026-10-22", dateFin: "2026-10-24",
      inscriptionDebut: "2026-10-01", inscriptionFin: "2026-10-21T20:00",
    });
    expect(champsDecales(e, 2)).toEqual({
      date: "2026-10-24", dateFin: "2026-10-26", inscriptionDebut: "2026-10-03", inscriptionFin: "2026-10-23T20:00",
    });
    // Les champs vides ne s'écrivent pas.
    expect(champsDecales(evenement({ id: "ping", titre: "Ping" }), -1)).toEqual({ date: "2026-10-21" });
  });

  test("le même jour : rien à faire ; avant aujourd'hui : « Pas avant aujourd'hui »", () => {
    const d = donnees({ taches: [{ tache: tache({ id: "noel", titre: "Chants de Noël" }), fois: [] }] });
    expect(planDeplacement(entree("taches", "noel", "2026-10-15"), "2026-10-15", d, horloge)).toBeNull();
    expect(planDeplacement(entree("taches", "noel", "2026-10-15"), "2026-09-30", d, horloge)).toEqual({ type: "refus", refus: "avantAujourdhui" });
  });

  test("tâche unique : de l'échéance au jour visé, sa fois en cours suit", () => {
    const enCours: Fois = { date: "2026-10-15", parUid: "u-moi", parNom: "Alix P.", le: MAINTENANT, etat: "encours", debutLe: MAINTENANT };
    const t = tache({ id: "noel", titre: "Chants de Noël" });
    expect(planDeplacement(entree("taches", "noel", "2026-10-15"), "2026-10-14", donnees({ taches: [{ tache: t, fois: [] }] }), horloge))
      .toMatchObject({ type: "tache", de: "2026-10-15", vers: "2026-10-14", fois: null });
    expect(planDeplacement(entree("taches", "noel", "2026-10-15"), "2026-10-14", donnees({ taches: [{ tache: t, fois: [enCours] }] }), horloge))
      .toMatchObject({ type: "tache", fois: enCours });
  });

  test("évènement : « Prévenir les inscrits (4) », ses tâches liées nommées ; sans inscrits ou inscription externe, pas de case", () => {
    const ping = evenement({ id: "ping", titre: "Tournoi de ping", inscrits: 4, inscriptionFin: "2026-10-21" });
    const affiche = tache({ id: "affiche", titre: "Affiche du tournoi", echeance: "2026-10-20", evenement: { id: "ping", titre: "Tournoi de ping" } });
    const autre = tache({ id: "autre", titre: "Autre chose" });
    const plan = planDeplacement(
      entree("evenements", "ping", "2026-10-22"), "2026-10-23",
      donnees({ evenements: [ping], taches: [{ tache: affiche, fois: [] }, { tache: autre, fois: [] }] }), horloge,
    );
    expect(plan).toMatchObject({
      type: "evenement", prevenir: { inscrits: 4 }, tachesLiees: ["Affiche du tournoi"],
      champs: { date: "2026-10-23", inscriptionFin: "2026-10-22" },
    });
    const sans = evenement({ id: "sans", titre: "Sans inscrit" });
    expect(planDeplacement(entree("evenements", "sans", "2026-10-22"), "2026-10-23", donnees({ evenements: [sans] }), horloge))
      .toMatchObject({ type: "evenement", prevenir: null });
    const externe = evenement({ id: "ext", titre: "Externe", inscrits: 4, lienExterne: "https://example.org/form" });
    expect(planDeplacement(entree("evenements", "ext", "2026-10-22"), "2026-10-23", donnees({ evenements: [externe] }), horloge))
      .toMatchObject({ type: "evenement", prevenir: null });
  });

  test("évènement sur plusieurs jours glissé depuis son deuxième jour : tout se décale de l'écart", () => {
    const camp = evenement({ id: "camp", titre: "Camp", date: "2026-10-22", dateFin: "2026-10-24" });
    expect(planDeplacement(entree("evenements", "camp", "2026-10-23"), "2026-10-30", donnees({ evenements: [camp] }), horloge))
      .toMatchObject({ type: "evenement", champs: { date: "2026-10-29", dateFin: "2026-10-31" } });
  });

  test("évènement sur plusieurs jours : son nouveau début ne tombe jamais avant aujourd'hui", () => {
    // Un camp du 2 au 4 octobre (demain à après-demain), glissé de sa case du 4 sur aujourd'hui (le 1er) :
    // son début passerait au 28 septembre.
    const camp = evenement({ id: "camp", titre: "Camp", date: "2026-10-02", dateFin: "2026-10-04" });
    expect(planDeplacement(entree("evenements", "camp", "2026-10-04"), "2026-10-01", donnees({ evenements: [camp] }), horloge))
      .toEqual({ type: "refus", refus: "avantAujourdhui" });
    // Depuis sa première case, aujourd'hui reste permis.
    expect(planDeplacement(entree("evenements", "camp", "2026-10-02"), "2026-10-01", donnees({ evenements: [camp] }), horloge))
      .toMatchObject({ type: "evenement", champs: { date: "2026-10-01", dateFin: "2026-10-03" } });
  });

  test("une date mal formée (année à cinq chiffres) : rien à faire, rien ne casse", () => {
    const camp = evenement({ id: "camp", titre: "Camp", date: "2026-10-22" });
    const t = tache({ id: "noel", titre: "Chants de Noël" });
    const d = donnees({ evenements: [camp], taches: [{ tache: t, fois: [] }] });
    for (const vers of ["20266-10-14", "2026-13-40", "2026-1-4", ""]) {
      expect(planDeplacement(entree("evenements", "camp", "2026-10-22"), vers, d, horloge), vers).toBeNull();
      expect(planDeplacement(entree("taches", "noel", "2026-10-15"), vers, d, horloge), vers).toBeNull();
    }
  });

  test("réunion : « Prévenir les membres de la réunion »", () => {
    const reu = evenement({ id: "reu", titre: "Réunion DA", pour: "pole:da", date: "2026-10-03" });
    expect(planDeplacement(entree("reunions", "reu", "2026-10-03"), "2026-10-05", donnees({ evenements: [reu] }), horloge))
      .toMatchObject({ type: "evenement", prevenir: "membres", champs: { date: "2026-10-05" } });
  });

  test("créneau : les créneaux libres du jour visé (grille de U1), la même heure d'office si elle est libre", () => {
    const c25 = creneau({ id: "c25" });
    const c11 = creneau({ id: "c11", dimanche: "2026-10-11", debut: "14:00", fin: "15:30" });
    const scene = [{ programme: programme(), creneaux: [c25, c11] }];
    const plan = planDeplacement(entree("scene", "c25", "2026-10-25"), "2026-10-11", donnees({ scene }), horloge);
    expect(plan).toMatchObject({
      type: "creneau",
      programmeId: "noel",
      places: [
        { jour: "2026-10-11", debut: "16:00", fin: "17:00" },
        { jour: "2026-10-11", debut: "17:00", fin: "18:00" },
        { jour: "2026-10-11", debut: "18:00", fin: "19:00" },
      ],
      parDefaut: { jour: "2026-10-11", debut: "17:00", fin: "18:00" },
    });
    // 16:00 prise : rien d'office, la personne choisit.
    const c11b = creneau({ id: "c11b", dimanche: "2026-10-11", debut: "17:00", fin: "18:00" });
    const plein = planDeplacement(entree("scene", "c25", "2026-10-25"), "2026-10-11", donnees({ scene: [{ ...scene[0], creneaux: [c25, c11, c11b] }] }), horloge);
    expect(plein).toMatchObject({ type: "creneau", parDefaut: null });
  });

  test("créneau : jour fermé (sans plage, hors saison, jour J) ou sans place libre = refus nommé", () => {
    const c25 = creneau({ id: "c25" });
    const scene = [{ programme: programme(), creneaux: [c25] }];
    const vers = (jour: string, s = scene) => planDeplacement(entree("scene", "c25", "2026-10-25"), jour, donnees({ scene: s }), horloge);
    expect(vers("2026-10-24")).toEqual({ type: "refus", refus: "sceneFermee" }); // un samedi, sans plage
    expect(vers("2026-12-20")).toEqual({ type: "refus", refus: "sceneFermee" }); // le jour J
    const plein = creneau({ id: "plein", dimanche: "2026-10-18", debut: "14:00", fin: "19:00" });
    expect(vers("2026-10-18", [{ ...scene[0], creneaux: [c25, plein] }])).toEqual({ type: "refus", refus: "aucunCreneau" });
  });

  test("la question : FR et 中文", () => {
    expect(questionDeplacement("Chants de Noël", "2026-10-15", "2026-10-14", "fr")).toBe("Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ?");
    expect(questionDeplacement("Veillée", "2026-10-31", "2026-11-01", "fr")).toBe("Déplacer « Veillée » du samedi 31 octobre au dimanche 1er novembre ?");
    expect(questionDeplacement("Chants de Noël", "2026-10-15", "2026-10-14", "zh-CN")).toBe("把「Chants de Noël」从10月15日（周四）改到10月14日（周三）？");
  });
});

// ─── Prévenir (C7, Q7 et Q8) ─────────────────────────────────────────────────

test.describe("prévenir (pur)", () => {
  // Déplacé le 30/09 (heure de Paris, 10:12) du 8 au 9 octobre, par l'organisatrice.
  const deplace = (e: Partial<Evenement> = {}) => evenement({
    id: "foot",
    titre: "Foot au parc",
    date: "2026-10-09",
    deplacement: { de: "2026-10-08", vers: "2026-10-09", le: "2026-09-30T08:12:00.000Z", parUid: "u-orga" },
    ...e,
  });

  test("la ligne du matin : FR et 中文, avec ou sans heure", () => {
    expect(ligneDeplacement(deplace(), "fr")).toBe("Changement : Foot au parc passe au vendredi 9 octobre, 19:00.");
    expect(ligneDeplacement(deplace(), "zh-CN")).toBe("活动改期：Foot au parc 改到 10月9日 19:00。");
    expect(ligneDeplacement(deplace({ heure: "" }), "fr")).toBe("Changement : Foot au parc passe au vendredi 9 octobre.");
    expect(ligneDeplacement(deplace({ heure: "" }), "zh-CN")).toBe("活动改期：Foot au parc 改到 10月9日。");
  });

  test("fenêtre de deux jours : un déplacement d'hier ou d'avant-hier, pas d'aujourd'hui (il attend demain matin) ni plus ancien", () => {
    const le = (iso: string) => deplace({ deplacement: { de: "2026-10-08", vers: "2026-10-09", le: iso, parUid: "u-orga" } });
    const garde = (iso: string) => deplacementsAPrevenir([le(iso)], TODAY).length === 1;
    expect(garde("2026-09-30T08:12:00.000Z")).toBe(true); // hier
    expect(garde("2026-09-29T21:00:00.000Z")).toBe(true); // avant-hier : un matin manqué ne perd rien
    expect(garde("2026-10-01T06:30:00.000Z")).toBe(false); // ce matin : demain
    expect(garde("2026-09-28T23:59:00.000Z")).toBe(false); // trop vieux
  });

  test("fenêtre : rien sans déplacement, ni s'il ne dit plus la date de l'évènement, ni pour un évènement passé", () => {
    expect(deplacementsAPrevenir([deplace({ deplacement: null }), evenement({ id: "sans", titre: "Sans" })], TODAY)).toEqual([]);
    // Redéplacé depuis par le formulaire : la ligne annoncerait une date fausse.
    expect(deplacementsAPrevenir([deplace({ date: "2026-10-10" })], TODAY)).toEqual([]);
    const passe = deplace({ date: "2026-09-30", deplacement: { de: "2026-10-02", vers: "2026-09-30", le: "2026-09-29T09:00:00.000Z", parUid: "u-orga" } });
    expect(deplacementsAPrevenir([passe], TODAY)).toEqual([]);
    // Aujourd'hui même : on le dit encore.
    const ce_jour = deplace({ date: TODAY, deplacement: { de: "2026-10-08", vers: TODAY, le: "2026-09-30T09:00:00.000Z", parUid: "u-orga" } });
    expect(deplacementsAPrevenir([ce_jour], TODAY).map((e) => e.id)).toEqual(["foot"]);
  });

  test("clés : `deplacement-<id>-<vers>-<jour du geste>` (le cron ajoute l'uid) ; le rappel de la veille porte la date", () => {
    expect(cleDeplacement(deplace())).toBe("deplacement-foot-2026-10-09-2026-09-30");
    // A → B annoncé, puis B → C, puis C → B : le second retour à B s'annonce aussi (autre jour de geste).
    const retour = deplace({ deplacement: { de: "2026-10-12", vers: "2026-10-09", le: "2026-10-03T07:00:00.000Z", parUid: "u-orga" } });
    expect(cleDeplacement(retour)).not.toBe(cleDeplacement(deplace()));
    expect(cleVeille(deplace())).toBe("rappel-evenement-foot-2026-10-09");
    // Glissé du 8 au 9 : la veille du 9 n'est pas celle du 8, déjà envoyée.
    expect(cleVeille(deplace({ date: "2026-10-08" }))).not.toBe(cleVeille(deplace()));
  });

  test("destinataires : inscrits avec compte (ou membres de la réunion), sans l'auteur du geste, une fois chacun", () => {
    expect(destinatairesDeplacement(deplace(), ["u-a", null, "u-orga", "u-b", "u-a", undefined])).toEqual(["u-a", "u-b"]);
    const reunion = deplace({ pour: "pole:da", deplacement: { de: "2026-10-08", vers: "2026-10-09", le: "2026-09-30T08:12:00.000Z", parUid: "u-membre" } });
    expect(destinatairesDeplacement(reunion, ["u-orga", "u-membre", "u-c"])).toEqual(["u-orga", "u-c"]);
    expect(destinatairesDeplacement(deplace({ deplacement: null }), ["u-a"])).toEqual([]);
  });

  test("dans le rappel du matin : fondue avec les services, seule sinon (vers la fiche)", () => {
    const ligne = { kind: "deplacement" as const, evenement: deplace() };
    const seule = notificationsDuMatin({ services: [], taches: [], lignes: [ligne] }, "fr", TODAY);
    expect(seule).toEqual([{
      title: "Changement de date",
      body: "Changement : Foot au parc passe au vendredi 9 octobre, 19:00.",
      url: "/evenements/foot",
      tag: `rappel-evenements-${TODAY}`,
      kind: "evenement",
    }]);
    expect(notificationsDuMatin({ services: [], taches: [], lignes: [ligne] }, "zh-CN", TODAY)[0])
      .toMatchObject({ title: "活动改期", body: "活动改期：Foot au parc 改到 10月9日 19:00。" });
    const service = { tag: "J3" as const, date: "2026-10-04", services: [{ service: "Culte Franco", roles: ["Piano"] }] };
    const fondue = notificationsDuMatin({ services: [service], taches: [], lignes: [ligne] }, "fr", TODAY);
    expect(fondue).toHaveLength(1);
    expect(fondue[0].body.split("\n")).toEqual([expect.stringContaining("Culte Franco"), "Changement : Foot au parc passe au vendredi 9 octobre, 19:00."]);
  });

  test("le cron : les déplacements d'hier et d'avant-hier lus, une ligne par destinataire, la veille datée", () => {
    const route = readFileSync(join(__dirname, "..", "src", "app", "api", "cron", "reminders", "route.ts"), "utf8");
    expect(route).toContain('where("deplacement.le", ">=", isoInDays(-2))');
    expect(route).toMatch(/deplacementsAPrevenir\([\s\S]*?destinatairesDeplacement\(e, candidats\), \{ kind: "deplacement", evenement: e \}, cleDeplacement\(e\)\)/);
    expect(route).not.toContain("`rappel-evenement-${e.id}`");
    expect(route.match(/cleVeille\(e\)/g)).toHaveLength(2);
    // Derrière l'interrupteur, comme les autres lignes d'évènements (lot 18).
    expect(route).toContain("BACK_OFFICE ? await lignesEvenements(db, today)");
  });
});

// ─── Page ────────────────────────────────────────────────────────────────────

const FIXTURE_OCTOBRE = readFileSync(join(__dirname, "fixtures", "sheet-evenements-mois.csv"), "utf8");
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["04/10", "Lou M.", "", "", "", "", "", "", "", "", "", "", ""],
  ["11/10", "Sam T.", "", "", "", "", "", "", "", "", "", "", ""],
]);

const P_ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T." };
/** Organise le tournoi et la réunion ; membre du pôle DA. */
const P_ORGA: FakeProfile = { uid: "u-orga", email: "orga@example.org", firstName: "Orane", lastName: "G.", poles: ["da"] };
/** Membre du pôle DA qui n'organise rien. */
const P_MEMBRE: FakeProfile = { uid: "u-membre", email: "membre@example.org", firstName: "Mael", lastName: "B.", poles: ["da"] };
/** Auteur de créneaux, responsable des plannings, sans pôle (pas la coordination). */
const P_AUTEUR: FakeProfile = { uid: "u-auteur", email: "auteur@example.org", firstName: "Ines", lastName: "R.", plannings: ["culte"] };

const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-22", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, inscriptions: "auto", inscriptionDebut: "", inscriptionFin: "2026-10-21",
    organisateurUid: "u-orga", organisateurNom: "Orane G.", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/reu-da": {
    titre: "Réunion DA", type: "loisir", pour: "pole:da", date: "2026-10-08", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-orga", organisateurNom: "Orane G.", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/passe": {
    titre: "Sortie passée", type: "loisir", pour: "eglise", date: "2026-09-30", heure: "18:00",
    organisateurUid: "u-orga", organisateurNom: "Orane G.", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/noel": {
    titre: "Chants de Noël", responsableUid: null, responsableNom: "", echeance: "2026-10-15", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/affiche": {
    titre: "Affiche du tournoi", responsableUid: null, responsableNom: "", echeance: "2026-10-20", repetition: null,
    lien: "", note: "", prevenir: null, evenement: { id: "ping", titre: "Tournoi de ping" }, auteurUid: "u-autre",
    createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/hebdo": {
    titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-02", repetition: { rythme: "semaine" },
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "programmes/noel": {
    nom: "Noël", jourJ: "2026-12-20", debut: "2026-09-27", visible: true, passages: [], createdBy: "u-autre", updatedAt: MAINTENANT,
  },
  "programmes/noel/creneaux/c11": {
    dimanche: "2026-10-11", debut: "14:00", fin: "15:30", quoi: "Sketch", qui: ["Jeunes"], note: "",
    auteurUid: "u-autre", auteurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "programmes/noel/creneaux/plein": {
    dimanche: "2026-10-18", debut: "14:00", fin: "19:00", quoi: "Spectacle", qui: ["Chorale"], note: "",
    auteurUid: "u-autre", auteurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "programmes/noel/creneaux/c25": {
    dimanche: "2026-10-25", debut: "17:00", fin: "18:00", quoi: "Chant", qui: ["Jeunes"], note: "",
    auteurUid: "u-autre", auteurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "setlists/s13": {
    title: "Répétition du 13", leader: "Sam T.", category: "Culte Francophone", date: "2026-10-13", language: "fr", notes: "",
    createdAt: MAINTENANT, items: [], isDraft: false, isPrivate: false, ownerId: "u-autre",
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

async function ouvrir(page: Page, profil: FakeProfile = P_ADMIN) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sheets(page);
  const db = await signInAs(page, profil, DOCS, "/back-office/calendrier");
  await expect(page.getByRole("heading", { level: 1, name: /^Octobre( 2026)?$/ })).toBeVisible();
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  return db;
}

const jour = (page: Page, date: string) => page.getByTestId("grille-mois").locator(`[data-jour="${date}"]`);
const estTelephone = (info: TestInfo) => info.project.name === "telephone";
const panneauADroite = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
const GLISSER = "glisser : vue Mois sur ordinateur et tablettes ; le téléphone passe par « Déplacer… »";
/** Les écritures des sources du calendrier (la connexion écrit aussi son profil, ailleurs). */
const ecritures = (db: Awaited<ReturnType<typeof ouvrir>>) =>
  db.writes.filter((w) => /^(evenements|poles|programmes|setlists|petitDej)\//.test(w.path));

/** Soulève `source` et l'amène au-dessus de `cible`, sans lâcher. */
async function soulever(page: Page, source: Locator, cible: Locator) {
  const a = (await source.boundingBox())!;
  const b = (await cible.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 14, a.y + a.height / 2 + 4, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
}
async function glisser(page: Page, source: Locator, cible: Locator) {
  await soulever(page, source, cible);
  await page.mouse.up();
}
/** Les ouvertures (boîte, feuille) ont fini de s'animer : la capture montre l'état posé. */
async function animationsFinies(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

test.describe("C6 : glisser en vue Mois", () => {
  test("la tâche du 15 glissée au 14 : « Déposer pour déplacer », confirmation ; « Annuler » n'écrit rien, « Déplacer » écrit l'échéance (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page);
    const chip = jour(page, "2026-10-15").locator('[data-source="taches"]');
    await soulever(page, chip, jour(page, "2026-10-14"));
    await expect(jour(page, "2026-10-14")).toContainText("Déposer pour déplacer");
    await page.mouse.up();
    let dlg = page.getByRole("alertdialog", { name: "Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ?" });
    await expect(dlg).toBeVisible();
    await dlg.getByRole("button", { name: "Annuler" }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toEqual([]);
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveCount(1);

    await glisser(page, jour(page, "2026-10-15").locator('[data-source="taches"]'), jour(page, "2026-10-14"));
    dlg = page.getByRole("alertdialog", { name: /Chants de Noël/ });
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([{ method: "PATCH", path: "poles/da/taches/noel", data: { echeance: "2026-10-14" } }]);
    expect(db.doc("poles/da/taches/noel")).toMatchObject({ echeance: "2026-10-14", titre: "Chants de Noël" });
    await expect(jour(page, "2026-10-14").locator('[data-source="taches"]')).toContainText("Chants de Noël");
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveCount(0);
  });

  test("rien ne se soulève : tâche répétée, entrée du Sheet, service, setlist, petit déj, évènement passé (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page);
    await page.getByRole("group", { name: "Sources affichées" }).getByRole("button", { name: "Setlists" }).click();
    const immobiles = [
      jour(page, "2026-10-02").locator('[data-source="taches"]'), // tâche répétée
      jour(page, "2026-10-06").locator('[data-source="evenements"]').first(), // Sheet
      jour(page, "2026-10-04").locator('[data-source="services"]'),
      jour(page, "2026-10-13").locator('[data-source="setlists"]'),
      jour(page, "2026-10-18").locator('[data-source="petitDej"]'),
      jour(page, "2026-09-30").locator('[data-source="evenements"]'), // évènement passé
    ];
    for (const chip of immobiles) {
      await expect(chip).toBeVisible();
      await expect(chip).not.toHaveAttribute("data-deplacable", "true");
      await soulever(page, chip, jour(page, "2026-10-21"));
      await expect(jour(page, "2026-10-21")).not.toContainText("Déposer pour déplacer");
      await page.mouse.up();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    }
    // La tâche unique, elle, se soulève.
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveAttribute("data-deplacable", "true");
    expect(ecritures(db)).toEqual([]);
    // La tâche répétée le dit dans le panneau du jour, à la place de « Déplacer… » (Q6).
    await jour(page, "2026-10-02").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Vendredi 2 octobre" })
      : page.getByRole("dialog", { name: "Vendredi 2 octobre" });
    await expect(panneau).toContainText("Change la répétition dans la tâche");
    await expect(panneau.getByRole("button", { name: "Déplacer…" })).toHaveCount(0);
  });

  test("créneau d'un groupe que la saison ne permet pas : ni poignée ni « Déplacer… » pour son auteur (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_AUTEUR, {
      ...DOCS,
      "programmes/noel": { ...DOCS["programmes/noel"], quiAutorises: ["Jeunes"] },
      "programmes/noel/creneaux/chorale": {
        dimanche: "2026-10-25", debut: "15:00", fin: "16:00", quoi: "Chant", qui: ["Chorale"], note: "",
        auteurUid: "u-auteur", auteurNom: "Auteur", createdAt: MAINTENANT, updatedAt: MAINTENANT,
      },
      "programmes/noel/creneaux/jeunes": {
        dimanche: "2026-10-11", debut: "16:00", fin: "17:00", quoi: "Danse", qui: ["Jeunes"], note: "",
        auteurUid: "u-auteur", auteurNom: "Auteur", createdAt: MAINTENANT, updatedAt: MAINTENANT,
      },
    }, "/back-office/calendrier");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    const chorale = jour(page, "2026-10-25").locator('[data-source="scene"]').filter({ hasText: "Chorale" });
    await expect(chorale).toBeVisible();
    await expect(chorale).not.toHaveAttribute("data-deplacable", "true");
    // Le sien d'un groupe permis, lui, se soulève (témoin).
    await expect(jour(page, "2026-10-11").locator('[data-source="scene"]').filter({ hasText: "Danse" })).toHaveAttribute("data-deplacable", "true");
    await jour(page, "2026-10-25").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 25 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 25 octobre" });
    await expect(panneau.getByRole("link", { name: /Chorale/ })).toBeVisible();
    await expect(panneau.getByRole("button", { name: "Déplacer…" })).toHaveCount(0);
  });

  test("pas de dépôt avant aujourd'hui : « Pas avant aujourd'hui », rien d'écrit (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page);
    await glisser(page, jour(page, "2026-10-15").locator('[data-source="taches"]'), jour(page, "2026-09-29"));
    const dlg = page.getByRole("alertdialog", { name: "Pas avant aujourd'hui" });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole("button", { name: "Déplacer", exact: true })).toHaveCount(0);
    await dlg.getByRole("button", { name: "OK" }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toEqual([]);
  });

  test("l'organisateur glisse son évènement : « Prévenir les inscrits (4) » cochée, tâche liée nommée, dates et bornes décalées, `deplacement` écrit (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page, P_ORGA);
    await glisser(page, jour(page, "2026-10-22").locator('[data-source="evenements"]'), jour(page, "2026-10-23"));
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Tournoi de ping » du jeudi 22 au vendredi 23 octobre ?" });
    const prevenir = dlg.getByRole("checkbox", { name: "Prévenir les inscrits (4)" });
    await expect(prevenir).toBeChecked();
    await expect(dlg).toContainText("Ils le liront dans le rappel de demain matin.");
    await expect(dlg).toContainText("Tâches liées, qui ne bougent pas : Affiche du tournoi");
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    const w = ecritures(db);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({
      method: "PATCH",
      path: "evenements/ping",
      data: { date: "2026-10-23", inscriptionFin: "2026-10-22", deplacement: { de: "2026-10-22", vers: "2026-10-23", parUid: "u-orga" } },
    });
    expect(w[0].data).not.toHaveProperty("heure");
    expect((w[0].data.deplacement as { le: string }).le).toMatch(/^2026-10-01T/);
    await expect(jour(page, "2026-10-23").locator('[data-source="evenements"]')).toContainText("Tournoi de ping");
  });

  test("case décochée : les dates bougent, `deplacement` vidé (personne n'est prévenu) (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page, P_ORGA);
    await glisser(page, jour(page, "2026-10-22").locator('[data-source="evenements"]'), jour(page, "2026-10-23"));
    const dlg = page.getByRole("alertdialog", { name: /Tournoi de ping/ });
    await dlg.getByRole("checkbox", { name: "Prévenir les inscrits (4)" }).uncheck();
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([{ path: "evenements/ping", data: { date: "2026-10-23", deplacement: null } }]);
  });

  test("un membre qui n'organise pas ne soulève ni l'évènement ni la réunion (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page, P_MEMBRE);
    for (const chip of [
      jour(page, "2026-10-22").locator('[data-source="evenements"]'),
      jour(page, "2026-10-08").locator('[data-source="reunions"]'),
    ]) {
      await expect(chip).not.toHaveAttribute("data-deplacable", "true");
      await glisser(page, chip, jour(page, "2026-10-23"));
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    }
    // Sa tâche de pôle, oui.
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveAttribute("data-deplacable", "true");
    expect(ecritures(db)).toEqual([]);
  });

  test("réunion : « Prévenir les membres de la réunion », cochée (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page, P_ORGA);
    await glisser(page, jour(page, "2026-10-08").locator('[data-source="reunions"]'), jour(page, "2026-10-09"));
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Réunion DA » du jeudi 8 au vendredi 9 octobre ?" });
    await expect(dlg.getByRole("checkbox", { name: "Prévenir les membres de la réunion" })).toBeChecked();
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([
      { path: "evenements/reu-da", data: { date: "2026-10-09", deplacement: { de: "2026-10-08", vers: "2026-10-09", parUid: "u-orga" } } },
    ]);
  });

  test("créneau : la confirmation propose les créneaux libres du jour visé, la même heure cochée ; « Déplacer » écrit jour et heures (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page);
    await glisser(page, jour(page, "2026-10-25").locator('[data-source="scene"]'), jour(page, "2026-10-11"));
    const dlg = page.getByRole("alertdialog", { name: /^Déplacer « Scène · Chant Jeunes » du dimanche 25 au dimanche 11 octobre \?$/ });
    const places = dlg.getByRole("radiogroup", { name: "Créneaux libres le dimanche 11 octobre" });
    await expect(places.getByRole("radio")).toHaveCount(3);
    await expect(places.getByRole("radio", { name: "16:00 – 17:00" })).not.toBeChecked();
    await expect(places.getByRole("radio", { name: "17:00 – 18:00" })).toBeChecked();
    await places.getByRole("radio", { name: "18:00 – 19:00" }).check();
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([
      { method: "PATCH", path: "programmes/noel/creneaux/c25", data: { dimanche: "2026-10-11", debut: "18:00", fin: "19:00" } },
    ]);
  });

  test("créneau : refus nommés — jour sans plage, jour sans place libre (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    const db = await ouvrir(page);
    await glisser(page, jour(page, "2026-10-25").locator('[data-source="scene"]'), jour(page, "2026-10-24"));
    let dlg = page.getByRole("alertdialog", { name: "La scène n'est pas ouverte ce jour-là" });
    await expect(dlg).toBeVisible();
    await dlg.getByRole("button", { name: "OK" }).click();
    await glisser(page, jour(page, "2026-10-25").locator('[data-source="scene"]'), jour(page, "2026-10-18"));
    dlg = page.getByRole("alertdialog", { name: "Aucun créneau libre ce jour-là" });
    await expect(dlg).toBeVisible();
    await dlg.getByRole("button", { name: "OK" }).click();
    expect(ecritures(db)).toEqual([]);
  });
});

test.describe("C6 : « Déplacer… »", () => {
  test("au clavier, depuis le panneau du jour : date, confirmation, écriture (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), "le panneau du jour : ordinateur et tablettes ; le téléphone a sa feuille d'entrée");
    const db = await ouvrir(page);
    await jour(page, "2026-10-15").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Jeudi 15 octobre" })
      : page.getByRole("dialog", { name: "Jeudi 15 octobre" });
    // Une seule entrée déplaçable ce jour-là : la tâche (l'entrée du Sheet n'en a pas).
    const bouton = panneau.getByRole("button", { name: "Déplacer…" });
    await expect(bouton).toHaveCount(1);
    await bouton.focus();
    await page.keyboard.press("Enter");
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Chants de Noël »" });
    // Une année à cinq chiffres ne se tape pas.
    await expect(dlg.getByLabel("Nouvelle date")).toHaveAttribute("max", "9999-12-31");
    await dlg.getByLabel("Nouvelle date").fill("2026-10-14");
    await expect(dlg).toContainText("Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ?");
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([{ method: "PATCH", path: "poles/da/taches/noel", data: { echeance: "2026-10-14" } }]);
  });

  test("une date passée dans le champ : « Pas avant aujourd'hui », « Déplacer » absent (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), "le panneau du jour : ordinateur et tablettes");
    const db = await ouvrir(page);
    await jour(page, "2026-10-15").click();
    await page.getByRole("button", { name: "Déplacer…" }).filter({ visible: true }).click();
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Chants de Noël »" });
    await dlg.getByLabel("Nouvelle date").fill("2026-09-29");
    await expect(dlg).toContainText("Pas avant aujourd'hui");
    await expect(dlg.getByRole("button", { name: "Déplacer", exact: true })).toHaveCount(0);
    await dlg.getByRole("button", { name: "Annuler" }).click();
    expect(ecritures(db)).toEqual([]);
  });

  test("téléphone : « Déplacer… » dans la feuille de l'entrée mène à la même confirmation", async ({ page }, info) => {
    test.skip(!estTelephone(info), "test propre au téléphone");
    const db = await ouvrir(page);
    await page.getByTestId("agenda").getByRole("button", { name: /Chants de Noël.*DA/ }).click();
    const feuille = page.getByRole("dialog", { name: "Chants de Noël" });
    await feuille.getByRole("button", { name: "Déplacer…" }).click();
    const dlg = page.getByRole("alertdialog", { name: "Déplacer « Chants de Noël »" });
    await dlg.getByLabel("Nouvelle date").fill("2026-10-14");
    await expect(dlg).toContainText("Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ?");
    await dlg.getByRole("button", { name: "Déplacer", exact: true }).click();
    await expect(dlg).toHaveCount(0);
    expect(ecritures(db)).toMatchObject([{ method: "PATCH", path: "poles/da/taches/noel", data: { echeance: "2026-10-14" } }]);
  });

  test("téléphone : la feuille d'une tâche répétée dit « Change la répétition dans la tâche », sans « Déplacer… »", async ({ page }, info) => {
    test.skip(!estTelephone(info), "test propre au téléphone");
    await ouvrir(page);
    await page.getByTestId("agenda").getByRole("button", { name: /Fond PPT/ }).first().click();
    const feuille = page.getByRole("dialog", { name: "Fond PPT" });
    await expect(feuille).toContainText("Change la répétition dans la tâche");
    await expect(feuille.getByRole("button", { name: "Déplacer…" })).toHaveCount(0);
  });

  test("téléphone : une entrée qui ne bouge pas n'a pas « Déplacer… » (service)", async ({ page }, info) => {
    test.skip(!estTelephone(info), "test propre au téléphone");
    await ouvrir(page);
    await page.getByTestId("agenda").getByRole("button", { name: /Culte Franco/ }).first().click();
    const feuille = page.getByRole("dialog").filter({ hasText: "Ouvrir" });
    await expect(feuille.getByRole("link", { name: "Ouvrir" })).toBeVisible();
    await expect(feuille.getByRole("button", { name: "Déplacer…" })).toHaveCount(0);
  });

  test("中文 : la question et les boutons", async ({ page }, info) => {
    test.skip(estTelephone(info), "le panneau du jour : ordinateur et tablettes");
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office/calendrier");
    await expect(page.getByRole("heading", { level: 1, name: "2026年10月" })).toBeVisible();
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    await jour(page, "2026-10-15").click();
    await page.getByRole("button", { name: "改期…" }).filter({ visible: true }).click();
    const dlg = page.getByRole("alertdialog");
    await dlg.getByLabel("新日期").fill("2026-10-14");
    await expect(dlg).toContainText("把「Chants de Noël」从10月15日（周四）改到10月14日（周三）？");
    await expect(dlg.getByRole("button", { name: "取消" })).toBeVisible();
    await expect(dlg.getByRole("button", { name: "改期", exact: true })).toBeVisible();
  });
});

test.describe("C6 : captures à regarder", () => {
  test("glisser en cours, confirmation d'un évènement, d'un créneau, et « Déplacer… » sur chaque appareil", async ({ page }, info) => {
    const dossier = "test-results/calendrier-deplacer-captures";
    if (estTelephone(info)) {
      await ouvrir(page, P_ORGA);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.getByTestId("agenda").getByRole("button", { name: /Tournoi de ping/ }).click();
      await page.getByRole("dialog", { name: "Tournoi de ping" }).getByRole("button", { name: "Déplacer…" }).click();
      await page.getByRole("alertdialog").getByLabel("Nouvelle date").fill("2026-10-23");
      await expect(page.getByRole("alertdialog")).toContainText("Prévenir les inscrits (4)");
      await animationsFinies(page);
      await page.screenshot({ path: `${dossier}/${info.project.name}-champ.png` });
      return;
    }
    await ouvrir(page, P_ORGA);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await soulever(page, jour(page, "2026-10-15").locator('[data-source="taches"]'), jour(page, "2026-10-14"));
    await expect(jour(page, "2026-10-14")).toContainText("Déposer pour déplacer");
    await animationsFinies(page);
    await page.screenshot({ path: `${dossier}/${info.project.name}-glisser.png` });
    await page.mouse.up();
    await page.getByRole("alertdialog").getByRole("button", { name: "Annuler" }).click();
    await glisser(page, jour(page, "2026-10-22").locator('[data-source="evenements"]'), jour(page, "2026-10-23"));
    await expect(page.getByRole("alertdialog", { name: /Tournoi de ping/ })).toBeVisible();
    await animationsFinies(page);
    await page.screenshot({ path: `${dossier}/${info.project.name}-evenement.png` });
  });

  test("tâche répétée : « Change la répétition dans la tâche » dans le panneau du jour ou la feuille de l'entrée", async ({ page }, info) => {
    await ouvrir(page);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    if (estTelephone(info)) await page.getByTestId("agenda").getByRole("button", { name: /Fond PPT/ }).first().click();
    else await jour(page, "2026-10-02").click();
    await expect(page.getByText("Change la répétition dans la tâche").filter({ visible: true })).toBeVisible();
    await animationsFinies(page);
    await page.screenshot({ path: `test-results/calendrier-deplacer-captures/${info.project.name}-repetee.png` });
  });

  test("confirmation d'un créneau (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), GLISSER);
    await ouvrir(page);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await glisser(page, jour(page, "2026-10-25").locator('[data-source="scene"]'), jour(page, "2026-10-11"));
    await expect(page.getByRole("alertdialog").getByRole("radiogroup")).toBeVisible();
    await animationsFinies(page);
    await page.screenshot({ path: `test-results/calendrier-deplacer-captures/${info.project.name}-creneau.png` });
  });
});
