// Nuances par section — dynamiques et indications d'expression que la présidence
// souhaite pour chaque section d'un chant dans une setlist.
// Stockées par item de setlist dans `sectionNuances` (voir types/setList.ts),
// keyées par uid/clé de section comme `sectionNotes`.

export type NuanceGroup = "dynamic" | "expression";

export type NuanceDef = {
  /** Identifiant stable stocké dans Firestore. */
  id: string;
  /** Libellé affiché sur le badge (abréviation pour les dynamiques). */
  label: string;
  /** Forme longue, en info-bulle / aide. */
  full: string;
  group: NuanceGroup;
  /** Nuancier : 1 doux, 2 moyen, 3 fort (dynamiques seulement). */
  intensity?: 1 | 2 | 3;
  /** Variation progressive : flèche qui monte ou qui descend. */
  trend?: "up" | "down";
};

/** Vocabulaire des nuances prédéfinies, dans l'ordre d'affichage. */
export const NUANCES: NuanceDef[] = [
  // Dynamiques, du plus doux au plus fort
  { id: "pp", label: "pp", full: "pianissimo (très doux)", group: "dynamic", intensity: 1 },
  { id: "p", label: "p", full: "piano (doux)", group: "dynamic", intensity: 1 },
  { id: "mp", label: "mp", full: "mezzo piano (moyennement doux)", group: "dynamic", intensity: 2 },
  { id: "mf", label: "mf", full: "mezzo forte (moyennement fort)", group: "dynamic", intensity: 2 },
  { id: "f", label: "f", full: "forte (fort)", group: "dynamic", intensity: 3 },
  { id: "ff", label: "ff", full: "fortissimo (très fort)", group: "dynamic", intensity: 3 },
  // Variations progressives
  { id: "cresc", label: "cresc.", full: "crescendo (monter)", group: "dynamic", intensity: 2, trend: "up" },
  { id: "decresc", label: "decresc.", full: "decrescendo (baisser)", group: "dynamic", intensity: 2, trend: "down" },
  // Expression / mise en place
  { id: "acappella", label: "a cappella", full: "a cappella (sans instruments)", group: "expression" },
  { id: "instrumental", label: "instrumental", full: "instrumental (sans voix)", group: "expression" },
  { id: "solo", label: "voix seule", full: "voix seule / solo", group: "expression" },
  { id: "tutti", label: "tous", full: "tutti (tous ensemble)", group: "expression" },
  { id: "spontane", label: "spontané", full: "spontané / libre", group: "expression" },
  { id: "break", label: "break", full: "silence / break", group: "expression" },
];

const NUANCE_BY_ID: Record<string, NuanceDef> = Object.fromEntries(
  NUANCES.map((n) => [n.id, n])
);

/** Libellé de badge pour un id de nuance (fallback : l'id brut). */
export function nuanceLabel(id: string): string {
  return NUANCE_BY_ID[id]?.label ?? id;
}

/** Définition d'une nuance (absente pour un id inconnu). */
export function nuanceDef(id: string): NuanceDef | undefined {
  return NUANCE_BY_ID[id];
}

/** Forme longue pour l'info-bulle (fallback : le libellé). */
export function nuanceFull(id: string): string {
  return NUANCE_BY_ID[id]?.full ?? nuanceLabel(id);
}

/** Couleur du badge de nuance (hex pour le PDF ; côté web on utilise violet-*). */
export const NUANCE_COLOR = "#7C3AED";
