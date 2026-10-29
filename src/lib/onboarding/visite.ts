// Visite de première connexion selon le rôle (docs/spec-visite-par-role.md, VR2–VR7) : les cartes du
// milieu du parcours, tirées du profil. Pur, sans React ni Firebase : `Accueil.tsx` les met en écrans,
// l'encart du Guide les compte.
//
// Deux modes, comme src/lib/access.ts (lot AO) : back-office coupé, le rôle de service vient de
// `serviceRoles` ; back-office ouvert, de l'organigramme (sous-équipes de Louange, lieux de la Régie),
// puisque `serviceRoles` n'y est plus lu (A4). Équipe et responsabilités n'existent que back-office ouvert :
// elles lisent donc les droits du nouveau mode (`backOffice = true`).

import { isAdminUser, isCoordination, ongletDeLaGrille, tientUnGroupe, type OngletPlanning } from "@/lib/access";
import * as org from "@/lib/acces/organigramme";
import { audiencesNotifiables } from "@/lib/push/audiences";
import { EQUIPES } from "@/lib/equipes/table";
import { COMITES, TABLE_GROUPES } from "@/lib/groupes/table";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { SERVICE_LIEUX, type ServiceRole, type UserProfile } from "@/types/user";

export type Ligne =
  | { kind: "coordination" }
  | { kind: "groupe"; groupe: string }
  | { kind: "planning"; plannings: OngletPlanning[] }
  | { kind: "messages"; audiences: string[] }
  | { kind: "evenements"; sections: string[] };

export type Carte =
  | { kind: "service"; role: ServiceRole; lieux: string[]; aussi: ServiceRole[] }
  | { kind: "equipe"; equipes: string[]; referentDe: string[] }
  | { kind: "responsabilites"; lignes: Ligne[] }
  | { kind: "membre" };

/** VR4 : du plus haut au plus bas. */
const ORDRE_ROLES: ServiceRole[] = ["presidence", "musicien", "chanteur", "regie"];
const ROLE_DE_SOUS: Record<string, ServiceRole> = { presidence: "presidence", musiciens: "musicien", choristes: "chanteur" };
const ORDRE_EQUIPES = [...EQUIPES.map((e) => e.id), ...COMITES];

type Profil = Partial<UserProfile> | null;

/** Les rôles de service et, pour chacun, les catégories où il figure. */
function rolesDeService(profile: Profil, backOffice: boolean): Map<ServiceRole, string[]> {
  const roles = new Map<ServiceRole, string[]>();
  const ajouter = (role: ServiceRole, lieux: string[]) => roles.set(role, [...new Set([...(roles.get(role) ?? []), ...lieux])]);
  if (backOffice) {
    const lieuxLouange = SERVICE_LIEUX.filter((l) => (profile?.lieuxLouange ?? []).includes(l)) as string[];
    for (const s of profile?.sousEquipes ?? []) if (ROLE_DE_SOUS[s]) ajouter(ROLE_DE_SOUS[s], lieuxLouange);
    const lieuxRegie = SERVICE_LIEUX.filter((l) => (profile?.lieuxRegie ?? []).includes(l)) as string[];
    if (lieuxRegie.length > 0) ajouter("regie", lieuxRegie);
  } else {
    for (const [categorie, liste] of Object.entries(profile?.serviceRoles ?? {})) {
      for (const role of liste ?? []) ajouter(role, [categorie]);
    }
  }
  return roles;
}

function carteService(profile: Profil, backOffice: boolean): Carte | null {
  const roles = rolesDeService(profile, backOffice);
  const tries = ORDRE_ROLES.filter((r) => roles.has(r));
  if (tries.length === 0) return null;
  const [role, ...aussi] = tries;
  return { kind: "service", role, lieux: roles.get(role) ?? [], aussi };
}

/** VR5 : les équipes de l'organigramme seules — le public Louange élargi n'en donne pas. */
function carteEquipe(profile: Profil): Carte | null {
  const rang = (id: string) => (ORDRE_EQUIPES.includes(id) ? ORDRE_EQUIPES.indexOf(id) : ORDRE_EQUIPES.length);
  const referentDe = [...new Set(profile?.referentDe ?? [])].sort((a, b) => rang(a) - rang(b));
  const equipes = [...new Set([...(profile?.dansEquipes ?? []), ...referentDe])].sort((a, b) => rang(a) - rang(b));
  return equipes.length > 0 ? { kind: "equipe", equipes, referentDe } : null;
}

/** VR6, VR11 : quatre lignes au plus, dans l'ordre de la spec. */
function carteResponsabilites(user: { uid: string; email?: string | null }, profile: Profil): Carte | null {
  const lignes: Ligne[] = [];
  if (isCoordination(user, profile, true)) lignes.push({ kind: "coordination" });
  if (tientUnGroupe(user, profile)) {
    const groupe = TABLE_GROUPES.find((g) => (profile?.referentDe ?? []).includes(g.comite));
    if (groupe) lignes.push({ kind: "groupe", groupe: groupe.categorie });
  }
  const remplis = org.TOUS_LES_PLANNINGS.filter((k) => org.colonnesRemplies(profile, k) !== null).map(ongletDeLaGrille);
  const plannings = [...new Set(remplis)].filter((o): o is OngletPlanning => o !== null);
  if (plannings.length > 0) lignes.push({ kind: "planning", plannings });
  const audiences = audiencesNotifiables(profile, true);
  if (audiences.length > 0) lignes.push({ kind: "messages", audiences });
  const sections = org.sectionsCreables(profile, ANNONCE_SECTIONS);
  if (sections.length > 0) lignes.push({ kind: "evenements", sections });
  return lignes.length > 0 ? { kind: "responsabilites", lignes: lignes.slice(0, 4) } : null;
}

/** Les cartes de la visite (VR3) : service, équipe, responsabilités, trois au plus ; « membre » si aucune.
 *  Équipe et responsabilités seulement back-office ouvert (VR8) ; jamais de responsabilités pour un admin (VR7). */
export function cartesDeLaVisite(user: { uid: string; email?: string | null } | null, profile: Profil, backOffice: boolean): Carte[] {
  if (!user) return [];
  const cartes = [
    carteService(profile, backOffice),
    backOffice ? carteEquipe(profile) : null,
    backOffice && !isAdminUser(user) ? carteResponsabilites(user, profile) : null,
  ].filter((c): c is Carte => c !== null);
  return cartes.length > 0 ? cartes : [{ kind: "membre" }];
}
