"use client";

import type { Token } from "@/types/chordPro";
import { AccordTouchable } from "@/components/accords/AccordTouchable";
import localFont from "next/font/local";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { LargeurCoupureContext, CoupureMesureContext, bordCoupure } from "@/components/song/LargeurCoupure";
import { signalerCoupure } from "@/lib/song/coupureSignal";
import { choisirCoupure, DEBORD, type Unite } from "@/lib/song/coupure";
type Segment = { chord: string | null; lyric: string };

function toSegments(tokens: Token[], joinSyllables: boolean): Segment[] {
  const segments: Segment[] = [];
  // Sans accords, « infi - nie » se lit « infinie » : le tiret sort AVANT le
  // découpage en mots, sinon « infi » et « nie » resteraient deux mots. La ligne
  // se recolle en entier d'abord : nettoyé accord par accord, « à[F] Lui »
  // perdait son espace et devenait « àLui » (31/10/2026).
  if (joinSyllables) {
    const texte = tokens.filter((t) => t.type === "lyric").map((t) => t.value).join("");
    return texte
      .replace(/\s?-\s/g, "")
      .split(/(?<=\s)/)
      .filter((word) => word)
      .map((word) => ({ chord: null, lyric: word }));
  }
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
      for (const word of token.value.split(/(?<=\s)/)) {
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
  /** Rangée d'accords sans paroles suivie d'une ligne avec paroles : ajoute l'écart entre les deux lignes. */
  ecartApres?: boolean;
}

type Coupe = { coupures: number[]; etat: string; relache: string[]; retrait: number | null };
const UNE_RANGEE: Coupe = { coupures: [], etat: "une", relache: [], retrait: null };

/** Position (px non mis à l'échelle, depuis le bord gauche de la rangée) du premier caractère de paroles de la rangée,
 *  ou null s'il n'y en a pas (accords seuls) : le retrait des rangées de suite part de là (R5). */
function debutParoles(rangee: HTMLElement | null, echelle: number): number | null {
  if (!rangee) return null;
  const bord = rangee.getBoundingClientRect().left;
  for (const p of rangee.querySelectorAll("[data-paroles]")) {
    const noeud = p.firstChild;
    if (!noeud || noeud.nodeType !== Node.TEXT_NODE) continue;
    const i = (noeud as Text).data.search(/\S/);
    if (i < 0) continue;
    const plage = document.createRange();
    plage.setStart(noeud, i);
    plage.setEnd(noeud, i + 1);
    return (plage.getBoundingClientRect().left - bord) / echelle;
  }
  return null;
}

const nettoie = (lyric: string) => lyric.replace(/\s?-\s/g, "").trimStart();

/** Largeur de l'espace final d'un mot (le dernier nœud de paroles), pour le retirer quand le mot finit une rangée. */
function espaceFinDe(mot: HTMLElement, echelle: number): number {
  const paroles = mot.querySelectorAll("[data-paroles]");
  const noeud = paroles[paroles.length - 1]?.firstChild;
  if (!noeud || noeud.nodeType !== Node.TEXT_NODE) return 0;
  const data = (noeud as Text).data;
  const fin = /\s+$/.exec(data);
  if (!fin) return 0;
  const plage = document.createRange();
  plage.setStart(noeud, data.length - fin[0].length);
  plage.setEnd(noeud, data.length);
  return plage.getBoundingClientRect().width / echelle;
}

export function ChordLine({ tokens, showChords = true, hideLyrics = false, fontSize, chordEm = 0.9, chord_font, fr_lyric_font, ecartApres = false }: ChordLineProps) {
  const segments = toSegments(tokens, !showChords);
  const hasAnyChord = showChords && segments.some((s) => s.chord !== null);
  // Sans accords, un mot dont rien ne s'affiche n'est pas une unité de coupure.
  const words = toWords(segments).filter((w) => showChords || w.some(({ seg }) => nettoie(seg.lyric)));
  // R3 : des accords sans paroles après la dernière parole forment la « queue » de la ligne.
  let nTexte = words.length;
  if (hasAnyChord) {
    while (nTexte > 0 && words[nTexte - 1].every(({ seg }) => seg.chord !== null && !seg.lyric.trim())) nTexte--;
    if (nTexte === 0) nTexte = words.length;
  }
  const cle = words.map((w) => w.map(({ seg }) => `${seg.chord ?? ""}|${seg.lyric}`).join("¦")).join("§");

  const ligne = useRef<HTMLDivElement>(null);
  const motRefs = useRef<(HTMLElement | null)[]>([]);
  const derniere = useRef("");
  const [coupe, setCoupe] = useState<Coupe>(UNE_RANGEE);
  // Une coupure qui change déplace les hauteurs : le mode louange refait sa pagination (rien au premier rendu).
  const coupePrec = useRef(coupe);
  const copieMesure = useContext(CoupureMesureContext);
  useLayoutEffect(() => {
    if (coupePrec.current === coupe) return;
    coupePrec.current = coupe;
    signalerCoupure(copieMesure);
  }, [coupe, copieMesure]);
  const [polices, setPolices] = useState(0);
  const [propre, setPropre] = useState(0);
  const version = useContext(LargeurCoupureContext);

  // Sans conteneur de chant (Bibliothèque), la ligne observe sa propre largeur.
  useLayoutEffect(() => {
    const el = ligne.current;
    if (version !== null || !el) return;
    let largeur = el.clientWidth;
    const obs = new ResizeObserver(() => {
      if (el.clientWidth === largeur) return;
      largeur = el.clientWidth;
      setPropre((v) => v + 1);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [version]);

  // Les largeurs de mots changent quand la police arrive.
  useLayoutEffect(() => {
    let vivant = true;
    document.fonts?.ready.then(() => vivant && setPolices((v) => v + 1));
    return () => {
      vivant = false;
    };
  }, []);

  // Après chaque rendu : on ne mesure que si la largeur, le corps ou le contenu ont changé (aucune boucle).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sans liste volontairement : l'empreinte ci-dessous évite toute boucle
  useLayoutEffect(() => {
    const el = ligne.current;
    if (!el) return;
    // La réserve de droite (ci-dessous) est comptée dans clientWidth : on la retire pour retrouver la largeur de la colonne.
    const largeur = el.clientWidth - (parseFloat(el.style.paddingRight) || 0);
    if (!largeur) return;
    const em = parseFloat(getComputedStyle(el).fontSize);
    const empreinte = [largeur, em, cle, nTexte, showChords, hideLyrics, version, propre, polices].join("/");
    if (empreinte === derniere.current) return;
    derniere.current = empreinte;
    // R4 retiré avant de mesurer : les largeurs sont celles du texte non resserré.
    el.style.letterSpacing = "";
    el.style.paddingRight = "";
    el.style.marginRight = "";
    const rect = el.getBoundingClientRect();
    const echelle = rect.width / (el.offsetWidth || 1) || 1;
    // Jusqu'au bord du cadre de zoom (ou de la fenêtre) : rien ne doit élargir ni la page ni ce cadre.
    const bord = bordCoupure(el);
    const place = (bord - rect.right) / echelle - 4;
    const unites: Unite[] = words.map((mot, w) => {
      const noeud = motRefs.current[w];
      return {
        largeur: noeud ? noeud.getBoundingClientRect().width / echelle : 0,
        espaceFin: noeud ? espaceFinDe(noeud, echelle) : 0,
        texte: mot.map(({ seg }) => (showChords ? seg.lyric : nettoie(seg.lyric))).join(""),
        queue: w >= nTexte,
      };
    });
    // R5 : retrait de 1 em par rapport au début des paroles de la première rangée (qui n'a pas de retrait).
    const debut = debutParoles(el.querySelector<HTMLElement>("[data-rangee]"), echelle);
    let retrait = em + (debut && debut > 0 ? Math.round(debut * 100) / 100 : 0);
    const choisir = () =>
      choisirCoupure(unites, {
        largeur,
        em,
        retrait,
        debord: Math.max(0, Math.min(DEBORD, place)),
        debordQueue: Math.max(0, Math.min(20, place)),
        resserrer: true,
      });
    let r = choisir();
    // Colonne très étroite : plutôt que déborder, on retombe sur le retrait d'un em.
    if (r.etat === "deborde" && retrait > em) {
      retrait = em;
      r = choisir();
    }
    // Ce qui dépasse dans la marge reste dans le cadre de la ligne (padding compensé par une marge négative) :
    // la ligne ne défile pas, la page ne s'élargit pas.
    const reserve = Math.max(0, Math.min(20, place));
    if (reserve > 0) {
      el.style.paddingRight = `${reserve}px`;
      el.style.marginRight = `-${reserve}px`;
    }
    el.style.letterSpacing = r.interlettrage > 0 ? `-${r.interlettrage.toFixed(3)}px` : "";
    setCoupe((avant) =>
      avant.etat === r.etat && avant.coupures.join() === r.coupures.join() && avant.relache.join() === r.relache.join() && avant.retrait === retrait
        ? avant
        : { coupures: r.coupures, etat: r.etat, relache: r.relache, retrait },
    );
  });

  const rangees: { mots: typeof words; depart: number }[] = [];
  {
    let depart = 0;
    for (const fin of words.length ? [...coupe.coupures, words.length - 1] : []) {
      rangees.push({ mots: words.slice(depart, fin + 1), depart });
      depart = fin + 1;
    }
  }

  return (
    <div
      ref={ligne}
      data-copy-line
      data-coupe={coupe.etat + (coupe.relache.length ? `:${coupe.relache.join(", ")}` : "")}
      className="font-sans leading-normal select-text"
      style={{
        // Sans taille imposée (typographie PDF), taille par défaut de l'écran (globals.css).
        fontSize: fontSize !== undefined ? `${fontSize}rem` : "var(--lyric-size)",
        paddingTop: "0.15em",
        paddingBottom: "0.15em",
        lineHeight: segments.every(s => !s.lyric?.trim()) ? "0" : undefined,
        // Rangée d'accords sans paroles suivie d'une ligne avec paroles : l'écart normal entre deux lignes.
        marginBottom: ecartApres ? "0.5em" : undefined,
      }}
    >
      {rangees.map(({ mots, depart }, r) => {
        // R2 : une rangée sans accord ne réserve pas la bande d'accords.
        const rangeeAvecAccord = showChords && mots.some((w) => w.some(({ seg }) => seg.chord !== null));
        // `span` et non `div` : la copie (copyLyrics.ts) met un retour à la ligne après chaque bloc. R5 : retrait en padding, pas en texte.
        return (
      <span
        key={depart}
        data-rangee
        className="flex flex-nowrap items-end whitespace-nowrap"
        style={r > 0 ? { paddingLeft: coupe.retrait === null ? "1em" : `${coupe.retrait}px` } : undefined}
      >
      {mots.map((word, m) => (
      <span key={word[0].i} ref={(n) => { motRefs.current[depart + m] = n; }} className="inline-flex items-end">
      {word.map(({ seg, i }, k) => {
        const chordLen = seg.chord?.length ?? 0;
        const lyricLen = [...(seg.lyric)].length;
        const minWidth =
          hasAnyChord && chordLen > lyricLen
            ? `${chordLen + 0.5}ch`
            : undefined;
        const suivant = word[k + 1]?.seg.lyric;
        // Deux accords de suite dans un mot (« vi[C][G]vant ») : le premier n'a pas de paroles,
        // le tiret se pose dans sa place, entre la dernière lettre d'avant et la première d'après.
        const avant = word.slice(0, k + 1).map((w) => w.seg.lyric).findLast((l) => l !== "");
        const apres = word.slice(k + 1).map((w) => w.seg.lyric).find((l) => l !== "");
        const tiret =
          showChords && !hideLyrics && seg.chord !== null &&
          (seg.lyric === ""
            ? avant !== undefined && apres !== undefined &&
              LETTRE_LATINE.test([...avant].at(-1) ?? "") && LETTRE_LATINE.test([...apres][0] ?? "")
            : suivant !== undefined &&
              LETTRE_LATINE.test([...seg.lyric].at(-1) ?? "") && LETTRE_LATINE.test([...suivant][0] ?? ""));
        const lyric = nettoie(seg.lyric)
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
                style={{ fontSize: `${chordEm}em`, paddingRight: "0.5em", color: "var(--accord-fr, var(--chord-color))" }}
              >
                <AccordTouchable etiquette={seg.chord} />
              </span>
            ) : 
              (rangeeAvecAccord && <span data-copy-ignore className="leading-[0.7]" style={{ fontSize: `${chordEm}em` }}>&nbsp;</span>)
            }
            {/* `whitespace-pre` toujours : un accord de fin de ligne n'a qu'une espace
                sous lui ; effacée, sa colonne perd sa hauteur et l'accord tombe au
                niveau des paroles (27/09/2026). */}
            {(() => {
              const paroles = (
                <span
                  data-paroles
                  className={`text-foreground whitespace-pre ${fr_lyric_font?.className}`}
                  style={hideLyrics ? { visibility: "hidden" } : undefined}
                >
                  {(showChords ? seg.lyric : lyric) || (seg.chord && showChords ? <span data-copy-ignore>{" "}</span> : "")}
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
      </span>
        );
      })}
    </div>
  );
}
