// La règle des fêtes (docs/spec-scene-paques-noel.md, P1) : deux onglets fixes,
// Pâques et Noël, et une édition par fête et par année, `programmes/{fete}-{annee}`.
// Fonctions pures. Dates ISO « AAAA-MM-JJ », comparées comme du texte.

import type { Language } from "@/types/common";
import type { Programme } from "@/types/programme";
import { archiveDate, reservationsClosed } from "./dimanches";
import { PLAGES_DEFAUT, saisonDe } from "./saison";

export type Fete = NonNullable<Programme["fete"]>;

/** Dans l'ordre des onglets. */
export const FETES: readonly Fete[] = ["paques", "noel"];

const DAY = 86_400_000;

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** Dimanche de Pâques (calcul grégorien, algorithme dit « anonyme »). */
export function paques(annee: number): string {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return `${annee}-${p2(Math.floor(n / 31))}-${p2((n % 31) + 1)}`;
}

/** Jour J par défaut (Q3) : Noël le 24 décembre, Pâques calculé. */
export function jourJParDefaut(fete: Fete, annee: number): string {
  return fete === "noel" ? `${annee}-12-24` : paques(annee);
}

export function idEdition(fete: Fete, annee: number): string {
  return `${fete}-${annee}`;
}

/** La fête d'un programme : son champ, sinon le mois de son jour J (Q2) —
 *  décembre → Noël, mars ou avril → Pâques, un autre mois → aucune. */
export function feteDe(p: Pick<Programme, "fete" | "jourJ">): Fete | null {
  if (p.fete) return p.fete;
  const mois = p.jourJ.slice(5, 7);
  if (mois === "12") return "noel";
  if (mois === "03" || mois === "04") return "paques";
  return null;
}

/** L'année d'une édition : son champ, sinon celle du jour J ; `null` hors fête. */
export function anneeDe(p: Pick<Programme, "fete" | "annee" | "jourJ">): number | null {
  if (!feteDe(p)) return null;
  return p.annee ?? Number(p.jourJ.slice(0, 4));
}

/** Les documents d'une fête, une édition par année, la plus récente d'abord.
 *  Deux documents pour la même édition : `{fete}-{annee}` gagne, sinon le premier. */
export function editionsDe(fete: Fete, programmes: Programme[]): Programme[] {
  const parAnnee = new Map<number, Programme>();
  for (const p of programmes) {
    if (feteDe(p) !== fete) continue;
    const annee = anneeDe(p)!;
    const deja = parAnnee.get(annee);
    if (!deja || (p.id === idEdition(fete, annee) && deja.id !== p.id)) parAnnee.set(annee, p);
  }
  return [...parAnnee.entries()].sort(([a], [b]) => b - a).map(([, p]) => p);
}

/** L'édition d'un onglet ; `programme` est `null` tant que personne n'a agi. */
export interface Edition {
  fete: Fete;
  annee: number;
  programme: Programme | null;
}

/** L'édition montrée par l'onglet le jour `today` (Q4) : l'année du jour, sauf
 *  si son jour J + 7 jours est passé (le remerciement est fini), alors la suivante. */
export function editionCourante(fete: Fete, programmes: Programme[], today: string): Edition {
  const editions = editionsDe(fete, programmes);
  const de = (annee: number) => editions.find((p) => anneeDe(p) === annee) ?? null;
  const y = Number(today.slice(0, 4));
  const cette = de(y);
  if (today <= archiveDate(cette?.jourJ ?? jourJParDefaut(fete, y))) return { fete, annee: y, programme: cette };
  return { fete, annee: y + 1, programme: de(y + 1) };
}

export type EtatEdition = "aucune" | "brouillon" | "bientot" | "ouvertes" | "fermees" | "passee";

/** Où en est une édition le jour `today` (Q5). Un document sans `ouvert` est
 *  lancé (U1, Q7). Après le jour J, toujours `passee`. */
export function etatEdition(edition: Edition, today: string): EtatEdition {
  const p = edition.programme;
  if (!p) return "aucune";
  if (p.ouvert === false) return "brouillon";
  if (today < p.debut) return "bientot";
  if (!reservationsClosed(today, p.jourJ, p.fin)) return "ouvertes";
  return today <= p.jourJ ? "fermees" : "passee";
}

/** Les éditions courantes des deux fêtes que les membres voient (Q10) : ni
 *  sans document, ni en brouillon. Dans l'ordre des onglets. */
export function editionsAffichees(programmes: Programme[], today: string): Edition[] {
  return FETES.map((f) => editionCourante(f, programmes, today))
    .filter((e) => !["aucune", "brouillon"].includes(etatEdition(e, today)));
}

/** Le document d'une édition nouvelle, sans `createdBy` ni `updatedAt`. */
export type ReglagesEdition = Required<
  Pick<Programme, "nom" | "fete" | "annee" | "jourJ" | "debut" | "plages" | "duree" | "quiAutorises" | "passages" | "ouvert">
>;

/** Réglages d'une édition nouvelle (Q7) : ceux de l'édition précédente de la
 *  même fête (plages, durée, « Qui peut réserver », ouverture au même nombre de
 *  jours avant le jour J) ; sans elle, dimanche 14:00–19:00, 1 h, tout membre,
 *  ouverture le lundi sept semaines avant la semaine du jour J. Fermeture
 *  absente (dernier dimanche avant le jour J), ordre de passage vide, brouillon. */
export function reglagesRepris(precedent: Programme | null, fete: Fete, annee: number): ReglagesEdition {
  const jourJ = jourJParDefaut(fete, annee);
  const base = { nom: libelleEdition(fete, annee, "fr"), fete, annee, jourJ, passages: [], ouvert: false };
  if (!precedent) {
    const lundi = utc(jourJ) - ((new Date(utc(jourJ)).getUTCDay() + 6) % 7) * DAY;
    return { ...base, debut: iso(lundi - 49 * DAY), plages: [...PLAGES_DEFAUT], duree: 60, quiAutorises: [] };
  }
  const s = saisonDe(precedent);
  const ecart = utc(precedent.jourJ) - utc(precedent.debut);
  return { ...base, debut: iso(utc(jourJ) - ecart), plages: s.plages, duree: s.duree, quiAutorises: s.quiAutorises };
}

const NOMS: Record<Fete, Record<Language, string>> = {
  paques: { fr: "Pâques", zh: "复活节" },
  noel: { fr: "Noël", zh: "圣诞节" },
};

/** Le titre d'une édition (Q11) : « Noël 2026 », « 复活节 2027 ». */
export function libelleEdition(fete: Fete, annee: number, langue: Language): string {
  return `${NOMS[fete][langue]} ${annee}`;
}
