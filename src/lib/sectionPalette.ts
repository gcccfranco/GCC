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
};
