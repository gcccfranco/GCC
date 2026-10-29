"use client";

// Visite de première connexion déjà vue (lot 8, docs/spec-nouveaux-membres.md ; visite par rôle,
// docs/spec-visite-par-role.md) : doc auto-géré onboarding/{uid} { vu, version, le }, que l'intéressé écrit
// lui-même (le profil users/{uid} est verrouillé). Même patron que notifPrefs/{uid}. REST.
// `version` : 2 = la visite par rôle ; absent = l'accueil du lot 8 (version 1) ; pas de document = jamais vue.

import { FS_BASE, authHeader, toFsFields } from "@/lib/firebase/setlists";

/** Version de la visite que `setAccueilVu` écrit. */
export const VERSION_VISITE = 2;

/** La version de la visite déjà vue : 0 = jamais (document absent, 404), 1 = l'accueil du lot 8 (document sans
 *  `version`), sinon le champ `version`. Une autre erreur (réseau, règle pas encore publiée) = « vu » : on ne
 *  l'impose pas. */
export async function getAccueilVu(uid: string): Promise<number> {
  try {
    const res = await fetch(`${FS_BASE}/onboarding/${uid}`, { headers: await authHeader() });
    if (res.status === 404) return 0;
    if (!res.ok) return VERSION_VISITE;
    const doc = (await res.json()) as { fields?: { version?: { integerValue?: string } } };
    const version = Number(doc.fields?.version?.integerValue);
    return Number.isInteger(version) ? version : 1;
  } catch {
    return VERSION_VISITE;
  }
}

/** Mémorise la visite comme vue ; renvoie faux si l'écriture a échoué. */
export async function setAccueilVu(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${FS_BASE}/onboarding/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ fields: toFsFields({ vu: true, version: VERSION_VISITE, le: new Date().toISOString() }) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
