// Harmonie (lot 9, docs/spec-harmonie.md) — situer un accord dans la tonalité.
// Tout le catalogue et toutes les règles sont écrits **en degrés** : une règle
// s'écrit une fois et vaut dans les 12 tonalités, au piano comme à la guitare.
// Fonctions pures, sans état : le build (exemples du répertoire) et le
// navigateur (suggestions) les partagent.

import { noteToIndex } from "@/lib/transpose";

/** Qualité retenue par les règles. `maj7`, `add9`, `6/9`, `7` restent majeurs :
 *  la couleur ne change pas la fonction de l'accord. */
export type Qualite = "maj" | "min" | "dim" | "sus" | "aug";

export interface AccordDegre {
  /** Demi-tons depuis la tonique : 0 = 1, 2 = 2, 5 = 4, 7 = 5, 9 = 6, 10 = b7. */
  st: number;
  qualite: Qualite;
  /** Basse différente de la fondamentale, en demi-tons depuis la tonique. */
  basse: number | null;
  /** L'étiquette telle qu'elle est écrite dans le chant (« Em7 », « G/A »). */
  texte: string;
}

const RACINE = /^([A-G][#b]?)(.*)$/;

function qualiteDe(reste: string): Qualite {
  if (/^(?:maj|Maj|M(?![a-z]))/.test(reste)) return "maj";
  if (/^m(?!aj)/.test(reste) || /^min/.test(reste)) return "min";
  if (/^(?:dim|°)/.test(reste)) return "dim";
  if (/^sus/.test(reste)) return "sus";
  if (/^(?:aug|\+)/.test(reste)) return "aug";
  return "maj";
}

/** Un accord (« Em7 », « G/A ») situé dans une tonalité. `null` si l'un des
 *  deux ne se lit pas — un chant peut porter « N.C. » ou une coquille. */
export function degreDeLAccord(accord: string, tonalite: string): AccordDegre | null {
  const tonique = noteToIndex(tonalite.replace(/m$/, ""));
  if (tonique < 0 || !accord) return null;
  const [corps, basseTexte] = accord.split("/");
  const m = corps.match(RACINE);
  if (!m) return null;
  const racine = noteToIndex(m[1]);
  if (racine < 0) return null;
  let basse: number | null = null;
  if (basseTexte) {
    const b = noteToIndex(basseTexte.match(RACINE)?.[1] ?? "");
    if (b >= 0 && b !== racine) basse = (b - tonique + 12) % 12;
  }
  return { st: (racine - tonique + 12) % 12, qualite: qualiteDe(m[2]), basse, texte: accord };
}

/** Une suite d'accords écrits dans un chant → la suite de ses degrés, les
 *  illisibles simplement sautés. */
export function degresDeLaSuite(accords: string[], tonalite: string): AccordDegre[] {
  const out: AccordDegre[] = [];
  for (const a of accords) {
    const d = degreDeLAccord(a, tonalite);
    if (d) out.push(d);
  }
  return out;
}

// Degrés écrits en chiffres (décision du 17/09/2026) : 1 · 2m · b3 · 3m · 4 ·
// #4 · 5 · b6 · 6m · b7 · 7. Les altérations reprennent l'usage des fiches.
const CHIFFRES = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];

function chiffre(st: number, qualite?: Qualite): string {
  const base = CHIFFRES[((st % 12) + 12) % 12];
  if (qualite === "min") return `${base}m`;
  if (qualite === "dim") return `${base}dim`;
  return base;
}

/** « 4 », « 2m », « b7 », « 4/5 » — le degré tel qu'il s'écrit dans les fiches. */
export function chiffreDuDegre(d: AccordDegre): string {
  const tete = chiffre(d.st, d.qualite);
  return d.basse == null ? tete : `${tete}/${chiffre(d.basse)}`;
}
