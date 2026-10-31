// L'équipe d'une setlist (docs/spec-partage-setlist.md, PS-A) : des comptes choisis par le
// propriétaire dans l'éditeur (`editeurs`, avec leur rôle dans `rolesPartage`). Fonctions pures.

import type { FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";
import { normalizeName } from "@/lib/planning/names";
import { rolesDeService } from "@/lib/acces/rolesDeService";
import type { RoleEquipe } from "@/lib/setlist/equipeDuService";

export type RolePartage = "musicien" | "chanteur";
type Partage = Pick<FSSetlist, "editeurs" | "rolesPartage" | "isPrivate">;

export const estDansLePartage = (setlist: Pick<FSSetlist, "editeurs">, uid: string): boolean =>
  !!setlist.editeurs?.includes(uid);

/** Nom du planning, sinon prénom et initiale du nom (règle d'`historyAuthor`). */
export function nomCourt(p: Pick<UserProfile, "planningName" | "firstName" | "lastName">): string {
  const initiale = p.lastName?.trim().charAt(0);
  return (
    p.planningName?.trim() ||
    [p.firstName?.trim(), initiale ? `${initiale}.` : ""].filter(Boolean).join(" ")
  );
}

const parNom = (a: UserProfile, b: UserProfile) => nomCourt(a).localeCompare(nomCourt(b), "fr");

/** Qui proposer : les musiciens et choristes de la catégorie d'abord, puis tous les comptes par nom. */
export function candidatsDeLEquipe(profils: UserProfile[], categorie: string, ownerId?: string | null) {
  const autres = profils.filter((p) => p.uid !== ownerId);
  const duService = categorie
    ? autres.filter((p) => {
        const r = rolesDeService(p)[categorie] ?? [];
        return r.includes("musicien") || r.includes("chanteur");
      })
    : [];
  return { duService: [...duService].sort(parNom), tous: [...autres].sort(parNom) };
}

/** Rôle proposé à l'ajout (PS4) : celui de la catégorie, sinon un autre, musicien avant choriste. */
export function roleParDefaut(p: UserProfile, categorie: string): RolePartage {
  const roles = rolesDeService(p);
  const ici = roles[categorie] ?? [];
  if (ici.includes("musicien")) return "musicien";
  if (ici.includes("chanteur")) return "chanteur";
  const ailleurs = Object.values(roles).flat();
  return ailleurs.includes("musicien") ? "musicien" : ailleurs.includes("chanteur") ? "chanteur" : "musicien";
}

const MUSICIENS = "planning.roles.musiciens";
const CHORISTES = "planning.roles.choristes";

/** La carte « L'équipe » : les lignes du planning, plus les personnes choisies (PS12). */
export function equipeDeLaSetlist(
  lignes: RoleEquipe[],
  setlist: Pick<FSSetlist, "editeurs" | "rolesPartage">,
  profils: UserProfile[],
): RoleEquipe[] {
  const choisis: Record<string, string[]> = { [MUSICIENS]: [], [CHORISTES]: [] };
  for (const uid of setlist.editeurs ?? []) {
    const p = profils.find((x) => x.uid === uid);
    if (!p) continue;
    choisis[setlist.rolesPartage?.[uid] === "chanteur" ? CHORISTES : MUSICIENS].push(nomCourt(p));
  }
  const out = lignes.map(([cle, noms]) => [cle, noms] as RoleEquipe);
  for (const cle of [MUSICIENS, CHORISTES]) {
    if (!choisis[cle].length) continue;
    const ligne = out.find(([k]) => k === cle);
    const deja = new Set((ligne?.[1] ?? "").split(",").map((n) => normalizeName(n)));
    const nouveaux = choisis[cle].filter((n) => !deja.has(normalizeName(n)));
    if (!nouveaux.length) continue;
    if (ligne) ligne[1] = [ligne[1], ...nouveaux].filter(Boolean).join(", ");
    else out.push([cle, nouveaux.join(", ")]);
  }
  return out;
}

/** Qui reçoit « Setlist prête » (PS13). Publique : le planning plus l'équipe ; privée : l'équipe seule.
 *  En auto, les personnes déjà prévenues sont exclues, et le planning l'est s'il l'a déjà été. */
export function aPrevenir(
  setlist: Partage,
  o: { planning: string[]; prevenus: string[]; planningDejaPrevenu: boolean; auto: boolean },
): string[] {
  const equipe = (setlist.editeurs ?? []).filter((u) => !o.auto || !o.prevenus.includes(u));
  const planning = setlist.isPrivate || (o.auto && o.planningDejaPrevenu) ? [] : o.planning;
  return [...new Set([...planning, ...equipe])];
}

/** L'éditeur appelle la route « Setlist prête » : une setlist non privée, ou privée avec une équipe (PS13). */
export const notifierSetlistPrete = (setlist: Pick<FSSetlist, "isPrivate" | "editeurs">): boolean =>
  !setlist.isPrivate || !!setlist.editeurs?.length;

/** Qui déclenche l'envoi (PS13) : son propriétaire et son équipe ; sur une publique, aussi un admin
 *  ou un exécutant de la catégorie. Une privée avec équipe n'ouvre pas l'envoi aux autres. */
export function peutPrevenirEquipe(
  setlist: Pick<FSSetlist, "ownerId" | "isPrivate" | "editeurs">,
  o: { uid: string; estAdmin: boolean; estExecutant: boolean },
): boolean {
  if (setlist.ownerId === o.uid || estDansLePartage(setlist, o.uid)) return true;
  return !setlist.isPrivate && (o.estAdmin || o.estExecutant);
}

/** Valeur de `lastSentAt` à écrire après un envoi, ou `undefined` pour garder l'ancienne. Un envoi
 *  automatique à l'équipe seule ne doit pas relancer le délai de 24 h du bouton manuel : le planning
 *  n'a pas été prévenu. */
export const horodatageEnvoi = (o: { auto: boolean; planningTouche: number; maintenant: number }): number | undefined =>
  !o.auto || o.planningTouche > 0 ? o.maintenant : undefined;
