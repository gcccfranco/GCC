import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  canDeleteSetlist, canDuplicateSetlist, canEditSetlist, canSeeSetlist, canSetSetlistTeam,
  canSetPresentationLink, estRegieDeFete, ADMIN_EMAILS,
} from "../src/lib/access";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { UserProfile } from "../src/types/user";
import type { OrganigrammeGroupe } from "../src/types/groupe";
import type { PlanningEddFete } from "../src/lib/fetes/droits";
import { droitsDeLEdition, ecrireMusiques, lireContexteFetes, saisirChants } from "../src/lib/fetes/serveur";
import { FieldValue } from "firebase-admin/firestore";

// Lot « chants des fêtes » (docs/spec-chants-fetes.md), tranche CF-B : droits et routes serveur.
// Noms fictifs.

const profil = (o: Partial<UserProfile> = {}): UserProfile =>
  ({ firstName: "Test", lastName: "T.", serviceRoles: {}, ...o }) as UserProfile;

const fete = (o: Partial<FSSetlist> = {}): FSSetlist =>
  ({
    id: "noel-2026-k3f9x2ab", title: "Noël 2026 · Gp Paix", leader: "Ruth K.", category: "Noël", date: "2026-12-24",
    language: "fr", notes: "", createdAt: null, items: [], isDraft: false, isPrivate: false, ownerId: null,
    editeurs: ["edit"], fete: { programme: "noel-2026", passage: "k3f9x2ab", qui: "Gp Paix" }, ...o,
  }) as FSSetlist;

const ordinaire = (o: Partial<FSSetlist> = {}): FSSetlist => fete({ fete: undefined, category: "Groupe Paix", ...o });

const u = (uid: string, email = `${uid}@example.com`) => ({ uid, email });

test.describe("CF-B · droits côté client sur une setlist de fête (CF12, décisions 32, 39)", () => {
  test("tout connecté voit une setlist de fête, même sans catégorie", () => {
    expect(canSeeSetlist(u("membre"), profil(), fete())).toBe(true);
    expect(canSeeSetlist(u("membre"), profil(), ordinaire())).toBe(false);
  });

  test("un éditeur modifie mais ne supprime pas", () => {
    const s = fete();
    expect(canEditSetlist(u("edit"), profil(), s)).toBe(true);
    expect(canDeleteSetlist(u("edit"), profil(), s)).toBe(false);
  });

  test("un membre quelconque ne modifie ni ne supprime", () => {
    expect(canEditSetlist(u("membre"), profil(), fete())).toBe(false);
    expect(canDeleteSetlist(u("membre"), profil(), fete())).toBe(false);
  });

  test("la coordination non admin modifie et supprime ; l'admin aussi", () => {
    const coord = profil({ coordination: true });
    expect(canEditSetlist(u("coord"), coord, fete())).toBe(true);
    expect(canDeleteSetlist(u("coord"), coord, fete())).toBe(true);
    expect(canDeleteSetlist(u("adm", ADMIN_EMAILS[0]), profil(), fete())).toBe(true);
  });

  test("la coordination ne supprime pas une setlist ordinaire des autres", () => {
    expect(canDeleteSetlist(u("coord"), profil({ coordination: true }), ordinaire())).toBe(false);
  });

  test("une setlist de fête ne se duplique pas, admin compris", () => {
    expect(canDuplicateSetlist(u("adm", ADMIN_EMAILS[0]), profil(), fete())).toBe(false);
    expect(canDuplicateSetlist(u("adm", ADMIN_EMAILS[0]), profil(), ordinaire())).toBe(true);
  });

  test("l'équipe d'une setlist de fête n'est pas choisie par le navigateur, même par un admin", () => {
    expect(canSetSetlistTeam(u("adm", ADMIN_EMAILS[0]), profil(), fete())).toBe(false);
    expect(canSetSetlistTeam(u("adm", ADMIN_EMAILS[0]), profil(), ordinaire())).toBe(true);
  });
});

test.describe("CF-B · TEAM RÉGIE et lien de présentation (CF27)", () => {
  test("estRegieDeFete : TEAM RÉGIE sur une setlist de fête seulement", () => {
    expect(estRegieDeFete(profil({ dansEquipes: ["regie"] }), fete())).toBe(true);
    expect(estRegieDeFete(profil({ dansEquipes: ["regie"] }), ordinaire())).toBe(false);
    expect(estRegieDeFete(profil({ serviceRoles: { Campus: ["regie"] } }), fete())).toBe(false);
    expect(estRegieDeFete(null, fete())).toBe(false);
  });

  test("canSetPresentationLink : la régie de fête pose le lien sans pouvoir modifier", () => {
    const s = fete();
    const regie = estRegieDeFete(profil({ dansEquipes: ["regie"] }), s);
    expect(canSetPresentationLink(u("regie"), profil({ dansEquipes: ["regie"] }), s, regie)).toBe(true);
    expect(canSetPresentationLink(u("membre"), profil(), s, false)).toBe(false);
  });
});

test.describe("CF-B · firestore.rules, bloc setlists (miroir, texte)", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const bloc = rules.slice(rules.indexOf("match /setlists/{id}"), rules.indexOf("// Harmonie (lot 9"));

  test("canDeleteSetlistDoc : la branche fête est réservée à la coordination", () => {
    const f = rules.slice(rules.indexOf("function canDeleteSetlistDoc"), rules.indexOf("function canEditSetlistDoc"));
    expect(f).toMatch(/setlist\.get\('fete', null\) != null && isCoordination\(\)/);
  });

  test("allow create refuse fete et les catégories Noël et Pâques", () => {
    const create = /allow create:[\s\S]*?;/.exec(bloc)?.[0] ?? "";
    expect(create).toMatch(/'fete' in request\.resource\.data/);
    expect(create).toMatch(/\['Noël', 'Pâques'\]/);
  });

  test("allow update : fete jamais posé ni retiré, catégorie de fête figée, editeurs et rolesPartage inchangés pour une fête", () => {
    const update = bloc.slice(bloc.indexOf("allow update:"), bloc.indexOf("allow delete:"));
    expect(update).toMatch(/request\.resource\.data\.get\('fete', null\) == resource\.data\.get\('fete', null\)/);
    expect(update).toMatch(/\['Noël', 'Pâques'\]/);
    expect(update).toMatch(/resource\.data\.get\('fete', null\) == null[\s\S]*?hasAny\(\['editeurs', 'rolesPartage'\]\)/);
    expect(update).toMatch(/get\('isPrivate', false\) == false/);
  });
});

// ─── Serveur : fausse base Admin (patron de tests/organigrammes-groupes.spec.ts, avec transactions) ──

type Docs = Record<string, Record<string, Record<string, unknown>>>;

/** Une transaction refuse une lecture faite après une écriture, comme celle du SDK Admin. */
function fausseBase(docs: Docs) {
  const ecrits: { chemin: string; data: Record<string, unknown>; op: "set" | "update" }[] = [];
  const ref = (nom: string, id: string) => ({
    _nom: nom, _id: id,
    get: async () => ({ exists: id in (docs[nom] ?? {}), data: () => docs[nom]?.[id] }),
  });
  const ecrire = (r: { _nom: string; _id: string }, data: Record<string, unknown>, op: "set" | "update") => {
    ecrits.push({ chemin: `${r._nom}/${r._id}`, data, op });
    docs[r._nom] ??= {};
    docs[r._nom][r._id] = op === "set" ? data : { ...docs[r._nom][r._id], ...data };
  };
  const db = {
    collection: (nom: string) => ({
      get: async () => ({ docs: Object.entries(docs[nom] ?? {}).map(([id, d]) => ({ id, data: () => d })) }),
      doc: (id: string) => ref(nom, id),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      let ecrit = false;
      const tx = {
        get: async (r: ReturnType<typeof ref>) => {
          if (ecrit) throw new Error("lecture après écriture");
          return r.get();
        },
        set: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => { ecrit = true; ecrire(r, data, "set"); },
        update: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => { ecrit = true; ecrire(r, data, "update"); },
      };
      return fn(tx);
    },
  } as unknown as FirebaseFirestore.Firestore;
  return { db, ecrits, docs };
}

const T = (uid: string) => ({ nom: uid, uid });
const GROUPE_PAIX: Omit<OrganigrammeGroupe, "id"> = {
  president: T("ruth"), vp: [T("lea")],
  roles: [{ id: "r1", nom: "Orateurs", nomZh: "", places: null, comite: false, colonne: "orateur", droits: { remplir: false, publier: false, notifier: false, saisirFetes: true }, titulaires: [T("mei"), { nom: "Sans compte", uid: "" }] }],
  updatedAt: "", parUid: "", parNom: "",
};
const EDD: PlanningEddFete = { P6_NovDec: { classes: { "中班": [["2026-11-29", "Dan O.", "", "", "", "", ""]] } } };
const UTILISATEURS: Docs["users"] = {
  ruth: { groupe: "paix", email: "ruth@example.com", firstName: "Ruth", lastName: "Kamga", planningName: "Ruth K." },
  lea: { groupe: "paix", email: "lea@example.com", firstName: "Léa", lastName: "Martin" },
  mei: { groupe: "paix", email: "mei@example.com", firstName: "Mei", lastName: "Zhang" },
  hugo: { groupe: "paix", email: "hugo@example.com", firstName: "Hugo", lastName: "Lemaire" },
  dan: { email: "dan@example.com", firstName: "Dan", lastName: "Olsen", planningName: "Dan O." },
  coord: { email: "coord@example.com", firstName: "Cora", lastName: "Dupont", coordination: true },
  membre: { email: "membre@example.com", firstName: "Mo", lastName: "Meunier" },
};
const PASSAGES = () => [
  { id: "aaaaaaaa", quoi: "Chant", qui: ["Gp Paix"], titre: "Lumière dans la nuit" },
  { id: "bbbbbbbb", quoi: "Spectacle", qui: ["EDD 中班", "EDD 大班"], titre: "Les bergers" },
  { quoi: "Danse", qui: ["EDD 中班"], titre: "Sans identifiant" },
];
const base = () =>
  fausseBase({
    users: JSON.parse(JSON.stringify(UTILISATEURS)),
    groupes: { paix: GROUPE_PAIX as unknown as Record<string, unknown> },
    programmes: { "noel-2026": { fete: "noel", annee: 2026, jourJ: "2026-12-24", passages: PASSAGES() }, "scene-hiver": { nom: "Hiver", jourJ: "2026-02-01", passages: [] } },
    setlists: {},
  });
const app = (uid: string, email = `${uid}@example.com`) => ({ uid, email });
const AVANT = "2026-12-20";

test.describe("CF-B · contexte, droits, saisir, musiques (CF1, CF16-CF18, CF23) — fausse base", () => {
  test("lireContexteFetes lit un vrai document groupes/{id} du lot 2 : Gp Paix → président, mei (rôle coché) ; l'uid vide est ignoré", async () => {
    const { db } = base();
    const ctx = await lireContexteFetes(db, "2026-12-24", EDD, app("ruth"));
    expect(ctx.groupes.paix.president?.uid).toBe("ruth");
    expect(ctx.profils.find((p) => p.uid === "ruth")?.groupe).toBe("paix");
    const d = await droitsDeLEdition(db, app("mei"), "noel-2026", EDD, AVANT);
    expect(d[0]).toEqual({ id: "aaaaaaaa", chants: true, musiques: true, mien: true });
  });

  test("droits : ids posés sans modifiePar ni updatedAt ; passage à deux Qui sans chants ; hugo (rôle sans la case) rien ; coordination sans « mien »", async () => {
    const { db, ecrits, docs } = base();
    const hugo = await droitsDeLEdition(db, app("hugo"), "noel-2026", EDD, AVANT);
    expect(hugo.map((p) => [p.chants, p.musiques, p.mien])).toEqual([[false, false, false], [false, false, false], [false, false, false]]);
    expect(ecrits).toHaveLength(1);
    expect(Object.keys(ecrits[0].data)).toEqual(["passages"]);
    const ids = (docs.programmes["noel-2026"].passages as { id: string }[]).map((p) => p.id);
    expect(ids[2]).toMatch(/^[a-z0-9]{8}$/);
    const coord = await droitsDeLEdition(db, app("coord"), "noel-2026", EDD, AVANT);
    expect(coord.map((p) => [p.chants, p.musiques, p.mien])).toEqual([[true, true, false], [false, true, false], [true, true, false]]);
    expect(ecrits).toHaveLength(1); // ids déjà posés : pas de seconde écriture
    const dan = await droitsDeLEdition(db, app("dan"), "noel-2026", EDD, AVANT);
    expect(dan[1]).toEqual({ id: "bbbbbbbb", chants: false, musiques: true, mien: true });
  });

  test("droits : après le jour J, chants et musiques sont faux, « mien » reste", async () => {
    const { db } = base();
    const d = await droitsDeLEdition(db, app("ruth"), "noel-2026", EDD, "2026-12-25");
    expect(d[0]).toEqual({ id: "aaaaaaaa", chants: false, musiques: false, mien: true });
    const j = await droitsDeLEdition(db, app("ruth"), "noel-2026", EDD, "2026-12-24");
    expect(j[0].chants).toBe(true);
  });

  test("un admin sans profil est coordination (par son jeton) ; un programme qui n'est pas une fête est refusé", async () => {
    const { db } = base();
    const d = await droitsDeLEdition(db, app("adm", ADMIN_EMAILS[0].toUpperCase()), "noel-2026", EDD, AVANT);
    expect(d[0].chants).toBe(true);
    await expect(droitsDeLEdition(db, app("ruth"), "scene-hiver", EDD, AVANT)).rejects.toMatchObject({ status: 409 });
    await expect(droitsDeLEdition(db, app("ruth"), "inconnu", EDD, AVANT)).rejects.toMatchObject({ status: 404 });
  });

  test("coordination : le référent Louange l'a par l'organigramme sans case cochée ; un e-mail de profil d'admin ne la donne pas, le jeton si", async () => {
    const { db, docs } = base();
    docs.users.pilote = { email: "pilote@example.com", firstName: "Pia", lastName: "Roux", referentDe: ["louange"], dansEquipes: ["louange"] };
    docs.users.intrus = { email: ADMIN_EMAILS[0], firstName: "Ian", lastName: "Noel" };
    const coord = async (uid: string, email: string, backOffice: boolean) =>
      (await lireContexteFetes(db, "2026-12-24", EDD, app(uid, email), backOffice)).profils.find((p) => p.uid === uid)?.coordination;
    expect(await coord("pilote", "pilote@example.com", true)).toBe(true);
    expect(await coord("pilote", "pilote@example.com", false)).toBe(false);
    expect(await coord("intrus", "intrus@example.com", true)).toBe(false);
    expect(await coord("intrus", ADMIN_EMAILS[0], true)).toBe(true);
    // Les autres profils ne sont pas coordination d'après leur e-mail de profil.
    const ctx = await lireContexteFetes(db, "2026-12-24", EDD, app("membre"), true);
    expect(ctx.profils.find((p) => p.uid === "intrus")?.coordination).toBe(false);
  });

  test("saisir : crée la setlist complète (titre, éditeurs, createdAt serveur, ownerId null, sans updatedAt) ; idempotent", async () => {
    const { db, ecrits, docs } = base();
    expect(await saisirChants(db, app("ruth"), "noel-2026", "aaaaaaaa", EDD, AVANT)).toEqual({ setlistId: "noel-2026-aaaaaaaa" });
    const sl = docs.setlists["noel-2026-aaaaaaaa"];
    expect(sl).toMatchObject({
      title: "Noël 2026 · Gp Paix", leader: "Ruth K.", category: "Noël", date: "2026-12-24", language: "fr", notes: "", items: [],
      isDraft: false, isPrivate: false, ownerId: null, fete: { programme: "noel-2026", passage: "aaaaaaaa", qui: "Gp Paix" },
    });
    expect([...(sl.editeurs as string[])].sort()).toEqual(["lea", "mei", "ruth"]);
    expect((sl.createdAt as { isEqual: (o: unknown) => boolean }).isEqual(FieldValue.serverTimestamp())).toBe(true);
    expect(sl).not.toHaveProperty("updatedAt");
    await saisirChants(db, app("mei"), "noel-2026", "aaaaaaaa", EDD, AVANT);
    expect(ecrits.filter((e) => e.chemin.startsWith("setlists/")).map((e) => e.op)).toEqual(["set", "update"]);
    expect(docs.setlists["noel-2026-aaaaaaaa"].leader).toBe("Ruth K."); // le leader n'est pas réécrit
  });

  test("saisir : une setlist posée d'avance sous l'identifiant du passage (non fête, ou à un propriétaire) n'est pas reprise → 409", async () => {
    const { db, docs } = base();
    docs.setlists["noel-2026-aaaaaaaa"] = { title: "x", ownerId: "membre", category: "Groupe Paix", isPrivate: true, items: [] };
    await expect(saisirChants(db, app("ruth"), "noel-2026", "aaaaaaaa", EDD, AVANT)).rejects.toMatchObject({ status: 409 });
    expect(docs.setlists["noel-2026-aaaaaaaa"].ownerId).toBe("membre");
  });

  test("saisir : leader = prénom et initiale sans nom de planning ; la coordination saisit partout ; 403 non ayant droit, hugo compris", async () => {
    const { db, docs } = base();
    await saisirChants(db, app("coord"), "noel-2026", "aaaaaaaa", EDD, AVANT);
    expect(docs.setlists["noel-2026-aaaaaaaa"].leader).toBe("Cora D.");
    await expect(saisirChants(db, app("hugo"), "noel-2026", "aaaaaaaa", EDD, AVANT)).rejects.toMatchObject({ status: 403 });
    await expect(saisirChants(db, app("membre"), "noel-2026", "aaaaaaaa", EDD, AVANT)).rejects.toMatchObject({ status: 403 });
  });

  test("saisir : jusqu'au jour J compris (403 le lendemain) ; 409 sur deux Qui, passage inconnu ou sans id", async () => {
    const { db } = base();
    await saisirChants(db, app("ruth"), "noel-2026", "aaaaaaaa", EDD, "2026-12-24");
    await expect(saisirChants(db, app("ruth"), "noel-2026", "aaaaaaaa", EDD, "2026-12-25")).rejects.toMatchObject({ status: 403 });
    await expect(saisirChants(db, app("coord"), "noel-2026", "bbbbbbbb", EDD, AVANT)).rejects.toMatchObject({ status: 409 });
    await expect(saisirChants(db, app("coord"), "noel-2026", "zzzzzzzz", EDD, AVANT)).rejects.toMatchObject({ status: 409 });
  });

  test("saisir : EDD 中班 → le louangeur du planning, titre « Noël 2026 · EDD 中班 »", async () => {
    const { db, docs } = base();
    (docs.programmes["noel-2026"].passages as { id?: string }[])[2].id = "cccccccc";
    await saisirChants(db, app("dan"), "noel-2026", "cccccccc", EDD, AVANT);
    expect(docs.setlists["noel-2026-cccccccc"]).toMatchObject({ title: "Noël 2026 · EDD 中班", editeurs: ["dan"] });
  });

  test("musiques : remplace la liste du seul passage, signe modifiePar ; une danse à deux Qui est tenue par un louangeur", async () => {
    const { db, docs } = base();
    const medias = [{ id: "m1", type: "danse", titre: "Lumière", lien: "https://exemple.org/v", duree: "3:40", depart: "0:12", note: "Fumée" }];
    await ecrireMusiques(db, app("dan"), "noel-2026", "bbbbbbbb", medias, "Dan", EDD, AVANT);
    const p = docs.programmes["noel-2026"];
    const passages = p.passages as { id?: string; medias?: unknown[] }[];
    expect(passages[1].medias).toEqual(medias);
    expect(passages[0].medias).toBeUndefined();
    expect(p.modifiePar).toBe("Dan");
    expect(typeof p.updatedAt).toBe("string");
  });

  test("musiques : 403 non ayant droit et après le jour J, 400 invalide, 409 passage inconnu", async () => {
    const { db } = base();
    const ok = [{ id: "m1", type: "musique", titre: "Ouverture", lien: "", duree: "", depart: "", note: "" }];
    await expect(ecrireMusiques(db, app("membre"), "noel-2026", "aaaaaaaa", ok, "Mo", EDD, AVANT)).rejects.toMatchObject({ status: 403 });
    await expect(ecrireMusiques(db, app("ruth"), "noel-2026", "aaaaaaaa", ok, "Ruth", EDD, "2026-12-25")).rejects.toMatchObject({ status: 403 });
    await expect(ecrireMusiques(db, app("ruth"), "noel-2026", "aaaaaaaa", [{ id: "m", type: "musique", titre: "", lien: "", duree: "", depart: "", note: "" }], "Ruth", EDD, AVANT)).rejects.toMatchObject({ status: 400 });
    await expect(ecrireMusiques(db, app("ruth"), "noel-2026", "zzzzzzzz", ok, "Ruth", EDD, AVANT)).rejects.toMatchObject({ status: 409 });
  });
});

test.describe("CF-B · interrupteur et routes (CF24, CF15, CF27) — texte des sources", () => {
  const lire = (p: string) => readFileSync(p, "utf8");

  for (const r of ["droits", "saisir", "musiques"]) {
    test(`/api/fetes/${r} : 404 sans BACK_OFFICE avant tout le reste`, () => {
      const src = lire(`src/app/api/fetes/${r}/route.ts`);
      const corps = src.slice(src.indexOf("export async function POST"));
      expect(corps.indexOf("if (!BACK_OFFICE) return new Response(null, { status: 404 })")).toBeGreaterThan(-1);
      expect(corps.indexOf("!BACK_OFFICE")).toBeLessThan(corps.indexOf("optionalUser"));
    });
  }

  test("presentation : 404 d'une fête sans BACK_OFFICE après la lecture du document, avant le 403 et l'écriture ; TEAM RÉGIE remplace le planning", () => {
    const src = lire("src/app/api/setlist/presentation/route.ts");
    const garde = src.indexOf("setlist.fete && !BACK_OFFICE");
    expect(garde).toBeGreaterThan(src.indexOf("const setlist ="));
    expect(garde).toBeLessThan(src.indexOf("canSetPresentationLink(user"));
    expect(garde).toBeLessThan(src.indexOf("ref.update"));
    expect(src).toMatch(/setlist\.fete\s*\?\s*estRegieDeFete\(profile, setlist\)/);
  });

  test("notify-setlist : une fête → 404 sans BACK_OFFICE, 400 avec, avant la catégorie, les sorties auto et le 403", () => {
    const src = lire("src/app/api/push/notify-setlist/route.ts");
    const garde = src.indexOf("if (sl.fete)");
    expect(garde).toBeGreaterThan(src.indexOf("const sl ="));
    expect(garde).toBeLessThan(src.indexOf("if (!sl.category)"));
    expect(garde).toBeLessThan(src.indexOf('skipped: "private"'));
    expect(garde).toBeLessThan(src.indexOf("Action non autorisée"));
    expect(src).toMatch(/if \(sl\.fete\) \{\s*if \(!BACK_OFFICE\) return new Response\(null, \{ status: 404 \}\)/);
  });
});
