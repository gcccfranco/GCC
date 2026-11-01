"use client";

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Columns2 } from "lucide-react";
import type { JianpuSheetBlock, SectionBlock } from "@/lib/performance/blocks";

/** Barre du haut du mode louange : titre, tonalité, progression, deux colonnes.
 *  `barreRef` est la ref de mesure lue par PerformanceMode (hauteur des barres). */
export function BarreHaut({
  barreRef,
  showChrome,
  currentSong,
  setlistTitle,
  personalKey,
  songPageCount,
  songPageIdx,
  pageCount,
  currentPage,
  twoColumnsAvailable,
  twoColumns,
  onToggleTwoColumns,
}: {
  barreRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  currentSong: SectionBlock | JianpuSheetBlock | undefined;
  setlistTitle: string;
  personalKey: string | undefined;
  songPageCount: number;
  songPageIdx: number;
  pageCount: number;
  currentPage: number;
  twoColumnsAvailable: boolean;
  twoColumns: boolean;
  onToggleTwoColumns: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={barreRef}
      className={`absolute top-0 left-0 right-0 ${showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] px-4 py-3 flex items-center gap-3`}
      style={{
        paddingTop: "calc(0.75rem + var(--sat, 0px))",
        paddingLeft: "calc(1rem + var(--sal, 0px))",
        paddingRight: "calc(1rem + var(--sar, 0px))",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {currentSong?.songTitle ?? setlistTitle}
        </p>
        {currentSong?.songKey && (
          <p className="text-xs text-muted-foreground font-mono leading-tight mt-0.5">
            {currentSong.songKey}
            {personalKey && (
              <>
                {" · "}
                <span className="font-sans">{t("performance.personalKey", { key: personalKey })}</span>
              </>
            )}
            {currentSong.tempo ? (
              <span data-tempo-barre className="font-sans text-muted-foreground tabular-nums">
                {" · "}♩ {currentSong.tempo}
              </span>
            ) : null}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {/* Points de progression du chant courant */}
        {songPageCount > 1 && songPageCount <= 8 && (
          <div className="flex items-center gap-1" aria-label={t("performance.pageOfSong", { current: songPageIdx + 1, total: songPageCount })}>
            {Array.from({ length: songPageCount }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === songPageIdx ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {pageCount > 0 ? `${currentPage + 1} / ${pageCount}` : "—"}
        </span>
      </div>
      {/* Deux colonnes : à côté du compteur, seulement quand elles sont possibles. */}
      {twoColumnsAvailable && (
        <button
          type="button"
          aria-pressed={twoColumns}
          onClick={onToggleTwoColumns}
          className={`h-11 px-3 shrink-0 flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-colors active:bg-muted ${
            twoColumns ? "bg-secondary text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Columns2 className="h-4 w-4" />
          {t("performance.twoColumns")}
        </button>
      )}
    </div>
  );
}
