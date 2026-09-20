import type { JianpuChordLabel } from "@/lib/jianpu/images";
import type { JianpuChords } from "@/types/setList";
import { CHORD_TOKEN } from "@/lib/transpose";

// Retouches d'accords sur une partition 简谱 affichée en scan (lot 9,
// docs/spec-harmonie.md). Le calque publié (`public/jianpu/chords.json`) est
// certifié et gelé : une retouche vit dans l'item de setlist ou dans « Ma
// version », jamais dans le calque.

/** Quelque chose à afficher ? (`{}` = plus aucune retouche). */
export function aDesRetouches(r: JianpuChords | undefined): boolean {
  return Boolean(r && (Object.keys(r.changed ?? {}).length > 0 || r.added?.length));
}

/** Ce qu'un doigt posé sur le scan vise : une étiquette gravée, un accord
 *  déjà ajouté, ou une place libre sur une ligne d'accords. */
export type CibleRetouche =
  | { kind: "etiquette"; index: number }
  | { kind: "ajout"; index: number }
  | { kind: "nouveau"; x: number; y: number };

/** Boîte tactile d'une étiquette : celle du masque du calque, qui déborde de
 *  l'amas détecté de quelques pixels. */
function dans(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x - 3 && px <= x + w + 4 && py >= y - 6 && py <= y + h + 6;
}

/** Largeur approchée d'un accord ajouté — une cible du doigt, pas une mesure. */
function largeurAjout(c: string, labelH: number): number {
  return Math.max(labelH, c.length * labelH * 0.62);
}

/**
 * Cible d'un toucher en (px, py), exprimé en pixels de l'image du scan.
 *
 * Une mention gravée qui n'est pas un accord seul — ligne d'intro
 * « 【前奏 | G D/F# | D】 », « F或F/Eb » — n'est pas remplaçable par un accord
 * du pavé : le doigt passe au travers, vers la ligne. Loin de toute ligne
 * d'accords, rien n'est visé : on ne pose pas un accord au milieu des
 * chiffres.
 */
export function cibleRetouche(
  labels: JianpuChordLabel[],
  labelH: number,
  retouches: JianpuChords | undefined,
  px: number,
  py: number,
): CibleRetouche | null {
  const ajouts = retouches?.added ?? [];
  // Les ajouts se dessinent par-dessus tout : ils se touchent d'abord.
  for (let i = ajouts.length - 1; i >= 0; i--) {
    const a = ajouts[i];
    if (dans(px, py, a.x, a.y, largeurAjout(a.c, labelH), labelH)) return { kind: "ajout", index: i };
  }
  for (let n = 0; n < labels.length; n++) {
    const l = labels[n];
    const texte = (retouches?.changed?.[n] ?? l.c).trim();
    if (texte && !CHORD_TOKEN.test(texte)) continue;
    if (dans(px, py, l.x, l.y, l.w, l.h)) return { kind: "etiquette", index: n };
  }
  // La ligne d'accords touchée : le nouvel accord se pose à la hauteur de son
  // voisin le plus proche, comme les autres accords de la ligne.
  const ligne = [
    ...labels.map((l) => ({ x: l.x, y: l.y, h: l.h })),
    ...ajouts.map((a) => ({ x: a.x, y: a.y, h: labelH })),
  ].filter((l) => py >= l.y - 6 && py <= l.y + l.h + 6);
  if (!ligne.length) return null;
  const proche = ligne.reduce((a, b) => (Math.abs(b.x - px) < Math.abs(a.x - px) ? b : a));
  return { kind: "nouveau", x: Math.round(px), y: proche.y };
}
