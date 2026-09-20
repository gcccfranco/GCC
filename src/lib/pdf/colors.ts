// Couleurs des PDF recopiées de l'écran (lot 5, docs/spec-export-pdf.md) :
// react-pdf ne lit ni les classes Tailwind ni les variables CSS, il lui faut
// des hexadécimaux. Fonctions pures, partagées avec les tests.

import { nuanceDef } from "@/lib/setlist/nuances";

export type NuancePdfColors =
  | { background: string; color: string }
  | { border: string; color: string };

// Nuancier gris de l'écran (SongView, NUANCE_INTENSITY_CLASS / NUANCE_NEUTRAL_CLASS) :
// stone-200 / stone-700, stone-400 à 80 % sur blanc / stone-950, stone-800 / blanc ;
// indications en contour stone-400 à 80 %, texte stone-700.
const STONE_400_80 = "#b9b5b1";
const NUANCE_BY_INTENSITY: Record<1 | 2 | 3, { background: string; color: string }> = {
  1: { background: "#e7e5e4", color: "#44403c" },
  2: { background: STONE_400_80, color: "#0c0a09" },
  3: { background: "#292524", color: "#ffffff" },
};

export function nuancePdfColors(id: string): NuancePdfColors {
  const intensity = nuanceDef(id)?.intensity;
  return intensity ? NUANCE_BY_INTENSITY[intensity] : { border: STONE_400_80, color: "#44403c" };
}

// Texte de nuance sous une pastille du bandeau (SongView, NUANCE_TEXT_INTENSITY_CLASS) :
// stone-500, stone-700, stone-950 gras ; indications stone-600.
export function nuanceTextPdfColor(id: string): { color: string; bold: boolean } {
  const intensity = nuanceDef(id)?.intensity;
  if (intensity === 1) return { color: "#78716c", bold: false };
  if (intensity === 2) return { color: "#44403c", bold: false };
  if (intensity === 3) return { color: "#0c0a09", bold: true };
  return { color: "#57534e", bold: false };
}

// Couleurs par section (palette --sec-* claire de globals.css) avec la même
// correspondance que l'écran (SongView, CHART_TYPE_COLOR / SECTION_PALETTE_KEY) :
// post-refrain et final prennent le refrain, tout type absent tombe sur « autre ».
const SEC = {
  intro: { color: "#5b7fa6", tint: "#eef3f9" },
  verse: { color: "#2c8a7d", tint: "#e8f3f0" },
  prechorus: { color: "#c1871f", tint: "#faf2e1" },
  chorus: { color: "#e0560a", tint: "#fcece1" },
  bridge: { color: "#7a5bcb", tint: "#f0ecf9" },
  outro: { color: "#4f6477", tint: "#eef1f5" },
  coda: { color: "#4f6477", tint: "#eef1f5" },
  other: { color: "#6b7280", tint: "#f1f3f6" },
} as const;

const SEC_KEY: Record<string, keyof typeof SEC> = {
  intro: "intro",
  verse: "verse",
  prechorus: "prechorus",
  chorus: "chorus",
  postchorus: "chorus",
  final: "chorus",
  bridge: "bridge",
  outro: "outro",
  coda: "coda",
};

export function sectionPdfPalette(type: string): { color: string; tint: string } {
  return SEC[SEC_KEY[type] ?? "other"];
}
