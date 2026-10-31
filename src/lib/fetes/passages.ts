// Passages d'une fête : identifiant et musiques ou danses (docs/spec-chants-fetes.md, CF1, CF22).
// Fonctions pures, partagées par l'écran et la route /api/fetes/musiques.

import type { MediaPassage } from "@/types/programme";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Identifiant d'un passage : 8 caractères [a-z0-9] tirés au hasard. */
export function nouvelIdPassage(): string {
  const octets = new Uint8Array(8);
  globalThis.crypto.getRandomValues(octets);
  return Array.from(octets, (o) => ALPHABET[o % ALPHABET.length]).join("");
}

const MEDIAS_MAX = 10;
const TEMPS = /^\d{1,3}:[0-5]\d$/;

export type ErreurMedia = "format" | "trop" | "type" | "titre" | "lien" | "duree" | "depart" | "note";
type ResultatMedias = { ok: true; medias: MediaPassage[] } | { ok: false; erreur: ErreurMedia };

function lienHttps(s: string): boolean {
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}

/** Valide et nettoie la liste des musiques et danses d'un passage (CF22) : dix au plus ; type
 *  Musique ou Danse ; titre obligatoire de 80 caractères au plus ; lien https ou vide ; durée et
 *  départ « m:ss » ou vides ; note de 200 caractères au plus ; deux médias de même id refusés (« format »). */
export function validerMedias(entree: unknown): ResultatMedias {
  if (!Array.isArray(entree)) return { ok: false, erreur: "format" };
  if (entree.length > MEDIAS_MAX) return { ok: false, erreur: "trop" };
  const medias: MediaPassage[] = [];
  for (const brut of entree) {
    if (typeof brut !== "object" || brut === null) return { ok: false, erreur: "format" };
    const m = brut as Record<string, unknown>;
    const texte = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : "");
    if (typeof m.id !== "string" || !m.id) return { ok: false, erreur: "format" };
    if (medias.some((x) => x.id === m.id)) return { ok: false, erreur: "format" };
    if (m.type !== "musique" && m.type !== "danse") return { ok: false, erreur: "type" };
    const titre = texte("titre").trim();
    if (!titre || titre.length > 80) return { ok: false, erreur: "titre" };
    const lien = texte("lien").trim();
    if (lien && !lienHttps(lien)) return { ok: false, erreur: "lien" };
    const duree = texte("duree").trim();
    if (duree && !TEMPS.test(duree)) return { ok: false, erreur: "duree" };
    const depart = texte("depart").trim();
    if (depart && !TEMPS.test(depart)) return { ok: false, erreur: "depart" };
    const note = texte("note").trim();
    if (note.length > 200) return { ok: false, erreur: "note" };
    medias.push({ id: m.id, type: m.type, titre, lien, duree, depart, note });
  }
  return { ok: true, medias };
}
