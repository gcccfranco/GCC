import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, fenetreDuSite, repondreDansLeSite } from "./helpers/agencement";
import { GROUPES } from "../src/types/user";
import type { OrganigrammeGroupe, RoleGroupe } from "../src/types/groupe";
import {
  COMITES, MAX_VP_BORNE, MAX_VP_DEFAUT, TABLE_GROUPES, estGroupeId, groupeDef, groupeDeLaCategorie,
} from "../src/lib/groupes/table";
import {
  changerPlafondVp, colonnesProposees, colonnesReliables, estDuGroupe, groupeDe, lireChampsGroupe,
  lireGroupe, membresComite, placesVp, placesVpLibres, recopieDeGroupe, relierACompte, roleDeColonne,
} from "../src/lib/groupes/organigramme";
import { PLANNING_COLORS, categoryColor } from "../src/lib/serviceColors";
import { datesCourtes, propositions, propositionsReliees, type CompteDuPlanning } from "../src/lib/planning/choisir";
import { GRILLE_BONTE, GRILLE_CULTE, GRILLE_PAIX } from "../src/lib/planning/grilles";
import { readFileSync } from "node:fs";
import {
  ADMIN_EMAILS, audiencesNotifiables, canEditPlanning, canTenirGroupe, creatableEvenementPours, droitsDesPages, entreesBackOffice,
  equipesDe, equipesDesTaches, equipesOuCreer, estDeLEquipe, estResponsable, planningsDuBackOffice, tientUnGroupe,
} from "../src/lib/access";
import { canPublishPlanning, droitsDePublication, getPlanning, peutPrevenir } from "../src/lib/planning/releases";
import { isValidAudience, notifyGroups, peutNotifierAudience } from "../src/lib/push/audiences";
import { uidsDesAudiences, uidsDuGroupe } from "../src/lib/push/recipients";
import { rattachementDe } from "../src/lib/equipes/organigramme";
import { lireEquipes, recalculerDepuisOrganigramme, recalculerRattachement } from "../src/lib/equipes/serveur";
import { changerGroupe, exigerTenirGroupe, lireGroupes } from "../src/lib/groupes/serveur";
import {
  correspondAuFiltreGroupe, droitsParRoles, filtresPersonnes, nombreSansGroupe, nomsDistincts, postesDeCompte,
  titulairesSansCompte,
} from "../src/lib/groupes/personnes";

// Lot 2 du chantier « équipes et groupes » (docs/spec-organigrammes-groupes.md), tranche OG-A :
// modèle et logique pure, aucun écran. Les tranches suivantes ajoutent leurs essais à ce fichier.
// Noms fictifs.

const droits = (o: Partial<RoleGroupe["droits"]> = {}): RoleGroupe["droits"] =>
  ({ remplir: false, publier: false, notifier: false, saisirFetes: false, ...o });

const role = (id: string, nom: string, o: Partial<RoleGroupe> = {}): RoleGroupe =>
  ({ id, nom, nomZh: "", places: null, comite: false, colonne: null, droits: droits(), titulaires: [], ...o });

const t = (nom: string, uid = "") => ({ nom, uid });

// Groupe Paix : Ruth K. préside, Léa M. est VP ; cinq rôles.
const PAIX: OrganigrammeGroupe = {
  id: "paix",
  president: t("Ruth K.", "ruth"),
  vp: [t("Léa M.", "lea")],
  roles: [
    role("r-mus", "Musiciens", { nomZh: "乐手", places: 3, colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Hugo L.", "hugo"), t("Ma Lin")] }),
    role("r-resp", "Responsable louange", { comite: true, droits: droits({ remplir: true, publier: true }), titulaires: [t("Noé P.", "noe")] }),
    role("r-com", "Communication", { comite: true, droits: droits({ notifier: true }), titulaires: [t("Mei Z.", "mei")] }),
    role("r-fetes", "Chants des fêtes", { droits: droits({ saisirFetes: true }), titulaires: [t("Éli D.", "eli")] }),
    role("r-plan", "Planning", { droits: droits({ remplir: true }), titulaires: [t("Sam R.", "sam"), t("Ma Lin")] }),
  ],
  maxVp: undefined,
  updatedAt: "", parUid: "", parNom: "",
};

const JOIE: OrganigrammeGroupe = {
  id: "joie",
  president: t("Ana T.", "ana"),
  vp: [t("Tom V.", "tom")],
  roles: [role("r-acc", "Accueil", { droits: droits({ notifier: true, saisirFetes: true }), comite: true, titulaires: [t("Zoé W.", "zoe")] })],
  updatedAt: "", parUid: "", parNom: "",
};

const BONTE: OrganigrammeGroupe = {
  id: "bonte", president: null, vp: [],
  roles: [role("b-mus", "Musiciens", { colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Eva N.", "eva")] })],
  updatedAt: "", parUid: "", parNom: "",
};

test.describe("table des groupes", () => {
  test("cinq groupes, leur catégorie, leur planning, leur comité", () => {
    expect(TABLE_GROUPES.map((g) => g.id)).toEqual(["paix", "fidelite", "bonte", "amour", "joie"]);
    expect(TABLE_GROUPES.map((g) => g.categorie)).toEqual(["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "Groupe Amour", "Groupe Joie"]);
    expect(TABLE_GROUPES.map((g) => g.planning)).toEqual(["paix", "fidelite", "bonte", null, null]);
    expect(COMITES).toEqual(["comite-paix", "comite-fidelite", "comite-bonte", "comite-amour", "comite-joie"]);
    expect(MAX_VP_DEFAUT).toBe(2);
    expect(MAX_VP_BORNE).toBe(9);
    expect(estGroupeId("joie")).toBe(true);
    expect(estGroupeId("comite-paix")).toBe(false);
    expect(groupeDef("amour")?.comite).toBe("comite-amour");
    expect(groupeDeLaCategorie("Groupe Bonté")?.id).toBe("bonte");
    expect(groupeDeLaCategorie("Culte Francophone")).toBeUndefined();
  });

  test("GROUPES de l'inscription ne change pas : trois catégories de setlist", () => {
    expect([...GROUPES]).toEqual(["Groupe Paix", "Groupe Fidélité", "Groupe Bonté"]);
  });
});

test.describe("groupeDe (OG2) et estDuGroupe (OG28)", () => {
  test("le champ l'emporte, « » = sans groupe, Amour par le champ", () => {
    expect(groupeDe({ groupe: "bonte", serviceRoles: { "Groupe Paix": ["musicien"] } })).toBe("bonte");
    expect(groupeDe({ groupe: "", serviceRoles: { "Groupe Paix": ["musicien"] } })).toBeNull();
    expect(groupeDe({ groupe: "amour" })).toBe("amour");
    expect(groupeDe({ groupe: "inconnu" })).toBeNull();
  });

  test("champ absent : déduit d'une seule clé de groupe de serviceRoles, sinon sans groupe", () => {
    expect(groupeDe({ serviceRoles: { "Groupe Paix": ["musicien"], "Culte Francophone": ["chanteur"] } })).toBe("paix");
    expect(groupeDe({ groupe: null, serviceRoles: { "Groupe Fidélité": [] } })).toBe("fidelite");
    expect(groupeDe({ serviceRoles: { "Groupe Paix": ["musicien"], "Groupe Bonté": ["chanteur"] } })).toBeNull();
    expect(groupeDe({ serviceRoles: { "Culte Francophone": ["chanteur"] } })).toBeNull();
    expect(groupeDe({})).toBeNull();
  });

  test("estDuGroupe : clé de serviceRoles ∪ groupeDe ; interrupteur coupé → clé seule", () => {
    const joie = { groupe: "joie", serviceRoles: {} };
    expect(estDuGroupe(joie, "Groupe Joie", true)).toBe(true);
    expect(estDuGroupe(joie, "Groupe Joie", false)).toBe(false);
    expect(estDuGroupe(joie, "Groupe Paix", true)).toBe(false);
    const cle = { serviceRoles: { "Groupe Paix": ["musicien"] } };
    expect(estDuGroupe(cle, "Groupe Paix", false)).toBe(true);
    expect(estDuGroupe(cle, "Groupe Paix", true)).toBe(true);
    // Deux clés : sans groupe déduit, mais membre de chacun par sa clé (D17).
    const deux = { serviceRoles: { "Groupe Paix": [], "Groupe Bonté": [] } };
    expect(estDuGroupe(deux, "Groupe Bonté", true)).toBe(true);
    expect(estDuGroupe({ groupe: "bonte", serviceRoles: { "Groupe Paix": [] } }, "Groupe Paix", true)).toBe(true);
    expect(estDuGroupe(cle, "Culte Francophone", true)).toBe(false);
  });

  test("lireChampsGroupe : les quatre champs du profil, absents = déduits ou vides", () => {
    expect(lireChampsGroupe({})).toEqual({ groupe: undefined, remplitParRole: [], publieParRole: [], notifieParRole: [] });
    expect(lireChampsGroupe({ groupe: "", remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"] }))
      .toEqual({ groupe: "", remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"] });
    expect(lireChampsGroupe({ groupe: null, remplitParRole: "x" }).groupe).toBeUndefined();
    expect(lireChampsGroupe({ remplitParRole: "x" }).remplitParRole).toEqual([]);
  });
});

test.describe("lecture d'un document groupes/{id} (modèle)", () => {
  test("maxVp absent, droits.saisirFetes absent = faux, colonne nulle pour Amour et Joie", () => {
    const lu = lireGroupe("paix", {
      president: { nom: "Ruth K.", uid: "ruth" },
      vp: [{ nom: "Léa M.", uid: "lea" }],
      roles: [
        { id: "a", nom: "Musiciens", places: 3, comite: false, colonne: "musiciens", droits: { remplir: true, publier: false, notifier: false }, titulaires: [{ nom: "Joël F.", uid: "joel" }] },
        { id: "b", nom: "Sans rien" },
      ],
    });
    expect(lu.maxVp).toBeUndefined();
    expect(placesVp(lu)).toBe(2);
    expect(lu.roles[0].droits).toEqual({ remplir: true, publier: false, notifier: false, saisirFetes: false });
    expect(lu.roles[1]).toMatchObject({ nomZh: "", places: null, comite: false, colonne: null, titulaires: [] });
    expect(lu.roles[1].droits.saisirFetes).toBe(false);
    expect(lu.president).toEqual({ nom: "Ruth K.", uid: "ruth" });
    expect(lireGroupe("paix", {}).president).toBeNull();
    expect(lireGroupe("paix", {}).vp).toEqual([]);

    const joie = lireGroupe("joie", { roles: [{ id: "c", nom: "X", colonne: "musiciens", droits: { saisirFetes: true } }] });
    expect(joie.roles[0].colonne).toBeNull();
    expect(joie.roles[0].droits.saisirFetes).toBe(true);
  });
});

test.describe("lecture : titulaires et places (relecture)", () => {
  test("un compte au nom vide garde son uid ; ni nom ni uid = écarté ; places entier >= 0 sinon sans limite", () => {
    const lu = lireGroupe("paix", {
      president: { nom: "", uid: "u9" },
      vp: [{ nom: "  ", uid: "u8" }, { nom: "", uid: "" }, { nom: "Léa M.", uid: "" }],
      roles: [-1, 2.5, 0, 3, "2"].map((places, i) => ({ id: `r${i}`, places })),
    });
    expect(lu.president).toEqual({ nom: "", uid: "u9" });
    expect(lu.vp).toEqual([{ nom: "", uid: "u8" }, { nom: "Léa M.", uid: "" }]);
    expect(lu.roles.map((r) => r.places)).toEqual([null, null, 0, 3, null]);
  });
});

test.describe("plafond des VP (OG6, décision 36)", () => {
  test("placesVp : absent → 2, maxVp: 3 → 3 ; Paix comme Joie", () => {
    expect(placesVp(PAIX)).toBe(2);
    expect(placesVp(JOIE)).toBe(2);
    expect(placesVp({ ...PAIX, maxVp: 3 })).toBe(3);
  });

  test("placesVpLibres : autant de places que le plafond, moins les VP nommés", () => {
    expect(placesVpLibres(PAIX)).toBe(1);
    expect(placesVpLibres({ ...PAIX, maxVp: 3 })).toBe(2);
    expect(placesVpLibres({ ...PAIX, vp: [t("A", "a"), t("B", "b")] })).toBe(0);
  });

  test("« − » ne descend ni sous 1 ni sous les VP nommés, « + » s'arrête à 9", () => {
    expect(changerPlafondVp(PAIX, +1)).toBe(3);
    expect(changerPlafondVp(PAIX, -1)).toBe(1); // un VP nommé, plafond 2 → 1
    expect(changerPlafondVp({ ...PAIX, vp: [] }, -1)).toBe(1);
    expect(changerPlafondVp({ ...PAIX, vp: [], maxVp: 1 }, -1)).toBe(1);
    const deux = { ...PAIX, vp: [t("A", "a"), t("B", "b")] };
    expect(changerPlafondVp(deux, -1)).toBe(2);
    expect(changerPlafondVp({ ...deux, maxVp: 9 }, +1)).toBe(9);
    expect(changerPlafondVp({ ...deux, maxVp: 4 }, -1)).toBe(3);
  });
});

test.describe("comité (OG17)", () => {
  test("président, VP puis titulaires des rôles « au comité », chacun une fois", () => {
    expect(membresComite(PAIX).map((m) => m.nom)).toEqual(["Ruth K.", "Léa M.", "Noé P.", "Mei Z."]);
    const doublons: OrganigrammeGroupe = {
      ...PAIX,
      roles: [
        role("a", "A", { comite: true, titulaires: [t("Ruth K.", "ruth"), t("Ma Lin"), t("Pia O.", "pia")] }),
        role("b", "B", { comite: true, titulaires: [t("ma  lin"), t("Pia O.", "pia")] }),
        role("c", "C", { comite: false, titulaires: [t("Hors C.", "hors")] }),
      ],
    };
    expect(membresComite(doublons).map((m) => m.nom)).toEqual(["Ruth K.", "Léa M.", "Ma Lin", "Pia O."]);
  });

  test("groupe vide : comité vide", () => {
    expect(membresComite(BONTE)).toEqual([]);
  });
});

test.describe("recopie pure (OG19, OG3)", () => {
  // Les cinq documents sont obligatoires : ceux que le test ne décrit pas sont lus vides.
  const cinq = (docs: OrganigrammeGroupe[]) => TABLE_GROUPES.map((d) => docs.find((g) => g.id === d.id) ?? lireGroupe(d.id, {}));
  const recopie = (uid: string, actuel: Parameters<typeof recopieDeGroupe>[1], docs = [PAIX, JOIE, BONTE]) => recopieDeGroupe(uid, actuel, cinq(docs));
  const vide = { remplitParRole: [], publieParRole: [], notifieParRole: [], dansEquipes: [], referentDe: [] };

  test("présidence et vice-présidence : planning remplit et publie, notifie, comité et référent", () => {
    for (const uid of ["ruth", "lea"]) {
      expect(recopie(uid, "paix")).toMatchObject({
        groupe: "paix", entre: false, ignores: [],
        remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"],
        dansEquipes: ["comite-paix"], referentDe: ["comite-paix"],
      });
    }
  });

  test("un rôle Remplir, Publier, Notifier, au comité : chacun sa ligne du tableau", () => {
    expect(recopie("sam", "paix")).toMatchObject({ ...vide, remplitParRole: ["paix"] });
    expect(recopie("noe", "paix")).toMatchObject({ ...vide, remplitParRole: ["paix"], publieParRole: ["paix"], dansEquipes: ["comite-paix"] });
    expect(recopie("mei", "paix")).toMatchObject({ ...vide, notifieParRole: ["Groupe Paix"], dansEquipes: ["comite-paix"] });
    expect(recopie("joel", "paix")).toMatchObject(vide); // Musiciens relié à une colonne, sans droit : rien
  });

  test("Joie n'a pas de planning : jamais remplitParRole ni publieParRole", () => {
    expect(recopie("ana", "joie")).toMatchObject({
      groupe: "joie", remplitParRole: [], publieParRole: [], notifieParRole: ["Groupe Joie"],
      dansEquipes: ["comite-joie"], referentDe: ["comite-joie"],
    });
    expect(recopie("tom", "joie")).toMatchObject({ remplitParRole: [], publieParRole: [], referentDe: ["comite-joie"] });
    // Rôle de Joie avec Notifier + Saisir les chants + au comité.
    expect(recopie("zoe", "joie")).toMatchObject({ ...vide, notifieParRole: ["Groupe Joie"], dansEquipes: ["comite-joie"] });
  });

  test("titulaire d'un autre groupe : ignoré, ni groupe ni droit (OG3)", () => {
    // Éli D. est de Bonté et titulaire dans Paix.
    const r = recopie("eli", "bonte");
    expect(r).toMatchObject({ ...vide, groupe: "bonte", entre: false, ignores: ["paix"] });
  });

  test("une personne sans groupe qui devient titulaire entre dans le groupe (OG3)", () => {
    expect(recopie("hugo", null)).toMatchObject({ ...vide, groupe: "paix", entre: true, ignores: [] });
    expect(recopie("noe", null)).toMatchObject({ groupe: "paix", entre: true, remplitParRole: ["paix"], dansEquipes: ["comite-paix"] });
  });

  test("sans groupe, citée dans deux groupes : le premier de la table, l'autre ignoré", () => {
    const r = recopie("joel", null);
    expect(r).toMatchObject({ groupe: "paix", entre: true, ignores: ["bonte"] });
    const inverse = recopieDeGroupe("joel", null, cinq([BONTE, PAIX]));
    expect(inverse.groupe).toBe("paix");
  });

  test("un document manquant : erreur claire, jamais des listes vides qui effaceraient les droits", () => {
    expect(() => recopieDeGroupe("noe", "paix", [PAIX])).toThrow(/cinq documents/);
    expect(() => recopieDeGroupe("noe", "paix", [])).toThrow(/cinq documents/);
    expect(() => recopieDeGroupe("", null, [PAIX])).toThrow(/cinq documents/);
    expect(recopieDeGroupe("noe", "paix", cinq([PAIX])).remplitParRole).toEqual(["paix"]);
  });

  test("personne non citée : groupe inchangé, rien d'accordé ; sans compte : rien", () => {
    expect(recopie("passant", null)).toMatchObject({ ...vide, groupe: null, entre: false, ignores: [] });
    expect(recopie("passant", "amour")).toMatchObject({ ...vide, groupe: "amour", entre: false });
    expect(recopie("", null)).toMatchObject({ ...vide, groupe: null, entre: false });
  });

  test("retirer un titulaire retire ses droits", () => {
    const sansNoe = { ...PAIX, roles: PAIX.roles.map((r) => ({ ...r, titulaires: r.titulaires.filter((x) => x.uid !== "noe") })) };
    expect(recopieDeGroupe("noe", "paix", cinq([sansNoe]))).toMatchObject(vide);
  });

  test("« Saisir les chants des fêtes » n'ajoute rien aux listes recopiées (décision 35)", () => {
    const sansCase = { ...PAIX, roles: PAIX.roles.map((r) => ({ ...r, droits: { ...r.droits, saisirFetes: false } })) };
    const avecCase = { ...PAIX, roles: PAIX.roles.map((r) => ({ ...r, droits: { ...r.droits, saisirFetes: true } })) };
    for (const uid of ["ruth", "noe", "mei", "sam", "joel", "eli"]) {
      expect(recopieDeGroupe(uid, "paix", cinq([avecCase]))).toEqual(recopieDeGroupe(uid, "paix", cinq([sansCase])));
    }
    // Le rôle « Chants des fêtes » seul (Éli D., de Paix cette fois) : rien sur le profil.
    expect(recopieDeGroupe("eli", "paix", cinq([PAIX]))).toMatchObject({ ...vide, groupe: "paix" });
  });
});

test.describe("colonnes reliables (OG12)", () => {
  const cles = (g: string) => colonnesReliables(g).map((c) => c.cle);

  test("personnes du planning du groupe, jamais Thème ; Amour et Joie aucune", () => {
    expect(cles("paix")).toEqual(["presidence", "musiciens", "orateur", "percussion"]);
    expect(cles("bonte")).toEqual(["presidence", "musiciens", "orateur", "percussion"]);
    expect(cles("fidelite")).toEqual(["presidence", "orateur", "pianiste", "guitariste", "batterie"]);
    expect(cles("amour")).toEqual([]);
    expect(cles("joie")).toEqual([]);
    expect(colonnesReliables("paix")[1].i18n).toBe("planning.roles.musiciens");
  });

  test("une colonne = un seul rôle : le cadenas, sauf pour le rôle qui la tient", () => {
    const prises = (id: string) => Object.fromEntries(colonnesProposees(PAIX, id).map((c) => [c.cle, c.prisePar]));
    expect(prises("r-resp")).toEqual({ presidence: null, musiciens: "r-mus", orateur: null, percussion: null });
    expect(prises("r-mus").musiciens).toBeNull();
    // Nouveau rôle (pas d'id) : la colonne des Musiciens est prise.
    expect(colonnesProposees(PAIX, null).find((c) => c.cle === "musiciens")?.prisePar).toBe("r-mus");
    expect(colonnesProposees(JOIE, null)).toEqual([]);
  });

  test("un rôle sans id qui tient la colonne : prisePar absent, pas la chaîne vide", () => {
    const sansId: OrganigrammeGroupe = { ...PAIX, roles: [role("", "Sans id", { colonne: "orateur" })] };
    const orateur = colonnesProposees(sansId, null).find((c) => c.cle === "orateur")!;
    expect(orateur.prisePar).toBeUndefined();
    expect(colonnesProposees(sansId, null).find((c) => c.cle === "musiciens")!.prisePar).toBeNull();
  });

  test("deux rôles sur la même colonne (écriture directe) : « Choisir » prend le premier", () => {
    const double: OrganigrammeGroupe = { ...PAIX, roles: [role("x", "X", { colonne: "orateur" }), role("y", "Y", { colonne: "orateur" })] };
    expect(roleDeColonne(double, "orateur")?.id).toBe("x");
    expect(roleDeColonne(double, "percussion")).toBeUndefined();
    expect(roleDeColonne(PAIX, "musiciens")?.nom).toBe("Musiciens");
  });
});

test.describe("« Relier à un compte » (OG16, décision 45)", () => {
  const compte = { uid: "mali", nom: "Malin L." };

  test("le nom sans compte est remplacé dans tous les rôles, présidence et VP compris", () => {
    const g: OrganigrammeGroupe = { ...PAIX, president: t("Ma Lin"), vp: [t("Léa M.", "lea"), t("ma lin")] };
    const r = relierACompte(g, "Ma Lin", compte);
    expect(r.president).toEqual({ nom: "Malin L.", uid: "mali" });
    expect(r.vp).toEqual([{ nom: "Léa M.", uid: "lea" }, { nom: "Malin L.", uid: "mali" }]);
    expect(r.roles[0].titulaires).toEqual([t("Joël F.", "joel"), t("Hugo L.", "hugo"), { nom: "Malin L.", uid: "mali" }]);
    expect(r.roles[4].titulaires).toEqual([t("Sam R.", "sam"), { nom: "Malin L.", uid: "mali" }]);
    // L'original n'est pas modifié.
    expect(PAIX.roles[0].titulaires[2]).toEqual(t("Ma Lin"));
  });

  test("un rôle où le compte est déjà titulaire garde une seule ligne ; un autre nom sans compte est intact", () => {
    const g: OrganigrammeGroupe = {
      ...PAIX,
      roles: [role("a", "A", { titulaires: [t("Malin L.", "mali"), t("Ma Lin")] }), role("b", "B", { titulaires: [t("Lou K."), t("Ma Lin")] })],
    };
    const r = relierACompte(g, "Ma Lin", compte);
    expect(r.roles[0].titulaires).toEqual([{ nom: "Malin L.", uid: "mali" }]);
    expect(r.roles[1].titulaires).toEqual([t("Lou K."), { nom: "Malin L.", uid: "mali" }]);
  });

  test("un titulaire avec compte du même nom n'est pas touché", () => {
    const g: OrganigrammeGroupe = { ...PAIX, roles: [role("a", "A", { titulaires: [t("Ma Lin", "autre")] })] };
    expect(relierACompte(g, "Ma Lin", compte).roles[0].titulaires).toEqual([t("Ma Lin", "autre")]);
  });
});

// « Choisir » (OG29, OG30). Paix : Musiciens relié à `musiciens` (Joël F., Hugo L., Ma Lin sans compte).
const compteDe = (uid: string, nom: string, o: Partial<CompteDuPlanning> = {}): CompteDuPlanning =>
  ({ uid, nom, prenom: nom.split(" ")[0], nomDeFamille: nom.split(" ")[1] ?? "", serviceRoles: {}, groupe: "paix", ...o });

const COMPTES: CompteDuPlanning[] = [
  compteDe("ruth", "Ruth K."),
  compteDe("lea", "Léa M."),
  compteDe("joel", "Joël F."),
  compteDe("hugo", "Hugo L."),
  compteDe("noe", "Noé P."),
  compteDe("luc", "Luc B."), // du groupe, aucun rôle
  compteDe("sans-nom", "", { prenom: "Sacha", nomDeFamille: "Q." }), // pas de nom de planning
  compteDe("eli", "Éli D.", { groupe: "bonte" }),
  compteDe("zoe", "Zoé W.", { groupe: "joie" }),
  compteDe("ext", "Gaël X.", { groupe: null, serviceRoles: { "Culte Francophone": ["chanteur"] } }), // d'ailleurs, sans groupe
  compteDe("sam", "Sam R.", { groupe: null }),
];
// Colonnes de Paix : presidence 1, musiciens 2, orateur 3, theme 4, percussion 5.
const LIGNES = [
  ["2026-10-04", "Ruth K.", "Joël F., Luc B.", "Pasteur Invité", "Foi", ""],
  ["2026-10-11", "Léa M.", "Hugo L.", "Orateur Gaël", "Paix", ""],
  ["2026-10-18", "Ruth K.", "Joël F., Ma Lin", "", "", ""],
];

test.describe("« Choisir » relié à un rôle (OG29, OG30)", () => {
  test("① titulaires du rôle en tête, avec « Libre » ou « Déjà le … »", () => {
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "");
    expect(p).not.toBeNull();
    expect(p!.role.nom).toBe("Musiciens");
    expect(p!.titulaires).toEqual([
      { nom: "Joël F.", sansCompte: false, deja: ["2026-10-04", "2026-10-18"] },
      { nom: "Hugo L.", sansCompte: false, deja: ["2026-10-11"] },
      { nom: "Ma Lin", sansCompte: true, deja: ["2026-10-18"] },
    ]);
  });

  test("« Libre » : aucune date", () => {
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, [LIGNES[1]], "");
    expect(p!.titulaires.map((x) => [x.nom, x.deja.length])).toEqual([["Joël F.", 0], ["Hugo L.", 1], ["Ma Lin", 0]]);
  });

  test("② le reste du groupe est replié : comptes du groupe et titulaires sans compte des autres rôles, avec leurs rôles", () => {
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "")!;
    const noms = p.groupe.map((m) => m.nom);
    // Alphabétique ; ni Joël, Hugo, Ma Lin (déjà en ①), ni Éli (Bonté), ni Zoé (Joie), ni Gaël (hors groupe), ni
    // Mei Z. (compte non lu), ni le compte sans nom de planning. Sam R., titulaire pas encore recopié (groupe inconnu), y est.
    expect(noms).toEqual(["Léa M.", "Luc B.", "Noé P.", "Ruth K.", "Sam R."]);
    const par = Object.fromEntries(p.groupe.map((m) => [m.nom, m.roles.map((r) => r.nom)]));
    expect(par["Ruth K."]).toEqual(["Président"]);
    expect(par["Léa M."]).toEqual(["Vice-président"]);
    expect(par["Noé P."]).toEqual(["Responsable louange"]);
    expect(par["Luc B."]).toEqual([]);
    expect(p.groupe.find((m) => m.nom === "Ruth K.")!.roles[0].nomZh).toBe("主席");
    // Le discriminant : président et VP se reconnaissent sans comparer le nom ; un rôle créé du même nom n'en a pas.
    expect(p.groupe.find((m) => m.nom === "Ruth K.")!.roles[0].fixe).toBe("president");
    expect(p.groupe.find((m) => m.nom === "Léa M.")!.roles[0].fixe).toBe("vp");
    expect(p.groupe.find((m) => m.nom === "Noé P.")!.roles[0]).not.toHaveProperty("fixe");
  });

  test("les titulaires sans compte des autres rôles sont dans le groupe replié", () => {
    const g: OrganigrammeGroupe = { ...PAIX, roles: [PAIX.roles[0], role("r-x", "Accueil", { titulaires: [t("Lou K.")] })] };
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", g, COMPTES, [], "")!;
    const lou = p.groupe.find((m) => m.nom === "Lou K.");
    expect(lou).toMatchObject({ sansCompte: true });
    expect(lou!.roles.map((r) => r.nom)).toEqual(["Accueil"]);
  });

  test("hors groupe : par la recherche seulement, après le groupe", () => {
    const sans = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "")!;
    expect(sans.autres).toEqual([]);
    const avec = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "ga")!;
    expect(avec.titulaires).toEqual([]);
    expect(avec.groupe).toEqual([]);
    // Gaël X. (compte d'ailleurs) et « Orateur Gaël » (nom écrit dans la grille).
    expect(avec.autres.map((a) => a.nom)).toEqual(["Gaël X.", "Orateur Gaël"]);
    const eli = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "éli")!;
    expect(eli.autres.map((a) => a.nom)).toEqual(["Éli D."]);
  });

  test("la recherche filtre tout, sans accents ni casse", () => {
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "JOEL")!;
    expect(p.titulaires.map((x) => x.nom)).toEqual(["Joël F."]);
    expect(p.groupe).toEqual([]);
    expect(propositionsReliees(GRILLE_PAIX, "musiciens", PAIX, COMPTES, LIGNES, "ruth")!.groupe.map((m) => m.nom)).toEqual(["Ruth K."]);
  });

  test("un compte sans nom de planning est absent ; un titulaire d'un autre groupe est ignoré (OG3)", () => {
    const g: OrganigrammeGroupe = {
      ...PAIX,
      roles: [role("r-mus", "Musiciens", { colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Sacha Q.", "sans-nom"), t("Éli D.", "eli"), t("Fantôme", "fantome")] })],
    };
    const p = propositionsReliees(GRILLE_PAIX, "musiciens", g, COMPTES, [], "")!;
    expect(p.titulaires.map((x) => x.nom)).toEqual(["Joël F."]);
  });

  test("OG30 : colonne non reliée, planning sans organigramme, autre groupe → null (« Choisir » inchangé)", () => {
    expect(propositionsReliees(GRILLE_PAIX, "orateur", PAIX, COMPTES, LIGNES, "")).toBeNull();
    expect(propositionsReliees(GRILLE_PAIX, "theme", PAIX, COMPTES, LIGNES, "")).toBeNull();
    expect(propositionsReliees(GRILLE_PAIX, "musiciens", undefined, COMPTES, LIGNES, "")).toBeNull();
    expect(propositionsReliees(GRILLE_CULTE, "musiciens", PAIX, COMPTES, LIGNES, "")).toBeNull();
    // Le document de Bonté ne s'applique pas au planning de Paix.
    expect(propositionsReliees(GRILLE_PAIX, "musiciens", BONTE, COMPTES, LIGNES, "")).toBeNull();
    expect(propositionsReliees(GRILLE_BONTE, "musiciens", BONTE, COMPTES, LIGNES, "")).not.toBeNull();
  });

  test("OG30 : la fonction d'avant ne change pas (serviceRoles d'abord)", () => {
    const comptes: CompteDuPlanning[] = [
      compteDe("a", "Zed A.", { serviceRoles: { "Groupe Paix": ["musicien"] } }),
      compteDe("b", "Abel B.", { serviceRoles: {} }),
    ];
    expect(propositions(GRILLE_PAIX, "musiciens", comptes, [], "")).toEqual([
      { nom: "Zed A.", duRole: true },
      { nom: "Abel B.", duRole: false },
    ]);
  });
});

// ═══ Tranche OG-B : droits, recopie, route, notifications ════════════════════

/** Base Admin simulée (patron `fausseBase` de tests/reunions.spec.ts) : profils, équipes de l'église et
 *  documents groupes/*, avec les écritures reçues (`update` d'un profil, `set` d'un groupe, lot groupé). */
function fausseBaseGroupes(
  users: Record<string, Record<string, unknown>>,
  groupes: Record<string, Record<string, unknown>> = {},
  equipes: Record<string, Record<string, unknown>> = {},
) {
  const ecrits: { chemin: string; data: Record<string, unknown> }[] = [];
  const lots: number[] = [];
  const collections: Record<string, Record<string, Record<string, unknown>>> = { users, groupes, equipes };
  const docs = (m: Record<string, Record<string, unknown>>) => Object.entries(m).map(([id, d]) => ({ id, data: () => d }));
  const ref = (nom: string, id: string) => ({
    _chemin: `${nom}/${id}`,
    get: async () => ({ exists: id in collections[nom], data: () => collections[nom][id] }),
    update: async (data: Record<string, unknown>) => {
      ecrits.push({ chemin: `${nom}/${id}`, data });
      collections[nom][id] = { ...collections[nom][id], ...data };
    },
    set: async (data: Record<string, unknown>) => {
      ecrits.push({ chemin: `${nom}/${id}`, data });
      collections[nom][id] = data;
    },
  });
  const db = {
    collection: (nom: string) => ({ get: async () => ({ docs: docs(collections[nom] ?? {}) }), doc: (id: string) => ref(nom, id) }),
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      const lot = {
        set: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => { ops.push(() => r.set(data)); return lot; },
        update: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => { ops.push(() => r.update(data)); return lot; },
        commit: async () => { lots.push(ops.length); for (const op of ops) await op(); },
      };
      return lot;
    },
  } as unknown as FirebaseFirestore.Firestore;
  return { db, ecrits, lots, users, groupes };
}

/** Un document groupes/{id} tel que Firestore le garde (sans `id`). */
const docGroupe = ({ id: _id, ...g }: OrganigrammeGroupe) => g as unknown as Record<string, unknown>;

test.describe("OG-B · recopie partagée en base simulée (OG3, OG19, OG20)", () => {
  test("un document equipes/comite-paix écrit à la main n'ajoute ni membre ni référent au comité", async () => {
    const equipes = [{ id: "comite-paix", membres: [{ nom: "Pirate", uid: "pirate", referent: true }] }];
    expect(rattachementDe("pirate", equipes)).toMatchObject({ dansEquipes: [], referentDe: [] });
    const { db } = fausseBaseGroupes({ pirate: { equipes: true } }, {}, { "comite-paix": { membres: equipes[0].membres } });
    await recalculerRattachement(db, ["pirate"], await lireEquipes(db), await lireGroupes(db));
    const lu = (await db.collection("users").doc("pirate").get()).data() as Record<string, unknown>;
    expect(lu.referentDe ?? []).toEqual([]);
    expect(lu.dansEquipes ?? []).toEqual([]);
  });

  test("équipes de l'église gardées, comité après elles ; listes par rôle ; sans groupe → groupe posé ; autre groupe → ignores", async () => {
    const { db, ecrits } = fausseBaseGroupes(
      {
        ruth: { serviceRoles: { "Groupe Paix": ["presidence"] } },
        noe: { groupe: "paix" },
        hugo: {}, // sans groupe : entre dans Paix
        eli: { groupe: "bonte" }, // titulaire dans Paix sans en être
      },
      { paix: docGroupe(PAIX), joie: docGroupe(JOIE), bonte: docGroupe(BONTE) },
      { da: { membres: [{ nom: "Ruth K.", uid: "ruth", referent: true }] } },
    );
    const r = await recalculerRattachement(db, ["ruth", "noe", "hugo", "eli"], await lireEquipes(db), await lireGroupes(db));
    expect(r.ignores).toEqual([{ uid: "eli", groupe: "paix" }]);
    const ecrit = (uid: string) => ecrits.find((e) => e.chemin === `users/${uid}`)?.data;
    expect(ecrit("ruth")).toEqual({
      dansEquipes: ["da", "comite-paix"], referentDe: ["da", "comite-paix"],
      remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"],
    });
    expect(ecrit("noe")).toEqual({ dansEquipes: ["comite-paix"], remplitParRole: ["paix"], publieParRole: ["paix"] });
    expect(ecrit("hugo")).toEqual({ groupe: "paix" });
    expect(ecrit("eli")).toBeUndefined();
    expect(r.maj).toBe(3);
  });

  test("un profil inchangé n'est pas réécrit ; retirer un titulaire retire ses droits", async () => {
    const base = fausseBaseGroupes({ noe: { groupe: "paix" }, sam: { groupe: "paix" } }, { paix: docGroupe(PAIX) });
    const relire = async () => recalculerRattachement(base.db, ["noe", "sam"], [], await lireGroupes(base.db));
    expect((await relire()).maj).toBe(2);
    expect((await relire()).maj).toBe(0);
    base.groupes.paix = docGroupe({ ...PAIX, roles: PAIX.roles.map((r) => ({ ...r, titulaires: r.titulaires.filter((x) => x.uid !== "noe") })) });
    expect((await relire()).maj).toBe(1);
    expect(base.users.noe).toMatchObject({ groupe: "paix", dansEquipes: [], remplitParRole: [], publieParRole: [] });
    expect(base.users.sam).toMatchObject({ remplitParRole: ["paix"] });
  });

  test("« Recalculer depuis l'organigramme » compte aussi les comptes cités dans groupes/*", async () => {
    const { db, users } = fausseBaseGroupes({ ana: { groupe: "joie" }, tom: {} }, { joie: docGroupe(JOIE) });
    expect(await recalculerDepuisOrganigramme(db)).toBe(2);
    expect(users.ana).toMatchObject({ notifieParRole: ["Groupe Joie"], referentDe: ["comite-joie"], dansEquipes: ["comite-joie"] });
    expect(users.tom).toMatchObject({ groupe: "joie", referentDe: ["comite-joie"] });
  });

  test("changerGroupe (admins) : retiré de la présidence, des VP et des rôles de l'ancien groupe, une écriture groupée", async () => {
    const base = fausseBaseGroupes({ noe: { groupe: "paix", dansEquipes: ["comite-paix"], remplitParRole: ["paix"], publieParRole: ["paix"] }, lea: { groupe: "paix" } },
      { paix: docGroupe(PAIX) });
    await expect(changerGroupe(base.db, { uid: "lea", email: "lea@example.com" }, "noe", "bonte")).rejects.toMatchObject({ status: 403 });
    await changerGroupe(base.db, { uid: "adm", email: ADMIN_EMAILS[0] }, "noe", "bonte");
    expect(base.lots).toEqual([2]);
    expect(base.users.noe).toMatchObject({ groupe: "bonte", dansEquipes: [], remplitParRole: [], publieParRole: [] });
    const paix = lireGroupe("paix", base.groupes.paix);
    expect(paix.roles.flatMap((r) => r.titulaires).some((x) => x.uid === "noe")).toBe(false);
    // La VP : retirée des VP. « Sans groupe » : groupe "".
    await changerGroupe(base.db, { uid: "adm", email: ADMIN_EMAILS[0] }, "lea", "");
    expect(lireGroupe("paix", base.groupes.paix).vp).toEqual([]);
    expect(base.users.lea).toMatchObject({ groupe: "", referentDe: [], notifieParRole: [] });
  });

  test("changerGroupe : vers son propre groupe, rien ; non citée dans l'ancien groupe, son document n'est pas réécrit", async () => {
    const admin = { uid: "adm", email: ADMIN_EMAILS[0] };
    const base = fausseBaseGroupes({ sam: { groupe: "paix" }, luc: { serviceRoles: { "Groupe Paix": ["musicien"] } } }, { paix: docGroupe(PAIX) });
    expect(await changerGroupe(base.db, admin, "sam", "paix")).toEqual({ maj: 0 });
    expect(base.ecrits).toEqual([]);
    await changerGroupe(base.db, admin, "luc", "joie");
    expect(base.ecrits.map((e) => e.chemin)).toEqual(["users/luc"]);
    expect(base.users.luc).toMatchObject({ groupe: "joie", serviceRoles: { "Groupe Paix": ["musicien"] } });
  });

  test("« Recalculer depuis l'organigramme » répare un ancien président qui n'est plus cité nulle part", async () => {
    const { db, users } = fausseBaseGroupes(
      { ancien: { groupe: "paix", referentDe: ["comite-paix"], dansEquipes: ["comite-paix"], publieParRole: ["paix"] }, rien: {} },
      { paix: docGroupe({ ...PAIX, president: null, vp: [], roles: [] }) },
    );
    expect(await recalculerDepuisOrganigramme(db)).toBe(1);
    expect(users.ancien).toMatchObject({ referentDe: [], dansEquipes: [], publieParRole: [] });
  });

  test("exigerTenirGroupe : admin, président, VP oui ; droit Équipes seul, membre, autre groupe : 403", async () => {
    const { db } = fausseBaseGroupes({
      ruth: { referentDe: ["comite-paix"] }, lea: { referentDe: ["comite-paix"] },
      eq: { equipes: true }, mei: { dansEquipes: ["comite-paix"] }, ana: { referentDe: ["comite-joie"] },
    });
    await expect(exigerTenirGroupe({ uid: "adm", email: ADMIN_EMAILS[0] }, "paix", db)).resolves.toBeUndefined();
    await expect(exigerTenirGroupe({ uid: "ruth", email: "r@x.fr" }, "paix", db)).resolves.toBeUndefined();
    await expect(exigerTenirGroupe({ uid: "lea", email: "l@x.fr" }, "paix", db)).resolves.toBeUndefined();
    for (const uid of ["eq", "mei", "ana"]) {
      await expect(exigerTenirGroupe({ uid, email: `${uid}@x.fr` }, "paix", db), uid).rejects.toMatchObject({ status: 403 });
    }
    await expect(exigerTenirGroupe(null, "paix", db)).rejects.toMatchObject({ status: 401 });
    await expect(exigerTenirGroupe({ uid: "adm", email: ADMIN_EMAILS[0] }, "comite-paix", db)).rejects.toMatchObject({ status: 400 });
  });
});

test.describe("OG-B · miroirs client (OG22 à OG27)", () => {
  const admin = { uid: "adm", email: ADMIN_EMAILS[0] };
  const u = (uid: string) => ({ uid, email: `${uid}@example.com` });
  const paix = getPlanning("paix")!;
  const bonte = getPlanning("bonte")!;
  const culte = getPlanning("culte")!;
  const PRESIDENT = { groupe: "paix", referentDe: ["comite-paix"], dansEquipes: ["comite-paix"], remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"] };
  const NOTIFIE = { groupe: "paix", notifieParRole: ["Groupe Paix"] };
  type Profil = { referentDe?: string[]; dansEquipes?: string[]; equipes?: boolean };
  const EQUIPIER: Profil = { equipes: true };
  const MEMBRE_COMITE: Profil = { dansEquipes: ["comite-paix"] };

  test("Remplir : canEditPlanning lit plannings ou remplitParRole", () => {
    expect(canEditPlanning(u("sam"), { remplitParRole: ["paix"] }, "paix")).toBe(true);
    expect(canEditPlanning(u("sam"), { remplitParRole: ["paix"] }, "bonte")).toBe(false);
    expect(canEditPlanning(u("sam"), { plannings: ["paix"] }, "paix")).toBe(true);
  });

  test("Publier : canPublishPlanning avec publieParRole ; un rôle « Notifier » seul ne publie pas", () => {
    expect(canPublishPlanning(paix, false, [], ["paix"])).toBe(true);
    expect(canPublishPlanning(bonte, false, [], ["paix"])).toBe(false);
    expect(canPublishPlanning(paix, false, [])).toBe(false);
    expect(canPublishPlanning(paix, false, [], [], )).toBe(false);
  });

  test("peutPrevenir : un rôle « Notifier » seul de Paix prévient pour Paix, pas pour Bonté ni le Culte ; Publier aussi ; Remplir seul non", () => {
    expect(peutPrevenir(paix, false, [], [], ["Groupe Paix"])).toBe(true);
    expect(peutPrevenir(bonte, false, [], [], ["Groupe Paix"])).toBe(false);
    expect(peutPrevenir(culte, false, [], [], ["Groupe Paix"])).toBe(false);
    expect(peutPrevenir(paix, false, [], ["paix"], [])).toBe(true);
    expect(peutPrevenir(paix, false, [], [], [])).toBe(false);
  });

  // Lot AO (docs/spec-acces-organigramme.md, A2) : interrupteur ouvert, le droit coché `notify` ne compte plus.
  test("audiencesNotifiables = notifieParRole (lot AO) ; interrupteur coupé → notify seul", () => {
    expect(audiencesNotifiables({ notify: ["Campus"], notifieParRole: ["Groupe Joie"] }, true)).toEqual(["Groupe Joie"]);
    expect(audiencesNotifiables({ notify: ["Campus"], notifieParRole: ["Groupe Joie"] }, false)).toEqual(["Campus"]);
    expect(audiencesNotifiables(null, true)).toEqual([]);
  });

  test("canTenirGroupe et tientUnGroupe : admin, président et VP du groupe ; droit Équipes seul → aucun groupe (décision 44)", () => {
    expect(canTenirGroupe(admin, null, "joie")).toBe(true);
    expect(canTenirGroupe(u("ruth"), PRESIDENT, "paix")).toBe(true);
    expect(canTenirGroupe(u("ruth"), PRESIDENT, "bonte")).toBe(false);
    expect(canTenirGroupe(u("mei"), MEMBRE_COMITE, "paix")).toBe(false);
    expect(canTenirGroupe(u("eq"), EQUIPIER, "paix")).toBe(false);
    expect(tientUnGroupe(u("ruth"), PRESIDENT)).toBe(true);
    expect(tientUnGroupe(u("eq"), EQUIPIER)).toBe(false);
    // `comite-franco` est une équipe de l'église, pas un comité de groupe.
    expect(tientUnGroupe(u("x"), { referentDe: ["comite-franco"] })).toBe(false);
    expect(tientUnGroupe(null, PRESIDENT)).toBe(false);
  });

  test("entreesBackOffice d'un président sans droit Équipes : Équipes, Planning et Messages ; ses pages Tâches, Réunions, Évènements restent", () => {
    const entrees = entreesBackOffice(u("ruth"), PRESIDENT);
    for (const e of ["equipes", "planning", "messages"] as const) expect(entrees, e).toContain(e);
    expect(droitsDesPages(u("ruth"), PRESIDENT)).toEqual({ taches: true, evenements: true, reunions: true });
    expect(estResponsable(u("ruth"), PRESIDENT)).toBe(true);
    expect(estResponsable(u("x"), { remplitParRole: ["paix"] })).toBe(true);
    expect(estResponsable(u("x"), { publieParRole: ["paix"] })).toBe(true);
    expect(estResponsable(u("x"), { notifieParRole: ["Groupe Joie"] })).toBe(true);
    expect(planningsDuBackOffice(u("ruth"), PRESIDENT)).toEqual(["groupes"]);
    expect(planningsDuBackOffice(u("x"), { remplitParRole: ["fidelite"] })).toEqual(["groupes"]);
  });

  test("un rôle « Notifier » seul de Paix : entrée Planning, avec Paix (OG26)", () => {
    expect(entreesBackOffice(u("mei"), NOTIFIE)).toContain("planning");
    expect(planningsDuBackOffice(u("mei"), NOTIFIE)).toEqual(["groupes"]);
    expect(planningsDuBackOffice(u("mei"), { notifieParRole: ["Groupe Joie"] })).toEqual([]);
  });

  test("droit Équipes seul : l'entrée Équipes (l'église), aucun groupe modifiable", () => {
    expect(entreesBackOffice(u("eq"), { equipes: true })).toContain("equipes");
    expect(TABLE_GROUPES.some((g) => canTenirGroupe(u("eq"), EQUIPIER, g.id))).toBe(false);
  });

  test("creatableEvenementPours → equipe:comite-paix pour le président, pas pour un simple membre du comité", () => {
    expect(creatableEvenementPours(u("ruth"), PRESIDENT, [])).toEqual(["equipe:comite-paix"]);
    expect(creatableEvenementPours(u("mei"), { dansEquipes: ["comite-paix"] }, [])).toEqual([]);
    expect(creatableEvenementPours(admin, null, []).slice(-5)).toEqual(COMITES.map((c) => `equipe:${c}`));
  });

  test("le comité dans les tâches : un membre le lit, le président y crée ; un admin voit les cinq comités après les équipes", () => {
    expect(equipesDesTaches(u("mei"), { dansEquipes: ["comite-paix", "da"] })).toEqual(["da", "comite-paix"]);
    expect(equipesOuCreer(u("ruth"), PRESIDENT)).toEqual(["comite-paix"]);
    expect(equipesDesTaches(admin, null).slice(-5)).toEqual([...COMITES]);
  });

  test("public Louange (OG38, décision 42) : un membre de Joie par le seul champ groupe en fait partie ; ni clé ni groupe → non", () => {
    expect(estDeLEquipe(u("zoe"), { groupe: "joie" }, "louange")).toBe(true);
    expect(equipesDe({ groupe: "amour" })).toEqual(["louange"]);
    expect(estDeLEquipe(u("x"), { groupe: "" }, "louange")).toBe(false);
    expect(estDeLEquipe(u("x"), {}, "louange")).toBe(false);
  });
});

test.describe("OG-B · règles Firestore (miroir, texte de firestore.rules)", () => {
  const rules = readFileSync("firestore.rules", "utf8");

  test("groupes/{g} : les ids de la règle sont ceux de la table ; lu par tout connecté, jamais supprimé", () => {
    const bloc = rules.slice(rules.indexOf("match /groupes/{g}"));
    const ids = /g in \[([^\]]+)\]/.exec(bloc)?.[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(ids).toEqual(TABLE_GROUPES.map((g) => g.id));
    expect(bloc).toMatch(/allow read: if signedIn\(\);/);
    expect(bloc).toMatch(/allow delete: if false;/);
  });

  test("tientGroupe et plafond des VP (décision 36) : un non-admin ne change ni president, ni vp, ni maxVp ; maxVp de 1 à 9 ; vp ≤ plafond", () => {
    expect(rules).toMatch(/function tientGroupe\(g\)[\s\S]*?\('comite-' \+ g\) in profile\(\)\.get\('referentDe', \[\]\)/);
    const plafond = rules.slice(rules.indexOf("function vpDansLePlafond"), rules.indexOf("match /groupes/{g}"));
    expect(plafond).toMatch(/get\('maxVp', 2\)/);
    expect(plafond).toMatch(/max is int && max >= 1 && max <= 9/);
    expect(plafond).toMatch(/get\('vp', \[\]\)\.size\(\) <= max/);
    const bloc = rules.slice(rules.indexOf("match /groupes/{g}"));
    expect(bloc).toMatch(/allow create: if isAdmin\(\)[^;]*vpDansLePlafond\(\)/);
    for (const champ of ["president", "vp", "maxVp"]) {
      expect(bloc, champ).toMatch(new RegExp(`request\\.resource\\.data\\.get\\('${champ}', [^)]+\\) == resource\\.data\\.get\\('${champ}'`));
    }
  });

  test("peutEcrirePlanning lit aussi remplitParRole ; création d'un profil sans groupe ni listes par rôle", () => {
    expect(rules).toMatch(/function peutEcrirePlanning\(key\)[\s\S]*?key in profile\(\)\.get\('remplitParRole', \[\]\)/);
    const creation = rules.slice(rules.indexOf("match /users/{uid}"), rules.indexOf("allow update: if isAdmin();"));
    expect(creation).toMatch(/request\.resource\.data\.get\('groupe', null\) == null/);
    for (const champ of ["remplitParRole", "publieParRole", "notifieParRole"]) {
      expect(creation, champ).toContain(`request.resource.data.get('${champ}', []) == []`);
    }
  });

  test("public Louange : la branche Louange de estDeLEquipe compte un champ groupe non vide", () => {
    expect(rules).toMatch(/function estDeLEquipe\(equipe\)[\s\S]*?profile\(\)\.get\('groupe', ''\) != ''/);
  });
});

test.describe("OG-B · destinataires, audiences, routes (OG24, OG25, OG28)", () => {
  test("uidsDuGroupe : clé ∪ groupe ; interrupteur coupé → clé seule", async () => {
    const { db } = fausseBaseGroupes({
      a: { serviceRoles: { "Groupe Paix": ["musicien"] } },
      b: { groupe: "paix" },
      c: { serviceRoles: { "Groupe Paix": [] }, groupe: "bonte" },
      d: { groupe: "joie" },
      e: {},
    });
    expect((await uidsDuGroupe("Groupe Paix", db, true)).sort()).toEqual(["a", "b", "c"]);
    expect((await uidsDuGroupe("Groupe Paix", db, false)).sort()).toEqual(["a", "c"]);
    expect(await uidsDuGroupe("Groupe Joie", db, true)).toEqual(["d"]);
    expect(await uidsDuGroupe("Groupe Joie", db, false)).toEqual([]);
    expect([...(await uidsDesAudiences(["Groupe Joie", "Groupe Bonté"], db, true))].sort()).toEqual(["c", "d"]);
  });

  test("Groupe Amour et Groupe Joie dans la rangée Groupes, seulement interrupteur ouvert", () => {
    const groupes = (bo: boolean) => notifyGroups(bo).find((g) => g.label === "Groupes")!.audiences;
    expect(groupes(true)).toEqual(["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "Groupe Amour", "Groupe Joie"]);
    expect(groupes(false)).toEqual(["Groupe Paix", "Groupe Fidélité", "Groupe Bonté"]);
    expect(isValidAudience("Groupe Joie", true)).toBe(true);
    expect(isValidAudience("Groupe Joie", false)).toBe(false);
  });

  test("publication et Notifier : acceptés par un rôle, refusés sans ; rôles ignorés interrupteur coupé", () => {
    const paix = getPlanning("paix")!;
    const moi = { notify: [], publieParRole: ["paix"], notifieParRole: ["Groupe Joie"] };
    expect(droitsDePublication(paix, false, moi, true)).toBe(true);
    expect(droitsDePublication(paix, false, moi, false)).toBe(false);
    expect(droitsDePublication(paix, false, { notifieParRole: ["Groupe Paix"] }, true)).toBe(false);
    expect(peutNotifierAudience("Groupe Joie", false, moi, true)).toBe(true);
    expect(peutNotifierAudience("Groupe Joie", false, moi, false)).toBe(false);
    expect(peutNotifierAudience("Groupe Paix", false, moi, true)).toBe(false);
    expect(peutNotifierAudience("Groupe Paix", true, null, true)).toBe(true);
  });
});

// ─── OG-B dans le navigateur : planning du groupe et Notifier ────────────────

test.describe("OG-B · navigateur", () => {
  /** Ouvre `to` le vendredi 18/09/2026 (T3 en cours, T4 en brouillon), Sheet vide. */
  async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
    await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    return signInAs(page, qui, docs, to);
  }
  const PUBLIE: FakeProfile = { uid: "noe", email: "noe@example.com", firstName: "Noé", lastName: "P.", groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix"] };
  const NOTIFIE: FakeProfile = { uid: "mei", email: "mei@example.com", firstName: "Mei", lastName: "Z.", groupe: "paix", notifieParRole: ["Groupe Paix"] };
  const plannings = (page: Page) => page.getByRole("navigation", { name: "Plannings" });

  test("un titulaire « Publier » de Paix publie un trimestre depuis la page du planning", async ({ page }) => {
    await ouvrir(page, PUBLIE, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/groupes\/?$/);
    await expect(plannings(page).getByRole("link")).toHaveText(["Groupes"]);
    const corps: unknown[] = [];
    await page.route("**/api/planning/release", async (route) => {
      corps.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, published: ["T4"], notified: true, sent: 0 } });
    });
    await page.getByRole("tab", { name: /^T4/ }).click();
    await page.getByRole("button", { name: "Publier le T4" }).click();
    await repondreDansLeSite(page, "Publier le T4");
    await expect.poll(() => corps).toEqual([{ key: "paix", tri: "T4", publish: true, year: 2026 }]);
  });

  test("un titulaire « Notifier » seul de Paix : entrée Planning, grille en lecture, pas de « Publier le T… »", async ({ page }) => {
    await ouvrir(page, NOTIFIE, "/back-office/planning", {
      "plannings/paix/dimanches/2026-09-20": { date: "2026-09-20", musiciens: "Joël F." },
    });
    await expect(page).toHaveURL(/\/back-office\/planning\/groupes\/?$/);
    await expect(page.locator("[data-grille]")).toBeVisible();
    const laCase = page.locator('[data-case="2026-09-20|musiciens"]').filter({ visible: true });
    await expect(laCase).toHaveText("Joël F.");
    await expect(laCase.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Publier le T\d/ })).toHaveCount(0);
  });

  test("Notifier : un titulaire « Notifier » de Joie voit « Groupe Joie », ses destinataires comptent les membres du groupe", async ({ page }) => {
    const JOIE_NOTIFIE: FakeProfile = { uid: "zoe", email: "zoe@example.com", firstName: "Zoé", lastName: "W.", groupe: "joie", notifieParRole: ["Groupe Joie"] };
    const membre = (uid: string, prenom: string, o: Record<string, unknown>) =>
      ({ [`users/${uid}`]: { email: `${uid}@example.com`, firstName: prenom, lastName: "T.", planningName: "", serviceRoles: {}, ...o } });
    await ouvrir(page, JOIE_NOTIFIE, "/back-office/messages/notifier", {
      ...membre("ana", "Ana", { groupe: "joie" }),
      ...membre("tom", "Tom", { groupe: "joie" }),
      ...membre("luc", "Luc", { groupe: "paix" }),
      ...membre("zoe", "Zoé", { groupe: "joie", notifieParRole: ["Groupe Joie"] }),
    });
    await page.getByRole("group", { name: "Audience" }).getByRole("button", { name: "Groupes" }).click();
    await expect(page.getByRole("group", { name: "Groupes" }).getByRole("button")).toHaveText(["Groupe Joie"]);
    await page.getByRole("group", { name: "Groupes" }).getByRole("button", { name: "Groupe Joie" }).click();
    await page.getByRole("textbox", { name: "Titre" }).fill("Pique-nique");
    await page.getByRole("textbox", { name: "Message" }).fill("Dimanche après le culte.");
    await expect(page.getByRole("button", { name: "Envoyer à 3 personnes" })).toBeEnabled();
  });
});

// ═══ Tranche OG-C : Back-Office › Équipes › Organigramme ═════════════════════

test.describe("OG-C · Back-Office › Équipes › Organigramme", () => {
  const compte = (uid: string, prenom: string, nom: string, o: Partial<FakeProfile> = {}): FakeProfile =>
    ({ uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`, serviceRoles: {}, ...o });
  const ADMIN = compte("adm", "Admin", "T.", { email: ADMIN_EMAILS[0] });
  const RUTH = compte("ruth", "Ruth", "K.", { groupe: "paix", referentDe: ["comite-paix"], dansEquipes: ["comite-paix"] });
  const LUC = compte("luc", "Luc", "B.", { groupe: "paix" });
  const COMPTES: FakeProfile[] = [
    RUTH, LUC,
    compte("lea", "Léa", "M.", { groupe: "paix" }), compte("clara", "Clara", "B.", { groupe: "paix" }),
    compte("joel", "Joël", "F.", { groupe: "paix" }), compte("hugo", "Hugo", "L.", { groupe: "paix" }),
    compte("sam", "Sam", "R.", { groupe: "paix" }), compte("noe", "Noé", "P.", { groupe: "paix" }),
    compte("manon", "Manon", "P.", { groupe: "paix" }), compte("maelle", "Maëlle", "G."),
    compte("marc", "Marc", "A.", { groupe: "bonte" }), compte("ana", "Ana", "T.", { groupe: "joie" }),
  ];
  // Paix : Ruth K. préside, deux VP ; Musiciens plein (3 sur 3, Ma Lin sans compte), Planning sans limite.
  const GROUPE_PAIX: OrganigrammeGroupe = {
    id: "paix", president: t("Ruth K.", "ruth"), vp: [t("Léa M.", "lea"), t("Clara B.", "clara")],
    roles: [
      role("r-mus", "Musiciens", { nomZh: "司琴", places: 3, colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Hugo L.", "hugo"), t("Ma Lin")] }),
      role("r-resp", "Responsable louange", { comite: true, places: 1, droits: droits({ remplir: true, publier: true }), titulaires: [t("Noé P.", "noe")] }),
      role("r-plan", "Planning", { droits: droits({ remplir: true }), titulaires: [t("Sam R.", "sam"), t("Ma Lin")] }),
    ],
    updatedAt: "", parUid: "", parNom: "",
  };
  const docs = (o: Record<string, Record<string, unknown>> = {}) => ({
    ...Object.fromEntries(COMPTES.map(({ uid, ...p }) => [`users/${uid}`, p as Record<string, unknown>])),
    "groupes/paix": docGroupe(GROUPE_PAIX),
    "groupes/bonte": docGroupe({ ...BONTE, roles: [role("b-acc", "Accueil", { titulaires: [t("Marc A.", "marc")] })] }),
    ...o,
  });
  async function ouvrir(page: Page, qui: FakeProfile, to: string, d = docs()) {
    const routes: Record<string, unknown>[] = [];
    await page.route("**/api/equipes/groupes", async (route) => {
      routes.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ json: { ok: true, maj: 1, ignores: [] } });
    });
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db = await signInAs(page, qui, d, to);
    return { db, routes };
  }
  const selecteur = (page: Page) => page.getByRole("group", { name: "Organigrammes", exact: true });
  const carte = (page: Page, id: string) => page.locator(`[data-role="${id}"]`);
  const ecrituresGroupe = (db: { writes: { method: string; path: string; data: Record<string, unknown> }[] }, id: string) =>
    db.writes.filter((w) => w.path === `groupes/${id}` || (w.method === "POST" && w.path.startsWith("groupes")));

  test("admin : Église garde le bandeau et Équipes · Musiciens ; Paix montre En tête, le comité et les rôles", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    await expect(selecteur(page).getByRole("button")).toHaveText(["Église", "Paix", "Fidélité", "Bonté", "Amour", "Joie"]);
    await expect(page.getByTestId("equipe-orga")).toBeVisible();
    await expect(page.getByRole("group", { name: "Vue" }).getByRole("button", { name: "Musiciens" })).toBeVisible();
    await selecteur(page).getByRole("button", { name: "Paix" }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/?\?groupe=paix$/);
    await expect(page.getByRole("region", { name: "En tête" })).toContainText("Ruth K.");
    await expect(page.getByRole("region", { name: "Le comité" }).first()).toContainText("Noé P.");
    await expect(carte(page, "r-mus")).toContainText("3 sur 3 places");
    await expect(carte(page, "r-mus")).toContainText("Colonne Musiciens");
    await expect(carte(page, "r-resp")).toContainText("Publie");
    await expect(carte(page, "r-resp")).not.toContainText("Remplit le planning");
    await expect(page.getByTestId("equipe-orga")).toHaveCount(0);
  });

  test("admin : « Nommer » crée groupes/joie, deux places de VP par défaut, « + » en offre une troisième (maxVp: 3)", async ({ page }) => {
    const { db, routes } = await ouvrir(page, ADMIN, "/back-office/equipes?groupe=joie");
    await page.getByRole("button", { name: "Nommer", exact: true }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille.getByText("Vice-présidents · au plus 2")).toBeVisible();
    await expect(feuille.getByRole("button", { name: "À nommer" })).toHaveCount(3);
    await feuille.getByRole("button", { name: "Une place de vice-président en plus" }).click();
    await expect(feuille.getByText("Vice-présidents · au plus 3")).toBeVisible();
    await expect(feuille.getByRole("button", { name: "À nommer" })).toHaveCount(4);
    await feuille.getByRole("region", { name: "Président", exact: true }).getByRole("button", { name: "À nommer" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("Ana");
    await page.getByRole("button", { name: /^Ana T\./ }).click();
    await expect(feuille.getByRole("region", { name: "Président", exact: true })).toContainText("Ana T.");
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect(feuille).toBeHidden();
    const [creation] = ecrituresGroupe(db, "joie");
    expect(creation.path).toBe("groupes/joie");
    expect(creation.method).toBe("POST");
    expect(creation.data).toMatchObject({ maxVp: 3, president: { nom: "Ana T.", uid: "ana" } });
    expect(routes).toEqual([{ groupe: "joie", uids: ["ana"] }]);
  });

  test("admin : deux VP nommés, « − » ne descend pas sous 2", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes?groupe=paix");
    await page.getByRole("button", { name: "Nommer", exact: true }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille.getByText("Vice-présidents · au plus 2")).toBeVisible();
    await expect(feuille.getByRole("button", { name: "Une place de vice-président en moins" })).toBeDisabled();
  });

  test("président sans droit Équipes : entrée Équipes, Paix ouvert et modifiable ; ni « Nommer » ni plafond ; Bonté et Église en lecture ; pas de rail", async ({ page }) => {
    await ouvrir(page, RUTH, "/back-office/equipes");
    // Sans `?groupe=`, la page s'ouvre sur le groupe qu'il tient.
    await expect(selecteur(page).getByRole("button", { name: "Paix" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Nouveau rôle" })).toBeVisible();
    await expect(carte(page, "r-mus").getByRole("button", { name: "Modifier le rôle Musiciens" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nommer", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Personnes" })).toHaveCount(0);
    await selecteur(page).getByRole("button", { name: "Bonté" }).click();
    await expect(carte(page, "b-acc")).toContainText("Marc A.");
    await expect(carte(page, "b-acc").getByRole("button", { name: /Modifier le rôle/ })).toHaveCount(0);
    await expect(carte(page, "b-acc").getByRole("button", { name: "Ajouter un titulaire" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nouveau rôle" })).toHaveCount(0);
    await selecteur(page).getByRole("button", { name: "Église" }).click();
    await expect(page.getByTestId("equipe-orga")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Modifier TEAM/ })).toHaveCount(0);
  });

  test("« Nouveau rôle » Paix : Thème absent, cadenas d'une colonne prise, Publier coche Remplir, quatre cases ; écrit droits.saisirFetes puis appelle la route", async ({ page }) => {
    const { db, routes } = await ouvrir(page, RUTH, "/back-office/equipes?groupe=paix");
    await page.getByRole("button", { name: "Nouveau rôle" }).click();
    const form = page.getByRole("form", { name: "Nouveau rôle" });
    const colonnes = form.getByRole("group", { name: "Colonne du planning reliée" });
    await expect(colonnes.getByRole("button", { name: /Thème/ })).toHaveCount(0);
    await expect(colonnes.getByRole("button", { name: /Musiciens/ })).toBeDisabled();
    await expect(form.getByRole("checkbox")).toHaveCount(5); // au comité + quatre droits
    await form.getByRole("checkbox", { name: /Publier le planning/ }).check();
    await expect(form.getByRole("checkbox", { name: /Remplir le planning du groupe/ })).toBeChecked();
    await expect(form.getByRole("checkbox", { name: /Remplir le planning du groupe/ })).toBeDisabled();
    await expect(form.getByRole("button", { name: "Créer le rôle" })).toBeDisabled();
    await form.getByRole("textbox", { name: "Nom du rôle" }).fill("Accueil");
    await colonnes.getByRole("button", { name: /Orateur/ }).click();
    await form.getByRole("checkbox", { name: /Saisir les chants des fêtes/ }).check();
    await form.getByRole("button", { name: "Créer le rôle" }).click();
    await expect(form).toBeHidden();
    const ecrit = ecrituresGroupe(db, "paix").at(-1)!;
    expect(ecrit.method).toBe("PATCH");
    expect((ecrit.data.roles as RoleGroupe[]).at(-1)).toMatchObject({
      nom: "Accueil", colonne: "orateur", droits: { remplir: true, publier: true, notifier: false, saisirFetes: true },
    });
    await expect.poll(() => routes.length).toBe(1);
    const accueil = page.locator("[data-role]").filter({ hasText: "Accueil" });
    await expect(accueil).toContainText("Saisit les chants des fêtes");
  });

  test("« Nouveau rôle » Joie : la phrase sans planning, Notifier et Saisir les chants des fêtes seulement", async ({ page }) => {
    const { db } = await ouvrir(page, ADMIN, "/back-office/equipes?groupe=joie");
    // Groupe sans rôle : « Nouveau rôle » en tête et sous « Aucun rôle pour l'instant ».
    await expect(page.getByText("Aucun rôle pour l'instant")).toBeVisible();
    await page.getByRole("button", { name: "Nouveau rôle" }).first().click();
    const form = page.getByRole("form", { name: "Nouveau rôle" });
    await expect(form).toContainText("Le Groupe Joie n'a pas de planning : pas de colonne à relier, ni de droit sur le planning.");
    await expect(form.getByRole("group", { name: "Colonne du planning reliée" })).toHaveCount(0);
    await expect(form.getByRole("checkbox")).toHaveCount(3); // au comité, Notifier, Saisir les chants
    await form.getByRole("textbox", { name: "Nom du rôle" }).fill("Accueil");
    await form.getByRole("checkbox", { name: /Saisir les chants des fêtes/ }).check();
    await form.getByRole("button", { name: "Créer le rôle" }).click();
    await expect(form).toBeHidden();
    const [creation] = ecrituresGroupe(db, "joie");
    expect(creation.path).toBe("groupes/joie");
    expect((creation.data.roles as RoleGroupe[])[0]).toMatchObject({ nom: "Accueil", colonne: null, droits: { saisirFetes: true } });
  });

  test("groupes/paix modifié après la lecture : « Modifié par … entre-temps : recharge », rien d'écrit, pas de route, le formulaire reste (OG37)", async ({ page }) => {
    const { db, routes } = await ouvrir(page, RUTH, "/back-office/equipes?groupe=paix");
    await expect(carte(page, "r-mus")).toBeVisible();
    db.set("groupes/paix", { ...docGroupe(GROUPE_PAIX), parNom: "Léa M." });
    await page.getByRole("button", { name: "Nouveau rôle" }).click();
    const form = page.getByRole("form", { name: "Nouveau rôle" });
    await form.getByRole("textbox", { name: "Nom du rôle" }).fill("Accueil");
    await form.getByRole("button", { name: "Créer le rôle" }).click();
    await expect(form.getByRole("alert")).toHaveText("Modifié par Léa M. entre-temps : recharge");
    await expect(form).toBeVisible();
    expect(db.writes.filter((w) => w.path.startsWith("groupes"))).toEqual([]);
    expect(routes).toEqual([]);
  });

  test("« Relier à un compte » : présent pour un admin sur un titulaire sans compte, absent pour un président ; remplace le nom dans ses deux rôles", async ({ page, browser }) => {
    const { db, routes } = await ouvrir(page, ADMIN, "/back-office/equipes?groupe=paix");
    await carte(page, "r-plan").click();
    const fiche = page.getByRole("dialog");
    await fiche.getByRole("button", { name: "Actions pour Ma Lin" }).click();
    await page.getByRole("menuitem", { name: "Relier à un compte" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("Manon");
    await expect(page.getByText("Ajouter « Manon » sans compte")).toHaveCount(0);
    await page.getByRole("button", { name: /^Manon P\./ }).click();
    await expect.poll(() => routes.length).toBe(1);
    const ecrit = ecrituresGroupe(db, "paix").at(-1)!;
    const roles = ecrit.data.roles as RoleGroupe[];
    expect(roles.find((r) => r.id === "r-mus")!.titulaires).toContainEqual({ nom: "Manon P.", uid: "manon" });
    expect(roles.find((r) => r.id === "r-plan")!.titulaires).toContainEqual({ nom: "Manon P.", uid: "manon" });
    expect(roles.flatMap((r) => r.titulaires).some((x) => x.nom === "Ma Lin")).toBe(false);
    expect(routes[0]).toMatchObject({ groupe: "paix" });
    expect(routes[0].uids).toContain("manon");

    const president = await (await browser.newContext()).newPage();
    await ouvrir(president, RUTH, "/back-office/equipes?groupe=paix");
    await carte(president, "r-plan").click();
    await president.getByRole("dialog").getByRole("button", { name: "Actions pour Ma Lin" }).click();
    await expect(president.getByRole("menuitem", { name: "Retirer" })).toBeVisible();
    await expect(president.getByRole("menuitem", { name: "Relier à un compte" })).toHaveCount(0);
  });

  test("« Ajouter un titulaire » : une recherche, « entrera dans le Groupe Paix », autre groupe grisé, « sans compte » en bas ; rôle plein sans « Ajouter »", async ({ page }) => {
    const { db } = await ouvrir(page, RUTH, "/back-office/equipes?groupe=paix");
    await expect(carte(page, "r-mus").getByRole("button", { name: "Ajouter un titulaire" })).toHaveCount(0);
    await carte(page, "r-plan").getByRole("button", { name: "Ajouter un titulaire" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("ma");
    const comptes = page.getByRole("region", { name: "Comptes" });
    await expect(comptes.getByRole("button")).toHaveText([/Manon P\.Groupe Paix/, /Maëlle G\.Sans groupe · entrera dans le Groupe Paix/, /Marc A\.Dans le Groupe Bonté : un admin peut le changer de groupe/]);
    await expect(comptes.getByRole("button", { name: /Marc A\./ })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Sans compte" })).toContainText("Ajouter « ma » sans compte");
    await comptes.getByRole("button", { name: /Maëlle G\./ }).click();
    await expect(carte(page, "r-plan")).toContainText("Maëlle G.");
    const roles = ecrituresGroupe(db, "paix").at(-1)!.data.roles as RoleGroupe[];
    expect(roles.find((r) => r.id === "r-plan")!.titulaires).toContainEqual({ nom: "Maëlle G.", uid: "maelle" });
  });

  test("deux gestes de suite s'écrivent (version reprise) ; la route reçoit aussi le titulaire retiré", async ({ page }) => {
    const { db, routes } = await ouvrir(page, RUTH, "/back-office/equipes?groupe=paix");
    await carte(page, "r-plan").getByRole("button", { name: "Ajouter un titulaire" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("Manon");
    await page.getByRole("button", { name: /^Manon P\./ }).click();
    await expect(carte(page, "r-plan")).toContainText("Manon P.");
    await expect.poll(() => routes.length).toBe(1);
    await carte(page, "r-plan").getByRole("button", { name: "Planning", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Actions pour Sam R." }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
    await expect(carte(page, "r-plan")).not.toContainText("Sam R.");
    await expect.poll(() => routes.length).toBe(2);
    expect(db.writes.filter((w) => w.path === "groupes/paix" && w.method === "PATCH")).toHaveLength(2);
    expect(routes[1].uids).toContain("sam");
  });

  test("la route répond en erreur : « Les droits n'ont pas été recopiés : réessaie », l'organigramme reste écrit ; « Réessayer » la rappelle", async ({ page }) => {
    const { db } = await ouvrir(page, RUTH, "/back-office/equipes?groupe=paix");
    let appels = 0;
    await page.route("**/api/equipes/groupes", async (route) => {
      appels++;
      await route.fulfill(appels === 1 ? { status: 500, json: { error: "panne" } } : { json: { ok: true, maj: 1, ignores: [] } });
    });
    await carte(page, "r-plan").getByRole("button", { name: "Ajouter un titulaire" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("Manon");
    await page.getByRole("button", { name: /^Manon P\./ }).click();
    const alerte = page.getByRole("alert").filter({ hasText: "Les droits n'ont pas été recopiés : réessaie" });
    await expect(alerte).toBeVisible();
    expect(db.writes.filter((w) => w.path === "groupes/paix")).toHaveLength(1);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(alerte).toHaveCount(0);
    expect(appels).toBe(2);
  });

  test("admin : « Nommer » sur Paix, « + » puis un troisième VP, écrit maxVp: 3 et trois VP", async ({ page }) => {
    const { db } = await ouvrir(page, ADMIN, "/back-office/equipes?groupe=paix");
    await page.getByRole("button", { name: "Nommer", exact: true }).click();
    const feuille = page.getByRole("dialog");
    await feuille.getByRole("button", { name: "Une place de vice-président en plus" }).click();
    await feuille.getByRole("button", { name: "À nommer" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un nom" }).fill("Joël");
    await page.getByRole("button", { name: /^Joël F\./ }).click();
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect(feuille).toBeHidden();
    const ecrit = db.writes.filter((w) => w.path === "groupes/paix").at(-1)!;
    expect(ecrit.data.maxVp).toBe(3);
    expect((ecrit.data.vp as { uid: string }[]).map((v) => v.uid)).toEqual(["lea", "clara", "joel"]);
  });

  test("simple membre : /back-office/equipes refusé (garde « Réservé aux responsables », piste A BO4)", async ({ page }) => {
    await ouvrir(page, LUC, "/back-office/equipes");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Équipes" })).toHaveCount(0);
    await expect(selecteur(page)).toHaveCount(0);
  });
});

test.describe("OG-C · libellés", () => {
  const cles = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => cles(v, p ? `${p}.${k}` : k)) : [p];
  test("le bloc groupes a les mêmes clés en français et en 中文 ; Bonté s'y écrit 恩慈 (décision 45)", () => {
    const fr = JSON.parse(readFileSync("src/locales/fr.json", "utf8")).groupes;
    const zh = JSON.parse(readFileSync("src/locales/zh-CN.json", "utf8")).groupes;
    expect(cles(zh).sort()).toEqual(cles(fr).sort());
    expect(zh.court.bonte).toBe("恩慈");
    expect(zh.form.sansPlanning).toContain("{{groupe}}");
    expect(zh.enTete.auPlus).toBe("副主席 · 最多 {{n}} 位");
    expect(zh.droit.saisirFetes).toBe("填写节日诗歌");
  });
});

// ─── OG-D · Personnes et Sans compte ─────────────────────────────────────────

test.describe("OG-D · logique pure (filtres, rôles d'une personne, titulaires sans compte)", () => {
  test("filtresPersonnes : Amour, Joie et « Sans groupe » seulement interrupteur ouvert ; les filtres d'avant restent", () => {
    const ferme = filtresPersonnes(false);
    const ouvert = filtresPersonnes(true);
    expect(ferme).not.toContain("Groupe Amour");
    expect(ferme).not.toContain("Sans groupe");
    expect(ouvert).toEqual([...ferme.slice(0, ferme.indexOf("Ne sert pas")), "Groupe Amour", "Groupe Joie", "Sans groupe", "Ne sert pas"]);
    expect(ouvert).toContain("EDD");
    expect(ouvert).toContain("Culte Francophone");
  });

  test("correspondAuFiltreGroupe : suit groupeDe (champ ou déduit) ; sans interrupteur, la clé de serviceRoles", () => {
    const parCle = { serviceRoles: { "Groupe Paix": [] } };
    const parChamp = { groupe: "joie", serviceRoles: {} };
    const deuxCles = { serviceRoles: { "Groupe Paix": [], "Groupe Bonté": [] } };
    const rien = { serviceRoles: {} };
    expect(correspondAuFiltreGroupe(parCle, "Groupe Paix", true)).toBe(true);
    expect(correspondAuFiltreGroupe(parChamp, "Groupe Joie", true)).toBe(true);
    expect(correspondAuFiltreGroupe(parChamp, "Groupe Paix", true)).toBe(false);
    // Un compte qui sert dans deux groupes est « Sans groupe » (OG2).
    expect(correspondAuFiltreGroupe(deuxCles, "Groupe Paix", true)).toBe(false);
    expect(correspondAuFiltreGroupe(deuxCles, "Sans groupe", true)).toBe(true);
    expect(correspondAuFiltreGroupe(rien, "Sans groupe", true)).toBe(true);
    expect(correspondAuFiltreGroupe(parCle, "Sans groupe", true)).toBe(false);
    // Ancienne administration : la clé seule.
    expect(correspondAuFiltreGroupe(deuxCles, "Groupe Paix", false)).toBe(true);
    // Pas un filtre de groupe.
    expect(correspondAuFiltreGroupe(parCle, "EDD", true)).toBeNull();
    expect(correspondAuFiltreGroupe(parCle, "Tous", false)).toBeNull();
  });

  test("nombreSansGroupe : les comptes dont groupeDe est nul", () => {
    expect(nombreSansGroupe([{ serviceRoles: {} }, { groupe: "amour" }, { groupe: "", serviceRoles: { "Groupe Paix": [] } }, { serviceRoles: { "Groupe Bonté": [] } }])).toBe(2);
  });

  test("postesDeCompte : président, VP, puis ses rôles (au comité d'abord) ; rien pour un autre ou sans compte", () => {
    const g = { ...PAIX, vp: [t("Joël F.", "joel")] };
    expect(postesDeCompte(g, "ruth")).toEqual([{ fixe: "president" }]);
    // Joël : VP, puis Musiciens.
    expect(postesDeCompte(g, "joel").map((p) => p.fixe ?? p.role!.id)).toEqual(["vp", "r-mus"]);
    // Noé : « Responsable louange » (au comité) avant tout autre rôle.
    const noe = postesDeCompte({ ...g, roles: [g.roles[4], { ...g.roles[1], titulaires: [t("Joël F.", "joel")] }, { ...g.roles[4], id: "r-x", titulaires: [t("Joël F.", "joel")] }] }, "joel");
    expect(noe.map((p) => p.fixe ?? p.role!.id)).toEqual(["vp", "r-resp", "r-x"]);
    expect(postesDeCompte(g, "inconnu")).toEqual([]);
    expect(postesDeCompte(g, "")).toEqual([]);
    expect(postesDeCompte(undefined, "ruth")).toEqual([]);
  });

  test("droitsParRoles : Publier inclut Remplir ; Notifier à part ; rien → tout faux", () => {
    expect(droitsParRoles({})).toEqual({ remplit: false, publie: false, notifie: false });
    expect(droitsParRoles({ remplitParRole: ["paix"] })).toEqual({ remplit: true, publie: false, notifie: false });
    expect(droitsParRoles({ publieParRole: ["paix"] })).toEqual({ remplit: true, publie: true, notifie: false });
    expect(droitsParRoles({ notifieParRole: ["Groupe Joie"] })).toEqual({ remplit: false, publie: false, notifie: true });
  });

  test("titulairesSansCompte (OG32) : un par nom et par groupe, présidence, VP et rôles ; les comptes n'y sont pas", () => {
    const paix: OrganigrammeGroupe = { ...PAIX, president: t("Ruth K.", "ruth"), vp: [t("Éli Sans")] };
    const l = titulairesSansCompte([paix, JOIE, { ...BONTE, vp: [t("Éli sans")] }]);
    // « Ma Lin » tient deux rôles du groupe Paix : une seule personne (OG15).
    const malin = l.find((x) => x.nom === "Ma Lin")!;
    expect(malin.groupe).toBe("paix");
    expect(malin.postes.map((p) => p.role!.id)).toEqual(["r-mus", "r-plan"]);
    expect(l.filter((x) => x.nom === "Ma Lin")).toHaveLength(1);
    // Le même nom (sans accents ni casse) dans deux groupes : une ligne par groupe.
    expect(l.filter((x) => x.nom.toLowerCase() === "éli sans").map((x) => x.groupe)).toEqual(["paix", "bonte"]);
    expect(l.find((x) => x.nom === "Éli Sans")!.postes).toEqual([{ fixe: "vp" }]);
    // Aucun compte, ordre de la table.
    expect(l.map((x) => x.nom)).toEqual(["Éli Sans", "Ma Lin", "Éli sans"]);
    expect(titulairesSansCompte([])).toEqual([]);
  });

  test("nomsDistincts : un nom écrit dans un planning et dans un organigramme n'est compté qu'une fois (OG32)", () => {
    expect(nomsDistincts(["Ma Lin", "Zoé Q."], ["ma lin", "Éli Sans", " "], ["Eli sans"])).toEqual(["Ma Lin", "Zoé Q.", "Éli Sans"]);
  });
});

test.describe("OG-D · navigateur (Personnes, Sans compte)", () => {
  const compte = (uid: string, prenom: string, nom: string, o: Partial<FakeProfile> = {}): FakeProfile =>
    ({ uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`, serviceRoles: {}, ...o });
  const ADMIN = compte("adm", "Admin", "T.", { email: ADMIN_EMAILS[0] });
  const JOEL = compte("joel", "Joël", "F.", { groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"], dansEquipes: ["comite-paix"] });
  const COMPTES: FakeProfile[] = [
    JOEL,
    compte("ruth", "Ruth", "K.", { groupe: "paix", referentDe: ["comite-paix"], dansEquipes: ["comite-paix"] }),
    compte("ana", "Ana", "T.", { groupe: "joie" }),
    compte("marc", "Marc", "A.", { serviceRoles: { "Groupe Bonté": ["musicien"] } }),
    compte("yann", "Yann", "M."),
    compte("doublon", "Eva", "D.", { serviceRoles: { "Groupe Paix": [], "Groupe Bonté": [] } }),
  ];
  const GROUPE_PAIX: OrganigrammeGroupe = {
    id: "paix", president: t("Ruth K.", "ruth"), vp: [],
    roles: [
      role("r-mus", "Musiciens", { nomZh: "司琴", colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Ma Lin")] }),
      role("r-resp", "Responsable louange", { nomZh: "敬拜负责人", comite: true, droits: droits({ publier: true, remplir: true }), titulaires: [t("Joël F.", "joel")] }),
      role("r-plan", "Planning", { titulaires: [t("Ma Lin")] }),
    ],
    updatedAt: "", parUid: "", parNom: "",
  };
  const docs = () => ({
    ...Object.fromEntries([ADMIN, ...COMPTES].map(({ uid, ...p }) => [`users/${uid}`, p as Record<string, unknown>])),
    "groupes/paix": docGroupe(GROUPE_PAIX),
  });
  async function ouvrir(page: Page, to: string) {
    const routes: Record<string, unknown>[] = [];
    await page.route("**/api/equipes/groupes", async (route) => {
      routes.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ json: { ok: true, maj: 1, ignores: [] } });
    });
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db = await signInAs(page, ADMIN, docs(), to);
    return { db, routes };
  }
  const fiche = (page: Page) => page.locator("article");

  test("Personnes : le sous-titre compte les inscrits, les groupes et les comptes sans groupe ; trois filtres de plus", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes");
    // Sans groupe : Marc (clé de Bonté seule : déduit Bonté, donc avec groupe), Yann, Eva (deux clés) et l'admin : 3.
    await expect(page.locator("header[data-entete-page]")).toContainText("7 inscrits · 5 groupes · 3 sans groupe");
    const filtres = page.getByRole("group", { name: "Filtrer les membres" });
    await expect(filtres.getByRole("button", { name: "Groupe Amour" })).toBeVisible();
    await expect(filtres.getByRole("button", { name: "Groupe Joie" })).toBeVisible();
    await filtres.getByRole("button", { name: "Sans groupe" }).click();
    const lignes = page.getByRole("button", { name: /Yann M\.|Eva D\./ });
    await expect(lignes).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Joël F\./ })).toHaveCount(0);
    await filtres.getByRole("button", { name: "Groupe Joie" }).click();
    await expect(page.getByRole("button", { name: /Ana T\./ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Yann M\./ })).toHaveCount(0);
  });

  test("Personnes : la ligne dit le groupe et les rôles ; « Sans groupe » pour qui n'en a pas", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes");
    const joel = page.getByRole("button", { name: /Joël F\./ });
    await expect(joel).toContainText("Groupe Paix · Responsable louange, Musiciens");
    await expect(page.getByRole("button", { name: /Yann M\./ })).toContainText("Sans groupe");
    await expect(page.getByRole("button", { name: /Ruth K\./ })).toContainText("Groupe Paix · Président");
  });

  test("la fiche : carte Groupe, Rôles dans le Groupe Paix, Droits « par ses rôles », Services et équipes", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes?uid=joel");
    const f = fiche(page);
    await expect(f.getByRole("heading", { level: 2 })).toHaveText("Joël F.");
    const groupe = f.getByRole("region", { name: "Groupe", exact: true });
    await expect(groupe).toContainText("Groupe Paix");
    await expect(groupe).toContainText("un seul groupe par personne");
    await expect(groupe).toContainText("Changer de groupe retire ses rôles du Groupe Paix (admin seulement).");
    const roles = f.getByRole("region", { name: "Rôles dans le Groupe Paix" });
    await expect(roles).toContainText("Responsable louange");
    await expect(roles).toContainText("敬拜负责人");
    await expect(roles).toContainText("au comité");
    await expect(roles).toContainText("Musiciens");
    await expect(roles).toContainText("Colonne Musiciens");
    await expect(roles.getByRole("link", { name: "Organigramme" })).toHaveAttribute("href", /\/back-office\/equipes\/?\?groupe=paix$/);
    const droitsCarte = f.getByRole("region", { name: "Droits" });
    await expect(droitsCarte).toContainText("Par ses rôles");
    await expect(droitsCarte).toContainText("Remplit et publie le planning");
    await expect(droitsCarte).toContainText("Celles du Groupe Paix");
    // Lot AO-B : plus de case de coordination, la note qui la disait cochée par un admin a disparu.
    await expect(droitsCarte).not.toContainText("cochée par un admin");
    await expect(f.getByRole("region", { name: "Services et équipes" })).toContainText("pendant la transition");
    await expect(f).not.toContainText("Services et rôles");
  });

  test("la fiche d'un compte sans groupe : pas de carte Rôles, « Sans groupe »", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes?uid=yann");
    const f = fiche(page);
    await expect(f.getByRole("region", { name: "Groupe", exact: true })).toContainText("Sans groupe");
    await expect(f.getByRole("region", { name: /^Rôles dans le/ })).toHaveCount(0);
    await expect(f.getByRole("region", { name: "Droits" })).toContainText(/Par ses rôles\s*—/);
  });

  test("« Changer de groupe » : feuille des cinq groupes et « Sans groupe », confirmation dans le site, route changerGroupe", async ({ page }) => {
    const { routes } = await ouvrir(page, "/back-office/equipes/personnes?uid=joel");
    await fiche(page).getByRole("button", { name: "Changer de groupe" }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille.getByRole("button")).toHaveText([/^Paix\s*groupe actuel$/, "Fidélité", "Bonté", "Amour", "Joie", "Sans groupe"]);
    await feuille.getByRole("button", { name: "Joie" }).click();
    await expect(fenetreDuSite(page)).toContainText("Changer de groupe retire ses rôles du Groupe Paix");
    await repondreDansLeSite(page, "Changer de groupe");
    await expect.poll(() => routes.length).toBe(1);
    expect(routes[0]).toEqual({ changerGroupe: { uid: "joel", groupe: "joie" } });
  });

  test("« Changer de groupe » : « Annuler » dans la confirmation n'appelle pas la route", async ({ page }) => {
    const { routes } = await ouvrir(page, "/back-office/equipes/personnes?uid=joel");
    await fiche(page).getByRole("button", { name: "Changer de groupe" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Sans groupe" }).click();
    await repondreDansLeSite(page, "Annuler");
    expect(routes).toHaveLength(0);
  });

  test("téléphone et tablette debout : une personne s'ouvre en page entière, avec le retour « Personnes »", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "propre aux affichages à un volet");
    await ouvrir(page, "/back-office/equipes/personnes");
    await page.getByRole("button", { name: /Joël F\./ }).click();
    await expect(page).toHaveURL(/[?&]uid=joel/);
    await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText("Joël F.");
    await expect(page.getByRole("button", { name: /Yann M\./ })).toHaveCount(0);
    await page.getByRole("button", { name: "Personnes", exact: true }).click();
    await expect(page.getByRole("button", { name: /Yann M\./ })).toBeVisible();
  });

  test("Personnes › Sans compte (ex-Planning › Sans compte) : un nom écrit aussi dans un planning n'est compté qu'une fois (OG32)", async ({ page }) => {
    const csv = [["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
      ["11/10", "Ma Lin", "", "", "Zoé Q.", "", "", "", "", "", "", "", ""]].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: new URL(route.request().url()).searchParams.get("sheet") === "Franco_Louange" ? csv : "" }));
    await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
    await signInAs(page, ADMIN, docs(), "/back-office/equipes/personnes/sans-compte");
    await expect(page.getByRole("region", { name: /^Titulaires sans compte/ })).toContainText("Ma Lin");
    // BO-G, 7 : un seul titre, « Noms du planning sans compte (N) », sur la carte même.
    const planning = page.locator("div", { has: page.getByRole("heading", { level: 2, name: /^Noms du planning sans compte/ }) }).last();
    await expect(planning).toContainText("Zoé Q.");
    await expect(planning).not.toContainText("Ma Lin");
  });

  test("Personnes › Sans compte (ex-Planning › Sans compte) : le bloc « Titulaires sans compte » mène à l'organigramme du groupe", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes/sans-compte");
    const bloc = page.getByRole("region", { name: /^Titulaires sans compte/ });
    await expect(bloc).toContainText("Titulaires sans compte (1)");
    const ligne = bloc.getByRole("link", { name: /Ma Lin/ });
    await expect(ligne).toContainText("Groupe Paix");
    await expect(ligne).toContainText("Musiciens");
    await expect(ligne).toContainText("Planning");
    await expect(ligne).toHaveAttribute("href", /\/back-office\/equipes\/?\?groupe=paix$/);
  });
});

test.describe("OG-E · App › Équipes", () => {
  const compte = (uid: string, prenom: string, nom: string, o: Partial<FakeProfile> = {}): FakeProfile =>
    ({ uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`, serviceRoles: {}, ...o });
  const JOEL = compte("joel", "Joël", "F.", { groupe: "paix" });
  const LUC = compte("luc", "Luc", "B.", { groupe: "paix" });
  const YANN = compte("yann", "Yann", "M.");
  const RUTH = compte("ruth", "Ruth", "K.", { groupe: "paix", referentDe: ["comite-paix"], dansEquipes: ["comite-paix"] });
  const ADMIN = compte("adm", "Admin", "T.", { email: ADMIN_EMAILS[0], groupe: "paix" });
  const PAIX_APP: OrganigrammeGroupe = {
    id: "paix", president: t("Ruth K.", "ruth"), vp: [],
    roles: [
      role("r-mus", "Musiciens", { nomZh: "司琴", places: 3, colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Ma Lin")] }),
      role("r-acc", "Accueil", { places: 1, titulaires: [] }),
    ],
    updatedAt: "", parUid: "", parNom: "",
  };
  const docs = () => ({
    ...Object.fromEntries([JOEL, LUC, YANN, RUTH, ADMIN].map(({ uid, ...p }) => [`users/${uid}`, p as Record<string, unknown>])),
    "groupes/paix": docGroupe(PAIX_APP),
    "groupes/bonte": docGroupe({ ...BONTE, roles: [role("b-acc", "Accueil", { titulaires: [t("Marc A.", "marc")] })] }),
  });
  async function ouvrir(page: Page, qui: FakeProfile, to = "/equipes", zh = false) {
    if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    return signInAs(page, qui, docs(), to);
  }
  const selecteur = (page: Page) => page.getByRole("group", { name: "Organigrammes", exact: true });
  const carte = (page: Page, id: string) => page.locator(`[data-role="${id}"]`);

  test("six pilules ; la page s'ouvre sur le groupe de la personne, « Toi », son nom marqué, une place libre, aucun outil de modification", async ({ page }, info) => {
    await ouvrir(page, JOEL);
    await expect(selecteur(page).getByRole("button")).toHaveText(["Église", "Paix", "Fidélité", "Bonté", "Amour", "Joie"]);
    await expect(selecteur(page).getByRole("button", { name: "Paix" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Équipes");
    await expect(page.locator("header[data-entete-page]")).toContainText("Organigrammes de l'église et des groupes");
    const moi = page.locator("[data-moi-bandeau]");
    if (info.project.name === "telephone") await expect(moi).toHaveText("Toi : Musiciens. Tes dates sont dans « Mes services ».");
    else await expect(moi).toHaveText("Toi dans le Groupe Paix : Musiciens. Tu reçois les notifications du groupe ; tes dates sont dans « Mes services ».");
    await expect(moi.getByRole("link", { name: "« Mes services »" })).toHaveAttribute("href", /\/mes-services/);
    await expect(carte(page, "r-mus").locator("[data-moi]")).toContainText("Joël F.");
    await expect(carte(page, "r-mus")).toContainText("2 sur 3 places");
    await expect(carte(page, "r-mus")).toContainText("Place libre");
    await expect(carte(page, "r-acc")).toContainText("Place libre");
    await expect(page.getByRole("button", { name: /^Modifier le rôle/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nommer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ajouter un titulaire" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nouveau rôle" })).toHaveCount(0);
  });

  test("sans rôle : « Toi dans le Groupe Paix. Tu reçois les notifications du groupe. »", async ({ page }) => {
    await ouvrir(page, LUC);
    await expect(page.locator("[data-moi-bandeau]")).toHaveText("Toi dans le Groupe Paix. Tu reçois les notifications du groupe.");
    await expect(page.locator("[data-moi]")).toHaveCount(0);
  });

  test("sans groupe : l'église, avec le sélecteur et Équipes · Musiciens ; choisir Bonté lit Bonté, sans bandeau « Toi »", async ({ page }) => {
    await ouvrir(page, YANN);
    await expect(page.getByTestId("bandeau-equipes")).toBeVisible();
    await expect(selecteur(page).getByRole("button", { name: "Église" })).toHaveAttribute("aria-pressed", "true");
    await selecteur(page).getByRole("button", { name: "Bonté" }).click();
    await expect(page).toHaveURL(/\/equipes\/?\?groupe=bonte$/);
    await expect(carte(page, "b-acc")).toContainText("Marc A.");
    await expect(page.locator("[data-moi-bandeau]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Modifier le rôle/ })).toHaveCount(0);
  });

  test("un clic sur une carte ouvre la fiche en lecture ; « Ouvrir le planning » mène à l'App", async ({ page }) => {
    await ouvrir(page, JOEL);
    await carte(page, "r-mus").click();
    const fiche = page.getByRole("dialog");
    await expect(fiche).toContainText("Titulaires");
    await expect(fiche).toContainText("Droits du rôle");
    await expect(fiche.getByRole("button", { name: "Modifier" })).toHaveCount(0);
    await expect(fiche.getByRole("button", { name: /Actions pour/ })).toHaveCount(0);
    await expect(fiche.getByRole("link", { name: "Ouvrir le planning" })).toHaveAttribute("href", /^\/planning\/groupes/);
  });

  test("un président et un admin lisent aussi sans rien pouvoir modifier dans l'App", async ({ page, browser }) => {
    await ouvrir(page, RUTH);
    await expect(page.locator("[data-role]").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Modifier le rôle/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nommer" })).toHaveCount(0);
    const admin = await (await browser.newContext()).newPage();
    await ouvrir(admin, ADMIN);
    await expect(admin.locator("[data-role]").first()).toBeVisible();
    await expect(admin.getByRole("button", { name: /^Modifier le rôle/ })).toHaveCount(0);
    await expect(admin.getByRole("button", { name: "Nommer" })).toHaveCount(0);
    await expect(admin.getByRole("button", { name: "Nouveau rôle" })).toHaveCount(0);
  });

  test("中文 : sélecteur, sous-titre et bandeau « Toi » traduits", async ({ page }) => {
    await ouvrir(page, JOEL, "/equipes", true);
    await expect(page.getByRole("group", { name: "组织架构", exact: true })).toBeVisible();
    await expect(page.locator("header[data-entete-page]")).toContainText("教会及各团契的组织架构");
    await expect(page.locator("[data-moi-bandeau]")).toContainText("你");
    await expect(page.locator("[data-moi-bandeau]")).toContainText("我的服事");
  });
});

test.describe("OG-F · « Choisir » relié aux rôles", () => {
  const compte = (uid: string, prenom: string, nom: string, o: Partial<FakeProfile> = {}): FakeProfile =>
    ({ uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`, serviceRoles: {}, ...o });
  const RUTH = compte("ruth", "Ruth", "K.", { groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix"], referentDe: ["comite-paix"], dansEquipes: ["comite-paix"] });
  const COMPTES: FakeProfile[] = [
    RUTH, compte("joel", "Joël", "F.", { groupe: "paix" }), compte("hugo", "Hugo", "L.", { groupe: "paix" }),
    compte("sam", "Sam", "R.", { groupe: "paix" }), compte("lea", "Léa", "M.", { groupe: "paix" }),
    compte("zoe", "Zoé", "Q.", { groupe: "bonte" }),
  ];
  const GROUPE: OrganigrammeGroupe = {
    id: "paix", president: t("Ruth K.", "ruth"), vp: [t("Léa M.", "lea")],
    roles: [
      role("r-mus", "Musiciens", { nomZh: "司琴", colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Hugo L.", "hugo"), t("Ma Lin")] }),
      role("r-plan", "Planning", { titulaires: [t("Sam R.", "sam")] }),
    ],
    updatedAt: "", parUid: "", parNom: "",
  };
  // Joël joue les 10 et 24/1 ; la case du 17/1 est vide.
  const DOCS = (groupe: boolean = true) => ({
    ...Object.fromEntries(COMPTES.map(({ uid, ...p }) => [`users/${uid}`, p as Record<string, unknown>])),
    ...(groupe ? { "groupes/paix": docGroupe(GROUPE) } : {}),
    "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", musiciens: "Joël F.", orateur: "Eva N." },
    "plannings/paix/dimanches/2027-01-24": { date: "2027-01-24", musiciens: "Joël F." },
  });
  async function ouvrir(page: Page, d = DOCS()) {
    await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db = await signInAs(page, RUTH, d, "/back-office/planning/groupes");
    await page.getByRole("tab", { name: "2027", exact: true }).click();
    await expect(page.locator("[data-date-cell='2027-01-17'], [data-date-carte='2027-01-17']").filter({ visible: true })).toHaveCount(1);
    return db;
  }
  const laCase = (page: Page, date: string, colonne: string) => page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });
  const choisir = (page: Page, date: string, colonne: string) => laCase(page, date, colonne).getByRole("button").first().click();
  const liste = (page: Page) => page.getByRole("listbox", { name: "Titulaires du rôle Musiciens" });

  test("datesCourtes : « 4 et le 11/10 » ; des mois différents se séparent ; trois dates", () => {
    expect(datesCourtes(["2026-10-11", "2026-10-04"])).toBe("4 et le 11/10");
    expect(datesCourtes(["2027-01-10"])).toBe("10/1");
    expect(datesCourtes(["2026-09-28", "2026-10-05"])).toBe("28/9 et le 5/10");
    expect(datesCourtes(["2026-10-04", "2026-10-11", "2026-10-18"])).toBe("4, le 11 et le 18/10");
    expect(datesCourtes(["2026-09-27", "2026-10-04", "2026-10-11"])).toBe("27/9, le 4 et le 11/10");
    expect(datesCourtes(["2026-10-04", "2026-10-11"], "zh-CN")).toBe("4和11/10");
  });

  test("case Musiciens : titulaires du rôle (Libre / Déjà le … / sans compte), groupe replié, « Écrire un nom sans compte… » en bas", async ({ page }) => {
    await ouvrir(page);
    await choisir(page, "2027-01-17", "musiciens");
    await expect(liste(page).getByRole("option")).toHaveText([/^Joël F\.\s*Déjà le 10 et le 24\/1$/, /^Hugo L\.\s*Libre$/, /^Ma Lin\s*sans compte\s*Libre$/]);
    const bascule = page.getByRole("button", { name: /^Voir tout le groupe \(\d+\)$/ });
    await expect(bascule).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("option", { name: /Sam R\./ })).toHaveCount(0);
    await bascule.click();
    await expect(page.getByRole("option", { name: /Sam R\./ })).toContainText("Planning");
    await expect(page.getByRole("option", { name: /Léa M\./ })).toContainText("Vice-président");
    await expect(page.getByRole("option", { name: /Ruth K\./ })).toContainText("Président");
    // Un compte d'ailleurs : par la recherche seulement.
    await expect(page.getByRole("option", { name: /Zoé Q\./ })).toHaveCount(0);
    const boutons = await page.getByRole("button").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
    expect(boutons.findIndex((b) => b.includes("Voir tout le groupe"))).toBeLessThan(boutons.findIndex((b) => b.includes("Écrire un nom sans compte")));
  });

  test("choisir un titulaire écrit son nom de planning dans la case", async ({ page }) => {
    const db = await ouvrir(page);
    await choisir(page, "2027-01-17", "musiciens");
    await liste(page).getByRole("option", { name: /Hugo L\./ }).click();
    await expect.poll(() => db.writes.some((w) => w.path === "plannings/paix/dimanches/2027-01-17" && w.data.musiciens === "Hugo L.")).toBe(true);
  });

  test("la recherche déplie le groupe et trouve, après lui, les comptes d'ailleurs", async ({ page }) => {
    await ouvrir(page);
    await choisir(page, "2027-01-17", "musiciens");
    await page.getByRole("combobox").fill("Zo");
    await expect(page.getByRole("option", { name: /Zoé Q\./ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Hugo L\./ })).toHaveCount(0);
    await page.getByRole("combobox").fill("Sam");
    await expect(page.getByRole("option", { name: /Sam R\./ })).toContainText("Planning");
  });

  test("« Remplir vers le bas » entre « Voir tout le groupe » (replié, puis déplié) et « Écrire un nom sans compte… »", async ({ page }) => {
    await ouvrir(page);
    await choisir(page, "2027-01-24", "musiciens");
    const ordre = async () => (await page.getByRole("button").evaluateAll((els) => els.map((e) => e.textContent ?? "")));
    for (const deplie of [false, true]) {
      if (deplie) await page.getByRole("button", { name: /^Voir tout le groupe/ }).click();
      const b = await ordre();
      const iGroupe = b.findIndex((x) => x.includes("Voir tout le groupe"));
      const iRemplir = b.findIndex((x) => x.includes("Remplir vers le bas"));
      const iSansCompte = b.findIndex((x) => x.includes("Écrire un nom sans compte"));
      expect(iGroupe).toBeGreaterThan(-1);
      expect(iRemplir).toBeGreaterThan(iGroupe);
      expect(iRemplir).toBeLessThan(iSansCompte);
    }
  });

  test("colonne non reliée, ou aucun organigramme : « Choisir » d'avant", async ({ page, browser }) => {
    await ouvrir(page);
    await choisir(page, "2027-01-17", "orateur");
    await expect(page.getByText("Titulaires du rôle")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Voir tout le groupe/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Écrire un nom sans compte/ })).toBeVisible();
    const autre = await (await browser.newContext()).newPage();
    await ouvrir(autre, DOCS(false));
    await choisir(autre, "2027-01-17", "musiciens");
    await expect(autre.getByText("Titulaires du rôle")).toHaveCount(0);
    await expect(autre.getByRole("option", { name: /Hugo L\./ })).toBeVisible();
  });

  test("un titulaire placé chaque dimanche : la ligne « Déjà le … » ne fait pas déborder le menu", async ({ page }) => {
    const dimanches = ["03", "10", "17", "24", "31"].map((j) => `2027-01-${j}`).concat(["07", "14", "21", "28"].map((j) => `2027-02-${j}`), ["07", "14", "21", "28"].map((j) => `2027-03-${j}`));
    const d = { ...DOCS(), ...Object.fromEntries(dimanches.map((j) => [`plannings/paix/dimanches/${j}`, { date: j, musiciens: "Joël F." }])) };
    await ouvrir(page, d);
    await page.locator('[data-case="2027-01-17|musiciens"]').filter({ visible: true }).getByRole("button").first().click();
    const option = liste(page).getByRole("option", { name: /Joël F\./ });
    await expect(option).toContainText("Déjà le");
    const sw = await option.evaluate((e) => { const c = e.closest("div.overflow-y-auto") as HTMLElement; return c.scrollWidth - c.clientWidth; });
    expect(sw, "le conteneur qui défile ne déborde pas en largeur").toBeLessThanOrEqual(1);
  });

  test("l'en-tête d'une colonne reliée porte l'icône de lien (Back-Office, hors téléphone)", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "le tableau n'existe pas sur téléphone (cartes)");
    await ouvrir(page);
    const tete = page.getByTestId("grille-colonnes").filter({ visible: true });
    await expect(tete.getByRole("img", { name: "Reliée au rôle Musiciens" })).toBeVisible();
    await expect(tete.getByRole("img", { name: /^Reliée au rôle/ })).toHaveCount(1);
  });
});

test.describe("OG-G · couleurs d'Amour et de Joie (décision 47, OG36)", () => {
  test("Groupe Amour fuchsia, Groupe Joie sarcelle ; les dix couleurs gelées ne changent pas", () => {
    expect(categoryColor("Groupe Amour")).toBe("#a21caf");
    expect(categoryColor("Groupe Joie")).toBe("#0f766e");
    const gelees: Record<string, string> = {
      "Culte Francophone": "#2d5a65", "Intergroupe": "#a87b0f", "Interfranco": "#9d3c63", "Campus": "#2471a3",
      "Groupe Paix": "#6b4a8e", "Groupe Fidélité": "#a03030", "Groupe Bonté": "#8b4a2e",
      "中班": "#3b6d11", "大班": "#3b6d11", "高班": "#3b6d11",
    };
    for (const [cat, couleur] of Object.entries(gelees)) expect(categoryColor(cat), cat).toBe(couleur);
    // Une catégorie inconnue reste grise.
    expect(categoryColor("Groupe Inconnu")).toBe("#64748b");
  });

  test("les couleurs des plannings sont intactes", () => {
    expect(PLANNING_COLORS).toEqual({
      culte: "#2d5a65", table: "#c87941", edd: "#3b6d11", campus: "#2471a3", intergroupe: "#a87b0f",
      interfranco: "#9d3c63", paix: "#6b4a8e", fidelite: "#a03030", bonte: "#8b4a2e", scene: "#3f51a3",
    });
  });
});
