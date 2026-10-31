// Mode « Adapter » : quand une section répétée est modifiée, elle est copiée
// dans le source de la setlist (materializeSectionCopy) et la structure pointe
// vers la copie. Ces copies n'existent que dans `contentOverride` — au retour à
// l'original, la structure doit re-pointer vers les sections du chant, sinon
// les occurrences concernées disparaissent de la setlist.
import type { SetlistItem } from "@/types/setList";

/** Id de section d'un uid ou d'une entrée de structure : `couplet-2` → `couplet`, `pont-1-3` → `pont-1`
 *  (l'id seul, sans rang, ne change pas). */
export function idDeSection(uid: string): string {
  return uid.replace(/-\d+$/, "");
}

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
  return [ov, idDeSection(ov)].some(
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

/** Répare un source adapté entre le 11/10 et le 25/10/2026 : la copie d'une
 *  section qui porte `{section_id: …}` gardait l'id de son original, et la
 *  structure, qui pointe vers l'id de la copie, perdait ce passage. Chaque id
 *  de copie qu'aucune section ne porte est rendu à la section dont c'est le
 *  rang dans le source (les copies sont ajoutées en fin, le rang annoncé est le
 *  leur) ; à défaut, à un doublon de son original. Pur : rien n'est réécrit en
 *  base, la réparation se fait à chaque lecture. */
export function repairCopyIds(source: string, origins: Record<string, string> | undefined): string {
  if (!origins || Object.keys(origins).length === 0) return source;
  const lines = source.split("\n");
  // Sections telles que le parseur les numérote, avec leur ligne `section_id`.
  const sections: { natural: string; id: string; idLine: number }[] = [];
  let open: (typeof sections)[number] | null = null;
  let inJianpu = false;
  let counter = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (inJianpu) {
      if (t === "{end_of_jianpu}") inJianpu = false;
      continue;
    }
    if (t === "{start_of_jianpu}") {
      inJianpu = true;
      continue;
    }
    const start = t.match(/^\{start_of_([a-z0-9_]+)\s*(?::[^}]*)?\}$/i);
    if (start) {
      counter++;
      open = { natural: `${start[1]}-${counter}`, id: `${start[1]}-${counter}`, idLine: -1 };
      sections.push(open);
      continue;
    }
    if (/^\{end_of_/i.test(t)) open = null;
    const sid = t.match(/^\{section_id\s*:\s*([^}]*?)\s*\}$/i);
    if (sid && open && sid[1]) {
      open.id = sid[1];
      open.idLine = i;
    }
  }
  let changed = false;
  for (const [copy, origin] of Object.entries(origins)) {
    if (sections.some((s) => s.id === copy)) continue;
    const root = originOf(origins, copy);
    const isDuplicate = (s: (typeof sections)[number]) =>
      (s.id === origin || s.id === root) && sections.find((o) => o.id === s.id) !== s;
    const target =
      sections.find((s) => s.natural === copy && s.idLine !== -1 && isDuplicate(s)) ??
      sections.find((s) => s.idLine !== -1 && isDuplicate(s));
    if (!target) continue;
    target.id = copy;
    lines[target.idLine] = `{section_id: ${copy}}`;
    changed = true;
  }
  return changed ? lines.join("\n") : source;
}
