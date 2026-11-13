import { sectionKindOfName } from "@/lib/chordpro/parser";

// Clé --sec-* d'un type de section (mêmes correspondances que CHART_TYPE_COLOR
// de SongView). Ici, hors composant, pour que src/lib puisse l'utiliser ;
// SongView la ré-exporte.
export const SECTION_PALETTE_KEY: Record<string, string> = {
  intro: "intro",
  verse: "verse",
  prechorus: "prechorus",
  chorus: "chorus",
  postchorus: "chorus",
  final: "chorus",
  bridge: "bridge",
  outro: "outro",
  coda: "coda",
  tag: "tag",
};

/** Sorte de section qui fait la couleur : le type du parseur, sauf pour « other » (« Tag », « Interlude »…) où le
 *  nom écrit dit la sorte ; « other » à défaut. Le type du parseur, lui, ne change pas (ids de sections des setlists). */
export function sectionColorKind(section: { type: string; name?: string }): string {
  return section.type === "other" ? (sectionKindOfName(section.name ?? "") ?? "other") : section.type;
}
