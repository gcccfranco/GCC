// Lecture partagée des setlists pour les statistiques d'un chant (lot ST, ST2) : la promesse de
// `getSetlists()` gardée 5 minutes, une lecture de la collection par visite et non une par chant ouvert.
// Propre au compte (uid courant). Erreur ou hors ligne : `[]`, la promesse ratée est oubliée.

import { auth } from "@/lib/firebase/config";
import { getSetlists, type FSSetlist } from "@/lib/firebase/setlists";

const DUREE_MS = 5 * 60_000;
let cache: { uid: string | null; at: number; promesse: Promise<FSSetlist[] | null> } | null = null;

export async function setlistsPourStats(): Promise<FSSetlist[]> {
  const uid = auth.currentUser?.uid ?? null;
  if (!cache || cache.uid !== uid || Date.now() - cache.at >= DUREE_MS) {
    const entree = {
      uid, at: Date.now(),
      promesse: getSetlists().catch(() => null),
    };
    cache = entree;
    // Un échec n'est pas gardé.
    void entree.promesse.then((liste) => { if (liste === null && cache === entree) cache = null; });
  }
  const liste = await cache.promesse;
  return liste ? [...liste] : [];
}
