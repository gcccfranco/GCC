// Mode d'affichage de la vue partitions d'une setlist (coup d'œil) — par
// appareil (localStorage). « Sections uniques » par défaut ; « Structure
// seule » si le rôle mémorisé du mode louange est Batteur et qu'aucun choix
// n'a été fait ici. Voir docs/spec-coup-d-oeil.md.
export type PartitionLayout = "played" | "unique" | "structure";

const KEY = "partition-layout";
const ROLE_KEY = "perf-role-preset";

export function getPartitionLayoutPref(): PartitionLayout {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "played" || v === "unique" || v === "structure") return v;
    return localStorage.getItem(ROLE_KEY) === "batteur" ? "structure" : "unique";
  } catch {
    return "unique";
  }
}

export function setPartitionLayoutPref(v: PartitionLayout) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}
