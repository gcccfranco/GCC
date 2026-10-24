// Copie hors ligne des setlists ouvertes (audit du 24/10/2026, D1, décision C2).
//
// À chaque lecture réussie d'une setlist, une copie { setlist, lueLe } est gardée sur l'appareil
// (IndexedDB, sinon localStorage). Si la lecture échoue ensuite par le réseau, la page sert cette
// copie. Privées comprises : la personne y avait accès. Gardée 14 jours, effacée à la déconnexion.
// Le site marche sans stockage : toute erreur est avalée.

import type { FSSetlist } from "@/lib/firebase/setlists";

export type CopieSetlist = { setlist: FSSetlist; lueLe: number };

/** Durée de garde d'une copie. */
export const GARDE_COPIE_MS = 14 * 24 * 60 * 60 * 1000;

const BASE = "gcc-copies-hors-ligne";
const STORE = "setlists";
const PREFIXE_LS = "gcc-copie-setlist:";

// Les dates (`createdAt`…) passent en JSON sous la forme { "__date": iso } et reviennent en Date.
function texte(copie: CopieSetlist): string {
  return JSON.stringify(copie, function (this: Record<string, unknown>, cle: string, valeur: unknown) {
    const brut = this[cle];
    return brut instanceof Date ? { __date: brut.toISOString() } : valeur;
  });
}

function lire(json: string): CopieSetlist | null {
  const copie = JSON.parse(json, (_cle, valeur) =>
    valeur && typeof valeur === "object" && typeof (valeur as { __date?: unknown }).__date === "string"
      ? new Date((valeur as { __date: string }).__date)
      : valeur,
  ) as CopieSetlist;
  return copie && typeof copie.lueLe === "number" && copie.setlist ? copie : null;
}

// ─── IndexedDB (clé = id de la setlist, valeur = texte JSON) ────────────────

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const demande = indexedDB.open(BASE, 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore(STORE);
    demande.onsuccess = () => resolve(demande.result);
    demande.onerror = () => reject(demande.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await ouvrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const requete = action(base.transaction(STORE, mode).objectStore(STORE));
      requete.onsuccess = () => resolve(requete.result);
      requete.onerror = () => reject(requete.error);
    });
  } finally {
    base.close();
  }
}

// ─── Stockage : IndexedDB de préférence, localStorage en repli ──────────────

async function stocker(id: string, json: string): Promise<void> {
  try {
    await idb("readwrite", (s) => s.put(json, id));
    return;
  } catch { /* IndexedDB absente ou refusée : repli */ }
  try { localStorage.setItem(PREFIXE_LS + id, json); } catch { /* pas de stockage */ }
}

async function retrouver(id: string): Promise<string | null> {
  try {
    const v = await idb<string | undefined>("readonly", (s) => s.get(id));
    if (typeof v === "string") return v;
  } catch { /* repli */ }
  try { return localStorage.getItem(PREFIXE_LS + id); } catch { return null; }
}

async function retirer(id: string): Promise<void> {
  try { await idb("readwrite", (s) => s.delete(id)); } catch { /* rien */ }
  try { localStorage.removeItem(PREFIXE_LS + id); } catch { /* rien */ }
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Garde la copie d'une setlist qui vient d'être lue. Ne lève jamais. */
export async function ecrireCopie(setlist: FSSetlist, maintenant = Date.now()): Promise<void> {
  try {
    await stocker(setlist.id, texte({ setlist, lueLe: maintenant }));
  } catch { /* la copie est un confort */ }
}

/** La copie de cette setlist, ou null : absente, illisible ou plus vieille que 14 jours (alors effacée). */
export async function lireCopie(id: string, maintenant = Date.now()): Promise<CopieSetlist | null> {
  try {
    const json = await retrouver(id);
    if (!json) return null;
    const copie = lire(json);
    if (!copie || maintenant - copie.lueLe > GARDE_COPIE_MS) {
      await retirer(id);
      return null;
    }
    return copie;
  } catch {
    return null;
  }
}

/** Efface la copie d'une setlist (inexistante, refusée ou à la corbeille). */
export async function effacerCopie(id: string): Promise<void> {
  try { await retirer(id); } catch { /* rien */ }
}

/** Efface toutes les copies : à la déconnexion. N'efface que ce que ce module a écrit. */
export async function effacerToutesLesCopies(): Promise<void> {
  try { await idb("readwrite", (s) => s.clear()); } catch { /* rien */ }
  try {
    for (const cle of Object.keys(localStorage)) if (cle.startsWith(PREFIXE_LS)) localStorage.removeItem(cle);
  } catch { /* rien */ }
}
