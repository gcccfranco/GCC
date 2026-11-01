import { Document, Font } from "@react-pdf/renderer";
import { SongPDFPage, type SongPDFProps } from "@/components/pdf/song/pages";

export type { PdfSectionStyle } from "@/components/pdf/song/lignes";
export { CompactStrip, compactStripHeight } from "@/components/pdf/song/sections";
export { SongPDFPage, FusionPDFPage, TransitionPDFPage, JianpuPDFPage, type FusionPDFSong } from "@/components/pdf/song/pages";

// ─── Fonts ────────────────────────────────────────────────────────────────────

Font.register({
  family: "SpaceGrotesk",
  fonts: [
    { src: "/fonts/SpaceGrotesk-Light.ttf", fontWeight: 300 },
    { src: "/fonts/SpaceGrotesk-Bold.ttf",  fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter",
  fonts: [{ src: "/fonts/Inter-Regular.ttf", fontWeight: 400 }],
});
Font.register({
  family: "LiberationSans",
  fonts: [
    { src: "/fonts/LiberationSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/LiberationSans-Bold.ttf",    fontWeight: 700 },
  ],
});
Font.register({
  family: "DejaVuSans",
  fonts: [
    { src: "/fonts/DejaVuSans.ttf",         fontWeight: 400 },
    { src: "/fonts/DejaVuSans-Oblique.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});
Font.register({
  family: "SourceHanSansCN",
  fonts: [{ src: "/fonts/SourceHanSansCN-Light.ttf", fontWeight: 300 }],
});
Font.register({
  family: "KaiTi",
  fonts: [{ src: "/fonts/KaiTi.ttf", fontWeight: 400 }],
});

// ─── Document ─────────────────────────────────────────────────────────────────

export function SongPDF(props: SongPDFProps) {
  const { title, artist } = props.ast.metadata;
  return (
    <Document title={title} author={artist ?? ""}>
      <SongPDFPage {...props} />
    </Document>
  );
}
