import { EDD_CLASSES } from "@/lib/planning/utils";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { TACHE_POLES, type TachePole } from "@/types/tache";
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

/** Pôles d'une personne pour les tâches (lot 7, docs/spec-taches.md) : ceux
 *  cochés par un admin, plus « louange » dès qu'elle a un rôle de service.
 *  Miroir serveur : isTachePole() dans firestore.rules. */
export function polesDe(
  profile: { poles?: string[]; serviceRoles?: Record<string, unknown> } | null
): TachePole[] {
  const poles = (profile?.poles ?? []).filter((p): p is TachePole => (TACHE_POLES as readonly string[]).includes(p));
  if (Object.keys(profile?.serviceRoles ?? {}).length > 0 && !poles.includes("louange")) poles.push("louange");
  return poles;
}

/** Voir, créer, modifier et cocher les tâches d'un pôle : ses membres et les
 *  admins (chacun ne voit que les tâches de ses pôles, tranché le 16/09/2026).
 *  Miroir serveur : isTachePole() dans firestore.rules. */
export function isPoleMember(
  user: { email?: string | null } | null,
  profile: { poles?: string[]; serviceRoles?: Record<string, unknown> } | null,
  pole: string
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (polesDe(profile) as string[]).includes(pole);
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

/** Organigramme (lot 16, docs/spec-organigramme.md) : tout membre connecté le
 *  voit — c'est l'objet de la demande ; rien pour un visiteur sans compte,
 *  l'écran est nominatif. Miroir serveur : `read: if signedIn()` sur
 *  equipes/{id} dans firestore.rules. */
export function canVoirEquipes(user: AuthUser | null): boolean {
  return user !== null;
}

/** Modifier l'organigramme : les admins, plus les comptes à qui un admin a
 *  donné le droit « Équipes » (Timothée, 18/09/2026 — D4 rouverte). Le droit
 *  porte sur tout l'organigramme, d'où un booléen et non une liste. Miroir
 *  serveur : isEquipier() dans firestore.rules pour equipes/{id}, et
 *  exigerDroitEquipes (src/lib/equipes/serveur.ts) pour les pôles, qui restent
 *  écrits par le serveur seul — `allow update` des profils ne bouge pas. */
export function canEditerEquipes(
  user: AuthUser | null,
  profile: { equipes?: boolean } | null
): boolean {
  if (!user) return false;
  return isAdminUser(user) || profile?.equipes === true;
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

/** Réunion de pôle (lot 7) : `pour` = « pole:<id> » ; null sinon. */
export function poleDuPour(pour: string): TachePole | null {
  const id = pour.startsWith("pole:") ? pour.slice(5) : "";
  return (TACHE_POLES as readonly string[]).includes(id) ? (id as TachePole) : null;
}

/** Qui voit un évènement : « toute l'église » = tout le monde, compte ou non ;
 *  une section = ses membres connectés (clé de serviceRoles), l'organisateur,
 *  la coordination ; une réunion de pôle = les membres du pôle, l'organisateur
 *  et les admins (lot 7). Un visiteur sans compte ne voit que « eglise ». */
export function canSeeEvenement(
  user: AuthUser | null,
  profile: { serviceRoles?: Record<string, unknown>; poles?: string[] } | null,
  e: EvenementDroits
): boolean {
  if (e.pour === "eglise") return true;
  if (!user) return false;
  if (e.organisateurUid === user.uid) return true;
  const pole = poleDuPour(e.pour);
  if (pole) return isPoleMember(user, profile, pole);
  if (isCoordination(user, profile)) return true;
  return e.pour in (profile?.serviceRoles ?? {});
}

/** Qui crée pour un public donné : la coordination pour tout ; un membre dont le
 *  droit d'annonces couvre la section (le droit d'annonces devient un droit de
 *  création pour sa section, tranché le 15/09/2026). */
export function canCreateEvenement(
  user: AuthUser | null,
  profile: { annonces?: string[]; poles?: string[]; serviceRoles?: Record<string, unknown> } | null,
  pour: string
): boolean {
  if (!user) return false;
  const pole = poleDuPour(pour);
  if (pole) return isPoleMember(user, profile, pole);
  if (isCoordination(user, profile)) return true;
  return (profile?.annonces ?? []).includes(pour);
}

/** Publics pour lesquels la personne peut créer (vide = aucun bouton) : ses
 *  sections, puis ses pôles pour les réunions (lot 7 ; tous pour un admin). */
export function creatableEvenementPours(
  user: AuthUser | null,
  profile: { annonces?: string[]; poles?: string[]; serviceRoles?: Record<string, unknown> } | null,
  sections: readonly string[]
): string[] {
  if (!user) return [];
  const poles = (isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile)).map((p) => `pole:${p}`);
  if (isCoordination(user, profile)) return ["eglise", ...sections, ...poles];
  return [...sections.filter((s) => (profile?.annonces ?? []).includes(s)), ...poles];
}

/** Voir qui est inscrit (noms et invités) : tout membre connecté (Timothée,
 *  17/09/2026) ; sans compte, le nombre seulement. Miroir :
 *  `evenements/{id}/inscriptions` dans firestore.rules. */
export function canSeeInscrits(user: AuthUser | null): boolean {
  return user !== null;
}

/** Modifier, dupliquer, supprimer, fermer les inscriptions, retirer un inscrit : organisateur + coordination. */
export function canEditEvenement(
  user: AuthUser | null,
  profile: { poles?: string[] } | null,
  e: EvenementDroits
): boolean {
  if (!user) return false;
  return e.organisateurUid === user.uid || isCoordination(user, profile);
}

/** Harmonie (lot 9, docs/spec-harmonie.md) : le catalogue et les « Idées
 *  d'harmonie » sont pour les **pianistes et les guitaristes**, plus les
 *  admins. L'instrument n'est pas dans le profil : il est écrit dans les
 *  colonnes Piano / Guitare des plannings, d'où les services passés en
 *  argument (`findMyServices` sur le nom de planning du compte). Chacun voit
 *  d'abord son instrument ; qui tient les deux voit les deux.
 *  Filtrage côté navigateur, comme le reste du site (choix de confiance
 *  assumé, cf. CLAUDE.md) — aucune règle Firestore : les fiches sont des
 *  fichiers publics. */
export function canUseHarmonie(
  user: { email?: string | null } | null,
  services: { role: string }[],
): { piano: boolean; guitare: boolean } {
  if (isAdminUser(user)) return { piano: true, guitare: true };
  const roles = new Set(services.map((s) => s.role));
  return { piano: roles.has("Piano"), guitare: roles.has("Guitare") };
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

/** Suppression : exactement le droit de modification, sous son vrai nom, pour
 *  que la liste (suppression groupée, lot 10) et la fiche ne puissent pas
 *  diverger. Aucun droit nouveau. Miroir serveur : `allow delete` sur
 *  setlists/{id} dans firestore.rules. */
export const canDeleteSetlist = canEditSetlist;
