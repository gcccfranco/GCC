import { EDD_CLASSES } from "@/lib/planning/utils";
import { aCommence } from "@/lib/evenements/agenda";
import type { Evenement } from "@/types/evenement";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { TACHE_POLES, type TachePole } from "@/types/tache";
import { EQUIPES } from "@/lib/equipes/table";
import { PUBLISHABLE_PLANNINGS, canPublishPlanning } from "@/lib/planning/releases";
import { ENTREES, WIDGETS, type Entree, type WidgetId } from "@/types/backOffice";
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

/** Une adresse d'admin, quelle que soit sa casse — seule comparaison à utiliser,
 *  client comme serveur (audit du 19/09/2026 : deux routes comparaient sans
 *  mettre en minuscules). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isAdminUser(user: { email?: string | null } | null): boolean {
  return isAdminEmail(user?.email);
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

// ─── Scène : saison de réservation (lot U1, docs/spec-scene-saison.md) ───────

/** Réserver pour ces groupes : la coordination toujours ; un membre si la saison
 *  est ouverte et que chaque groupe est permis (liste vide = tous).
 *  Miroir serveur : reservable() sous programmes/{id}/creneaux, firestore.rules. */
export function canReserverPour(
  user: AuthUser | null,
  profile: { poles?: string[] } | null,
  programme: { ouvert?: boolean; quiAutorises?: string[] },
  qui: string[]
): boolean {
  if (!user) return false;
  if (isCoordination(user, profile)) return true;
  if (programme.ouvert === false) return false;
  const permis = programme.quiAutorises ?? [];
  return permis.length === 0 || qui.every((q) => permis.includes(q));
}

// ─── Évènements (lot 6, docs/spec-evenements.md) — miroir : firestore.rules ───

type EvenementDroits = { pour: string; organisateurUid: string };
/** Profil lu par les droits des évènements : sections, pôles, et les équipes de
 *  l'organigramme recopiées par le serveur (lot U6, R4 : `recalculerPoles`). */
type ProfilEvenement = {
  serviceRoles?: Record<string, unknown>; poles?: string[]; annonces?: string[];
  dansEquipes?: string[]; referentDe?: string[];
};

/** Réunion de pôle (lot 7) : `pour` = « pole:<id> » ; null sinon. */
export function poleDuPour(pour: string): TachePole | null {
  const id = pour.startsWith("pole:") ? pour.slice(5) : "";
  return (TACHE_POLES as readonly string[]).includes(id) ? (id as TachePole) : null;
}

/** Réunion d'équipe (lot U6, R4, Q8) : `pour` = « equipe:<id> » ; null sinon.
 *  Même motif que les règles (`equipe:[a-z0-9-]+`). */
export function equipeDuPour(pour: string): string | null {
  const m = /^equipe:([a-z0-9-]+)$/.exec(pour);
  return m ? m[1] : null;
}

/** Réunion = de pôle ou d'équipe : sans inscriptions, avec sujets et compte rendu. */
export function estReunion(pour: string): boolean {
  return poleDuPour(pour) !== null || equipeDuPour(pour) !== null;
}

/** Membre d'une équipe de l'organigramme, d'après son profil (`dansEquipes`). */
function estDansEquipe(profile: ProfilEvenement | null, equipe: string): boolean {
  return (profile?.dansEquipes ?? []).includes(equipe);
}

/** Qui voit un évènement : « toute l'église » = tout le monde, compte ou non ;
 *  une section = ses membres connectés (clé de serviceRoles), l'organisateur,
 *  la coordination ; une réunion de pôle = les membres du pôle, l'organisateur
 *  et les admins (lot 7) ; une réunion d'équipe = les membres de l'équipe,
 *  l'organisateur et les admins (lot U6, R4). Un visiteur sans compte ne voit que « eglise ». */
export function canSeeEvenement(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits
): boolean {
  if (e.pour === "eglise") return true;
  if (!user) return false;
  if (e.organisateurUid === user.uid) return true;
  const pole = poleDuPour(e.pour);
  if (pole) return isPoleMember(user, profile, pole);
  const equipe = equipeDuPour(e.pour);
  if (equipe) return isAdminUser(user) || estDansEquipe(profile, equipe);
  if (isCoordination(user, profile)) return true;
  return e.pour in (profile?.serviceRoles ?? {});
}

/** Qui crée pour un public donné : la coordination pour tout ; un membre dont le
 *  droit d'annonces couvre la section (le droit d'annonces devient un droit de
 *  création pour sa section, tranché le 15/09/2026) ; une réunion de pôle, ses
 *  membres ; une réunion d'équipe, ses référents et les admins (lot U6, R4). */
export function canCreateEvenement(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  pour: string
): boolean {
  if (!user) return false;
  const pole = poleDuPour(pour);
  if (pole) return isPoleMember(user, profile, pole);
  const equipe = equipeDuPour(pour);
  if (equipe) return isAdminUser(user) || (profile?.referentDe ?? []).includes(equipe);
  if (isCoordination(user, profile)) return true;
  return (profile?.annonces ?? []).includes(pour);
}

/** Publics pour lesquels la personne peut créer (vide = aucun bouton) : ses
 *  sections, puis ses pôles pour les réunions (lot 7), puis les équipes dont
 *  elle est référente (lot U6, R4) — tous les pôles et équipes pour un admin. */
export function creatableEvenementPours(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  sections: readonly string[]
): string[] {
  if (!user) return [];
  const admin = isAdminUser(user);
  const poles = (admin ? [...TACHE_POLES] : polesDe(profile)).map((p) => `pole:${p}`);
  const equipes = EQUIPES.map((e) => e.id)
    .filter((id) => admin || (profile?.referentDe ?? []).includes(id))
    .map((id) => `equipe:${id}`);
  if (isCoordination(user, profile)) return ["eglise", ...sections, ...poles, ...equipes];
  return [...sections.filter((s) => (profile?.annonces ?? []).includes(s)), ...poles, ...equipes];
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

// ─── Sujets d'une réunion (lot U6, R1, docs/spec-back-office.md) — miroir : ───
// estDeLaReunion, organise et match /sujets/{sid} dans firestore.rules.
// Compte rendu (R3) : estDeLaReunion colle ou retire le lien (allow update de
// evenements/{id}, champ compteRendu seul) ; lien vérifié par lienCompteRendu.

/** Personne de la réunion : membre du pôle (Louange compris, comme pour les
 *  tâches) ou de l'équipe (`dansEquipes`, R4), l'organisateur, un admin. Comme
 *  dans les règles, l'organisateur et les admins passent même pour un évènement
 *  qui n'est pas une réunion : la carte des sujets ne s'affiche que sur une
 *  réunion (estReunion). */
export function estDeLaReunion(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits
): boolean {
  if (!user) return false;
  if (isAdminUser(user) || e.organisateurUid === user.uid) return true;
  const pole = poleDuPour(e.pour);
  if (pole) return isPoleMember(user, profile, pole);
  const equipe = equipeDuPour(e.pour);
  return equipe !== null && estDansEquipe(profile, equipe);
}

/** Ajouter un sujet : une personne de la réunion, jusqu'au début. La borne se
 *  vérifie dans le navigateur seulement : les règles ne lisent pas une heure de
 *  Paris écrite en texte (Q7, choix de confiance). */
export function peutAjouterSujet(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits & Pick<Evenement, "type" | "date" | "heure">,
  nowIso: string
): boolean {
  return estDeLaReunion(user, profile, e) && !aCommence(e, nowIso);
}

/** Retirer un sujet : son auteur, l'organisateur, un admin. */
export function peutRetirerSujet(
  user: AuthUser | null,
  e: EvenementDroits,
  sujet: { auteurUid: string }
): boolean {
  if (!user) return false;
  return sujet.auteurUid === user.uid || peutOrdonnerSujets(user, e);
}

/** Ordonner les sujets et cocher « traité » : l'organisateur, un admin. */
export function peutOrdonnerSujets(user: AuthUser | null, e: EvenementDroits): boolean {
  if (!user) return false;
  return isAdminUser(user) || e.organisateurUid === user.uid;
}

/** Remplir les cases d'un planning dans l'app (lot 17, docs/spec-planning-grille.md) :
 *  les admins, et les profils dont `plannings` contient sa clé — coché par un
 *  admin, planning par planning. Ne donne PAS le droit de publier un trimestre
 *  (canPublishPlanning, src/lib/planning/releases.ts, qui dépend de `notify`) :
 *  deux gestes différents, deux droits (D10).
 *  Miroir serveur : plannings/{key}/dimanches dans firestore.rules. */
export function canEditPlanning(
  user: { email?: string | null } | null,
  profile: { plannings?: string[] } | null,
  key: string
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (profile?.plannings ?? []).includes(key);
}

/** Petit déj (lot U3, docs/spec-petit-dej.md, Q8) : poser une ligne pour
 *  quelqu'un, réécrire ou retirer n'importe laquelle — les écrivains du planning
 *  Table et les admins, le droit qui remplit déjà la grille Table. Poser SA
 *  ligne (« Je m'inscris ») : tout connecté. Miroir serveur : petitDej/{id}
 *  dans firestore.rules. */
export function canGererPetitDej(
  user: { email?: string | null } | null,
  profile: { plannings?: string[] } | null
): boolean {
  return canEditPlanning(user, profile, "table");
}

/** Réécrire ou retirer une ligne : l'inscrit (`ligne.uid`) ou canGererPetitDej,
 *  tant que le dimanche n'est pas passé (Q2 : la borne du passé vaut pour tous,
 *  côté client seulement, comme le reste du filtrage du site). */
export function canEditPetitDej(
  user: AuthUser | null,
  profile: { plannings?: string[] } | null,
  ligne: { uid: string; dimanche: string },
  dimancheEnCours: string
): boolean {
  if (!user || ligne.dimanche < dimancheEnCours) return false;
  return ligne.uid === user.uid || canGererPetitDej(user, profile);
}

/** Lot U2 (Q10, docs/spec-planning-2027.md) : les plannings dont les dates se
 *  choisissent (`dates: "choisies"` dans grilles.ts) — les seuls où une date
 *  posée par erreur se retire ; ailleurs, on vide les cases. */
export const PLANNINGS_DATES_CHOISIES = ["interfranco", "intergroupe", "campusMatin", "campusSoir"] as const;

/** Retirer une date (supprimer son document) : qui peut remplir ce planning,
 *  sur un planning à dates choisies seulement.
 *  Miroir serveur : `allow delete` de plannings/{key}/dimanches dans firestore.rules. */
export function canRetirerDate(
  user: { email?: string | null } | null,
  profile: { plannings?: string[] } | null,
  key: string
): boolean {
  return (PLANNINGS_DATES_CHOISIES as readonly string[]).includes(key) && canEditPlanning(user, profile, key);
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
/** Cours d'Harmonie (C2, C4) : chacun coche ses chapitres ; seuls les admins
 *  voient la progression des autres. Miroir serveur : firestore.rules,
 *  `coursProgres/{uid}` (lecture : soi ou admin ; écriture : soi). */
export function canSeeTeamCoursProgres(user: { email?: string | null } | null): boolean {
  return isAdminUser(user);
}

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

// ─── Back-Office (lot U6, docs/spec-back-office.md) ──────────────────────────
// Affichage seulement : le sélecteur et le menu ne protègent aucune donnée,
// chaque sous-partie garde sa règle dans firestore.rules (signalements, profils,
// plannings…). Aucune règle miroir ici.

type ProfilResponsable = {
  serviceRoles?: Record<string, unknown>; poles?: string[]; plannings?: string[]; notify?: string[];
  annonces?: string[]; equipes?: boolean; referentDe?: string[];
};
const nonVide = (l: string[] | undefined) => (l?.length ?? 0) > 0;

/** Responsable (Q1) : admin, ou au moins un droit donné par un admin ou par l'organigramme —
 *  `poles` écrit, `plannings`, `notify`, `annonces`, droit Équipes, référent d'une équipe.
 *  Le pôle Louange implicite d'un rôle de service (`polesDe`) ne compte pas (question 2). */
export function estResponsable(user: AuthUser | null, profile: ProfilResponsable | null): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (!profile) return false;
  return nonVide(profile.poles) || nonVide(profile.plannings) || nonVide(profile.notify) || nonVide(profile.annonces)
    || profile.equipes === true || nonVide(profile.referentDe);
}

/** Statistiques des chants (lot U7, docs/spec-statistiques.md, Q2) : admins seulement (T1).
 *  Sans règle Firestore : rien de nouveau n'est lu ni écrit (précédent `canUseHarmonie`). */
export function canVoirStatistiques(user: { email?: string | null } | null): boolean {
  return isAdminUser(user);
}

/** Entrées et widgets qui arrivent avec leur lot (Q17) : U8 (Calendrier). Chaque lot retire
 *  la sienne de ces listes ; le rang est déjà gardé. U7 (Statistiques, Chants les plus joués) : arrivés. */
const ENTREES_A_VENIR: readonly Entree[] = ["calendrier"];
const WIDGETS_A_VENIR: readonly WidgetId[] = ["calendrier"];

/** Les entrées du Back-Office d'une personne (table Q2), dans l'ordre du menu. Vide pour qui
 *  n'est pas responsable. */
export function entreesBackOffice(user: AuthUser | null, profile: ProfilResponsable | null): Entree[] {
  if (!user || !estResponsable(user, profile)) return [];
  const admin = isAdminUser(user);
  const pole = polesDe(profile).length > 0;
  const visible: Record<Entree, boolean> = {
    tableau: true,
    calendrier: true,
    planning: admin || nonVide(profile?.plannings)
      || PUBLISHABLE_PLANNINGS.some((p) => canPublishPlanning(p, admin, profile?.notify ?? [])),
    taches: admin || pole,
    evenements: admin || isCoordination(user, profile) || nonVide(profile?.annonces) || pole || nonVide(profile?.referentDe),
    equipes: canEditerEquipes(user, profile),
    messages: admin || nonVide(profile?.notify),
    statistiques: canVoirStatistiques(user),
  };
  return ENTREES.filter((e) => visible[e] && !ENTREES_A_VENIR.includes(e));
}

/** Les onglets du planning (`/planning/<onglet>`), dans leur ordre. */
export const ONGLETS_PLANNING = ["culte", "table", "groupes", "edd", "campus", "intergroupe", "interfranco"] as const;
export type OngletPlanning = (typeof ONGLETS_PLANNING)[number];

/** L'onglet qui porte une grille (clé de `GRILLES` ou de `PUBLISHABLE_PLANNINGS`). */
function ongletDeLaGrille(key: string): OngletPlanning | null {
  if (key === "paix" || key === "bonte" || key.startsWith("fidelite")) return "groupes";
  if (key.startsWith("edd")) return "edd";
  if (key.startsWith("campus")) return "campus";
  return (ONGLETS_PLANNING as readonly string[]).includes(key) ? (key as OngletPlanning) : null;
}

/** Les plannings du Back-Office (lot U6, B2, table Q2) : ceux qu'on remplit (`plannings`) ou
 *  publie (`canPublishPlanning`), dans l'ordre des onglets ; tous pour un admin. */
export function planningsDuBackOffice(
  user: { email?: string | null } | null,
  profile: { plannings?: string[]; notify?: string[] } | null
): OngletPlanning[] {
  if (!user) return [];
  if (isAdminUser(user)) return [...ONGLETS_PLANNING];
  const publies = PUBLISHABLE_PLANNINGS.filter((p) => canPublishPlanning(p, false, profile?.notify ?? [])).map((p) => p.key);
  const siens = new Set([...(profile?.plannings ?? []), ...publies].map(ongletDeLaGrille));
  return ONGLETS_PLANNING.filter((o) => siens.has(o));
}

/** Les widgets qu'une personne peut ajouter à son tableau de bord (table des widgets), dans
 *  l'ordre du catalogue. Vide pour qui n'est pas responsable. */
export function widgetsPermis(user: AuthUser | null, profile: UserProfile | null): WidgetId[] {
  const entrees = entreesBackOffice(user, profile);
  if (entrees.length === 0) return [];
  const admin = isAdminUser(user);
  const permis: Record<WidgetId, boolean> = {
    dimanche: true,
    calendrier: true,
    afaire: entrees.includes("taches"),
    setlists: canCreateSetlist(user, profile),
    planning: entrees.includes("planning"),
    evenements: entrees.includes("evenements"),
    chants: canVoirStatistiques(user),
    petitdej: true,
    scene: true,
    comptes: admin,
    raccourcis: true,
  };
  return WIDGETS.filter((w) => permis[w] && !WIDGETS_A_VENIR.includes(w));
}

/** Les pôles de Back-Office › Tâches (lot U6, B3, table Q2) : ses pôles, Louange compris
 *  (`polesDe`), dans l'ordre de TACHE_POLES ; tous pour un admin. */
export function tachesDuBackOffice(
  user: AuthUser | { email?: string | null } | null,
  profile: { poles?: string[]; serviceRoles?: Record<string, unknown> } | null
): TachePole[] {
  if (!user) return [];
  if (isAdminUser(user)) return [...TACHE_POLES];
  const siens = polesDe(profile);
  return TACHE_POLES.filter((p) => siens.includes(p));
}

/** Sous-parties de Back-Office › Évènements (lot U6, B3, table Q2) : Évènements (ceux qu'on
 *  gère : admin, coordination, droit d'annonces) · Réunions (ses pôles, Louange compris, et
 *  ses équipes ; toutes pour un admin) · Scène (coordination, U1). Affichage seulement. */
export type SousPartieEvenements = "evenements" | "reunions" | "scene";
export function sousPartiesEvenements(
  user: AuthUser | null,
  profile: (ProfilResponsable & { dansEquipes?: string[] }) | null
): SousPartieEvenements[] {
  if (!user) return [];
  const admin = isAdminUser(user);
  const coordination = isCoordination(user, profile);
  const parties: SousPartieEvenements[] = [];
  if (admin || coordination || nonVide(profile?.annonces)) parties.push("evenements");
  if (admin || polesDe(profile).length > 0 || nonVide(profile?.dansEquipes) || nonVide(profile?.referentDe)) parties.push("reunions");
  if (coordination) parties.push("scene");
  return parties;
}
