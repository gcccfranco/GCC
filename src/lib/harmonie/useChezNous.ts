"use client";

// Harmonie (lot H9) — lire `public/harmonie-chez-nous.json`, construit au build, une fois par visite.
// Absent (hors ligne sans copie, erreur) : null, et les écrans gardent le tableau écrit à la main.

import { useEffect, useState } from "react";
import type { ChezNous } from "./chezNous";

let promesse: Promise<ChezNous | null> | null = null;
let charge: ChezNous | null = null;

function charger(): Promise<ChezNous | null> {
  promesse ??= fetch("/harmonie-chez-nous.json")
    .then((r) => (r.ok ? (r.json() as Promise<ChezNous>) : null))
    .then((d) => (charge = d))
    .catch(() => { promesse = null; return null; });
  return promesse;
}

export function useChezNous(): ChezNous | null {
  const [index, setIndex] = useState<ChezNous | null>(charge);
  useEffect(() => {
    if (charge) return;
    let vivant = true;
    charger().then((d) => { if (vivant) setIndex(d); });
    return () => { vivant = false; };
  }, []);
  return index;
}
