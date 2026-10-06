"use client";

import { useSyncExternalStore } from "react";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";

// Les trois dispositions des pages en grand (lot U4 bis, docs/spec-pages-en-grand.md, Q1) :
// « grand » = deux volets (U5, Q1) ; « tablette » = un volet dès 768 px (tablette portrait,
// ordinateur étroit barre dépliée) ; « telephone » sinon.
export type Disposition = "grand" | "tablette" | "telephone";

const TABLETTE = "(min-width: 768px)";
const suivreTablette = (changement: () => void) => {
  const m = window.matchMedia(TABLETTE);
  m.addEventListener("change", changement);
  return () => m.removeEventListener("change", changement);
};

export function useDisposition(): Disposition {
  const grand = useDeuxVolets();
  const tablette = useSyncExternalStore(suivreTablette, () => window.matchMedia(TABLETTE).matches, () => false);
  return grand ? "grand" : tablette ? "tablette" : "telephone";
}
