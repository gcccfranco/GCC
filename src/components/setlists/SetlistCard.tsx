"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";
import { categoryColor } from "@/lib/serviceColors";
import { Tile } from "@/components/ui/tile";

// Ligne d'une setlist dans une liste groupée : la vignette porte la date dans
// la couleur de la catégorie (docs/spec-look.md, « Listes et vignettes »).
// La présidence passe avant la date pour ne jamais être tronquée, et la
// catégorie est écrite sous le titre (retour du 16/09/2026).
export function SetlistCard({ setlist }: { setlist: FSSetlist }) {
  const { t, i18n } = useTranslation();
  const color = categoryColor(setlist.category);
  const jour = new Date(setlist.date + "T12:00:00");
  const mois = new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" }).format(jour);
  const chants = setlist.items.filter((i) => i.type !== "transition").length;

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 transition-colors duration-150 active:bg-secondary/70"
    >
      <Tile color={color} big={jour.getDate()} small={mois} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-base font-semibold text-foreground">{setlist.title}</span>
          {setlist.isPrivate && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={t("setlists.list.private")} />
          )}
        </span>
        <span className="flex text-sm text-muted-foreground">
          {setlist.leader && <span className="shrink-0">{setlist.leader}&nbsp;·&nbsp;</span>}
          <span className="truncate capitalize">{formatDate(setlist.date, i18n.language)}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {t("categories." + setlist.category, { defaultValue: setlist.category })}
          {" · "}
          {t("setlists.list.songCounter", { count: chants })}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}
