// Mode d'affichage de la vue partitions d'une setlist (coup d'œil) — par
// appareil (localStorage). « Ordre joué » par défaut (décision de Timothée du
// 20/09/2026 : les paroles suivent la structure, reprises comprises) ;
// « Structure seule » si le rôle mémorisé du mode louange est Batteur et
// qu'aucun choix n'a été fait ici. Voir docs/spec-coup-d-oeil.md.
export type PartitionLayout = "played" | "unique" | "structure";

const KEY = "partition-layout";
const ROLE_KEY = "perf-role-preset";

export function getPartitionLayoutPref(): PartitionLayout {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "played" || v === "unique" || v === "structure") return v;
    return localStorage.getItem(ROLE_KEY) === "batteur" ? "structure" : "played";
  } catch {
    return "played";
  }
}

export function setPartitionLayoutPref(v: PartitionLayout) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}
