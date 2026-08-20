import { Language } from "@/types/common";

/** Nuance d'une section : étiquettes prédéfinies (voir lib/setlist/nuances.ts)
 *  + texte libre optionnel en complément. */
export type SectionNuance = {
  tags: string[];
  note?: string;
};

export type FusionSong = {
  songSlug: string;
  keyOverride: string | null;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid de section → tonalité cible. */
  sectionKeys?: Record<string, string>;
};

export type FusionMixedSection = {
  songSlug: string;
  sectionId: string;
  note?: string;
  transition?: string;
  nuance?: SectionNuance;
  /** Modulation (升调) : tonalité cible de cette occurrence de section. */
  keyChange?: string;
};

export type SetlistItem = {
  type?: "fusion" | "transition";
  songSlug: string;
  position: number;
  keyOverride: string | null;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  /** Affiche la partition 简谱 (image du scan d'origine) au lieu des paroles.
   *  N'a d'effet que si le chant a une partition dans public/jianpu/.
   *  `structureOverride` continue de décrire la structure pour la liste de la
   *  setlist, mais ne modifie pas la partition : l'image est affichée entière. */
  jianpuSheet?: boolean;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  sectionTransitions?: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid de section → tonalité cible.
   *  La section s'affiche transposée dans cette tonalité au lieu de la
   *  tonalité de l'item (keyOverride ou tonalité d'origine). */
  sectionKeys?: Record<string, string>;
  /** Source ChordPro modifié pour cette setlist (accords/paroles adaptés) —
   *  remplace le contenu du chant original ; null/absent = original. */
  contentOverride?: string | null;
  /** Sections matérialisées par le mode Adapter (copie d'une section répétée
   *  pour n'en modifier qu'une occurrence) : id de la copie → id de la section
   *  d'origine. Permet à « Rétablir l'original » de re-pointer la structure
   *  vers les sections du chant au lieu de les perdre. */
  sectionOrigins?: Record<string, string>;
  notes: string;
  fusionSongs?: FusionSong[];
  mixedStructure?: FusionMixedSection[] | null;
  transitionText?: string;
};

export type Setlist = {
  id: string;
  title: string;
  date: string;
  theme: string | null;
  leader: string | null;
  language: Language;
  notes: string;
  items: SetlistItem[];
};
