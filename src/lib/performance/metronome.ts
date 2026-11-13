// Métronome visuel (lot MT) : calculs purs, sans React. L'horloge `t` (ms) est passée en paramètre
// (`performance.now()` en MT-1, Web Audio en MT-3).

export type Accent = "fort" | "moyen" | "faible" | "muet";
export type Mesure = { temps: number; unite: 4 | 8; groupes: number[]; compose: boolean };

/** « 4/4 », « 6/8 »… ; absent ou invalide (n hors 1..12, d hors 4 / 8) → 4/4. Composé : unité 8, n multiple de 3, n ≥ 6. */
export function parseMesure(time?: string | null): Mesure {
  const m = /^\s*(\d{1,2})\s*\/\s*(4|8)\s*$/.exec(time ?? "");
  const n = m ? Number(m[1]) : 4;
  const unite = (m && n >= 1 && n <= 12 ? Number(m[2]) : 4) as 4 | 8;
  const temps = m && n >= 1 && n <= 12 ? n : 4;
  const compose = unite === 8 && temps >= 6 && temps % 3 === 0;
  return { temps, unite, compose, groupes: compose ? Array(temps / 3).fill(3) : [temps] };
}

export function accentsParDefaut(m: Mesure): Accent[] {
  const debuts = new Set<number>();
  let i = 0;
  for (const g of m.groupes) { debuts.add(i); i += g; }
  return Array.from({ length: m.temps }, (_, k): Accent => (k === 0 ? "fort" : m.compose && debuts.has(k) ? "moyen" : "faible"));
}

/** Durée d'un temps (une pastille) en ms. En composé le tempo compte la noire pointée : la croche dure un tiers. */
export function dureeTemps(tempo: number, m: Mesure): number {
  return m.compose ? 60000 / tempo / 3 : 60000 / tempo;
}

export type PositionHorloge = { temps: number; mesure: number; fraction: number };

/** Horloge de temps : tempo changé au temps suivant, mesure changée à la mesure suivante. */
export function creerHorloge() {
  let actif = false;
  let t0 = 0; // instant du temps `i0`
  let i0 = 0; // numéro du temps (depuis le départ) à `t0`
  let dur = 500;
  let nb = 4;
  let debutRegime = 0; // numéro du temps où commence le régime de mesure courant
  let mesuresAvant = 0;
  let enAttenteTempo: { dur: number; a: number } | null = null;
  let enAttenteMesure: { nb: number; a: number } | null = null;

  const numero = (t: number) => i0 + Math.floor((t - t0) / dur);
  const appliquer = (t: number) => {
    for (;;) {
      const i = numero(t);
      if (enAttenteTempo && i >= enAttenteTempo.a) {
        t0 += (enAttenteTempo.a - i0) * dur;
        i0 = enAttenteTempo.a;
        dur = enAttenteTempo.dur;
        enAttenteTempo = null;
      } else if (enAttenteMesure && i >= enAttenteMesure.a) {
        mesuresAvant += (enAttenteMesure.a - debutRegime) / nb;
        debutRegime = enAttenteMesure.a;
        nb = enAttenteMesure.nb;
        enAttenteMesure = null;
      } else return i;
    }
  };

  return {
    demarrer(t: number, dureeMs = dur, nbTemps = nb) {
      actif = true; t0 = t; i0 = 0; dur = dureeMs; nb = nbTemps; debutRegime = 0; mesuresAvant = 0;
      enAttenteTempo = null; enAttenteMesure = null;
    },
    arreter() { actif = false; },
    position(t: number): PositionHorloge | null {
      if (!actif) return null;
      const i = appliquer(t);
      const rel = i - debutRegime;
      return { temps: ((rel % nb) + nb) % nb, mesure: mesuresAvant + Math.floor(rel / nb), fraction: ((t - t0) / dur) - Math.floor((t - t0) / dur) };
    },
    changerTempo(dureeMs: number, t: number) {
      if (!actif) { dur = dureeMs; return; }
      enAttenteTempo = { dur: dureeMs, a: appliquer(t) + 1 };
    },
    changerMesure(nbTemps: number, t: number) {
      if (!actif) { nb = nbTemps; return; }
      const i = appliquer(t);
      enAttenteMesure = { nb: nbTemps, a: debutRegime + (Math.floor((i - debutRegime) / nb) + 1) * nb };
    },
  };
}
