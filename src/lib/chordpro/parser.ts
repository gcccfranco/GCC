import type {
  ChordProAST,
  ChordProLine,
  ChordProSection,
  Token,
} from "@/types/chordPro";
import type { Language } from "@/types/common";
import { hasChinese, extractChinese } from "@/lib/pinyin";


// --- Parsing des directives {key: value} ---

function parseDirective(line: string): { key: string; value: string } | null {
  const match = line.match(/^\{(\w+)(?::\s*(.*?))?\s*\}$/);
  if (!match) return null;
  return { key: match[1], value: match[2] ?? "" };
}

// --- Parsing d'une ligne de paroles avec accords ---

export function parseLyricLine(rawLine: string, language: string = "fr"): { tokens: Token[]; pinyin: string | null } {
  // Séparation paroles chinoises / pinyin (2 espaces minimum, uniquement pour zh)
  let pinyinPart: string | null = null;
  let lyricPart = rawLine;

  if (language === "zh") {
    // Coupure sur une séquence de 2+ espaces dont la droite ne contient ni
    // caractère chinois ni crochet d'accord. On essaie chaque séquence de
    // gauche à droite et on garde la PREMIÈRE valide : une ligne peut contenir
    // des doubles espaces internes (colonnes d'accords, ex. `。  [A7]`) avant
    // le vrai séparateur — abandonner sur la première coupure invalide
    // laisserait le pinyin collé aux paroles.
    const gaps = /\s{2,}/g;
    let gap: RegExpExecArray | null;
    while ((gap = gaps.exec(rawLine)) !== null) {
      const tail = rawLine.slice(gap.index + gap[0].length);
      if (tail && !hasChinese(tail) && !tail.includes("[")) {
        lyricPart = rawLine.slice(0, gap.index);
        pinyinPart = tail.trim() || null;
        break;
      }
    }
  }

  // Tokenisation : alternance de [accord] et texte
  // [^\]]* avec * (et non +) pour consommer les [] vides sans les afficher
  const tokens: Token[] = [];
  const regex = /\[([^\]]*)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(lyricPart)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "lyric", value: lyricPart.slice(lastIndex, match.index) });
    }
    const chordValue = match[1];
    if (chordValue) {
      tokens.push({ type: "chord", value: chordValue });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < lyricPart.length) {
    tokens.push({ type: "lyric", value: lyricPart.slice(lastIndex) });
  }

  return { tokens, pinyin: pinyinPart };
}

// --- Mapping type de section ---

const SECTION_TYPE_MAP: Record<string, ChordProSection["type"]> = {
  verse: "verse",
  chorus: "chorus",
  bridge: "bridge",
  intro: "intro",
  outro: "outro",
  prechorus: "prechorus",
  pre_chorus: "prechorus",
  postchorus: "postchorus",
  post_chorus: "postchorus",
  tab: "other",
  grid: "other",
};

function sectionType(key: string): ChordProSection["type"] {
  return SECTION_TYPE_MAP[key] ?? "other";
}

export function parseSectionHeader(typeKey: string, value: string) {
  let type: ChordProSection["type"] = sectionType(typeKey);
  let number: string | undefined = undefined;
  let suffix: string | undefined = undefined;

  const label = value.trim() || typeKey;

  // Extract all parenthesized text (e.g. "(Key G)" or "(吉他/键盘升G调)")
  const parenMatches = Array.from(label.matchAll(/\(([^)]+)\)/g)).map((m) => m[1].trim());
  if (parenMatches.length > 0) {
    suffix = parenMatches.map((m) => `(${m})`).join(" ");
  }

  // Remove the parenthesized parts to parse the rest
  const cleanLabel = label.replace(/\s*\([^)]+\)\s*/g, " ").trim();

  // Split by '/' if it exists (for bilingual labels like '主歌 1/Couplet 1')
  const parts = cleanLabel.split("/").map((p) => p.trim());

  // Look for a number in any part
  for (const part of parts) {
    const numMatch = part.match(/\d+/);
    if (numMatch) {
      number = numMatch[0];
      break;
    }
  }

  // Refine the type if generic or based on standard labels in the name
  const lowerLabel = label.toLowerCase();
  if (type === "other" || type === "verse") {
    if (lowerLabel.includes("couplet") || lowerLabel.includes("verse") || lowerLabel.includes("主歌")) {
      type = "verse";
    // Post-refrain avant refrain : « post-refrain » contient « refrain »
    } else if (lowerLabel.includes("post-refrain") || lowerLabel.includes("post-chorus") || lowerLabel.includes("postchorus") || lowerLabel.includes("后副歌")) {
      type = "postchorus";
    } else if (lowerLabel.includes("refrain") || lowerLabel.includes("chorus") || lowerLabel.includes("副歌")) {
      type = "chorus";
    } else if (lowerLabel.includes("pont") || lowerLabel.includes("bridge") || lowerLabel.includes("桥段")) {
      type = "bridge";
    } else if (lowerLabel.includes("intro") || lowerLabel.includes("前奏")) {
      type = "intro";
    } else if (lowerLabel.includes("outro") || lowerLabel.includes("尾声") || lowerLabel.includes("coda")) {
      type = "outro";
    } else if (lowerLabel.includes("pre-chorus") || lowerLabel.includes("prechorus") || lowerLabel.includes("pré-refrain") || lowerLabel.includes("副歌前奏")) {
      type = "prechorus";
    } else if (lowerLabel.includes("tag")) {
      type = "other";
      suffix = suffix ? `TAG ${suffix}` : "TAG";
    } else if (lowerLabel.includes("interlude") || lowerLabel.includes("inter") || lowerLabel.includes("间奏")) {
      type = "other";
      suffix = suffix ? `Interlude ${suffix}` : "Interlude";
    } else if (lowerLabel.includes("solo") || lowerLabel.includes("instrumental")) {
      type = "other";
      suffix = suffix ? `Instrumental ${suffix}` : "Instrumental";
    }
  }

  return {
    type,
    number,
    suffix,
    name: label,
  };
}

export function formatSectionName(
  section: { type: string; name?: string; number?: string; suffix?: string },
  tOrTranslations: ((key: string, options?: { defaultValue?: string }) => string) | Record<string, unknown>
): string {
  const getTranslation = (key: string, fallback: string): string => {
    if (typeof tOrTranslations === "function") {
      return tOrTranslations(key, { defaultValue: fallback });
    }
    const parts = key.split(".");
    let current: unknown = tOrTranslations;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return fallback;
      }
    }
    return typeof current === "string" ? current : fallback;
  };

  let baseName = "";
  
  // 1. If it's a standard type (other than "other"), translate the type
  if (section.type && section.type !== "other") {
    baseName = getTranslation(`songs.sections.${section.type}`, "");
  }

  // 2. If it's "other" or translation was not found, try translating the name itself (lower-cased)
  if (!baseName && section.name) {
    const cleanName = section.name.replace(/\d+/g, "").replace(/\s*\([^)]+\)\s*/g, " ").trim().toLowerCase();
    
    let lookupKey = cleanName;
    if (cleanName === "pont" || cleanName === "bridge" || cleanName === "桥段") lookupKey = "bridge";
    else if (cleanName === "couplet" || cleanName === "verse" || cleanName === "主歌") lookupKey = "verse";
    else if (cleanName === "refrain" || cleanName === "chorus" || cleanName === "副歌") lookupKey = "chorus";
    else if (cleanName === "intro" || cleanName === "前奏") lookupKey = "intro";
    else if (cleanName === "outro" || cleanName === "尾声" || cleanName === "ending") lookupKey = "outro";
    else if (cleanName === "pre-chorus" || cleanName === "prechorus" || cleanName === "pré-refrain" || cleanName === "副歌前奏") lookupKey = "prechorus";
    else if (cleanName === "post-chorus" || cleanName === "postchorus" || cleanName === "post-refrain" || cleanName === "后副歌") lookupKey = "postchorus";
    else if (cleanName === "coda") lookupKey = "coda";
    else if (cleanName === "tag") lookupKey = "tag";
    else if (cleanName === "interlude" || cleanName === "inter" || cleanName === "间奏") lookupKey = "interlude";
    else if (cleanName === "solo" || cleanName === "instrumental" || cleanName === "器乐") lookupKey = "instrumental";
    
    baseName = getTranslation(`songs.sections.${lookupKey}`, "");
  }

  // 3. Fallback to name, type or translated "other"
  if (!baseName) {
    baseName = section.name || getTranslation(`songs.sections.${section.type}`, section.type);
  }

  const numberStr = section.number ? ` ${section.number}` : "";
  const suffixStr = section.suffix ? ` ${section.suffix}` : "";

  return `${baseName}${numberStr}${suffixStr}`;
}

// --- Parser principal ---

export function parseChordPro(source: string): ChordProAST {
  const lines = source.split("\n");
  const metadata: ChordProAST["metadata"] = {
    title: "Sans titre",
    titlePinyin: null,
    artist: "Inconnu",
    key: "C",
    jianpuKey: null,
    tempo: null,
    language: "fr",
    themes: [],
    youtubeUrl: null,
    spotifyUrl: null,
    appleMusicUrl: null,
  };

  const sections: ChordProSection[] = [];
  let currentSection: ChordProSection | null = null;
  let pendingJianpu: string | null = null;
  let pendingJianpuLine: number | null = null;
  let sectionCounter = 0;
  let uidCounter = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const line = rawLine.trimEnd();

    // Ligne vide
    if (!line.trim()) continue;

    const trimmed = line.trim();

    // Ligne directive
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const directive = parseDirective(trimmed);
      if (!directive) continue;

      const { key, value } = directive;

      // Début de section
      if (key.startsWith("start_of_")) {
        const typeKey = key.replace("start_of_", "");
        sectionCounter++;
        const parsedHeader = parseSectionHeader(typeKey, value);
        currentSection = {
          type: parsedHeader.type,
          id: `${typeKey}-${sectionCounter}`,
          uid: `${typeKey}-${sectionCounter}-${uidCounter}`,
          name: parsedHeader.name,
          number: parsedHeader.number,
          suffix: parsedHeader.suffix,
          lines: [],
        };
        uidCounter++;
        continue;
      }

      // Fin de section
      if (key.startsWith("end_of_")) {
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        continue;
      }

      // Directive jianpu (à associer à la prochaine ligne de paroles)
      if (key === "jianpu") {
        pendingJianpu = value;
        pendingJianpuLine = lineIdx;
        continue;
      }

      // Métadonnées
      switch (key) {
        case "title":
          metadata.title = value;
          break;
        case "title_pinyin":
          metadata.titlePinyin = value || null;
          break;
        case "artist":
          metadata.artist = value;
          break;
        case "key":
          metadata.key = value;
          break;
        case "jianpu_key":
          metadata.jianpuKey = value || null;
          break;
        case "tempo":
          metadata.tempo = value ? parseInt(value, 10) : null;
          break;
        case "language":
          metadata.language = (value as Language) || "fr";
          break;
        case "themes":
          metadata.themes = value
            ? value.split(",").map((t) => t.trim()).filter(Boolean)
            : [];
          break;
        case "youtube":
          metadata.youtubeUrl = value || null;
          break;
        case "spotify":
          metadata.spotifyUrl = value || null;
          break;
        case "apple_music":
          metadata.appleMusicUrl = value || null;
          break;
        // Directives connues à ignorer silencieusement
        case "c":
        case "comment":
        case "needs_review":
        case "import_source":
          break;
      }
      continue;
    }

    // Ligne de paroles (dans une section)
    if (currentSection) {
      // Détection d'une ligne de Pinyin séparée
      const isPinyinOnly =
        metadata.language === "zh" &&
        !hasChinese(trimmed) &&
        !trimmed.includes("[");

      const prevLine =
        currentSection.lines.length > 0
          ? currentSection.lines[currentSection.lines.length - 1]
          : null;

      if (
        isPinyinOnly &&
        prevLine &&
        prevLine.type === "line" &&
        hasChinese(extractChinese(prevLine.tokens)) &&
        prevLine.pinyin === null
      ) {
        prevLine.pinyin = trimmed;
        prevLine.pinyinSrcLine = lineIdx;
        continue;
      }

      const { tokens, pinyin } = parseLyricLine(trimmed, metadata.language);
      const chordLine: ChordProLine = {
        type: "line",
        tokens,
        pinyin,
        jianpu: pendingJianpu,
        srcLine: lineIdx,
        jianpuSrcLine: pendingJianpu !== null ? pendingJianpuLine ?? undefined : undefined,
      };
      currentSection.lines.push(chordLine);
      pendingJianpu = null;
      pendingJianpuLine = null;
    }
  }

  // Section non fermée explicitement
  if (currentSection) {
    sections.push(currentSection);
  }

  return { metadata, sections };
}
