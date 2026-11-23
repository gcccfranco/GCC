// UP-4 (docs/spec-ma-partition.md, « Un passage ou tous ») : avec les ordres « Une fois chacune » et « Plan », un
// passage retouché seul (section copiée, `sectionOrigins`) se situe par sa section d'origine et son rang dans la structure.
import type { ChordProSection } from "@/types/chordPro";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { formatSectionName } from "@/lib/chordpro/parser";
import { paletteKeyOf } from "@/lib/setlist/dp";
import { idDeSection, originOf } from "@/lib/setlist/sectionOrigins";

/** Une pastille du plan dans la feuille (ordres « Une fois chacune » et « Plan », docs/spec-ma-partition.md, UP-4). */
export type PastillePassage = {
  abbr: string;
  /** Nom complet, pour le libellé accessible. */
  full: string;
  /** Clé de la palette --sec-* (couleur de la section d'origine). */
  cle: string;
  /** Passage de la section touchée : seules ces pastilles se touchent. */
  actif: boolean;
};

type Tr = (key: string, options?: { defaultValue?: string }) => string;

/** Passages retouchés seuls d'une suite d'étapes : uid de l'étape → section d'origine et rang parmi tous les passages
 *  de cette origine (copies comprises, 1 = le premier). Vide sans copie connue. */
export function passagesRetouches(
  steps: { section: { id: string; uid: string } }[],
  origins: Record<string, string> | undefined,
): Map<string, { origine: string; rang: number }> {
  const out = new Map<string, { origine: string; rang: number }>();
  if (!origins) return out;
  const vus: Record<string, number> = {};
  for (const { section } of steps) {
    const origine = originOf(origins, section.id) ?? section.id;
    vus[origine] = (vus[origine] ?? 0) + 1;
    if (origine !== section.id) out.set(section.uid, { origine, rang: vus[origine] });
  }
  return out;
}

/** Sections uniques : chaque passage retouché seul se place juste sous sa section d'origine (derrière les copies
 *  déjà placées) ; sans origine dans la liste, il reste où il est. */
export function copiesSousOrigine<E extends { step: { section: { id: string } } }>(
  list: E[],
  origins: Record<string, string> | undefined,
): E[] {
  if (!origins) return list;
  const racine = (e: E) => originOf(origins, e.step.section.id);
  const base = list.filter((e) => racine(e) === null || !list.some((o) => o.step.section.id === racine(e)));
  const out = [...base];
  for (const e of list) {
    if (base.includes(e)) continue;
    const origine = racine(e)!;
    let at = out.findIndex((o) => o.step.section.id === origine);
    while (out[at + 1] && base.indexOf(out[at + 1]) === -1) at++;
    out.splice(at + 1, 0, e);
  }
  return out;
}

/** Les pastilles du plan pour la feuille du Crayon : une par entrée de `struct`, actives pour les passages de la
 *  section touchée. Une copie prend l'abréviation et la couleur de sa section d'origine. */
export function pastillesDuPlan(
  struct: string[],
  sections: ChordProSection[],
  origins: Record<string, string> | undefined,
  sectionId: string,
  t: Tr,
): PastillePassage[] {
  return struct.map((ov) => {
    const id = idDeSection(ov);
    const propre = sections.find((s) => s.id === ov) ?? sections.find((s) => s.id === id);
    const racine = (propre && origins && originOf(origins, propre.id)) || propre?.id;
    const section = (racine && sections.find((s) => s.id === racine)) || propre;
    return {
      abbr: section ? abbreviateSection(section) : id,
      full: section ? formatSectionName(section, t) : id,
      cle: section ? paletteKeyOf(section) : "other",
      actif: ov === sectionId || id === sectionId,
    };
  });
}
