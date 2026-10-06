// Lot U6 (docs/spec-back-office.md, § Modèle) — l'espace Back-Office : ses 9 entrées, dans
// l'ordre du menu (Réunions à part depuis l'agencement v18, B15), et les 11 widgets du tableau de bord. Document `backOffice/{uid}`, écrit
// par l'intéressé seul (B5).
export const ENTREES = ["tableau", "calendrier", "planning", "taches", "evenements", "reunions", "equipes", "messages", "statistiques"] as const;
export const WIDGETS = ["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "scene", "comptes", "raccourcis"] as const;
export type Entree = (typeof ENTREES)[number];
export type WidgetId = (typeof WIDGETS)[number];
export type Taille = "s" | "m" | "l";
/** Clé absente = défaut de la table des widgets. */
export type Reglages = Partial<{
  services: string[]; poles: string[]; plannings: string[]; section: string; nombre: number;
  horizon: number; periode: "3m" | "6m" | "12m" | "tout"; programme: string; liste: "sansCompte" | "nouveaux";
  raccourcis: string[]; sources: string[]; seulementMoi: boolean;
}>;
export interface Widget { id: WidgetId; taille: Taille; reglages: Reglages }
export interface PreferencesBackOffice {
  /** Absent = défaut du rôle (Q11), jamais recopié. */
  tableauDeBord?: Widget[];
  /** 4 au plus, dans l'ordre ; absent = défaut (Q13). */
  barreDuBas?: Entree[];
  /** ISO. */
  majLe: string;
}
