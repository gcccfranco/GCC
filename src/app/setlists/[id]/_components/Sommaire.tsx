"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";
import type { SongContent } from "@/lib/api/songs";
import { KeyPill } from "@/components/ui/key-pill";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { playedSections } from "@/lib/setlist/playedSections";
import { useJianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";

/** Sommaire de la setlist en deux volets (lot U5, docs/spec-deux-volets.md, Q6) :
 *  par chant, numéro, titre, tonalité et « orig. », une pastille par étape jouée,
 *  notes, « Partition 简谱 ». Toucher un chant ou une pastille y amène ; le chant lu
 *  est en encre, sa pastille marquée. « Copier toutes les paroles » en pied. La
 *  page suit la lecture et amène la vue (`current`, `uidsLus`, `onGo`). */
export function Sommaire({
  items,
  contents,
  songsMap,
  jianpuPref,
  current,
  uidsLus,
  onGo,
  copier,
  className,
  style,
}: {
  /** Items tels que joués pour moi (ma structure comprise) : `stageItems`. */
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  songsMap: Record<string, SongIndexEntry>;
  jianpuPref: JianpuPref;
  /** Position du chant lu (celle de `data-outline-item`). */
  current: number;
  /** Occurrences de la section lue dans le chant lu (`data-section-uids`). */
  uidsLus: string[];
  onGo: (position: number, uid?: string) => void;
  /** Texte de « Copier toutes les paroles » ; absent : le bouton n'est pas proposé. */
  copier?: () => string;
  className?: string;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const manifest = useJianpuManifest();
  const sorted = [...items].sort((a, b) => a.position - b.position);
  // Numéro = nombre de chants jusqu'ici inclus (les transitions n'en sont pas), comme la liste.
  const chants = sorted.filter((item) => item.type !== "transition");

  return (
    <nav aria-label={t("setlists.detail.sommaire")} className={`flex flex-col ${className ?? ""}`} style={style}>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-5">
        <p className="px-2 pb-2 text-[13px] font-semibold text-muted-foreground">{t("setlists.detail.sommaire")}</p>
        <ol className="space-y-1">
          {chants.map((item, i) => {
            const num = i + 1;
            const lu = item.position === current;
            const fusion = item.type === "fusion" && !!item.fusionSongs;
            const song = songsMap[item.songSlug];
            const titre = fusion
              ? item.fusionSongs!.map((fs) => songsMap[fs.songSlug]?.title ?? fs.songSlug).join(" / ")
              : (song?.title ?? item.songSlug);
            const tonalite = item.keyOverride ?? song?.originalKey;
            const transpose = !!item.keyOverride && item.keyOverride !== song?.originalKey;
            const etapes = playedSections(item, contents);
            const surScan = !fusion && sheetEnabled(jianpuPref, item.jianpuSheet) && !!manifest?.[item.songSlug];
            return (
              <li
                key={item.position}
                data-sommaire={item.position}
                className={`relative rounded-xl px-3 py-2.5 transition-colors ${
                  lu ? "bg-foreground text-background" : "hover:bg-muted/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-4 shrink-0 pt-px text-right text-[13px] font-bold tabular-nums ${lu ? "" : "text-muted-foreground"}`}>
                    {num}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Le bouton couvre toute la carte (sauf les pastilles, au-dessus de lui). */}
                    <button
                      type="button"
                      data-sommaire-chant
                      aria-current={lu ? "true" : undefined}
                      onClick={() => onGo(item.position)}
                      className="block w-full text-left text-[15px] font-semibold leading-snug before:absolute before:inset-0 before:rounded-xl focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
                    >
                      {titre}
                    </button>
                    {etapes.length > 0 && (
                      <div className="relative mt-1.5 flex flex-wrap gap-1">
                        {etapes.map((s, i) => {
                          const ici = lu && uidsLus.includes(s.uid);
                          return (
                            <button
                              key={`${s.uid}-${i}`}
                              type="button"
                              data-pastille
                              aria-current={ici ? "true" : undefined}
                              onClick={() => onGo(item.position, s.uid)}
                              className={`h-[18px] min-w-[18px] rounded-full px-1.5 text-[10.5px] font-semibold leading-[18px] transition-colors ${
                                ici
                                  ? "bg-background text-foreground"
                                  : lu
                                    ? "bg-background/15 text-background/90 hover:bg-background/25"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {abbreviateSection(s)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.notes && (
                      <p className={`mt-1.5 text-[12.5px] leading-snug ${lu ? "text-background/80" : "text-muted-foreground"}`}>{item.notes}</p>
                    )}
                    {surScan && (
                      <p className={`mt-1 text-[12.5px] ${lu ? "text-background/80" : "text-muted-foreground"}`}>{t("performance.jianpuSheet")}</p>
                    )}
                  </div>
                  {!fusion && tonalite && (
                    <KeyPill
                      tonalite={tonalite}
                      langue={song?.language === "zh" ? "zh" : "fr"}
                      origine={transpose ? song?.originalKey : undefined}
                      // Sur la carte en encre : la pastille garde le fond de la page, lisible
                      // (`!` : son fond est posé en ligne).
                      className={lu ? "[&>[data-testid=tonalite]]:!bg-background [&>[data-testid=tonalite-origine]]:!text-background/70" : undefined}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {copier && <CopierTout copier={copier} />}
    </nav>
  );
}

/** « Copier toutes les paroles » (question 6), en pied du sommaire. */
function CopierTout({ copier }: { copier: () => string }) {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  const minuteur = useRef(0);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);
  return (
    <div className="shrink-0 border-t border-border px-5 py-3">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(copier());
          } catch {
            return; // presse-papiers refusé : rien n'est annoncé
          }
          setCopie(true);
          window.clearTimeout(minuteur.current);
          minuteur.current = window.setTimeout(() => setCopie(false), 2000);
        }}
        className="flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {copie ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copie ? t("setlists.detail.copyLyricsDone") : t("setlists.detail.copyAllLyrics")}
      </button>
    </div>
  );
}
