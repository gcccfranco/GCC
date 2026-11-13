"use client";

import { createContext, useContext } from "react";
import type { TacheAvecFois } from "@/lib/firebase/taches";

export type Valeur = {
  /** Les équipes de la personne, Louange élargi (`equipesDesTaches` ; un admin : toutes). */
  equipes: string[];
  items: TacheAvecFois[];
  chargement: boolean;
  /** Sans équipe, relit tout ; avec, seulement cette équipe (après une écriture dans cette équipe). */
  reload: (equipe?: string) => Promise<void>;
  aujourdhui: string;
  /** Nom écrit sur une fois commencée ou terminée. */
  parNom: string;
  /** Adresse des fiches : `/taches` (App) ou `/back-office/taches` (agencement v18, B1). */
  racine: string;
  /** Back-Office › Tâches (B1, B2) : la fiche porte « ⋯ », l'historique, et « Modifier » ouvre le
   *  formulaire dans le volet en grand ; dans l'App, la fiche d'aujourd'hui. */
  backOffice: boolean;
};

const Contexte = createContext<Valeur | null>(null);

/** Donne les tâches d'une section à ses pages (`SectionTaches` dans l'App ; le layout de
 *  Back-Office › Tâches, agencement v18, B1). */
export const FournirTaches = Contexte.Provider;

export function useMesTaches(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error("useMesTaches hors de SectionTaches");
  return v;
}
