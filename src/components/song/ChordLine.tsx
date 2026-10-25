"use client";

import type { Token } from "@/types/chordPro";
import { AccordTouchable } from "@/components/accords/AccordTouchable";
import localFont from "next/font/local";
import { useLayoutEffect, useRef, useState } from "react";
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

/** Les morceaux d'un même mot (« dou[A]leurs, ») forment un bloc insécable :
 *  la ligne ne passe à la ligne qu'entre deux mots. Sur téléphone, « mes dou »
 *  finissait une rangée et « leurs, » ouvrait la suivante (01/10/2026). */
function toWords(segments: Segment[]): { seg: Segment; i: number }[][] {
  const words: { seg: Segment; i: number }[][] = [];
  segments.forEach((seg, i) => {
    const last = words.at(-1);
    if (last && !/\s$/.test(last[last.length - 1].seg.lyric)) last.push({ seg, i });
    else words.push([{ seg, i }]);
  });
  return words;
}

const LETTRE_LATINE = /^\p{Script=Latin}$/u;

/** Tiret de liaison dans un mot coupé par un accord, là où l'accord laisse un espace (« re – culé », C10, audit 24/10/2026) :
 *  centré dans l'espace laissé, visible seulement s'il y tient en entier. Hors copie et hors lecture d'écran. */
function TiretLiaison() {
  const cadre = useRef<HTMLSpanElement>(null);
  const tiret = useRef<HTMLSpanElement>(null);
  const [tient, setTient] = useState(false);
  useLayoutEffect(() => {
    const c = cadre.current;
    const t = tiret.current;
    if (!c || !t) return;
    const mesurer = () => setTient(c.clientWidth >= t.offsetWidth);
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(c);
    return () => obs.disconnect();
  }, []);
  return (
    <span ref={cadre} data-copy-ignore aria-hidden className="flex min-w-0 flex-1 justify-center overflow-hidden">
      <span ref={tiret} className="shrink-0 px-[0.2em] text-foreground" style={{ visibility: tient ? "visible" : "hidden" }}>
        –
      </span>
    </span>
  );
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
      {toWords(segments).map((word) => (
      <span key={word[0].i} className="inline-flex items-end">
      {word.map(({ seg, i }, k) => {
        const chordLen = seg.chord?.length ?? 0;
        const lyricLen = [...(seg.lyric)].length;
        const minWidth =
          hasAnyChord && chordLen > lyricLen
            ? `${chordLen + 0.5}ch`
            : undefined;
        const suivant = word[k + 1]?.seg.lyric;
        const tiret =
          showChords && !hideLyrics && seg.chord !== null && suivant !== undefined &&
          LETTRE_LATINE.test([...seg.lyric].at(-1) ?? "") && LETTRE_LATINE.test([...suivant][0] ?? "");
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
                <AccordTouchable etiquette={seg.chord} />
              </span>
            ) : 
              (showChords && hasAnyChord && <span data-copy-ignore className="leading-[0.7]" style={{ fontSize: `${chordEm}em` }}>&nbsp;</span>)
            }
            {/* `whitespace-pre` toujours : un accord de fin de ligne n'a qu'une espace
                sous lui ; effacée, sa colonne perd sa hauteur et l'accord tombe au
                niveau des paroles (27/09/2026). */}
            {(() => {
              const paroles = (
                <span
                  className={`text-foreground whitespace-pre ${fr_lyric_font?.className}`}
                  style={hideLyrics ? { visibility: "hidden" } : undefined}
                >
                  {(showChords ? seg.lyric : lyric) || (seg.chord && showChords ? " " : "")}
                </span>
              );
              return tiret ? (
                <span className="flex">
                  {paroles}
                  <TiretLiaison />
                </span>
              ) : (
                paroles
              );
            })()}
          </span>
        );
      })}
      </span>
      ))}
    </div>
  );
}
