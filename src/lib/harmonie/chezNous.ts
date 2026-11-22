// Harmonie (lot H9, docs/spec-harmonie-accords.md) — « chez nous » : ce qui se joue dans nos chants.
//
// Les comptes se font à la construction (`scripts/build-chez-nous.ts` → `public/harmonie-chez-nous.json`) ; le
// navigateur ne fait que lire le fichier et chiffrer le chant ouvert. Pur : ni réseau, ni état.
//
// Comment on compte (spec H9) : chaque chant dans sa tonalité ; accords en degrés, basse et enrichissements ôtés
// (`D/F#`, `Dsus4` comptent comme `D`) ; majeur et mineur séparés ; un chant compte une fois par suite ou par boucle.

import type { ChordProSection } from "@/types/chordPro";
import { chiffreDuDegre, degreDeLAccord } from "./degres";

export type Mode = "majeur" | "mineur";

/** En dessous, on garde le tableau écrit à la main (H9-1). */
export const SEUIL_SUITES = 8;
/** La ligne « Cette boucle, on la joue déjà » demande au moins ce nombre d'**autres** chants (H9-2). */
export const SEUIL_BOUCLE = 3;

export interface SuiteComptee { chiffre: string; chants: number }
/** `section` : de quoi la nommer dans la langue de l'écran (`formatSectionName`). */
export interface ChantDeBoucle { slug: string; titre: string; section: { type: string; name: string; number?: string; suffix?: string }; tonalite: string }
export interface ChezNous {
  /** Par mode, puis par degré (« 1 », « 6m ») : le nombre de chants où il est suivi d'un autre degré, et ses suites
   *  classées (nombre de chants qui jouent chacune). */
  suites: Record<Mode, Record<string, { chants: number; suites: SuiteComptee[] }>>;
  /** Par mode, puis par boucle (« 1 · 5 · 6m · 4 ») : les chants qui la jouent ; seules celles d'au moins
   *  `SEUIL_BOUCLE + 1` chants sont gardées. */
  boucles: Record<Mode, Record<string, ChantDeBoucle[]>>;
}

export function modeDe(tonalite: string): Mode {
  return /^[A-G][#b]?m$/.test(tonalite.trim()) ? "mineur" : "majeur";
}

/** Les degrés d'une section dans l'ordre, sans basse ni couleur, une répétition immédiate ramenée à un seul. */
export function degresDeSection(section: ChordProSection, tonalite: string): string[] {
  const out: string[] = [];
  for (const line of section.lines) {
    for (const t of line.tokens) {
      if (t.type !== "chord") continue;
      const d = degreDeLAccord(t.value, tonalite);
      if (!d) continue;
      const c = chiffreDuDegre({ ...d, basse: null });
      if (c !== out.at(-1)) out.push(c);
    }
  }
  return out;
}

/** Les suites d'un chant (« 1>5 »), une fois chacune. Le passage d'une section à la suivante ne compte pas. */
export function suitesDuChant(sections: ChordProSection[], tonalite: string): Set<string> {
  const out = new Set<string>();
  for (const s of sections) {
    const d = degresDeSection(s, tonalite);
    for (let i = 1; i < d.length; i++) out.add(`${d[i - 1]}>${d[i]}`);
  }
  return out;
}

/** La boucle d'une section : ses quatre premiers degrés, distincts, rejoués aussitôt au moins une fois
 *  (la dernière reprise peut s'arrêter avant la fin). Null sinon. */
export function boucleDeSection(section: ChordProSection, tonalite: string): string[] | null {
  const d = degresDeSection(section, tonalite);
  if (d.length < 8) return null;
  const tete = d.slice(0, 4);
  if (new Set(tete).size < 4) return null;
  return d.every((c, i) => c === tete[i % 4]) || d.slice(4, 8).every((c, i) => c === tete[i]) ? tete : null;
}

export const cleDeBoucle = (b: string[]) => b.join(" · ");

export interface ChantACompter { slug: string; titre: string; tonalite: string; sections: ChordProSection[] }

/** Le compte de tout le répertoire (construction). */
export function compterChezNous(chants: ChantACompter[]): ChezNous {
  const parSuite: Record<Mode, Map<string, Map<string, number>>> = { majeur: new Map(), mineur: new Map() };
  const boucles: Record<Mode, Map<string, ChantDeBoucle[]>> = { majeur: new Map(), mineur: new Map() };
  for (const c of chants) {
    const mode = modeDe(c.tonalite);
    for (const s of suitesDuChant(c.sections, c.tonalite)) {
      const [de, vers] = s.split(">");
      const m = parSuite[mode].get(de) ?? new Map<string, number>();
      m.set(vers, (m.get(vers) ?? 0) + 1);
      parSuite[mode].set(de, m);
    }
    const vues = new Set<string>();
    for (const s of c.sections) {
      const b = boucleDeSection(s, c.tonalite);
      if (!b) continue;
      const cle = cleDeBoucle(b);
      if (vues.has(cle)) continue;
      vues.add(cle);
      const liste = boucles[mode].get(cle) ?? [];
      liste.push({ slug: c.slug, titre: c.titre, section: { type: s.type, name: s.name, ...(s.number ? { number: s.number } : {}), ...(s.suffix ? { suffix: s.suffix } : {}) }, tonalite: c.tonalite });
      boucles[mode].set(cle, liste);
    }
  }
  const ordre = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const out: ChezNous = { suites: { majeur: {}, mineur: {} }, boucles: { majeur: {}, mineur: {} } };
  for (const mode of ["majeur", "mineur"] as Mode[]) {
    // Le nombre de chants d'un degré : ceux où il est suivi d'au moins un autre degré.
    const chantsDuDegre = new Map<string, number>();
    for (const c of chants) {
      if (modeDe(c.tonalite) !== mode) continue;
      const des = new Set([...suitesDuChant(c.sections, c.tonalite)].map((s) => s.split(">")[0]));
      for (const de of des) chantsDuDegre.set(de, (chantsDuDegre.get(de) ?? 0) + 1);
    }
    for (const de of [...parSuite[mode].keys()].sort()) {
      const suites = [...parSuite[mode].get(de)!].sort(ordre).map(([chiffre, n]) => ({ chiffre, chants: n }));
      out.suites[mode][de] = { chants: chantsDuDegre.get(de) ?? 0, suites };
    }
    const triees = [...boucles[mode]].filter(([, l]) => l.length > SEUIL_BOUCLE).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    for (const [cle, l] of triees) out.boucles[mode][cle] = l;
  }
  return out;
}

/** H9-1 : les trois suites les plus jouées après un degré, avec leur part (sur toutes les suites comptées de ce
 *  degré), ou null sous `SEUIL_SUITES` chants (le tableau écrit à la main reprend). */
export function suitesChezNous(index: ChezNous | null, tonalite: string, chiffre: string): { chiffre: string; part: number }[] | null {
  const e = index?.suites[modeDe(tonalite)]?.[chiffre];
  if (!e || e.chants < SEUIL_SUITES) return null;
  const total = e.suites.reduce((n, s) => n + s.chants, 0);
  return e.suites.slice(0, 3).map((s) => ({ chiffre: s.chiffre, part: Math.round((100 * s.chants) / total) }));
}

/** H9-2 : la boucle d'une section et les autres chants qui la jouent, ou null sous `SEUIL_BOUCLE` autres chants. */
export function boucleChezNous(index: ChezNous | null, section: ChordProSection, tonalite: string, slug: string): { boucle: string; autres: ChantDeBoucle[] } | null {
  const b = boucleDeSection(section, tonalite);
  if (!b || !index) return null;
  const cle = cleDeBoucle(b);
  const autres = (index.boucles[modeDe(tonalite)]?.[cle] ?? []).filter((c) => c.slug !== slug);
  return autres.length >= SEUIL_BOUCLE ? { boucle: cle, autres } : null;
}
