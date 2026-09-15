import { EDD_CLASSES } from "@/lib/planning/utils";
import type { FSSetlist } from "@/lib/firebase/setlists";
import {
  GROUPES,
  type AccessLevel,
  type ServiceRole,
  type UserProfile,
} from "@/types/user";

// Comptes administrateurs (doivent aussi figurer dans firestore.rules)
export const ADMIN_EMAILS = [
  "tc328829@gmail.com",
  "gcccfranco@gmail.com",
  "david.code999@gmail.com",
];

type AuthUser = { uid: string; email?: string | null };

export function isAdminUser(user: { email?: string | null } | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** Modification du profil : autorisée tant qu'il n'existe pas encore (première
 *  complétion par l'intéressé) ; une fois complété, réservé aux admins.
 *  Miroir serveur dans firestore.rules (users/{uid} : create libre, update admin). */
export function canEditProfile(
  user: { email?: string | null } | null,
  profile: UserProfile | null
): boolean {
  return isAdminUser(user) || !profile;
}

/** Coordination des programmes de scène (lot 3 bis) : pôle « événement » du
 *  profil (attribué par un admin) + admins. Crée, modifie, affiche ou masque un
 *  programme, tient l'ordre de passage, déplace ou retire n'importe quel
 *  créneau. Miroir serveur : isCoordination() dans firestore.rules. */
export function isCoordination(
  user: { email?: string | null } | null,
  profile: { poles?: string[] } | null
): boolean {
  return isAdminUser(user) || (profile?.poles ?? []).includes("evenement");
}

/** Créneau sur scène : son auteur + la coordination. Miroir : programmes/{id}/creneaux dans firestore.rules. */
export function canEditCreneau(
  user: AuthUser,
  profile: { poles?: string[] } | null,
  creneau: { auteurUid: string }
): boolean {
  return creneau.auteurUid === user.uid || isCoordination(user, profile);
}

// ─── Évènements (lot 6, docs/spec-evenements.md) — miroir : firestore.rules ───

type EvenementDroits = { pour: string; organisateurUid: string };

/** Qui voit un évènement : « toute l'église » = tout le monde, compte ou non ;
 *  une section = ses membres connectés (clé de serviceRoles), l'organisateur,
 *  la coordination. Un visiteur sans compte ne voit que « eglise ». */
export function canSeeEvenement(
  user: AuthUser | null,
  profile: { serviceRoles?: Record<string, unknown>; poles?: string[] } | null,
  e: EvenementDroits
): boolean {
  if (e.pour === "eglise") return true;
  if (!user) return false;
  if (e.organisateurUid === user.uid || isCoordination(user, profile)) return true;
  return e.pour in (profile?.serviceRoles ?? {});
}

/** Qui crée pour un public donné : la coordination pour tout ; un membre dont le
 *  droit d'annonces couvre la section (le droit d'annonces devient un droit de
 *  création pour sa section, tranché le 15/09/2026). */
export function canCreateEvenement(
  user: AuthUser | null,
  profile: { annonces?: string[]; poles?: string[] } | null,
  pour: string
): boolean {
  if (!user) return false;
  if (isCoordination(user, profile)) return true;
  return (profile?.annonces ?? []).includes(pour);
}

/** Sections pour lesquelles la personne peut créer (vide = aucun bouton). */
export function creatableEvenementPours(
  user: AuthUser | null,
  profile: { annonces?: string[]; poles?: string[] } | null,
  sections: readonly string[]
): string[] {
  if (!user) return [];
  if (isCoordination(user, profile)) return ["eglise", ...sections];
  return sections.filter((s) => (profile?.annonces ?? []).includes(s));
}

/** Modifier, dupliquer, supprimer, fermer les inscriptions, voir les inscrits : organisateur + coordination. */
export function canEditEvenement(
  user: AuthUser | null,
  profile: { poles?: string[] } | null,
  e: EvenementDroits
): boolean {
  if (!user) return false;
  return e.organisateurUid === user.uid || isCoordination(user, profile);
}

const LEVEL_RANK: Record<AccessLevel, number> = { view: 0, create: 1, edit: 2 };

const isGroupeOrEdd = (category: string): boolean =>
  (GROUPES as readonly string[]).includes(category) ||
  (EDD_CLASSES as readonly string[]).includes(category);

/** Niveau d'accès d'une personne à une catégorie, dérivé de ses rôles dans cette
 *  catégorie. Échelon view < create < edit :
 *   - musicien / présidence → edit ;
 *   - choriste → create ;
 *   - sans rôle exécutant : groupe & EDD = membre (create) ; culte = view
 *     (régie, observateur — le lieu donne la visibilité). */
export function categoryLevel(category: string, roles: ServiceRole[]): AccessLevel {
  if (roles.includes("musicien") || roles.includes("presidence")) return "edit";
  if (roles.includes("chanteur")) return "create";
  return isGroupeOrEdd(category) ? "create" : "view";
}

/** Catégories visibles (la personne y sert, tout niveau) : la régie voit ses cultes en lecture seule. */
export function visibleCategories(profile: UserProfile): string[] {
  return Object.keys(profile.serviceRoles);
}

/** Catégories où la personne peut CRÉER une setlist (niveau ≥ create — la régie en est exclue). */
export function creatableCategories(profile: UserProfile): string[] {
  return Object.keys(profile.serviceRoles).filter(
    (c) => LEVEL_RANK[categoryLevel(c, profile.serviceRoles[c])] >= LEVEL_RANK.create
  );
}

/** Peut-on créer au moins une setlist (bouton « Créer ») ? Admins toujours. */
export function canCreateSetlist(
  user: { email?: string | null } | null,
  profile: UserProfile | null
): boolean {
  if (isAdminUser(user)) return true;
  return !!profile && creatableCategories(profile).length > 0;
}

/** Peut-on dupliquer cette setlist ? Dupliquer crée une copie dans la même catégorie,
 *  donc réservé à qui peut créer dans cette catégorie (la régie en est exclue). */
export function canDuplicateSetlist(
  user: { email?: string | null } | null,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (isAdminUser(user)) return true;
  return !!profile && creatableCategories(profile).includes(setlist.category);
}

export function canSeeSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  return profile ? visibleCategories(profile).includes(setlist.category) : false;
}

/** Lien de la présentation (PPT) : qui peut modifier la setlist, plus la régie
 *  inscrite au planning ce jour-là. `regie` = régie de service (serveur, qui lit
 *  le planning) ou, côté client, simple rôle régie dans la catégorie pour
 *  afficher le bouton — le serveur tranche. Miroir : /api/setlist/presentation
 *  (écriture Admin, firestore.rules inchangé). */
export function canSetPresentationLink(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  regie: boolean
): boolean {
  return canEditSetlist(user, profile, setlist) || (!setlist.isPrivate && regie);
}

/** Modification : créateur de la setlist + niveau « edit » sur la catégorie (musicien, présidence) (+ admins). */
/** Version perso d'un chant dans une setlist (docs/spec-version-perso.md) :
 *  qui voit la setlist peut avoir la sienne. Miroir serveur dans
 *  firestore.rules (setlists/{id}/versions/{uid} : écrit par son propriétaire). */
export const canHaveSetlistVersion = canSeeSetlist;

export function canEditSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  const roles = profile?.serviceRoles[setlist.category];
  return roles ? categoryLevel(setlist.category, roles) === "edit" : false;
}
