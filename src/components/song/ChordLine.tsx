"use client";

import type { Token } from "@/types/chordPro";
import localFont from "next/font/local";
type Segment = { chord: string | null; lyric: string };

// function toSegments(tokens: Token[]): Segment[] {
//   const segments: Segment[] = [];
//   let i = 0;

//   while (i < tokens.length) {
//     const token = tokens[i];

//     if (token.type === "chord") {
//       const chord = token.value;
//       let lyric = "";
//       i++;
//       while (i < tokens.length && tokens[i].type === "lyric") {
//         lyric += tokens[i].value;
//         i++;
//       }

//       const spaceIdx = lyric.search(/\s/);
//       if (spaceIdx === -1 || spaceIdx === lyric.length - 1) {
//         segments.push({ chord, lyric });
//       } else {
//         const firstWord = lyric.slice(0, spaceIdx + 1);
//         const rest = lyric.slice(spaceIdx + 1);
//         segments.push({ chord, lyric: firstWord });
//         const words = rest.split(/(?<=\s)/);
//         for (const word of words) {
//           if (word) segments.push({ chord: null, lyric: word });
//         }
//       }
//     } else {
//       const words = token.value.split(/(?<=\s)/);
//       for (const word of words) {
//         if (word) segments.push({ chord: null, lyric: word });
//       }
//       i++;
//     }
//   }

//   return segments;
// }

function toSegments(tokens: Token[], joinSyllables: boolean): Segment[] {
  const segments: Segment[] = [];
  // Sans accords, « infi - nie » se lit « infinie » : le tiret sort AVANT le
  // découpage en mots, sinon « infi » et « nie » resteraient deux mots.
  const clean = (s: string) => (joinSyllables ? s.replace(/\s?-\s/g, "").trimStart() : s);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "chord") {
      const chord = token.value;
      let lyric = "";

      i++;

      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value;
        i++;
      }
      lyric = clean(lyric);

      // Un mot par segment : une ligne trop longue passe à la ligne entre deux
      // mots. D'un seul bloc, elle débordait de l'écran, texte agrandi (27/09/2026).
      const spaceIdx = lyric.search(/\s/);
      if (spaceIdx === -1 || spaceIdx === lyric.length - 1) {
        segments.push({ chord, lyric });
      } else {
        segments.push({ chord, lyric: lyric.slice(0, spaceIdx + 1) });
        for (const word of lyric.slice(spaceIdx + 1).split(/(?<=\s)/)) {
          if (word) segments.push({ chord: null, lyric: word });
        }
      }
    } else {
      for (const word of clean(token.value).split(/(?<=\s)/)) {
        if (word) segments.push({ chord: null, lyric: word });
      }
      i++;
    }
  }

  return segments;
}

interface ChordLineProps {
  tokens: Token[];
  showChords?: boolean;
  /** Masque le texte des paroles tout en gardant la largeur (accords positionnés). */
  hideLyrics?: boolean;
  fontSize?: number;
  /** Taille des accords relative aux paroles (em) — 0.9 web, 1.13 typo PDF */
  chordEm?: number;
  chord_font?: ReturnType<typeof localFont>;
  fr_lyric_font?: ReturnType<typeof localFont>;
}

export function ChordLine({ tokens, showChords = true, hideLyrics = false, fontSize, chordEm = 0.9, chord_font, fr_lyric_font }: ChordLineProps) {
  const segments = toSegments(tokens, !showChords);
  const hasAnyChord = showChords && segments.some((s) => s.chord !== null);
  return (
    <div
      data-copy-line
      className="font-sans leading-normal select-text flex flex-wrap items-end"
      style={{
        // Sans taille imposée (typographie PDF), taille par défaut de l'écran (globals.css).
        fontSize: fontSize !== undefined ? `${fontSize}rem` : "var(--lyric-size)",
        paddingTop: "0.15em",
        paddingBottom: "0.15em",
        lineHeight: segments.every(s => !s.lyric?.trim()) ? "0" : undefined,
      }}  
    >
      {segments.map((seg, i) => {
        const chordLen = seg.chord?.length ?? 0;
        const lyricLen = [...(seg.lyric)].length;
        const minWidth =
          hasAnyChord && chordLen > lyricLen
            ? `${chordLen + 0.5}ch`
            : undefined;
        const lyric = seg.lyric?.replace(/\s?-\s/g,'').trimStart()
        // console.log(seg.lyric,lyric)
        if (!showChords && !lyric){return null} else
        return (
          <span
            key={i}
            className="inline-flex flex-col align-bottom whitespace-nowrap"
            style={{ minWidth }}
          >
            {showChords && seg.chord ? (
              <span
                data-copy-ignore
                className={`font-bold font-chord whitespace-nowrap leading-[0.7] ${chord_font?.className}`}
                // padding-right : écart minimal quand l'accord est plus large
                // que la parole (fréquent en chinois : accord long sur 1 caractère),
                // sinon deux accords consécutifs se touchent
                style={{ fontSize: `${chordEm}em`, paddingRight: "0.5em" }}
              >
                {seg.chord}
              </span>
            ) : 
              (showChords && hasAnyChord && <span data-copy-ignore className="leading-[0.7]" style={{ fontSize: `${chordEm}em` }}>&nbsp;</span>)
            }
            {/* `whitespace-pre` toujours : un accord de fin de ligne n'a qu'une espace
                sous lui ; effacée, sa colonne perd sa hauteur et l'accord tombe au
                niveau des paroles (27/09/2026). */}
            <span
              className={`text-foreground whitespace-pre ${fr_lyric_font?.className}`}
              style={hideLyrics ? { visibility: "hidden" } : undefined}
            >
              {(showChords ? seg.lyric : lyric) || (seg.chord && showChords ? " " : "")}
            </span>
          </span>
        );
      })}
    </div>
  );
}
