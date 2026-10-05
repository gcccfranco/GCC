"use client";

// Lectures des widgets du tableau de bord (lot U6, B4) : chaque widget lit ce qu'il montre,
// à son montage, puis passe le résultat aux règles pures de `./donnees`.
import { useEffect, useState } from "react";
import { fusionnerLignes } from "@/lib/planning/grilles";
import { fetchGrille } from "@/lib/planning/grille";
import { lireSheetDe } from "@/lib/planning/sheets";

/**
 * Les lignes de plannings par clé : la grille de l'app et le Google Sheet réunis dimanche
 * par dimanche, comme l'export (`exporter.tsx`). Sans données de secours : un planning
 * illisible n'invente aucun nom.
 */
export async function lireGrilles(cles: string[]): Promise<Record<string, string[][]>> {
  return Object.fromEntries(await Promise.all(
    [...new Set(cles)].map(async (k) => [k, fusionnerLignes(await fetchGrille(k), await lireSheetDe(k))] as const),
  ));
}

/** Une lecture relancée quand `cle` change ; `erreur` si elle échoue (jamais « vide »). */
export function useLecture<T>(lire: () => Promise<T>, cle: string): { valeur: T | null; erreur: boolean } {
  const [etat, setEtat] = useState<{ cle: string; valeur: T | null; erreur: boolean }>({ cle: "", valeur: null, erreur: false });
  useEffect(() => {
    let vivant = true;
    lire().then(
      (valeur) => { if (vivant) setEtat({ cle, valeur, erreur: false }); },
      () => { if (vivant) setEtat({ cle, valeur: null, erreur: true }); },
    );
    return () => { vivant = false; };
    // `lire` change à chaque rendu ; `cle` dit ce qu'il lit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return etat.cle === cle ? { valeur: etat.valeur, erreur: etat.erreur } : { valeur: null, erreur: false };
}
