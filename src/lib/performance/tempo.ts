// Métronome visuel du mode louange (docs/spec-mode-louange-forscore.md, lot L4) :
// bornes du tempo, réglage global (par appareil) et tempo réglé par chant
// (par appareil). Aucun son. Stockage en try/catch : indisponible = valeurs par défaut.
import type { Accent } from "@/lib/performance/metronome";
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

// ─── Réglages du métronome (lot MT, MT-2) : `perf-metro-*`, rien sur Firestore ───

export type Subdivision = "aucune" | "croches" | "doubles" | "pointee" | "triolets";
export const SUBDIVISIONS: Subdivision[] = ["aucune", "croches", "doubles", "pointee", "triolets"];
export type Decompte = 0 | 1 | 2;

const cleMesure = (id: string) => `perf-metro-mesure-${id}`;
const cleAccents = (id: string) => `perf-metro-accents-${id}`;
const cleSubdiv = (id: string) => `perf-metro-subdiv-${id}`;
const CLE_DECOMPTE = "perf-metro-decompte";
const LETTRE: Record<Accent, string> = { fort: "f", moyen: "m", faible: "a", muet: "s" };
const ACCENT_DE: Record<string, Accent> = { f: "fort", m: "moyen", a: "faible", s: "muet" };

function lire(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch { /* stockage indisponible */ }
}

/** Mesure réglée pour ce chant (« 5/8 »), ou null (retour à celle du fichier). */
export function getMesureChant(id: string): string | null {
  const brut = lire(cleMesure(id));
  const m = brut ? /^(\d{1,2})\/(4|8)$/.exec(brut) : null;
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? brut : null;
}
export function setMesureChant(id: string, mesure: string | null) { ecrire(cleMesure(id), mesure); }

/** Accents réglés pour ce chant : une lettre par temps (f, m, a, s) ; invalide ou longueur ≠ `nb` → null (défauts). */
export function getAccentsChant(id: string, nb: number): Accent[] | null {
  const brut = lire(cleAccents(id));
  if (!brut || brut.length !== nb || !/^[fmas]+$/.test(brut)) return null;
  return Array.from(brut, (c) => ACCENT_DE[c]);
}
export function setAccentsChant(id: string, accents: Accent[] | null) {
  ecrire(cleAccents(id), accents ? accents.map((a) => LETTRE[a]).join("") : null);
}

export function getSubdivisionChant(id: string): Subdivision | null {
  const brut = lire(cleSubdiv(id));
  return SUBDIVISIONS.includes(brut as Subdivision) ? (brut as Subdivision) : null;
}
export function setSubdivisionChant(id: string, s: Subdivision | null) { ecrire(cleSubdiv(id), s); }

/** Décompte (mesures avant le départ), par appareil : 0 par défaut. */
export function getDecompte(): Decompte {
  const n = Number(lire(CLE_DECOMPTE));
  return n === 1 || n === 2 ? n : 0;
}
export function setDecompte(n: Decompte) { ecrire(CLE_DECOMPTE, String(n)); }

// ─── Son du métronome (MT-3) : son choisi et volume par appareil ; le son allumé n'est jamais retenu ───

export type SonMetro = "clic" | "bois" | "cloche";
export const SONS_METRO: SonMetro[] = ["clic", "bois", "cloche"];
const CLE_SON = "perf-metro-son";
const CLE_VOLUME = "perf-metro-volume";

export function getSonMetro(): SonMetro {
  const brut = lire(CLE_SON);
  return SONS_METRO.includes(brut as SonMetro) ? (brut as SonMetro) : "clic";
}
export function setSonMetro(s: SonMetro) { ecrire(CLE_SON, s); }

/** Volume 0 à 100, 80 au départ. */
export function getVolumeMetro(): number {
  const brut = lire(CLE_VOLUME);
  const n = brut === null ? NaN : Number(brut);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 80;
}
export function setVolumeMetro(n: number) { ecrire(CLE_VOLUME, String(Math.min(100, Math.max(0, Math.round(n))))); }
