"use client";

// Réglages du Back-Office de chacun (lot U6, docs/spec-back-office.md, Q5) : document
// `backOffice/{uid}`, que l'intéressé
// écrit lui-même (B5) — le profil `users/{uid}` est verrouillé. Patron d'`onboarding/{uid}`. REST.

import { delaiMax } from "@/lib/delaiMax";
import { FS_BASE, authHeader, fromFsValue, type RawDoc } from "@/lib/firebase/setlists";
import type { PreferencesBackOffice } from "@/types/backOffice";

/** Le document tel qu'enregistré, ou `null` : absent (404), illisible, refusé (règle pas
 *  encore publiée) ou sans réponse au bout de 4 s (la barre du bas l'attend : jamais sans
 *  barre sur un réseau qui accroche) — la page prend alors la disposition par défaut du
 *  rôle. Le contenu est vérifié par `dispositionAffichee`, pas ici. */
export async function lirePreferencesBackOffice(uid: string): Promise<Partial<PreferencesBackOffice> | null> {
  try {
    const res = await fetch(`${FS_BASE}/backOffice/${uid}`, { headers: await authHeader(), signal: delaiMax(4000) });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawDoc;
    return Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])) as Partial<PreferencesBackOffice>;
  } catch {
    return null;
  }
}
