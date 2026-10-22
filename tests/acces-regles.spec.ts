import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lireGroupe } from "../src/lib/groupes/organigramme";
import { TABLE_GROUPES } from "../src/lib/groupes/table";
import { rattachementDe } from "../src/lib/equipes/organigramme";
import {
  exigerDroitEquipes, lireEquipes, lireGroupes, recalculerDepuisOrganigramme, recalculerRattachement, recopieDuCompte,
} from "../src/lib/equipes/serveur";
import {
  estDeLAudienceOrganigramme, uidsDeLAudienceOrganigramme, uidsDesAudiences, uidsDuGroupe, uidsForCategories, uidsForCategory,
} from "../src/lib/push/recipients";
import { canRetirerDate, colonnesModifiables } from "../src/lib/access";
import { audiencesNotifiables, peutNotifierAudience } from "../src/lib/push/audiences";
import { ADMIN_EMAIL } from "./helpers/fakeSession";

// Lot AO, tranche AO-C (docs/spec-acces-organigramme.md, « Règles : ancien ∪ nouveau ») : le serveur et les règles.
// Sans page. Les règles Firestore ne tournent pas ici (pas d'émulateur) : on lit le texte de firestore.rules, une
// condition par test, et surtout que chaque ANCIENNE condition y est toujours (le site en ligne, sur `main`, tourne
// dans l'ancien mode). La recopie, les audiences et le droit serveur se testent sur une base simulée. Prénoms fictifs.

const ROOT = path.resolve(__dirname, "..");
const regles = readFileSync(path.join(ROOT, "firestore.rules"), "utf8");

/** Le corps d'une `function nom(...) { … }` des règles (accolades appariées). */
function fonction(nom: string): string {
  const debut = regles.indexOf(`function ${nom}(`);
  expect(debut, `function ${nom} absente de firestore.rules`).toBeGreaterThan(-1);
  const ouvrante = regles.indexOf("{", debut);
  let profondeur = 0;
  for (let i = ouvrante; i < regles.length; i++) {
    if (regles[i] === "{") profondeur++;
    if (regles[i] === "}" && --profondeur === 0) return regles.slice(debut, i + 1);
  }
  throw new Error(`function ${nom} non fermée`);
}

/** Un bloc `match …{ … }` des règles, du `match` jusqu'à son accolade fermante. */
function bloc(debut: string): string {
  const i = regles.indexOf(debut);
  expect(i, `${debut} absent de firestore.rules`).toBeGreaterThan(-1);
  const ouvrante = regles.indexOf("{", i + debut.length - 1);
  let profondeur = 0;
  for (let k = ouvrante; k < regles.length; k++) {
    if (regles[k] === "{") profondeur++;
    if (regles[k] === "}" && --profondeur === 0) return regles.slice(i, k + 1);
  }
  throw new Error(`${debut} non fermé`);
}

const sansEspaces = (t: string) => t.replace(/\s+/g, " ");

test.describe("les règles : lot AO, ancien ∪ nouveau", () => {
  test("les règles : la phrase du lot, en tête du fichier", () => {
    const tete = regles.slice(0, regles.indexOf("service cloud.firestore"));
    expect(tete).toContain("Lot AO : ancien ∪ nouveau, compatible avec le code en ligne ; à publier à la main par Timothée");
  });

  test("les règles : users create refuse les champs de l'organigramme, pas serviceRoles", () => {
    const create = bloc("match /users/{uid}");
    const corps = create.slice(create.indexOf("allow create"), create.indexOf("allow update"));
    for (const champ of ["sousEquipes", "referentSous", "lieuxLouange", "lieuxRegie", "joue"]) {
      expect(corps, champ).toContain(`request.resource.data.get('${champ}', []) == []`);
    }
    // Les anciennes refus restent.
    for (const champ of ["annonces", "notify", "plannings", "dansEquipes", "referentDe", "remplitParRole", "publieParRole", "notifieParRole"]) {
      expect(corps, champ).toContain(`request.resource.data.get('${champ}', []) == []`);
    }
    expect(corps).toContain("get('coordination', false) == false");
    expect(corps).toContain("get('equipes', false) == false");
    expect(corps).toContain("get('groupe', null) == null");
    // L'inscription en ligne écrit encore serviceRoles.
    expect(corps).not.toMatch(/get\('serviceRoles'/);
  });

  test("les règles : isCoordination = case cochée ∪ référent Louange ou EDD ∪ Orga", () => {
    const f = sansEspaces(fonction("isCoordination"));
    expect(f).toContain("profile().get('coordination', false) == true");
    expect(f).toContain("'louange' in profile().get('referentDe', [])");
    expect(f).toContain("'edd' in profile().get('referentDe', [])");
    expect(f).toContain("'orga' in profile().get('dansEquipes', [])");
    expect(f).toContain("isAdmin()");
    // Ni le référent Régie, ni un référent de sous-équipe.
    expect(f).not.toContain("'regie'");
    expect(f).not.toContain("referentSous");
  });

  test("les règles : equipes/{id} = droit Équipes ∪ Orga ∪ référent de l'équipe ∪ référent de sous-équipe pour Louange", () => {
    const equipier = sansEspaces(fonction("isEquipier"));
    expect(equipier).toContain("profile().get('equipes', false) == true");
    expect(equipier).toContain("'orga' in profile().get('dansEquipes', [])");
    const ecrire = sansEspaces(fonction("peutEcrireEquipe"));
    expect(ecrire).toContain("id in profile().get('referentDe', [])");
    expect(ecrire).toContain("id == 'louange' && profile().get('referentSous', []).size() > 0");
    const match = sansEspaces(bloc("match /equipes/{id}"));
    expect(match).toContain("allow create, update, delete: if signedIn() && (isEquipier() || peutEcrireEquipe(id))");
    // Le choix de confiance est dit dans le fichier.
    expect(regles).toContain("la limite « sa sous-équipe seulement » est côté navigateur");
  });

  test("les règles : peutEcrirePlanning = anciens droits ∪ référent Louange (culte) ∪ référent EDD ∪ Orga (Table)", () => {
    const f = sansEspaces(fonction("peutEcrirePlanning"));
    expect(f).toContain("key in profile().get('plannings', [])");
    expect(f).toContain("key in profile().get('remplitParRole', [])");
    expect(f).toContain("'louange' in profile().get('referentDe', []) && key in ['culte', 'intergroupe', 'interfranco', 'campusMatin', 'campusSoir']");
    expect(f).toContain("'edd' in profile().get('referentDe', []) && key in ['eddZhongban', 'eddDaban', 'eddGaoban']");
    expect(f).toContain("key == 'table' && 'orga' in profile().get('dansEquipes', [])");
    expect(f).toContain("isAdmin()");
    // Ni la Régie (condition à part) ni un référent de sous-équipe (E2).
    expect(f).not.toContain("'regie'");
    expect(f).not.toContain("referentSous");
  });

  test("les règles : le référent Régie n'écrit que Sono, Sono Live, PPT et les champs d'une case, sans supprimer", () => {
    const regie = sansEspaces(fonction("peutEcrireLaRegie"));
    expect(regie).toContain("'regie' in profile().get('referentDe', [])");
    expect(regie).toContain("key in ['culte', 'intergroupe', 'interfranco', 'campusMatin', 'campusSoir']");
    const diff = sansEspaces(fonction("seulementColonnesRegie"));
    expect(diff).toContain("request.resource.data.diff(resource == null ? {} : resource.data).affectedKeys()");
    expect(diff).toContain(".hasOnly(['date', 'modifieLe', 'modifiePar', 'sono', 'sonoLive', 'ppt'])");

    const plannings = bloc("match /plannings/{key}");
    const dimanches = sansEspaces(plannings.slice(plannings.indexOf("match /dimanches/{date}"), plannings.indexOf("match /history/{entryId}")));
    expect(dimanches).toContain("allow create, update: if (peutEcrirePlanning(key) || (peutEcrireLaRegie(key) && seulementColonnesRegie())) && request.resource.data.date == date");
    // Le retrait d'une date n'est pas ouvert au référent Régie : peutEcrirePlanning seul, sur les quatre plannings à dates choisies.
    expect(dimanches).toContain("allow delete: if peutEcrirePlanning(key) && key in ['interfranco', 'intergroupe', 'campusMatin', 'campusSoir']");
    expect(dimanches.slice(dimanches.indexOf("allow delete"))).not.toContain("peutEcrireLaRegie");
    // L'historique lui est permis sur ces plannings ; jamais de delete.
    const histo = sansEspaces(plannings.slice(plannings.indexOf("match /history/{entryId}")));
    expect(histo).toContain("allow create: if (peutEcrirePlanning(key) || peutEcrireLaRegie(key)) && request.resource.data.authorUid == request.auth.uid");
    expect(histo).toContain("allow update: if (peutEcrirePlanning(key) || peutEcrireLaRegie(key)) && resource.data.authorUid == request.auth.uid");
    expect(histo).toContain("allow delete: if false");
  });

  test("les règles : les champs qu'une case pose toujours sont ceux de planningGrille.ts", () => {
    const grille = readFileSync(path.join(ROOT, "src/lib/firebase/planningGrille.ts"), "utf8");
    const champs = grille.slice(grille.indexOf("const champs: Record<string, unknown> = {"), grille.indexOf("...valeurs,"));
    for (const c of ["date", "modifieLe", "modifiePar"]) expect(champs).toContain(c);
    const diff = fonction("seulementColonnesRegie");
    for (const c of ["date", "modifieLe", "modifiePar"]) expect(diff).toContain(`'${c}'`);
  });

  test("les règles : faitDesPlannings = plannings non vide ∪ rôle de groupe ∪ référent Louange, EDD ou Régie ∪ Orga", () => {
    const f = sansEspaces(fonction("faitDesPlannings"));
    expect(f).toContain("profile().get('plannings', []).size() > 0");
    expect(f).toContain("profile().get('remplitParRole', []).size() > 0");
    for (const e of ["louange", "edd", "regie"]) expect(f).toContain(`'${e}' in profile().get('referentDe', [])`);
    expect(f).toContain("'orga' in profile().get('dansEquipes', [])");
    expect(f).toContain("isAdmin()");
  });

  test("les règles : evenements create = coordination ∪ annonces ∪ section par l'organigramme (Louange, président et VP)", () => {
    const evenements = sansEspaces(bloc("match /evenements/{id}"));
    const create = evenements.slice(evenements.indexOf("allow create"), evenements.indexOf("allow update"));
    expect(create).toContain("isCoordination()");
    expect(create).toContain("request.resource.data.pour in profile().get('annonces', [])");
    expect(create).toContain("sectionCreeeParOrganigramme(request.resource.data.pour)");
    // Les réunions d'équipe d'avant sont toujours là.
    expect(create).toContain("estReferentDe(request.resource.data.pour.split(':')[1])");
    const section = sansEspaces(fonction("sectionCreeeParOrganigramme"));
    expect(section).toContain("pour == 'Culte Francophone' && 'louange' in profile().get('referentDe', [])");
    expect(section).toContain("pour == 'Groupe Paix' && 'comite-paix' in profile().get('referentDe', [])");
    expect(section).toContain("pour == 'Groupe Fidélité' && 'comite-fidelite' in profile().get('referentDe', [])");
    expect(section).toContain("pour == 'Groupe Bonté' && 'comite-bonte' in profile().get('referentDe', [])");
  });

  test("les règles : setlists create = privée ∪ admin ∪ catégorie ouverte, et les gardes d'avant restent", () => {
    const setlists = bloc("match /setlists/{id}");
    const create = sansEspaces(setlists.slice(setlists.indexOf("allow create"), setlists.indexOf("allow update")));
    expect(create).toContain("request.resource.data.get('ownerId', null) == request.auth.uid");
    expect(create).toContain("!('fete' in request.resource.data)");
    expect(create).toContain("!(request.resource.data.get('category', '') in ['Noël', 'Pâques'])");
    expect(create).toContain("request.resource.data.get('isPrivate', false) == true || isAdmin() || peutCreerSetlistDans(request.resource.data.get('category', ''))");
  });

  test("les règles : peutCreerSetlistDans = serviceRoles d'avant ∪ lieux de Louange ∪ groupe ∪ EDD", () => {
    const f = sansEspaces(fonction("peutCreerSetlistDans"));
    // Ancien : miroir de categoryLevel ≥ create.
    expect(f).toContain("profile().get('serviceRoles', {}).get(category, []).hasAny(['chanteur', 'musicien', 'presidence'])");
    expect(f).toContain("category in ['Groupe Paix', 'Groupe Fidélité', 'Groupe Bonté', '中班', '大班', '高班'] && category in profile().get('serviceRoles', {})");
    // Nouveau : miroir de categoriesCreables.
    expect(f).toContain("'louange' in profile().get('dansEquipes', []) && category in profile().get('lieuxLouange', [])");
    for (const [cat, id] of [["Groupe Paix", "paix"], ["Groupe Fidélité", "fidelite"], ["Groupe Bonté", "bonte"]]) {
      expect(f).toContain(`category == '${cat}' && profile().get('groupe', '') == '${id}'`);
    }
    expect(f).toContain("'edd' in profile().get('dansEquipes', []) && category in ['中班', '大班', '高班']");
    // La Régie ne crée pas.
    expect(f).not.toContain("lieuxRegie");
  });

  test("les règles : setlists update — public + catégorie ou visibilité changée = même condition", () => {
    const setlists = bloc("match /setlists/{id}");
    const update = sansEspaces(setlists.slice(setlists.indexOf("allow update"), setlists.indexOf("allow delete")));
    expect(update).toContain(
      "request.resource.data.get('isPrivate', false) == true || isAdmin() || (request.resource.data.get('category', '') == resource.data.get('category', '') && request.resource.data.get('isPrivate', false) == resource.data.get('isPrivate', false)) || peutCreerSetlistDans(request.resource.data.get('category', ''))",
    );
    // Les anciennes gardes de l'update sont toujours là.
    expect(update).toContain("canEditSetlistDoc(resource.data)");
    expect(update).toContain("hasAny(['editeurs', 'rolesPartage'])");
    expect(update).toContain("hasAny(['isPrivate'])");
    expect(update).toContain("hasAny(['supprimeeLe', 'supprimeePar'])");
  });

  test("les règles : ce qui n'est pas du lot AO n'a pas bougé (estDeLEquipe, tientGroupe, annonces, programmes)", () => {
    const estDe = sansEspaces(fonction("estDeLEquipe"));
    expect(estDe).toContain("profile().get('serviceRoles', {}).size() > 0");
    expect(estDe).toContain("profile().get('groupe', '') != ''");
    expect(sansEspaces(fonction("tientGroupe"))).toContain("('comite-' + g) in profile().get('referentDe', [])");
    expect(sansEspaces(bloc("match /annonces/{id}"))).toContain("request.resource.data.section in profile().get('annonces', [])");
    expect(sansEspaces(bloc("match /programmes/{id}"))).toContain("allow create, update, delete: if isCoordination()");
  });
});

// ─── La recopie (rattachementDe, recopieDuCompte) ────────────────────────────

const membre = (uid: string, plus: Record<string, unknown> = {}) => ({ uid, referent: false, ...plus });

test.describe("la recopie : sous-équipes, lieux, instruments", () => {
  const equipes = [
    {
      id: "louange",
      membres: [
        membre("u-aline", { sousEquipes: ["musiciens", "choristes"], lieux: ["Campus", "Culte Francophone"], joue: ["guitare", "piano"] }),
        membre("u-bruno", { sousEquipes: ["choristes"], lieux: ["Interfranco"], joue: ["batterie"] }),
        membre("u-celia", { referent: true, referentSous: ["presidence", "musiciens"], sousEquipes: ["presidence"] }),
        // Aline figure une seconde fois (autre ligne) : union.
        membre("u-aline", { sousEquipes: ["presidence"], lieux: ["Intergroupe"], joue: ["cajon"] }),
      ],
    },
    { id: "regie", membres: [membre("u-aline", { lieux: ["Interfranco"] }), membre("u-didier", { referent: true, lieux: ["Campus"] })] },
    { id: "edd", membres: [membre("u-aline", { lieux: ["Culte Francophone"], joue: ["piano"] })] },
  ];

  test("rattachementDe rend sous-équipes, référents, lieux et instruments dans l'ordre des tables, en union", () => {
    expect(rattachementDe("u-aline", equipes)).toEqual({
      dansEquipes: ["regie", "louange", "edd"],
      referentDe: [],
      sousEquipes: ["presidence", "musiciens", "choristes"],
      referentSous: [],
      lieuxLouange: ["Culte Francophone", "Intergroupe", "Campus"],
      lieuxRegie: ["Interfranco"],
      joue: ["piano", "guitare", "cajon"],
    });
  });

  test("`joue` n'est rendu que pour une personne des Musiciens ; les lieux de Régie et de Louange restent séparés", () => {
    expect(rattachementDe("u-bruno", equipes)).toMatchObject({ sousEquipes: ["choristes"], joue: [], lieuxLouange: ["Interfranco"], lieuxRegie: [] });
    expect(rattachementDe("u-didier", equipes)).toMatchObject({ dansEquipes: ["regie"], referentDe: ["regie"], lieuxRegie: ["Campus"], lieuxLouange: [], sousEquipes: [] });
  });

  test("référent de sous-équipe : `referentSous` seul ; le référent Louange est `referentDe` ∋ louange", () => {
    expect(rattachementDe("u-celia", equipes)).toMatchObject({ referentDe: ["louange"], referentSous: ["presidence", "musiciens"], sousEquipes: ["presidence"] });
  });

  test("un nom sans compte ou un inconnu n'a rien", () => {
    const vide = { dansEquipes: [], referentDe: [], sousEquipes: [], referentSous: [], lieuxLouange: [], lieuxRegie: [], joue: [] };
    expect(rattachementDe("", equipes)).toEqual(vide);
    expect(rattachementDe("u-inconnu", equipes)).toEqual(vide);
  });

  test("recopieDuCompte pose les cinq nouvelles listes à côté des anciennes", () => {
    const groupes = TABLE_GROUPES.map((g) => lireGroupe(g.id, undefined));
    const { listes } = recopieDuCompte("u-aline", {}, equipes.map((e) => ({ ...e, membres: e.membres.map((m) => ({ nom: "", mention: "", essai: false, groupe: "", ...m })) })), groupes);
    expect(listes.sousEquipes).toEqual(["presidence", "musiciens", "choristes"]);
    expect(listes.lieuxRegie).toEqual(["Interfranco"]);
    expect(listes.dansEquipes).toEqual(["regie", "louange", "edd"]);
    expect(listes.remplitParRole).toEqual([]);
  });
});

// ─── Base simulée ────────────────────────────────────────────────────────────

type Doc = Record<string, unknown>;
function fausseBase(users: Record<string, Doc>, equipes: Record<string, Doc> = {}) {
  const collections: Record<string, Record<string, Doc>> = { users, equipes, groupes: {} };
  const ecrits: { chemin: string; data: Doc }[] = [];
  const docs = (m: Record<string, Doc>) => Object.entries(m).map(([id, d]) => ({ id, data: () => d }));
  const db = {
    collection: (nom: string) => ({
      get: async () => ({ docs: docs(collections[nom] ?? {}) }),
      doc: (id: string) => ({
        get: async () => ({ exists: id in (collections[nom] ?? {}), data: () => collections[nom]?.[id] }),
        update: async (data: Doc) => { ecrits.push({ chemin: `${nom}/${id}`, data }); collections[nom][id] = { ...collections[nom][id], ...data }; },
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
  return { db, ecrits, users };
}

const equipeLouange = {
  membres: [
    { nom: "Aline", uid: "u-aline", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["musiciens"], lieux: ["Campus"], joue: ["piano"] },
    { nom: "Bruno", uid: "u-bruno", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["choristes"], lieux: ["Culte Francophone"] },
  ],
};

test.describe("le serveur : recopie, droit de tenir l'organigramme, audiences (base simulée)", () => {
  test("recalculerRattachement pose les champs de l'organigramme, les efface quand la personne n'y est plus, n'écrit rien de plus", async () => {
    const { db, ecrits, users } = fausseBase(
      { "u-aline": { firstName: "Aline" }, "u-bruno": { sousEquipes: ["musiciens"], lieuxLouange: ["Campus"], joue: ["piano"], dansEquipes: ["louange"] }, "u-eva": {} },
      { louange: equipeLouange },
    );
    // Bruno est maintenant Choriste à Franco : musiciens/Campus/piano disparaissent, choristes/Franco arrivent.
    const r = await recalculerRattachement(db, ["u-aline", "u-bruno", "u-eva"], await lireEquipes(db), await lireGroupes(db));
    expect(r.maj).toBe(2);
    expect(users["u-aline"]).toMatchObject({ dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Campus"], joue: ["piano"] });
    expect(users["u-bruno"]).toMatchObject({ sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone"], joue: [] });
    expect(ecrits.map((e) => e.chemin).sort()).toEqual(["users/u-aline", "users/u-bruno"]);
    // Un second passage ne réécrit rien.
    ecrits.length = 0;
    expect((await recalculerRattachement(db, ["u-aline", "u-bruno"], await lireEquipes(db), await lireGroupes(db))).maj).toBe(0);
    expect(ecrits).toEqual([]);
  });

  test("recalculerDepuisOrganigramme reprend un profil qui porte encore un lieu ou un instrument sans être cité", async () => {
    const { db, users } = fausseBase(
      { "u-ghost": { lieuxRegie: ["Campus"], joue: ["piano"], sousEquipes: ["musiciens"] }, "u-aline": {}, "u-propre": { dansEquipes: [] } },
      { louange: equipeLouange },
    );
    expect(await recalculerDepuisOrganigramme(db)).toBe(2);
    expect(users["u-ghost"]).toMatchObject({ lieuxRegie: [], joue: [], sousEquipes: [] });
    expect(users["u-aline"]).toMatchObject({ lieuxLouange: ["Campus"] });
  });

  test("exigerDroitEquipes : nouveau mode, quiconque tient quelque chose ; ancien mode, comme avant", async () => {
    const { db } = fausseBase({
      "u-orga": { dansEquipes: ["orga"] },
      "u-ref": { dansEquipes: ["da"], referentDe: ["da"] },
      "u-sous": { dansEquipes: ["louange"], referentSous: ["choristes"] },
      "u-case": { equipes: true },
      "u-membre": { dansEquipes: ["da"] },
      "u-rien": {},
    });
    const ok = async (uid: string, backOffice: boolean) =>
      exigerDroitEquipes({ uid, email: `${uid}@example.com` }, db, backOffice).then(() => true, (e: { status?: number }) => (e.status === 403 ? false : Promise.reject(e)));
    for (const uid of ["u-orga", "u-ref", "u-sous"]) expect(await ok(uid, true), `${uid} nouveau`).toBe(true);
    for (const uid of ["u-membre", "u-rien", "u-case"]) expect(await ok(uid, true), `${uid} nouveau`).toBe(false);
    // Ancien mode : la case Équipes, et rien d'autre.
    expect(await ok("u-case", false)).toBe(true);
    for (const uid of ["u-orga", "u-ref", "u-sous", "u-membre", "u-rien"]) expect(await ok(uid, false), `${uid} ancien`).toBe(false);
    // Un admin passe dans les deux modes ; sans compte, 401.
    for (const bo of [true, false]) await exigerDroitEquipes({ uid: "x", email: ADMIN_EMAIL }, db, bo);
    await expect(exigerDroitEquipes(null, db, true)).rejects.toMatchObject({ status: 401 });
  });

  test("audiences `equipe:<id>` et `louange:<s>` : résolues depuis dansEquipes et sousEquipes", async () => {
    const { db } = fausseBase({
      "u-aline": { dansEquipes: ["louange"], sousEquipes: ["musiciens"] },
      "u-bruno": { dansEquipes: ["louange"], sousEquipes: ["choristes"] },
      "u-didier": { dansEquipes: ["regie"] },
      "u-eva": {},
    });
    expect((await uidsDeLAudienceOrganigramme("equipe:louange", db)).sort()).toEqual(["u-aline", "u-bruno"]);
    expect(await uidsDeLAudienceOrganigramme("equipe:regie", db)).toEqual(["u-didier"]);
    expect(await uidsDeLAudienceOrganigramme("louange:choristes", db)).toEqual(["u-bruno"]);
    expect(await uidsDeLAudienceOrganigramme("louange:presidence", db)).toEqual([]);
    // Une autre audience n'est pas de l'organigramme.
    expect(await uidsDeLAudienceOrganigramme("Campus", db)).toEqual([]);
    expect(estDeLAudienceOrganigramme({ dansEquipes: ["louange"] }, "*")).toBe(false);
  });

  test("« qui sert dans une catégorie » : nouveau mode = organigramme, ancien = serviceRoles", async () => {
    const { db } = fausseBase({
      "u-aline": { dansEquipes: ["louange"], lieuxLouange: ["Campus"] },
      "u-didier": { dansEquipes: ["regie"], lieuxRegie: ["Campus"] },
      "u-fred": { serviceRoles: { Campus: ["chanteur"] } },
      "u-gina": { groupe: "paix" },
      "u-hugo": { dansEquipes: ["edd"] },
    });
    const tri = (l: Iterable<string>) => [...l].sort();
    expect(tri(await uidsForCategory("Campus", db, true))).toEqual(["u-aline", "u-didier"]);
    expect(tri(await uidsForCategory("Campus", db, false))).toEqual(["u-fred"]);
    expect(tri(await uidsForCategory("Groupe Paix", db, true))).toEqual(["u-gina"]);
    expect(tri(await uidsForCategory("中班", db, true))).toEqual(["u-hugo"]);
    expect(tri(await uidsForCategories(["Campus", "Groupe Paix"], db, true))).toEqual(["u-aline", "u-didier", "u-gina"]);
    expect(tri(await uidsForCategories(["Campus"], db, false))).toEqual(["u-fred"]);
    expect(tri(await uidsForCategories([], db, true))).toEqual([]);
    // Personnes précises : les catégories de l'organigramme et ses audiences d'équipe.
    expect(tri(await uidsDesAudiences(["Campus", "equipe:edd"], db, true))).toEqual(["u-aline", "u-didier", "u-hugo"]);
    expect(tri(await uidsDesAudiences(["equipe:edd"], db, false))).toEqual([]);
    // Notifier une catégorie : l'ancien (serviceRoles) reste, le nouveau s'ajoute.
    expect(tri(await uidsDuGroupe("Campus", db, true))).toEqual(["u-aline", "u-didier", "u-fred"]);
    expect(tri(await uidsDuGroupe("Campus", db, false))).toEqual(["u-fred"]);
  });

  test("notifier : un référent de sous-équipe n'atteint que sa sous-équipe ; en ligne (ancien mode) les audiences d'équipe sont refusées", () => {
    const sous = { dansEquipes: ["louange"], referentSous: ["choristes"] };
    expect(audiencesNotifiables(sous, true)).toEqual(["louange:choristes"]);
    expect(peutNotifierAudience("louange:choristes", false, sous, true)).toBe(true);
    expect(peutNotifierAudience("louange:musiciens", false, sous, true)).toBe(false);
    expect(peutNotifierAudience("equipe:louange", false, sous, true)).toBe(false);
    // Ancien mode : audience d'équipe invalide, quelles que soient les cases.
    expect(peutNotifierAudience("equipe:louange", false, { notify: ["*"] }, false)).toBe(false);
    expect(peutNotifierAudience("Campus", false, { notify: ["Campus"] }, false)).toBe(true);
  });
});

// ─── Retirer une date ────────────────────────────────────────────────────────

test.describe("canRetirerDate : toutes les colonnes", () => {
  const user = { email: "regie@example.com" };
  test("le référent Régie remplit ses colonnes mais ne retire pas une date ; le référent Louange, si", () => {
    const regie = { referentDe: ["regie"], dansEquipes: ["regie"] };
    const louange = { referentDe: ["louange"], dansEquipes: ["louange"] };
    expect(colonnesModifiables(user, regie, "interfranco", true)).toEqual(["sono", "sonoLive", "ppt"]);
    expect(canRetirerDate(user, regie, "interfranco", true)).toBe(false);
    expect(canRetirerDate(user, louange, "interfranco", true)).toBe(true);
    // Hors des plannings à dates choisies : jamais.
    expect(canRetirerDate(user, louange, "culte", true)).toBe(false);
  });

  test("ancien mode : qui remplit le planning retire, comme avant", () => {
    expect(canRetirerDate(user, { plannings: ["campusMatin"] }, "campusMatin", false)).toBe(true);
    expect(canRetirerDate(user, { plannings: ["campusMatin"] }, "campusSoir", false)).toBe(false);
    expect(canRetirerDate(user, {}, "campusMatin", false)).toBe(false);
  });
});
