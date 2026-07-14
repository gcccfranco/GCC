import { useState } from "react";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import Link from "next/link";
import { Link2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import type { SectionSummary } from "@/types/song";

/** Palette rotative pour relier chaque transition à son occurrence dans le fil :
 *  la section colorée et sa note en dessous partagent la même couleur. */
const TRANSITION_COLORS = [
  "text-amber-600 dark:text-amber-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-rose-600 dark:text-rose-400",
  "text-sky-600 dark:text-sky-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
];

/** Noms de sections affichables d'un chant, en respectant une éventuelle
 *  structure réorganisée (structureOverride keyé par uid/id de section). */
function sectionNamesFor(
  allSections: SectionSummary[],
  structureOverride: string[] | null | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string
): string[] {
  if (structureOverride && structureOverride.length > 0) {
    return structureOverride.map((ov) => {
      const baseId = ov.replace(/-\d+$/, "");
      const s = allSections.find((sec) => sec.uid === ov || sec.id === ov || sec.id === baseId);
      if (s) return formatSectionName(s, t);
      const type = ov.replace(/(-\d+)+$/, "");
      return t(`songs.sections.${type}`, { defaultValue: type });
    });
  }
  return allSections.map((s) => formatSectionName(s, t));
}

export function ListView({
  items,
  songsMap,
}: {
  items: SetlistItem[];
  songsMap: Record<string, SongIndexEntry>;
}) {
  const { t } = useTranslation();
  return (
    <ol className="space-y-3">
      {(() => {
        const sorted = [...items].sort((a, b) => a.position - b.position);
        return sorted.map((item, idx) => {
        // ── Transition item ── (non numérotée)
        if (item.type === "transition") {
          return <TransitionListItem key={`transition-${idx}`} item={item} />;
        }
        // Numéro = nombre de chants (transitions exclues) jusqu'ici inclus.
        const num = sorted.slice(0, idx + 1).filter((x) => x.type !== "transition").length;

        // ── Fusion item ──
        if (item.type === "fusion" && item.fusionSongs) {
          return (
            <li key={`fusion-${idx}`} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">
                {num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-sm text-foreground">
                    {item.fusionSongs
                      .map((fs) => songsMap[fs.songSlug]?.title ?? fs.songSlug)
                      .join(" / ")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-medium px-1.5 py-0.5 bg-primary/10 rounded">
                    {t("setlists.form.fusionLabel")}
                  </span>
                </div>
                {item.mixedStructure && item.mixedStructure.length > 0 ? (
                  // Structure mélangée : sections dans l'ordre joué, regroupées par chant
                  // (sinon on ne sait pas de quel chant vient chaque « Couplet »).
                  <div className="mt-1 space-y-1">
                    {(() => {
                      const runs: { slug: string; title: string; names: { name: string; color?: string }[] }[] = [];
                      const transitions: { name: string; text: string; color: string }[] = [];
                      let tci = 0;
                      for (const ms of item.mixedStructure) {
                        const song = songsMap[ms.songSlug];
                        const sec = song?.sections?.find((s) => s.id === ms.sectionId || s.uid === ms.sectionId);
                        const name = sec ? formatSectionName(sec, t) : ms.sectionId;
                        const title = song?.title ?? ms.songSlug;
                        const color = ms.transition
                          ? TRANSITION_COLORS[tci++ % TRANSITION_COLORS.length]
                          : undefined;
                        const entry = { name, color };
                        const last = runs[runs.length - 1];
                        if (last && last.slug === ms.songSlug) last.names.push(entry);
                        else runs.push({ slug: ms.songSlug, title, names: [entry] });
                        if (ms.transition) transitions.push({ name, text: ms.transition, color: color! });
                      }
                      return (
                        <>
                          <div className="space-y-0.5">
                            {runs.map((run, i) => (
                              <p key={i} className="text-[11px] leading-tight">
                                <span className="font-medium text-muted-foreground/90">{run.title}</span>
                                <span className="text-muted-foreground/40"> · </span>
                                <span className="text-muted-foreground/60">
                                  {run.names.map((n, j) => (
                                    <span key={j}>
                                      {j > 0 && " · "}
                                      <span className={n.color ? `${n.color} font-medium` : undefined}>
                                        {n.name}
                                      </span>
                                    </span>
                                  ))}
                                </span>
                              </p>
                            ))}
                          </div>
                          {transitions.length > 0 && (
                            <ul className="space-y-0.5">
                              {transitions.map((tr, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground/60 italic leading-tight flex gap-1">
                                  <span className={`shrink-0 ${tr.color}`}>↳ {tr.name} :</span>
                                  <span className="whitespace-pre-wrap">{tr.text}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // Chaque chant fusionné : titre + tonalité + sa structure
                  <div className="mt-1 space-y-1">
                    {item.fusionSongs.map((fs) => {
                      const song = songsMap[fs.songSlug];
                      const displayKey = fs.keyOverride ?? song?.originalKey ?? "?";
                      const transposed = !!fs.keyOverride && fs.keyOverride !== song?.originalKey;
                      const names = song?.sections ? sectionNamesFor(song.sections, fs.structureOverride, t) : [];
                      return (
                        <div key={fs.songSlug}>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                            <Link href={`/songs/${fs.songSlug}`} className="hover:text-primary hover:underline">
                              {song?.title ?? fs.songSlug}
                            </Link>
                            <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${
                              transposed
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-foreground"
                            }`}>
                              {displayKey}
                            </span>
                          </div>
                          {names.length > 0 && (
                            <p className="text-[11px] text-muted-foreground/60 leading-tight pl-1 mt-0.5">
                              {names.join(" · ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        }

        // ── Regular song item ──
        const song = songsMap[item.songSlug];
        const displayKey = item.keyOverride ?? song?.originalKey ?? "?";
        const transposed = !!item.keyOverride && item.keyOverride !== song?.originalKey;
        return (
          <li key={`${item.songSlug}-${idx}`} className="flex gap-3 items-start">
            <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">
              {num}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Link href={{
                  pathname:`/songs/${item.songSlug}`,
                  query: {
                    ...(item.structureOverride && {
                      structure: JSON.stringify(item.structureOverride),
                    }),
                    ...(item.sectionNotes && {
                      sectionNotes: JSON.stringify(item.sectionNotes),
                    }),
                    ...(item.sectionNuances && Object.keys(item.sectionNuances).length > 0 && {
                      sectionNuances: JSON.stringify(item.sectionNuances),
                    }),
                    ...(item.keyOverride && {
                      key: JSON.stringify(item.keyOverride)
                    })
                  },
                }}
                  className="font-semibold text-sm text-foreground hover:text-primary">
                  {song?.title ?? item.songSlug}
                </Link>
                {song?.titlePinyin && (
                  <span className="text-xs text-muted-foreground">{song.titlePinyin}</span>
                )}
              </div>
              {song?.artist && <p className="text-xs text-muted-foreground">{song.artist}</p>}
              {song?.sections && song.sections.length > 0 && (() => {
                const allSections = song.sections!;
                const st = item.sectionTransitions ?? {};
                // Chaque section → nom affichable + transition interne éventuelle.
                const entries: { name: string; transition?: string }[] = item.structureOverride
                  ? item.structureOverride.map((ov) => {
                      const baseId = ov.replace(/-\d+$/, "");
                      const s = allSections.find((sec) => sec.uid === ov || sec.id === ov || sec.id === baseId);
                      if (s) return { name: formatSectionName(s, t), transition: st[ov] ?? st[s.id] };
                      // Section non résolue (ex. copie « Mode Adapter » absente de
                      // l'index) : traduire le type plutôt que montrer l'uid brut.
                      const type = ov.replace(/(-\d+)+$/, "");
                      return { name: t(`songs.sections.${type}`, { defaultValue: type }), transition: st[ov] };
                    })
                  : allSections.map((s, i) => {
                      // La transition est stockée sous la clé `${id}-${index}` (cf.
                      // makeDefaultSections/buildSetlistItems) = l'uid de section de l'AST.
                      // L'index JSON n'expose pas ce `uid` → on le reconstruit à partir de l'ordre.
                      return { name: formatSectionName(s, t), transition: st[`${s.id}-${i}`] ?? st[s.id] };
                    });
                // Une couleur distincte par transition, dans l'ordre du fil.
                let tci = 0;
                const colored = entries.map((e) =>
                  e.transition
                    ? { ...e, color: TRANSITION_COLORS[tci++ % TRANSITION_COLORS.length] }
                    : { ...e, color: undefined as string | undefined }
                );
                const transitions = colored.filter((e) => e.transition);
                return (
                  <>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">
                      {colored.map((e, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-muted-foreground/40"> · </span>}
                          <span className={e.color ? `${e.color} font-medium` : undefined}>
                            {e.name}
                          </span>
                        </span>
                      ))}
                    </p>
                    {transitions.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {transitions.map((e, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground/60 italic leading-tight flex gap-1">
                            <span className={`shrink-0 ${e.color}`}>↳ {e.name} :</span>
                            <span className="whitespace-pre-wrap">{e.transition}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                );
              })()}
              {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
            </div>
            <div className="shrink-0 text-right">
              <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                transposed ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-foreground"
              }`}>
                {displayKey}
              </span>
              {song?.language === "zh" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("common.languages.zh")}</p>
              )}
            </div>
          </li>
        );
        });
      })()}
    </ol>
  );
}

function TransitionListItem({ item }: { item: SetlistItem }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  if (!item.transitionText) return null;
  return (
    <li className="flex gap-3 items-start">
      <span className="shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mt-0.5">
        <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
      </span>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide hover:opacity-80 transition-opacity"
        >
          {t("setlists.form.transitionLabel", { defaultValue: "Transition" })}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {open && (
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{item.transitionText}</p>
        )}
      </div>
    </li>
  );
}
