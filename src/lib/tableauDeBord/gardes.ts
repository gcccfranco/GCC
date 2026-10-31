// Registre des gardes du tableau de bord (lot LF, docs/spec-lectures-firestore.md, LF3).
// Module neutre, sans React ni Firestore : `lecture.ts` y inscrit ses gardes, et les modules
// qui écrivent (`taches`, `absences`, `planningGrille`, `evenements`, `programmes`) les vident
// sans importer `lecture.ts` (pas de cycle).
const gardes = new Set<() => void>();

/** Inscrit la fonction qui vide une garde (`() => { garde = null }`). */
export function inscrireGarde(vider: () => void): void {
  gardes.add(vider);
}

/** Vide toutes les gardes : à appeler après une écriture, réussie ou non, qui change ce que montre « À faire ». */
export function viderGardesTableau(): void {
  for (const vider of gardes) vider();
}
