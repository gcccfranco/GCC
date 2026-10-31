import type { JianpuChords } from "@/types/setList";

export type VersionItem = {
  /** Source ChordPro complet, tonalité d'origine (comme `contentOverride`) ;
   *  `null` = accords et paroles de la présidence. */
  content: string | null;
  /** Même forme que `structureOverride` ; `null` = structure de la présidence. */
  structure: string[] | null;
  /** Mes accords et paroles sont proposés aux autres. */
  shared: boolean;
  /** Sections matérialisées pour ne retoucher qu'une occurrence (« Seulement
   *  ce passage », lot 9) : id de la copie → id de la section d'origine. Même
   *  forme et même mécanisme que sur `SetlistItem` (mode Adapter). */
  sectionOrigins?: Record<string, string>;
  /** Accords retouchés sur le scan 简谱 (lot 9) : index d'étiquette de
   *  `public/jianpu/chords.json` → texte en tonalité d'origine (« » = effacé),
   *  et accords ajoutés en coordonnées du scan. `chords.json` n'est jamais écrit. */
  jianpuChords?: JianpuChords;
};

export type SetlistVersions = {
  authorUid: string;
  authorName: string;
  /** Par chant (`songSlug`). */
  items: Record<string, VersionItem>;
  /** Version choisie par chant : `"presidence"` ou l'uid de son auteur ;
   *  absent = la mienne si j'en ai une, sinon la présidence. */
  choices: Record<string, string>;
};
