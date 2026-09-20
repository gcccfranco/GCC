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

/** L'entrée de structure `ov` (`<id>-<rang>`, ou l'id seul pour les anciennes
 *  setlists) désigne-t-elle un passage de la section `sectionId` — elle-même ou
 *  l'une de ses copies ? */
function isOccurrenceOf(ov: string, sectionId: string, origins: Record<string, string>): boolean {
  return [ov, ov.replace(/-\d+$/, "")].some(
    (id) => id === sectionId || originOf(origins, id) === sectionId,
  );
}

/** Structure à suivre quand la version affichée contient des sections copiées
 *  (« Seulement ce passage » de Ma version) : chaque copie prend la place du
 *  passage « au même endroit » chez le lecteur — le dernier passage retouché
 *  reste le dernier, les autres se repèrent par leur rang depuis le début, et
 *  un rang qui n'existe pas chez le lecteur ne s'affiche pas. L'auteur, lui,
 *  retrouve sa propre structure inchangée. */
export function structureWithCopies(
  reader: string[],
  author: string[],
  origins: Record<string, string>,
): string[] {
  const out = [...reader];
  for (const [copy, origin] of Object.entries(origins)) {
    const passages = author.filter((ov) => isOccurrenceOf(ov, origin, origins));
    const rank = passages.findIndex((ov) => isOccurrenceOf(ov, copy, origins));
    if (rank === -1) continue;
    const here = out.flatMap((ov, i) => (isOccurrenceOf(ov, origin, origins) ? [i] : []));
    const at = rank === passages.length - 1 ? here[here.length - 1] : here[rank];
    if (at === undefined) continue;
    out[at] = `${copy}-${at}`;
  }
  return out;
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
