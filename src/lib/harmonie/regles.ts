// Harmonie (lot 9) — les règles des fiches, en degrés.
//
// Chaque fiche des familles 1 à 8 porte une « Règle » écrite en toutes lettres
// dans `docs/harmonie/*.md` (ce que Timothée relit) ; voici sa version
// exécutable. Les deux ne peuvent pas diverger : `tests/harmonie-regles.spec.ts`
// vérifie que chaque fiche avec une règle a son entrée ici, et l'inverse.
//
// Une règle sert deux fois : à trouver les **exemples du répertoire** (les
// chants qui jouent déjà le « après »), et à proposer une **suggestion** sur un
// chant (le « avant » trouvé, le « après » proposé).

import type { Qualite } from "./degres";

/** Où le motif est cherché. */
export type Position =
  /** N'importe où dans la section. */
  | "partout"
  /** Dans une même ligne. */
  | "ligne"
  /** À la fin d'une ligne. */
  | "fin-ligne"
  /** À la fin d'une section. */
  | "fin-section"
  /** À la fin d'une section suivie d'un refrain. */
  | "avant-refrain"
  /** À la toute fin du chant (dernière occurrence). */
  | "fin-chant"
  /** Un accord seul, qui dure (une ligne d'un seul accord). */
  | "tenu";

/** Type de section, vocabulaire du parseur ChordPro. `interlude` = section
 *  instrumentale (« other » dont le nom parle d'interlude ou d'instrumental). */
export type TypeSection = "intro" | "verse" | "chorus" | "bridge" | "prechorus" | "postchorus" | "outro" | "interlude";

export type Surete = "tres-sure" | "sure" | "a-ecouter";

/** Un accord du motif. Ce qui n'est pas écrit est indifférent. */
export interface Pas {
  /** Demi-tons depuis la tonique. */
  st: number;
  qual?: Qualite;
  /** `null` = l'accord ne doit pas être renversé ; un nombre = cette basse. */
  basse?: number | null;
  /** L'étiquette doit être nue (« D », « Bm ») : ni septième, ni couleur. */
  simple?: boolean;
  /** L'étiquette doit contenir l'un de ces morceaux (« maj7 », « sus4 »…). */
  contient?: string[];
}

export interface Variante {
  motif: Pas[];
  apres: Pas[];
}

export interface Regle {
  /** Identique à l'id de la fiche. */
  fiche: string;
  position: Position;
  /** Types de section où la règle s'applique ; absent = tous. */
  sections?: TypeSection[];
  variantes: Variante[];
  surete: Surete;
  /** Règles sans motif d'accords, traitées à part par le moteur. */
  genre?: "intro-absente" | "tag";
  /** « le 1 n'étant pas le premier accord de la section » (S5). */
  sansTeteDeSection?: boolean;
  /** « le second n'étant pas le dernier accord de la section » (S2). */
  sansFinDeSection?: boolean;
  /** « suivie d'une autre occurrence » : jamais sur la dernière section (S4). */
  sansDerniereSection?: boolean;
}

// Raccourcis de lecture : le degré, puis la qualité.
const M = (st: number, extra: Omit<Pas, "st" | "qual"> = {}): Pas => ({ st, qual: "maj", ...extra });
const m = (st: number, extra: Omit<Pas, "st" | "qual"> = {}): Pas => ({ st, qual: "min", ...extra });
const dim = (st: number): Pas => ({ st, qual: "dim" });
const sur = (st: number, basse: number): Pas => ({ st, qual: "maj", basse });
const v = (motif: Pas[], apres: Pas[]): Variante => ({ motif, apres });

// Degrés : 1 = 0 · 2 = 2 · b3 = 3 · 3 = 4 · 4 = 5 · #4 = 6 · 5 = 7 · b6 = 8 ·
// 6 = 9 · b7 = 10 · 7 = 11.
const D1 = 0, D2 = 2, Db3 = 3, D3 = 4, D4 = 5, Dd4 = 6, D5 = 7, Db6 = 8, D6 = 9, Db7 = 10, D7 = 11;

export const REGLES: Regle[] = [
  // ─── 01 Substitutions ──────────────────────────────────────────────────────
  {
    fiche: "substitutions/2m7-pour-4",
    position: "partout",
    surete: "tres-sure",
    variantes: [v([M(D4, { basse: null }), M(D5)], [m(D2, { contient: ["m7"] }), M(D5)])],
  },
  {
    fiche: "substitutions/6m-pour-1-repete",
    position: "partout",
    surete: "sure",
    // « deux 1 à la suite, le second n'étant pas le dernier accord de la section »
    sansFinDeSection: true,
    variantes: [v([M(D1, { basse: null }), M(D1, { basse: null })], [M(D1), m(D6)])],
  },
  {
    fiche: "substitutions/4-pour-2m",
    position: "partout",
    surete: "sure",
    variantes: [v([m(D2), M(D5)], [M(D4), M(D5)])],
  },
  {
    fiche: "substitutions/cadence-rompue",
    position: "fin-section",
    surete: "sure",
    // « à la fin d'une occurrence suivie d'une autre occurrence de la même
    // section » : jamais à la toute fin du chant, ce que la fiche exclut.
    sansDerniereSection: true,
    variantes: [v([M(D5), M(D1)], [M(D5), m(D6)])],
  },
  {
    fiche: "substitutions/3m-pour-1",
    position: "ligne",
    surete: "a-ecouter",
    // « le 1 n'étant ni le premier accord de la section ni le dernier de sa ligne »
    sansTeteDeSection: true,
    variantes: [
      v([M(D1, { basse: null }), m(D6)], [m(D3), m(D6)]),
      v([M(D1, { basse: null }), M(D4)], [m(D3), M(D4)]),
    ],
  },
  {
    fiche: "substitutions/4-sur-5-pour-5",
    position: "fin-ligne",
    surete: "a-ecouter",
    variantes: [v([M(D5, { simple: true, basse: null }), M(D1)], [sur(D4, D5), M(D1)])],
  },

  // ─── 02 Couleurs ───────────────────────────────────────────────────────────
  {
    fiche: "couleurs/accord-2",
    position: "partout",
    sections: ["intro", "chorus"],
    surete: "tres-sure",
    variantes: [
      v([M(D1, { simple: true })], [M(D1, { contient: ["2", "add9"] })]),
      v([M(D4, { simple: true })], [M(D4, { contient: ["2", "add9"] })]),
    ],
  },
  {
    fiche: "couleurs/sus4-resolu",
    position: "fin-ligne",
    surete: "sure",
    // « 5sus4 – 5 → 1 » : la résolution fait partie de l'idée.
    variantes: [v([M(D5, { simple: true }), M(D1)], [M(D5, { contient: ["sus4"] }), M(D5), M(D1)])],
  },
  {
    fiche: "couleurs/sus2",
    position: "tenu",
    sections: ["intro", "bridge"],
    surete: "sure",
    variantes: [v([M(D1, { simple: true })], [M(D1, { contient: ["sus2", "2"] })])],
  },
  {
    fiche: "couleurs/maj7",
    position: "partout",
    sections: ["verse", "bridge"],
    surete: "sure",
    variantes: [v([M(D4, { simple: true })], [M(D4, { contient: ["maj7"] })])],
  },
  {
    fiche: "couleurs/6-et-6-9",
    position: "fin-chant",
    surete: "sure",
    variantes: [v([M(D1, { simple: true })], [M(D1, { contient: ["6", "6/9"] })])],
  },
  {
    fiche: "couleurs/m7",
    position: "partout",
    surete: "tres-sure",
    variantes: [
      v([m(D6, { simple: true })], [m(D6, { contient: ["m7"] })]),
      v([m(D2, { simple: true })], [m(D2, { contient: ["m7"] })]),
    ],
  },

  // ─── 03 Basses ─────────────────────────────────────────────────────────────
  {
    fiche: "basses/descend",
    position: "partout",
    surete: "sure",
    variantes: [v([M(D1, { basse: null }), m(D6)], [M(D1), sur(D5, D7), m(D6)])],
  },
  {
    fiche: "basses/monte",
    position: "partout",
    surete: "a-ecouter",
    variantes: [v([M(D4), m(D6)], [M(D4), M(D5), m(D6)])],
  },
  {
    fiche: "basses/1-sur-3",
    position: "partout",
    surete: "tres-sure",
    variantes: [v([M(D1, { basse: null }), M(D4)], [M(D1), sur(D1, D3), M(D4)])],
  },
  {
    fiche: "basses/5-sur-7",
    position: "partout",
    surete: "a-ecouter",
    variantes: [v([M(D5, { basse: null }), M(D1, { basse: null })], [sur(D5, D7), M(D1)])],
  },
  {
    fiche: "basses/pedale-de-1",
    position: "partout",
    sections: ["intro", "bridge"],
    surete: "sure",
    // Trois accords en position fondamentale : poser une pédale sur des
    // accords déjà renversés effacerait la ligne de basse écrite.
    variantes: [v([M(D1, { basse: null }), M(D4, { basse: null }), M(D1, { basse: null })], [M(D1), sur(D4, D1), M(D1)])],
  },
  {
    fiche: "basses/chromatique",
    position: "partout",
    sections: ["verse", "bridge"],
    surete: "a-ecouter",
    variantes: [v([M(D1, { basse: null }), M(D1, { basse: null }), M(D4)], [M(D1), sur(D1, D7), sur(D1, Db7), sur(D4, D6)])],
  },

  // ─── 04 Accords de passage ─────────────────────────────────────────────────
  {
    fiche: "passage/5-du-6m",
    position: "partout",
    surete: "a-ecouter",
    variantes: [
      v([M(D1, { basse: D3 }), m(D6)], [M(D3, { contient: ["7"] }), m(D6)]),
      v([M(D1, { basse: null }), m(D6)], [M(D3, { contient: ["7"] }), m(D6)]),
    ],
  },
  {
    fiche: "passage/5-du-4",
    position: "partout",
    surete: "sure",
    variantes: [v([M(D1, { basse: null }), M(D4)], [M(D1), M(D1, { contient: ["7"] }), M(D4)])],
  },
  {
    fiche: "passage/5-du-2m",
    position: "partout",
    surete: "a-ecouter",
    variantes: [v([m(D6), m(D2)], [M(D6, { contient: ["7"] }), m(D2)])],
  },
  {
    fiche: "passage/5-du-5",
    position: "partout",
    surete: "a-ecouter",
    variantes: [v([m(D2), M(D5)], [M(D2, { contient: ["7"] }), M(D5)])],
  },
  {
    fiche: "passage/diminue",
    position: "partout",
    surete: "a-ecouter",
    variantes: [v([M(D1), m(D2)], [M(D1), dim(1), m(D2)])],
  },
  {
    fiche: "passage/2-5-mineur",
    position: "partout",
    sections: ["bridge", "verse"],
    surete: "a-ecouter",
    variantes: [v([M(D5), m(D6)], [{ st: D7, qual: "min", contient: ["m7b5"] }, M(D3, { contient: ["7"] }), m(D6)])],
  },

  // ─── 05 Emprunts au mineur ─────────────────────────────────────────────────
  {
    fiche: "emprunts/4m-avant-1",
    position: "fin-section",
    surete: "a-ecouter",
    variantes: [v([M(D4), M(D1)], [M(D4), m(D4), M(D1)])],
  },
  {
    fiche: "emprunts/b6-b7-1",
    position: "fin-chant",
    surete: "a-ecouter",
    variantes: [v([M(D5), M(D1)], [M(Db6), M(Db7), M(D1)])],
  },
  {
    fiche: "emprunts/b7-4-1",
    position: "fin-ligne",
    surete: "a-ecouter",
    variantes: [v([M(D4), M(D1)], [M(Db7), M(D4), M(D1)])],
  },
  {
    fiche: "emprunts/b3-de-passage",
    position: "partout",
    sections: ["intro", "interlude"],
    surete: "a-ecouter",
    variantes: [v([M(D1), M(D4)], [M(D1), M(Db3), M(D4)])],
  },
  {
    fiche: "emprunts/b6-pour-4",
    position: "fin-chant",
    surete: "a-ecouter",
    variantes: [v([M(D4), M(D1)], [M(Db6), M(D1)])],
  },

  // ─── 06 Montées ────────────────────────────────────────────────────────────
  {
    fiche: "montees/2m7-4-sur-5",
    position: "avant-refrain",
    surete: "a-ecouter",
    variantes: [
      v([M(D4), M(D5)], [m(D2, { contient: ["m7"] }), sur(D4, D5)]),
      v([m(D2), M(D5)], [m(D2, { contient: ["m7"] }), sur(D4, D5)]),
    ],
  },
  {
    fiche: "montees/5sus4-tenu",
    position: "avant-refrain",
    surete: "sure",
    variantes: [v([M(D5, { simple: true })], [M(D5, { contient: ["sus4"] }), M(D5)])],
  },
  {
    fiche: "montees/4-5-sur-4",
    position: "avant-refrain",
    surete: "sure",
    variantes: [v([M(D4), M(D5, { basse: null })], [M(D4), sur(D5, D4)])],
  },
  {
    fiche: "montees/4-diminue-1-sur-5",
    position: "fin-section",
    surete: "a-ecouter",
    variantes: [v([M(D4), M(D5), M(D1)], [M(D4), dim(Dd4), sur(D1, D5), M(D5), M(D1)])],
  },

  // ─── 07 Intros, interludes et fins ─────────────────────────────────────────
  {
    fiche: "intros-fins/intro-fin-du-refrain",
    position: "partout",
    genre: "intro-absente",
    surete: "tres-sure",
    variantes: [],
  },
  {
    fiche: "intros-fins/intro-pedale",
    position: "partout",
    sections: ["intro"],
    surete: "sure",
    variantes: [
      v([M(D1, { basse: null }), M(D4, { basse: null }), M(D1, { basse: null })], [M(D1), sur(D4, D1), M(D1)]),
      v([M(D1, { basse: null }), M(D5, { basse: null }), M(D1, { basse: null })], [M(D1), sur(D5, D1), M(D1)]),
    ],
  },
  {
    fiche: "intros-fins/interlude-boucle",
    position: "tenu",
    sections: ["interlude"],
    surete: "sure",
    variantes: [v([M(D1)], [M(D1), sur(D4, D1)])],
  },
  {
    fiche: "intros-fins/tag",
    position: "fin-chant",
    genre: "tag",
    surete: "tres-sure",
    variantes: [],
  },
  {
    fiche: "intros-fins/fin-ouverte-6m7",
    position: "fin-chant",
    surete: "tres-sure",
    variantes: [v([M(D1, { simple: true })], [m(D6, { contient: ["m7"] })])],
  },
  {
    fiche: "intros-fins/fin-suspendue",
    position: "fin-chant",
    surete: "tres-sure",
    variantes: [v([M(D1, { simple: true })], [M(D1, { contient: ["2", "add9"] })])],
  },
  {
    fiche: "intros-fins/fin-amen",
    position: "fin-chant",
    surete: "sure",
    variantes: [v([M(D5), M(D1)], [M(D5), M(D1), sur(D4, D1), M(D1)])],
  },
];

export const regleDeLaFiche = (fiche: string): Regle | undefined => REGLES.find((r) => r.fiche === fiche);

// ─── Modulations (famille 8) ─────────────────────────────────────────────────
// Elles ne cherchent pas un motif : elles posent un 升调 sur le dernier refrain
// et, sauf D5, un accord d'approche à la fin de la section précédente.

export interface Modulation {
  fiche: string;
  /** Demi-tons ajoutés au dernier refrain. */
  demiTons: number;
  /** Accord d'approche, en degrés **de la nouvelle tonalité** ; vide = aucun. */
  approche: Pas[];
}

export const MODULATIONS: Modulation[] = [
  { fiche: "modulations/ton-par-le-5", demiTons: 2, approche: [M(D5, { contient: ["7"] })] },
  { fiche: "modulations/demi-ton-par-le-5", demiTons: 1, approche: [M(D5, { contient: ["7"] })] },
  { fiche: "modulations/ton-par-b6-b7", demiTons: 2, approche: [M(Db6), M(Db7)] },
  { fiche: "modulations/ton-par-4-sur-5", demiTons: 2, approche: [sur(D4, D5)] },
  { fiche: "modulations/directe", demiTons: 2, approche: [] },
];
