// Construit `public/harmonie-chez-nous.json` (lot H9, docs/spec-harmonie-accords.md) : ce qui se joue dans nos
// chants — les suites de chaque degré et les boucles de quatre accords, comptées en chants. Appelé par
// `npm run build:index`. Sans date dans le fichier : il ne change que si les chants changent.

import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "../src/lib/content/loadSongs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { compterChezNous, type ChantACompter, type Mode } from "../src/lib/harmonie/chezNous";

const SORTIE = path.join(process.cwd(), "public", "harmonie-chez-nous.json");

const chants: ChantACompter[] = [];
for (const slug of getSongSlugs()) {
  const ast = parseChordPro(loadSong(slug).chordProSource);
  if (!ast.metadata.key) continue;
  chants.push({ slug, titre: ast.metadata.title, tonalite: ast.metadata.key, sections: ast.sections });
}
const index = compterChezNous(chants);
fs.writeFileSync(SORTIE, JSON.stringify(index), "utf-8");

const nb = (m: Mode) => chants.filter((c) => /^[A-G][#b]?m$/.test(c.tonalite) === (m === "mineur")).length;
console.log(`✓ « chez nous » : ${nb("majeur")} chants en majeur, ${nb("mineur")} en mineur → ${SORTIE}`);
if (process.argv.includes("--detail")) {
  for (const m of ["majeur", "mineur"] as Mode[]) {
    console.log(`\n${m} — suites (chants du degré : suite n)`);
    for (const [de, e] of Object.entries(index.suites[m]).sort((a, b) => b[1].chants - a[1].chants)) {
      if (e.chants < 3) continue;
      console.log(`  ${de} (${e.chants}) : ${e.suites.slice(0, 4).map((s) => `${s.chiffre} ${s.chants}`).join(" · ")}`);
    }
    console.log(`${m} — boucles`);
    for (const [b, l] of Object.entries(index.boucles[m]).slice(0, 6)) console.log(`  ${b} : ${l.length}`);
  }
}
