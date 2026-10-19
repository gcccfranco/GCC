"use client";

// Le catalogue d'Harmonie chargé par le layout de la section (lot U4 bis, B3) : la liste
// (`Catalogue.tsx`) et la fiche (`FicheHarmonie.tsx`) le lisent, sans le recharger.

import { createContext, useContext } from "react";
import type { AccesHarmonie } from "@/lib/harmonie/useHarmonie";
import type { Fiche, Instrument } from "@/types/harmonie";

interface CatalogueHarmonie {
  acces: AccesHarmonie;
  fiches: Fiche[];
  instrument: Instrument;
  setInstrument: (i: Instrument) => void;
  /** Combien de setlists chantent chaque chant (slug → nombre) : les exemples d'une fiche s'y
   *  classent. Les setlists ne sont lues qu'une fois pour la section, au premier appel. */
  comptesDesChants: () => Promise<Record<string, number>>;
}

export const ContexteCatalogue = createContext<CatalogueHarmonie | null>(null);

/** Le catalogue chargé par le layout : accès, fiches, instrument choisi (partagé par la
 *  liste et la fiche, qui ont toutes deux le choix Piano · Guitare). */
export function useCatalogueHarmonie(): CatalogueHarmonie {
  const c = useContext(ContexteCatalogue);
  if (!c) throw new Error("useCatalogueHarmonie hors du layout d'Harmonie");
  return c;
}

