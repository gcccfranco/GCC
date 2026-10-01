import { parseChordPro } from "@/lib/chordpro/parser";

// « Dernière phrase » (Dp, coup d'œil — docs/spec-coup-d-oeil.md, S3) : les
// dernières lignes d'une section, avec leurs accords, matérialisées comme une
// vraie section « autre » du chant adapté (contentOverride), à la manière des
// copies du mode Adapter. L'éditeur, le PDF, le mode louange et la copie des
// paroles la voient donc sans code à part.

/** Nom d'une section « Dernière phrase » (même règle que l'abréviation Dp). */
export const LAST_PHRASE = /derni[eè]re phrase|最后一句/i;
const MAX_LINES = 3;

/** Nouveau source avec la section « Dernière phrase – <label> » ajoutée à la
 *  fin — les `count` (1 à 3) dernières lignes chantées de `sectionId`, chacune
 *  avec sa ligne {jianpu:} et son pinyin séparé s'il y en a — et l'id que le
 *  parseur lui donne. null si la section est introuvable ou sans ligne.
 *  `label` : l'abréviation de la section source (« R », « C », « P »), sans
 *  parenthèses ni mot de section ni chiffre — le parseur y lirait un suffixe,
 *  une sorte de section (« refrain » → refrain) ou un numéro. */
export function materializeLastPhrase(
  source: string,
  sectionId: string,
  count: number,
  label: string,
): { source: string; sectionId: string } | null {
  const section = parseChordPro(source).sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const sung = section.lines.filter((l) => l.tokens.length > 0 || l.jianpu);
  const last = sung.slice(-Math.max(1, Math.min(MAX_LINES, count)));
  if (!last.length || last.some((l) => l.srcLine === undefined)) return null;
  const indices = last.flatMap((l) =>
    [l.srcLine, l.pinyinSrcLine, l.jianpuSrcLine].filter((i): i is number => i !== undefined),
  );
  const lines = source.split("\n");
  const block = [...new Set(indices)].sort((a, b) => a - b).map((i) => lines[i]);
  const next = `${source.trimEnd()}\n\n{start_of_Dp: Dernière phrase – ${label}}\n${block.join("\n")}\n{end_of_Dp}\n`;
  const added = parseChordPro(next).sections.at(-1);
  return added ? { source: next, sectionId: added.id } : null;
}

/** Le chant adapté n'est que l'original suivi de sections « Dernière phrase » ?
 *  Le badge « Version modifiée » n'a alors rien d'utile à dire. */
export function isLastPhraseOnly(original: string, override: string): boolean {
  const base = original.trimEnd();
  if (!override.startsWith(base)) return false;
  let inside = false;
  for (const raw of override.slice(base.length).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const start = line.match(/^\{start_of_[a-z0-9_]+\s*(?::\s*([^}]*))?\}$/i);
    if (start) {
      if (!LAST_PHRASE.test(start[1] ?? "")) return false;
      inside = true;
      continue;
    }
    if (/^\{end_of_/i.test(line)) {
      inside = false;
      continue;
    }
    if (!inside) return false;
  }
  return true;
}

const DP_BLOCK = /\n*\{start_of_Dp\s*:\s*[^}]*(?:derni[eè]re phrase|最后一句)[^}]*\}[\s\S]*?\{end_of_Dp\}/gi;

/** Le source sans ses sections « Dernière phrase », et leur nombre — pour que
 *  l'historique distingue « Dernière phrase ajoutée » d'une adaptation. */
export function withoutLastPhrases(source: string): { source: string; count: number } {
  let count = 0;
  const stripped = source.replace(DP_BLOCK, () => {
    count++;
    return "";
  });
  return { source: stripped.trimEnd(), count };
}
