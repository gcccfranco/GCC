import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./helpers/fakeSession";
import {
  POLE_VERS_EQUIPE, appliquer, enLectureSeule, formaterReleve, planifier, type Donnees, type Magasin,
} from "../src/lib/equipes/migration";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-E : la
// migration des pôles vers les équipes et le relevé qui la précède (décisions 7, 8, 40, 41).
// Tout est pur : une base Firestore simulée en mémoire, aucune lecture de la vraie base. Le script
// (scripts/poles-vers-equipes.ts) n'est lancé que par Timothée. Noms fictifs.

/** Base simulée en mémoire : chemin complet -> document, comme Firestore (Admin SDK). */
function magasinMemoire(depart: Record<string, Donnees>) {
  const docs = new Map<string, Donnees>(Object.entries(depart).map(([k, v]) => [k, structuredClone(v)]));
  const ecritures: string[] = [];
  const enfants = (collection: string) =>
    [...docs.keys()].filter((p) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"));
  const magasin: Magasin = {
    lire: async (chemin) => (docs.has(chemin) ? structuredClone(docs.get(chemin)!) : null),
    lister: async (collection) => enfants(collection).map((p) => ({ id: p.split("/").pop()!, data: structuredClone(docs.get(p)!) })),
    // Comme `listDocuments` : aussi les documents « fantômes » (sans document propre, seulement des sous-collections).
    listerIds: async (collection) => [...new Set([...docs.keys()].filter((p) => p.startsWith(`${collection}/`)).map((p) => p.slice(collection.length + 1).split("/")[0]))],
    ecrire: async (chemin, data) => { ecritures.push(`ecrire ${chemin}`); docs.set(chemin, structuredClone(data)); },
    maj: async (chemin, data, supprimer = []) => {
      ecritures.push(`maj ${chemin}`);
      const doc = docs.get(chemin);
      if (!doc) throw new Error(`maj d'un document absent : ${chemin}`);
      const apres = { ...doc, ...structuredClone(data) };
      for (const champ of supprimer) delete apres[champ];
      docs.set(chemin, apres);
    },
    supprimer: async (chemin) => { ecritures.push(`supprimer ${chemin}`); docs.delete(chemin); },
  };
  return { magasin, docs, ecritures };
}

const membre = (uid: string, nom: string, referent = false) => ({ nom, uid, mention: "", referent, essai: false, groupe: "" });
const tache = (pole: string, over: Donnees = {}): Donnees => ({
  pole, titre: "Tâche", responsableUid: null, responsableNom: "", echeance: "2026-10-11", repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "u-lea", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const profilBase = { firstName: "", lastName: "", annonces: [], notify: [], plannings: [], equipes: false, serviceRoles: {} };

/** L'organigramme et les comptes d'avant la migration (pôles encore posés). */
function depart(): Record<string, Donnees> {
  return {
    // Équipes : le pôle que chacune donnait, tel que stocké (équipes.pole).
    "equipes/orga": { pole: "orga", membres: [membre("u-lea", "Léa M.", true)] },
    "equipes/comite-franco": { pole: "orga", membres: [membre("u-nina", "Nina K.")] },
    "equipes/da": { pole: "da", membres: [membre("u-hugo", "Hugo L.", true)] },
    "equipes/decoration": { pole: "da", membres: [membre("u-nina", "Nina K.")] },
    "equipes/medias": { pole: "media", membres: [membre("u-joel", "Joël F.")] },
    "equipes/evenementiel": { pole: "evenement", membres: [membre("u-eloi", "Éloi B.", true)] },
    "equipes/accueil-j1": { pole: "evenement", membres: [membre("u-remi", "Rémi A.")] },
    "equipes/louange": { pole: null, membres: [membre("u-ines", "Inès P.", true)] },
    "equipes/regie": { membres: [] },
    // Comptes. `dansEquipes` / `referentDe` : justes, sauf Léa, Nina et Rémi (profils d'avant R4).
    "users/u-lea": { ...profilBase, email: "lea@example.com", firstName: "Léa", lastName: "M.", poles: ["orga"] },
    "users/u-hugo": { ...profilBase, email: "hugo@example.com", firstName: "Hugo", lastName: "L.", poles: ["da"], dansEquipes: ["da"], referentDe: ["da"] },
    "users/u-joel": { ...profilBase, email: "joel@example.com", firstName: "Joël", lastName: "F.", poles: ["media"], dansEquipes: ["medias"], referentDe: [] },
    "users/u-nina": { ...profilBase, email: "nina@example.com", firstName: "Nina", lastName: "K.", poles: ["orga", "da"] },
    "users/u-eloi": { ...profilBase, email: "eloi@example.com", firstName: "Éloi", lastName: "B.", poles: ["evenement"], dansEquipes: ["evenementiel"], referentDe: ["evenementiel"] },
    "users/u-remi": { ...profilBase, email: "remi@example.com", firstName: "Rémi", lastName: "A.", poles: ["evenement"] },
    // Un pôle coché à la main, sans équipe, mais un droit de planning : il garde son Back-Office.
    "users/u-yann": { ...profilBase, email: "yann@example.com", firstName: "Yann", lastName: "C.", poles: ["da"], plannings: ["fidelite"], dansEquipes: [], referentDe: [] },
    "users/u-ines": { ...profilBase, email: "ines@example.com", firstName: "Inès", lastName: "P.", poles: [], dansEquipes: ["louange"], referentDe: ["louange"] },
    "users/u-maelle": { ...profilBase, email: "maelle@example.com", firstName: "Maëlle", lastName: "T.", serviceRoles: { "Culte Francophone": ["chanteur"] }, dansEquipes: [], referentDe: [] },
    // Un admin : il ne perd rien, il n'est ni dans « pertes » ni dans « coordination d'avant ».
    "users/uid-admin": { ...profilBase, email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", poles: ["evenement"], dansEquipes: [], referentDe: [] },
    // Tâches par pôle, avec leurs fois.
    "poles/media/taches/photos": tache("media", { titre: "Photos du culte", responsableUid: "u-joel", responsableNom: "Joël F.", prevenir: { pole: "da" } }),
    "poles/media/taches/photos/fois/2026-10-11": { date: "2026-10-11", parUid: "u-joel", parNom: "Joël F.", le: "2026-10-11T12:00:00Z", etat: "terminee", debutLe: "2026-10-10T08:00:00Z" },
    "poles/media/taches/photos/fois/2026-10-18": { date: "2026-10-18", parUid: "u-joel", parNom: "Joël F.", le: "2026-10-18T09:00:00Z", etat: "encours", debutLe: "2026-10-18T09:00:00Z" },
    "poles/media/taches/regie": tache("media", { titre: "Ranger la régie" }),
    "poles/evenement/taches/salle": tache("evenement", { titre: "Plan de salle", responsableUid: "u-remi", responsableNom: "Rémi A.", prevenir: { regie: "Culte Francophone" } }),
    "poles/louange/taches/chants": tache("louange", { titre: "Choisir les chants", auteurUid: "u-ines" }),
    "poles/louange/taches/chants/fois/2026-10-11": { date: "2026-10-11", parUid: "u-ines", parNom: "Inès P.", le: "2026-10-11T12:00:00Z", etat: "terminee", debutLe: "" },
    "poles/da/taches/affiche": tache("da", { titre: "Affiche de Noël", responsableUid: "u-hugo", responsableNom: "Hugo L." }),
    "poles/orga/taches/budget": tache("orga", { titre: "Budget", responsableUid: "u-parti", responsableNom: "Ancien membre" }),
    // Évènements : réunions et non-réunions de pôle, un évènement d'équipe déjà là, deux autres.
    "evenements/e1": { titre: "Réunion DA", pour: "pole:da", reunion: true },
    "evenements/e1/sujets/s1": { titre: "Palette", auteurUid: "u-hugo" },
    "evenements/e1/sujets/s2": { titre: "Police", auteurUid: "u-hugo", reprisDans: "e0" },
    "evenements/e2": { titre: "Sortie photo", pour: "pole:media", reunion: false },
    "evenements/e3": { titre: "Réunion Louange", pour: "pole:louange" },
    "evenements/e4": { titre: "Réunion Louange (équipe)", pour: "equipe:louange", reunion: true },
    "evenements/e5": { titre: "Noël", pour: "eglise" },
    "evenements/e6": { titre: "Mystère", pour: "pole:inconnu", reunion: true },
    // Tableaux de bord : un widget « À faire » réglé par pôles, un déjà par équipes, une barre seule.
    "backOffice/u-lea": {
      tableauDeBord: [
        { id: "afaire", taille: "m", reglages: { poles: ["media", "evenement", "louange"], nombre: 5 } },
        { id: "dimanche", taille: "s", reglages: {} },
      ],
      majLe: "2026-09-01T10:00:00Z",
    },
    "backOffice/u-hugo": { tableauDeBord: [{ id: "afaire", taille: "m", reglages: { equipes: ["da"] } }], majLe: "2026-09-01T10:00:00Z" },
    "backOffice/u-joel": { barreDuBas: ["taches"], majLe: "2026-09-01T10:00:00Z" },
    // Journal des notifications : des clés de Média et d'Événement (à recopier), d'autres qui ne bougent pas.
    "notifLog/rappel-tache-J3-media-photos-2026-10-12-u-joel": { uid: "u-joel", at: 1 },
    "notifLog/rappel-tache-encours-evenement-salle-2026-10-11-2026-10-12-u-remi": { uid: "u-remi", at: 2 },
    "notifLog/tache-fait-media-photos-2026-10-11-u-lea": { uid: "u-lea", at: 3 },
    "notifLog/tache-assigne-evenement-salle-u-remi": { uid: "u-remi", at: 4 },
    "notifLog/rappel-tache-J1-orga-budget-2026-10-12-u-lea": { uid: "u-lea", at: 5 },
    "notifLog/tache-fait-da-affiche-2026-10-11-u-hugo": { uid: "u-hugo", at: 6 },
    "notifLog/rappel-tache-J3-evenementiel-salle-2026-10-12-u-remi": { uid: "u-remi", at: 7 },
    "notifLog/evenement-e1": { at: 8 },
  };
}

// ─── La correspondance (décision 7) ──────────────────────────────────────────

test("la correspondance : DA -> da, Média -> medias, Orga -> orga, Événement -> evenementiel, Louange -> louange", () => {
  expect(POLE_VERS_EQUIPE).toEqual({ da: "da", media: "medias", orga: "orga", evenement: "evenementiel", louange: "louange" });
});

// ─── Le relevé (décisions 7, 40, 41), à blanc ────────────────────────────────

test.describe("le relevé, à blanc : rien n'est écrit", () => {
  test("liste 1 : les comptes dont un pôle est coché hors organigramme", async () => {
    const { magasin, ecritures } = magasinMemoire(depart());
    const { releve } = await planifier(magasin);
    expect(ecritures, "à blanc : aucune écriture").toEqual([]);
    expect(releve.horsOrganigramme.map((x) => [x.uid, x.poles])).toEqual([["u-yann", ["da"]], ["uid-admin", ["evenement"]]]);
  });

  test("liste 2 : qui perd un accès (pôle donné par une autre équipe que la cible), et qui perd son Back-Office complet (référents et droits gardés)", async () => {
    const { magasin } = magasinMemoire(depart());
    const { releve } = await planifier(magasin);
    const parUid = Object.fromEntries(releve.pertesDAcces.map((x) => [x.uid, x]));
    expect(Object.keys(parUid).sort()).toEqual(["u-joel", "u-nina", "u-remi", "u-yann"]);
    // Nina : COMITÉ FRANCO donnait Orga, DÉCORATION donnait DA ; elle n'est ni dans TEAM ORGA ni dans TEAM DA.
    expect(parUid["u-nina"].pertes).toEqual([
      { pole: "orga", cible: "orga", via: ["comite-franco"] },
      { pole: "da", cible: "da", via: ["decoration"] },
    ]);
    expect(parUid["u-nina"].perdBackOffice, "rien d'autre que ses pôles ne lui ouvrait le Back-Office").toBe(true);
    // Rémi : ACCUEIL J1 donnait Événement ; il n'est pas dans TEAM ÉVÉNEMENTIEL.
    expect(parUid["u-remi"].pertes).toEqual([{ pole: "evenement", cible: "evenementiel", via: ["accueil-j1"] }]);
    expect(parUid["u-remi"].perdBackOffice).toBe(true);
    // Yann : pôle coché à la main (aucune équipe ne le donnait) ; son droit de planning lui garde le Back-Office.
    expect(parUid["u-yann"].pertes).toEqual([{ pole: "da", cible: "da", via: [] }]);
    expect(parUid["u-yann"].perdBackOffice).toBe(false);
    // Joël : simple membre de TEAM MÉDIAS, il garde ses tâches, mais n'avait le Back-Office complet que par son pôle (EQ17 b).
    expect(parUid["u-joel"]).toMatchObject({ pertes: [], perdBackOffice: true });
  });

  test("liste 3 : qui avait la coordination par le pôle Événement (hors admins)", async () => {
    const { magasin } = magasinMemoire(depart());
    const { releve } = await planifier(magasin);
    expect(releve.coordinationAvant.map((x) => x.uid)).toEqual(["u-eloi", "u-remi"]);
  });

  test("liste 4 : tâches dont le responsable sera hors équipe cible ; tâches « toute l'équipe » d'une équipe sans référent", async () => {
    const { magasin } = magasinMemoire(depart());
    const { releve } = await planifier(magasin);
    expect(releve.tachesResponsableHorsEquipe.map((x) => [x.equipe, x.tacheId, x.responsableUid])).toEqual([
      ["orga", "budget", "u-parti"], // profil disparu
      ["evenementiel", "salle", "u-remi"], // ACCUEIL J1 seulement
    ]);
    // « Ranger la régie » : toute l'équipe, TEAM MÉDIAS n'a pas de référent. « Choisir les chants » : Inès P. est référente de Louange.
    expect(releve.tachesSansReferent.map((x) => [x.equipe, x.tacheId])).toEqual([["medias", "regie"]]);
  });

  test("liste 2 : sans équipe ni droit, le texte dit « plus aucune entrée » ; avec une équipe, « Tâches et Réunions seulement »", async () => {
    const { magasin } = magasinMemoire({
      ...depart(),
      "users/u-zoe": { ...profilBase, email: "zoe@example.com", firstName: "Zoé", lastName: "R.", poles: ["da"], dansEquipes: [], referentDe: [] },
    });
    const { releve } = await planifier(magasin);
    expect(releve.pertesDAcces.find((x) => x.uid === "u-zoe")).toMatchObject({ perdBackOffice: true, sansEntree: true });
    expect(releve.pertesDAcces.find((x) => x.uid === "u-joel")).toMatchObject({ perdBackOffice: true, sansEntree: false });
    const lignes = formaterReleve(releve);
    const zoe = lignes.find((x) => x.includes("(u-zoe)") && x.includes("Back-Office complet"))!;
    expect(zoe).toContain("plus aucune entrée");
    expect(zoe).not.toContain("Tâches et Réunions");
    expect(lignes.find((x) => x.includes("(u-joel)") && x.includes("Back-Office complet"))).toContain("Tâches et Réunions seulement");
  });

  test("reprise entre les étapes 6 et 7 (equipes.pole retiré, users.poles encore là) : listes 1 et 2 non recalculables, dites telles", async () => {
    const base = depart();
    for (const [chemin, d] of Object.entries(base)) if (/^equipes\/[^/]+$/.test(chemin)) delete d.pole;
    const { magasin } = magasinMemoire(base);
    const { releve } = await planifier(magasin);
    expect(releve.reprise).toBe(true);
    expect(releve.horsOrganigramme, "sans equipes.pole, tout porteur de pôle serait faussement « coché à la main »").toEqual([]);
    expect(releve.pertesDAcces).toEqual([]);
    expect(formaterReleve(releve).join("\n")).toContain("Reprise");
    // Un passage normal n'est pas une reprise.
    expect((await planifier(magasinMemoire(depart()).magasin)).releve.reprise).toBe(false);
  });

  test("pôle inconnu : poles/<inconnu>/taches et prevenir.pole inconnu sont comptés et non migrés", async () => {
    const base = depart();
    base["poles/fantome/taches/x"] = tache("fantome", { titre: "Orpheline" });
    base["poles/da/taches/affiche"] = tache("da", { titre: "Affiche de Noël", responsableUid: "u-hugo", prevenir: { pole: "fantome" } });
    const { magasin, docs } = magasinMemoire(base);
    const { releve, plan } = await planifier(magasin);
    expect(releve.chiffres.tachesPoleInconnu).toBe(1);
    expect(releve.chiffres.prevenirPoleInconnu).toBe(1);
    expect(releve.chiffres.prevenirVisantUnPole, "seul « prévenir Pôle DA » de Média compte comme migré").toBe(1);
    expect(formaterReleve(releve).join("\n")).toContain("pôle inconnu");
    await appliquer(magasin, plan);
    expect(docs.has("poles/fantome/taches/x"), "non migrée : la source reste").toBe(true);
    expect(docs.get("equipes/da/taches/affiche")!.prevenir, "pas d'équipe devinée").toEqual({ pole: "fantome" });
  });

  test("liste 4a : un admin responsable d'une tâche hors de l'équipe cible n'y figure pas (il garde l'accès)", async () => {
    const base = depart();
    base["poles/da/taches/affiche"] = tache("da", { titre: "Affiche de Noël", responsableUid: "uid-admin", responsableNom: "Alix D." });
    const { releve } = await planifier(magasinMemoire(base).magasin);
    expect(releve.tachesResponsableHorsEquipe.map((x) => x.tacheId)).toEqual(["budget", "salle"]);
  });

  test("liste 5 : les chiffres", async () => {
    const { magasin } = magasinMemoire(depart());
    const { releve } = await planifier(magasin);
    expect(releve.chiffres.tachesParPole).toEqual({
      da: { taches: 1, fois: 0 }, media: { taches: 2, fois: 2 }, orga: { taches: 1, fois: 0 },
      evenement: { taches: 1, fois: 0 }, louange: { taches: 1, fois: 1 },
    });
    expect(releve.chiffres.prevenirVisantUnPole, "« Quand c'est fait, prévenir Pôle DA »").toBe(1);
    expect(releve.chiffres.evenements).toEqual({ reunions: 2, autres: 1, sujets: 2, inconnus: 1 });
    expect(releve.chiffres.tableauxAvecPoles).toBe(1);
    expect(releve.chiffres.clesNotifLog).toBe(4);
    expect(releve.chiffres.profilsRattachement, "Léa, Nina et Rémi : profils d'avant R4").toBe(3);
  });

  test("liste 6 : le plan, compté par étape ; le texte imprimé reprend les listes sans pôle de code", async () => {
    const { magasin } = magasinMemoire(depart());
    const { releve, plan } = await planifier(magasin);
    expect(releve.parEtape).toEqual({ 1: 3, 2: 18, 3: 3, 4: 1, 5: 4, 6: 8, 7: 9 });
    expect(plan).toHaveLength(46);
    // Les étapes sont dans l'ordre : le relevé de chaque passage lit les pôles, retirés en dernier.
    expect(plan.map((o) => o.etape)).toEqual([...plan.map((o) => o.etape)].sort((a, b) => a - b));
    expect(plan.at(-1)?.etape).toBe(7);
    const texte = formaterReleve(releve).join("\n");
    for (const attendu of ["Yann C.", "Nina K.", "Rémi A.", "Éloi B.", "Budget", "Ranger la régie", "Étape 2"]) expect(texte).toContain(attendu);
    expect(texte).toContain("Back-Office complet");
  });
});

// ─── La migration (--ecrire) ─────────────────────────────────────────────────

test.describe("la migration, sur une base simulée", () => {
  test("étape 1 : dansEquipes et referentDe recalculés pour tous les profils ; un profil juste n'est pas réécrit", async () => {
    const { magasin, docs, ecritures } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    expect(docs.get("users/u-lea")).toMatchObject({ dansEquipes: ["orga"], referentDe: ["orga"], firstName: "Léa" });
    expect(docs.get("users/u-nina")).toMatchObject({ dansEquipes: ["comite-franco", "decoration"], referentDe: [] });
    expect(docs.get("users/u-remi")).toMatchObject({ dansEquipes: ["accueil-j1"], referentDe: [] });
    expect(ecritures.filter((e) => e.startsWith("maj users/")).length, "3 profils changés + 9 `poles` retirés").toBe(12);
  });

  test("étape 1 : un profil dans aucune équipe voit un rattachement périmé remis à []", async () => {
    const base = depart();
    base["users/u-yann"] = { ...(base["users/u-yann"] as Donnees), dansEquipes: ["da"], referentDe: ["da"] };
    const { magasin, docs } = magasinMemoire(base);
    const { plan } = await planifier(magasin);
    expect(plan.find((o) => o.etape === 1 && o.chemin === "users/u-yann")?.data).toEqual({ dansEquipes: [], referentDe: [] });
    await appliquer(magasin, plan);
    expect(docs.get("users/u-yann")).toMatchObject({ dansEquipes: [], referentDe: [], plannings: ["fidelite"] });
  });

  test("étape 2 : les tâches et leurs fois sous equipes/…, même id, prevenir traduit, la source supprimée", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    const photos = docs.get("equipes/medias/taches/photos")!;
    expect(photos).toMatchObject({ equipe: "medias", titre: "Photos du culte", responsableUid: "u-joel", prevenir: { equipe: "da" }, auteurUid: "u-lea", createdAt: "2026-10-01T10:00:00Z" });
    expect(photos, "plus de champ `pole`").not.toHaveProperty("pole");
    expect(docs.get("equipes/medias/taches/photos/fois/2026-10-18")).toEqual({
      date: "2026-10-18", parUid: "u-joel", parNom: "Joël F.", le: "2026-10-18T09:00:00Z", etat: "encours", debutLe: "2026-10-18T09:00:00Z",
    });
    expect(docs.get("equipes/medias/taches/photos/fois/2026-10-11")).toMatchObject({ etat: "terminee", debutLe: "2026-10-10T08:00:00Z" });
    // Média devient medias, Événement devient evenementiel ; la régie d'un service reste telle quelle.
    expect(docs.get("equipes/evenementiel/taches/salle")).toMatchObject({ equipe: "evenementiel", prevenir: { regie: "Culte Francophone" } });
    expect(docs.has("equipes/louange/taches/chants")).toBe(true);
    expect(docs.has("equipes/louange/taches/chants/fois/2026-10-11")).toBe(true);
    expect(docs.has("equipes/da/taches/affiche") && docs.has("equipes/orga/taches/budget")).toBe(true);
    expect([...docs.keys()].filter((p) => p.startsWith("poles/")), "la source est supprimée").toEqual([]);
  });

  test("étape 3 : les évènements pole:* passent en equipe:*, réunions et non-réunions ; les sujets ne bougent pas", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    expect(docs.get("evenements/e1")).toMatchObject({ pour: "equipe:da", reunion: true, titre: "Réunion DA" });
    expect(docs.get("evenements/e2")).toMatchObject({ pour: "equipe:medias", reunion: false });
    expect(docs.get("evenements/e3")!.pour, "Louange : l'équipe, comme les réunions equipe:louange déjà là").toBe("equipe:louange");
    expect(docs.get("evenements/e4")!.pour).toBe("equipe:louange");
    expect(docs.get("evenements/e5")!.pour).toBe("eglise");
    expect(docs.get("evenements/e6")!.pour, "un pôle inconnu n'est pas deviné").toBe("pole:inconnu");
    expect(docs.get("evenements/e1/sujets/s2")).toEqual({ titre: "Police", auteurUid: "u-hugo", reprisDans: "e0" });
  });

  test("étape 4 : le réglage « poles » du widget À faire devient « equipes »", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    expect(docs.get("backOffice/u-lea")).toEqual({
      tableauDeBord: [
        { id: "afaire", taille: "m", reglages: { equipes: ["medias", "evenementiel", "louange"], nombre: 5 } },
        { id: "dimanche", taille: "s", reglages: {} },
      ],
      majLe: "2026-09-01T10:00:00Z",
    });
    expect(docs.get("backOffice/u-hugo")!.tableauDeBord).toEqual([{ id: "afaire", taille: "m", reglages: { equipes: ["da"] } }]);
  });

  test("étape 5 : les clés notifLog de Média et d'Événement sont recopiées, les anciennes et les autres restent", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    for (const nouveau of [
      "rappel-tache-J3-medias-photos-2026-10-12-u-joel",
      "rappel-tache-encours-evenementiel-salle-2026-10-11-2026-10-12-u-remi",
      "tache-fait-medias-photos-2026-10-11-u-lea",
      "tache-assigne-evenementiel-salle-u-remi",
    ]) expect(docs.has(`notifLog/${nouveau}`), nouveau).toBe(true);
    expect(docs.get("notifLog/tache-fait-medias-photos-2026-10-11-u-lea")).toEqual({ uid: "u-lea", at: 3 });
    expect(docs.has("notifLog/rappel-tache-J3-media-photos-2026-10-12-u-joel"), "les anciens restent").toBe(true);
    // Orga, DA, un évènement et une clé déjà par équipe : rien de copié.
    expect([...docs.keys()].filter((p) => p.startsWith("notifLog/")).length).toBe(8 + 4);
  });

  test("étapes 6 et 7 : equipes.pole et users.poles retirés ; le reste des documents est intact", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    for (const [p, d] of docs) {
      if (/^equipes\/[^/]+$/.test(p)) expect(d, p).not.toHaveProperty("pole");
      if (/^users\/[^/]+$/.test(p)) expect(d, p).not.toHaveProperty("poles");
    }
    expect(docs.get("equipes/medias")!.membres).toEqual([membre("u-joel", "Joël F.")]);
    expect(docs.get("users/u-yann")).toMatchObject({ plannings: ["fidelite"], email: "yann@example.com" });
    expect(docs.get("users/u-maelle")).toMatchObject({ serviceRoles: { "Culte Francophone": ["chanteur"] } });
    expect(docs.get("users/uid-admin"), "la coordination n'est posée pour personne (décision 6)").not.toHaveProperty("coordination");
    expect(docs.get("users/u-eloi")).not.toHaveProperty("coordination");
  });

  test("second passage : 0 opération, et le relevé ne trouve plus rien à migrer", async () => {
    const { magasin, ecritures } = magasinMemoire(depart());
    await appliquer(magasin, (await planifier(magasin)).plan);
    const avant = ecritures.length;
    const { plan, releve } = await planifier(magasin);
    expect(plan).toEqual([]);
    expect(ecritures.length, "planifier n'écrit jamais").toBe(avant);
    expect(releve.parEtape).toEqual({});
    expect(releve.chiffres.profilsRattachement).toBe(0);
    await appliquer(magasin, plan);
    expect(ecritures.length).toBe(avant);
  });

  test("reprise : une copie déjà faite n'est pas réécrite, la source est tout de même supprimée", async () => {
    // Un passage interrompu après avoir copié « photos », avant de supprimer la source.
    const base = depart();
    const { pole, ...copie } = base["poles/media/taches/photos"] as Donnees;
    void pole;
    const { magasin, docs } = magasinMemoire({ ...base, "equipes/medias/taches/photos": { ...copie, equipe: "medias", prevenir: { equipe: "da" } } });
    const { plan, releve } = await planifier(magasin);
    expect(releve.conflits).toEqual([]);
    expect(plan.filter((o) => o.chemin === "equipes/medias/taches/photos")).toEqual([]);
    expect(plan.some((o) => o.genre === "supprimer" && o.chemin === "poles/media/taches/photos")).toBe(true);
    await appliquer(magasin, plan);
    expect(docs.has("poles/media/taches/photos")).toBe(false);
    expect(docs.get("equipes/medias/taches/photos/fois/2026-10-11")).toMatchObject({ etat: "terminee" });
  });

  test("conflit : un document déjà là sous equipes/ avec un autre contenu n'est ni écrasé ni la source supprimée", async () => {
    const { magasin, docs } = magasinMemoire({
      ...depart(),
      "equipes/da/taches/affiche": { equipe: "da", titre: "Autre chose, écrit depuis", responsableUid: null },
    });
    const { plan, releve } = await planifier(magasin);
    expect(releve.conflits).toEqual(["equipes/da/taches/affiche"]);
    expect(plan.filter((o) => o.chemin.includes("da/taches/affiche"))).toEqual([]);
    await appliquer(magasin, plan);
    expect(docs.get("equipes/da/taches/affiche")!.titre).toBe("Autre chose, écrit depuis");
    expect(docs.has("poles/da/taches/affiche"), "la source reste, à régler à la main").toBe(true);
  });
});

// ─── Le script (jamais lancé ici) ────────────────────────────────────────────

test("à blanc : appliquer le plan sur une base en lecture seule lève sans rien changer", async () => {
  const { magasin, docs, ecritures } = magasinMemoire(depart());
  const avant = structuredClone([...docs]);
  const { plan } = await planifier(enLectureSeule(magasin));
  expect(plan.length, "la lecture et le plan passent").toBeGreaterThan(0);
  await expect(appliquer(enLectureSeule(magasin), plan)).rejects.toThrow(/--ecrire/);
  expect(ecritures, "aucune écriture").toEqual([]);
  expect([...docs]).toEqual(avant);
});
