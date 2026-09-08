"use client";

import Image from "next/image";
import type { JianpuEntry } from "@/lib/jianpu/images";
import { jianpuImageUrl, useJianpuChords } from "@/lib/jianpu/images";
import { getTransposedKey, semitonesTo, transposeLabel } from "@/lib/transpose";

/** Les étiquettes du scan sont mesurées en **hauteur d'encre** (le haut d'une
 *  capitale au-dessus de la ligne de base), pas en corps de fonte. Passer
 *  `labelH` tel quel en `font-size` donnait donc des accords réécrits ~30 %
 *  plus petits que ceux gravés à côté. On divise par la hauteur de capitale
 *  de la fonte pour retrouver la taille imprimée. */
const CAP_HEIGHT = 0.714;
/** Part du corps sous la ligne de base dans la boîte de ligne à
 *  `line-height: 1` (ascendante 0,952 / descendante 0,213 → demi-interligne
 *  négatif). Le texte est collé en bas de sa boîte : c'est donc cette valeur
 *  qui pose la ligne de base. */
const LINE_BOX_DROP = 0.13;
/** Descendante réelle de la fonte. Le fond blanc doit descendre jusque-là,
 *  sinon la jambe du « j » de `Dmaj9` (ou une parenthèse) dépasse du masque et
 *  retombe sur la partition. L'écart avec `LINE_BOX_DROP` est repris en marge
 *  basse, pour que le fond descende sans entraîner le texte avec lui. */
const DESCENDER = 0.22;
/** Les accords gravés sont en **sans-serif grasse** sur 82 des 87 pages dont
 *  la fonte a été identifiée (verdana-bold, helvetica-bold, helvetica-neue,
 *  din-bold ; cinq pages seulement en times). Le calque les réécrivait en
 *  Times New Roman — la fonte la plus éloignée du corpus.
 *
 *  Les familles chinoises ferment la pile : depuis que le calque réécrit
 *  l'étiquette **entière** (`transposeLabel`), un accord peut porter un
 *  hanzi — « F或F/Eb », « Gm代替Bb ». Sans elles, le repli dépend du système
 *  et le hanzi peut tomber dans une fonte à empattements au milieu d'une
 *  linéale. */
const CHORD_FONT =
  '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
/** Le libellé de tonalité, lui, est gravé en romaine sur presque toute la
 *  collection — c'est une mention d'appareil, pas un accord. */
const KEY_FONT = '"Times New Roman", Georgia, serif';
/** Sous ce facteur, un accord devient moins lisible qu'il n'est gênant : on
 *  préfère alors le laisser déborder de la place mesurée. */
const MIN_SHRINK = 0.8;

/** Largeur du texte pour un corps de 1 px, mesurée dans un canvas. On ne
 *  mesure pas dans le DOM : tout le calque est exprimé en pixels image puis
 *  mis à l'échelle en `cqw`, donc une largeur relative suffit et ne dépend
 *  pas de la taille à laquelle la page est affichée. */
const chordWidths = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

function unitWidth(text: string, font: string): number {
  const cle = `${font}|${text}`;
  const known = chordWidths.get(cle);
  if (known !== undefined) return known;
  if (typeof document === "undefined") return 0;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = `700 100px ${font}`;
  const w = measureCtx.measureText(text).width / 100;
  chordWidths.set(cle, w);
  return w;
}

/** Corps réduit pour que l'étiquette tienne dans la place que la gravure lui
 *  laisse (`sp`). Sans `sp` — donnée d'avant la mesure — rien ne change. */
function fitFont(
  text: string,
  fontPx: number,
  sp: number | undefined,
  font = CHORD_FONT,
  plancher = MIN_SHRINK
): number {
  if (!sp) return fontPx;
  const unit = unitWidth(text, font);
  if (!unit || unit * fontPx <= sp) return fontPx;
  return Math.max(fontPx * plancher, sp / unit);
}

type JianpuSheetProps = {
  entry: JianpuEntry;
  title: string;
  /** Slug du chant — sert à retrouver les coordonnées du calque d'accords. */
  slug?: string;
  /** `fit` : la page entière tient dans la hauteur disponible, sans
   *  défilement (Mode Louange sur tablette). `flow` : largeur pleine, la
   *  page défile normalement (page chant). */
  layout?: "fit" | "flow";
  /** Tonalité à jouer. Si le chant a un calque, les accords sont réécrits
   *  dedans ; sinon un bandeau prévient que ceux du scan ne suivent pas. */
  playedKey?: string | null;
  /** Capo (frets) : les accords du calque passent en positions, comme les
   *  grilles ChordPro du Mode Louange. Le « 1=X » et la tonalité du titre
   *  décrivent le son produit et ne bougent donc pas. */
  capo?: number;
  /** N'afficher que cette page du scan. Le Mode Louange donne une page
   *  d'écran par page de partition ; ailleurs, tout le scan défile. */
  pageIndex?: number;
};

/** Partition 简谱 en image. Les chiffres, durées, points d'octave et
 *  liaisons viennent du scan d'origine : ils sont justes par construction
 *  et le restent dans toutes les tonalités (le 简谱 est invariant par
 *  transposition). Seuls les accords sont masqués et redessinés.
 *
 *  Le calque est en HTML positionné en pourcentage de l'image, pas en
 *  PNG pré-rendu : 124 chants × 12 tonalités serait intenable, et la
 *  transposition doit rester instantanée. */
export function JianpuSheet({ entry, title, slug, layout = "flow", playedKey, capo = 0, pageIndex }: JianpuSheetProps) {
  const fit = layout === "fit";
  const chords = useJianpuChords(slug);
  // Une seule page en Mode Louange, tout le scan ailleurs. L'index d'origine
  // est conservé : le calque ne concerne que la première page du scan.
  const shownPages = pageIndex == null ? entry.pages : entry.pages.slice(pageIndex, pageIndex + 1);
  const firstShown = pageIndex ?? 0;

  // Le décalage se calcule depuis la tonalité IMPRIMÉE sur le PDF, pas
  // depuis celle du .cho : 32 chants ont un 简谱 dans une autre tonalité.
  const semitones =
    chords && playedKey ? semitonesTo(chords.printedKey, playedKey) : 0;
  // Capo : les accords descendent d'autant de demi-tons et s'orthographient
  // dans la tonalité des positions, pas dans celle qui sonne.
  const chordSemitones = semitones - capo;
  const chordKey = getTransposedKey(playedKey ?? chords?.printedKey ?? "C", -capo);
  const chordFontPx = chords ? chords.labelH / CAP_HEIGHT : 0;
  const overlayOn = Boolean(chords && playedKey);
  const staleChords = Boolean(playedKey && !chords);
  // Calque partiel : une partie des accords n'a pas été relevée et reste
  // donc dans la tonalité imprimée. On le dit, et on met en évidence ceux
  // qui ont été réécrits — montrer où l'on est sûr vaut mieux que laisser
  // croire que toute la page est convertie.
  const partial = Boolean(overlayOn && chords?.complete === false);

  return (
    <div className={fit ? "flex h-full w-full flex-col items-center justify-center gap-2" : "flex flex-col items-center gap-6"}>
      {staleChords && (
        <div className="w-full max-w-2xl rounded-lg border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-semibold">Jouer en {playedKey}.</span>{" "}
          Les chiffres du 简谱 restent justes dans toutes les tonalités, mais les
          accords imprimés sur cette partition sont ceux d&apos;origine et ne
          suivent pas la transposition.
        </div>
      )}

      {partial && (
        <div className="w-full max-w-2xl rounded-lg border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-semibold">Jouer en {playedKey}.</span>{" "}
          Seuls les accords{" "}
          <span className="font-semibold text-blue-700 dark:text-blue-400">en bleu</span>{" "}
          ont été transposés. Les autres sont ceux d&apos;origine
          {chords?.printedKey ? ` (${chords.printedKey})` : ""}
          {chords?.keyLabel ? "" : `, comme l’indication « 1=${chords?.printedKey} » en haut de page`}{" "}
          et ne suivent pas la transposition — les chiffres, eux, restent justes.
        </div>
      )}

      {/* `fit` : la zone restante devient un conteneur de taille, ce qui permet
          de borner la page en hauteur (100cqh) autant qu'en largeur (100%).
          Borner la seule hauteur suffisait pour un scan portrait, mais un scan
          large débordait alors des deux côtés. */}
      <div
        className={fit ? "flex min-h-0 w-full flex-1 items-center justify-center" : "contents"}
        style={fit ? { containerType: "size" } : undefined}
      >
      {shownPages.map((page, n) => {
        const i = firstShown + n;
        return (
        <div
          key={page.file}
          data-jianpu-page={i}
          className={fit ? "relative mx-auto" : "relative w-full"}
          // `containerType: inline-size` permet d'exprimer la taille du texte du
          // calque en cqw : il suit l'échelle de l'image sans mesure JS.
          style={{
            containerType: "inline-size",
            ...(fit
              ? {
                  aspectRatio: `${page.w} / ${page.h}`,
                  width: `min(100%, calc(100cqh * ${page.w} / ${page.h}))`,
                }
              : {}),
          }}
        >
          <Image
            src={jianpuImageUrl(page.file)}
            alt={
              entry.pages.length > 1
                ? `${title} — 简谱 (page ${i + 1}/${entry.pages.length})`
                : `${title} — 简谱`
            }
            width={page.w}
            height={page.h}
            priority={n === 0}
            className={
              fit
                ? "h-full w-full object-contain dark:invert dark:hue-rotate-180"
                : "h-auto w-full dark:invert dark:hue-rotate-180"
            }
            sizes={fit ? "100vw" : "(min-width: 1024px) 900px, 100vw"}
          />

          {/* Calque : masque l'accord d'origine, réécrit le transposé au
              même endroit. Tout est en % pour suivre l'échelle de l'image.

              Le masque est `bg-black` en thème sombre, pas `bg-neutral-900` :
              le scan est retourné par `dark:invert`, donc son papier blanc
              devient du noir **pur**. Toute autre teinte fait apparaître un
              pavé gris autour de chaque accord — invisible sur les rendus de
              contrôle en Python, qui travaillent sur l'image d'origine. */}
          {overlayOn && i === 0 && chords && (
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {chords.keyLabel && (() => {
                const kl = chords.keyLabel!;
                const keyShown = kl.c
                  ? transposeLabel(kl.c, chordSemitones, chordKey)
                  : `1=${playedKey ?? chords.printedKey}`;
                // `h` est la hauteur de **capitale** du libellé gravé, pas un
                // corps : le prendre pour tel rendait le cadre 0,71× trop
                // petit sur les 87 pages qui en portent un — la leçon de
                // l'itération 38 (« le corps se mesure, il ne se devine
                // pas ») que le cadre n'avait jamais reçue. Rendu au bon
                // corps il heurte le chiffrage voisin sur 3 pages, d'où le
                // même rétrécissement que les étiquettes, mesuré dans **sa**
                // fonte : celle des accords, plus large, le réduirait pour
                // rien.
                // Sans plancher, contrairement aux accords : le cadre est
                // seul en haut de page, et le rétrécir reste lisible, alors
                // que le chiffrage « 4/4 » qu'il efface en débordant est une
                // information perdue — c'est le défaut qu'on avait dû
                // réparer sur 齐来赞美 (itération 35).
                const keyFontPx = fitFont(keyShown, kl.h / CAP_HEIGHT, kl.sp, KEY_FONT, 0);
                return (
                <span
                  // Le cadre de tonalité porte un fond opaque comme les
                  // étiquettes, mais il n'avait pas leur marqueur : ni le
                  // balayage géométrique ni les cadres rouges de la planche
                  // ne le voyaient (itération 41). Marqueur distinct, pour
                  // que le banc de transposition, lui, garde son périmètre.
                  data-jianpu-keylabel={kl.c ?? ""}
                  className="absolute flex items-end whitespace-nowrap bg-white text-black dark:bg-black dark:text-neutral-100"
                  style={{
                    left: `${((kl.x - 3) / chords.w) * 100}%`,
                    top: `${((kl.y - 4) / chords.h) * 100}%`,
                    height: `${((kl.h + 6) / chords.h) * 100}%`,
                    minWidth: `${((kl.w + 7) / chords.w) * 100}%`,
                    fontSize: `${(keyFontPx / chords.w) * 100}cqw`,
                    lineHeight: 1,
                    fontFamily: KEY_FONT,
                  }}
                >
                  {keyShown}
                </span>
                );
              })()}
              {chords.titleKey && (
                <span
                  className="absolute flex items-end whitespace-nowrap bg-white font-bold text-black dark:bg-black dark:text-neutral-100"
                  style={{
                    left: `${((chords.titleKey.x - 3) / chords.w) * 100}%`,
                    top: `${((chords.titleKey.y - 4) / chords.h) * 100}%`,
                    height: `${((chords.titleKey.h + 7) / chords.h) * 100}%`,
                    minWidth: `${((chords.titleKey.w + 7) / chords.w) * 100}%`,
                    fontSize: `${((chords.titleKey.h * 0.78) / chords.w) * 100}cqw`,
                    lineHeight: 1,
                  }}
                >
                  （{playedKey ?? chords.printedKey}调）
                </span>
              )}
              {chords.labels.map((l, n) => {
                // `fh` : le corps propre à l'étiquette, quand elle n'est pas
                // gravée au corps de la page (ligne d'intro, mention entre
                // parenthèses). Absent, c'est `labelH` — donc rien ne bouge
                // pour les étiquettes déjà publiées.
                const shown = transposeLabel(l.c, chordSemitones, chordKey);
                const fontPx = fitFont(shown, l.fh ? l.fh / CAP_HEIGHT : chordFontPx, l.sp);
                return (
                <span
                  key={n}
                  data-jianpu-label={l.c}
                  className={
                    "absolute flex items-end whitespace-nowrap bg-white dark:bg-black " +
                    (partial
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-black dark:text-neutral-100")
                  }
                  style={{
                    // Le masque déborde de l'amas détecté : le crénage et
                    // l'anticrénelage du glyphe d'origine dépassent de deux
                    // ou trois pixels, et ce qui dépasse reste visible à
                    // côté de l'accord réécrit.
                    left: `${((l.x - 3) / chords.w) * 100}%`,
                    top: `${((l.y - 6) / chords.h) * 100}%`,
                    // Le fond blanc descend de la descendante entière ; la
                    // marge basse rend au texte les 0,09 em de trop, pour que
                    // la ligne de base retombe sur celle du texte gravé.
                    height: `${((l.h + 6 + DESCENDER * fontPx) / chords.h) * 100}%`,
                    paddingBottom: `${DESCENDER - LINE_BOX_DROP}em`,
                    minWidth: `${((l.w + 7) / chords.w) * 100}%`,
                    fontSize: `${(fontPx / chords.w) * 100}cqw`,
                    fontWeight: 700,
                    lineHeight: 1,
                    fontFamily: CHORD_FONT,
                  }}
                >
                  {shown}
                </span>
                );
              })}
            </div>
          )}
        </div>
        );
      })}
      </div>
    </div>
  );
}
