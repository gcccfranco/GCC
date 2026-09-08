// Chromatic scale — index = semitone from C
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Enharmonic equivalents not in the standard arrays
const EXTRAS: Record<string, number> = { "E#": 5, "Fb": 4, "B#": 0, "Cb": 11 };

// Keys that prefer flats
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"]);

// Degrés chromatiques épelés en bémol même dans une tonalité « à dièses » :
// b3 (ex. Bb en Sol) et b6 (ex. Eb en Sol) — accords empruntés au mineur
// parallèle, jamais écrits A#/D# en pratique.
const FLAT_DEGREES = new Set([3, 8]);

function noteToIndex(note: string): number {
  const i = SHARPS.indexOf(note);
  if (i !== -1) return i;
  const j = FLATS.indexOf(note);
  if (j !== -1) return j;
  if (note in EXTRAS) return EXTRAS[note];
  return -1;
}

function indexToNote(index: number, useFlatKey: boolean, tonicIdx = -1): string {
  const i = ((index % 12) + 12) % 12;
  if (useFlatKey) return FLATS[i];
  if (tonicIdx !== -1 && FLAT_DEGREES.has((i - tonicIdx + 12) % 12)) return FLATS[i];
  return SHARPS[i];
}

/**
 * Transpose a single chord string by `semitones`.
 * `targetKey` determines enharmonic preference (sharps vs flats).
 * Preserves quality, extensions, slash bass.
 */
export function transposeChord(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;

  const useFlatKey = FLAT_KEYS.has(targetKey);
  const tonicIdx = noteToIndex(targetKey);

  // Parse root (1-2 chars) + quality + optional slash bass "/X"
  const match = chord.match(/^(\(?)([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?(\)?)$/);
  if (!match) return chord;

  const [, leftSlash,root, quality, bass, rightSlash] = match;

  const rootIdx = noteToIndex(root);
  if (rootIdx === -1) return chord;

  const newRoot = indexToNote(rootIdx + semitones, useFlatKey, tonicIdx);
  // La basse suit l'orthographe de la fondamentale si celle-ci est bémolisée
  // (Eb7/Bb, pas Eb7/A#) ; sinon préférence de la tonalité, sans la règle des
  // degrés — B/D# doit rester D#, pas Eb.
  const newBass = bass
    ? "/" + indexToNote(noteToIndex(bass) + semitones, useFlatKey || newRoot.endsWith("b"))
    : "";

  return leftSlash + newRoot + quality + newBass + rightSlash;
}

/**
 * Séparateurs d'une étiquette : tout ce qui n'est pas ASCII (les hanzi
 * « 或 », « 代替 », « 先 »/« 后 », les crochets pleine chasse 【 】), les
 * blancs, et la barre de mesure.
 */
const LABEL_SPLIT = /([^\x00-\x7F]+|[\s|]+)/;

/**
 * Ce qui a *la forme* d'un accord, testé sur le jeton entier.
 *
 * Volontairement plus strict que `transposeChord`, qui accepte n'importe
 * quoi derrière la fondamentale. Ici on découpe une ligne de texte : il
 * faut pouvoir dire « ce jeton n'est pas un accord » et le laisser tel
 * quel, sinon le « D » de « D.S. al Fine » partirait en « D# ».
 *
 * Deux formes s'y ajoutent depuis l'itération 37 : l'enrichissement entre
 * parenthèses qui commence par une lettre (`Am(maj7)`, que `Adim(9)` faisait
 * passer mais pas lui), et la **basse seule** (`/F`), que les gravures
 * écrivent pour une ligne de basse descendante — « D/F#  /F  B/D# ». Les deux
 * restaient verbatim au milieu d'une étiquette dont le reste était transposé.
 * Mesuré sur les 3 544 étiquettes publiées, aux douze transpositions : aucune
 * ne change.
 */
const CHORD_TOKEN =
  /^(?:\(?[A-G][#b]?(?:maj|min|sus|add|dim|aug|alt|M|m|Δ|ø|°|\+|-)*\d*(?:[b#]\d+)?(?:\((?:maj|min|add|sus|dim|aug)?[b#]?\d+\))?(?:sus\d?|add\d?)?(?:\/[A-G][#b]?)?|\/[A-G][#b]?)\)?$/;

/** Parenthèses et crochets qui décorent un jeton sans en faire partie. */
const EDGE_BRACKETS = /^([()[\]]*)(.*?)([()[\]]*)$/;

function transposeRun(run: string, semitones: number, targetKey: string): string {
  if (!run) return run;
  if (CHORD_TOKEN.test(run)) return transposeChord(run, semitones, targetKey);
  // Parenthèse orpheline collée au jeton : « Dm( » de « Dm(或Bb) ». On ne
  // la pèle qu'en second recours, sinon « Adim(9) » — dont la parenthèse
  // *fait* partie de l'accord — se ferait amputer.
  const m = run.match(EDGE_BRACKETS);
  if (m) {
    const [, lead, core, tail] = m;
    if (core && CHORD_TOKEN.test(core)) {
      return lead + transposeChord(core, semitones, targetKey) + tail;
    }
  }
  return run;
}

/**
 * Transpose une **étiquette entière** : une ligne de texte qui contient des
 * accords, et pas seulement un accord isolé.
 *
 * Le modèle « une étiquette = un accord » ne savait pas rendre ce que les
 * gravures écrivent vraiment : `F或F/Eb` (« F ou F/Eb »), `Gm代替Bb`
 * (« Gm à la place de Bb »), `先F后F#dim` (« d'abord F puis F#dim »), un
 * groupe entre parenthèses `(F C/E D)` noyé dans une ligne de paroles, ou
 * une ligne d'intro entière `【前奏 | G D/F# | … | D】`. Ces étiquettes-là
 * restaient dans l'ancienne tonalité à côté d'accords transposés — une
 * page à deux tonalités, ce qui est pire que pas de calque du tout.
 *
 * Découper l'image de l'amas ne marche pas (l'arc de liaison soude les
 * glyphes, le hanzi colle aux lettres) : on réécrit **le texte entier**,
 * jeton par jeton, en laissant verbatim tout ce qui n'est pas un accord.
 *
 * Une étiquette sans séparateur repasse telle quelle par `transposeChord` :
 * les milliers d'étiquettes déjà publiées gardent exactement le rendu
 * qu'elles avaient, y compris les formes que la grammaire stricte ci-dessus
 * refuserait (`Am(maj7`). Elle ne passait donc **pas** par les crochets de
 * bord de `transposeRun`, et un accord de remplacement écrit entre crochets
 * — `[Gm]`, sur 一粒麦子 — ressortait verbatim au milieu d'une rangée
 * transposée (itération 43). On ne pèle qu'en **second recours**, quand
 * `transposeChord` a rendu le texte inchangé : à un décalage non nul, un
 * accord qu'il a su lire change toujours de nom, donc l'égalité vaut échec.
 *
 * Doit rester le miroir exact de `transpose_label` dans
 * `scripts/jianpu/overlay.py`, qui rend le contrôle hors navigateur.
 */
export function transposeLabel(text: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return text;
  const parts = text.split(LABEL_SPLIT);
  if (parts.length === 1) {
    const direct = transposeChord(text, semitones, targetKey);
    if (direct !== text) return direct;
    const m = text.match(EDGE_BRACKETS);
    if (m && m[2] && CHORD_TOKEN.test(m[2])) {
      return m[1] + transposeChord(m[2], semitones, targetKey) + m[3];
    }
    return text;
  }
  return parts
    .map((part, i) => (i % 2 === 1 ? part : transposeRun(part, semitones, targetKey)))
    .join("");
}

/**
 * Return the target key after transposition, with proper enharmonic.
 */
export function getTransposedKey(originalKey: string, semitones: number): string {
  const idx = noteToIndex(originalKey);
  if (idx === -1) return originalKey;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const sharpVersion = SHARPS[newIdx];
  const flatVersion  = FLATS[newIdx];
  const key = FLAT_KEYS.has(flatVersion) ? flatVersion : sharpVersion;
  return key;
}

/** All keys in display order for the selector */
export const ALL_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "E#", "Fb", "F", "F#", "Gb",
  "G", "G#", "Ab", "A", "A#", "Bb", "B",
];

/**
 * Compute semitone offset to go from `fromKey` to `toKey` (shortest path, -5..+6).
 */
export function semitonesTo(fromKey: string, toKey: string): number {
  const from = noteToIndex(fromKey);
  const to   = noteToIndex(toKey);
  if (from === -1 || to === -1) return 0;
  let diff = ((to - from) % 12 + 12) % 12;
  if (diff > 6) diff -= 12; // prefer shorter route
  return diff;
}
