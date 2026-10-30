import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./helpers/fakeSession";
import {
  audiencesNotifiables, canCreateEvenement, canCreateSetlist, canEditEvenement, canEditPlanning, canGererPetitDej, canReserverPour,
  colonnesModifiables, creatableCategories, creatableEvenementPours, entreesBackOffice, estResponsable, isCoordination,
  peutChangerReferents, peutModifierEquipe, peutPlacerMembre, planningsDuBackOffice, visibleCategories,
} from "../src/lib/access";
import { ceQueCaOuvre, colonnesRemplies, publiePlanning, previentPlanning, remplitUnPlanning } from "../src/lib/acces/organigramme";
import {
  CLES_RESPONSABILITES, RESPONSABILITES_PLANNING, audiencesDesPlannings, categoriesDesPlannings, estComiteOrga, gerePlanning,
  gereUnPlanning, gestionnaireDe, planningsGeres, responsabiliteDuPlanning, responsabilitesDe,
} from "../src/lib/acces/responsabilites";
import { peutNotifierAudience } from "../src/lib/push/audiences";
import { droitsDePrevenir, droitsDePublication, getPlanning } from "../src/lib/planning/releases";
import { ANNONCE_SECTIONS } from "../src/types/annonce";
import type { UserProfile } from "../src/types/user";

// Lot RS, tranche RS-A (docs/spec-responsabilites.md) : les droits de gestion viennent de `responsabilites`,
// chaque ligne dans les deux sens, en nouveau mode (`backOffice = true`) ; puis l'ancien mode (`false`) qui garde
// les droits d'avant. Fonctions pures, aucune page, profils fictifs.

const NEW = true;
const OLD = false;

type P = Partial<UserProfile> & { uid: string };
const profil = (p: P): UserProfile => ({
  email: `${p.uid}@example.com`, firstName: "", lastName: "", planningName: "", serviceRoles: {}, annonces: [], notify: [], ...p,
}) as UserProfile;
const user = (p: { uid: string; email?: string }) => ({ uid: p.uid, email: p.email ?? `${p.uid}@example.com` });

const CULTE = profil({ uid: "u-adele", responsabilites: ["planning:culte"] });
const CAMPUS = profil({ uid: "u-baptiste", responsabilites: ["planning:campus"] });
const TABLE = profil({ uid: "u-coralie", responsabilites: ["planning:table"] });
const EDD = profil({ uid: "u-damien", responsabilites: ["planning:edd"] });
const FIDELITE = profil({ uid: "u-eloise", responsabilites: ["planning:fidelite"] });
const ORGA = profil({ uid: "u-florian", responsabilites: ["orga"] });
const LOUANGE = profil({ uid: "u-ginette", dansEquipes: ["louange"], referentDe: ["louange"] });
const REGIE = profil({ uid: "u-hugo", dansEquipes: ["regie"], referentDe: ["regie"], lieuxRegie: ["Culte Francophone"] });
const REFERENT_EDD = profil({ uid: "u-isaure", dansEquipes: ["edd"], referentDe: ["edd"] });
const PLACE_ORGA = profil({ uid: "u-jules", dansEquipes: ["orga"] });
const PRESIDENTE = profil({
  uid: "u-karine", groupe: "paix", referentDe: ["comite-paix"], remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"],
});
const RIEN = profil({ uid: "u-lucas" });
const LUNE = profil({ uid: "u-maelle", responsabilites: ["planning:lune"] });
const ADMIN = profil({ uid: "uid-admin", email: ADMIN_EMAIL });

const GRILLES_CULTE = ["culte"];
const AUTRES = ["intergroupe", "interfranco", "campusMatin", "campusSoir", "table", "eddZhongban", "eddDaban", "eddGaoban", "paix", "fidelite", "fideliteMusiciens", "bonte"];

test.describe("pur : le modèle des responsabilités", () => {
  test("les clés, leur ordre, les plannings couverts", () => {
    expect(CLES_RESPONSABILITES).toEqual([
      "planning:culte", "planning:intergroupe", "planning:interfranco", "planning:campus", "planning:table",
      "planning:edd", "planning:paix", "planning:fidelite", "planning:bonte", "orga",
    ]);
    expect(RESPONSABILITES_PLANNING.find((r) => r.cle === "planning:campus")?.plannings).toEqual(["campusMatin", "campusSoir"]);
    expect(RESPONSABILITES_PLANNING.find((r) => r.cle === "planning:table")?.audiences).toEqual([]);
    expect(responsabiliteDuPlanning("campusSoir")).toBe("planning:campus");
    expect(responsabiliteDuPlanning("fideliteMusiciens")).toBe("planning:fidelite");
    expect(responsabiliteDuPlanning("inconnu")).toBeNull();
  });

  test("responsabilitesDe : sans doublon, dans l'ordre des clés, une clé inconnue ignorée", () => {
    const p = profil({ uid: "u-noa", responsabilites: ["orga", "planning:paix", "planning:lune", "planning:paix", "planning:culte"] });
    expect(responsabilitesDe(p)).toEqual(["planning:culte", "planning:paix", "orga"]);
    expect(responsabilitesDe(LUNE)).toEqual([]);
    expect(responsabilitesDe(null)).toEqual([]);
    expect(gereUnPlanning(LUNE)).toBe(false);
    expect(estComiteOrga(LUNE)).toBe(false);
    expect(gestionnaireDe(CULTE, "planning:culte")).toBe(true);
    expect(gestionnaireDe(CULTE, "orga")).toBe(false);
    expect(gestionnaireDe(ORGA, "planning:culte")).toBe(false);
  });

  test("plannings gérés, audiences et catégories : l'union", () => {
    const deux = profil({ uid: "u-olga", responsabilites: ["planning:campus", "planning:edd"] });
    expect(planningsGeres(deux)).toEqual(["campusMatin", "campusSoir", "eddZhongban", "eddDaban", "eddGaoban"]);
    expect(audiencesDesPlannings(deux)).toEqual(["Campus", "中班", "大班", "高班"]);
    expect(categoriesDesPlannings(deux)).toEqual(["Campus", "中班", "大班", "高班"]);
    expect(gerePlanning(deux, "campusSoir")).toBe(true);
    expect(gerePlanning(deux, "culte")).toBe(false);
    expect(audiencesDesPlannings(TABLE), "la Table garde son audience du petit déj, hors de ce module").toEqual([]);
  });
});

test.describe("pur : gestionnaire d'un planning (Q5, Q10)", () => {
  const culte = getPlanning("culte")!;

  test("planning:culte : remplit toute la grille du culte et rien d'autre", () => {
    for (const k of GRILLES_CULTE) {
      expect(colonnesRemplies(CULTE, k), k).toBe("toutes");
      expect(canEditPlanning(user(CULTE), CULTE, k, NEW), k).toBe(true);
      expect(colonnesModifiables(user(CULTE), CULTE, k, NEW), k).toBe("toutes");
    }
    for (const k of AUTRES) {
      expect(colonnesRemplies(CULTE, k), k).toBeNull();
      expect(canEditPlanning(user(CULTE), CULTE, k, NEW), k).toBe(false);
    }
    expect(remplitUnPlanning(CULTE)).toBe(true);
  });

  test("planning:culte : publie et prévient le culte, pas un autre planning", () => {
    expect(droitsDePublication(culte, false, CULTE, NEW)).toBe(true);
    expect(droitsDePrevenir(culte, false, CULTE, NEW)).toBe(true);
    expect(droitsDePublication(getPlanning("paix")!, false, CULTE, NEW)).toBe(false);
    expect(droitsDePrevenir(getPlanning("paix")!, false, CULTE, NEW)).toBe(false);
    expect(droitsDePublication(culte, false, RIEN, NEW)).toBe(false);
    expect(droitsDePrevenir(culte, false, RIEN, NEW)).toBe(false);
    expect(publiePlanning(CULTE, "intergroupe")).toBe(false);
    expect(previentPlanning(CULTE, "intergroupe")).toBe(false);
  });

  test("planning:culte : notifie « Culte Francophone », pas « * » ni un autre lieu", () => {
    expect(audiencesNotifiables(CULTE, NEW)).toEqual(["Culte Francophone"]);
    expect(peutNotifierAudience("Culte Francophone", false, CULTE, NEW)).toBe(true);
    expect(peutNotifierAudience("*", false, CULTE, NEW)).toBe(false);
    expect(peutNotifierAudience("Campus", false, CULTE, NEW)).toBe(false);
    expect(peutNotifierAudience("Culte Francophone", false, RIEN, NEW)).toBe(false);
  });

  test("planning:culte : crée et voit les setlists « Culte Francophone », pas les autres ; est responsable ; voit l'onglet culte", () => {
    expect(creatableCategories(CULTE, NEW)).toEqual(["Culte Francophone"]);
    expect(visibleCategories(CULTE, NEW)).toEqual(["Culte Francophone"]);
    expect(canCreateSetlist(user(CULTE), CULTE, NEW)).toBe(true);
    expect(canCreateSetlist(user(RIEN), RIEN, NEW)).toBe(false);
    expect(estResponsable(user(CULTE), CULTE, NEW)).toBe(true);
    expect(planningsDuBackOffice(user(CULTE), CULTE, NEW)).toEqual(["culte"]);
    expect(entreesBackOffice(user(CULTE), CULTE, NEW)).toEqual(expect.arrayContaining(["planning", "messages"]));
  });

  test("un gestionnaire garde ses setlists de service sans doublon avec celles où il sert", () => {
    const aussi = profil({ uid: "u-nadia", responsabilites: ["planning:culte"], dansEquipes: ["louange"], lieuxLouange: ["Culte Francophone", "Campus"] });
    expect(creatableCategories(aussi, NEW)).toEqual(["Culte Francophone", "Campus"]);
  });

  test("planning:campus couvre campusMatin et campusSoir", () => {
    expect(colonnesRemplies(CAMPUS, "campusMatin")).toBe("toutes");
    expect(colonnesRemplies(CAMPUS, "campusSoir")).toBe("toutes");
    expect(colonnesRemplies(CAMPUS, "culte")).toBeNull();
    expect(audiencesNotifiables(CAMPUS, NEW)).toEqual(["Campus"]);
    expect(planningsDuBackOffice(user(CAMPUS), CAMPUS, NEW)).toEqual(["campus"]);
  });

  test("planning:table remplit la table, gère le petit déj, ne publie pas, n'a pas d'audience", () => {
    expect(colonnesRemplies(TABLE, "table")).toBe("toutes");
    expect(canGererPetitDej(user(TABLE), TABLE, NEW)).toBe(true);
    expect(canGererPetitDej(user(CULTE), CULTE, NEW)).toBe(false);
    expect(publiePlanning(TABLE, "table")).toBe(false);
    expect(previentPlanning(TABLE, "table")).toBe(false);
    expect(audiencesNotifiables(TABLE, NEW)).toEqual([]);
    expect(planningsDuBackOffice(user(TABLE), TABLE, NEW)).toEqual(["table"]);
  });

  test("planning:edd couvre les trois grilles et crée dans les trois classes", () => {
    for (const k of ["eddZhongban", "eddDaban", "eddGaoban"]) expect(colonnesRemplies(EDD, k), k).toBe("toutes");
    expect(colonnesRemplies(EDD, "culte")).toBeNull();
    expect(creatableCategories(EDD, NEW)).toEqual(["中班", "大班", "高班"]);
    expect(audiencesNotifiables(EDD, NEW)).toEqual(["中班", "大班", "高班"]);
    expect(planningsDuBackOffice(user(EDD), EDD, NEW)).toEqual(["edd"]);
  });

  test("planning:fidelite couvre fideliteMusiciens", () => {
    expect(colonnesRemplies(FIDELITE, "fidelite")).toBe("toutes");
    expect(colonnesRemplies(FIDELITE, "fideliteMusiciens")).toBe("toutes");
    expect(colonnesRemplies(FIDELITE, "paix")).toBeNull();
    expect(audiencesNotifiables(FIDELITE, NEW)).toEqual(["Groupe Fidélité"]);
    expect(planningsDuBackOffice(user(FIDELITE), FIDELITE, NEW)).toEqual(["groupes"]);
  });

  test("un planning sans gestionnaire n'est rempli que par les admins", () => {
    for (const p of [RIEN, LOUANGE, REGIE, PLACE_ORGA, ORGA, PRESIDENTE]) expect(canEditPlanning(user(p), p, "culte", NEW), p.uid).toBe(false);
    expect(canEditPlanning(user(ADMIN), ADMIN, "culte", NEW)).toBe(true);
    expect(colonnesModifiables(user(ADMIN), ADMIN, "table", NEW)).toBe("toutes");
  });
});

test.describe("pur : Comité Orga (Q11)", () => {
  const sections = ANNONCE_SECTIONS;

  test("coordination, crée pour l'Église et pour chaque section, modifie l'évènement d'un autre", () => {
    expect(isCoordination(user(ORGA), ORGA, NEW)).toBe(true);
    expect(canCreateEvenement(user(ORGA), ORGA, "eglise", NEW)).toBe(true);
    for (const s of sections) expect(canCreateEvenement(user(ORGA), ORGA, s, NEW), s).toBe(true);
    expect(creatableEvenementPours(user(ORGA), ORGA, sections, NEW)).toEqual(["eglise", ...sections]);
    expect(canEditEvenement(user(ORGA), ORGA, { pour: "eglise", organisateurUid: "u-autre" }, NEW)).toBe(true);
    expect(canEditEvenement(user(RIEN), RIEN, { pour: "eglise", organisateurUid: "u-autre" }, NEW)).toBe(false);
    expect(estResponsable(user(ORGA), ORGA, NEW)).toBe(true);
  });

  test("notifie « * » et réserve la scène même saison fermée", () => {
    expect(audiencesNotifiables(ORGA, NEW)).toEqual(["*"]);
    expect(peutNotifierAudience("Groupe Bonté", false, ORGA, NEW)).toBe(true);
    const fermee = { ouvert: false, fermees: true, quiAutorises: ["chorale"] };
    expect(canReserverPour(user(ORGA), ORGA, fermee, ["autre"], NEW)).toBe(true);
    expect(canReserverPour(user(CULTE), CULTE, fermee, ["autre"], NEW), "un gestionnaire réserve aussi (Q12)").toBe(true);
    expect(canReserverPour(user(RIEN), RIEN, fermee, ["autre"], NEW)).toBe(false);
    expect(canReserverPour(user(LOUANGE), LOUANGE, fermee, ["autre"], NEW)).toBe(false);
  });

  test("ne remplit PAS la table, aucun planning", () => {
    expect(colonnesRemplies(ORGA, "table")).toBeNull();
    expect(canGererPetitDej(user(ORGA), ORGA, NEW)).toBe(false);
    expect(remplitUnPlanning(ORGA)).toBe(false);
    expect(planningsDuBackOffice(user(ORGA), ORGA, NEW)).toEqual([]);
  });

  test("être placé dans l'équipe Orga ne donne plus la coordination, mais tient toujours l'organigramme", () => {
    expect(isCoordination(user(PLACE_ORGA), PLACE_ORGA, NEW)).toBe(false);
    expect(canCreateEvenement(user(PLACE_ORGA), PLACE_ORGA, "eglise", NEW)).toBe(false);
    expect(audiencesNotifiables(PLACE_ORGA, NEW)).toEqual([]);
    expect(estResponsable(user(PLACE_ORGA), PLACE_ORGA, NEW)).toBe(false);
    expect(peutModifierEquipe(user(PLACE_ORGA), PLACE_ORGA, "medias", NEW)).toBe(true);
    expect(peutPlacerMembre(user(PLACE_ORGA), PLACE_ORGA, "louange", ["choristes"], NEW)).toBe(true);
  });
});

test.describe("pur : référents et présidents (Q12, Q16, Q22)", () => {
  test("référent Louange seul : ni coordination, ni planning, ni section, ni audience d'équipe ; mais une réunion de son équipe", () => {
    expect(isCoordination(user(LOUANGE), LOUANGE, NEW)).toBe(false);
    expect(canEditPlanning(user(LOUANGE), LOUANGE, "culte", NEW)).toBe(false);
    expect(canCreateEvenement(user(LOUANGE), LOUANGE, "Culte Francophone", NEW)).toBe(false);
    expect(canCreateEvenement(user(LOUANGE), LOUANGE, "eglise", NEW)).toBe(false);
    expect(audiencesNotifiables(LOUANGE, NEW)).not.toContain("equipe:louange");
    expect(audiencesNotifiables(LOUANGE, NEW)).toEqual([]);
    expect(peutNotifierAudience("equipe:louange", false, LOUANGE, NEW)).toBe(false);
    expect(canCreateEvenement(user(LOUANGE), LOUANGE, "equipe:louange", NEW)).toBe(true);
    expect(canCreateEvenement(user(LOUANGE), LOUANGE, "equipe:medias", NEW)).toBe(false);
    expect(estResponsable(user(LOUANGE), LOUANGE, NEW), "Q22").toBe(true);
  });

  test("les référents ne changent pas les référents : les admins seuls", () => {
    for (const p of [LOUANGE, ORGA, PLACE_ORGA, REGIE]) expect(peutChangerReferents(user(p), p, "louange", NEW), p.uid).toBe(false);
    expect(peutChangerReferents(user(ADMIN), ADMIN, "louange", NEW)).toBe(true);
    expect(peutChangerReferents(user(ADMIN), ADMIN, "regie", NEW)).toBe(true);
  });

  test("référent Régie : aucune colonne du culte ; référent EDD : rien de l'EDD", () => {
    for (const k of ["culte", "intergroupe", "interfranco", "campusMatin", "campusSoir"]) {
      expect(colonnesRemplies(REGIE, k), k).toBeNull();
      expect(canEditPlanning(user(REGIE), REGIE, k, NEW), k).toBe(false);
    }
    expect(droitsDePrevenir(getPlanning("culte")!, false, REGIE, NEW)).toBe(false);
    for (const k of ["eddZhongban", "eddDaban", "eddGaoban"]) expect(colonnesRemplies(REFERENT_EDD, k), k).toBeNull();
    expect(isCoordination(user(REFERENT_EDD), REFERENT_EDD, NEW)).toBe(false);
    expect(estResponsable(user(REGIE), REGIE, NEW)).toBe(true);
  });

  test("président de groupe : ne remplit, ne publie ni ne notifie plus Paix, ne crée plus d'évènement du groupe ; tient son groupe", () => {
    const paix = getPlanning("paix")!;
    expect(canEditPlanning(user(PRESIDENTE), PRESIDENTE, "paix", NEW)).toBe(false);
    expect(droitsDePublication(paix, false, PRESIDENTE, NEW)).toBe(false);
    expect(droitsDePrevenir(paix, false, PRESIDENTE, NEW)).toBe(false);
    expect(audiencesNotifiables(PRESIDENTE, NEW)).toEqual([]);
    expect(canCreateEvenement(user(PRESIDENTE), PRESIDENTE, "Groupe Paix", NEW)).toBe(false);
    expect(creatableEvenementPours(user(PRESIDENTE), PRESIDENTE, ANNONCE_SECTIONS, NEW)).toEqual(["equipe:comite-paix"]);
    expect(estResponsable(user(PRESIDENTE), PRESIDENTE, NEW), "référent de son comité").toBe(true);
    // Il tient toujours son groupe : sa catégorie reste visible et créable (setlists du groupe).
    expect(creatableCategories(PRESIDENTE, NEW)).toEqual(["Groupe Paix"]);
  });

  test("un compte sans rien : pas responsable, aucun droit ; une clé inconnue est ignorée", () => {
    expect(estResponsable(user(RIEN), RIEN, NEW)).toBe(false);
    expect(estResponsable(user(LUNE), LUNE, NEW)).toBe(false);
    expect(entreesBackOffice(user(RIEN), RIEN, NEW)).toEqual([]);
    expect(canEditPlanning(user(LUNE), LUNE, "culte", NEW)).toBe(false);
    expect(audiencesNotifiables(LUNE, NEW)).toEqual([]);
    expect(estResponsable(user(ADMIN), ADMIN, NEW)).toBe(true);
  });
});

test.describe("pur : ceQueCaOuvre et le mode ancien", () => {
  test("une ligne par responsabilité de planning, puis le Comité Orga ; les setlists du service", () => {
    const deux = profil({ uid: "u-pascale", responsabilites: ["orga", "planning:campus", "planning:culte"] });
    expect(ceQueCaOuvre(deux)).toEqual([
      { cle: "acces.ouvre.setlistsCreer", params: { lieux: "categories.Culte Francophone, categories.Campus" }, pourquoi: "acces.pourquoi.gestionnaireSetlists" },
      { cle: "acces.ouvre.gestionnaire", params: { planning: "acces.responsabilite.culte" }, pourquoi: "acces.pourquoi.gestionnaire" },
      { cle: "acces.ouvre.gestionnaire", params: { planning: "acces.responsabilite.campus" }, pourquoi: "acces.pourquoi.gestionnaire" },
      { cle: "acces.ouvre.comiteOrga", pourquoi: "acces.pourquoi.comiteOrga" },
    ]);
    const nommer = (c: string) => (c === "acces.responsabilite.culte" ? "Culte Franco" : c);
    expect(ceQueCaOuvre(CULTE, nommer).find((a) => a.cle === "acces.ouvre.gestionnaire")?.params).toEqual({ planning: "Culte Franco" });
    expect(ceQueCaOuvre(ORGA).map((a) => a.cle)).toEqual(["acces.ouvre.comiteOrga"]);
    expect(ceQueCaOuvre(RIEN)).toEqual([]);
  });

  test("ancien mode : un profil à l'ancienne (plannings, notify, coordination) garde les mêmes droits ; `responsabilites` n'y compte pas", () => {
    const ancien = profil({ uid: "u-quitterie", plannings: ["culte"], notify: ["*"], coordination: true });
    expect(canEditPlanning(user(ancien), ancien, "culte", OLD)).toBe(true);
    expect(canEditPlanning(user(ancien), ancien, "table", OLD)).toBe(false);
    expect(isCoordination(user(ancien), ancien, OLD)).toBe(true);
    expect(audiencesNotifiables(ancien, OLD)).toEqual(["*"]);
    expect(estResponsable(user(ancien), ancien, OLD)).toBe(true);
    expect(droitsDePublication(getPlanning("culte")!, false, ancien, OLD)).toBe(true);
    expect(canReserverPour(user(ancien), ancien, { fermees: true }, ["x"], OLD)).toBe(true);
    // Une responsabilité ne donne rien dans l'ancien mode.
    for (const p of [CULTE, ORGA]) {
      expect(canEditPlanning(user(p), p, "culte", OLD), p.uid).toBe(false);
      expect(isCoordination(user(p), p, OLD), p.uid).toBe(false);
      expect(canReserverPour(user(p), p, { fermees: true }, ["x"], OLD), p.uid).toBe(false);
      expect(audiencesNotifiables(p, OLD), p.uid).toEqual([]);
      expect(estResponsable(user(p), p, OLD), p.uid).toBe(false);
    }
  });
});
