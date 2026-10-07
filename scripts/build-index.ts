import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "../src/lib/content/loadSongs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { datesAjout } from "./dates-ajout";

const OUTPUT_FILE = path.join(process.cwd(), "public", "songs-index.json");

function main() {
  const slugs = getSongSlugs();
  // « Nouveaux au répertoire » (agencement v18, A7) : la date d'ajout lue dans git, `null` sans historique.
  const ajouts = datesAjout(process.cwd());
  const songs = slugs.map((slug) => {
    const song = loadSong(slug);
    const ast = parseChordPro(song.chordProSource);
    const { chordProSource: _, ...entry } = song;
    return {
      ...entry,
      ajouteLe: ajouts.get(slug.normalize("NFC")) ?? null,
      sections: ast.sections.map((s) => ({
        id: s.id,
        name: s.name || s.type,
        type: s.type,
        number: s.number,
        suffix: s.suffix,
      })),
    };
  });

  songs.sort((a, b) => {
    const getSortKey = (song: typeof a) => {
      const key = song.language === "zh" && song.titlePinyin ? song.titlePinyin : song.title;
      return key
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    };
    return getSortKey(a).localeCompare(getSortKey(b), "fr", { sensitivity: "base" });
  });

  const output = { generatedAt: new Date().toISOString(), songs };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✓ ${songs.length} chant(s) indexé(s) → ${OUTPUT_FILE}`);
  if (ajouts.size === 0) console.log("  (sans historique git : aucune date d'ajout, « Nouveaux au répertoire » ne paraîtra pas)");
}

main();
