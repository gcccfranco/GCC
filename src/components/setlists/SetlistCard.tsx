"use client";

import Link from "next/link";
import { Check, ChevronRight, Lock } from "lucide-react";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";
import { categoryColor } from "@/lib/serviceColors";
import { Tile } from "@/components/ui/tile";

// Ligne d'une setlist dans une liste groupée : la vignette porte la date dans
// la couleur de la catégorie (docs/spec-look.md, « Listes et vignettes »).
// La présidence passe avant la date pour ne jamais être tronquée, et la
// catégorie est écrite sous le titre (retour du 16/09/2026).
export function SetlistCard({
  setlist,
  selectable,
  selected,
  onToggle,
}: {
  setlist: FSSetlist;
  /** Mode sélection (lot 10) : `undefined` = pas de mode, la ligne est le lien
   *  d'avant ; `false` = mode, mais pas le droit de supprimer (pas de case) ;
   *  `true` = case à cocher, et toute la ligne la bascule. */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const color = categoryColor(setlist.category);
  const jour = new Date(setlist.date + "T12:00:00");
  const mois = new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" }).format(jour);
  const chants = setlist.items.filter((i) => i.type !== "transition").length;

  const classe = "-mx-3 flex min-h-[64px] w-[calc(100%+1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 active:bg-secondary/70";
  const contenu = (
    <>
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
    </>
  );

  // Ligne supprimable en mode sélection : un bouton, sinon un appui ouvrirait
  // la setlist au lieu de cocher. Case de 24 px dans une zone d'appui de 44 px.
  if (selectable) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={!!selected}
        aria-label={setlist.title}
        onClick={onToggle}
        className={`${classe} w-full text-left cursor-pointer`}
      >
        <span className="grid h-11 w-11 shrink-0 place-content-center">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${
              selected ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50"
            }`}
          >
            {selected && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
          </span>
        </span>
        {contenu}
      </button>
    );
  }

  return (
    <Link href={`/setlists/${setlist.id}`} className={classe}>
      {/* Mode sélection sans le droit de supprimer : la place de la case, pour
          que les vignettes restent alignées d'une ligne à l'autre. */}
      {selectable === false && <span className="h-11 w-11 shrink-0" aria-hidden />}
      {contenu}
    </Link>
  );
}
