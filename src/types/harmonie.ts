// Harmonie (lot 9, docs/spec-harmonie.md) — le vocabulaire du catalogue et la
// forme d'une fiche. Les fiches sont écrites en français dans
// `docs/harmonie/*.md` (Timothée les relit là), lues par
// `src/lib/harmonie/fiches.ts` et publiées dans `public/harmonie-index.json`
// par `npm run build:index`.

export type Instrument = "piano" | "guitare";
export type Niveau = "facile" | "intermediaire" | "avance";
export type Statut = "a-valider" | "validee" | "a-revoir";

/** Les 12 sensations (entretien du 17/09/2026), dans l'ordre des filtres. */
export const SENSATIONS = [
  "epique", "majeste", "tension", "repos", "surprise", "suspendu",
  "emerveillement", "douceur", "tendresse", "gravite", "lumiere", "joie",
] as const;
export type Sensation = (typeof SENSATIONS)[number];

/** Les 7 moments d'un chant. */
export const MOMENTS = ["intro", "couplet", "montee", "refrain", "pont", "fin", "transition"] as const;
export type Moment = (typeof MOMENTS)[number];

/** Le français des fiches → la clé stable. Le 中文 vit dans les locales. */
export const SENSATION_FR: Record<string, Sensation> = {
  "Épique": "epique",
  "Majesté": "majeste",
  "Tension": "tension",
  "Repos": "repos",
  "Surprise": "surprise",
  "Suspendu et planant": "suspendu",
  "Émerveillement": "emerveillement",
  "Douceur et intimité": "douceur",
  "Tendresse et nostalgie": "tendresse",
  "Gravité et recueillement": "gravite",
  "Lumière et espérance": "lumiere",
  "Joie et élan": "joie",
};

export const MOMENT_FR: Record<string, Moment> = {
  Intro: "intro",
  Couplet: "couplet",
  Montée: "montee",
  Refrain: "refrain",
  Pont: "pont",
  Fin: "fin",
  Transition: "transition",
};

export const NIVEAU_FR: Record<string, Niveau> = {
  facile: "facile",
  intermédiaire: "intermediaire",
  avancé: "avance",
};

export const STATUT_FR: Record<string, Statut> = {
  "à valider": "a-valider",
  validée: "validee",
  "à revoir": "a-revoir",
};

export interface Fiche {
  /** « substitutions/2m7-pour-4 » */
  id: string;
  /** « S1 » */
  code: string;
  /** « substitutions » */
  famille: string;
  /** « Substitutions » */
  familleNom: string;
  nom: string;
  statut: Statut;
  /** Fiche propre à un instrument (voicings) ; absente = les deux. */
  instrument?: Instrument;
  sensations: Sensation[];
  moments: Moment[];
  /** Niveau par instrument ; une fiche propre à un instrument n'en a qu'un. */
  niveau: Partial<Record<Instrument, Niveau>>;
  /** Remarque écrite à côté du niveau (« à préparer avec l'équipe »). */
  niveauNote?: string;
  avantApres?: string;
  pourquoi?: string;
  eviter: string[];
  piano?: string;
  guitare?: string;
  /** La phrase « Dans le répertoire » de la fiche (exemples vérifiés à la main). */
  repertoire?: string;
  /** La règle en toutes lettres ; sa version exécutable est dans `regles.ts`. */
  regle?: string;
  /** Slugs des chants qui jouent **déjà** le « après », calculés au build,
   *  du plus chanté au moins chanté une fois dans le navigateur. */
  exemples: string[];
}

/** Une étape du parcours « Par où commencer ». */
export interface EtapeParcours {
  n: number;
  /** Une fiche, ou deux quand l'étape diffère selon l'instrument. */
  fiches: string[];
  pourquoi: string;
}

export interface HarmonieIndex {
  genereLe: string;
  fiches: Fiche[];
  parcours: EtapeParcours[];
}
