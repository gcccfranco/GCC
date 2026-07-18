"use client";

// Suivi « guide de bienvenue déjà vu », doc auto-géré onboarding/{uid}.
// Le profil users/{uid} est verrouillé en écriture (admins only) ; on stocke donc
// ce drapeau dans un doc séparé que l'intéressé peut écrire — même patron que
// notifPrefs/{uid}. Lecture/écriture via l'API REST Firestore.

import { FS_BASE, authHeader, type RawDoc } from "@/lib/firebase/setlists";

const seenCache = new Map<string, boolean>();

/** Le guide de bienvenue a-t-il déjà été vu par cet utilisateur ? */
export async function getOnboardingSeen(uid: string): Promise<boolean> {
  if (seenCache.has(uid)) return seenCache.get(uid)!;
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/onboarding/${uid}`, { headers });
  // Doc absent (404) ou accès refusé → jamais vu.
  const seen = res.ok && !!((await res.json()) as RawDoc).fields?.seenAt;
  seenCache.set(uid, seen);
  return seen;
}

/** Marque le guide comme vu (idempotent) — appelé à la fermeture du tour. */
export async function markOnboardingSeen(uid: string): Promise<void> {
  seenCache.set(uid, true);
  const headers = await authHeader();
  // PATCH sans updateMask crée ou remplace le document onboarding/{uid}.
  await fetch(`${FS_BASE}/onboarding/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      fields: { seenAt: { timestampValue: new Date().toISOString() } },
    }),
  }).catch(() => {}); // best-effort : un échec réseau ne doit pas bloquer l'UI
}
