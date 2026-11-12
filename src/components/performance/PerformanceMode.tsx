"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useEffectEvent } from "react";
import { useTranslation } from "react-i18next";
import { langAccent } from "./langAccent";
import { BarreHaut, ICONES_ROLE } from "./BarreHaut";
import { BarreBas } from "./BarreBas";
import { MenuLouange, type MenuId } from "./MenuLouange";
import { LigneFeuilleDeRoute } from "./FeuilleDeRoute";
import { BoutonRond, BoutonSurPage, ContenuOutils, ContenuReperes, ContenuSetlist, ContenuTempo, LignesTempo, TitreRubrique, VALEUR } from "./ContenusMenus";
import { CercleChromatique } from "./CercleChromatique";
import { PageScan } from "./PageScan";
import { PageTexte } from "./PageTexte";
import { DemiPage } from "./DemiPage";
import { getDemiPagePref, getDemiPart, setDemiPagePref, setDemiPart as setDemiPartPref } from "@/lib/performance/demiPage";
import { useThemeScene } from "./hooks/useThemeScene";
import { useWakeLock } from "./hooks/useWakeLock";
import { useTempoChant } from "./hooks/useTempoChant";
import { useAnnotationsPage } from "./hooks/useAnnotationsPage";
import { Check, SlidersHorizontal, Link2, MessageSquare, PenLine, Sun, Moon, Columns2, AlignLeft, FileMusic, Languages, Minus, Music, PanelTopBottomDashed, Plus, Waves, X } from "lucide-react";
import type { PerformanceBlock, SectionBlock, JianpuSheetBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import type { Tranche } from "@/lib/performance/tranchesScan";
import type { TrancheFenetre } from "@/components/jianpu/JianpuSheet";
import { ecouterCoupure, versionCoupure } from "@/lib/song/coupureSignal";
import { ConteneurCoupure } from "@/components/song/LargeurCoupure";
import { ancreDeLecture, buildPerformanceBlocks, computePageKey, signatureAffichage, SUFFIXE_FEUILLE, type AncreLecture } from "@/lib/performance/blocks";
import { PASTILLE_SUIVANT_H, twoColumnsPossible, type PerfPage } from "@/lib/performance/columns";
import { layoutFeuilleDeRoute, lireEcran, pageAncree, paginer, replisStructure, sansTransitions, splitSheetPages } from "@/lib/performance/pagination";
import { useJianpuManifest, useJianpuMargesToutes, useJianpuSections, useJianpuSystemes } from "@/lib/jianpu/images";
import { bornesX, LARGEUR_FEUILLE_MAX, sectionsDeTranche, trancheDeSection, tranchesDemiLignes, tranchesScan } from "@/lib/performance/tranchesScan";
import { interrupteurAllume, prefDepuisInterrupteur, type JianpuPref } from "@/lib/jianpu/preference";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { SectionView, StructureStrip, TransitionNote, KaiTiFont, gelasio_font, zh_lyric_font } from "@/components/song/SongView";
import { TempoPartition } from "@/components/song/NoteNoire";
import { pinyin_font } from "@/components/song/pinyinFont";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { dpOrigin } from "@/lib/setlist/dp";
import { AnnotationCanvas, StrokesLayer } from "./AnnotationCanvas";
import { ANCIEN_RAPPEL } from "@/lib/annotations/strokes";
import { getDispositionPref, setDispositionPref, type Disposition } from "@/lib/dispositionPref";
import { ChoixDisposition } from "@/components/song/ChoixDisposition";
import { ChoixCouleurAccords } from "@/components/song/ChoixCouleurAccords";
import { getPersonalKeys, setPersonalKey } from "@/lib/setlist/personalKeys";
import { getTransposedKey, noteToIndex } from "@/lib/transpose";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { getPinyinPref, setPinyinPref } from "@/lib/pinyinPref";
import { classerGeste, largeurZoneLaterale } from "@/lib/performance/gestes";
import { LiseretTempo } from "@/components/performance/LiseretTempo";
import { getTailleAnnotee } from "@/lib/performance/tailleAnnotee";
import { ROLE_IDS, getRole, roleDemande, setRole, type RolePreset } from "@/lib/performance/roleCompte";
import { barreDejaVue, marquerBarreVue } from "@/lib/performance/barreVue";
import { useCouleursAccords } from "@/lib/couleurAccords";
import { FOND_CLAIR, FOND_SOMBRE, SURFACE_MENU_CLAIRE, SURFACE_MENU_SOMBRE, TEINTES, garderContraste, getCouleurIcones, setCouleurIcones } from "@/lib/performance/couleurIcones";
import { getMetronomePref, setMetronomePref } from "@/lib/performance/tempo";
import { getFontScalePref, setFontScalePref, MIN_FONT_SCALE, MAX_FONT_SCALE } from "@/lib/fontScalePref";
import { useAuth } from "@/lib/firebase/auth";
import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";
import { compter } from "@/lib/usage";

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
  disposition,
  showPinyinGlobal,
  fit = false,
  repeat,
  bandeau = "simple",
  couleurDe,
  feuilleRoute = false,
  transitionApres,
  tempoChant,
  tranche,
}: {
  block: PerformanceBlock;
  showChordsGlobal: boolean;
  showTransitions: boolean;
  hideLyrics: boolean;
  disposition: Disposition;
  showPinyinGlobal: boolean;
  /** Page 简谱 : le scan se met à l'échelle de la hauteur disponible. */
  fit?: boolean;
  /** Vue structure : nombre de passages repliés sur cette section (« ×2 »). */
  repeat?: number;
  /** Bandeau de structure de l'en-tête de chant (D11, D12). */
  bandeau?: Bandeau;
  /** Structure seule : sorte de section dont un Dp emprunte la couleur (son origine). */
  couleurDe?: string;
  /** Vue structure : les sections se rendent en lignes de la feuille de route (FS-D). */
  feuilleRoute?: boolean;
  /** Vue structure : transition qui suit cette section, rendue dans sa ligne (le bloc transition ne rend rien). */
  transitionApres?: string;
  /** Vue structure : tempo du chant, en tête de page avec la tonalité. */
  tempoChant?: number;
  /** Page de scan 简谱 certifié : la tranche de la page de partition à montrer (lot JP-B). */
  tranche?: TrancheFenetre;
}) {
  if (block.kind === "song-header") {
    return <SongHeader block={block} bandeau={bandeau} showTransitions={showTransitions} feuilleRoute={feuilleRoute} tempo={tempoChant} disposition={disposition} />;
  }
  if (block.kind === "transition-intra") {
    if (!showTransitions || feuilleRoute) return null;
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
        tranche={fit ? tranche : undefined}
      />
    );
  }
  if (feuilleRoute) return <LigneFeuilleDeRoute block={block} repeat={repeat} couleurDe={couleurDe} disposition={disposition} transition={transitionApres} />;
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
      disposition={disposition}
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


function SongHeader({ block, bandeau, showTransitions, feuilleRoute, tempo, disposition }: { block: SongHeaderBlock; bandeau: Bandeau; showTransitions: boolean; feuilleRoute?: boolean; tempo?: number; disposition?: Disposition }) {
  const { t } = useTranslation();
  // Vue structure (FS-D) : la barre du haut porte le titre ; l'en-tête montre en grand le tempo et la tonalité, toujours
  // visibles (pas de bande vide ni de filet orphelin sous la barre ouverte).
  if (feuilleRoute) {
    const titres = block.fusionSongs?.length ? block.fusionSongs.map((s) => s.title).join(" / ") : block.title;
    return (
      <div data-entete-chant className="mx-auto mb-3 w-full max-w-[880px] pb-3 border-b border-border">
        {/* Titre du chant : la barre est fermée à l'ouverture, le batteur doit voir quel chant il joue. Masqué barre ouverte (qu'elle le répète), sans changer de place. */}
        <div data-entete-titre className="mb-0.5 flex flex-wrap items-baseline gap-x-3 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
          <h2 className="text-lg font-bold text-foreground leading-tight uppercase tracking-tight">{titres}</h2>
          {!block.fusionSongs?.length && block.artist ? <p className="text-xs text-muted-foreground">{block.artist}</p> : null}
        </div>
        <p data-entete-tempo-tonalite className="text-[22px] font-bold leading-tight text-foreground">
          {tempo ? <span data-entete-tempo>♩ = {tempo}</span> : null}
          {tempo ? " · " : null}
          <span data-entete-tonalite>{t("performance.key")} {block.songKey}</span>
        </p>
      </div>
    );
  }
  // Mesuré avec l'en-tête : en deux colonnes, il reste en pleine largeur au-dessus.
  const strip = bandeau !== "aucun" && block.steps?.length ? (
    <StructureStrip steps={sansTransitions(block.steps, showTransitions)} details={bandeau === "details"} disposition={disposition} className="mt-3" />
  ) : null;
  if (block.fusionSongs?.length) {
    // Partition : l'en-tête d'un chant fusionné prend l'apparence de l'autre (titres en serif centrés, structure dessous).
    if (disposition === "partition") {
      return (
        <div data-entete-chant data-entete-partition className="mb-3 border-b border-border pb-3 [[data-page-deux-colonnes]_&]:max-w-[calc(50%-1rem)]">
          <div className="space-y-0.5 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
            {block.fusionSongs.map((s, i) => (
              <h2 key={i} data-titre-partition className={`text-center text-[26px] font-bold leading-[1.15] text-foreground ${s.language === "zh" ? KaiTiFont.className : gelasio_font.className}`}>
                {s.title}
                <small className="ml-1.5 text-sm font-normal text-muted-foreground">{s.key}</small>
              </h2>
            ))}
          </div>
          {strip}
        </div>
      );
    }
    return (
      <div data-entete-chant className="mb-3 pb-3 border-b border-border">
        {/* Barre de titre ouverte : ces lignes (qu'elle répète) sont masquées sans changer de place, jamais coupées à mi-hauteur. */}
        <div className="flex items-start gap-2 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
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
  // Partition (lot DP-D, compacté en DP-F) : titre centré en serif, puis une seule rangée : tempo et tonalité à gauche, compositeur à droite.
  if (disposition === "partition") {
    const zh = block.language === "zh";
    return (
      <div data-entete-chant data-entete-partition className="mb-3 border-b border-border pb-2 [[data-page-deux-colonnes]_&]:max-w-[calc(50%-1rem)]">
        <div className="[[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
          <h2 data-titre-partition className={`text-center text-[22px] font-bold leading-[1.15] text-foreground md:text-[26px] ${zh ? KaiTiFont.className : gelasio_font.className}`}>
            {block.title}
          </h2>
          {block.titlePinyin && <p className={`text-center text-xs text-muted-foreground mt-0.5 ${pinyin_font.className}`}>{block.titlePinyin}</p>}
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <div data-partition-tempo data-testid={block.tempo ? "ligne-tempo" : undefined} className="min-w-0 whitespace-nowrap text-sm leading-[1.3]">
              {block.tempo ? <span className="font-bold"><TempoPartition tempo={block.tempo} /></span> : null}
              {block.tempo ? <span aria-hidden="true" className="text-muted-foreground"> · </span> : null}
              <span className="text-muted-foreground">{t("performance.key")} {block.songKey}</span>
            </div>
            <p data-partition-compositeur data-testid="auteur" title={block.artist} className={`min-w-0 max-w-[55%] truncate pr-[0.2em] text-right text-sm leading-[1.3] text-foreground/80 ${zh ? zh_lyric_font.className : `italic ${gelasio_font.className}`}`}>{block.artist}</p>
          </div>
        </div>
        {strip}
      </div>
    );
  }
  return (
    <div data-entete-chant className="mb-3 pb-3 border-b border-border">
      {/* Barre de titre ouverte : titre, pinyin, crédits et tonalité (qu'elle répète) sont masqués sans changer de place, jamais coupés à mi-hauteur ; la structure reste. */}
      <div className="flex items-start justify-between gap-4 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
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

// Presets de rôle : raccourcis vers une combinaison accords/paroles. Rôle retenu
// par compte (roleCompte.ts) ; un réglage manuel des toggles désélectionne le preset.
const ROLE_PRESETS: Record<RolePreset, { chords: boolean; hideLyrics: boolean }> = {
  pianiste: { chords: true, hideLyrics: false },
  guitariste: { chords: true, hideLyrics: false },
  presidence: { chords: false, hideLyrics: false },
  choriste: { chords: false, hideLyrics: false },
  batteur: { chords: false, hideLyrics: true },
};

interface PerformanceModeProps {
  /** Compte connecté (null hors connexion) : le rôle et la taille annotée sont retenus par compte. */
  uid: string | null;
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
  /** Lot RP : rôle d'après le planning pour le service de cette setlist ; proposé, jamais appliqué seul. */
  rolePlanning?: RolePreset | null;
  onClose: () => void;
}

export function PerformanceMode({
  uid,
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
  rolePlanning = null,
  onClose,
}: PerformanceModeProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [storedRole] = useState<RolePreset | null>(() => getRole(uid));
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
  // Disposition de la partition (cf. SectionView). Préférence par appareil
  // partagée avec la fiche chant et la vue setlist (dispositionPref).
  const [disposition, setDisposition] = useState<Disposition>(() => getDispositionPref());
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
      // La rangée de points (CurseurPage) change de page au pointerdown : menu ouvert, ce toucher ferme seulement le menu.
      if (cible.closest("[data-curseur-page]")) {
        e.stopPropagation();
        e.preventDefault();
      }
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
  const [couleurChoix, setCouleurChoix] = useState(() => getCouleurIcones(uid));
  const [cercleOuvert, setCercleOuvert] = useState(false);
  // Pastille cochée de la palette : « autre » quand le cercle est ouvert ou que la couleur n'est pas une teinte prête.
  const teinteChoisie = cercleOuvert ? "autre" : TEINTES.find((c) => c.hex === couleurChoix)?.id ?? "autre";
  const choisirCouleur = useCallback((hex: string) => {
    setCouleurChoix(hex);
    setCouleurIcones(uid, hex);
  }, [uid]);
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
  const setMetronome = (v: boolean) => { compter("cmd.louange.metronome"); setMetronomeState(v); setMetronomePref(v); };

  // ── Thème scène (indépendant du thème du site, mémorisé) ──
  const { stageTheme, setTheme } = useThemeScene();
  // La couleur affichée : le choix, corrigé pour garder 4,5:1 contre le fond. Posée sur la racine du mode et sur chaque menu (Portal).
  const couleursAccords = useCouleursAccords(uid, stageTheme, disposition);
  const couleurIcones = garderContraste(couleurChoix, stageTheme === "dark" ? FOND_SOMBRE : FOND_CLAIR);
  // Dans les menus (popover, feuille du bas) la surface n'est pas le fond de la barre : la couleur y est corrigée contre elle.
  const couleurMenus = garderContraste(couleurChoix, stageTheme === "dark" ? SURFACE_MENU_SOMBRE : SURFACE_MENU_CLAIRE);

  const toggleHideLyrics = useCallback((v: boolean) => {
    setHideLyrics(v);
    try { localStorage.setItem("perf-hide-lyrics", v ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  const changeDisposition = useCallback((d: Disposition) => {
    setDisposition(d);
    setDispositionPref(d);
  }, []);

  // Choisir ou retirer un rôle vaut réponse à la question de la première
  // ouverture : un appareil qui retire son rôle n'est pas réinterrogé.
  const clearRolePreset = useCallback(() => {
    setRolePreset(null);
    setRole(uid, null);
  }, [uid]);

  // Compté dans les gestes qui choisissent un rôle, pas dans applyRolePreset (que « Annuler » rappelle aussi).
  const compterRole = (id: RolePreset) => {
    compter("cmd.chant.jeJoue");
    if (id === "batteur") compter("cmd.louange.feuilleDeRoute");
  };
  const applyRolePreset = useCallback((id: RolePreset) => {
    const p = ROLE_PRESETS[id];
    setShowChords(p.chords);
    toggleHideLyrics(p.hideLyrics);
    setRolePreset(id);
    // Le Batteur pose Structure seule ; un autre rôle ramène l'ordre joué
    // depuis Structure seule seulement (O5) : Sections uniques reste.
    if (id === "batteur") onAffichageChange("structure");
    else if (affichage === "structure") onAffichageChange("played");
    setRole(uid, id);
  }, [toggleHideLyrics, affichage, onAffichageChange, uid]);

  // Lot RP : le rôle du planning à l'ouverture du mode, figé : un planning arrivé après n'ajoute pas l'étiquette de Je joue.
  const [rolePlanningOuverture] = useState<RolePreset | null>(rolePlanning);
  // Pastille « Planning : … » : proposée, puis acceptée (« Annuler » pendant 6 s), puis finie (croix, tour de page, délai).
  const [etatPastille, setEtatPastille] = useState<"propose" | "accepte" | "fini">("propose");
  const [avantPlanning, setAvantPlanning] = useState<{ role: RolePreset | null; affichage: PartitionLayout } | null>(null);
  const [pageDePastille, setPageDePastille] = useState<number | null>(null);
  const pastilleProposee =
    // Comparée au rôle retenu à l'ouverture (figé) : un choix fait ensuite dans Je joue ne la fait jamais surgir.
    etatPastille === "propose" && rolePlanning !== null && storedRole !== null && rolePreset === storedRole && !roleOverridden &&
    initialShowChords === undefined && rolePlanning !== storedRole && !horsLigne;
  // Sous un menu ouvert, la pastille s'efface : un toucher ne doit pas à la fois fermer le menu et choisir un rôle.
  const pastilleVisible = (pastilleProposee || etatPastille === "accepte") && !annotateMode && popoverOuvert === null;
  useEffect(() => {
    // Le premier tour de page depuis son apparition la clôt, même fait pendant qu'un menu ou l'annotation la cache.
    if (pageDePastille === null) { if (pastilleVisible) setPageDePastille(currentPage); return; }
    if (currentPage !== pageDePastille && etatPastille !== "fini") setEtatPastille("fini");
  }, [pastilleVisible, currentPage, pageDePastille, etatPastille]);
  useEffect(() => {
    if (etatPastille !== "accepte") return;
    const minuteur = setTimeout(() => setEtatPastille("fini"), 6000);
    return () => clearTimeout(minuteur);
  }, [etatPastille]);
  const accepterRolePlanning = () => {
    if (!rolePlanning) return;
    setAvantPlanning({ role: rolePreset, affichage });
    applyRolePreset(rolePlanning);
    compterRole(rolePlanning);
    setEtatPastille("accepte");
  };
  const annulerRolePlanning = () => {
    if (avantPlanning) {
      if (avantPlanning.role) applyRolePreset(avantPlanning.role);
      else clearRolePreset();
      if (avantPlanning.affichage !== affichage) onAffichageChange(avantPlanning.affichage);
    }
    setEtatPastille("fini");
  };

  // Première ouverture de ce compte : « Je joue » s'ouvre seul avec la phrase d'accueil ; le rôle choisi (ou « Aucun »)
  // est retenu ensuite. Fermer sans répondre reporte la question à la prochaine ouverture.
  const [accueilRole, setAccueilRole] = useState(() => !roleDemande(uid));

  // L'ouverture automatique ancre le popover sous son icône : la barre de titre doit être visible.
  useEffect(() => {
    if (!accueilRole) return;
    setShowChrome(true);
    setPopoverOuvert("jejoue");
    // Une seule fois, à l'ouverture du mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capoActive = rolePreset === "guitariste";

  const setCapo = useCallback((slug: string, frets: number) => {
    compter("cmd.chant.capo");
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
    if (v !== affichageVu) compter(`cmd.louange.affichage.${v}`);
    if (v !== "structure" && structureMode) {
      toggleHideLyrics(false);
      setShowChords(true);
    }
    clearRolePreset();
    onAffichageChange(v);
  }, [structureMode, toggleHideLyrics, clearRolePreset, onAffichageChange, affichageVu]);
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
  // Demi-page allumée (FS-E) : la demi-page montre déjà le haut de la page suivante, l'aperçu se retire et la pagination
  // reprend la hauteur de la bande (la clé de page perd alors son suffixe « ap »).
  const [demiOn, setDemiOn] = useState(getDemiPagePref);
  const [demiPart, setDemiPartEtat] = useState(getDemiPart);
  // Demi-page en cours : la page lue est `currentPage`, le haut de l'écran montre déjà le début de la suivante.
  const [demi, setDemi] = useState(false);
  const demiSens = useRef<1 | -1>(1);
  const refDemiRappel = useRef<HTMLDivElement>(null);
  const refDemiRappelHaut = useRef<HTMLDivElement>(null);
  const [zonesDemi, setZonesDemi] = useState<{ haut: Array<[number, number, number, number]>; bas: Array<[number, number, number, number]>; decalage: number } | null>(null);
  const [rappelSuivantEcran, setRappelSuivantEcran] = useState(0);
  const refDemiCorps = useRef<HTMLDivElement>(null);
  const apercuPlace = ecran.tabletteVerticale && !structureMode && APERCU_H * fontScale <= ecran.hauteur * APERCU_PART_MAX;
  const apercuActif = apercuPlace && !demiOn;
  const apercuEteint = apercuPlace && demiOn;
  const basculerDemi = () => {
    compter("cmd.louange.demiPage");
    const next = !demiOn;
    setDemiOn(next);
    setDemiPagePref(next);
    setDemi(false);
  };
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
  const tapStart = useRef<{ x: number; y: number; time: number; pastille?: boolean } | null>(null);

  // Annotations vectorielles de la page courante (toujours chargées, pas
  // seulement en mode annotation) + visibilité (œil dans les réglages)
  // Hauteur du rappel de la page affichée (px d'écran, marge comprise) : les traits
  // se replacent selon le rappel qu'il y avait à leur tracé (lot RS-C).
  const rappelRef = useRef<HTMLDivElement>(null);
  const [rappelEcran, setRappelEcran] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Build flat block list (memoised — only changes when content changes)
  const jianpuManifest = useJianpuManifest();
  // Lot JP-B : lignes des scans certifiés et marges blanches, pour couper un scan en tranches (tant qu'ils ne
  // sont pas chargés, ou si un chant n'y figure pas : un scan par page d'écran, comme avant).
  const jianpuSystemes = useJianpuSystemes();
  const jianpuMarges = useJianpuMargesToutes();
  // Feuille de route allumée et menu Repères sur un scan certifié : début de chaque section (page, ligne).
  const jianpuSections = useJianpuSections();
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

  // Vue structure (FS-D) : la transition qui suit une section (ou le groupe de passages repliés dont elle est la tête)
  // se rend dans sa ligne ; le tempo d'un chant vient de sa première section (l'en-tête ne le porte pas).
  const transitionApres = (i: number): string | undefined => {
    if (!showTransitions) return undefined;
    let j = i + 1;
    while (repeatHidden.has(j)) j++;
    const b = blocks[j];
    return b?.kind === "transition-intra" ? b.text : undefined;
  };
  const tempoDuChant = (i: number): number | undefined => {
    for (let j = i + 1; j < blocks.length && blocks[j].kind !== "song-header"; j++) {
      const b = blocks[j];
      if (b.kind === "section" && b.tempo) return b.tempo;
    }
    return undefined;
  };

  // Re-measure when a setting affecting heights changes
  useEffect(() => {
    setRemeasureKey((k) => k + 1);
  }, [showChords, showTransitions, hideLyrics, fontScale, disposition, showPinyin]);

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
      // Lot JP-B : un scan certifié se coupe entre deux lignes. Largeur : la zone de page (moins les 0,25 rem de
      // chaque côté), bornée à 1 040 px ; hauteur : celle que PageScan laisse au scan entre les barres mesurées
      // (la tête de feuille occupe la place de la barre du haut : rien de plus à retrancher). La dernière tranche d'un chant suivi d'un autre garde la
      // place de la pastille « Ensuite » (56 px, comme `reserveBas` de PageScan).
      const dernierEntete = blocks.reduce((m, b, i) => (b.kind === "song-header" ? i : m), -1);
      // Encoches latérales : lues dans les paddings calculés du conteneur de mesure (1,5 rem + inset / fontScale), en px résolus.
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const insetG = mcs ? Math.max(0, (parseFloat(mcs.paddingLeft) || 0) - 1.5 * rem) : 0;
      const insetD = mcs ? Math.max(0, (parseFloat(mcs.paddingRight) || 0) - 1.5 * rem) : 0;
      const largeurScan = Math.min(LARGEUR_FEUILLE_MAX, window.innerWidth / fontScale - 8 - insetG - insetD);
      const hauteurScan = window.innerHeight / fontScale - 4 - (barres.haut + barres.bas) / fontScale;
      const telephonePortrait = ecran.largeur < 768 && ecran.hauteur > ecran.largeur;
      const tranchesDe = (i: number) => {
        const b = blocks[i];
        if (b?.kind !== "jianpu-sheet" || !jianpuSystemes || !jianpuMarges) return null;
        const sp = jianpuSystemes[b.songSlug]?.pages[b.pageIndex];
        if (!sp || sp.lignes.length === 0) return null;
        const { x0, x1 } = bornesX(sp.w, jianpuMarges[b.songSlug]?.[b.pageIndex]);
        const dernierDuChant = enteteDe.get(i + 1) !== enteteDe.get(i);
        const suivi = (enteteDe.get(i) ?? -1) < dernierEntete;
        const reserve = dernierDuChant && suivi ? 56 / fontScale : 0;
        // Lot JP-C : téléphone en portrait, chaque ligne se coupe en deux moitiés empilées ; sinon, lignes entières.
        if (telephonePortrait) return tranchesDemiLignes(sp.lignes, sp.h, x0, x1, largeurScan, Math.max(1, hauteurScan), reserve);
        return tranchesScan(sp.lignes, sp.h, x1 - x0, largeurScan, Math.max(1, hauteurScan), reserve);
      };
      const ctxPagination = { blocks, heights, heightsColumn, viewportH, twoColumns, enteteDe, pastille: PASTILLE_SUIVANT_H, tranchesDe };
      let ancienne: PerfPage[] = [];
      let computed: PerfPage[];
      if (structureMode) {
        // Un chant par page : on regroupe l'en-tête et ses lignes, puis layoutFeuilleDeRoute.
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
            return layoutFeuilleDeRoute(headerIdx, body, heights, viewportH);
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
  }, [blocks, remeasureKey, fontScale, structureMode, twoColumns, affichageVu, apercuActif, jianpuSystemes, jianpuMarges, barres.haut, barres.bas, ecran.largeur, ecran.hauteur]);

  const contentAreaRef = useRef<HTMLDivElement>(null);
  const scaledBodyRef = useRef<HTMLDivElement>(null);

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
    disposition,
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
  // « j4-<y0> » sur une tranche d'un scan certifié (lot JP-B) : deux tranches d'un même scan ont deux clés ;
  // un scan non certifié garde « j2 » / « j3 ». « j5-<y0> » sur une page en demi-lignes (lot JP-C, téléphone en portrait) :
  // la mise en page diffère, les traits d'une feuille en lignes entières ne se reposent pas dessus.
  const trancheCourante = layout[currentPage]?.fit ? layout[currentPage].tranche : undefined;
  const cleScan = layout[currentPage]?.fit ? (trancheCourante ? `${trancheCourante.demi ? "j5" : "j4"}-${trancheCourante.y0}` : ecran.grand ? "j3" : "j2") : "";
  // FS-E : la demi-page entre les pages `n` et `n + 1` (ni annotation, ni loupe) : deux pages de texte, ou (lot JP-B) deux
  // écrans successifs du MÊME scan 简谱 certifié (deux tranches, ou la dernière d'une page de scan et la première de la
  // suivante) ; un scan non certifié (page sans tranche) n'en a jamais, ni un texte suivi d'un scan.
  const demiPossible = useCallback(
    (n: number) => {
      const a = layout[n];
      const b = layout[n + 1];
      if (!demiOn || annotateMode || annotZoom !== 1 || !a || !b) return false;
      if (!a.fit && !b.fit) return true;
      if (!a.fit || !b.fit || !a.tranche || !b.tranche) return false;
      const ba = blocks[a.cols[0][0]];
      const bb = blocks[b.cols[0][0]];
      return ba?.kind === "jianpu-sheet" && bb?.kind === "jianpu-sheet" && ba.songSlug === bb.songSlug && ba.position === bb.position;
    },
    [demiOn, annotateMode, annotZoom, layout, blocks],
  );
  const demiActif = demi && demiPossible(currentPage);
  // FS-D : en vue Structure, la clé sans « f2 » est celle d'avant la feuille de route (même page, mêmes réglages) : lue pour le seul bandeau.
  const cleAvantFeuille = affichageVu === "structure"
    ? computePageKey(blocks, currentPageIndices, `${layoutSig.slice(0, -SUFFIXE_FEUILLE.length)}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}${apercuActif && !layout[currentPage]?.fit ? "ap" : ""}`)
    : null;
  const cleSansV2 = computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}${apercuActif && !layout[currentPage]?.fit ? "ap" : ""}`);
  // FS-E : la clé qu'aurait eue la page avec l'aperçu de la page suivante (éteint par la demi-page), sans « v2 » puis avec.
  const cleAvecApercuSansV2 = computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}ap`);
  const cleAvecApercuV2 = computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}apv2`);
  // Lot CV : « v2 » seulement sur une page dont une ligne est coupée (la composition a changé). La clé sans « v2 »
  // est alors l'ancienne clé de composition : ses traits ne s'affichent pas ici, ils ne sont jamais supprimés.
  const pageV2 = !!layout[currentPage]?.coupe;
  const currentPageKey = pageV2
    ? computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${cleScan}${apercuActif && !layout[currentPage]?.fit ? "ap" : ""}v2`)
    : cleSansV2;

  // Demi-page : clé qu'aurait la page suivante en page entière (même formule que `currentPageKey`).
  const demiSuivante = layout[currentPage + 1];
  const clePageSuivante = demiActif && demiSuivante
    ? computePageKey(blocks, pages[currentPage + 1] ?? [], `${layoutSig}${demiSuivante.twoColumns ? "x2" : ""}${demiSuivante.fit ? (demiSuivante.tranche ? `${demiSuivante.tranche.demi ? "j5" : "j4"}-${demiSuivante.tranche.y0}` : ecran.grand ? "j3" : "j2") : ""}${apercuActif && !demiSuivante.fit ? "ap" : ""}${demiSuivante.coupe ? "v2" : ""}`)
    : undefined;
  useLayoutEffect(() => {
    const el = demiActif ? refDemiRappelHaut.current : null;
    if (!el) { setRappelSuivantEcran((prev) => (prev === 0 ? prev : 0)); return; }
    const mesurer = () => {
      const h = (el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0)) * fontScale;
      setRappelSuivantEcran((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, [demiActif, currentPage, fontScale, zonesDemi]);

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
  const tailleAnnotee = slugAnnote ? getTailleAnnotee(uid, setlistId, slugAnnote) : null;
  const alerteAnnotations =
    !!user && !annotateMode && showAnnotations && tailleAnnotee !== null &&
    Math.round(tailleAnnotee * 100) !== Math.round(fontScale * 100);

  // Hauteur du rappel : mesure initiale, puis suivie par un ResizeObserver (chargement des polices, retour
  // à la ligne) sans forcer une mise en page à chaque rendu.
  const rappelPresent = (affichageVu === "unique" || affichageVu === "played") && !!layout[currentPage] && !layout[currentPage].fit;
  useLayoutEffect(() => {
    // En demi-page, le rappel de la page en cours est celui de sa moitié basse : les traits restent à leur place.
    const el = rappelRef.current ?? (demiActif && rappelPresent ? refDemiRappel.current : null);
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
  }, [rappelPresent, currentPage, fontScale, currentPageKey, demiActif]);
  // Ordre de lecture des traits (lot CV) : 1. la clé courante ; 2. si elle est vide, la clé de la pagination d'avant
  // le rappel (RS-C, ci-dessus) ; 3. sur une page « v2 » seulement, si rien n'a été trouvé, l'ancienne clé de
  // composition (la même sans « v2 »), lue pour le seul bandeau : ses traits ne s'affichent pas (ils ne sont plus à
  // leur place) et ne sont jamais supprimés. La clé RS-C n'est jamais l'ancienne clé de composition (écartée dans
  // `cleAncienne`).
  // FS-E : demi-page allumée sur une tablette portrait, les traits posés avec l'aperçu (clé « ap ») ne se montrent plus ici.
  const anciennesCompositions = useMemo(() => {
    const l: string[] = [];
    if (cleAvantFeuille) l.push(cleAvantFeuille);
    if (pageV2) l.push(cleSansV2);
    // JP-B : une page de scan découpée en tranches (« j4-<y0> ») a eu, avant, la clé de la page entière (« j2 » / « j3 », sans « ap » : une page fit n'a pas d'aperçu).
    if (trancheCourante) l.push(computePageKey(blocks, currentPageIndices, `${layoutSig}${layout[currentPage]?.twoColumns ? "x2" : ""}${ecran.grand ? "j3" : "j2"}`));
    if (apercuEteint && !layout[currentPage]?.fit) l.push(pageV2 ? cleAvecApercuV2 : cleAvecApercuSansV2);
    return l;
  }, [cleAvantFeuille, pageV2, cleSansV2, trancheCourante, blocks, currentPageIndices, layoutSig, ecran.grand, apercuEteint, layout, currentPage, cleAvecApercuV2, cleAvecApercuSansV2]);
  const { annotationsIndispo, annotations, annotationsSuivante, handleAnnotationsChange, ancienneCompositionTraits } = useAnnotationsPage({
    user, setlistId, currentPageKey, cleAncienne, anciennesCompositions, rappelEcran, affichageVu, fontScale, horsLigne, slugAnnote, clePageSuivante, rappelSuivantEcran,
  });
  // Un seul bandeau : celui de la taille (il a un bouton qui règle le problème) passe avant.
  const alerteComposition = !!user && !annotateMode && showAnnotations && ancienneCompositionTraits && !alerteAnnotations;

  // L5 : à l'entrée en annotation, la taille mémorisée du chant revient avant qu'on dessine.
  const basculerAnnotation = () => {
    setPopoverOuvert(null);
    if (!annotateMode && slugAnnote) {
      const memo = getTailleAnnotee(uid, setlistId, slugAnnote);
      if (memo !== null && Math.round(memo * 100) !== Math.round(fontScale * 100)) appliquerTaille(memo);
    }
    setDemi(false);
    setAnnotateMode((v) => !v);
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToPage = useCallback((p: number, pgCount: number) => {
    if (p < 0 || p >= pgCount) return;
    setDemi(false);
    setCurrentPage(p);
  }, []);

  // Lot FS-E : tous les tours de page relatifs (zones, balayage, flèches, PageUp/PageDown, Espace, pédale) passent ici.
  // Demi-page allumée : page n entière → (n, demi) → page n + 1 entière ; et dans l'autre sens, sans toucher à la pagination.
  // L'état (demi, page) se lit dans des refs, écrites aussi au tour même : une pédale qui répète envoie deux tours avant que
  // React ait rendu le premier.
  const demiRef = useRef(false);
  demiRef.current = demi;
  const pageRef = useRef(currentPage);
  pageRef.current = currentPage;
  const tourner = useCallback((sens: 1 | -1) => {
    const n = pageRef.current;
    if (demiOn) {
      if (demiRef.current && demiPossible(n)) {
        if (sens === 1) {
          demiRef.current = false;
          pageRef.current = n + 1;
          goToPage(n + 1, pages.length);
        } else {
          demiRef.current = false;
          setDemi(false);
        }
        return;
      }
      if (sens === 1 && demiPossible(n)) {
        demiSens.current = 1;
        demiRef.current = true;
        setDemi(true);
        return;
      }
      if (sens === -1 && n > 0 && demiPossible(n - 1)) {
        demiSens.current = -1;
        demiRef.current = true;
        pageRef.current = n - 1;
        setCurrentPage(n - 1);
        setDemi(true);
        return;
      }
    }
    if (n + sens >= 0 && n + sens < pages.length) pageRef.current = n + sens;
    demiRef.current = false;
    goToPage(n + sens, pages.length);
  }, [demiOn, demiPossible, pages.length, goToPage]);
  // Aucune coupe ne convient entre les deux pages : tour normal.
  const echecDemi = useCallback(() => {
    setDemi(false);
    if (demiSens.current === 1) goToPage(currentPage + 1, pages.length);
  }, [currentPage, pages.length, goToPage]);
  // Une demi-page ne survit ni à un changement de mise en page ni à une pagination qui la rend impossible.
  useEffect(() => { setDemi(false); }, [showChords, showTransitions, hideLyrics, disposition, fontScale, twoColumns, structureMode, affichageVu]);
  useEffect(() => { if (demi && !demiPossible(currentPage)) setDemi(false); }, [demi, demiPossible, currentPage]);

  // Dernier moyen de déplacer le focus : le pointeur (clic, toucher) ou le clavier (Tab, Échap). Chromium marque
  // :focus-visible dès qu'une touche est pressée, Espace compris : la pédale ne peut pas s'y fier.
  const focusAuPointeur = useRef(false);
  useEffect(() => {
    const auPointeur = () => { focusAuPointeur.current = true; };
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Tab" || e.key === "Escape") focusAuPointeur.current = false; };
    window.addEventListener("pointerdown", auPointeur, true);
    window.addEventListener("keydown", auClavier, true);
    return () => {
      window.removeEventListener("pointerdown", auPointeur, true);
      window.removeEventListener("keydown", auClavier, true);
    };
  }, []);

  // Keyboard navigation (flèches, PageUp/Down — pédales Bluetooth, Échap pour quitter)
  // useEffectEvent + inscription unique : un écouteur réinscrit pendant un dispatch (rendu synchrone après setClavierVu)
  // perd la première flèche.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
      const cible = e.target instanceof HTMLElement ? e.target : null;
      // Champs de texte : toutes les touches leur reviennent. Le curseur de page (range) garde Échap.
      if (cible instanceof HTMLTextAreaElement || (cible instanceof HTMLInputElement && cible.type !== "range")) return;
      if (e.key !== "Escape") {
        // Curseur de page, feuilles et sommaire ouverts : flèches, PageUp/Down et Espace leur appartiennent.
        if (cible instanceof HTMLInputElement) return;
        if (popoverOuvert) return;
        if (cible?.closest("[role=dialog]")) return;
        // Espace active le bouton, le lien, le curseur ou l'élément de menu qui a le focus (comportement natif)
        // seulement si le focus y est venu au clavier (pas de pointerdown depuis le dernier Tab / Échap) ; un focus resté après un clic, un toucher ou
        // rendu par la fermeture d'un menu ouvert à la souris laisse Espace (pédale) tourner la page.
        // Flèches et PageUp/PageDown (pédales) gardent leur effet.
        if (e.key === " " && !focusAuPointeur.current && cible?.closest("button, a[href], select, summary, [contenteditable], [role=button], [role=link], [role=slider], [role=radio], [role=switch], [role=checkbox], [role=tab], [role^=menuitem], [role=option]")) return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        tourner(-1);
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        tourner(1);
      } else if (e.key === "Escape") {
        // Échap déjà consommé par une feuille (Radix le marque en la fermant) :
        // il ne doit pas aussi quitter le mode louange.
        if (e.defaultPrevented) return;
        if (popoverOuvert) {
          setPopoverOuvert(null);
          return;
        }
        onClose();
      }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

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
    // Pastille des Repères, lettre de Scène : leur TOUCHER ouvre le nom de la section (ni page tournée, ni barre) ; un balayage parti d'elles tourne la page.
    tapStart.current = { x: e.clientX, y: e.clientY, time: Date.now(), pastille: !!el.closest("[data-repere-pastille], [data-scene-bouton]") };
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
    const departPastille = tapStart.current.pastille;
    tapStart.current = null;

    const geste = classerGeste(dx, dy, dt);
    if (geste === null || (geste === "toucher" && departPastille)) return;
    if (geste !== "toucher") {
      // Un balayage tourne la page, ne bascule jamais la barre, et se tait pendant l'annotation.
      if (annotateModeRef.current) return;
      tourner(geste === "balayage-gauche" ? 1 : -1);
      return;
    }
    let grossier = false;
    try { grossier = window.matchMedia("(pointer: coarse)").matches; } catch { /* sans matchMedia : zones par défaut */ }
    const zone = largeurZoneLaterale(window.innerWidth, window.innerHeight, grossier);

    if (e.clientX < window.innerWidth * zone) {
      tourner(-1);
    } else if (e.clientX > window.innerWidth * (1 - zone)) {
      tourner(1);
    } else {
      setShowChrome(!showChrome);
    }
  }, [showChrome, tourner]);

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
  const reperesTexte = currentEntry
    ? blocks.flatMap((b, i) => {
        if (b.kind !== "section" || i <= currentEntry.index || (nextEntry && i >= nextEntry.index) || repeatHidden.has(i)) return [];
        const page = pages.findIndex((p) => p.includes(i));
        return page >= 0 ? [{ uid: b.uid, section: b.section, page }] : [];
      })
    : [];
  // Un scan certifié (tranches) : chaque section saute à l'écran qui contient sa ligne de début (`sections.json`) ;
  // sans donnée, ou sans tranche, le menu reste comme avant (rien).
  const reperesScan = (() => {
    const sections = currentEntry ? jianpuSections?.[currentEntry.block.songSlug ?? ""]?.sections : undefined;
    if (!currentEntry || !sections || songStartPage < 0) return [];
    const ecrans = layout.flatMap((pg, p) => {
      const b = p >= songStartPage && p <= songEndPage && pg.fit && pg.tranche ? blocks[pg.cols[0][0]] : undefined;
      return b?.kind === "jianpu-sheet" ? [{ p, page: b.pageIndex + 1, tranche: pg.tranche!, steps: b.steps }] : [];
    });
    return sections.flatMap((sec) => {
      const section = ecrans.flatMap((e) => e.steps).find((st) => st.section.id === sec.id)?.section;
      const dePage = ecrans.filter((e) => e.page === sec.page);
      const k = trancheDeSection(sec, dePage.map((e) => e.tranche));
      return section && k >= 0 ? [{ uid: section.uid, section, page: dePage[k].p }] : [];
    });
  })();
  const reperes = reperesTexte.length > 0 ? reperesTexte : reperesScan;
  // Tonalité (menu Outils) : d'un demi-ton, par la tonalité personnelle de l'appareil ; revenir à celle de la setlist l'oublie.
  const entreeSlug = currentEntry?.block.songSlug;
  const cleJouee = currentEntry?.block.songKey;
  const cleBase = currentEntry?.block.setlistKey ?? cleJouee;
  const cleModifiable = !!entreeSlug && !!cleJouee && !!cleBase && noteToIndex(cleJouee) !== -1 && noteToIndex(cleBase) !== -1;
  const decalerCle = (demiTons: number) => {
    if (!cleModifiable || !entreeSlug) return;
    compter("cmd.chant.transposer");
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
  // « --marge-bande » : la bande de la disposition Scène sort de cette marge pour couvrir toute la largeur de la page (rien en deux colonnes : elle resterait dans sa colonne).
  const contentPadding = {
    "--marge-bande": twoColumns ? "0px" : "1.5rem",
    // Mêmes termes que le padding : la bande va jusqu'au bord de l'écran, encoche comprise.
    "--marge-bande-g": twoColumns ? "0px" : `calc(1.5rem + var(--sal, 0px) / ${fontScale})`,
    "--marge-bande-d": twoColumns ? "0px" : `calc(1.5rem + var(--sar, 0px) / ${fontScale})`,
    // Partition : les repères se suspendent dans la marge HORS encoche (l'air se compte depuis le bord de la zone sûre).
    "--marge-rep": twoColumns ? "0px" : "1.5rem",
    paddingTop: `calc(1rem + var(--sat, 0px) / ${fontScale})`,
    paddingBottom: `calc(1rem + var(--sab, 0px) / ${fontScale})`,
    paddingLeft: `calc(1.5rem + var(--sal, 0px) / ${fontScale})`,
    paddingRight: `calc(1.5rem + var(--sar, 0px) / ${fontScale})`,
  } as React.CSSProperties;
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
  // Un scan certifié (tranches) est une seule feuille large : plus de colonne de structure (lot JP-B).
  const colonneScan = fitPage && ecran.grand && !trancheCourante;
  // K1 : le scan tient entre les deux barres, mesurées (encoche comprise). Elles
  // s'escamotent sans changer de taille : la page ne bouge pas avec elles.
  const renderPadding: React.CSSProperties = fitPage
    ? {
        // Page de scan certifié : la tête de feuille occupe la place de la barre du haut, le scan commence dessous.
        paddingTop: trancheCourante ? 0 : barres.haut ? `calc(0.25rem + ${barres.haut / fontScale}px)` : `calc(0.25rem + var(--sat, 0px) / ${fontScale})`,
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
        onClick={() => { compter("cmd.louange.chantSuivant"); goToPage(nextSongPage, pages.length); }}
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
    // Demi-page (FS-E) : la pastille du flux n'est pas rendue, la flottante la remplace (rien à recouvrir).
    const couverte = !demiActif && !!el && showChrome && el.getBoundingClientRect().bottom > window.innerHeight - barres.bas;
    setPastilleCouverte(couverte);
  }, [showChrome, currentPage, layout, barres.bas, coupureEcran, demiActif]);
  // Sur la dernière page d'un chant, la pastille « Ensuite » occupe déjà la bande : pas d'aperçu par-dessous.
  const apercu = isLastPageOfSong && nextEntry ? null : apercuPossible;
  // Les calques d'annotation ne couvrent pas la bande (bas de page + 16 px de marge + sab).
  const rogneBas = apercuPossible ? `calc(${(APERCU_H + 16) * fontScale}px + var(--sab, 0px))` : undefined;

  // Ronds « Sur la page » : tous sur une ligne dans le popover (jusqu'à 7) ; au téléphone, sur deux lignes équilibrées plutôt qu'un rond seul en dessous.
  const nRonds = 1 + [blocks.some((b) => b.kind === "section" && b.showPinyin), hasJianpuSheets && !structureMode, !!user, twoColumnsAvailable, true, true].filter(Boolean).length;
  const colonnesRonds = telephone && nRonds > 4 ? Math.ceil(nRonds / 2) : nRonds;
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
      data-disposition={disposition}
      data-deux-colonnes={twoColumns || undefined}
      data-barre-ouverte={showChrome ? "" : undefined}
      data-demi-page={demiActif ? "" : undefined}
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
        ...couleursAccords,
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
            >
              {!repeatHidden.has(i) && (
                <BlockRenderer
                  block={block}
                  showChordsGlobal={chordsShown}
                  showTransitions={showTransitions}
                  hideLyrics={lyricsHidden}
                  disposition={disposition}
                  showPinyinGlobal={showPinyin}
                  repeat={repeatCount.get(i)}
                  bandeau={bandeau}
                  couleurDe={structureMode && block.kind === "section" ? dpOrigin(block.section) ?? undefined : undefined}
                  feuilleRoute={structureMode}
                  transitionApres={structureMode ? transitionApres(i) : undefined}
                  tempoChant={structureMode ? tempoDuChant(i) : undefined}
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
                      disposition={disposition}
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
          const renderBlock = (i: number, fit = false, tranche?: Tranche) => {
            const block = blocks[i];
            if (!block || repeatHidden.has(i)) return null;
            return (
              <BlockRenderer
                key={block.uid}
                block={block}
                showChordsGlobal={chordsShown}
                showTransitions={showTransitions}
                hideLyrics={lyricsHidden}
                disposition={disposition}
                showPinyinGlobal={showPinyin}
                fit={fit}
                repeat={repeatCount.get(i)}
                bandeau={bandeau}
                couleurDe={structureMode && block.kind === "section" ? dpOrigin(block.section) ?? undefined : undefined}
                feuilleRoute={structureMode}
                transitionApres={structureMode ? transitionApres(i) : undefined}
                tempoChant={structureMode ? tempoDuChant(i) : undefined}
                tranche={tranche && block.kind === "jianpu-sheet" ? { ...tranche, ...bornesX(block.entry.pages[block.pageIndex]?.w ?? 0, jianpuMarges?.[block.songSlug]?.[block.pageIndex]) } : undefined}
              />
            );
          };
          // Tête de feuille d'un scan certifié : hauteur exacte de la barre de titre, repères des sections de la tranche allumés.
          const teteFeuille = (b: PerformanceBlock | undefined, tr: Tranche) => ({
            hauteur: barres.haut ? `${barres.haut / fontScale}px` : `calc(var(--sat, 0px) / ${fontScale})`,
            encoche: `calc(var(--sat, 0px) / ${fontScale})`,
            allumes: b?.kind === "jianpu-sheet" ? sectionsDeTranche(jianpuSections?.[b.songSlug]?.sections ?? [], b.pageIndex + 1, tr) : new Set<string>(),
          });
          // L'écran de scan de la page `p` (la page courante, ou l'une des deux de la demi-page).
          const scanDePage = (p: number) => {
            const pg = layout[p];
            const sheetIdx = pg.cols[0][0];
            const dernierDuChant = pages.length > 0 && p === songEndPage;
            return (
              <PageScan
                sheet={blocks[sheetIdx]}
                showTransitions={showTransitions}
                colonneScan={colonneScan}
                isLastPageOfSong={dernierDuChant}
                nextEntry={nextEntry}
                onSuivant={() => goToPage(nextSongPage, pages.length)}
                // La pastille flottante (44 px, à 8 px au-dessus de la barre du bas) ne recouvre plus le scan : sa place est gardée dessous.
                reserveBas={dernierDuChant && nextEntry && !colonneScan ? 56 / fontScale : 0}
                tete={pg.tranche ? teteFeuille(blocks[sheetIdx], pg.tranche) : undefined}
                pastilleTourne={!!jianpuSystemes && !jianpuSystemes[(blocks[sheetIdx] as Extract<typeof blocks[number], { kind: "jianpu-sheet" }>).songSlug] && ecran.largeur < 768 && ecran.hauteur > ecran.largeur}
              >
                {renderBlock(sheetIdx, true, pg.tranche)}
              </PageScan>
            );
          };
          if (demiActif) {
            // Lot FS-E : le haut de la page suivante au-dessus du filet, la fin de la page en cours dessous.
            // Deux écrans d'un même scan (lot JP-B) : chaque calque est un écran de scan (tête de feuille comprise, celle de
            // l'écran suivant en haut) ; la coupe tombe entre deux lignes du scan, mesurées sur `data-jianpu-lignes`.
            const surScan = page.fit;
            const texteDePage = (p: number) => {
              const idx = pages[p] ?? [];
              const entree = songEntries.reduce((acc, e) => (e.index <= (idx[0] ?? 0) ? e : acc), songEntries[0]);
              const r = (affichageVu === "unique" || affichageVu === "played") && entree && (idx[0] ?? -1) > entree.index ? entree.block.steps : undefined;
              const pleines = new Set(idx.flatMap((i) => {
                const b = blocks[i];
                return b?.kind === "section" ? (b.occurrenceUids ?? []) : [];
              }));
              return (
                <ConteneurCoupure className={layout[p].etire ? "h-full" : undefined}>
                  <PageTexte
                    page={layout[p]}
                    rappel={r}
                    rappelRef={p === currentPage ? refDemiRappel : refDemiRappelHaut}
                    rappelTrame={r ? <RappelRangee titre={entree?.block.title} steps={r} pleines={pleines} rappel={affichageVu === "played" ? "joue" : "unique"} /> : null}
                    affichageVu={affichageVu}
                    currentPage={p}
                    scaledBodyRef={refDemiCorps}
                    renderBlock={renderBlock}
                    apercu={null}
                    apercuHauteur={0}
                    contentPadding={contentPadding}
                    showChrome={false}
                    sansIndice
                  />
                </ConteneurCoupure>
              );
            };
            return (
              <DemiPage
                clePage={`${currentPage}|${fontScale}|${showChords}${showTransitions}${hideLyrics}${disposition}|${affichageVu}|${twoColumns}|${passesPagination}|${coupureEcran}`}
                rendreHaut={() => (surScan ? scanDePage(currentPage + 1) : texteDePage(currentPage + 1))}
                rendreBas={() => (surScan ? scanDePage(currentPage) : texteDePage(currentPage))}
                part={demiPart}
                onPart={setDemiPartEtat}
                onPartFin={(v) => { setDemiPartEtat(v); setDemiPartPref(v); }}
                fontScale={fontScale}
                contentPadding={surScan ? renderPadding : contentPadding}
                nom={t("performance.halfPageHandle")}
                onEchec={echecDemi}
                onZones={setZonesDemi}
              />
            );
          }
          if (page.fit) return scanDePage(currentPage);
          return (
            <ConteneurCoupure className={page.etire ? "h-full" : undefined}>
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

      {pastilleVisible && rolePlanning && (
        <div
          data-pastille-planning
          role="status"
          className="fixed left-1/2 flex w-[304px] max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-popover/90 py-1 pl-4 pr-1 text-foreground shadow-[0_8px_28px_rgba(28,28,30,.22)] backdrop-blur-xl dark:shadow-[0_8px_28px_rgba(0,0,0,.5)] max-[430px]:w-[calc(100vw-48px)] max-[430px]:bg-popover"
          style={{ "--couleur-icones": couleurMenus, zIndex: 25, top: showChrome ? `${barres.haut + 4}px` : "calc(var(--sat, 0px) + 4px)" } as React.CSSProperties}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {etatPastille === "accepte" ? (
            <>
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-foreground">
                {t("performance.planning.done", { role: t(`performance.roles.${rolePlanning}`) })}
              </span>
              <button
                type="button"
                data-pastille-annuler
                onClick={annulerRolePlanning}
                className="min-h-11 shrink-0 rounded-lg px-3 text-[15px] font-semibold text-[color:var(--couleur-icones)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("performance.planning.undo")}
              </button>
            </>
          ) : (
            <button
              type="button"
              data-pastille-accepter
              onClick={accepterRolePlanning}
              className="min-h-11 min-w-0 flex-1 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[13.5px] leading-snug text-muted-foreground">
                {t("performance.planning.today", { instrument: t(`performance.planning.instrument.${rolePlanning}`) })}
              </span>
              <span className="block text-[15px] font-bold leading-snug text-[color:var(--couleur-icones)]">
                {t("performance.planning.switch", { role: t(`performance.roles.${rolePlanning}`) })}
              </span>
            </button>
          )}
          <button
            type="button"
            data-pastille-fermer
            aria-label={t("performance.planning.dismiss")}
            onClick={() => setEtatPastille("fini")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      )}

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
      {isLastPageOfSong && nextEntry && !colonneScan && (layout[currentPage]?.suivant === undefined || pastilleCouverte || demiActif) && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ zIndex: 5, bottom: showChrome ? `${barres.bas + 8}px` : "calc(0.625rem + var(--sab, 0px))" }}
        >
          {pastilleSuivant("pointer-events-auto max-w-[92%] border-border/60 bg-background/85 backdrop-blur")}
        </div>
      )}

      {/* ── Annotations : calque de lecture permanent + canvas d'édition ── */}
      {showAnnotations && !annotateMode && !demiActif && annotations && annotations.strokes.length > 0 && (
        <StrokesLayer data={annotations} rogneBas={rogneBas} />
      )}
      {/* Demi-page : traits en lecture seule, la page suivante dans la zone haute, la page en cours dans la zone basse (rognés et décalés comme leur texte). */}
      {showAnnotations && !annotateMode && demiActif && zonesDemi && (() => {
        const clip = (zs: Array<[number, number, number, number]>) => `path("${zs.map(([x0, y0, x1, y1]) => `M${x0} ${y0}H${x1}V${y1}H${x0}Z`).join("")}")`;
        return (
          <>
            {annotationsSuivante && annotationsSuivante.strokes.length > 0 && <StrokesLayer data={annotationsSuivante} clip={clip(zonesDemi.haut)} />}
            {annotations && annotations.strokes.length > 0 && <StrokesLayer data={annotations} clip={clip(zonesDemi.bas)} decalage={zonesDemi.decalage} />}
          </>
        );
      })()}
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
          onJeJoue={() => basculerMenu("jejoue")}
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

      {/* ── Menus du mode (FS-B) : popover sous l'icône à partir de md, feuille du bas au téléphone ── */}
      <MenuLouange id="setlist" titre={t("performance.songList")} ouvert={popoverOuvert === "setlist"} onOuvertChange={(o) => !o && fermerMenu("setlist")} align="start" couleur={couleurMenus} titreCache>
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

      <MenuLouange id="reperes" titre={t("performance.reperes")} ouvert={popoverOuvert === "reperes"} onOuvertChange={(o) => !o && fermerMenu("reperes")} align="start" couleur={couleurMenus}>
        <ContenuReperes reperes={reperes} currentPage={currentPage} goToPage={goToPage} pageCount={pages.length} onFermer={() => fermerMenu("reperes")} />
      </MenuLouange>

      <MenuLouange id="jejoue" titre={t("performance.iPlay")} ouvert={popoverOuvert === "jejoue"} onOuvertChange={(o) => !o && fermerMenu("jejoue")} align="start" couleur={couleurMenus}>
        <div className="space-y-4">
          {/* Popover (dès md) : le titre est dans le contenu ; au téléphone, le titre de la feuille le donne déjà. */}
          <p data-titre-je-joue className="hidden px-1 text-[16px] font-bold leading-snug text-foreground md:block">{t("performance.iPlay")}</p>
          <div>
            {accueilRole && (
              <p className="mb-3 border-b border-border px-2 pb-3 text-base font-semibold text-foreground">
                {t(uid ? "performance.rolePrompt.welcome" : "performance.rolePrompt.welcomeDevice")}
              </p>
            )}
            <div className="px-1"><TitreRubrique>{t("performance.rolePrompt.subtitle")}</TitreRubrique></div>
            <div className="flex flex-col">
              {ROLE_IDS.map((id) => {
                const Icone = ICONES_ROLE[id];
                const actif = rolePreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => {
                      if (actif) clearRolePreset();
                      else { applyRolePreset(id); compterRole(id); }
                      setAccueilRole(false);
                      if (etatPastille === "propose") setEtatPastille("fini"); // choisi à la main : plus de proposition
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${actif ? "" : "hover:bg-muted/60 active:bg-muted"}`}
                    // Rôle retenu : fond léger de la couleur personnelle (décision 23), comme la planche.
                    style={actif ? { background: "color-mix(in srgb, var(--couleur-icones) 12%, transparent)" } : undefined}
                  >
                    <Icone className="h-5 w-5 shrink-0 text-[color:var(--couleur-icones)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-foreground">{t(`performance.roles.${id}`)}</span>
                      <span className="block text-[13px] text-muted-foreground">{t(`performance.rolePrompt.hints.${id}`)}</span>
                    </span>
                    {id === rolePlanningOuverture && (
                      <span data-role-planning className="shrink-0 rounded-full px-2 py-1 text-[12.5px] font-semibold leading-none text-[color:var(--couleur-icones)]" style={{ background: "color-mix(in srgb, var(--couleur-icones) 14%, transparent)" }}>{t("performance.planning.label")}</span>
                    )}
                    {actif && <Check className="h-5 w-5 shrink-0 text-[color:var(--couleur-icones)]" aria-hidden="true" />}
                  </button>
                );
              })}
              {/* « Aucun » : un sixième choix comme les rôles, coché quand aucun rôle n'est retenu (après réponse). */}
              <button
                type="button"
                aria-pressed={rolePreset === null && !accueilRole}
                onClick={() => { clearRolePreset(); setAccueilRole(false); if (etatPastille === "propose") setEtatPastille("fini"); }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${rolePreset === null && !accueilRole ? "" : "hover:bg-muted/60 active:bg-muted"}`}
                style={rolePreset === null && !accueilRole ? { background: "color-mix(in srgb, var(--couleur-icones) 12%, transparent)" } : undefined}
              >
                <SlidersHorizontal className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">{t("performance.rolePrompt.none")}</span>
                  <span className="block text-[13px] text-muted-foreground">{t("performance.rolePrompt.hints.none")}</span>
                </span>
                {rolePreset === null && !accueilRole && <Check className="h-5 w-5 shrink-0 text-[color:var(--couleur-icones)]" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="space-y-4 border-t border-border pt-4">
            {/* Affichage (D15) : le même réglage que le menu Affichage de la setlist. */}
            <div className="space-y-2">
              <div className="px-1"><TitreRubrique id="perf-ordre-sections">{t("performance.sectionOrder")}</TitreRubrique></div>
              <div role="radiogroup" aria-labelledby="perf-ordre-sections" className="flex rounded-lg bg-secondary p-1">
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
              <p className="px-2 text-xs text-muted-foreground">{t("performance.affichageHint")}</p>
            </div>
          </div>
        </div>
      </MenuLouange>

      <MenuLouange id="tempo" titre={t("performance.tempo")} ouvert={popoverOuvert === "tempo"} onOuvertChange={(o) => !o && fermerMenu("tempo")} couleur={couleurMenus}>
        <ContenuTempo
          tempo={tempoLiseret}
          tempoAppareil={tempoAppareil}
          changerTempo={changerTempo}
          effacerTempo={effacerTempo}
          metronome={metronome}
          setMetronome={setMetronome}
        />
      </MenuLouange>

      <MenuLouange id="outils" titre={t("performance.toolsMenu")} ouvert={popoverOuvert === "outils"} onOuvertChange={(o) => !o && fermerMenu("outils")} couleur={couleurMenus}>
        {contenuOutils}
      </MenuLouange>

      <MenuLouange id="options" titre={t("performance.displayOptions")} ouvert={popoverOuvert === "options"} onOuvertChange={(o) => !o && fermerMenu("options")} couleur={couleurMenus}>
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
              <BoutonSurPage
                label={t("performance.lyrics")}
                allume={!lyricsHidden}
                onClick={() => {
                  clearRolePreset();
                  quitterStructureSeule();
                  toggleHideLyrics(!lyricsHidden);
                }}
              >
                <AlignLeft className="h-5 w-5" />
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
              <BoutonSurPage label={t("performance.halfPage")} allume={demiOn} onClick={basculerDemi}>
                <PanelTopBottomDashed className="h-5 w-5" />
              </BoutonSurPage>
            </div>
            {hasJianpuSheets && !structureMode && <p className="text-xs text-muted-foreground">{t("performance.jianpuSheetHint")}</p>}
          </div>
          <div className="space-y-2">
            <TitreRubrique id="perf-disposition">{t("dispositions.titre")}</TitreRubrique>
            <ChoixDisposition variante="panneau" langue={currentEntry?.block.language === "zh" ? "zh" : "fr"} labelledBy="perf-disposition" couleur="var(--couleur-icones)" disposition={disposition} changeDisposition={changeDisposition} />
          </div>
          <div className="space-y-2">
            <TitreRubrique id="perf-couleur-accords">{t("couleurAccords.titre")}</TitreRubrique>
            <ChoixCouleurAccords variante="panneau" theme={stageTheme} />
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
                  onClick={() => { compter("cmd.louange.themeScene"); setTheme("light"); }}
                  aria-pressed={stageTheme === "light"}
                  className={`h-11 px-4 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    stageTheme === "light" ? SEGMENT_CHOISI : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> {t("performance.light")}
                </button>
                <button
                  onClick={() => { compter("cmd.louange.themeScene"); setTheme("dark"); }}
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
