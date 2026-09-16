"use client";

import { GuideLien } from "@/components/guide/GuideLien";
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search, X, ChevronRight } from "lucide-react";
import { Tile } from "@/components/ui/tile";
import { PageTitle } from "@/components/layout/PageTitle";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry, Theme } from "@/types/song";
import { SongProposalDrawer } from "@/components/songs/SongProposalDrawer";

interface SongListClientProps {
  songs: SongIndexEntry[];
  themes: Theme[];
}

export function SongListClient({ songs, themes }: SongListClientProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isZhLocale = currentLang === "zh-CN";

  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "fr" | "zh">("all");
  const [themeFilter, setThemeFilter] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Récemment consultés (stockés sur l'appareil par la page détail)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentSongs");
      if (raw) setRecentSlugs(JSON.parse(raw));
    } catch { /* stockage indisponible */ }
  }, []);

  // Load from URL search params on mount — avant la première image, pour que
  // la liste affichée (et donc la position restaurée) soit déjà la filtrée.
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const lang = (params.get("lang") || "all") as "all" | "fr" | "zh";
    const theme = params.get("theme") || "";

    setQuery(q);
    setLangFilter(lang);
    setThemeFilter(theme);
    setIsInitialized(true);
  }, []);

  // Restore scroll position. Next.js remet la page en haut juste après le
  // rendu de la route : on repasse derrière lui dans l'image suivante, qui
  // s'affiche déjà à la bonne position (un délai fixe laissait voir le saut).
  useLayoutEffect(() => {
    if (!isInitialized) return;
    const savedScroll = sessionStorage.getItem("songsScrollPos");
    if (!savedScroll) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        top: parseInt(savedScroll, 10),
        behavior: "instant" as ScrollBehavior
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isInitialized]);

  // Update URL search params and sessionStorage path when state changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (langFilter !== "all") params.set("lang", langFilter);
    if (themeFilter) params.set("theme", themeFilter);
    
    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
    
    sessionStorage.setItem("lastListPath", newUrl);
  }, [query, langFilter, themeFilter, isInitialized]);

  // Aussi au clic sur un chant (capture sur toute la liste) : un défilement
  // fait avant l'hydratation — liste déjà visible, écouteur pas encore
  // branché — n'était jamais enregistré, et le retour ramenait en haut.
  function saveScrollPos() {
    sessionStorage.setItem("songsScrollPos", window.scrollY.toString());
  }

  // Save scroll position when navigating away. useLayoutEffect : l'écouteur
  // est retiré au démontage, avant que Next.js ne fasse défiler la page
  // suivante — sinon ce défilement écrasait la position enregistrée.
  useLayoutEffect(() => {
    window.addEventListener("scroll", saveScrollPos);
    return () => window.removeEventListener("scroll", saveScrollPos);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(songs, {
        keys: ["title", "titlePinyin", "artist"],
        threshold: 0.4,
        includeScore: true,
      }),
    [songs]
  );

  const getSortKey = (song: SongIndexEntry) => {
    const key = song.language === "zh" && song.titlePinyin ? song.titlePinyin : song.title;
    return key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const compareSongTitles = (a: SongIndexEntry, b: SongIndexEntry) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return a.slug.localeCompare(b.slug);
  };

  const filtered = useMemo(() => {
    let result: SongIndexEntry[];
    if (query.trim()) {
      // Résultats de recherche : ordre de pertinence
      result = fuse.search(query.trim()).map((r) => r.item);
    } else {
      result = [...songs].sort(compareSongTitles);
    }

    if (langFilter !== "all") {
      result = result.filter((s) => s.language === langFilter);
    }
    if (themeFilter) {
      result = result.filter((s) => s.themes.includes(themeFilter));
    }

    return result;
  }, [query, langFilter, themeFilter, fuse, songs]);

  // Récents : slugs → entrées (dans l'ordre de consultation)
  const recentSongs = useMemo(() => {
    const map = new Map(songs.map((s) => [s.slug, s]));
    return recentSlugs.map((slug) => map.get(slug)).filter((s): s is SongIndexEntry => !!s);
  }, [recentSlugs, songs]);

  // Index A–Z (hors recherche)
  const letterIndex = useMemo(() => {
    if (query.trim()) return [];
    const seen = new Map<string, string>(); // lettre → slug du premier chant
    for (const song of filtered) {
      const ch = getSortKey(song).charAt(0).toUpperCase();
      const letter = ch >= "A" && ch <= "Z" ? ch : "#";
      if (!seen.has(letter)) seen.set(letter, song.slug);
    }
    return [...seen.entries()];
  }, [filtered, query]);

  // Pendant un saut piloté par l'index, les barres du haut et du bas ne
  // bougent pas (lu par useScrollDirection). Le verrou est levé après le
  // défilement, ou au relâcher du doigt.
  const pressingRef = useRef(false);
  function lockNav() { document.documentElement.setAttribute("data-nav-lock", ""); }
  function unlockNav() {
    if (pressingRef.current) return;
    document.documentElement.removeAttribute("data-nav-lock");
  }
  function scrollToLetter(slug: string) {
    lockNav();
    document.getElementById(`song-li-${slug}`)?.scrollIntoView({ block: "start" });
    // L'événement scroll part à l'image suivante ; on lève le verrou après.
    requestAnimationFrame(() => requestAnimationFrame(unlockNav));
  }

  // Balayage de l'index : la lettre sous le doigt, tant qu'il est posé,
  // affichée dans un encart (le doigt cache la colonne).
  const swipeLetterRef = useRef<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  function followPointer(e: React.PointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = Math.floor(((e.clientY - rect.top) / rect.height) * letterIndex.length);
    const i = Math.min(Math.max(raw, 0), letterIndex.length - 1);
    const [letter, slug] = letterIndex[i];
    setActiveIndex(i);
    if (letter === swipeLetterRef.current) return;
    swipeLetterRef.current = letter;
    scrollToLetter(slug);
  }
  function releasePointer() {
    pressingRef.current = false;
    swipeLetterRef.current = null;
    setActiveIndex(null);
    // Un tap : le défilement du pointerdown n'a pas encore émis son événement.
    requestAnimationFrame(() => requestAnimationFrame(unlockNav));
  }

  const usedThemeSlugs = new Set(songs.flatMap((s) => s.themes));
  const availableThemes = themes.filter((t) => usedThemeSlugs.has(t.slug));
  const hasFilter = query.trim() !== "" || langFilter !== "all" || themeFilter !== "";

  function reset() {
    setQuery("");
    setLangFilter("all");
    setThemeFilter("");
  }

  const showIndex = letterIndex.length > 1 && filtered.length > 30;
  // 24 px par lettre (cible de l'ancien h-6) + py-1 ; rétréci si l'écran est court.
  const indexHeight = `min(78svh, ${letterIndex.length * 24 + 8}px)`;

  return (
    // pr-7 : gouttière fixe de l'index A–Z. Elle ne dépend pas de la recherche,
    // pour que le champ ne change pas de largeur pendant la frappe.
    <div className="relative pr-7" onClickCapture={saveScrollPos}>
      <PageTitle title={t("common.header.songs")} />
      {/* Barre de recherche */}
      <div className="relative mb-3.5">
        <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/70 pointer-events-none" />
        <input
          type="search"
          enterKeyHint="search"
          placeholder={t("songs.list.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[46px] pl-[42px] pr-10 border border-transparent rounded-xl bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring/50 focus:ring-[3px] focus:ring-ring/10 text-[16px] transition-all duration-150 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label={t("songs.list.clearSearch")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2.5 rounded-md hover:bg-secondary active:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Langue — segmented control */}
        <div className="inline-flex bg-secondary rounded-sm p-[3px] gap-0.5">
          {(["all", "fr", "zh"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLangFilter(lang)}
              className={`px-3 py-1.5 rounded-sm text-sm font-semibold transition-all duration-150 cursor-pointer ${
                langFilter === lang
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "all" ? t("songs.list.allLanguages") : lang === "fr" ? "FR" : "中文"}
            </button>
          ))}
        </div>

        {/* Thème */}
        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
          className="h-8 pl-3 pr-7 rounded-sm text-[16px] sm:text-sm font-semibold bg-secondary text-foreground border border-transparent focus:outline-none focus:ring-2 focus:ring-ring/20 cursor-pointer appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7079' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center" }}
        >
          <option value="">{t("songs.list.filterTheme")}</option>
          {availableThemes.map((themeItem) => (
            <option key={themeItem.slug} value={themeItem.slug}>
              {isZhLocale ? themeItem.name_zh : themeItem.name_fr}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={reset}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
          >
            {t("common.buttons.reset")}
          </button>
        )}
      </div>

      {/* Récemment consultés */}
      {!hasFilter && recentSongs.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-muted-foreground mb-1.5">
            {t("songs.list.recent", { defaultValue: "Récemment consultés" })}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {recentSongs.map((song) => (
              <Link
                key={song.slug}
                href={`/songs/${song.slug}`}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm font-semibold text-foreground active:bg-secondary/60 transition-colors"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: song.language === "zh" ? "var(--jianpu-color)" : "var(--chord-color)" }}
                />
                {song.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Compteur + proposition de chant */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length === songs.length
            ? t("songs.list.counter", { count: songs.length })
            : t("songs.list.counterFiltered", { count: filtered.length, filteredCount: filtered.length, totalCount: songs.length })}
        </p>
        <SongProposalDrawer />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("songs.list.noSongsFound")}
        </p>
      ) : (
        <ul className="rounded-xl bg-card [&>li:first-child>a]:rounded-t-xl [&>li:last-child>a]:rounded-b-xl">
          {filtered.map((song) => (
            <li key={song.slug} id={`song-li-${song.slug}`} className="group-row relative scroll-mt-[calc(var(--nav-h)+8px)]">
              <Link
                href={`/songs/${song.slug}`}
                className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition-colors duration-150 active:bg-secondary/70"
              >
                {/* Vignette : tonalité recommandée (sinon d'origine), teinte de la langue */}
                <Tile
                  color={song.language === "zh" ? "var(--zh-accent)" : "var(--fr-accent)"}
                  big={song.recommendedKey ?? song.originalKey}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">{song.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {song.titlePinyin ? `${song.titlePinyin} · ${song.artist}` : song.artist}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <GuideLien section="songs" />

      {/* Index A–Z (tri par titre, liste assez longue) : dans la gouttière,
          débordant sur la marge de page pour rester au bord de l'écran sur
          téléphone et collé à la liste sur ordinateur. On le balaye du doigt. */}
      {showIndex && (
        // -top-6 : la colonne part du ras de la navbar, pour que l'index soit
        // déjà à sa place collante avant le premier défilement.
        <div className="absolute -top-6 bottom-0 -right-4 w-11 flex justify-end pointer-events-none">
          <nav
            aria-label={t("common.aria.indexAlphabetique")}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pressingRef.current = true;
              lockNav();
              swipeLetterRef.current = null;
              followPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) followPointer(e);
            }}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            className="pointer-events-auto sticky z-30 mr-0.5 flex flex-col items-center px-0.5 py-1 rounded-full bg-background/70 backdrop-blur-sm touch-none select-none"
            // Centré par `top` et non par une translation : en bas de liste,
            // le collant bute sur la fin de la colonne et une translation
            // ferait sortir le haut de l'index de l'écran.
            style={{
              height: indexHeight,
              top: `calc((100svh - ${indexHeight}) / 2)`,
            }}
          >
            {activeIndex !== null && (
              <span
                data-testid="index-letter"
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute right-full mr-2 flex h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-sm bg-card px-2.5 text-[22px] font-extrabold text-foreground shadow-soft"
                style={{ top: `calc((${activeIndex} + 0.5) * 100% / ${letterIndex.length})` }}
              >
                {letterIndex[activeIndex][0]}
              </span>
            )}
            {letterIndex.map(([letter, slug], i) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(slug)}
                aria-label={t("common.aria.allerA", { lettre: letter })}
                className={`w-8 flex-1 min-h-0 flex items-center justify-center text-[11px] font-bold transition-transform duration-100 hover:text-foreground active:text-foreground ${
                  i === activeIndex ? "text-foreground scale-125" : "text-muted-foreground"
                }`}
              >
                {letter}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}