// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes
// et ce qu'elles donnent aux profils. Tout est pur ici — le réseau, les comptes
// et Firestore sont l'affaire des routes serveur. La lecture de l'onglet
// ORGANIGRAMME du Google Sheet (import) est retirée le 06/10/2026 : l'organigramme
// se tient à la main, dans Équipes › Organigramme.

import { EQUIPES } from "./table";

// La table des 13 équipes vit dans ./table (sans dépendance), lue aussi par
// src/lib/access.ts pour les réunions d'équipe (lot U6, R4).
export { EQUIPES, type EquipeDef } from "./table";

/** Ce que l'organigramme recopie sur un profil (lot U6, R4, Q8) : les équipes où il
 *  figure et celles dont il est référent, dans l'ordre de la table. Les pôles ont
 *  disparu (lot 1 du chantier « équipes et groupes », EQ27, EQ28).
 *  Les règles lisent le profil, pas les 13 équipes (patron D9). */
export function rattachementDe(
  uid: string,
  equipes: { id: string; membres: { uid: string; referent: boolean }[] }[],
): { dansEquipes: string[]; referentDe: string[] } {
  const siennes = uid ? equipes.filter((e) => e.membres.some((m) => m.uid === uid)) : [];
  const dans = new Set(siennes.map((e) => e.id));
  const referent = new Set(siennes.filter((e) => e.membres.some((m) => m.uid === uid && m.referent)).map((e) => e.id));
  const ordre = EQUIPES.map((e) => e.id);
  return {
    dansEquipes: ordre.filter((id) => dans.has(id)),
    referentDe: ordre.filter((id) => referent.has(id)),
  };
}
