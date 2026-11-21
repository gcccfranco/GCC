// Les salles de l'église (docs/spec-salles.md, § Modèle, AR6, AR7, AR9) : huit entrées, dans l'ordre de l'écran (AS14 : la Grande salle est la Scène ; AS14 remplace AR6).
// Noms en français dans les deux langues, sauf 小班, 中班, 大班, 高班 (AR9).

// "scene" ne se lit que dans les anciens documents (AS14) : `salleLue` la rend "grande", on n'en écrit plus.
export type SalleId = "grande" | "scene" | "fidelite" | "paix" | "amour" | "bonte" | "zhongban" | "imprimante" | "reunion";

/** Groupe d'affichage de la Liste (SA2) ; libellés `salles.groupes.*`. */
export type GroupeSalle = "grande" | "groupe" | "bureaux";

export interface Salle {
  id: SalleId;
  nom: string;
  /** Autre nom, selon qui l'occupe (« 小班 » pour la Salle Fidélité). */
  autreNom?: string;
  groupe: GroupeSalle;
}

export const SALLES: readonly Salle[] = [
  { id: "grande", nom: "Grande salle", groupe: "grande" },
  { id: "fidelite", nom: "Salle Fidélité", autreNom: "小班", groupe: "groupe" },
  { id: "paix", nom: "Salle Paix", autreNom: "高班", groupe: "groupe" },
  { id: "amour", nom: "Salle Amour", autreNom: "大班", groupe: "groupe" },
  { id: "bonte", nom: "Salle Bonté", groupe: "groupe" },
  { id: "zhongban", nom: "Salle 中班", groupe: "groupe" },
  { id: "imprimante", nom: "Salle imprimante", groupe: "bureaux" },
  { id: "reunion", nom: "Salle de réunion", groupe: "bureaux" },
];

/** Une salle lue (RS9) : l'ancienne Scène est la Grande salle (AS14) ; toute autre salle est elle-même. */
export function salleLue(id: SalleId): SalleId {
  return id === "scene" ? "grande" : id;
}

/** Une valeur lue (Firestore) est-elle une des huit salles, ou l'ancienne « scene » (lecture seule) ? */
export function estSalleId(x: unknown): x is SalleId {
  return typeof x === "string" && (x === "scene" || SALLES.some((s) => s.id === x));
}

/** « Salle Fidélité · 小班 » : le nom et l'autre nom, comme dans le champ « Salle de l'église ». */
export function nomAvecAutre(id: SalleId): string {
  const s = SALLES.find((x) => x.id === salleLue(id))!;
  return s.autreNom ? `${s.nom} · ${s.autreNom}` : s.nom;
}

/** Le lieu à afficher d'un évènement ou d'une réunion (SA12, T4b) : sa salle si elle en porte une, sinon le lieu écrit. */
export function lieuAffiche(e: { lieu: string; salle?: unknown }): string {
  return estSalleId(e.salle) ? nomAvecAutre(e.salle) : e.lieu;
}
