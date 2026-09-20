"use client";

// Préférences de notification par type, doc auto-géré notifPrefs/{uid}.
// Lecture/écriture via l'API REST Firestore (comme le reste du projet).

import { FS_BASE, authHeader, toFsFields, fromFsValue, type RawDoc } from "@/lib/firebase/setlists";
import { DEFAULT_NOTIF_PREFS, NOTIF_TYPES, type NotifLang, type NotifPrefs } from "@/types/user";

export async function getNotifPrefs(uid: string): Promise<NotifPrefs> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/notifPrefs/${uid}`, { headers });
  // Doc absent (404) ou accès refusé → valeurs par défaut (tout activé).
  if (!res.ok) return { ...DEFAULT_NOTIF_PREFS };
  const raw = (await res.json()) as RawDoc;
  const out = { ...DEFAULT_NOTIF_PREFS };
  for (const k of NOTIF_TYPES) {
    const v = raw.fields?.[k];
    if (v !== undefined) out[k] = fromFsValue(v) !== false;
  }
  return out;
}

// PATCH avec updateMask : crée le document notifPrefs/{uid} s'il manque et ne
// touche que les champs nommés (les préférences par type et la langue vivent
// dans le même document).
async function patchNotifPrefs(uid: string, fields: Record<string, unknown>): Promise<boolean> {
  const headers = await authHeader();
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/notifPrefs/${uid}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(fields) }),
  });
  return res.ok;
}

export async function saveNotifPrefs(uid: string, prefs: NotifPrefs): Promise<void> {
  if (!(await patchNotifPrefs(uid, { ...prefs }))) throw new Error("Enregistrement des préférences échoué");
}

/** Langue de l'interface, pour que les rappels du cron partent en français ou
 *  en 中文 (lue côté serveur par loadNotifLangs). */
export async function saveNotifLang(uid: string, lang: NotifLang): Promise<void> {
  if (!(await patchNotifPrefs(uid, { lang }))) throw new Error("Enregistrement de la langue échoué");
}
