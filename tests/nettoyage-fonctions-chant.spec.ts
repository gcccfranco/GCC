import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { toSegments } from "../src/lib/chordpro/segments";
import { ordreJoue, resolveStructureOverride } from "../src/lib/chordpro/structure";
import { isCJK } from "../src/lib/cjk";
import { idDeSection } from "../src/lib/setlist/sectionOrigins";
import { semitonesTo } from "../src/lib/transpose";
import { transposeAST, transposerVers } from "../src/lib/transposeAST";
import type { ChordProAST, Token } from "../src/types/chordPro";

// Lot N2, tranche N2b (docs/spec-nettoyage-code.md) : cinq petites choses écrites plusieurs fois dans le chemin
// des chants, mises en commun. Spec sans page : elle fige le comportement des copies d'origine (recopiées ici
// sous `REF_*`, telles qu'elles étaient) et vérifie que les fonctions communes donnent les mêmes sorties.

const CHANTS = path.join(__dirname, "..", "content", "songs");
const lire = (f: string): ChordProAST => parseChordPro(readFileSync(path.join(CHANTS, f), "utf8"));
const accords = (ast: ChordProAST) =>
  ast.sections.flatMap((s) => s.lines.flatMap((l) => (l.tokens ?? []).filter((t) => t.type === "chord").map((t) => t.value)));

// ─── Copies d'origine ────────────────────────────────────────────────────────

/** blocks.ts `getTransposed` et les gardes équivalentes de PartitionView / SetlistFullPDF. */
function REF_transposer(ast: ChordProAST, cle: string | null): ChordProAST {
  if (!cle || cle === ast.metadata.key) return ast;
  return transposeAST(ast, semitonesTo(ast.metadata.key, cle), cle);
}
/** MyStructureSheet / playedSections / SetlistFullPDF : structure absente ou vide → les sections telles quelles. */
function REF_ordre<T extends { id: string; uid: string }>(sections: T[], structure: string[] | null | undefined): T[] {
  return structure?.length ? resolveStructureOverride(sections, structure) : sections;
}
const REF_idDeSection = (uid: string) => uid.replace(/-\d+$/, "");
/** SongView, EditLineSheet et SongPDF (identiques). */
function REF_isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}
/** SongView et SongPDF (identiques). */
type Seg = { chord: string | null; lyric: string };
function REF_toSegments(tokens: Token[]): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "chord") {
      const chord = tok.value;
      let lyric = "";
      i++;
      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value;
        i++;
      }
      const sp = lyric.search(/\s/);
      if (sp === -1 || sp === lyric.length - 1) {
        out.push({ chord, lyric });
      } else {
        out.push({ chord, lyric: lyric.slice(0, sp + 1) });
        lyric.slice(sp + 1).split(/(?<=\s)/).forEach((w) => w && out.push({ chord: null, lyric: w }));
      }
    } else {
      tok.value.split(/(?<=\s)/).forEach((w) => w && out.push({ chord: null, lyric: w }));
      i++;
    }
  }
  return out;
}

// ─── (a) transposition vers la tonalité d'un item ────────────────────────────

const FR = "Ta-parole-écriture.cho"; // Bb
const ZH = "一切歌颂赞美.cho"; // E

test("(a) transposition vers une tonalité d'item : identité, nulle, autre tonalité", () => {
  const fr = lire(FR);
  const zh = lire(ZH);
  for (const ast of [fr, zh]) {
    expect(REF_transposer(ast, ast.metadata.key)).toBe(ast);
    expect(REF_transposer(ast, null)).toBe(ast);
    expect(REF_transposer(ast, "")).toBe(ast);
  }
  const frC = REF_transposer(fr, "C");
  expect(frC.metadata.key).toBe("C");
  expect(accords(frC).slice(0, 8)).toEqual(["C", "F/A", "C/G", "G", "C/E", "F/A", "C/G", "G"]);
  const zhG = REF_transposer(zh, "G");
  expect(zhG.metadata.key).toBe("G");
  expect(accords(zhG).slice(0, 8)).toEqual(["G", "D", "C", "G", "G", "Em", "Am", "D"]);
  // La fonction commune : mêmes sorties, identité gardée.
  for (const ast of [fr, zh]) {
    expect(transposerVers(ast, ast.metadata.key)).toBe(ast);
    expect(transposerVers(ast, null)).toBe(ast);
    expect(transposerVers(ast, undefined)).toBe(ast);
  }
  expect(transposerVers(fr, "C")).toEqual(frC);
  expect(transposerVers(zh, "G")).toEqual(zhG);
});

// ─── (b) ordre joué ──────────────────────────────────────────────────────────

test("(b) ordre joué : structure vide/null/undefined → les sections elles-mêmes, sinon resolveStructureOverride", () => {
  const { sections } = lire(FR);
  for (const s of [null, undefined, []]) expect(REF_ordre(sections, s)).toBe(sections);
  const structure = [sections[1].uid, sections[0].uid, sections[1].uid];
  const joue = REF_ordre(sections, structure);
  expect(joue).toEqual(resolveStructureOverride(sections, structure));
  expect(joue.map((s) => s.id)).toEqual([sections[1].id, sections[0].id, sections[1].id]);
  for (const s of [null, undefined, []]) expect(ordreJoue(sections, s)).toBe(sections);
  expect(ordreJoue(sections, structure)).toEqual(joue);
});

// ─── (c) idDeSection ─────────────────────────────────────────────────────────

test("(c) idDeSection", () => {
  expect(REF_idDeSection("couplet-2")).toBe("couplet");
  expect(REF_idDeSection("refrain")).toBe("refrain");
  expect(REF_idDeSection("pont-1-3")).toBe("pont-1");
  for (const uid of ["couplet-2", "refrain", "pont-1-3"]) expect(idDeSection(uid)).toBe(REF_idDeSection(uid));
});

// ─── (d) isCJK ───────────────────────────────────────────────────────────────

// Les quatre copies d'origine : SongView, EditLineSheet et SongPDF sont identiques (REF_isCJK) ; celle de
// JianpuLine ajoute le plan 0x20000–0x2a6df (idéogrammes rares) : elle diffère, elle n'est PAS fusionnée.
test("(d) isCJK : mêmes sorties que les copies identiques", () => {
  const attendu: Record<string, boolean> = { "中": true, a: false, "。": false, "é": false, " ": false, "㐀": true, "": false };
  for (const [c, v] of Object.entries(attendu)) expect(REF_isCJK(c), JSON.stringify(c)).toBe(v);
  for (const c of [...Object.keys(attendu), "\u{20000}"]) expect(isCJK(c), JSON.stringify(c)).toBe(REF_isCJK(c));
  expect(REF_isCJK("\u{20000}")).toBe(false); // JianpuLine répond true ici : c'est pourquoi elle reste à part
});

// ─── (e) toSegments ──────────────────────────────────────────────────────────

const c = (value: string): Token => ({ type: "chord", value });
const l = (value: string): Token => ({ type: "lyric", value });
const CAS_SEGMENTS: Array<[string, Token[], Seg[]]> = [
  ["FR : mot unique", [c("C"), l("Bon")], [{ chord: "C", lyric: "Bon" }]],
  [
    "FR : accord sur plusieurs mots",
    [c("C"), l("Bon"), l("jour tous")],
    [{ chord: "C", lyric: "Bonjour " }, { chord: null, lyric: "tous" }],
  ],
  ["FR : espace final", [c("F"), l("la ")], [{ chord: "F", lyric: "la " }]],
  [
    "FR : paroles avant le premier accord",
    [l("Oh "), c("G"), l("toi")],
    [{ chord: null, lyric: "Oh " }, { chord: "G", lyric: "toi" }],
  ],
  ["ZH : caractères", [c("G"), l("你好")], [{ chord: "G", lyric: "你好" }]],
  [
    "ZH : latin mêlé",
    [c("Em"), l("你 Jesus 好"), c("D"), l("爱")],
    [
      { chord: "Em", lyric: "你 " },
      { chord: null, lyric: "Jesus " },
      { chord: null, lyric: "好" },
      { chord: "D", lyric: "爱" },
    ],
  ],
  ["accord seul", [c("A"), c("B")], [{ chord: "A", lyric: "" }, { chord: "B", lyric: "" }]],
];

test("(e) toSegments : cas attendus sur la copie d'origine", () => {
  for (const [nom, tokens, attendu] of CAS_SEGMENTS) {
    expect(REF_toSegments(tokens), nom).toEqual(attendu);
    expect(toSegments(tokens), nom).toEqual(attendu);
  }
});
