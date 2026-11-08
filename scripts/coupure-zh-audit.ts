/** Audit de la segmentation des mots chinois (lot CV, CV-2) : lecture seule, ne modifie aucun .cho.
 *  `npm run coupure:audit` -> scripts/coupure-zh-audit/planche.html : par chant, chaque ligne de paroles avec ses mots
 *  séparés par « | » (les mots de 2 caractères et plus surlignés), en tête les mots distincts (fréquence) et les cas
 *  suspects (caractère seul entre deux mots, mot de plus de 4 caractères). Même fonction que ZhLine : `motsDuTexte`. */
import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { EXCEPTIONS_MOTS, motsDuTexte } from "../src/lib/song/motsChinois";

const RACINE = process.cwd();
const SORTIE = path.join(RACINE, "scripts", "coupure-zh-audit", "planche.html");
const IDEOGRAMME = /\p{Script=Han}/u;
const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nbCar = (s: string) => [...s].filter((c) => IDEOGRAMME.test(c)).length;

type Piece = { texte: string; mot: boolean };
/** Découpe un texte en pièces : les mots retenus par `motsDuTexte` et, entre eux, les caractères isolés. */
function pieces(texte: string, slug: string): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  for (const m of motsDuTexte(texte, slug)) {
    for (const c of texte.slice(i, m.debut)) out.push({ texte: c, mot: false });
    out.push({ texte: texte.slice(m.debut, m.fin), mot: true });
    i = m.fin;
  }
  for (const c of texte.slice(i)) out.push({ texte: c, mot: false });
  return out;
}

const index = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "songs-index.json"), "utf-8")) as {
  songs: { slug: string; title: string; language: string }[];
};
const chants = index.songs.filter((s) => s.language === "zh");

const frequences = new Map<string, number>();
const suspects: string[] = [];
let nbLignes = 0;
const blocs: string[] = [];

for (const chant of chants) {
  const fichier = path.join(RACINE, "content", "songs", `${chant.slug}.cho`);
  if (!fs.existsSync(fichier)) continue;
  const ast = parseChordPro(fs.readFileSync(fichier, "utf-8"));
  const lignesHtml: string[] = [];
  for (const section of ast.sections) {
    for (const ligne of section.lines) {
      // Même texte que ZhLine : les paroles seules, accords et espaces retirés.
      const texte = ligne.tokens.filter((t) => t.type === "lyric").map((t) => t.value).join("").replace(/\s+/g, "");
      if (!IDEOGRAMME.test(texte)) continue;
      nbLignes++;
      const ps = pieces(texte, chant.slug);
      ps.forEach((p, i) => {
        if (p.mot) frequences.set(p.texte, (frequences.get(p.texte) ?? 0) + 1);
        // Caractère seul entre deux mots : souvent un mot que le segmenteur n'a pas reconnu.
        if (!p.mot && IDEOGRAMME.test(p.texte) && ps[i - 1]?.mot && ps[i + 1]?.mot) {
          suspects.push(`${chant.slug} : ${ps[i - 1].texte} <b>${p.texte}</b> ${ps[i + 1].texte}`);
        }
      });
      // Mot de plus de 4 caractères : `motsDuTexte` ne le garde pas, on le cherche dans le texte brut.
      const brut = typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter("zh-CN", { granularity: "word" }).segment(texte)] : [];
      for (const s of brut) if (s.isWordLike && nbCar(s.segment) > 4) suspects.push(`${chant.slug} : mot de ${nbCar(s.segment)} caractères <b>${s.segment}</b>`);
      lignesHtml.push(
        `<p>${ps.map((p) => (p.mot ? `<mark>${echappe(p.texte)}</mark>` : echappe(p.texte))).join('<span class="sep">|</span>')}</p>`,
      );
    }
  }
  blocs.push(`<section><h2>${echappe(chant.title)} <small>${chant.slug}</small></h2>${lignesHtml.join("")}</section>`);
}

const motsDistincts = [...frequences.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"));
const exceptions = Object.keys(EXCEPTIONS_MOTS).length;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Audit de la segmentation des mots chinois</title>
<style>
body{font:15px/1.6 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem}
section{border-top:1px solid #ccc;margin-top:1.5rem}
h2 small{font-weight:400;color:#777;font-size:.7em}
p{margin:.15rem 0;font-size:1.15rem}
mark{background:#ffe08a;padding:0 1px}
.sep{color:#aaa;margin:0 2px}
.mots span{display:inline-block;margin:0 .6rem .2rem 0;white-space:nowrap}
.mots i{color:#777;font-size:.8em}
</style></head><body>
<h1>Segmentation des mots chinois</h1>
<p>${chants.length} chants, ${nbLignes} lignes, ${motsDistincts.length} mots distincts de 2 à 4 caractères ; ${exceptions} chant(s) avec exceptions (src/lib/song/motsChinois.ts).</p>
<h2>Cas suspects (${suspects.length})</h2>
<ul>${suspects.map((s) => `<li>${s}</li>`).join("")}</ul>
<h2>Mots distincts (fréquence)</h2>
<div class="mots">${motsDistincts.map(([m, n]) => `<span>${echappe(m)} <i>${n}</i></span>`).join("")}</div>
<h2>Chants</h2>
${blocs.join("\n")}
</body></html>`;

fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, html);
console.log(`${chants.length} chants, ${nbLignes} lignes, ${motsDistincts.length} mots distincts, ${suspects.length} cas suspects`);
console.log(`Planche : ${path.relative(RACINE, SORTIE)}`);
