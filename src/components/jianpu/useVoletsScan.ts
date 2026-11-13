import { useMemo } from "react";
import { useJianpuChords, useJianpuMarges, useJianpuSections, useJianpuSystemes, type JianpuEntry } from "@/lib/jianpu/images";
import { bornesX, voletsDemiLignes, type Volets } from "@/lib/performance/tranchesScan";
import { MARGE_SOURCE } from "./JianpuSheet";
import { RAIL_LARGE } from "@/lib/jianpu/etiquettesSections";

/** Volets (deux colonnes de demi-lignes) d'un scan certifié dans une zone de `largeurZonePx` ; `null` : une colonne
 *  (fichiers pas chargés, scan sans calque ou sans systèmes, zone étroite, accords trop petits). Gouttière : 24 px. */
/** `avecEtiquettes` (JV-5c, accès Harmonie) : chaque colonne garde à sa gauche le rail des étiquettes de section (zone
 *  d'au moins 1 000 px : rail large). */
export function useVoletsScan(slug: string | null | undefined, entry: JianpuEntry, largeurZonePx: number | null, avecEtiquettes = false): Volets | null {
  const systemes = useJianpuSystemes();
  const marges = useJianpuMarges(slug);
  const sections = useJianpuSections();
  const chords = useJianpuChords(slug);
  return useMemo(() => {
    const chant = slug ? systemes?.[slug] : undefined;
    if (!largeurZonePx || !marges || !sections || !chords || !chant || chant.pages.length !== entry.pages.length) return null;
    return voletsDemiLignes(
      chant.pages.map((p, i) => ({ lignes: p.lignes, h: p.h, ...bornesX(p.w, marges[i]) })),
      sections[slug!]?.sections ?? [],
      (largeurZonePx - 24) / 2 - (avecEtiquettes && sections[slug!]?.sections.length ? RAIL_LARGE : 0),
      920 / (entry.pages[0].w - 2 * MARGE_SOURCE),
      chords.labelH,
    );
  }, [slug, systemes, marges, sections, chords, entry, largeurZonePx, avecEtiquettes]);
}
