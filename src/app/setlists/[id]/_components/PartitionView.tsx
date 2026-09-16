import { useMemo, useState } from "react";
import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";
import { SongView, SectionView, StructureStrip, TransitionNote } from "@/components/song/SongView";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import { useJianpuScore } from "@/lib/jianpu/images";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import { useTranslation } from "react-i18next";
import { transposeAST, transposeSection } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import { itemAst } from "@/lib/chordpro/itemContent";
import { lyricsText } from "@/components/song/copyLyrics";
import { playedSections } from "@/lib/setlist/playedSections";
import { isLastPhraseOnly } from "@/lib/setlist/lastPhrase";
import { Check, Copy, Link2, MessageSquare } from "lucide-react";
import type { ChordProAST, ChordProLine, ChordProSection } from "@/types/chordPro";
import type { SongVersionView } from "@/lib/setlist/versionChoice";

/** Badge ambre de la version affichée : « Version modifiée », « Ma version », « Version de … ». */
const AMBER_BADGE =
  "text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/50 font-semibold print:hidden";

/** Copie les paroles d'un chant, dans l'ordre joué, pour la régie (PPT). */
function CopyLyricsButton({ sections }: { sections: ChordProSection[] }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(lyricsText(sections));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="h-6 px-2 rounded-md border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors print:hidden"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? t("setlists.detail.copyLyricsDone") : t("setlists.detail.copyLyrics")}
    </button>
  );
}

function TransitionBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-3 print:py-2">
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl max-w-lg">
        <MessageSquare className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5 print:hidden" />
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
    </div>
  );
}

export function PartitionsView({
  items,
  contents,
  loading,
  showChordsGlobal,
  showPinyinGlobal,
  chartStyle,
  jianpuPref,
  layout,
  editMode = false,
  versions,
  editMine = false,
  onSelectLine,
  onRevert,
  onEditStructure,
  onChooseVersion,
  onShare,
}: {
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  loading: boolean;
  showChordsGlobal: boolean;
  showPinyinGlobal: boolean;
  /** Couleurs par section — préférence par appareil, pilotée par la page. */
  chartStyle: boolean;
  /** Partition 简谱 : suivre le choix du responsable, l'imposer, ou l'ignorer. */
  jianpuPref: JianpuPref;
  /** Coup d'œil : ordre joué, sections uniques ou structure seule (par appareil). */
  layout: PartitionLayout;
  /** Mode « adapter le chant » : lignes tappables (hors fusions), rétablir l'original. */
  editMode?: boolean;
  /** Versions par chant (docs/spec-version-perso.md) : accords et paroles de
   *  la version affichée déjà substitués dans `items` ; ma structure
   *  s'applique au corps du chant (le bandeau garde celle de la présidence) ;
   *  badge, sélecteur de version, partage. */
  versions?: Record<string, SongVersionView>;
  /** Le mode d'édition vise ma version : « Revenir à la présidence » au lieu
   *  de « Rétablir l'original », bouton « Sections », case « Partager ». */
  editMine?: boolean;
  onSelectLine?: (itemIndex: number, line: ChordProLine, sectionUid?: string) => void;
  onRevert?: (itemIndex: number) => void;
  onEditStructure?: (itemIndex: number) => void;
  onChooseVersion?: (itemIndex: number, value: string) => void;
  onShare?: (itemIndex: number, shared: boolean) => void;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-16">
        {t("setlists.detail.loadingCharts")}
      </div>
    );
  }
  return (
    <div className="space-y-10 print:space-y-6">
      {items
        .map((item, origIndex) => ({ item, origIndex }))
        .sort((a, b) => a.item.position - b.item.position)
        .map(({ item, origIndex }, idx) => {
        // ── Transition item ──
        if (item.type === "transition") {
          if (!item.transitionText) return null;
          return <TransitionBanner key={`transition-${idx}`} text={item.transitionText} />;
        }

        // ── Fusion item ──
        if (item.type === "fusion" && item.fusionSongs) {
          // Préparer les ASTs transposés par slug
          const transposedAsts: Record<string, ChordProAST> = {};
          for (const fs of item.fusionSongs) {
            const content = contents[fs.songSlug];
            if (!content) continue;
            let ast = content.ast;
            if (fs.keyOverride && fs.keyOverride !== ast.metadata.key) {
              const semitones = semitonesTo(ast.metadata.key, fs.keyOverride);
              ast = transposeAST(ast, semitones, fs.keyOverride);
            }
            transposedAsts[fs.songSlug] = ast;
          }

          // ── Structure mélangée ──
          if (item.mixedStructure && item.mixedStructure.length > 0) {
            return (
              <div key={`fusion-${idx}`} data-outline-item={item.position} className="print:break-before-page first:print:break-before-auto">
                {/* En-tête fusion */}
                <div className="flex items-center gap-2 mb-2 print:mb-2 pb-3 border-b border-border">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {item.position}
                  </span>
                  <Link2 className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <CopyLyricsButton sections={playedSections(item, contents)} />
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {item.fusionSongs.map((fs) => {
                      const ast = transposedAsts[fs.songSlug];
                      if (!ast) return null;
                      return (
                        <span key={fs.songSlug} className="text-sm font-bold text-foreground">
                          {ast.metadata.title}
                          <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
                            {fs.keyOverride ?? ast.metadata.key}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Structure mélangée : toujours l'ordre joué, avec le bandeau. */}
                <StructureStrip
                  className="pt-2 pb-1"
                  steps={item.mixedStructure.flatMap((ms): SectionOccurrence[] => {
                    const section = transposedAsts[ms.songSlug]?.sections.find((s) => s.id === ms.sectionId);
                    if (!section) return [];
                    const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
                    return [{
                      section,
                      note: ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId] ?? "",
                      transition: ms.transition ?? "",
                      nuance: ms.nuance ?? fusionSong?.sectionNuances?.[ms.sectionId],
                      targetKey: ms.keyChange ?? fusionSong?.sectionKeys?.[ms.sectionId],
                    }];
                  })}
                />
                <div className="max-w-2xl print:max-w-none pt-2">
                  {item.mixedStructure.map((ms, msIdx) => {
                    const ast = transposedAsts[ms.songSlug];
                    if (!ast) return null;
                    const section = ast.sections.find((s) => s.id === ms.sectionId);
                    if (!section) return null;
                    const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
                    const sectionNote = ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId];
                    const sectionNuance = ms.nuance ?? fusionSong?.sectionNuances?.[ms.sectionId];
                    const showSongLabel = item.fusionSongs!.length > 1;
                    // Modulation (升调) : section transposée dans sa tonalité cible.
                    const targetKey = ms.keyChange ?? fusionSong?.sectionKeys?.[ms.sectionId];
                    const keyChange = targetKey && targetKey !== ast.metadata.key ? targetKey : undefined;
                    const shownSection = keyChange && ast.metadata.key
                      ? transposeSection(section, semitonesTo(ast.metadata.key, keyChange), keyChange)
                      : section;
                    return (
                      <div key={`${ms.songSlug}-${ms.sectionId}-${msIdx}`}>
                        <SectionView
                          section={shownSection}
                          language={ast.metadata.language}
                          showChords={showChordsGlobal && item.showChords}
                          showPinyin={showPinyinGlobal && ast.metadata.language === "zh"}
                          useJianpu={false}
                          note={sectionNote}
                          nuance={sectionNuance}
                          keyChange={keyChange}
                          songSourceLabel={showSongLabel ? ast.metadata.title : undefined}
                          chartStyle={chartStyle}
                          occurrenceUids={[section.uid]}
                        />
                        {ms.transition && <TransitionNote text={ms.transition} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ── Fusion sans structure mélangée : enchaînement en ordre ──
          return (
            <div key={`fusion-${idx}`} data-outline-item={item.position} className="print:break-before-page first:print:break-before-auto">
              <div className="flex items-center gap-2 mb-4 print:mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {item.position}
                </span>
                <Link2 className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span className="text-xs text-foreground font-medium uppercase tracking-wider">
                  {t("setlists.form.fusionLabel")}
                </span>
                <CopyLyricsButton sections={playedSections(item, contents)} />
              </div>
              <div className="space-y-8">
                {item.fusionSongs.map((fs, fsIdx) => {
                  const ast = transposedAsts[fs.songSlug];
                  if (!ast) return null;
                  return (
                    <div key={fs.songSlug}>
                      {fsIdx > 0 && (
                        <div className="flex items-center gap-2 my-6 print:my-3">
                          <div className="flex-1 border-t border-dashed border-primary/30" />
                          <Link2 className="h-3 w-3 text-foreground/50 shrink-0" />
                          <div className="flex-1 border-t border-dashed border-primary/30" />
                        </div>
                      )}
                      <SongView
                        ast={ast}
                        showChords={showChordsGlobal && item.showChords}
                        showPinyin={showPinyinGlobal && ast.metadata.language === "zh"}
                        useJianpu={false}
                        structureOverride={fs.structureOverride}
                        sectionNotes={fs.sectionNotes ?? {}}
                        sectionNuances={fs.sectionNuances ?? {}}
                        sectionKeys={fs.sectionKeys ?? {}}
                        chartStyle={chartStyle}
                        layout={layout}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Chant normal ──
        return (
          <NormalSongItem
            key={`${item.songSlug}-${idx}`}
            item={item}
            origIndex={origIndex}
            content={contents[item.songSlug]}
            showChordsGlobal={showChordsGlobal}
            showPinyinGlobal={showPinyinGlobal}
            editMode={editMode}
            version={versions?.[item.songSlug]}
            editMine={editMine}
            chartStyle={chartStyle}
            jianpuPref={jianpuPref}
            layout={layout}
            onSelectLine={onSelectLine}
            onRevert={onRevert}
            onEditStructure={onEditStructure}
            onChooseVersion={onChooseVersion}
            onShare={onShare}
          />
        );
      })}
    </div>
  );
}

function NormalSongItem({
  item,
  origIndex,
  content,
  showChordsGlobal,
  showPinyinGlobal,
  editMode,
  version,
  editMine,
  chartStyle,
  jianpuPref,
  layout: layoutPref,
  onSelectLine,
  onRevert,
  onEditStructure,
  onChooseVersion,
  onShare,
}: {
  item: SetlistItem;
  origIndex: number;
  content: SongContent | undefined;
  showChordsGlobal: boolean;
  showPinyinGlobal: boolean;
  editMode: boolean;
  version?: SongVersionView;
  editMine: boolean;
  chartStyle: boolean;
  jianpuPref: JianpuPref;
  layout: PartitionLayout;
  onSelectLine?: (itemIndex: number, line: ChordProLine, sectionUid?: string) => void;
  onRevert?: (itemIndex: number) => void;
  onEditStructure?: (itemIndex: number) => void;
  onChooseVersion?: (itemIndex: number, value: string) => void;
  onShare?: (itemIndex: number, shared: boolean) => void;
}) {
  const { t } = useTranslation();
  const mine = version?.mine;
  // En mode « Ma version », c'est la mienne qui s'affiche, quel que soit le choix.
  const shown = editMine ? (mine?.content ? "mine" : "presidence") : (version?.shown ?? "presidence");
  const isMine = shown === "mine" || (shown === "presidence" && !!mine?.structure?.length);
  // Copier les paroles (régie) : seulement en suivant la setlist de la
  // présidence — ni ma version, ni ma structure, ni celle d'un autre.
  const followsPresidency = shown === "presidence" && !mine?.structure?.length;
  // Parse (contentOverride) + transposition mémoïsés : la vue Partitions se
  // re-rend à chaque toggle de la barre au scroll, inutile de re-parser.
  const ast = useMemo(() => {
    const base = itemAst(item, content);
    if (!base) return undefined;
    if (item.keyOverride && item.keyOverride !== base.metadata.key) {
      return transposeAST(base, semitonesTo(base.metadata.key, item.keyOverride), item.keyOverride);
    }
    return base;
  }, [item, content]);
  // Partition 简谱 choisie pour cet item : le scan remplace les paroles.
  const jianpuScore = useJianpuScore(sheetEnabled(jianpuPref, item.jianpuSheet) ? item.songSlug : null);
  if (!ast) return null;

  // Mode Adapter : on tape une occurrence précise → ordre joué forcé.
  const layout: PartitionLayout = editMode ? "played" : layoutPref;
  const playedSections = item.structureOverride?.length
    ? resolveStructureOverride(ast.sections, item.structureOverride)
    : ast.sections;
  // Partition 简谱 : le scan porte déjà titre, auteur et tonalité. À la place,
  // la structure jouée — qu'un scan ne peut pas connaître.
  const steps = jianpuScore ? resolveSectionOccurrences(playedSections, item) : [];

  // Badges d'état : ils ne sont pas dans le scan et suivent donc l'item, que
  // le chant s'affiche en paroles ou en partition.
  const badges = (
    <>
      {followsPresidency && <CopyLyricsButton sections={playedSections} />}
      {item.notes && (
        <span className="text-xs text-muted-foreground italic">{item.notes}</span>
      )}
      {/* L'adaptation porte sur les paroles ChordPro : elle n'est pas visible
          tant que la partition 简谱 remplace le chant. Le dire, plutôt que
          d'afficher « Version modifiée » sur un scan intact. Une « Dernière
          phrase » seule n'est pas une modification : pas de badge. */}
      {shown === "other" ? (
        <span className={AMBER_BADGE}>
          {t("setlists.myVersion.badgeOther", { name: version?.shownName || t("setlists.history.someone") })}
        </span>
      ) : isMine ? (
        <span className={AMBER_BADGE}>
          {jianpuScore ? t("setlists.myVersion.badgeHidden") : t("setlists.myVersion.badge")}
        </span>
      ) : item.contentOverride && !(content && isLastPhraseOnly(content.source, item.contentOverride)) && (
        <span className={AMBER_BADGE}>
          {jianpuScore
            ? t("setlists.contentEdit.modifiedHidden")
            : t("setlists.contentEdit.modifiedBadge", { defaultValue: "Version modifiée" })}
        </span>
      )}
      {editMode && (editMine ? isMine : !!item.contentOverride) && (
        <button
          type="button"
          onClick={() => onRevert?.(origIndex)}
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          {editMine
            ? t("setlists.myVersion.revert")
            : t("setlists.contentEdit.revert", { defaultValue: "Rétablir l'original" })}
        </button>
      )}
      {editMode && editMine && !jianpuScore && (
        <button
          type="button"
          onClick={() => onEditStructure?.(origIndex)}
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          {t("setlists.myVersion.sections")}
        </button>
      )}
      {editMode && editMine && mine?.content && (
        <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={mine.shared}
            onChange={(e) => onShare?.(origIndex, e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          {t("setlists.myVersion.share")}
        </label>
      )}
      {!editMode && version && version.options.length > 1 && (
        <select
          aria-label={t("setlists.myVersion.version")}
          value={version.value}
          onChange={(e) => onChooseVersion?.(origIndex, e.target.value)}
          className="h-6 rounded-md border border-border bg-card px-1.5 text-[11px] font-semibold text-muted-foreground print:hidden"
        >
          {version.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.kind === "presidence"
                ? t("setlists.myVersion.presidence")
                : o.kind === "mine"
                  ? t("setlists.myVersion.me")
                  : o.name || t("setlists.history.someone")}
            </option>
          ))}
        </select>
      )}
    </>
  );

  return (
    <div data-outline-item={item.position} className="print:break-before-page first:print:break-before-auto">
      {jianpuScore ? (
        <StructureStrip position={item.position} steps={steps} songKey={ast.metadata.key} details className="mb-3 pb-2 border-b border-border print:mb-2">
          {badges}
        </StructureStrip>
      ) : (
        <div className="flex items-center gap-2 mb-3 print:mb-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
            {item.position}
          </span>
          {badges}
        </div>
      )}
      {jianpuScore ? (
        // Structure seule : le bandeau suffit, le scan ne s'affiche pas.
        layout !== "structure" && (
          <JianpuSheet
            entry={jianpuScore}
            title={ast.metadata.title}
            slug={item.songSlug}
            playedKey={item.keyOverride && item.keyOverride !== ast.metadata.key ? item.keyOverride : null}
          />
        )
      ) : (
      <SongView
        ast={ast}
        showChords={showChordsGlobal && item.showChords}
        showPinyin={showPinyinGlobal && item.showPinyin}
        useJianpu={false}
        structureOverride={item.structureOverride}
        sectionNotes={item.sectionNotes ?? {}}
        sectionTransitions={item.sectionTransitions ?? {}}
        sectionNuances={item.sectionNuances ?? {}}
        sectionKeys={item.sectionKeys ?? {}}
        chartStyle={chartStyle}
        layout={layout}
        bodyStructure={mine?.structure}
        onLineSelect={editMode ? (line, sectionUid) => onSelectLine?.(origIndex, line, sectionUid) : undefined}
      />
      )}
    </div>
  );
}
