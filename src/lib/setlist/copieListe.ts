// Copie sur l'appareil de la liste des setlists (lot LF, LF1, docs/spec-lectures-firestore.md).
//
// Une seule entrée { uid, lueLe, completeLe, setlists } : la liste que `getSetlists()` rend, de quoi ne relire
// que ce qui a changé (`majLe`). Base à part de `copieHorsLigne.ts` : son balayage efface toute entrée qu'il ne
// sait pas lire. Liée au compte, effacée à la déconnexion et au changement de compte (`auth.ts`). Pas de repli
// localStorage (trop gros). Lecture et écriture lèvent en cas d'erreur IndexedDB : l'appelant retombe sur la
// lecture complète, sans rien montrer.

import type { FSSetlist } from "@/types/setList";

export type CopieListe = {
  /** Compte qui a lu la liste. */
  uid: string;
  /** `readTime` Firestore de la dernière synchronisation (ms). */
  lueLe: number;
  /** Dernière lecture complète (ms). */
  completeLe: number;
  setlists: FSSetlist[];
};

const BASE = "gcc-liste-setlists";
const STORE = "liste";
const CLE = "liste";

// Les dates (`createdAt`…) passent en JSON sous la forme { "__date": iso } et reviennent en Date.
function texte(copie: CopieListe): string {
  return JSON.stringify(copie, function (this: Record<string, unknown>, cle: string, valeur: unknown) {
    const brut = this[cle];
    return brut instanceof Date ? { __date: brut.toISOString() } : valeur;
  });
}

function lire(json: string): CopieListe | null {
  const copie = JSON.parse(json, (_cle, valeur) =>
    valeur && typeof valeur === "object" && typeof (valeur as { __date?: unknown }).__date === "string"
      ? new Date((valeur as { __date: string }).__date)
      : valeur,
  ) as Partial<CopieListe> | null;
  if (
    !copie || typeof copie.uid !== "string" || typeof copie.lueLe !== "number"
    || typeof copie.completeLe !== "number" || !Array.isArray(copie.setlists)
  ) return null;
  return { uid: copie.uid, lueLe: copie.lueLe, completeLe: copie.completeLe, setlists: copie.setlists };
}

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

/** La copie de ce compte, ou null : absente, illisible ou lue par un autre compte (dans ces deux derniers cas
 *  elle est effacée). Lève si IndexedDB échoue. */
export async function lireCopieListe(uid: string | null | undefined): Promise<CopieListe | null> {
  const json = await idb<string | undefined>("readonly", (s) => s.get(CLE));
  if (typeof json !== "string") return null;
  let copie: CopieListe | null = null;
  try { copie = lire(json); } catch { /* illisible */ }
  if (!copie || copie.uid !== uid) {
    await idb("readwrite", (s) => s.delete(CLE));
    return null;
  }
  return copie;
}

/** Remplace la copie. Lève si IndexedDB échoue. */
export async function ecrireCopieListe(copie: CopieListe): Promise<void> {
  await idb("readwrite", (s) => s.put(texte(copie), CLE));
}

/** Efface la copie : à la déconnexion et au changement de compte. Ne lève jamais. */
export async function effacerCopieListe(): Promise<void> {
  try { await idb("readwrite", (s) => s.clear()); } catch { /* rien */ }
}
