"use client";

import Image from "next/image";
import type { JianpuEntry } from "@/lib/jianpu/images";
import { jianpuImageUrl, useJianpuChords } from "@/lib/jianpu/images";
import { semitonesTo, transposeChord } from "@/lib/transpose";

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
};

/** Partition 简谱 en image. Les chiffres, durées, points d'octave et
 *  liaisons viennent du scan d'origine : ils sont justes par construction
 *  et le restent dans toutes les tonalités (le 简谱 est invariant par
 *  transposition). Seuls les accords sont masqués et redessinés.
 *
 *  Le calque est en HTML positionné en pourcentage de l'image, pas en
 *  PNG pré-rendu : 124 chants × 12 tonalités serait intenable, et la
 *  transposition doit rester instantanée. */
export function JianpuSheet({ entry, title, slug, layout = "flow", playedKey }: JianpuSheetProps) {
  const fit = layout === "fit";
  const chords = useJianpuChords(slug);

  // Le décalage se calcule depuis la tonalité IMPRIMÉE sur le PDF, pas
  // depuis celle du .cho : 32 chants ont un 简谱 dans une autre tonalité.
  const semitones =
    chords && playedKey ? semitonesTo(chords.printedKey, playedKey) : 0;
  const overlayOn = Boolean(chords && playedKey);
  const staleChords = Boolean(playedKey && !chords);

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

      {entry.pages.map((page, i) => (
        <div
          key={page.file}
          className={fit ? "relative min-h-0 flex-1" : "relative w-full"}
          // `containerType` permet d'exprimer la taille du texte du calque en
          // cqw : il suit alors l'échelle de l'image sans mesure JS.
          style={{ containerType: "inline-size", ...(fit ? { aspectRatio: `${page.w} / ${page.h}` } : {}) }}
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
            priority={i === 0}
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
              {chords.keyLabel && (
                <span
                  className="absolute flex items-end whitespace-nowrap bg-white text-black dark:bg-black dark:text-neutral-100"
                  style={{
                    left: `${((chords.keyLabel.x - 3) / chords.w) * 100}%`,
                    top: `${((chords.keyLabel.y - 4) / chords.h) * 100}%`,
                    height: `${((chords.keyLabel.h + 6) / chords.h) * 100}%`,
                    minWidth: `${((chords.keyLabel.w + 7) / chords.w) * 100}%`,
                    fontSize: `${(chords.keyLabel.h / chords.w) * 100}cqw`,
                    lineHeight: 1,
                    fontFamily: "Times New Roman, Georgia, serif",
                  }}
                >
                  1={playedKey ?? chords.printedKey}
                </span>
              )}
              {chords.labels.map((l, n) => (
                <span
                  key={n}
                  className="absolute flex items-end whitespace-nowrap bg-white text-black dark:bg-black dark:text-neutral-100"
                  style={{
                    // Le masque déborde de l'amas détecté : le crénage et
                    // l'anticrénelage du glyphe d'origine dépassent de deux
                    // ou trois pixels, et ce qui dépasse reste visible à
                    // côté de l'accord réécrit.
                    left: `${((l.x - 3) / chords.w) * 100}%`,
                    top: `${((l.y - 6) / chords.h) * 100}%`,
                    height: `${((l.h + 8) / chords.h) * 100}%`,
                    minWidth: `${((l.w + 7) / chords.w) * 100}%`,
                    fontSize: `${(chords.labelH / chords.w) * 100}cqw`,
                    lineHeight: 1,
                    fontFamily: "Times New Roman, Georgia, serif",
                  }}
                >
                  {transposeChord(l.c, semitones, playedKey ?? chords.printedKey)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
