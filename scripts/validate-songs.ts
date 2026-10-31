import * as fs from "fs";
import * as path from "path";
// @ts-expect-error fontkit ne fournit pas de déclarations de types
import fontkit from "fontkit";
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

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

// Les sous-ensembles woff2 des polices chinoises (scripts/build-fonts.py) ne portent que les
// caractères des chants et des traductions : un caractère ajouté sans les refaire s'afficherait
// dans une police de secours. Un caractère que la police d'origine n'a pas non plus n'est pas compté.
function lireTitre(source: string): string {
  return [...source.matchAll(/^\s*\{\s*(?:title|subtitle)\s*:\s*(.*?)\s*\}\s*$/gm)].map((m) => m[1]).join("");
}

function controleSousEnsembles(sources: Map<string, string>): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ouvrir = (nom: string): any => fontkit.openSync(path.join(FONTS_DIR, nom));
  const manquants = (nom: string, origine: string, textes: Map<string, string>, garde: RegExp): string[] => {
    const sub = ouvrir(nom);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orig: any = null;
    const erreurs: string[] = [];
    for (const [fichier, texte] of textes) {
      const vus = new Set<string>();
      for (const c of texte) {
        if (vus.has(c) || !garde.test(c)) continue;
        vus.add(c);
        const cp = c.codePointAt(0)!;
        if (sub.hasGlyphForCodePoint(cp)) continue;
        orig ??= ouvrir(origine);
        if (orig.hasGlyphForCodePoint(cp)) {
          erreurs.push(`${fichier} : « ${c} » (U+${cp.toString(16).toUpperCase()}) manque à ${nom} — relancer python3 scripts/build-fonts.py`);
        }
      }
    }
    return erreurs;
  };
  const cjk = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/;
  const titres = new Map([...sources].map(([f, s]) => [f, lireTitre(s)]));
  return [
    ...manquants("SourceHanSansCN-Medium-sub.woff2", "SourceHanSansCN-Medium.otf", sources, cjk),
    ...manquants("KaiTi-titres.woff2", "KaiTi.ttf", titres, /\S/),
  ];
}

function main() {
  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".cho") && !f.startsWith("_"))
    .sort();

  const errors: string[] = [];
  const propositions: ChantIndexe[] = [];
  const sources = new Map<string, string>();

  for (const file of files) {
    const source = fs.readFileSync(path.join(SONGS_DIR, file), "utf-8");
    sources.set(file, source);
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
      if (m.time !== null && !/^\d{1,2}\/\d{1,2}$/.test(m.time)) {
        errors.push(`${file} : mesure invalide « ${m.time} » ({time: 4/4})`);
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
  const zh = path.join(process.cwd(), "src", "locales", "zh-CN.json");
  errors.push(...controleSousEnsembles(new Map([...sources, ["src/locales/zh-CN.json", fs.readFileSync(zh, "utf-8")]])));

  if (errors.length) {
    console.error(`✗ ${errors.length} problème(s) détecté(s) sur ${files.length} chant(s) :`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${files.length} chant(s) valides`);
}

main();
