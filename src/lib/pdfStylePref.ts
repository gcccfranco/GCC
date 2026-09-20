// Quel PDF télécharger (lot 5, docs/spec-export-pdf.md) — préférence par
// appareil (localStorage), commune au chant et à la setlist : le dernier choix
// revient présélectionné. « Compact » n'existe que pour une setlist.

export type PdfStyle = "classic" | "colors" | "compact";

const KEY = "pdf-style";

export function parsePdfStyle(v: string | null, forSetlist: boolean): PdfStyle {
  if (v === "colors") return "colors";
  if (v === "compact" && forSetlist) return "compact";
  return "classic";
}

export function getPdfStylePref(forSetlist: boolean): PdfStyle {
  try {
    return parsePdfStyle(localStorage.getItem(KEY), forSetlist);
  } catch {
    return "classic";
  }
}

export function setPdfStylePref(v: PdfStyle) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}

/** Nom du fichier : le classique garde son nom d'avant (`suffixeClassique`
 *  compris), les autres remplacent ce suffixe par le leur. */
export function pdfFileName(base: string, style: PdfStyle, suffixeClassique?: string): string {
  const suffix = style === "colors" ? "couleurs" : style === "compact" ? "compact" : suffixeClassique;
  return `${base}${suffix ? `-${suffix}` : ""}.pdf`;
}
