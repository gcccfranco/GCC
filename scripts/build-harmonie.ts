// Construit `public/harmonie-index.json` (lot 9, H1) à partir des fiches
// écrites dans `docs/harmonie/*.md` et du répertoire.
//
// Deux choses sont calculées ici, une fois pour toutes, plutôt que dans le
// navigateur : la lecture des fiches (vocabulaire vérifié, coquille = échec du
// build) et, pour chaque fiche qui porte une règle, **les chants qui jouent
// déjà son « après »** — les exemples du répertoire. L'ordre d'affichage (du
// plus chanté au moins chanté) se calcule côté navigateur, à partir des
// setlists.
//
// Appelé par `npm run build:index`.

import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "../src/lib/content/loadSongs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { lireFamille, lireParcours } from "../src/lib/harmonie/fiches";
import { REGLES } from "../src/lib/harmonie/regles";
import { chercher } from "../src/lib/harmonie/motifs";
import type { Fiche, HarmonieIndex } from "../src/types/harmonie";

const DOSSIER = path.join(process.cwd(), "docs", "harmonie");
const SORTIE = path.join(process.cwd(), "public", "harmonie-index.json");

function main() {
  const fichiers = fs
    .readdirSync(DOSSIER)
    .filter((f) => /^\d\d-.+\.md$/.test(f))
    .sort();

  const fiches: Fiche[] = [];
  for (const f of fichiers) {
    if (f.startsWith("00-")) continue;
    fiches.push(...lireFamille(fs.readFileSync(path.join(DOSSIER, f), "utf-8"), f));
  }

  const parcours = lireParcours(fs.readFileSync(path.join(DOSSIER, "00-par-ou-commencer.md"), "utf-8"), fiches);

  // Exemples du répertoire : les chants dont le `.cho` joue déjà le « après ».
  const parFiche = new Map(fiches.map((f) => [f.id, f]));
  for (const slug of getSongSlugs()) {
    const ast = parseChordPro(loadSong(slug).chordProSource);
    const tonalite = ast.metadata.key;
    if (!tonalite) continue;
    for (const regle of REGLES) {
      const fiche = parFiche.get(regle.fiche);
      if (!fiche || !regle.variantes.length) continue;
      if (chercher(ast.sections, tonalite, regle, "apres").length) fiche.exemples.push(slug);
    }
  }

  const index: HarmonieIndex = { genereLe: new Date().toISOString(), fiches, parcours };
  fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
  fs.writeFileSync(SORTIE, JSON.stringify(index, null, 2), "utf-8");

  const avecRegle = fiches.filter((f) => REGLES.some((r) => r.fiche === f.id && r.variantes.length));
  const exemples = avecRegle.reduce((n, f) => n + f.exemples.length, 0);
  const aRelire = fiches.filter((f) => f.statut !== "validee").length;
  console.log(
    `✓ ${fiches.length} fiche(s) d'harmonie, ${parcours.length} étapes de parcours, ` +
      `${exemples} exemple(s) du répertoire sur ${avecRegle.length} fiche(s) à règle ` +
      `(${aRelire} fiche(s) encore à relire) → ${SORTIE}`,
  );
}

main();
