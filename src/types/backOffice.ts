// Lot U6 (docs/spec-back-office.md, § Modèle) — l'espace Back-Office : ses 5 entrées, dans
// l'ordre du menu (piste A, BO1, docs/spec-back-office-piste-a.md), et les 12 widgets du tableau de bord
// (qui s'en va avec BO-B). Document `backOffice/{uid}`, écrit par l'intéressé seul (B5).
export const ENTREES = ["afaire", "calendrier", "planning", "equipes", "messages"] as const;
export const WIDGETS = ["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "reunions", "chants", "petitdej", "scene", "comptes", "raccourcis"] as const;
export type Entree = (typeof ENTREES)[number];
export type WidgetId = (typeof WIDGETS)[number];
export type Taille = "s" | "m" | "l";
/** Clé absente = défaut de la table des widgets. */
export type Reglages = Partial<{
  services: string[]; equipes: string[]; plannings: string[]; section: string; nombre: number;
  horizon: number; periode: "3m" | "6m" | "12m" | "tout"; programme: string; liste: "sansCompte" | "nouveaux";
  raccourcis: string[]; sources: string[]; seulementMoi: boolean;
}>;
export interface Widget { id: WidgetId; taille: Taille; reglages: Reglages }
export interface PreferencesBackOffice {
  /** Absent = défaut du rôle (Q11), jamais recopié. */
  tableauDeBord?: Widget[];
  /** Ancien réglage « Personnaliser la barre » (B6) : plus lu depuis BO2 (la barre du bas a cinq onglets fixes), jamais effacé. */
  barreDuBas?: string[];
  /** Absente ou plus ancienne que `VERSION_TABLEAU` = la disposition enregistrée est remplacée une fois par le défaut (lot TB2, T10). */
  versionTableau?: number;
  /** ISO. */
  majLe: string;
}
