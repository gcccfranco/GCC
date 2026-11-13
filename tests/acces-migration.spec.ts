import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./helpers/fakeSession";
import {
  PAR_NOM, appliquer, enLectureSeule, formaterReleve, planifier, type Donnees, type Magasin,
} from "../src/lib/acces/migration";
import type { PlanningData } from "../src/lib/planning/names";

// Lot AO, tranche AO-D (docs/spec-acces-organigramme.md, B4 et B5) : le relevé puis la migration qui remplit
// l'organigramme depuis l'existant. Tout est pur : une base Firestore simulée en mémoire et un planning inventé,
// aucune lecture de la vraie base. Le script (scripts/acces-vers-organigramme.ts) n'est lancé que par Timothée.
// Noms fictifs, inventés pour ce test.

const MAINTENANT = "2026-10-22T10:00:00.000Z";

/** Base simulée en mémoire : chemin complet -> document, comme Firestore (Admin SDK). */
function magasinMemoire(depart: Record<string, Donnees>) {
  const docs = new Map<string, Donnees>(Object.entries(depart).map(([k, v]) => [k, structuredClone(v)]));
  const ecritures: string[] = [];
  const enfants = (collection: string) =>
    [...docs.keys()].filter((p) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"));
  const magasin: Magasin = {
    lire: async (chemin) => (docs.has(chemin) ? structuredClone(docs.get(chemin)!) : null),
    lister: async (collection) => enfants(collection).map((p) => ({ id: p.split("/").pop()!, data: structuredClone(docs.get(p)!) })),
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

const membre = (uid: string, nom: string, over: Donnees = {}): Donnees =>
  ({ nom, uid, mention: "", referent: false, essai: false, groupe: "", ...over });
const profilBase = { annonces: [], notify: [], plannings: [], equipes: false, serviceRoles: {} };

/** Un planning inventé : lignes du culte [date, présidence, choriste, choriste, piano, guitare, batterie, sono, ppt]. */
const PLANNING: PlanningData = {
  culte: [
    ["2026-11-01", "Zoé M.", "Lise V.", "", "Pia R.", "Marc T.", "", "Théo N.", "Yves Z."],
    ["2026-11-08", "", "Lise V.", "", "", "", "", "Nora B.", ""],
  ],
  dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [], edd: {}, campus: [], intergroupe: [],
  // Interfranco : [date, présidence, choriste, choriste, piano, guitare, cajon/batterie, sono, ppt]
  interfranco: [["2026-11-15", "", "", "", "", "", "Marc T.", "", ""]],
};

/** L'organigramme et les comptes d'avant la migration. */
function depart(): Record<string, Donnees> {
  return {
    "equipes/louange": {
      membres: [
        membre("u-ines", "Inès P.", { referent: true, mention: "Référente", groupe: "Présidences", referentSous: ["musiciens"] }),
        membre("u-pia", "Pia R.", { groupe: "Pianistes" }),
        membre("", "Léon K.", { groupe: "Batteurs" }),
      ],
      updatedAt: "2026-09-01T10:00:00Z", parUid: "u-ines", parNom: "Inès P.",
    },
    "equipes/regie": { membres: [], updatedAt: "2026-09-01T10:00:00Z", parUid: "", parNom: "" },
    "equipes/edd": { membres: [membre("", "Professeur Sans Compte", { groupe: "Professeurs louange" })], updatedAt: "2026-09-01T10:00:00Z", parUid: "", parNom: "" },
    "equipes/orga": { membres: [membre("u-orga", "Rita D.")], updatedAt: "2026-09-01T10:00:00Z", parUid: "", parNom: "" },
    // Un choriste, qui sert à Franco et au Campus.
    "users/u-lise": { ...profilBase, email: "lise@example.com", firstName: "Lise", lastName: "Vernet", planningName: "Lise V.", serviceRoles: { "Culte Francophone": ["chanteur"], Campus: ["chanteur"] } },
    // Un musicien : lieux dans son profil, instruments dans le planning (guitare au culte, cajon/batterie à Interfranco).
    "users/u-marc": { ...profilBase, email: "marc@example.com", firstName: "Marc", lastName: "Thibault", planningName: "Marc T.", serviceRoles: { "Culte Francophone": ["musicien"], Campus: ["musicien"] } },
    // Une régie, à Intergroupe.
    "users/u-nora": { ...profilBase, email: "nora@example.com", firstName: "Nora", lastName: "Besson", planningName: "Nora B.", serviceRoles: { Intergroupe: ["regie"] } },
    // Un compte sans rôle, mais à la sono dans le planning.
    "users/u-theo": { ...profilBase, email: "theo@example.com", firstName: "Théo", lastName: "Navarre", planningName: "Théo N." },
    // Un professeur de l'EDD, sans rôle.
    "users/u-edgar": { ...profilBase, email: "edgar@example.com", firstName: "Edgar", lastName: "Pons", serviceRoles: { 大班: [] } },
    // Déjà dans Louange (intertitre Pianistes).
    "users/u-pia": { ...profilBase, email: "pia@example.com", firstName: "Pia", lastName: "Rey", planningName: "Pia R.", dansEquipes: ["louange"], referentDe: [] },
    "users/u-ines": { ...profilBase, email: "ines@example.com", firstName: "Inès", lastName: "Pires", planningName: "Inès P.", dansEquipes: ["louange"], referentDe: ["louange"] },
    // Coordination cochée à la main, aucune place d'Orga.
    "users/u-vera": { ...profilBase, email: "vera@example.com", firstName: "Véra", lastName: "Lopez", coordination: true, notify: ["*"], plannings: ["culte"] },
    "users/u-orga": { ...profilBase, email: "rita@example.com", firstName: "Rita", lastName: "Dubois", dansEquipes: ["orga"], referentDe: [] },
    // Clé de groupe sans `groupe`.
    "users/u-gaia": { ...profilBase, email: "gaia@example.com", firstName: "Gaia", lastName: "Mercier", serviceRoles: { "Groupe Paix": ["musicien"] } },
    // Un admin : laissé de côté.
    "users/uid-admin": { ...profilBase, email: ADMIN_EMAIL, firstName: "Alix", lastName: "Dorval", coordination: true },
  };
}

const membres = (docs: Map<string, Donnees>, equipe: string) => (docs.get(`equipes/${equipe}`)!.membres as Donnees[]);
const parUid = (docs: Map<string, Donnees>, equipe: string, uid: string) => membres(docs, equipe).find((m) => m.uid === uid);

async function migrer() {
  const base = magasinMemoire(depart());
  const { releve, plan } = await planifier(base.magasin, PLANNING, MAINTENANT);
  await appliquer(base.magasin, plan);
  return { ...base, releve, plan };
}

test.describe("à blanc : rien n'est écrit", () => {
  test("le relevé et le plan ne touchent à rien, et le magasin en lecture seule refuse toute écriture", async () => {
    const { magasin, ecritures } = magasinMemoire(depart());
    const lecture = enLectureSeule(magasin);
    const { releve, plan } = await planifier(lecture, PLANNING, MAINTENANT);
    expect(ecritures).toEqual([]);
    expect(plan.length).toBeGreaterThan(0);
    expect(releve.admins).toBe(1);
    await expect(appliquer(lecture, plan)).rejects.toThrow("--ecrire");
    expect(ecritures).toEqual([]);
    expect(formaterReleve(releve).join("\n")).toContain("Perd un accès");
  });
});

test.describe("ce que la migration écrit", () => {
  test("un choriste : sous-équipe Choristes et ses lieux (clés de serviceRoles), recopiés sur son profil", async () => {
    const { docs } = await migrer();
    const lise = parUid(docs, "louange", "u-lise")!;
    expect(lise).toMatchObject({ nom: "Lise V.", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["choristes"], lieux: ["Culte Francophone", "Campus"] });
    expect(lise.joue).toBeUndefined();
    expect(docs.get("users/u-lise")).toMatchObject({
      dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone", "Campus"],
    });
  });

  test("un musicien : Musiciens, ses lieux, et ses instruments tirés du planning (guitare, cajon/batterie -> batterie), plus le lieu du service où il joue", async () => {
    const { docs } = await migrer();
    expect(parUid(docs, "louange", "u-marc")).toMatchObject({ sousEquipes: ["musiciens"], lieux: ["Culte Francophone", "Interfranco", "Campus"], joue: ["guitare", "batterie"] });
    expect(docs.get("users/u-marc")).toMatchObject({ sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone", "Interfranco", "Campus"], joue: ["guitare", "batterie"] });
  });

  test("une régie : membre de equipes/regie avec son lieu ; la sono du planning suffit pour être membre, et donne le lieu du service", async () => {
    const { docs } = await migrer();
    expect(parUid(docs, "regie", "u-nora")).toMatchObject({ nom: "Nora B.", lieux: ["Culte Francophone", "Intergroupe"], referent: false });
    expect(docs.get("users/u-nora")).toMatchObject({ dansEquipes: ["regie"], lieuxRegie: ["Culte Francophone", "Intergroupe"] });
    const theo = parUid(docs, "regie", "u-theo")!;
    expect(theo.nom).toBe("Théo N.");
    expect(theo.lieux).toEqual(["Culte Francophone"]);
    expect(docs.get("users/u-theo")).toMatchObject({ dansEquipes: ["regie"], lieuxRegie: ["Culte Francophone"] });
  });

  test("EDD : une clé de classe suffit ; le nom est prénom + initiale quand le profil n'a pas de nom de planning", async () => {
    const { docs } = await migrer();
    expect(parUid(docs, "edd", "u-edgar")).toMatchObject({ nom: "Edgar P.", mention: "", referent: false, essai: false, groupe: "" });
    expect(membres(docs, "edd").some((m) => m.nom === "Professeur Sans Compte")).toBe(true);
    expect(docs.get("users/u-edgar")).toMatchObject({ dansEquipes: ["edd"] });
    expect(docs.get("users/u-edgar")!.sousEquipes).toBeUndefined();
  });

  test("l'intertitre Pianistes devient Musiciens + piano ; Présidences devient Présidence ; Batteurs sans compte aussi", async () => {
    const { docs } = await migrer();
    expect(parUid(docs, "louange", "u-pia")).toMatchObject({ groupe: "Pianistes", sousEquipes: ["musiciens"], joue: ["piano"] });
    expect(docs.get("users/u-pia")).toMatchObject({ sousEquipes: ["musiciens"], joue: ["piano"] });
    const ines = parUid(docs, "louange", "u-ines")!;
    expect(ines).toMatchObject({ referent: true, mention: "Référente", groupe: "Présidences", sousEquipes: ["presidence"], referentSous: ["musiciens"] });
    const leon = membres(docs, "louange").find((m) => m.nom === "Léon K.")!;
    expect(leon).toMatchObject({ uid: "", sousEquipes: ["musiciens"], joue: ["batterie"] });
  });

  test("on complète sans rien effacer : ordre et champs des membres, serviceRoles et droits cochés des profils", async () => {
    const { docs } = await migrer();
    expect(membres(docs, "louange").slice(0, 3).map((m) => m.nom)).toEqual(["Inès P.", "Pia R.", "Léon K."]);
    expect(docs.get("equipes/louange")).toMatchObject({ parNom: PAR_NOM, updatedAt: MAINTENANT });
    expect(docs.get("equipes/orga")!.parNom).toBe("");
    expect(docs.get("users/u-lise")!.serviceRoles).toEqual({ "Culte Francophone": ["chanteur"], Campus: ["chanteur"] });
    expect(docs.get("users/u-vera")).toMatchObject({ coordination: true, notify: ["*"], plannings: ["culte"] });
    expect(docs.get("users/uid-admin")!.dansEquipes).toBeUndefined();
  });

  test("idempotent : le passage à blanc qui suit annonce 0 opération", async () => {
    const { magasin, ecritures } = await migrer();
    const avant = ecritures.length;
    const apres = await planifier(magasin, PLANNING, MAINTENANT);
    expect(apres.plan).toEqual([]);
    expect(ecritures.length).toBe(avant);
    expect(formaterReleve(apres.releve).join("\n")).toContain("Total : 0 opération(s) — rien à migrer");
  });
});

test.describe("le relevé", () => {
  test("personne dans « perd un accès » pour un profil ordinaire (choriste, musicien) ; ils gardent leur accès", async () => {
    const { releve } = await migrer();
    const perdent = releve.perdent.map((x) => x.uid);
    expect(perdent).not.toContain("u-lise");
    expect(perdent).not.toContain("u-marc");
    expect(perdent).not.toContain("u-pia");
    const lise = releve.gardent.find((x) => x.uid === "u-lise")!;
    expect(lise.gardes).toEqual(expect.arrayContaining(["voit les setlists Campus", "crée des setlists Culte Francophone"]));
    const marc = releve.gardent.find((x) => x.uid === "u-marc")!;
    expect(marc.gardes).toContain("Harmonie (guitare)");
    expect(releve.perdent.find((x) => x.uid === "uid-admin")).toBeUndefined();
  });

  test("avant la recopie, le relevé voit déjà ce que le profil aura après : le même résultat à blanc et après écriture", async () => {
    const avant = await planifier(magasinMemoire(depart()).magasin, PLANNING, MAINTENANT);
    const apres = await migrer();
    expect(avant.releve.perdent).toEqual(apres.releve.perdent);
    expect(avant.releve.gardent.map((x) => x.uid)).toEqual(apres.releve.gardent.map((x) => x.uid));
  });

  test("une régie ne perd que l'équipe de réunions « louange » que tout rôle de service donnait", async () => {
    const { releve } = await migrer();
    expect(releve.perdent.find((x) => x.uid === "u-nora")?.pertes).toEqual(["est de l'équipe louange (réunions, tâches)"]);
    expect(releve.gardent.some((x) => x.uid === "u-nora")).toBe(false);
  });

  test("une coordination cochée sans place d'Orga ressort dans « droit coché sans équivalent », et dans « perd »", async () => {
    const { releve } = await migrer();
    const vera = releve.droitsSansEquivalent.find((x) => x.uid === "u-vera")!;
    expect(vera.droits).toEqual(["coordination", "notify : *", "plannings : Culte"]);
    expect(releve.perdent.find((x) => x.uid === "u-vera")?.pertes).toEqual(
      expect.arrayContaining(["coordination (scène, fêtes, évènements de l'Église)", "remplit le planning Culte"]),
    );
    expect(releve.droitsSansEquivalent.some((x) => x.uid === "u-orga" || x.uid === "uid-admin")).toBe(false);
  });

  test("un nom du planning sans compte ni équipe ressort dans « au planning sans équipe » ; les placés n'y sont pas", async () => {
    const { releve } = await migrer();
    const noms = releve.auPlanningSansEquipe.map((x) => x.nom);
    expect(noms).toEqual(expect.arrayContaining(["Yves Z.", "Zoé M."]));
    const yves = releve.auPlanningSansEquipe.find((x) => x.nom === "Yves Z.")!;
    expect(yves.compte).toBeNull();
    expect(yves.services).toEqual(["Culte Franco : PPT"]);
    for (const place of ["Lise V.", "Marc T.", "Théo N.", "Nora B.", "Pia R."]) expect(noms).not.toContain(place);
  });

  test("avant la migration, un compte du planning sans équipe y figure ; la migration l'en sort", async () => {
    const avant = await planifier(magasinMemoire(depart()).magasin, PLANNING, MAINTENANT);
    expect(avant.releve.auPlanningSansEquipe.map((x) => x.nom)).not.toContain("Lise V.");
    const sansProfil = depart();
    delete sansProfil["users/u-lise"];
    const sans = await planifier(magasinMemoire(sansProfil).magasin, PLANNING, MAINTENANT);
    expect(sans.releve.auPlanningSansEquipe.find((x) => x.nom === "Lise V.")).toMatchObject({ compte: null });
  });

  test("une clé de groupe sans `groupe` correspondant est signalée (rien n'est écrit pour le groupe)", async () => {
    const { releve, docs } = await migrer();
    expect(releve.groupesSansCorrespondance.map((x) => [x.uid, x.cle, x.groupe])).toEqual([["u-gaia", "Groupe Paix", "(absent)"]]);
    expect(docs.get("users/u-gaia")!.groupe).toBeUndefined();
  });

  test("plusieurs membres sans compte du même nom : rien n'est relié, le doublon est signalé (à relier à la main)", async () => {
    const d = depart();
    (d["equipes/louange"].membres as Donnees[]).push(membre("", "Lise V.", { groupe: "Choristes" }), membre("", "lise v", {}));
    const { releve } = await planifier(magasinMemoire(d).magasin, PLANNING, MAINTENANT);
    expect(releve.doublons).toEqual([{ equipe: "louange", nom: "Lise V." }]);
    expect(releve.liens).toEqual([]);
    expect(releve.ajouts.some((x) => x.uid === "u-lise")).toBe(true);
  });

  test("un seul membre sans compte du même nom : il est relié (uid posé), rien n'est ajouté", async () => {
    const d = depart();
    (d["equipes/louange"].membres as Donnees[]).push(membre("", "Lise V.", { groupe: "Choristes", mention: "Soprano" }));
    const { magasin, docs } = magasinMemoire(d);
    const { releve, plan } = await planifier(magasin, PLANNING, MAINTENANT);
    expect(releve.liens).toEqual([{ equipe: "louange", nom: "Lise V.", uid: "u-lise" }]);
    expect(releve.ajouts.some((x) => x.uid === "u-lise")).toBe(false);
    expect(releve.doublons).toEqual([]);
    await appliquer(magasin, plan);
    const lises = membres(docs, "louange").filter((m) => m.nom === "Lise V.");
    expect(lises).toHaveLength(1);
    expect(lises[0]).toMatchObject({ uid: "u-lise", mention: "Soprano", groupe: "Choristes", sousEquipes: ["choristes"] });
    expect(docs.get("users/u-lise")).toMatchObject({ dansEquipes: ["louange"] });
    expect((await planifier(magasin, PLANNING, MAINTENANT)).plan).toEqual([]);
  });
});

test.describe("Louange = les 4 lieux du culte ; Harmonie gardée par le planning", () => {
  test("un rôle sur une clé de groupe ou d'EDD ne fait pas entrer dans Louange", async () => {
    const d = depart();
    d["users/u-paul"] = { ...profilBase, email: "paul@example.com", firstName: "Paul", lastName: "Weber", serviceRoles: { "Groupe Bonté": ["musicien", "presidence"], 中班: ["chanteur"] } };
    const { releve, docs } = await (async () => { const b = magasinMemoire(d); const r = await planifier(b.magasin, PLANNING, MAINTENANT); await appliquer(b.magasin, r.plan); return { ...r, docs: b.docs }; })();
    expect(parUid(docs, "louange", "u-paul")).toBeUndefined();
    expect(parUid(docs, "louange", "u-gaia")).toBeUndefined();
    expect(parUid(docs, "edd", "u-paul")).toBeDefined();
    expect(docs.get("users/u-paul")!.sousEquipes).toBeUndefined();
    expect(releve.ajouts.filter((x) => x.equipe === "louange").map((x) => x.uid)).toEqual(expect.not.arrayContaining(["u-paul", "u-gaia"]));
  });

  test("Piano ou Guitare au planning d'un groupe : entre dans les Musiciens pour garder Harmonie, et le relevé le dit", async () => {
    const d = depart();
    d["users/u-ugo"] = { ...profilBase, email: "ugo@example.com", firstName: "Ugo", lastName: "Faure", planningName: "Ugo F.", serviceRoles: { "Groupe Fidélité": ["musicien"] } };
    // Fidélité : [date, présidence, orateur, ?, piano, guitare, batterie]
    const planning: PlanningData = { ...PLANNING, fidelite: [["2026-11-03", "", "", "", "Ugo F.", "", ""]] };
    const { magasin, docs } = magasinMemoire(d);
    const { releve, plan } = await planifier(magasin, planning, MAINTENANT);
    expect(releve.pourHarmonie.map((x) => x.uid)).toContain("u-ugo");
    expect(formaterReleve(releve).join("\n")).toContain("Ajoutés aux Musiciens pour garder Harmonie");
    await appliquer(magasin, plan);
    expect(parUid(docs, "louange", "u-ugo")).toMatchObject({ sousEquipes: ["musiciens"], joue: ["piano"] });
    expect(releve.perdent.find((x) => x.uid === "u-ugo")?.pertes.some((t) => t.startsWith("Harmonie")) ?? false).toBe(false);
  });
});
