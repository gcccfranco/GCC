import Fuse from "fuse.js";
import type { SongIndexEntry } from "@/types/song";
import type { ChordProAST, Token } from "@/types/chordPro";
import { semitonesTo } from "@/lib/transpose";
import { transposeSection } from "@/lib/transposeAST";

/** Bibliothèque de l'éditeur de setlist (docs/spec-editeur-setlist.md, Q11) :
 *  recherche titre, pinyin, artiste, puis filtres langue, thème, tempo. Les
 *  chants déjà dans la setlist restent (l'écran les marque « Dans la setlist »). */

export type Tempo = "lent" | "modere" | "rapide";

export interface FiltresBibliotheque {
  recherche: string;
  langue: "tous" | "fr" | "zh";
  /** Slug d'un thème de `content/themes.json`, comme la page Chants. */
  theme: string | null;
  tempo: Tempo | null;
}

/** Lent < 90, Modéré 90–119, Rapide ≥ 120 ; un chant sans tempo n'a pas de tranche. */
export function trancheDeTempo(bpm: number | null): Tempo | null {
  if (bpm == null) return null;
  if (bpm < 90) return "lent";
  if (bpm < 120) return "modere";
  return "rapide";
}

/** Chants à montrer : par pertinence s'il y a une recherche (mêmes clés et seuil
 *  que la page Chants), sinon dans l'ordre reçu ; sans limite de nombre. */
export function chantsDeLaBibliotheque(songs: SongIndexEntry[], f: FiltresBibliotheque): SongIndexEntry[] {
  const recherche = f.recherche.trim();
  const trouves = recherche
    ? new Fuse(songs, { keys: ["title", "titlePinyin", "artist"], threshold: 0.4 }).search(recherche).map((r) => r.item)
    : songs;
  return trouves.filter(
    (s) =>
      (f.langue === "tous" || s.language === f.langue) &&
      (!f.theme || s.themes.includes(f.theme)) &&
      (!f.tempo || trancheDeTempo(s.tempo) === f.tempo),
  );
}

/** Aperçu d'un chant (Q12) : ses `n` premières lignes chantées (une ligne d'accords
 *  seuls, comme une intro, ne compte pas), accords transposés de `ast.metadata.key`
 *  vers `cible` — la tonalité où le chant serait ajouté. Sans pinyin ni 简谱 : seuls
 *  les jetons de la ligne sont rendus. */
export function premieresLignes(ast: ChordProAST, cible: string, n = 2): Token[][] {
  const demi = semitonesTo(ast.metadata.key || cible, cible);
  const lignes: Token[][] = [];
  for (const section of ast.sections) {
    for (const ligne of transposeSection(section, demi, cible).lines) {
      if (!ligne.tokens.some((t) => t.type === "lyric" && t.value.trim())) continue;
      lignes.push(ligne.tokens);
      if (lignes.length === n) return lignes;
    }
  }
  return lignes;
}
