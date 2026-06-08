"use client";

import Link from "next/link";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";

export function SetlistCard({ setlist }: { setlist: FSSetlist }) {
  const { t, i18n } = useTranslation();

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="flex flex-col justify-between rounded-xl border border-border bg-background hover:bg-muted/30 hover:border-primary/30 transition-all p-4 gap-3 group min-h-[100px]"
    >
      {/* ── Ligne haute ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              {t("categories." + setlist.category, { defaultValue: setlist.category })}
            </span>
            {setlist.isDraft && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                {t("setlists.list.draft")}
              </span>
            )}
            {setlist.isPrivate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium border border-violet-200 dark:border-violet-800">
                {t("setlists.list.private")}
              </span>
            )}
          </div>

          {/* Titre */}
          <h2 className="text-sm font-semibold text-foreground group-hover:text-primary leading-snug">
            {setlist.title}
          </h2>
        </div>

        {/* Badge langue */}
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
          {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
        </span>
      </div>

      {/* ── Ligne basse ── */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="capitalize font-medium text-foreground/70">
          {formatDate(setlist.date, i18n.language)}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span>{t("setlists.list.songCounter", { count: setlist.items.length })}</span>
          {setlist.leader && (
            <span className="text-muted-foreground/60">· {setlist.leader}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
