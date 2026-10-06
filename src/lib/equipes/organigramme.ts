// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes
// et ce qu'elles donnent aux profils. Tout est pur ici — le réseau, les comptes
// et Firestore sont l'affaire des routes serveur. La lecture de l'onglet
// ORGANIGRAMME du Google Sheet (import) est retirée le 06/10/2026 : l'organigramme
// se tient à la main, dans Équipes › Organigramme.

import { POLES, type Pole } from "@/types/user";
import { EQUIPES } from "./table";

// La table des 13 équipes vit dans ./table (sans dépendance), lue aussi par
// src/lib/access.ts pour les réunions d'équipe (lot U6, R4).
export { EQUIPES, type EquipeDef } from "./table";

/** Pôles d'une personne d'après les équipes : l'union des pôles des équipes où
 *  elle figure. Seule vérité pour `users/{uid}.poles` depuis le lot 16 (D9). */
export function polesDesEquipes(
  uid: string,
  equipes: { pole: Pole | null; membres: { uid: string }[] }[],
): Pole[] {
  if (!uid) return [];
  const donnes = new Set<Pole>();
  for (const e of equipes) {
    if (e.pole && e.membres.some((m) => m.uid === uid)) donnes.add(e.pole);
  }
  return POLES.filter((p) => donnes.has(p));
}

/** Ce que l'organigramme recopie sur un profil (lot U6, R4, Q8) : ses pôles, les
 *  équipes où il figure et celles dont il est référent, dans l'ordre de la table.
 *  Les règles lisent le profil, pas les 13 équipes (patron D9). */
export function rattachementDe(
  uid: string,
  equipes: { id: string; pole: Pole | null; membres: { uid: string; referent: boolean }[] }[],
): { poles: Pole[]; dansEquipes: string[]; referentDe: string[] } {
  const siennes = uid ? equipes.filter((e) => e.membres.some((m) => m.uid === uid)) : [];
  const dans = new Set(siennes.map((e) => e.id));
  const referent = new Set(siennes.filter((e) => e.membres.some((m) => m.uid === uid && m.referent)).map((e) => e.id));
  const ordre = EQUIPES.map((e) => e.id);
  return {
    poles: polesDesEquipes(uid, equipes),
    dansEquipes: ordre.filter((id) => dans.has(id)),
    referentDe: ordre.filter((id) => referent.has(id)),
  };
}
