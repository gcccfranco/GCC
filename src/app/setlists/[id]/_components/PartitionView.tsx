import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { songHref } from "@/lib/setlist/songHref";
import type { JianpuChords, SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";
import { NotationAccordsProvider } from "@/components/song/NotationAccordsProvider";
import { SongView, SectionView, StructureStrip, TransitionNote, KaiTiFont, gelasio_font, chord_font } from "@/components/song/SongView";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { AccordsProvider, AideAccordsEnLigne, ChantDesAccords, useOuvrirAccord, type IciDuChant } from "@/components/accords/AccordsProvider";
import { resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { ordreJoue } from "@/lib/chordpro/structure";
import { useJianpuScore, type JianpuEntry } from "@/lib/jianpu/images";
import { useVoletsScan } from "@/components/jianpu/useVoletsScan";
import type { Volets } from "@/lib/performance/tranchesScan";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import { useTranslation } from "react-i18next";
import { transposeSection, transposerVers } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import { itemAst } from "@/lib/chordpro/itemContent";
import { lyricsText } from "@/components/song/copyLyrics";
import { compter } from "@/lib/usage";
import { playedSections } from "@/lib/setlist/playedSections";
import { Button } from "@/components/ui/button";
import { MenuJeLis, LigneMaPartition, LignePartagee } from "@/components/partition/MenuJeLis";
import type { PartageProps } from "@/components/partition/PartagerMaPartition";
import type { Lecture } from "@/lib/partition/lecture";
import { Check, Copy, Link2, MessageSquare, RotateCcw } from "lucide-react";
import { TOUCHER_44 } from "@/lib/toucher44";
import type { ChordProAST, ChordProLine, ChordProSection } from "@/types/chordPro";
import type { SongVersionView } from "@/lib/setlist/versionChoice";
import type { Disposition } from "@/lib/dispositionPref";

/** Les actions de la rangée d'un chant (dimanche-17) : une puce à contour de 32 px, 12,5 px, zone de toucher de 44 px. */
const PUCE = `${TOUCHER_44} inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary print:hidden`;

/** Copie les paroles d'un chant, dans l'ordre joué, pour la régie (PPT). */
/** H5-2 : de quoi ouvrir la porte 2 au passage d'un accord touché (`tonalite` : celle que la porte 2 joue). */
function iciDe(
  onIci: ((itemIndex: number, slug: string | undefined, sectionUid: string, idee?: string, options?: { depuisNom?: boolean; element?: HTMLElement | null }) => void) | undefined,
  itemIndex: number, slug: string | undefined, sections: ChordProSection[], tonalite: string, tonaliteOrigine?: string,
): IciDuChant | undefined {
  return onIci && { sections, tonalite, tonaliteOrigine, ouvrir: (uid, idee, options) => onIci(itemIndex, slug, uid, idee, options) };
}

function CopyLyricsButton({ sections, icone = false }: { sections: ChordProSection[]; icone?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(lyricsText(sections));
      compter("cmd.chant.copierParoles");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={icone ? t(copied ? "setlists.detail.copyLyricsDone" : "setlists.detail.copyLyrics") : undefined}
      className={icone ? `${TOUCHER_44} inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary print:hidden` : PUCE}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {!icone && (copied ? t("setlists.detail.copyLyricsDone") : t("setlists.detail.copyLyrics"))}
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

/** Donne à la page la fermeture de la bulle d'accord de ce fournisseur (la colonne Harmonie s'ouvre à côté). */
function DonnerFermeture({ onFermer }: { onFermer?: (fermer: () => void) => void }) {
  const { fermerSansFocus } = useOuvrirAccord();
  useEffect(() => onFermer?.(fermerSansFocus), [onFermer, fermerSansFocus]);
  return null;
}

/** Enveloppe du scan 简谱 (vue Partitions). Dès 1 000 px de zone (conteneur `partition`, même règle que les paroles),
 *  le scan passe en deux volets (`useVoletsScan`) ; sinon il garde 920 px. Le témoin, visible seulement à ≥ 1 000 px,
 *  donne la largeur de la zone par ResizeObserver. */
function EnveloppeScan({ slug, entry, sansVolets, avecEtiquettes = false, children }: { slug: string; entry: JianpuEntry; sansVolets: boolean; avecEtiquettes?: boolean; children: (volets: Volets | undefined) => ReactNode }) {
  const temoin = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState<number | null>(null);
  useEffect(() => {
    const el = temoin.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(el.getBoundingClientRect().width || null));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const volets = useVoletsScan(slug, entry, sansVolets ? null : largeur, avecEtiquettes) ?? undefined;
  return (
    <>
      {/* Hors de l'enveloppe : elle est bornée à 920 px tant qu'il n'y a pas de volets, le témoin mesurerait 920. */}
      <div ref={temoin} data-temoin-volets aria-hidden className="hidden h-0 w-full [@container_partition_(min-width:1000px)]:block" />
      <div data-enveloppe-scan data-scan-volets={volets ? "2" : "1"} className={"print:max-w-none " + (volets ? "max-w-[920px] [@container_partition_(min-width:1000px)]:max-w-none" : "max-w-[920px]")}>
        {children(volets)}
      </div>
    </>
  );
}

export function PartitionsView({
  setlistId,
  items,
  contents,
  loading,
  showChordsGlobal,
  showPinyinGlobal,
  disposition,
  jianpuPref,
  layout,
  editMode = false,
  versions,
  retouches,
  onSelectLine,
  onRevert,
  onPasserAuCulte,
  onEditJianpu,
  onIdees,
  onIci,
  onFermerAccord,
  onRetryChant,
  titres,
  lectures,
  onChoisirLecture,
  partage,
  onGarderCopie,
  onConflit,
  enAttente = false,
}: {
  /** Ma partition (docs/spec-ma-partition.md) : par chant, quelle partition se lit, le menu « Je lis » et les signes. */
  lectures?: Record<string, Lecture>;
  onChoisirLecture?: (itemIndex: number, valeur: string) => void;
  /** De quoi partager ma partition de ce chant (feuille « Partager ma partition ») ; `undefined` : pas de partage. */
  partage?: (itemIndex: number, slug: string) => PartageProps | undefined;
  onGarderCopie?: (itemIndex: number) => void;
  onConflit?: (itemIndex: number, index: number, choix: "mienne" | "chant") => void;
  /** Des écritures de ma partition attendent le réseau (« En attente »). */
  enAttente?: boolean;
  /** Le titre de chaque chant mène à sa page, dans les réglages de la setlist. */
  setlistId: string;
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  loading: boolean;
  showChordsGlobal: boolean;
  showPinyinGlobal: boolean;
  /** Couleurs par section — préférence par appareil, pilotée par la page. */
  disposition: Disposition;
  /** Partition 简谱 : suivre le choix du responsable, l'imposer, ou l'ignorer. */
  jianpuPref: JianpuPref;
  /** Coup d'œil : ordre joué, sections uniques ou structure seule (par appareil). */
  layout: PartitionLayout;
  /** Mode « adapter le chant » : lignes tappables (hors fusions), rétablir l'original. */
  editMode?: boolean;
  /** Versions par chant (docs/spec-version-perso.md) : accords et paroles de
   *  la version affichée déjà substitués dans `items` ; la structure du corps
   *  du chant (le bandeau garde celle de la présidence) ; badge, sélecteur de
   *  version, partage. */
  versions?: Record<string, SongVersionView>;
  /** Crayon : ce que chaque chant a de retouché pour moi et pour le culte (puces « Revenir à la présidence » et
   *  « Rétablir l'original »). */
  retouches?: (itemIndex: number) => { moi: boolean; culte: boolean };
  onSelectLine?: (itemIndex: number, line: ChordProLine, sectionUid?: string) => void;
  onRevert?: (itemIndex: number, destination: "moi" | "culte") => void;
  /** Crayon, pour qui règle le culte : « Passer au culte » sous une ligne marquée « moi ». */
  onPasserAuCulte?: (itemIndex: number, srcLine: number) => void;
  /** Retouche d'accords sur un scan 简谱 (lot 9) : l'item pour la présidence,
   *  ma version pour moi — la page tranche. */
  onEditJianpu?: (itemIndex: number, next: JianpuChords) => void;
  /** Idées d'harmonie du chant (lot 9) — absent si la personne n'y a pas droit.
   *  Fusion : `slug` dit lequel de ses chants. */
  onIdees?: (itemIndex: number, slug?: string) => void;
  /** H5-2 « Ici » : ouvre la porte 2 au passage de l'accord touché (sans basculer) — absent sans accès Harmonie. */
  onIci?: (itemIndex: number, slug: string | undefined, sectionUid: string, idee?: string, options?: { depuisNom?: boolean; element?: HTMLElement | null }) => void;
  /** Reçoit la fermeture de la bulle d'accord de la partition. */
  onFermerAccord?: (fermer: () => void) => void;
  /** « Chant non chargé — Réessayer » : relit le contenu de ce seul chant. */
  onRetryChant?: (slug: string) => void | Promise<void>;
  /** Titre de chaque chant par slug (l'index) : un chant sans contenu garde son titre. */
  titres?: Record<string, string>;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-16">
        {t("setlists.detail.loadingCharts")}
      </div>
    );
  }
  // L'aide des accords se pose sous les pastilles du premier chant.
  const positionPremierChant = items
    .filter((i) => i.type !== "transition" && i.type !== "proposition")
    .sort((a, b) => a.position - b.position)[0]?.position;
  return (
    // Les accords s'ouvrent au toucher hors édition (DA-3) ; « Ma version » et « Adapter » gardent leurs lignes tappables.
    <AccordsProvider actif={!editMode} aide="flux">
    <DonnerFermeture onFermer={onFermerAccord} />
    <div className="space-y-10 print:space-y-6" data-disposition={disposition}>
      {items
        .map((item, origIndex) => ({ item, origIndex }))
        .sort((a, b) => a.item.position - b.item.position)
        .map(({ item, origIndex }, idx) => {
        // ── Transition item ──
        if (item.type === "transition") {
          if (!item.transitionText) return null;
          return <TransitionBanner key={`transition-${idx}`} text={item.transitionText} />;
        }

        // ── Chant hors répertoire en attente (setlist de fête, CF21) ──
        if (item.type === "proposition") {
          return <p key={`proposition-${idx}`} className="text-sm text-muted-foreground">{item.proposition?.titre} — {t("planning.fete.propositionEnAttente")}</p>;
        }

        // ── Fusion item ──
        if (item.type === "fusion" && item.fusionSongs) {
          // Préparer les ASTs transposés par slug — la version adaptée de
          // chaque chant s'il en a une (sa Dernière phrase).
          const transposedAsts: Record<string, ChordProAST> = {};
          // Tonalité d'origine de chaque chant (les idées de l'équipe s'y enregistrent).
          const origines: Record<string, string> = {};
          for (const fs of item.fusionSongs) {
            const ast = itemAst(fs, contents[fs.songSlug]);
            if (!ast) continue;
            origines[fs.songSlug] = ast.metadata.key;
            transposedAsts[fs.songSlug] = transposerVers(ast, fs.keyOverride);
          }
          // Idées d'harmonie : celles de chaque chant de la fusion.
          const ideesFusion = onIdees && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 print:hidden">
              {item.fusionSongs.map((fs) => transposedAsts[fs.songSlug] && (
                <button
                  key={fs.songSlug}
                  type="button"
                  onClick={() => onIdees(origIndex, fs.songSlug)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {t("harmonie.idees")} · {transposedAsts[fs.songSlug].metadata.title}
                </button>
              ))}
            </div>
          );

          // ── Structure mélangée ──
          if (item.mixedStructure && item.mixedStructure.length > 0) {
            const passages = item.mixedStructure.flatMap((ms) => {
              const ast = transposedAsts[ms.songSlug];
              const section = ast?.sections.find((s) => s.id === ms.sectionId);
              if (!ast || !section) return [];
              const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
              // Modulation (升调) : section transposée dans sa tonalité cible.
              const targetKey = ms.keyChange ?? fusionSong?.sectionKeys?.[ms.sectionId];
              const keyChange = targetKey && targetKey !== ast.metadata.key ? targetKey : undefined;
              return [{ ms, ast, section, fusionSong, targetKey, keyChange }];
            });
            // Coup d'œil, comme un chant seul : ordre joué, chaque section une
            // fois (par chant et par tonalité), ou le bandeau seul.
            const shownPassages =
              layout === "structure"
                ? []
                : layout === "unique"
                  ? passages.filter((p, i) => passages.findIndex((q) =>
                      q.ms.songSlug === p.ms.songSlug && q.section.id === p.section.id && q.keyChange === p.keyChange) === i)
                  : passages;
            const withDetails = layout === "played";
            return (
              <div key={`fusion-${idx}`} data-outline-item={item.position} className="print:break-before-page first:print:break-before-auto">
                {/* En-tête fusion */}
                <div className="flex items-center gap-2 mb-2 print:mb-2 pb-3 border-b border-border">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {item.position}
                  </span>
                  <Link2 className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <CopyLyricsButton icone={disposition !== "partition"} sections={playedSections(item, contents)} />
                  <div className={disposition === "partition" ? "flex min-w-0 flex-1 flex-col items-center gap-y-0.5" : "flex flex-wrap gap-x-3 gap-y-0.5"}>
                    {item.fusionSongs.map((fs) => {
                      const ast = transposedAsts[fs.songSlug];
                      if (!ast) return null;
                      // Partition : titres en serif centrés, comme l'en-tête d'un chant seul.
                      const titrePartition = disposition === "partition" ? `text-center text-2xl font-bold leading-[1.15] ${ast.metadata.language === "zh" ? KaiTiFont.className : gelasio_font.className}` : "text-sm font-bold";
                      return (
                        <span key={fs.songSlug} {...(disposition === "partition" ? { "data-titre-partition": true } : null)} className={`${titrePartition} text-foreground`}>
                          <Link href={songHref(fs.songSlug, fs, setlistId, item.position)} className="hover:underline underline-offset-2">
                            {ast.metadata.title}
                          </Link>
                          <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
                            {fs.keyOverride ?? ast.metadata.key}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {ideesFusion}
                {/* Le bandeau porte notes et transitions dès que le corps ne les porte plus. */}
                <StructureStrip
                  className="pt-2 pb-1"
                  disposition={disposition}
                  details={layout !== "played"}
                  steps={passages.map(({ ms, section, fusionSong, targetKey }): SectionOccurrence => ({
                    section,
                    note: ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId] ?? "",
                    transition: ms.transition ?? "",
                    nuance: ms.nuance ?? fusionSong?.sectionNuances?.[ms.sectionId],
                    targetKey,
                  }))}
                />
                {item.position === positionPremierChant && <div className="max-w-[var(--colonne-partition,42rem)] print:max-w-none"><AideAccordsEnLigne /></div>}
                <div className="max-w-[var(--colonne-partition,42rem)] print:max-w-none pt-2 [@container_partition_(min-width:1000px)]:columns-2 [@container_partition_(min-width:1000px)]:gap-x-6 [@container_partition_(min-width:1000px)]:[&>*]:break-inside-avoid [@container_partition_(min-width:1000px)]:[&>:last-child_[data-section]]:!mb-0 print:block print:columns-auto">
                  {shownPassages.map(({ ms, ast, section, fusionSong, keyChange }, msIdx) => {
                    const sectionNote = ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId];
                    const sectionNuance = ms.nuance ?? fusionSong?.sectionNuances?.[ms.sectionId];
                    const showSongLabel = item.fusionSongs!.length > 1;
                    const shownSection = keyChange && ast.metadata.key
                      ? transposeSection(section, semitonesTo(ast.metadata.key, keyChange), keyChange)
                      : section;
                    return (
                      <div key={`${ms.songSlug}-${ms.sectionId}-${msIdx}`} data-chant-slug={ms.songSlug}>
                        <ChantDesAccords chant={{ slug: ms.songSlug, titre: ast.metadata.title }} tonalite={keyChange ?? ast.metadata.key} ici={iciDe(onIci, origIndex, ms.songSlug,
                          // Section modulée : les chiffres se lisent dans la tonalité cible, comme celui de l'accord touché.
                          keyChange && ast.metadata.key ? ast.sections.map((x) => transposeSection(x, semitonesTo(ast.metadata.key, keyChange), keyChange)) : ast.sections,
                          keyChange ?? ast.metadata.key, origines[ms.songSlug])}>
                        <NotationAccordsProvider tonalite={keyChange ?? ast.metadata.key}>
                        <SectionView
                          section={shownSection}
                          language={ast.metadata.language}
                          showChords={showChordsGlobal && item.showChords}
                          showPinyin={showPinyinGlobal && ast.metadata.language === "zh"}
                          useJianpu={false}
                          note={withDetails ? sectionNote : undefined}
                          nuance={withDetails ? sectionNuance : undefined}
                          keyChange={keyChange}
                          songSourceLabel={showSongLabel ? ast.metadata.title : undefined}
                          disposition={disposition}
                          occurrenceUids={[section.uid]}
                          slug={ms.songSlug}
                        />
                        </NotationAccordsProvider>
                        </ChantDesAccords>
                        {withDetails && ms.transition && <TransitionNote text={ms.transition} />}
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
                <CopyLyricsButton icone={disposition !== "partition"} sections={playedSections(item, contents)} />
              </div>
              {ideesFusion}
              <div className="space-y-8">
                {item.fusionSongs.map((fs, fsIdx) => {
                  const ast = transposedAsts[fs.songSlug];
                  if (!ast) return null;
                  return (
                    <div key={fs.songSlug} data-chant-slug={fs.songSlug}>
                      <ChantDesAccords chant={{ slug: fs.songSlug, titre: ast.metadata.title }} tonalite={ast.metadata.key} ici={iciDe(onIci, origIndex, fs.songSlug, ast.sections, ast.metadata.key, origines[fs.songSlug])}>
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
                        disposition={disposition}
                        layout={layout}
                        slug={fs.songSlug}
                        titleHref={songHref(fs.songSlug, fs, setlistId, item.position)}
                        apresBandeau={fsIdx === 0 && item.position === positionPremierChant ? <AideAccordsEnLigne /> : undefined}
                      />
                      </ChantDesAccords>
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
            setlistId={setlistId}
            item={item}
            origIndex={origIndex}
            content={contents[item.songSlug]}
            showChordsGlobal={showChordsGlobal}
            showPinyinGlobal={showPinyinGlobal}
            editMode={editMode}
            version={versions?.[item.songSlug]}
            retouches={retouches?.(origIndex)}
            disposition={disposition}
            jianpuPref={jianpuPref}
            layout={layout}
            onSelectLine={onSelectLine}
            onRevert={onRevert}
            onPasserAuCulte={onPasserAuCulte}
            onEditJianpu={onEditJianpu}
            onIdees={onIdees}
            onIci={onIci}
            onRetryChant={onRetryChant}
            titre={titres?.[item.songSlug]}
            lecture={lectures?.[item.songSlug]}
            onChoisirLecture={onChoisirLecture}
            partage={partage}
            onGarderCopie={onGarderCopie}
            onConflit={onConflit}
            enAttente={enAttente}
            premier={item.position === positionPremierChant}
          />
        );
      })}
    </div>
    </AccordsProvider>
  );
}

function NormalSongItem({
  setlistId,
  item,
  origIndex,
  content,
  showChordsGlobal,
  showPinyinGlobal,
  editMode,
  version,
  retouches,
  disposition,
  jianpuPref,
  layout: layoutPref,
  onSelectLine,
  onRevert,
  onPasserAuCulte,
  onEditJianpu,
  onIdees,
  onIci,
  onRetryChant,
  titre,
  lecture,
  onChoisirLecture,
  partage,
  onGarderCopie,
  onConflit,
  enAttente,
  premier,
}: {
  lecture?: Lecture;
  onChoisirLecture?: (itemIndex: number, valeur: string) => void;
  partage?: (itemIndex: number, slug: string) => PartageProps | undefined;
  onGarderCopie?: (itemIndex: number) => void;
  onConflit?: (itemIndex: number, index: number, choix: "mienne" | "chant") => void;
  enAttente: boolean;
  setlistId: string;
  item: SetlistItem;
  origIndex: number;
  content: SongContent | undefined;
  showChordsGlobal: boolean;
  showPinyinGlobal: boolean;
  editMode: boolean;
  version?: SongVersionView;
  retouches?: { moi: boolean; culte: boolean };
  disposition: Disposition;
  jianpuPref: JianpuPref;
  layout: PartitionLayout;
  onSelectLine?: (itemIndex: number, line: ChordProLine, sectionUid?: string) => void;
  onRevert?: (itemIndex: number, destination: "moi" | "culte") => void;
  onPasserAuCulte?: (itemIndex: number, srcLine: number) => void;
  onEditJianpu?: (itemIndex: number, next: JianpuChords) => void;
  onIdees?: (itemIndex: number) => void;
  onIci?: (itemIndex: number, slug: string | undefined, sectionUid: string, idee?: string, options?: { depuisNom?: boolean; element?: HTMLElement | null }) => void;
  onRetryChant?: (slug: string) => void | Promise<void>;
  titre?: string;
  /** Premier chant de la setlist : l'aide des accords s'y pose sous les pastilles. */
  premier?: boolean;
}) {
  const { t } = useTranslation();
  const [reprise, setReprise] = useState(false);
  const mine = version?.mine;
  const shown = version?.shown ?? "presidence";
  // Copier les paroles (régie) : seulement en suivant la setlist de la
  // présidence — ni ma version, ni ma structure, ni celle d'un autre.
  const followsPresidency = lecture && lecture.source !== undefined
    ? lecture.suitLaPresidence
    : shown === "presidence" && !mine?.structure?.length;
  // Parse (contentOverride) + transposition mémoïsés : la vue Partitions se
  // re-rend à chaque toggle de la barre au scroll, inutile de re-parser.
  // `songKey` est la tonalité du chant lui-même : `ast` sort déjà transposé,
  // et le comparer à `keyOverride` répondait toujours « la même », ce qui
  // éteignait le calque de la partition 简谱 (accords laissés dans la
  // tonalité gravée pendant que le reste de la setlist est transposé).
  const { ast, songKey } = useMemo(() => {
    const base = itemAst(item, content);
    if (!base) return { ast: undefined, songKey: undefined };
    return { ast: transposerVers(base, item.keyOverride), songKey: base.metadata.key };
  }, [item, content]);
  // Partition 简谱 choisie pour cet item : le scan remplace les paroles.
  const jianpuScore = useJianpuScore(sheetEnabled(jianpuPref) ? item.songSlug : null);
  if (!ast) {
    // Chant sans contenu (lecture ratée) : son titre et de quoi le relire, plutôt qu'un trou dans la setlist.
    return (
      <div data-chant-non-charge className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
        <h2 className="text-base font-semibold text-foreground">{titre ?? item.songSlug}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("setlists.detail.chantNonCharge")}</p>
        {onRetryChant && item.songSlug && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={reprise}
            onClick={async () => {
              setReprise(true);
              try { await onRetryChant(item.songSlug); } finally { setReprise(false); }
            }}
          >
            {reprise ? t("setlists.detail.essaiEnCours") : t("common.retry")}
          </Button>
        )}
      </div>
    );
  }
  const titleHref = songHref(item.songSlug, item, setlistId, item.position);

  // Mode Adapter : on tape une occurrence précise → ordre joué forcé.
  const layout: PartitionLayout = editMode ? "played" : layoutPref;
  const playedSections = ordreJoue(ast.sections, item.structureOverride);
  // Partition 简谱 : les 升调 de la structure jouée, qu'un scan ne peut pas montrer.
  const steps = jianpuScore ? resolveSectionOccurrences(playedSections, item) : [];

  // Badges d'état : ils ne sont pas dans le scan et suivent donc l'item, que
  // le chant s'affiche en paroles ou en partition.
  const badges = (
    <>
      {editMode && retouches?.moi && (
        <button type="button" onClick={() => onRevert?.(origIndex, "moi")} className={PUCE}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t("setlists.myVersion.revert")}
        </button>
      )}
      {editMode && retouches?.culte && (
        <button type="button" onClick={() => onRevert?.(origIndex, "culte")} className={PUCE}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t("setlists.contentEdit.revert", { defaultValue: "Rétablir l'original" })}
        </button>
      )}
      {onIdees && (
        <button
          type="button"
          onClick={() => onIdees(origIndex)}
          data-puce-harmonie
          className={PUCE}
        >
          {t("harmonie.idees")}
        </button>
      )}
      {!editMode && lecture && <MenuJeLis lecture={lecture} onChoisir={(v) => onChoisirLecture?.(origIndex, v)} partage={partage?.(origIndex, item.songSlug)} />}
      {!editMode && lecture?.valeur === "mienne" && <LigneMaPartition date={lecture.mienne?.updatedAt} enAttente={enAttente} />}
      {!editMode && lecture && lecture.options.find((o) => o.valeur === lecture.valeur)?.type === "partagee" && onGarderCopie && (
        <LignePartagee nom={lecture.options.find((o) => o.valeur === lecture.valeur)?.nom} mienne={lecture.mienne ?? null} onGarder={() => onGarderCopie(origIndex)} />
      )}
    </>
  );
  // Rangée compacte de la maquette (.shead, 48 px) : n°, titre et pinyin (puis la note, tronquée), tonalité, copie en icône.
  const sousLigne = [ast.metadata.titlePinyin, item.notes].filter(Boolean);
  const enTete = (
    <>
      <div data-entete-chant className="flex min-h-12 items-center gap-2.5 py-1">
        <span className="shrink-0 text-[17px] font-bold tabular-nums text-muted-foreground">{item.position}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className={`text-xl font-semibold leading-[1.15] tracking-[-0.01em] text-foreground ${ast.metadata.language === "zh" ? KaiTiFont.className : ""}`}>
            <Link href={titleHref} className="hover:underline underline-offset-4 decoration-2">{ast.metadata.title}</Link>
          </h1>
          {sousLigne.length > 0 && (
            <p className="truncate text-[12.5px] leading-tight text-muted-foreground">
              {ast.metadata.titlePinyin}
              {ast.metadata.titlePinyin && item.notes && " · "}
              {item.notes && <span className="italic">{item.notes}</span>}
            </p>
          )}
        </div>
        {ast.metadata.key && (
          <span
            className={`shrink-0 text-sm font-bold ${chord_font.className}`}
            style={{ color: ast.metadata.language === "zh" ? "var(--jianpu-color)" : "var(--chord-color)" }}
          >
            {ast.metadata.key}
          </span>
        )}
        {ast.metadata.tempo && (
          <span className="flex shrink-0 items-baseline gap-0.5 text-xs text-muted-foreground max-[359px]:hidden">
            <span className="text-base leading-none text-foreground/70">♩</span>
            {` = ${ast.metadata.tempo}`}
          </span>
        )}
        {followsPresidency && <CopyLyricsButton icone sections={playedSections} />}
      </div>
      <div className="flex flex-wrap items-center gap-2 py-2 empty:hidden print:hidden">{badges}</div>
    </>
  );
  return (
    <div data-outline-item={item.position} className="print:break-before-page first:print:break-before-auto">
      <ChantDesAccords chant={{ slug: item.songSlug, titre: ast.metadata.title }} tonalite={ast.metadata.key} ici={iciDe(onIci, origIndex, undefined, ast.sections, ast.metadata.key, songKey)}>
      {/* Disposition « partition » : en-tête d'avant T2, inchangé. */}
      {disposition === "partition" && (
        <div className="flex items-center gap-2 mb-3 print:mb-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
            {item.position}
          </span>
          {followsPresidency && <CopyLyricsButton sections={playedSections} />}
          {item.notes && <span className="text-xs text-muted-foreground italic">{item.notes}</span>}
          {badges}
        </div>
      )}
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
        disposition={disposition}
        layout={layout}
        slug={item.songSlug}
        bodyStructure={version?.bodyStructure}
        titleHref={titleHref}
        enTete={disposition !== "partition" ? enTete : undefined}
        apresBandeau={premier ? <AideAccordsEnLigne /> : undefined}
        onLineSelect={editMode ? (line, sectionUid) => onSelectLine?.(origIndex, line, sectionUid) : undefined}
        marques={lecture?.marques}
        onPasserAuCulte={editMode && onPasserAuCulte ? (srcLine) => onPasserAuCulte(origIndex, srcLine) : undefined}
        onConflit={!editMode && lecture?.modifiable && onConflit ? (index, choix) => onConflit(origIndex, index, choix) : undefined}
        corps={
          // Partition 简谱 : le scan prend la place des paroles, sous le même
          // en-tête (K3). Structure seule : ni l'un ni l'autre.
          jianpuScore && layout !== "structure" ? (
            <EnveloppeScan slug={item.songSlug} entry={jianpuScore} sansVolets={Boolean(editMode && onEditJianpu)} avecEtiquettes={Boolean(onIci)}>
              {(volets) => (<>
              {/* Un 升调 ne se voit pas sur un scan : le dire au-dessus (lot 9). */}
              {steps
                .filter((st) => st.targetKey)
                .map((st) => (
                  <p
                    key={st.section.uid}
                    data-bandeau-modulation
                    className="mb-2 rounded-[12px] bg-secondary px-3 py-2 text-xs"
                    style={{ color: "hsl(var(--jianpu-encre))" }}
                  >
                    {t("harmonie.bandeauModulation", {
                      section: st.section.name || st.section.type,
                      ton: st.targetKey,
                    })}
                  </p>
                ))}
              <JianpuSheet
                volets={volets}
                entry={jianpuScore}
                title={ast.metadata.title}
                slug={item.songSlug}
                playedKey={item.keyOverride && item.keyOverride !== songKey ? item.keyOverride : null}
                originalKey={songKey}
                chordEdits={item.jianpuChords}
                onEditChords={
                  editMode && onEditJianpu ? (next) => onEditJianpu(origIndex, next) : undefined
                }
              />
              </>)}
            </EnveloppeScan>
          ) : undefined
        }
      />
      </ChantDesAccords>
    </div>
  );
}
