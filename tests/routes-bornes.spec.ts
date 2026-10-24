import { expect, test } from "@playwright/test";
import { recalculerRattachement, lireEquipes, lireGroupes, referentsPermis } from "../src/lib/equipes/serveur";
import { peutChangerReferents } from "../src/lib/acces/organigramme";
import {
  MESSAGE_MAX, SLUG_MAX, TITRE_MAX, UIDS_MAX, lireCorpsAudience, lireCorpsBroadcast, lireCorpsNotifySetlist,
  lireCorpsRelease, lireCorpsReport, lireUidsRattachement,
} from "../src/lib/push/bornes";
import { HttpError } from "../src/lib/evenements/serveur";
import {
  doitNotifierPublication, prendreVerrou, rendreEnvoi, rendrePourUids, rendreVerrou, reserverEnvoi, reserverPourUids, reserverPublication,
} from "../src/lib/push/reserver";
import { baseSimulee } from "./helpers/baseSimulee";

// Tranche A2 (docs/spec-corrections-audit.md) : gardes serveur des routes. Sans page : la validation est
// extraite en fonctions pures (src/lib/push/bornes.ts), la recopie et les réservations tournent sur une base
// simulée (tests/helpers/baseSimulee.ts). Prénoms fictifs.

/** Le corps est refusé en 400 avec ce message. */
function refus400(fn: () => unknown, message: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    expect((e as HttpError).status).toBe(400);
    expect((e as HttpError).message).toBe(message);
    return;
  }
  throw new Error("aucune erreur levée");
}

const membre = (uid: string, referent: boolean, extra: Record<string, unknown> = {}) =>
  ({ nom: uid, uid, mention: "", referent, essai: false, groupe: "", ...extra });

test.describe("rattachement : qui peut nommer un référent (C7)", () => {
  async function recopie(
    profils: Record<string, Record<string, unknown>>,
    equipes: Record<string, Record<string, unknown>>,
    cible: string,
    appelant: string,
    admin = false,
  ) {
    const { db, collections } = baseSimulee({ users: profils, equipes });
    const profilAppelant = profils[appelant] ?? null;
    const peut = (equipe: string) => admin || peutChangerReferents(profilAppelant, equipe);
    await recalculerRattachement(db, [cible], await lireEquipes(db), await lireGroupes(db), { peut });
    return collections.users[cible];
  }

  test("un référent de sous-équipe qui se coche référent de Louange : non recopié", async () => {
    const profils = {
      "u-chloe": { dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-chloe", true, { sousEquipes: ["musiciens"], referentSous: ["musiciens"] })] } };
    const profil = await recopie(profils, equipes, "u-chloe", "u-chloe");
    expect(profil.referentDe ?? []).not.toContain("louange");
  });

  test("un référent de sous-équipe qui se nomme référent d'une autre sous-équipe : non recopié", async () => {
    const profils = {
      "u-chloe": { dansEquipes: ["louange"], sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-chloe", false, { sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens", "choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-chloe", "u-chloe");
    expect(profil.referentSous).toEqual(["musiciens"]);
  });

  test("le référent Louange nomme un référent : recopié (référent d'équipe et de sous-équipe)", async () => {
    const profils = {
      "u-didier": { dansEquipes: ["louange"], referentDe: ["louange"] },
      "u-emma": { dansEquipes: ["louange"] },
    };
    const equipes = { louange: { membres: [membre("u-didier", true), membre("u-emma", true, { sousEquipes: ["choristes"], referentSous: ["choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-emma", "u-didier");
    expect(profil.referentDe).toEqual(["louange"]);
    expect(profil.referentSous).toEqual(["choristes"]);
  });

  test("Orga nomme le référent d'une autre équipe : recopié", async () => {
    const profils = { "u-fanny": { dansEquipes: ["orga"] }, "u-gilles": {} };
    const equipes = { regie: { membres: [membre("u-gilles", true)] } };
    const profil = await recopie(profils, equipes, "u-gilles", "u-fanny");
    expect(profil.referentDe).toEqual(["regie"]);
  });

  test("un admin nomme un référent : recopié", async () => {
    const profils = { "u-hugo": {} };
    const equipes = { regie: { membres: [membre("u-hugo", true)] } };
    const profil = await recopie(profils, equipes, "u-hugo", "u-admin", true);
    expect(profil.referentDe).toEqual(["regie"]);
  });

  test("un retrait s'applique, même par qui ne peut rien nommer", async () => {
    const profils = {
      "u-chloe": { dansEquipes: ["louange"], referentDe: ["louange"], referentSous: ["musiciens"], sousEquipes: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-chloe", false, { sousEquipes: ["musiciens"] })] } };
    const profil = await recopie(profils, equipes, "u-chloe", "u-ivan");
    expect(profil.referentDe).toEqual([]);
    expect(profil.referentSous).toEqual([]);
  });

  test("referentsPermis : l'existant reste, le nouveau demande le droit", () => {
    expect(referentsPermis(["regie"], ["regie", "louange"], () => false)).toEqual(["regie"]);
    expect(referentsPermis(["regie"], ["regie", "louange"], (e) => e === "louange")).toEqual(["regie", "louange"]);
    expect(referentsPermis(["regie"], [], () => false)).toEqual([]);
  });

  test("la recopie appelée par un président de groupe ne recopie pas un nouveau référent d'équipe", async () => {
    const profils = {
      "u-jade": { dansEquipes: ["comite-paix"], referentDe: ["comite-paix"] },
      "u-karim": { dansEquipes: ["louange"] },
    };
    const equipes = { louange: { membres: [membre("u-karim", true, { sousEquipes: ["choristes"], referentSous: ["choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-karim", "u-jade");
    expect(profil.referentDe ?? []).not.toContain("louange");
    expect(profil.referentSous ?? []).toEqual([]);
  });
});

test.describe("bornes côté serveur (S7)", () => {
  const audience = { audience: "culte", title: "Titre", body: "Message", url: "/planning" };

  test("notify-audience : titre ≤ 80 et message ≤ 300, sinon 400 « Texte trop long »", () => {
    const ok = lireCorpsAudience({ ...audience, title: "a".repeat(TITRE_MAX), body: "b".repeat(MESSAGE_MAX) });
    expect(ok.title).toHaveLength(TITRE_MAX);
    refus400(() => lireCorpsAudience({ ...audience, title: "a".repeat(TITRE_MAX + 1) }), "Texte trop long");
    refus400(() => lireCorpsAudience({ ...audience, body: "b".repeat(MESSAGE_MAX + 1) }), "Texte trop long");
    refus400(() => lireCorpsAudience({ ...audience, title: "  " }), "Titre et message requis");
    refus400(() => lireCorpsAudience({ ...audience, body: 12 }), "Titre et message requis");
    refus400(() => lireCorpsAudience(null), "Titre et message requis");
  });

  test("notify-audience : textes rognés, uids gardés, url externe → /mes-services", () => {
    expect(lireCorpsAudience({ ...audience, title: " T ", body: " M ", uids: ["u1"] })).toMatchObject({ title: "T", body: "M", uids: ["u1"], audience: "culte" });
    expect(lireCorpsAudience({ ...audience, url: "/setlists/abc-1" }).url).toBe("/setlists/abc-1");
    for (const url of ["https://exemple.org", "//exemple.org", "javascript:alert(1)", "/a?x=1", undefined, 3]) {
      expect(lireCorpsAudience({ ...audience, url }).url, String(url)).toBe("/mes-services");
    }
  });

  test("report : titre et description validés, songSlug coupé à 200 caractères, typé string", () => {
    const base = { title: "Une faute", description: "Dans le refrain", kind: "song" };
    expect(lireCorpsReport({ ...base, songSlug: "x".repeat(SLUG_MAX + 50) }).songSlug).toHaveLength(SLUG_MAX);
    expect(lireCorpsReport({ ...base, songSlug: "abc" }).songSlug).toBe("abc");
    expect(lireCorpsReport({ ...base, songSlug: 42 }).songSlug).toBe("");
    expect(lireCorpsReport({ ...base, songSlug: { a: 1 } }).songSlug).toBe("");
    expect(lireCorpsReport({ ...base, songSlug: "abc", songTitle: "t".repeat(300) }).songTitle).toHaveLength(200);
    const site = lireCorpsReport({ title: "Un bug", kind: "autre", songSlug: "abc" });
    expect(site).toMatchObject({ kind: "site", songSlug: "", songTitle: "" });
    expect(() => lireCorpsReport({ title: "", kind: "site" })).toThrow();
  });

  test("notify-setlist : setlistId = chaîne [\\w-]+, sinon 400", () => {
    expect(lireCorpsNotifySetlist({ setlistId: "abc_DEF-123", auto: true })).toEqual({ setlistId: "abc_DEF-123", auto: true });
    expect(lireCorpsNotifySetlist({ setlistId: "abc" }).auto).toBe(false);
    for (const v of ["", "a/b", "a b", "../x", 12, null, undefined, { a: 1 }, ["a"]]) {
      refus400(() => lireCorpsNotifySetlist({ setlistId: v }), "setlistId manquant");
    }
    refus400(() => lireCorpsNotifySetlist(undefined), "setlistId manquant");
  });

  test("broadcast : titre et message requis, url externe → « / »", () => {
    expect(lireCorpsBroadcast({ title: "A", body: "B", url: "/planning" })).toEqual({ title: "A", body: "B", url: "/planning" });
    for (const url of ["https://exemple.org", "//exemple.org", "javascript:alert(1)", undefined]) {
      expect(lireCorpsBroadcast({ title: "A", body: "B", url }).url, String(url)).toBe("/");
    }
    refus400(() => lireCorpsBroadcast({ title: "A" }), "title et body sont requis");
    refus400(() => lireCorpsBroadcast({ title: "", body: "B" }), "title et body sont requis");
  });

  test("rattachement : au plus 200 comptes", () => {
    const uids = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);
    expect(lireUidsRattachement({ uids: uids(UIDS_MAX) })).toHaveLength(UIDS_MAX);
    refus400(() => lireUidsRattachement({ uids: uids(UIDS_MAX + 1) }), "Trop de comptes");
    expect(lireUidsRattachement({ uids: ["a", 3, null, "b"] })).toEqual(["a", "b"]);
    refus400(() => lireUidsRattachement({}), "Requête incomplète");
    refus400(() => lireUidsRattachement({ uids: "a" }), "Requête incomplète");
  });

  test("release : année entière de 2026 à 2100, absente = année en cours", () => {
    const base = { key: "culte", tri: "T1" };
    for (const year of [2026, 2050, 2100]) expect(lireCorpsRelease({ ...base, year }).year, String(year)).toBe(year);
    for (const year of [2025, 2101, 2026.5, "2026", NaN, null]) refus400(() => lireCorpsRelease({ ...base, year }), "Année invalide");
    expect(lireCorpsRelease(base, 2027).year).toBe(2027);
    expect(lireCorpsRelease(base).year).toBe(new Date().getFullYear());
  });

  test("release : trimestre connu, publier par défaut", () => {
    expect(lireCorpsRelease({ key: "culte", tri: "T4" })).toMatchObject({ key: "culte", tri: "T4", publish: true });
    expect(lireCorpsRelease({ key: "culte", tri: "T2", publish: false }).publish).toBe(false);
    refus400(() => lireCorpsRelease({ key: "culte", tri: "T5" }), "Trimestre invalide");
    refus400(() => lireCorpsRelease({ key: "culte" }), "Trimestre invalide");
  });
});

test.describe("envois en double : la clé est réservée avant l'envoi (S8)", () => {
  /** Une route simulée : réserve, « envoie » après un tour d'attente, rend la clé si l'envoi échoue. */
  async function appel(db: FirebaseFirestore.Firestore, cle: string, envois: string[], echec = false) {
    if (!(await reserverEnvoi(db, cle, { at: Date.now() }))) return "deja";
    try {
      await new Promise((r) => setTimeout(r, 5));
      if (echec) throw new Error("push en panne");
      envois.push(cle);
      return "envoye";
    } catch {
      await rendreEnvoi(db, cle);
      return "echec";
    }
  }

  test("deux appels simultanés : un seul envoi", async () => {
    const { db } = baseSimulee();
    const envois: string[] = [];
    const rep = await Promise.all([appel(db, "evenement-e1", envois), appel(db, "evenement-e1", envois)]);
    expect(envois).toHaveLength(1);
    expect(rep.sort()).toEqual(["deja", "envoye"]);
  });

  test("un envoi qui échoue rend la clé : le suivant peut envoyer", async () => {
    const { db, collections } = baseSimulee();
    const envois: string[] = [];
    expect(await appel(db, "evenement-e2", envois, true)).toBe("echec");
    expect(collections.notifLog["evenement-e2"]).toBeUndefined();
    expect(await appel(db, "evenement-e2", envois)).toBe("envoye");
    expect(envois).toHaveLength(1);
  });

  test("create() écrit les champs donnés, et rien d'autre", async () => {
    const { db, collections } = baseSimulee();
    await reserverEnvoi(db, "evenement-e3", { at: 5, evenementId: "e3", pour: "toute", recipients: 4 });
    expect(collections.notifLog["evenement-e3"]).toEqual({ at: 5, evenementId: "e3", pour: "toute", recipients: 4 });
  });

  test("par uid : deux appels simultanés ne préviennent chaque personne qu'une fois", async () => {
    const { db, collections } = baseSimulee();
    const [a, b] = await Promise.all([
      reserverPourUids(db, ["u1", "u2"], "conflit-p-c1-c2", { programmeId: "p" }),
      reserverPourUids(db, ["u2", "u3"], "conflit-p-c1-c2", { programmeId: "p" }),
    ]);
    expect([...a, ...b].sort()).toEqual(["u1", "u2", "u3"]);
    expect(Object.keys(collections.notifLog).sort()).toEqual(["conflit-p-c1-c2-u1", "conflit-p-c1-c2-u2", "conflit-p-c1-c2-u3"]);
    expect(collections.notifLog["conflit-p-c1-c2-u1"]).toMatchObject({ programmeId: "p", uid: "u1" });
    await rendrePourUids(db, ["u1"], "conflit-p-c1-c2");
    expect(collections.notifLog["conflit-p-c1-c2-u1"]).toBeUndefined();
  });

  test("anti-doublon de notify-audience : repris passé la minute, bloqué avant", async () => {
    const { db, collections } = baseSimulee();
    const cle = "audience-abc";
    expect(await reserverEnvoi(db, cle, { at: Date.now(), uid: "u1" }, { delaiMs: 60_000 })).toBe(true);
    expect(await reserverEnvoi(db, cle, { at: Date.now(), uid: "u1" }, { delaiMs: 60_000 })).toBe(false);
    collections.notifLog[cle].at = Date.now() - 61_000;
    expect(await reserverEnvoi(db, cle, { at: Date.now(), uid: "u1" }, { delaiMs: 60_000 })).toBe(true);
  });

  test("verrou d'envoi : rendu seulement par l'appel qui le tient (jeton)", async () => {
    const { db, collections } = baseSimulee();
    const cle = "verrou-setlist-s1";
    const jetonA = await prendreVerrou(db, cle, { at: Date.now(), setlistId: "s1" }, 120_000);
    expect(jetonA).toBeTruthy();
    expect(await prendreVerrou(db, cle, { at: Date.now() }, 120_000)).toBeNull();
    // Le verrou de A est périmé et repris par B : le retour tardif de A ne le supprime pas.
    collections.notifLog[cle].at = Date.now() - 121_000;
    const jetonB = await prendreVerrou(db, cle, { at: Date.now(), setlistId: "s1" }, 120_000);
    expect(jetonB).toBeTruthy();
    expect(jetonB).not.toBe(jetonA);
    await rendreVerrou(db, cle, jetonA!);
    expect(collections.notifLog[cle]?.jeton).toBe(jetonB);
    await rendreVerrou(db, cle, jetonB!);
    expect(collections.notifLog[cle]).toBeUndefined();
    await rendreVerrou(db, cle, jetonB!);
  });
});

test.describe("planning/release : une seule notification par trimestre (D7)", () => {
  test("publier, masquer, republier : une seule notification", async () => {
    const { db, collections } = baseSimulee();
    const notifications: string[] = [];
    // La route : met à jour la liste des trimestres publiés, puis demande si elle doit notifier.
    let publies: string[] = [];
    async function bascule(publier: boolean) {
      const dejaPublie = publies.includes("T1");
      publies = publier ? [...new Set([...publies, "T1"])] : publies.filter((t) => t !== "T1");
      if (await doitNotifierPublication(db, "culte", 2027, "T1", "u1", { publier, dejaPublie })) notifications.push("T1");
    }
    await bascule(true);
    await bascule(false);
    await bascule(true);
    expect(notifications).toEqual(["T1"]);
    expect(collections.notifLog["release_culte_2027_T1"]).toMatchObject({ planning: "culte", year: 2027, tri: "T1" });
  });

  test("un envoi qui échoue rend la réservation : la publication suivante notifie", async () => {
    const { db } = baseSimulee();
    const etat = { publier: true, dejaPublie: false };
    expect(await doitNotifierPublication(db, "culte", 2027, "T3", "u1", etat)).toBe(true);
    await rendreEnvoi(db, "release_culte_2027_T3");
    expect(await doitNotifierPublication(db, "culte", 2027, "T3", "u1", etat)).toBe(true);
    expect(await doitNotifierPublication(db, "culte", 2027, "T3", "u1", { publier: false, dejaPublie: true })).toBe(false);
  });

  test("un autre trimestre ou une autre année notifie à nouveau", async () => {
    const { db } = baseSimulee();
    expect(await reserverPublication(db, "culte", 2027, "T1", "u1")).toBe(true);
    expect(await reserverPublication(db, "culte", 2027, "T2", "u1")).toBe(true);
    expect(await reserverPublication(db, "culte", 2028, "T1", "u1")).toBe(true);
  });
});
