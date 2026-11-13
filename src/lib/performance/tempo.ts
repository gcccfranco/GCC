// Métronome visuel du mode louange (docs/spec-mode-louange-forscore.md, lot L4) :
// bornes du tempo, réglage global (par appareil) et tempo réglé par chant
// (par appareil). Aucun son. Stockage en try/catch : indisponible = valeurs par défaut.
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 240;
/** Valeur de départ des − / + quand le chant n'a ni tempo ni réglage. */
export const TEMPO_DEPART = 72;

const CLE_METRONOME = "perf-metronome";
const cleTempo = (id: string) => `perf-tempo-${id}`;

export function clampTempo(n: number): number {
  if (!Number.isFinite(n)) return TEMPO_DEPART;
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(n)));
}

/** Métronome visuel actif sur cet appareil ? Inactif par défaut. */
export function getMetronomePref(): boolean {
  try {
    return localStorage.getItem(CLE_METRONOME) === "1";
  } catch {
    return false;
  }
}

export function setMetronomePref(actif: boolean) {
  try { localStorage.setItem(CLE_METRONOME, actif ? "1" : "0"); } catch { /* stockage indisponible */ }
}

/** Tempo réglé sur cet appareil pour ce chant, ou null. */
export function getTempoChant(id: string): number | null {
  try {
    const brut = localStorage.getItem(cleTempo(id));
    if (brut === null) return null;
    const n = Number(brut);
    return Number.isFinite(n) ? clampTempo(n) : null;
  } catch {
    return null;
  }
}

/** Enregistre le tempo du chant ; null efface le réglage (retour au fichier). */
export function setTempoChant(id: string, tempo: number | null) {
  try {
    if (tempo === null) localStorage.removeItem(cleTempo(id));
    else localStorage.setItem(cleTempo(id), String(clampTempo(tempo)));
  } catch { /* stockage indisponible */ }
}
