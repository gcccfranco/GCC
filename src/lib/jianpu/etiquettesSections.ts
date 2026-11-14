// JV-5c (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») : étiquettes de section sur un scan 简谱 — pur.
// Une étiquette par ligne où commence au moins une section (`public/jianpu/sections.json`), dans la langue de
// l'interface, pastilles rondes (une par section) ; chacune ouvre le volet Harmonie au bloc du passage (`passageDeSection`).
import { idDeSection } from "@/lib/setlist/sectionOrigins";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { SECTION_PALETTE_KEY } from "@/lib/sectionPalette";

/** Rail des étiquettes, à gauche du scan (px CSS). La marge blanche des scans est presque nulle à l'écran (médiane
 *  27 px image, dont 14 rognés) : le rail la crée. Sous 640 px d'écran, 32 px (une pastille ronde de 26 px) ;
 *  au-delà, 56 px (pastille de 30 px, sigle jusqu'à « Tag »). Même seuil que `sm:` de Tailwind. */
export const RAIL_ETROIT = 32;
export const RAIL_LARGE = 56;
export const railEtiquettes = (largeurEcranPx: number) => (largeurEcranPx < 640 ? RAIL_ETROIT : RAIL_LARGE);

export type SectionDuScan = { id: string; label?: string; page: number; ligne: number };
/** Une étiquette : page et ligne (0-based), sections qui y commencent et une pastille par section (`cle` : clé de couleur). */
export type EtiquetteScan = { page: number; ligne: number; ids: string[]; pastilles: { id: string; abbr: string; nom: string; cle: string }[]; /** Noms entiers (lecteur d'écran). */ nom: string };

/** Partie du libellé bilingue de `sections.json` (« 主歌 1/Couplet 1 ») dans la langue de l'interface. */
function partie(label: string, zh: boolean): string {
  const [a, b] = label.split("/");
  return ((zh ? a : b ?? a) ?? "").trim();
}

/** Les étiquettes d'un chant : une par (page, ligne) de début de section, dans l'ordre du scan, chacune avec une
 *  pastille par section (sigle de l'en-tête du chant, mêmes en fr et en 中文). Une section sans libellé prend son id. */
export function etiquettesDuScan(sections: SectionDuScan[], zh: boolean): EtiquetteScan[] {
  const parLigne = new Map<string, EtiquetteScan & { noms: string[] }>();
  for (const s of sections) {
    const k = `${s.page}|${s.ligne}`;
    let e = parLigne.get(k);
    if (!e) {
      e = { page: s.page - 1, ligne: s.ligne - 1, ids: [], pastilles: [], nom: "", noms: [] };
      parLigne.set(k, e);
    }
    const type = s.id.replace(/-\d+$/, "");
    const nom = s.label ? partie(s.label, zh) : s.id;
    const fr = s.label ? partie(s.label, false).replace(/\s*\(x\d+\)\s*/gi, " ").trim() : "";
    const m = fr.match(/^(.*?)\s*(\d+)$/);
    const abbr = abbreviateSection({ type, name: s.label ? (m ? m[1] : fr) : undefined, number: m?.[2] });
    e.ids.push(s.id);
    e.pastilles.push({ id: s.id, abbr, nom, cle: SECTION_PALETTE_KEY[type] ?? type });
    e.noms.push(nom);
  }
  return [...parLigne.values()]
    .sort((a, b) => a.page - b.page || a.ligne - b.ligne)
    .map(({ noms, ...e }) => ({ ...e, nom: noms.filter((n, i) => noms.indexOf(n) === i).join(", ") }));
}

/** Lien `sections.json` ↔ passages : l'uid du premier passage affiché de la section `id` (Section.id du parseur,
 *  `verse-1` ; uid d'un passage : `verse-1-0`). `undefined` : la section n'est pas jouée ici. */
export function passageDeSection(id: string, uids: string[]): string | undefined {
  return uids.find((u) => u === id || idDeSection(u) === id);
}
