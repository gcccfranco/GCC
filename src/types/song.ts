import { Language } from "@/types/common";

export type Song = {
  slug: string;
  title: string;
  titlePinyin: string | null;
  artist: string;
  language: Language;
  originalKey: string;
  /** Tonalité la plus chantée à GCC, affichée par défaut (docs/tonalites-recommandees.md). */
  recommendedKey: string | null;
  /** `id` de la proposition de chant dont ce chant est né (`{proposition: <id>}`), absent sinon : une
   *  setlist de fête qui l'attendait bascule alors sur ce chant (docs/spec-chants-fetes.md, CF21). */
  proposition?: string;
  tempo: number | null;
  /** Sous-titre, mesure, référence biblique ({subtitle}, {time}, {bible}) : absents si le .cho ne les
   *  donne pas (docs/spec-jianpu-entete-statistiques.md, JE1). */
  subtitle?: string;
  time?: string;
  bible?: string;
  themes: string[];
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  hasJianpu: boolean;
  jianpuKey: string | null;
  chordProSource: string;
};

export type SectionSummary = {
  id: string;
  name: string;
  type: string;
  uid: string; 
  number?: string;
  suffix?: string;
  
};

export type SongIndexEntry = Omit<Song, "chordProSource"> & {
  sections?: SectionSummary[];
  /** Date d'ajout au répertoire (AAAA-MM-JJ), lue dans git par `build:index` ; `null` sans
   *  historique (clone superficiel). « Nouveaux au répertoire » (agencement v18, A7). */
  ajouteLe?: string | null;
};

export type Theme = {
  slug: string;
  name_fr: string;
  name_zh: string;
};

export interface SectionItem {
  uid: string;        // unique instance id (section.id + "-" + index)
  sectionId: string;  // original section id
  name: string;
  note: string;
}