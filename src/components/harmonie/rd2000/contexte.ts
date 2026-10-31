"use client";

// Sons du RD-2000 chargés par le layout de `/harmonie/rd2000` (lot U4 bis, B3) : la liste
// (`Rd2000Harmonie.tsx`) et la page d'un son (`SonRd2000.tsx`) les lisent sans les recharger.

import { createContext, useContext } from "react";
import type { Rd2000, Son } from "@/lib/harmonie/rd2000";

/** Le catalogue chargé par le layout : la liste et la page du son le lisent sans le recharger. */
export const ContexteRd2000 = createContext<{ donnees: Rd2000; parN: Map<string, Son> } | null>(null);

export function useRd2000Charge() {
  const c = useContext(ContexteRd2000);
  if (!c) throw new Error("useRd2000Charge hors du layout des sons");
  return c;
}
