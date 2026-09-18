import type { Page, Route } from "@playwright/test";

// Connexion Firebase et Firestore **simulés** : les pages réservées aux membres
// (setlists) se testent sans identifiants ni écriture en production. Le SDK
// Auth ne vérifie pas la signature du jeton côté navigateur, il le décode
// seulement ; Firestore est lu en REST, donc interceptable requête par requête.

export type FakeProfile = {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  planningName?: string;
  serviceRoles?: Record<string, string[]>;
  poles?: string[];
  /** Sections où la personne publie des annonces (droit de créer des évènements pour sa section). */
  annonces?: string[];
  /** Audiences de notification manuelle — donne aussi le droit de publier un trimestre de planning. */
  notify?: string[];
  /** Plannings que la personne peut remplir dans l'app (lot 17). */
  plannings?: string[];
  /** Vrai = compte qui n'a pas encore vu l'accueil de première connexion (lot 8).
   *  Par défaut l'accueil est déjà vu, pour ne pas masquer les pages testées. */
  accueil?: boolean;
};

/** Document Firestore REST à partir d'un objet JS (miroir de toFsFields). */
function fsValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
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
 */
export async function fakeFirestore(
  page: Page,
  docs: Record<string, Record<string, unknown>>,
): Promise<FakeDb> {
  const store = new Map<string, FsFields>(
    Object.entries(docs).map(([path, data]) => [path, fsDoc(path, data).fields]),
  );
  const writes: FakeDb["writes"] = [];
  let nextId = 1;
  const children = (collection: string) =>
    [...store.keys()].filter((p) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"));
  const docJson = (path: string) => ({
    name: `projects/gcclouange/databases/(default)/documents/${path}`,
    fields: store.get(path),
    createTime: "2026-01-01T00:00:00Z",
  });

  await page.route(/firestore\.googleapis\.com/, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const tail = decodeURIComponent(url.pathname.split("/documents")[1] ?? "").replace(/^\//, "");
    if (tail.endsWith(":runQuery")) {
      const parent = tail.slice(0, -":runQuery".length);
      const q = (request.postDataJSON() as {
        structuredQuery: {
          from: { collectionId: string }[];
          orderBy?: { field: { fieldPath: string }; direction?: string }[];
          limit?: number;
        };
      }).structuredQuery;
      const order = q.orderBy?.[0];
      // Valeur brute (date ISO, texte…) : un horodatage écrit par la page et
      // une date donnée en texte par le test se trient ensemble.
      const sortKey = (p: string) =>
        String(Object.values(((store.get(p) ?? {})[order?.field.fieldPath ?? ""] ?? {}) as object)[0] ?? "");
      let paths = children(parent ? `${parent}/${q.from[0].collectionId}` : q.from[0].collectionId);
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
      return json(route, {});
    }
    const body = (request.postDataJSON() ?? {}) as { fields?: FsFields };
    const fields = body.fields ?? {};
    if (method === "POST") {
      const path = `${tail}/fake-${nextId++}`;
      store.set(path, fields);
      writes.push({ method, path, data: jsFields(fields) });
      return json(route, docJson(path));
    }
    // PATCH : champs du masque remplacés (ou retirés s'ils manquent au corps).
    const mask = url.searchParams.getAll("updateMask.fieldPaths");
    const next: FsFields = mask.length ? { ...store.get(tail) } : {};
    for (const f of mask) delete next[f];
    Object.assign(next, fields);
    store.set(tail, next);
    writes.push({ method, path: tail, data: jsFields(fields) });
    return json(route, docJson(tail));
  });

  return {
    writes,
    doc: (path) => (store.has(path) ? jsFields(store.get(path)!) : undefined),
    list: (collection) => children(collection),
    set: (path, data) => { store.set(path, fsDoc(path, data).fields); },
  };
}

/**
 * Simule le compte `profile` et les documents Firestore donnés (voir
 * `fakeFirestore`), puis se connecte et ouvre `to`.
 */
export async function signInAs(
  page: Page,
  profile: FakeProfile,
  docs: Record<string, Record<string, unknown>>,
  to: string,
): Promise<FakeDb> {
  const token = idToken(profile);
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

  const db = await fakeFirestore(page, {
    [`users/${profile.uid}`]: {
      email: profile.email,
      firstName: profile.firstName ?? "Test",
      lastName: profile.lastName ?? "Régie",
      planningName: profile.planningName ?? "",
      serviceRoles: profile.serviceRoles ?? {},
      annonces: profile.annonces ?? [],
      notify: profile.notify ?? [],
      poles: profile.poles ?? [],
      plannings: profile.plannings ?? [],
    },
    ...(profile.accueil ? {} : { [`onboarding/${profile.uid}`]: { vu: true, le: "2026-09-01T10:00:00Z" } }),
    ...docs,
  });

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
