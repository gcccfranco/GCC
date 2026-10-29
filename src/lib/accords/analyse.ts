// Dictionnaire d'accords (lot DA) — lire une étiquette d'accord : fondamentale, qualité canonique, basse.
// Pur : pas de React, pas d'accès au navigateur. Refuse proprement (null) ce qu'il ne comprend pas.
import { EDGE_BRACKETS, LABEL_SPLIT, PAREN_CHORD, noteToIndex } from "@/lib/transpose";
import { QUALITES } from "./table";

export type Accord = {
  /** L'accord nettoyé de ses parenthèses d'encadrement : « D/F# ». */
  texte: string;
  /** Fondamentale telle qu'écrite : « Bb », « A# ». */
  fondamentale: string;
  /** Le suffixe tel qu'écrit : « 2 », « m7(b5) ». */
  ecrite: string;
  /** Clé canonique de `QUALITES` : « sus2 », « m7b5 ». */
  qualite: string;
  /** Basse telle qu'écrite (« F# »), ou null. */
  basse: string | null;
  /** L'écriture canonique quand `ecrite` en est une abréviation (« D2 » → « Dsus2 »), sinon null. */
  equivalent: string | null;
};

/** Écritures usuelles → clé de `QUALITES`. */
const ALIAS: Record<string, string> = {
  "maj": "", "3": "",
  "min": "m", "-": "m", "-7": "m7",
  "M7": "maj7", "Δ": "maj7", "Δ7": "maj7",
  "ø": "m7b5", "ø7": "m7b5", "m7-5": "m7b5", "m7(b5)": "m7b5",
  "°": "dim", "°7": "dim7",
  "+": "aug", "+5": "aug",
  "2": "sus2", "4": "sus4", "sus": "sus4",
  "sus7": "7sus4", "7sus": "7sus4",
  "add2": "add9", "(add9)": "add9", "add11": "add4",
  "mmaj7": "m(maj7)", "mM7": "m(maj7)",
  "m(add9)": "madd9", "madd2": "madd9",
};

/** Abréviations qui s'écrivent autrement dans un accord canonique (panneau : « D2 = Dsus2 »). */
const AVEC_EQUIVALENT = new Set(["2", "4", "sus", "sus7", "7sus", "3", "add2"]);

/** Ôte les parenthèses et crochets qui encadrent l'accord, sans toucher à `Am(maj7)`. */
function nettoyer(brut: string): string {
  let s = brut.trim().replace(/^[([]+/, "").replace(/\]+$/, "");
  while (s.endsWith(")") && s.split(")").length > s.split("(").length) s = s.slice(0, -1);
  return s;
}

export function analyserAccord(etiquette: string): Accord | null {
  const texte = nettoyer(etiquette);
  const m = texte.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!m) return null;
  const [, fondamentale, ecrite, basse] = m;
  if (noteToIndex(fondamentale) === -1) return null;
  if (basse && noteToIndex(basse) === -1) return null;
  const qualite = Object.hasOwn(QUALITES, ecrite) ? ecrite : Object.hasOwn(ALIAS, ecrite) ? ALIAS[ecrite] : null;
  if (qualite === null) return null;
  const equivalent = AVEC_EQUIVALENT.has(ecrite) ? fondamentale + qualite + (basse ? "/" + basse : "") : null;
  return { texte, fondamentale, ecrite, qualite, basse: basse ?? null, equivalent };
}

/**
 * Les jetons d'accord d'une étiquette telle que le site l'affiche
 * (« G (G/B) » → G, G/B ; « 主歌/Couplet » → rien). Même découpe que
 * `transposeLabel`, on garde ce que `analyserAccord` accepte.
 */
export function accordsDeLEtiquette(etiquette: string): string[] {
  const sortie: string[] = [];
  etiquette.split(LABEL_SPLIT).forEach((part, i) => {
    if (i % 2 === 1 || !part) return;
    for (const morceau of part.split(PAREN_CHORD)) {
      if (!morceau) continue;
      if (analyserAccord(morceau)) {
        sortie.push(nettoyer(morceau));
        continue;
      }
      // Parenthèse orpheline collée au jeton : « Dm( » de « Dm(或Bb) ».
      const bord = morceau.match(EDGE_BRACKETS);
      if (bord && bord[2] && analyserAccord(bord[2])) sortie.push(bord[2]);
    }
  });
  return sortie;
}
