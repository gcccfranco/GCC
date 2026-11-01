// Lecture partagée des setlists pour les statistiques d'un chant (lot ST, ST2) : `getSetlists()` ne relit plus
// la collection (copie sur l'appareil + delta, lot LF, docs/spec-lectures-firestore.md) et garde sa promesse
// 60 s, donc plus de garde propre ici. Erreur ou hors ligne : `[]`.

import { getSetlists } from "@/lib/firebase/setlists";
import type { FSSetlist } from "@/types/setList";

export async function setlistsPourStats(): Promise<FSSetlist[]> {
  return getSetlists().catch(() => []);
}
