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

  // Basse seule « /F » : `CHORD_TOKEN` la reconnaît depuis l'itération 37,
  // mais le motif ci-dessous exige une fondamentale et la rendait verbatim —
  // « D/F# /F B/D# » de 我安然居住 publiait son « /F » dans l'ancienne
  // tonalité (itération 62).
  const bassOnly = chord.match(/^\/([A-G][#b]?)$/);
  if (bassOnly) {
    const idx = noteToIndex(bassOnly[1]);
    return idx === -1 ? chord : "/" + indexToNote(idx + semitones, useFlatKey);
  }

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
 *
 * Exporté pour `sweep-browser.ts` : quand le fond opaque d'un voisin rogne un
 * accord réécrit, ce qui reste à l'écran peut se lire comme un **autre**
 * accord (« Gb/Bb » coupé en « Gb/B »). Le dire demande la notion d'accord
 * de l'application, pas une copie qui divergera.
 */
export const CHORD_TOKEN =
  /^(?:\(?[A-G][#b]?(?:maj|min|sus|add|dim|aug|alt|M|m|Δ|ø|°|\+|-)*\d*(?:[b#]\d+)?(?:\((?:maj|min|add|sus|dim|aug)?[b#]?\d+\))?(?:sus\d?|add\d?)?(?:\/[A-G][#b]?)?|\/[A-G][#b]?)\)?$/;

/** Parenthèses et crochets qui décorent un jeton sans en faire partie. */
const EDGE_BRACKETS = /^([()[\]]*)(.*?)([()[\]]*)$/;

/**
 * Une parenthèse ouvrante suivie d'une note ou d'une basse seule commence un
 * **autre** accord : « B/D#(G#) », « C(/B) ». Les enrichissements qui font
 * partie de l'accord s'ouvrent sur une minuscule, un chiffre ou une
 * altération (`Am(maj7)`, `Adim(9)`, `C7(#9)`) et n'y répondent pas.
 */
const PAREN_CHORD = /(?=\(\/?[A-G])/;

/**
 * « B/D#(G#) », gravé sans blanc : `transposeChord` lisait « /D#(G# » comme
 * une qualité et rendait « C/D#(G#) » — à moitié transposé, et plausible
 * (itération 62). On découpe devant chaque parenthèse d'accord, et on ne
 * rend le découpage que si **chaque** morceau a été réécrit ; sinon `null`,
 * et l'étiquette suit le chemin d'avant.
 */
function transposeParenGroup(run: string, semitones: number, targetKey: string): string | null {
  const pieces = run.split(PAREN_CHORD).filter(Boolean);
  if (pieces.length < 2) return null;
  const out = pieces.map((p) => transposeRun(p, semitones, targetKey));
  return out.every((o, i) => o !== pieces[i]) ? out.join("") : null;
}

function transposeRun(run: string, semitones: number, targetKey: string): string {
  if (!run) return run;
  if (CHORD_TOKEN.test(run)) return transposeChord(run, semitones, targetKey);
  const group = transposeParenGroup(run, semitones, targetKey);
  if (group !== null) return group;
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
    const group = transposeParenGroup(text, semitones, targetKey);
    if (group !== null) return group;
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
 * Tonalité d'**orthographe** d'une section gravée `alt` demi-tons au-dessus
 * de la page : une rangée de positions de capo, un second jeu d'accords, une
 * modulation. Le décalage appliqué reste celui de la page — les deux jeux
 * montent ensemble — et seule leur écriture diffère.
 *
 * `getTransposedKey` y répond presque toujours juste, parce que sa
 * préférence pour les bémols est en réalité celle du **moindre nombre
 * d'altérations** : Db (5♭) contre C# (7♯), Eb (3♭) contre D# (9♯), Ab (4♭)
 * contre G# (8♯), Bb (2♭) contre A# (10♯). Le compte tranche, et il
 * tranche du même côté quelle que soit la page.
 *
 * Il reste **un** degré où il ne tranche pas : F# et Gb font six altérations
 * chacun. `getTransposedKey` y répond **F#**, l'usage des grilles ; mais une
 * page en sol bémol, tout en bémols, y veut Gb. À égalité d'altérations,
 * c'est donc la page qui dit de quel côté on lit — dans un sens comme dans
 * l'autre.
 *
 * C'est ce défaut-là qui a fait écrire cette fonction (itération 55) : la
 * réponse était alors Gb quelle que soit la page, et 有你同行 rendu en mi —
 * tout en dièses — affichait sa modulation en Gb / Db / Ebm / Bbm juste sous
 * des accords en G#m / C#m. Le défaut symétrique existe toujours, d'où le
 * garde-fou.
 *
 * Ailleurs le compte garde le dernier mot, et c'est délibéré : contraindre
 * la section à la famille de la page rendrait « Ab » en « G# » sur une page
 * en sol et « Bb » en « A# » sur une page en la — mesuré, et pire que le
 * défaut qu'on corrige.
 */
export function altSpellingKey(pageKey: string, alt: number): string {
  if (!alt) return pageKey;
  const key = getTransposedKey(pageKey, alt);
  // Le triton depuis do : le seul degré où F# et Gb se valent.
  if (noteToIndex(key) !== 6) return key;
  return FLAT_KEYS.has(pageKey) || pageKey.includes("b") ? "Gb" : "F#";
}

/**
 * Return the target key after transposition, with proper enharmonic.
 */
export function getTransposedKey(originalKey: string, semitones: number): string {
  const idx = noteToIndex(originalKey);
  if (idx === -1) return originalKey;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  // Au triton, le compte des altérations ne tranche pas — F# et Gb en font six
  // chacune — et l'usage des grilles dit F#. La réponse était Gb, seul nom que
  // `ALL_KEYS` ne porte plus : les boutons − / + rendaient alors une valeur
  // absente du sélecteur, qui s'affichait vide.
  if (newIdx === 6) return "F#";
  const sharpVersion = SHARPS[newIdx];
  const flatVersion  = FLATS[newIdx];
  const key = FLAT_KEYS.has(flatVersion) ? flatVersion : sharpVersion;
  return key;
}

/**
 * Les douze tonalités du sélecteur, dans l'écriture qu'un musicien attend sur
 * une **grille d'accords**.
 *
 * La liste en portait dix-neuf : les douze hauteurs, plus les deux noms de
 * chaque hauteur ambiguë, plus `E#` et `Fb`. Or sept de ces noms ne sont pas
 * des tonalités qu'on écrit : `D#` (9 dièses), `A#` (10), `G#` (8), `E#` (11),
 * `Fb` (8 bémols). Le critère est le **nombre d'altérations**, le même qui
 * décide de l'orthographe des accords : Db (5♭) contre C# (7♯), Eb (3♭) contre
 * D# (9♯), Ab (4♭) contre G# (8♯), Bb (2♭) contre A# (10♯). Une seule hauteur
 * reste à égalité — fa♯ et sol♭ font six altérations chacune — et l'usage des
 * grilles y dit **F#**.
 *
 * Une tonalité déjà choisie qui s'écrit autrement ne disparaît pas pour
 * autant : c'est le rôle de `keyOptions`.
 */
export const ALL_KEYS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

/**
 * Les douze, plus la tonalité déjà en place quand elle s'écrit autrement.
 *
 * Un `<select>` dont la valeur n'est dans aucune option s'affiche **vide**, et
 * un chant gravé en `C#` ou une setlist dont quelqu'un a choisi `Gb` perdrait
 * silencieusement sa tonalité à l'écran. Le corpus en compte : `a-jamais-tu-es-saint`
 * est en `C#`, `dieu-sauveur` en `G#`, et deux chants sont en `Am` — un nom que
 * la liste n'a jamais porté.
 *
 * Le nom reçu est inséré devant l'entrée de **même hauteur**, pour que l'ordre
 * reste chromatique et que les deux orthographes soient voisines. Un nom dont
 * la hauteur est inconnue (`Am`) va en fin de liste.
 */
export function keyOptions(current?: string | null): string[] {
  if (!current || ALL_KEYS.includes(current)) return ALL_KEYS;
  const i = ALL_KEYS.findIndex((k) => noteToIndex(k) === noteToIndex(current));
  if (i === -1) return [...ALL_KEYS, current];
  return [...ALL_KEYS.slice(0, i), current, ...ALL_KEYS.slice(i)];
}

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
