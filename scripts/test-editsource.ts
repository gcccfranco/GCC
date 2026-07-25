// Tests de la logique d'édition par setlist (mode « Adapter ») :
// - invariant aller-retour parse/sérialisation sur TOUTES les lignes du répertoire
//   (c'est ce test qui a attrapé la convention zh `[C][ ]`) ;
// - cohérence des index srcLine / pinyinSrcLine / jianpuSrcLine du parser ;
// - opérations d'édition (accords, paroles, lignes instrumentales, suppression)
//   sur un chant FR et un chant ZH réels.
import * as fs from "fs";
import * as path from "path";
import { parseChordPro, parseLyricLine } from "../src/lib/chordpro/parser";
import {
  parseEditableLine,
  serializeEditableLine,
  addChord,
  replaceChord,
  removeChord,
  moveChord,
  setLyrics,
  isInstrumentalLine,
  instrumentalParts,
  makeInstrumentalLine,
  replaceSourceLine,
  insertSourceLineAfter,
  deleteSourceLines,
  materializeSectionCopy,
} from "../src/lib/chordpro/editSource";

const SONGS = path.join(process.cwd(), "content", "songs");
let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("  ✗", msg);
  }
}

function tokensEqual(a: string, b: string, lang: string): boolean {
  const pa = parseLyricLine(a.trim(), lang);
  const pb = parseLyricLine(b.trim(), lang);
  return JSON.stringify(pa) === JSON.stringify(pb);
}

// ── 1. Invariant aller-retour sur toutes les lignes de tous les chants ──
let songCount = 0;
let lineCount = 0;
let pinyinSepCount = 0;
for (const f of fs.readdirSync(SONGS).filter((f) => f.endsWith(".cho") && !f.startsWith("_"))) {
  const source = fs.readFileSync(path.join(SONGS, f), "utf8");
  const lines = source.split("\n");
  const ast = parseChordPro(source);
  songCount++;
  for (const sec of ast.sections) {
    for (const line of sec.lines) {
      if (line.srcLine === undefined) continue;
      lineCount++;
      if (line.pinyinSrcLine !== undefined) pinyinSepCount++;
      const raw = lines[line.srcLine];
      const reparsed = parseLyricLine(raw.trim(), ast.metadata.language);
      check(
        JSON.stringify(reparsed.tokens) === JSON.stringify(line.tokens),
        `${f}: srcLine ${line.srcLine} ne correspond pas aux tokens`
      );
      const el = parseEditableLine(raw, ast.metadata.language);
      const ser = serializeEditableLine(el);
      check(
        tokensEqual(raw, ser, ast.metadata.language),
        `${f}: round-trip différent L${line.srcLine}\n    avant: ${raw}\n    après: ${ser}`
      );
      if (line.jianpuSrcLine !== undefined) {
        check(
          lines[line.jianpuSrcLine].trim().startsWith("{jianpu"),
          `${f}: jianpuSrcLine L${line.jianpuSrcLine} n'est pas une directive jianpu`
        );
      }
      if (line.pinyinSrcLine !== undefined) {
        check(
          lines[line.pinyinSrcLine].trim() === line.pinyin,
          `${f}: pinyinSrcLine incohérent L${line.pinyinSrcLine}`
        );
      }
    }
  }
}
console.log(
  `1. Round-trip : ${songCount} chants, ${lineCount} lignes (pinyin séparé : ${pinyinSepCount}) — ${failures} échec(s)`
);

// ── 2. Opérations d'édition (FR) ──
{
  const source = fs.readFileSync(path.join(SONGS, "a-la-croix.cho"), "utf8");
  const ast = parseChordPro(source);
  const line = ast.sections[0].lines.find((l) => l.tokens.some((t) => t.type === "chord"))!;
  const raw = source.split("\n")[line.srcLine!];
  let el = parseEditableLine(raw, "fr");
  const nAnchors = el.anchors.length;

  el = addChord(el, 0, "Em7");
  check(
    el.anchors.length === nAnchors + 1 && el.anchors.some((a) => a.chord === "Em7" && a.offset === 0),
    "FR: addChord"
  );
  el = replaceChord(el, 0, "D/F#");
  check(el.anchors[0].chord === "D/F#", "FR: replaceChord");
  const moved = moveChord(el, 0, 2);
  el = moved.line;
  check(el.anchors[moved.index].chord === "D/F#" && el.anchors[moved.index].offset === 2, "FR: moveChord suit l'ancre");
  el = removeChord(el, moved.index);
  check(el.anchors.length === nAnchors, "FR: removeChord");

  // moveChord : l'index suit l'ancre quand elle croise un autre accord
  const cross0 = parseEditableLine("[A]ab[B]cd", "fr");
  const s1 = moveChord(cross0, 0, 3); // A passe de 0 à 3, au-delà de B (2)
  check(s1.line.anchors[s1.index].chord === "A", "FR: moveChord index après croisement");
  check(serializeEditableLine(s1.line) === "ab[B]c[A]d", `FR: croisement sérialisé → ${serializeEditableLine(s1.line)}`);

  // Ré-ancrage : remplacer un mot ne déplace pas les accords des autres mots
  const el2 = parseEditableLine("[G]Par amour Tu [D]as donné Ta [Em]vie", "fr");
  const el3 = setLyrics(el2, "Par amour Tu as offert Ta vie", "fr");
  check(
    serializeEditableLine(el3) === "[G]Par amour Tu [D]as offert Ta [Em]vie",
    `FR: setLyrics mot remplacé → ${serializeEditableLine(el3)}`
  );
  // Ré-ancrage LCS : un mot AJOUTÉ ne décale pas les accords des mots inchangés
  const el4 = setLyrics(el2, "Par si grand amour Tu as donné Ta vie", "fr");
  check(
    serializeEditableLine(el4) === "[G]Par si grand amour Tu [D]as donné Ta [Em]vie",
    `FR: setLyrics mot ajouté (LCS) → ${serializeEditableLine(el4)}`
  );
  // … ni un mot SUPPRIMÉ
  const el5 = setLyrics(el2, "Par amour Tu as donné vie", "fr");
  check(
    serializeEditableLine(el5) === "[G]Par amour Tu [D]as donné [Em]vie",
    `FR: setLyrics mot supprimé (LCS) → ${serializeEditableLine(el5)}`
  );

  // Modification du source complet + re-parse
  const newRaw = serializeEditableLine(addChord(parseEditableLine(raw, "fr"), 0, "C2"));
  const modified = replaceSourceLine(source, line.srcLine!, newRaw);
  const ast2 = parseChordPro(modified);
  check(ast2.sections.length === ast.sections.length, "FR: replaceSourceLine préserve les sections");
  const line2 = ast2.sections[0].lines[ast.sections[0].lines.indexOf(line)];
  check(line2.tokens.some((t) => t.type === "chord" && t.value === "C2"), "FR: accord ajouté visible après re-parse");

  // Ligne instrumentale insérée après
  const instr = makeInstrumentalLine("x2", ["C", "G/B", "Am7"]);
  check(isInstrumentalLine(instr), "FR: makeInstrumentalLine détectée instrumentale");
  const p = instrumentalParts(instr);
  check(p.annotation === "x2" && p.chords.join(",") === "C,G/B,Am7", "FR: instrumentalParts");
  const withInstr = insertSourceLineAfter(source, line.srcLine!, serializeEditableLine(instr));
  const ast3 = parseChordPro(withInstr);
  check(ast3.sections[0].lines.length === ast.sections[0].lines.length + 1, "FR: ligne instrumentale dans la même section");

  // Suppression de ligne
  const del = deleteSourceLines(source, [line.srcLine!]);
  const ast4 = parseChordPro(del);
  check(ast4.sections[0].lines.length === ast.sections[0].lines.length - 1, "FR: deleteSourceLines");
  console.log("2. Opérations FR (a-la-croix) —", failures, "échec(s) cumulés");
}

// ── 3. Opérations d'édition (ZH : pinyin, accords « espace ») ──
{
  const source = fs.readFileSync(path.join(SONGS, "一生爱你.cho"), "utf8");
  const ast = parseChordPro(source);
  const allLines = ast.sections.flatMap((s) => s.lines);
  const line = allLines.find((l) => l.tokens.some((t) => t.type === "chord") && l.pinyin)!;
  const raw = source.split("\n")[line.srcLine!];
  let el = parseEditableLine(raw, "zh");
  if (!el.pinyin) el = { ...el, pinyin: line.pinyin };
  check(el.pinyin === line.pinyin, "ZH: pinyin récupéré");

  const el2 = addChord(el, 1, "F#m7");
  const ser = serializeEditableLine(el2);
  const reparsed = parseLyricLine(ser, "zh");
  check(reparsed.tokens.some((t) => t.type === "chord" && t.value === "F#m7"), "ZH: accord inséré présent");
  check(reparsed.pinyin === line.pinyin, `ZH: pinyin inline préservé → ${reparsed.pinyin}`);

  const el3 = setLyrics(el, el.text.slice(0, -1), "zh");
  check(el3.anchors.every((a) => a.offset <= el3.text.length), "ZH: ancres bornées après édition des paroles");

  // Ligne avec pinyin séparé : édition → inline + suppression de la ligne séparée
  outer: for (const f of fs.readdirSync(SONGS).filter((f) => f.endsWith(".cho") && !f.startsWith("_"))) {
    const src2 = fs.readFileSync(path.join(SONGS, f), "utf8");
    const a2 = parseChordPro(src2);
    for (const s of a2.sections) {
      for (const l of s.lines) {
        if (l.pinyinSrcLine !== undefined) {
          const rawL = src2.split("\n")[l.srcLine!];
          const eln = { ...parseEditableLine(rawL, "zh"), pinyin: l.pinyin };
          let next = replaceSourceLine(src2, l.srcLine!, serializeEditableLine(eln));
          next = deleteSourceLines(next, [l.pinyinSrcLine]);
          const a3 = parseChordPro(next);
          const l3 = a3.sections
            .flatMap((x) => x.lines)
            .find((x) => JSON.stringify(x.tokens) === JSON.stringify(l.tokens));
          check(!!l3 && l3.pinyin === l.pinyin, `ZH (${f}): pinyin séparé → inline préservé`);
          break outer;
        }
      }
    }
  }
  console.log("3. Opérations ZH (一生爱你) —", failures, "échec(s) cumulés");
}

// ─── 4. Matérialisation d'une section répétée (toutes les sections, pas que le refrain) ──
{
  const src = [
    "{title: Test}",
    "{key: C}",
    "",
    "{start_of_verse: Couplet 1}",
    "[C]Ligne du couplet un",
    "[G]Deuxième ligne",
    "{end_of_verse}",
    "",
    "{start_of_chorus: Refrain}",
    "[F]Ligne du refrain",
    "{end_of_chorus}",
    "",
    "{start_of_bridge: Pont}",
    "[Am]Ligne du pont",
    "{end_of_bridge}",
  ].join("\n");
  const base = parseChordPro(src);
  // Chaque type de section (couplet, refrain, pont) doit être matérialisable.
  for (const sec of base.sections) {
    const mat = materializeSectionCopy(src, sec.id);
    check(!!mat, `Matérialisation: ${sec.id} duplicable`);
    if (!mat) continue;
    const after = parseChordPro(mat.source);
    check(after.sections.length === base.sections.length + 1, `Matérialisation: ${sec.id} → une section de plus`);
    const copy = after.sections.find((x) => x.id === mat.newSectionId);
    check(!!copy, `Matérialisation: ${sec.id} → copie ${mat.newSectionId} présente`);
    check(
      !!copy && JSON.stringify(copy.lines.map((l) => l.tokens)) === JSON.stringify(sec.lines.map((l) => l.tokens)),
      `Matérialisation: ${sec.id} → contenu de la copie identique`
    );
    // Les ids des sections existantes ne bougent pas (les structures des autres occurrences restent valides).
    check(
      base.sections.every((s0) => after.sections.some((s1) => s1.id === s0.id)),
      `Matérialisation: ${sec.id} → ids existants stables`
    );
    // Les lignes de la copie sont bien à index d'origine + lineOffset.
    const firstLine = sec.lines.find((l) => l.srcLine !== undefined);
    const copyFirst = copy?.lines.find((l) => l.srcLine !== undefined);
    check(
      !!firstLine && !!copyFirst && copyFirst.srcLine === firstLine.srcLine! + mat.lineOffset,
      `Matérialisation: ${sec.id} → lineOffset correct`
    );
    // L'édition sur la copie ne touche pas l'original.
    const edited = deleteSourceLines(mat.source, [firstLine!.srcLine! + mat.lineOffset]);
    const astEdited = parseChordPro(edited);
    const orig = astEdited.sections.find((x) => x.id === sec.id);
    check(
      !!orig && orig.lines.length === sec.lines.length,
      `Matérialisation: ${sec.id} → suppression sur la copie sans effet sur l'original`
    );
  }
  console.log("4. Matérialisation de sections répétées —", failures, "échec(s) cumulés");
}

if (failures === 0) {
  console.log("\n✓ Tous les tests d'édition passent");
} else {
  console.error(`\n✗ ${failures} échec(s)`);
  process.exit(1);
}
