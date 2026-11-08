"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { langAccent } from "./langAccent";
import { BarreHaut } from "./BarreHaut";
import { BarreBas } from "./BarreBas";
import { MenuLouange, type MenuId } from "./MenuLouange";
import { BoutonRond, BoutonSurPage, ContenuOutils, ContenuReperes, ContenuSetlist, ContenuTempo, LignesTempo, TitreRubrique, VALEUR } from "./ContenusMenus";
import { FeuilleRole } from "./FeuilleRole";
import { CercleChromatique } from "./CercleChromatique";
import { PageScan } from "./PageScan";
import { PageTexte } from "./PageTexte";
import { useThemeScene } from "./hooks/useThemeScene";
import { useWakeLock } from "./hooks/useWakeLock";
import { useTempoChant } from "./hooks/useTempoChant";
import { useAnnotationsPage } from "./hooks/useAnnotationsPage";
import { Link2, MessageSquare, PenLine, Sun, Moon, Columns2, FileMusic, Languages, Minus, Music, Palette, Plus, Waves } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PerformanceBlock, SectionBlock, JianpuSheetBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import { ecouterCoupure, versionCoupure } from "@/lib/song/coupureSignal";
import { ConteneurCoupure } from "@/components/song/LargeurCoupure";
import { ancreDeLecture, buildPerformanceBlocks, computePageKey, signatureAffichage, type AncreLecture } from "@/lib/performance/blocks";
import { PASTILLE_SUIVANT_H, twoColumnsPossible, type PerfPage } from "@/lib/performance/columns";
import { NEXT_PILL_RESERVE, layoutSong, lireEcran, pageAncree, paginer, replisStructure, sansTransitions, splitSheetPages } from "@/lib/performance/pagination";
import { useJianpuManifest } from "@/lib/jianpu/images";
import { interrupteurAllume, prefDepuisInterrupteur, type JianpuPref } from "@/lib/jianpu/preference";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { SectionView, StructureStrip, TransitionNote } from "@/components/song/SongView";
import { pinyin_font } from "@/components/song/pinyinFont";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { dpOrigin } from "@/lib/setlist/dp";
import { AnnotationCanvas, StrokesLayer } from "./AnnotationCanvas";
import { ANCIEN_RAPPEL } from "@/lib/annotations/strokes";
import { getChartStylePref, setChartStylePref } from "@/lib/chartStylePref";
import { getPersonalKeys, setPersonalKey } from "@/lib/setlist/personalKeys";
import { getTransposedKey, noteToIndex } from "@/lib/transpose";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { getPinyinPref, setPinyinPref } from "@/lib/pinyinPref";
import { classerGeste, largeurZoneLaterale } from "@/lib/performance/gestes";
import { LiseretTempo } from "@/components/performance/LiseretTempo";
import { getTailleAnnotee } from "@/lib/performance/tailleAnnotee";
import { barreDejaVue, marquerBarreVue } from "@/lib/performance/barreVue";
import { FOND_CLAIR, FOND_SOMBRE, TEINTES, garderContraste, getCouleurIcones, setCouleurIcones } from "@/lib/performance/couleurIcones";
import { getMetronomePref, setMetronomePref } from "@/lib/performance/tempo";
import { getFontScalePref, setFontScalePref, MIN_FONT_SCALE, MAX_FONT_SCALE } from "@/lib/fontScalePref";
import { useAuth } from "@/lib/firebase/auth";
import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";

/** Marque de la pastille cochée dans la palette de couleur : double anneau, le même pour les sept. */
const PASTILLE_CHOISIE = "ring-2 ring-foreground ring-offset-2 ring-offset-background";

// ─── TransitionBanner (local copy — same style as PartitionView) ──────────────

function TransitionBanner({ text }: { text: string }) {
  if (!text) {
    // Empty text = fusion separator
    return (
      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 border-t border-dashed border-primary/30" />
        <Link2 className="h-3 w-3 text-foreground/50 shrink-0" />
        <div className="flex-1 border-t border-dashed border-primary/30" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl max-w-sm">
        <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
    </div>
  );
}

// ─── BlockRenderer ────────────────────────────────────────────────────────────

function BlockRenderer({
  block,
  showChordsGlobal,
  showTransitions,
  hideLyrics,
  chartStyle,
  showPinyinGlobal,
  fit = false,
  repeat,
  bandeau = "simple",
  couleurDe,
}: {
  block: PerformanceBlock;
  showChordsGlobal: boolean;
  showTransitions: boolean;
  hideLyrics: boolean;
  chartStyle: boolean;
  showPinyinGlobal: boolean;
  /** Page 简谱 : le scan se met à l'échelle de la hauteur disponible. */
  fit?: boolean;
  /** Vue structure : nombre de passages repliés sur cette section (« ×2 »). */
  repeat?: number;
  /** Bandeau de structure de l'en-tête de chant (D11, D12). */
  bandeau?: Bandeau;
  /** Structure seule : sorte de section dont un Dp emprunte la couleur (son origine). */
  couleurDe?: string;
}) {
  if (block.kind === "song-header") {
    return <SongHeader block={block} bandeau={bandeau} showTransitions={showTransitions} />;
  }
  if (block.kind === "transition-intra") {
    if (!showTransitions) return null;
    return <TransitionNote text={block.text} />;
  }
  if (block.kind === "transition-inter") {
    if (!showTransitions) return null;
    return <TransitionBanner text={block.text} />;
  }
  if (block.kind === "jianpu-sheet") {
    return (
      <JianpuSheet
        entry={block.entry}
        title={block.songTitle}
        slug={block.songSlug}
        playedKey={block.playedKey}
        originalKey={block.originalKey}
        capo={block.capo}
        pageIndex={block.pageIndex}
        layout={fit ? "fit" : "flow"}
      />
    );
  }
  return (
    <SectionView
      section={block.section}
      language={block.language}
      showChords={block.chordsEnabled && showChordsGlobal}
      showPinyin={block.showPinyin && showPinyinGlobal}
      useJianpu={false}
      hideLyrics={hideLyrics}
      note={block.note}
      nuance={block.nuance}
      keyChange={block.keyChange}
      songSourceLabel={block.songSourceLabel}
      chartStyle={chartStyle}
      nuanceSize="lg"
      repeat={repeat ?? block.repeat}
      occurrenceUids={block.occurrenceUids}
      couleurDe={couleurDe}
      // Lot CV : les exceptions de mots chinois du chant (motsChinois.ts) s'appliquent au pupitre comme sur la page du chant.
      slug={block.songSlug}
    />
  );
}


/** Bandeau de pastilles en tête de chant : sans détails en Ordre joué (D12),
 *  avec notes et transitions en Sections uniques (D11), aucun en Structure
 *  seule (la structure est déjà en grand). */
type Bandeau = "aucun" | "simple" | "details";


function SongHeader({ block, bandeau, showTransitions }: { block: SongHeaderBlock; bandeau: Bandeau; showTransitions: boolean }) {
  const { t } = useTranslation();
  // Mesuré avec l'en-tête : en deux colonnes, il reste en pleine largeur au-dessus.
  const strip = bandeau !== "aucun" && block.steps?.length ? (
    <StructureStrip steps={sansTransitions(block.steps, showTransitions)} details={bandeau === "details"} className="mt-3" />
  ) : null;
  if (block.fusionSongs?.length) {
    return (
      <div data-entete-chant className="mb-3 pb-3 border-b border-border">
        <div className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {block.position}
          </span>
          <Link2 className="h-3.5 w-3.5 text-foreground shrink-0 mt-1" />
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
            {block.fusionSongs.map((s, i) => (
              <span
                key={i}
                className="text-[17px] font-bold text-foreground leading-tight uppercase tracking-tight"
              >
                {s.title}
                <span
                  className="ml-1.5 font-mono text-xs font-normal normal-case"
                  style={{ color: langAccent(s.language) }}
                >
                  {s.key}
                </span>
              </span>
            ))}
          </div>
        </div>
        {strip}
      </div>
    );
  }
  return (
    <div data-entete-chant className="mb-3 pb-3 border-b border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
              {block.position}
            </span>
            <h2 className="text-[22px] font-bold text-foreground leading-tight uppercase tracking-tight truncate">
              {block.title}
            </h2>
          </div>
          {block.titlePinyin && (
            <p className={`text-xs text-muted-foreground mt-0.5 ml-7 ${pinyin_font.className}`}>{block.titlePinyin}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 ml-7">{block.artist}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          {block.capo ? (
            <span className="text-xs font-bold font-mono border-2 border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
              {t("performance.capoBadge", { n: block.capo })}
            </span>
          ) : null}
          <span className="text-sm font-bold font-mono border-2 rounded-full px-2.5 py-0.5"
            style={{ color: langAccent(block.language), borderColor: langAccent(block.language) }}>
            {block.songKey}
          </span>
          {block.setlistKey && (
            <span className="text-xs font-semibold text-muted-foreground">
              {t("performance.personalKey", { key: block.setlistKey })}
            </span>
          )}
        </div>
      </div>
      {strip}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
// Pages en une et en deux colonnes (`PerfPage`) : src/lib/performance/columns.ts.

// Sections uniques et Ordre joué : place du rappel de structure (pastille de 30 px, nuance de
// 12 px dessous, 8 px de marge) en haut des pages 2 et suivantes d'un chant (D11, RS-B).
const RAPPEL_RESERVE = 50;
/** Rappel de structure d'une page 2 ou suivante (Sections uniques) : titre du chant
 *  en tête dès 640 px, puis les pastilles ; sous 640 px, les seules pleines. */
function RappelRangee({ titre, steps, pleines, rappel }: { titre?: string; steps: SectionOccurrence[]; pleines: ReadonlySet<string>; rappel: "joue" | "unique" }) {
  return (
    <div className="flex items-start gap-3">
      {titre && (
        <span className="hidden max-w-[16rem] shrink-0 truncate text-[13px] font-semibold uppercase leading-[30px] tracking-wide text-muted-foreground sm:block">
          {titre}
        </span>
      )}
      <StructureStrip className="min-w-0 flex-1" steps={steps} compacte pleines={pleines} rappel={rappel} />
    </div>
  );
}
// Tablette en portrait (lot L6) : bande fixe en bas, début de la page suivante
// (≈ trois lignes de paroles), sous une ligne bleue de 2 px. Hauteur en px de mise en page :
// la pagination la retranche de son budget, le rendu la met à l'échelle comme le texte.
const APERCU_H = 96;
// Repli : au-delà de cette part de la hauteur de l'écran, la bande ne s'affiche pas.
const APERCU_PART_MAX = 0.25;



// ─── Main component ───────────────────────────────────────────────────────────

// Presets de rôle : raccourcis vers une combinaison accords/paroles. Mémorisé
// par appareil ; un réglage manuel des toggles désélectionne le preset.
type RolePreset = "pianiste" | "guitariste" | "presidence" | "choriste" | "batteur";
const ROLE_PRESETS: Record<RolePreset, { chords: boolean; hideLyrics: boolean }> = {
  pianiste: { chords: true, hideLyrics: false },
  guitariste: { chords: true, hideLyrics: false },
  presidence: { chords: false, hideLyrics: false },
  choriste: { chords: false, hideLyrics: false },
  batteur: { chords: false, hideLyrics: true },
};
const ROLE_PRESET_IDS = Object.keys(ROLE_PRESETS) as RolePreset[];

interface PerformanceModeProps {
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  /** Accords changés sur la page setlist juste avant (absent sinon) : ils
   *  l'emportent sur le rôle mémorisé, qui est alors désélectionné. */
  initialShowChords?: boolean;
  setlistId: string;
  setlistTitle: string;
  /** Date de la setlist (AAAA-MM-JJ), affichée en tête du menu Setlist ; absente = pas de date. */
  setlistDate?: string;
  /** Affichage (D15) : la préférence `partition-layout`, tenue par la page
   *  setlist pour que son menu Affichage soit à jour en sortant du mode. */
  affichage: PartitionLayout;
  onAffichageChange: (v: PartitionLayout) => void;
  /** Préférence « Partition 简谱 » de l'appareil : l'état de la page setlist,
   *  pour que son menu soit à jour en sortant du mode louange. */
  jianpuPref: JianpuPref;
  onJianpuPrefChange: (v: JianpuPref) => void;
  /** La setlist vient de la copie hors ligne : « Annoter » est masqué et rien ne s'enregistre. */
  horsLigne?: boolean;
  onClose: () => void;
}

export function PerformanceMode({
  items,
  contents,
  initialShowChords,
  setlistId,
  setlistTitle,
  setlistDate,
  affichage,
  onAffichageChange,
  jianpuPref,
  onJianpuPrefChange,
  horsLigne = false,
  onClose,
}: PerformanceModeProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [storedRole] = useState<RolePreset | null>(() => {
    try {
      const v = localStorage.getItem("perf-role-preset");
      return v && v in ROLE_PRESETS ? (v as RolePreset) : null;
    } catch {
      return null;
    }
  });
  // Rôle contredit par les accords choisis juste avant sur la page setlist :
  // désélectionné, et l'affichage reprend celui de la page (paroles comprises).
  // Même chose quand l'Affichage de l'appareil contredit le rôle (D15, dans les
  // deux sens) : le Batteur hors Structure seule, un autre rôle en Structure seule.
  const roleOverridden =
    storedRole !== null &&
    ((initialShowChords !== undefined && ROLE_PRESETS[storedRole].chords !== initialShowChords) ||
      (storedRole === "batteur") !== (affichage === "structure"));
  const [rolePreset, setRolePreset] = useState<RolePreset | null>(roleOverridden ? null : storedRole);
  const [showChords, setShowChords] = useState(
    initialShowChords ?? (storedRole && !roleOverridden ? ROLE_PRESETS[storedRole].chords : true),
  );
  const [showTransitions, setShowTransitions] = useState(true);
  const [hideLyrics, setHideLyrics] = useState(() => {
    if (roleOverridden) return false;
    if (rolePreset) return ROLE_PRESETS[rolePreset].hideLyrics;
    try {
      return localStorage.getItem("perf-hide-lyrics") === "1";
    } catch {
      return false;
    }
  });
  // Style « chart » : couleurs par type de section + accords neutres (cf.
  // SectionView). Préférence par appareil partagée avec la fiche chant et la
  // vue setlist (chartStylePref).
  const [chartStyle, setChartStyle] = useState(() => getChartStylePref());
  // Pinyin (chants zh) : masquable pour qui lit les caractères. Même
  // préférence que la vue setlist (pinyinPref). Défaut : affiché.
  const [showPinyin, setShowPinyin] = useState(() => getPinyinPref());
  const toggleShowPinyin = (v: boolean) => {
    setShowPinyin(v);
    setPinyinPref(v);
  };
  // Capo par chant (slug → frets), mémorisé sur l'appareil. Appliqué aux
  // accords uniquement quand le preset Guitariste est actif.
  const [capos, setCapos] = useState<Record<string, number>>(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem("perf-capos") ?? "{}");
      if (typeof raw !== "object" || raw === null) return {};
      return Object.fromEntries(
        Object.entries(raw).filter(([, v]) => typeof v === "number" && v >= 1 && v <= 11),
      ) as Record<string, number>;
    } catch {
      return {};
    }
  });
  const [annotateMode, setAnnotateMode] = useState(false);
  // Loupe du mode annotation : grossissement (≠ taille du texte, ne re-pagine pas)
  // + déplacement. Possédée ici car elle agrandit aussi le texte (transform CSS).
  const [annotZoom, setAnnotZoom] = useState(1);
  const [annotPan, setAnnotPan] = useState({ x: 0, y: 0 });
  // Barre visible à la toute première ouverture du mode sur l'appareil, masquée ensuite (drapeau posé par l'effet ci-dessous).
  const [showChrome, setShowChrome] = useState(() => !barreDejaVue());
  // FS-B : un seul menu ouvert à la fois ; lu par les trois gardes (toucher, clavier, Échap). `popoverRef` : la valeur
  // à jour pour les gestionnaires de pointeur, qui ne se recréent pas à chaque rendu.
  const [popoverOuvert, setPopoverOuvert] = useState<MenuId | null>(null);
  const popoverRef = useRef<MenuId | null>(null);
  popoverRef.current = popoverOuvert;
  // Le menu était ouvert au pointerdown en cours : le pointerup qui suit ne tourne pas la page et ne bascule pas la barre.
  // On garde l'évènement (`t` = horodatage du pointerdown) : le pointerdown suivant, menu fermé, remet le drapeau à zéro,
  // il n'avale donc qu'UN toucher (un pointerdown sans pointerup, ou un pointerup du stylet, ne le laisse pas collé).
  const menuAuToucher = useRef<{ t: number } | null>(null);
  const basculerMenu = useCallback((id: MenuId) => setPopoverOuvert((cur) => (cur === id ? null : id)), []);
  const fermerMenu = useCallback((id: MenuId) => setPopoverOuvert((cur) => (cur === id ? null : cur)), []);
  // Un toucher hors du menu le ferme, y compris sur les barres (qui arrêtent la propagation et cachent le toucher à Radix,
  // écouté plus haut dans le document) : écoute en capture. Sur la page, il est marqué pour que son pointerup ne tourne rien.
  useEffect(() => {
    if (popoverOuvert === null) return;
    const hors = (e: PointerEvent) => {
      const cible = e.target instanceof Element ? e.target : null;
      if (e.pointerType === "pen") return;
      if (!cible || cible.closest("[data-menu-louange], [data-menu-declencheur], [data-vaul-overlay]")) return;
      if (!cible.closest("[data-barre-haut], [data-barre-bas]")) menuAuToucher.current = { t: e.timeStamp };
      setPopoverOuvert(null);
    };
    document.addEventListener("pointerdown", hors, true);
    return () => document.removeEventListener("pointerdown", hors, true);
  }, [popoverOuvert]);
  // Raccourcis clavier du menu Outils : sur ordinateur (pointeur précis) ou dès qu'une touche a été frappée dans le mode.
  const [clavierVu, setClavierVu] = useState(false);
  useEffect(() => {
    // Une touche de navigation ou un caractère : ni Échap, ni une touche de modification seule.
    const vu = (e: KeyboardEvent) => {
      const navigation = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key);
      if (!navigation && e.key.length !== 1) return;
      setClavierVu(true);
      window.removeEventListener("keydown", vu);
    };
    window.addEventListener("keydown", vu);
    return () => window.removeEventListener("keydown", vu);
  }, []);
  const [pointeurFin] = useState(() => {
    try { return window.matchMedia("(pointer: fine)").matches; } catch { return false; }
  });
  // Couleur des icônes (FS-A) : le choix de l'appareil, corrigé pour garder 4,5:1 contre le fond de la barre.
  const [couleurChoix, setCouleurChoix] = useState(getCouleurIcones);
  const [cercleOuvert, setCercleOuvert] = useState(false);
  // Pastille cochée de la palette : « autre » quand le cercle est ouvert ou que la couleur n'est pas une teinte prête.
  const teinteChoisie = cercleOuvert ? "autre" : TEINTES.find((c) => c.hex === couleurChoix)?.id ?? "autre";
  const choisirCouleur = useCallback((hex: string) => {
    setCouleurChoix(hex);
    setCouleurIcones(hex);
  }, []);
  const [layout, setLayout] = useState<PerfPage[]>([]);
  // Nombre de paginations publiées (attribut de test : tourner la page ne doit pas la relancer).
  const [passesPagination, setPassesPagination] = useState(0);
  // Pagination d'avant le rappel refait (lot RS-C) : retrouve les annotations sous leurs anciennes clés.
  const [layoutAncien, setLayoutAncien] = useState<PerfPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [remeasureKey, setRemeasureKey] = useState(0);
  // Même taille que la page du chant (fontScalePref).
  const [fontScale, setFontScale] = useState(() => getFontScalePref());
  // Métronome visuel (L4) : réglage par appareil, inactif par défaut ; tempo réglé par chant
  // relu du stockage à chaque rendu (`tempoTick` relance le rendu après une écriture).
  const [metronome, setMetronomeState] = useState(() => getMetronomePref());
  const setMetronome = (v: boolean) => { setMetronomeState(v); setMetronomePref(v); };

  // ── Thème scène (indépendant du thème du site, mémorisé) ──
  const { stageTheme, setTheme } = useThemeScene();
  // La couleur affichée : le choix, corrigé pour garder 4,5:1 contre le fond. Posée sur la racine du mode et sur chaque menu (Portal).
  const couleurIcones = garderContraste(couleurChoix, stageTheme === "dark" ? FOND_SOMBRE : FOND_CLAIR);

  const toggleHideLyrics = useCallback((v: boolean) => {
    setHideLyrics(v);
    try { localStorage.setItem("perf-hide-lyrics", v ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  const toggleChartStyle = useCallback((v: boolean) => {
    setChartStyle(v);
    setChartStylePref(v);
  }, []);

  // Choisir ou retirer un rôle vaut réponse à la question de la première
  // ouverture : un appareil qui retire son rôle n'est pas réinterrogé.
  const clearRolePreset = useCallback(() => {
    setRolePreset(null);
    try {
      localStorage.removeItem("perf-role-preset");
      localStorage.setItem("perf-role-asked", "1");
    } catch { /* ignore */ }
  }, []);

  const applyRolePreset = useCallback((id: RolePreset) => {
    const p = ROLE_PRESETS[id];
    setShowChords(p.chords);
    toggleHideLyrics(p.hideLyrics);
    setRolePreset(id);
    // Le Batteur pose Structure seule ; un autre rôle ramène l'ordre joué
    // depuis Structure seule seulement (O5) : Sections uniques reste.
    if (id === "batteur") onAffichageChange("structure");
    else if (affichage === "structure") onAffichageChange("played");
    try {
      localStorage.setItem("perf-role-preset", id);
      localStorage.setItem("perf-role-asked", "1");
    } catch { /* ignore */ }
  }, [toggleHideLyrics, affichage, onAffichageChange]);

  // Première ouverture sur cet appareil : on demande le rôle, retenu ensuite
  // (« Aucun » aussi). Refermer la feuille sans répondre la reporte à la
  // prochaine ouverture.
  const [askRole, setAskRole] = useState(() => {
    try {
      return !localStorage.getItem("perf-role-preset") && !localStorage.getItem("perf-role-asked");
    } catch {
      return false;
    }
  });
  const answerRole = useCallback((id: RolePreset | null) => {
    if (id) applyRolePreset(id);
    else clearRolePreset();
    setAskRole(false);
  }, [applyRolePreset, clearRolePreset]);

  const capoActive = rolePreset === "guitariste";

  const setCapo = useCallback((slug: string, frets: number) => {
    setCapos((prev) => {
      const next = { ...prev };
      if (frets <= 0) delete next[slug];
      else next[slug] = Math.min(frets, 11);
      try { localStorage.setItem("perf-capos", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Vue ossature : Structure seule, ou paroles ET accords masqués (O7, le
  // chemin d'avant l'Affichage). Un chant par page, structure en colonnes
  // adaptatives, texte réduit au besoin pour tout faire tenir.
  const structureMode = affichage === "structure" || (hideLyrics && !showChords);
  const affichageVu: PartitionLayout = structureMode ? "structure" : affichage;
  const bandeau: Bandeau = affichageVu === "structure" ? "aucun" : affichageVu === "unique" ? "details" : "simple";
  // En vue ossature, ni paroles ni accords, quel que soit le chemin.
  const lyricsHidden = hideLyrics || structureMode;
  const chordsShown = showChords && !structureMode;

  // Toucher Affichage désélectionne le rôle, comme « Accords ». Quitter la
  // vue ossature rend paroles et accords : sinon le chemin d'O7 la
  // ramènerait aussitôt.
  const changeAffichage = useCallback((v: PartitionLayout) => {
    if (v !== "structure" && structureMode) {
      toggleHideLyrics(false);
      setShowChords(true);
    }
    clearRolePreset();
    onAffichageChange(v);
  }, [structureMode, toggleHideLyrics, clearRolePreset, onAffichageChange]);
  // « Accords » et « Masquer les paroles » portent sur le corps : les toucher
  // depuis Structure seule ramène l'ordre joué, comme le faisait « Accords »
  // pour le batteur avant l'Affichage.
  const quitterStructureSeule = () => {
    if (affichage === "structure") onAffichageChange("played");
  };

  // Deux colonnes (lot U5, docs/spec-deux-volets.md Q2–Q3) : sur tablette couchée
  // et sur ordinateur, si la largeur de mise en page le permet, hors vue structure.
  // Automatique ; l'interrupteur « 2 colonnes » est retenu par appareil
  // (`perf-two-columns` : "1", "0", absent = automatique).
  const [ecran, setEcran] = useState(lireEcran);
  const [twoColumnsPref, setTwoColumnsPref] = useState<string | null>(() => {
    try {
      return localStorage.getItem("perf-two-columns");
    } catch {
      return null;
    }
  });
  const twoColumnsAvailable = twoColumnsPossible(ecran.grand, ecran.largeur, fontScale) && !structureMode;
  const twoColumns = twoColumnsAvailable && twoColumnsPref !== "0";
  // Aperçu de la page suivante (L6) : tablette portrait, hors vue structure, et
  // seulement si la bande tient (≤ 25 % de la hauteur) ; sinon la pagination garde son budget.
  const apercuActif =
    ecran.tabletteVerticale && !structureMode &&
    APERCU_H * fontScale <= ecran.hauteur * APERCU_PART_MAX;
  const toggleTwoColumns = useCallback(() => {
    const next = twoColumns ? "0" : "1";
    setTwoColumnsPref(next);
    try { localStorage.setItem("perf-two-columns", next); } catch { /* ignore */ }
  }, [twoColumns]);
  // Indices à plat par page (navigation, sommaire, clé d'annotations).
  const pages = useMemo(
    () => layout.map((p) => (p.header != null ? [p.header, ...p.cols.flat()] : p.cols.flat())),
    [layout],
  );

  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blockColRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Page lue et son premier bloc : ancre de la lecture quand la mise en page change.
  // Un indice ne survit pas à une reconstruction des blocs (changement
  // d'affichage) : l'ancre porte aussi l'identité du bloc (chant, occurrences)
  // et les blocs de la mise en page où elle a été prise.
  const readingRef = useRef<{ page: number; block: number | undefined; blocks?: PerformanceBlock[]; ancre?: AncreLecture | null }>({
    page: 0,
    block: undefined,
  });
  const layoutBlocksRef = useRef<PerformanceBlock[] | null>(null);
  // Hauteur du rappel de chaque chant (Sections uniques, Ordre joué), mesurée en copie.
  const rappelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const measureInnerRef = useRef<HTMLDivElement | null>(null);
  // Hauteur des barres, pour qu'une page de scan tienne entre elles (K1).
  const barreHautRef = useRef<HTMLDivElement>(null);
  const barreBasRef = useRef<HTMLDivElement>(null);
  const [barres, setBarres] = useState({ haut: 0, bas: 0 });
  // Pastille « Ensuite » dans le flux (dimanche-11) : barre du bas affichée, si la barre (opaque) la couvre, elle
  // s'efface et la pastille flottante se pose au-dessus de la barre, comme avant ; barre escamotée, elle reste dans le flux.
  const refPastilleFlux = useRef<HTMLButtonElement>(null);
  const [pastilleCouverte, setPastilleCouverte] = useState(false);
  // Lot CV : les lignes affichées posent leur coupure après le contrôle de la pastille (effets des enfants) : on le refait.
  const [coupureEcran, setCoupureEcran] = useState(0);
  useLayoutEffect(() => {
    const haut = barreHautRef.current;
    const bas = barreBasRef.current;
    if (!haut || !bas) return;
    const mesurer = () => setBarres({ haut: haut.offsetHeight, bas: bas.offsetHeight });
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(haut, { box: "border-box" });
    ro.observe(bas, { box: "border-box" });
    return () => ro.disconnect();
  }, []);
  const tapStart = useRef<{ x: number; y: number; time: number } | null>(null);

  // Annotations vectorielles de la page courante (toujours chargées, pas
  // seulement en mode annotation) + visibilité (œil dans les réglages)
  // Hauteur du rappel de la page affichée (px d'écran, marge comprise) : les traits
  // se replacent selon le rappel qu'il y avait à leur tracé (lot RS-C).
  const rappelRef = useRef<HTMLDivElement>(null);
  const [rappelEcran, setRappelEcran] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Build flat block list (memoised — only changes when content changes)
  const jianpuManifest = useJianpuManifest();
  // Le réglage 简谱 n'apparaît que si un chant de la setlist a un scan.
  const hasJianpuSheets = useMemo(
    () => items.some((it) => it.songSlug && jianpuManifest?.[it.songSlug]),
    [items, jianpuManifest],
  );
  // Tonalités choisies sur la page du chant, pour cette setlist et cet appareil.
  const [personalKeys, setPersonalKeysState] = useState(() => getPersonalKeys(setlistId));
  const resetPersonalKey = useCallback((slug: string) => {
    setPersonalKey(setlistId, slug, null);
    setPersonalKeysState((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, [setlistId]);

  const choisirCle = useCallback((slug: string, cle: string) => {
    setPersonalKey(setlistId, slug, cle);
    setPersonalKeysState((prev) => ({ ...prev, [slug]: cle }));
  }, [setlistId]);

  const blocks = useMemo(
    // always build with chords=true for stable UIDs (le capo et la tonalité ne
    // changent ni le nombre ni l'ordre des blocs : les UIDs restent stables)
    () => buildPerformanceBlocks(items, contents, true, capoActive ? capos : undefined, jianpuManifest, jianpuPref, personalKeys, { affichage: affichageVu }),
    [items, contents, capoActive, capos, jianpuManifest, jianpuPref, personalKeys, affichageVu],
  );

  const { repeatCount, repeatHidden } = useMemo(
    () => replisStructure(blocks, structureMode, showTransitions, t),
    [blocks, structureMode, showTransitions, t],
  );

  // Re-measure when a setting affecting heights changes
  useEffect(() => {
    setRemeasureKey((k) => k + 1);
  }, [showChords, showTransitions, hideLyrics, fontScale, chartStyle, showPinyin]);

  // Re-measure on viewport resize / orientation change
  useEffect(() => {
    const onResize = () => {
      setEcran(lireEcran());
      setRemeasureKey((k) => k + 1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lot CV : les lignes recalculent leur coupure après les polices, un changement de largeur ou de corps ;
  // la pagination lit des hauteurs qui en dépendent. Quand une coupure change, on remesure (regroupé à
  // l'image suivante ; sans boucle : une coupure ne change que si sa largeur, son corps ou son contenu ont changé).
  useEffect(() => {
    let raf = 0;
    const off = ecouterCoupure((mesure) => {
      // Une ligne affichée qui se coupe ne change pas la pagination, seulement la place de la pastille (plus bas).
      if (!mesure) {
        setCoupureEcran((n) => n + 1);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRemeasureKey((k) => k + 1));
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Measure block heights → compute pages
  useEffect(() => {
    let annule = false;
    const run = async () => {
      await document.fonts.ready;
      // Lot CV-3 : les lignes posent leur coupure après les polices ; on attend qu'elle ne bouge plus (au plus 6
      // tours de deux images) avant de lire les hauteurs, pour ne publier qu'une pagination et une clé de page.
      for (let n = 0; n < 6; n++) {
        const v = versionCoupure();
        await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
        if (v === versionCoupure()) break;
      }
      if (annule) return;
      // Budget de hauteur en px CSS à l'échelle 1 (la mesure se fait hors
      // échelle) : hauteur visible ÷ fontScale, moins les paddings RÉELS du
      // conteneur de mesure (py-4 + safe areas), et une marge de sécurité pour
      // la marge haute du 1er bloc d'une page. Les paddings sont lus calculés
      // (px résolus) : fiable sur tout appareil, contrairement au parseFloat
      // d'une variable CSS env() dont la résolution dépend du navigateur.
      const safety = 24;
      const mcs = measureInnerRef.current ? getComputedStyle(measureInnerRef.current) : null;
      const padTop = mcs ? parseFloat(mcs.paddingTop) || 0 : 16;
      const padBottom = mcs ? parseFloat(mcs.paddingBottom) || 0 : 16;
      const viewportH = window.innerHeight / fontScale - padTop - padBottom - safety - (apercuActif ? APERCU_H : 0);
      const contentW = mcs && measureInnerRef.current
        ? measureInnerRef.current.clientWidth - parseFloat(mcs.paddingLeft) - parseFloat(mcs.paddingRight)
        : window.innerWidth / fontScale;
      // Hauteur réellement occupée par chaque bloc, marges verticales comprises :
      // delta entre le haut du bloc et le haut du bloc suivant dans le flux.
      const flowHeights = (rects: (DOMRect | null)[]) =>
        rects.map((r, i) => {
          if (!r) return 0;
          const next = rects[i + 1];
          return next ? Math.max(0, next.top - r.top) : r.height;
        });
      const rects = blocks.map((_, i) => blockRefs.current[i]?.getBoundingClientRect() ?? null);
      const heights = flowHeights(rects);
      // Deux colonnes : hauteurs à la largeur d'une colonne (seconde copie de
      // mesure). Absente : une colonne.
      const colRects = twoColumns ? blocks.map((_, i) => blockColRefs.current[i]?.getBoundingClientRect() ?? null) : [];
      const heightsColumn = colRects.some(Boolean) ? flowHeights(colRects) : [];
      // Vue structure : largeur naturelle des sections (mesurées sans retour à la ligne).
      const widths = rects.map((r, i) => (structureMode && blocks[i]?.kind === "section" ? r?.width ?? 0 : 0));
      const kindOf = (i: number) => blocks[i]?.kind;
      // Sections uniques : la réserve de chaque chant est la hauteur de son
      // rappel (marge comprise), au moins la rangée de nuances (RAPPEL_RESERVE). Il passe à la
      // ligne quand le texte grossit (huit pastilles ≈ 249 px de large).
      const reserves = new Map<number, number>();
      if (affichageVu === "unique" || affichageVu === "played") {
        blocks.forEach((b, i) => {
          if (b.kind !== "song-header") return;
          const mesuree = rappelRefs.current[i]?.getBoundingClientRect().height ?? 0;
          reserves.set(i, Math.max(RAPPEL_RESERVE, Math.ceil(mesuree)));
        });
      }
      const enteteDe = new Map<number, number>();
      let courant = -1;
      blocks.forEach((b, i) => {
        if (b.kind === "song-header") courant = i;
        enteteDe.set(i, courant);
      });
      const ctxPagination = { blocks, heights, heightsColumn, viewportH, twoColumns, enteteDe, pastille: PASTILLE_SUIVANT_H };
      let ancienne: PerfPage[] = [];
      let computed: PerfPage[];
      if (structureMode) {
        // Un chant par page : on regroupe l'en-tête et ses sections, puis layoutSong.
        // Un chant joué sur son 简谱 n'a pas de section à mettre en ossature :
        // sa partition occupe la page, comme en mode normal.
        const groups: number[][] = [];
        blocks.forEach((b, i) => {
          if (b.kind === "song-header" || groups.length === 0) groups.push([]);
          groups[groups.length - 1].push(i);
        });
        computed = groups.flatMap((group) =>
          splitSheetPages(group, kindOf, (flow) => {
            const headerIdx = blocks[flow[0]].kind === "song-header" ? flow[0] : null;
            const body = headerIdx != null ? flow.slice(1) : flow;
            return [layoutSong(headerIdx, body, heights, widths, viewportH, contentW)];
          }),
        );
      } else {
        computed = paginer(reserves, ctxPagination);
        // Lot RS-C : la pagination d'avant le rappel refait (Sections uniques : 32 px ; Ordre joué : rien),
        // pour retrouver les annotations posées sous les anciennes clés de page.
        const anciennes = new Map<number, number>();
        if (affichageVu === "unique") reserves.forEach((_, i) => anciennes.set(i, ANCIEN_RAPPEL));
        ancienne = paginer(anciennes, ctxPagination);
      }
      // Lot CV : une page dont une ligne n'est pas posée en une rangée (lue dans la copie de mesure, à la largeur
      // où la page est posée) a une autre composition qu'avant : sa clé de page porte « v2 ».
      const ligneCoupee = (i: number, colonne: boolean) => {
        const el = (colonne ? blockColRefs.current[i] : blockRefs.current[i]) ?? blockRefs.current[i];
        return !!el && Array.from(el.querySelectorAll("[data-coupe]")).some((n) => !(n.getAttribute("data-coupe") ?? "une").startsWith("une"));
      };
      computed = computed.map((p) => {
        const colonne = !!p.twoColumns && heightsColumn.length > 0;
        const idx = [...(p.header != null ? [p.header] : []), ...p.cols.flat()];
        const coupe = !p.fit && idx.some((i) => ligneCoupee(i, colonne && i !== p.header));
        return coupe ? { ...p, coupe } : p;
      });
      layoutBlocksRef.current = blocks;
      setLayout(computed);
      setLayoutAncien(ancienne);
      setPassesPagination((n) => n + 1);
      // La lecture reste à l'écran quand la mise en page change (« 2 colonnes »,
      // rotation, taille du texte) : la page qui contient le premier bloc de la
      // page lue. Une page tournée entre-temps n'est pas déplacée. Si les blocs
      // ont été reconstruits (changement d'affichage), l'indice ne désigne plus
      // le même bloc : on retrouve la section du même chant qui joue les mêmes
      // occurrences, sinon l'en-tête de ce chant.
      setCurrentPage((prev) => {
        return pageAncree(computed, blocks, prev, readingRef.current);
      });
    };
    run();
    return () => {
      annule = true;
    };
  }, [blocks, remeasureKey, fontScale, structureMode, twoColumns, affichageVu, apercuActif]);

  // Vue structure agrandie : la mesure se fait à l'échelle 1, mais à l'écran
  // le corps agrandi dispose d'une largeur réduite d'autant, et un libellé
  // chargé de nuances peut y passer à la ligne — la page déborderait en bas.
  // On lit donc le rendu réel et on réduit l'échelle jusqu'à ce que tout
  // tienne. Réduction seulement : la boucle converge.
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const scaledBodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const page = layout[currentPage];
    const area = contentAreaRef.current;
    const body = scaledBodyRef.current;
    if (!structureMode || !page || page.fit || !area || !body || annotZoom !== 1) return;
    // Hauteurs en px de mise en page (hors échelle du texte) : clientHeight et
    // offsetHeight ignorent les transform, getBoundingClientRect non.
    const bodyTop = (body.getBoundingClientRect().top - area.getBoundingClientRect().top) / fontScale;
    const room = area.clientHeight - parseFloat(getComputedStyle(area).paddingBottom) - bodyTop - NEXT_PILL_RESERVE;
    const used = body.offsetHeight * page.scale;
    if (used <= room + 0.5 || page.scale <= 0.3) return;
    const scale = Math.max(0.3, page.scale * (room / used) * 0.98);
    setLayout((prev) => prev.map((p, i) => (i === currentPage ? { ...p, scale } : p)));
  }, [layout, currentPage, structureMode, fontScale, annotZoom]);

  const changeFontScale = useCallback((delta: number) => {
    setFontScale((s) => {
      const next = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round((s + delta) * 10) / 10));
      setFontScalePref(next);
      return next;
    });
  }, []);

  // L5 : applique une taille de texte précise (retour à la taille d'annotation d'un chant).
  const appliquerTaille = useCallback((v: number) => {
    setFontScale(v);
    setFontScalePref(v);
  }, []);

  // Wake lock
  useWakeLock();

  // Barre : pas de minuterie, elle reste jusqu'au toucher au centre (lot L1).
  const annotateModeRef = useRef(annotateMode);
  annotateModeRef.current = annotateMode;

  useEffect(() => { marquerBarreVue(); }, []);

  // Entrée et sortie du mode annotation : la barre est visible. Rien au montage (barre masquée dès la 2ᵉ ouverture).
  const annotatePrec = useRef(annotateMode);
  useEffect(() => {
    if (annotatePrec.current === annotateMode) return;
    annotatePrec.current = annotateMode;
    setShowChrome(true);
  }, [annotateMode]);

  // Loupe : retour à 100 % à chaque changement de page et à l'entrée/sortie du
  // mode annotation (vue prévisible, on ne reste pas zoomé sur la page suivante).
  useEffect(() => {
    setAnnotZoom(1);
    setAnnotPan({ x: 0, y: 0 });
  }, [currentPage, annotateMode]);

  // ── Annotation persistence ──────────────────────────────────────────────────

  const currentPageIndices = pages[currentPage] ?? [];
  useEffect(() => {
    // `pages` répond aux blocs de la dernière mise en page, pas forcément à ceux
    // du rendu en cours (reconstruits avant que la pagination ne soit refaite).
    const lus = layoutBlocksRef.current;
    const block = pages[currentPage]?.[0];
    readingRef.current = {
      page: currentPage,
      block,
      blocks: lus ?? undefined,
      ancre: lus && block !== undefined ? ancreDeLecture(lus, block) : null,
    };
  }, [pages, currentPage]);
  // Sommaire : un en-tête de chant par entrée, avec sa page de départ
  const songEntries = useMemo(
    () => blocks.flatMap((b, i) => (b.kind === "song-header" ? [{ block: b, index: i }] : [])),
    [blocks],
  );
  const firstBlockIdx = currentPageIndices[0] ?? 0;
  const currentSongEntryIdx = songEntries.reduce(
    (acc, e, i) => (e.index <= firstBlockIdx ? i : acc),
    0,
  );
  const currentEntry = songEntries[currentSongEntryIdx];
  const nextEntry = songEntries[currentSongEntryIdx + 1];
  // Capo du chant courant — une page ne chevauche jamais deux chants
  const currentCapo = capoActive ? capos[currentEntry?.block.songSlug ?? ""] ?? 0 : 0;
  const currentPersonalKey = currentEntry?.block.setlistKey ? currentEntry.block.songKey : "";
  // Les annotations sont liées à la mise en page (signatureAffichage) : une
  // page en Sections uniques a sa propre clé (O12).
  const layoutSig = signatureAffichage({
    showChords,
    showTransitions,
    hideLyrics,
    chartStyle,
    capo: currentCapo,
    personalKey: currentPersonalKey,
    fontScale,
    affichage: affichageVu,
  });
  // « x2 » seulement sur une page posée en deux colonnes : une page en une
  // colonne garde sa clé, et ses traits ne se mêlent pas à ceux d'une autre mise en page.
  // « j2 » sur une page de scan : le scan a bougé (L3-T2b, L3-T5a) et les traits sont en
  // coordonnées d'écran ; ceux d'avant ne s'y chargent plus plutôt que tomber à côté des
  // notes (gardés dans Firestore). « j3 » en paysage sur grand écran : la structure y passe
  // en colonne et le scan glisse à droite en grandissant (L3-T5b). À incrémenter si le scan
  // bouge encore.
  const cleScan = layout[currentPage]?.fit ? (ecran.grand ? "j3" : "j2") : "";
  const cleSansV2 = computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}${apercuActif && !layout[currentPage]?.fit ? "ap" : ""}`);
  // Lot CV : « v2 » seulement sur une page dont une ligne est coupée (la composition a changé). La clé sans « v2 »
  // est alors l'ancienne clé de composition : ses traits ne s'affichent pas ici, ils ne sont jamais supprimés.
  const pageV2 = !!layout[currentPage]?.coupe;
  const currentPageKey = pageV2
    ? computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}${apercuActif && !layout[currentPage]?.fit ? "ap" : ""}v2`)
    : cleSansV2;

  // Lot RS-C : le rappel plus haut déplace les fins de page (pages 2 et suivantes d'un chant). Une page dont la
  // composition a changé a une nouvelle clé : on garde la clé qu'aurait eue, dans l'ancienne pagination, la page
  // qui commence par la même section — l'annotation d'avant s'y retrouve.
  const cleAncienne = useMemo(() => {
    if (affichageVu !== "unique" && affichageVu !== "played") return null;
    const cur = layout[currentPage];
    if (!cur || cur.fit || !currentEntry || firstBlockIdx <= currentEntry.index) return null;
    const premiereSection = currentPageIndices.find((i) => blocks[i]?.kind === "section");
    if (premiereSection === undefined) return null;
    for (const p of layoutAncien) {
      const idx = p.header != null ? [p.header, ...p.cols.flat()] : p.cols.flat();
      if (p.fit || idx.find((i) => blocks[i]?.kind === "section") !== premiereSection) continue;
      const cle = computePageKey(blocks, idx, `${layoutSig}${p.twoColumns ? "x2" : ""}${apercuActif ? "ap" : ""}`);
      // Sur une page « v2 », la clé sans « v2 » est l'ancienne clé de composition (bandeau), pas une clé RS-C.
      return cle === currentPageKey || cle === cleSansV2 ? null : cle;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutAncien, layout, currentPage, blocks, layoutSig, apercuActif, affichageVu, currentPageKey, cleSansV2]);

  // L5 : chant de la page courante, et taille à laquelle il a été annoté sur cet appareil.
  const slugAnnote = currentEntry?.block.songSlug;
  const tailleAnnotee = slugAnnote ? getTailleAnnotee(setlistId, slugAnnote) : null;
  const alerteAnnotations =
    !!user && !annotateMode && showAnnotations && tailleAnnotee !== null &&
    Math.round(tailleAnnotee * 100) !== Math.round(fontScale * 100);

  // Hauteur du rappel : mesure initiale, puis suivie par un ResizeObserver (chargement des polices, retour
  // à la ligne) sans forcer une mise en page à chaque rendu.
  const rappelPresent = (affichageVu === "unique" || affichageVu === "played") && !!layout[currentPage] && !layout[currentPage].fit;
  useLayoutEffect(() => {
    const el = rappelRef.current;
    if (!el) {
      setRappelEcran((prev) => (prev === 0 ? prev : 0));
      return;
    }
    const mesurer = () => {
      const h = (el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0)) * fontScale;
      setRappelEcran((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, [rappelPresent, currentPage, fontScale, currentPageKey]);
  // Ordre de lecture des traits (lot CV) : 1. la clé courante ; 2. si elle est vide, la clé de la pagination d'avant
  // le rappel (RS-C, ci-dessus) ; 3. sur une page « v2 » seulement, si rien n'a été trouvé, l'ancienne clé de
  // composition (la même sans « v2 »), lue pour le seul bandeau : ses traits ne s'affichent pas (ils ne sont plus à
  // leur place) et ne sont jamais supprimés. La clé RS-C n'est jamais l'ancienne clé de composition (écartée dans
  // `cleAncienne`).
  const anciennesCompositions = useMemo(() => (pageV2 ? [cleSansV2] : []), [pageV2, cleSansV2]);
  const { annotationsIndispo, annotations, handleAnnotationsChange, ancienneCompositionTraits } = useAnnotationsPage({
    user, setlistId, currentPageKey, cleAncienne, anciennesCompositions, rappelEcran, affichageVu, fontScale, horsLigne, slugAnnote,
  });
  // Un seul bandeau : celui de la taille (il a un bouton qui règle le problème) passe avant.
  const alerteComposition = !!user && !annotateMode && showAnnotations && ancienneCompositionTraits && !alerteAnnotations;

  // L5 : à l'entrée en annotation, la taille mémorisée du chant revient avant qu'on dessine.
  const basculerAnnotation = () => {
    setPopoverOuvert(null);
    if (!annotateMode && slugAnnote) {
      const memo = getTailleAnnotee(setlistId, slugAnnote);
      if (memo !== null && Math.round(memo * 100) !== Math.round(fontScale * 100)) appliquerTaille(memo);
    }
    setAnnotateMode((v) => !v);
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToPage = useCallback((p: number, pgCount: number) => {
    if (p < 0 || p >= pgCount) return;
    setCurrentPage(p);
  }, []);

  // Keyboard navigation (flèches, PageUp/Down — pédales Bluetooth, Échap pour quitter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cible = e.target instanceof HTMLElement ? e.target : null;
      // Champs de texte : toutes les touches leur reviennent. Le curseur de page (range) garde Échap.
      if (cible instanceof HTMLTextAreaElement || (cible instanceof HTMLInputElement && cible.type !== "range")) return;
      if (e.key !== "Escape") {
        // Curseur de page, feuilles et sommaire ouverts : flèches, PageUp/Down et Espace leur appartiennent.
        if (cible instanceof HTMLInputElement) return;
        if (popoverOuvert || askRole) return;
        if (cible?.closest("[role=dialog]")) return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 1, pages.length);
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToPage(currentPage + 1, pages.length);
      } else if (e.key === "Escape") {
        // Échap déjà consommé par une feuille (Radix le marque en la fermant) :
        // il ne doit pas aussi quitter le mode louange.
        if (e.defaultPrevented) return;
        if (popoverOuvert || askRole) {
          setPopoverOuvert(null);
          setAskRole(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, pages.length, goToPage, onClose, popoverOuvert, askRole]);

  // Touch/pointer tap handling
  // Pointeurs actifs. Un second doigt qui descend annule le geste en cours (zoom à deux doigts).
  const pointeursActifs = useRef<Set<number>>(new Set());
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "pen") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Fond d'une feuille : React fait remonter ses évènements jusqu'ici, ce n'est pas un toucher sur la page.
    // (Pas de stopPropagation sur le fond : Radix y détecte le toucher extérieur qui ferme la feuille.)
    if ((e.target as HTMLElement).closest("[data-vaul-overlay]")) return;
    // Un menu est ouvert : ce toucher le ferme (Radix), il ne tourne pas la page et ne bascule pas la barre.
    if (popoverRef.current !== null) menuAuToucher.current = { t: e.nativeEvent.timeStamp };
    else if (menuAuToucher.current && menuAuToucher.current.t !== e.nativeEvent.timeStamp) menuAuToucher.current = null;
    if (e.pointerType === "mouse") pointeursActifs.current.clear();
    pointeursActifs.current.add(e.pointerId);
    if (pointeursActifs.current.size > 1) {
      tapStart.current = null;
      return;
    }
    // Clic sur une barre de défilement (colonne du scan, barres toujours affichées) : pas un toucher.
    const el = e.target as HTMLElement;
    if (el.clientWidth > 0 && el.scrollHeight > el.clientHeight && e.nativeEvent.offsetX >= el.clientWidth) return;
    tapStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    pointeursActifs.current.delete(e.pointerId);
    menuAuToucher.current = null;
    tapStart.current = null;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "pen") return;
    pointeursActifs.current.delete(e.pointerId);
    if ((e.target as HTMLElement).closest("[data-vaul-overlay]")) { tapStart.current = null; return; }
    if (menuAuToucher.current || popoverRef.current !== null) {
      menuAuToucher.current = null;
      tapStart.current = null;
      return;
    }
    if (!tapStart.current) return;
    const dx = e.clientX - tapStart.current.x;
    const dy = e.clientY - tapStart.current.y;
    const dt = Date.now() - tapStart.current.time;
    tapStart.current = null;

    const geste = classerGeste(dx, dy, dt);
    if (geste === null) return;
    if (geste !== "toucher") {
      // Un balayage tourne la page, ne bascule jamais la barre, et se tait pendant l'annotation.
      if (annotateModeRef.current) return;
      goToPage(currentPage + (geste === "balayage-gauche" ? 1 : -1), pages.length);
      return;
    }
    let grossier = false;
    try { grossier = window.matchMedia("(pointer: coarse)").matches; } catch { /* sans matchMedia : zones par défaut */ }
    const zone = largeurZoneLaterale(window.innerWidth, window.innerHeight, grossier);

    if (e.clientX < window.innerWidth * zone) {
      goToPage(currentPage - 1, pages.length);
    } else if (e.clientX > window.innerWidth * (1 - zone)) {
      goToPage(currentPage + 1, pages.length);
    } else {
      setShowChrome(!showChrome);
    }
  }, [currentPage, pages.length, showChrome, goToPage]);

  // Current page song info for chrome
  // Un chant joué sur sa partition 简谱 n'a pas de bloc « section » : la barre
  // tire alors son titre et sa tonalité du bloc partition.
  const currentSong = currentPageIndices
    .map((i) => blocks[i])
    .find(
      (b): b is SectionBlock | JianpuSheetBlock =>
        b?.kind === "section" || b?.kind === "jianpu-sheet",
    );

  // Métronome visuel : tempo réglé sur l'appareil pour ce chant, sinon celui du fichier.
  const tempoChantId = currentEntry?.block.songSlug;
  const { tempoAppareil, tempoLiseret, changerTempo, effacerTempo } = useTempoChant(tempoChantId, currentSong?.tempo);

  // Progression dans le chant courant + chant suivant
  const songStartPage = currentEntry ? pages.findIndex((p) => p.includes(currentEntry.index)) : -1;
  const nextSongPage = nextEntry ? pages.findIndex((p) => p.includes(nextEntry.index)) : -1;
  const songEndPage = nextSongPage > 0 ? nextSongPage - 1 : pages.length - 1;
  const songPageCount = songStartPage >= 0 ? songEndPage - songStartPage + 1 : 0;
  const songPageIdx = currentPage - songStartPage;
  const isLastPageOfSong = pages.length > 0 && currentPage === songEndPage;
  // Repères du curseur de page (L7) : première page de chaque chant à en-tête.
  const reperesChants = songEntries
    .map(({ block, index }) => ({ page: pages.findIndex((p) => p.includes(index)), titre: block.title }))
    .filter((r) => r.page >= 0);

  // Repères (FS-B) : les sections du chant en cours, dans l'ordre de la page (un scan seul n'en a pas).
  const reperes = currentEntry
    ? blocks.flatMap((b, i) => {
        if (b.kind !== "section" || i <= currentEntry.index || (nextEntry && i >= nextEntry.index) || repeatHidden.has(i)) return [];
        const page = pages.findIndex((p) => p.includes(i));
        return page >= 0 ? [{ uid: b.uid, section: b.section, page }] : [];
      })
    : [];
  // Tonalité (menu Outils) : d'un demi-ton, par la tonalité personnelle de l'appareil ; revenir à celle de la setlist l'oublie.
  const entreeSlug = currentEntry?.block.songSlug;
  const cleJouee = currentEntry?.block.songKey;
  const cleBase = currentEntry?.block.setlistKey ?? cleJouee;
  const cleModifiable = !!entreeSlug && !!cleJouee && !!cleBase && noteToIndex(cleJouee) !== -1 && noteToIndex(cleBase) !== -1;
  const decalerCle = (demiTons: number) => {
    if (!cleModifiable || !entreeSlug) return;
    const nouvelle = getTransposedKey(cleJouee!, demiTons);
    if (noteToIndex(nouvelle) === noteToIndex(cleBase!)) resetPersonalKey(entreeSlug);
    else choisirCle(entreeSlug, nouvelle);
  };
  // Sous md la barre n'a que Setlist, Repères, Je joue, Options : Annoter et le tempo passent dans Outils.
  const telephone = ecran.largeur < 768;

  // Padding interne des conteneurs mis à l'échelle : px-6 py-4 + safe areas.
  // Les insets sont divisés par le facteur d'échelle pour rester exacts en
  // pixels physiques (16px + inset une fois multipliés par fontScale) — 0 hors
  // encoche.
  const contentPadding: React.CSSProperties = {
    paddingTop: `calc(1rem + var(--sat, 0px) / ${fontScale})`,
    paddingBottom: `calc(1rem + var(--sab, 0px) / ${fontScale})`,
    paddingLeft: `calc(1.5rem + var(--sal, 0px) / ${fontScale})`,
    paddingRight: `calc(1.5rem + var(--sar, 0px) / ${fontScale})`,
  };
  // Page 简谱 : marges resserrées. Le scan est déjà recadré au plus juste et se
  // met à l'échelle de la place disponible — chaque pixel de marge est un pixel
  // de partition en moins. Seul le conteneur de rendu change : la mesure garde
  // le padding de référence, sinon la largeur de mise en page des blocs
  // dépendrait de la page affichée et les hauteurs mesurées bougeraient à
  // chaque passage sur une partition.
  const fitPage = layout[currentPage]?.fit ?? false;
  // Sections uniques : sur les pages 2 et suivantes d'un chant, rappel de sa
  // structure collé en haut de la page (pas dans la barre : il ne s'escamote
  // pas) ; chaque passage d'une section imprimée sur la page est plein (D11, RS-B).
  const rappel =
    (affichageVu === "unique" || affichageVu === "played") && !fitPage && currentEntry && (currentPageIndices[0] ?? -1) > currentEntry.index
      ? currentEntry.block.steps
      : undefined;
  const sectionsDeLaPage = new Set(
    currentPageIndices.flatMap((i) => {
      const b = blocks[i];
      return b?.kind === "section" ? (b.occurrenceUids ?? []) : [];
    }),
  );
  // L3-T5b : page de scan en paysage sur grand écran, structure en colonne à gauche.
  const colonneScan = fitPage && ecran.grand;
  // K1 : le scan tient entre les deux barres, mesurées (encoche comprise). Elles
  // s'escamotent sans changer de taille : la page ne bouge pas avec elles.
  const renderPadding: React.CSSProperties = fitPage
    ? {
        paddingTop: barres.haut ? `calc(0.25rem + ${barres.haut / fontScale}px)` : `calc(0.25rem + var(--sat, 0px) / ${fontScale})`,
        paddingBottom: barres.bas ? `calc(0.25rem + ${barres.bas / fontScale}px)` : `calc(0.25rem + var(--sab, 0px) / ${fontScale})`,
        paddingLeft: `calc(0.25rem + var(--sal, 0px) / ${fontScale})`,
        paddingRight: `calc(0.25rem + var(--sar, 0px) / ${fontScale})`,
      }
    : contentPadding;

  // L6 : début de la page suivante, sous la bande réservée par la pagination. Ni dernière page,
  // ni page de scan 简谱 (courante ou suivante) ; rien non plus sous la loupe d'annotation.
  const pageSuivante = layout[currentPage + 1];
  const apercuPossible = apercuActif && !fitPage && annotZoom === 1 && pageSuivante && !pageSuivante.fit ? pageSuivante : null;
  // Pastille « Ensuite : … » (titre + tonalité du chant suivant) ; `classes` en règle la place et le fond.
  const pastilleSuivant = (classes: string, ref?: React.Ref<HTMLButtonElement>, cachee = false) =>
    nextEntry ? (
      <button
        ref={ref}
        type="button"
        data-suivant={cachee ? undefined : ""}
        aria-hidden={cachee || undefined}
        tabIndex={cachee ? -1 : undefined}
        onClick={() => goToPage(nextSongPage, pages.length)}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground ${classes}`}
      >
        <span>{t("performance.next")}</span>{" "}
        <span className="min-w-0 truncate font-semibold text-foreground">{nextEntry.block.title}</span>{" "}
        <span>·</span>{" "}
        <span className="font-mono">{nextEntry.block.songKey}</span>
      </button>
    ) : null;

  useLayoutEffect(() => {
    const el = refPastilleFlux.current;
    const couverte = !!el && showChrome && el.getBoundingClientRect().bottom > window.innerHeight - barres.bas;
    setPastilleCouverte(couverte);
  }, [showChrome, currentPage, layout, barres.bas, coupureEcran]);
  // Sur la dernière page d'un chant, la pastille « Ensuite » occupe déjà la bande : pas d'aperçu par-dessous.
  const apercu = isLastPageOfSong && nextEntry ? null : apercuPossible;
  // Les calques d'annotation ne couvrent pas la bande (bas de page + 16 px de marge + sab).
  const rogneBas = apercuPossible ? `calc(${(APERCU_H + 16) * fontScale}px + var(--sab, 0px))` : undefined;

  // Ronds « Sur la page » : tous sur une ligne dans le popover (jusqu'à 6) ; au téléphone, par 3 plutôt qu'un rond seul en dessous.
  const nRonds = 2 + [blocks.some((b) => b.kind === "section" && b.showPinyin), hasJianpuSheets && !structureMode, !!user, twoColumnsAvailable].filter(Boolean).length;
  const colonnesRonds = telephone && nRonds > 4 ? 3 : nRonds;
  // Le contenu d'Outils : le même élément dans le menu Outils (md et plus) et en tête d'Options au téléphone.
  const contenuOutils = (
    <ContenuOutils
      cle={cleModifiable ? cleJouee : undefined}
      cleSetlist={cleBase}
      decalerCle={decalerCle}
      revenirCle={() => entreeSlug && resetPersonalKey(entreeSlug)}
      capo={capoActive && entreeSlug && currentEntry ? { frets: currentCapo, set: (f) => setCapo(entreeSlug, f), titre: currentEntry.block.title } : undefined}
      showTransitions={showTransitions}
      setShowTransitions={setShowTransitions}
      onAnnoter={telephone && user && !horsLigne ? basculerAnnotation : undefined}
      tempoLignes={
        telephone && tempoChantId ? (
          <LignesTempo tempo={tempoLiseret} tempoAppareil={tempoAppareil} changerTempo={changerTempo} effacerTempo={effacerTempo} />
        ) : undefined
      }
      raccourcis={pointeurFin || clavierVu}
    />
  );

  return (
    <div
      data-performance-mode
      data-cle-ancienne={cleAncienne ?? undefined}
      data-cle-page={currentPageKey}
      data-passes-pagination={passesPagination}
      className="fixed inset-0 z-[9999] bg-background overflow-hidden select-none"
      style={{
        "--sat": "env(safe-area-inset-top, 0px)",
        "--sab": "env(safe-area-inset-bottom, 0px)",
        "--sal": "env(safe-area-inset-left, 0px)",
        "--sar": "env(safe-area-inset-right, 0px)",
        "--couleur-icones": couleurIcones,
      } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* ── Hidden measurement container ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: 0, zIndex: -1 }}
        aria-hidden="true"
      >
        {/* Mesure à l'échelle 1, à la largeur de mise en page du contenu
            (100%/fontScale) : mêmes conditions de layout que le rendu (qui est
            agrandi par transform, sans reflow) → hauteurs exactes au pixel. */}
        <div ref={measureInnerRef} data-bord-coupure style={{ width: `calc(100% / ${fontScale})`, ...contentPadding }}>
          <ConteneurCoupure mesure>
          {blocks.map((block, i) => (
            <div
              key={block.uid}
              ref={(el) => { blockRefs.current[i] = el; }}
              // En ossature, les sections sont mesurées à leur largeur naturelle
              // (sans retour à la ligne : c'est la limite de l'agrandissement),
              // les transitions à la largeur d'une colonne ; l'en-tête, lui,
              // occupe toujours la pleine largeur.
              style={
                !structureMode || block.kind === "song-header"
                  ? undefined
                  : block.kind === "section"
                    ? { width: "max-content" }
                    : { width: "calc(50% - 0.5rem)" }
              }
            >
              {!repeatHidden.has(i) && (
                <BlockRenderer
                  block={block}
                  showChordsGlobal={chordsShown}
                  showTransitions={showTransitions}
                  hideLyrics={lyricsHidden}
                  chartStyle={chartStyle}
                  showPinyinGlobal={showPinyin}
                  repeat={repeatCount.get(i)}
                  bandeau={bandeau}
                  couleurDe={structureMode && block.kind === "section" ? dpOrigin(block.section) ?? undefined : undefined}
                />
              )}
            </div>
          ))}
          </ConteneurCoupure>
        </div>
        {/* Sections uniques : le rappel de chaque chant, à la largeur de la page, pour
            réserver sa vraie hauteur (il passe à la ligne quand le texte grossit). */}
        {(affichageVu === "unique" || affichageVu === "played") && (
          <div className="absolute top-0 left-0" style={{ width: `calc(100% / ${fontScale})`, ...contentPadding }}>
            {blocks.map((block, i) =>
              block.kind === "song-header" && block.steps?.length ? (
                <div key={block.uid} ref={(el) => { rappelRefs.current[i] = el; }} className="flow-root">
                  {/* Pire cas : tous les passages pleins, avec leur nuance. */}
                  <div className="mb-2">
                    <RappelRangee titre={block.title} steps={block.steps} pleines={new Set(block.steps.map((st) => st.section.uid))} rappel={affichageVu === "played" ? "joue" : "unique"} />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
        {/* Deux colonnes : la même mesure à la largeur d'une colonne (gouttière
            de 2rem, comme le rendu). Seuls les blocs qui vont en colonne y sont
            rendus : l'en-tête reste en pleine largeur, un scan 简谱 sur sa page. */}
        {twoColumns && (
          <div className="absolute top-0 left-0" data-bord-coupure style={{ width: `calc(100% / ${fontScale})`, ...contentPadding }}>
            <div style={{ width: "calc(50% - 1rem)" }}>
              <ConteneurCoupure mesure>
              {blocks.map((block, i) => (
                <div key={block.uid} ref={(el) => { blockColRefs.current[i] = el; }}>
                  {block.kind !== "song-header" && block.kind !== "jianpu-sheet" && (
                    <BlockRenderer
                      block={block}
                      showChordsGlobal={chordsShown}
                      showTransitions={showTransitions}
                      hideLyrics={lyricsHidden}
                      chartStyle={chartStyle}
                      showPinyinGlobal={showPinyin}
                    />
                  )}
                </div>
              ))}
              </ConteneurCoupure>
            </div>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      {/* Taille de police via transform: scale + largeur/hauteur compensées,
          PAS `zoom` : zoom re-calcule la mise en page avec des arrondis propres
          au moteur (WebKit surtout) → retours à la ligne différents de la
          mesure → sections coupées en bas de page. transform ne re-met pas en
          page : le rendu est l'agrandissement exact du layout mesuré, sur tout
          appareil. La loupe d'annotation (translate + scale) se compose avec le
          même facteur, en miroir exact du canvas d'annotation (origine (0,0)). */}
      <div
        ref={contentAreaRef}
        data-bord-coupure
        className="absolute top-0 left-0 overflow-hidden"
        style={{
          zIndex: 1,
          width: `${100 / fontScale}%`,
          height: `${100 / fontScale}%`,
          transform: `scale(${fontScale})`,
          transformOrigin: "top left",
          ...renderPadding,
          ...(annotateMode && annotZoom !== 1
            ? { transform: `translate(${annotPan.x}px, ${annotPan.y}px) scale(${annotZoom * fontScale})` }
            : null),
        }}
      >
        {pages.length === 0 || !layout[currentPage] ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">{t("performance.layout")}</p>
          </div>
        ) : (() => {
          const page = layout[currentPage];
          // `blocks` peut se reconstruire sous la mise en page : le manifeste
          // 简谱 arrive en asynchrone et un chant joué sur sa partition passe
          // de N sections à un seul bloc. Le temps que la pagination se
          // recalcule, `pages` porte encore des indices trop grands.
          const renderBlock = (i: number, fit = false) => {
            const block = blocks[i];
            if (!block || repeatHidden.has(i)) return null;
            return (
              <BlockRenderer
                key={block.uid}
                block={block}
                showChordsGlobal={chordsShown}
                showTransitions={showTransitions}
                hideLyrics={lyricsHidden}
                chartStyle={chartStyle}
                showPinyinGlobal={showPinyin}
                fit={fit}
                repeat={repeatCount.get(i)}
                bandeau={bandeau}
                couleurDe={structureMode && block.kind === "section" ? dpOrigin(block.section) ?? undefined : undefined}
              />
            );
          };
          if (page.fit) {
            return (
              <PageScan
                sheet={blocks[page.cols[0][0]]}
                showTransitions={showTransitions}
                colonneScan={colonneScan}
                isLastPageOfSong={isLastPageOfSong}
                nextEntry={nextEntry}
                onSuivant={() => goToPage(nextSongPage, pages.length)}
              >
                {renderBlock(page.cols[0][0], true)}
              </PageScan>
            );
          }
          return (
            <ConteneurCoupure>
            <PageTexte
              page={page}
              rappel={rappel}
              rappelRef={rappelRef}
              rappelTrame={rappel ? <RappelRangee titre={currentEntry?.block.title} steps={rappel} pleines={sectionsDeLaPage} rappel={affichageVu === "played" ? "joue" : "unique"} /> : null}
              affichageVu={affichageVu}
              currentPage={currentPage}
              scaledBodyRef={scaledBodyRef}
              renderBlock={renderBlock}
              apercu={apercu}
              apercuHauteur={APERCU_H}
              contentPadding={contentPadding}
              showChrome={showChrome}
              pastille={isLastPageOfSong && nextEntry && !colonneScan ? pastilleSuivant(`pointer-events-auto max-w-full border-border/60 ${pastilleCouverte ? "invisible" : ""}`, refPastilleFlux, pastilleCouverte) : null}
            />
            </ConteneurCoupure>
          );
        })()}
      </div>

      {annotationsIndispo && (
        <div
          data-annotations-indisponibles
          role="status"
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 5, top: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <span className="text-xs text-muted-foreground bg-background/85 backdrop-blur px-3 py-1 rounded-full border border-border/60">
            {t("performance.annotationsIndisponibles")}
          </span>
        </div>
      )}

      {/* ── L5 : des annotations existent à une autre taille de texte ── */}
      {alerteAnnotations && tailleAnnotee !== null && (
        <div
          data-alerte-annotations
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 6, top: showChrome ? `${barres.haut + 8}px` : "calc(var(--sat, 0px) + 0.5rem)" }}
        >
          <div className="flex max-w-[92%] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-border/60 bg-background/90 px-4 py-1 text-sm text-muted-foreground backdrop-blur">
            <span>{t("performance.annotAutreTaille", { taille: Math.round(tailleAnnotee * 100) })}</span>
            <button
              type="button"
              onClick={() => appliquerTaille(tailleAnnotee)}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              className="pointer-events-auto min-h-11 px-2 font-semibold text-foreground underline underline-offset-2"
            >
              {t("performance.annotRevenir")}
            </button>
          </div>
        </div>
      )}

      {/* ── Lot CV : des traits existent sous l'ancienne composition de la page (vers coupés depuis) ── */}
      {alerteComposition && (
        <div
          data-alerte-composition
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 6, top: showChrome ? `${barres.haut + 8}px` : "calc(var(--sat, 0px) + 0.5rem)" }}
        >
          <div className="flex max-w-[92%] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-border/60 bg-background/90 px-4 py-1 text-sm text-muted-foreground backdrop-blur">
            <span>{t("performance.annotAncienneMiseEnPage")}</span>
          </div>
        </div>
      )}

      {/* ── « Ensuite : … » sur la dernière page d'un chant : touchable, sans confirmation.
          Dans le flux (PageTexte) quand la pagination lui a gardé la place ; posée en absolu sinon (vue structure),
          ou quand la barre du bas, affichée, couvre la pastille du flux. ── */}
      {isLastPageOfSong && nextEntry && !colonneScan && (layout[currentPage]?.suivant === undefined || pastilleCouverte) && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 5, bottom: showChrome ? `${barres.bas + 8}px` : "calc(0.625rem + var(--sab, 0px))" }}
        >
          {pastilleSuivant("pointer-events-auto max-w-[92%] border-border/60 bg-background/85 backdrop-blur")}
        </div>
      )}

      {/* ── Annotations : calque de lecture permanent + canvas d'édition ── */}
      {showAnnotations && !annotateMode && annotations && annotations.strokes.length > 0 && (
        <StrokesLayer data={annotations} rogneBas={rogneBas} />
      )}
      {annotateMode && annotations && (
        <AnnotationCanvas
          data={annotations}
          rogneBas={rogneBas}
          barres={barres}
          onChange={handleAnnotationsChange}
          zoom={annotZoom}
          pan={annotPan}
          onZoomPanChange={(z, p) => { setAnnotZoom(z); setAnnotPan(p); }}
        />
      )}

      {/* ── Métronome visuel : liseré silencieux, sous le chrome ── */}
      {metronome && tempoLiseret ? <LiseretTempo tempo={tempoLiseret} top={showChrome ? `${barres.haut}px` : "var(--sat, 0px)"} /> : null}

      {/* ── Chrome (auto-hide overlay) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ opacity: showChrome ? 1 : 0, zIndex: 20 }}
        aria-hidden={!showChrome}
        inert={!showChrome}
      >
        <BarreHaut
          barreRef={barreHautRef}
          showChrome={showChrome}
          currentSong={currentSong}
          setlistTitle={currentSong ? setlistTitle : currentEntry?.block.title ?? setlistTitle}
          compositeur={currentEntry?.block.artist || undefined}
          personalKey={currentEntry?.block.setlistKey}
          rolePreset={rolePreset}
          annotateMode={annotateMode}
          menuOuvert={popoverOuvert}
          avecReperes={reperes.length > 0}
          onAnnoter={user && !horsLigne ? basculerAnnotation : undefined}
          onMenu={basculerMenu}
          onJeJoue={() => { setPopoverOuvert(null); setAskRole(true); }}
          onQuitter={onClose}
        />

        <BarreBas
          barreRef={barreBasRef}
          showChrome={showChrome}
          pageCount={pages.length}
          currentPage={currentPage}
          reperesChants={reperesChants}
          goToPage={goToPage}
        />
      </div>

      {/* ── Choix du rôle à la première ouverture ── */}
      <FeuilleRole open={askRole} roleIds={ROLE_PRESET_IDS} onFermer={() => setAskRole(false)} onChoisir={answerRole} />

      {/* ── Menus du mode (FS-B) : popover sous l'icône à partir de md, feuille du bas au téléphone ── */}
      <MenuLouange id="setlist" titre={t("performance.songList")} ouvert={popoverOuvert === "setlist"} onOuvertChange={(o) => !o && fermerMenu("setlist")} align="start" couleur={couleurIcones} titreCache>
        <ContenuSetlist
          setlistTitle={setlistTitle}
          setlistDate={setlistDate}
          songEntries={songEntries}
          pages={pages}
          currentSongEntryIdx={currentSongEntryIdx}
          goToPage={goToPage}
          onFermer={() => fermerMenu("setlist")}
        />
      </MenuLouange>

      <MenuLouange id="reperes" titre={t("performance.reperes")} ouvert={popoverOuvert === "reperes"} onOuvertChange={(o) => !o && fermerMenu("reperes")} align="start" couleur={couleurIcones}>
        <ContenuReperes reperes={reperes} currentPage={currentPage} goToPage={goToPage} pageCount={pages.length} onFermer={() => fermerMenu("reperes")} />
      </MenuLouange>

      <MenuLouange id="tempo" titre={t("performance.tempo")} ouvert={popoverOuvert === "tempo"} onOuvertChange={(o) => !o && fermerMenu("tempo")} couleur={couleurIcones}>
        <ContenuTempo
          tempo={tempoLiseret}
          tempoAppareil={tempoAppareil}
          changerTempo={changerTempo}
          effacerTempo={effacerTempo}
          metronome={metronome}
          setMetronome={setMetronome}
        />
      </MenuLouange>

      <MenuLouange id="outils" titre={t("performance.toolsMenu")} ouvert={popoverOuvert === "outils"} onOuvertChange={(o) => !o && fermerMenu("outils")} couleur={couleurIcones}>
        {contenuOutils}
      </MenuLouange>

      <MenuLouange id="options" titre={t("performance.displayOptions")} ouvert={popoverOuvert === "options"} onOuvertChange={(o) => !o && fermerMenu("options")} couleur={couleurIcones}>
        <div className="space-y-4">
          {telephone && (
            <div className="space-y-1 border-b border-border pb-4">
              <TitreRubrique>{t("performance.toolsMenu")}</TitreRubrique>
              {contenuOutils}
            </div>
          )}
          <div className="space-y-2">
            <TitreRubrique id="perf-sur-page">{t("performance.onPage")}</TitreRubrique>
            <div role="group" aria-labelledby="perf-sur-page" className="grid gap-y-2" style={{ gridTemplateColumns: `repeat(${colonnesRonds}, minmax(0, 1fr))` }}>
              <BoutonSurPage
                label={t("performance.chords")}
                allume={chordsShown}
                onClick={() => {
                  clearRolePreset();
                  quitterStructureSeule();
                  setShowChords(!chordsShown);
                }}
              >
                <Music className="h-5 w-5" />
              </BoutonSurPage>
              {blocks.some((b) => b.kind === "section" && b.showPinyin) && (
                <BoutonSurPage label={t("performance.pinyin")} allume={showPinyin} onClick={() => toggleShowPinyin(!showPinyin)}>
                  <Languages className="h-5 w-5" />
                </BoutonSurPage>
              )}
              {hasJianpuSheets && !structureMode && (
                // Partition 简谱 : par appareil — le pianiste lit le scan pendant
                // que le guitariste lit la grille, sur la même setlist.
                <BoutonSurPage
                  label={t("performance.jianpuSheet")}
                  allume={interrupteurAllume(jianpuPref)}
                  onClick={() => onJianpuPrefChange(prefDepuisInterrupteur(!interrupteurAllume(jianpuPref)))}
                >
                  <FileMusic className="h-5 w-5" />
                </BoutonSurPage>
              )}
              {user && (
                <BoutonSurPage label={t("performance.annotations")} allume={showAnnotations} onClick={() => setShowAnnotations(!showAnnotations)}>
                  <PenLine className="h-5 w-5" />
                </BoutonSurPage>
              )}
              {twoColumnsAvailable && (
                <BoutonSurPage label={t("performance.twoColumns")} allume={twoColumns} onClick={toggleTwoColumns}>
                  <Columns2 className="h-5 w-5" />
                </BoutonSurPage>
              )}
              {/* En attendant DP-A (Disposition à miniatures) : l'interrupteur « Couleurs par section » actuel. */}
              <BoutonSurPage label={t("performance.chartStyle")} allume={chartStyle} onClick={() => toggleChartStyle(!chartStyle)}>
                <Palette className="h-5 w-5" />
              </BoutonSurPage>
            </div>
            {hasJianpuSheets && !structureMode && <p className="text-xs text-muted-foreground">{t("performance.jianpuSheetHint")}</p>}
          </div>
            <SettingRow label={t("performance.text")}>
              <div className="flex items-center gap-1.5">
                <BoutonRond label={t("performance.textSmaller")} onClick={() => changeFontScale(-0.1)} disabled={fontScale <= MIN_FONT_SCALE || annotateMode}>
                  <span aria-hidden="true" className="text-xs font-bold">A−</span>
                </BoutonRond>
                <span className={VALEUR}>{Math.round(fontScale * 100)}%</span>
                <BoutonRond label={t("performance.textLarger")} onClick={() => changeFontScale(0.1)} disabled={fontScale >= MAX_FONT_SCALE || annotateMode}>
                  <span aria-hidden="true" className="text-sm font-bold">A+</span>
                </BoutonRond>
              </div>
            </SettingRow>
            <SettingRow label={t("performance.theme")}>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setTheme("light")}
                  aria-pressed={stageTheme === "light"}
                  className={`h-11 px-4 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    stageTheme === "light" ? SEGMENT_CHOISI : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> {t("performance.light")}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  aria-pressed={stageTheme === "dark"}
                  className={`h-11 px-4 flex items-center gap-1.5 text-xs font-semibold border-l border-border transition-colors ${
                    stageTheme === "dark" ? SEGMENT_CHOISI : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" /> {t("performance.dark")}
                </button>
              </div>
            </SettingRow>
            <SettingRow label={t("performance.metronome")}>
              <BoutonRond label={t("performance.metronome")} allume={metronome} onClick={() => setMetronome(!metronome)} data-metronome="">
                <Waves className="h-5 w-5" />
              </BoutonRond>
            </SettingRow>
            <div className="space-y-2">
              <TitreRubrique id="perf-couleur-icones">{t("performance.iconColor")}</TitreRubrique>
              <div
                role="radiogroup"
                aria-labelledby="perf-couleur-icones"
                className="flex justify-between gap-1"
                onKeyDown={(e) => {
                  // Radiogroup standard : ← ↑ et → ↓ passent à la teinte voisine en la choisissant (« Autre couleur » en dernier).
                  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                  if (d === 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const ids = [...TEINTES.map((c) => c.id), "autre"];
                  const suivant = ids[(ids.indexOf(teinteChoisie) + d + ids.length) % ids.length];
                  if (suivant === "autre") setCercleOuvert(true);
                  else {
                    setCercleOuvert(false);
                    choisirCouleur(TEINTES.find((c) => c.id === suivant)!.hex);
                  }
                  e.currentTarget.querySelector<HTMLElement>(`[data-teinte="${suivant}"]`)?.focus();
                }}
              >
                {TEINTES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={teinteChoisie === c.id}
                    aria-label={t(`performance.iconColors.${c.id}`)}
                    data-teinte={c.id}
                    tabIndex={teinteChoisie === c.id ? 0 : -1}
                    onClick={() => { setCercleOuvert(false); choisirCouleur(c.hex); }}
                    className={`h-11 w-11 rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      teinteChoisie === c.id ? PASTILLE_CHOISIE : ""
                    }`}
                    // La pastille montre la couleur telle qu'elle sera dans la barre, sur le thème courant.
                    style={{ background: garderContraste(c.hex, stageTheme === "dark" ? FOND_SOMBRE : FOND_CLAIR) }}
                  />
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={teinteChoisie === "autre"}
                  aria-label={t("performance.iconColors.autre")}
                  data-teinte="autre"
                  tabIndex={teinteChoisie === "autre" ? 0 : -1}
                  onClick={() => setCercleOuvert((o) => !o)}
                  className={`h-11 w-11 rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    teinteChoisie === "autre" ? PASTILLE_CHOISIE : ""
                  }`}
                  style={{ background: "conic-gradient(hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 70% 50%), hsl(300 70% 50%), hsl(360 70% 50%))" }}
                />
              </div>
              {cercleOuvert && <CercleChromatique valeur={couleurChoix} fond={stageTheme === "dark" ? FOND_SOMBRE : FOND_CLAIR} onChange={choisirCouleur} />}
            </div>
          {/* En attendant FS-C (Je joue) : la vue et l'affichage restent ici, comme dans l'ancien tiroir. */}
          <div className="space-y-4 border-t border-border pt-4">
            <TitreRubrique>{t("performance.viewSection")}</TitreRubrique>
            <div className="space-y-2">
              <TitreRubrique>{t("performance.view")}</TitreRubrique>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESET_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={rolePreset === id}
                    onClick={() => (rolePreset === id ? clearRolePreset() : applyRolePreset(id))}
                    className={`h-11 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                      rolePreset === id
                        ? `${SEGMENT_CHOISI} border-transparent`
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`performance.roles.${id}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Affichage (D15) : le même réglage que le menu Affichage de la setlist. */}
            <div className="space-y-2">
              <TitreRubrique id="perf-affichage">{t("setlists.detail.layout.label")}</TitreRubrique>
              <div role="radiogroup" aria-labelledby="perf-affichage" className="flex rounded-lg bg-secondary p-1">
                {(["played", "unique", "structure"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={affichageVu === v}
                    onClick={() => changeAffichage(v)}
                    className={`h-11 min-w-0 flex-1 rounded-md px-2 text-[13px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      affichageVu === v ? SEGMENT_CHOISI : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`setlists.detail.layout.${v}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("performance.affichageHint")}</p>
            </div>
            <SettingRow label={t("performance.hideLyrics")}>
              <Switch
                aria-label={t("performance.hideLyrics")}
                checked={lyricsHidden}
                onCheckedChange={(v) => {
                  clearRolePreset();
                  quitterStructureSeule();
                  toggleHideLyrics(v);
                }}
              />
            </SettingRow>
          </div>
        </div>
      </MenuLouange>
    </div>
  );
}

/** Choix sélectionné d'un segmenté : le même langage que les ronds allumés (couleur des icônes, texte contrasté). */
const SEGMENT_CHOISI = "bg-[color:var(--couleur-icones)] text-background";

// ─── Petits composants de la barre ────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}
