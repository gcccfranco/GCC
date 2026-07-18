import { Language } from "@/types/common";

export type ChordToken = {
  type: "chord";
  value: string;
};

export type LyricToken = {
  type: "lyric";
  value: string;
};

export type Token = ChordToken | LyricToken;

export type ChordProLine = {
  type: "line";
  tokens: Token[];
  pinyin: string | null;
  jianpu: string | null;
  /** Index (0-based) de la ligne dans le source ChordPro — pour l'édition par setlist. */
  srcLine?: number;
  /** Index de la ligne pinyin séparée absorbée par cette ligne (zh), si distincte. */
  pinyinSrcLine?: number;
  /** Index de la ligne {jianpu:…} associée, si présente. */
  jianpuSrcLine?: number;
};

export type ChordProSection = {
  type: "verse" | "chorus" | "bridge" | "intro" | "outro" | "prechorus" | "postchorus" | "other";
  id: string;
  name: string;
  number?: string;
  suffix?: string;
  lines: ChordProLine[];
  uid: string;
};

export type ChordProAST = {
  metadata: {
    title: string;
    titlePinyin: string | null;
    artist: string;
    key: string;
    jianpuKey: string | null;
    tempo: number | null;
    language: Language;
    themes: string[];
    youtubeUrl: string | null;
    spotifyUrl: string | null;
    appleMusicUrl: string | null;
  };
  sections: ChordProSection[];
};
