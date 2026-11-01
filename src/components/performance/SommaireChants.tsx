"use client";

import { pinyin_font } from "@/components/song/pinyinFont";
import type { SongHeaderBlock } from "@/lib/performance/blocks";

/** Sommaire des chants : panneau latéral du mode louange. Les gestes ne
 *  remontent pas (sinon un toucher tournerait la page). */
export function SommaireChants({
  setlistTitle,
  songEntries,
  pages,
  currentSongEntryIdx,
  goToPage,
  onClose,
}: {
  setlistTitle: string;
  songEntries: { block: SongHeaderBlock; index: number }[];
  pages: number[][];
  currentSongEntryIdx: number;
  goToPage: (p: number, pgCount: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 30 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/30" onClick={() => onClose()} />
      <div
        className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-background border-r border-border shadow-xl overflow-y-auto py-3 animate-in slide-in-from-left duration-200"
        style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", paddingLeft: "var(--sal, 0px)" }}
      >
        <p className="px-4 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
          {setlistTitle}
        </p>
        {songEntries.map(({ block, index }, i) => {
          const page = pages.findIndex((p) => p.includes(index));
          const isCurrent = i === currentSongEntryIdx;
          return (
            <button
              key={block.uid}
              onClick={() => {
                if (page >= 0) goToPage(page, pages.length);
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                isCurrent ? "bg-secondary text-foreground" : "text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                {block.position}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{block.title}</span>
                {block.titlePinyin && (
                  <span className={`block text-[11px] text-muted-foreground truncate ${pinyin_font.className}`}>{block.titlePinyin}</span>
                )}
              </span>
              <span className="text-xs font-mono text-muted-foreground shrink-0">{block.songKey}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
