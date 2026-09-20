"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MoreHorizontal, Download, Play, X, TriangleAlert , Music, Music2, Settings, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getChartStylePref, setChartStylePref } from "@/lib/chartStylePref";
import { getPersonalKeys, setPersonalKey } from "@/lib/setlist/personalKeys";
import { getFontScalePref, setFontScalePref, MIN_FONT_SCALE, MAX_FONT_SCALE } from "@/lib/fontScalePref";
import { SongView } from "@/components/song/SongView";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { useJianpuScore } from "@/lib/jianpu/images";
import { CustomizePanel, type CustomizeState } from "@/components/customPanel/CustomizePanel";
import type { Song } from "@/types/song";
import { useTranslation } from "react-i18next";
import { extractYouTubeId } from "@/lib/youtube/youtube";
import { buildDefaultStructure } from "@/lib/chordpro/structure";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { keyOptions, semitonesTo, getTransposedKey } from "@/lib/transpose";
import { useSearchParams } from "next/navigation";
import type { SectionItem } from "@/types/song";
import type { SectionNuance } from "@/types/setList";
import { ReportDialog } from "@/components/report/ReportDialog";
import { PdfChoiceSheet } from "@/components/pdf/PdfChoiceSheet";
import { IdeesSheet } from "@/components/harmonie/IdeesSheet";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { pdfFileName, type PdfStyle } from "@/lib/pdfStylePref";

interface SongDetailClientProps {
  song: Song;
}

/** Parse un paramètre d'URL JSON sans jamais lever : les liens partagés
 *  peuvent arriver tronqués (WhatsApp/WeChat) — on retombe sur le défaut. */
function safeParseParam<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}



  export function SongDetailClient({ song }: SongDetailClientProps) {
    const { t, i18n } = useTranslation();
    const ast = useMemo(() => parseChordPro(song.chordProSource), [song.chordProSource]);
    const isZh = song.language === "zh";
    // Partition 简谱 en image (scan d'origine) — absente pour la plupart des chants
    const jianpuScore = useJianpuScore(song.slug);
    const [showScore, setShowScore] = useState(false);
    const originalKey = ast.metadata.key;
    // Tonalité la plus chantée à GCC : la page y démarre, l'originale reste proposée.
    const recommendedKey = ast.metadata.recommendedKey;
    const defaultKey = recommendedKey ?? originalKey;
    const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;
    const scrollVisible = useScrollDirection();
    // Barre d'outils rappelée d'un tap sur la partition (tablette au pupitre :
    // éviter de devoir remonter la page pour transposer / zoomer)
    const [barPinned, setBarPinned] = useState(false);
    useEffect(() => {
      if (!barPinned) return;
      const y0 = window.scrollY;
      const onScroll = () => {
        if (Math.abs(window.scrollY - y0) > 60) setBarPinned(false);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, [barPinned]);
    const [showVideo, setShowVideo] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [backPath, setBackPath] = useState("/songs");
    const [showReport, setShowReport] = useState(false);
    const [showPdfChoice, setShowPdfChoice] = useState(false);
    // Idées d'harmonie (lot 9) : pianistes, guitaristes et admins seulement.
    const [showIdees, setShowIdees] = useState(false);
    const accesHarmonie = useAccesHarmonie();
    const [instrumentHarmonie] = useInstrument(accesHarmonie);
    const searchParams = useSearchParams();
    useEffect(() => {
      const saved = sessionStorage.getItem("lastListPath");
      if (saved) setBackPath(saved);
    }, []);

    // Mémoriser le chant dans les « récemment consultés » (affichés sur /songs)
    useEffect(() => {
      try {
        const raw = localStorage.getItem("recentSongs");
        const list: string[] = raw ? JSON.parse(raw) : [];
        const next = [song.slug, ...list.filter((s) => s !== song.slug)].slice(0, 8);
        localStorage.setItem("recentSongs", JSON.stringify(next));
      } catch { /* stockage indisponible */ }
    }, [song.slug]);

    const [customize, setCustomize] = useState<CustomizeState>({
      semitones: 0,
      currentKey: originalKey,
      showChords: true,
      showPinyin: isZh,
      useJianpu: false,
      structure: buildDefaultStructure(ast.sections),
    });
    // AST transposé en mémoire — recalculé uniquement si semitones change


    // Structure override : IDs des sections dans l'ordre choisi
    
    const defaultStructure = useMemo(
      () => customize.structure.map((s) => s.uid),
      [customize.structure]
    );

    const structureOverride = useMemo(
      () => safeParseParam<string[]>(searchParams.get("structure"), defaultStructure),
      [searchParams, defaultStructure]
    );

    const sectionsNote = useMemo(() => {
      const defaultSectionsNote = Object.fromEntries(
        customize.structure.map((s) => [s.uid, s.note]).filter(([, n]) => n)
      );
      return safeParseParam<Record<string, string>>(searchParams.get("sectionNotes"), defaultSectionsNote);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, customize.structure]);

    const sectionsNuance = useMemo(
      () => safeParseParam<Record<string, SectionNuance>>(searchParams.get("sectionNuances"), {}),
      [searchParams]
    );

    const sectionsKeys = useMemo(
      () => safeParseParam<Record<string, string>>(searchParams.get('sectionKeys'), {}),
      [searchParams]
    )
    useEffect(() => {
      const structure: SectionItem[] = structureOverride.map((uid: string, index: number) => {
        const sectionId = uid.replace(/-\d+$/, "");
        const cleanUid = uid.match(/-\d+$/) ? uid : `${sectionId}-${index}`;
        return {
          uid: cleanUid,
          sectionId,
          name: ast.sections.find((s) => s.id === sectionId)?.name ?? "",
          note: sectionsNote[cleanUid] ?? sectionsNote[uid] ?? sectionsNote[sectionId] ?? "",
        };
      });
      setCustomize(prev => ({...prev, structure: structure}))
    },[]);

    // Ouverte depuis une setlist : la tonalité choisie ici est retenue pour ce
    // chant dans cette setlist, sur cet appareil (reprise en mode louange).
    const fromSetlist = useMemo(() => safeParseParam<string | null>(searchParams.get("setlist"), null), [searchParams]);
    // Depuis une setlist, l'absence de `key` veut dire la tonalité originale.
    const setlistKey = useMemo(
      () => safeParseParam<string>(searchParams.get("key"), fromSetlist ? originalKey : defaultKey),
      [searchParams, fromSetlist, originalKey, defaultKey]
    );

    // Tant que la tonalité de départ n'est pas appliquée, l'état porte encore la
    // tonalité d'origine : l'enregistrer écraserait le choix retenu.
    const [keyReady, setKeyReady] = useState(false);

    useEffect(() => {
      const songKey = (fromSetlist && getPersonalKeys(fromSetlist)[song.slug]) || setlistKey;
      const diff = semitonesTo(originalKey, songKey);
      setCustomize(prev => ({ ...prev, currentKey: songKey, semitones: diff }));
      setKeyReady(true);
    }, []); // une seule fois au montage

    useEffect(() => {
      if (!fromSetlist || !keyReady) return;
      setPersonalKey(fromSetlist, song.slug, customize.currentKey === setlistKey ? null : customize.currentKey);
    }, [fromSetlist, keyReady, song.slug, setlistKey, customize.currentKey]);

    const displayedAST = useMemo(
      () => transposeAST(ast, customize.semitones, customize.currentKey),
      [ast, customize.semitones, customize.currentKey]
    );

    // Taille de texte (zoom, persistée) — chargée après montage pour éviter
    // un écart d'hydratation (le composant est rendu côté serveur).
    const [fontScale, setFontScale] = useState(1);
    // Même taille que le mode louange (fontScalePref).
    useEffect(() => setFontScale(getFontScalePref()), []);
    const changeFontScale = (delta: number) => {
      setFontScale((s) => {
        const next = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round((s + delta) * 10) / 10));
        setFontScalePref(next);
        return next;
      });
    };

    // Couleurs par section — préférence par appareil partagée avec le mode
    // louange ; chargée après montage (même raison d'hydratation que fontScale).
    const [chartStyle, setChartStyle] = useState(true);
    useEffect(() => setChartStyle(getChartStylePref()), []);
    const toggleChartStyle = (v: boolean) => {
      setChartStyle(v);
      setChartStylePref(v);
    };

    async function handleDownload(style: PdfStyle) {
      setDownloading(true);
      try {
        // Chargés à la demande : @react-pdf/renderer est lourd et ne doit pas
        // peser sur le bundle de la fiche chant (cf. SetlistDetailClient).
        const [{ pdf }, { SongPDF }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/pdf/SongPDF"),
        ]);
        const blob = await pdf(
          <SongPDF
            ast={displayedAST}
            showChords={customize.showChords}
            showPinyin={customize.showPinyin}
            useJianpu={customize.useJianpu}
            structureOverride={structureOverride}
            sectionNotes={sectionsNote}
            sectionNuances={sectionsNuance}
            language={i18n.language}
            sectionStyle={style === "colors" ? "colors" : "classic"}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = pdfFileName(`${song.slug}-${customize.currentKey}`, style);
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setDownloading(false);
      }
    }

    // « (orig.) » / « (reco.) » après une tonalité, dans la liste et sur ordinateur.
  const keySuffix = (k: string) =>
    (k === originalKey ? " " + t("customize.panel.keyOriginal") : "") +
    (k === recommendedKey ? " " + t("customize.panel.keyRecommended") : "");

  return (
      <div className="min-h-screen print:min-h-0 bg-background" style={{ width: `${100 / fontScale}%` }}>
        {/* Barre de contrôles */}
        <div data-testid="barre-outils" className={`print:hidden fixed left-0 right-0 top-[var(--nav-h)] z-10 material-chrome shadow-[0_1px_0_hsl(var(--border))] transition-transform duration-300 ${ scrollVisible || barPinned ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
          <div className = "max-w-3xl mx-auto w-full flex flex-nowrap gap-1 items-center py-2 px-1.5">
            <Button
              asChild
              variant="secondary"
              className="h-9 lg:h-8 px-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Link aria-label={t("songs.detail.backToAll")} href={backPath}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m6-7l-7 7 7 7" />
                </svg>
                <span className="hidden sm:inline">{t("songs.detail.backToAll")}</span>
              </Link>
            </Button>
            {/* Transposition rapide */}
            <div data-testid="pilule-tonalite" className="raised flex items-center gap-0.5 flex-1 min-w-0 sm:flex-none rounded-full p-0.5">
              <Button
                variant="ghost"
                size="icon-lg"
                className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold"
                onClick={() =>
                  setCustomize((c) => {
                    const s = c.semitones - 1;
                    return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
                  })
                }
              >
                −
              </Button>
                {/* Fermé : la tonalité seule sur tactile (le suffixe rognait « E ( » à
                    six commandes), tonalité + suffixe sur ordinateur ; la liste native,
                    transparente par-dessus, garde ses libellés complets. */}
                <span className="relative flex-1 min-w-0 h-9 lg:h-8 flex items-center justify-center gap-0.5 px-1.5 rounded-full text-foreground text-sm font-semibold focus-within:ring-2 focus-within:ring-ring/30">
                  <span data-testid="tonalite-courante" className="truncate" aria-hidden>
                    {customize.currentKey}
                    <span className="hidden lg:inline">{keySuffix(customize.currentKey)}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                  <select
                    aria-label={t("customize.panel.key")}
                    value={customize.currentKey}
                    onChange={(e) => setCustomize((c) => {
                      const key = e.target.value;
                      const diff = semitonesTo(originalKey, key);
                      return { ...c, semitones: diff, currentKey: key };
                      })
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    {keyOptions(customize.currentKey, originalKey).map((k) => (
                      <option key={k} value={k}>
                        {k}
                        {keySuffix(k)}
                      </option>
                    ))}
                  </select>
                </span>
              <Button
                variant="ghost"
                size="icon-lg"
                className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold"
                onClick={() =>
                  setCustomize((c) => {
                    const s = c.semitones + 1;
                    return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
                  })
                }
              >
                +
              </Button>
              {/* Retour à la tonalité par défaut (recommandée, sinon d'origine) d'un tap */}
              {customize.currentKey !== defaultKey && (
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-muted-foreground"
                  aria-label={t(recommendedKey ? "customize.panel.keyBackToRecommended" : "customize.panel.keyOriginal")}
                  title={t(recommendedKey ? "customize.panel.keyBackToRecommended" : "customize.panel.keyOriginal")}
                  onClick={() =>
                    setCustomize((c) => ({ ...c, semitones: semitonesTo(originalKey, defaultKey), currentKey: defaultKey }))
                  }
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </Button>
              )}
            </div>

            <div className="raised ml-auto flex gap-0.5 items-center justify-end rounded-full p-0.5">
              {/* Taille du texte */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-xs font-bold"
                  onClick={() => changeFontScale(-0.1)}
                  disabled={fontScale <= 0.8}
                  aria-label={t("performance.textSmaller")}
                >
                  A−
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold"
                  onClick={() => changeFontScale(0.1)}
                  disabled={fontScale >= 1.5}
                  aria-label={t("performance.textLarger")}
                >
                  A+
                </Button>
              </div>

              {/* Accords */}
              <button aria-label={t("songs.detail.chords") || "Accords"}
                onClick={() => setCustomize((c) => ({ ...c, showChords: !c.showChords }))}
                className={`h-9 min-w-9 lg:h-8 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                      customize.showChords
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                    <span className="hidden sm:inline">{t("songs.detail.chords") || "Accords"}</span>
              </button>

              {/* Pinyin (chants zh) */}
              {isZh && (
                    <button aria-label={t("songs.detail.pinyin") || "Pinyin"}
                      onClick={() => setCustomize((c) => ({ ...c, showPinyin: !c.showPinyin }))}
                      className={`h-9 min-w-9 lg:h-8 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                        customize.showPinyin
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold">拼</span>
                      <span className="hidden sm:inline">{t("songs.detail.pinyin") || "Pinyin"}</span>
                    </button>
                  )}

              {/* Partition 简谱 (chants zh qui en ont une) */}
              {jianpuScore && (
                <button aria-label={"简谱"}
                  onClick={() => setShowScore((v) => !v)}
                  className={`h-9 min-w-9 lg:h-8 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                    showScore
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-bold">谱</span>
                  <span className="hidden sm:inline">简谱</span>
                </button>
              )}

              {/* Menu ⋯ : médias / personnaliser / PDF */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="h-9 w-9 lg:h-8 lg:w-8 rounded-full text-muted-foreground"
                    aria-label={t("common.moreActions")}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {youtubeId && (
                    <DropdownMenuItem onClick={() => setShowVideo((v) => !v)}>
                      {!showVideo ? <Play className="h-3.5 w-3.5 text-muted-foreground" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                      {t("songs.detail.video")}
                    </DropdownMenuItem>
                  )}
                  {song.spotifyUrl && (
                    <DropdownMenuItem asChild>
                      <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer">
                        <Music className="h-3.5 w-3.5 text-muted-foreground" />
                        Spotify
                      </a>
                    </DropdownMenuItem>
                  )}
                  {song.appleMusicUrl && (
                    <DropdownMenuItem asChild>
                      <a href={song.appleMusicUrl} target="_blank" rel="noopener noreferrer">
                        <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Apple Music
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuCheckboxItem
                    checked={chartStyle}
                    onCheckedChange={toggleChartStyle}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {t("performance.chartStyle")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuItem onClick={() => setShowPanel(true)}>
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("songs.detail.customize")}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={downloading} onClick={() => setShowPdfChoice(true)}>
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    {downloading ? "…" : t("songs.detail.downloadPdf") || "PDF"}
                  </DropdownMenuItem>
                  {accesHarmonie.peut && (
                    <DropdownMenuItem onClick={() => setShowIdees(true)}>
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("harmonie.idees")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick= {() => setShowReport(true)}>
                    <TriangleAlert className='h-3.5 w-3.5 text-muted-foreground'/>
                    {t('songs.detail.report')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Embed YouTube */}
          
        </div>
        {youtubeId && showVideo && (
            <div className="print:hidden border-b border-border bg-black/5 px-4 py-3 flex justify-center mt-[82px]">
              <div className="w-full max-w-xl aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={`${song.title} — YouTube`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
            </div>
          </div>
        )}
        {/* Contenu — un tap rappelle la barre d'outils (sans gêner la sélection de texte) */}
        <main
          className="song-zoom px-4 py-6 print:px-0 print:py-2 print:max-w-none max-w-2xl mx-auto overflow-x-auto mt-[48px]"
          style={{
            transform: `scale(${fontScale})`,
            transformOrigin: 'top left  ',
          }}
          onClick={() => {
            if (window.getSelection()?.toString()) return;
            setBarPinned(true);
          }}
        >
          {showScore && jianpuScore ? (
            <JianpuSheet
              entry={jianpuScore}
              title={song.title}
              slug={song.slug}
              playedKey={customize.currentKey !== originalKey ? customize.currentKey : null}
            />
          ) : (
            <SongView
              ast={displayedAST}
              showChords={customize.showChords}
              showPinyin={customize.showPinyin}
              useJianpu={customize.useJianpu}
              structureOverride={structureOverride}
              sectionNotes={sectionsNote}
              sectionNuances={sectionsNuance}
              sectionKeys={sectionsKeys}
              chartStyle={chartStyle}
            />
          )}
        </main>

        {/* Panneau de personnalisation */}
        {showPanel && (
          <CustomizePanel
            originalKey={originalKey}
            isZh={isZh}
            sections={ast.sections}
            state={customize}
            onChange={setCustomize}
            onClose={() => setShowPanel(false)}
          />
        )}
        
        {/* Idées d'harmonie du chant (lot 9) */}
        <IdeesSheet
          open={showIdees}
          onClose={() => setShowIdees(false)}
          slug={song.slug}
          titre={song.title}
          sections={displayedAST.sections}
          tonalite={customize.currentKey}
          tonaliteOrigine={originalKey}
          instrument={instrumentHarmonie}
        />

        <PdfChoiceSheet
          open={showPdfChoice}
          onClose={() => setShowPdfChoice(false)}
          forSetlist={false}
          onDownload={handleDownload}
        />
        {/* Signalement */}
        <ReportDialog
          open={showReport}
          onClose={() => setShowReport(false)}
          kind="song"
          songSlug={song.slug}
          songTitle={song.title}
        />

    </div>
    );
  }
