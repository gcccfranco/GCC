// Mode d'affichage de la vue partitions d'une setlist (coup d'œil) — par
// appareil (localStorage). « Ordre joué » par défaut (décision de Timothée du
// 20/09/2026 : les paroles suivent la structure, reprises comprises) ;
// « Structure seule » si le rôle du compte (mode louange) est Batteur et
// qu'aucun choix n'a été fait ici (lecture seule : seule l'ouverture du mode louange migre le rôle d'appareil). Voir docs/spec-coup-d-oeil.md.
import { getRoleSansMigrer } from "@/lib/performance/roleCompte";

export type PartitionLayout = "played" | "unique" | "structure";

const KEY = "partition-layout";

export function getPartitionLayoutPref(uid: string | null): PartitionLayout {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "played" || v === "unique" || v === "structure") return v;
    return getRoleSansMigrer(uid) === "batteur" ? "structure" : "played";
  } catch {
    return "played";
  }
}

export function setPartitionLayoutPref(v: PartitionLayout) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}
