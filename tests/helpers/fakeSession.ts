import type { Page, Route } from "@playwright/test";
import { ADMIN_EMAILS } from "../../src/lib/access";
import { groupeDe } from "../../src/lib/groupes/organigramme";
import { EDD_CLASSES } from "../../src/lib/planning/utils";
import { SERVICE_LIEUX } from "../../src/types/user";

// Connexion Firebase et Firestore **simulés** : les pages réservées aux membres
// (setlists) se testent sans identifiants ni écriture en production. Le SDK
// Auth ne vérifie pas la signature du jeton côté navigateur, il le décode
// seulement ; Firestore est lu en REST, donc interceptable requête par requête.

/** Adresse d'un compte admin simulé. Être admin passe par `ADMIN_EMAILS` (src/lib/access.ts) :
 *  l'adresse est lue là, seul endroit où elle est écrite, jamais recopiée dans un test. */
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export type FakeProfile = {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  planningName?: string;
  serviceRoles?: Record<string, string[]>;
  /** Coordination (lot 1 du chantier « équipes et groupes », EQ24) — cochée par un admin. */
  coordination?: boolean;
  /** Droit de tenir l'organigramme (lot 16) — attribué par un admin. */
  equipes?: boolean;
  /** Sections où la personne publie des annonces (droit de créer des évènements pour sa section). */
  annonces?: string[];
  /** Audiences de notification manuelle — donne aussi le droit de publier un trimestre de planning. */
  notify?: string[];
  /** Plannings que la personne peut remplir dans l'app (lot 17). */
  plannings?: string[];
  /** Équipes de l'organigramme où la personne figure, et celles dont elle est
   *  référente (lot U6, R4) — écrites par le serveur seul (`recalculerRattachement`). */
  dansEquipes?: string[];
  referentDe?: string[];
  /** Lot 2 (organigrammes des groupes, OG2, OG19) — écrits par le serveur seul : le groupe (`""` =
   *  sans groupe ; absent = déduit de `serviceRoles`) et les plannings / audiences que le profil
   *  remplit, publie ou notifie par un rôle. */
  groupe?: string;
  remplitParRole?: string[];
  publieParRole?: string[];
  notifieParRole?: string[];
  /** Lot AO — recopiés de l'organigramme par le serveur seul : sous-équipes de Louange (et celles dont la personne est
   *  référente), lieux où elle sert (Louange, Régie), ce qu'elle joue (Musiciens). */
  sousEquipes?: string[];
  referentSous?: string[];
  lieuxLouange?: string[];
  lieuxRegie?: string[];
  joue?: string[];
  /** Vrai = compte qui n'a pas encore vu l'accueil de première connexion (lot 8).
   *  Par défaut la visite est déjà vue (`version: 2`), pour ne pas masquer les pages testées. */
  accueil?: boolean;
  /** Vrai = compte qui avait vu l'accueil du lot 8 : `onboarding/{uid}` sans `version` (docs/spec-visite-par-role.md).
   *  Avec le back-office ouvert, la visite s'ouvre de nouveau ; sans, elle reste fermée. */
  accueilLot8?: boolean;
  /** Lot AO — `false` interdit la traduction automatique d'un profil « à l'ancienne » (voir `traduitCommeMigration`). */
  organigramme?: false;
};

/**
 * Lot AO — traduit comme la migration (src/lib/acces/migration.ts, `citer` + `recopieDe`) : un profil « à
 * l'ancienne » (rôles déclarés dans `serviceRoles`) reçoit les champs que le serveur recopierait de
 * l'organigramme, sinon le serveur principal (interrupteur du back-office ouvert, accès lus dans l'organigramme)
 * ne lui ouvrirait plus rien. Appliquée aux deux serveurs : sur le serveur coupé (ancien mode) ces champs ne sont
 * pas lus. Rien n'est traduit si le profil porte déjà un champ d'organigramme du lot AO (`sousEquipes`,
 * `referentSous`, `lieuxLouange`, `lieuxRegie`, `joue`) ou si `organigramme: false`.
 *   - chanteur / musicien / presidence sur un des 4 lieux : `dansEquipes` ∋ louange, `sousEquipes`
 *     (choristes / musiciens / presidence), `lieuxLouange` ;
 *   - régie sur un lieu : `dansEquipes` ∋ regie, `lieuxRegie` ;
 *   - clé de classe EDD : `dansEquipes` ∋ edd ; une seule clé de groupe : `groupe` (id, comme `groupeDe` le déduit) s'il est absent ;
 *   - `joue` reste vide (un test d'Harmonie le pose lui-même).
 * Les droits cochés (`coordination`, `annonces`, `notify`, `plannings`, `equipes`) ne sont PAS traduits : un test qui
 * les utilise se reprend avec `remplit`, `publie`, `coordination`, `notifieTout`… (en bas de ce fichier).
 */
const SOUS_PAR_ROLE: Record<string, string> = { presidence: "presidence", musicien: "musiciens", chanteur: "choristes" };
function traduitCommeMigration(data: Record<string, unknown>): Record<string, unknown> {
  const AO = ["sousEquipes", "referentSous", "lieuxLouange", "lieuxRegie", "joue"];
  if (AO.some((k) => k in data)) return data;
  const roles = (data.serviceRoles ?? {}) as Record<string, string[]>;
  const sous = new Set<string>();
  const lieuxLouange = new Set<string>();
  const lieuxRegie = new Set<string>();
  const dans = new Set<string>((data.dansEquipes as string[] | undefined) ?? []);
  let groupe = data.groupe as string | undefined;
  for (const [cle, rs] of Object.entries(roles)) {
    const lieu = (SERVICE_LIEUX as readonly string[]).includes(cle);
    for (const r of rs) {
      if (lieu && SOUS_PAR_ROLE[r]) { sous.add(SOUS_PAR_ROLE[r]); lieuxLouange.add(cle); }
      if (lieu && r === "regie") { lieuxRegie.add(cle); dans.add("regie"); }
    }
    if ((EDD_CLASSES as readonly string[]).includes(cle)) dans.add("edd");
  }
  // Le groupe, comme l'app le déduit (`groupeDe`) : exactement une clé de groupe dans `serviceRoles`, sinon rien.
  if (groupe === undefined) groupe = groupeDe({ serviceRoles: roles }) ?? undefined;
  if (sous.size) dans.add("louange");
  if (!dans.size && !groupe) return data;
  const ordre = <T extends string>(tout: readonly T[], ens: Set<string>) => tout.filter((x) => ens.has(x));
  return {
    ...data,
    ...(dans.size ? { dansEquipes: [...dans] } : {}),
    ...(groupe !== undefined ? { groupe } : {}),
    ...(sous.size ? { sousEquipes: ordre(["presidence", "musiciens", "choristes"], sous), lieuxLouange: ordre(SERVICE_LIEUX, lieuxLouange) } : {}),
    ...(lieuxRegie.size ? { lieuxRegie: ordre(SERVICE_LIEUX, lieuxRegie) } : {}),
  };
}

/** Document Firestore REST à partir d'un objet JS (miroir de toFsFields). */
function fsValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  // Horodatage Firestore (`createdAt` des signalements : la page le lit en Date).
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, fsValue(x)])),
    },
  };
}

export function fsDoc(path: string, data: Record<string, unknown>) {
  return {
    name: `projects/gcclouange/databases/(default)/documents/${path}`,
    fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsValue(v)])),
    createTime: "2026-01-01T00:00:00Z",
  };
}

type FsFields = Record<string, unknown>;

/** Objet JS à partir d'une valeur Firestore REST (miroir de fromFsValue). */
function jsValue(v: unknown): unknown {
  const val = (v ?? {}) as Record<string, unknown>;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) return ((val.arrayValue as { values?: unknown[] }).values ?? []).map(jsValue);
  if ("mapValue" in val) return jsFields((val.mapValue as { fields?: FsFields }).fields ?? {});
  return null;
}

function jsFields(fields: FsFields): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, jsValue(v)]));
}

/** Segments d'un chemin de champ Firestore : « a.b », un segment entre accents
 *  graves s'il n'est pas un identifiant (« fini.`tous-les-accords` »). */
function cheminDeChamp(f: string): string[] {
  return [...f.matchAll(/`([^`]+)`|([^.`]+)/g)].map((m) => m[1] ?? m[2]);
}

type MapValue = { mapValue?: { fields?: FsFields } };

function lireAuChemin(fields: FsFields, chemin: string[]): unknown {
  let courant: FsFields | undefined = fields;
  for (let i = 0; i < chemin.length; i++) {
    const v: unknown = courant?.[chemin[i]];
    if (v === undefined || i === chemin.length - 1) return v;
    courant = (v as MapValue).mapValue?.fields;
  }
  return undefined;
}

function ecrireAuChemin(fields: FsFields, chemin: string[], valeur: unknown): void {
  let courant = fields;
  for (const segment of chemin.slice(0, -1)) {
    const v = courant[segment] as MapValue | undefined;
    if (!v?.mapValue) courant[segment] = { mapValue: { fields: {} } };
    const map = (courant[segment] as MapValue).mapValue!;
    map.fields ??= {};
    courant = map.fields;
  }
  const dernier = chemin[chemin.length - 1];
  if (valeur === undefined) delete courant[dernier];
  else courant[dernier] = valeur;
}

/** Base simulée : documents lus, écrits et interrogés par la page pendant le test. */
export type FakeDb = {
  /** Écritures reçues, dans l'ordre (PATCH, POST, DELETE). */
  writes: { method: string; path: string; data: Record<string, unknown> }[];
  /** Document tel qu'il est maintenant (ou `undefined`). */
  doc(path: string): Record<string, unknown> | undefined;
  /** Chemins des documents d'une collection (`setlists/abc/history`). */
  list(collection: string): string[];
  /** Ajoute ou remplace un document en cours de test (simule une écriture d'un autre membre). */
  set(path: string, data: Record<string, unknown>): void;
};

/** État d'une base simulée : partagé quand deux sessions (deux contextes) écrivent dans la même
 *  base (`fakeFirestore(…, partage)`). Chaque document porte un `updateTime`, nouveau à chaque
 *  écriture, comme Firestore. */
type EtatBase = {
  store: Map<string, FsFields>;
  versions: Map<string, string>;
  writes: FakeDb["writes"];
  compteur: { id: number; version: number };
};
const etats = new WeakMap<FakeDb, EtatBase>();

/** Un `updateTime` nouveau, croissant (microsecondes, comme Firestore). */
function nouvelleVersion(etat: EtatBase, path: string): void {
  const n = ++etat.compteur.version;
  etat.versions.set(path, `2026-01-01T00:00:00.${String(n).padStart(6, "0")}Z`);
}

function b64url(o: object): string {
  return Buffer.from(JSON.stringify(o)).toString("base64url");
}

function idToken(p: FakeProfile): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://securetoken.google.com/gcclouange",
    aud: "gcclouange",
    auth_time: now,
    user_id: p.uid,
    sub: p.uid,
    iat: now,
    exp: now + 3600,
    email: p.email,
    email_verified: true,
    firebase: { identities: { email: [p.email] }, sign_in_provider: "password" },
  };
  return `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(payload)}.sig`;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/**
 * Simule Firestore seul, sans connexion (pages publiques : calendrier des
 * évènements). Documents donnés sous la forme `{ "evenements/foot": {...} }`.
 * Toute autre lecture répond « introuvable ». Les écritures sont gardées en
 * mémoire (jamais envoyées) et relues par la page ; une requête sur une
 * collection (`programmes`, `setlists/abc/history`) renvoie ses documents (les
 * filtres `where` sont ignorés).
 * `partage` : la base d'une autre session (autre contexte de navigateur), que celle-ci lit et
 * écrit aussi ; seuls les documents qu'elle n'a pas encore s'y ajoutent.
 * Un PATCH qui porte `currentDocument.updateTime` d'une autre version que celle du document est
 * refusé (HTTP 400 `FAILED_PRECONDITION`), rien n'est écrit — comme Firestore.
 */
export async function fakeFirestore(
  page: Page,
  docs: Record<string, Record<string, unknown>>,
  partage?: FakeDb,
): Promise<FakeDb> {
  const etat: EtatBase = (partage && etats.get(partage)) ?? {
    store: new Map(), versions: new Map(), writes: [], compteur: { id: 1, version: 0 },
  };
  const { store, writes, versions } = etat;
  for (const [path, data] of Object.entries(docs)) {
    if (partage && store.has(path)) continue;
    store.set(path, fsDoc(path, data).fields);
    nouvelleVersion(etat, path);
  }
  const children = (collection: string) =>
    [...store.keys()].filter((p) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"));
  const docJson = (path: string) => ({
    name: `projects/gcclouange/databases/(default)/documents/${path}`,
    fields: store.get(path),
    createTime: "2026-01-01T00:00:00Z",
    updateTime: versions.get(path),
  });

  // Lot U9, B2 : l'agenda public lit le Sheet des évènements jusqu'au 31/12/2026. Par défaut, un
  // Sheet vide, jamais le vrai ; au niveau du contexte, donc toute `page.route` d'un test l'emporte.
  await page.context().route(/docs\.google\.com\/spreadsheets\/d\/12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8\/export/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );

  await page.route(/firestore\.googleapis\.com/, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const tail = decodeURIComponent(url.pathname.split("/documents")[1] ?? "").replace(/^\//, "");
    if (tail.endsWith(":runQuery")) {
      const parent = tail.slice(0, -":runQuery".length);
      const q = (request.postDataJSON() as {
        structuredQuery: {
          from: { collectionId: string; allDescendants?: boolean }[];
          orderBy?: { field: { fieldPath: string }; direction?: string }[];
          limit?: number;
        };
      }).structuredQuery;
      const order = q.orderBy?.[0];
      // Valeur brute (date ISO, texte…) : un horodatage écrit par la page et
      // une date donnée en texte par le test se trient ensemble.
      const sortKey = (p: string) =>
        String(Object.values(((store.get(p) ?? {})[order?.field.fieldPath ?? ""] ?? {}) as object)[0] ?? "");
      // `allDescendants` (collection group) : tous les documents dont l'avant-dernier segment du chemin est la collection.
      let paths = q.from[0].allDescendants
        ? [...store.keys()].filter((p) => p.split("/").slice(-2, -1)[0] === q.from[0].collectionId)
        : children(parent ? `${parent}/${q.from[0].collectionId}` : q.from[0].collectionId);
      if (order) {
        paths.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
        if (order.direction === "DESCENDING") paths.reverse();
      }
      if (q.limit) paths = paths.slice(0, q.limit);
      return json(route, paths.map((p) => ({ document: docJson(p) })));
    }
    if (method === "GET") {
      if (store.has(tail)) return json(route, docJson(tail));
      return json(route, { error: { code: 404, message: "not found" } }, 404);
    }
    if (method === "DELETE") {
      writes.push({ method, path: tail, data: {} });
      store.delete(tail);
      versions.delete(tail);
      return json(route, {});
    }
    const body = (request.postDataJSON() ?? {}) as { fields?: FsFields };
    const fields = body.fields ?? {};
    if (method === "POST") {
      // Identifiant choisi (`?documentId=`, Pâques · Noël Q6) : déjà pris → 409, rien n'est écrit.
      const choisi = url.searchParams.get("documentId");
      if (choisi && store.has(`${tail}/${choisi}`)) {
        return json(route, { error: { code: 409, message: "Document already exists", status: "ALREADY_EXISTS" } }, 409);
      }
      const path = `${tail}/${choisi ?? `fake-${etat.compteur.id++}`}`;
      store.set(path, fields);
      nouvelleVersion(etat, path);
      writes.push({ method, path, data: jsFields(fields) });
      return json(route, docJson(path));
    }
    // PATCH : champs du masque remplacés (ou retirés s'ils manquent au corps).
    // Un chemin peut descendre dans une map (« fini.`tous-les-accords` ») : on
    // n'y touche qu'à ce champ, comme Firestore. Le reste du corps s'ajoute.
    const attendue = url.searchParams.get("currentDocument.updateTime");
    if (attendue && attendue !== versions.get(tail)) {
      return json(route, {
        error: { code: 400, message: `the stored version (${versions.get(tail)}) does not match the required base version (${attendue})`, status: "FAILED_PRECONDITION" },
      }, 400);
    }
    const mask = url.searchParams.getAll("updateMask.fieldPaths");
    const next: FsFields = mask.length ? structuredClone(store.get(tail) ?? {}) : {};
    const premiers = new Set(mask.map((f) => cheminDeChamp(f)[0]));
    for (const f of mask) {
      const chemin = cheminDeChamp(f);
      ecrireAuChemin(next, chemin, lireAuChemin(fields, chemin));
    }
    for (const [k, v] of Object.entries(fields)) if (!premiers.has(k)) next[k] = v;
    store.set(tail, next);
    nouvelleVersion(etat, tail);
    writes.push({ method, path: tail, data: jsFields(fields) });
    return json(route, docJson(tail));
  });

  if (partage) return partage;
  const db: FakeDb = {
    writes,
    doc: (path) => (store.has(path) ? jsFields(store.get(path)!) : undefined),
    list: (collection) => children(collection),
    set: (path, data) => { store.set(path, fsDoc(path, data).fields); nouvelleVersion(etat, path); },
  };
  etats.set(db, etat);
  return db;
}

/**
 * Simule le compte `profile` et les documents Firestore donnés (voir
 * `fakeFirestore`), puis se connecte et ouvre `to`. `partage` : la base d'une autre session,
 * pour deux contextes qui lisent et écrivent les mêmes documents.
 */
export async function signInAs(
  page: Page,
  profile: FakeProfile,
  docs: Record<string, Record<string, unknown>>,
  to: string,
  partage?: FakeDb,
): Promise<FakeDb> {
  const token = idToken(profile);
  // Lot 3 (PG37) : la grille d'un trimestre publié envoie son état annoncé à la route serveur ; jamais la
  // vraie route. Un test qui veut voir l'appel pose sa propre route (la dernière posée gagne).
  await page.route("**/api/planning/changements", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
    const url = route.request().url();
    if (url.includes("accounts:signInWithPassword")) {
      return json(route, {
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: profile.uid,
        email: profile.email,
        displayName: "",
        idToken: token,
        registered: true,
        refreshToken: "fake-refresh",
        expiresIn: "3600",
      });
    }
    if (url.includes("accounts:lookup")) {
      return json(route, {
        users: [{
          localId: profile.uid,
          email: profile.email,
          emailVerified: true,
          providerUserInfo: [{ providerId: "password", email: profile.email, federatedId: profile.email, rawId: profile.email }],
          createdAt: "1767225600000",
          lastLoginAt: String(Date.now()),
        }],
      });
    }
    return json(route, {});
  });
  await page.route(/securetoken\.googleapis\.com/, (route) =>
    json(route, {
      access_token: token, expires_in: "3600", token_type: "Bearer",
      refresh_token: "fake-refresh", id_token: token, user_id: profile.uid, project_id: "gcclouange",
    }),
  );

  // Un autre document users/* garde son ancien rôle sans traduction avec `organigramme: false` (champ retiré du document).
  const autreProfil = (d: Record<string, unknown>) => {
    if (d.organigramme !== false) return traduitCommeMigration(d);
    const { organigramme: _non, ...reste } = d;
    return reste;
  };
  const serviParLeProfil = (d: Record<string, unknown>) => (profile.organigramme === false ? d : traduitCommeMigration(d));
  const traduits = Object.fromEntries(Object.entries(docs).map(([chemin, d]) =>
    [chemin, /^users\/[^/]+$/.test(chemin) ? (chemin === `users/${profile.uid}` ? serviParLeProfil(d) : autreProfil(d)) : d]));
  const db = await fakeFirestore(page, {
    [`users/${profile.uid}`]: serviParLeProfil({
      email: profile.email,
      firstName: profile.firstName ?? "Test",
      lastName: profile.lastName ?? "Régie",
      planningName: profile.planningName ?? "",
      serviceRoles: profile.serviceRoles ?? {},
      annonces: profile.annonces ?? [],
      notify: profile.notify ?? [],
      ...(profile.coordination !== undefined ? { coordination: profile.coordination } : {}),
      equipes: profile.equipes ?? false,
      plannings: profile.plannings ?? [],
      ...(profile.dansEquipes ? { dansEquipes: profile.dansEquipes } : {}),
      ...(profile.referentDe ? { referentDe: profile.referentDe } : {}),
      ...(profile.groupe !== undefined ? { groupe: profile.groupe } : {}),
      ...(profile.remplitParRole ? { remplitParRole: profile.remplitParRole } : {}),
      ...(profile.publieParRole ? { publieParRole: profile.publieParRole } : {}),
      ...(profile.notifieParRole ? { notifieParRole: profile.notifieParRole } : {}),
      ...(profile.sousEquipes ? { sousEquipes: profile.sousEquipes } : {}),
      ...(profile.referentSous ? { referentSous: profile.referentSous } : {}),
      ...(profile.lieuxLouange ? { lieuxLouange: profile.lieuxLouange } : {}),
      ...(profile.lieuxRegie ? { lieuxRegie: profile.lieuxRegie } : {}),
      ...(profile.joue ? { joue: profile.joue } : {}),
    }),
    ...(profile.accueil ? {} : {
      [`onboarding/${profile.uid}`]: profile.accueilLot8
        ? { vu: true, le: "2026-09-01T10:00:00Z" }
        : { vu: true, version: 2, le: "2026-09-01T10:00:00Z" },
    }),
    ...traduits,
  }, partage);

  await page.goto(`/login?from=${encodeURIComponent(to)}`);
  // Attendre que React ait hydraté le formulaire : sur un navigateur lent,
  // des champs remplis avant l'hydratation sont remis à vide (champs
  // contrôlés) et le clic part dans le vide.
  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return !!button && Object.keys(button).some((k) => k.startsWith("__reactProps"));
  });
  await page.locator('input[type="email"]').fill(profile.email);
  await page.locator('input[type="password"]').fill("fake-password");
  await page.locator('button[type="submit"]').click();
  // Le site sert ses pages avec une barre oblique finale.
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === to.split("?")[0]);

  return db;
}

/**
 * Le navigateur se dit déjà abonné aux notifications : `PushToggle` (Mon profil)
 * n'affiche ses bascules par type qu'alors. Aucun vrai abonnement ni service
 * worker : `navigator.serviceWorker.ready` rend un enregistrement simulé. Sur
 * l'iPad émulé, l'app passe pour installée (sinon : « ajoute d'abord le site à
 * l'écran d'accueil »). À appeler avant `signInAs`.
 */
export async function abonneAuxNotifications(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const abonnement = { endpoint: "https://push.example.invalid/abonnement", toJSON: () => ({}) };
    const enregistrement = { pushManager: { getSubscription: async () => abonnement } };
    Object.defineProperty(ServiceWorkerContainer.prototype, "ready", { configurable: true, get: () => Promise.resolve(enregistrement) });
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => "granted" });
    Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get: () => true });
  });
}

/**
 * Lot AO : ce que le serveur recopie sur le profil d'une personne qui remplit ces plannings — l'équivalent, dans
 * l'organigramme, de l'ancien droit `plannings` coché par un admin. Le culte et ses variantes (Intergroupe,
 * Interfranco, Campus) : référent Louange ; l'EDD : référent EDD ; la Table : membre d'Orga ; un groupe (Paix,
 * Bonté, Fidélité) : le rôle « remplit » de son organigramme. Les trois listes sont toujours rendues (vides
 * comprises) : `{ ...ECRIVAIN, ...remplit("table") }` remplace tout ce qu'`ECRIVAIN` donnait.
 */
export function remplit(...cles: string[]): Pick<FakeProfile, "dansEquipes" | "referentDe" | "remplitParRole"> {
  const groupes = ["paix", "bonte", "fidelite", "fideliteMusiciens"];
  const equipes = (id: string) => (cles.some((k) => (id === "louange" ? !groupes.includes(k) && k !== "table" && !k.startsWith("edd") : id === "edd" ? k.startsWith("edd") : k === "table")) ? [id] : []);
  const referentDe = [...equipes("louange"), ...equipes("edd")];
  return {
    dansEquipes: [...referentDe, ...equipes("orga")],
    referentDe,
    remplitParRole: cles.filter((k) => groupes.includes(k)),
  };
}

/** Lot AO : qui publie (et prévient) ces plannings de groupe — le rôle « publie » de l'organigramme du groupe (ancien droit `notify`). */
export const publie = (...cles: string[]): Pick<FakeProfile, "publieParRole"> => ({ publieParRole: cles });

/** Lot AO : un Musicien de Louange (Culte Francophone) qui joue ces instruments — ce que le serveur recopie sur le profil ;
 *  `joue` ouvre Harmonie (piano, guitare). Un test d'Harmonie le pose lui-même, `traduitCommeMigration` ne le fait pas. */
export const musicien = (...joue: string[]): Pick<FakeProfile, "dansEquipes" | "sousEquipes" | "lieuxLouange" | "joue"> =>
  ({ dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue });

/** Lot AO : la place d'organigramme qui donne exactement la Coordination (scène, fêtes, évènements de l'Église) avec le moins
 *  d'autres droits : référent EDD (aussi : les plannings EDD, notifier l'EDD). Ni les évènements d'une section (il n'y a pas de section EDD). */
export const coordination = (): Pick<FakeProfile, "dansEquipes" | "referentDe"> => ({ dansEquipes: ["edd"], referentDe: ["edd"] });
/** Lot AO : référent Régie — remplit les colonnes Sono / PPT du culte et les publie ; ni Coordination, ni création d'évènement. */
export const referentRegie = (): Pick<FakeProfile, "dansEquipes" | "referentDe"> => ({ dansEquipes: ["regie"], referentDe: ["regie"] });
/** Lot AO : référent Louange — Coordination, tout le planning du culte, évènements « Culte Francophone », notifier Louange, tenir Louange. */
export const referentLouange = (): Pick<FakeProfile, "dansEquipes" | "referentDe"> => ({ dansEquipes: ["louange"], referentDe: ["louange"] });
/** Lot AO : membre d'Orga — Coordination, la Table, notifier toute l'Église, tenir tout l'organigramme. */
export const orga = (): Pick<FakeProfile, "dansEquipes"> => ({ dansEquipes: ["orga"] });

/** Lot AO : président ou VP d'un groupe (`paix`, `bonte`, `fidelite`, `amour`, `joie`) — l'équivalent, dans l'organigramme, de
 *  l'ancien droit d'annonces de sa section : son comité, `groupe`, et la création d'évènements de sa catégorie. */
export const presidentGroupe = (id: string): Pick<FakeProfile, "dansEquipes" | "referentDe" | "groupe"> =>
  ({ dansEquipes: [`comite-${id}`], referentDe: [`comite-${id}`], groupe: id });
/** Lot AO : le rôle « Notifier » d'un groupe (ancien droit `notify`) — ses audiences, ici les catégories (« Groupe Paix »…). */
export const notifie = (...audiences: string[]): Pick<FakeProfile, "notifieParRole"> => ({ notifieParRole: audiences });
