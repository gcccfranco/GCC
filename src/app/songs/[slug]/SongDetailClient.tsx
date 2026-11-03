"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getChartStylePref, setChartStylePref } from "@/lib/chartStylePref";
import { TOUCHER_44 } from "@/lib/toucher44";
import { PiluleTonalite } from "./_components/PiluleTonalite";
import { ActionsChant } from "./_components/ActionsChant";
import { MenuChant } from "./_components/MenuChant";
import { useRecents } from "./_hooks/useRecents";
import { useTailleTexte } from "./_hooks/useTailleTexte";
import { useBarreRappelee } from "./_hooks/useBarreRappelee";
import { getPersonalKeys, setPersonalKey } from "@/lib/setlist/personalKeys";
import { MIN_FONT_SCALE, MAX_FONT_SCALE } from "@/lib/fontScalePref";
import { SongView } from "@/components/song/SongView";
import { StatistiquesDuChant } from "@/components/songs/StatistiquesDuChant";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { useJianpuScore } from "@/lib/jianpu/images";
import { getJianpuPref, setJianpuPref, sheetEnabled, prefDepuisInterrupteur, type JianpuPref } from "@/lib/jianpu/preference";
import { CustomizePanel, type CustomizeState } from "@/components/customPanel/CustomizePanel";
import type { Song } from "@/types/song";
import { useTranslation } from "react-i18next";
import { extractYouTubeId } from "@/lib/youtube/youtube";
import { buildDefaultStructure } from "@/lib/chordpro/structure";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { keyLike, semitonesTo } from "@/lib/transpose";
import { idDeSection } from "@/lib/setlist/sectionOrigins";
import { useSearchParams } from "next/navigation";
import type { SectionItem } from "@/types/song";
import type { SectionNuance } from "@/types/setList";
import { ReportDialog } from "@/components/report/ReportDialog";
import { PdfChoiceSheet } from "@/components/pdf/PdfChoiceSheet";
import { IdeesSheet } from "@/components/harmonie/IdeesSheet";
import { AccordsProvider } from "@/components/accords/AccordsProvider";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { pdfFileName, type PdfStyle } from "@/lib/pdfStylePref";
import { getSetlist } from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { telechargerBlob } from "@/lib/telecharger";
import type { JianpuChords } from "@/types/setList";

interface SongDetailClientProps {
  song: Song;
}

/** Parse un paramètre d'URL JSON sans jamais lever : les liens partagés
 *  peuvent arriver tronqués (WhatsApp/WeChat) — on retombe sur le défaut. */
function safeParseParam<T>(raw: string | null, fallback: T, valide: (v: unknown) => boolean): T {
  if (!raw) return fallback;
  try {
    const v: unknown = JSON.parse(raw);
    return valide(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

// Gardes de type des paramètres : un JSON valide mais du mauvais type
// (`?structure=null`, `?key=5`) retombe sur le défaut.
const estTexte = (v: unknown) => typeof v === "string";
const estTexteOuNul = (v: unknown) => v === null || typeof v === "string";
const estNombreOuNul = (v: unknown) => v === null || typeof v === "number";
const estListeDeTextes = (v: unknown) => Array.isArray(v) && v.every(estTexte);
const estObjet = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);



/** Version adaptée du chant pour un élément de setlist (Dernière phrase, mode
 *  Adapter, accords retouchés sur le scan) : la page, ouverte depuis la liste,
 *  la relit dans la setlist. Sans session ou si la lecture échoue : rien, le
 *  chant d'origine. */
function useVersionDeLaSetlist(slug: string, setlistId: string | null, position: number | null) {
  const { user } = useAuth();
  const [version, setVersion] = useState<{ source: string | null; retouches?: JianpuChords } | null>(null);
  useEffect(() => {
    if (!setlistId || position === null || !user) return;
    let vivant = true;
    getSetlist(setlistId)
      .then((setlist) => {
        const item = setlist?.items.find((i) => i.position === position);
        if (!vivant || !item) return;
        if (item.type === "fusion") {
          const fs = item.fusionSongs?.find((f) => f.songSlug === slug);
          if (fs?.contentOverride) setVersion({ source: fs.contentOverride });
        } else if (item.songSlug === slug && (item.contentOverride || item.jianpuChords)) {
          setVersion({ source: item.contentOverride ?? null, retouches: item.jianpuChords });
        }
      })
      .catch(() => { /* le chant d'origine */ });
    return () => { vivant = false; };
  }, [slug, setlistId, position, user]);
  return version;
}

  export function SongDetailClient({ song }: SongDetailClientProps) {
    const { t, i18n } = useTranslation();
    const searchParams = useSearchParams();
    // Ouvert depuis une setlist (`?setlist=`) : sa version, et le Retour y ramène.
    const setlistDOrigine = safeParseParam<string | null>(searchParams.get("setlist"), null, estTexteOuNul);
    const versionSetlist = useVersionDeLaSetlist(
      song.slug,
      setlistDOrigine,
      safeParseParam<number | null>(searchParams.get("item"), null, estNombreOuNul),
    );
    const sourceAdaptee = versionSetlist?.source;
    const ast = useMemo(() => parseChordPro(sourceAdaptee ?? song.chordProSource), [sourceAdaptee, song.chordProSource]);
    const isZh = song.language === "zh";
    // Partition 简谱 en image (scan d'origine) — absente pour la plupart des chants
    const jianpuScore = useJianpuScore(song.slug);
    // Affiché par défaut, selon la préférence de l'appareil (partagée avec la
    // setlist et le mode louange) ; le choix du responsable ne vaut que dans
    // la setlist, même ouverte d'ici (O3). Dérivé de la préférence, lue au
    // montage : il ne peut pas s'en écarter.
    const [jianpuPref, setJianpuPrefState] = useState<JianpuPref>("auto");
    useEffect(() => setJianpuPrefState(getJianpuPref()), []);
    const showScore = sheetEnabled(jianpuPref, undefined);
    const choisirScore = (on: boolean) => {
      const next = prefDepuisInterrupteur(on);
      setJianpuPrefState(next);
      setJianpuPref(next);
    };
    const originalKey = ast.metadata.key;
    // Tonalité la plus chantée à GCC : la page y démarre, l'originale reste proposée.
    const recommendedKey = ast.metadata.recommendedKey;
    const defaultKey = recommendedKey ?? originalKey;
    const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;
    const scrollVisible = useScrollDirection();
    // Deux volets (lot U5, docs/spec-deux-volets.md, Q16) : la barre colle en haut du volet
    // de droite au lieu d'être fixe sur toute la largeur (globals.css, `.chants-volets`).
    // Elle glisse au défilement, donc devient le repère de la copie fixe du halo de son
    // fond : celle-ci se recale de la place de la barre à gauche, `--barre-left`.
    const deuxVolets = useDeuxVolets();
    const barreRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const el = barreRef.current;
      if (!el) return;
      if (!deuxVolets) {
        el.style.removeProperty("--barre-left");
        return;
      }
      const update = () => el.style.setProperty("--barre-left", `${el.getBoundingClientRect().left}px`);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener("resize", update);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", update);
      };
    }, [deuxVolets]);
    const { barPinned, setBarPinned } = useBarreRappelee();
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
    useEffect(() => {
      const saved = sessionStorage.getItem("lastListPath");
      if (saved) setBackPath(saved);
    }, []);

    // Mémoriser le chant dans les « récemment consultés » (affichés sur /songs)
    useRecents(song.slug);

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
      () => safeParseParam<string[]>(searchParams.get("structure"), defaultStructure, estListeDeTextes),
      [searchParams, defaultStructure]
    );

    const sectionsNote = useMemo(() => {
      const defaultSectionsNote = Object.fromEntries(
        customize.structure.map((s) => [s.uid, s.note]).filter(([, n]) => n)
      );
      return safeParseParam<Record<string, string>>(searchParams.get("sectionNotes"), defaultSectionsNote, estObjet);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, customize.structure]);

    const sectionsNuance = useMemo(
      () => safeParseParam<Record<string, SectionNuance>>(searchParams.get("sectionNuances"), {}, estObjet),
      [searchParams]
    );

    const sectionsKeys = useMemo(
      () => safeParseParam<Record<string, string>>(searchParams.get('sectionKeys'), {}, estObjet),
      [searchParams]
    )
    useEffect(() => {
      const structure: SectionItem[] = structureOverride.map((uid: string, index: number) => {
        const sectionId = idDeSection(uid);
        const cleanUid = uid.match(/-\d+$/) ? uid : `${sectionId}-${index}`;
        return {
          uid: cleanUid,
          sectionId,
          name: ast.sections.find((s) => s.id === sectionId)?.name ?? "",
          note: sectionsNote[cleanUid] ?? sectionsNote[uid] ?? sectionsNote[sectionId] ?? "",
        };
      });
      setCustomize(prev => ({...prev, structure: structure}))
      // Rejoué quand la version adaptée arrive de la setlist : sa Dernière
      // phrase prend alors son nom dans le panneau.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },[ast]);

    // Ouverte depuis une setlist : la tonalité choisie ici est retenue pour ce
    // chant dans cette setlist, sur cet appareil (reprise en mode louange).
    // Depuis une setlist, l'absence de `key` veut dire la tonalité originale.
    const setlistKey = useMemo(
      () => safeParseParam<string>(searchParams.get("key"), setlistDOrigine ? originalKey : defaultKey, estTexte),
      [searchParams, setlistDOrigine, originalKey, defaultKey]
    );

    // Tant que la tonalité de départ n'est pas appliquée, l'état porte encore la
    // tonalité d'origine : l'enregistrer écraserait le choix retenu.
    const [keyReady, setKeyReady] = useState(false);

    useEffect(() => {
      // Un majeur sur un chant mineur se lit comme son relatif mineur (et inversement).
      const songKey = keyLike(originalKey, (setlistDOrigine && getPersonalKeys(setlistDOrigine)[song.slug]) || setlistKey);
      const diff = semitonesTo(originalKey, songKey);
      setCustomize(prev => ({ ...prev, currentKey: songKey, semitones: diff }));
      setKeyReady(true);
    }, []); // une seule fois au montage

    useEffect(() => {
      if (!setlistDOrigine || !keyReady) return;
      setPersonalKey(setlistDOrigine, song.slug, customize.currentKey === setlistKey ? null : customize.currentKey);
    }, [setlistDOrigine, keyReady, song.slug, setlistKey, customize.currentKey]);

    const displayedAST = useMemo(
      () => transposeAST(ast, customize.semitones, customize.currentKey),
      [ast, customize.semitones, customize.currentKey]
    );

    const { fontScale, changeFontScale } = useTailleTexte();

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
        telechargerBlob(blob, pdfFileName(`${song.slug}-${customize.currentKey}`, style));
      } finally {
        setDownloading(false);
      }
    }

    // « (orig.) » / « (reco.) » après une tonalité, dans la liste et sur ordinateur.
  const keySuffix = (k: string) =>
    (k === originalKey ? " " + t("customize.panel.keyOriginal") : "") +
    (k === recommendedKey ? " " + t("customize.panel.keyRecommended") : "");

  // Libellés par priorité (spec-barre-chant.md, Q4) : tous, puis ceux des actions seuls, puis
  // aucun — le premier niveau qui tient sur la ligne. Mesuré sur la rangée elle-même : ce qu'elle
  // porte varie (Retour, ↺, suffixe de tonalité, Vidéo, Idées, Pinyin), un seuil fixe la ferait
  // déborder ou cacherait des libellés qui tiennent (globals.css, `data-libelles`).
  const rangeeRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = rangeeRef.current;
    if (!el) return;
    // Le débordement dans la marge intérieure ne compte pas dans `scrollWidth` : on compare le
    // bord droit du dernier élément à celui du contenu de la rangée.
    const tient = () => {
      const fin = el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
      return [...el.children].every((c) => c.getBoundingClientRect().right <= fin + 0.5);
    };
    const ajuster = () => {
      for (const niveau of ["2", "1", "0"]) {
        el.dataset.libelles = niveau;
        if (tient()) break;
      }
    };
    ajuster();
    const ro = new ResizeObserver(ajuster);
    ro.observe(el);
    document.fonts?.ready.then(ajuster);
    return () => ro.disconnect();
  }, [isZh, youtubeId, accesHarmonie.peut, customize.currentKey, setlistDOrigine, deuxVolets]);

  // Menu ⋯ (spec-barre-chant.md, Q3, Q5) : Vidéo, PDF et Idées sont dans la barre partout ; plus
  // de Spotify ni d'Apple Music (Timothée, 18/10/2026 : les chants n'ont que YouTube).
  const menuChant = <MenuChant chartStyle={chartStyle} toggleChartStyle={toggleChartStyle} setShowPanel={setShowPanel} setShowReport={setShowReport} />;

  return (
    <AccordsProvider aide chant={{ slug: song.slug, titre: song.title }}>
      <div className="relative min-h-screen print:min-h-0 bg-background" style={{ width: `${100 / fontScale}%`, "--zoom-chant": fontScale } as React.CSSProperties}>
        {/* Barre de contrôles */}
        <div ref={barreRef} data-testid="barre-outils" className={`barre-chant print:hidden fixed left-[var(--barre-laterale)] right-0 top-[var(--nav-h)] [--barre-top:var(--nav-h)] [--barre-left:var(--barre-laterale)] z-10 material-chrome transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : barPinned ? "-translate-y-[calc(var(--nav-h)-var(--sat))]" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
          <FondDeBarre sousNavbar />
          {/* `rangee-chant` : les libellés suivent la place de la rangée (`data-libelles`, plus haut),
              donc celle du volet en deux volets. */}
          <div ref={rangeeRef} className="rangee-chant max-w-2xl mx-auto w-full flex flex-nowrap gap-1 items-center py-2 px-4">
            <Button
              asChild
              variant="secondary"
              className={`retour-chant ${TOUCHER_44} h-9 lg:h-8 px-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground`}
            >
              {/* Deux volets : le Retour n'est montré que vers une setlist (`data-vers-setlist`,
                  globals.css) ; la liste des chants est déjà à gauche. */}
              <Link
                aria-label={t("songs.detail.backToAll")}
                href={setlistDOrigine ? `/setlists/${encodeURIComponent(setlistDOrigine)}` : backPath}
                data-vers-setlist={setlistDOrigine ? "" : undefined}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m6-7l-7 7 7 7" />
                </svg>
                <span className="libelle-chant">{t("songs.detail.backToAll")}</span>
              </Link>
            </Button>
            {/* Transposition rapide */}
            <PiluleTonalite currentKey={customize.currentKey} originalKey={originalKey} keySuffix={keySuffix} setCustomize={setCustomize} />

            <div className="groupe-chant raised ml-auto flex gap-0.5 items-center justify-end rounded-full p-0.5">
              {/* Taille du texte */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={`${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full text-xs font-bold`}
                  onClick={() => changeFontScale(-0.1)}
                  disabled={fontScale <= MIN_FONT_SCALE}
                  aria-label={t("performance.textSmaller")}
                >
                  A−
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={`${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold`}
                  onClick={() => changeFontScale(0.1)}
                  disabled={fontScale >= MAX_FONT_SCALE}
                  aria-label={t("performance.textLarger")}
                >
                  A+
                </Button>
              </div>

              {/* Accords */}
              <button aria-label={t("songs.detail.chords") || "Accords"} aria-pressed={customize.showChords}
                onClick={() => setCustomize((c) => ({ ...c, showChords: !c.showChords }))}
                className={`${TOUCHER_44} h-9 min-w-9 lg:h-8 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150 ease-out ${
                      customize.showChords
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                    <span className="libelle-chant">{t("songs.detail.chords") || "Accords"}</span>
              </button>

              {/* Pinyin (chants zh) */}
              {isZh && (
                    <button aria-label={t("songs.detail.pinyin") || "Pinyin"} aria-pressed={customize.showPinyin}
                      onClick={() => setCustomize((c) => ({ ...c, showPinyin: !c.showPinyin }))}
                      className={`${TOUCHER_44} ml-0.5 h-9 min-w-9 lg:h-8 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150 ease-out ${
                        customize.showPinyin
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold">拼</span>
                      <span className="libelle-chant">{t("songs.detail.pinyin") || "Pinyin"}</span>
                    </button>
                  )}

            </div>

            {/* Dès la tablette debout (spec-barre-chant.md, Q2, Q3) : « faire » à droite d'un filet,
                Vidéo · PDF · Idées d'harmonie · ⋯ ; le menu ne garde que les couleurs,
                Personnaliser et Signaler (globals.css, `.actions-chant`). */}
            <div className="actions-chant ml-auto shrink-0 items-center gap-1">
              <span aria-hidden className="mx-1 h-5 w-px bg-border" />
              <ActionsChant variante="rangee" youtubeId={youtubeId} showVideo={showVideo} setShowVideo={setShowVideo} downloading={downloading} setShowPdfChoice={setShowPdfChoice} accesHarmoniePeut={accesHarmonie.peut} setShowIdees={setShowIdees} menuChant={menuChant} />
            </div>
          </div>
          {/* Téléphone, couché compris (Q5) : les actions sur une seconde rangée, qui défile en
              largeur, colle sous la première et s'escamote avec elle (globals.css, `.actions-tel`). */}
          <div className="actions-tel max-w-2xl mx-auto w-full gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ActionsChant variante="tel" youtubeId={youtubeId} showVideo={showVideo} setShowVideo={setShowVideo} downloading={downloading} setShowPdfChoice={setShowPdfChoice} accesHarmoniePeut={accesHarmonie.peut} setShowIdees={setShowIdees} menuChant={menuChant} />
          </div>

          {/* Embed YouTube */}
          
        </div>
        {youtubeId && showVideo && (
            <div className="video-chant relative print:hidden border-b border-border bg-black/5 px-4 py-3 flex justify-center mt-[82px]">
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
          {/* L'en-tête du site reste au-dessus du scan (K3) ; le segment « 简谱 · Paroles »
              à droite des pastilles règle la préférence de l'appareil (D5). */}
            <SongView
              pageChant
              statistiques={<StatistiquesDuChant slug={song.slug} />}
              bascule={
                jianpuScore ? (
                  <span role="radiogroup" aria-label={t("songs.detail.basculeJianpu")} className="inline-flex h-8 rounded-full bg-secondary p-0.5 print:hidden">
                    {[
                      { on: true, libelle: "简谱" },
                      { on: false, libelle: t("songs.detail.paroles") },
                    ].map(({ on, libelle }) => (
                      <button
                        key={libelle}
                        type="button"
                        role="radio"
                        aria-checked={showScore === on}
                        onClick={(e) => {
                          e.stopPropagation();
                          choisirScore(on);
                        }}
                        className={`h-7 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          showScore === on ? "text-background" : "text-muted-foreground hover:text-foreground"
                        }`}
                        style={showScore === on ? { backgroundColor: "hsl(var(--jianpu-encre))" } : undefined}
                      >
                        {libelle}
                      </button>
                    ))}
                  </span>
                ) : undefined
              }
              corps={
                showScore && jianpuScore ? (
                  // Cale K2 (spec jianpu-integration, O14) : au téléphone, la fin de la feuille remonte au-dessus de la barre d'onglets.
                  <div data-testid="marge-barre" className="max-sm:[body:has([data-testid=barre-du-bas])_&]:pb-[calc(78px+var(--tabbar-bottom))]">
                    <JianpuSheet
                      entry={jianpuScore}
                      title={song.title}
                      slug={song.slug}
                      playedKey={customize.currentKey !== originalKey ? customize.currentKey : null}
                      originalKey={originalKey}
                      chordEdits={versionSetlist?.retouches}
                    />
                  </div>
                ) : undefined
              }
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
    </AccordsProvider>
    );
  }
