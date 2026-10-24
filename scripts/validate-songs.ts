import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { slugifyTheme } from "../src/lib/content/loadSongs";
import { propositionsEnDouble, type ChantIndexe } from "../src/lib/setlist/propositions";

const SONGS_DIR = path.join(process.cwd(), "content", "songs");
const VALID_KEY = /^[A-G][#b]?m?$/;
const THEMES = new Set(
  (JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "themes.json"), "utf-8")) as { themes: { slug: string }[] })
    .themes.map((t) => t.slug)
);
// Le parseur met « C » quand {key} manque : on teste le texte du .cho.
const KEY_DIRECTIVE = /^\s*\{\s*key\s*:\s*\S/im;

function main() {
  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".cho") && !f.startsWith("_"))
    .sort();

  const errors: string[] = [];
  const propositions: ChantIndexe[] = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(SONGS_DIR, file), "utf-8");
    try {
      const ast = parseChordPro(source);
      const m = ast.metadata;
      propositions.push({ slug: file, proposition: m.proposition });
      if (!m.title?.trim()) errors.push(`${file} : titre manquant ({title: …})`);
      if (!KEY_DIRECTIVE.test(source)) errors.push(`${file} : tonalité manquante ({key: …})`);
      else if (!VALID_KEY.test(m.key)) errors.push(`${file} : tonalité invalide « ${m.key} »`);
      if (m.recommendedKey !== null && (!VALID_KEY.test(m.recommendedKey) || m.recommendedKey === m.key)) {
        errors.push(`${file} : tonalité recommandée invalide « ${m.recommendedKey} » (ou égale à {key})`);
      }
      for (const theme of m.themes) {
        if (!THEMES.has(slugifyTheme(theme))) errors.push(`${file} : thème « ${theme} » absent de content/themes.json`);
      }
      if (!["fr", "zh"].includes(m.language)) errors.push(`${file} : langue invalide « ${m.language} » (fr|zh)`);
      if (ast.sections.length === 0) errors.push(`${file} : aucune section`);
    } catch (e) {
      errors.push(`${file} : échec du parsing — ${(e as Error).message}`);
    }
  }

  errors.push(...propositionsEnDouble(propositions));

  if (errors.length) {
    console.error(`✗ ${errors.length} problème(s) détecté(s) sur ${files.length} chant(s) :`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${files.length} chant(s) valides`);
}

main();
