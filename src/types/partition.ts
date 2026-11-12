import type { JianpuChords } from "@/types/setList";

// Ma partition (docs/spec-ma-partition.md, « Rangement ») : un document par personne et par chant,
// `partitions/{uid}__{songSlug}` ; le choix de lecture suit le compte, `partitions/{uid}__choix`.

/** Trait du Crayon accroché au texte (docs/spec-ma-partition.md, § Traits). `ancre` : un caractère du texte (section,
 *  ligne dans la section, rang du caractère des paroles) ou une image de scan 简谱. Texte : `points` et `epaisseur`
 *  en em de la ligne, relatifs au coin haut-gauche du caractère. Scan : en fraction de la largeur de l'image,
 *  relatifs à son coin haut-gauche. Calculs dans `src/lib/annotations/ancres.ts`. */
export type Trait = {
  ancre: { section: string; ligne: number; car: number } | { scan: true; image: number };
  outil: "pen" | "highlighter";
  couleur: string;
  epaisseur: number;
  points: [number, number][];
};

export type Partition = {
  ownerUid: string;
  ownerName: string;
  /** Source ChordPro sur laquelle j'ai retouché (celle du culte ou l'originale), pour la fusion ligne à ligne. */
  base: string | null;
  /** Ma source ChordPro ; `null` = aucune retouche de texte. */
  content: string | null;
  /** Même forme que `structureOverride` ; `null` = structure inchangée. */
  structure: string[] | null;
  /** id de la copie de section → id de la section d'origine (comme `VersionItem.sectionOrigins`). */
  sectionOrigins?: Record<string, string>;
  jianpuChords?: JianpuChords;
  /** Ma tonalité pour ce chant ; le capo reste par appareil. */
  key: string | null;
  traits: Trait[];
  /** Uids des personnes à qui je la partage. */
  sharedWith: string[];
  /** Les traits partent-ils avec la partition (défaut `false`). */
  sharedTraits: boolean;
  updatedAt?: Date | string;
};

/** `partitions/{uid}__choix` : « Je lis », par chant. Lisible par son propriétaire seul. */
export type ChoixPartitions = {
  choices: Record<string /* songSlug */, "mienne" | "culte" | "origine" | string /* uid */>;
  partageTout: string[];
};
