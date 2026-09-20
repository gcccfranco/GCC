"use client";

// Accueil de première connexion déjà vu (lot 8, docs/spec-nouveaux-membres.md) :
// doc auto-géré onboarding/{uid} { vu, le }, que l'intéressé écrit lui-même (le
// profil users/{uid} est verrouillé). Même patron que notifPrefs/{uid}. REST.

import { FS_BASE, authHeader, toFsFields } from "@/lib/firebase/setlists";

/** L'accueil a-t-il déjà été vu ? Document absent (404) = jamais vu. Une autre
 *  erreur (réseau, règle pas encore publiée) = on ne l'impose pas. */
export async function getAccueilVu(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${FS_BASE}/onboarding/${uid}`, { headers: await authHeader() });
    return res.status !== 404;
  } catch {
    return true;
  }
}

/** Mémorise l'accueil comme vu ; renvoie faux si l'écriture a échoué. */
export async function setAccueilVu(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${FS_BASE}/onboarding/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ fields: toFsFields({ vu: true, le: new Date().toISOString() }) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
