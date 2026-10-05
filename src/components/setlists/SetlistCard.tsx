"use client";

import Link from "next/link";
import { Check, ChevronRight, Lock } from "lucide-react";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";
import { categoryColor } from "@/lib/serviceColors";
import { Tile } from "@/components/ui/tile";
import { KeyPill } from "@/components/ui/key-pill";
import type { SongIndexEntry } from "@/types/song";

// Ligne d'une setlist dans une liste groupée : la vignette porte la date dans
// la couleur de la catégorie (docs/spec-look.md, « Listes et vignettes »).
// La présidence passe avant la date pour ne jamais être tronquée, et la
// catégorie est écrite sous le titre (retour du 16/09/2026).
export function SetlistCard({
  setlist,
  selectable,
  selected,
  onToggle,
  onApercu,
  actif = false,
}: {
  setlist: FSSetlist;
  /** Mode sélection (lot 10) : `undefined` = pas de mode, la ligne est le lien
   *  d'avant ; `false` = mode, mais pas le droit de supprimer (pas de case) ;
   *  `true` = case à cocher, et toute la ligne la bascule. */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** En grand (lot U4 bis, B2, Q4) : toucher la ligne ouvre l'aperçu à droite au lieu de la
   *  setlist ; le lien garde l'adresse de l'aperçu (`?apercu=<id>`). */
  onApercu?: () => void;
  /** La setlist dont l'aperçu est montré : ligne allumée (planche `setlists-ordinateur`). */
  actif?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const color = categoryColor(setlist.category);
  const jour = new Date(setlist.date + "T12:00:00");
  const mois = new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" }).format(jour);
  const chants = setlist.items.filter((i) => i.type !== "transition").length;

  const classe = actif
    ? "-mx-3 flex min-h-[64px] w-[calc(100%+1.5rem)] items-center gap-3 rounded-xl bg-foreground px-3 py-2.5 text-background [&_.text-foreground]:text-background [&_.text-muted-foreground]:text-background/75"
    : "-mx-3 flex min-h-[64px] w-[calc(100%+1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 active:bg-secondary/70";
  const contenu = (
    <>
      <Tile color={color} big={jour.getDate()} small={mois} size="lg" className={actif ? "!bg-background" : undefined} />
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

  if (onApercu) {
    return (
      <Link
        href={`/setlists?apercu=${encodeURIComponent(setlist.id)}`}
        aria-current={actif ? "true" : undefined}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onApercu();
        }}
        className={classe}
      >
        {selectable === false && <span className="h-11 w-11 shrink-0" aria-hidden />}
        {contenu}
      </Link>
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

/** Tablette portrait (lot U4 bis, B2, Q4 ; planche `setlists-tablette`) : la ligne de la setlist
 *  en tête d'une carte, puis ses chants numérotés avec leur tonalité. */
export function SetlistCarteChants({
  songsMap,
  ...ligne
}: Parameters<typeof SetlistCard>[0] & { songsMap: Record<string, SongIndexEntry> }) {
  const chants = ligne.setlist.items
    .filter((i) => i.type !== "transition")
    .sort((a, b) => a.position - b.position);
  return (
    <article data-testid="carte-setlist" className="raised rounded-2xl px-4 pb-2 pt-2">
      <SetlistCard {...ligne} />
      <ol className="mt-1">
        {chants.map((it, n) => {
          const song = songsMap[it.songSlug];
          const fusion = it.type === "fusion" && !!it.fusionSongs;
          const titre = fusion ? it.fusionSongs!.map((f) => songsMap[f.songSlug]?.title ?? f.songSlug).join(" / ") : (song?.title ?? it.songSlug);
          const tonalite = it.keyOverride ?? song?.originalKey;
          return (
            <li key={`${it.position}-${n}`} className="flex min-h-9 items-center gap-2.5 border-t border-border/70 py-1 text-[15px]">
              <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{n + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{titre}</span>
              {!fusion && tonalite && <KeyPill tonalite={tonalite} langue={song?.language === "zh" ? "zh" : "fr"} />}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
