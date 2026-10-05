"use client";

// Réglages du Back-Office de chacun (lot U6, docs/spec-back-office.md, Q5) : document
// `backOffice/{uid}` (disposition du tableau de bord, barre du bas), que l'intéressé
// écrit lui-même (B5) — le profil `users/{uid}` est verrouillé. Patron d'`onboarding/{uid}`. REST.

import { FS_BASE, authHeader, fromFsValue, toFsFields, type RawDoc } from "@/lib/firebase/setlists";
import type { PreferencesBackOffice, Widget } from "@/types/backOffice";

/**
 * Enregistre la disposition du tableau de bord (B5, à chaque geste, Q12) ; `null` la retire
 * (« Disposition par défaut » : absente = défaut du rôle, recalculé, jamais recopié). Seuls
 * `tableauDeBord` et `majLe` sont touchés : la barre du bas (B6) reste. Lève si refusé.
 */
export async function ecrireTableauDeBord(uid: string, widgets: Widget[] | null): Promise<void> {
  const masque = new URLSearchParams([["updateMask.fieldPaths", "tableauDeBord"], ["updateMask.fieldPaths", "majLe"]]);
  const res = await fetch(`${FS_BASE}/backOffice/${uid}?${masque}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields({ ...(widgets ? { tableauDeBord: widgets } : {}), majLe: new Date().toISOString() }) }),
  });
  if (!res.ok) throw new Error(`backOffice/${uid} : ${res.status}`);
}

/** Le document tel qu'enregistré, ou `null` : absent (404), illisible ou refusé (règle pas
 *  encore publiée) — la page prend alors la disposition par défaut du rôle. Le contenu est
 *  vérifié par `dispositionAffichee`, pas ici. */
export async function lirePreferencesBackOffice(uid: string): Promise<Partial<PreferencesBackOffice> | null> {
  try {
    const res = await fetch(`${FS_BASE}/backOffice/${uid}`, { headers: await authHeader() });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawDoc;
    return Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])) as Partial<PreferencesBackOffice>;
  } catch {
    return null;
  }
}
