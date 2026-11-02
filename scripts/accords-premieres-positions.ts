// Lot DA-4 — instantané de la 1re position de guitare de chaque accord (chants et leurs 11 transpositions, et chaque
// qualité sur les 12 fondamentales). tests/accords-garde-fou.spec.ts vérifie qu'elle ne bouge pas.
// Usage : npx tsx scripts/accords-premieres-positions.ts > tests/fixtures/accords-premieres-positions.json
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { accordsDeLEtiquette, analyserAccord } from "../src/lib/accords/analyse";
import { positionsGuitare } from "../src/lib/accords/guitare";
import { QUALITES } from "../src/lib/accords/table";
import { getTransposedKey, transposeChord } from "../src/lib/transpose";

const NOMS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const DOSSIER = join(__dirname, "..", "content", "songs");
const sortie: Record<string, string> = {};
const noter = (jeton: string) => {
  if (jeton in sortie) return;
  const a = analyserAccord(jeton);
  if (!a) return;
  const d = positionsGuitare(a).doigtes[0];
  sortie[jeton] = d ? d.cases.map((c) => c ?? "x").join(",") : "";
};
for (const f of readdirSync(DOSSIER).filter((f) => f.endsWith(".cho")).sort()) {
  const texte = readFileSync(join(DOSSIER, f), "utf8");
  const cle = texte.match(/^\{key:\s*([^}\s]+)\s*\}/m)?.[1] ?? "C";
  for (const ligne of texte.split("\n")) {
    if (ligne.trimStart().startsWith("{")) continue;
    for (const m of ligne.matchAll(/\[([^\]]*)\]/g))
      for (const j of accordsDeLEtiquette(m[1] ?? "")) {
        noter(j);
        for (let t = 1; t < 12; t++) noter(transposeChord(j, t, getTransposedKey(cle, t)));
      }
  }
}
for (const q of Object.keys(QUALITES)) for (const n of NOMS) noter(n + q);
const trie = Object.fromEntries(Object.keys(sortie).sort().map((k) => [k, sortie[k]]));
process.stdout.write(JSON.stringify(trie, null, 1) + "\n");
