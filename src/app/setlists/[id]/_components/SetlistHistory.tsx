"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowUpDown, ChevronDown, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getSetlistHistory, type HistoryEntry } from "@/lib/firebase/setlistHistory";
import { compareSequences, type HistoryChange, type SectionNote, type SequenceMark } from "@/lib/setlist/history";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { SECTION_PALETTE_KEY } from "@/components/song/SongView";
import type { SongIndexEntry } from "@/types/song";

// Historique des modifications (docs/spec-setlist.md, lot 2) : une ligne sous
// le titre de la setlist, qui ouvre une feuille — la dernière entrée, puis les
// 5 dernières, puis toutes. Consultation seulement.

const FIRST_READ = 6; // assez pour savoir s'il y a plus de 5 entrées

function relativeTime(at: Date, language: string): string {
  const seconds = Math.round((at.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000], ["month", 2_592_000], ["day", 86_400], ["hour", 3_600], ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** « 2026-09-21|soir » → « 21/09 soir ». */
function shortDate(value: string, t: TFunction): string {
  const [date, moment] = value.split("|");
  const [, mm, dd] = (date ?? "").split("-");
  const day = dd && mm ? `${dd}/${mm}` : date || "—";
  return moment ? `${day} ${t(`setlists.history.moment.${moment}`, { defaultValue: moment })}` : day;
}

function describeChange(change: HistoryChange, t: TFunction, songsMap: Record<string, SongIndexEntry>): string {
  const title = (slug: string) => songsMap[slug]?.title ?? slug;
  const keyName = (slug: string, key: string | null) => key ?? songsMap[slug]?.originalKey ?? "—";
  const p = "setlists.history.";
  switch (change.kind) {
    case "created":
    case "songs":
    case "notes":
    case "order":
    case "transitions":
      return t(p + change.kind);
    case "title":
    case "leader":
    case "category":
      return t(p + change.kind, {
        from: change.kind === "category" ? t("categories." + change.from, { defaultValue: change.from }) : change.from || "—",
        to: change.kind === "category" ? t("categories." + change.to, { defaultValue: change.to }) : change.to || "—",
      });
    case "date":
      return t(p + "date", { from: shortDate(change.from, t), to: shortDate(change.to, t) });
    case "visibility":
      return t(p + (change.to ? "private" : "shared"));
    case "songAdded":
    case "songRemoved":
      return t(p + change.kind, { song: title(change.song) });
    case "fused":
    case "unfused":
      return t(p + change.kind, { songs: change.songs.map(title).join(" + ") });
    case "fusionStructure":
      return t(p + "structure", { song: change.songs.map(title).join(" + ") });
    case "key":
      return t(p + "key", { song: title(change.song), from: keyName(change.song, change.from), to: keyName(change.song, change.to) });
    case "jianpuSheet":
      return t(p + (change.to ? "jianpuOn" : "jianpuOff"), { song: title(change.song) });
    default:
      // Réglage d'un chant, ou de l'ordre mélangé d'une fusion (« A + B »).
      return t(p + change.kind, { song: "songs" in change ? change.songs.map(title).join(" + ") : title(change.song) });
  }
}

/** Sorte de section d'après son abréviation, quand le chant ne la connaît pas
 *  (sections d'un chant adapté). */
const TYPE_OF_ABBREVIATION: Record<string, string> = {
  I: "intro", C: "verse", Pr: "prechorus", R: "chorus", Po: "postchorus", P: "bridge", F: "outro",
};

/** Avant : seul le retiré est marqué ; après : l'ajouté et le déplacé. */
function shownMark(mark: SequenceMark, side: "before" | "after"): SequenceMark {
  if (side === "before") return mark === "removed" ? mark : "same";
  return mark === "removed" ? "same" : mark;
}

/** Pastille d'une section, aux couleurs du bandeau ; « 1 R » = section R du 1er chant d'une fusion. */
function SectionPill({ label, songs, mark, side, songsMap }: {
  label: string;
  songs: string[];
  mark: SequenceMark;
  side: "before" | "after";
  songsMap: Record<string, SongIndexEntry>;
}) {
  const { t } = useTranslation();
  const [, number, abbr] = label.match(/^(?:(\d+) )?(.*)$/) ?? [];
  const slug = songs[number ? Number(number) - 1 : 0];
  const section = songsMap[slug]?.sections?.find((s) => abbreviateSection(s) === abbr);
  const type = section?.type ?? TYPE_OF_ABBREVIATION[abbr.replace(/\d+$/, "")] ?? "other";
  const key = SECTION_PALETTE_KEY[type] ?? "other";
  const shown = shownMark(mark, side);
  return (
    <li
      data-mark={shown}
      className={`relative inline-flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full px-2 text-[13px] font-bold leading-none ${
        shown === "removed" ? "opacity-60" : ""
      } ${shown === "added" ? "ring-2 ring-emerald-600 ring-offset-1 ring-offset-background dark:ring-emerald-400" : ""}`}
      style={{ background: `var(--sec-${key}-tint)`, color: `var(--sec-${key})` }}
    >
      {/* Barré en biais sur toute la pastille : une lettre seule barrée se lit mal (« P »). */}
      {shown === "removed" && (
        <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 h-[1.5px] -translate-y-1/2 -rotate-[20deg] rounded-full bg-current" />
      )}
      {shown === "moved" && <ArrowUpDown className="h-3 w-3" aria-hidden />}
      {number && <span className="text-[10px] font-semibold opacity-75">{number} </span>}
      <abbr title={section?.name} className="no-underline">{abbr}</abbr>
      {shown !== "same" && <span className="sr-only"> ({t(`setlists.history.${shown}`)})</span>}
    </li>
  );
}

/** Deux lignes Avant / Après d'une structure. */
function StructureBeforeAfter({ from, to, songs, songsMap }: {
  from: string[];
  to: string[];
  songs: string[];
  songsMap: Record<string, SongIndexEntry>;
}) {
  const { t } = useTranslation();
  const marks = compareSequences(from, to);
  const line = (side: "before" | "after", labels: string[], sideMarks: SequenceMark[]) => (
    <div className="flex items-start gap-2">
      <span aria-hidden className="w-11 shrink-0 pt-1.5 text-xs text-muted-foreground">{t(`setlists.history.${side}`)}</span>
      <ol aria-label={t(`setlists.history.${side}`)} className="flex flex-wrap gap-1.5 py-0.5">
        {labels.map((label, i) => (
          <SectionPill key={i} label={label} songs={songs} mark={sideMarks[i]} side={side} songsMap={songsMap} />
        ))}
      </ol>
    </div>
  );
  return (
    <div className="mt-1.5 mb-2 space-y-1">
      {line("before", from, marks.before)}
      {line("after", to, marks.after)}
      {songs.length > 1 && (
        <p className="flex flex-wrap gap-x-3 pl-[3.25rem] text-xs text-muted-foreground">
          {songs.map((slug, i) => (
            <span key={slug}>{i + 1} {songsMap[slug]?.title ?? slug}</span>
          ))}
        </p>
      )}
    </div>
  );
}

/** « Voir avant / après » à côté de la phrase ; le détail s'ouvre en dessous. */
function BeforeAfterDisclosure({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-my-2 ml-1 inline-flex h-10 items-center gap-1 rounded-md px-2 align-middle text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        {t(open ? "setlists.history.hideBeforeAfter" : "setlists.history.showBeforeAfter")}
      </button>
      {open && <div className="mt-1.5 mb-2">{children}</div>}
    </>
  );
}

/** Liste des chants avant et après : deux colonnes, l'une sous l'autre sur téléphone. */
function SongsBeforeAfter({ from, to, songsMap }: { from: string[]; to: string[]; songsMap: Record<string, SongIndexEntry> }) {
  const { t } = useTranslation();
  const marks = compareSequences(from, to);
  const title = (unit: string) => unit.split("+").map((slug) => songsMap[slug]?.title ?? slug).join(" + ");
  const column = (side: "before" | "after", units: string[], sideMarks: SequenceMark[]) => (
    <div className="min-w-0">
      <p aria-hidden className="mb-1 text-xs text-muted-foreground">{t(`setlists.history.${side}`)}</p>
      <ol aria-label={t(`setlists.history.${side}`)} className="space-y-1">
        {units.map((unit, i) => {
          const shown = shownMark(sideMarks[i], side);
          return (
            <li key={i} className="flex items-baseline gap-2">
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>{" "}
              <span
                className={`inline-flex min-w-0 items-center gap-1 ${
                  shown === "removed" ? "text-muted-foreground line-through" : ""
                } ${shown === "added" ? "rounded bg-emerald-500/15 px-1 text-emerald-800 dark:text-emerald-300" : ""}`}
              >
                {shown === "moved" && <ArrowUpDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                {title(unit)}
              </span>
              {shown !== "same" && <span className="sr-only"> ({t(`setlists.history.${shown}`)})</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {column("before", from, marks.before)}
      {column("after", to, marks.after)}
    </div>
  );
}

/** Mots d'une note, ponctuation à part ; en 中文, chaque caractère compte pour un mot. */
const NOTE_TOKENS = /\p{Script=Han}|[\p{L}\p{N}'’-]+|\s+|[^\s\p{L}\p{N}]/gu;

/** Texte d'une note, avec les mots retirés (avant) ou ajoutés (après) marqués. */
function MarkedText({ tokens, marks, side }: { tokens: string[]; marks: SequenceMark[]; side: "before" | "after" }) {
  const { t } = useTranslation();
  if (!tokens.length) return <span className="text-muted-foreground">—</span>;
  const target = side === "before" ? "removed" : "added";
  // Suites de mots marqués : l'espace entre deux mots marqués en fait partie.
  const runs: { marked: boolean; text: string }[] = [];
  tokens.forEach((token, i) => {
    const marked = /^\s+$/.test(token) ? marks[i - 1] === target && marks[i + 1] === target : marks[i] === target;
    const last = runs.at(-1);
    if (last?.marked === marked) last.text += token;
    else runs.push({ marked, text: token });
  });
  return (
    <>
      {runs.map((run, i) => {
        if (!run.marked) return <span key={i}>{run.text}</span>;
        const Mark = side === "before" ? "del" : "ins";
        return (
          <Mark
            key={i}
            className={side === "before"
              ? "text-muted-foreground decoration-[1.5px]"
              : "rounded bg-emerald-500/15 px-0.5 text-emerald-800 no-underline dark:text-emerald-300"}
          >
            {run.text}
            <span className="sr-only"> ({t(`setlists.history.${target}`)})</span>
          </Mark>
        );
      })}
    </>
  );
}

/** Avant / après d'une note, mot par mot. */
function NoteBeforeAfter({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation();
  const tokens = { before: from.match(NOTE_TOKENS) ?? [], after: to.match(NOTE_TOKENS) ?? [] };
  const marks = compareSequences(tokens.before, tokens.after, { moves: false });
  return (
    <div className="space-y-1">
      {(["before", "after"] as const).map((side) => (
        <div key={side} className="flex items-baseline gap-2">
          <span aria-hidden className="w-11 shrink-0 text-xs text-muted-foreground">{t(`setlists.history.${side}`)}</span>
          <p role="group" aria-label={t(`setlists.history.${side}`)} className="min-w-0 whitespace-pre-wrap break-words">
            <MarkedText tokens={tokens[side]} marks={marks[side]} side={side} />
          </p>
        </div>
      ))}
    </div>
  );
}

/** Notes de section qui ont changé, section par section. */
function SectionNotesBeforeAfter({ from, to }: { from: SectionNote[]; to: SectionNote[] }) {
  const noteOf = (list: SectionNote[], section: string) => list.find((n) => n.section === section)?.note ?? "";
  const sections = [...new Set([...to, ...from].map((n) => n.section))];
  return (
    <div className="space-y-2.5">
      {sections
        .filter((section) => noteOf(from, section) !== noteOf(to, section))
        .map((section) => (
          <div key={section} role="group" aria-label={section} className="flex items-start gap-2">
            <span aria-hidden className="w-11 shrink-0 text-xs font-semibold text-foreground">{section}</span>
            <div className="min-w-0 flex-1">
              <NoteBeforeAfter from={noteOf(from, section)} to={noteOf(to, section)} />
            </div>
          </div>
        ))}
    </div>
  );
}

/** Détail d'un changement sous sa phrase (avant / après), s'il en a un. */
function ChangeDetail({ change, songsMap }: { change: HistoryChange; songsMap: Record<string, SongIndexEntry> }) {
  if (change.kind === "songs") {
    return (
      <BeforeAfterDisclosure>
        <SongsBeforeAfter from={change.from} to={change.to} songsMap={songsMap} />
      </BeforeAfterDisclosure>
    );
  }
  if ((change.kind === "notes" || change.kind === "songNote") && change.from !== undefined && change.to !== undefined) {
    return (
      <BeforeAfterDisclosure>
        <NoteBeforeAfter from={change.from} to={change.to} />
      </BeforeAfterDisclosure>
    );
  }
  if (change.kind === "sectionNotes" && change.from && change.to) {
    return (
      <BeforeAfterDisclosure>
        <SectionNotesBeforeAfter from={change.from} to={change.to} />
      </BeforeAfterDisclosure>
    );
  }
  if (change.kind === "structure" && change.from && change.to) {
    return <StructureBeforeAfter from={change.from} to={change.to} songs={[change.song]} songsMap={songsMap} />;
  }
  if (change.kind === "fusionStructure" && change.from && change.to) {
    return <StructureBeforeAfter from={change.from} to={change.to} songs={change.songs} songsMap={songsMap} />;
  }
  return null;
}

export function SetlistHistory({ setlistId, songsMap }: { setlistId: string; songsMap: Record<string, SongIndexEntry> }) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(1);

  useEffect(() => {
    getSetlistHistory(setlistId, FIRST_READ)
      .then((list) => setEntries(list.filter((e) => e.changes.length > 0)))
      .catch(() => { /* historique illisible : la ligne ne s'affiche pas */ });
  }, [setlistId]);

  const latest = entries[0];
  if (!latest) return null;

  const showAll = async () => {
    try {
      const all = await getSetlistHistory(setlistId);
      setEntries(all.filter((e) => e.changes.length > 0));
    } catch { /* on garde les entrées déjà lues */ }
    setShown(Infinity);
  };

  const onlyCreated = latest.changes.every((c) => c.kind === "created");
  const when = relativeTime(latest.at, i18n.language);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground print:hidden"
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        {t(onlyCreated ? "setlists.history.createdBy" : "setlists.history.modifiedBy", {
          name: latest.authorName || t("setlists.history.someone"),
          when,
        })}
      </button>

      <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShown(1); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="max-w-2xl w-full mx-auto">
            <DrawerTitle>{t("setlists.history.heading")}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6 max-w-2xl w-full mx-auto space-y-4">
            {entries.slice(0, shown).map((entry) => (
              <article key={entry.id} className="rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {entry.authorName || t("setlists.history.someone")}
                  <span className="font-normal text-muted-foreground"> · {dateFormat.format(entry.at)}</span>
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                  {entry.changes.map((change, i) => (
                    <li key={i}>
                      {describeChange(change, t, songsMap)}
                      <ChangeDetail change={change} songsMap={songsMap} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {shown === 1 && entries.length > 1 && (
              <Button variant="outline" className="w-full h-11" onClick={() => setShown(5)}>
                {t("setlists.history.more")}
              </Button>
            )}
            {shown === 5 && entries.length > 5 && (
              <Button variant="outline" className="w-full h-11" onClick={() => void showAll()}>
                {t("setlists.history.all")}
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
