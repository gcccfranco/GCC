// Harmonie (lot H5-1, docs/spec-harmonie-accords.md) — ce qui suit un accord : suites usuelles par degré,
// notes gardées et notes qui bougent entre deux accords. Pur : pas de React, pas d'accès au navigateur.

import { analyserAccord } from "@/lib/accords/analyse";
import { notesEnLettres } from "@/components/accords/outils";
import { noteToIndex, transposeChord } from "@/lib/transpose";

// shortcut: « 1m » ne couvre que le mineur naturel (4m, 5, b6) ; les autres degrés mineurs retombent sur 1, 5 ; à étoffer avec les fiches.
const SUITES: Record<string, string[]> = {
  "1m": ["4m", "5", "b6"],
  "1": ["4", "5", "6m"],
  "2m": ["5", "4"],
  "3m": ["6m", "4"],
  "4": ["5", "1", "2m"],
  "5": ["1", "6m", "4"],
  "6m": ["4", "2m", "5"],
  "7dim": ["1"],
};

/** Les suites usuelles d'un degré (« 4 », « 6m », sans basse) : les trois premières, « 1, 5 » pour le reste. */
export function suitesUsuelles(chiffre: string): string[] {
  return SUITES[chiffre] ?? ["1", "5"];
}

/** La tonalité des étiquettes d'un chant joué avec capo : D capo 2 → C. */
export function tonaliteDesEtiquettes(tonalite: string | undefined, capo?: number): string | undefined {
  return tonalite && capo ? transposeChord(tonalite, -capo, tonalite) : tonalite;
}

const DEMI_TONS: Record<string, number> = { "1": 0, "2": 2, "3": 4, "4": 5, "5": 7, "6": 9, "7": 11 };

/** « 6m » en D → « Bm » ; null si le chiffre ou la tonalité ne se lisent pas. */
export function accordDuChiffre(chiffre: string, tonalite: string): string | null {
  const m = /^([b#]?)([1-7])(m|dim)?$/.exec(chiffre);
  const tonique = noteToIndex(tonalite);
  if (!m || tonique < 0) return null;
  const st = (DEMI_TONS[m[2]] + (m[1] === "#" ? 1 : m[1] === "b" ? -1 : 0) + 12) % 12;
  return transposeChord("C" + (m[3] ?? ""), (tonique + st) % 12, tonalite);
}

/** Notes communes aux deux accords, puis chaque note de `de` absente de `vers` avec la note de `vers` la plus proche
 *  (la première de l'accord à égalité). Null si l'un des deux ne se lit pas. */
export function notesGardeesEtMouvantes(de: string, vers: string): { gardees: string[]; bougent: { de: string; vers: string }[] } | null {
  const a = analyserAccord(de);
  const b = analyserAccord(vers);
  if (!a || !b) return null;
  const notesB = notesEnLettres(b).split(" ");
  const classesB = notesB.map(noteToIndex);
  const gardees: string[] = [];
  const perdues: string[] = [];
  for (const n of notesEnLettres(a).split(" ")) (classesB.includes(noteToIndex(n)) ? gardees : perdues).push(n);
  const gardeesClasses = gardees.map(noteToIndex);
  const libres = notesB.filter((n) => !gardeesClasses.includes(noteToIndex(n)));
  const cibles = libres.length ? libres : notesB;
  const ecart = (x: string, y: string) => {
    const d = (noteToIndex(y) - noteToIndex(x) + 12) % 12;
    return Math.min(d, 12 - d);
  };
  const bougent = perdues.map((n) => ({ de: n, vers: cibles.reduce((p, c) => (ecart(n, c) < ecart(n, p) ? c : p)) }));
  return { gardees, bougent };
}

const sansBasse = (c: string) => c.split("/")[0];

export interface LigneEnsuite { chiffre: string; accord: string; dansCeChant: boolean }

/** Au plus trois suites : d'abord l'accord qui suit vraiment dans la partition (s'il diffère), puis les usuelles,
 *  sans doublon de chiffre. `chiffre` est celui de l'accord touché, sans basse. */
export function ensuite(chiffre: string, tonalite: string, reel?: { accord: string; chiffre: string }): LigneEnsuite[] {
  // Le suivant réel qui ne change que la basse ou la couleur du même degré (D → D/F#) n'est pas une suite.
  const lignes: LigneEnsuite[] = reel && sansBasse(reel.chiffre) !== chiffre ? [{ chiffre: reel.chiffre, accord: reel.accord, dansCeChant: true }] : [];
  for (const c of suitesUsuelles(chiffre)) {
    const accord = accordDuChiffre(c, tonalite);
    if (accord && !lignes.some((l) => sansBasse(l.chiffre) === c)) lignes.push({ chiffre: c, accord, dansCeChant: false });
  }
  return lignes.slice(0, 3);
}
