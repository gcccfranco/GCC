"use client";

import { createContext, useContext } from "react";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { PlanningData } from "@/lib/planning/names";
import type { ServiceGroupe } from "@/lib/planning/mesServices";
import type { SongIndexEntry } from "@/types/song";

export type Valeur = {
  /** Tous les services de la personne, dans l'ordre des dates. */
  services: ServiceGroupe[];
  aujourdhui: string;
  planning: PlanningData;
  songs: Record<string, SongIndexEntry>;
  monNom: string;
  /** La setlist liée à un service, si la personne peut l'ouvrir. */
  setlistDe: (s: ServiceGroupe) => FSSetlist | undefined;
};

const Contexte = createContext<Valeur | null>(null);

export const FournirMesServices = Contexte.Provider;

export function useMesServices(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error("useMesServices hors de SectionMesServices");
  return v;
}
