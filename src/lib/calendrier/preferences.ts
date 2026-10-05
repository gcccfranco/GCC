// Pastilles du calendrier retenues par appareil (lot U8, Q11) : `localStorage`
// « calendrier », lu et écrit sous `try` (navigation privée, stockage bloqué).
// D'office : toutes les sources sauf Setlists, « Seulement moi » éteint.

import { SOURCES, SOURCES_D_OFFICE, type SourceCalendrier } from "@/lib/calendrier/entrees";

export interface PreferencesCalendrier {
  sources: SourceCalendrier[];
  seulementMoi: boolean;
}

const CLE = "calendrier";
const D_OFFICE: PreferencesCalendrier = { sources: [...SOURCES_D_OFFICE], seulementMoi: false };

export function lirePreferences(): PreferencesCalendrier {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "null") as Partial<PreferencesCalendrier> | null;
    if (!brut || !Array.isArray(brut.sources)) return D_OFFICE;
    return {
      sources: SOURCES.filter((s) => brut.sources!.includes(s)),
      seulementMoi: brut.seulementMoi === true,
    };
  } catch {
    return D_OFFICE;
  }
}

export function ecrirePreferences(p: PreferencesCalendrier): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    // Stockage indisponible : le choix vaut pour la visite seulement.
  }
}
