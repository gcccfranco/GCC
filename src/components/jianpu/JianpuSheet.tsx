"use client";

import Image from "next/image";
import type { JianpuEntry } from "@/lib/jianpu/images";
import { jianpuImageUrl } from "@/lib/jianpu/images";

type JianpuSheetProps = {
  entry: JianpuEntry;
  title: string;
  /** `fit` : la page entière tient dans la hauteur disponible, sans
   *  défilement (Mode Louange sur tablette). `flow` : largeur pleine, la
   *  page défile normalement (page chant). */
  layout?: "fit" | "flow";
  /** Tonalité affichée, si elle diffère de celle du chant. Les chiffres du
   *  简谱 restent justes (ils sont invariants par transposition) mais les
   *  accords imprimés sur le scan, eux, ne suivent pas : il faut le dire. */
  transposedTo?: string | null;
};

/** Partition 简谱 en image. Les chiffres, durées, points d'octave et
 *  liaisons viennent du scan d'origine : ils sont justes par construction
 *  et le restent dans toutes les tonalités (le 简谱 est invariant par
 *  transposition). Seuls les accords et le pinyin sont redessinés. */
export function JianpuSheet({ entry, title, layout = "flow", transposedTo }: JianpuSheetProps) {
  const fit = layout === "fit";

  return (
    <div className={fit ? "flex h-full w-full flex-col items-center justify-center gap-2" : "flex flex-col items-center gap-6"}>
      {transposedTo && (
        <div className="w-full max-w-2xl rounded-lg border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-semibold">Jouer en {transposedTo}.</span>{" "}
          Les chiffres du 简谱 restent justes dans toutes les tonalités, mais les
          accords imprimés sur la partition sont ceux d&apos;origine et ne suivent
          pas la transposition.
        </div>
      )}
      {entry.pages.map((page, i) => (
        <div
          key={page.file}
          className={fit ? "relative min-h-0 flex-1" : "relative w-full"}
          style={fit ? { aspectRatio: `${page.w} / ${page.h}` } : undefined}
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
        </div>
      ))}
    </div>
  );
}
