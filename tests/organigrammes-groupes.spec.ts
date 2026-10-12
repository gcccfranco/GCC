import { expect, test } from "@playwright/test";
import { GROUPES } from "../src/types/user";
import type { OrganigrammeGroupe, RoleGroupe } from "../src/types/groupe";
import {
  COMITES, MAX_VP_BORNE, MAX_VP_DEFAUT, TABLE_GROUPES, estGroupeId, groupeDef, groupeDeLaCategorie,
} from "../src/lib/groupes/table";
import {
  changerPlafondVp, colonnesProposees, colonnesReliables, estDuGroupe, groupeDe, lireChampsGroupe,
  lireGroupe, membresComite, placesVp, placesVpLibres, recopieDeGroupe, relierACompte, roleDeColonne,
} from "../src/lib/groupes/organigramme";
import { propositions, propositionsReliees, type CompteDuPlanning } from "../src/lib/planning/choisir";
import { GRILLE_BONTE, GRILLE_CULTE, GRILLE_PAIX } from "../src/lib/planning/grilles";

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
