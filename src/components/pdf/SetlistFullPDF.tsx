import { Document } from "@react-pdf/renderer";
import { SongPDFPage, FusionPDFPage, TransitionPDFPage, type FusionPDFSong } from "@/components/pdf/SongPDF";
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
  showChords
}: {
  setlist: FSSetlist;
  contents: Record<string, SongContent>;
  showChords: boolean
}) {
  const sorted = [...setlist.items].sort((a, b) => a.position - b.position);
  const footer = `${setlist.title} - ${setlist.leader}`;

  return (
    <Document title={setlist.title}>
      {sorted.flatMap((item, idx) => {
        if (item.type === "transition") {
          if (!item.transitionText) return [];
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
              return { slug: fs.songSlug, ast, sectionNotes: fs.sectionNotes ?? {}, sectionNuances: fs.sectionNuances ?? {} };
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
              footerCenter={footer}
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
          />
        ];
      })}
    </Document>
  );
}
