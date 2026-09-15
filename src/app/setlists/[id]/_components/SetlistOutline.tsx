"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";
import { formatSectionName } from "@/lib/chordpro/parser";
import { itemAst } from "@/lib/chordpro/itemContent";
import { playedSections } from "@/lib/setlist/playedSections";
import { useScrollDirection } from "@/hooks/useScrollDirection";

type Entry = {
  position: number;
  title: string;
  /** Sections consécutives identiques repliées (« Refrain ×2 ») ; `uids` =
   *  occurrences du groupe, retrouvées à l'écran par `data-section-uids`
   *  (en sections uniques, une impression représente plusieurs occurrences). */
  sections: { label: string; uids: string[]; repeat: number }[];
};

const uidsOf = (el: HTMLElement) => (el.dataset.sectionUids ?? "").split(" ").filter(Boolean);

/** Ligne de lecture = bas de la barre d'outils (navbar + barre + marge), en
 *  pixels. Elle ne bouge pas quand les barres s'escamotent, sinon le passage
 *  visé par un clic serait marqué en retard. */
function readingLine(): number {
  const root = getComputedStyle(document.documentElement);
  return (parseFloat(root.getPropertyValue("--nav-h")) || 58) + 5.5 * parseFloat(root.fontSize) + 1;
}

/** Déroulé de la régie : chants et sections dans l'ordre joué, à côté des
 *  partitions, sur ordinateur. Un clic y amène ; la position lue est marquée. */
export function SetlistOutline({ items, contents }: { items: SetlistItem[]; contents: Record<string, SongContent> }) {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<{ position: number; uids: string[] } | null>(null);
  // Les barres du haut s'escamotent au défilement : le sommaire monte avec elles.
  const barsVisible = useScrollDirection();

  const entries = useMemo<Entry[]>(() =>
    [...items]
      .filter((item) => item.type !== "transition")
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const title = item.type === "fusion" && item.fusionSongs
          ? item.fusionSongs.map((fs) => contents[fs.songSlug]?.ast.metadata.title ?? fs.songSlug).join(" / ")
          : itemAst(item, contents[item.songSlug])?.metadata.title ?? item.songSlug;
        const sections: Entry["sections"] = [];
        for (const section of playedSections(item, contents)) {
          const label = formatSectionName(section, t);
          const last = sections[sections.length - 1];
          if (last && last.label === label) {
            last.repeat++;
            last.uids.push(section.uid);
          } else {
            sections.push({ label, uids: [section.uid], repeat: 1 });
          }
        }
        return { position: item.position, title, sections };
      }),
    [items, contents, t],
  );

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = readingLine();
      let found: { position: number; uids: string[] } | null = null;
      for (const el of document.querySelectorAll<HTMLElement>("[data-outline-item]")) {
        if (el.getBoundingClientRect().top > line) break;
        // Vide : aucune section encore atteinte, ou chant lu sur son scan 简谱.
        let uids: string[] = [];
        el.querySelectorAll<HTMLElement>("[data-section]").forEach((s) => {
          if (s.getBoundingClientRect().top <= line) uids = uidsOf(s);
        });
        found = { position: Number(el.dataset.outlineItem), uids };
      }
      setActive(found ?? (entries[0] ? { position: entries[0].position, uids: [] } : null));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [entries]);

  function go(position: number, uid?: string) {
    const item = document.querySelector(`[data-outline-item="${position}"]`);
    const target = (uid && item?.querySelector(`[data-section-uids~="${CSS.escape(uid)}"]`)) || item;
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - (readingLine() - 1),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <nav
      ref={navRef}
      aria-label={t("setlists.detail.outline")}
      className="hidden xl:block fixed w-60 bottom-6 overflow-y-auto print:hidden transition-[top] duration-300"
      // À gauche de la colonne des partitions (max-w-2xl centrée, 42rem), sous
      // la barre d'outils de la setlist — ou en haut quand les barres sont cachées.
      style={{ left: "max(1rem, calc(50% - 21rem - 17rem))", top: barsVisible ? "calc(var(--nav-h) + 5.5rem)" : "1.5rem" }}
    >
      <p className="px-2 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {t("setlists.detail.outline")}
      </p>
      <ol className="space-y-3">
        {entries.map((entry) => {
          const isActive = active?.position === entry.position;
          return (
            <li key={entry.position}>
              <button
                type="button"
                onClick={() => go(entry.position)}
                aria-current={isActive ? "true" : undefined}
                className={`w-full text-left flex items-baseline gap-2 px-2 py-1 rounded-md text-[13px] leading-snug transition-colors hover:bg-muted ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                <span className="shrink-0 w-4 text-right tabular-nums text-[11px] font-bold text-primary">{entry.position}</span>
                <span className="min-w-0">{entry.title}</span>
              </button>
              {entry.sections.length > 0 && (
                <ol className="ml-8 mt-0.5">
                  {entry.sections.map((s, i) => {
                    const here = isActive && s.uids.some((uid) => active.uids.includes(uid));
                    return (
                      <li key={`${s.uids[0]}-${i}`}>
                        <button
                          type="button"
                          onClick={() => go(entry.position, s.uids[0])}
                          className={`w-full text-left px-2 py-0.5 rounded-md text-[12px] transition-colors hover:bg-muted ${
                            here ? "text-primary font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {s.repeat > 1 ? `${s.label} ×${s.repeat}` : s.label}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
