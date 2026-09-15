"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getSetlistHistory, type HistoryEntry } from "@/lib/firebase/setlistHistory";
import type { HistoryChange } from "@/lib/setlist/history";
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
      return t(p + change.kind, { song: title(change.song) });
  }
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
                    <li key={i}>{describeChange(change, t, songsMap)}</li>
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
