"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListMusic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KeyPill } from "@/components/ui/key-pill";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import { getSetlistsDepuis, getSetlistsFrom, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { songHref } from "@/lib/setlist/songHref";
import { upcomingSetlists } from "@/lib/setlist/upcoming";
import { categoryColor } from "@/lib/serviceColors";
import { debutPlusChantes, plusChantes } from "@/lib/stats/plusChantes";
import type { SongIndexEntry } from "@/types/song";

/** « 30 sept. » / « 9月30日 » : la date d'ajout d'un chant (« Nouveaux au répertoire »). */
function jourCourt(iso: string, langue: string): string {
  return new Intl.DateTimeFormat(langue === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" })
    .format(new Date(iso + "T12:00:00"));
}

/** « Dim. 4 oct. » / « 10月4日周日 ». */
function dateCourte(iso: string, langue: string): string {
  const s = new Intl.DateTimeFormat(langue === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T12:00:00"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lecture des prochaines setlists, gardée une minute (comme le profil) : chaque retour sur
 *  /songs remonte « Choisis un chant », et relisait jusqu'à 30 documents à chaque fois. */
const GARDEE_MS = 60_000;
let lecture: { cle: string; quand: number; promesse: Promise<FSSetlist[]> } | null = null;

function prochainesLues(uid: string, today: string): Promise<FSSetlist[]> {
  const cle = `${uid}|${today}`;
  if (!lecture || lecture.cle !== cle || Date.now() - lecture.quand > GARDEE_MS) {
    const promesse = getSetlistsFrom(today, 30);
    lecture = { cle, quand: Date.now(), promesse };
    // Échouée (hors ligne) : rien de gardé, la prochaine visite relira.
    promesse.catch(() => {
      if (lecture?.promesse === promesse) lecture = null;
    });
  }
  return lecture.promesse;
}

/** Setlists des 92 derniers jours (« Les plus chantés », A8), gardées une minute comme les prochaines.
 *  Pas le cache du tableau de bord (`lireSetlists`, back-office) : il lit depuis aujourd'hui, celui-ci
 *  depuis 92 jours ; une clé commune ne servirait jamais deux fois la même lecture. */
let lecturePassees: { cle: string; quand: number; promesse: Promise<FSSetlist[]> } | null = null;

function passeesLues(uid: string, today: string): Promise<FSSetlist[]> {
  const cle = `${uid}|${today}`;
  if (!lecturePassees || lecturePassees.cle !== cle || Date.now() - lecturePassees.quand > GARDEE_MS) {
    const promesse = getSetlistsDepuis(debutPlusChantes(today));
    lecturePassees = { cle, quand: Date.now(), promesse };
    promesse.catch(() => {
      if (lecturePassees?.promesse === promesse) lecturePassees = null;
    });
  }
  return lecturePassees.promesse;
}

/** Les chants ouverts sur cet appareil (`recentSongs`, écrit par la page d'un chant), relus à
 *  chaque chant ouvert ; illisible (navigation privée, stockage bloqué) : aucun. */
function useRecents(): string[] {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const lire = () => {
      try {
        const raw = localStorage.getItem("recentSongs");
        const lus: unknown = raw ? JSON.parse(raw) : [];
        setSlugs(Array.isArray(lus) ? lus.filter((s): s is string => typeof s === "string") : []);
      } catch { setSlugs([]); }
    };
    lire();
    window.addEventListener("recentSongs", lire);
    return () => window.removeEventListener("recentSongs", lire);
  }, []);
  return slugs;
}

/** Volet de droite de Chants avant d'avoir choisi (lot U5, docs/spec-deux-volets.md, Q17 ;
 *  agencement v18, A5 à A8 de docs/spec-agencement-v18.md, planche `v18-app-chants-a`) :
 *  « Choisis un chant » (h2), puis, du plus utile au moins utile, les prochaines setlists du
 *  connecté (ou « Pas de setlist à venir pour toi »), « Récemment ouverts » et « Nouveaux au
 *  répertoire » côte à côte, « Les plus chantés à GCC ». Une carte sans donnée ne paraît pas.
 *  Masqué en un volet (la liste est seule, globals.css), et rien n'y est lu. */
export function ChoisisUnChant() {
  const { t, i18n } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { user, profile, loading } = useProfile();
  const { songs } = useSongsIndex(deuxVolets);
  const recentSlugs = useRecents();
  // `null` tant que la lecture n'a pas répondu : la carte « Pas de setlist » n'attend que la réponse.
  const [lues, setLues] = useState<FSSetlist[] | null>(null);
  const [passees, setPassees] = useState<FSSetlist[]>([]);

  useEffect(() => {
    if (!deuxVolets || loading || !user) return;
    let vivant = true;
    const today = todayIso();
    prochainesLues(user.uid, today)
      .then((toutes) => { if (vivant) setLues(upcomingSetlists(toutes, user, profile, today)); })
      .catch(() => { /* hors ligne : ni cartes, ni « Pas de setlist » */ });
    passeesLues(user.uid, today)
      .then((toutes) => { if (vivant) setPassees(toutes); })
      .catch(() => { /* hors ligne : pas de « Plus chantés » */ });
    return () => { vivant = false; };
  }, [deuxVolets, loading, user, profile]);

  const connecte = deuxVolets && !!user;
  const prochaines = connecte ? lues ?? [] : [];
  const parSlug = useMemo(() => new Map((songs ?? []).map((s) => [s.slug, s])), [songs]);
  // Dans l'ordre de la rangée « Récemment consultés » de la liste (même clé), cinq au plus.
  const recents = useMemo(
    () => recentSlugs.map((slug) => parSlug.get(slug)).filter((s): s is SongIndexEntry => !!s).slice(0, 5),
    [recentSlugs, parSlug],
  );
  const nouveaux = useMemo(
    () => (songs ?? [])
      .filter((s) => s.ajouteLe)
      .sort((a, b) => b.ajouteLe!.localeCompare(a.ajouteLe!) || a.title.localeCompare(b.title, "fr"))
      .slice(0, 6),
    [songs],
  );
  const plus = useMemo(
    () => (connecte && songs && passees.length > 0 ? plusChantes(passees, songs, todayIso()) : []),
    [connecte, songs, passees],
  );

  return (
    <div data-choisis-un-chant className="relative flex flex-col gap-4 pb-12 pr-[var(--marge-page)]">
      {/* Son halo est celui de /songs (songs/ChantsVolets), réglé par le CSS. */}
      <div>
        <h2 className="text-[24px] font-bold leading-[29px] tracking-[-0.02em] text-foreground">{t("songs.choose.title")}</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {prochaines.length > 0 ? t("songs.choose.subtitle") : recents.length > 0 ? t("songs.choose.subtitleRecents") : t("songs.choose.subtitleListOnly")}
        </p>
      </div>

      {prochaines.length > 0 ? (
        <section aria-labelledby="prochaines-setlists" className="mt-2">
          <h2 id="prochaines-setlists" className="text-[17px] font-bold text-foreground">{t("songs.choose.upcoming")}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t("songs.choose.upcomingHelp")}</p>
          <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(216px,1fr))]">
            {prochaines.map((s) => (
              <CarteSetlist key={s.id} setlist={s} langue={i18n.language} />
            ))}
          </div>
        </section>
      ) : connecte && lues !== null && (
        <div data-sans-setlist className="raised flex items-center gap-3.5 rounded-2xl px-[18px] py-3.5">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-foreground">
            <ListMusic className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-foreground">{t("songs.choose.sansSetlist")}</p>
            <p className="text-[13px] text-muted-foreground">{t("songs.choose.sansSetlistTexte")}</p>
          </div>
          <Link href="/setlists" className="shrink-0 text-[14px] font-semibold text-foreground underline underline-offset-2">
            {t("songs.choose.voirSetlists")}
          </Link>
        </div>
      )}

      {(recents.length > 0 || nouveaux.length > 0) && (
        <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {recents.length > 0 && (
            <CarteChants titre={t("songs.choose.recents")} aide={t("songs.choose.recentsAide")}>
              {recents.map((s) => <LigneChant key={s.slug} chant={s} />)}
            </CarteChants>
          )}
          {nouveaux.length > 0 && (
            <CarteChants titre={t("songs.choose.nouveaux")}>
              {nouveaux.map((s) => (
                <LigneChant key={s.slug} chant={s} sous={t("songs.choose.ajouteLe", { date: jourCourt(s.ajouteLe!, i18n.language) })} />
              ))}
            </CarteChants>
          )}
        </div>
      )}

      {plus.length > 0 && (
        <CarteChants titre={t("songs.choose.plusChantes")} aide={t("songs.choose.plusChantesAide")}>
          <div className="grid grid-cols-2 gap-x-7">
            {plus.map((l) => {
              const chant = parSlug.get(l.slug);
              return chant && (
                <LigneChant key={l.slug} chant={chant} rang={l.rang} sous={t("songs.choose.foisEnSetlist", { count: l.setlists })} />
              );
            })}
          </div>
        </CarteChants>
      )}
    </div>
  );
}

/** Une carte titrée du volet (planche `carte`) : titre 15 px en gras, une aide à droite. */
function CarteChants({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="raised min-w-0 rounded-2xl px-[18px] pb-2 pt-3.5">
      {/* Une carte étroite (tablette couchée) passe l'aide à la ligne plutôt que de couper le titre. */}
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-[15px] font-bold text-foreground">{titre}</h3>
        {aide && <span className="ml-auto whitespace-nowrap text-[13px] font-semibold text-muted-foreground">{aide}</span>}
      </div>
      {children}
    </section>
  );
}

/** Un chant d'une carte : son titre (lien vers sa page, ouverte à droite), une ligne dessous, sa
 *  tonalité (la recommandée, sinon l'originale, comme la liste) ; le rang devant, au besoin. */
function LigneChant({ chant, sous, rang }: { chant: SongIndexEntry; sous?: string; rang?: number }) {
  const zh = chant.language === "zh";
  return (
    <div data-ligne-chant className="flex min-w-0 items-center gap-3 border-t border-border py-2">
      {rang !== undefined && <span className="w-4 shrink-0 text-[12px] font-bold tabular-nums text-muted-foreground">{rang}</span>}
      <div className="min-w-0 flex-1">
        <Link href={`/songs/${chant.slug}`} data-titre className="block truncate text-[14.5px] font-semibold text-foreground hover:underline underline-offset-2">
          {chant.title}
        </Link>
        <p className="truncate text-[12.5px] text-muted-foreground">
          {sous ?? (chant.titlePinyin ? `${chant.titlePinyin} · ${chant.artist}` : chant.artist)}
        </p>
      </div>
      <KeyPill tonalite={chant.recommendedKey ?? chant.originalKey} langue={zh ? "zh" : "fr"} />
    </div>
  );
}

function CarteSetlist({ setlist, langue }: { setlist: FSSetlist; langue: string }) {
  const { t } = useTranslation();
  const { songs } = useSongsIndex();
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
