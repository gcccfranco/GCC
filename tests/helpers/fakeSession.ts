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
 * Simule le compte `profile` et les documents Firestore donnés
 * (`{ "setlists/abc": {...} }`), puis se connecte et ouvre `to`.
 * Toute autre lecture Firestore répond « introuvable » ou une liste vide.
 */
export async function signInAs(
  page: Page,
  profile: FakeProfile,
  docs: Record<string, Record<string, unknown>>,
  to: string,
) {
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

  const all: Record<string, Record<string, unknown>> = {
    [`users/${profile.uid}`]: {
      email: profile.email,
      firstName: profile.firstName ?? "Test",
      lastName: profile.lastName ?? "Régie",
      planningName: profile.planningName ?? "",
      serviceRoles: profile.serviceRoles ?? {},
      annonces: [],
      notify: [],
    },
    ...docs,
  };
  await page.route(/firestore\.googleapis\.com/, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(":runQuery")) return json(route, []);
    const path = decodeURIComponent(url.pathname.split("/documents/")[1] ?? "");
    const data = all[path];
    if (route.request().method() === "GET" && data) return json(route, fsDoc(path, data));
    return json(route, { error: { code: 404, message: "not found" } }, 404);
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
  await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === to);
}
