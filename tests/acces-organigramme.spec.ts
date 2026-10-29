import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./helpers/fakeSession";
import {
  audiencesNotifiables, canCreateEvenement, canCreateSetlist, canDeleteSetlist, canEditPlanning, canEditSetlist, canEditerEquipes,
  canGererPetitDej, canRetirerDate, canSaisirAbsence, canSeeEvenement, canSeeSetlist, canUseHarmonie, canVoirAbsencesDeTous,
  colonnesModifiables, creatableCategories, creatableEvenementPours, droitsDesPages, entreesBackOffice, equipesDe, estResponsable, faitDesPlannings,
  isCoordination, peutChangerReferents, peutModifierEquipe, peutPlacerMembre, peutPlacerSousEquipe, planningsDuBackOffice,
  sousPartiesEvenements, visibleCategories, widgetsPermis, type DateServie,
} from "../src/lib/access";
import { COLONNES_REGIE, PLANNINGS_DU_CULTE, ceQueCaOuvre, colonnesRemplies, sectionsCreables } from "../src/lib/acces/organigramme";
import { audienceLabel, isValidAudience, peutNotifierAudience } from "../src/lib/push/audiences";
import { droitsDePrevenir, droitsDePublication, getPlanning } from "../src/lib/planning/releases";
import { datesServies, type PlanningData } from "../src/lib/planning/names";
import { ANNONCE_SECTIONS } from "../src/types/annonce";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { UserProfile } from "../src/types/user";

// Lot AO, tranche AO-A (docs/spec-acces-organigramme.md, « Ce que chacun ouvre ») : chaque ligne du tableau, dans
// les deux sens (qui a l'accès, qui ne l'a pas), en nouveau mode (`backOffice = true`) ; puis l'ancien mode
// (`false`) qui garde les accès d'aujourd'hui. Fonctions pures, aucune page, profils fictifs.

const NEW = true;
const OLD = false;

type P = Partial<UserProfile> & { uid: string };
const profil = (p: P): UserProfile => ({
  email: `${p.uid}@example.com`, firstName: "", lastName: "", planningName: "", serviceRoles: {}, annonces: [], notify: [], ...p,
}) as UserProfile;
const user = (p: { uid: string; email?: string }) => ({ uid: p.uid, email: p.email ?? `${p.uid}@example.com` });

/** Louange, Musiciens (piano), sert au Campus. */
const ALINE = profil({ uid: "u-aline", dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Campus"], joue: ["piano"] });
/** Louange, Choristes, sert à Franco et au Campus. */
const BRUNO = profil({ uid: "u-bruno", dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone", "Campus"] });
/** Régie, sert au Campus. */
const CAMILLE = profil({ uid: "u-camille", dansEquipes: ["regie"], lieuxRegie: ["Campus"] });
/** Aucune équipe, inscrite au planning. */
const DORIAN = profil({ uid: "u-dorian", planningName: "Dorian Q." });
/** Membre du groupe Paix. */
const ELSA = profil({ uid: "u-elsa", groupe: "paix" });
/** Membre d'Amour (groupe sans setlists). */
const FANNY = profil({ uid: "u-fanny", groupe: "amour" });
/** Membre de l'EDD. */
const GILLES = profil({ uid: "u-gilles", dansEquipes: ["edd"] });
/** Musiciens : guitare. */
const HELENE = profil({ uid: "u-helene", dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["guitare"] });
/** Musiciens : batterie. */
const IVAN = profil({ uid: "u-ivan", dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["batterie"] });
/** Choriste qui joue du piano (coché par erreur) : pas de Musiciens, pas d'Harmonie. */
const JOSEPHINE = profil({ uid: "u-josephine", dansEquipes: ["louange"], sousEquipes: ["choristes"], joue: ["piano", "guitare"] });
/** Référent Louange. */
const KEVIN = profil({ uid: "u-kevin", dansEquipes: ["louange"], referentDe: ["louange"] });
/** Référent EDD. */
const LUCIE = profil({ uid: "u-lucie", dansEquipes: ["edd"], referentDe: ["edd"] });
/** Membre d'Orga. */
const MATHIS = profil({ uid: "u-mathis", dansEquipes: ["orga"] });
/** Référent de la sous-équipe Musiciens. */
const NOEMIE = profil({
  uid: "u-noemie", dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"], lieuxLouange: ["Campus"], joue: ["piano"],
});
/** Référent Régie. */
const OSMANE = profil({ uid: "u-osmane", dansEquipes: ["regie"], referentDe: ["regie"] });
/** Présidente du groupe Paix (son comité). */
const PAULINE = profil({ uid: "u-pauline", groupe: "paix", referentDe: ["comite-paix"] });
/** Rôle de groupe : remplit et publie Paix, prévient Paix. */
const QUENTIN = profil({ uid: "u-quentin", groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"] });
/** Référent Médias, sans rapport avec Louange. */
const ROMANE = profil({ uid: "u-romane", dansEquipes: ["medias"], referentDe: ["medias"] });
/** Profil à l'ancienne : rôles de service, cases cochées, rien dans l'organigramme. */
const SERGE = profil({
  uid: "u-serge", serviceRoles: { "Culte Francophone": ["musicien"], Campus: ["regie"] }, coordination: true, notify: ["*"],
  plannings: ["culte"], equipes: true, annonces: ["Culte Francophone"],
});
/** « Organigramme seul » : tout ce que le lot AO ajoute au profil, mais aucun rôle ni case à l'ancienne. */
const TIPHAINE = profil({
  uid: "u-tiphaine", dansEquipes: ["louange", "regie"], referentDe: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"],
  lieuxLouange: ["Campus"], lieuxRegie: ["Culte Francophone"], joue: ["piano"],
});
const ADMIN = profil({ uid: "uid-admin", email: ADMIN_EMAIL });

const setlist = (over: Partial<FSSetlist>): FSSetlist => ({
  id: "s1", title: "Setlist", leader: "", category: "Culte Francophone", date: "2026-11-08", language: "fr", notes: "", createdAt: null,
  items: [], ownerId: "u-autre", ...over,
}) as FSSetlist;
const FRANCO = setlist({ id: "franco" });
const CAMPUS = setlist({ id: "campus", category: "Campus" });
const PAIX = setlist({ id: "paix", category: "Groupe Paix" });
const FIDELITE = setlist({ id: "fidelite", category: "Groupe Fidélité" });
const ZHONG = setlist({ id: "zhong", category: "中班" });
const FETE = setlist({ id: "fete", category: "Noël", ownerId: null, fete: { programme: "noel-2026", passage: "p1", qui: "" } });

const voit = (p: UserProfile, s: FSSetlist, dates?: readonly DateServie[]) => canSeeSetlist(user(p), p, s, dates, NEW);

// ─── Setlists ───────────────────────────────────────────────────────────────

test.describe("pur : setlists d'un lieu du culte (C2, C3)", () => {
  test("Louange qui sert au Campus voit et crée le Campus, pas Franco", () => {
    expect(voit(ALINE, CAMPUS)).toBe(true);
    expect(voit(ALINE, FRANCO)).toBe(false);
    expect(creatableCategories(ALINE, NEW)).toEqual(["Campus"]);
    expect(visibleCategories(ALINE, NEW)).toEqual(["Campus"]);
    expect(canCreateSetlist(user(ALINE), ALINE, NEW)).toBe(true);
  });

  test("toute sous-équipe de Louange : Franco et Campus pour une choriste qui sert aux deux", () => {
    expect(creatableCategories(BRUNO, NEW)).toEqual(["Culte Francophone", "Campus"]);
    expect(voit(BRUNO, FRANCO)).toBe(true);
    expect(voit(BRUNO, CAMPUS)).toBe(true);
    expect(voit(BRUNO, setlist({ category: "Intergroupe" }))).toBe(false);
  });

  test("Régie au Campus voit sans créer", () => {
    expect(voit(CAMILLE, CAMPUS)).toBe(true);
    expect(voit(CAMILLE, FRANCO)).toBe(false);
    expect(creatableCategories(CAMILLE, NEW)).toEqual([]);
    expect(canCreateSetlist(user(CAMILLE), CAMILLE, NEW)).toBe(false);
    expect(canEditSetlist(user(CAMILLE), CAMILLE, CAMPUS, NEW)).toBe(false);
  });

  test("un compte sans équipe ne voit aucune setlist de lieu, mais garde les siennes et celles de fête", () => {
    expect(voit(DORIAN, FRANCO)).toBe(false);
    expect(voit(DORIAN, CAMPUS)).toBe(false);
    expect(visibleCategories(DORIAN, NEW)).toEqual([]);
    expect(canCreateSetlist(user(DORIAN), DORIAN, NEW)).toBe(false);
    expect(voit(DORIAN, setlist({ ownerId: DORIAN.uid }))).toBe(true);
    expect(voit(DORIAN, setlist({ isPrivate: true, ownerId: DORIAN.uid }))).toBe(true);
    expect(voit(DORIAN, setlist({ editeurs: [DORIAN.uid] }))).toBe(true);
    expect(voit(DORIAN, FETE)).toBe(true);
    expect(voit(DORIAN, setlist({ isPrivate: true }))).toBe(false);
  });

  test("les rôles de service du profil ne donnent plus rien (A4) ; les admins gardent tout", () => {
    expect(voit(SERGE, FRANCO)).toBe(false);
    expect(visibleCategories(SERGE, NEW)).toEqual([]);
    expect(creatableCategories(SERGE, NEW)).toEqual([]);
    expect(voit(ADMIN, FRANCO)).toBe(true);
    expect(canCreateSetlist(user(ADMIN), ADMIN, NEW)).toBe(true);
  });
});

test.describe("pur : lire la setlist d'une date où l'on sert (F1)", () => {
  const dates: DateServie[] = [{ date: "2026-11-08", categorie: "Culte Francophone" }];

  test("inscrit à une date : voit la setlist de cette date et de cette catégorie, pas la semaine suivante ni une autre catégorie", () => {
    expect(voit(DORIAN, FRANCO, dates)).toBe(true);
    expect(voit(DORIAN, setlist({ date: "2026-11-15" }), dates), "la semaine suivante").toBe(false);
    expect(voit(DORIAN, CAMPUS, dates), "une autre catégorie le même jour").toBe(false);
    expect(voit(DORIAN, FRANCO), "sans dates servies").toBe(false);
    expect(voit(DORIAN, setlist({ isPrivate: true }), dates), "une setlist privée reste privée").toBe(false);
  });

  test("lecture seule : ni modifier, ni supprimer, ni créer", () => {
    expect(canEditSetlist(user(DORIAN), DORIAN, FRANCO, NEW)).toBe(false);
    expect(canDeleteSetlist(user(DORIAN), DORIAN, FRANCO, NEW)).toBe(false);
    expect(canCreateSetlist(user(DORIAN), DORIAN, NEW)).toBe(false);
    expect(creatableCategories(DORIAN, NEW)).toEqual([]);
  });

  test("Campus : le matin et le soir d'un même jour ne se confondent pas", () => {
    const soir: DateServie[] = [{ date: "2026-11-08", categorie: "Campus", moment: "soir" }];
    expect(voit(DORIAN, setlist({ category: "Campus", moment: "soir" }), soir)).toBe(true);
    expect(voit(DORIAN, setlist({ category: "Campus", moment: "matin" }), soir)).toBe(false);
    expect(voit(DORIAN, setlist({ category: "Campus" }), soir), "ancienne setlist sans moment").toBe(true);
  });

  test("ancien mode : le planning n'ouvre rien", () => {
    expect(canSeeSetlist(user(DORIAN), DORIAN, FRANCO, dates, OLD)).toBe(false);
  });

  test("datesServies : les dates du planning avec leur catégorie, sans doublon ni service sans setlist", () => {
    const data = {
      culte: [["2026-11-08", "", "", "", "Dorian Q.", "", "", "", "", "", "", ""], ["2026-11-15", "Autre P."]],
      dejeuner: [["2026-11-08", "Dorian Q."]], petitDej: [], paix: [], bonte: [], fidelite: [], intergroupe: [], interfranco: [], edd: {},
      campus: [{ d: "Soir", date: "2026-11-22", pres: "Dorian Q.", ch: "", mu: "Dorian Q.", rg: "", ent: "2026-11-20", entTime: "18:00", entLieu: "Salle" }],
    } as unknown as PlanningData;
    expect(datesServies(data, "Dorian Q.")).toEqual([
      { date: "2026-11-08", categorie: "Culte Francophone" },
      { date: "2026-11-22", categorie: "Campus", moment: "soir" },
    ]);
    expect(datesServies(data, "")).toEqual([]);
  });
});

test.describe("pur : setlists d'un groupe et de l'EDD", () => {
  test("membre de groupe : voit et crée dans son groupe, pas dans les autres", () => {
    expect(creatableCategories(ELSA, NEW)).toEqual(["Groupe Paix"]);
    expect(voit(ELSA, PAIX)).toBe(true);
    expect(voit(ELSA, FIDELITE)).toBe(false);
    expect(voit(ELSA, FRANCO)).toBe(false);
    expect(canCreateSetlist(user(ELSA), ELSA, NEW)).toBe(true);
    expect(creatableCategories(FANNY, NEW), "Amour n'a pas de setlists").toEqual([]);
  });

  test("membre de l'EDD : voit et crée dans les trois classes", () => {
    expect(creatableCategories(GILLES, NEW)).toEqual(["中班", "大班", "高班"]);
    expect(voit(GILLES, ZHONG)).toBe(true);
    expect(voit(GILLES, setlist({ category: "大班" }))).toBe(true);
    expect(voit(GILLES, FRANCO)).toBe(false);
    expect(canCreateSetlist(user(GILLES), GILLES, NEW)).toBe(true);
  });
});

// ─── Harmonie ───────────────────────────────────────────────────────────────

test.describe("pur : Harmonie", () => {
  const h = (p: UserProfile, services: { role: string }[] = []) => canUseHarmonie(user(p), services, p, NEW);

  test("Musiciens avec piano ou guitare, pas la batterie ni une choriste", () => {
    expect(h(ALINE)).toEqual({ piano: true, guitare: false });
    expect(h(HELENE)).toEqual({ piano: false, guitare: true });
    expect(h(IVAN)).toEqual({ piano: false, guitare: false });
    expect(h(BRUNO)).toEqual({ piano: false, guitare: false });
    expect(h(JOSEPHINE), "joue coché mais pas dans Musiciens").toEqual({ piano: false, guitare: false });
    expect(h(DORIAN)).toEqual({ piano: false, guitare: false });
    expect(h(ADMIN)).toEqual({ piano: true, guitare: true });
  });

  test("le planning n'ouvre plus Harmonie ; l'ancien mode le lit encore", () => {
    expect(h(DORIAN, [{ role: "Piano" }, { role: "Guitare" }])).toEqual({ piano: false, guitare: false });
    expect(canUseHarmonie(user(DORIAN), [{ role: "Piano" }], DORIAN, OLD)).toEqual({ piano: true, guitare: false });
    expect(canUseHarmonie(user(ALINE), [], ALINE, OLD), "l'organigramme seul n'ouvre rien à l'ancienne").toEqual({ piano: false, guitare: false });
  });
});

// ─── Coordination ───────────────────────────────────────────────────────────

test.describe("pur : coordination (D5)", () => {
  const coord = (p: UserProfile) => isCoordination(user(p), p, NEW);

  test("référent Louange, référent EDD, Orga ; pas le référent Musiciens ni la case cochée", () => {
    expect(coord(KEVIN)).toBe(true);
    expect(coord(LUCIE)).toBe(true);
    expect(coord(MATHIS)).toBe(true);
    expect(coord(NOEMIE), "référent de sous-équipe").toBe(false);
    expect(coord(OSMANE), "référent Régie").toBe(false);
    expect(coord(ROMANE), "référent d'une autre équipe").toBe(false);
    expect(coord(SERGE), "coordination cochée, nouveau mode").toBe(false);
    expect(coord(ALINE)).toBe(false);
    expect(coord(ADMIN)).toBe(true);
  });
});

// ─── Plannings ──────────────────────────────────────────────────────────────

test.describe("pur : remplir, publier, prévenir les plannings", () => {
  test("planning du culte : référent Louange toutes colonnes, référent Régie Sono / PPT seulement, référent Musiciens rien (E2)", () => {
    for (const key of PLANNINGS_DU_CULTE) {
      expect(colonnesRemplies(KEVIN, key), key).toBe("toutes");
      expect(colonnesRemplies(OSMANE, key), key).toEqual(COLONNES_REGIE);
      expect(colonnesRemplies(NOEMIE, key), key).toBeNull();
    }
    expect(COLONNES_REGIE).toEqual(["sono", "sonoLive", "ppt"]);
    expect(colonnesModifiables(user(KEVIN), KEVIN, "culte", NEW)).toBe("toutes");
    expect(colonnesModifiables(user(OSMANE), OSMANE, "culte", NEW)).toEqual(["sono", "sonoLive", "ppt"]);
    expect(colonnesModifiables(user(NOEMIE), NOEMIE, "culte", NEW)).toBeNull();
    expect(colonnesModifiables(user(ADMIN), ADMIN, "culte", NEW)).toBe("toutes");
    expect(canEditPlanning(user(KEVIN), KEVIN, "campusSoir", NEW)).toBe(true);
    expect(canEditPlanning(user(OSMANE), OSMANE, "culte", NEW)).toBe(true);
    expect(canEditPlanning(user(NOEMIE), NOEMIE, "culte", NEW)).toBe(false);
    expect(canEditPlanning(user(ALINE), ALINE, "culte", NEW)).toBe(false);
  });

  test("EDD : le référent EDD, ses trois classes, pas le culte ; le référent Louange pas l'EDD", () => {
    for (const key of ["eddZhongban", "eddDaban", "eddGaoban"]) {
      expect(colonnesRemplies(LUCIE, key), key).toBe("toutes");
      expect(colonnesRemplies(KEVIN, key), key).toBeNull();
    }
    expect(colonnesRemplies(LUCIE, "culte")).toBeNull();
  });

  test("groupes : par les rôles de l'organigramme du groupe (remplitParRole), pas par la case plannings", () => {
    expect(colonnesRemplies(QUENTIN, "paix")).toBe("toutes");
    expect(colonnesRemplies(QUENTIN, "bonte")).toBeNull();
    expect(canEditPlanning(user(QUENTIN), QUENTIN, "paix", NEW)).toBe(true);
    expect(canEditPlanning(user(SERGE), SERGE, "culte", NEW), "la case plannings ne compte plus").toBe(false);
  });

  test("Table : Orga (aucune ligne du tableau ne la nomme) ; petit déj, absences et dates suivent canEditPlanning", () => {
    expect(colonnesRemplies(MATHIS, "table")).toBe("toutes");
    expect(colonnesRemplies(KEVIN, "table")).toBeNull();
    expect(canGererPetitDej(user(MATHIS), MATHIS, NEW)).toBe(true);
    expect(canGererPetitDej(user(KEVIN), KEVIN, NEW)).toBe(false);
    expect(faitDesPlannings(user(KEVIN), KEVIN, NEW)).toBe(true);
    expect(faitDesPlannings(user(QUENTIN), QUENTIN, NEW)).toBe(true);
    expect(faitDesPlannings(user(NOEMIE), NOEMIE, NEW)).toBe(false);
    expect(faitDesPlannings(user(SERGE), SERGE, NEW)).toBe(false);
    expect(canVoirAbsencesDeTous(user(OSMANE), OSMANE, NEW)).toBe(true);
    expect(canVoirAbsencesDeTous(user(DORIAN), DORIAN, NEW)).toBe(false);
    expect(canSaisirAbsence(user(KEVIN), KEVIN, "u-autre", NEW)).toBe(true);
    expect(canSaisirAbsence(user(DORIAN), DORIAN, "u-autre", NEW)).toBe(false);
    expect(canSaisirAbsence(user(DORIAN), DORIAN, DORIAN.uid, NEW), "la sienne").toBe(true);
    expect(canRetirerDate(user(KEVIN), KEVIN, "interfranco", NEW)).toBe(true);
    expect(canRetirerDate(user(KEVIN), KEVIN, "culte", NEW), "le culte a tous ses dimanches").toBe(false);
    expect(canRetirerDate(user(NOEMIE), NOEMIE, "interfranco", NEW)).toBe(false);
  });

  test("publier et prévenir : le référent Louange publie le culte, le référent Régie prévient sans publier (23/10/2026), un rôle de groupe son groupe, pas le référent Musiciens", () => {
    const culte = getPlanning("culte")!;
    const paix = getPlanning("paix")!;
    const publie = (pl: typeof culte, p: UserProfile) => droitsDePublication(pl, false, p, NEW);
    const previent = (pl: typeof culte, p: UserProfile) => droitsDePrevenir(pl, false, p, NEW);
    expect(publie(culte, KEVIN)).toBe(true);
    expect(previent(culte, KEVIN)).toBe(true);
    expect(publie(culte, OSMANE), "la Régie ne publie pas le trimestre").toBe(false);
    expect(previent(culte, OSMANE), "elle prévient des changements").toBe(true);
    for (const p of [NOEMIE, LUCIE, MATHIS, ALINE, DORIAN]) {
      expect(publie(culte, p), p.uid).toBe(false);
      expect(previent(culte, p), p.uid).toBe(false);
    }
    expect(publie(paix, QUENTIN)).toBe(true);
    expect(publie(culte, QUENTIN)).toBe(false);
    expect(publie(paix, KEVIN)).toBe(false);
    // « Notifier » seul prévient sans publier.
    const notifieur = profil({ uid: "u-nolwenn", notifieParRole: ["Groupe Paix"] });
    expect(publie(paix, notifieur)).toBe(false);
    expect(previent(paix, notifieur)).toBe(true);
    expect(droitsDePublication(culte, true, null, NEW), "un admin").toBe(true);
    // Les droits cochés `notify` ne comptent plus.
    expect(publie(culte, SERGE)).toBe(false);
    expect(previent(culte, SERGE)).toBe(false);
  });

  test("les onglets du Back-Office suivent : culte et ses lieux, EDD, Table, groupes", () => {
    expect(planningsDuBackOffice(user(KEVIN), KEVIN, NEW)).toEqual(["culte", "campus", "intergroupe", "interfranco"]);
    expect(planningsDuBackOffice(user(OSMANE), OSMANE, NEW)).toEqual(["culte", "campus", "intergroupe", "interfranco"]);
    expect(planningsDuBackOffice(user(LUCIE), LUCIE, NEW)).toEqual(["edd"]);
    expect(planningsDuBackOffice(user(MATHIS), MATHIS, NEW)).toEqual(["table"]);
    expect(planningsDuBackOffice(user(QUENTIN), QUENTIN, NEW)).toEqual(["groupes"]);
    expect(planningsDuBackOffice(user(NOEMIE), NOEMIE, NEW)).toEqual([]);
    expect(planningsDuBackOffice(user(SERGE), SERGE, NEW)).toEqual([]);
  });
});

// ─── Notifier ───────────────────────────────────────────────────────────────

test.describe("pur : notifier", () => {
  const droits = (p: UserProfile) => audiencesNotifiables(p, NEW);

  test("Orga : toute l'Église ; un référent : son équipe ; le référent Louange : toute la Louange ; un référent de sous-équipe : la sienne", () => {
    expect(droits(MATHIS)).toEqual(["*"]);
    expect(droits(OSMANE)).toEqual(["equipe:regie"]);
    expect(droits(ROMANE)).toEqual(["equipe:medias"]);
    expect(droits(KEVIN)).toEqual(["equipe:louange", "louange:presidence", "louange:musiciens", "louange:choristes"]);
    expect(droits(NOEMIE)).toEqual(["louange:musiciens"]);
    expect(droits(QUENTIN), "rôle de groupe").toEqual(["Groupe Paix"]);
    expect(droits(ALINE)).toEqual([]);
    expect(droits(SERGE), "notify coché, nouveau mode").toEqual([]);
  });

  test("peutNotifierAudience : l'équipe ou la sous-équipe de son référent, rien d'autre", () => {
    const peut = (a: string, p: UserProfile) => peutNotifierAudience(a, false, p, NEW);
    expect(peut("louange:musiciens", NOEMIE)).toBe(true);
    expect(peut("louange:choristes", NOEMIE)).toBe(false);
    expect(peut("equipe:louange", NOEMIE)).toBe(false);
    expect(peut("louange:choristes", KEVIN)).toBe(true);
    expect(peut("equipe:regie", OSMANE)).toBe(true);
    expect(peut("equipe:medias", OSMANE)).toBe(false);
    expect(peut("equipe:medias", MATHIS), "Orga : tout").toBe(true);
    expect(peut("Groupe Paix", QUENTIN)).toBe(true);
    expect(peut("Campus", SERGE)).toBe(false);
    expect(peutNotifierAudience("equipe:medias", true, null, NEW), "un admin").toBe(true);
  });

  test("audiences valides et libellés", () => {
    expect(isValidAudience("equipe:regie", NEW)).toBe(true);
    expect(isValidAudience("louange:musiciens", NEW)).toBe(true);
    expect(isValidAudience("equipe:inconnue", NEW)).toBe(false);
    expect(isValidAudience("louange:batteurs", NEW)).toBe(false);
    expect(isValidAudience("equipe:regie", OLD), "ancien mode : pas d'audience d'équipe").toBe(false);
    expect(audienceLabel("equipe:regie")).toBe("TEAM RÉGIE");
    expect(audienceLabel("equipe:louange")).toBe("Toute la Louange");
    expect(audienceLabel("louange:choristes")).toBe("Louange · Choristes");
    expect(audienceLabel("*")).toBe("Tout le monde");
  });
});

// ─── Évènements ─────────────────────────────────────────────────────────────

test.describe("pur : créer un évènement", () => {
  test("de section : référent Louange pour le culte, président et VP pour leur groupe, personne d'autre", () => {
    expect(sectionsCreables(KEVIN, ANNONCE_SECTIONS)).toEqual(["Culte Francophone"]);
    expect(sectionsCreables(PAULINE, ANNONCE_SECTIONS)).toEqual(["Groupe Paix"]);
    expect(sectionsCreables(LUCIE, ANNONCE_SECTIONS), "pas de section EDD").toEqual([]);
    expect(sectionsCreables(NOEMIE, ANNONCE_SECTIONS)).toEqual([]);
    expect(canCreateEvenement(user(PAULINE), PAULINE, "Groupe Paix", NEW)).toBe(true);
    expect(canCreateEvenement(user(PAULINE), PAULINE, "Groupe Fidélité", NEW)).toBe(false);
    expect(canCreateEvenement(user(PAULINE), PAULINE, "eglise", NEW)).toBe(false);
    expect(canCreateEvenement(user(NOEMIE), NOEMIE, "Culte Francophone", NEW)).toBe(false);
    expect(canCreateEvenement(user(SERGE), SERGE, "Culte Francophone", NEW), "droit d'annonces coché").toBe(false);
    expect(creatableEvenementPours(user(PAULINE), PAULINE, ANNONCE_SECTIONS, NEW)).toEqual(["Groupe Paix", "equipe:comite-paix"]);
  });

  test("pour toute l'Église : la coordination", () => {
    expect(canCreateEvenement(user(KEVIN), KEVIN, "eglise", NEW)).toBe(true);
    expect(canCreateEvenement(user(LUCIE), LUCIE, "eglise", NEW)).toBe(true);
    expect(canCreateEvenement(user(MATHIS), MATHIS, "Groupe Bonté", NEW)).toBe(true);
    expect(canCreateEvenement(user(NOEMIE), NOEMIE, "eglise", NEW)).toBe(false);
    expect(creatableEvenementPours(user(KEVIN), KEVIN, ANNONCE_SECTIONS, NEW)).toEqual(["eglise", ...ANNONCE_SECTIONS, "equipe:louange"]);
    expect(creatableEvenementPours(user(ALINE), ALINE, ANNONCE_SECTIONS, NEW)).toEqual([]);
    expect(sousPartiesEvenements(user(KEVIN), KEVIN, NEW)).toEqual(["evenements", "scene"]);
    expect(sousPartiesEvenements(user(PAULINE), PAULINE, NEW)).toEqual(["evenements"]);
    expect(sousPartiesEvenements(user(NOEMIE), NOEMIE, NEW), "un référent de sous-équipe ne crée pas d'évènement").toEqual([]);
    expect(sousPartiesEvenements(user(ALINE), ALINE, NEW)).toEqual([]);
  });

  test("voir un évènement de section : par la catégorie qu'on voit", () => {
    const e = { pour: "Campus", organisateurUid: "u-autre" };
    expect(canSeeEvenement(user(ALINE), ALINE, e, NEW)).toBe(true);
    expect(canSeeEvenement(user(BRUNO), BRUNO, { ...e, pour: "Intergroupe" }, NEW)).toBe(false);
    expect(canSeeEvenement(user(DORIAN), DORIAN, e, NEW)).toBe(false);
    expect(canSeeEvenement(user(KEVIN), KEVIN, e, NEW), "la coordination voit tout").toBe(true);
  });
});

// ─── Tenir l'organigramme ───────────────────────────────────────────────────

test.describe("pur : tenir l'organigramme", () => {
  test("le référent Musiciens place un musicien, pas un choriste, et ne change pas les référents", () => {
    expect(canEditerEquipes(user(NOEMIE), NOEMIE, NEW)).toBe(true);
    expect(peutPlacerMembre(user(NOEMIE), NOEMIE, "louange", ["musiciens"], NEW)).toBe(true);
    expect(peutPlacerMembre(user(NOEMIE), NOEMIE, "louange", ["choristes"], NEW)).toBe(false);
    expect(peutPlacerMembre(user(NOEMIE), NOEMIE, "louange", [], NEW)).toBe(false);
    expect(peutPlacerMembre(user(NOEMIE), NOEMIE, "medias", ["musiciens"], NEW)).toBe(false);
    expect(peutPlacerSousEquipe(user(NOEMIE), NOEMIE, "musiciens", NEW)).toBe(true);
    expect(peutPlacerSousEquipe(user(NOEMIE), NOEMIE, "choristes", NEW)).toBe(false);
    expect(peutModifierEquipe(user(NOEMIE), NOEMIE, "louange", NEW)).toBe(false);
    expect(peutChangerReferents(user(NOEMIE), NOEMIE, "louange", NEW)).toBe(false);
  });

  test("le référent Louange tient toute la Louange et change ses référents, pas une autre équipe", () => {
    expect(peutModifierEquipe(user(KEVIN), KEVIN, "louange", NEW)).toBe(true);
    for (const s of ["presidence", "musiciens", "choristes"] as const) expect(peutPlacerSousEquipe(user(KEVIN), KEVIN, s, NEW), s).toBe(true);
    expect(peutPlacerMembre(user(KEVIN), KEVIN, "louange", ["choristes"], NEW)).toBe(true);
    expect(peutChangerReferents(user(KEVIN), KEVIN, "louange", NEW)).toBe(true);
    expect(peutModifierEquipe(user(KEVIN), KEVIN, "medias", NEW)).toBe(false);
    expect(peutChangerReferents(user(KEVIN), KEVIN, "medias", NEW)).toBe(false);
  });

  test("un référent tient son équipe ; Orga tient tout et change tous les référents", () => {
    expect(peutModifierEquipe(user(OSMANE), OSMANE, "regie", NEW)).toBe(true);
    expect(peutPlacerMembre(user(OSMANE), OSMANE, "regie", [], NEW)).toBe(true);
    expect(peutModifierEquipe(user(OSMANE), OSMANE, "louange", NEW)).toBe(false);
    expect(peutChangerReferents(user(OSMANE), OSMANE, "regie", NEW)).toBe(false);
    expect(peutModifierEquipe(user(MATHIS), MATHIS, "medias", NEW)).toBe(true);
    expect(peutPlacerSousEquipe(user(MATHIS), MATHIS, "choristes", NEW)).toBe(true);
    expect(peutChangerReferents(user(MATHIS), MATHIS, "louange", NEW)).toBe(true);
    expect(peutChangerReferents(user(MATHIS), MATHIS, "regie", NEW)).toBe(true);
  });

  test("ni un membre simple, ni la case Équipes ; les admins tiennent tout", () => {
    expect(canEditerEquipes(user(ALINE), ALINE, NEW)).toBe(false);
    expect(canEditerEquipes(user(DORIAN), DORIAN, NEW)).toBe(false);
    expect(canEditerEquipes(user(SERGE), SERGE, NEW), "droit Équipes coché").toBe(false);
    expect(peutModifierEquipe(user(SERGE), SERGE, "louange", NEW)).toBe(false);
    expect(canEditerEquipes(user(ADMIN), ADMIN, NEW)).toBe(true);
    expect(peutChangerReferents(user(ADMIN), ADMIN, "regie", NEW)).toBe(true);
    expect(peutPlacerMembre(user(ADMIN), ADMIN, "louange", [], NEW)).toBe(true);
    expect(peutModifierEquipe(null, ADMIN, "louange", NEW)).toBe(false);
  });
});

// ─── Compte sans équipe, équipes et Back-Office ─────────────────────────────

test.describe("pur : équipes, responsables et entrées du Back-Office", () => {
  test("equipesDe : « louange » vient de l'organigramme ou d'un groupe, plus de serviceRoles", () => {
    expect(equipesDe(SERGE, NEW)).toEqual([]);
    expect(equipesDe(SERGE, OLD)).toEqual(["louange"]);
    expect(equipesDe(ELSA, NEW)).toEqual(["louange"]);
    expect(equipesDe(ALINE, NEW)).toEqual(["louange"]);
    expect(equipesDe(CAMILLE, NEW)).toEqual(["regie"]);
    expect(equipesDe(DORIAN, NEW)).toEqual([]);
  });

  test("responsable : la coordination, un référent, un rôle de groupe ; pas un membre, pas les cases cochées", () => {
    for (const p of [KEVIN, LUCIE, MATHIS, NOEMIE, OSMANE, ROMANE, PAULINE, QUENTIN]) expect(estResponsable(user(p), p, NEW), p.uid).toBe(true);
    for (const p of [ALINE, BRUNO, CAMILLE, DORIAN, ELSA, SERGE]) expect(estResponsable(user(p), p, NEW), p.uid).toBe(false);
    expect(estResponsable(user(ADMIN), ADMIN, NEW)).toBe(true);
  });

  test("entrées : un compte sans équipe n'en a aucune, la case Messages vient de l'organigramme", () => {
    expect(entreesBackOffice(user(DORIAN), DORIAN, NEW)).toEqual([]);
    // Piste A (BO4) : un simple membre d'équipe n'a plus de Back-Office.
    expect(entreesBackOffice(user(ALINE), ALINE, NEW)).toEqual([]);
    expect(entreesBackOffice(user(SERGE), SERGE, NEW)).toEqual([]);
    const kevin = entreesBackOffice(user(KEVIN), KEVIN, NEW);
    for (const e of ["planning", "equipes", "messages"] as const) expect(kevin, e).toContain(e);
    expect(droitsDesPages(user(KEVIN), KEVIN, NEW)).toEqual({ taches: true, evenements: true, reunions: true });
    expect(entreesBackOffice(user(NOEMIE), NOEMIE, NEW)).toEqual(expect.arrayContaining(["equipes", "messages"]));
    expect(entreesBackOffice(user(NOEMIE), NOEMIE, NEW)).not.toContain("planning");
    expect(widgetsPermis(user(DORIAN), DORIAN, NEW)).toEqual([]);
    expect(widgetsPermis(user(KEVIN), KEVIN, NEW)).toContain("scene");
  });
});

// ─── « Ce que ça ouvre » ────────────────────────────────────────────────────

test.describe("pur : ceQueCaOuvre", () => {
  const cles = (p: UserProfile) => ceQueCaOuvre(p).map((a) => a.cle);

  test("une Louange du Campus : setlists du Campus (Louange, là où tu sers), Harmonie (Musiciens, piano)", () => {
    expect(ceQueCaOuvre(ALINE)).toEqual([
      { cle: "acces.ouvre.setlistsCreer", params: { lieux: "categories.Campus" }, pourquoi: "acces.pourquoi.louangeLieu" },
      { cle: "acces.ouvre.harmonie", params: { instruments: "acces.instrument.piano" }, pourquoi: "acces.pourquoi.musiciensJoue" },
    ]);
  });

  test("`nommer` traduit les noms des params", () => {
    const nommer = (c: string) => ({ "categories.Campus": "Campus", "categories.Culte Francophone": "Franco" })[c] ?? c;
    expect(ceQueCaOuvre(BRUNO, nommer)[0].params).toEqual({ lieux: "Franco, Campus" });
  });

  test("Régie : voir seulement ; référent de sous-équipe : notifier et placer ses musiciens", () => {
    expect(ceQueCaOuvre(CAMILLE)).toEqual([
      { cle: "acces.ouvre.setlistsVoir", params: { lieux: "categories.Campus" }, pourquoi: "acces.pourquoi.regieLieu" },
    ]);
    const noemie = ceQueCaOuvre(NOEMIE);
    expect(noemie).toContainEqual({ cle: "acces.ouvre.notifierMusiciens", params: { sous: "acces.sousEquipe.musiciens" }, pourquoi: "acces.pourquoi.referentSous" });
    expect(noemie).toContainEqual({ cle: "acces.ouvre.organigrammeMusiciens", params: { sous: "acces.sousEquipe.musiciens" }, pourquoi: "acces.pourquoi.referentSous" });
    expect(noemie.map((a) => a.cle)).not.toContain("acces.ouvre.coordination");
  });

  test("référent Louange : coordination, planning du culte, notifier la Louange, placer ses sous-équipes", () => {
    const kevin = ceQueCaOuvre(KEVIN);
    expect(kevin.find((a) => a.cle === "acces.ouvre.coordination")?.pourquoi).toBe("acces.pourquoi.referentLouange");
    expect(kevin.map((a) => a.cle)).toEqual(expect.arrayContaining([
      "acces.ouvre.planningCulte", "acces.ouvre.notifierEquipe", "acces.ouvre.evenementSection", "acces.ouvre.organigrammeEquipe",
    ]));
    expect(cles(OSMANE)).toEqual(expect.arrayContaining(["acces.ouvre.planningCulteRegie", "acces.ouvre.notifierEquipe"]));
    expect(cles(LUCIE)).toEqual(expect.arrayContaining(["acces.ouvre.planningEdd", "acces.ouvre.coordination"]));
    expect(cles(MATHIS)).toEqual(expect.arrayContaining(["acces.ouvre.notifierTous", "acces.ouvre.organigrammeTout", "acces.ouvre.planningTable"]));
  });

  test("groupe, EDD, présidence de groupe ; un compte sans équipe et les cases cochées : rien", () => {
    expect(cles(ELSA)).toEqual(["acces.ouvre.setlistsGroupe"]);
    expect(cles(GILLES)).toEqual(["acces.ouvre.setlistsEdd"]);
    expect(cles(PAULINE)).toEqual(["acces.ouvre.setlistsGroupe", "acces.ouvre.evenementSection"]);
    expect(cles(QUENTIN)).toEqual(expect.arrayContaining(["acces.ouvre.setlistsGroupe", "acces.ouvre.planningGroupe", "acces.ouvre.notifierGroupe"]));
    expect(ceQueCaOuvre(DORIAN)).toEqual([]);
    expect(ceQueCaOuvre(SERGE)).toEqual([]);
    expect(ceQueCaOuvre(null)).toEqual([]);
  });
});

// ─── Ancien mode (backOffice = false) ───────────────────────────────────────

test.describe("pur : l'ancien mode garde les accès d'aujourd'hui", () => {
  const s = SERGE;
  const u = user(s);

  test("un profil à l'ancienne garde setlists, coordination, plannings, notifications, équipes, évènements", () => {
    expect(visibleCategories(s, OLD).sort()).toEqual(["Campus", "Culte Francophone"]);
    expect(creatableCategories(s, OLD)).toEqual(["Culte Francophone"]);
    expect(canSeeSetlist(u, s, FRANCO, undefined, OLD)).toBe(true);
    expect(canSeeSetlist(u, s, CAMPUS, undefined, OLD)).toBe(true);
    expect(canSeeSetlist(u, s, PAIX, undefined, OLD)).toBe(false);
    expect(canCreateSetlist(u, s, OLD)).toBe(true);
    expect(isCoordination(u, s, OLD)).toBe(true);
    expect(canEditPlanning(u, s, "culte", OLD)).toBe(true);
    expect(canEditPlanning(u, s, "paix", OLD)).toBe(false);
    expect(colonnesModifiables(u, s, "culte", OLD)).toBe("toutes");
    expect(colonnesModifiables(u, s, "paix", OLD)).toBeNull();
    expect(faitDesPlannings(u, s, OLD)).toBe(true);
    expect(audiencesNotifiables(s, OLD)).toEqual(["*"]);
    expect(peutNotifierAudience("Campus", false, s, OLD)).toBe(true);
    expect(droitsDePublication(getPlanning("culte")!, false, s, OLD)).toBe(true);
    expect(droitsDePrevenir(getPlanning("culte")!, false, s, OLD)).toBe(true);
    expect(canEditerEquipes(u, s, OLD)).toBe(true);
    expect(peutModifierEquipe(u, s, "regie", OLD)).toBe(true);
    expect(canCreateEvenement(u, s, "Culte Francophone", OLD)).toBe(true);
    expect(equipesDe(s, OLD)).toEqual(["louange"]);
    expect(estResponsable(u, s, OLD)).toBe(true);
    expect(entreesBackOffice(u, s, OLD)).toEqual(expect.arrayContaining(["planning", "equipes", "messages"]));
    expect(planningsDuBackOffice(u, s, OLD), "notify « * » publie aussi les groupes").toEqual(["culte", "groupes"]);
  });

  test("les droits d'un profil à l'ancienne : un choriste crée et un régie ne crée pas", () => {
    const choriste = profil({ uid: "u-vivien", serviceRoles: { "Culte Francophone": ["chanteur"], Campus: ["regie"] } });
    expect(creatableCategories(choriste, OLD)).toEqual(["Culte Francophone"]);
    expect(visibleCategories(choriste, OLD)).toEqual(["Culte Francophone", "Campus"]);
  });

  test("un profil « organigramme seul » n'y gagne aucun accès", () => {
    const t = TIPHAINE;
    const ut = user(t);
    expect(visibleCategories(t, OLD)).toEqual([]);
    expect(creatableCategories(t, OLD)).toEqual([]);
    expect(canCreateSetlist(ut, t, OLD)).toBe(false);
    expect(canSeeSetlist(ut, t, CAMPUS, [{ date: CAMPUS.date, categorie: "Campus" }], OLD), "ni F1").toBe(false);
    expect(canUseHarmonie(ut, [], t, OLD)).toEqual({ piano: false, guitare: false });
    expect(isCoordination(ut, t, OLD)).toBe(false);
    expect(canEditPlanning(ut, t, "culte", OLD)).toBe(false);
    expect(colonnesModifiables(ut, t, "culte", OLD)).toBeNull();
    expect(faitDesPlannings(ut, t, OLD)).toBe(false);
    expect(audiencesNotifiables(t, OLD)).toEqual([]);
    expect(peutNotifierAudience("equipe:louange", false, t, OLD)).toBe(false);
    expect(droitsDePublication(getPlanning("culte")!, false, t, OLD)).toBe(false);
    expect(droitsDePrevenir(getPlanning("culte")!, false, t, OLD)).toBe(false);
    expect(canEditerEquipes(ut, t, OLD)).toBe(false);
    expect(peutPlacerSousEquipe(ut, t, "musiciens", OLD)).toBe(false);
    expect(peutPlacerMembre(ut, t, "louange", ["musiciens"], OLD)).toBe(false);
    expect(canCreateEvenement(ut, t, "Culte Francophone", OLD)).toBe(false);
    expect(creatableEvenementPours(ut, t, ANNONCE_SECTIONS, OLD).filter((p) => !p.startsWith("equipe:"))).toEqual([]);
    expect(planningsDuBackOffice(ut, t, OLD)).toEqual([]);
  });

  test("les admins ont tout dans les deux modes", () => {
    for (const mode of [OLD, NEW]) {
      expect(isCoordination(user(ADMIN), ADMIN, mode)).toBe(true);
      expect(canEditPlanning(user(ADMIN), ADMIN, "culte", mode)).toBe(true);
      expect(canCreateSetlist(user(ADMIN), ADMIN, mode)).toBe(true);
      expect(canUseHarmonie(user(ADMIN), [], ADMIN, mode)).toEqual({ piano: true, guitare: true });
      expect(canEditerEquipes(user(ADMIN), ADMIN, mode)).toBe(true);
      expect(planningsDuBackOffice(user(ADMIN), ADMIN, mode)).toHaveLength(7);
    }
  });
});
