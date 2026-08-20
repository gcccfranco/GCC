// Mode « Adapter » : quand une section répétée est modifiée, elle est copiée
// dans le source de la setlist (materializeSectionCopy) et la structure pointe
// vers la copie. Ces copies n'existent que dans `contentOverride` — au retour à
// l'original, la structure doit re-pointer vers les sections du chant, sinon
// les occurrences concernées disparaissent de la setlist.
import type { SetlistItem } from "@/types/setList";

/** uid d'une entrée de structureOverride, même convention que
 *  resolveStructureOverride (les entrées legacy sans rang prennent leur index). */
export function structUidAt(ov: string, index: number): string {
  return /-\d+$/.test(ov) ? ov : `${ov}-${index}`;
}

/** Remonte la chaîne des copies (copie d'une copie) jusqu'à une section du
 *  chant d'origine. Renvoie null si `sectionId` n'est pas une copie. */
function originOf(origins: Record<string, string>, sectionId: string): string | null {
  let current = origins[sectionId];
  if (current === undefined) return null;
  const seen = new Set([sectionId]);
  while (origins[current] !== undefined && !seen.has(current)) {
    seen.add(current);
    current = origins[current];
  }
  return current;
}

/** Champs à écrire pour rétablir le chant original : la structure et les
 *  réglages par section (notes, transitions, nuances, modulations) quittent les
 *  sections matérialisées pour celles dont elles ont été copiées. */
export function revertSectionOrigins(item: SetlistItem): Partial<SetlistItem> {
  const origins = item.sectionOrigins;
  if (!origins || Object.keys(origins).length === 0) return {};
  if (!item.structureOverride) return { sectionOrigins: {} };

  // uid d'occurrence avant → après, pour re-clé les réglages par section.
  const renamed = new Map<string, string>();
  const structureOverride = item.structureOverride.map((ov, index) => {
    const suffix = ov.match(/-\d+$/)?.[0] ?? "";
    const origin = originOf(origins, suffix ? ov.slice(0, -suffix.length) : ov);
    if (!origin) return ov;
    const next = `${origin}${suffix}`;
    renamed.set(structUidAt(ov, index), structUidAt(next, index));
    return next;
  });
  if (renamed.size === 0) return { structureOverride, sectionOrigins: {} };

  const rekey = <T,>(map: Record<string, T> | undefined): Record<string, T> | undefined =>
    map &&
    Object.fromEntries(Object.entries(map).map(([uid, v]) => [renamed.get(uid) ?? uid, v]));

  return {
    structureOverride,
    sectionNotes: rekey(item.sectionNotes) ?? {},
    ...(item.sectionTransitions ? { sectionTransitions: rekey(item.sectionTransitions) } : {}),
    ...(item.sectionNuances ? { sectionNuances: rekey(item.sectionNuances) } : {}),
    ...(item.sectionKeys ? { sectionKeys: rekey(item.sectionKeys) } : {}),
    sectionOrigins: {},
  };
}
