// Copie hors ligne des setlists ouvertes (audit du 24/10/2026, D1, décision C2).
//
// À chaque lecture réussie d'une setlist, une copie { uid, setlist, versions, lueLe } est gardée sur l'appareil
// (IndexedDB, sinon localStorage). Si la lecture échoue ensuite par le réseau, la page sert cette
// copie. Privées comprises : la personne y avait accès. Copie liée au compte : elle ne sert que pour le
// `uid` qui l'a lue, sinon elle est effacée ; elle l'est aussi à la déconnexion et au changement de compte
// (`suivreLeCompte`). Gardée 14 jours, les plus vieilles sont balayées à chaque écriture et au démarrage.
// Le site marche sans stockage : toute erreur est avalée.

import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SetlistVersions } from "@/lib/firebase/setlistVersions";

type CopieSetlist = {
  /** Compte qui a lu la setlist. */
  uid: string;
  setlist: FSSetlist;
  /** Versions perso lues avec la setlist : la mienne et celles qu'elle a choisies (« Ma version » hors ligne). */
  versions: Record<string, SetlistVersions>;
  lueLe: number;
};

/** Durée de garde d'une copie. */
const GARDE_COPIE_MS = 14 * 24 * 60 * 60 * 1000;

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
  ) as Partial<CopieSetlist> | null;
  // Une copie sans compte (ancien format) n'est pas servable : elle est effacée à la lecture.
  if (!copie || typeof copie.uid !== "string" || typeof copie.lueLe !== "number" || !copie.setlist) return null;
  return { uid: copie.uid, setlist: copie.setlist, versions: copie.versions ?? {}, lueLe: copie.lueLe };
}

/** Versions à garder avec la copie : la mienne, et celles que j'ai choisies (`choices` : uid d'un auteur). */
function versionsAGarder(
  versions: Record<string, SetlistVersions>,
  uid: string,
): Record<string, SetlistVersions> {
  const gardees: Record<string, SetlistVersions> = {};
  const miennes = versions[uid];
  if (miennes) gardees[uid] = miennes;
  for (const choix of Object.values(miennes?.choices ?? {})) {
    if (choix !== "presidence" && versions[choix]) gardees[choix] = versions[choix];
  }
  return gardees;
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

/** Copie brute gardée pour cette setlist (sans contrôle de compte ni de date), ou null. */
async function copieBrute(id: string): Promise<CopieSetlist | null> {
  try {
    const json = await retrouver(id);
    return json ? lire(json) : null;
  } catch {
    return null;
  }
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Garde la copie d'une setlist qui vient d'être lue, pour le compte `uid`. `versions` : celles qui viennent d'être
 *  lues ; `undefined` (lecture échouée) garde celles de la copie précédente du même compte. Balaye les copies
 *  périmées. Ne lève jamais. */
export async function ecrireCopie(
  setlist: FSSetlist,
  uid: string,
  versions?: Record<string, SetlistVersions>,
  maintenant = Date.now(),
): Promise<void> {
  try {
    let gardees: Record<string, SetlistVersions>;
    if (versions) gardees = versionsAGarder(versions, uid);
    else {
      const avant = await copieBrute(setlist.id);
      gardees = avant && avant.uid === uid ? avant.versions : {};
    }
    await stocker(setlist.id, texte({ uid, setlist, versions: gardees, lueLe: maintenant }));
    await balayerLesCopies(maintenant);
  } catch { /* la copie est un confort */ }
}

/** La copie de cette setlist pour ce compte, ou null : absente, illisible, plus vieille que 14 jours, ou lue par un
 *  autre compte (dans ces trois derniers cas elle est effacée). */
export async function lireCopie(
  id: string,
  uid: string | null | undefined,
  maintenant = Date.now(),
): Promise<CopieSetlist | null> {
  try {
    const json = await retrouver(id);
    if (!json) return null;
    const copie = lire(json);
    if (!copie || copie.uid !== uid || maintenant - copie.lueLe > GARDE_COPIE_MS) {
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

/** Efface toutes les copies : à la déconnexion et au changement de compte. N'efface que ce que ce module a écrit. */
export async function effacerToutesLesCopies(): Promise<void> {
  try { await idb("readwrite", (s) => s.clear()); } catch { /* rien */ }
  try {
    for (const cle of Object.keys(localStorage)) if (cle.startsWith(PREFIXE_LS)) localStorage.removeItem(cle);
  } catch { /* rien */ }
}

/** Efface les copies de plus de 14 jours (ou illisibles), IndexedDB et localStorage. */
export async function balayerLesCopies(maintenant = Date.now()): Promise<void> {
  const perimee = (json: unknown): boolean => {
    try {
      const copie = typeof json === "string" ? lire(json) : null;
      return !copie || maintenant - copie.lueLe > GARDE_COPIE_MS;
    } catch {
      return true;
    }
  };
  try {
    const base = await ouvrir();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = base.transaction(STORE, "readwrite");
        tx.objectStore(STORE).openCursor().onsuccess = (e) => {
          const curseur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!curseur) return;
          if (perimee(curseur.value)) curseur.delete();
          curseur.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      base.close();
    }
  } catch { /* IndexedDB absente ou refusée */ }
  try {
    for (const cle of Object.keys(localStorage)) {
      if (cle.startsWith(PREFIXE_LS) && perimee(localStorage.getItem(cle))) localStorage.removeItem(cle);
    }
  } catch { /* rien */ }
}

/** Suivi du compte connecté, à nourrir de chaque événement d'authentification (un seul écouteur, dans auth.ts).
 *  Le premier événement est le compte que le SDK a restauré (au démarrage, hors ligne aussi) : il est noté, rien
 *  n'est effacé. Tout événement suivant qui change d'identifiant (autre compte, déconnexion, jeton révoqué)
 *  efface toutes les copies. */
export function suivreLeCompte(effacer: () => void): (uid: string | null) => void {
  let vu: string | null | undefined;
  return (uid) => {
    const avant = vu;
    vu = uid;
    if (avant !== undefined && avant !== uid) effacer();
  };
}
