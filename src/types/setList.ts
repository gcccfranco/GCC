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
