// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes
// et ce qu'elles donnent aux profils. Tout est pur ici — le réseau, les comptes
// et Firestore sont l'affaire des routes serveur. La lecture de l'onglet
// ORGANIGRAMME du Google Sheet (import) est retirée le 06/10/2026 : l'organigramme
// se tient à la main, dans Équipes › Organigramme.

import { EQUIPES } from "./table";
import { INSTRUMENTS, SOUS_EQUIPES } from "@/types/equipe";
import { SERVICE_LIEUX } from "@/types/user";

// La table des 13 équipes vit dans ./table (sans dépendance), lue aussi par
// src/lib/access.ts pour les réunions d'équipe (lot U6, R4).
export { EQUIPES, type EquipeDef } from "./table";

/** Un membre tel que la recopie le lit : le lot AO ajoute, optionnels, ses sous-équipes, les sous-équipes dont il
 *  est référent, « Où il sert » et « Ce qu'il joue » (`MembreEquipe`, src/types/equipe.ts). */
type MembreRecopie = {
  uid: string;
  referent: boolean;
  sousEquipes?: readonly string[];
  referentSous?: readonly string[];
  lieux?: readonly string[];
  joue?: readonly string[];
};

/** Ce que l'organigramme recopie sur un profil (lot U6, R4, Q8) : les équipes où il
 *  figure et celles dont il est référent, dans l'ordre de la table. Les droits
 *  des équipes ne passent que par ces deux champs (lot 1 du chantier « équipes et groupes », EQ28).
 *  Les règles lisent le profil, pas les 13 équipes (patron D9).
 *  Lot AO (docs/spec-acces-organigramme.md, « Modèle retenu ») : depuis `equipes/louange` et `equipes/regie`, aussi
 *  `sousEquipes`, `referentSous`, `lieuxLouange`, `lieuxRegie` et `joue` (seulement si `musiciens` ∈ `sousEquipes`),
 *  dans l'ordre de `SOUS_EQUIPES`, `SERVICE_LIEUX`, `INSTRUMENTS` ; union si la personne figure plusieurs fois. */
export function rattachementDe(
  uid: string,
  equipes: { id: string; membres: MembreRecopie[] }[],
): {
  dansEquipes: string[]; referentDe: string[];
  sousEquipes: string[]; referentSous: string[]; lieuxLouange: string[]; lieuxRegie: string[]; joue: string[];
} {
  const siennes = uid ? equipes.filter((e) => e.membres.some((m) => m.uid === uid)) : [];
  const dans = new Set(siennes.map((e) => e.id));
  const referent = new Set(siennes.filter((e) => e.membres.some((m) => m.uid === uid && m.referent)).map((e) => e.id));
  const ordre = EQUIPES.map((e) => e.id);
  // Ses lignes dans une équipe (une personne peut y figurer plusieurs fois) : l'union d'un de leurs champs.
  const union = (id: string, champ: "sousEquipes" | "referentSous" | "lieux" | "joue", ordreChamp: readonly string[]) => {
    const vus = new Set(
      (uid ? equipes.filter((e) => e.id === id) : []).flatMap((e) => e.membres.filter((m) => m.uid === uid).flatMap((m) => m[champ] ?? [])),
    );
    return ordreChamp.filter((x) => vus.has(x));
  };
  const sousEquipes = union("louange", "sousEquipes", SOUS_EQUIPES);
  return {
    dansEquipes: ordre.filter((id) => dans.has(id)),
    referentDe: ordre.filter((id) => referent.has(id)),
    sousEquipes,
    referentSous: union("louange", "referentSous", SOUS_EQUIPES),
    lieuxLouange: union("louange", "lieux", SERVICE_LIEUX),
    lieuxRegie: union("regie", "lieux", SERVICE_LIEUX),
    joue: sousEquipes.includes("musiciens") ? union("louange", "joue", INSTRUMENTS) : [],
  };
}

/** Les comptes dont les lignes d'une équipe ont changé pendant l'édition (ajoutées, retirées, modifiées), comparées à
 *  l'état chargé. La recopie d'un compte (`rattachementDe`) ne lit que ses propres lignes et l'id de l'équipe, qui
 *  ne change pas : un compte aux lignes inchangées n'a rien à recalculer. Les lignes sans compte sont écartées. */
export function uidsAChanger(avant: { uid: string }[], apres: { uid: string }[]): string[] {
  const lignes = (membres: { uid: string }[]) => {
    const parUid = new Map<string, string[]>();
    for (const m of membres) if (m.uid) parUid.set(m.uid, [...(parUid.get(m.uid) ?? []), JSON.stringify(m)]);
    return parUid;
  };
  const a = lignes(avant);
  const b = lignes(apres);
  return [...new Set([...a.keys(), ...b.keys()])].filter((u) => (a.get(u) ?? []).join("\n") !== (b.get(u) ?? []).join("\n"));
}
