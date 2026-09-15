import { sectionKindOfName } from "@/lib/chordpro/parser";

// Abréviations du bandeau de structure (lot « coup d'œil », 14/09/2026) : une
// lettre ou deux par sorte de section, les mêmes en français et en 中文.
// La sorte suit le nom écrit quand il en désigne une, comme formatSectionName :
// un {start_of_intro: Interlude} est un pont musical (Pm), pas une intro.
const ABBREVIATIONS: Record<string, string> = {
  intro: "I",
  verse: "C",
  prechorus: "Pr",
  chorus: "R",
  postchorus: "Po",
  bridge: "P",
  interlude: "Pm",
  instrumental: "Pm",
  outro: "F",
  coda: "F",
  tag: "Tag",
};

const LAST_PHRASE = /derni[eè]re phrase|最后一句/i;

/** « C1 », « R », « Pm », « Dp »… ; une section « autre » sans sorte connue garde
 *  son nom écrit (« Bénédiction », « 尾声 »). Le numéro écrit est conservé. */
export function abbreviateSection(section: { type: string; name?: string; number?: string }): string {
  const name = section.name?.trim() ?? "";
  if (LAST_PHRASE.test(name)) return "Dp";
  const kind = (name && sectionKindOfName(name)) || (section.type !== "other" ? section.type : null);
  const base = kind ? ABBREVIATIONS[kind] : undefined;
  if (!base) return name || section.type;
  return `${base}${section.number ?? ""}`;
}
