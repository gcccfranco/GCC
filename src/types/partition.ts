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
  /** Transparence (AN-4) ; absent = rendu d'avant : 1 pour le stylo, 0,35 pour le surligneur. */
  alpha?: number;
  points: [number, number][];
};

export type GenreTampon = "p" | "mf" | "f" | "ff" | "x2" | "seul" | "tutti";

/** Texte tapé (AN-5), posé au point `points[0]` (début de la ligne de texte, au milieu de sa hauteur) ; `taille` = corps
 *  en em (ou fraction de largeur sur un scan), comme l'épaisseur d'un trait. */
export type TexteAncre = { ancre: Trait["ancre"]; outil: "text"; texte: string; points: [number, number][]; taille: number; couleur: string };
/** Tampon (AN-5) : nuance, ×2, seul, tutti. On enregistre le genre, pas le texte (seul/tutti suivent la langue). `points[0]` = centre. */
export type Tampon = { ancre: Trait["ancre"]; outil: "stamp"; genre: GenreTampon; points: [number, number][]; taille: number; couleur: string };
export type Signe = TexteAncre | Tampon;

/** Élément de `traits` qu'une version plus ancienne ne comprend pas (genre de tampon inconnu…) : gardé tel quel et réécrit à
 *  l'enregistrement (AN-4, « Compatibilité du format »). Seuls les vrais `Trait` et `Signe` se dessinent, s'ancrent ou se gomment. */
export type ElementInconnu = Record<string, unknown> & { __inconnu?: never };
export type ElementTrait = Trait | Signe | ElementInconnu;

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
  traits: ElementTrait[];
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
