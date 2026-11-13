import { expect, test } from "@playwright/test";
import {
  appliquer, enLectureSeule, formaterReleve, planifier, type Donnees, type Magasin,
} from "../src/lib/acces/repriseResponsabilites";

// Lot RS, tranche RS-B (docs/spec-responsabilites.md, « Reprise ») : ce que chaque compte gagne, garde et perd
// quand les droits de gestion viennent de la liste « Responsabilités ». Tout est pur : une base Firestore simulée en
// mémoire, aucune lecture de la vraie base. Le script (scripts/responsabilites-reprise.ts) n'est lancé que par
// Timothée. Noms fictifs, inventés pour ce test.

/** Base simulée en mémoire : chemin complet -> document, comme Firestore (Admin SDK). */
function magasinMemoire(depart: Record<string, Donnees>) {
  const docs = new Map<string, Donnees>(Object.entries(depart).map(([k, v]) => [k, structuredClone(v)]));
  const ecritures: string[] = [];
  const enfants = (collection: string) =>
    [...docs.keys()].filter((p) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"));
  const magasin: Magasin = {
    lire: async (chemin) => (docs.has(chemin) ? structuredClone(docs.get(chemin)!) : null),
    lister: async (collection) => enfants(collection).map((p) => ({ id: p.split("/").pop()!, data: structuredClone(docs.get(p)!) })),
    listerIds: async (collection) => enfants(collection).map((p) => p.split("/").pop()!),
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

const profil = (prenom: string, nom: string, over: Donnees = {}): Donnees => ({ email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, ...over });

/** Les comptes d'avant la reprise. */
function depart(): Record<string, Donnees> {
  return {
    "users/u-louange": profil("Mireille", "Faure", { referentDe: ["louange"], referentSous: ["musiciens"], dansEquipes: ["louange"] }),
    "users/u-edd": profil("Basile", "Corneau", { referentDe: ["edd"], dansEquipes: ["edd"] }),
    "users/u-orga": profil("Solène", "Aubert", { dansEquipes: ["orga"] }),
    "users/u-groupe": profil("Noémie", "Pichon", { groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix", "bonte"], notifieParRole: ["Groupe Paix", "Groupe Fidélité"] }),
    "users/u-coche": profil("Gaspard", "Lemaire", { plannings: ["culte", "campusSoir", "table", "inconnu"] }),
    "users/u-regie": profil("Elvire", "Tanguy", { referentDe: ["regie"], dansEquipes: ["regie"] }),
    "users/u-comite": profil("Hugo", "Ferrand", { referentDe: ["comite-paix"] }),
    "users/u-deja": profil("Léonie", "Marchal", { responsabilites: ["orga", "planning:paix"], dansEquipes: ["orga"], referentDe: ["louange"] }),
    "users/u-simple": profil("Armand", "Duval", { dansEquipes: ["louange"], serviceRoles: {} }),
    "users/u-inconnues": profil("Colette", "Roux", { remplitParRole: ["nimporte"], responsabilites: ["pirate"] }),
  };
}

const ligne = (lignes: Awaited<ReturnType<typeof planifier>>["lignes"], uid: string) => lignes.find((l) => l.uid === uid);

test.describe("lot RS : la reprise des responsabilités", () => {
  test("référent Louange -> culte, intergroupe, interfranco, campus ; perd la coordination et notifier la Louange", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    const l = ligne(lignes, "u-louange")!;
    expect(l.gagne).toEqual(["planning:culte", "planning:intergroupe", "planning:interfranco", "planning:campus"]);
    expect(l.garde).toEqual([]);
    expect(l.perd.join(" | ")).toContain("coordination (scène, évènements de l'Église), notifier la Louange");
    expect(l.perd.join(" | ")).toContain("notification libre à son équipe (restent les réunions)");
  });

  test("référent EDD -> planning:edd ; perd la coordination", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    const l = ligne(lignes, "u-edd")!;
    expect(l.gagne).toEqual(["planning:edd"]);
    expect(l.perd).toContain("coordination");
  });

  test("membre d'Orga -> orga, sans rien perdre", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    const l = ligne(lignes, "u-orga")!;
    expect(l.gagne).toEqual(["orga"]);
    expect(l.perd).toEqual([]);
  });

  test("rôles de groupe (remplitParRole, publieParRole) -> planning:<son groupe> ; notifier non couvert = perdu", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    const l = ligne(lignes, "u-groupe")!;
    // paix (remplit et publie), bonte (publie) ; fidélité n'est gagnée par aucun.
    expect(l.gagne).toEqual(["planning:paix", "planning:bonte"]);
    expect(l.perd).toEqual(["notifier Groupe Fidélité"]);
  });

  test("droit coché `plannings` -> planning:<x> correspondant ; une clé inconnue est ignorée", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    expect(ligne(lignes, "u-coche")!.gagne).toEqual(["planning:culte", "planning:campus", "planning:table"]);
    // Clé de rôle inconnue et responsabilité inconnue : ni gagnées ni gardées, le profil n'apparaît pas.
    expect(ligne(lignes, "u-inconnues")).toBeUndefined();
  });

  test("le référent Régie ne gagne rien et apparaît en « perd Sono, Sono Live, PPT du Culte »", async () => {
    const { lignes, plan } = await planifier(magasinMemoire(depart()).magasin);
    const l = ligne(lignes, "u-regie")!;
    expect(l.gagne).toEqual([]);
    expect(l.perd).toContain("Sono, Sono Live, PPT du Culte");
    expect(plan.some((o) => o.chemin === "users/u-regie")).toBe(false);
    expect(formaterReleve(lignes, plan).join("\n")).toContain("Elvire Tanguy — garde : — / gagne : — / perd : Sono, Sono Live, PPT du Culte");
  });

  test("référent d'un comité de groupe : perd la création des évènements du groupe", async () => {
    const { lignes } = await planifier(magasinMemoire(depart()).magasin);
    expect(ligne(lignes, "u-comite")!.perd.join(" | ")).toContain("créer les évènements du groupe");
  });

  test("un profil sans gain ni perte n'apparaît pas et n'a aucune opération", async () => {
    const { lignes, plan } = await planifier(magasinMemoire(depart()).magasin);
    expect(ligne(lignes, "u-simple")).toBeUndefined();
    expect(plan.some((o) => o.chemin === "users/u-simple")).toBe(false);
  });

  test("une responsabilité déjà là est gardée et non doublée ; l'union suit l'ordre des clés", async () => {
    const { magasin, docs } = magasinMemoire(depart());
    const { lignes, plan } = await planifier(magasin);
    const l = ligne(lignes, "u-deja")!;
    expect(l.garde).toEqual(["planning:paix", "orga"]);
    expect(l.gagne).toEqual(["planning:culte", "planning:intergroupe", "planning:interfranco", "planning:campus"]);
    await appliquer(magasin, plan);
    expect(docs.get("users/u-deja")!.responsabilites).toEqual([
      "planning:culte", "planning:intergroupe", "planning:interfranco", "planning:campus", "planning:paix", "orga",
    ]);
  });

  test("à blanc, rien n'est écrit : toute écriture lève", async () => {
    const { magasin, ecritures } = magasinMemoire(depart());
    const { plan } = await planifier(enLectureSeule(magasin));
    expect(plan.length).toBeGreaterThan(0);
    await expect(appliquer(enLectureSeule(magasin), plan)).rejects.toThrow(/--ecrire/);
    expect(ecritures).toEqual([]);
  });

  test("avec écriture, seul `responsabilites` change ; deuxième passe = 0 opération", async () => {
    const { magasin, docs, ecritures } = magasinMemoire(depart());
    const avant = new Map([...docs].map(([k, v]) => [k, structuredClone(v)]));
    const { plan } = await planifier(magasin);
    await appliquer(magasin, plan);
    expect(ecritures.every((e) => e.startsWith("maj users/"))).toBe(true);
    for (const [chemin, doc] of docs) {
      const { responsabilites: apres, ...reste } = doc;
      const { responsabilites: _avant, ...resteAvant } = avant.get(chemin)!;
      expect(reste, chemin).toEqual(resteAvant);
      void apres; void _avant;
    }
    expect(docs.get("users/u-orga")!.responsabilites).toEqual(["orga"]);
    expect(docs.get("users/u-regie")!.responsabilites).toBeUndefined();
    const seconde = await planifier(magasin);
    expect(seconde.plan).toHaveLength(0);
    expect(formaterReleve(seconde.lignes, seconde.plan).at(-1)).toBe("0 opération");
  });
});
