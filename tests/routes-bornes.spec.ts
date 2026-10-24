import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { referenceRemplace } from "../src/lib/planning/prevenir";
import { appelantPeut, recalculerRattachement, lireEquipes, lireGroupes, referentsPermis } from "../src/lib/equipes/serveur";
import { uidsAChanger } from "../src/lib/equipes/organigramme";
import {
  MESSAGE_MAX, PAGE_URL_MAX, SLUG_MAX, TITRE_MAX, UIDS_MAX, cheminDeLaPage, lireCorpsAudience, lireCorpsBroadcast, lireCorpsNotifySetlist,
  lireCorpsRelease, lireCorpsReport, lireEquipeRattachement, lireUidsRattachement,
} from "../src/lib/push/bornes";
import { lienDeLaPage } from "../src/lib/report/lienPage";
import { HttpError } from "../src/lib/evenements/serveur";
import {
  REPRISE_CRON_MS, apresEnvoi, envoyerReserve, marquerEnvoye, notifierPublication, prendreVerrou, rendreEnvoi, rendrePourUids, rendreVerrou,
  reponseEnvoiEnCours, reserverEnvoi, reserverEnvoiJeton, reserverPourUids, reserverPourUidsJetons, reserverPuisEnvoyer, suivreReservations,
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
    /** L'équipe éditée (`null` : la route des groupes). */
    equipe: string | null = "louange",
  ) {
    const { db, collections } = baseSimulee({ users: profils, equipes });
    const peut = appelantPeut(admin, profils[appelant] ?? null, equipe);
    await recalculerRattachement(db, [cible], await lireEquipes(db), await lireGroupes(db), { peut, equipe });
    return collections.users[cible];
  }

  test("un référent de sous-équipe qui se coche référent de Louange : non recopié", async () => {
    const profils = {
      "u-ophelie": { dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-ophelie", true, { sousEquipes: ["musiciens"], referentSous: ["musiciens"] })] } };
    const profil = await recopie(profils, equipes, "u-ophelie", "u-ophelie");
    expect(profil.referentDe ?? []).not.toContain("louange");
  });

  test("un référent de sous-équipe qui se nomme référent d'une autre sous-équipe : non recopié", async () => {
    const profils = {
      "u-ophelie": { dansEquipes: ["louange"], sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-ophelie", false, { sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens", "choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-ophelie", "u-ophelie");
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
    const profil = await recopie(profils, equipes, "u-gilles", "u-fanny", false, "regie");
    expect(profil.referentDe).toEqual(["regie"]);
  });

  test("un admin nomme un référent : recopié", async () => {
    const profils = { "u-hugo": {} };
    const equipes = { regie: { membres: [membre("u-hugo", true)] } };
    const profil = await recopie(profils, equipes, "u-hugo", "u-admin", true, "regie");
    expect(profil.referentDe).toEqual(["regie"]);
  });

  test("le retrait d'une équipe par qui ne peut pas la nommer : l'id reste dans le profil", async () => {
    const profils = {
      "u-ophelie": { dansEquipes: ["louange"], referentDe: ["louange"] },
    };
    const equipes = { louange: { membres: [membre("u-ophelie", false)] } };
    const profil = await recopie(profils, equipes, "u-ophelie", "u-ivan");
    expect(profil.referentDe).toEqual(["louange"]);
  });

  test("le retrait d'une équipe par qui peut la nommer : appliqué", async () => {
    const profils = {
      "u-didier": { dansEquipes: ["louange"], referentDe: ["louange"] },
      "u-ophelie": { dansEquipes: ["louange"], referentDe: ["louange"] },
    };
    const equipes = { louange: { membres: [membre("u-didier", true), membre("u-ophelie", false)] } };
    const profil = await recopie(profils, equipes, "u-ophelie", "u-didier");
    expect(profil.referentDe).toEqual([]);
  });

  test("le retrait d'une sous-équipe : appliqué, même par qui ne peut rien nommer", async () => {
    const profils = {
      "u-ophelie": { dansEquipes: ["louange"], referentSous: ["musiciens"], sousEquipes: ["musiciens"] },
    };
    const equipes = { louange: { membres: [membre("u-ophelie", false, { sousEquipes: ["musiciens"] })] } };
    const profil = await recopie(profils, equipes, "u-ophelie", "u-ivan");
    expect(profil.referentSous).toEqual([]);
  });

  test("un comité : ajout et retrait libres, tirés des groupes", async () => {
    const profils = { "u-ophelie": { dansEquipes: ["comite-paix"], referentDe: ["comite-paix"] } };
    const profil = await recopie(profils, {}, "u-ophelie", "u-ivan", false, null);
    expect(profil.referentDe ?? []).toEqual([]);
  });

  test("referentsPermis : l'existant reste, le nouveau demande le droit, le retrait aussi", () => {
    expect(referentsPermis(["regie"], ["regie", "louange"], () => false)).toEqual(["regie"]);
    expect(referentsPermis(["regie"], ["regie", "louange"], (e) => e === "louange")).toEqual(["regie", "louange"]);
    expect(referentsPermis(["regie"], [], () => false)).toEqual(["regie"]);
    expect(referentsPermis(["regie"], [], (e) => e === "regie")).toEqual([]);
    expect(referentsPermis(["regie", "louange"], ["louange"], (e) => e === "louange")).toEqual(["louange", "regie"]);
    expect(referentsPermis(["musiciens"], [], () => false, true)).toEqual([]);
  });

  test("referentsPermis : un retrait refusé ne tient que si le compte figure encore dans l'équipe", () => {
    const encore = (e: string) => e === "regie";
    expect(referentsPermis(["regie", "medias"], [], () => false, false, encore)).toEqual(["regie"]);
    expect(referentsPermis(["medias"], [], () => false, false, () => false)).toEqual([]);
  });

  test("un référent Médias (non Orga) retire un co-référent de Médias : la ligne disparaît, le profil sort de l'équipe", async () => {
    const profils = {
      "u-noelle": { dansEquipes: ["medias"], referentDe: ["medias"] },
      "u-oscar": { dansEquipes: ["medias"], referentDe: ["medias"] },
    };
    // La ligne d'Oscar a été retirée de equipes/medias ; Noëlle (référente Médias) enregistre.
    const equipes = { medias: { membres: [membre("u-noelle", true)] } };
    const profil = await recopie(profils, equipes, "u-oscar", "u-noelle", false, "medias");
    expect(profil.referentDe ?? []).not.toContain("medias");
    expect(profil.dansEquipes ?? []).not.toContain("medias");
  });

  test("Orga modifie la ligne d'un compte dans Médias : la coche posée sur sa ligne Louange ne passe pas au profil", async () => {
    const profils = { "u-fanny": { dansEquipes: ["orga"] }, "u-pierre": { dansEquipes: ["medias"] } };
    const equipes = {
      medias: { membres: [membre("u-pierre", false)] },
      louange: { membres: [membre("u-pierre", true, { sousEquipes: ["choristes"], referentSous: ["choristes"] })] },
    };
    const profil = await recopie(profils, equipes, "u-pierre", "u-fanny", false, "medias");
    expect(profil.referentDe ?? []).not.toContain("louange");
    expect(profil.referentSous ?? []).toEqual([]);
  });

  test("un admin qui enregistre un groupe où le compte est cité : la coche référent d'une équipe ne passe pas non plus", async () => {
    const profils = { "u-pierre": { dansEquipes: ["louange"] } };
    const equipes = { louange: { membres: [membre("u-pierre", true, { referentSous: ["choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-pierre", "u-admin", true, null);
    expect(profil.referentDe ?? []).not.toContain("louange");
    expect(profil.referentSous ?? []).toEqual([]);
  });

  test("rattachement : l'équipe éditée est requise et connue", () => {
    expect(lireEquipeRattachement({ uids: [], equipe: "medias" })).toBe("medias");
    refus400(() => lireEquipeRattachement({ uids: [] }), "Équipe inconnue");
    refus400(() => lireEquipeRattachement({ equipe: "pirates" }), "Équipe inconnue");
    refus400(() => lireEquipeRattachement({ equipe: 3 }), "Équipe inconnue");
  });

  test("uidsAChanger : seules les lignes ajoutées, retirées ou modifiées", () => {
    const avant = [membre("u-a", false), membre("u-b", true), membre("u-c", false), membre("", false, { nom: "Sans compte" })];
    const apres = [membre("u-a", false), membre("u-b", false), membre("u-d", false), membre("", false, { nom: "Autre sans compte" })];
    expect(uidsAChanger(avant, apres).sort()).toEqual(["u-b", "u-c", "u-d"]);
    expect(uidsAChanger(avant, avant)).toEqual([]);
    expect(uidsAChanger([], [])).toEqual([]);
  });

  test("la recopie appelée par un président de groupe ne recopie pas un nouveau référent d'équipe", async () => {
    const profils = {
      "u-jade": { dansEquipes: ["comite-paix"], referentDe: ["comite-paix"] },
      "u-karim": { dansEquipes: ["louange"] },
    };
    const equipes = { louange: { membres: [membre("u-karim", true, { sousEquipes: ["choristes"], referentSous: ["choristes"] })] } };
    const profil = await recopie(profils, equipes, "u-karim", "u-jade", false, null);
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
  /** Le chemin de notify-audience : la fonction de src/lib que la route appelle (`envoyerReserve`). */
  async function appel(db: FirebaseFirestore.Firestore, cle: string, envois: string[], echec = false) {
    try {
      const r = await envoyerReserve(db, cle, { at: Date.now() }, {}, async () => {
        await new Promise((res) => setTimeout(res, 5));
        if (echec) throw new Error("push en panne");
        envois.push(cle);
      });
      return r.pris ? "envoye" : "deja";
    } catch {
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

  test("par uid : deux appels simultanés ne préviennent chaque personne qu'une fois", async () => {
    const { db, collections } = baseSimulee();
    const [a, b] = await Promise.all([
      reserverPourUids(db, ["u1", "u2"], "conflit-p-c1-c2", { programmeId: "p" }),
      reserverPourUids(db, ["u2", "u3"], "conflit-p-c1-c2", { programmeId: "p" }),
    ]);
    expect([...a, ...b].sort()).toEqual(["u1", "u2", "u3"]);
    expect(Object.keys(collections.notifLog).sort()).toEqual(["conflit-p-c1-c2-u1", "conflit-p-c1-c2-u2", "conflit-p-c1-c2-u3"]);
    expect(collections.notifLog["conflit-p-c1-c2-u1"]).toMatchObject({ programmeId: "p", uid: "u1" });
    const jetons = await reserverPourUidsJetons(db, ["u9"], "conflit-p-c1-c2", {});
    await rendrePourUids(db, jetons, "conflit-p-c1-c2");
    expect(collections.notifLog["conflit-p-c1-c2-u9"]).toBeUndefined();
    expect(collections.notifLog["conflit-p-c1-c2-u1"]).toBeDefined();
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
  /** La route : demande à la fonction de src/lib (notifierPublication) quoi faire, et lui passe l'envoi. */
  function publication(db: FirebaseFirestore.Firestore, notifications: string[], tri = "T1") {
    return async (publier: boolean, envoi: (parti: () => void) => Promise<void> = async (parti) => { parti(); notifications.push(tri); }) =>
      notifierPublication(db, { planning: "culte", annee: 2027, tri, uid: "u1", publier }, envoi);
  }

  test("publier, masquer, republier : une seule notification, la republication est « déjà annoncée »", async () => {
    const { db, collections } = baseSimulee();
    const notifications: string[] = [];
    const bascule = publication(db, notifications);
    expect(await bascule(true)).toEqual({ notified: true, dejaAnnonce: false, partiel: false });
    expect(await bascule(false)).toEqual({ notified: false, dejaAnnonce: false, partiel: false });
    expect(await bascule(true)).toEqual({ notified: false, dejaAnnonce: true, partiel: false });
    expect(notifications).toEqual(["T1"]);
    expect(collections.notifLog["release_culte_2027_T1"]).toMatchObject({ planning: "culte", year: 2027, tri: "T1" });
  });

  test("un envoi qui lève avant tout envoi rend la clé : republier notifie (le réessai)", async () => {
    const { db, collections } = baseSimulee();
    const notifications: string[] = [];
    const bascule = publication(db, notifications, "T2");
    await expect(bascule(true, async () => { throw new Error("push en panne"); })).rejects.toThrow("push en panne");
    expect(collections.notifLog["release_culte_2027_T2"]).toBeUndefined();
    expect((await bascule(true)).notified).toBe(true);
    expect((await bascule(true)).notified).toBe(false);
    expect(notifications).toEqual(["T2"]);
  });

  test("un envoi qui lève après un premier envoi réussi : la clé reste, la route répond notified (journal)", async () => {
    const { db, collections } = baseSimulee();
    const erreurs: unknown[][] = [];
    const avant = console.error;
    console.error = (...a: unknown[]) => { erreurs.push(a); };
    try {
      const bascule = publication(db, []);
      const r = await bascule(true, async (parti) => { parti(); throw new Error("2e fournée en panne"); });
      expect(r).toEqual({ notified: true, dejaAnnonce: false, partiel: true });
      // Republier ne renotifie pas : la première fournée est partie.
      expect((await bascule(true)).dejaAnnonce).toBe(true);
    } finally {
      console.error = avant;
    }
    expect(erreurs).toHaveLength(1);
    expect(collections.notifLog["release_culte_2027_T1"]).toBeDefined();
  });

  test("masquer ne notifie jamais, et ne réserve rien", async () => {
    const { db, collections } = baseSimulee();
    const r = await publication(db, [], "T3")(false);
    expect(r.notified).toBe(false);
    expect(collections.notifLog["release_culte_2027_T3"]).toBeUndefined();
  });

  test("un autre trimestre ou une autre année notifie à nouveau", async () => {
    const { db } = baseSimulee();
    const envoi = async (parti: () => void) => { parti(); };
    const tri = (annee: number, t: string) => notifierPublication(db, { planning: "culte", annee, tri: t, uid: "u1", publier: true }, envoi);
    expect((await tri(2027, "T1")).notified).toBe(true);
    expect((await tri(2027, "T2")).notified).toBe(true);
    expect((await tri(2028, "T1")).notified).toBe(true);
  });
});

test.describe("réservation : reprises, jeton, échecs partiels (A2 bis)", () => {
  const alreadyExists = () => Object.assign(new Error("6 ALREADY_EXISTS"), { code: 6 });

  test("un commit rejoué par le SDK : le jeton reconnaît notre réservation", async () => {
    const base = baseSimulee();
    let rejoue = true;
    const db = {
      collection: (nom: string) => ({
        doc: (id: string) => ({
          ...base.db.collection(nom).doc(id),
          // Le commit passe, mais la réponse se perd et le SDK le rejoue : ALREADY_EXISTS pour notre propre document.
          create: async (d: Record<string, unknown>) => {
            await base.db.collection(nom).doc(id).create(d);
            if (rejoue) { rejoue = false; throw alreadyExists(); }
          },
        }),
      }),
      runTransaction: base.db.runTransaction.bind(base.db),
    } as unknown as FirebaseFirestore.Firestore;
    expect(await reserverEnvoi(db, "audience-x", { at: 1 })).toBe(true);
    // Un autre appel, lui, voit un document qui n'est pas le sien.
    expect(await reserverEnvoi(db, "audience-x", { at: 2 })).toBe(false);
  });

  test("create() écrit les champs donnés et un jeton de création", async () => {
    const { db, collections } = baseSimulee();
    await reserverEnvoi(db, "evenement-e3", { at: 5, evenementId: "e3" });
    const { jetonCreation, ...reste } = collections.notifLog["evenement-e3"];
    expect(reste).toEqual({ at: 5, evenementId: "e3" });
    expect(typeof jetonCreation).toBe("string");
  });

  test("deux reprises simultanées d'un verrou périmé : une seule réussit", async () => {
    const { db, collections } = baseSimulee({ notifLog: { "verrou-setlist-s9": { at: Date.now() - 200_000 } } });
    const reprise = () => reserverEnvoi(db, "verrou-setlist-s9", { at: Date.now() }, { delaiMs: 120_000 });
    const resultats = await Promise.all([reprise(), reprise()]);
    expect([...resultats].sort()).toEqual([false, true]);
    expect(collections.notifLog["verrou-setlist-s9"].at).toBeGreaterThan(Date.now() - 5_000);
  });

  test("reserverPourUids : si une réservation lève, les autres sont rendues puis l'erreur est relancée", async () => {
    const base = baseSimulee();
    const db = {
      collection: (nom: string) => ({
        doc: (id: string) => ({
          ...base.db.collection(nom).doc(id),
          create: async (d: Record<string, unknown>) => {
            if (id.endsWith("-u2")) { await new Promise((r) => setTimeout(r, 10)); throw new Error("Firestore en panne"); }
            await base.db.collection(nom).doc(id).create(d);
          },
        }),
      }),
      runTransaction: base.db.runTransaction.bind(base.db),
    } as unknown as FirebaseFirestore.Firestore;
    await expect(reserverPourUids(db, ["u1", "u2", "u3"], "cle", {})).rejects.toThrow("Firestore en panne");
    expect(Object.keys(base.collections.notifLog)).toEqual([]);
  });

  test("reserverPuisEnvoyer : l'envoi qui lève rend les clés des comptes pas encore envoyés", async () => {
    const { db, collections } = baseSimulee();
    await expect(reserverPuisEnvoyer(db, ["u1", "u2"], "tache-fait", { a: 1 }, async (fresh, envoyes) => {
      envoyes.add(fresh[0]);
      throw new Error("push en panne");
    })).rejects.toThrow("push en panne");
    expect(Object.keys(collections.notifLog)).toEqual(["tache-fait-u1"]);
  });

  test("une écriture après l'envoi qui échoue se journalise : la clé reste, pas d'erreur", async () => {
    const { db, collections } = baseSimulee();
    const erreurs: unknown[][] = [];
    const avant = console.error;
    console.error = (...a: unknown[]) => { erreurs.push(a); };
    try {
      const r = await envoyerReserve(db, "audience-ok", { at: 1 }, {}, async () => "parti", async () => { throw new Error("cloche"); });
      expect(r).toEqual({ pris: true, valeur: "parti" });
      await apresEnvoi(async () => { throw new Error("autre"); }, "test");
    } finally {
      console.error = avant;
    }
    expect(erreurs).toHaveLength(2);
    expect(collections.notifLog["audience-ok"]).toBeDefined();
    const uids = await reserverPuisEnvoyer(db, ["u1"], "conflit", {}, async (fresh, envoyes) => {
      envoyes.add(fresh[0]);
      await apresEnvoi(async () => { throw new Error("cloche"); }, "test").catch(() => undefined);
    });
    expect(uids).toEqual(["u1"]);
    expect(collections.notifLog["conflit-u1"]).toBeDefined();
  });

  test("relecture après ALREADY_EXISTS : un réessai si le get échoue une fois ; deux échecs rendent la clé et lèvent", async () => {
    const montage = (echecsGet: number) => {
      const base = baseSimulee();
      let reste = echecsGet;
      const db = {
        collection: (nom: string) => ({
          doc: (id: string) => ({
            ...base.db.collection(nom).doc(id),
            // Le commit passe, la réponse se perd (ALREADY_EXISTS), puis la relecture échoue `echecsGet` fois.
            create: async (d: Record<string, unknown>) => { await base.db.collection(nom).doc(id).create(d); throw alreadyExists(); },
            get: async () => { if (reste-- > 0) throw new Error("réseau"); return base.db.collection(nom).doc(id).get(); },
          }),
        }),
        runTransaction: base.db.runTransaction.bind(base.db),
      } as unknown as FirebaseFirestore.Firestore;
      return { db, base };
    };
    const un = montage(1);
    expect(await reserverEnvoi(un.db, "audience-r", { at: 1 })).toBe(true);
    const deux = montage(2);
    await expect(reserverEnvoi(deux.db, "audience-r", { at: 1 })).rejects.toThrow("réseau");
    expect(deux.base.collections.notifLog["audience-r"]).toBeUndefined();
  });

  test("rendreEnvoi : seulement si la réservation porte le jeton de l'appelant", async () => {
    const { db, collections } = baseSimulee();
    const jetonA = await reserverEnvoiJeton(db, "audience-j", { at: 1 });
    expect(jetonA).toBeTruthy();
    // La réservation de A est reprise par B (délai passé) : le retour tardif de A ne la supprime pas.
    collections.notifLog["audience-j"].at = Date.now() - 61_000;
    const jetonB = await reserverEnvoiJeton(db, "audience-j", { at: Date.now() }, { delaiMs: 60_000 });
    expect(jetonB).toBeTruthy();
    await rendreEnvoi(db, "audience-j", jetonA!);
    expect(collections.notifLog["audience-j"]?.jetonCreation).toBe(jetonB);
    await rendreEnvoi(db, "audience-j", jetonB!);
    expect(collections.notifLog["audience-j"]).toBeUndefined();
  });

  test("rendrePourUids : ne supprime que les réservations qui sont encore les siennes", async () => {
    const { db, collections } = baseSimulee();
    const jetons = await reserverPourUidsJetons(db, ["u1", "u2"], "tache-x", {});
    // La réservation de u2 a été reprise par un autre appel.
    collections.notifLog["tache-x-u2"] = { at: 1, jetonCreation: "autre" };
    await rendrePourUids(db, jetons, "tache-x");
    expect(collections.notifLog["tache-x-u1"]).toBeUndefined();
    expect(collections.notifLog["tache-x-u2"]).toBeDefined();
  });

  test("cron : `at` à la réservation, `envoyeLe` après l'envoi ; sans `envoyeLe` la clé est reprise après 5 minutes", async () => {
    const { db, collections } = baseSimulee();
    const premier = suivreReservations(db);
    expect(await premier.reserver(["u1", "u2"], "rappel-J1-2027-02-07", { kind: "service" })).toEqual(["u1", "u2"]);
    expect(collections.notifLog["rappel-J1-2027-02-07-u1"].at).toBeGreaterThan(Date.now() - 5_000);
    expect(collections.notifLog["rappel-J1-2027-02-07-u1"].envoyeLe).toBeUndefined();
    // u1 est prévenu, le passage meurt avant u2.
    premier.envoye("u1", ["rappel-J1-2027-02-07"]);
    await premier.terminer();
    expect(collections.notifLog["rappel-J1-2027-02-07-u1"].envoyeLe).toBeGreaterThan(Date.now() - 5_000);
    expect(collections.notifLog["rappel-J1-2027-02-07-u2"].envoyeLe).toBeUndefined();
    // Un passage plus tôt que 5 minutes ne reprend rien.
    expect(await suivreReservations(db).reserver(["u1", "u2"], "rappel-J1-2027-02-07", { kind: "service" })).toEqual([]);
    // Passé 5 minutes : u2 (sans envoyeLe) est repris, u1 (envoyeLe) ne l'est jamais.
    for (const u of ["u1", "u2"]) collections.notifLog[`rappel-J1-2027-02-07-${u}`].at = Date.now() - REPRISE_CRON_MS - 1_000;
    expect(await suivreReservations(db).reserver(["u1", "u2"], "rappel-J1-2027-02-07", { kind: "service" })).toEqual(["u2"]);
  });

  test("marquerEnvoye : ne marque que sa propre réservation", async () => {
    const { db, collections } = baseSimulee();
    const jeton = await reserverEnvoiJeton(db, "cle-m", { at: 1 });
    await marquerEnvoye(db, "cle-m", "pas-le-notre");
    expect(collections.notifLog["cle-m"].envoyeLe).toBeUndefined();
    await marquerEnvoye(db, "cle-m", jeton!);
    expect(collections.notifLog["cle-m"].envoyeLe).toBeGreaterThan(0);
  });

  test("cron : les clés sont réservées à la lecture, un second passage ne retrouve personne, un envoi levé rend", async () => {
    const { db, collections } = baseSimulee();
    const passage = async () => {
      const reservations = suivreReservations(db);
      const services = await reservations.reserver(["u1", "u2"], "rappel-J1-2027-01-10", { tag: "J1", date: "2027-01-10", kind: "service" });
      const petitDej = await reservations.reserver(["u1"], "petit-dej-libre-2027-01-10", { kind: "petitDej" });
      return { reservations, services, petitDej };
    };
    const un = await passage();
    const deux = await passage();
    expect(un.services).toEqual(["u1", "u2"]);
    expect(deux.services).toEqual([]);
    expect(collections.notifLog["rappel-J1-2027-01-10-u1"]).toMatchObject({ tag: "J1", date: "2027-01-10", kind: "service", uid: "u1" });
    // u1 est prévenu, l'envoi de u2 lève : seule la clé de u2 est rendue.
    un.reservations.envoye("u1", ["rappel-J1-2027-01-10", "petit-dej-libre-2027-01-10"]);
    await un.reservations.rendreRestantes();
    expect(Object.keys(collections.notifLog).sort()).toEqual(["petit-dej-libre-2027-01-10-u1", "rappel-J1-2027-01-10-u1"]);
  });
});

test.describe("décisions de routes (A2 bis)", () => {
  test("notify-setlist : verrou tenu par un autre appel → « busy » en auto, 409 en manuel", async () => {
    const { db } = baseSimulee();
    expect(await prendreVerrou(db, "verrou-setlist-s1", { at: Date.now() }, 120_000)).toBeTruthy();
    expect(await prendreVerrou(db, "verrou-setlist-s1", { at: Date.now() }, 120_000)).toBeNull();
    expect(reponseEnvoiEnCours(true)).toEqual({ status: 200, corps: { ok: true, skipped: "busy" } });
    expect(reponseEnvoiEnCours(false)).toEqual({ status: 409, corps: { error: "Envoi en cours, réessaie dans un instant", code: "busy" } });
  });

  test("report : pageUrl = chemin de la même origine, borné, sinon vide", () => {
    const origine = "https://louange.exemple.org";
    expect(cheminDeLaPage(`${origine}/chants/abc-1?x=1#haut`, origine)).toBe("/chants/abc-1?x=1");
    // Un chant au nom non ASCII : les « % » sont gardés.
    expect(cheminDeLaPage(`${origine}/songs/caf%C3%A9-noel`, origine)).toBe("/songs/caf%C3%A9-noel");
    expect(cheminDeLaPage(`${origine}/`, origine)).toBe("/");
    expect(cheminDeLaPage("https://autre.exemple.org/chants/abc", origine)).toBe("");
    expect(cheminDeLaPage("javascript:alert(1)", origine)).toBe("");
    expect(cheminDeLaPage("pas une url", origine)).toBe("");
    expect(cheminDeLaPage(null, origine)).toBe("");
    expect(cheminDeLaPage(`${origine}/${"a".repeat(PAGE_URL_MAX + 100)}`, origine)).toHaveLength(PAGE_URL_MAX);
  });

  test("report : le lien « Page » n'est rendu que pour un chemin du site ou son origine", () => {
    const origine = "https://louange.exemple.org";
    expect(lienDeLaPage("/songs/caf%C3%A9?x=1", origine)).toBe("/songs/caf%C3%A9?x=1");
    expect(lienDeLaPage(`${origine}/chants/abc`, origine)).toBe(`${origine}/chants/abc`);
    for (const v of ["//autre.exemple.org/x", "https://autre.exemple.org/x", "javascript:alert(1)", `${origine}.autre.org/x`, "texte"]) {
      expect(lienDeLaPage(v, origine), v).toBeNull();
    }
  });

  /** Chaque route appelle la fonction de src/lib que les tests ci-dessus exercent : retirer la garde la fait rougir. */
  const routes: [string, string[]][] = [
    ["src/app/api/equipes/rattachement/route.ts", ["appelantPeut(", "recalculerRattachement(", "lireEquipeRattachement("]],
    ["src/app/api/equipes/groupes/route.ts", ["appelantPeut(", "recalculerRattachement("]],
    ["src/app/api/push/notify-audience/route.ts", ["envoyerReserve("]],
    ["src/app/api/scene/conflit/route.ts", ["reserverPuisEnvoyer("]],
    ["src/app/api/taches/fait/route.ts", ["reserverPuisEnvoyer("]],
    ["src/app/api/setlist/presentation/route.ts", ["reserverPuisEnvoyer("]],
    ["src/app/api/planning/release/route.ts", ["notifierPublication(", "apresEnvoi("]],
    ["src/app/api/push/notify-evenement/route.ts", ["envoyerReserve(", "apresEnvoi("]],
    ["src/app/api/taches/assigne/route.ts", ["envoyerReserve(", "apresEnvoi("]],
    ["src/app/api/push/notify-setlist/route.ts", ["prendreVerrou(", "reponseEnvoiEnCours(", "maxDuration = 60"]],
    ["src/app/api/report/route.ts", ["cheminDeLaPage("]],
    ["src/app/api/cron/reminders/route.ts", ["suivreReservations(", "reservations.reserver(", "rendreRestantes(", "reservations.terminer(", "lireAvecRelecture("]],
  ];
  for (const [fichier, appels] of routes) {
    test(`${fichier} appelle ${appels.join(", ")}`, () => {
      const source = readFileSync(fichier, "utf8");
      for (const appel of appels) expect(source, appel).toContain(appel);
    });
  }

  test("le cron ne marque plus ses clés après l'envoi (markNotified retiré)", () => {
    expect(readFileSync("src/app/api/cron/reminders/route.ts", "utf8")).not.toContain("markNotified");
  });
});

// A2 ter : « Prévenir des changements » — la référence suit la notification (src/lib/planning/prevenir.ts).
test.describe("planning/changements : la référence d'une publication notifiée remplace toujours l'état", () => {
  const etat = (publieLe?: string) => ({ cases: { "2026-10-04|orateur": "Pasteur Ilan" }, ...(publieLe ? { publieLe } : {}) });
  test("apresPublication (envoyé seulement si la publication a notifié) : remplace, avec ou sans état, avec ou sans publieLe", () => {
    expect(referenceRemplace({ apresPublication: true }, undefined)).toBe(true);
    expect(referenceRemplace({ apresPublication: true }, etat())).toBe(true);
    expect(referenceRemplace({ apresPublication: true }, etat("2026-09-28"))).toBe(true);
  });
  test("siAbsent : seulement sans état", () => {
    expect(referenceRemplace({ siAbsent: true }, undefined)).toBe(true);
    expect(referenceRemplace({ siAbsent: true }, etat("2026-09-28"))).toBe(false);
    expect(referenceRemplace({ siAbsent: true }, etat())).toBe(false);
  });
  test("cas A : 1re publication depuis le panneau (sans référence), amorce siAbsent, puis republication déjà annoncée : les corrections restent", () => {
    // Le panneau « Publier un planning » n'envoie jamais de référence ; l'amorce écrit l'état sans publieLe.
    const amorce = referenceRemplace({ siAbsent: true }, undefined);
    expect(amorce).toBe(true);
    const apresAmorce = etat();
    // Masquer, corriger, republier : la route répond dejaAnnonce, la grille n'envoie rien ; une nouvelle amorce ne remplace pas non plus.
    expect(referenceRemplace({ siAbsent: true }, apresAmorce)).toBe(false);
  });
  test("la route passe par referenceRemplace", () => {
    expect(readFileSync("src/app/api/planning/changements/route.ts", "utf8")).toContain("referenceRemplace(body, existant)");
  });
  test("la grille n'envoie la référence que si la publication a notifié", () => {
    for (const page of ["src/app/planning/culte/page.tsx", "src/app/planning/groupes/page.tsx"]) {
      expect(readFileSync(page, "utf8"), page).toContain("&& notified) setPublications");
    }
    expect(readFileSync("src/components/planning/BoutonPublication.tsx", "utf8")).toContain("data.notified === true");
  });
});
