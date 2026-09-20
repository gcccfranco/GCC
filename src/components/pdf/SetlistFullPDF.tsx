import { Document } from "@react-pdf/renderer";
import { SongPDFPage, FusionPDFPage, TransitionPDFPage, JianpuPDFPage, CompactStrip, compactStripHeight, type FusionPDFSong, type PdfSectionStyle } from "@/components/pdf/SongPDF";
import { compactTransitions } from "@/lib/pdf/compact";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import { resolveSectionOccurrences } from "@/lib/setlist/sectionSteps";
import { type JianpuChordsManifest, type JianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { ChordProAST } from "@/types/chordPro";
import { itemAst } from "@/lib/chordpro/itemContent";

interface SongContent {
  slug: string;
  ast: ChordProAST;
}

export function SetlistFullPDF({
  setlist,
  contents,
  showChords,
  jianpuSheets,
  jianpuChords,
  jianpuImages,
  jianpuPref = "auto",
  sectionStyle = "classic",
  layout = "played",
}: {
  setlist: FSSetlist;
  contents: Record<string, SongContent>;
  showChords: boolean;
  /** Manifestes 简谱 — chargés avant l'appel : le rendu PDF n'exécute pas
   *  d'effets, ils ne peuvent donc pas venir d'un hook. */
  jianpuSheets?: JianpuManifest;
  jianpuChords?: JianpuChordsManifest;
  /** Pages de scan ré-encodées en PNG (data URL), par nom de fichier :
   *  react-pdf ne lit pas le WebP dans lequel les scans sont servis. */
  jianpuImages?: Record<string, string>;
  jianpuPref?: JianpuPref;
  sectionStyle?: PdfSectionStyle;
  /** « unique » = PDF compact (docs/spec-export-pdf.md) : bandeau + sections
   *  uniques ; une transition finit la page du chant d'avant. */
  layout?: "played" | "unique";
}) {
  const sorted = [...setlist.items].sort((a, b) => a.position - b.position);
  const footer = `${setlist.title} - ${setlist.leader}`;
  const compact = layout === "unique";
  const transitions = compact ? compactTransitions(sorted) : null;

  return (
    <Document title={setlist.title}>
      {sorted.flatMap((item, idx) => {
        if (item.type === "transition") {
          if (!item.transitionText) return [];
          if (transitions && !transitions.standalone.has(idx)) return [];
          return [
            <TransitionPDFPage
              key={`transition-${idx}`}
              text={item.transitionText}
              footerCenter={footer}
            />
          ];
        }

        if (item.type === "fusion" && item.fusionSongs) {
          const fusionSongsData = item.fusionSongs
            .filter((fs) => !!contents[fs.songSlug])
            .map((fs): FusionPDFSong => {
              let ast = contents[fs.songSlug].ast;
              if (fs.keyOverride && fs.keyOverride !== ast.metadata.key) {
                const semitones = semitonesTo(ast.metadata.key, fs.keyOverride);
                ast = transposeAST(ast, semitones, fs.keyOverride);
              }
              return { slug: fs.songSlug, ast, sectionNotes: fs.sectionNotes ?? {}, sectionNuances: fs.sectionNuances ?? {}, sectionKeys: fs.sectionKeys ?? {} };
            });

          if (fusionSongsData.length === 0) return [];

          // Mixed structure: render sections in mixed order on one page
          if (item.mixedStructure && item.mixedStructure.length > 0) {
            return [
              <FusionPDFPage
                key={`fusion-${idx}`}
                songs={fusionSongsData}
                mixedStructure={item.mixedStructure}
                showChords={showChords}
                footerCenter={footer}
                sectionStyle={sectionStyle}
                withStrip={compact}
                trailingTransition={transitions?.attached.get(idx)}
              />
            ];
          }

          // Sequential: one page per song
          return fusionSongsData.map((fs, fsIdx) => (
            <SongPDFPage
              key={`fusion-${idx}-${fs.slug}-${fsIdx}`}
              ast={fs.ast}
              showChords={showChords}
              showPinyin={fs.ast.metadata.language === "zh"}
              useJianpu={false}
              structureOverride={item.fusionSongs![fsIdx].structureOverride}
              sectionNotes={fs.sectionNotes}
              sectionNuances={fs.sectionNuances}
              sectionKeys={fs.sectionKeys}
              footerCenter={footer}
              sectionStyle={sectionStyle}
              layout={layout}
              trailingTransition={fsIdx === fusionSongsData.length - 1 ? transitions?.attached.get(idx) : undefined}
            />
          ));
        }

        const baseAst = itemAst(item, contents[item.songSlug]);
        if (!baseAst) return [];
        let ast = baseAst;
        if (item.keyOverride && item.keyOverride !== ast.metadata.key) {
          const semitones = semitonesTo(ast.metadata.key, item.keyOverride);
          ast = transposeAST(ast, semitones, item.keyOverride);
        }
        // ── Partition 简谱 : le scan remplace les paroles, une page par page ──
        const sheet = sheetEnabled(jianpuPref, item.jianpuSheet)
          ? jianpuSheets?.[item.songSlug]
          : undefined;
        // Une page de scan qui n'a pas pu être ré-encodée ferait un trou dans
        // la partition : dans ce cas le chant repart sur ses paroles.
        const sheetSrcs = sheet?.pages.map((p) => jianpuImages?.[p.file]);
        if (sheet && sheetSrcs?.every(Boolean)) {
          const playedKey =
            item.keyOverride && item.keyOverride !== baseAst.metadata.key ? item.keyOverride : null;
          // Compact : le bandeau au-dessus du scan, comme la vue partitions.
          const steps = compact
            ? resolveSectionOccurrences(
                item.structureOverride?.length ? resolveStructureOverride(ast.sections, item.structureOverride) : ast.sections,
                item,
              )
            : [];
          return sheet.pages.map((page, pageIdx) => (
            <JianpuPDFPage
              key={`${item.songSlug}-${idx}-jianpu-${pageIdx}`}
              src={sheetSrcs![pageIdx]!}
              page={page}
              // Le calque n'est relevé que sur la première page du scan.
              chords={pageIdx === 0 ? jianpuChords?.[item.songSlug] : null}
              title={ast.metadata.title}
              titlePinyin={ast.metadata.titlePinyin}
              playedKey={playedKey}
              headerHeight={pageIdx === 0 ? 56 : 0}
              footerCenter={footer}
              strip={compact && pageIdx === 0
                ? <CompactStrip steps={steps} songKey={ast.metadata.key} uiLang="fr" details />
                : undefined}
              stripHeight={compact && pageIdx === 0 ? compactStripHeight(steps, "fr") : 0}
              trailingTransition={pageIdx === sheet.pages.length - 1 ? transitions?.attached.get(idx) : undefined}
            />
          ));
        }

        return [
          <SongPDFPage
            key={`${item.songSlug}-${idx}`}
            ast={ast}
            showChords={showChords}
            showPinyin={item.showPinyin}
            useJianpu={false}
            structureOverride={item.structureOverride}
            sectionNotes={item.sectionNotes ?? {}}
            sectionTransitions={item.sectionTransitions ?? {}}
            sectionNuances={item.sectionNuances ?? {}}
            sectionKeys={item.sectionKeys ?? {}}
            footerCenter={footer}
            sectionStyle={sectionStyle}
            layout={layout}
            trailingTransition={transitions?.attached.get(idx)}
          />
        ];
      })}
    </Document>
  );
}
