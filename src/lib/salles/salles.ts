// Les salles de l'église (docs/spec-salles.md, § Modèle, AR6, AR7, AR9) : neuf entrées, dans l'ordre de l'écran.
// Noms en français dans les deux langues, sauf 小班, 中班, 大班, 高班 (AR9).

export type SalleId = "grande" | "scene" | "fidelite" | "paix" | "amour" | "bonte" | "zhongban" | "imprimante" | "reunion";

/** Groupe d'affichage de la Liste (SA2) ; libellés `salles.groupes.*`. */
export type GroupeSalle = "grande" | "groupe" | "bureaux";

export interface Salle {
  id: SalleId;
  nom: string;
  /** Autre nom, selon qui l'occupe (« 小班 » pour la Salle Fidélité). */
  autreNom?: string;
  groupe: GroupeSalle;
  /** La Scène est dans la Grande salle (AR6) : affichée en retrait sous elle. */
  dans?: SalleId;
}

export const SALLES: readonly Salle[] = [
  { id: "grande", nom: "Grande salle", groupe: "grande" },
  { id: "scene", nom: "Scène", groupe: "grande", dans: "grande" },
  { id: "fidelite", nom: "Salle Fidélité", autreNom: "小班", groupe: "groupe" },
  { id: "paix", nom: "Salle Paix", autreNom: "高班", groupe: "groupe" },
  { id: "amour", nom: "Salle Amour", autreNom: "大班", groupe: "groupe" },
  { id: "bonte", nom: "Salle Bonté", groupe: "groupe" },
  { id: "zhongban", nom: "Salle 中班", groupe: "groupe" },
  { id: "imprimante", nom: "Salle imprimante", groupe: "bureaux" },
  { id: "reunion", nom: "Salle de réunion", groupe: "bureaux" },
];

/** Ce qui occupe l'une occupe l'autre : Grande salle ↔ Scène (AR6) ; toute autre salle n'est liée qu'à elle-même. */
export function lieuxLies(id: SalleId): SalleId[] {
  return id === "grande" || id === "scene" ? ["grande", "scene"] : [id];
}

/** Une valeur lue (Firestore) est-elle une des neuf salles ? */
export function estSalleId(x: unknown): x is SalleId {
  return typeof x === "string" && SALLES.some((s) => s.id === x);
}
