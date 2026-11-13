// JV-5c (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») : étiquettes de section sur un scan 简谱 — pur.
// Une étiquette par ligne où commence au moins une section (`public/jianpu/sections.json`), dans la langue de
// l'interface, forme courte ; elle ouvre le volet Harmonie au bloc du passage (`passageDeSection`).
import { idDeSection } from "@/lib/setlist/sectionOrigins";

/** Rail des étiquettes, à gauche du scan (px CSS). La marge blanche des scans est presque nulle à l'écran (médiane
 *  27 px image, dont 14 rognés) : le rail la crée. Sous 640 px d'écran, 28 px (moins de 40 : l'initiale seule) ;
 *  au-delà, 56 px (la forme courte, sur deux lignes au besoin). Même seuil que `sm:` de Tailwind. */
export const RAIL_ETROIT = 28;
export const RAIL_LARGE = 56;
export const railEtiquettes = (largeurEcranPx: number) => (largeurEcranPx < 640 ? RAIL_ETROIT : RAIL_LARGE);

export type SectionDuScan = { id: string; label?: string; page: number; ligne: number };
/** Une étiquette : page et ligne (0-based), sections qui y commencent, forme courte et initiale. */
export type EtiquetteScan = { page: number; ligne: number; ids: string[]; court: string; initiale: string; /** Noms entiers (lecteur d'écran). */ nom: string };

/** Partie du libellé bilingue de `sections.json` (« 主歌 1/Couplet 1 ») dans la langue de l'interface. */
function partie(label: string, zh: boolean): string {
  const [a, b] = label.split("/");
  return ((zh ? a : b ?? a) ?? "").trim();
}

/** « Couplet 1 », « Couplet 2 » → « Couplets 1–2 » ; « 主歌 1 », « 主歌 2 » → « 主歌 1–2 » ; noms différents : « Couplet · Refrain ». */
export function formeCourte(noms: string[], zh: boolean): string {
  const uniques = noms.filter((n, i) => n && noms.indexOf(n) === i);
  if (uniques.length <= 1) return uniques[0] ?? "";
  const parts = uniques.map((n) => n.match(/^(.*?)\s*(\d+)$/));
  const base = parts[0]?.[1];
  if (base && parts.every((p) => p && p[1] === base)) {
    const nums = parts.map((p) => Number(p![2]));
    const pluriel = zh || /[sx]$/i.test(base) ? base : `${base}s`;
    return `${pluriel} ${Math.min(...nums)}–${Math.max(...nums)}`;
  }
  return uniques.join(" · ");
}

/** Les étiquettes d'un chant : une par (page, ligne) de début de section, dans l'ordre du scan. Une section sans
 *  libellé prend son id. */
export function etiquettesDuScan(sections: SectionDuScan[], zh: boolean): EtiquetteScan[] {
  const parLigne = new Map<string, EtiquetteScan & { noms: string[] }>();
  for (const s of sections) {
    const k = `${s.page}|${s.ligne}`;
    let e = parLigne.get(k);
    if (!e) {
      e = { page: s.page - 1, ligne: s.ligne - 1, ids: [], court: "", initiale: "", nom: "", noms: [] };
      parLigne.set(k, e);
    }
    e.ids.push(s.id);
    e.noms.push(s.label ? partie(s.label, zh) : s.id);
  }
  return [...parLigne.values()]
    .sort((a, b) => a.page - b.page || a.ligne - b.ligne)
    .map(({ noms, ...e }) => {
      const court = formeCourte(noms, zh);
      return { ...e, court, initiale: Array.from(court)[0] ?? "", nom: noms.filter((n, i) => noms.indexOf(n) === i).join(", ") };
    });
}

/** Lien `sections.json` ↔ passages : l'uid du premier passage affiché de la section `id` (Section.id du parseur,
 *  `verse-1` ; uid d'un passage : `verse-1-0`). `undefined` : la section n'est pas jouée ici. */
export function passageDeSection(id: string, uids: string[]): string | undefined {
  return uids.find((u) => u === id || idDeSection(u) === id);
}
