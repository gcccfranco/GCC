"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KeyPill } from "@/components/ui/key-pill";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import { getSetlistsFrom, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { songHref } from "@/lib/setlist/songHref";
import { upcomingSetlists } from "@/lib/setlist/upcoming";
import { categoryColor } from "@/lib/serviceColors";
import type { SongIndexEntry } from "@/types/song";

/** « Dim. 4 oct. » / « 10月4日周日 ». */
function dateCourte(iso: string, langue: string): string {
  const s = new Intl.DateTimeFormat(langue === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T12:00:00"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Volet de droite de Chants avant d'avoir choisi (lot U5, docs/spec-deux-volets.md, Q17,
 *  planche `chants-accueil`) : « Choisis un chant » et, pour un connecté, ses trois
 *  prochaines setlists. Masqué en un volet (la liste est seule, globals.css), et rien
 *  n'y est lu : les prochaines setlists sur téléphone sont hors du lot. */
export function ChoisisUnChant() {
  const { t, i18n } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { user, profile, loading } = useProfile();
  const [lues, setLues] = useState<FSSetlist[]>([]);

  useEffect(() => {
    if (!deuxVolets || loading || !user) return;
    let vivant = true;
    const today = todayIso();
    getSetlistsFrom(today, 30)
      .then((toutes) => { if (vivant) setLues(upcomingSetlists(toutes, user, profile, today)); })
      .catch(() => { /* hors ligne : « Choisis un chant » seul */ });
    return () => { vivant = false; };
  }, [deuxVolets, loading, user, profile]);

  const prochaines = deuxVolets && user ? lues : [];

  return (
    <div className="relative min-h-screen">
      {/* Son halo est celui de /songs (songs/ChantsVolets), réglé par le CSS. */}
      <div className="relative px-8 pb-12 pt-10 xl:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="raised flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-foreground">
            <Music className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-foreground">{t("songs.choose.title")}</h2>
            <p className="mt-0.5 text-[15px] text-muted-foreground">
              {prochaines.length > 0 ? t("songs.choose.subtitle") : t("songs.choose.subtitleListOnly")}
            </p>
          </div>
        </div>

        {prochaines.length > 0 && (
          <section className="mt-12" aria-labelledby="prochaines-setlists">
            <h2 id="prochaines-setlists" className="text-[17px] font-bold text-foreground">{t("songs.choose.upcoming")}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{t("songs.choose.upcomingHelp")}</p>
            <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(216px,1fr))]">
              {prochaines.map((s) => (
                <CarteSetlist key={s.id} setlist={s} langue={i18n.language} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CarteSetlist({ setlist, langue }: { setlist: FSSetlist; langue: string }) {
  const { t } = useTranslation();
  const songs = useSongsIndex();
  const parSlug = useMemo(() => new Map((songs ?? []).map((s) => [s.slug, s])), [songs]);
  const couleur = categoryColor(setlist.category);
  const titre = (slug: string) => parSlug.get(slug)?.title ?? slug;
  // Les chants, transitions exclues ; numérotés dans l'ordre joué.
  const chants = setlist.items.filter((i) => i.type !== "transition");

  return (
    <article data-carte-setlist className="raised rounded-2xl px-[18px] pb-3 pt-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: couleur }}>
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: couleur }} />
        {t("categories." + setlist.category, { defaultValue: setlist.category })}
      </p>
      <h3 className="mt-1 text-[17px] font-bold leading-snug text-foreground">
        <Link href={`/setlists/${setlist.id}`} className="hover:underline underline-offset-2">
          {setlist.title}
        </Link>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {dateCourte(setlist.date, langue)}
        {setlist.leader && ` · ${setlist.leader}`}
      </p>
      <ol className="mt-3">
        {chants.map((item, n) => {
          const fusion = item.type === "fusion" ? item.fusionSongs ?? [] : null;
          const entree: SongIndexEntry | undefined = fusion ? undefined : parSlug.get(item.songSlug);
          return (
            <li key={item.position} data-carte-chant className="flex min-h-[39px] items-center gap-3 border-t border-border py-1.5">
              <span className="w-3 shrink-0 text-[13px] tabular-nums text-muted-foreground">{n + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                {fusion ? (
                  // Une fusion : « A / B », chaque chant dans ses réglages de la fusion.
                  fusion.map((fs, k) => (
                    <Fragment key={k}>
                      {k > 0 && " / "}
                      <Link href={songHref(fs.songSlug, fs, setlist.id, item.position)} className="hover:underline underline-offset-2">
                        {titre(fs.songSlug)}
                      </Link>
                    </Fragment>
                  ))
                ) : (
                  <Link href={songHref(item.songSlug, item, setlist.id, item.position)} className="hover:underline underline-offset-2">
                    {titre(item.songSlug)}
                  </Link>
                )}
              </span>
              {entree && (
                // Depuis une setlist, sans tonalité choisie, c'est l'originale (page du chant).
                <KeyPill tonalite={item.keyOverride ?? entree.originalKey} langue={entree.language === "zh" ? "zh" : "fr"} />
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
