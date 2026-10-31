import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "@/lib/chordpro/parser";
import type { Song } from "@/types/song";
import type { ChordProSection, ChordProLine } from "@/types/chordPro";

const SONGS_DIR = path.join(process.cwd(), "content", "songs");

// Nom saisi dans un .cho → slug de content/themes.json quand les deux ne se
// déduisent pas l'un de l'autre (« Groupe fidélité » est le thème `noel_fidelite`).
const THEME_ALIAS: Record<string, string> = { "groupe-fidelite": "noel_fidelite" };

export function slugifyTheme(name: string): string {
  const slug = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return THEME_ALIAS[slug] ?? slug;
}

export function getSongSlugs(): string[] {
  return fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".cho") && !f.startsWith("_"))
    .map((f) => f.replace(/\.cho$/, ""))
    .sort();
}

export function loadSong(slug: string): Song {
  const decoded = decodeURIComponent(slug);
  // Un slug est un nom de fichier simple : tout séparateur ou ".." est une
  // tentative de sortie de content/songs/ (path traversal)
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
    throw new Error(`Invalid slug: ${slug}`);
  }
  const filePath = path.join(SONGS_DIR, `${decoded}.cho`);
  const source = fs.readFileSync(filePath, "utf-8");
  const ast = parseChordPro(source);
  const m = ast.metadata;

  const hasJianpu = ast.sections.some((s: ChordProSection) =>
    s.lines.some((l: ChordProLine) => l.jianpu !== null)
  );

  return {
    // Toujours la forme décodée : les slugs chinois arrivent URL-encodés
    // depuis l'URL, mais l'index (songs-index.json) utilise le nom de fichier
    slug: decoded,
    title: m.title,
    titlePinyin: m.titlePinyin,
    artist: m.artist,
    language: m.language,
    originalKey: m.key,
    recommendedKey: m.recommendedKey,
    ...(m.proposition ? { proposition: m.proposition } : {}),
    tempo: m.tempo,
    ...(m.subtitle ? { subtitle: m.subtitle } : {}),
    ...(m.time ? { time: m.time } : {}),
    ...(m.bible ? { bible: m.bible } : {}),
    themes: m.themes.map(slugifyTheme),
    youtubeUrl: m.youtubeUrl,
    spotifyUrl: m.spotifyUrl,
    appleMusicUrl: m.appleMusicUrl,
    hasJianpu,
    jianpuKey: m.jianpuKey,
    chordProSource: source,
  };
}
