// Construit `public/harmonie-cours/` (cours d'Harmonie, tranche C1 de
// docs/spec-cours-harmonie.md) à partir de `docs/harmonie/cours/*.md` :
// `index.json` (la liste, ce qu'il faut pour la page des cours) et un JSON par
// chapitre, chargé seulement quand on l'ouvre.
//
// Appelé par `npm run build:index`.

import * as fs from "fs";
import * as path from "path";
import { lireChapitre } from "../src/lib/harmonie/cours";
import type { Chapitre, CoursIndex } from "../src/types/cours";

const DOSSIER = path.join(process.cwd(), "docs", "harmonie", "cours");
const SORTIE = path.join(process.cwd(), "public", "harmonie-cours");

function main() {
  if (!fs.existsSync(DOSSIER)) {
    console.log("· pas de cours (docs/harmonie/cours absent)");
    return;
  }
  const fichiers = fs.readdirSync(DOSSIER).filter((f) => /^\d\d-.+\.md$/.test(f)).sort();
  const chapitres: Chapitre[] = fichiers.map((f) => lireChapitre(fs.readFileSync(path.join(DOSSIER, f), "utf-8"), f));

  const vus = new Set<string>();
  for (const c of chapitres) {
    if (vus.has(c.id)) throw new Error(`cours : Id « ${c.id} » en double`);
    vus.add(c.id);
  }

  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });
  for (const c of chapitres) fs.writeFileSync(path.join(SORTIE, `${c.id}.json`), JSON.stringify(c), "utf-8");
  const index: CoursIndex = {
    genereLe: new Date().toISOString(),
    chapitres: chapitres.map(({ intro: _intro, contenu: _contenu, ...resume }) => resume),
  };
  fs.writeFileSync(path.join(SORTIE, "index.json"), JSON.stringify(index, null, 2), "utf-8");

  const lecons = chapitres.filter((c) => c.niveau !== null);
  const exercices = lecons.reduce((n, c) => n + c.exercices, 0);
  console.log(`✓ cours : ${lecons.length} chapitre(s) à cocher, ${chapitres.length - lecons.length} à lire, ${exercices} exercices`);
}

main();
